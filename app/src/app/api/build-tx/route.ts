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
        break;
      case 'vote':
        result = await buildVote(program, connection, payerPubkey, params);
        break;
      case 'revealResult':
        result = await buildRevealResult(program, connection, payerPubkey, params);
        break;
      case 'fetchPolls':
        result = await fetchPolls(program, connection);
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
// Fetch Polls
// ---------------------------------------------------------------------------

async function fetchPolls(program: anchor.Program, connection: Connection) {
  const accounts = await connection.getProgramAccounts(PROGRAM_PUBKEY);
  console.log(`[fetchPolls] Found ${accounts.length} total program accounts`);

  const polls: any[] = [];

  for (const { pubkey, account } of accounts) {
    for (const name of ['PollAccount', 'pollAccount', 'poll_account']) {
      try {
        const decoded = program.coder.accounts.decode(name, account.data);
        if (decoded && decoded.question !== undefined) {
          polls.push({
            id: decoded.id,
            authority: decoded.authority?.toBase58?.() || decoded.authority,
            question: decoded.question,
            voteState: decoded.voteState || [],
            nonce: decoded.nonce?.toString?.() || '0',
            bump: decoded.bump || 0,
            pda: pubkey.toBase58(),
            createdAt: 0, // will be filled below
          });
          break;
        }
      } catch {}
    }
  }

  // Get creation timestamp for each poll (oldest signature on the PDA)
  await Promise.all(
    polls.map(async (poll) => {
      try {
        const sigs = await connection.getSignaturesForAddress(
          new PublicKey(poll.pda),
          { limit: 1 },  // only need the oldest
          'confirmed'
        );
        if (sigs.length > 0 && sigs[0].blockTime) {
          poll.createdAt = sigs[0].blockTime;
        }
      } catch {}
    })
  );

  console.log(`[fetchPolls] Decoded ${polls.length} polls`);
  return { polls };
}
