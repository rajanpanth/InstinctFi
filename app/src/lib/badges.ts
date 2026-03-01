/**
 * Achievement badges — computed client-side from existing user stats.
 * No database changes needed — everything derives from UserAccount, polls, and votes.
 */

export type Badge = {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
};

type BadgeInput = {
    totalVotesCast: number;
    pollsCreated: number;
    pollsWon: number;
    totalPollsVoted: number;
    totalWinningsLamports: number;
    totalSpentLamports: number;
    createdAt: number; // unix timestamp
    loginStreak?: number;
};

const BADGE_DEFINITIONS: Omit<Badge, "earned">[] = [
    {
        id: "first-vote",
        name: "First Vote",
        description: "Cast your first vote on a poll",
        icon: "🗳️",
    },
    {
        id: "first-poll",
        name: "Poll Creator",
        description: "Created your first prediction poll",
        icon: "📝",
    },
    {
        id: "ten-polls",
        name: "Serial Creator",
        description: "Created 10 or more polls",
        icon: "🏭",
    },
    {
        id: "ten-votes",
        name: "Active Voter",
        description: "Voted on 10 or more polls",
        icon: "⚡",
    },
    {
        id: "first-win",
        name: "Winner",
        description: "Won your first settled poll",
        icon: "🏆",
    },
    {
        id: "five-wins",
        name: "Winning Streak",
        description: "Won 5 or more polls",
        icon: "🔥",
    },
    {
        id: "high-roller",
        name: "High Roller",
        description: "Spent over 10 SOL in total votes",
        icon: "💎",
    },
    {
        id: "profitable",
        name: "In the Green",
        description: "Total winnings exceed total spending",
        icon: "📈",
    },
    {
        id: "early-adopter",
        name: "Early Adopter",
        description: "Joined within the first 30 days",
        icon: "🌟",
    },
    {
        id: "streak-3",
        name: "3-Day Streak",
        description: "Logged in 3 days in a row",
        icon: "🔥",
    },
    {
        id: "streak-7",
        name: "Weekly Warrior",
        description: "Logged in 7 days in a row",
        icon: "⚔️",
    },
];

// Platform launch date — adjust to your actual launch
// BUG-05/06 FIX: Use milliseconds consistently (Date.getTime() returns ms,
// and createdAt from Supabase is also in ms after conversion in dataConverters).
const LAUNCH_DATE = new Date("2025-01-01").getTime();
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// 10 SOL in lamports (SOL_UNIT = 1_000_000_000)
const TEN_SOL = 10_000_000_000;

export function computeBadges(input: BadgeInput): Badge[] {
    const {
        totalVotesCast,
        pollsCreated,
        pollsWon,
        totalPollsVoted,
        totalWinningsLamports,
        totalSpentLamports,
        createdAt,
        loginStreak = 0,
    } = input;

    const earners: Record<string, boolean> = {
        "first-vote": totalVotesCast >= 1,
        "first-poll": pollsCreated >= 1,
        "ten-polls": pollsCreated >= 10,
        "ten-votes": totalPollsVoted >= 10,
        "first-win": pollsWon >= 1,
        "five-wins": pollsWon >= 5,
        "high-roller": totalSpentLamports >= TEN_SOL,
        "profitable": totalWinningsLamports > totalSpentLamports && totalWinningsLamports > 0,
        "early-adopter": createdAt > 0 && createdAt <= LAUNCH_DATE + THIRTY_DAYS,
        "streak-3": loginStreak >= 3,
        "streak-7": loginStreak >= 7,
    };

    return BADGE_DEFINITIONS.map((def) => ({
        ...def,
        earned: earners[def.id] ?? false,
    }));
}

export function getEarnedBadges(input: BadgeInput): Badge[] {
    return computeBadges(input).filter((b) => b.earned);
}

export function getUnearnedBadges(input: BadgeInput): Badge[] {
    return computeBadges(input).filter((b) => !b.earned);
}
