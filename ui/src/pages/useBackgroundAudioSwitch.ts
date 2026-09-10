import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { decideBackgroundAudioSwitch, isPlayingState } from "./backgroundAudioSwitch";

export interface BackgroundAudioContext {
  audioActive: boolean;
  audioModeAvailable: boolean;
  capturePlaybackPosition: () => void;
  enabled: boolean;
  playerState: () => number | undefined;
}

// A hidden page reports the state the browser left behind, so the visible page
// is sampled instead. Short enough that pausing and then locking the phone does
// not read as playback.
const PLAYBACK_SAMPLE_MS = 500;

/**
 * Watch the page visibility and hand playback between the video player and
 * audio mode. The watch page keeps its live values in `context` because the
 * controller that owns them needs the resulting mode as its own input.
 */
export function useBackgroundAudioSwitch(context: RefObject<BackgroundAudioContext>) {
  const [backgroundAudioActive, setBackgroundAudioActive] = useState(false);
  const backgroundActiveRef = useRef(false);
  const playingRef = useRef(false);

  const applyBackgroundAudio = useCallback((active: boolean) => {
    backgroundActiveRef.current = active;
    setBackgroundAudioActive(active);
  }, []);

  useEffect(() => {
    const sample = () => {
      const current = context.current;
      if (!current?.enabled || document.visibilityState !== "visible") return;
      playingRef.current = isPlayingState(current.playerState());
    };
    sample();
    const timer = window.setInterval(sample, PLAYBACK_SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [context]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const current = context.current;
      if (!current) return;
      const hidden = document.visibilityState === "hidden";
      const action = decideBackgroundAudioSwitch({
        audioActive: current.audioActive,
        audioModeAvailable: current.audioModeAvailable,
        backgroundActive: backgroundActiveRef.current,
        enabled: current.enabled,
        hidden,
        // The audio player is the media owner while hidden, so its live state
        // is the one that decides whether returning resumes the video.
        playing: hidden ? playingRef.current : isPlayingState(current.playerState()),
        touchDevice: window.matchMedia("(pointer: coarse)").matches,
      });
      if (action === "none") return;
      current.capturePlaybackPosition();
      applyBackgroundAudio(action === "enter");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [applyBackgroundAudio, context]);

  // Choosing a mode by hand takes the page out of automatic hand-off.
  const releaseBackgroundAudio = useCallback(() => {
    if (backgroundActiveRef.current) applyBackgroundAudio(false);
  }, [applyBackgroundAudio]);

  return { backgroundAudioActive, releaseBackgroundAudio };
}
