-- ─── Comment Reactions Schema ───────────────────────────────────────────────
-- Allows users to react to comments with emoji (👍, 🔥, 🧠).
-- One reaction per user per emoji per comment.

CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '🔥', '🧠')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (comment_id, wallet, emoji)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_wallet ON comment_reactions(wallet);

-- RLS policies
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
  ON comment_reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert reactions"
  ON comment_reactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own reactions"
  ON comment_reactions FOR DELETE USING (true);

-- ─── Toggle reaction RPC ────────────────────────────────────────────────────
-- Inserts if not exists, deletes if exists (toggle behavior)
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_comment_id UUID,
  p_wallet TEXT,
  p_emoji TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  existing_id UUID;
  result JSON;
BEGIN
  -- Check if reaction exists
  SELECT id INTO existing_id
  FROM comment_reactions
  WHERE comment_id = p_comment_id AND wallet = p_wallet AND emoji = p_emoji;

  IF existing_id IS NOT NULL THEN
    -- Remove reaction
    DELETE FROM comment_reactions WHERE id = existing_id;
    result := json_build_object('action', 'removed', 'emoji', p_emoji);
  ELSE
    -- Add reaction
    INSERT INTO comment_reactions (comment_id, wallet, emoji)
    VALUES (p_comment_id, p_wallet, p_emoji);
    result := json_build_object('action', 'added', 'emoji', p_emoji);
  END IF;

  RETURN result;
END;
$$;

-- ─── Get reaction counts for a set of comments ─────────────────────────────
CREATE OR REPLACE FUNCTION get_reaction_counts(p_comment_ids UUID[])
RETURNS TABLE (
  comment_id UUID,
  emoji TEXT,
  count BIGINT
) LANGUAGE SQL STABLE AS $$
  SELECT cr.comment_id, cr.emoji, COUNT(*) as count
  FROM comment_reactions cr
  WHERE cr.comment_id = ANY(p_comment_ids)
  GROUP BY cr.comment_id, cr.emoji;
$$;

-- ─── Streak columns for users ───────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date DATE;
