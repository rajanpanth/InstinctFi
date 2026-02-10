# Contributing to InstinctFi

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/rajanpanth/instinctfi.git
   cd instinctfi
   ```
3. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Frontend

```bash
cd app
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Smart Contracts (Rust / Anchor)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Build programs
anchor build

# Run tests
anchor test
```

## Project Structure

- **`programs/`** — Solana smart contracts (Rust/Anchor)
- **`app/`** — Next.js frontend (TypeScript/React)
- **`tests/`** — End-to-end Anchor tests

## Making Changes

### Frontend Changes

- Follow existing patterns in `app/src/components/` and `app/src/lib/`
- Use Tailwind CSS for styling
- TypeScript strict mode is enabled — no `any` types
- Test responsiveness on mobile viewport sizes

### Smart Contract Changes

- Follow Anchor best practices and existing code patterns
- Add proper error variants to `errors.rs`
- Use `checked_*` arithmetic operations to prevent overflow
- Add tests for new instructions in `tests/voting.ts`

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add poll expiry notification
fix: handle edge case in reward calculation
docs: update setup instructions
refactor: extract PDA derivation helper
```

## Pull Request Process

1. Ensure your code builds without errors
2. Update documentation if you've changed APIs or setup steps
3. Write a clear PR description explaining **what** and **why**
4. Link any related issues
5. Request a review

## Code Style

- **TypeScript/JS:** Prettier formatting (run `npm run lint:fix` from root)
- **Rust:** `cargo fmt` for formatting, `cargo clippy` for linting

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include browser/OS/wallet version if relevant
- Label appropriately (bug, feature, docs, etc.)

## Questions?

Open a Discussion on GitHub or reach out via Issues.

---

Thank you for helping make InstinctFi better!
