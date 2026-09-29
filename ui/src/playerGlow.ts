/** Longest edge of the sampling canvas. The glow is blurred by tens of pixels,
 * so a few dozen samples per edge carry every colour it can show while the
 * per-frame copy stays negligible. */
export const GLOW_SAMPLE_EDGE = 64;

/** Minimum gap between samples. The eye reads the glow as live well below the
 * video frame rate, and every sample re-blurs a large layer. */
export const GLOW_SAMPLE_INTERVAL_MS = 66;

/** Share of each new sample blended over the previous one, so a cut eases the
 * glow across instead of flashing the whole backdrop. */
export const GLOW_BLEND = 0.35;

/** Canvas size that keeps the video's aspect ratio, or null before the video
 * has reported its dimensions. */
export function glowCanvasSize(videoWidth: number, videoHeight: number, edge = GLOW_SAMPLE_EDGE): { width: number; height: number } | null {
  if (!(videoWidth > 0) || !(videoHeight > 0)) return null;
  if (videoWidth >= videoHeight) {
    return { width: edge, height: Math.max(1, Math.round((edge * videoHeight) / videoWidth)) };
  }
  return { width: Math.max(1, Math.round((edge * videoWidth) / videoHeight)), height: edge };
}
