"use client";

import React, { type ReactNode } from "react";
import { Providers } from "@/components/Providers";
import WalletAdapterProvider from "@/components/WalletAdapterProvider";
import { WalletErrorBoundary } from "@/components/WalletErrorBoundary";
import { UserProfileProvider } from "@/lib/userProfiles";
import { NotificationProvider } from "@/lib/notifications";
import { BookmarkProvider } from "@/lib/bookmarks";
import { ReferralGate } from "@/lib/referrals";
import { LanguageProvider } from "@/lib/languageContext";

/**
 * Composes all context providers into a single wrapper.
 * Order matters: outermost → innermost.
 */
export default function AppProviders({ children }: { children: ReactNode }) {
    return (
        <LanguageProvider>
            <WalletErrorBoundary>
                <WalletAdapterProvider>
                    <UserProfileProvider>
                        <NotificationProvider>
                            <BookmarkProvider>
                                <ReferralGate>
                                    <Providers>
                                        {children}
                                    </Providers>
                                </ReferralGate>
                            </BookmarkProvider>
                        </NotificationProvider>
                    </UserProfileProvider>
                </WalletAdapterProvider>
            </WalletErrorBoundary>
        </LanguageProvider>
    );
}
