"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, MessageCircle, Award, TrendingUp, Settings } from "lucide-react";

export interface NotificationPreferences {
    pollSettled: boolean;
    rewardAvailable: boolean;
    pollVoted: boolean;
    comments: boolean;
    pushEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
    pollSettled: true,
    rewardAvailable: true,
    pollVoted: true,
    comments: false,
    pushEnabled: false,
};

const PREFS_KEY = "instinctfi_notification_prefs";

export function useNotificationPreferences() {
    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(PREFS_KEY);
            if (saved) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
        } catch { }
    }, []);

    const updatePref = (key: keyof NotificationPreferences, value: boolean) => {
        const updated = { ...prefs, [key]: value };
        setPrefs(updated);
        localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    };

    return { prefs, updatePref };
}

/**
 * NotificationPreferences — panel for managing notification settings.
 * Renders inline within the profile or settings page.
 */
export function NotificationPreferencesPanel({ onClose }: { onClose?: () => void }) {
    const { prefs, updatePref } = useNotificationPreferences();

    const items: { key: keyof NotificationPreferences; icon: React.ReactNode; label: string; desc: string }[] = [
        {
            key: "pollSettled",
            icon: <TrendingUp size={16} />,
            label: "Poll Settlements",
            desc: "When a poll you voted on is settled",
        },
        {
            key: "rewardAvailable",
            icon: <Award size={16} />,
            label: "Rewards Available",
            desc: "When you have unclaimed rewards",
        },
        {
            key: "pollVoted",
            icon: <Bell size={16} />,
            label: "Vote Confirmations",
            desc: "When your vote is confirmed",
        },
        {
            key: "comments",
            icon: <MessageCircle size={16} />,
            label: "Comments",
            desc: "When someone comments on your poll",
        },
    ];

    return (
        <div className="bg-surface-100 border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Settings size={16} className="text-brand-400" />
                    <h3 className="text-sm font-semibold text-neutral-200">Notification Preferences</h3>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                        Close
                    </button>
                )}
            </div>

            <div className="divide-y divide-border">
                {/* Push notifications master toggle */}
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        {prefs.pushEnabled ? (
                            <Bell size={16} className="text-brand-400" />
                        ) : (
                            <BellOff size={16} className="text-neutral-500" />
                        )}
                        <div>
                            <p className="text-sm font-medium text-neutral-200">Push Notifications</p>
                            <p className="text-xs text-neutral-500">Receive browser push notifications</p>
                        </div>
                    </div>
                    <Toggle
                        checked={prefs.pushEnabled}
                        onChange={(v) => updatePref("pushEnabled", v)}
                    />
                </div>

                {/* Individual notification types */}
                {items.map(({ key, icon, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <span className="text-neutral-400">{icon}</span>
                            <div>
                                <p className="text-sm font-medium text-neutral-200">{label}</p>
                                <p className="text-xs text-neutral-500">{desc}</p>
                            </div>
                        </div>
                        <Toggle
                            checked={prefs[key]}
                            onChange={(v) => updatePref(key, v)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${checked ? "bg-brand-500" : "bg-neutral-700"
                }`}
            style={{ minWidth: 40, height: 22 }}
            aria-checked={checked}
            role="switch"
        >
            <div
                className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[20px]" : "translate-x-[2px]"
                    }`}
            />
        </button>
    );
}

export default NotificationPreferencesPanel;
