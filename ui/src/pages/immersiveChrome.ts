/** How long the viewer has to hold still before immersive mode clears its chrome. */
export const IMMERSIVE_IDLE_MS = 3000;

/** Trackpad drift and scroll-synthesised pointer events repeat almost the same
 *  coordinates. Counting those as activity would keep the chrome up forever. */
const POINTER_JITTER_PX = 3;

export type PointerPoint = { x: number; y: number };

export function isImmersivePointerActivity(previous: PointerPoint | null, next: PointerPoint): boolean {
  if (!previous) return true;
  return Math.abs(next.x - previous.x) >= POINTER_JITTER_PX || Math.abs(next.y - previous.y) >= POINTER_JITTER_PX;
}

/** The chrome fades only while the mode is on, nothing holds it open (hover or
 *  focus on the chrome itself) and the viewer stayed still for the full window. */
export function shouldHideImmersiveChrome(input: { active: boolean; held: boolean; idleMs: number }): boolean {
  return input.active && !input.held && input.idleMs >= IMMERSIVE_IDLE_MS;
}
