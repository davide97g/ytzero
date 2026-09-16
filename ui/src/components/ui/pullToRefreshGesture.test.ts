import { describe, expect, test } from "bun:test";
import {
  dampPullDistance,
  isAbandonedPull,
  isPullGesture,
  pullProgress,
  resolvePullPhase,
  PULL_MAX_DISTANCE,
  PULL_TRIGGER_DISTANCE,
} from "./pullToRefreshGesture";

describe("pull to refresh damping", () => {
  test("stays still until the finger moves", () => {
    expect(dampPullDistance(0)).toBe(0);
    expect(dampPullDistance(-40)).toBe(0);
  });

  test("tracks the finger closely at the start of the pull", () => {
    expect(dampPullDistance(10)).toBeGreaterThan(9);
    expect(dampPullDistance(10)).toBeLessThan(10);
  });

  test("arms after a deliberate drag rather than a flick", () => {
    expect(dampPullDistance(60)).toBeLessThan(PULL_TRIGGER_DISTANCE);
    expect(dampPullDistance(120)).toBeGreaterThanOrEqual(PULL_TRIGGER_DISTANCE);
  });

  test("never exceeds the ceiling, however far the finger travels", () => {
    expect(dampPullDistance(4000)).toBeLessThan(PULL_MAX_DISTANCE);
    expect(dampPullDistance(4000)).toBeGreaterThan(PULL_MAX_DISTANCE * 0.95);
  });
});

describe("pull to refresh phases", () => {
  test("reports progress toward the trigger, clamped at both ends", () => {
    expect(pullProgress(0)).toBe(0);
    expect(pullProgress(PULL_TRIGGER_DISTANCE / 2)).toBeCloseTo(0.5);
    expect(pullProgress(PULL_MAX_DISTANCE)).toBe(1);
  });

  test("arms exactly at the trigger distance", () => {
    expect(resolvePullPhase(PULL_TRIGGER_DISTANCE - 1)).toBe("pulling");
    expect(resolvePullPhase(PULL_TRIGGER_DISTANCE)).toBe("armed");
  });
});

describe("pull to refresh gesture ownership", () => {
  test("claims a downward drag", () => {
    expect(isPullGesture(2, 40)).toBe(true);
  });

  test("leaves horizontal swipes to the rows underneath", () => {
    expect(isPullGesture(60, 20)).toBe(false);
    expect(isPullGesture(-60, 20)).toBe(false);
  });

  test("ignores travel inside the start slop", () => {
    expect(isPullGesture(0, 6)).toBe(false);
  });

  test("abandons a touch that goes up or sideways first", () => {
    expect(isAbandonedPull(0, -20)).toBe(true);
    expect(isAbandonedPull(24, 4)).toBe(true);
    expect(isAbandonedPull(2, 4)).toBe(false);
  });
});
