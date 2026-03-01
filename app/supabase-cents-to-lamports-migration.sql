-- ============================================================
-- InstinctFi — Cents → Lamports Data Migration
-- ============================================================
-- 
-- BACKGROUND:
--   The app originally used SOL_UNIT = 100 (a "cents" abstraction).
--   All monetary values (unit_price_cents, total_pool_cents, balance, etc.)
--   were stored at 100x scale (e.g., 0.01 SOL → 1, 1 SOL → 100).
--
--   The code has been updated to use SOL_UNIT = LAMPORTS_PER_SOL (1e9).
--   New data is now written at 1e9 scale, but EXISTING data still sits at
--   the old 100x scale. This migration multiplies all existing monetary
--   values by 10,000,000 (= 1e9 / 100) so they become correct lamport values.
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
--   4. Refresh the app — SOL values should display correctly
--
-- SAFETY: This is idempotent-safe because it only scales rows where
--         values are suspiciously small (< 1_000_000, i.e. < 0.001 SOL).
--         Rows already at lamports scale will NOT be touched.
-- ============================================================

BEGIN;

-- ── 1. Polls table — scale all monetary columns ──
UPDATE polls
SET
  unit_price_cents        = unit_price_cents        * 10000000,
  total_pool_cents        = total_pool_cents        * 10000000,
  creator_investment_cents = creator_investment_cents * 10000000,
  platform_fee_cents      = platform_fee_cents      * 10000000,
  creator_reward_cents    = creator_reward_cents    * 10000000
WHERE
  -- Only scale rows that are still in the old "cents" range.
  -- Any value < 1,000,000 is almost certainly old-scale data
  -- (it would mean < 0.001 SOL in lamports, which is implausible for a poll).
  unit_price_cents > 0 AND unit_price_cents < 1000000;

-- ── 2. Users table — scale balance and financial stats ──
UPDATE users
SET
  balance               = balance               * 10000000,
  total_spent_cents     = total_spent_cents     * 10000000,
  total_winnings_cents  = total_winnings_cents  * 10000000,
  weekly_winnings_cents = weekly_winnings_cents * 10000000,
  monthly_winnings_cents = monthly_winnings_cents * 10000000,
  weekly_spent_cents    = weekly_spent_cents    * 10000000,
  monthly_spent_cents   = monthly_spent_cents   * 10000000,
  creator_earnings_cents = creator_earnings_cents * 10000000
WHERE
  -- Scale users whose balance is in the old cents range.
  -- Old default was likely 500000 ($5k in cents). New default is 5000000000 (5 SOL).
  -- Any balance < 1,000,000 is old-scale. Skip users already at lamports scale.
  balance > 0 AND balance < 1000000;

-- ── 3. Votes table — scale total_staked_cents ──
UPDATE votes
SET
  total_staked_cents = total_staked_cents * 10000000
WHERE
  total_staked_cents > 0 AND total_staked_cents < 1000000;

COMMIT;

-- ── Verification queries (optional — run to confirm) ──
-- SELECT id, title, unit_price_cents, total_pool_cents FROM polls LIMIT 10;
-- SELECT wallet, balance, total_spent_cents FROM users LIMIT 10;
-- SELECT id, total_staked_cents FROM votes LIMIT 10;
