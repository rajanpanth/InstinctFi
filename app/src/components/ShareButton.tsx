"use client";

import { useState } from "react";
import { copyToClipboard, getPollShareUrl, getTwitterShareUrl } from "@/lib/utils";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/languageContext";

type Props = {
  pollId: string;
  pollTitle: string;
  /** Compact mode for PollCard, expanded for detail page */
  compact?: boolean;
};

export default function ShareButton({ pollId, pollTitle, compact = false }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useLanguage();

  const handleCopyLink = async () => {
    const url = getPollShareUrl(pollId);
    const ok = await copyToClipboard(url);
    if (ok) toast.success(t("linkCopied"));
    else toast.error(t("failedToCopy"));
    setShowMenu(false);
  };

  const handleTwitter = () => {
    window.open(getTwitterShareUrl(pollTitle, pollId), "_blank", "noopener,noreferrer");
    setShowMenu(false);
  };

  const handleCopyEmbed = async () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const embedCode = `<iframe src="${baseUrl}/embed/${pollId}" width="420" height="340" frameborder="0" style="border-radius:16px;overflow:hidden;" title="${pollTitle}"></iframe>`;
    const ok = await copyToClipboard(embedCode);
    if (ok) toast.success(t("embedCopied"));
    else toast.error(t("failedToCopy"));
    setShowMenu(false);
  };

  if (compact) {
    return (
      <button
        onClick={handleCopyLink}
        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-dark-600 transition-all shrink-0"
        title={t("sharePoll")}
        aria-label={t("sharePoll")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-surface-100 hover:bg-dark-600 border border-border rounded-xl text-sm font-medium text-gray-300 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {t("share")}
      </button>

      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-surface-50 border border-border rounded-xl shadow-xl overflow-hidden min-w-[180px] animate-scaleIn">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-surface-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {t("copyLink")}
            </button>
            <button
              onClick={handleTwitter}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-surface-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {t("shareOnX")}
            </button>
            <button
              onClick={handleCopyEmbed}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-surface-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              {t("copyEmbedCode")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
