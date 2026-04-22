use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    /// Tracks the encrypted vote tallies for a proposal.
    /// Both fields remain encrypted in MPC — no single Arx node sees the plaintext counts.
    #[derive(Copy, Clone)]
    pub struct VoteStats {
        yes: u64,
        no: u64,
    }

    /// Represents a single encrypted vote cast by a user.
    #[derive(Copy, Clone)]
    pub struct UserVote {
        vote: bool,
    }

    /// Initializes encrypted vote counters for a new proposal.
    ///
    /// Creates a VoteStats structure with zero counts for both yes and no votes.
    /// The counters remain MXE-encrypted and persist across computations —
    /// only the MPC cluster can update them.
    #[instruction]
    pub fn init_vote_stats() -> Enc<Mxe, VoteStats> {
        let vote_stats = VoteStats { yes: 0, no: 0 };
        Mxe::get().from_arcis(vote_stats)
    }

    /// Processes an encrypted vote and updates the running tallies.
    ///
    /// Takes an individual Shared-encrypted vote from the user and adds it
    /// to the appropriate counter (yes or no) without revealing the vote value.
    /// The updated vote statistics remain MXE-encrypted and can only be
    /// revealed by the proposal authority.
    ///
    /// # Arguments
    /// * `vote_ctxt` - The user's encrypted vote (Shared — encrypted with user's x25519 key)
    /// * `vote_stats_ctxt` - Current encrypted vote tallies (Mxe — persisted on-chain)
    ///
    /// # Returns
    /// Updated MXE-encrypted vote statistics with the new vote included.
    #[instruction]
    pub fn vote(
        vote_ctxt: Enc<Shared, UserVote>,
        vote_stats_ctxt: Enc<Mxe, VoteStats>,
    ) -> Enc<Mxe, VoteStats> {
        let user_vote = vote_ctxt.to_arcis();
        let mut vote_stats = vote_stats_ctxt.to_arcis();

        // Both branches execute in MPC (cost = sum of both).
        // This is intentional — it prevents timing-based vote inference.
        if user_vote.vote {
            vote_stats.yes += 1;
        } else {
            vote_stats.no += 1;
        }

        vote_stats_ctxt.owner.from_arcis(vote_stats)
    }

    /// Reveals the final result of the proposal by comparing vote tallies.
    ///
    /// Decrypts the vote counters and determines whether the majority voted yes or no.
    /// Only the final boolean result (majority decision) is revealed, not the actual
    /// vote counts — preserving voter privacy even after tallying.
    ///
    /// # Arguments
    /// * `vote_stats_ctxt` - MXE-encrypted vote tallies to be revealed
    ///
    /// # Returns
    /// * `true` if more people voted yes than no
    /// * `false` if more people voted no than yes (or tie)
    #[instruction]
    pub fn reveal_result(vote_stats_ctxt: Enc<Mxe, VoteStats>) -> bool {
        let vote_stats = vote_stats_ctxt.to_arcis();
        (vote_stats.yes > vote_stats.no).reveal()
    }
}
