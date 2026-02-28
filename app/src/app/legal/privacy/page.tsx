"use client";

export default function PrivacyPage() {
    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent pb-1">
                Privacy Policy
            </h1>

            <div className="space-y-6 text-neutral-300 text-sm leading-relaxed">
                <p className="text-neutral-400 text-xs">Last updated: February 27, 2026</p>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">1. Overview</h2>
                    <p>
                        InstinctFi (&quot;the Platform&quot;) is committed to protecting your privacy.
                        This Privacy Policy explains what information we collect, how we use it,
                        and your rights regarding your data.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">2. Information We Collect</h2>
                    <p>We collect minimal information to operate the Platform:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-400">
                        <li><strong className="text-neutral-300">Wallet Address</strong> — Your public Solana wallet address, used as your account identifier</li>
                        <li><strong className="text-neutral-300">On-chain Activity</strong> — Poll creation, votes, and claims made through the Platform</li>
                        <li><strong className="text-neutral-300">Display Name &amp; Avatar</strong> — Optional profile information you choose to provide</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">3. Information We Do NOT Collect</h2>
                    <ul className="list-disc list-inside space-y-1 text-neutral-400">
                        <li>Private keys or seed phrases</li>
                        <li>Personal identity information (name, email, phone)</li>
                        <li>Location data or IP addresses for tracking purposes</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">4. How We Use Your Information</h2>
                    <ul className="list-disc list-inside space-y-1 text-neutral-400">
                        <li>To operate and maintain the Platform</li>
                        <li>To display leaderboards and user statistics</li>
                        <li>To process votes, rewards, and poll settlements</li>
                        <li>To prevent fraud and abuse</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">5. Data Storage</h2>
                    <p>
                        Platform data is stored in a Supabase database and on the Solana blockchain.
                        Blockchain data is inherently public and immutable. Off-chain data is secured
                        using industry-standard practices including row-level security and encrypted connections.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">6. Third-Party Services</h2>
                    <p>
                        The Platform integrates with third-party wallet providers (e.g., Phantom, Solflare).
                        These services have their own privacy policies, and we encourage you to review them.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">7. Data Retention</h2>
                    <p>
                        Off-chain data is retained as long as your account is active.
                        On-chain data persists permanently on the Solana blockchain and cannot be deleted.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">8. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-400">
                        <li>Access the data associated with your wallet address</li>
                        <li>Update or remove your optional profile information</li>
                        <li>Disconnect your wallet at any time</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">9. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. Any changes will be reflected
                        on this page with an updated revision date.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">10. Contact</h2>
                    <p>
                        For privacy-related questions or concerns, please reach out via the Platform&apos;s community channels.
                    </p>
                </section>
            </div>
        </div>
    );
}
