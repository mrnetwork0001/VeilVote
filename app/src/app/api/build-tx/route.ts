// =============================================================================
// API Route: /api/build-tx
// Builds transactions server-side using @arcium-hq/client + Anchor IDL
// Returns serialized transaction for client-side wallet signing
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { randomBytes, createHash } from 'crypto';
import {
  x25519,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getCompDefAccAddress as arcGetCompDefAccAddress,
  getCompDefAccOffset as arcGetCompDefAccOffset,
  getComputationAccAddress as arcGetComputationAccAddress,
  getClusterAccAddress as arcGetClusterAccAddress,
  getMempoolAccAddress as arcGetMempoolAccAddress,
  getExecutingPoolAccAddress as arcGetExecutingPoolAccAddress,
  getArciumProgramId,
} from '@arcium-hq/client';

const PROGRAM_ID = 'B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk';
const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);
const CLUSTER_OFFSET = 456;

// Cache the IDL only (not the program, since connection changes per request)
let cachedIdl: any = null;

// ---------------------------------------------------------------------------
// Server-side caches
// ---------------------------------------------------------------------------

// Polls list cache (30 second TTL - fast enough for content changes)
interface PollsCache { data: any; expiresAt: number; }
let pollsCache: PollsCache | null = null;

function getCachedPolls(): any | null {
  if (pollsCache && Date.now() < pollsCache.expiresAt) return pollsCache.data;
  return null;
}
function setCachedPolls(data: any) {
  pollsCache = { data, expiresAt: Date.now() + 30_000 };
}
function invalidatePollsCache() { pollsCache = null; }

// PERMANENT reveal result cache (key = poll PDA, value = boolean result)
// Once a poll is revealed, it stays revealed forever - no need for TTL.
// Populated by fetchRevealResult (called from vote page auto-poller).
const revealedPollsCache = new Map<string, boolean>();

function markPollRevealed(pda: string, result: boolean) {
  revealedPollsCache.set(pda, result);
  invalidatePollsCache(); // force polls list to re-read on next request
  console.log(`[cache] Poll ${pda.slice(0,8)}... marked as ${result ? 'PASSED' : 'REJECTED'}`);
}



async function getProgram(connection: Connection): Promise<anchor.Program> {
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as anchor.Wallet;

  const provider = new anchor.AnchorProvider(connection, dummyWallet, {
    commitment: 'confirmed',
  });

  if (!cachedIdl) {
    console.log('[build-tx] Fetching IDL from chain...');
    cachedIdl = await anchor.Program.fetchIdl(PROGRAM_PUBKEY, provider);
    if (!cachedIdl) throw new Error('Failed to fetch VeilVote IDL from devnet');
    cachedIdl.address = PROGRAM_ID;
    console.log('[build-tx] IDL fetched. Instructions:', cachedIdl.instructions?.map((i: any) => i.name));
  }

  return new anchor.Program(cachedIdl, provider);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payer, rpcUrl, ...params } = body;

    if (!action || !payer || !rpcUrl) {
      return NextResponse.json({ error: 'Missing action, payer, or rpcUrl' }, { status: 400 });
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const program = await getProgram(connection);
    const payerPubkey = new PublicKey(payer);

    let result: any;

    switch (action) {
      case 'createProposal':
        result = await buildCreateProposal(program, connection, payerPubkey, params);
        if (params.pollId) trackNewPoll(params.pollId);
        invalidatePollsCache(); // new proposal - fresh fetch next time
        break;
      case 'vote':
        result = await buildVote(program, connection, payerPubkey, params);
        break;
      case 'revealResult':
        result = await buildRevealResult(program, connection, payerPubkey, params);
        invalidatePollsCache(); // reveal changes status - fresh fetch next time
        break;
      case 'fetchPolls':
        result = await fetchPolls(program, connection);
        return NextResponse.json(result);
      case 'fetchRevealResult':
        result = await fetchRevealResult(connection, params);
        return NextResponse.json(result);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Create Proposal
// ---------------------------------------------------------------------------

async function buildCreateProposal(
  program: anchor.Program,
  connection: Connection,
  payer: PublicKey,
  params: { pollId: number; question: string }
) {
  const { pollId, question } = params;
  const computationOffset = new anchor.BN(randomBytes(8));

  const compDefOffset = arcGetCompDefAccOffset('init_vote_stats');
  const compDefOffsetU32 = Buffer.from(compDefOffset).readUInt32LE();

  const ix = await program.methods
    .createNewPoll(computationOffset, pollId, question)
    .accountsPartial({
      payer,
      computationAccount: arcGetComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount: arcGetClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(PROGRAM_PUBKEY),
      mempoolAccount: arcGetMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: arcGetExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: arcGetCompDefAccAddress(PROGRAM_PUBKEY, compDefOffsetU32),
    })
    .instruction();

  const bhInfo = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction();
  tx.recentBlockhash = bhInfo.blockhash;
  tx.feePayer = payer;
  tx.add(ix);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockhash: bhInfo.blockhash,
    lastValidBlockHeight: bhInfo.lastValidBlockHeight,
  };
}

// ---------------------------------------------------------------------------
// Vote
// ---------------------------------------------------------------------------

async function buildVote(
  program: anchor.Program,
  connection: Connection,
  payer: PublicKey,
  params: { pollId: number; voteYes: boolean; authority: string }
) {
  const { pollId, voteYes, authority } = params;
  const authorityPubkey = new PublicKey(authority);

  // Poll PDA
  const idBuf = Buffer.alloc(4);
  idBuf.writeUInt32LE(pollId);
  const [pollPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('poll'), authorityPubkey.toBuffer(), idBuf],
    PROGRAM_PUBKEY
  );
  const [voterRecordPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('voter'), pollPDA.toBuffer(), payer.toBuffer()],
    PROGRAM_PUBKEY
  );

  // Encryption
  const provider = program.provider as anchor.AnchorProvider;
  const mxePublicKey = await getMXEPublicKey(provider, PROGRAM_PUBKEY);
  if (!mxePublicKey) throw new Error('Failed to fetch MXE public key');

  const privateKey = randomBytes(32);
  privateKey[0] &= 248;
  privateKey[31] &= 127;
  privateKey[31] |= 64;
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);
  const nonce = randomBytes(16);
  const plaintext = [BigInt(voteYes ? 1 : 0)];
  const ciphertext = cipher.encrypt(plaintext, nonce);

  const computationOffset = new anchor.BN(randomBytes(8));
  const compDefOffset = arcGetCompDefAccOffset('vote');
  const compDefOffsetU32 = Buffer.from(compDefOffset).readUInt32LE();

  const ix = await program.methods
    .vote(
      computationOffset,
      pollId,
      Array.from(ciphertext[0]),
      Array.from(publicKey),
      new anchor.BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      payer,
      computationAccount: arcGetComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount: arcGetClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(PROGRAM_PUBKEY),
      mempoolAccount: arcGetMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: arcGetExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: arcGetCompDefAccAddress(PROGRAM_PUBKEY, compDefOffsetU32),
      authority: authorityPubkey,
      pollAcc: pollPDA,
      voterRecord: voterRecordPDA,
    })
    .instruction();

  const bhInfo = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction();
  tx.recentBlockhash = bhInfo.blockhash;
  tx.feePayer = payer;
  tx.add(ix);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockhash: bhInfo.blockhash,
    lastValidBlockHeight: bhInfo.lastValidBlockHeight,
  };
}

// ---------------------------------------------------------------------------
// Reveal Result
// ---------------------------------------------------------------------------

async function buildRevealResult(
  program: anchor.Program,
  connection: Connection,
  payer: PublicKey,
  params: { pollId: number }
) {
  const { pollId } = params;
  const computationOffset = new anchor.BN(randomBytes(8));

  const compDefOffset = arcGetCompDefAccOffset('reveal_result');
  const compDefOffsetU32 = Buffer.from(compDefOffset).readUInt32LE();

  const idBuf = Buffer.alloc(4);
  idBuf.writeUInt32LE(pollId);
  const [pollPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('poll'), payer.toBuffer(), idBuf],
    PROGRAM_PUBKEY
  );

  const ix = await program.methods
    .revealResult(computationOffset, pollId)
    .accountsPartial({
      payer,
      computationAccount: arcGetComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount: arcGetClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(PROGRAM_PUBKEY),
      mempoolAccount: arcGetMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: arcGetExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: arcGetCompDefAccAddress(PROGRAM_PUBKEY, compDefOffsetU32),
      pollAcc: pollPDA,
    })
    .instruction();

  const bhInfo = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction();
  tx.recentBlockhash = bhInfo.blockhash;
  tx.feePayer = payer;
  tx.add(ix);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  return {
    transaction: serialized.toString('base64'),
    blockhash: bhInfo.blockhash,
    lastValidBlockHeight: bhInfo.lastValidBlockHeight,
  };
}

// ---------------------------------------------------------------------------
// New proposals tracker: only show polls created during this server session.
// Old test proposals are hidden. Set SHOW_ALL_POLLS=true to show everything.
// ---------------------------------------------------------------------------
const SHOW_ALL_POLLS = true;
const newPollIds = new Set<number>();
function trackNewPoll(pollId: number) {
  newPollIds.add(pollId);
  invalidatePollsCache();
  console.log(`[tracker] Poll ${pollId} added. Tracking ${newPollIds.size} polls.`);
}

// ---------------------------------------------------------------------------
// Fetch Polls (FAST - single RPC call + in-memory reveal cache)
// ---------------------------------------------------------------------------

async function fetchPolls(program: anchor.Program, connection: Connection) {
  const cached = getCachedPolls();
  if (cached) return cached;

  const t0 = Date.now();
  const accounts = await connection.getProgramAccounts(PROGRAM_PUBKEY);

  const polls: any[] = [];
  for (const { pubkey, account } of accounts) {
    for (const name of ['PollAccount', 'pollAccount', 'poll_account']) {
      try {
        const decoded = program.coder.accounts.decode(name, account.data);
        if (decoded && decoded.question !== undefined) {
          const pda = pubkey.toBase58();
          const isRevealed = revealedPollsCache.has(pda);
          polls.push({
            id: decoded.id,
            authority: decoded.authority?.toBase58?.() || decoded.authority,
            question: decoded.question,
            voteState: decoded.voteState || [],
            nonce: decoded.nonce?.toString?.() || '0',
            bump: decoded.bump || 0,
            pda,
            createdAt: 0,
            revealed: isRevealed,
            result: isRevealed ? revealedPollsCache.get(pda) : undefined,
          });
          break;
        }
      } catch {}
    }
  }

  const allPolls = polls;
  const filteredPolls = SHOW_ALL_POLLS ? allPolls : allPolls.filter((p: any) => newPollIds.has(p.id));

  console.log(`[fetchPolls] ${allPolls.length} total, ${filteredPolls.length} shown in ${Date.now() - t0}ms (${revealedPollsCache.size} cached reveals)`);
  const result = { polls: filteredPolls };
  setCachedPolls(result);

  // Bootstrap: if reveal cache is empty, scan all polls in background
  // This runs AFTER the response is sent, so it doesn't slow the page load
  if (revealedPollsCache.size === 0 && polls.length > 0) {
    console.log('[fetchPolls] Bootstrapping reveal cache in background...');
    bootstrapRevealCache(connection, polls.map((p: any) => p.pda));
  }

  return result;
}

// Background reveal cache bootstrap - runs without blocking
let bootstrapRunning = false;
async function bootstrapRevealCache(connection: Connection, pdas: string[]) {
  if (bootstrapRunning) return;
  bootstrapRunning = true;
  try {
    for (const pda of pdas) {
      if (revealedPollsCache.has(pda)) continue;
      try {
        const result = await fetchRevealResult(connection, { pollPda: pda });
        if (result.found) {
          // Already stored by fetchRevealResult via markPollRevealed
        }
      } catch {}
    }
    console.log(`[bootstrap] Done. ${revealedPollsCache.size} reveals cached.`);
  } finally {
    bootstrapRunning = false;
  }
}


// ---------------------------------------------------------------------------
// Fetch Reveal Result (for individual poll - called from vote page)
// ---------------------------------------------------------------------------
// The Arcium MPC callback tx does NOT reference the poll PDA (registered with
// &[] callback accounts). So we can't find it via getSignaturesForAddress(pollPDA).
//
// Strategy: first check permanent cache. If not cached, find the user's
// "RevealResult" tx on the poll PDA, extract the computation_account from it,
// then search the computation_account's sigs for the callback tx.

async function fetchRevealResult(
  connection: Connection,
  params: { pollPda: string }
) {
  const { pollPda } = params;

  // 1. Check permanent cache first (instant)
  if (revealedPollsCache.has(pollPda)) {
    return {
      found: true,
      result: revealedPollsCache.get(pollPda),
      signature: 'cached',
    };
  }

  const pollPubkey = new PublicKey(pollPda);

  // 2. Find the user's RevealResult tx on the poll PDA
  const pollSigs = await connection.getSignaturesForAddress(pollPubkey, { limit: 30 }, 'confirmed');

  for (const sigInfo of pollSigs) {
    try {
      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta?.logMessages) continue;

      // Is this a RevealResult tx?
      const isReveal = tx.meta.logMessages.some((l: string) =>
        l.includes('Instruction: RevealResult')
      );
      if (!isReveal) continue;

      // 3. Extract computation_account from inner instructions
      //    It's the account created by System Program in this tx
      //    (assigned to Arcium program, typically 445 bytes)
      const innerIxs = tx.meta.innerInstructions ?? [];
      let computationAcct: string | null = null;

      for (const group of innerIxs) {
        for (const ix of group.instructions as any[]) {
          if (
            ix.parsed?.type === 'createAccount' &&
            ix.parsed?.info?.owner === 'Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ'
          ) {
            computationAcct = ix.parsed.info.newAccount;
            break;
          }
        }
        if (computationAcct) break;
      }

      if (!computationAcct) continue;
      console.log(`[fetchRevealResult] Found computationAcct ${computationAcct.slice(0,8)}... from reveal tx`);

      // 4. Search the computation_account for the callback tx
      const compPubkey = new PublicKey(computationAcct);
      const compSigs = await connection.getSignaturesForAddress(compPubkey, { limit: 10 }, 'confirmed');

      for (const compSig of compSigs) {
        // Skip the original reveal tx itself
        if (compSig.signature === sigInfo.signature) continue;

        try {
          const callbackTx = await connection.getParsedTransaction(compSig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          if (!callbackTx?.meta?.logMessages) continue;

          for (const log of callbackTx.meta.logMessages) {
            if (!log.startsWith('Program data:')) continue;
            const buf = Buffer.from(log.replace('Program data: ', '').trim(), 'base64');
            // RevealResultEvent = 8-byte discriminator + 1-byte bool
            if (buf.length === 9) {
              const resultBool = buf[8] === 1;
              markPollRevealed(pollPda, resultBool);
              console.log(`[fetchRevealResult] Poll ${pollPda.slice(0,8)}... = ${resultBool ? 'PASSED' : 'REJECTED'}`);
              return {
                found: true,
                result: resultBool,
                signature: compSig.signature,
                timestamp: compSig.blockTime,
              };
            }
          }
        } catch {}
      }

      // If we found a reveal tx but no callback yet, MPC still processing
      console.log(`[fetchRevealResult] Reveal submitted but callback not yet received`);
      return { found: false };
    } catch {}
  }

  return { found: false };
}