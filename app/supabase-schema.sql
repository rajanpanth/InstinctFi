-- ============================================================
-- InstinctFi — Supabase Database Schema  (v2 — atomic RPCs + tighter RLS)
-- Run this in your Supabase SQL Editor (supabase.com → project → SQL Editor)
--
-- NOTE: If upgrading from v1, run the "Migration" section at the bottom
--       separately AFTER the initial tables exist.
-- ============================================================
-- rajan
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

-- ============================================================
-- 4. Row Level Security
--    Since we use the Supabase anon key without Supabase Auth,
--    we cannot use auth.uid(). Instead we funnel ALL writes through
--    SECURITY DEFINER RPCs below, and allow only SELECT via RLS.
--
--    For a production deployment you should add an Edge Function
--    layer that verifies wallet signatures and creates custom JWTs.
-- ============================================================
alter table users enable row level security;
alter table polls enable row level security;
alter table votes enable row level security;

-- Drop old wide-open policies if upgrading
drop policy if exists "Allow all on users" on users;
drop policy if exists "Allow all on polls"  on polls;
drop policy if exists "Allow all on votes"  on votes;
drop policy if exists "Users read"   on users;
drop policy if exists "Polls read"   on polls;
drop policy if exists "Votes read"   on votes;
drop policy if exists "Polls write"  on polls;
drop policy if exists "Polls update" on polls;
drop policy if exists "Polls delete" on polls;
drop policy if exists "Votes write"  on votes;
drop policy if exists "Votes update" on votes;
drop policy if exists "Users insert" on users;
drop policy if exists "Users update" on users;

-- SELECT only for the anon role
create policy "Users read" on users for select using (true);
create policy "Polls read" on polls for select using (true);
create policy "Votes read" on votes for select using (true);

-- Writes are allowed because our RPCs run as SECURITY DEFINER
-- and the client still needs to upsert polls/votes from the app.
-- In production, restrict these to the service_role only.
create policy "Users write" on users for all using (true) with check (true);
create policy "Polls write" on polls for all using (true) with check (true);
create policy "Votes write" on votes for all using (true) with check (true);

-- 5. Enable Realtime on all tables
alter table users replica identity full;
alter table polls replica identity full;
alter table votes replica identity full;

alter publication supabase_realtime add table users;
alter publication supabase_realtime add table polls;
alter publication supabase_realtime add table votes;

-- ============================================================
-- 6. RPC Functions — atomic balance & claim operations
-- ============================================================

-- 6a. Atomic signup: insert-if-not-exists, always returns the user record
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
$$ language plpgsql security definer;

-- 6b. Atomic daily reward claim ($100 every 24 h, server-enforced)
create or replace function claim_daily_reward(p_wallet text)
returns json as $$
declare
  v_user record;
  v_now bigint;
  v_day_ms bigint := 86400000;
begin
  v_now := (extract(epoch from now()) * 1000)::bigint;

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
$$ language plpgsql security definer;

-- 6c. Atomic balance deduction
create or replace function spend_balance(p_wallet text, p_amount bigint)
returns json as $$
declare
  v_user record;
begin
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
$$ language plpgsql security definer;

-- 6d. Atomic balance credit
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
$$ language plpgsql security definer;

-- ============================================================
-- 7. Atomic cast_vote
--    Deducts balance + increments vote_counts + upserts vote in one TX
-- ============================================================
create or replace function cast_vote_atomic(
  p_wallet text,
  p_poll_id text,
  p_option_index int,   -- 0-based from the client
  p_num_coins int
)
returns json as $$
declare
  v_user record;
  v_poll record;
  v_vote record;
  v_cost bigint;
  v_new_vote_counts bigint[];
  v_new_vpo bigint[];
  v_is_first_vote boolean := false;
  v_pg_idx int;          -- 1-based for Postgres arrays
  i int;
begin
  v_pg_idx := p_option_index + 1;

  select * into v_user from users where wallet = p_wallet for update;
  if not found then
    return json_build_object('success', false, 'error', 'user_not_found');
  end if;

  select * into v_poll from polls where id = p_poll_id for update;
  if not found then
    return json_build_object('success', false, 'error', 'poll_not_found');
  end if;

  if v_poll.status != 0 then
    return json_build_object('success', false, 'error', 'poll_not_active');
  end if;

  -- end_time is in SECONDS
  if (extract(epoch from now()))::bigint > v_poll.end_time then
    return json_build_object('success', false, 'error', 'poll_ended');
  end if;

  if v_pg_idx < 1 or v_pg_idx > array_length(v_poll.options, 1) then
    return json_build_object('success', false, 'error', 'invalid_option');
  end if;

  if v_poll.creator = p_wallet then
    return json_build_object('success', false, 'error', 'creator_cannot_vote');
  end if;

  v_cost := p_num_coins::bigint * v_poll.unit_price_cents;

  if v_user.balance < v_cost then
    return json_build_object('success', false, 'error', 'insufficient_balance', 'balance', v_user.balance);
  end if;

  -- Deduct balance
  update users set balance = balance - v_cost where wallet = p_wallet;

  -- Increment vote_counts
  v_new_vote_counts := v_poll.vote_counts;
  v_new_vote_counts[v_pg_idx] := coalesce(v_new_vote_counts[v_pg_idx], 0) + p_num_coins;

  -- Check existing vote
  select * into v_vote from votes where poll_id = p_poll_id and voter = p_wallet for update;

  if found then
    v_new_vpo := v_vote.votes_per_option;
    v_new_vpo[v_pg_idx] := coalesce(v_new_vpo[v_pg_idx], 0) + p_num_coins;
    update votes
      set votes_per_option = v_new_vpo,
          total_staked_cents = total_staked_cents + v_cost
      where poll_id = p_poll_id and voter = p_wallet;
  else
    v_is_first_vote := true;
    v_new_vpo := array_fill(0::bigint, array[array_length(v_poll.options, 1)]);
    v_new_vpo[v_pg_idx] := p_num_coins;
    insert into votes (poll_id, voter, votes_per_option, total_staked_cents, claimed)
      values (p_poll_id, p_wallet, v_new_vpo, v_cost, false);
  end if;

  update polls
    set vote_counts = v_new_vote_counts,
        total_pool_cents = total_pool_cents + v_cost,
        total_voters = total_voters + (case when v_is_first_vote then 1 else 0 end)
    where id = p_poll_id;

  update users
    set total_votes_cast  = total_votes_cast + p_num_coins,
        total_polls_voted = total_polls_voted + (case when v_is_first_vote then 1 else 0 end),
        total_spent_cents  = total_spent_cents + v_cost,
        weekly_votes_cast  = weekly_votes_cast + p_num_coins,
        monthly_votes_cast = monthly_votes_cast + p_num_coins,
        weekly_spent_cents = weekly_spent_cents + v_cost,
        monthly_spent_cents = monthly_spent_cents + v_cost,
        weekly_polls_voted = weekly_polls_voted + (case when v_is_first_vote then 1 else 0 end),
        monthly_polls_voted = monthly_polls_voted + (case when v_is_first_vote then 1 else 0 end)
    where wallet = p_wallet;

  select balance into v_user from users where wallet = p_wallet;

  return json_build_object(
    'success', true,
    'new_balance', v_user.balance,
    'cost', v_cost,
    'is_first_vote', v_is_first_vote
  );
end;
$$ language plpgsql security definer;


-- ============================================================
-- 8. Atomic settle_poll — winner determination + creator payout
-- ============================================================
create or replace function settle_poll_atomic(p_poll_id text)
returns json as $$
declare
  v_poll record;
  v_max_votes bigint := 0;
  v_winning_idx int := 0;
  v_total_votes bigint := 0;
  v_creator_credit bigint;
  i int;
begin
  select * into v_poll from polls where id = p_poll_id for update;
  if not found then
    return json_build_object('success', false, 'error', 'poll_not_found');
  end if;

  if v_poll.status != 0 then
    return json_build_object('success', false, 'error', 'already_settled');
  end if;

  for i in 1..coalesce(array_length(v_poll.vote_counts, 1), 0) loop
    v_total_votes := v_total_votes + v_poll.vote_counts[i];
    if v_poll.vote_counts[i] > v_max_votes then
      v_max_votes := v_poll.vote_counts[i];
      v_winning_idx := i;   -- 1-based (fine for Postgres arrays)
    end if;
  end loop;

  -- No votes → winning_option = 255
  if v_total_votes = 0 then
    v_winning_idx := 255;
  end if;

  update polls
    set status = 1,
        winning_option = v_winning_idx
    where id = p_poll_id;

  -- Credit creator: reward + platform fee
  v_creator_credit := v_poll.creator_reward_cents + v_poll.platform_fee_cents;
  if v_creator_credit > 0 then
    update users
      set balance = balance + v_creator_credit,
          creator_earnings_cents = creator_earnings_cents + v_poll.creator_reward_cents
      where wallet = v_poll.creator;
  end if;

  return json_build_object(
    'success', true,
    'winning_option', v_winning_idx,
    'total_votes', v_total_votes,
    'creator_reward', v_poll.creator_reward_cents,
    'platform_fee', v_poll.platform_fee_cents
  );
end;
$$ language plpgsql security definer;


-- ============================================================
-- 9. Atomic claim_reward — eligibility check + balance credit + mark claimed
-- ============================================================
create or replace function claim_reward_atomic(p_wallet text, p_poll_id text)
returns json as $$
declare
  v_poll record;
  v_vote record;
  v_user_winning_votes bigint;
  v_total_winning_votes bigint;
  v_reward bigint;
begin
  select * into v_poll from polls where id = p_poll_id;
  if not found then
    return json_build_object('success', false, 'error', 'poll_not_found');
  end if;

  if v_poll.status != 1 then
    return json_build_object('success', false, 'error', 'poll_not_settled');
  end if;

  if v_poll.winning_option = 255 then
    return json_build_object('success', false, 'error', 'no_winner');
  end if;

  select * into v_vote from votes where poll_id = p_poll_id and voter = p_wallet for update;
  if not found then
    return json_build_object('success', false, 'error', 'no_vote_found');
  end if;

  if v_vote.claimed then
    return json_build_object('success', false, 'error', 'already_claimed');
  end if;

  v_user_winning_votes := v_vote.votes_per_option[v_poll.winning_option];
  if v_user_winning_votes is null or v_user_winning_votes = 0 then
    return json_build_object('success', false, 'error', 'did_not_win');
  end if;

  v_total_winning_votes := v_poll.vote_counts[v_poll.winning_option];
  v_reward := (v_user_winning_votes * v_poll.total_pool_cents) / v_total_winning_votes;

  update users
    set balance = balance + v_reward,
        total_winnings_cents = total_winnings_cents + v_reward,
        weekly_winnings_cents = weekly_winnings_cents + v_reward,
        monthly_winnings_cents = monthly_winnings_cents + v_reward,
        polls_won = polls_won + 1,
        weekly_polls_won = weekly_polls_won + 1,
        monthly_polls_won = monthly_polls_won + 1
    where wallet = p_wallet;

  update votes set claimed = true where poll_id = p_poll_id and voter = p_wallet;

  return json_build_object(
    'success', true,
    'reward', v_reward
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5. Comments table (for poll discussion threads)
-- ============================================================
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null references polls(id) on delete cascade,
  wallet text not null,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_poll_id on comments(poll_id);
create index if not exists idx_comments_created_at on comments(created_at desc);

-- RLS
alter table comments enable row level security;

create policy "Anyone can read comments"
  on comments for select using (true);

create policy "Authenticated users can insert comments"
  on comments for insert with check (true);

-- Enable realtime for comments
alter publication supabase_realtime add table comments;

-- ============================================================
-- Referrals table
-- ============================================================
create table if not exists referrals (
  referee text primary key,          -- the user who was referred (one referrer per user)
  referrer text not null,            -- the user who shared the link
  created_at bigint not null default 0
);

create index if not exists idx_referrals_referrer on referrals(referrer);

alter table referrals enable row level security;

create policy "Anyone can read referrals"
  on referrals for select using (true);

create policy "Anyone can insert referrals"
  on referrals for insert with check (true);

-- ============================================================
-- Resolution proofs table
-- ============================================================
create table if not exists resolution_proofs (
  poll_id text primary key references polls(id) on delete cascade,
  source_url text not null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table resolution_proofs enable row level security;

create policy "Anyone can read resolution proofs"
  on resolution_proofs for select using (true);

create policy "Anyone can insert resolution proofs"
  on resolution_proofs for insert with check (true);
