import { describe, expect, test } from "bun:test";
import { IMMERSIVE_IDLE_MS, isImmersivePointerActivity, shouldHideImmersiveChrome } from "./immersiveChrome";

describe("immersive chrome idle rules", () => {
  test("treats the first pointer sample as activity", () => {
    expect(isImmersivePointerActivity(null, { x: 10, y: 10 })).toBe(true);
  });

  test("ignores sub-pixel pointer jitter", () => {
    expect(isImmersivePointerActivity({ x: 100, y: 100 }, { x: 102, y: 101 })).toBe(false);
  });

  test("wakes on a real pointer move", () => {
    expect(isImmersivePointerActivity({ x: 100, y: 100 }, { x: 104, y: 100 })).toBe(true);
    expect(isImmersivePointerActivity({ x: 100, y: 100 }, { x: 100, y: 140 })).toBe(true);
  });

  test("hides only after the full idle window with the mode active", () => {
    expect(shouldHideImmersiveChrome({ active: true, held: false, idleMs: IMMERSIVE_IDLE_MS })).toBe(true);
    expect(shouldHideImmersiveChrome({ active: true, held: false, idleMs: IMMERSIVE_IDLE_MS - 1 })).toBe(false);
    expect(shouldHideImmersiveChrome({ active: false, held: false, idleMs: IMMERSIVE_IDLE_MS })).toBe(false);
  });

  test("keeps the chrome up while something holds it open", () => {
    expect(shouldHideImmersiveChrome({ active: true, held: true, idleMs: IMMERSIVE_IDLE_MS * 4 })).toBe(false);
  });
});
