"use client";

export default function TermsPage() {
    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent pb-1">
                Terms of Service
            </h1>

            <div className="space-y-6 text-neutral-300 text-sm leading-relaxed">
                <p className="text-neutral-400 text-xs">Last updated: February 27, 2026</p>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using InstinctFi (&quot;the Platform&quot;), you agree to be bound by these Terms of Service.
                        If you do not agree, please do not use the Platform.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">2. Description of Service</h2>
                    <p>
                        InstinctFi is a decentralized prediction market platform built on the Solana blockchain.
                        Users can create polls, vote on outcomes, and earn rewards based on correct predictions.
                        The Platform operates using simulated currency for demonstration purposes.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">3. Eligibility</h2>
                    <p>
                        You must be at least 18 years old and legally able to enter into these Terms.
                        By using the Platform, you represent and warrant that you meet these requirements.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">4. Wallet &amp; Account</h2>
                    <p>
                        You are responsible for maintaining the security of your wallet and private keys.
                        InstinctFi does not store your private keys or have the ability to recover lost wallets.
                        You are solely responsible for all activity that occurs under your wallet address.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">5. User Conduct</h2>
                    <p>You agree not to:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-400">
                        <li>Manipulate polls or voting outcomes through fraudulent means</li>
                        <li>Create misleading or harmful poll content</li>
                        <li>Attempt to exploit bugs or vulnerabilities in the Platform</li>
                        <li>Use bots or automated systems to gain unfair advantages</li>
                        <li>Violate any applicable laws or regulations</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">6. Intellectual Property</h2>
                    <p>
                        All content, features, and functionality of the Platform are owned by InstinctFi
                        and are protected by applicable intellectual property laws.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">7. Disclaimer of Warranties</h2>
                    <p>
                        The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
                        either express or implied. We do not guarantee continuous, uninterrupted access to the Platform.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">8. Limitation of Liability</h2>
                    <p>
                        In no event shall InstinctFi be liable for any indirect, incidental, special, or consequential
                        damages arising out of or in connection with your use of the Platform.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">9. Changes to Terms</h2>
                    <p>
                        We reserve the right to modify these Terms at any time. Continued use of the Platform
                        after changes constitutes acceptance of the updated Terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-100 mb-2">10. Contact</h2>
                    <p>
                        If you have any questions about these Terms, please reach out via the Platform&apos;s community channels.
                    </p>
                </section>
            </div>
        </div>
    );
}
