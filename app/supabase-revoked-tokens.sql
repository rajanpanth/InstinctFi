-- ============================================================
-- S-08 FIX: JWT revocation table
-- Run this migration in Supabase SQL Editor.
-- ============================================================

-- Stores revoked JWT IDs (jti) so tokens can be invalidated
-- before their natural expiration (e.g. on logout, password change).
create table if not exists revoked_tokens (
    jti text primary key,
    wallet text not null,
    revoked_at timestamptz not null default now(),
    expires_at timestamptz not null  -- auto-cleanup: delete after JWT would have expired anyway
);

-- Index for fast lookup during JWT verification
create index if not exists idx_revoked_tokens_jti on revoked_tokens(jti);

-- Index for cleanup job
create index if not exists idx_revoked_tokens_expires_at on revoked_tokens(expires_at);

-- RLS: No direct client access. Only service role (via SECURITY DEFINER RPCs) can read/write.
alter table revoked_tokens enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon — all access via service role.

-- ── Cleanup function: removes expired entries (call via pg_cron or manually) ──
create or replace function cleanup_revoked_tokens()
returns void
language plpgsql
security definer
as $$
begin
    delete from revoked_tokens where expires_at < now();
end;
$$;

-- Optional: Schedule cleanup every hour (requires pg_cron extension)
-- select cron.schedule('cleanup-revoked-tokens', '0 * * * *', 'select cleanup_revoked_tokens()');
