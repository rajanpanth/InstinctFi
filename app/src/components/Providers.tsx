"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  connection,
  sendTransaction,
  formatSOL,
  formatSOLShort,
  getWalletBalance,
  requestAirdrop,
  fetchAllPolls,
  fetchAllUsers,
  fetchVotesForUser,
  fetchUserAccount,
  buildInitializeUserIx,
  buildCreatePollIx,
  buildEditPollIx,
  buildDeletePollIx,
  buildCastVoteIx,
  buildSettlePollIx,
  buildClaimRewardIx,
  getUserPDA,
  getPollPDA,
  getTreasuryPDA,
  getVotePDA,
  solToLamports,
  lamportsToSol,
  PROGRAM_DEPLOYED,
  type OnChainPoll,
  type OnChainUser,
  type OnChainVote,
} from "@/lib/program";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminWallet } from "@/lib/constants";
import toast from "react-hot-toast";
import nacl from "tweetnacl";
import bs58 from "bs58";

// ─── Constants ─────────────────────────────────────────────────────────────
// SOL_UNIT converts user-facing SOL values to lamports (1 SOL = 1e9 lamports)
export const SOL_UNIT = LAMPORTS_PER_SOL;

/** @deprecated Use SOL_UNIT instead. Kept for backward compat. */
export const CENTS = SOL_UNIT;

/** Maximum coins a single user can stake on one poll */
export const MAX_COINS_PER_POLL = 100;

/** Format lamports → "X.XXXX SOL" */
export { formatSOL as formatDollars };
export { formatSOLShort as formatDollarsShort };

// ─── Types ──────────────────────────────────────────────────────────────────
/**
 * NAMING CONVENTION — "*Cents" fields
 * ------------------------------------
 * For backward compatibility the type fields still use the "*Cents" suffix,
 * but every value is stored in **lamports** (1 SOL = 1 000 000 000 lamports).
 * Use `formatDollars()` / `formatDollarsShort()` (aliases for `formatSOL`)
 * to display them as human-readable SOL strings.
 */

export type DemoPoll = {
  id: string;                    // Poll PDA address (base58)
  pollId: number;                // Unique poll ID
  creator: string;               // Creator wallet address
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  optionImages: string[];        // Off-chain only (Supabase)
  options: string[];
  voteCounts: number[];
  unitPriceCents: number;        // LAMPORTS per option-coin
  endTime: number;               // Unix timestamp
  totalPoolCents: number;        // LAMPORTS in distributable pool
  creatorInvestmentCents: number; // LAMPORTS invested by creator
  platformFeeCents: number;      // LAMPORTS platform fee
  creatorRewardCents: number;    // LAMPORTS creator reward
  status: number;                // 0 = Active, 1 = Settled
  winningOption: number;         // 255 = unset
  totalVoters: number;
  createdAt: number;
};

export type DemoVote = {
  pollId: string;                // Poll PDA address (base58)
  voter: string;                 // Voter wallet address
  votesPerOption: number[];
  totalStakedCents: number;      // LAMPORTS total staked
  claimed: boolean;
};

export type UserAccount = {
  wallet: string;
  balance: number;               // Real SOL balance in LAMPORTS
  signupBonusClaimed: boolean;   // Whether on-chain user account exists
  lastWeeklyRewardTs: number;
  totalVotesCast: number;
  totalPollsVoted: number;
  pollsWon: number;
  pollsCreated: number;
  totalSpentCents: number;       // LAMPORTS
  totalWinningsCents: number;    // LAMPORTS
  weeklyWinningsCents: number;
  monthlyWinningsCents: number;
  weeklySpentCents: number;
  monthlySpentCents: number;
  weeklyVotesCast: number;
  monthlyVotesCast: number;
  weeklyPollsWon: number;
  monthlyPollsWon: number;
  weeklyPollsVoted: number;
  monthlyPollsVoted: number;
  creatorEarningsCents: number;
  weeklyResetTs: number;
  monthlyResetTs: number;
  createdAt: number;
};

type AppContextType = {
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  userAccount: UserAccount | null;
  signup: () => void;
  claimDailyReward: () => Promise<boolean>;
  isLoading: boolean;
  polls: DemoPoll[];
  votes: DemoVote[];
  createPoll: (poll: Omit<DemoPoll, "id">) => Promise<DemoPoll | null>;
  editPoll: (pollId: string, updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>) => Promise<boolean>;
  deletePoll: (pollId: string) => Promise<boolean>;
  castVote: (pollId: string, optionIndex: number, numCoins: number) => Promise<boolean>;
  settlePoll: (pollId: string, winningOption?: number) => Promise<boolean>;
  claimReward: (pollId: string) => Promise<number>;
  allUsers: UserAccount[];
};

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside <Providers>");
  return ctx;
}

// ─── Helpers: Convert on-chain → frontend types ────────────────────────────

function onChainPollToDemo(p: OnChainPoll, optionImages?: string[]): DemoPoll {
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

function onChainVoteToDemo(v: OnChainVote): DemoVote {
  return {
    pollId: v.poll.toString(),
    voter: v.voter.toString(),
    votesPerOption: v.votesPerOption,
    totalStakedCents: v.totalStaked,
    claimed: v.claimed,
  };
}

function onChainUserToAccount(u: OnChainUser, balance: number): UserAccount {
  const now = Date.now();
  return {
    wallet: u.authority.toString(),
    balance,
    signupBonusClaimed: true, // User account exists on-chain
    lastWeeklyRewardTs: u.createdAt * 1000,
    totalVotesCast: u.totalVotesCast,
    totalPollsVoted: 0, // Not tracked on-chain individually
    pollsWon: u.pollsWon,
    pollsCreated: u.totalPollsCreated,
    totalSpentCents: u.totalStaked,
    totalWinningsCents: u.totalWinnings,
    weeklyWinningsCents: u.totalWinnings,
    monthlyWinningsCents: u.totalWinnings,
    weeklySpentCents: u.totalStaked,
    monthlySpentCents: u.totalStaked,
    weeklyVotesCast: u.totalVotesCast,
    monthlyVotesCast: u.totalVotesCast,
    weeklyPollsWon: u.pollsWon,
    monthlyPollsWon: u.pollsWon,
    weeklyPollsVoted: 0,
    monthlyPollsVoted: 0,
    creatorEarningsCents: 0,
    weeklyResetTs: now,
    monthlyResetTs: now,
    createdAt: u.createdAt * 1000,
  };
}

/** Reset weekly/monthly counters if the period has elapsed */
function withFreshPeriods(user: UserAccount): UserAccount {
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

// ── Helpers: Convert DemoPoll ↔ Supabase row ────────────────────────────────

function demoPollToRow(p: DemoPoll) {
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

function rowToDemoPoll(r: any): DemoPoll {
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

function rowToDemoVote(r: any): DemoVote {
  return {
    pollId: r.poll_id,
    voter: r.voter,
    votesPerOption: (r.votes_per_option || []).map(Number),
    totalStakedCents: Number(r.total_staked_cents),
    claimed: r.claimed,
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  // ── Wallet state ──
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // ── App data (load from localStorage in demo mode) ──
  const [users, setUsers] = useState<UserAccount[]>(() => {
    if (PROGRAM_DEPLOYED || typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("instinctfi_users");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [polls, setPolls] = useState<DemoPoll[]>(() => {
    if (PROGRAM_DEPLOYED || typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("instinctfi_polls");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [votes, setVotes] = useState<DemoVote[]>(() => {
    if (PROGRAM_DEPLOYED || typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("instinctfi_votes");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

  // Persist polls/votes/users to localStorage in demo mode
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try { localStorage.setItem("instinctfi_polls", JSON.stringify(polls)); } catch {}
  }, [polls]);
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try { localStorage.setItem("instinctfi_votes", JSON.stringify(votes)); } catch {}
  }, [votes]);
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try { localStorage.setItem("instinctfi_users", JSON.stringify(users)); } catch {}
  }, [users]);

  // ── Off-chain option images cache (Supabase) ──
  const optionImagesCache = useRef<Record<string, string[]>>({});

  const userAccount = walletAddress
    ? users.find((u) => u.wallet === walletAddress) ?? null
    : null;

  // ── Fetch all on-chain data ──
  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (PROGRAM_DEPLOYED) {
        // Fetch all polls from on-chain
        const [onChainPolls, onChainUsers] = await Promise.all([
          fetchAllPolls(),
          fetchAllUsers(),
        ]);

        // Try to load option images from Supabase (off-chain enrichment)
        let optionImagesMap: Record<string, string[]> = {};
        if (isSupabaseConfigured) {
          try {
            const { data } = await supabase
              .from("poll_images")
              .select("poll_pda, option_images");
            if (data) {
              for (const row of data) {
                optionImagesMap[row.poll_pda] = row.option_images || [];
              }
            }
          } catch {
            // Supabase optional — continue without option images
          }
        }
        optionImagesCache.current = optionImagesMap;

        // Convert to frontend types
        const demoPolls = onChainPolls.map((p) =>
          onChainPollToDemo(p, optionImagesMap[p.address.toString()])
        );

        // Fetch balances for all users
        const usersWithBalances = await Promise.all(
          onChainUsers.map(async (u) => {
            try {
              const bal = await getWalletBalance(u.authority);
              return onChainUserToAccount(u, bal);
            } catch {
              return onChainUserToAccount(u, 0);
            }
          })
        );

        setPolls(demoPolls);
        setUsers(usersWithBalances);

        // If wallet connected, fetch votes for current user
        if (walletAddress) {
          try {
            const userVotes = await fetchVotesForUser(new PublicKey(walletAddress));
            setVotes(userVotes.map(onChainVoteToDemo));
          } catch (e) {
            console.warn("Failed to fetch votes:", e);
          }
        }
      } else {
        // Demo mode: load shared data from Supabase
        if (isSupabaseConfigured) {
          try {
            const [pollsRes, votesRes] = await Promise.all([
              supabase.from("polls").select("*").order("created_at", { ascending: false }),
              supabase.from("votes").select("*"),
            ]);
            if (pollsRes.data && pollsRes.data.length > 0) {
              setPolls(pollsRes.data.map(rowToDemoPoll));
            }
            if (votesRes.data) {
              setVotes(votesRes.data.map(rowToDemoVote));
            }
          } catch (e) {
            console.warn("Failed to load from Supabase, using localStorage cache:", e);
          }
        }
        // Always refresh real wallet balance
        if (walletAddress) {
          try {
            const bal = await getWalletBalance(new PublicKey(walletAddress));
            setUsers(prev => prev.map(u =>
              u.wallet === walletAddress ? { ...u, balance: bal } : u
            ));
          } catch {
            // Keep existing balance on failure
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch data:", e);
    }
    setIsLoading(false);
    initialFetchDone.current = true;
    fetchingRef.current = false;
  }, [walletAddress]);

  // ── On mount: fetch all data ──
  useEffect(() => {
    fetchAll();

    // Poll for updates every 15 seconds (Solana doesn't have real-time push)
    const interval = setInterval(fetchAll, 15_000);

    // ── Supabase Realtime: instant updates on polls/votes changes ──
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel("polls-votes-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => {
          fetchAll();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
          fetchAll();
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // ── Refresh after wallet connects/changes ──
  useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchAll();
    }
  }, [walletConnected, walletAddress, fetchAll]);

  // ── Wallet signature verification ──
  const verifyWalletOwnership = async (publicKey: any): Promise<boolean> => {
    try {
      const solana = (window as any).solana;
      if (!solana?.signMessage) return true;

      const nonce = crypto.getRandomValues(new Uint8Array(32));
      const timestamp = Date.now();
      const message = `InstinctFi auth\nWallet: ${publicKey.toString()}\nNonce: ${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}\nTimestamp: ${timestamp}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signed = await solana.signMessage(encodedMessage, 'utf8');

      const verified = nacl.sign.detached.verify(
        encodedMessage,
        signed.signature,
        bs58.decode(publicKey.toString())
      );

      if (!verified) {
        toast.error('Wallet verification failed');
        return false;
      }
      return true;
    } catch (e: any) {
      if (e?.code === 4001 || e?.message?.includes('rejected')) {
        toast.error('Signature rejected — please sign to verify wallet ownership');
        return false;
      }
      console.error('Wallet verification error:', e);
      return false;
    }
  };

  // ── Auto-reconnect Phantom ──
  useEffect(() => {
    const tryReconnect = async () => {
      try {
        const solana = (window as any).solana;
        if (solana?.isPhantom) {
          // onlyIfTrusted: true means Phantom already approved this site — no popup
          const resp = await solana.connect({ onlyIfTrusted: true });
          // Skip signMessage on auto-reconnect — trust is already established
          const addr = resp.publicKey.toString();
          setWalletAddress(addr);
          setWalletConnected(true);

          // Placeholder user for instant UI
          setUsers(prev => {
            if (prev.find(u => u.wallet === addr)) return prev;
            return [...prev, {
              wallet: addr, balance: 0, signupBonusClaimed: false,
              lastWeeklyRewardTs: 0, totalVotesCast: 0, totalPollsVoted: 0,
              pollsWon: 0, pollsCreated: 0, totalSpentCents: 0,
              totalWinningsCents: 0, weeklyWinningsCents: 0, monthlyWinningsCents: 0,
              weeklySpentCents: 0, monthlySpentCents: 0, weeklyVotesCast: 0,
              monthlyVotesCast: 0, weeklyPollsWon: 0, monthlyPollsWon: 0,
              weeklyPollsVoted: 0, monthlyPollsVoted: 0, creatorEarningsCents: 0,
              weeklyResetTs: Date.now(), monthlyResetTs: Date.now(),
              createdAt: Date.now(),
            }];
          });

          // Always fetch real wallet balance
          getWalletBalance(resp.publicKey).then(bal => {
            setUsers(prev => prev.map(u => u.wallet === addr ? { ...u, balance: bal } : u));
          }).catch(() => {});
        }
      } catch {}
    };
    tryReconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Connect wallet ──
  const connectWallet = useCallback(async () => {
    try {
      const solana = (window as any).solana;
      if (solana?.isPhantom) {
        const resp = await solana.connect();
        const verified = await verifyWalletOwnership(resp.publicKey);
        if (!verified) {
          await solana.disconnect();
          return;
        }
        const addr = resp.publicKey.toString();
        setWalletAddress(addr);
        setWalletConnected(true);

        // Immediately create a placeholder user so UI shows connected state
        setUsers(prev => {
          if (prev.find(u => u.wallet === addr)) return prev;
          return [...prev, {
            wallet: addr, balance: 0, signupBonusClaimed: false,
            lastWeeklyRewardTs: 0, totalVotesCast: 0, totalPollsVoted: 0,
            pollsWon: 0, pollsCreated: 0, totalSpentCents: 0,
            totalWinningsCents: 0, weeklyWinningsCents: 0, monthlyWinningsCents: 0,
            weeklySpentCents: 0, monthlySpentCents: 0, weeklyVotesCast: 0,
            monthlyVotesCast: 0, weeklyPollsWon: 0, monthlyPollsWon: 0,
            weeklyPollsVoted: 0, monthlyPollsVoted: 0, creatorEarningsCents: 0,
            weeklyResetTs: Date.now(), monthlyResetTs: Date.now(),
            createdAt: Date.now(),
          }];
        });

        // Always fetch real wallet balance
        getWalletBalance(resp.publicKey).then(bal => {
          setUsers(prev => prev.map(u => u.wallet === addr ? { ...u, balance: bal } : u));
        }).catch(() => {});
      } else {
        window.open("https://phantom.app/", "_blank");
      }
    } catch {
      console.error("Wallet connection failed");
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      const solana = (window as any).solana;
      if (solana) await solana.disconnect();
    } catch {}
    setWalletConnected(false);
    setWalletAddress(null);
  }, []);

  // ── Signup: Initialize on-chain user account via Solana transaction ──
  const signup = useCallback(async () => {
    if (!walletAddress) return;
    if (!initialFetchDone.current) return;

    if (!PROGRAM_DEPLOYED) {
      // Demo mode: user already added as placeholder in connectWallet
      // Upsert to Supabase + refresh SOL balance
      if (isSupabaseConfigured) {
        try {
          await supabase.from("users").upsert({
            wallet: walletAddress,
            created_at: Date.now(),
          }, { onConflict: "wallet" });
        } catch (e) {
          console.warn("Failed to sync user to Supabase:", e);
        }
      }

      // Fetch real wallet balance on signup
      const existingUser = users.find(u => u.wallet === walletAddress);
      if (existingUser && !existingUser.signupBonusClaimed) {
        setUsers(prev => prev.map(u =>
          u.wallet === walletAddress
            ? { ...u, signupBonusClaimed: true, lastWeeklyRewardTs: Date.now() }
            : u
        ));
      }
      // Always fetch real wallet balance
      try {
        const bal = await getWalletBalance(new PublicKey(walletAddress));
        setUsers(prev => prev.map(u =>
          u.wallet === walletAddress ? { ...u, balance: bal } : u
        ));
      } catch (e) {
        console.warn("Failed to fetch wallet balance:", e);
      }
      return;
    }

    // Check if user account already exists on-chain
    try {
      const existing = await fetchUserAccount(new PublicKey(walletAddress));
      if (existing) {
        // Already initialized — just ensure user is in local state
        const bal = await getWalletBalance(new PublicKey(walletAddress));
        const user = onChainUserToAccount(existing, bal);
        setUsers(prev => {
          if (prev.find(u => u.wallet === walletAddress)) {
            return prev.map(u => u.wallet === walletAddress ? user : u);
          }
          return [...prev, user];
        });
        return;
      }
    } catch (e) {
      console.warn("Failed to check user account:", e);
    }

    // Initialize on-chain user account
    try {
      const pubkey = new PublicKey(walletAddress);
      const ix = await buildInitializeUserIx(pubkey);
      const sig = await sendTransaction([ix], pubkey);
      console.log("User initialized on-chain:", sig);
      toast.success("Account created on Solana!");

      // Refresh user data
      const bal = await getWalletBalance(pubkey);
      const onChainUser = await fetchUserAccount(pubkey);
      if (onChainUser) {
        const user = onChainUserToAccount(onChainUser, bal);
        setUsers(prev => [...prev.filter(u => u.wallet !== walletAddress), user]);
      }
    } catch (e: any) {
      console.error("Signup failed:", e);
      // If the error is "already in use", the account already exists
      if (e?.message?.includes("already in use") || e?.message?.includes("0x0")) {
        const bal = await getWalletBalance(new PublicKey(walletAddress));
        const onChainUser = await fetchUserAccount(new PublicKey(walletAddress));
        if (onChainUser) {
          const user = onChainUserToAccount(onChainUser, bal);
          setUsers(prev => [...prev.filter(u => u.wallet !== walletAddress), user]);
        }
      } else {
        toast.error("Failed to create account — make sure you have SOL for gas");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  // ── Auto-signup when connected ──
  useEffect(() => {
    if (!initialFetchDone.current) return;
    if (walletConnected && walletAddress && !users.find((u) => u.wallet === walletAddress)) {
      signup();
    }
  }, [walletConnected, walletAddress, signup, users]);

  // ── Claim daily reward: Request devnet airdrop (replaces virtual bonus) ──
  const claimDailyReward = useCallback(async (): Promise<boolean> => {
    if (!walletAddress) return false;

    if (!PROGRAM_DEPLOYED) {
      // Demo mode: request real devnet airdrop (1 SOL every 24 hours)
      const user = users.find(u => u.wallet === walletAddress);
      if (user) {
        const hoursSinceLastClaim = (Date.now() - user.lastWeeklyRewardTs) / (1000 * 60 * 60);
        if (hoursSinceLastClaim < 24) {
          const hoursLeft = Math.ceil(24 - hoursSinceLastClaim);
          toast.error(`Daily reward available in ${hoursLeft}h`, { id: "airdrop" });
          return false;
        }
      }
      try {
        toast.loading("Requesting devnet SOL airdrop...", { id: "airdrop" });
        const pubkey = new PublicKey(walletAddress);
        const sig = await requestAirdrop(pubkey, 1);
        console.log("Airdrop:", sig);
        const newBal = await getWalletBalance(pubkey);
        setUsers(prev => prev.map(u =>
          u.wallet === walletAddress
            ? { ...u, balance: newBal, lastWeeklyRewardTs: Date.now() }
            : u
        ));
        toast.success("Received 1 SOL airdrop!", { id: "airdrop" });
        return true;
      } catch (e: any) {
        console.error("Airdrop failed:", e);
        const msg = e?.message || "";
        if (msg.includes("429") || msg.includes("Too Many")) {
          toast.error("Rate limited — wait a minute and try again", { id: "airdrop" });
        } else {
          toast.error("Airdrop failed — devnet may be congested, try again later", { id: "airdrop" });
        }
        return false;
      }
    }

    try {
      toast.loading("Requesting devnet SOL airdrop...", { id: "airdrop" });
      const pubkey = new PublicKey(walletAddress);
      const balBefore = await getWalletBalance(pubkey);
      const sig = await requestAirdrop(pubkey, 1);
      console.log("Airdrop:", sig);

      // Update local balance
      const newBal = await getWalletBalance(pubkey);
      const received = (newBal - balBefore) / LAMPORTS_PER_SOL;
      toast.success(`Received ${received.toFixed(1)} SOL airdrop!`, { id: "airdrop" });
      setUsers(prev => prev.map(u =>
        u.wallet === walletAddress ? { ...u, balance: newBal } : u
      ));
      return true;
    } catch (e: any) {
      console.error("Airdrop failed:", e);
      const msg = e?.message || "";
      if (msg.includes("429") || msg.includes("Too Many")) {
        toast.error("Rate limited — wait a minute and try again", { id: "airdrop" });
      } else {
        toast.error("Airdrop failed — devnet may be congested, try again later", { id: "airdrop" });
      }
      return false;
    }
  }, [walletAddress, users]);

  // ── Create poll: Real SOL transaction (or demo mode) ──
  const createPoll = useCallback(
    async (poll: Omit<DemoPoll, "id">): Promise<DemoPoll | null> => {
      if (!walletAddress) return null;

      try {
        const pubkey = new PublicKey(walletAddress);
        const pollId = poll.pollId || Date.now();

        toast.loading("Creating poll...", { id: "create-poll" });

        if (PROGRAM_DEPLOYED) {
          const ix = await buildCreatePollIx(
            pubkey,
            pollId,
            poll.title,
            poll.description,
            poll.category,
            poll.imageUrl,
            poll.options,
            poll.unitPriceCents,
            poll.endTime,
            poll.creatorInvestmentCents
          );
          const sig = await sendTransaction([ix], pubkey);
          console.log("Poll created on-chain:", sig);
        }

        // Store option images off-chain in Supabase (if configured)
        const [pollPDA] = getPollPDA(pubkey, pollId);

        // Build the frontend poll object
        const platformFee = Math.max(Math.floor(poll.creatorInvestmentCents / 100), 1);
        const creatorReward = Math.max(Math.floor(poll.creatorInvestmentCents / 100), 1);
        const poolSeed = poll.creatorInvestmentCents - platformFee - creatorReward;

        const newPoll: DemoPoll = {
          ...poll,
          id: pollPDA.toString(),
          pollId,
          totalPoolCents: poolSeed,
          platformFeeCents: platformFee,
          creatorRewardCents: creatorReward,
          voteCounts: new Array(poll.options.length).fill(0),
          status: 0,
          winningOption: 255,
          totalVoters: 0,
          createdAt: Math.floor(Date.now() / 1000),
        };

        setPolls(prev => [newPoll, ...prev]);

        // Save full poll to Supabase for cross-account sharing
        if (isSupabaseConfigured) {
          try {
            await supabase.from("polls").upsert(demoPollToRow(newPoll), { onConflict: "id" });
          } catch (e) {
            console.warn("Failed to save poll to Supabase:", e);
          }
        }

        // Update balance
        try {
          const newBal = await getWalletBalance(pubkey);
          setUsers(prev => prev.map(u =>
            u.wallet === walletAddress
              ? { ...u, balance: newBal, pollsCreated: u.pollsCreated + 1 }
              : u
          ));
        } catch {
          setUsers(prev => prev.map(u =>
            u.wallet === walletAddress
              ? { ...u, pollsCreated: u.pollsCreated + 1 }
              : u
          ));
        }

        toast.success("Poll created!", { id: "create-poll" });
        return newPoll;
      } catch (e: any) {
        console.error("Create poll failed:", e);
        toast.error(e?.message || "Failed to create poll", { id: "create-poll" });
        return null;
      }
    },
    [walletAddress]
  );

  // ── Edit poll: On-chain transaction (creator-only, zero votes, active) ──
  const editPoll = useCallback(
    async (
      pollId: string,
      updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>
    ): Promise<boolean> => {
      if (!walletAddress) return false;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) return false;

      const admin = isAdminWallet(walletAddress);

      // Non-admin restrictions
      if (!admin) {
        if (poll.creator !== walletAddress) return false;
        if (poll.status !== 0) return false;

        const now = Math.floor(Date.now() / 1000);
        if (now >= poll.endTime) return false;
        const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
        if (totalVotes > 0) return false;
        if (updates.options && updates.options.length !== poll.options.length) return false;
        if (updates.endTime && updates.endTime <= now) return false;
      }

      // Optimistic update
      const updatedPoll: DemoPoll = {
        ...poll,
        title: updates.title ?? poll.title,
        description: updates.description ?? poll.description,
        category: updates.category ?? poll.category,
        imageUrl: updates.imageUrl ?? poll.imageUrl,
        optionImages: updates.optionImages ?? poll.optionImages,
        options: updates.options ?? poll.options,
        endTime: updates.endTime ?? poll.endTime,
      };
      setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));

      try {
        if (PROGRAM_DEPLOYED) {
          const pubkey = new PublicKey(walletAddress);
          toast.loading("Editing poll on Solana...", { id: "edit-poll" });

          const ix = await buildEditPollIx(
            pubkey,
            poll.pollId,
            updates.title ?? poll.title,
            updates.description ?? poll.description,
            updates.category ?? poll.category,
            updates.imageUrl ?? poll.imageUrl,
            updates.options ?? poll.options,
            updates.endTime ?? poll.endTime
          );

          await sendTransaction([ix], pubkey);
        }

        // Sync updated poll to Supabase
        if (isSupabaseConfigured) {
          try {
            await supabase.from("polls").update({
              title: updates.title ?? poll.title,
              description: updates.description ?? poll.description,
              category: updates.category ?? poll.category,
              image_url: updates.imageUrl ?? poll.imageUrl,
              option_images: updates.optionImages ?? poll.optionImages,
              options: updates.options ?? poll.options,
              end_time: updates.endTime ?? poll.endTime,
            }).eq("id", pollId);
          } catch (e) {
            console.warn("Failed to sync edit to Supabase:", e);
          }
        }

        toast.success("Poll edited!", { id: "edit-poll" });
        return true;
      } catch (e: any) {
        // Rollback optimistic update on failure
        setPolls(prev => prev.map(p => p.id === pollId ? poll : p));
        console.error("Edit poll failed:", e);
        toast.error(e?.message || "Edit failed", { id: "edit-poll" });
        return false;
      }
    },
    [walletAddress, polls]
  );

  // ── Delete poll: Refunds SOL from treasury ──
  const deletePoll = useCallback(
    async (pollId: string): Promise<boolean> => {
      if (!walletAddress) return false;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) return false;

      const admin = isAdminWallet(walletAddress);

      // Non-admin restrictions
      if (!admin) {
        if (poll.creator !== walletAddress) return false;
        if (poll.status !== 0) return false;

        const now = Math.floor(Date.now() / 1000);
        if (now >= poll.endTime) return false;
        const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
        if (totalVotes > 0) return false;
      }

      try {
        const pubkey = new PublicKey(walletAddress);
        toast.loading("Deleting poll...", { id: "delete-poll" });

        if (PROGRAM_DEPLOYED) {
          const ix = await buildDeletePollIx(pubkey, poll.pollId);
          await sendTransaction([ix], pubkey);
        }

        // Remove from local state
        setPolls(prev => prev.filter(p => p.id !== pollId));

        // Update balance
        try {
          const newBal = await getWalletBalance(pubkey);
          setUsers(prev => prev.map(u =>
            u.wallet === walletAddress
              ? { ...u, balance: newBal, pollsCreated: Math.max(0, u.pollsCreated - 1) }
              : u
          ));
        } catch {
          setUsers(prev => prev.map(u =>
            u.wallet === walletAddress
              ? { ...u, pollsCreated: Math.max(0, u.pollsCreated - 1) }
              : u
          ));
        }

        // Clean up from Supabase
        if (isSupabaseConfigured) {
          try { await supabase.from("polls").delete().eq("id", pollId); } catch {}
        }

        toast.success("Poll deleted!", { id: "delete-poll" });
        return true;
      } catch (e: any) {
        console.error("Delete poll failed:", e);
        toast.error(e?.message || "Delete failed", { id: "delete-poll" });
        return false;
      }
    },
    [walletAddress, polls]
  );

  // ── Cast vote: Real SOL transfer to treasury ──
  const castVote = useCallback(
    async (pollId: string, optionIndex: number, numCoins: number): Promise<boolean> => {
      if (!walletAddress) return false;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll || poll.status !== 0) return false;
      if (Date.now() / 1000 > poll.endTime) return false;
      if (poll.creator === walletAddress) {
        toast.error("You cannot vote on your own poll");
        return false;
      }

      // Check max vote limit per poll
      const existing = votes.find(v => v.pollId === pollId && v.voter === walletAddress);
      const currentCoins = existing ? existing.votesPerOption.reduce((a, b) => a + b, 0) : 0;
      if (currentCoins + numCoins > MAX_COINS_PER_POLL) {
        toast.error(`Max ${MAX_COINS_PER_POLL} coins per poll (you have ${currentCoins})`);
        return false;
      }

      const cost = numCoins * poll.unitPriceCents; // lamports
      if (userAccount && cost > userAccount.balance) {
        toast.error("Insufficient SOL balance");
        return false;
      }

      // Save previous state for rollback on failure
      const prevPolls = polls;
      const prevVotes = votes;

      try {
        const pubkey = new PublicKey(walletAddress);
        const pollCreator = new PublicKey(poll.creator);
        toast.loading("Casting vote...", { id: "cast-vote" });

        if (PROGRAM_DEPLOYED) {
          const ix = await buildCastVoteIx(
            pubkey,
            pollCreator,
            poll.pollId,
            optionIndex,
            numCoins
          );

          const sig = await sendTransaction([ix], pubkey);
          console.log("Vote cast on-chain:", sig);
        }

        // Optimistic local update
        const updatedPoll = {
          ...poll,
          voteCounts: poll.voteCounts.map((c, i) => i === optionIndex ? c + numCoins : c),
          totalPoolCents: poll.totalPoolCents + cost,
          totalVoters: poll.totalVoters + (existing ? 0 : 1),
        };
        setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));

        if (existing) {
          const updatedVote: DemoVote = {
            ...existing,
            votesPerOption: existing.votesPerOption.map((c, i) => i === optionIndex ? c + numCoins : c),
            totalStakedCents: existing.totalStakedCents + cost,
          };
          setVotes(prev => prev.map(v =>
            v.pollId === pollId && v.voter === walletAddress ? updatedVote : v
          ));
        } else {
          const votesPerOption = new Array(poll.options.length).fill(0);
          votesPerOption[optionIndex] = numCoins;
          setVotes(prev => [...prev, {
            pollId,
            voter: walletAddress,
            votesPerOption,
            totalStakedCents: cost,
            claimed: false,
          }]);
        }

        // Update balance — always fetch real wallet balance
        {
          let newBal: number;
          try {
            newBal = await getWalletBalance(pubkey);
          } catch {
            // Fallback: deduct cost locally
            const currentUser = users.find(u => u.wallet === walletAddress);
            newBal = currentUser ? Math.max(0, currentUser.balance - cost) : 0;
          }
          setUsers(prev => prev.map(u => {
            if (u.wallet !== walletAddress) return u;
            const fresh = withFreshPeriods(u);
            return {
              ...fresh,
              balance: newBal,
              totalVotesCast: fresh.totalVotesCast + numCoins,
              weeklyVotesCast: fresh.weeklyVotesCast + numCoins,
              monthlyVotesCast: fresh.monthlyVotesCast + numCoins,
              totalSpentCents: fresh.totalSpentCents + cost,
              weeklySpentCents: fresh.weeklySpentCents + cost,
              monthlySpentCents: fresh.monthlySpentCents + cost,
              totalPollsVoted: fresh.totalPollsVoted + (existing ? 0 : 1),
              weeklyPollsVoted: fresh.weeklyPollsVoted + (existing ? 0 : 1),
              monthlyPollsVoted: fresh.monthlyPollsVoted + (existing ? 0 : 1),
            };
          }));
        }

        // Sync vote + updated poll to Supabase
        if (isSupabaseConfigured) {
          try {
            const voteRow = existing
              ? {
                  poll_id: pollId,
                  voter: walletAddress,
                  votes_per_option: existing.votesPerOption.map((c, i) => i === optionIndex ? c + numCoins : c),
                  total_staked_cents: existing.totalStakedCents + cost,
                  claimed: false,
                }
              : {
                  poll_id: pollId,
                  voter: walletAddress,
                  votes_per_option: new Array(poll.options.length).fill(0).map((_, i) => i === optionIndex ? numCoins : 0),
                  total_staked_cents: cost,
                  claimed: false,
                };
            await Promise.all([
              supabase.from("votes").upsert(voteRow, { onConflict: "poll_id,voter" }),
              supabase.from("polls").update({
                vote_counts: updatedPoll.voteCounts,
                total_pool_cents: updatedPoll.totalPoolCents,
                total_voters: updatedPoll.totalVoters,
              }).eq("id", pollId),
            ]);
          } catch (e) {
            console.warn("Failed to sync vote to Supabase:", e);
          }
        }

        toast.success(`Voted ${numCoins} coin(s) — ${formatSOL(cost)} SOL sent!`, { id: "cast-vote" });
        return true;
      } catch (e: any) {
        // Rollback optimistic update on failure
        setPolls(prevPolls);
        setVotes(prevVotes);
        console.error("Cast vote failed:", e);
        toast.error(e?.message || "Vote failed", { id: "cast-vote" });
        return false;
      }
    },
    [walletAddress, polls, votes, userAccount]
  );

  // ── Settle poll: Determines winner, sends creator reward ──
  // If winningOption is provided (admin override), use that instead of auto-detecting
  const settlePoll = useCallback(
    async (pollId: string, winningOption?: number): Promise<boolean> => {
      const poll = polls.find((p) => p.id === pollId);
      if (!poll || poll.status !== 0) return false;

      if (!walletAddress) return false;

      try {
        const pubkey = new PublicKey(walletAddress);
        const pollCreator = new PublicKey(poll.creator);
        toast.loading("Settling poll...", { id: "settle-poll" });

        if (PROGRAM_DEPLOYED) {
          const ix = await buildSettlePollIx(pubkey, pollCreator, poll.pollId);
          const sig = await sendTransaction([ix], pubkey);
          console.log("Poll settled on-chain:", sig);
        }

        let finalWinningOption: number;
        if (winningOption !== undefined && winningOption >= 0 && winningOption < poll.options.length) {
          // Admin chose the winner
          finalWinningOption = winningOption;
        } else {
          // Auto-detect winner by highest votes
          let maxVotes = 0;
          let winningIdx = 255;
          poll.voteCounts.forEach((count, i) => {
            if (count > maxVotes) {
              maxVotes = count;
              winningIdx = i;
            }
          });
          finalWinningOption = maxVotes > 0 ? winningIdx : 255;
        }

        setPolls(prev => prev.map(p =>
          p.id === pollId ? { ...p, status: 1, winningOption: finalWinningOption } : p
        ));

        // Sync settlement to Supabase
        if (isSupabaseConfigured) {
          try {
            await supabase.from("polls").update({
              status: 1,
              winning_option: finalWinningOption,
            }).eq("id", pollId);
          } catch (e) {
            console.warn("Failed to sync settlement to Supabase:", e);
          }
        }

        toast.success("Poll settled!", { id: "settle-poll" });
        return true;
      } catch (e: any) {
        console.error("Settle poll failed:", e);
        toast.error(e?.message || "Settlement failed", { id: "settle-poll" });
        return false;
      }
    },
    [walletAddress, polls]
  );

  // ── Claim reward: Real SOL from treasury PDA to winner ──
  const claimReward = useCallback(
    async (pollId: string): Promise<number> => {
      if (!walletAddress) return 0;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll || poll.status !== 1 || poll.winningOption === 255) return 0;

      const voteRecord = votes.find(v => v.pollId === pollId && v.voter === walletAddress);
      if (!voteRecord || voteRecord.claimed) return 0;

      const userWinningVotes = voteRecord.votesPerOption[poll.winningOption] || 0;
      if (userWinningVotes === 0) return 0;

      try {
        const pubkey = new PublicKey(walletAddress);
        const pollCreator = new PublicKey(poll.creator);
        toast.loading("Claiming reward...", { id: "claim-reward" });

        if (PROGRAM_DEPLOYED) {
          const ix = await buildClaimRewardIx(pubkey, pollCreator, poll.pollId);
          const sig = await sendTransaction([ix], pubkey);
          console.log("Reward claimed:", sig);
        }

        // Calculate expected reward
        const totalWinningVotes = poll.voteCounts[poll.winningOption];
        const reward = Math.floor(
          (userWinningVotes / totalWinningVotes) * poll.totalPoolCents
        );

        // Mark claimed
        setVotes(prev => prev.map(v =>
          v.pollId === pollId && v.voter === walletAddress ? { ...v, claimed: true } : v
        ));

        // Sync claim to Supabase
        if (isSupabaseConfigured) {
          try {
            await supabase.from("votes").update({ claimed: true })
              .eq("poll_id", pollId)
              .eq("voter", walletAddress);
          } catch (e) {
            console.warn("Failed to sync claim to Supabase:", e);
          }
        }

        // Update balance — always fetch real wallet balance
        {
          let newBal: number;
          try {
            newBal = await getWalletBalance(pubkey);
          } catch {
            const currentUser = users.find(u => u.wallet === walletAddress);
            newBal = currentUser ? currentUser.balance + reward : reward;
          }
          setUsers(prev => prev.map(u => {
            if (u.wallet !== walletAddress) return u;
            const fresh = withFreshPeriods(u);
            return {
              ...fresh,
              balance: newBal,
              pollsWon: fresh.pollsWon + 1,
              weeklyPollsWon: fresh.weeklyPollsWon + 1,
              monthlyPollsWon: fresh.monthlyPollsWon + 1,
              totalWinningsCents: fresh.totalWinningsCents + reward,
              weeklyWinningsCents: fresh.weeklyWinningsCents + reward,
              monthlyWinningsCents: fresh.monthlyWinningsCents + reward,
            };
          }));
        }

        toast.success(`Claimed ${formatSOL(reward)}!`, { id: "claim-reward" });
        return reward;
      } catch (e: any) {
        console.error("Claim reward failed:", e);
        toast.error(e?.message || "Claim failed", { id: "claim-reward" });
        return 0;
      }
    },
    [walletAddress, polls, votes]
  );

  return (
    <AppContext.Provider
      value={{
        walletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
        userAccount,
        signup,
        claimDailyReward,
        isLoading,
        polls,
        votes,
        createPoll,
        editPoll,
        deletePoll,
        castVote,
        settlePoll,
        claimReward,
        allUsers: users,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
