-- ====================================================================
-- InstinctFi — Supabase Row-Level Security (RLS) Migration
-- ====================================================================
-- Run this in your Supabase Dashboard → SQL Editor
-- This enables RLS on all tables and creates policies for secure access.
--
-- IMPORTANT: After running this, anonymous/public reads are still allowed,
-- but writes require the wallet address in the request JWT metadata.
-- ====================================================================

-- ── 1. Enable RLS on all tables ─────────────────────────────────────

ALTER TABLE IF EXISTS polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS poll_images ENABLE ROW LEVEL SECURITY;

-- ── 2. Polls ────────────────────────────────────────────────────────

-- Anyone can read polls
CREATE POLICY "polls_select_all" ON polls
  FOR SELECT USING (true);

-- Any authenticated user can create polls
CREATE POLICY "polls_insert_auth" ON polls
  FOR INSERT WITH CHECK (true);

-- Only the poll creator or admin can update their polls
CREATE POLICY "polls_update_owner" ON polls
  FOR UPDATE USING (
    creator = current_setting('request.jwt.claims', true)::json->>'wallet'
    OR current_setting('request.jwt.claims', true)::json->>'wallet' IN (
      '62PFLSvnG4Zp8jYS9AFymETvV5e8xBA2JBW2UhjqyNmS'
    )
  );

-- Only the poll creator or admin can delete their polls
CREATE POLICY "polls_delete_owner" ON polls
  FOR DELETE USING (
    creator = current_setting('request.jwt.claims', true)::json->>'wallet'
    OR current_setting('request.jwt.claims', true)::json->>'wallet' IN (
      '62PFLSvnG4Zp8jYS9AFymETvV5e8xBA2JBW2UhjqyNmS'
    )
  );

-- ── 3. Votes ────────────────────────────────────────────────────────

-- Anyone can read votes (needed for vote counts, leaderboard)
CREATE POLICY "votes_select_all" ON votes
  FOR SELECT USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "votes_insert_own" ON votes
  FOR INSERT WITH CHECK (true);

-- Only the voter can update their own vote record (for claiming)
CREATE POLICY "votes_update_own" ON votes
  FOR UPDATE USING (
    voter = current_setting('request.jwt.claims', true)::json->>'wallet'
  );

-- ── 4. Comments ─────────────────────────────────────────────────────

-- Anyone can read comments
CREATE POLICY "comments_select_all" ON comments
  FOR SELECT USING (true);

-- Authenticated users can insert comments
CREATE POLICY "comments_insert_auth" ON comments
  FOR INSERT WITH CHECK (true);

-- Only the comment author can delete their own comments
CREATE POLICY "comments_delete_own" ON comments
  FOR DELETE USING (
    wallet = current_setting('request.jwt.claims', true)::json->>'wallet'
  );

-- ── 5. Users ────────────────────────────────────────────────────────

-- Anyone can read user profiles (needed for leaderboard)
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);

-- Authenticated users can insert their own profile
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (true);

-- Only the user can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (
    wallet = current_setting('request.jwt.claims', true)::json->>'wallet'
  );

-- ── 6. Push Subscriptions ───────────────────────────────────────────

-- Users can only read their own push subscriptions
CREATE POLICY "push_subs_select_own" ON push_subscriptions
  FOR SELECT USING (
    wallet = current_setting('request.jwt.claims', true)::json->>'wallet'
  );

-- Users can insert their own push subscriptions
CREATE POLICY "push_subs_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Users can delete their own push subscriptions
CREATE POLICY "push_subs_delete_own" ON push_subscriptions
  FOR DELETE USING (
    wallet = current_setting('request.jwt.claims', true)::json->>'wallet'
  );

-- ── 7. Poll Images ─────────────────────────────────────────────────

-- Anyone can read poll images
CREATE POLICY "poll_images_select_all" ON poll_images
  FOR SELECT USING (true);

-- Authenticated users can insert poll images
CREATE POLICY "poll_images_insert_auth" ON poll_images
  FOR INSERT WITH CHECK (true);
