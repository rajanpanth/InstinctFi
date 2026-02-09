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
import { useNotifications } from "@/lib/notifications";
import { friendlyErrorMessage } from "@/lib/errorRecovery";
import toast from "react-hot-toast";
import nacl from "tweetnacl";
import bs58 from "bs58";

// ── Re-export types & constants from shared modules ──────────────────────
// This maintains backward compatibility for all existing imports
export {
  SOL_UNIT,
  CENTS,
  MAX_COINS_PER_POLL,
  formatDollars,
  formatDollarsShort,
  type DemoPoll,
  type DemoVote,
  type UserAccount,
  type AppContextType,
} from "@/lib/types";

import {
  SOL_UNIT,
  MAX_COINS_PER_POLL,
  type DemoPoll,
  type DemoVote,
  type UserAccount,
  type AppContextType,
} from "@/lib/types";

import {
  onChainPollToDemo,
  onChainVoteToDemo,
  onChainUserToAccount,
  withFreshPeriods,
  demoPollToRow,
  rowToDemoPoll,
  rowToDemoVote,
  createPlaceholderUser,
} from "@/lib/dataConverters";

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside <Providers>");
  return ctx;
}

// Converter functions are now imported from @/lib/dataConverters

// ─── Provider ───────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  // ── Notifications ──
  const { addNotification } = useNotifications();

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

  // Keep a ref to the latest users so async closures can read current state
  const usersRef = useRef(users);
  useEffect(() => { usersRef.current = users; }, [users]);

  // ── Off-chain option images cache (Supabase) ──
  const optionImagesCache = useRef<Record<string, string[]>>({});

  // Track recently deleted poll IDs so fetchAll doesn't resurrect them
  const deletedPollIds = useRef<Set<string>>(new Set());

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

        setPolls(deletedPollIds.current.size > 0
          ? demoPolls.filter(p => !deletedPollIds.current.has(p.id))
          : demoPolls
        );
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
              const fetched = pollsRes.data.map(rowToDemoPoll);
              // Filter out polls that were recently deleted locally
              const filtered = deletedPollIds.current.size > 0
                ? fetched.filter(p => !deletedPollIds.current.has(p.id))
                : fetched;
              setPolls(filtered);
            }
            if (votesRes.data) {
              setVotes(votesRes.data.map(rowToDemoVote));
            }
          } catch (e) {
            console.warn("Failed to load from Supabase, using localStorage cache:", e);
          }
        }
        // Refresh real wallet balance only in on-chain mode
        // In demo mode, balance is tracked locally and must not be overwritten
        if (PROGRAM_DEPLOYED && walletAddress) {
          try {
            const bal = await getWalletBalance(new PublicKey(walletAddress));
            setUsers(prev => prev.map(u =>
              u.wallet === walletAddress ? { ...u, balance: bal } : u
            ));
          } catch {
            // Keep existing balance on failure
          }
        }

        // Demo mode fallback: if user's balance is still 0 (initial fetch may have failed),
        // try fetching the real devnet balance so they see their actual SOL
        if (!PROGRAM_DEPLOYED && walletAddress) {
          const currentUser = usersRef.current.find(u => u.wallet === walletAddress);
          if (currentUser && currentUser.balance === 0) {
            try {
              const bal = await getWalletBalance(new PublicKey(walletAddress));
              if (bal > 0) {
                console.log(`[fetchAll fallback] Updating balance: ${bal} lamports (${bal / 1e9} SOL)`);
                setUsers(prev => prev.map(u => u.wallet === walletAddress ? { ...u, balance: bal } : u));
              }
            } catch (e) {
              console.warn("[fetchAll fallback] Balance fetch failed:", e);
            }
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

          // Placeholder user for instant UI (only if not already in state from localStorage)
          const isNewUser = !users.find(u => u.wallet === addr);
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

          // Fetch real devnet balance:
          // - On-chain mode: always fetch
          // - Demo mode: only for NEW users (first connect); existing users keep their tracked balance
          if (PROGRAM_DEPLOYED || isNewUser) {
            const fetchBalWithRetry = async (attempt = 1): Promise<void> => {
              try {
                const bal = await getWalletBalance(resp.publicKey);
                console.log(`[auto-reconnect] Devnet balance: ${bal} lamports (${bal / 1e9} SOL)`);
                if (bal > 0 || attempt >= 3) {
                  setUsers(prev => prev.map(u => u.wallet === addr ? { ...u, balance: bal } : u));
                } else if (attempt < 3) {
                  // Balance is 0 — could be RPC lag; retry after delay
                  console.log(`[auto-reconnect] Balance is 0, retrying (attempt ${attempt + 1}/3)...`);
                  setTimeout(() => fetchBalWithRetry(attempt + 1), 2000);
                }
              } catch (e) {
                console.error(`[auto-reconnect] Failed to fetch balance (attempt ${attempt}/3):`, e);
                if (attempt < 3) {
                  setTimeout(() => fetchBalWithRetry(attempt + 1), 2000);
                }
              }
            };
            fetchBalWithRetry();
          }
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
        // Only add if not already in state (preserves demo balance from localStorage)
        const isNewUser = !users.find(u => u.wallet === addr);
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

        // Fetch real devnet balance:
        // - On-chain mode: always fetch
        // - Demo mode: only for NEW users (first connect); existing users keep their tracked balance
        if (PROGRAM_DEPLOYED || isNewUser) {
          const fetchBalWithRetry = async (attempt = 1): Promise<void> => {
            try {
              const bal = await getWalletBalance(resp.publicKey);
              console.log(`[connectWallet] Devnet balance: ${bal} lamports (${bal / 1e9} SOL)`);
              if (bal > 0 || attempt >= 3) {
                setUsers(prev => prev.map(u => u.wallet === addr ? { ...u, balance: bal } : u));
              } else if (attempt < 3) {
                console.log(`[connectWallet] Balance is 0, retrying (attempt ${attempt + 1}/3)...`);
                setTimeout(() => fetchBalWithRetry(attempt + 1), 2000);
              }
            } catch (e) {
              console.error(`[connectWallet] Failed to fetch balance (attempt ${attempt}/3):`, e);
              if (attempt < 3) {
                setTimeout(() => fetchBalWithRetry(attempt + 1), 2000);
              }
            }
          };
          fetchBalWithRetry();
        }
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

      // Mark signup bonus as claimed
      const existingUser = users.find(u => u.wallet === walletAddress);
      if (existingUser && !existingUser.signupBonusClaimed) {
        setUsers(prev => prev.map(u =>
          u.wallet === walletAddress
            ? { ...u, signupBonusClaimed: true, lastWeeklyRewardTs: Date.now() }
            : u
        ));
      }
      // In demo mode, preserve the locally-tracked balance (don't overwrite with on-chain)
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
        toast.loading("Requesting devnet SOL airdrop…", { id: "airdrop" });
        const pubkey = new PublicKey(walletAddress);

        // Capture on-chain balance BEFORE the airdrop
        const balBefore = await getWalletBalance(pubkey);

        const sig = await requestAirdrop(pubkey, 1);
        console.log("Airdrop sig:", sig);

        // Re-read on-chain balance to find out how much actually landed
        // (may be 0.5 or 1 SOL depending on devnet rate limits)
        await new Promise(r => setTimeout(r, 2000));

        let balAfter = await getWalletBalance(pubkey);
        // Retry balance read if unchanged (transaction may still be confirming)
        if (balAfter <= balBefore) {
          await new Promise(r => setTimeout(r, 3000));
          balAfter = await getWalletBalance(pubkey);
        }

        const receivedLamports = Math.max(balAfter - balBefore, 0);
        const receivedSol = receivedLamports / LAMPORTS_PER_SOL;

        // In demo mode, ADD the actual received amount to the tracked balance
        const credited = receivedLamports > 0 ? receivedLamports : LAMPORTS_PER_SOL; // fallback to 1 SOL
        const now = Date.now();
        setUsers(prev => prev.map(u =>
          u.wallet === walletAddress
            ? { ...u, balance: u.balance + credited, lastWeeklyRewardTs: now }
            : u
        ));

        // Sync updated balance to Supabase
        if (isSupabaseConfigured) {
          await new Promise(r => setTimeout(r, 50));
          const updatedUser = usersRef.current.find(u => u.wallet === walletAddress);
          if (updatedUser) {
            try {
              await supabase.from("users").update({
                balance: updatedUser.balance,
                last_weekly_reward_ts: now,
              }).eq("wallet", walletAddress);
            } catch {}
          }
        }

        toast.success(
          receivedLamports > 0
            ? `Received ${receivedSol.toFixed(2)} SOL airdrop!`
            : "Airdrop sent! Balance credited.",
          { id: "airdrop" }
        );
        return true;
      } catch (e: any) {
        console.error("Airdrop failed:", e);
        const msg = e?.message || "";
        if (msg.includes("429") || msg.includes("Too Many") || msg.includes("rate")) {
          toast.error("Rate limited — wait a minute and try again", { id: "airdrop" });
        } else {
          toast.error("Airdrop failed — devnet may be congested, try again later", { id: "airdrop" });
        }
        return false;
      }
    }

    try {
      toast.loading("Requesting devnet SOL airdrop…", { id: "airdrop" });
      const pubkey = new PublicKey(walletAddress);
      const balBefore = await getWalletBalance(pubkey);
      const sig = await requestAirdrop(pubkey, 1);
      console.log("Airdrop sig:", sig);

      // Wait and read updated balance
      await new Promise(r => setTimeout(r, 2000));
      let newBal = await getWalletBalance(pubkey);
      if (newBal <= balBefore) {
        await new Promise(r => setTimeout(r, 3000));
        newBal = await getWalletBalance(pubkey);
      }

      const received = Math.max(newBal - balBefore, 0) / LAMPORTS_PER_SOL;
      toast.success(
        received > 0
          ? `Received ${received.toFixed(2)} SOL airdrop!`
          : "Airdrop sent! Balance updated.",
        { id: "airdrop" }
      );
      setUsers(prev => prev.map(u =>
        u.wallet === walletAddress ? { ...u, balance: newBal, lastWeeklyRewardTs: Date.now() } : u
      ));
      return true;
    } catch (e: any) {
      console.error("Airdrop failed:", e);
      const msg = e?.message || "";
      if (msg.includes("429") || msg.includes("Too Many") || msg.includes("rate")) {
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

        // Update balance — deduct creator investment
        {
          let newBal: number | undefined;
          if (PROGRAM_DEPLOYED) {
            try { newBal = await getWalletBalance(pubkey); } catch {}
          }
          setUsers(prev => {
            const updated = prev.map(u => {
              if (u.wallet !== walletAddress) return u;
              // In demo mode, deduct investment locally; on-chain mode uses fetched balance
              const bal = newBal ?? Math.max(0, u.balance - poll.creatorInvestmentCents);
              console.log(`[createPoll] Balance deduction: ${u.balance} - ${poll.creatorInvestmentCents} = ${bal} (wallet: ${u.wallet})`);
              return {
                ...u,
                balance: bal,
                pollsCreated: u.pollsCreated + 1,
                totalSpentCents: u.totalSpentCents + poll.creatorInvestmentCents,
              };
            });
            return updated;
          });
        }

        // Sync updated user balance to Supabase (use ref for latest state)
        if (isSupabaseConfigured) {
          // Small delay to let React process the setUsers above
          await new Promise(r => setTimeout(r, 50));
          const currentUser = usersRef.current.find(u => u.wallet === walletAddress);
          if (currentUser) {
            try {
              await supabase.from("users").update({
                balance: currentUser.balance,
                total_spent_cents: currentUser.totalSpentCents,
                polls_created: currentUser.pollsCreated,
              }).eq("wallet", walletAddress);
            } catch {}
          }
        }

        toast.success("Poll created!", { id: "create-poll" });
        return newPoll;
      } catch (e: any) {
        console.error("Create poll failed:", e);
        toast.error(friendlyErrorMessage(e, "Create poll"), { id: "create-poll" });
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
        toast.error(friendlyErrorMessage(e, "Edit"), { id: "edit-poll" });
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

      // Save previous state for rollback
      const prevPolls = polls;
      const prevUsers = users;
      const prevVotes = votes;

      // Gather all votes for this poll to refund voters
      const pollVotes = votes.filter(v => v.pollId === pollId);

      try {
        const pubkey = new PublicKey(walletAddress);
        toast.loading("Deleting poll & refunding balances...", { id: "delete-poll" });

        if (PROGRAM_DEPLOYED) {
          const ix = await buildDeletePollIx(pubkey, poll.pollId);
          await sendTransaction([ix], pubkey);
        }

        // Mark as deleted so fetchAll won't resurrect it
        deletedPollIds.current.add(pollId);

        // Delete votes + poll from Supabase to remove for all users
        if (isSupabaseConfigured) {
          // Delete votes first (even though ON DELETE CASCADE exists, be explicit)
          const votesRes = await supabase.from("votes").delete().eq("poll_id", pollId);
          if (votesRes.error) {
            console.warn("Failed to delete votes from Supabase:", votesRes.error);
          }

          const pollRes = await supabase.from("polls").delete().eq("id", pollId);
          if (pollRes.error) {
            console.error("Failed to delete poll from Supabase:", pollRes.error);
            // Retry once
            const retry = await supabase.from("polls").delete().eq("id", pollId);
            if (retry.error) {
              console.error("Retry delete also failed:", retry.error);
              toast.error("Poll removed locally but failed to sync. Other users may still see it.", { id: "delete-poll" });
            }
          }
        }

        // Also remove from localStorage to prevent stale reload
        try {
          const savedPolls = localStorage.getItem("instinctfi_polls");
          if (savedPolls) {
            const parsed = JSON.parse(savedPolls);
            const filtered = parsed.filter((p: any) => p.id !== pollId);
            localStorage.setItem("instinctfi_polls", JSON.stringify(filtered));
          }
          const savedVotes = localStorage.getItem("instinctfi_votes");
          if (savedVotes) {
            const parsed = JSON.parse(savedVotes);
            const filtered = parsed.filter((v: any) => v.pollId !== pollId);
            localStorage.setItem("instinctfi_votes", JSON.stringify(filtered));
          }
        } catch {}

        // Remove poll + its votes from local state
        setPolls(prev => prev.filter(p => p.id !== pollId));
        setVotes(prev => prev.filter(v => v.pollId !== pollId));

        // Refund all balances:
        // - Creator gets back creatorInvestmentCents
        // - Each voter gets back their totalStakedCents
        {
          // Build a refund map: wallet → amount to refund
          const refunds: Record<string, number> = {};

          // Creator investment refund
          refunds[poll.creator] = (refunds[poll.creator] || 0) + poll.creatorInvestmentCents;

          // Voter refunds
          for (const v of pollVotes) {
            refunds[v.voter] = (refunds[v.voter] || 0) + v.totalStakedCents;
          }

          if (PROGRAM_DEPLOYED) {
            // On-chain mode: fetch real balances
            setUsers(prev => prev.map(u => {
              if (!refunds[u.wallet]) return u;
              return { ...u, balance: u.balance + refunds[u.wallet] };
            }));
          } else {
            // Demo mode: add refund amounts back locally
            setUsers(prev => prev.map(u => {
              const refund = refunds[u.wallet] || 0;
              if (refund === 0 && u.wallet !== poll.creator) return u;
              return {
                ...u,
                balance: u.balance + refund,
                pollsCreated: u.wallet === poll.creator
                  ? Math.max(0, u.pollsCreated - 1)
                  : u.pollsCreated,
                totalSpentCents: Math.max(0, u.totalSpentCents - refund),
              };
            }));
          }

          // Sync refunded balances to Supabase (use ref for latest state)
          if (isSupabaseConfigured) {
            await new Promise(r => setTimeout(r, 50));
            try {
              for (const [wallet] of Object.entries(refunds)) {
                const user = usersRef.current.find(u => u.wallet === wallet);
                if (user) {
                  await supabase.from("users").update({
                    balance: user.balance,
                    total_spent_cents: user.totalSpentCents,
                    ...(wallet === poll.creator ? { polls_created: user.pollsCreated } : {}),
                  }).eq("wallet", wallet);
                }
              }
            } catch (e) {
              console.warn("Failed to sync refunds to Supabase:", e);
            }
          }
        }

        // Clear from deleted tracking after 30s (enough for all pending fetches to complete)
        setTimeout(() => { deletedPollIds.current.delete(pollId); }, 30_000);

        const refundTotal = poll.creatorInvestmentCents + pollVotes.reduce((s, v) => s + v.totalStakedCents, 0);
        toast.success(`Poll deleted! ${formatSOL(refundTotal)} refunded to ${Object.keys(
          { [poll.creator]: 1, ...Object.fromEntries(pollVotes.map(v => [v.voter, 1])) }
        ).length} user(s).`, { id: "delete-poll" });
        return true;
      } catch (e: any) {
        // Rollback optimistic update + remove from deleted tracking
        deletedPollIds.current.delete(pollId);
        setPolls(prevPolls);
        setUsers(prevUsers);
        setVotes(prevVotes);
        console.error("Delete poll failed:", e);
        toast.error(friendlyErrorMessage(e, "Delete"), { id: "delete-poll" });
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

        // Update balance — deduct vote cost
        {
          let newBal: number | undefined;
          if (PROGRAM_DEPLOYED) {
            try { newBal = await getWalletBalance(pubkey); } catch {}
          }
          setUsers(prev => prev.map(u => {
            if (u.wallet !== walletAddress) return u;
            const fresh = withFreshPeriods(u);
            // In demo mode, deduct cost locally; on-chain mode uses fetched balance
            const bal = newBal ?? Math.max(0, fresh.balance - cost);
            return {
              ...fresh,
              balance: bal,
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

            // Sync user balance deduction (use ref for latest state)
            await new Promise(r => setTimeout(r, 50));
            const currentUser = usersRef.current.find(u => u.wallet === walletAddress);
            if (currentUser) {
              await supabase.from("users").update({
                balance: currentUser.balance,
                total_spent_cents: currentUser.totalSpentCents,
                total_votes_cast: currentUser.totalVotesCast,
                total_polls_voted: currentUser.totalPollsVoted,
              }).eq("wallet", walletAddress);
            }
          } catch (e) {
            console.warn("Failed to sync vote to Supabase:", e);
          }
        }

        toast.success(`Voted ${numCoins} coin(s) — ${formatSOL(cost)} SOL sent!`, { id: "cast-vote" });
        addNotification({
          wallet: walletAddress,
          type: "poll_voted",
          title: "Vote Cast",
          message: `You voted ${numCoins} coin(s) on "${poll.options[optionIndex]}" in "${poll.title}"`,
          pollId,
        });
        return true;
      } catch (e: any) {
        // Rollback optimistic update on failure
        setPolls(prevPolls);
        setVotes(prevVotes);
        console.error("Cast vote failed:", e);
        toast.error(friendlyErrorMessage(e, "Vote"), { id: "cast-vote" });
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

      // Save previous state for rollback
      const prevPolls = polls;

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

        // ── Credit creator reward ──
        // The creator gets their creatorRewardCents back on settlement
        if (poll.creatorRewardCents > 0) {
          setUsers(prev => prev.map(u => {
            if (u.wallet !== poll.creator) return u;
            const fresh = withFreshPeriods(u);
            return {
              ...fresh,
              balance: fresh.balance + poll.creatorRewardCents,
              creatorEarningsCents: fresh.creatorEarningsCents + poll.creatorRewardCents,
              totalWinningsCents: fresh.totalWinningsCents + poll.creatorRewardCents,
              weeklyWinningsCents: fresh.weeklyWinningsCents + poll.creatorRewardCents,
              monthlyWinningsCents: fresh.monthlyWinningsCents + poll.creatorRewardCents,
            };
          }));

          // Sync creator's updated balance to Supabase
          if (isSupabaseConfigured) {
            await new Promise(r => setTimeout(r, 50));
            const creatorUser = usersRef.current.find(u => u.wallet === poll.creator);
            if (creatorUser) {
              try {
                await supabase.from("users").update({
                  balance: creatorUser.balance,
                  creator_earnings_cents: creatorUser.creatorEarningsCents,
                  total_winnings_cents: creatorUser.totalWinningsCents,
                }).eq("wallet", poll.creator);
              } catch {}
            }
          }
        }

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

        // Notify users who voted on this poll
        const winnerLabel = finalWinningOption < poll.options.length ? poll.options[finalWinningOption] : "N/A";
        addNotification({
          wallet: walletAddress!,
          type: "poll_settled",
          title: "Poll Settled",
          message: `"${poll.title}" has been settled. Winner: ${winnerLabel}`,
          pollId,
        });

        // Check if current user won and add reward notification
        const userVote = votes.find(v => v.pollId === pollId && v.voter === walletAddress);
        if (userVote && finalWinningOption !== 255 && (userVote.votesPerOption[finalWinningOption] || 0) > 0) {
          addNotification({
            wallet: walletAddress!,
            type: "reward_available",
            title: "You Won!",
            message: `Your side won in "${poll.title}"! Claim your reward now.`,
            pollId,
          });
        }

        return true;
      } catch (e: any) {
        // Rollback optimistic update
        setPolls(prevPolls);
        console.error("Settle poll failed:", e);
        toast.error(friendlyErrorMessage(e, "Settlement"), { id: "settle-poll" });
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

      // Save previous state for rollback
      const prevVotes = votes;
      const prevUsers = users;

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

        // Update balance
        {
          let newBal: number | undefined;
          if (PROGRAM_DEPLOYED) {
            // On-chain mode: fetch real wallet balance
            try {
              newBal = await getWalletBalance(pubkey);
            } catch {
              // Fallback: add reward to current balance
            }
          }
          setUsers(prev => prev.map(u => {
            if (u.wallet !== walletAddress) return u;
            const fresh = withFreshPeriods(u);
            // In demo mode, add reward to existing balance; on-chain mode uses fetched balance
            const bal = newBal ?? (fresh.balance + reward);
            return {
              ...fresh,
              balance: bal,
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
        addNotification({
          wallet: walletAddress,
          type: "reward_claimed",
          title: "Reward Claimed",
          message: `You claimed ${formatSOL(reward)} from "${poll.title}"`,
          pollId,
        });
        return reward;
      } catch (e: any) {
        // Rollback optimistic updates
        setVotes(prevVotes);
        setUsers(prevUsers);
        console.error("Claim reward failed:", e);
        toast.error(friendlyErrorMessage(e, "Claim"), { id: "claim-reward" });
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
