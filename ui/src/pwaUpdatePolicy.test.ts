import { expect, test } from "bun:test";
import { hasActivePlayback, shouldApplyUpdate, shouldReloadOnControllerChange } from "./pwaUpdatePolicy";

test("reads a playing media element as active playback", () => {
  expect(hasActivePlayback([{ paused: true, ended: false }])).toBe(false);
  expect(hasActivePlayback([{ paused: false, ended: true }])).toBe(false);
  expect(hasActivePlayback([{ paused: true, ended: false }, { paused: false, ended: false }])).toBe(true);
  expect(hasActivePlayback([])).toBe(false);
});

test("applies a waiting build only when the reload destroys nothing", () => {
  expect(shouldApplyUpdate({ editing: false, playing: false, waitingWorker: true })).toBe(true);
  expect(shouldApplyUpdate({ editing: false, playing: true, waitingWorker: true })).toBe(false);
  expect(shouldApplyUpdate({ editing: true, playing: false, waitingWorker: true })).toBe(false);
  expect(shouldApplyUpdate({ editing: false, playing: false, waitingWorker: false })).toBe(false);
});

test("ignores the worker that claims a page on a first visit", () => {
  expect(shouldReloadOnControllerChange({ hadController: false, sawNewWorker: false })).toBe(false);
  expect(shouldReloadOnControllerChange({ hadController: true, sawNewWorker: false })).toBe(true);
  expect(shouldReloadOnControllerChange({ hadController: false, sawNewWorker: true })).toBe(true);
});
