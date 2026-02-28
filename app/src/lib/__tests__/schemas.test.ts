import {
    PollRowSchema,
    VoteRowSchema,
    UserRowSchema,
    safeParsePollRow,
    safeParseVoteRow,
    safeParseUserRow,
} from "../schemas";

describe("PollRowSchema", () => {
    const validRow = {
        id: "poll-1",
        poll_id: 42,
        creator: "wallet-abc",
        title: "Will BTC hit $100k?",
        description: "A prediction",
        category: "Crypto",
        image_url: null,
        option_images: null,
        options: ["Yes", "No"],
        unit_price_cents: 10000,
        end_time: 1700000000,
        vote_counts: [10, 5],
        total_pool_cents: 150000,
        platform_fee_cents: 1500,
        creator_reward_cents: 1500,
        status: 0,
        winning_option: 255,
        total_voters: 15,
        created_at: "2024-01-01T00:00:00Z",
    };

    it("parses a valid poll row", () => {
        const result = PollRowSchema.parse(validRow);
        expect(result.id).toBe("poll-1");
        expect(result.poll_id).toBe("42"); // transformed to string
        expect(result.options).toEqual(["Yes", "No"]);
    });

    it("transforms string poll_id to string", () => {
        const row = { ...validRow, poll_id: "999" };
        const result = PollRowSchema.parse(row);
        expect(result.poll_id).toBe("999");
    });

    it("pads vote_counts when shorter than options", () => {
        const row = { ...validRow, vote_counts: [10] };
        const result = PollRowSchema.parse(row);
        expect(result.vote_counts).toEqual([10, 0]);
    });

    it("truncates vote_counts when longer than options", () => {
        const row = { ...validRow, vote_counts: [10, 5, 3] };
        const result = PollRowSchema.parse(row);
        expect(result.vote_counts).toEqual([10, 5]);
    });

    it("defaults optional fields", () => {
        const minimal = {
            id: "p-2",
            poll_id: 1,
            creator: "w",
            title: "T",
            options: ["A", "B"],
            unit_price_cents: 100,
            end_time: 123,
            created_at: null,
        };
        const result = PollRowSchema.parse(minimal);
        expect(result.description).toBe("");
        expect(result.category).toBe("General");
        expect(result.status).toBe(0);
        expect(result.winning_option).toBe(255);
        expect(result.vote_counts).toEqual([0, 0]); // padded to match options
    });

    it("rejects missing required fields", () => {
        expect(() => PollRowSchema.parse({})).toThrow();
    });
});

describe("VoteRowSchema", () => {
    it("parses a valid vote row", () => {
        const row = {
            poll_id: "poll-1",
            voter: "wallet-abc",
            votes_per_option: [5, 0, 3],
            total_staked_cents: 800,
            claimed: false,
        };
        const result = VoteRowSchema.parse(row);
        expect(result.poll_id).toBe("poll-1");
        expect(result.votes_per_option).toEqual([5, 0, 3]);
        expect(result.claimed).toBe(false);
    });

    it("defaults claimed to false", () => {
        const row = {
            poll_id: "p-1",
            voter: "w",
            votes_per_option: [1],
            total_staked_cents: 100,
        };
        const result = VoteRowSchema.parse(row);
        expect(result.claimed).toBe(false);
    });

    it("rejects empty votes_per_option", () => {
        const row = {
            poll_id: "p-1",
            voter: "w",
            votes_per_option: [],
            total_staked_cents: 0,
        };
        expect(() => VoteRowSchema.parse(row)).toThrow();
    });
});

describe("UserRowSchema", () => {
    it("parses a full user row", () => {
        const row = {
            wallet: "wallet-abc",
            balance: 5000,
            signup_bonus_claimed: true,
            total_votes_cast: 25,
            total_polls_voted: 10,
            polls_won: 4,
            polls_created: 3,
            total_spent_cents: 2500,
            total_winnings_cents: 4000,
        };
        const result = UserRowSchema.parse(row);
        expect(result.wallet).toBe("wallet-abc");
        expect(result.balance).toBe(5000);
        expect(result.polls_won).toBe(4);
    });

    it("defaults all numeric fields to 0", () => {
        const result = UserRowSchema.parse({ wallet: "w" });
        expect(result.balance).toBe(0);
        expect(result.total_votes_cast).toBe(0);
        expect(result.total_spent_cents).toBe(0);
        expect(result.total_winnings_cents).toBe(0);
        expect(result.polls_created).toBe(0);
        expect(result.signup_bonus_claimed).toBe(false);
    });
});

describe("safeParse helpers", () => {
    it("safeParsePollRow returns null for invalid data", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
        expect(safeParsePollRow({})).toBeNull();
        consoleSpy.mockRestore();
    });

    it("safeParsePollRow returns data for valid input", () => {
        const row = {
            id: "p", poll_id: 1, creator: "w", title: "T",
            options: ["A", "B"], unit_price_cents: 1, end_time: 1, created_at: null,
        };
        expect(safeParsePollRow(row)).not.toBeNull();
    });

    it("safeParseVoteRow returns null for invalid data", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
        expect(safeParseVoteRow({})).toBeNull();
        consoleSpy.mockRestore();
    });

    it("safeParseUserRow returns null for invalid data", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
        expect(safeParseUserRow(null)).toBeNull();
        consoleSpy.mockRestore();
    });

    it("safeParseUserRow returns data for valid input", () => {
        expect(safeParseUserRow({ wallet: "w" })).not.toBeNull();
    });
});
