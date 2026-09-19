// Runs inside the embedded YouTube player frame. Owns the media element:
// shortcuts, bridge commands, state reporting, caption styling and raw frame
// capture. Everything the parent owns is reported, never performed here.
(function () {
  const { contract, controller, bridge } = globalThis.YTZEnhance;

  const STATE_THROTTLE_MS = 250;
  const CAPTION_STYLE_ID = "ytzero-enhance-caption-style";

  let video = null;
  let context = null;
  let configuration = null;
  let captionSize = 19;
  let lastStateAt = 0;
  let stateTimer = null;

  function videoId() {
    return context?.video.id ?? "";
  }

  function captionsButton() {
    return document.querySelector(".ytp-subtitles-button");
  }

  function captionsEnabled() {
    return captionsButton()?.getAttribute("aria-pressed") === "true";
  }

  function applyCaptionStyle() {
    const style = context?.playback.captions.style;
    if (!style) return;
    let element = document.getElementById(CAPTION_STYLE_ID);
    if (!element) {
      element = document.createElement("style");
      element.id = CAPTION_STYLE_ID;
      document.documentElement.appendChild(element);
    }
    const opacity = Math.round((style.backgroundOpacityPercent / 100) * 255).toString(16).padStart(2, "0");
    element.textContent = `
      .ytp-caption-segment {
        font-size: ${captionSize}px !important;
        color: ${style.color} !important;
        background: rgba(0, 0, 0, 0) !important;
      }
      .caption-visual-line .ytp-caption-segment {
        background: #000000${opacity} !important;
      }
    `;
  }

  function state() {
    return {
      paused: Boolean(video?.paused),
      ended: Boolean(video?.ended),
      currentTime: Number(video?.currentTime) || 0,
      duration: Number.isFinite(video?.duration) ? video.duration : 0,
      volume: Number(video?.volume ?? 1),
      muted: Boolean(video?.muted),
      playbackRate: Number(video?.playbackRate ?? 1),
      captionSize,
      captionsEnabled: captionsEnabled(),
      fullscreen: Boolean(document.fullscreenElement),
      pictureInPicture: Boolean(document.pictureInPictureElement),
    };
  }

  function send(type, payload) {
    bridge.relay("top", { kind: "player-event", videoId: videoId(), type, payload });
  }

  function sendState(type = "state") {
    lastStateAt = Date.now();
    send(type, { state: state() });
  }

  /** High-frequency media events collapse into one publish per interval. */
  function scheduleState() {
    if (stateTimer) return;
    const wait = Math.max(0, STATE_THROTTLE_MS - (Date.now() - lastStateAt));
    stateTimer = setTimeout(() => {
      stateTimer = null;
      sendState();
    }, wait);
  }

  function isLive() {
    return context?.video.contentType === "livestream";
  }

  /** A livestream without a DVR window has nothing meaningful to seek within. */
  function seekable() {
    if (!video) return false;
    if (!isLive()) return Number.isFinite(video.duration) && video.duration > 0;
    return video.seekable?.length > 0 && video.seekable.end(video.seekable.length - 1) > video.seekable.start(0);
  }

  const player = {
    isPaused: () => Boolean(video?.paused),
    togglePlay: () => {
      if (!video) return;
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
    },
    currentTime: () => Number(video?.currentTime) || 0,
    setCurrentTime: (value) => {
      if (!video || !seekable()) return;
      video.currentTime = value;
    },
    duration: () => (Number.isFinite(video?.duration) ? video.duration : Number.POSITIVE_INFINITY),
    volume: () => Number(video?.volume ?? 1),
    setVolume: (value) => {
      if (!video) return;
      video.volume = value;
      if (value > 0) video.muted = false;
    },
    muted: () => Boolean(video?.muted),
    setMuted: (value) => {
      if (video) video.muted = value;
    },
    setPlaybackRate: (value) => {
      if (video && !isLive()) video.playbackRate = value;
    },
    captionSize: () => captionSize,
    setCaptionSize: (value) => {
      captionSize = value;
      applyCaptionStyle();
      scheduleState();
    },
    toggleCaptions: () => {
      const button = captionsButton();
      // Without the native control there is nothing to toggle here, so ask the
      // parent to resolve captions its own way.
      if (!button) send("captions-toggle-request", {});
      else button.click();
    },
    toggleFullscreen: () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      else void (video ?? document.documentElement).requestFullscreen?.().catch(() => {});
    },
    togglePictureInPicture: () => {
      if (!video) return;
      if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {});
      else void video.requestPictureInPicture?.().catch(() => {});
    },
    captureFrame: () => {
      void capture(context?.screenshot ?? configuration?.screenshots ?? null);
    },
  };

  const shortcuts = controller.createShortcutController({
    player,
    emit: (payload) => send("shortcut", payload),
  });

  async function capture(settings) {
    if (!video || !settings) {
      bridge.relay("top", { kind: "screenshot-result", status: "error" });
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!canvas.width || !canvas.height) throw new Error("Video has no frame yet");
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      const format = settings.format ?? "jpeg";
      const quality = settings.quality ?? settings.jpegQuality ?? 0.92;
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Encoding failed"))), `image/${format}`, quality);
      });

      const seconds = Number(video.currentTime) || 0;
      const filename = contract.expandFilename(settings.filenameTemplate, {
        channel: context?.video.channelTitle ?? "",
        title: context?.video.title ?? "",
        videoId: videoId(),
        timestamp: contract.timestampLabel(seconds),
        timestampMs: String(Math.round(seconds * 1000)),
      }, format);

      // The blob belongs to this youtube.com document, so the anchor download
      // keeps the chosen filename without any extra extension privilege.
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.documentElement.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      bridge.relay("top", { kind: "screenshot-result", status: "saved" });
    } catch (error) {
      console.warn("YT Zero Enhance: screenshot failed", error);
      bridge.relay("top", { kind: "screenshot-result", status: "error" });
    }
  }

  const TRANSPORT_COMMANDS = new Set([
    "play", "pause", "toggle-play", "seek-by", "seek-to", "set-playback-rate",
  ]);

  function result(requestId, ok, extra = {}) {
    send("command-result", { requestId, ok, ...extra });
  }

  function runCommand(message) {
    const { requestId, command, payload = {} } = message;
    if (!video) return result(requestId, false, { error: "No player is attached" });
    if (context?.playback.transportLocked && TRANSPORT_COMMANDS.has(command)) {
      return result(requestId, false, { error: "Transport is locked by the watch party host" });
    }
    switch (command) {
      case "play":
        void video.play().catch(() => {});
        return result(requestId, true);
      case "pause":
        video.pause();
        return result(requestId, true);
      case "toggle-play":
        player.togglePlay();
        return result(requestId, true);
      case "seek-by":
      case "seek-to": {
        if (!seekable()) return result(requestId, false, { error: "This stream is not seekable" });
        const target = command === "seek-to"
          ? Number(payload.seconds)
          : player.currentTime() + Number(payload.seconds);
        if (!Number.isFinite(target)) return result(requestId, false, { error: "Invalid seek target" });
        player.setCurrentTime(Math.max(0, target));
        return result(requestId, true, { currentTime: player.currentTime() });
      }
      case "set-volume": {
        const value = Number(payload.volume);
        if (!Number.isFinite(value)) return result(requestId, false, { error: "Invalid volume" });
        player.setVolume(Math.min(1, Math.max(0, value)));
        return result(requestId, true, { volume: player.volume() });
      }
      case "set-muted":
        player.setMuted(Boolean(payload.muted));
        return result(requestId, true, { muted: player.muted() });
      case "toggle-muted":
        player.setMuted(!player.muted());
        return result(requestId, true, { muted: player.muted() });
      case "set-playback-rate": {
        if (isLive()) return result(requestId, false, { error: "Playback rate is fixed for a livestream" });
        const value = Number(payload.rate ?? payload.playbackRate);
        if (!Number.isFinite(value)) return result(requestId, false, { error: "Invalid playback rate" });
        const clamped = Math.min(controller.RATE_MAX, Math.max(controller.RATE_MIN, value));
        player.setPlaybackRate(clamped);
        shortcuts.noteExternalRate(clamped);
        return result(requestId, true, { playbackRate: clamped });
      }
      case "set-captions": {
        const wanted = Boolean(payload.enabled);
        if (wanted !== captionsEnabled()) player.toggleCaptions();
        return result(requestId, true, { captionsEnabled: captionsEnabled() });
      }
      case "toggle-captions":
        player.toggleCaptions();
        return result(requestId, true, { captionsEnabled: captionsEnabled() });
      case "set-caption-size": {
        const value = Number(payload.size ?? payload.fontSizePx);
        if (!Number.isFinite(value)) return result(requestId, false, { error: "Invalid caption size" });
        player.setCaptionSize(Math.min(48, Math.max(12, Math.round(value))));
        return result(requestId, true, { captionSize });
      }
      case "capture-frame":
        player.captureFrame();
        return result(requestId, true);
      case "toggle-fullscreen":
        player.toggleFullscreen();
        return result(requestId, true);
      case "enter-fullscreen":
        void (video ?? document.documentElement).requestFullscreen?.().catch(() => {});
        return result(requestId, true);
      case "exit-fullscreen":
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        return result(requestId, true);
      case "toggle-picture-in-picture":
        player.togglePictureInPicture();
        return result(requestId, true);
      case "request-state":
        sendState();
        return result(requestId, true, { state: state() });
      default:
        return result(requestId, false, { error: `Unsupported command: ${command}` });
    }
  }

  function attach(element) {
    if (video === element) return;
    video = element;
    for (const [type, handler] of [
      ["play", scheduleState], ["pause", scheduleState], ["timeupdate", scheduleState],
      ["volumechange", scheduleState], ["ratechange", scheduleState], ["seeked", scheduleState],
      ["ended", () => send("ended", {})],
    ]) {
      video.addEventListener(type, handler);
    }
    applyCaptionStyle();
    sendState("ready");
  }

  function watchForVideo() {
    const existing = document.querySelector("video");
    if (existing) attach(existing);
    const observer = new MutationObserver(() => {
      const element = document.querySelector("video");
      if (element) attach(element);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  bridge.onRelay("frame", (payload) => {
    if (!payload) return;
    if (payload.kind === "configuration") {
      configuration = payload.configuration;
      return;
    }
    if (payload.kind === "context") {
      context = payload.context;
      captionSize = context.playback.captions.style.fontSizePx;
      shortcuts.setContext(context);
      applyCaptionStyle();
      if (video) sendState();
      return;
    }
    if (payload.kind === "command") {
      runCommand(payload);
      return;
    }
    if (payload.kind === "screenshot") {
      void capture(payload.request.screenshot);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!shortcuts.handleKeyDown(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("keyup", (event) => {
    if (!shortcuts.handleKeyUp(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("fullscreenchange", scheduleState);
  document.addEventListener("enterpictureinpicture", scheduleState, true);
  document.addEventListener("leavepictureinpicture", scheduleState, true);

  watchForVideo();
  bridge.relay("top", { kind: "frame-ready" });
})();
