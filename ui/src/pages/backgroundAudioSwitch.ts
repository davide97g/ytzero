/**
 * Automatic audio mode for a backgrounded page. Mobile browsers suspend a
 * <video> element as soon as the app leaves the foreground or the screen
 * locks, while an <audio> element keeps playing and owns the lock-screen
 * controls. Hiding the watch page therefore hands playback to audio mode, and
 * returning to it hands playback back to the video player.
 */
export type BackgroundAudioAction = "enter" | "exit" | "none";

/** YT.Player numbering, shared by every watch player: 1 playing, 3 buffering. */
export function isPlayingState(state: number | null | undefined): boolean {
  return state === 1 || state === 3;
}

export function decideBackgroundAudioSwitch({
  audioActive,
  audioModeAvailable,
  backgroundActive,
  enabled,
  hidden,
  playing,
  touchDevice,
}: {
  audioActive: boolean;
  audioModeAvailable: boolean;
  backgroundActive: boolean;
  enabled: boolean;
  hidden: boolean;
  playing: boolean;
  touchDevice: boolean;
}): BackgroundAudioAction {
  // Returning always releases an automatic hand-off, even after the setting was
  // turned off in the meantime, so the page can never stay stuck in audio mode.
  // A paused audio player keeps it: remounting the video player would start
  // playing on its own, which is not what pausing from the lock screen meant.
  if (!hidden) return backgroundActive && playing ? "exit" : "none";
  if (!enabled || !touchDevice) return "none";
  if (backgroundActive || audioActive || !audioModeAvailable || !playing) return "none";
  return "enter";
}
