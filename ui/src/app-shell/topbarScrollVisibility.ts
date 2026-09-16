import { useEffect, useState } from "react";

/** Near the top of a page the bar is always shown, whichever way the page moved. */
export const TOPBAR_REVEAL_ZONE = 72;
/** Travel that has to accumulate in one direction before the bar reacts. */
export const TOPBAR_HIDE_INTENT = 14;
export const TOPBAR_SHOW_INTENT = 8;

export type TopbarScrollState = { hidden: boolean; anchor: number };

export const INITIAL_TOPBAR_SCROLL_STATE: TopbarScrollState = { hidden: false, anchor: 0 };

/**
 * Decide whether the top bar retracts, measuring travel from the turning point
 * rather than the previous frame so a slow drag still reads as one direction.
 */
export function nextTopbarScrollState(state: TopbarScrollState, scrollY: number): TopbarScrollState {
  const position = Math.max(0, scrollY);
  if (position <= TOPBAR_REVEAL_ZONE) return { hidden: false, anchor: position };

  const travel = position - state.anchor;
  if (state.hidden) {
    if (travel <= -TOPBAR_SHOW_INTENT) return { hidden: false, anchor: position };
    return travel > 0 ? { hidden: true, anchor: position } : state;
  }
  if (travel >= TOPBAR_HIDE_INTENT) return { hidden: true, anchor: position };
  return travel < 0 ? { hidden: false, anchor: position } : state;
}

/** Tracks the window scroller and reports whether the top bar should retract. */
export function useTopbarScrollHidden(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let state = { ...INITIAL_TOPBAR_SCROLL_STATE, anchor: Math.max(0, window.scrollY) };
    let frame = 0;

    const measure = () => {
      frame = 0;
      state = nextTopbarScrollState(state, window.scrollY);
      setHidden(state.hidden);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}
