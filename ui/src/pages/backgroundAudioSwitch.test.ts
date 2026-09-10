import { expect, test } from "bun:test";
import { decideBackgroundAudioSwitch, isPlayingState } from "./backgroundAudioSwitch";

const base = {
  audioActive: false,
  audioModeAvailable: true,
  backgroundActive: false,
  enabled: true,
  hidden: true,
  playing: true,
  touchDevice: true,
};

test("hands a playing video to audio mode when the page is hidden", () => {
  expect(decideBackgroundAudioSwitch(base)).toBe("enter");
});

test("keeps the video player when the hand-off is not wanted or not possible", () => {
  expect(decideBackgroundAudioSwitch({ ...base, enabled: false })).toBe("none");
  expect(decideBackgroundAudioSwitch({ ...base, touchDevice: false })).toBe("none");
  expect(decideBackgroundAudioSwitch({ ...base, audioModeAvailable: false })).toBe("none");
  expect(decideBackgroundAudioSwitch({ ...base, playing: false })).toBe("none");
});

test("leaves a viewer who already chose audio mode alone", () => {
  expect(decideBackgroundAudioSwitch({ ...base, audioActive: true })).toBe("none");
  expect(decideBackgroundAudioSwitch({ ...base, backgroundActive: true })).toBe("none");
});

test("returns to the video player when the page becomes visible again", () => {
  expect(decideBackgroundAudioSwitch({ ...base, backgroundActive: true, hidden: false })).toBe("exit");
  // The setting no longer matters: an automatic hand-off is always released.
  expect(decideBackgroundAudioSwitch({ ...base, backgroundActive: true, enabled: false, hidden: false })).toBe("exit");
});

test("stays in audio mode when playback was paused from the lock screen", () => {
  expect(decideBackgroundAudioSwitch({ ...base, backgroundActive: true, hidden: false, playing: false })).toBe("none");
});

test("does not release a mode the viewer chose themselves", () => {
  expect(decideBackgroundAudioSwitch({ ...base, audioActive: true, hidden: false })).toBe("none");
});

test("reads playing and buffering as playback", () => {
  expect(isPlayingState(1)).toBe(true);
  expect(isPlayingState(3)).toBe(true);
  expect(isPlayingState(2)).toBe(false);
  expect(isPlayingState(0)).toBe(false);
  expect(isPlayingState(undefined)).toBe(false);
});
