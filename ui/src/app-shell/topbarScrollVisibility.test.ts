import { describe, expect, test } from "bun:test";
import {
  nextTopbarScrollState,
  INITIAL_TOPBAR_SCROLL_STATE,
  TOPBAR_REVEAL_ZONE,
  type TopbarScrollState,
} from "./topbarScrollVisibility";

function scrollThrough(positions: number[], from: TopbarScrollState = INITIAL_TOPBAR_SCROLL_STATE): TopbarScrollState {
  return positions.reduce(nextTopbarScrollState, from);
}

describe("top bar scroll visibility", () => {
  test("stays shown inside the reveal zone at the top of the page", () => {
    expect(scrollThrough([20, 50, TOPBAR_REVEAL_ZONE]).hidden).toBe(false);
  });

  test("retracts once the page is scrolled down past the reveal zone", () => {
    expect(scrollThrough([40, 72, 90, 200]).hidden).toBe(true);
  });

  test("ignores a nudge too small to read as intent", () => {
    expect(scrollThrough([40, 72, 80]).hidden).toBe(false);
  });

  test("returns as soon as the page moves back up", () => {
    const hidden = scrollThrough([40, 72, 90, 600]);
    expect(hidden.hidden).toBe(true);
    expect(nextTopbarScrollState(hidden, 580).hidden).toBe(false);
  });

  test("does not flicker back on a small bounce while scrolling down", () => {
    expect(nextTopbarScrollState(scrollThrough([40, 72, 90, 600]), 597).hidden).toBe(true);
  });

  test("measures upward travel from the deepest point, not the last frame", () => {
    let state = scrollThrough([40, 72, 90, 600]);
    for (const position of [610, 620, 630]) state = nextTopbarScrollState(state, position);
    expect(nextTopbarScrollState(state, 626).hidden).toBe(true);
    expect(nextTopbarScrollState(state, 620).hidden).toBe(false);
  });

  test("comes back when the page returns to the top", () => {
    expect(nextTopbarScrollState(scrollThrough([40, 72, 90, 600]), 0).hidden).toBe(false);
  });

  test("treats overscroll above the document top as the top", () => {
    expect(nextTopbarScrollState(scrollThrough([40, 72, 90, 600]), -30)).toEqual({ hidden: false, anchor: 0 });
  });
});
