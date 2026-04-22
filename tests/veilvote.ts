import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Veilvote } from "../target/types/veilvote";
import { randomBytes, createHash } from "crypto";
import nacl from "tweetnacl";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  uploadCircuit,
  RescueCipher,
  deserializeLE,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  x25519,
  getComputationAccAddress,
  getMXEPublicKey,
  getClusterAccAddress,
  getLookupTableAddress,
  getArciumProgram,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

const ENCRYPTION_KEY_MESSAGE = "veilvote-encryption-key-v1";

/**
 * Derives a deterministic X25519 encryption keypair from a Solana wallet.
 * Signs a fixed message with the wallet's Ed25519 key, then hashes the signature
 * to produce a valid X25519 private key. This allows users to recover their
 * encryption keys from their wallet alone.
 */
function deriveEncryptionKey(
  wallet: anchor.web3.Keypair,
  message: string
): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, wallet.secretKey);
  const privateKey = new Uint8Array(
    createHash("sha256").update(signature).digest()
  );
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

describe("VeilVote", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Veilvote as Program<Veilvote>;
  const provider = anchor.getProvider();

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E,
    timeoutMs = 120000
  ): Promise<Event[E]> => {
    let listenerId: number;
    let timeoutId: NodeJS.Timeout;
    const event = await new Promise<Event[E]>((res, rej) => {
      listenerId = program.addEventListener(eventName, (event) => {
        clearTimeout(timeoutId);
        res(event);
      });
      timeoutId = setTimeout(() => {
        program.removeEventListener(listenerId);
        rej(new Error(`Event ${eventName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  const arciumEnv = getArciumEnv();
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  it("can create proposals and vote on them!", async () => {
    const PROPOSAL_IDS = [1, 2, 3];
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    // =========================================================================
    // Step 1: Initialize all 3 computation definitions (once per instruction)
    // =========================================================================

    console.log("Initializing init_vote_stats computation definition");
    const initVoteStatsSig = await initVoteStatsCompDef(program, owner);
    console.log("init_vote_stats comp def initialized:", initVoteStatsSig);

    console.log("Initializing vote computation definition");
    const initVoteSig = await initVoteCompDef(program, owner);
    console.log("vote comp def initialized:", initVoteSig);

    console.log("Initializing reveal_result computation definition");
    const initRRSig = await initRevealResultCompDef(program, owner);
    console.log("reveal_result comp def initialized:", initRRSig);

    // =========================================================================
    // Step 2: Derive encryption keys
    // =========================================================================

    const { privateKey, publicKey } = deriveEncryptionKey(
      owner,
      ENCRYPTION_KEY_MESSAGE
    );
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // =========================================================================
    // Step 3: Create proposals
    // =========================================================================

    const proposals = [
      {
        id: 1,
        title: "Enable Private Treasury Votes",
        description: "Should the DAO adopt encrypted voting for all treasury proposals above 10,000 USDC?",
        duration: 300, // 5 minutes (demo)
      },
      {
        id: 2,
        title: "Upgrade Governance Framework",
        description: "Proposal to migrate from simple majority to quadratic weighted voting on key governance decisions.",
        duration: 86400, // 24 hours
      },
      {
        id: 3,
        title: "Community Fund Allocation Q2",
        description: "Allocate 50,000 tokens from the community treasury to developer grants for Q2 initiatives.",
        duration: 604800, // 7 days
      },
    ];

    for (const prop of proposals) {
      const pollComputationOffset = new anchor.BN(randomBytes(8), "hex");
      const endTime = Math.floor(Date.now() / 1000) + prop.duration;

      const pollSig = await program.methods
        .createProposal(
          pollComputationOffset,
          prop.id,
          prop.title,
          prop.description,
          new anchor.BN(endTime)
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            pollComputationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(
            arciumEnv.arciumClusterOffset
          ),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("init_vote_stats")).readUInt32LE()
          ),
        })
        .rpc({
          skipPreflight: true,
          commitment: "confirmed",
        });

      console.log(`Proposal "${prop.title}" created with signature`, pollSig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        pollComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(`Proposal ${prop.id} init_vote_stats finalized:`, finalizeSig);
    }

    // =========================================================================
    // Step 4: Cast votes
    // =========================================================================

    const voteOutcomes = [true, false, true]; // Different outcomes for each proposal
    let firstPollPDA: PublicKey;
    let firstVoterRecordPDA: PublicKey;

    for (let i = 0; i < PROPOSAL_IDS.length; i++) {
      const PROPOSAL_ID = PROPOSAL_IDS[i];
      const vote = BigInt(voteOutcomes[i]);
      const plaintext = [vote];

      // CRITICAL: Fresh nonce per encryption — never reuse!
      const nonce = randomBytes(16);
      const ciphertext = cipher.encrypt(plaintext, nonce);

      const voteEventPromise = awaitEvent("voteEvent");

      console.log(`Voting on proposal ${PROPOSAL_ID}`);

      // Derive poll PDA
      const pollIdBuffer = Buffer.alloc(4);
      pollIdBuffer.writeUInt32LE(PROPOSAL_ID);
      const [pollPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("poll"), owner.publicKey.toBuffer(), pollIdBuffer],
        program.programId
      );

      // Derive voter record PDA (prevents double voting)
      const [voterRecordPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("voter"), pollPDA.toBuffer(), owner.publicKey.toBuffer()],
        program.programId
      );

      if (i === 0) {
        firstPollPDA = pollPDA;
        firstVoterRecordPDA = voterRecordPDA;
      }

      const voteComputationOffset = new anchor.BN(randomBytes(8), "hex");

      const queueVoteSig = await program.methods
        .castVote(
          voteComputationOffset,
          PROPOSAL_ID,
          Array.from(ciphertext[0]),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            voteComputationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(
            arciumEnv.arciumClusterOffset
          ),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("vote")).readUInt32LE()
          ),
          authority: owner.publicKey,
          pollAcc: pollPDA,
          voterRecord: voterRecordPDA,
        })
        .rpc({
          skipPreflight: true,
          commitment: "confirmed",
        });
      console.log(`Vote queued for proposal ${PROPOSAL_ID}:`, queueVoteSig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        voteComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(`Vote finalized for proposal ${PROPOSAL_ID}:`, finalizeSig);

      const voteEvent = await voteEventPromise;
      console.log(
        `Vote cast on proposal ${PROPOSAL_ID} at timestamp`,
        voteEvent.timestamp.toString()
      );
    }

    // =========================================================================
    // Step 5: Test double-vote prevention
    // =========================================================================

    console.log("\n--- Testing double-vote prevention ---");
    const DOUBLE_VOTE_PROPOSAL_ID = PROPOSAL_IDS[0];
    const doubleVoteNonce = randomBytes(16);
    const doubleVoteCiphertext = cipher.encrypt(
      [BigInt(true)],
      doubleVoteNonce
    );

    const doubleVoteComputationOffset = new anchor.BN(randomBytes(8), "hex");

    try {
      await program.methods
        .castVote(
          doubleVoteComputationOffset,
          DOUBLE_VOTE_PROPOSAL_ID,
          Array.from(doubleVoteCiphertext[0]),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(doubleVoteNonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            doubleVoteComputationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(
            arciumEnv.arciumClusterOffset
          ),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("vote")).readUInt32LE()
          ),
          authority: owner.publicKey,
          pollAcc: firstPollPDA!,
          voterRecord: firstVoterRecordPDA!,
        })
        .rpc({
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        });

      expect.fail("Double vote should have been rejected");
    } catch (error: any) {
      console.log("Double vote correctly rejected:", error.message);
      expect(error.message).to.satisfy(
        (msg: string) => msg.includes("already in use") || msg.includes("0x0")
      );
    }

    // =========================================================================
    // Step 6: Reveal results
    // =========================================================================

    for (let i = 0; i < PROPOSAL_IDS.length; i++) {
      const PROPOSAL_ID = PROPOSAL_IDS[i];
      const expectedOutcome = voteOutcomes[i];

      const revealEventPromise = awaitEvent("revealResultEvent");

      const revealComputationOffset = new anchor.BN(randomBytes(8), "hex");

      const revealQueueSig = await program.methods
        .revealResult(revealComputationOffset, PROPOSAL_ID)
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            revealComputationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(
            arciumEnv.arciumClusterOffset
          ),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("reveal_result")).readUInt32LE()
          ),
        })
        .rpc({
          skipPreflight: true,
          commitment: "confirmed",
        });
      console.log(`Reveal queued for proposal ${PROPOSAL_ID}:`, revealQueueSig);

      const revealFinalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        revealComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(
        `Reveal finalized for proposal ${PROPOSAL_ID}:`,
        revealFinalizeSig
      );

      const revealEvent = await revealEventPromise;
      console.log(
        `Result for proposal ${PROPOSAL_ID}:`,
        revealEvent.result ? "YES won" : "NO won"
      );
      expect(revealEvent.result).to.equal(expectedOutcome);
    }
  });

  // ===========================================================================
  // HELPER FUNCTIONS: Comp Def Initialization + Circuit Upload
  // ===========================================================================

  async function initVoteStatsCompDef(
    program: Program<Veilvote>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("init_vote_stats");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgramId()
    )[0];

    console.log("init_vote_stats comp def PDA:", compDefPDA.toBase58());

    const arciumProgram = getArciumProgram(provider as anchor.AnchorProvider);
    const mxeAccount = getMXEAccAddress(program.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(
      program.programId,
      mxeAcc.lutOffsetSlot
    );

    const sig = await program.methods
      .initVoteStatsCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .signers([owner])
      .rpc({
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      });

    const rawCircuit = fs.readFileSync("build/init_vote_stats.arcis");
    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "init_vote_stats",
      program.programId,
      rawCircuit,
      true
    );

    return sig;
  }

  async function initVoteCompDef(
    program: Program<Veilvote>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("vote");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgramId()
    )[0];

    console.log("vote comp def PDA:", compDefPDA.toBase58());

    const arciumProgram = getArciumProgram(provider as anchor.AnchorProvider);
    const mxeAccount = getMXEAccAddress(program.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(
      program.programId,
      mxeAcc.lutOffsetSlot
    );

    const sig = await program.methods
      .initVoteCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .signers([owner])
      .rpc({
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      });

    const rawCircuit = fs.readFileSync("build/vote.arcis");
    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "vote",
      program.programId,
      rawCircuit,
      true
    );

    return sig;
  }

  async function initRevealResultCompDef(
    program: Program<Veilvote>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("reveal_result");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgramId()
    )[0];

    console.log("reveal_result comp def PDA:", compDefPDA.toBase58());

    const arciumProgram = getArciumProgram(provider as anchor.AnchorProvider);
    const mxeAccount = getMXEAccAddress(program.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(
      program.programId,
      mxeAcc.lutOffsetSlot
    );

    const sig = await program.methods
      .initRevealResultCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .signers([owner])
      .rpc({
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      });

    const rawCircuit = fs.readFileSync("build/reveal_result.arcis");
    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "reveal_result",
      program.programId,
      rawCircuit,
      true
    );

    return sig;
  }
});

// =============================================================================
// UTILITIES
// =============================================================================

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 20,
  retryDelayMs: number = 500
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) {
        return mxePublicKey;
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
    }

    if (attempt < maxRetries) {
      console.log(
        `Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error(
    `Failed to fetch MXE public key after ${maxRetries} attempts`
  );
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
}
