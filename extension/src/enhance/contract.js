// Validation for everything YT Zero hands the extension: the static
// configuration element, the per-video context, and screenshot requests.
// Mirrors ui/src/enhanceBridge.ts and ui/src/keyboardShortcuts.ts. Kept free of
// DOM and extension APIs so it can be unit tested directly.
(function (global) {
  const BRIDGE_VERSION = 1;
  const CONFIGURATION_ELEMENT_ID = "ytzero-enhance-configuration";
  const CONFIGURATION_FORMAT = "ytzero.enhance-configuration";

  const EVENTS = {
    ready: "ytzero:enhance:ready",
    context: "ytzero:enhance:context",
    screenshotRequest: "ytzero:enhance:screenshot-request",
    screenshotResult: "ytzero:enhance:screenshot-result",
    playerEvent: "ytzero:enhance:player-event",
    playerCommand: "ytzero:enhance:player-command",
  };

  const EXTENSION_STATUS = {
    elementId: "ytzero-enhance-extension-status",
    attribute: "data-extension-status",
    activeValue: "active",
  };

  const CONTENT_TYPES = ["default", "short", "livestream"];

  // Defaults for an older YT Zero build that publishes no `keyboardShortcuts`.
  const DEFAULT_SHORTCUTS = {
    togglePlay: "KeyK",
    temporaryBoost: "Space",
    seekBack10: "KeyJ",
    seekForward10: "KeyL",
    previousVideo: "Shift+KeyP",
    nextVideo: "Shift+KeyN",
    previousFrame: "Comma",
    nextFrame: "Period",
    speedDown: "Shift+Comma",
    speedUp: "Shift+Period",
    seekPercent: "Digit0-9",
    previousChapter: "Alt+ArrowLeft",
    nextChapter: "Alt+ArrowRight",
    seekBack: "ArrowLeft",
    seekForward: "ArrowRight",
    volumeUp: "ArrowUp",
    volumeDown: "ArrowDown",
    toggleCaptions: "KeyC",
    subtitleLarger: "Shift+Equal",
    subtitleSmaller: "Minus",
    toggleFullscreen: "KeyF",
    toggleTheater: "KeyT",
    togglePictureInPicture: "KeyI",
    close: "Escape",
    toggleMute: "KeyM",
    screenshot: "KeyS",
  };

  const ACTIONS = Object.keys(DEFAULT_SHORTCUTS);
  // The parent owns navigation, theater and close; the extension only reports them.
  const PARENT_OWNED_ACTIONS = new Set(["previousVideo", "nextVideo", "toggleTheater", "close"]);

  const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"];
  const MODIFIERS = new Set(MODIFIER_ORDER);
  const CODE = /^(?:Key[A-Z]|Digit[0-9]|Digit0-9|F(?:[1-9]|1[0-2])|Numpad(?:Add|Subtract)|Arrow(?:Left|Right|Up|Down)|Space|Escape|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Comma|Period|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Backslash|Slash|Backquote)$/;
  const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

  /** `null` disables an action; `undefined` means the value is unusable. */
  function normalizeChord(value) {
    if (value === null) return null;
    if (typeof value !== "string" || value.length > 80) return undefined;
    const parts = value.split("+");
    const code = parts.pop();
    if (!code || !CODE.test(code)) return undefined;
    if (parts.some((part, index) => !MODIFIERS.has(part) || parts.indexOf(part) !== index)) return undefined;
    return [...MODIFIER_ORDER.filter((modifier) => parts.includes(modifier)), code].join("+");
  }

  function record(value) {
    return value != null && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function number(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function bool(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  /**
   * A malformed chord disables only its own action, so one bad entry never
   * costs the profile the rest of its map.
   */
  function normalizeShortcuts(value, onDiagnostic) {
    const source = record(value);
    if (!source) return { ...DEFAULT_SHORTCUTS };
    const bindings = {};
    for (const action of ACTIONS) {
      if (!(action in source)) {
        bindings[action] = DEFAULT_SHORTCUTS[action];
        continue;
      }
      const chord = normalizeChord(source[action]);
      if (chord === undefined) {
        bindings[action] = null;
        onDiagnostic?.(action, source[action]);
      } else {
        bindings[action] = chord;
      }
    }
    return bindings;
  }

  function normalizeContentType(value, legacyFallback) {
    return CONTENT_TYPES.includes(value) ? value : legacyFallback;
  }

  /**
   * @returns {{ok: true, configuration: object} | {ok: false, reason: string}}
   */
  function parseConfiguration(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "unparseable" };
    }
    const source = record(parsed);
    if (!source) return { ok: false, reason: "unparseable" };
    if (source.format !== CONFIGURATION_FORMAT) return { ok: false, reason: "unknown-format" };
    if (typeof source.version !== "number" || !Number.isInteger(source.version)) return { ok: false, reason: "unknown-version" };
    if (source.version > BRIDGE_VERSION) return { ok: false, reason: "unsupported-version" };

    const player = record(source.player) ?? {};
    const captions = record(player.captions) ?? {};
    const captionStyle = record(captions.style) ?? {};
    const screenshots = record(source.screenshots) ?? {};
    const sponsorBlock = record(source.sponsorBlock) ?? {};
    const bridge = record(source.bridge) ?? {};
    const status = record(bridge.extensionStatus) ?? {};

    return {
      ok: true,
      configuration: {
        version: source.version,
        enabled: bool(source.enabled, true),
        player: {
          replaceControls: bool(player.replaceControls, true),
          language: typeof player.language === "string" ? player.language : "en",
          preferredQuality: typeof player.preferredQuality === "string" ? player.preferredQuality : "auto",
          defaultPlaybackRate: number(player.defaultPlaybackRate, 1, 0.1, 4),
          keyboardSeekSeconds: number(player.keyboardSeekSeconds, 5, 1, 120),
          frameStepFps: number(player.frameStepFps, 30, 1, 120),
          autoFullscreenLandscape: bool(player.autoFullscreenLandscape, false),
          captions: {
            enabledByDefault: bool(captions.enabledByDefault, false),
            language: typeof captions.language === "string" ? captions.language : "en",
            style: {
              fontSizePx: number(captionStyle.fontSizePx, 19, 12, 48),
              color: typeof captionStyle.color === "string" ? captionStyle.color : "#ffffff",
              backgroundOpacityPercent: number(captionStyle.backgroundOpacityPercent, 75, 0, 100),
            },
          },
        },
        screenshots: {
          format: ["png", "jpeg", "webp"].includes(screenshots.format) ? screenshots.format : "jpeg",
          jpegQuality: number(screenshots.jpegQuality, 0.92, 0.1, 1),
          filenameTemplate: typeof screenshots.filenameTemplate === "string" && screenshots.filenameTemplate
            ? screenshots.filenameTemplate
            : "{channel}_{title}_{timestamp_ms}",
        },
        sponsorBlock: {
          enabled: bool(sponsorBlock.enabled, false),
          categories: Array.isArray(sponsorBlock.categories)
            ? sponsorBlock.categories.filter((item) => typeof item === "string")
            : ["sponsor"],
        },
        bridge: {
          version: number(bridge.version, BRIDGE_VERSION, 1, BRIDGE_VERSION),
          events: { ...EVENTS, ...(record(bridge.events) ?? {}) },
          extensionStatus: {
            elementId: typeof status.elementId === "string" ? status.elementId : EXTENSION_STATUS.elementId,
            attribute: typeof status.attribute === "string" ? status.attribute : EXTENSION_STATUS.attribute,
            activeValue: typeof status.activeValue === "string" ? status.activeValue : EXTENSION_STATUS.activeValue,
          },
        },
      },
    };
  }

  function chapters(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => record(entry))
      .filter((entry) => entry && typeof entry.title === "string" && Number.isFinite(Number(entry.start)))
      .map((entry) => ({ title: entry.title, start: Math.max(0, Number(entry.start)) }))
      .sort((a, b) => a.start - b.start);
  }

  function sponsorSegments(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => record(entry))
      .filter((entry) => entry && Array.isArray(entry.segment) && entry.segment.length === 2
        && entry.segment.every((seconds) => Number.isFinite(Number(seconds))))
      .map((entry) => ({
        category: typeof entry.category === "string" ? entry.category : "sponsor",
        actionType: typeof entry.actionType === "string" ? entry.actionType : "skip",
        segment: [Number(entry.segment[0]), Number(entry.segment[1])],
        uuid: typeof entry.UUID === "string" ? entry.UUID : "",
      }));
  }

  /**
   * @param legacyContentType fallback used when the page omits the field, resolved
   *        by the caller from the top-page route / native live playback.
   */
  function parseContext(raw, legacyContentType = "default", onDiagnostic) {
    const source = record(raw);
    if (!source || source.version !== BRIDGE_VERSION) return null;
    const video = record(source.video);
    if (!video || typeof video.id !== "string" || !VIDEO_ID.test(video.id)) return null;

    const playback = record(source.playback) ?? {};
    const captions = record(playback.captions) ?? {};
    const captionStyle = record(captions.style) ?? {};
    const screenshot = record(source.screenshot) ?? {};

    return {
      version: BRIDGE_VERSION,
      active: bool(source.active, true),
      video: {
        id: video.id,
        title: typeof video.title === "string" ? video.title : "",
        channelId: typeof video.channelId === "string" ? video.channelId : "",
        channelTitle: typeof video.channelTitle === "string" ? video.channelTitle : "",
        duration: number(video.duration, 0, 0, Number.MAX_SAFE_INTEGER),
        contentType: normalizeContentType(video.contentType, legacyContentType),
      },
      playback: {
        rate: number(playback.rate, 1, 0.25, 2),
        keyboardSeekSeconds: number(playback.keyboardSeekSeconds, 5, 1, 120),
        frameStepFps: number(playback.frameStepFps, 30, 1, 120),
        transportLocked: bool(playback.transportLocked, false),
        keyboardShortcuts: normalizeShortcuts(playback.keyboardShortcuts, onDiagnostic),
        captions: {
          enabledByDefault: bool(captions.enabledByDefault, false),
          language: typeof captions.language === "string" ? captions.language : "en",
          style: {
            fontSizePx: number(captionStyle.fontSizePx, 19, 12, 48),
            color: typeof captionStyle.color === "string" ? captionStyle.color : "#ffffff",
            backgroundOpacityPercent: number(captionStyle.backgroundOpacityPercent, 75, 0, 100),
          },
        },
        chapters: chapters(playback.chapters),
        sponsorBlockSegments: sponsorSegments(playback.sponsorBlockSegments),
      },
      screenshot: {
        format: ["png", "jpeg", "webp"].includes(screenshot.format) ? screenshot.format : "jpeg",
        quality: number(screenshot.quality, 0.92, 0.1, 1),
        filenameTemplate: typeof screenshot.filenameTemplate === "string" && screenshot.filenameTemplate
          ? screenshot.filenameTemplate
          : "{channel}_{title}_{timestamp_ms}",
      },
    };
  }

  function parseScreenshotRequest(raw) {
    const source = record(raw);
    if (!source || source.version !== BRIDGE_VERSION) return null;
    const video = record(source.video);
    if (!video || typeof video.id !== "string" || !VIDEO_ID.test(video.id)) return null;
    const screenshot = record(source.screenshot) ?? {};
    return {
      video: {
        id: video.id,
        title: typeof video.title === "string" ? video.title : "",
        channelTitle: typeof video.channelTitle === "string" ? video.channelTitle : "",
        seconds: number(video.seconds, 0, 0, Number.MAX_SAFE_INTEGER),
      },
      screenshot: {
        format: ["png", "jpeg", "webp"].includes(screenshot.format) ? screenshot.format : "jpeg",
        quality: number(screenshot.quality, 0.92, 0.1, 1),
        filenameTemplate: typeof screenshot.filenameTemplate === "string" && screenshot.filenameTemplate
          ? screenshot.filenameTemplate
          : "{channel}_{title}_{timestamp_ms}",
      },
    };
  }

  const EXTENSIONS = { png: "png", jpeg: "jpg", webp: "webp" };
  const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  function sanitizeFilenamePart(value) {
    return String(value ?? "")
      // Path separators and the characters Windows reserves in a filename.
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function expandFilename(template, fields, format) {
    const values = {
      channel: sanitizeFilenamePart(fields.channel),
      title: sanitizeFilenamePart(fields.title),
      video_id: sanitizeFilenamePart(fields.videoId),
      timestamp: sanitizeFilenamePart(fields.timestamp),
      timestamp_ms: sanitizeFilenamePart(fields.timestampMs),
    };
    let name = String(template).replace(/\{(channel|title|video_id|timestamp|timestamp_ms)\}/g, (_, key) => values[key]);
    name = sanitizeFilenamePart(name).replace(/^\.+/, "").replace(/\.+$/, "");
    if (!name || RESERVED_WINDOWS_NAMES.test(name)) name = `ytzero_${values.video_id || "screenshot"}`;
    return `${name}.${EXTENSIONS[format] ?? "jpg"}`;
  }

  /** `1h02m03s` style stamp for the filename template. */
  function timestampLabel(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return hours > 0 ? `${hours}h${pad(minutes)}m${pad(rest)}s` : `${minutes}m${pad(rest)}s`;
  }

  global.YTZEnhance = {
    ...(global.YTZEnhance ?? {}),
    contract: {
      BRIDGE_VERSION,
      CONFIGURATION_ELEMENT_ID,
      CONFIGURATION_FORMAT,
      EVENTS,
      EXTENSION_STATUS,
      CONTENT_TYPES,
      DEFAULT_SHORTCUTS,
      ACTIONS,
      PARENT_OWNED_ACTIONS,
      normalizeChord,
      normalizeShortcuts,
      normalizeContentType,
      parseConfiguration,
      parseContext,
      parseScreenshotRequest,
      expandFilename,
      sanitizeFilenamePart,
      timestampLabel,
    },
  };
})(globalThis);
