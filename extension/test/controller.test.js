import { beforeEach, describe, expect, test } from "bun:test";
import "../src/enhance/contract.js";
import "../src/enhance/matcher.js";
import "../src/enhance/controller.js";

const { contract, controller } = globalThis.YTZEnhance;

function fakePlayer(overrides = {}) {
  const state = {
    paused: true, time: 50, duration: 100, volume: 0.5, muted: false,
    rate: 1, captionSize: 19, captions: false, calls: [], ...overrides,
  };
  return {
    state,
    isPaused: () => state.paused,
    togglePlay: () => { state.paused = !state.paused; state.calls.push("togglePlay"); },
    currentTime: () => state.time,
    setCurrentTime: (value) => { state.time = value; },
    duration: () => state.duration,
    volume: () => state.volume,
    setVolume: (value) => { state.volume = value; },
    muted: () => state.muted,
    setMuted: (value) => { state.muted = value; },
    // Reports the previous value until an asynchronous command settles, which is
    // exactly the trap the owned-rate rule exists for.
    setPlaybackRate: (value) => { state.calls.push(`rate:${value}`); queueMicrotask(() => { state.rate = value; }); },
    captionSize: () => state.captionSize,
    setCaptionSize: (value) => { state.captionSize = value; },
    toggleCaptions: () => { state.captions = !state.captions; state.calls.push("toggleCaptions"); },
    toggleFullscreen: () => state.calls.push("toggleFullscreen"),
    togglePictureInPicture: () => state.calls.push("togglePictureInPicture"),
    captureFrame: () => state.calls.push("captureFrame"),
  };
}

function context(overrides = {}, playback = {}, video = {}) {
  return contract.parseContext({
    version: 1,
    active: true,
    video: { id: "dQw4w9WgXcQ", title: "T", channelId: "c", channelTitle: "C", duration: 100, contentType: "default", ...video },
    playback: { rate: 1, keyboardSeekSeconds: 5, frameStepFps: 30, transportLocked: false, ...playback },
    ...overrides,
  });
}

function keyEvent(code, modifiers = {}) {
  return {
    code, key: code, repeat: false,
    ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
    ...modifiers,
    composedPath: () => [],
  };
}

let clock;

function makeController(player, options = {}) {
  clock = { now: 0, timers: new Map(), next: 1 };
  const emitted = [];
  const instance = controller.createShortcutController({
    player,
    emit: (payload) => emitted.push(payload),
    now: () => clock.now,
    setTimeout: (fn, ms) => {
      const id = clock.next++;
      clock.timers.set(id, { fn, at: clock.now + ms });
      return id;
    },
    clearTimeout: (id) => clock.timers.delete(id),
    ...options,
  });
  instance.setContext(context());
  return { instance, emitted };
}

function advance(ms) {
  clock.now += ms;
  for (const [id, timer] of [...clock.timers]) {
    if (timer.at <= clock.now) {
      clock.timers.delete(id);
      timer.fn();
    }
  }
}

describe("speed stepping", () => {
  test("each press builds on the preceding result, not on the player value", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    for (let press = 0; press < 5; press += 1) instance.handleKeyDown(keyEvent("Period", { shiftKey: true }));
    expect(emitted.map((event) => event.value)).toEqual([1.25, 1.5, 1.75, 2, 2]);
    expect(instance.currentRate()).toBe(2);
  });

  test("decreasing is equally cumulative and clamps at 0.25", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    for (let press = 0; press < 4; press += 1) instance.handleKeyDown(keyEvent("Comma", { shiftKey: true }));
    expect(emitted.map((event) => event.value)).toEqual([0.75, 0.5, 0.25, 0.25]);
  });

  test("an external set-playback-rate updates the owned value", () => {
    const { instance, emitted } = makeController(fakePlayer());
    instance.noteExternalRate(1.5);
    instance.handleKeyDown(keyEvent("Period", { shiftKey: true }));
    expect(emitted.at(-1).value).toBe(1.75);
  });

  test("a new video resets the owned rate to the context rate", () => {
    const { instance, emitted } = makeController(fakePlayer());
    instance.handleKeyDown(keyEvent("Period", { shiftKey: true }));
    instance.setContext(context({}, { rate: 1.5 }, { id: "b6bxeEZ_j9A" }));
    instance.handleKeyDown(keyEvent("Period", { shiftKey: true }));
    expect(emitted.at(-1).value).toBe(1.75);
  });
});

describe("temporary boost", () => {
  test("a short press toggles playback", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    instance.handleKeyDown(keyEvent("Space"));
    advance(100);
    instance.handleKeyUp(keyEvent("Space"));
    expect(player.state.calls).toEqual(["togglePlay"]);
    expect(emitted.map((event) => event.action)).toEqual(["togglePlay"]);
  });

  test("a hold enters 2x once and keyup restores the owned rate", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    instance.handleKeyDown(keyEvent("Period", { shiftKey: true }));
    instance.handleKeyDown(keyEvent("Space"));
    advance(300);
    instance.handleKeyUp(keyEvent("Space"));
    expect(player.state.calls).toEqual(["rate:1.25", "rate:2", "rate:1.25"]);
    expect(emitted.map((event) => event.value)).toEqual([1.25, 2, 1.25]);
    expect(instance.currentRate()).toBe(1.25);
  });

  test("auto-repeat during a hold does not restart the boost", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("Space"));
    instance.handleKeyDown(keyEvent("Space", { repeat: true }));
    advance(300);
    expect(player.state.calls).toEqual(["rate:2"]);
  });
});

describe("seeking", () => {
  test("uses the configured seek interval and the fixed ten-second actions", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.setContext(context({}, { keyboardSeekSeconds: 15 }));
    instance.handleKeyDown(keyEvent("ArrowRight"));
    expect(player.state.time).toBe(65);
    instance.handleKeyDown(keyEvent("KeyJ"));
    expect(player.state.time).toBe(55);
  });

  test("seekPercent seeks to the digit tenth of a finite duration", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("Digit3"));
    expect(player.state.time).toBe(30);
  });

  test("seekPercent does nothing without a finite duration", () => {
    const player = fakePlayer({ duration: Number.POSITIVE_INFINITY });
    const { instance, emitted } = makeController(player);
    instance.handleKeyDown(keyEvent("Digit3"));
    expect(player.state.time).toBe(50);
    expect(emitted).toEqual([]);
  });

  test("frame stepping only works while paused and uses the configured fps", () => {
    const player = fakePlayer({ paused: false });
    const { instance } = makeController(player);
    instance.setContext(context({}, { frameStepFps: 25 }));
    instance.handleKeyDown(keyEvent("Period"));
    expect(player.state.time).toBe(50);
    player.state.paused = true;
    instance.handleKeyDown(keyEvent("Period"));
    expect(player.state.time).toBeCloseTo(50.04, 5);
  });
});

describe("chapters", () => {
  const chapters = [{ title: "a", start: 0 }, { title: "b", start: 30 }, { title: "c", start: 60 }];

  test("previous restarts the current chapter once past the hysteresis", () => {
    const player = fakePlayer({ time: 40 });
    const { instance } = makeController(player);
    instance.setContext(context({}, { chapters }));
    instance.handleKeyDown(keyEvent("ArrowLeft", { altKey: true }));
    expect(player.state.time).toBe(30);
  });

  test("previous skips back a chapter within the hysteresis and floors at zero", () => {
    const player = fakePlayer({ time: 30.5 });
    const { instance } = makeController(player);
    instance.setContext(context({}, { chapters }));
    instance.handleKeyDown(keyEvent("ArrowLeft", { altKey: true }));
    expect(player.state.time).toBe(0);
    player.state.time = 0.2;
    instance.handleKeyDown(keyEvent("ArrowLeft", { altKey: true }));
    expect(player.state.time).toBe(0);
  });

  test("next no-ops after the last chapter", () => {
    const player = fakePlayer({ time: 70 });
    const { instance } = makeController(player);
    instance.setContext(context({}, { chapters }));
    instance.handleKeyDown(keyEvent("ArrowRight", { altKey: true }));
    expect(player.state.time).toBe(70);
  });

  test("chapter actions no-op without chapters", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("ArrowRight", { altKey: true }));
    expect(player.state.time).toBe(50);
  });
});

describe("volume, captions and toggles", () => {
  test("volume steps five points and clamps", () => {
    const player = fakePlayer({ volume: 0.98 });
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("ArrowUp"));
    expect(player.state.volume).toBe(1);
  });

  test("subtitle size steps one pixel and clamps to 12-48", () => {
    const player = fakePlayer({ captionSize: 48 });
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("Equal", { shiftKey: true }));
    expect(player.state.captionSize).toBe(48);
    player.state.captionSize = 19;
    instance.handleKeyDown(keyEvent("Minus"));
    expect(player.state.captionSize).toBe(18);
  });

  test("toggles ignore auto-repeat", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("KeyK"));
    instance.handleKeyDown(keyEvent("KeyK", { repeat: true }));
    expect(player.state.calls).toEqual(["togglePlay"]);
  });

  test("seeking accepts auto-repeat", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("ArrowRight"));
    instance.handleKeyDown(keyEvent("ArrowRight", { repeat: true }));
    expect(player.state.time).toBe(60);
  });

  test("native picture-in-picture and screenshot reach the player", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.handleKeyDown(keyEvent("KeyI"));
    instance.handleKeyDown(keyEvent("KeyS"));
    expect(player.state.calls).toEqual(["togglePictureInPicture", "captureFrame"]);
  });
});

describe("rebinding", () => {
  test("a new context installs new chords and disables the old ones atomically", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.setContext(context({}, { keyboardShortcuts: { ...contract.DEFAULT_SHORTCUTS, togglePlay: "KeyX", toggleMute: null } }));
    expect(instance.handleKeyDown(keyEvent("KeyK"))).toBe(false);
    expect(instance.handleKeyDown(keyEvent("KeyX"))).toBe(true);
    expect(instance.handleKeyDown(keyEvent("KeyM"))).toBe(false);
    expect(player.state.calls).toEqual(["togglePlay"]);
  });
});

describe("parent-owned actions", () => {
  test("emit exactly one camelCase request and touch no player state", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    for (const event of [keyEvent("KeyP", { shiftKey: true }), keyEvent("KeyN", { shiftKey: true }), keyEvent("KeyT"), keyEvent("Escape")]) {
      expect(instance.handleKeyDown(event)).toBe(true);
    }
    expect(emitted.map((event) => event.action)).toEqual(["previousVideo", "nextVideo", "toggleTheater", "close"]);
    expect(player.state.calls).toEqual([]);
  });
});

describe("content-type and transport restrictions", () => {
  test("a livestream consumes rate, frame, boost and percentage actions without mutating playback", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    instance.setContext(context({}, {}, { contentType: "livestream" }));
    for (const event of [keyEvent("Period", { shiftKey: true }), keyEvent("Period"), keyEvent("Space"), keyEvent("Digit5")]) {
      expect(instance.handleKeyDown(event)).toBe(true);
    }
    advance(300);
    expect(player.state.calls).toEqual([]);
    expect(emitted).toEqual([]);
    expect(instance.currentRate()).toBe(1);
  });

  test("a livestream still allows mute, captions and fullscreen", () => {
    const player = fakePlayer();
    const { instance } = makeController(player);
    instance.setContext(context({}, {}, { contentType: "livestream" }));
    instance.handleKeyDown(keyEvent("KeyM"));
    instance.handleKeyDown(keyEvent("KeyC"));
    instance.handleKeyDown(keyEvent("KeyF"));
    expect(player.state.muted).toBe(true);
    expect(player.state.calls).toEqual(["toggleCaptions", "toggleFullscreen"]);
  });

  test("a locked transport blocks playback and navigation but keeps volume", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    instance.setContext(context({}, { transportLocked: true }));
    instance.handleKeyDown(keyEvent("KeyK"));
    instance.handleKeyDown(keyEvent("ArrowRight"));
    instance.handleKeyDown(keyEvent("KeyN", { shiftKey: true }));
    expect(player.state.calls).toEqual([]);
    expect(player.state.time).toBe(50);
    expect(emitted).toEqual([]);
    instance.handleKeyDown(keyEvent("ArrowUp"));
    expect(player.state.volume).toBeCloseTo(0.55, 5);
  });

  test("shorts route unbound Up/Down to the parent as navigation requests", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    const bindings = { ...contract.DEFAULT_SHORTCUTS, volumeUp: null, volumeDown: null };
    instance.setContext(context({}, { keyboardShortcuts: bindings }, { contentType: "short" }));
    instance.handleKeyDown(keyEvent("ArrowUp"));
    instance.handleKeyDown(keyEvent("ArrowDown"));
    expect(emitted.map((event) => event.action)).toEqual(["previousVideo", "nextVideo"]);
  });

  test("a configured binding wins over the legacy shorts navigation", () => {
    const player = fakePlayer();
    const { instance, emitted } = makeController(player);
    instance.setContext(context({}, {}, { contentType: "short" }));
    instance.handleKeyDown(keyEvent("ArrowUp"));
    expect(emitted.map((event) => event.action)).toEqual(["volumeUp"]);
  });
});

describe("inactive context", () => {
  test("nothing is handled before a context arrives", () => {
    const player = fakePlayer();
    clock = { now: 0, timers: new Map(), next: 1 };
    const instance = controller.createShortcutController({ player, now: () => clock.now });
    expect(instance.handleKeyDown(keyEvent("KeyK"))).toBe(false);
  });
});
