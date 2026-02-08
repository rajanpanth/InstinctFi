# InstinctFi — On-Chain Prediction Markets on Solana

> Buy option-coins on prediction polls. Winners take the entire losing pool.
> **Real SOL. Real stakes. Fully on-chain.**

## Architecture

```
InstinctFi/
├── Anchor.toml                     # Anchor workspace config (devnet)
├── Cargo.toml                      # Rust workspace
├── programs/
│   └── instinctfi/                 # Unified Anchor program
│       └── src/
│           ├── lib.rs              # 7 instructions: initialize_user, create_poll,
│           │                       #   edit_poll, delete_poll, cast_vote,
│           │                       #   settle_poll, claim_reward
│           ├── state.rs            # UserAccount, PollAccount, VoteAccount (PDAs)
│           ├── errors.rs           # InstinctFiError enum
│           └── instructions/
│               ├── initialize_user.rs  # Create on-chain user profile
│               ├── create_poll.rs      # Create poll with real SOL investment
│               ├── edit_poll.rs        # Edit poll (creator-only, zero votes)
│               ├── delete_poll.rs      # Delete poll, refund SOL from treasury
│               ├── cast_vote.rs        # Buy option-coins with real SOL
│               ├── settle_poll.rs      # Determine winner, send creator reward
│               ├── claim_reward.rs     # Winners claim proportional SOL from treasury
│               └── mod.rs
├── tests/
│   └── voting.ts                   # E2E tests
└── app/                            # Next.js 15 Frontend
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx          # Root layout + providers
    │   │   ├── page.tsx            # Landing page
    │   │   ├── create/page.tsx     # Poll creation (SOL investment)
    │   │   ├── polls/page.tsx      # Poll listing with filters
    │   │   ├── polls/[id]/page.tsx # Poll detail + voting + settlement
    │   │   ├── leaderboard/page.tsx# On-chain leaderboard
    │   │   └── profile/page.tsx    # Wallet profile + stats
    │   ├── components/
    │   │   ├── Providers.tsx       # Solana transaction layer + app state
    │   │   ├── Navbar.tsx          # Navigation + SOL balance
    │   │   ├── PollCard.tsx        # Poll display card
    │   │   ├── VotePopup.tsx       # Voting modal
    │   │   └── ...
    │   └── lib/
    │       ├── program.ts          # On-chain program interaction (PDA derivation,
    │       │                       #   instruction builders, Borsh encoding,
    │       │                       #   account deserialization, tx helpers)
    │       ├── constants.ts        # Categories & metadata
    │       └── supabase.ts         # Optional off-chain indexer
    ├── tailwind.config.js
    ├── next.config.js
    └── package.json
```

## How It Works

### On-Chain Flow

```
Creator (SOL) ──→ create_poll ──→ Treasury PDA (holds SOL)
                                      │
Voter (SOL) ──→ cast_vote ──────→ Treasury PDA (more SOL)
                                      │
Anyone ──→ settle_poll ──→ Winner determined (highest votes)
                                      │
Winner ──→ claim_reward ←──── Treasury PDA sends proportional SOL
```

### Tokenomics
1. **Creator** creates a poll with real SOL investment
   - Platform fee: 1% of investment (stays in treasury)
   - Creator reward: 1% of investment (sent to creator on settlement)
   - Pool seed: 98% of investment (distributed to winners)
2. **Voters** buy option-coins at `unit_price` lamports per coin
   - Real SOL transferred to treasury PDA via `system_program::transfer`
3. **Settlement** — after end time, highest vote count wins
4. **Claim** — winners split the entire pool proportionally:
   ```
   user_reward = (user_votes / total_winning_votes) × total_pool
   ```
   Real SOL transferred from treasury PDA back to winners.

### On-Chain Accounts (PDAs)

| Account | Seeds | Description |
|---------|-------|-------------|
| UserAccount | `["user", authority]` | User profile & stats |
| PollAccount | `["poll", creator, poll_id]` | Poll data & vote counts |
| Treasury | `["treasury", poll_account]` | SOL vault for each poll |
| VoteAccount | `["vote", poll_account, voter]` | Vote record per user per poll |

### Security

- **Real SOL transfers** via `system_program::transfer` CPI — not internal accounting
- **Treasury PDAs** hold all funds — only the program can sign for withdrawals
- **Creator cannot vote** on their own poll (enforced on-chain)
- **Settlement only once** — status flag prevents double-settlement
- **Proportional rewards** — computed with u128 math to prevent overflow
- **Refunds on delete** — full SOL returned if no votes cast
- **Permissionless settlement** — anyone can trigger after end time

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana (Devnet) |
| Smart Contract | Anchor 0.30.1 (Rust) |
| Frontend | Next.js 15, React 19, Tailwind CSS 3.4 |
| Wallet | Phantom (signMessage + signTransaction) |
| Off-chain Index | Supabase (optional, for images/caching) |

## Quick Start

### Prerequisites
- Rust & Cargo
- Solana CLI
- Anchor CLI
- Node.js 18+

### Build & Deploy
```bash
# Install dependencies
yarn install

# Build the Anchor program
anchor build

# Get the generated program ID
anchor keys list

# Deploy to devnet
solana config set --url devnet
solana airdrop 2
anchor deploy
```

### Frontend
```bash
cd app
npm install
npm run dev
```

### Get Devnet SOL
- Use the in-app "Claim SOL" button (devnet airdrop)
- Or: `solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet`

## Program Details

### Instructions

| Instruction | Description | SOL Transfer |
|-------------|-------------|-------------|
| `initialize_user` | Create user PDA account | Rent only |
| `create_poll` | Create poll + treasury PDA | Creator → Treasury |
| `edit_poll` | Edit poll (0 votes, active) | None |
| `delete_poll` | Delete poll, refund SOL | Treasury → Creator |
| `cast_vote` | Buy option-coins | Voter → Treasury |
| `settle_poll` | Settle + creator reward | Treasury → Creator |
| `claim_reward` | Winners claim SOL | Treasury → Winner |

### Program ID
```
Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```
*(Placeholder — will be updated after `anchor deploy`)*

## Future Roadmap
- Tradable option-coins (SPL tokens per option)
- Oracle-based outcome resolution (Pyth/Switchboard)
- DAO governance for poll dispute resolution
- NFT rewards for top voters
- Multi-chain deployment
