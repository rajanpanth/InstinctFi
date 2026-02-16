"use client";

import { useApp } from "./Providers";
import Modal from "./Modal";
import { useLanguage } from "@/lib/languageContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function WalletConnectModal({ isOpen, onClose }: Props) {
  const { connectWallet } = useApp();
  const { t } = useLanguage();

  const handleConnect = async () => {
    await connectWallet();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-surface-100 transition-colors"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="white">
              <path d="M34.9 17.1c-.4 0-.8.3-.8.7-.3 4.3-2.2 8.3-5.3 11.2-3.2 3-7.4 4.6-11.8 4.5-8.9-.1-16-7.5-16-16.5 0-9.1 7.4-16.5 16.5-16.5 4.3 0 8.4 1.7 11.4 4.7.3.3.3.8 0 1l-1.2 1.2c-.3.3-.8.3-1 0-2.5-2.5-5.8-3.9-9.3-3.7-6.6.3-11.8 5.8-12 12.4-.2 6.9 5.5 12.6 12.4 12.6 3.3 0 6.5-1.3 8.8-3.6 2.1-2 3.4-4.5 3.8-7.3.1-.4.4-.7.8-.7h1.6c.5 0 .9.4.8.9-.5 3.8-2.3 7.3-5.1 9.9-3.1 2.9-7.2 4.6-11.5 4.8-9 .2-16.7-7-16.9-15.9C-.1 8.5 8.5.6 17 .6h.2c4.9 0 9.6 2 13 5.5.3.3.3.8 0 1.1l-2.4 2.4c-.3.3-.8.3-1.1 0-2.7-2.9-6.5-4.5-10.5-4.5h-.2C9 5.1 3.1 11.1 3.1 18.4c0 7.5 6.3 13.6 13.8 13.2 3.3-.1 6.4-1.5 8.7-3.7 2-1.9 3.3-4.3 3.8-6.8.1-.4.5-.7.9-.7h4.1c.5 0 .9.4.8.9" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2">{t("connectYourWallet")}</h2>
          <p className="text-gray-400 mb-6">
            {t("walletModalDesc")}
          </p>

          {/* Bonus CTA */}
          <div className="bg-gradient-to-r from-brand-500/10 to-green-500/10 border border-brand-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">🎁</span>
              <span className="text-brand-400 font-bold text-lg">{t("onChainSetup")}</span>
            </div>
            <p className="text-gray-400 text-sm">
              {t("onChainSetupDesc")}
            </p>
          </div>

          {/* Connect button */}
          <button
            onClick={handleConnect}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-500/20 active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 40 40" fill="currentColor">
              <path d="M34.9 17.1c-.4 0-.8.3-.8.7-.3 4.3-2.2 8.3-5.3 11.2-3.2 3-7.4 4.6-11.8 4.5-8.9-.1-16-7.5-16-16.5 0-9.1 7.4-16.5 16.5-16.5 4.3 0 8.4 1.7 11.4 4.7.3.3.3.8 0 1l-1.2 1.2c-.3.3-.8.3-1 0-2.5-2.5-5.8-3.9-9.3-3.7-6.6.3-11.8 5.8-12 12.4-.2 6.9 5.5 12.6 12.4 12.6 3.3 0 6.5-1.3 8.8-3.6 2.1-2 3.4-4.5 3.8-7.3.1-.4.4-.7.8-.7h1.6c.5 0 .9.4.8.9-.5 3.8-2.3 7.3-5.1 9.9-3.1 2.9-7.2 4.6-11.5 4.8-9 .2-16.7-7-16.9-15.9C-.1 8.5 8.5.6 17 .6h.2c4.9 0 9.6 2 13 5.5.3.3.3.8 0 1.1l-2.4 2.4c-.3.3-.8.3-1.1 0-2.7-2.9-6.5-4.5-10.5-4.5h-.2C9 5.1 3.1 11.1 3.1 18.4c0 7.5 6.3 13.6 13.8 13.2 3.3-.1 6.4-1.5 8.7-3.7 2-1.9 3.3-4.3 3.8-6.8.1-.4.5-.7.9-.7h4.1c.5 0 .9.4.8.9" />
            </svg>
            Connect Phantom Wallet
          </button>

          {/* Extra perks */}
          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5 shrink-0">&#10003;</span>
              <span className="text-xs text-gray-400">{t("devnetAirdrop")}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5 shrink-0">&#10003;</span>
              <span className="text-xs text-gray-400">{t("leaderboardRankings")}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5 shrink-0">&#10003;</span>
              <span className="text-xs text-gray-400">{t("createOwnPolls")}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5 shrink-0">&#10003;</span>
              <span className="text-xs text-gray-400">{t("winFromPool")}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
