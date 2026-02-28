// Dynamic import — canvas-confetti (~40kB) is only loaded when confetti fires,
// not included in every page's initial bundle.
let _confetti: any = null;

async function getConfetti() {
  if (!_confetti) {
    const mod = await import("canvas-confetti");
    _confetti = mod.default;
  }
  return _confetti!;
}

/**
 * Fire a celebratory confetti burst — used when claiming rewards.
 */
export async function fireConfetti() {
  const confetti = await getConfetti();

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

  confetti({
    particleCount: 40,
    spread: 50,
    origin: { y: 0.7 },
    colors: ["#ffd43b", "#fcc419", "#22c55e"],
    scalar: 0.8,
  });
}

