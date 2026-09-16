import { expect, test } from "bun:test";
import {
  hasActivePlayback,
  isStaleBuild,
  shouldApplyUpdate,
  shouldReloadOnControllerChange,
  shouldReloadStaleBuild,
  STALE_RELOAD_COOLDOWN_MS,
} from "./pwaUpdatePolicy";

test("reads a playing media element as active playback", () => {
  expect(hasActivePlayback([{ paused: true, ended: false }])).toBe(false);
  expect(hasActivePlayback([{ paused: false, ended: true }])).toBe(false);
  expect(hasActivePlayback([{ paused: true, ended: false }, { paused: false, ended: false }])).toBe(true);
  expect(hasActivePlayback([])).toBe(false);
});

test("applies a waiting build only when the reload destroys nothing", () => {
  const visible = { editing: false, hidden: false, playing: false, waitingWorker: true };
  expect(shouldApplyUpdate(visible)).toBe(true);
  expect(shouldApplyUpdate({ ...visible, playing: true })).toBe(false);
  expect(shouldApplyUpdate({ ...visible, editing: true })).toBe(false);
  expect(shouldApplyUpdate({ ...visible, waitingWorker: false })).toBe(false);
});

test("lets a backgrounded app update even with a field still focused", () => {
  const hidden = { editing: true, hidden: true, playing: false, waitingWorker: true };
  expect(shouldApplyUpdate(hidden)).toBe(true);
  // Background audio is the one thing a hidden page can still be doing.
  expect(shouldApplyUpdate({ ...hidden, playing: true })).toBe(false);
  expect(shouldApplyUpdate({ ...hidden, waitingWorker: false })).toBe(false);
});

test("ignores the worker that claims a page on a first visit", () => {
  expect(shouldReloadOnControllerChange({ hadController: false, sawNewWorker: false })).toBe(false);
  expect(shouldReloadOnControllerChange({ hadController: true, sawNewWorker: false })).toBe(true);
  expect(shouldReloadOnControllerChange({ hadController: false, sawNewWorker: true })).toBe(true);
});

test("reads a page older than its worker as stale", () => {
  expect(isStaleBuild("v1", "v2")).toBe(true);
  expect(isStaleBuild("v1", "v1")).toBe(false);
});

test("never calls a page stale on an answer it cannot read", () => {
  expect(isStaleBuild("v1", undefined)).toBe(false);
  expect(isStaleBuild("v1", null)).toBe(false);
  expect(isStaleBuild("v1", "")).toBe(false);
  expect(isStaleBuild("v1", 2)).toBe(false);
  expect(isStaleBuild("", "v2")).toBe(false);
});

test("spaces out stale reloads so a cached shell cannot spin the app", () => {
  expect(shouldReloadStaleBuild({ lastAttemptAt: null, now: 1_000 })).toBe(true);
  expect(shouldReloadStaleBuild({ lastAttemptAt: 1_000, now: 1_000 })).toBe(false);
  expect(shouldReloadStaleBuild({ lastAttemptAt: 1_000, now: 1_000 + STALE_RELOAD_COOLDOWN_MS - 1 })).toBe(false);
  expect(shouldReloadStaleBuild({ lastAttemptAt: 1_000, now: 1_000 + STALE_RELOAD_COOLDOWN_MS })).toBe(true);
});

test("does not treat an unusable timestamp as a recent attempt", () => {
  expect(shouldReloadStaleBuild({ lastAttemptAt: Number.NaN, now: 1_000 })).toBe(true);
  expect(shouldReloadStaleBuild({ lastAttemptAt: 9_000, now: 1_000 })).toBe(true);
});
