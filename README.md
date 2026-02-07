# SolVote — Decentralized Prediction Polls on Solana

> Vote on polls by buying option-coins. Winners take the entire losing pool.

## Architecture

```
votingproject/
├── Anchor.toml                    # Anchor workspace config
├── Cargo.toml                     # Rust workspace
├── programs/
│   ├── poll_program/              # Program 1: Poll creation & management
│   │   └── src/
│   │       ├── lib.rs             # Entry point: create_poll instruction
│   │       ├── state.rs           # PollAccount schema (PDA)
│   │       ├── errors.rs          # Error codes
│   │       └── instructions/
│   │           └── create_poll.rs # Create poll handler + accounts
│   ├── vote_program/              # Program 2: Voting & option-coin purchase
│   │   └── src/
│   │       ├── lib.rs             # Entry point: cast_vote instruction
│   │       ├── state.rs           # VoteAccount + UserStats schemas
│   │       ├── errors.rs          # Error codes
│   │       └── instructions/
│   │           └── cast_vote.rs   # Vote handler + accounts
│   └── settlement_program/        # Program 3: Settlement & rewards
│       └── src/
│           ├── lib.rs             # Entry points: settle_poll, claim_reward
│           ├── errors.rs          # Error codes
│           └── instructions/
│               ├── settle_poll.rs # Settlement logic (most votes wins)
│               └── claim_reward.rs# Proportional reward distribution
├── tests/
│   └── voting.ts                  # E2E tests + tokenomics validation
└── app/                           # Next.js Frontend
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx         # Root layout + providers
    │   │   ├── page.tsx           # Landing page (hero + how it works)
    │   │   ├── globals.css        # Tailwind + dark theme
    │   │   ├── create/page.tsx    # Poll creation form
    │   │   ├── polls/page.tsx     # Poll listing with filters
    │   │   ├── polls/[id]/page.tsx# Poll detail + voting + settlement
    │   │   ├── leaderboard/page.tsx# Sortable leaderboard
    │   │   └── profile/page.tsx   # Wallet profile + stats
    │   └── components/
    │       ├── Providers.tsx       # Wallet + Demo mode context
    │       └── Navbar.tsx          # Navigation + mode toggle
    ├── tailwind.config.js
    ├── next.config.js
    └── package.json
```

## How It Works

### Tokenomics
1. **Creator** creates a poll with seed investment
   - Platform fee: 1% of investment
   - Creator reward: 1% of investment
   - Pool seed: 98% of investment
2. **Voters** buy option-coins at `unit_price` per coin (1 coin = 1 vote)
   - Funds go to treasury PDA
3. **Settlement** — after end time, highest vote count wins
4. **Claim** — winners split the entire pool proportionally:
   ```
   user_reward = (user_votes / total_winning_votes) × total_pool
   ```

### On-Chain Accounts (PDAs)
| Account | Seeds | Program |
|---------|-------|---------|
| PollAccount | `["poll", creator, poll_id]` | poll_program |
| Treasury | `["treasury", poll_account]` | poll_program |
| VoteAccount | `["vote", poll_account, voter]` | vote_program |
| UserStats | `["user_stats", user]` | vote_program |

### Security Rules
- Poll data immutable after creation
- End time enforced on-chain
- Creator cannot vote on own poll
- Settlement only once (status flag)
- All funds locked until settlement
- Transparent math (no hidden fees)

## Demo Mode
- Auto-balance: $5,000 demo dollars
- No wallet required
- Full simulation of all flows
- Add more funds from profile page

## Quick Start

### Anchor Programs
```bash
# Install dependencies
yarn install

# Build programs
anchor build

# Run tests
anchor test
```

### Frontend
```bash
cd app
npm install
npm run dev
```

## Future Roadmap
- Tradable option-coins (SPL token per option)
- DAO governance for poll resolution disputes
- NFT rewards for top voters
- Oracle-based outcome resolution (Pyth/Switchboard)
- Multi-chain deployment
