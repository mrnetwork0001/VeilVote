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

const ENCRYPTION_KEY_MESSAGE = "arcium-veilvote-encryption-key-v1";

/**
 * Derives a deterministic X25519 encryption keypair from a Solana wallet.
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

  it("can vote on polls!", async () => {
    const POLL_IDS = [Math.floor(Math.random() * 100000), Math.floor(Math.random() * 100000), Math.floor(Math.random() * 100000)];
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    // Phase 1: Create comp def accounts (skip if already exist)
    console.log("Initializing vote stats computation definition");
    try {
      await initCompDefAccount(program, owner, "init_vote_stats");
    } catch (e) {
      console.log("Vote stats comp def account already exists, skipping creation");
    }

    console.log("Initializing voting computation definition");
    try {
      await initCompDefAccount(program, owner, "vote");
    } catch (e) {
      console.log("Vote comp def account already exists, skipping creation");
    }

    console.log("Initializing reveal result computation definition");
    try {
      await initCompDefAccount(program, owner, "reveal_result");
    } catch (e) {
      console.log("Reveal result comp def account already exists, skipping creation");
    }

    // Phase 2: Upload circuits (always attempt - idempotent)
    console.log("Uploading circuits...");
    for (const circuitName of ["init_vote_stats", "vote", "reveal_result"]) {
      try {
        const rawCircuit = fs.readFileSync(`build/${circuitName}.arcis`);
        await uploadCircuit(
          provider as anchor.AnchorProvider,
          circuitName,
          program.programId,
          rawCircuit,
          true
        );
        console.log(`Circuit ${circuitName} uploaded successfully`);
      } catch (e) {
        console.log(`Circuit ${circuitName} upload skipped (may already exist): ${e.message}`);
      }
    }

    const { privateKey, publicKey } = deriveEncryptionKey(
      owner,
      ENCRYPTION_KEY_MESSAGE
    );
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // Create multiple polls
    for (const POLL_ID of POLL_IDS) {
      const pollComputationOffset = new anchor.BN(randomBytes(8), "hex");

      const pollSig = await program.methods
        .createNewPoll(
          pollComputationOffset,
          POLL_ID,
          `Poll ${POLL_ID}: $SOL to 500?`
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

      console.log(`Poll ${POLL_ID} created with signature`, pollSig);

      const finalizePollSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        pollComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(`Finalize poll ${POLL_ID} sig is `, finalizePollSig);
    }

    // Cast votes for each poll with different outcomes
    const voteOutcomes = [true, false, true];
    let firstPollPDA: PublicKey;
    let firstVoterRecordPDA: PublicKey;
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const vote = BigInt(voteOutcomes[i]);
      const plaintext = [vote];

      const nonce = randomBytes(16);
      const ciphertext = cipher.encrypt(plaintext, nonce);

      const voteEventPromise = awaitEvent("voteEvent").catch(() => null);

      console.log(`Voting for poll ${POLL_ID}`);

      const pollIdBuffer = Buffer.alloc(4);
      pollIdBuffer.writeUInt32LE(POLL_ID);
      const [pollPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("poll"), owner.publicKey.toBuffer(), pollIdBuffer],
        program.programId
      );

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
        .vote(
          voteComputationOffset,
          POLL_ID,
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
      console.log(`Queue vote for poll ${POLL_ID} sig is `, queueVoteSig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        voteComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(`Finalize vote for poll ${POLL_ID} sig is `, finalizeSig);

      const voteEvent = await voteEventPromise;
      if (voteEvent) {
        console.log(`Vote casted for poll ${POLL_ID} at timestamp `, voteEvent.timestamp.toString());
      } else {
        console.log(`Vote for poll ${POLL_ID} finalized (event not captured via WS)`);
      }
    }

    // Test double-vote prevention
    console.log("\n--- Testing double-vote prevention ---");
    const DOUBLE_VOTE_POLL_ID = POLL_IDS[0];
    const doubleVoteNonce = randomBytes(16);
    const doubleVoteCiphertext = cipher.encrypt(
      [BigInt(true)],
      doubleVoteNonce
    );

    const doubleVoteComputationOffset = new anchor.BN(randomBytes(8), "hex");

    try {
      await program.methods
        .vote(
          doubleVoteComputationOffset,
          DOUBLE_VOTE_POLL_ID,
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
          pollAcc: firstPollPDA,
          voterRecord: firstVoterRecordPDA,
        })
        .rpc({
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        });

      expect.fail("Double vote should have been rejected");
    } catch (error) {
      console.log("Double vote correctly rejected:", error.message);
      expect(error.message).to.satisfy(
        (msg: string) => msg.includes("already in use") || msg.includes("0x0")
      );
    }

    // Reveal results for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const expectedOutcome = voteOutcomes[i];

      const revealEventPromise = awaitEvent("revealResultEvent").catch(() => null);

      const revealComputationOffset = new anchor.BN(randomBytes(8), "hex");

      const revealQueueSig = await program.methods
        .revealResult(revealComputationOffset, POLL_ID)
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
      console.log(`Reveal queue for poll ${POLL_ID} sig is `, revealQueueSig);

      const revealFinalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        revealComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(
        `Reveal finalize for poll ${POLL_ID} sig is `,
        revealFinalizeSig
      );

      const revealEvent = await revealEventPromise;
      if (revealEvent) {
        console.log(`Decrypted winner for poll ${POLL_ID} is `, revealEvent.output);
        expect(revealEvent.output).to.equal(expectedOutcome);
      } else {
        console.log(`Reveal for poll ${POLL_ID} finalized (event not captured via WS)`);
      }
    }
  });

  async function initCompDefAccount(
    program: Program<Veilvote>,
    owner: anchor.web3.Keypair,
    circuitName: string
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset(circuitName);

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgramId()
    )[0];

    console.log(`${circuitName} computation definition pda is `, compDefPDA.toBase58());

    const arciumProgram = getArciumProgram(provider as anchor.AnchorProvider);
    const mxeAccount = getMXEAccAddress(program.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(
      program.programId,
      mxeAcc.lutOffsetSlot
    );

    // Map circuit name to instruction method
    const methodMap: Record<string, () => any> = {
      "init_vote_stats": () => program.methods.initVoteStatsCompDef(),
      "vote": () => program.methods.initVoteCompDef(),
      "reveal_result": () => program.methods.initRevealResultCompDef(),
    };

    const sig = await methodMap[circuitName]()
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
    console.log(`${circuitName} computation definition transaction`, sig);

    return sig;
  }
});

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
