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
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table votes;
