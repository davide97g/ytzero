// Keydown/keyup state machine for the configurable shortcuts. It owns the
// current playback rate so rapid presses accumulate, and it never touches the
// DOM directly: everything goes through the injected player adapter.
(function (global) {
  const { contract, matcher } = global.YTZEnhance;

  const RATE_MIN = 0.25;
  const RATE_MAX = 2;
  const RATE_STEP = 0.25;
  const VOLUME_STEP = 0.05;
  const CAPTION_SIZE_MIN = 12;
  const CAPTION_SIZE_MAX = 48;
  const BOOST_RATE = 2;
  const BOOST_HOLD_MS = 220;
  const CHAPTER_HYSTERESIS_SECONDS = 1;

  // Holding these down is meaningful; everything else ignores auto-repeat.
  const REPEATABLE = new Set([
    "seekBack", "seekForward", "seekBack10", "seekForward10",
    "volumeUp", "volumeDown", "previousFrame", "nextFrame",
  ]);
  // Blocked while the active content type is a livestream.
  const LIVE_BLOCKED = new Set([
    "temporaryBoost", "previousFrame", "nextFrame", "speedDown", "speedUp", "seekPercent",
  ]);
  // Blocked while a Watch Together follower is bound to the host's transport.
  const TRANSPORT_BLOCKED = new Set([
    "togglePlay", "temporaryBoost", "seekBack", "seekForward", "seekBack10", "seekForward10",
    "seekPercent", "previousChapter", "nextChapter", "previousFrame", "nextFrame",
    "speedDown", "speedUp", "previousVideo", "nextVideo",
  ]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundRate(value) {
    return Math.round(value * 100) / 100;
  }

  function createShortcutController(options) {
    const player = options.player;
    const emit = options.emit ?? (() => {});
    const now = options.now ?? (() => Date.now());
    const schedule = options.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    const unschedule = options.clearTimeout ?? ((handle) => clearTimeout(handle));

    let context = null;
    let bindings = { ...contract.DEFAULT_SHORTCUTS };
    let ownedRate = 1;
    let boost = null;

    function isLive() {
      return context?.video.contentType === "livestream";
    }

    function seekSeconds() {
      return context?.playback.keyboardSeekSeconds ?? 5;
    }

    function setOwnedRate(value) {
      ownedRate = isLive() ? 1 : roundRate(clamp(value, RATE_MIN, RATE_MAX));
      return ownedRate;
    }

    function cancelBoost() {
      if (!boost) return;
      unschedule(boost.timer);
      boost = null;
    }

    /**
     * Installs a new context atomically: old chords stop matching in the same
     * tick, and the owned rate re-initializes for a new video.
     */
    function setContext(next) {
      const previousVideoId = context?.video.id ?? null;
      context = next;
      bindings = next?.playback.keyboardShortcuts ?? { ...contract.DEFAULT_SHORTCUTS };
      if (!next) return;
      if (next.video.id !== previousVideoId || isLive()) {
        cancelBoost();
        setOwnedRate(isLive() ? 1 : next.playback.rate);
      }
    }

    /** Keeps the owned rate truthful when the parent changes it by command. */
    function noteExternalRate(value) {
      if (Number.isFinite(value)) setOwnedRate(value);
    }

    function currentRate() {
      return ownedRate;
    }

    function report(action, event, value) {
      emit({
        action,
        key: event.key ?? "",
        code: event.code ?? "",
        repeat: Boolean(event.repeat),
        ...(typeof value === "number" ? { value } : {}),
        modifiers: {
          alt: Boolean(event.altKey),
          ctrl: Boolean(event.ctrlKey),
          meta: Boolean(event.metaKey),
          shift: Boolean(event.shiftKey),
        },
      });
    }

    function seekBy(seconds) {
      const time = player.currentTime();
      const duration = player.duration();
      const limit = Number.isFinite(duration) && duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
      player.setCurrentTime(clamp(time + seconds, 0, limit));
    }

    function stepRate(direction, event) {
      const value = setOwnedRate(ownedRate + direction * RATE_STEP);
      player.setPlaybackRate(value);
      report(event.action, event.source, value);
    }

    function chapterSeek(direction) {
      const chapters = context?.playback.chapters ?? [];
      if (chapters.length === 0) return;
      const time = player.currentTime();
      if (direction < 0) {
        // Hysteresis: a press just after a chapter start returns to its start
        // once before stepping back to the previous chapter.
        const previous = [...chapters].reverse()
          .find((chapter) => chapter.start < time - CHAPTER_HYSTERESIS_SECONDS);
        player.setCurrentTime(previous ? previous.start : 0);
        return;
      }
      const next = chapters.find((chapter) => chapter.start > time);
      if (next) player.setCurrentTime(next.start);
    }

    function captionSizeStep(direction) {
      const size = clamp(Math.round(player.captionSize()) + direction, CAPTION_SIZE_MIN, CAPTION_SIZE_MAX);
      player.setCaptionSize(size);
      return size;
    }

    function startBoost(event) {
      cancelBoost();
      const started = now();
      boost = {
        started,
        applied: false,
        timer: schedule(() => {
          if (!boost) return;
          boost.applied = true;
          player.setPlaybackRate(BOOST_RATE);
          report("temporaryBoost", event, BOOST_RATE);
        }, BOOST_HOLD_MS),
      };
    }

    function endBoost(event) {
      if (!boost) return false;
      const applied = boost.applied;
      cancelBoost();
      if (applied) {
        // The boost never overwrites the owned rate, so restore is exact.
        player.setPlaybackRate(ownedRate);
        report("temporaryBoost", event, ownedRate);
      } else {
        player.togglePlay();
        report("togglePlay", event);
      }
      return true;
    }

    /** Shorts keep Up/Down navigation only while nothing else claims them. */
    function shortNavigation(event) {
      if (context?.video.contentType !== "short") return null;
      if (event.code !== "ArrowUp" && event.code !== "ArrowDown") return null;
      const chord = matcher.chordFromEvent(event);
      if (Object.values(bindings).includes(chord)) return null;
      return event.code === "ArrowUp" ? "previousVideo" : "nextVideo";
    }

    function runAction(action, digit, event) {
      switch (action) {
        case "togglePlay":
          player.togglePlay();
          return true;
        case "seekBack10":
          seekBy(-10);
          return true;
        case "seekForward10":
          seekBy(10);
          return true;
        case "seekBack":
          seekBy(-seekSeconds());
          return true;
        case "seekForward":
          seekBy(seekSeconds());
          return true;
        case "previousFrame":
        case "nextFrame": {
          if (!player.isPaused()) return false;
          const fps = context?.playback.frameStepFps ?? 30;
          seekBy((action === "nextFrame" ? 1 : -1) / fps);
          return true;
        }
        case "speedDown":
          stepRate(-1, { action, source: event });
          return "reported";
        case "speedUp":
          stepRate(1, { action, source: event });
          return "reported";
        case "seekPercent": {
          const duration = player.duration();
          if (digit === null || !Number.isFinite(duration) || duration <= 0) return false;
          player.setCurrentTime((duration * digit) / 10);
          return true;
        }
        case "previousChapter":
          chapterSeek(-1);
          return true;
        case "nextChapter":
          chapterSeek(1);
          return true;
        case "volumeUp":
        case "volumeDown":
          player.setVolume(clamp(player.volume() + (action === "volumeUp" ? VOLUME_STEP : -VOLUME_STEP), 0, 1));
          return true;
        case "toggleMute":
          player.setMuted(!player.muted());
          return true;
        case "toggleCaptions":
          player.toggleCaptions();
          return true;
        case "subtitleLarger":
          captionSizeStep(1);
          return true;
        case "subtitleSmaller":
          captionSizeStep(-1);
          return true;
        case "toggleFullscreen":
          player.toggleFullscreen();
          return true;
        case "togglePictureInPicture":
          player.togglePictureInPicture();
          return true;
        case "screenshot":
          player.captureFrame();
          return true;
        default:
          return false;
      }
    }

    /** @returns true when the event was consumed and the caller should stop it. */
    function handleKeyDown(event) {
      if (!context?.active) return false;
      const match = matcher.matchAction(bindings, event);
      const action = match?.action ?? shortNavigation(event);
      if (!action) return false;

      const parentOwned = contract.PARENT_OWNED_ACTIONS.has(action);
      if (event.repeat && (parentOwned || !REPEATABLE.has(action))) return true;

      // Consume restricted actions without mutating playback or claiming success.
      if (isLive() && LIVE_BLOCKED.has(action)) return true;
      if (context.playback.transportLocked && TRANSPORT_BLOCKED.has(action)) return true;

      if (parentOwned) {
        report(action, event);
        return true;
      }

      if (action === "temporaryBoost") {
        startBoost(event);
        return true;
      }

      const result = runAction(action, match?.digit ?? null, event);
      if (result === "reported") return true;
      if (result) report(action, event);
      return true;
    }

    function handleKeyUp(event) {
      if (!context?.active) return false;
      const boostChord = bindings.temporaryBoost;
      if (!boostChord || !boost) return false;
      if (!matcher.matchesChord(boostChord, event)) return false;
      return endBoost(event);
    }

    return {
      setContext,
      noteExternalRate,
      currentRate,
      handleKeyDown,
      handleKeyUp,
      get context() { return context; },
      get bindings() { return bindings; },
    };
  }

  global.YTZEnhance = {
    ...(global.YTZEnhance ?? {}),
    controller: { createShortcutController, RATE_MIN, RATE_MAX, RATE_STEP, BOOST_HOLD_MS },
  };
})(globalThis);
