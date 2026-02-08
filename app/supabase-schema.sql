-- ============================================================
-- InstinctFi — Supabase Database Schema
-- Run this in your Supabase SQL Editor (supabase.com → project → SQL Editor)
-- ============================================================

-- 1. Users table
create table if not exists users (
  wallet text primary key,
  balance bigint not null default 500000,
  signup_bonus_claimed boolean not null default true,
  last_weekly_reward_ts bigint not null default 0,
  total_votes_cast bigint not null default 0,
  total_polls_voted bigint not null default 0,
  polls_won bigint not null default 0,
  polls_created bigint not null default 0,
  total_spent_cents bigint not null default 0,
  total_winnings_cents bigint not null default 0,
  weekly_winnings_cents bigint not null default 0,
  monthly_winnings_cents bigint not null default 0,
  weekly_spent_cents bigint not null default 0,
  monthly_spent_cents bigint not null default 0,
  weekly_votes_cast bigint not null default 0,
  monthly_votes_cast bigint not null default 0,
  weekly_polls_won bigint not null default 0,
  monthly_polls_won bigint not null default 0,
  weekly_polls_voted bigint not null default 0,
  monthly_polls_voted bigint not null default 0,
  creator_earnings_cents bigint not null default 0,
  weekly_reset_ts bigint not null default 0,
  monthly_reset_ts bigint not null default 0,
  created_at bigint not null default 0
);

-- 2. Polls table
create table if not exists polls (
  id text primary key,
  poll_id bigint not null default 0,
  creator text not null,
  title text not null,
  description text not null default '',
  category text not null default '',
  image_url text not null default '',
  option_images text[] not null default '{}',
  options text[] not null,
  vote_counts bigint[] not null,
  unit_price_cents bigint not null,
  end_time bigint not null,
  total_pool_cents bigint not null default 0,
  creator_investment_cents bigint not null default 0,
  platform_fee_cents bigint not null default 0,
  creator_reward_cents bigint not null default 0,
  status smallint not null default 0,
  winning_option smallint not null default 255,
  total_voters bigint not null default 0,
  created_at bigint not null default 0
);

-- 3. Votes table
create table if not exists votes (
  id uuid default gen_random_uuid() primary key,
  poll_id text not null references polls(id) on delete cascade,
  voter text not null,
  votes_per_option bigint[] not null,
  total_staked_cents bigint not null default 0,
  claimed boolean not null default false,
  unique(poll_id, voter)
);

-- 4. Disable Row Level Security (for hackathon simplicity)
alter table users enable row level security;
alter table polls enable row level security;
alter table votes enable row level security;

-- Allow all operations with anon key (public access for demo)
create policy "Allow all on users" on users for all using (true) with check (true);
create policy "Allow all on polls" on polls for all using (true) with check (true);
create policy "Allow all on votes" on votes for all using (true) with check (true);

-- 5. Enable Realtime on all tables
-- Set replica identity to FULL so real-time DELETE events include old row data
alter table users replica identity full;
alter table polls replica identity full;
alter table votes replica identity full;

alter publication supabase_realtime add table users;
alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table votes;

-- ============================================================
-- 6. RPC Functions for atomic balance & claim operations
-- ============================================================

-- Atomic signup: inserts user only if not exists, always returns the user record
create or replace function signup_user(p_wallet text)
returns json as $$
declare
  v_user record;
  v_now bigint;
begin
  v_now := (extract(epoch from now()) * 1000)::bigint;

  insert into users (wallet, balance, signup_bonus_claimed, last_weekly_reward_ts, created_at, weekly_reset_ts, monthly_reset_ts)
  values (p_wallet, 500000, true, v_now, v_now, v_now, v_now)
  on conflict (wallet) do nothing;

  select * into v_user from users where wallet = p_wallet;

  return row_to_json(v_user);
end;
$$ language plpgsql;

-- Atomic daily reward claim ($100 every 24 hours, server-enforced)
create or replace function claim_daily_reward(p_wallet text)
returns json as $$
declare
  v_user record;
  v_now bigint;
  v_day_ms bigint := 86400000; -- 24 hours in milliseconds
begin
  v_now := (extract(epoch from now()) * 1000)::bigint;

  -- Lock the row to prevent concurrent claims
  select * into v_user from users where wallet = p_wallet for update;

  if not found then
    return json_build_object('success', false, 'error', 'user_not_found');
  end if;

  if v_now - v_user.last_weekly_reward_ts < v_day_ms then
    return json_build_object(
      'success', false,
      'error', 'too_early',
      'remaining_ms', v_day_ms - (v_now - v_user.last_weekly_reward_ts),
      'last_claim_ts', v_user.last_weekly_reward_ts,
      'balance', v_user.balance
    );
  end if;

  update users
  set balance = balance + 10000,
      last_weekly_reward_ts = v_now
  where wallet = p_wallet
  returning * into v_user;

  return json_build_object(
    'success', true,
    'new_balance', v_user.balance,
    'last_claim_ts', v_user.last_weekly_reward_ts
  );
end;
$$ language plpgsql;

-- Atomic balance deduction (for voting, poll creation)
create or replace function spend_balance(p_wallet text, p_amount bigint)
returns json as $$
declare
  v_user record;
begin
  -- Lock row to prevent double-spend
  select * into v_user from users where wallet = p_wallet for update;

  if not found then
    return json_build_object('success', false, 'error', 'user_not_found');
  end if;

  if v_user.balance < p_amount then
    return json_build_object('success', false, 'error', 'insufficient_balance', 'balance', v_user.balance);
  end if;

  update users set balance = balance - p_amount where wallet = p_wallet
  returning * into v_user;

  return json_build_object('success', true, 'new_balance', v_user.balance);
end;
$$ language plpgsql;

-- Atomic balance credit (for rewards, refunds)
create or replace function credit_balance(p_wallet text, p_amount bigint)
returns json as $$
declare
  v_user record;
begin
  update users set balance = balance + p_amount where wallet = p_wallet
  returning * into v_user;

  if not found then
    return json_build_object('success', false, 'error', 'user_not_found');
  end if;

  return json_build_object('success', true, 'new_balance', v_user.balance);
end;
$$ language plpgsql;
