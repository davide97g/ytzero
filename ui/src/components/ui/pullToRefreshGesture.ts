/** Indicator travel that arms the refresh, and the ceiling it eases toward. */
export const PULL_TRIGGER_DISTANCE = 60;
export const PULL_MAX_DISTANCE = 120;
/** Where the indicator waits while the refresh runs. */
export const PULL_REST_DISTANCE = 56;
/** Finger travel absorbed before a touch counts as a pull. */
export const PULL_START_SLOP = 8;

export type PullPhase = "idle" | "pulling" | "armed" | "refreshing";

/**
 * Damp the finger travel so the indicator starts out tracking the touch and
 * then eases toward `PULL_MAX_DISTANCE`, the resistance native lists use.
 */
export function dampPullDistance(fingerTravel: number): number {
  if (fingerTravel <= 0) return 0;
  return (PULL_MAX_DISTANCE * fingerTravel) / (fingerTravel + PULL_MAX_DISTANCE);
}

export function pullProgress(distance: number): number {
  return Math.min(1, Math.max(0, distance / PULL_TRIGGER_DISTANCE));
}

export function resolvePullPhase(distance: number): Extract<PullPhase, "pulling" | "armed"> {
  return distance >= PULL_TRIGGER_DISTANCE ? "armed" : "pulling";
}

/**
 * A touch only becomes a pull when it is clearly downward — the horizontal
 * shelves (channel avatars, card rows) and the card swipe keep their gestures.
 */
export function isPullGesture(deltaX: number, deltaY: number): boolean {
  return deltaY > PULL_START_SLOP && deltaY > Math.abs(deltaX) * 1.5;
}

/** A touch that has already moved up or sideways can never become a pull. */
export function isAbandonedPull(deltaX: number, deltaY: number): boolean {
  return deltaY < -PULL_START_SLOP || Math.abs(deltaX) > PULL_START_SLOP;
}
