import { useCallback, useEffect, useRef, useState } from "react";
import { restoreSidebarVisibility } from "../app-shell/sidebarVisibility";
import { SHORTCUT_CLOSE_EVENT } from "../keyboardShortcuts";

const CINEMA_MODE_KEY = "watchCinemaMode";
const IMMERSIVE_MODE_KEY = "watchImmersiveMode";

/**
 * Theater and immersive presentation of the watch player. Both are two views of
 * the same player, so entering one always leaves the other: the layout never
 * carries both sets of rules. Each mode persists across reloads, and both own a
 * body class that the page CSS reads.
 */
export function useWatchModes() {
  const [cinemaMode, setCinemaMode] = useState(() => localStorage.getItem(CINEMA_MODE_KEY) === "1");
  const [cinemaVisible, setCinemaVisible] = useState(() => localStorage.getItem(CINEMA_MODE_KEY) === "1");
  const [immersiveMode, setImmersiveMode] = useState(() => localStorage.getItem(IMMERSIVE_MODE_KEY) === "1");

  const cinemaModeRef = useRef(cinemaMode);
  cinemaModeRef.current = cinemaMode;
  const immersiveModeRef = useRef(immersiveMode);
  immersiveModeRef.current = immersiveMode;

  const toggleCinemaMode = useCallback((next?: boolean) => {
    const value = next ?? !cinemaModeRef.current;
    setCinemaMode(value);
    if (value) setImmersiveMode(false);
  }, []);
  const toggleImmersiveMode = useCallback((next?: boolean) => {
    const value = next ?? !immersiveModeRef.current;
    setImmersiveMode(value);
    if (value) setCinemaMode(false);
  }, []);
  const closeWatchMode = useCallback(() => {
    if (document.querySelector(".ui-dialog")) document.dispatchEvent(new Event(SHORTCUT_CLOSE_EVENT));
    else if (document.fullscreenElement) void document.exitFullscreen?.();
    else if ((document as any).pictureInPictureElement) void (document as any).exitPictureInPicture?.();
    else if (immersiveModeRef.current) setImmersiveMode(false);
    else setCinemaMode(false);
  }, []);

  // Cinema class lifecycle — separated from key listener so cleanup doesn't
  // prematurely remove the class when transitioning out.
  useEffect(() => {
    localStorage.setItem(CINEMA_MODE_KEY, cinemaMode ? "1" : "0");
    if (cinemaMode) {
      document.body.classList.add("cinema", "sidebar-hidden");
      requestAnimationFrame(() => requestAnimationFrame(() => setCinemaVisible(true)));
    } else {
      setCinemaVisible(false);
      const t = setTimeout(() => {
        restoreSidebarVisibility();
      }, 400);
      return () => {
        clearTimeout(t);
        restoreSidebarVisibility();
      };
    }
  }, [cinemaMode]);

  // Immersive owns the whole viewport: the app chrome is hidden by CSS on the
  // body class, so leaving the mode (or the page) only has to drop the class.
  useEffect(() => {
    localStorage.setItem(IMMERSIVE_MODE_KEY, immersiveMode ? "1" : "0");
    if (!immersiveMode) return;
    document.body.classList.add("immersive");
    return () => document.body.classList.remove("immersive");
  }, [immersiveMode]);

  // Unmount: clean cinema mode without overriding the user's saved sidebar state.
  useEffect(() => restoreSidebarVisibility, []);

  return {
    cinemaMode,
    cinemaVisible,
    immersiveMode,
    setCinemaMode,
    setImmersiveMode,
    toggleCinemaMode,
    toggleImmersiveMode,
    closeWatchMode,
  };
}
