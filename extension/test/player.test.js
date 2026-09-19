import { describe, expect, test } from "bun:test";
import { createHarness, loadScript, resetEnhance } from "./fakeDom.js";

const CONTEXT = {
  version: 1,
  active: true,
  video: { id: "dQw4w9WgXcQ", title: "T", channelId: "c", channelTitle: "C", duration: 100, contentType: "default" },
  playback: { rate: 1, keyboardSeekSeconds: 5, frameStepFps: 30, transportLocked: false },
};

function fakeVideo(overrides = {}) {
  return {
    paused: true,
    ended: false,
    currentTime: 10,
    duration: 100,
    volume: 1,
    muted: false,
    playbackRate: 1,
    videoWidth: 1280,
    videoHeight: 720,
    seekable: { length: 1, start: () => 0, end: () => 100 },
    calls: [],
    play() { this.paused = false; this.calls.push("play"); return Promise.resolve(); },
    pause() { this.paused = true; this.calls.push("pause"); },
    addEventListener() {},
    requestPictureInPicture() { this.calls.push("pip"); return Promise.resolve(); },
    requestFullscreen() { this.calls.push("fullscreen"); return Promise.resolve(); },
    ...overrides,
  };
}

function start(video = fakeVideo(), context = CONTEXT) {
  resetEnhance();
  const harness = createHarness();
  harness.selectors.video = video;
  harness.selectors[".ytp-subtitles-button"] = null;
  for (const file of ["contract.js", "matcher.js", "controller.js", "bridge.js", "player.js"]) {
    loadScript(`../src/enhance/${file}`);
  }
  if (context) {
    harness.deliver({
      type: "ytzero:enhance:relay",
      to: "frame",
      payload: { kind: "context", context: globalThis.YTZEnhance.contract.parseContext(context) },
    });
  }
  return { harness, video };
}

function command(harness, message) {
  harness.deliver({ type: "ytzero:enhance:relay", to: "frame", payload: { kind: "command", ...message } });
  return harness.relayed("top").filter((payload) => payload.type === "command-result").at(-1).payload;
}

function keydown(code, modifiers = {}) {
  globalThis.document.dispatchEvent({
    type: "keydown",
    code,
    key: code,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...modifiers,
    composedPath: () => [],
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {},
  });
}

describe("attachment", () => {
  test("announces the frame and publishes a ready state", () => {
    const { harness } = start();
    expect(harness.relayed("top").some((payload) => payload.kind === "frame-ready")).toBe(true);
    const ready = harness.relayed("top").find((payload) => payload.type === "ready");
    expect(ready.payload.state).toMatchObject({ paused: true, currentTime: 10, duration: 100 });
  });
});

describe("commands", () => {
  test("transport commands work and report the resulting value", () => {
    const { harness, video } = start();
    expect(command(harness, { requestId: "1", command: "play" }).ok).toBe(true);
    expect(video.paused).toBe(false);
    expect(command(harness, { requestId: "2", command: "seek-to", payload: { seconds: 42 } }))
      .toMatchObject({ ok: true, currentTime: 42 });
    expect(command(harness, { requestId: "3", command: "set-volume", payload: { volume: 0.25 } }))
      .toMatchObject({ ok: true, volume: 0.25 });
  });

  test("an unsupported command fails with an explanation", () => {
    const { harness } = start();
    expect(command(harness, { requestId: "1", command: "launch-rocket" }))
      .toMatchObject({ ok: false, error: "Unsupported command: launch-rocket" });
  });

  test("a livestream refuses a playback-rate change instead of reporting success", () => {
    const { harness, video } = start(fakeVideo(), { ...CONTEXT, video: { ...CONTEXT.video, contentType: "livestream" } });
    const result = command(harness, { requestId: "1", command: "set-playback-rate", payload: { rate: 2 } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("livestream");
    expect(video.playbackRate).toBe(1);
  });

  test("a livestream without a DVR window refuses to seek", () => {
    const video = fakeVideo({ duration: Number.POSITIVE_INFINITY, seekable: { length: 0, start: () => 0, end: () => 0 } });
    const { harness } = start(video, { ...CONTEXT, video: { ...CONTEXT.video, contentType: "livestream" } });
    expect(command(harness, { requestId: "1", command: "seek-to", payload: { seconds: 5 } }))
      .toMatchObject({ ok: false, error: "This stream is not seekable" });
    expect(video.currentTime).toBe(10);
  });

  test("a locked transport refuses playback commands but still answers", () => {
    const { harness, video } = start(fakeVideo(), { ...CONTEXT, playback: { ...CONTEXT.playback, transportLocked: true } });
    expect(command(harness, { requestId: "1", command: "play" }).ok).toBe(false);
    expect(video.calls).toEqual([]);
    expect(command(harness, { requestId: "2", command: "toggle-muted" })).toMatchObject({ ok: true, muted: true });
  });

  test("set-playback-rate clamps and keeps the shortcut-owned rate in step", () => {
    const { harness, video } = start();
    expect(command(harness, { requestId: "1", command: "set-playback-rate", payload: { rate: 9 } }))
      .toMatchObject({ ok: true, playbackRate: 2 });
    expect(video.playbackRate).toBe(2);
    keydown("Comma", { shiftKey: true });
    const shortcut = harness.relayed("top").filter((payload) => payload.type === "shortcut").at(-1);
    expect(shortcut.payload.value).toBe(1.75);
  });

  test("request-state returns the current state", () => {
    const { harness } = start();
    expect(command(harness, { requestId: "1", command: "request-state" }).state).toMatchObject({ currentTime: 10 });
  });
});

describe("shortcuts inside the frame", () => {
  test("a configured key toggles playback and reports the camelCase action", () => {
    const { harness, video } = start();
    keydown("KeyK");
    expect(video.paused).toBe(false);
    const shortcut = harness.relayed("top").filter((payload) => payload.type === "shortcut").at(-1);
    expect(shortcut.payload).toMatchObject({ action: "togglePlay", code: "KeyK", repeat: false });
  });

  test("a parent-owned key is reported without touching the player", () => {
    const { harness, video } = start();
    keydown("KeyT");
    expect(video.calls).toEqual([]);
    expect(harness.relayed("top").filter((payload) => payload.type === "shortcut").at(-1).payload.action).toBe("toggleTheater");
  });

  test("captions with no native button become a parent request", () => {
    const { harness } = start();
    keydown("KeyC");
    expect(harness.relayed("top").some((payload) => payload.type === "captions-toggle-request")).toBe(true);
  });
});
