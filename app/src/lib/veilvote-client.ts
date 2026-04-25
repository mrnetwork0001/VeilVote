// =============================================================================
// VeilVote - Onchain Client (Browser-Compatible)
// All transaction building happens server-side via /api/build-tx
// Client only handles: wallet signing + sending + reading accounts
// =============================================================================

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { PROGRAM_ID } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);

// ---------------------------------------------------------------------------
// VeilVote PDAs (browser-safe, used for voter record checks)
// ---------------------------------------------------------------------------

export function getVoterRecordPDA(pollPDA: PublicKey, voter: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('voter'), pollPDA.toBuffer(), voter.toBuffer()],
    PROGRAM_PUBKEY
  )[0];
}

// ---------------------------------------------------------------------------
// Wallet Interface (compatible with Phantom/Solflare)
// ---------------------------------------------------------------------------

interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

// ---------------------------------------------------------------------------
// Server-side API call helper
// ---------------------------------------------------------------------------

async function callBuildTx(action: string, payer: string, rpcUrl: string, params: Record<string, any> = {}) {
  const res = await fetch('/api/build-tx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payer, rpcUrl, ...params }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Fetch Onchain Proposals (via server API)
// ---------------------------------------------------------------------------

export interface OnChainPoll {
  id: number;
  authority: string;
  question: string;
  voteState: number[][];
  nonce: string;
  bump: number;
  pda: string;
  createdAt: number;
  revealed: boolean;
  result?: boolean;
}


export async function fetchAllPolls(connection: Connection): Promise<OnChainPoll[]> {
  const data = await callBuildTx('fetchPolls', PublicKey.default.toBase58(), connection.rpcEndpoint);
  return data.polls || [];
}

// ---------------------------------------------------------------------------
// Create Proposal
// ---------------------------------------------------------------------------

export async function createProposal(
  connection: Connection,
  wallet: WalletAdapter,
  pollId: number,
  question: string
): Promise<string> {
  // 1. Server builds the transaction
  const { transaction: txBase64 } = await callBuildTx(
    'createProposal',
    wallet.publicKey.toBase58(),
    connection.rpcEndpoint,
    { pollId, question }
  );

  // 2. Client signs with wallet
  const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
  const signedTx = await wallet.signTransaction(tx);

  // 3. Send to chain
  const sig = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: true,
  });

  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

// ---------------------------------------------------------------------------
// Cast Vote
// ---------------------------------------------------------------------------

export async function castVote(
  connection: Connection,
  wallet: WalletAdapter,
  pollId: number,
  voteYes: boolean,
  authority: string
): Promise<string> {
  // 1. Server encrypts vote + builds transaction
  const { transaction: txBase64 } = await callBuildTx(
    'vote',
    wallet.publicKey.toBase58(),
    connection.rpcEndpoint,
    { pollId, voteYes, authority }
  );

  // 2. Client signs with wallet
  const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
  const signedTx = await wallet.signTransaction(tx);

  // 3. Send to chain
  const sig = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: true,
  });

  await connection.confirmTransaction(sig, 'confirmed');
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