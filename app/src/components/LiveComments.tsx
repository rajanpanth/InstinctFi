"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type Comment = {
  id: string;
  username: string;
  avatar: string;
  message: string;
};

const MOCK_COMMENTS = [
  { username: "biglebo", message: "why did i sell ethan hawke man", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=biglebo" },
  { username: "negativePNL", message: "Leo will win. Timothee's campaign is weak.", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=negativePNL" },
  { username: "whale_watcher", message: "huge volume spike just now \ud83d\udc40", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=whale" },
  { username: "solana_degen", message: "this market is free money", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=sol" },
  { username: "crystalball", message: "don't underestimate the momentum", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=crystal" },
];

export default function LiveComments({ pollId }: { pollId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // Reset comments on new pollId
    setComments([]);

    let count = 0;
    const interval = setInterval(() => {
      const mockC = MOCK_COMMENTS[count % MOCK_COMMENTS.length];
      const newComment = { ...mockC, id: `${pollId}-${Date.now()}-${count}` };
      
      setComments((prev) => {
        const next = [newComment, ...prev];
        return next.slice(0, 3); // keep only latest 3
      });
      count++;
    }, 3500);

    return () => clearInterval(interval);
  }, [pollId]);

  return (
    <div className="h-[80px] w-full mt-4 border-t border-white/5 pt-3 overflow-hidden relative">
      <AnimatePresence>
        {comments.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2 mb-2 text-sm text-neutral-400"
          >
            <div className="h-5 w-5 rounded-full overflow-hidden shrink-0 mt-0.5 border border-white/10 bg-[#121d2a]">
              <Image src={c.avatar} alt={c.username} width={20} height={20} className="object-cover" unoptimized />
            </div>
            <p className="leading-snug">
              <span className="text-neutral-300 font-medium mr-1.5">{c.username}:</span>
              {c.message}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
