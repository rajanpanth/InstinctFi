"use client";

import Link from "next/link";
import {
    BookOpen,
    Wallet,
    Vote,
    TrendingUp,
    Gift,
    Shield,
    HelpCircle,
    ExternalLink,
} from "lucide-react";

const sections = [
    {
        icon: <Wallet size={20} />,
        title: "Getting Started",
        items: [
            "Connect your Solana wallet (Phantom, Solflare, or any compatible wallet)",
            "You'll receive a 5 SOL signup bonus to start predicting",
            "Claim daily rewards of 2 SOL every 24 hours",
        ],
    },
    {
        icon: <Vote size={20} />,
        title: "Creating Polls",
        items: [
            "Click \"Create Poll\" and fill in a title, description, and options",
            "Set a unit price per coin and an end time for the poll",
            "Provide an initial investment — this seeds the reward pool",
            "Your investment is refunded if you delete the poll before any votes",
        ],
    },
    {
        icon: <TrendingUp size={20} />,
        title: "Voting",
        items: [
            "Browse active polls and vote on the outcome you predict",
            "Purchase coins (1–1000 per transaction) on your chosen option",
            "You can vote on multiple options in the same poll",
            "You cannot vote on polls you created",
        ],
    },
    {
        icon: <Gift size={20} />,
        title: "Rewards & Settlement",
        items: [
            "Polls settle after the end time — the option with the most votes wins",
            "Winners share the total pool proportional to their coins on the winning option",
            "Poll creators earn a reward fee upon settlement",
            "Claim your reward from the Portfolio page after settlement",
        ],
    },
    {
        icon: <Shield size={20} />,
        title: "Security",
        items: [
            "All transactions are executed through server-verified RPC calls",
            "Wallet signatures authenticate your identity — no passwords needed",
            "Smart contracts on Solana enforce on-chain rules atomically",
            "Your private keys never leave your wallet",
        ],
    },
    {
        icon: <HelpCircle size={20} />,
        title: "FAQ",
        items: [
            "Q: Is this real money? — A: The platform uses simulated balances for demonstration",
            "Q: Can I delete my poll? — A: Yes, if it has no votes (admins can force-delete)",
            "Q: What happens if no one votes? — A: The poll settles with no winner and the creator is refunded",
            "Q: How is the winner decided? — A: The option with the most coins wins",
        ],
    },
];

export default function DocsPage() {
    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <div className="flex items-center gap-3 mb-8">
                <BookOpen size={28} className="text-brand-400" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent pb-1">
                    Documentation
                </h1>
            </div>

            <p className="text-neutral-400 text-sm mb-8">
                Everything you need to know about using InstinctFi — the decentralized prediction market on Solana.
            </p>

            <div className="space-y-6">
                {sections.map((section) => (
                    <div
                        key={section.title}
                        className="p-5 bg-surface-100 border border-border rounded-xl"
                    >
                        <div className="flex items-center gap-2 mb-3 text-brand-400">
                            {section.icon}
                            <h2 className="text-lg font-semibold text-neutral-100">{section.title}</h2>
                        </div>
                        <ul className="space-y-2 text-sm text-neutral-300">
                            {section.items.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-brand-500 mt-1 shrink-0">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-10 p-4 bg-surface-100 border border-border rounded-xl text-center">
                <p className="text-sm text-neutral-400">
                    Need more help? Check the{" "}
                    <Link href="/legal/terms" className="text-brand-400 hover:text-brand-300 transition-colors">
                        Terms of Service
                    </Link>{" "}
                    or{" "}
                    <Link href="/legal/privacy" className="text-brand-400 hover:text-brand-300 transition-colors">
                        Privacy Policy
                    </Link>.
                </p>
            </div>
        </div>
    );
}
