"use client";

/**
 * Ambient aurora / mesh-gradient background.
 * Pure CSS — no JS animation loop, no canvas, zero runtime cost.
 * Three soft blobs slowly drift and morph using CSS keyframes.
 * Respects prefers-reduced-motion by pausing animations.
 */
export default function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
    </div>
  );
}
