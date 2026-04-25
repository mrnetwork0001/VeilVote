// =============================================================================
// VeilVote - TypeScript Types
// =============================================================================

export interface Proposal {
  id: number;
  title: string;
  description: string;
  authority: string;
  createdAt: number; // Unix timestamp (seconds)
  status: ProposalStatus;
  result?: boolean; // Only set after reveal
  voteState: number[][]; // Encrypted ciphertexts [[u8;32],[u8;32]]
  nonce: string; // u128 as string
  pda: string; // Base58 PDA address
}

export type ProposalStatus = 'active' | 'ended' | 'revealed';

export type VoteChoice = 'yes' | 'no';

export type VoteStatus =
  | 'idle'
  | 'encrypting'
  | 'submitting'
  | 'computing'
  | 'finalized'
  | 'error';

export interface VoteStatusStep {
  id: VoteStatus;
  label: string;
  description: string;
  icon: string;
}

export const VOTE_STEPS: VoteStatusStep[] = [
  {
    id: 'encrypting',
    label: 'Encrypting',
    description: 'Encrypting your vote with x25519 + RescueCipher',
    icon: '🔐',
  },
  {
    id: 'submitting',
    label: 'Submitting',
    description: 'Sending encrypted transaction to Solana',
    icon: '📡',
  },
  {
    id: 'computing',
    label: 'Computing',
    description: 'MPC nodes processing encrypted vote',
    icon: '⚙️',
  },
  {
    id: 'finalized',
    label: 'Finalized',
    description: 'Vote counted - encrypted tally updated',
    icon: '✅',
  },
];

export interface VotingPeriodOption {
  label: string;
  seconds: number;
  description: string;
}

export const VOTING_PERIODS: VotingPeriodOption[] = [
  { label: '5 Minutes', seconds: 300, description: 'Demo / Testing' },
  { label: '24 Hours', seconds: 86400, description: 'Quick decisions' },
  { label: '7 Days', seconds: 604800, description: 'Standard governance' },
  { label: '14 Days', seconds: 1209600, description: 'Major proposals' },
  { label: '30 Days', seconds: 2592000, description: 'Constitutional changes' },
];

export const PROGRAM_ID = 'B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk';

// Network configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

