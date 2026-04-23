# VeilVote — Private DAO Governance on Solana

> **Cast encrypted votes using Arcium Multi-Party Computation. Your vote stays private — only final results are revealed on-chain.**

[![Built with Arcium](https://img.shields.io/badge/Built%20with-Arcium-7C3AED)](https://arcium.com)
[![Solana](https://img.shields.io/badge/Chain-Solana-14F195)](https://solana.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Devnet](https://img.shields.io/badge/Network-Devnet-yellow)](https://explorer.solana.com/address/B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk?cluster=devnet)

---

## 📌 Deployed on Solana Devnet

| Resource | Value |
|----------|-------|
| **Program ID** | `B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk` |
| **Explorer** | [View on Solana Explorer](https://explorer.solana.com/address/B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk?cluster=devnet) |
| **IDL** | [View IDL](https://explorer.solana.com/address/P9v1MgrCx5vwo14k1ikh1Djy7wyMbnvMYHpuzqCT4GA?cluster=devnet) |
| **MXE Init** | [Tx](https://explorer.solana.com/tx/5CuZNCsot4QtuzFXMSRnP295wmXMH5YcGJEWpS1MXS7sJfDmtX5kuvu9TNoTqwSgYuZYGgP22LKLhrayTWfc9pJg?cluster=devnet) |
| **Cluster Offset** | `456` (Arcium Devnet) |

---

## 🏗️ Architecture

VeilVote is a three-layer application built on Arcium's encrypted computation framework:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│  Connect Wallet → Encrypt Vote → Submit → Track Status   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Solana Program (Anchor + Arcium)             │
│  Create Proposal → Queue MPC → Store Encrypted State     │
│  Callback → Update Tally → Reveal Result                 │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Arcium MPC Network (Arx Nodes)              │
│  Secret-shared computation on encrypted votes            │
│  No single node sees any individual vote                 │
└─────────────────────────────────────────────────────────┘
```

### Three Surfaces

| Surface | Language | Purpose |
|---------|----------|---------|
| **Arcis Circuit** (`encrypted-ixs/`) | Rust | MPC logic: init tallies, accumulate votes, compare results |
| **Solana Program** (`programs/veilvote/`) | Rust | Proposal management, queue/callback lifecycle, PDA storage |
| **Client** (`app/` + `tests/`) | TypeScript | Key exchange, encryption, submission, decryption, UI |

---

## 🔐 How Arcium Provides Privacy

### The Problem with Public Voting

Traditional DAO voting on Solana is fully transparent — anyone can see who voted for what. This creates three attack vectors:

1. **Vote-buying**: Bad actors pay voters for provable votes
2. **Coercion**: Token holders are pressured into voting a certain way
3. **Frontrunning**: Whales observe vote trends and manipulate outcomes

### How VeilVote Solves This

```
User's Browser                      Solana                    Arcium MPC Cluster
─────────────────                   ──────                    ──────────────────
1. Generate x25519 keypair
2. Derive shared secret with MXE
3. Encrypt vote (RescueCipher)
4. Send ciphertext to program ──────► Store in PDA
5.                                    Queue computation ─────► Receive fragments
6.                                                             Run secret-shared
                                                               addition on votes
7.                                    Callback with result ◄── Return ciphertext
8.                                    Store updated tally
```

1. **Local Encryption**: Your vote is encrypted in your browser using x25519 key exchange + RescueCipher. The plaintext **NEVER** leaves your device.

2. **Multi-Party Computation (MPC)**: Arcium distributes the encrypted vote to multiple Arx nodes. Each node holds a mathematical fragment of the data and performs computation on secret-shared values. No single node ever sees the plaintext vote.

3. **Encrypted Tallying**: The MPC network adds your encrypted vote to the encrypted running total. The on-chain state stores only ciphertexts — observable but meaningless to anyone without the MPC cluster's distributed key.

4. **Boolean Reveal**: After voting ends, the authority triggers a reveal. The MPC network compares the encrypted yes/no counts and publishes only a boolean result (pass/fail). Even the exact vote counts are never revealed.

### Privacy Guarantees

| Property | Guarantee |
|----------|-----------|
| Individual vote secrecy | ✅ No one (including Arx nodes) sees your vote |
| Tally secrecy | ✅ Vote counts are never revealed, only pass/fail |
| Vote integrity | ✅ MPC correctness proofs ensure accurate tallying |
| Double-vote prevention | ✅ On-chain VoterRecord PDAs prevent re-voting |
| Coercion resistance | ✅ Voters cannot prove how they voted |

---

## 🛠️ Tech Stack

### Backend
- **Solana** — High-performance L1 blockchain
- **Anchor 0.32.x** — Solana framework for secure programs
- **Arcium SDK 0.9.6** — MPC-based confidential computing
- **Arcis** — Domain-specific language for encrypted circuits
- **Rust** — Systems programming for circuits and programs

### Frontend
- **Next.js 14** — React framework with App Router
- **TypeScript** — Type-safe client code
- **Vanilla CSS** — Custom glassmorphism design system
- **@solana/wallet-adapter** — Phantom/Solflare wallet connection
- **@arcium-hq/client** — Arcium TypeScript SDK for key exchange and encryption

---

## 📁 Project Structure

```
VeilVote/
├── Anchor.toml                       # Anchor config (devnet, program ID, RPC)
├── Arcium.toml                       # Arcium config (cluster offset: 456)
├── Cargo.toml                        # Workspace manifest
├── package.json                      # Root test dependencies
├── tsconfig.json                     # TypeScript config for tests
│
├── encrypted-ixs/                    # 🔒 Arcis MPC Circuits
│   ├── Cargo.toml                    #    arcis = "0.9.6" dependency
│   └── src/
│       └── lib.rs                    #    3 encrypted instructions:
│                                     #      • init_vote_stats  (initialize encrypted counters)
│                                     #      • vote             (add encrypted vote to tally)
│                                     #      • reveal_result    (decrypt yes > no comparison)
│
├── programs/veilvote/                # ⚓ Anchor Solana Program
│   ├── Cargo.toml                    #    arcium-anchor = "0.9.6"
│   └── src/
│       └── lib.rs                    #    9 instructions:
│                                     #      • 3 init_comp_def  (register circuits)
│                                     #      • 3 queue + callback (create poll, vote, reveal)
│                                     #      • PollAccount, VoterRecord PDAs
│
├── tests/
│   └── veilvote.ts                   # 🧪 Full integration test suite
│                                     #    Tests all 3 phases on devnet MPC cluster
│
├── app/                              # 🎨 Next.js 14 Frontend
│   └── src/
│       ├── app/                      #    Pages: landing, proposals, vote/[id], how-it-works
│       ├── components/               #    9 React components
│       └── lib/                      #    SDK wrappers, types, constants
│
└── scripts/
    └── vps-setup.sh                  # 🖥️ VPS toolchain installer
```

---

## 🚀 Quick Start

### Prerequisites
- **Linux/macOS** (Arcium CLI requires Unix)
- **Rust 1.84+** and **Cargo**
- **Solana CLI 2.3.0** and **Anchor 0.32.1**
- **Docker** (for Arcium local node containers)
- **Node.js 18+** and **npm/yarn**

### 1. Install Arcium Toolchain
```bash
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
source $HOME/.cargo/env
arcup install
```

### 2. Clone and Build
```bash
git clone https://github.com/mrnetwork0001/VeilVote.git
cd VeilVote
yarn install          # Install test dependencies
arcium build          # Build circuits + Anchor program
```

### 3. Deploy to Devnet
```bash
# Configure Solana for devnet
solana config set --url https://api.devnet.solana.com
solana airdrop 5

# Deploy program
arcium deploy \
  --keypair-path ~/.config/solana/id.json \
  --cluster-offset 456 \
  --recovery-set-size 4 \
  --rpc-url devnet

# If program already deployed, just initialize MXE:
arcium init-mxe \
  --keypair-path ~/.config/solana/id.json \
  --callback-program B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk \
  --cluster-offset 456 \
  --recovery-set-size 4 \
  --rpc-url devnet
```

### 4. Run Tests
```bash
# Via arcium CLI
arcium test --cluster devnet

# Or directly with env vars (recommended for custom RPC)
ANCHOR_PROVIDER_URL="https://your-rpc-url" \
ANCHOR_WALLET=~/.config/solana/id.json \
ARCIUM_CLUSTER_OFFSET=456 \
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/veilvote.ts
```

### 5. Run Frontend
```bash
cd app
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📝 On-Chain Instructions

### Computation Definition Initialization
These register the Arcis circuits with the Arcium MPC network:

| Instruction | Circuit | Purpose |
|------------|---------|---------|
| `init_vote_stats_comp_def` | `init_vote_stats.arcis` | Register the tally initialization circuit |
| `init_vote_comp_def` | `vote.arcis` | Register the vote accumulation circuit |
| `init_reveal_result_comp_def` | `reveal_result.arcis` | Register the result comparison circuit |

### Core Voting Lifecycle

| Instruction | Type | Description |
|------------|------|-------------|
| `create_new_poll` | Queue | Creates a PollAccount PDA, queues MPC to initialize encrypted `[yes_count, no_count]` tallies |
| `init_vote_stats_callback` | Callback | MPC returns encrypted initial state → stored in PollAccount |
| `vote` | Queue | Submits encrypted vote (x25519 + RescueCipher), creates VoterRecord PDA to prevent double-voting |
| `vote_callback` | Callback | MPC returns updated encrypted tallies → stored in PollAccount, emits `VoteEvent` |
| `reveal_result` | Queue | Authority requests boolean reveal (yes > no?) from MPC |
| `reveal_result_callback` | Callback | MPC returns plaintext boolean → emits `RevealResultEvent` |

### Account Structure

```rust
// PDA: seeds = [b"poll", authority, poll_id]
pub struct PollAccount {
    pub bump: u8,
    pub vote_state: [[u8; 32]; 2],  // Encrypted [yes_count, no_count]
    pub id: u32,
    pub authority: Pubkey,           // Only authority can reveal
    pub nonce: u128,                 // Cryptographic nonce
    pub question: String,            // Poll question (max 50 chars)
}

// PDA: seeds = [b"voter", poll_pda, voter_pubkey]
pub struct VoterRecord {
    pub bump: u8,                    // Existence = already voted
}
```

---

## 🧪 Testing

The integration test (`tests/veilvote.ts`) runs the complete lifecycle against devnet MPC nodes:

```bash
arcium test --cluster devnet
```

### Test Coverage

| Phase | What's Tested | Status |
|-------|--------------|--------|
| Setup | MXE public key retrieval with retry | ✅ |
| Init | 3 computation definitions + circuit upload | ✅ |
| Create | 3 polls with unique IDs and questions | ✅ |
| Vote | 3 encrypted votes (yes, no, yes) with MPC finalization | ✅ |
| Security | Double-vote prevention (VoterRecord PDA collision) | ✅ |
| Reveal | 3 result reveals with MPC decryption | ✅ |

### Test Output (Devnet)
```
VeilVote
  ✅ Circuits: init_vote_stats, vote, reveal_result — OnchainFinalized
  ✅ Poll 29938 created — MPC finalized
  ✅ Poll 82494 created — MPC finalized
  ✅ Poll 8887 created  — MPC finalized
  ✅ Vote for 29938 — queued + finalized
  ✅ Vote for 82494 — queued + finalized
  ✅ Vote for 8887  — queued + finalized
  ✅ Double-vote correctly rejected (account already in use)
  ✅ Reveal 29938 — finalized
  ✅ Reveal 82494 — finalized
  ✅ Reveal 8887  — finalized
  ✔ can vote on polls! (790258ms)

1 passing (13m)
```

---

## 🔧 Arcis Circuits (MPC Logic)

The `encrypted-ixs/src/lib.rs` defines three encrypted instructions compiled to `.arcis` bytecode:

### `init_vote_stats`
Initializes encrypted counters `[yes=0, no=0]` using the MPC cluster's shared encryption key.

### `vote`
Takes an encrypted boolean vote and the current encrypted tally. Performs secret-shared addition:
- If vote is `true`: `yes_count += 1`
- If vote is `false`: `no_count += 1`

Returns the updated encrypted tally.

### `reveal_result`
Takes the final encrypted tally and performs a secret-shared comparison:
- Returns `true` if `yes_count > no_count`
- Returns `false` otherwise

Only the boolean result is revealed — exact counts remain encrypted forever.

---

## 🎨 Frontend

Premium dark theme with glassmorphism, inspired by modern DeFi dashboards.

### Pages
| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero section, feature cards, live stats, CTA |
| Proposals | `/proposals` | Filterable grid with countdown timers |
| Vote | `/vote/[id]` | Vote casting with 4-stage progress tracker |
| How It Works | `/how-it-works` | Step-by-step MPC explainer |

### Design System
- Deep dark background (`#07070f`)
- Purple/violet accent gradient (`#7C3AED → #4F46E5`)
- Glass cards with frosted borders and blur effects
- Outfit + Inter typography (Google Fonts)
- Micro-animations, hover effects, and staggered reveals

---

## 🖥️ VPS Deployment Guide

### Requirements
- Ubuntu 22.04 VPS (4GB+ RAM, 2+ CPU cores)
- Docker installed

### Quick Setup
```bash
# 1. Clone repo
git clone https://github.com/mrnetwork0001/VeilVote.git
cd VeilVote

# 2. Run automated setup
bash scripts/vps-setup.sh

# 3. Install Arcium
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
source $HOME/.cargo/env
arcup install

# 4. Build & deploy
arcium build
arcium deploy \
  --keypair-path ~/.config/solana/id.json \
  --cluster-offset 456 \
  --recovery-set-size 4 \
  --rpc-url devnet
```

### Troubleshooting
| Issue | Solution |
|-------|----------|
| `indexmap edition2024` error | Pin `indexmap = "2.7.1"` in workspace `Cargo.toml` |
| `ComputationDefinitionNotCompleted` | Circuits not uploaded — re-run tests to trigger upload |
| `429 Too Many Requests` | Use a paid RPC (Helius, QuickNode) instead of public devnet |
| `Cluster must contain at least two arx nodes` | Use `--cluster-offset 456 --recovery-set-size 4` for devnet |

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

## 🔗 Links

- [Arcium Developer Docs](https://docs.arcium.com/developers)
- [Arcium Examples (Voting)](https://github.com/arcium-hq/examples/tree/main/voting)
- [Arcium TypeScript SDK](https://ts.arcium.com/api)
- [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter)
- [Arcium Skills Bounty](https://skills.arcium.com)
- [VeilVote on Solana Explorer](https://explorer.solana.com/address/B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk?cluster=devnet)
