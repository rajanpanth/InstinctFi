# 🗳️ SolPredict — Decentralized Prediction Polling dApp

### SuberTeam Mini Hackathon Submission Report

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution & Key Features](#3-solution--key-features)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [On-Chain Programs (Smart Contracts)](#6-on-chain-programs-smart-contracts)
7. [Frontend Application](#7-frontend-application)
8. [User Flow](#8-user-flow)
9. [Tokenomics & Fee Structure](#9-tokenomics--fee-structure)
10. [Leaderboard & Gamification](#10-leaderboard--gamification)
11. [Security Considerations](#11-security-considerations)
12. [Setup & Installation](#12-setup--installation)
13. [Future Roadmap](#13-future-roadmap)
14. [Team](#14-team)

---

## 1. Project Overview

**SolPredict** is a decentralized prediction polling platform built on the **Solana blockchain** using the **Anchor framework**. Users connect their **Phantom wallet**, receive a **$5,000 signup bonus**, and can create or participate in prediction polls by purchasing "option-coins." When a poll ends, the winning option is determined, and the prize pool is distributed proportionally to the winners.

The platform uses an internal dollar-denominated accounting system (stored in cents) to provide familiar UX while leveraging Solana's on-chain program architecture for transparent, tamper-proof poll logic.

---

## 2. Problem Statement

Traditional polling and prediction platforms suffer from:

- **Centralized control** — Platform operators can manipulate outcomes
- **Lack of transparency** — No audit trail for votes or fund distribution
- **No skin in the game** — Free polls don't incentivize thoughtful predictions
- **No rewards** — Users have no financial motivation to participate accurately

**SolPredict** solves these by putting poll creation, voting, settlement, and reward distribution on Solana's blockchain, ensuring transparency, immutability, and trustless execution.

---

## 3. Solution & Key Features

| Feature | Description |
|---|---|
| 🔐 **Phantom Wallet Auth** | One-click login via Phantom browser extension — no passwords, no email |
| 💰 **$5,000 Signup Bonus** | New users receive $5,000 in demo dollars to start predicting immediately |
| 📅 **Weekly Rewards** | Every 7 days, users can claim an additional $1,000 reward |
| 🗳️ **Create Polls** | Anyone can create prediction polls with custom options, duration, unit price, and initial investment |
| 🪙 **Option-Coin Voting** | Users buy "coins" for their predicted option — more coins = higher conviction & reward |
| ⚖️ **Trustless Settlement** | Anyone can trigger settlement once a poll ends — the option with the most votes wins |
| 💸 **Proportional Rewards** | Winners receive a share of the total pool proportional to their coin count |
| 🏆 **Multi-Period Leaderboard** | Weekly, monthly, and all-time leaderboards with multiple sort criteria |
| 👤 **Rich Profile Dashboard** | Personal stats, created polls, vote history, net profit tracking |
| 🎨 **Dark Modern UI** | Polished dark theme with smooth animations and responsive mobile design |

---

## 4. Tech Stack

### Blockchain Layer
| Technology | Purpose |
|---|---|
| **Solana** | Layer-1 blockchain (high throughput, low latency, low fees) |
| **Anchor 0.30.1** | Solana smart contract framework (Rust-based, type-safe) |
| **Rust** | Programming language for on-chain programs |

### Frontend Layer
| Technology | Purpose |
|---|---|
| **Next.js 15.1** | React-based full-stack web framework (App Router) |
| **React 19** | UI component library |
| **TypeScript** | Type-safe JavaScript for frontend logic |
| **Tailwind CSS 3.4** | Utility-first CSS framework for styling |
| **React Hot Toast** | Notification system for user feedback |

### Wallet Integration
| Technology | Purpose |
|---|---|
| **Phantom Wallet** | Solana's leading browser wallet extension |
| **@solana/web3.js** | Solana JavaScript SDK for blockchain interaction |
| **Direct `window.solana` API** | Native Phantom integration (no adapter dependencies) |

---

## 5. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌────────┐│
│  │ Landing  │  │  Polls   │  │ Leaderboard│  │Profile ││
│  │  Page    │  │  CRUD    │  │  (3 tabs)  │  │  Stats ││
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └───┬────┘│
│       │              │              │              │      │
│  ┌────▼──────────────▼──────────────▼──────────────▼────┐│
│  │              Providers.tsx (App Context)              ││
│  │  • Phantom wallet auth    • Demo dollar engine       ││
│  │  • UserAccount management • Poll/Vote state          ││
│  │  • Weekly rewards         • Leaderboard resets       ││
│  └──────────────────────┬───────────────────────────────┘│
└─────────────────────────┼────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                SOLANA BLOCKCHAIN (Devnet)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ user_program │  │ poll_program │  │  vote_program  │ │
│  │              │  │              │  │                │ │
│  │ • signup()   │  │ • create     │  │ • cast_vote()  │ │
│  │ • claim      │  │   _poll()    │  │                │ │
│  │   _weekly()  │  │              │  │                │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  ┌─────────────────────┐                                 │
│  │ settlement_program  │                                 │
│  │                     │                                 │
│  │ • settle_poll()     │                                 │
│  │ • claim_reward()    │                                 │
│  └─────────────────────┘                                 │
└──────────────────────────────────────────────────────────┘
```

---

## 6. On-Chain Programs (Smart Contracts)

The project contains **4 Anchor programs**, each with a single responsibility:

### 6.1 `user_program`
**Purpose:** Manages user accounts, signup bonuses, and weekly rewards.

| Instruction | Description |
|---|---|
| `signup(is_demo)` | Creates a PDA-based UserAccount with seeds `["user", authority]`. Awards $5,000 signup bonus. |
| `claim_weekly_reward()` | Checks if 7 days have elapsed since last claim, then credits $1,000. |

**Key Account — `UserAccount` (258 bytes):**
```rust
pub struct UserAccount {
    pub authority: Pubkey,        // Wallet that owns this account
    pub is_demo: bool,           // Demo mode flag
    pub demo_balance: u64,       // Balance in cents ($1 = 100)
    pub real_balance: u64,       // Reserved for real-mode
    pub signup_bonus_claimed: bool,
    pub last_weekly_reward_ts: i64,
    pub total_votes_cast: u64,
    pub total_polls_voted: u64,
    pub polls_won: u64,
    pub total_spent_cents: u64,
    pub total_winnings_cents: u64,
    pub weekly_winnings_cents: u64,
    pub monthly_winnings_cents: u64,
    pub creator_earnings_cents: u64,
    pub polls_created: u64,
    pub weekly_reset_ts: i64,
    pub monthly_reset_ts: i64,
}
```

**Constants:**
- `SIGNUP_BONUS = 500_000` cents ($5,000)
- `WEEKLY_REWARD = 100_000` cents ($1,000)
- `WEEK_SECONDS = 604_800` (7 days)

---

### 6.2 `poll_program`
**Purpose:** Creates and stores prediction polls.

| Instruction | Parameters | Description |
|---|---|---|
| `create_poll()` | title, description, category, options[], duration, unit_price_cents, creator_investment_cents | Creates a PDA-based `PollAccount` with computed fees |

**Key Account — `PollAccount`:**
```rust
pub struct PollAccount {
    pub creator: Pubkey,
    pub title: String,
    pub description: String,
    pub category: String,
    pub options: Vec<String>,
    pub end_time: i64,
    pub unit_price_cents: u64,     // Cost per option-coin in cents
    pub total_pool_cents: u64,     // Total prize pool in cents
    pub creator_investment_cents: u64,
    pub platform_fee_cents: u64,   // 1% platform fee
    pub creator_reward_cents: u64, // 1% creator reward
    pub vote_counts: Vec<u64>,     // Votes per option
    pub total_voters: u64,
    pub status: u8,                // 0=Active, 1=Settled
    pub winning_option: u8,        // 255=No winner
}
```

**Fee Calculation:**
```
Platform Fee    = max(creator_investment / 100, 1)  → 1%
Creator Reward  = max(creator_investment / 100, 1)  → 1%
Pool Seed       = creator_investment - platform_fee - creator_reward  → 98%
```

---

### 6.3 `vote_program`
**Purpose:** Records votes (option-coin purchases).

| Instruction | Parameters | Description |
|---|---|---|
| `cast_vote()` | option_index, num_coins | Deducts `num_coins × unit_price` from user balance, adds to pool, records vote |

**Key Account — `VoteAccount`:**
```rust
pub struct VoteAccount {
    pub voter: Pubkey,
    pub poll: Pubkey,
    pub votes_per_option: Vec<u64>, // Coins bought per option
    pub total_staked_cents: u64,    // Total spent on this poll
    pub claimed: bool,              // Whether reward has been claimed
}
```

---

### 6.4 `settlement_program`
**Purpose:** Settles polls and distributes rewards.

| Instruction | Description |
|---|---|
| `settle_poll()` | Determines winning option (most votes). Sets `status=1` and `winning_option`. |
| `claim_reward()` | Winners call this to claim their proportional share of the pool. |

**Reward Formula:**
```
user_reward = (user_winning_votes / total_winning_votes) × total_pool_cents
```

---

## 7. Frontend Application

### Directory Structure
```
app/src/
├── app/
│   ├── layout.tsx          # Root layout with Providers wrapper
│   ├── page.tsx            # Landing page + auth gate
│   ├── create/
│   │   └── page.tsx        # Poll creation form
│   ├── polls/
│   │   ├── page.tsx        # Poll listing/browse page
│   │   └── [id]/
│   │       └── page.tsx    # Poll detail + voting + claim
│   ├── leaderboard/
│   │   └── page.tsx        # Multi-period leaderboard
│   └── profile/
│       └── page.tsx        # User stats + history
├── components/
│   ├── Providers.tsx       # Global state, auth, demo engine
│   └── Navbar.tsx          # Navigation + wallet controls
└── globals.css             # Tailwind + custom dark theme
```

### Key Frontend Module: `Providers.tsx`

This is the brain of the frontend — a React Context provider that manages:

1. **Wallet Authentication** — Direct Phantom `window.solana` integration
2. **User Account System** — Auto-signup with $5,000 bonus on wallet connect
3. **Demo Dollar Engine** — All transactions use internal cent-based accounting
4. **Poll CRUD** — Create, browse, vote, settle, claim
5. **Leaderboard Engine** — Weekly/monthly/all-time stat tracking with automatic period resets

**Exported Utilities:**
```typescript
CENTS = 100                           // $1 = 100 cents
formatDollars(cents: number): string  // 50000 → "$500.00"
formatDollarsShort(cents: number)     // 150000 → "$1.5K"
```

---

## 8. User Flow

### 8.1 First-Time User
```
1. Visit SolPredict → See landing page with "Connect Phantom" button
2. Click "Connect Phantom" → Phantom popup asks for approval
3. Approve → Auto-signup triggers:
   • UserAccount created with $5,000 balance
   • Redirected to dashboard
4. Browse existing polls OR create a new one
```

### 8.2 Creating a Poll
```
1. Navigate to "Create Poll"
2. Fill in:
   • Title: "Will BTC hit $100K by March?"
   • Category: "Crypto"
   • Options: ["Yes", "No"]
   • Duration: 24 hours
   • Unit Price: $1.00 per coin
   • Initial Investment: $100.00
3. Submit → $100 deducted, poll created with:
   • $1 platform fee
   • $1 creator reward
   • $98 initial pool
```

### 8.3 Voting on a Poll
```
1. Browse polls → Click on one
2. Select an option (e.g., "Yes")
3. Choose number of coins (e.g., 10 coins × $1 = $10)
4. Confirm → $10 deducted from balance, added to pool
5. Your vote is recorded on-chain
```

### 8.4 Settlement & Claiming
```
1. Poll timer expires → Status changes to "Awaiting Settlement"
2. Anyone clicks "Settle Poll" → Winning option determined
3. If you voted for the winner:
   • "You Won!" banner appears with reward amount
   • Click "Claim Reward" → Proportional share credited to balance
4. Creator receives their 1% reward automatically on settlement
```

---

## 9. Tokenomics & Fee Structure

```
┌─────────────────────────────────────────────────┐
│              POLL ECONOMICS EXAMPLE              │
│                                                  │
│  Creator Investment:        $100.00              │
│  ├── Platform Fee (1%):      -$1.00              │
│  ├── Creator Reward (1%):    -$1.00              │
│  └── Initial Pool (98%):    $98.00               │
│                                                  │
│  + Voter 1 buys 50 "Yes" coins:  +$50.00        │
│  + Voter 2 buys 30 "No" coins:   +$30.00        │
│  + Voter 3 buys 20 "Yes" coins:  +$20.00        │
│                                                  │
│  Total Pool:                $198.00              │
│                                                  │
│  Result: "Yes" wins (70 vs 30 votes)             │
│                                                  │
│  Voter 1 reward: (50/70) × $198 = $141.43       │
│  Voter 3 reward: (20/70) × $198 =  $56.57       │
│  Voter 2 reward:                     $0.00       │
│  Creator reward (on settlement):     $1.00       │
└─────────────────────────────────────────────────┘
```

### Revenue Streams
| Source | Rate | Recipient |
|---|---|---|
| Platform Fee | 1% of creator investment | Platform treasury |
| Creator Reward | 1% of creator investment | Poll creator |
| Signup Bonus | $5,000 (demo) | New users |
| Weekly Reward | $1,000 every 7 days | All active users |

---

## 10. Leaderboard & Gamification

### Three Leaderboard Periods:

| Period | Reset Frequency | Tracks |
|---|---|---|
| **Weekly** | Every 7 days | Weekly winnings, spent, votes, polls won/voted |
| **Monthly** | Every 30 days | Monthly winnings, spent, votes, polls won/voted |
| **All Time** | Never | Cumulative lifetime stats |

### Sort Criteria:
- **Total Profit** — Net winnings minus spending
- **Wins** — Number of polls won
- **Votes Cast** — Total coins purchased across all polls
- **Creator Earnings** — Revenue from creating popular polls

### Gamification Elements:
- 🥇 Gold badge for #1 rank
- 🥈 Silver badge for #2 rank
- 🥉 Bronze badge for #3 rank
- "(you)" indicator highlights the current user's row
- Highlighted row background for the current user

---

## 11. Security Considerations

| Concern | Mitigation |
|---|---|
| **Sybil attacks** | Wallet-based identity — one account per Phantom wallet |
| **Double voting** | PDA seeds include voter pubkey — one VoteAccount per user per poll |
| **Double claiming** | `claimed: bool` flag on VoteAccount prevents re-claims |
| **Fund manipulation** | All balances stored as integers (cents) to avoid floating-point errors |
| **Unauthorized settlement** | Settlement is permissionless — anyone can trigger it, but only after `end_time` |
| **Creator self-voting** | Frontend blocks creators from voting on their own polls |
| **Overflow protection** | `checked_add`, `checked_mul`, `checked_sub` used in Rust programs |
| **Account validation** | Anchor's account constraints (`has_one`, `seeds`, `bump`) enforce PDA ownership |

---

## 12. Setup & Installation

### Prerequisites
- Node.js ≥ 18
- Phantom Wallet browser extension
- (Optional) Rust + Anchor CLI for on-chain development

### Quick Start
```bash
# Clone the repository
git clone <repo-url>
cd votingproject

# Install frontend dependencies
cd app
npm install

# Start development server
node node_modules/next/dist/bin/next dev --port 3001

# Open in browser
# http://localhost:3001
```

### Building Anchor Programs (Optional)
```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Build all programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Program IDs
| Program | ID |
|---|---|
| user_program | `UserPrgm111111111111111111111111111111111` |
| poll_program | `Po11CrtrPrgm111111111111111111111111111111` |
| vote_program | `VotePrgm1111111111111111111111111111111111` |
| settlement_program | `Sett1ePrgm11111111111111111111111111111111` |

---

## 13. Future Roadmap

| Phase | Feature | Description |
|---|---|---|
| **v1.1** | Real SOL Mode | Toggle between demo dollars and real SOL transactions |
| **v1.2** | SPL Token Support | Use custom SPL token for platform-wide value |
| **v1.3** | Oracle Integration | Pyth/Switchboard price feeds for auto-settlement of price predictions |
| **v2.0** | Governance | Token holders vote on platform parameters (fee %, reward amounts) |
| **v2.1** | Multiplayer Pools | Multi-round prediction tournaments with cumulative scoring |
| **v2.2** | Mobile App | React Native app with Phantom mobile deep-link integration |
| **v3.0** | Cross-Chain | Bridge to Ethereum/Polygon for multi-chain prediction markets |

---

## 14. Team

**SuberTeam Mini Hackathon Entry**

Built with ❤️ on Solana.

---

*This document was generated for the SuberTeam Mini Hackathon submission. All code, architecture, and design choices are original work.*
