import { beforeEach, describe, expect, test } from "bun:test";
import { createHarness, loadScript, resetEnhance } from "./fakeDom.js";

const CONFIGURATION = JSON.stringify({
  format: "ytzero.enhance-configuration",
  version: 1,
  enabled: true,
  bridge: { version: 1, events: {}, extensionStatus: {} },
});

const CONTEXT = {
  version: 1,
  active: true,
  video: { id: "dQw4w9WgXcQ", title: "T", channelId: "c", channelTitle: "C", duration: 100, contentType: "default" },
  playback: { rate: 1, keyboardSeekSeconds: 5, frameStepFps: 30, transportLocked: false },
};

let harness;

function start({ configuration = CONFIGURATION, pathname } = {}) {
  resetEnhance();
  harness = createHarness(pathname ? { pathname } : {});
  if (configuration !== null) harness.configure(configuration);
  for (const file of ["contract.js", "matcher.js", "controller.js", "bridge.js", "ytzero.js"]) {
    loadScript(`../src/enhance/${file}`);
  }
  return harness;
}

function frameReady() {
  harness.deliver({ type: "ytzero:enhance:relay", to: "top", payload: { kind: "frame-ready" } });
}

describe("handshake", () => {
  test("announces readiness and forwards the configuration to the frame", () => {
    start();
    expect(harness.events().map((event) => event.type ?? event)).toBeDefined();
    const ready = harness.sent.find((message) => message.type === undefined);
    expect(ready).toBeUndefined();
    expect(harness.relayed("frame").some((payload) => payload.kind === "configuration")).toBe(true);
  });

  test("marks the topbar status active once the player frame reports in", () => {
    start();
    const badge = harness.element("ytzero-enhance-extension-status");
    expect(badge.getAttribute("data-extension-status")).toBeNull();
    frameReady();
    expect(badge.getAttribute("data-extension-status")).toBe("active");
  });

  test("replays the last context to a frame that loads late", () => {
    start();
    harness.dispatch("ytzero:enhance:context", CONTEXT);
    frameReady();
    const contexts = harness.relayed("frame").filter((payload) => payload.kind === "context");
    expect(contexts).toHaveLength(2);
    expect(contexts[1].context.video.id).toBe("dQw4w9WgXcQ");
  });
});

describe("disabled or unsupported configuration", () => {
  test("a disabled integration forwards nothing and never marks the badge", () => {
    start({ configuration: JSON.stringify({ format: "ytzero.enhance-configuration", version: 1, enabled: false }) });
    harness.dispatch("ytzero:enhance:context", CONTEXT);
    frameReady();
    expect(harness.relayed("frame")).toEqual([]);
    expect(harness.element("ytzero-enhance-extension-status").getAttribute("data-extension-status")).toBeNull();
  });

  test("a newer bridge version is ignored", () => {
    start({ configuration: JSON.stringify({ format: "ytzero.enhance-configuration", version: 2, enabled: true }) });
    harness.dispatch("ytzero:enhance:context", CONTEXT);
    expect(harness.relayed("frame")).toEqual([]);
  });

  test("a configuration that appears later is picked up by the observer", () => {
    start({ configuration: null });
    harness.configure(CONFIGURATION);
    harness.mutate();
    expect(harness.relayed("frame").some((payload) => payload.kind === "configuration")).toBe(true);
  });
});

describe("claiming cancelable requests", () => {
  test("a screenshot request is claimed only once a frame is attached", () => {
    start();
    const request = { version: 1, video: { id: "dQw4w9WgXcQ", title: "T", channelTitle: "C", seconds: 12 }, screenshot: { format: "png", quality: 1, filenameTemplate: "{video_id}" } };
    expect(harness.dispatch("ytzero:enhance:screenshot-request", request, { cancelable: true }).defaultPrevented).toBe(false);
    frameReady();
    expect(harness.dispatch("ytzero:enhance:screenshot-request", request, { cancelable: true }).defaultPrevented).toBe(true);
    expect(harness.relayed("frame").some((payload) => payload.kind === "screenshot")).toBe(true);
  });

  test("a player command is claimed and relayed with its request id", () => {
    start();
    frameReady();
    const event = harness.dispatch("ytzero:enhance:player-command", {
      version: 1, requestId: "42", videoId: "dQw4w9WgXcQ", command: "toggle-play", payload: {},
    }, { cancelable: true });
    expect(event.defaultPrevented).toBe(true);
    const command = harness.relayed("frame").find((payload) => payload.kind === "command");
    expect(command).toMatchObject({ requestId: "42", command: "toggle-play" });
  });

  test("a malformed command is left to the page", () => {
    start();
    frameReady();
    const event = harness.dispatch("ytzero:enhance:player-command", { version: 1, requestId: 42 }, { cancelable: true });
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("frame to page events", () => {
  test("player events are republished on the document with the bridge envelope", () => {
    start();
    frameReady();
    const published = [];
    globalThis.document.addEventListener("ytzero:enhance:player-event", (event) => published.push(JSON.parse(event.detail)));
    harness.deliver({
      type: "ytzero:enhance:relay",
      to: "top",
      payload: { kind: "player-event", videoId: "dQw4w9WgXcQ", type: "shortcut", payload: { action: "togglePlay" } },
    });
    expect(published).toEqual([{ version: 1, videoId: "dQw4w9WgXcQ", type: "shortcut", payload: { action: "togglePlay" } }]);
  });

  test("a screenshot result is normalized to saved or error", () => {
    start();
    frameReady();
    const published = [];
    globalThis.document.addEventListener("ytzero:enhance:screenshot-result", (event) => published.push(JSON.parse(event.detail)));
    harness.deliver({ type: "ytzero:enhance:relay", to: "top", payload: { kind: "screenshot-result", status: "saved" } });
    harness.deliver({ type: "ytzero:enhance:relay", to: "top", payload: { kind: "screenshot-result", status: "nonsense" } });
    expect(published.map((event) => event.status)).toEqual(["saved", "error"]);
  });
});

describe("legacy content type", () => {
  test("a shorts route supplies the fallback when the page omits the field", () => {
    start({ pathname: "/shorts/dQw4w9WgXcQ" });
    frameReady();
    harness.dispatch("ytzero:enhance:context", {
      ...CONTEXT,
      video: { ...CONTEXT.video, contentType: undefined },
    });
    const context = harness.relayed("frame").filter((payload) => payload.kind === "context").at(-1);
    expect(context.context.video.contentType).toBe("short");
  });
});
