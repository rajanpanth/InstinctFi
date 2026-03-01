// Dynamic import — canvas-confetti (~40kB) is only loaded when confetti fires,
// not included in every page's initial bundle.
// BUG-18 FIX: Cache the Promise (not the result) to prevent race conditions
// when multiple concurrent calls trigger parallel dynamic imports.
let _confettiPromise: Promise<any> | null = null;

async function getConfetti() {
  if (!_confettiPromise) {
    _confettiPromise = import("canvas-confetti")
      .then(mod => mod.default)
      .catch(err => {
        // Reset cache so next call retries
        _confettiPromise = null;
        console.warn("Failed to load canvas-confetti:", err);
        return null;
      });
  }
  return _confettiPromise;
}

/**
 * Fire a celebratory confetti burst — used when claiming rewards.
 */
export async function fireConfetti() {
  const confetti = await getConfetti();
  if (!confetti) return;

  // First burst from center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#ffd43b", "#fcc419", "#fab005", "#5c7cfa", "#4c6ef5", "#22c55e"],
  });

  // Delayed side bursts for dramatic effect
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: ["#ffd43b", "#22c55e", "#5c7cfa"],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: ["#ffd43b", "#22c55e", "#5c7cfa"],
    });
  }, 150);
}

/**
 * Quick confetti for smaller wins (e.g., daily claim).
 */
export async function fireSmallConfetti() {
  const confetti = await getConfetti();
  if (!confetti) return;

  confetti({
    particleCount: 40,
    spread: 50,
    origin: { y: 0.7 },
    colors: ["#ffd43b", "#fcc419", "#22c55e"],
    scalar: 0.8,
  });
}

