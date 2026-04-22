# VeilVote — Private DAO Governance on Solana

> **Cast encrypted votes using Arcium Multi-Party Computation. Your vote stays private — only final results are revealed on-chain.**

[![Built with Arcium](https://img.shields.io/badge/Built%20with-Arcium-7C3AED)](https://arcium.com)
[![Solana](https://img.shields.io/badge/Chain-Solana-14F195)](https://solana.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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

## 🔐 How Arcium Provides Privacy

### The Problem with Public Voting
Traditional DAO voting on Solana is fully transparent — anyone can see who voted for what. This creates three attack vectors:

1. **Vote-buying**: Bad actors pay voters for provable votes
2. **Coercion**: Token holders are pressured into voting a certain way
3. **Frontrunning**: Whales observe vote trends and manipulate outcomes

### How VeilVote Solves This

1. **Local Encryption**: Your vote is encrypted in your browser using x25519 key exchange + RescueCipher. The plaintext NEVER leaves your device.

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

## 🛠️ Tech Stack

### Backend
- **Solana** — High-performance L1 blockchain
- **Anchor 0.32.x** — Solana framework for secure programs
- **Arcium SDK** — MPC-based confidential computing
- **Rust** — Systems programming for circuits and programs

### Frontend
- **Next.js 14** — React framework with App Router
- **TypeScript** — Type-safe client code
- **Vanilla CSS** — Custom design system (no Tailwind)
- **@solana/wallet-adapter** — Phantom/Solflare wallet connection
- **@noble/curves** — x25519 key exchange

## 📁 Project Structure

```
veilvote/
├── encrypted-ixs/src/lib.rs      # Arcis MPC circuits (3 instructions)
├── programs/veilvote/src/lib.rs   # Anchor program (9 instructions)
├── tests/veilvote.ts              # Integration tests
├── app/                           # Next.js 14 frontend
│   └── src/
│       ├── app/                   # Pages (landing, proposals, vote, how-it-works)
│       ├── components/            # UI components (9 components)
│       └── lib/                   # SDK wrappers and types
├── scripts/vps-setup.sh           # VPS toolchain installer
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Linux/macOS (for Arcium CLI)
- Rust, Solana CLI 2.3.0, Anchor 0.32.1
- Docker, Node.js 18+

### Setup
```bash
# 1. Install Arcium toolchain
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
source $HOME/.cargo/env
arcup install

# 2. Clone and build
git clone https://github.com/YOUR_USERNAME/veilvote.git
cd veilvote
arcium build

# 3. Test on devnet
solana config set --url https://api.devnet.solana.com
arcium test --cluster devnet

# 4. Deploy
arcium deploy

# 5. Frontend
cd app
npm install
npm run dev
```

### VPS Setup (Ubuntu 22.04)
```bash
# Run the automated setup script
bash scripts/vps-setup.sh
```

## 📝 On-Chain Instructions

| Instruction | Type | Purpose |
|------------|------|---------|
| `init_vote_stats_comp_def` | Init | Register init_vote_stats circuit |
| `init_vote_comp_def` | Init | Register vote circuit |
| `init_reveal_result_comp_def` | Init | Register reveal_result circuit |
| `create_proposal` | Queue | Create proposal + init encrypted tallies |
| `init_vote_stats_callback` | Callback | Store initial encrypted VoteStats |
| `cast_vote` | Queue | Submit encrypted vote to MPC |
| `vote_callback` | Callback | Update encrypted tallies on-chain |
| `reveal_result` | Queue | Request boolean reveal from MPC |
| `reveal_result_callback` | Callback | Publish pass/fail result |

## 🧪 Testing

```bash
# Run full test suite against Solana devnet
arcium test --cluster devnet

# Tests cover:
# ✅ Computation definition initialization
# ✅ Proposal creation with metadata
# ✅ Encrypted vote casting
# ✅ Double-vote prevention
# ✅ Result reveal and verification
```

## 🎨 Frontend

Premium dark theme with glassmorphism, inspired by modern DeFi dashboards.

### Pages
- **Landing** — Hero, feature cards, stats, CTA
- **Proposals** — Filterable grid with countdown timers
- **Vote/[id]** — Vote casting with 4-stage progress tracker
- **How It Works** — Step-by-step MPC explainer

### Design System
- Deep dark background (#07070f)
- Purple/violet accent gradient (#7C3AED → #4F46E5)
- Glass cards with frosted borders
- Outfit + Inter typography
- Micro-animations and staggered reveals

## 📜 License

MIT — see [LICENSE](LICENSE)

## 🔗 Links

- [Arcium Developer Docs](https://docs.arcium.com/developers)
- [Arcium Examples (Voting)](https://github.com/arcium-hq/examples/tree/main/voting)
- [Arcium TypeScript SDK](https://ts.arcium.com/api)
- [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter)
- [Arcium Skills Bounty](https://skills.arcium.com)
