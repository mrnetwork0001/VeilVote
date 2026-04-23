// =============================================================================
// VeilVote — On-Chain Client (Browser-Compatible)
// Uses only browser-safe dependencies. Arcium encryption via API route.
// =============================================================================

import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PROGRAM_ID } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);
const ARCIUM_PROGRAM_ID = new PublicKey('Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ');
const CLUSTER_OFFSET = 456;

// ---------------------------------------------------------------------------
// PDA Derivation (Pure JS — no Node deps)
// ---------------------------------------------------------------------------

function textToBytes(text: string): Buffer {
  return Buffer.from(text);
}

function u64ToLeBytes(n: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

// Arcium seed names → ASCII buffers (pre-computed for browser)
const ARCIUM_SEEDS: Record<string, string> = {
  mxeAccount: 'mxe_account',
  mempoolAccount: 'mempool_account',
  clusterAccount: 'cluster_account',
  computationAccount: 'computation_account',
  executingPool: 'executing_pool',
  compDefAccount: 'computation_definition_account',
};

export function getMXEAccAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textToBytes(ARCIUM_SEEDS.mxeAccount), programId.toBuffer()],
    ARCIUM_PROGRAM_ID
  )[0];
}

export function getMempoolAccAddress(clusterOffset: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textToBytes(ARCIUM_SEEDS.mempoolAccount), u64ToLeBytes(clusterOffset)],
    ARCIUM_PROGRAM_ID
  )[0];
}

export function getClusterAccAddress(clusterOffset: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textToBytes(ARCIUM_SEEDS.clusterAccount), u64ToLeBytes(clusterOffset)],
    ARCIUM_PROGRAM_ID
  )[0];
}

export function getComputationAccAddress(clusterOffset: number, offset: anchor.BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textToBytes(ARCIUM_SEEDS.computationAccount), u64ToLeBytes(clusterOffset), offset.toArrayLike(Buffer, 'le', 8)],
    ARCIUM_PROGRAM_ID
  )[0];
}

export function getExecutingPoolAccAddress(clusterOffset: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textToBytes(ARCIUM_SEEDS.executingPool), u64ToLeBytes(clusterOffset)],
    ARCIUM_PROGRAM_ID
  )[0];
}

export function getCompDefAccAddress(programId: PublicKey, offsetBytes: Buffer): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textToBytes(ARCIUM_SEEDS.compDefAccount), programId.toBuffer(), offsetBytes],
    ARCIUM_PROGRAM_ID
  )[0];
}

// ---------------------------------------------------------------------------
// Comp Def Offset — SHA256 of "computation_definition::<name>" → first 4 bytes
// ---------------------------------------------------------------------------

async function sha256Browser(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

export async function getCompDefAccOffset(name: string): Promise<Buffer> {
  const input = new TextEncoder().encode(`computation_definition::${name}`);
  const hash = await sha256Browser(input);
  return Buffer.from(hash.slice(0, 4));
}

// ---------------------------------------------------------------------------
// VeilVote PDAs
// ---------------------------------------------------------------------------

export function getPollPDA(authority: PublicKey, pollId: number): PublicKey {
  const idBuf = Buffer.alloc(4);
  idBuf.writeUInt32LE(pollId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('poll'), authority.toBuffer(), idBuf],
    PROGRAM_PUBKEY
  )[0];
}

export function getVoterRecordPDA(pollPDA: PublicKey, voter: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('voter'), pollPDA.toBuffer(), voter.toBuffer()],
    PROGRAM_PUBKEY
  )[0];
}

// ---------------------------------------------------------------------------
// IDL + Program Instance
// ---------------------------------------------------------------------------

let cachedIdl: any = null;

export async function getProgram(
  connection: Connection,
  wallet: anchor.Wallet
): Promise<anchor.Program> {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  if (!cachedIdl) {
    cachedIdl = await anchor.Program.fetchIdl(PROGRAM_PUBKEY, provider);
    if (!cachedIdl) throw new Error('Failed to fetch VeilVote IDL from devnet');
  }

  return new anchor.Program(cachedIdl, provider);
}

// ---------------------------------------------------------------------------
// Fetch On-Chain Proposals
// ---------------------------------------------------------------------------

export interface OnChainPoll {
  id: number;
  authority: PublicKey;
  question: string;
  voteState: number[][];
  nonce: anchor.BN;
  bump: number;
  pda: PublicKey;
}

export async function fetchAllPolls(
  connection: Connection,
  wallet: anchor.Wallet
): Promise<OnChainPoll[]> {
  const program = await getProgram(connection, wallet);
  const accounts = await connection.getProgramAccounts(PROGRAM_PUBKEY);
  const polls: OnChainPoll[] = [];

  for (const { pubkey, account } of accounts) {
    try {
      const decoded = program.coder.accounts.decode('PollAccount', account.data);
      if (decoded.id !== undefined && decoded.question !== undefined) {
        polls.push({
          id: decoded.id,
          authority: decoded.authority,
          question: decoded.question,
          voteState: decoded.voteState,
          nonce: decoded.nonce,
          bump: decoded.bump,
          pda: pubkey,
        });
      }
    } catch {
      // Not a PollAccount — skip
    }
  }

  return polls;
}

// ---------------------------------------------------------------------------
// Create Proposal (on-chain)
// ---------------------------------------------------------------------------

export async function createProposal(
  connection: Connection,
  wallet: anchor.Wallet,
  pollId: number,
  question: string
): Promise<string> {
  const program = await getProgram(connection, wallet);

  // Random 8-byte offset for computation
  const randomBuf = new Uint8Array(8);
  crypto.getRandomValues(randomBuf);
  const computationOffset = new anchor.BN(Buffer.from(randomBuf));

  const compDefOffset = await getCompDefAccOffset('init_vote_stats');
  const compDefOffsetU32 = compDefOffset.readUInt32LE();

  const offsetBuf = Buffer.alloc(4);
  offsetBuf.writeUInt32LE(compDefOffsetU32);

  const sig = await program.methods
    .createNewPoll(computationOffset, pollId, question)
    .accountsPartial({
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(PROGRAM_PUBKEY),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(PROGRAM_PUBKEY, offsetBuf),
    })
    .rpc({
      skipPreflight: true,
      commitment: 'confirmed',
    });

  return sig;
}

// ---------------------------------------------------------------------------
// Cast Vote (on-chain — encryption via API route)
// ---------------------------------------------------------------------------

export async function castVote(
  connection: Connection,
  wallet: anchor.Wallet,
  pollId: number,
  voteYes: boolean
): Promise<string> {
  // 1. Get encrypted vote data from API route (runs on server where @arcium-hq/client works)
  const response = await fetch('/api/encrypt-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vote: voteYes,
      programId: PROGRAM_ID,
      rpcUrl: connection.rpcEndpoint,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Encryption failed: ${err}`);
  }

  const { ciphertext, publicKey, nonce } = await response.json();

  // 2. Build transaction on client side (wallet signing happens here)
  const program = await getProgram(connection, wallet);

  const pollPDA = getPollPDA(wallet.publicKey, pollId);
  const voterRecordPDA = getVoterRecordPDA(pollPDA, wallet.publicKey);

  const randomBuf = new Uint8Array(8);
  crypto.getRandomValues(randomBuf);
  const computationOffset = new anchor.BN(Buffer.from(randomBuf));

  const compDefOffset = await getCompDefAccOffset('vote');
  const offsetBuf = Buffer.alloc(4);
  offsetBuf.writeUInt32LE(compDefOffset.readUInt32LE());

  const sig = await program.methods
    .vote(
      computationOffset,
      pollId,
      ciphertext,
      publicKey,
      new anchor.BN(nonce)
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(PROGRAM_PUBKEY),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(PROGRAM_PUBKEY, offsetBuf),
      authority: wallet.publicKey,
      pollAcc: pollPDA,
      voterRecord: voterRecordPDA,
    })
    .rpc({
      skipPreflight: true,
      commitment: 'confirmed',
    });

  return sig;
}

// ---------------------------------------------------------------------------
// Reveal Result (on-chain)
// ---------------------------------------------------------------------------

export async function revealResult(
  connection: Connection,
  wallet: anchor.Wallet,
  pollId: number
): Promise<string> {
  const program = await getProgram(connection, wallet);

  const randomBuf = new Uint8Array(8);
  crypto.getRandomValues(randomBuf);
  const computationOffset = new anchor.BN(Buffer.from(randomBuf));

  const compDefOffset = await getCompDefAccOffset('reveal_result');
  const offsetBuf = Buffer.alloc(4);
  offsetBuf.writeUInt32LE(compDefOffset.readUInt32LE());

  const sig = await program.methods
    .revealResult(computationOffset, pollId)
    .accountsPartial({
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(PROGRAM_PUBKEY),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(PROGRAM_PUBKEY, offsetBuf),
    })
    .rpc({
      skipPreflight: true,
      commitment: 'confirmed',
    });

  return sig;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export async function hasUserVoted(
  connection: Connection,
  pollPDA: PublicKey,
  voter: PublicKey
): Promise<boolean> {
  const voterRecordPDA = getVoterRecordPDA(pollPDA, voter);
  const info = await connection.getAccountInfo(voterRecordPDA);
  return info !== null;
}

export function getExplorerLink(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function getExplorerAddressLink(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
