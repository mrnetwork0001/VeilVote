// =============================================================================
// VeilVote — Solana Program Interaction
// Handles proposal fetching, PDA derivation, and transaction building
// =============================================================================

import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, type Proposal, type ProposalStatus } from './types';

const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);

/**
 * Derives the Poll PDA for a given proposal ID and authority.
 */
export function getProposalPDA(authority: PublicKey, id: number): PublicKey {
  const idBuffer = Buffer.alloc(4);
  idBuffer.writeUInt32LE(id);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('poll'), authority.toBuffer(), idBuffer],
    PROGRAM_PUBKEY
  );
  return pda;
}

/**
 * Derives the VoterRecord PDA to check if a user has already voted.
 */
export function getVoterRecordPDA(
  pollPDA: PublicKey,
  voter: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('voter'), pollPDA.toBuffer(), voter.toBuffer()],
    PROGRAM_PUBKEY
  );
  return pda;
}

/**
 * Maps the on-chain status byte to a human-readable status.
 */
export function parseProposalStatus(
  statusByte: number,
  endTime: number
): ProposalStatus {
  if (statusByte === 2) return 'revealed';
  if (statusByte === 1) return 'ended';
  if (Date.now() / 1000 > endTime) return 'ended';
  return 'active';
}

/**
 * Formats a Solana address for display (first 4 + last 4 chars).
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Calculates the time remaining until a given Unix timestamp.
 */
export function getTimeRemaining(endTime: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  expired: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  const total = endTime - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
  }

  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    total,
    expired: false,
  };
}

/**
 * Formats a Unix timestamp to a human-readable date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
