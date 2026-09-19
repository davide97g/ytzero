import { describe, expect, test } from "bun:test";
import "../src/enhance/contract.js";

const { contract } = globalThis.YTZEnhance;

function configuration(overrides = {}) {
  return JSON.stringify({
    format: "ytzero.enhance-configuration",
    version: 1,
    enabled: true,
    ...overrides,
  });
}

describe("parseConfiguration", () => {
  test("rejects an unknown format", () => {
    expect(parseReason(JSON.stringify({ format: "something.else", version: 1 }))).toBe("unknown-format");
  });

  test("rejects a newer bridge version", () => {
    expect(parseReason(configuration({ version: 2 }))).toBe("unsupported-version");
  });

  test("rejects unparseable text", () => {
    expect(parseReason("{not json")).toBe("unparseable");
  });

  test("fills defaults and ignores unknown fields", () => {
    const parsed = contract.parseConfiguration(configuration({ futureField: 1 }));
    expect(parsed.ok).toBe(true);
    expect(parsed.configuration.player.keyboardSeekSeconds).toBe(5);
    expect(parsed.configuration.screenshots.format).toBe("jpeg");
    expect(parsed.configuration.bridge.extensionStatus.elementId).toBe("ytzero-enhance-extension-status");
  });

  test("clamps out-of-range numbers", () => {
    const parsed = contract.parseConfiguration(configuration({
      player: { keyboardSeekSeconds: 9999, frameStepFps: 0, captions: { style: { fontSizePx: 400 } } },
    }));
    expect(parsed.configuration.player.keyboardSeekSeconds).toBe(120);
    expect(parsed.configuration.player.frameStepFps).toBe(1);
    expect(parsed.configuration.player.captions.style.fontSizePx).toBe(48);
  });
});

function parseReason(raw) {
  const parsed = contract.parseConfiguration(raw);
  return parsed.ok ? null : parsed.reason;
}

describe("normalizeChord", () => {
  test("orders modifiers canonically", () => {
    expect(contract.normalizeChord("Shift+Alt+KeyK")).toBe("Alt+Shift+KeyK");
  });

  test("accepts the digit family chord and null", () => {
    expect(contract.normalizeChord("Digit0-9")).toBe("Digit0-9");
    expect(contract.normalizeChord(null)).toBe(null);
  });

  test("rejects unknown codes, duplicate modifiers and non-strings", () => {
    expect(contract.normalizeChord("Ctrl+Ctrl+KeyK")).toBeUndefined();
    expect(contract.normalizeChord("KeyÄ")).toBeUndefined();
    expect(contract.normalizeChord(7)).toBeUndefined();
  });
});

describe("parseContext", () => {
  const base = {
    version: 1,
    active: true,
    video: { id: "dQw4w9WgXcQ", title: "T", channelId: "c", channelTitle: "C", duration: 100, contentType: "default" },
    playback: { rate: 1, keyboardSeekSeconds: 5, frameStepFps: 30, transportLocked: false },
  };

  test("rejects a wrong version or an invalid video id", () => {
    expect(contract.parseContext({ ...base, version: 2 })).toBeNull();
    expect(contract.parseContext({ ...base, video: { ...base.video, id: "short" } })).toBeNull();
  });

  test("uses the defaults when the map is missing", () => {
    const parsed = contract.parseContext(base);
    expect(parsed.playback.keyboardShortcuts).toEqual(contract.DEFAULT_SHORTCUTS);
  });

  test("disables only the malformed action and reports one diagnostic", () => {
    const diagnostics = [];
    const parsed = contract.parseContext({
      ...base,
      playback: { ...base.playback, keyboardShortcuts: { togglePlay: "KeyX", toggleMute: "Nonsense", screenshot: null } },
    }, "default", (action) => diagnostics.push(action));
    expect(parsed.playback.keyboardShortcuts.togglePlay).toBe("KeyX");
    expect(parsed.playback.keyboardShortcuts.toggleMute).toBeNull();
    expect(parsed.playback.keyboardShortcuts.screenshot).toBeNull();
    expect(parsed.playback.keyboardShortcuts.seekBack).toBe("ArrowLeft");
    expect(diagnostics).toEqual(["toggleMute"]);
  });

  test("normalizes the content type against the legacy fallback", () => {
    expect(contract.parseContext(base).video.contentType).toBe("default");
    const unknown = { ...base, video: { ...base.video, contentType: "vertical-cinema" } };
    expect(contract.parseContext(unknown, "short").video.contentType).toBe("short");
    const missing = { ...base, video: { ...base.video, contentType: undefined } };
    expect(contract.parseContext(missing, "livestream").video.contentType).toBe("livestream");
  });

  test("sorts chapters and normalizes sponsor segments", () => {
    const parsed = contract.parseContext({
      ...base,
      playback: {
        ...base.playback,
        chapters: [{ title: "b", start: 30 }, { title: "a", start: 0 }, { title: "bad" }],
        sponsorBlockSegments: [{ category: "sponsor", actionType: "skip", segment: [1, 2], UUID: "u" }, { segment: [1] }],
      },
    });
    expect(parsed.playback.chapters.map((chapter) => chapter.title)).toEqual(["a", "b"]);
    expect(parsed.playback.sponsorBlockSegments).toEqual([{ category: "sponsor", actionType: "skip", segment: [1, 2], uuid: "u" }]);
  });
});

describe("expandFilename", () => {
  const fields = { channel: "Some/Channel", title: "A: Title?", videoId: "dQw4w9WgXcQ", timestamp: "1m05s", timestampMs: "65000" };

  test("expands every documented field and appends the format extension", () => {
    expect(contract.expandFilename("{channel}_{title}_{video_id}_{timestamp}_{timestamp_ms}", fields, "png"))
      .toBe("Some_Channel_A_ Title__dQw4w9WgXcQ_1m05s_65000.png");
  });

  test("maps jpeg to .jpg and falls back for an unknown format", () => {
    expect(contract.expandFilename("{video_id}", fields, "jpeg")).toBe("dQw4w9WgXcQ.jpg");
    expect(contract.expandFilename("{video_id}", fields, "tiff")).toBe("dQw4w9WgXcQ.jpg");
  });

  test("replaces an empty or Windows-reserved result", () => {
    expect(contract.expandFilename("", fields, "png")).toBe("ytzero_dQw4w9WgXcQ.png");
    expect(contract.expandFilename("con", fields, "png")).toBe("ytzero_dQw4w9WgXcQ.png");
  });

  test("never produces a path separator or a leading dot", () => {
    expect(contract.expandFilename("../../etc/passwd", fields, "webp")).toBe("_.._etc_passwd.webp");
  });
});

describe("timestampLabel", () => {
  test("uses hours only when needed", () => {
    expect(contract.timestampLabel(65)).toBe("1m05s");
    expect(contract.timestampLabel(3725)).toBe("1h02m05s");
  });
});
