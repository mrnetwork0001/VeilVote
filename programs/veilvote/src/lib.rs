use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

// Computation definition offsets — MUST match #[instruction] fn names in encrypted-ixs exactly
const COMP_DEF_OFFSET_INIT_VOTE_STATS: u32 = comp_def_offset("init_vote_stats");
const COMP_DEF_OFFSET_VOTE: u32 = comp_def_offset("vote");
const COMP_DEF_OFFSET_REVEAL: u32 = comp_def_offset("reveal_result");

// Placeholder program ID — replace with real ID after `arcium init` on VPS
declare_id!("B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk");

#[arcium_program]
pub mod veilvote {
    use super::*;

    // =========================================================================
    // COMP DEF INITIALIZERS (called once per instruction type, before any use)
    // =========================================================================

    pub fn init_vote_stats_comp_def(ctx: Context<InitVoteStatsCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn init_vote_comp_def(ctx: Context<InitVoteCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn init_reveal_result_comp_def(ctx: Context<InitRevealResultCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    // =========================================================================
    // CREATE PROPOSAL (queues init_vote_stats computation)
    // =========================================================================

    /// Creates a new governance proposal with encrypted vote counters.
    ///
    /// Initializes a PollAccount PDA and queues an `init_vote_stats` MPC computation
    /// to create the initial encrypted VoteStats (yes=0, no=0). The callback will
    /// store the encrypted state on-chain.
    ///
    /// # Arguments
    /// * `computation_offset` - Unique offset for this computation instance
    /// * `id` - Unique proposal ID
    /// * `title` - Proposal title (max 80 chars)
    /// * `description` - Proposal description (max 280 chars)
    /// * `end_time` - Unix timestamp when voting closes
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        computation_offset: u64,
        id: u32,
        title: String,
        description: String,
        end_time: i64,
    ) -> Result<()> {
        msg!("Creating proposal: {}", title);

        let clock = Clock::get()?;
        require!(
            end_time > clock.unix_timestamp,
            ErrorCode::InvalidEndTime
        );

        // Initialize the proposal account
        ctx.accounts.poll_acc.title = title.clone();
        ctx.accounts.poll_acc.description = description;
        ctx.accounts.poll_acc.bump = ctx.bumps.poll_acc;
        ctx.accounts.poll_acc.id = id;
        ctx.accounts.poll_acc.authority = ctx.accounts.payer.key();
        ctx.accounts.poll_acc.vote_state = [[0; 32]; 2];
        ctx.accounts.poll_acc.end_time = end_time;
        ctx.accounts.poll_acc.total_votes = 0;
        ctx.accounts.poll_acc.status = 0; // Active
        ctx.accounts.poll_acc.result = false;

        // init_vote_stats takes no args — just build empty args
        let args = ArgBuilder::new().build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Queue the init_vote_stats computation
        // Callback will store the encrypted VoteStats on the poll account
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![InitVoteStatsCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.poll_acc.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        emit!(ProposalCreatedEvent {
            id,
            title,
            authority: ctx.accounts.payer.key(),
            end_time,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Callback for init_vote_stats — stores initial encrypted VoteStats on proposal.
    #[arcium_callback(encrypted_ix = "init_vote_stats")]
    pub fn init_vote_stats_callback(
        ctx: Context<InitVoteStatsCallback>,
        output: SignedComputationOutputs<InitVoteStatsOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(InitVoteStatsOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.poll_acc.vote_state = o.ciphertexts;
        ctx.accounts.poll_acc.nonce = o.nonce;

        Ok(())
    }

    // =========================================================================
    // CAST VOTE (queues vote computation)
    // =========================================================================

    /// Submits an encrypted vote to a proposal.
    ///
    /// Encrypts the voter's choice (yes/no) using their x25519 shared secret with MXE,
    /// then queues a `vote` MPC computation that updates the encrypted tallies without
    /// revealing the individual vote.
    ///
    /// A VoterRecord PDA is created to prevent double-voting — if the voter has already
    /// voted on this proposal, the transaction will fail because the PDA already exists.
    ///
    /// # Arguments
    /// * `computation_offset` - Unique offset for this computation instance
    /// * `_id` - Proposal ID (used for PDA derivation)
    /// * `vote` - Encrypted vote ciphertext (32 bytes from RescueCipher)
    /// * `vote_encryption_pubkey` - Voter's x25519 public key (32 bytes)
    /// * `vote_nonce` - Cryptographic nonce used for vote encryption
    pub fn cast_vote(
        ctx: Context<CastVote>,
        computation_offset: u64,
        _id: u32,
        vote: [u8; 32],
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
    ) -> Result<()> {
        // Verify voting is still active
        let clock = Clock::get()?;
        require!(
            ctx.accounts.poll_acc.status == 0,
            ErrorCode::ProposalNotActive
        );
        require!(
            clock.unix_timestamp < ctx.accounts.poll_acc.end_time,
            ErrorCode::VotingPeriodEnded
        );

        // ArgBuilder order MUST match circuit fn parameters left-to-right:
        //   vote(vote_ctxt: Enc<Shared, UserVote>, vote_stats_ctxt: Enc<Mxe, VoteStats>)
        //
        // For Enc<Shared, T>: .x25519_pubkey() → .plaintext_u128(nonce) → ciphertexts
        // For Enc<Mxe, T>:    .plaintext_u128(nonce) → .account(...)
        let args = ArgBuilder::new()
            // Shared param: voter's encrypted vote
            .x25519_pubkey(vote_encryption_pubkey)
            .plaintext_u128(vote_nonce)
            .encrypted_bool(vote)
            // Mxe param: on-chain encrypted VoteStats
            .plaintext_u128(ctx.accounts.poll_acc.nonce)
            .account(
                ctx.accounts.poll_acc.key(),
                // Offset: 8 (discriminator) + 1 (bump)
                8 + 1,
                // Size: 2 vote counters * 32 bytes each
                32 * 2,
            )
            .build();

        ctx.accounts.voter_record.bump = ctx.bumps.voter_record;
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![VoteCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.poll_acc.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback for vote — stores updated encrypted VoteStats and increments vote count.
    #[arcium_callback(encrypted_ix = "vote")]
    pub fn vote_callback(
        ctx: Context<VoteCallback>,
        output: SignedComputationOutputs<VoteOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(VoteOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.poll_acc.vote_state = o.ciphertexts;
        ctx.accounts.poll_acc.nonce = o.nonce;
        ctx.accounts.poll_acc.total_votes += 1;

        let clock = Clock::get()?;

        emit!(VoteEvent {
            proposal_id: ctx.accounts.poll_acc.id,
            total_votes: ctx.accounts.poll_acc.total_votes,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // =========================================================================
    // REVEAL RESULT (queues reveal_result computation)
    // =========================================================================

    /// Reveals the final result of the proposal.
    ///
    /// Only the proposal authority can call this. Queues a `reveal_result` MPC
    /// computation that compares the encrypted yes/no counts and returns a boolean.
    /// The actual counts are never revealed — only whether yes > no.
    ///
    /// # Arguments
    /// * `computation_offset` - Unique offset for this computation instance
    /// * `id` - Proposal ID
    pub fn reveal_result(
        ctx: Context<RevealVotingResult>,
        computation_offset: u64,
        id: u32,
    ) -> Result<()> {
        require!(
            ctx.accounts.payer.key() == ctx.accounts.poll_acc.authority,
            ErrorCode::InvalidAuthority
        );

        msg!("Revealing voting result for proposal {}", id);

        // reveal_result takes only Enc<Mxe, VoteStats> — no Shared params, so no pubkey
        let args = ArgBuilder::new()
            .plaintext_u128(ctx.accounts.poll_acc.nonce)
            .account(
                ctx.accounts.poll_acc.key(),
                // Offset: 8 (discriminator) + 1 (bump)
                8 + 1,
                // Size: 2 vote counters * 32 bytes each
                32 * 2,
            )
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Update status to Ended before queuing reveal
        ctx.accounts.poll_acc.status = 1;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![RevealResultCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.poll_acc.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Callback for reveal_result — emits the boolean result.
    #[arcium_callback(encrypted_ix = "reveal_result")]
    pub fn reveal_result_callback(
        ctx: Context<RevealResultCallback>,
        output: SignedComputationOutputs<RevealResultOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(RevealResultOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Store result and update status to Revealed
        ctx.accounts.poll_acc.result = o;
        ctx.accounts.poll_acc.status = 2;

        emit!(RevealResultEvent {
            proposal_id: ctx.accounts.poll_acc.id,
            result: o,
        });

        Ok(())
    }
}

// =============================================================================
// ACCOUNT STRUCTS
// =============================================================================

// --- Create Proposal accounts (queues init_vote_stats) ---

#[instruction(computation_offset: u64, id: u32)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_VOTE_STATS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        init,
        payer = payer,
        space = 8 + PollAccount::INIT_SPACE,
        seeds = [b"poll", payer.key().as_ref(), id.to_le_bytes().as_ref()],
        bump,
    )]
    pub poll_acc: Account<'info, PollAccount>,
}

// --- Init Vote Stats Callback ---

#[derive(Accounts)]
pub struct InitVoteStatsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_VOTE_STATS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    /// CHECK: poll_acc, checked by the callback account key passed in queue_computation
    #[account(mut)]
    pub poll_acc: Account<'info, PollAccount>,
}

// --- Init Vote Stats Comp Def ---

#[derive(Accounts)]
pub struct InitVoteStatsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// --- Cast Vote accounts ---

#[instruction(computation_offset: u64, _id: u32)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VOTE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    /// CHECK: Poll authority pubkey
    #[account(
        address = poll_acc.authority,
    )]
    pub authority: UncheckedAccount<'info>,
    #[account(
        seeds = [b"poll", authority.key().as_ref(), _id.to_le_bytes().as_ref()],
        bump = poll_acc.bump,
        has_one = authority
    )]
    pub poll_acc: Box<Account<'info, PollAccount>>,
    #[account(
        init,
        payer = payer,
        space = 8 + VoterRecord::INIT_SPACE,
        seeds = [b"voter", poll_acc.key().as_ref(), payer.key().as_ref()],
        bump,
    )]
    pub voter_record: Box<Account<'info, VoterRecord>>,
}

// --- Vote Callback ---

#[derive(Accounts)]
pub struct VoteCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VOTE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub poll_acc: Account<'info, PollAccount>,
}

// --- Init Vote Comp Def ---

#[derive(Accounts)]
pub struct InitVoteCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// --- Reveal Result accounts ---

#[instruction(computation_offset: u64, id: u32)]
pub struct RevealVotingResult<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        mut,
        seeds = [b"poll", payer.key().as_ref(), id.to_le_bytes().as_ref()],
        bump = poll_acc.bump
    )]
    pub poll_acc: Account<'info, PollAccount>,
}

// --- Reveal Result Callback ---

#[derive(Accounts)]
pub struct RevealResultCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub poll_acc: Account<'info, PollAccount>,
}

// --- Init Reveal Result Comp Def ---

#[derive(Accounts)]
pub struct InitRevealResultCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program. Not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// =============================================================================
// DATA ACCOUNTS
// =============================================================================

/// Represents a governance proposal with encrypted vote tallies.
///
/// The `vote_state` field contains MXE-encrypted VoteStats (yes/no counts).
/// Individual votes are never visible on-chain — only the encrypted aggregate
/// and eventually the final boolean result after reveal.
#[account]
#[derive(InitSpace)]
pub struct PollAccount {
    /// PDA bump seed
    pub bump: u8,
    /// Encrypted vote counters: [yes_count, no_count] as 32-byte ciphertexts
    pub vote_state: [[u8; 32]; 2],
    /// Unique identifier for this proposal
    pub id: u32,
    /// Public key of the proposal creator (only they can reveal results)
    pub authority: Pubkey,
    /// Cryptographic nonce for the encrypted vote counters
    pub nonce: u128,
    /// Proposal title (max 80 characters)
    #[max_len(80)]
    pub title: String,
    /// Proposal description (max 280 characters)
    #[max_len(280)]
    pub description: String,
    /// Unix timestamp when voting closes
    pub end_time: i64,
    /// Total number of votes cast (incremented in callback)
    pub total_votes: u32,
    /// Proposal status: 0 = Active, 1 = Ended, 2 = Revealed
    pub status: u8,
    /// Final reveal result (true = yes won, false = no won)
    pub result: bool,
}

/// Per-proposal voter deduplication record.
/// Created once per (proposal, voter) pair — prevents double voting.
#[account]
#[derive(InitSpace)]
pub struct VoterRecord {
    /// PDA bump seed
    pub bump: u8,
}

// =============================================================================
// ERRORS
// =============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid authority — only the proposal creator can perform this action")]
    InvalidAuthority,
    #[msg("The MPC computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
    #[msg("End time must be in the future")]
    InvalidEndTime,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
}

// =============================================================================
// EVENTS
// =============================================================================

#[event]
pub struct ProposalCreatedEvent {
    pub id: u32,
    pub title: String,
    pub authority: Pubkey,
    pub end_time: i64,
    pub timestamp: i64,
}

#[event]
pub struct VoteEvent {
    pub proposal_id: u32,
    pub total_votes: u32,
    pub timestamp: i64,
}

#[event]
pub struct RevealResultEvent {
    pub proposal_id: u32,
    pub result: bool,
}
