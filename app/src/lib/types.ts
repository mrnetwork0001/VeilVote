// =============================================================================
// VeilVote — TypeScript Types
// =============================================================================

export interface Proposal {
  id: number;
  title: string;
  description: string;
  authority: string;
  endTime: number; // Unix timestamp (seconds)
  totalVotes: number;
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
    description: 'Vote counted — encrypted tally updated',
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

export const PROGRAM_ID = 'VeiLVoteXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// Network configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Demo proposals for when the program isn't deployed yet
export const DEMO_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'Enable Private Treasury Votes',
    description:
      'Should the DAO adopt encrypted voting for all treasury proposals above 10,000 USDC? This would ensure that large financial decisions are made without vote-buying or coercion pressure.',
    authority: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    endTime: Math.floor(Date.now() / 1000) + 86400,
    totalVotes: 42,
    status: 'active',
    voteState: [],
    nonce: '0',
    pda: '',
  },
  {
    id: 2,
    title: 'Upgrade Governance Framework v2',
    description:
      'Proposal to migrate from simple majority to quadratic weighted voting on key governance decisions. This prevents whale domination while preserving vote privacy.',
    authority: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    endTime: Math.floor(Date.now() / 1000) + 604800,
    totalVotes: 128,
    status: 'active',
    voteState: [],
    nonce: '0',
    pda: '',
  },
  {
    id: 3,
    title: 'Community Fund Allocation Q2 2025',
    description:
      'Allocate 50,000 tokens from the community treasury to developer grants for Q2 initiatives. Funds will be distributed through a transparent milestone-based system.',
    authority: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    endTime: Math.floor(Date.now() / 1000) - 3600,
    totalVotes: 256,
    status: 'ended',
    voteState: [],
    nonce: '0',
    pda: '',
  },
  {
    id: 4,
    title: 'Protocol Fee Adjustment',
    description:
      'Lower the protocol fee from 0.3% to 0.1% to attract more volume during the growth phase. To be revisited after 6 months.',
    authority: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    endTime: Math.floor(Date.now() / 1000) - 86400,
    totalVotes: 89,
    status: 'revealed',
    result: true,
    voteState: [],
    nonce: '0',
    pda: '',
  },
];
