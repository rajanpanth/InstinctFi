"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

/**
 * PWA Install Prompt — shows a banner encouraging users to install the app.
 * Only displays on first visit, and can be dismissed.
 */
export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Don't show if already dismissed
        if (typeof window === "undefined") return;
        if (localStorage.getItem("instinctfi_install_dismissed")) return;
        // Don't show if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) return;
        // Only show on mobile devices
        const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show after a 3-second delay so it doesn't feel aggressive
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem("instinctfi_install_dismissed", "1");
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slideUp">
            <div className="bg-surface-100/95 backdrop-blur-xl border border-brand-500/20 rounded-2xl p-4 shadow-2xl shadow-brand-500/10">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shrink-0">
                        <Download size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-200 mb-0.5">Install InstinctFi</h3>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                            Add to your home screen for faster access and offline support.
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="shrink-0 p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                        Not now
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-xs font-semibold text-white transition-colors"
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
}
