/**
 * Data conversion helpers — on-chain ↔ frontend ↔ Supabase.
 * Extracted from Providers.tsx for cleaner separation of concerns.
 */
import type { DemoPoll, DemoVote, UserAccount } from "./types";
import type { OnChainPoll, OnChainUser, OnChainVote } from "./program";

// ─── On-chain → Frontend ────────────────────────────────────────────────────

export function onChainPollToDemo(p: OnChainPoll, optionImages?: string[]): DemoPoll {
  return {
    id: p.address.toString(),
    pollId: p.pollId,
    creator: p.creator.toString(),
    title: p.title,
    description: p.description,
    category: p.category,
    imageUrl: p.imageUrl,
    optionImages: optionImages || p.options.map(() => ""),
    options: p.options,
    voteCounts: p.voteCounts,
    unitPriceCents: p.unitPrice,
    endTime: p.endTime,
    totalPoolCents: p.totalPool,
    creatorInvestmentCents: p.creatorInvestment,
    platformFeeCents: p.platformFee,
    creatorRewardCents: p.creatorReward,
    status: p.status,
    winningOption: p.winningOption,
    totalVoters: p.totalVoters,
    createdAt: p.createdAt,
  };
}

export function onChainVoteToDemo(v: OnChainVote): DemoVote {
  return {
    pollId: v.poll.toString(),
    voter: v.voter.toString(),
    votesPerOption: v.votesPerOption,
    totalStakedCents: v.totalStaked,
    claimed: v.claimed,
  };
}

export function onChainUserToAccount(u: OnChainUser, balance: number): UserAccount {
  const now = Date.now();
  return {
    wallet: u.authority.toString(),
    balance,
    signupBonusClaimed: true,
    lastWeeklyRewardTs: u.createdAt * 1000,
    totalVotesCast: u.totalVotesCast,
    totalPollsVoted: 0,
    pollsWon: u.pollsWon,
    pollsCreated: u.totalPollsCreated,
    totalSpentCents: u.totalStaked,
    totalWinningsCents: u.totalWinnings,
    // Weekly/monthly counters are not tracked on-chain — initialize to 0
    // and let the frontend or Supabase track them separately.
    weeklyWinningsCents: 0,
    monthlyWinningsCents: 0,
    weeklySpentCents: 0,
    monthlySpentCents: 0,
    weeklyVotesCast: 0,
    monthlyVotesCast: 0,
    weeklyPollsWon: 0,
    monthlyPollsWon: 0,
    weeklyPollsVoted: 0,
    monthlyPollsVoted: 0,
    creatorEarningsCents: 0,
    weeklyResetTs: now,
    monthlyResetTs: now,
    createdAt: u.createdAt * 1000,
  };
}

/** Reset weekly/monthly counters if the period has elapsed */
export function withFreshPeriods(user: UserAccount): UserAccount {
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  let u = { ...user };
  if (now - u.weeklyResetTs > WEEK_MS) {
    u.weeklyWinningsCents = 0;
    u.weeklySpentCents = 0;
    u.weeklyVotesCast = 0;
    u.weeklyPollsWon = 0;
    u.weeklyPollsVoted = 0;
    u.weeklyResetTs = now;
  }
  if (now - u.monthlyResetTs > MONTH_MS) {
    u.monthlyWinningsCents = 0;
    u.monthlySpentCents = 0;
    u.monthlyVotesCast = 0;
    u.monthlyPollsWon = 0;
    u.monthlyPollsVoted = 0;
    u.monthlyResetTs = now;
  }
  return u;
}

// ── Frontend ↔ Supabase ─────────────────────────────────────────────────────

export function demoPollToRow(p: DemoPoll) {
  return {
    id: p.id,
    poll_id: p.pollId,
    creator: p.creator,
    title: p.title,
    description: p.description,
    category: p.category,
    image_url: p.imageUrl,
    option_images: p.optionImages,
    options: p.options,
    vote_counts: p.voteCounts,
    unit_price_cents: p.unitPriceCents,
    end_time: p.endTime,
    total_pool_cents: p.totalPoolCents,
    creator_investment_cents: p.creatorInvestmentCents,
    platform_fee_cents: p.platformFeeCents,
    creator_reward_cents: p.creatorRewardCents,
    status: p.status,
    winning_option: p.winningOption,
    total_voters: p.totalVoters,
    created_at: p.createdAt,
  };
}

export function rowToDemoPoll(r: any): DemoPoll {
  return {
    id: r.id,
    pollId: Number(r.poll_id),
    creator: r.creator,
    title: r.title,
    description: r.description || "",
    category: r.category || "",
    imageUrl: r.image_url || "",
    optionImages: r.option_images || [],
    options: r.options,
    voteCounts: (r.vote_counts || []).map(Number),
    unitPriceCents: Number(r.unit_price_cents),
    endTime: Number(r.end_time),
    totalPoolCents: Number(r.total_pool_cents),
    creatorInvestmentCents: Number(r.creator_investment_cents),
    platformFeeCents: Number(r.platform_fee_cents),
    creatorRewardCents: Number(r.creator_reward_cents),
    status: r.status,
    winningOption: r.winning_option,
    totalVoters: Number(r.total_voters),
    createdAt: Number(r.created_at),
  };
}

export function rowToDemoVote(r: any): DemoVote {
  return {
    pollId: r.poll_id,
    voter: r.voter,
    votesPerOption: (r.votes_per_option || []).map(Number),
    totalStakedCents: Number(r.total_staked_cents),
    claimed: r.claimed,
  };
}

/** Convert a Supabase `users` row to a frontend UserAccount */
export function rowToUserAccount(r: any): UserAccount {
  return {
    wallet: r.wallet,
    balance: Number(r.balance || 0),
    signupBonusClaimed: r.signup_bonus_claimed ?? false,
    lastWeeklyRewardTs: Number(r.last_weekly_reward_ts || 0),
    totalVotesCast: Number(r.total_votes_cast || 0),
    totalPollsVoted: Number(r.total_polls_voted || 0),
    pollsWon: Number(r.polls_won || 0),
    pollsCreated: Number(r.polls_created || 0),
    totalSpentCents: Number(r.total_spent_cents || 0),
    totalWinningsCents: Number(r.total_winnings_cents || 0),
    weeklyWinningsCents: Number(r.weekly_winnings_cents || 0),
    monthlyWinningsCents: Number(r.monthly_winnings_cents || 0),
    weeklySpentCents: Number(r.weekly_spent_cents || 0),
    monthlySpentCents: Number(r.monthly_spent_cents || 0),
    weeklyVotesCast: Number(r.weekly_votes_cast || 0),
    monthlyVotesCast: Number(r.monthly_votes_cast || 0),
    weeklyPollsWon: Number(r.weekly_polls_won || 0),
    monthlyPollsWon: Number(r.monthly_polls_won || 0),
    weeklyPollsVoted: Number(r.weekly_polls_voted || 0),
    monthlyPollsVoted: Number(r.monthly_polls_voted || 0),
    creatorEarningsCents: Number(r.creator_earnings_cents || 0),
    weeklyResetTs: Number(r.weekly_reset_ts || 0),
    monthlyResetTs: Number(r.monthly_reset_ts || 0),
    createdAt: Number(r.created_at || 0),
  };
}

/** Create a blank placeholder user for immediate UI feedback */
export function createPlaceholderUser(wallet: string): UserAccount {
  return {
    wallet,
    balance: 0,
    signupBonusClaimed: false,
    lastWeeklyRewardTs: 0,
    totalVotesCast: 0,
    totalPollsVoted: 0,
    pollsWon: 0,
    pollsCreated: 0,
    totalSpentCents: 0,
    totalWinningsCents: 0,
    weeklyWinningsCents: 0,
    monthlyWinningsCents: 0,
    weeklySpentCents: 0,
    monthlySpentCents: 0,
    weeklyVotesCast: 0,
    monthlyVotesCast: 0,
    weeklyPollsWon: 0,
    monthlyPollsWon: 0,
    weeklyPollsVoted: 0,
    monthlyPollsVoted: 0,
    creatorEarningsCents: 0,
    weeklyResetTs: Date.now(),
    monthlyResetTs: Date.now(),
    createdAt: Date.now(),
  };
}
