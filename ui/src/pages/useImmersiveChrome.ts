import { useCallback, useEffect, useRef, useState } from "react";
import { IMMERSIVE_IDLE_MS, isImmersivePointerActivity, shouldHideImmersiveChrome, type PointerPoint } from "./immersiveChrome";

/**
 * Immersive mode keeps a single overlay bar over the player and clears it once
 * the viewer holds still. Hover or focus on that bar holds it open so its own
 * controls never vanish under the cursor.
 */
export function useImmersiveChrome(active: boolean) {
  const [chromeVisible, setChromeVisible] = useState(true);
  const activeRef = useRef(active);
  const heldRef = useRef(false);
  const pointerRef = useRef<PointerPoint | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  activeRef.current = active;

  const wake = useCallback(() => {
    setChromeVisible(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (shouldHideImmersiveChrome({ active: activeRef.current, held: heldRef.current, idleMs: IMMERSIVE_IDLE_MS })) {
        setChromeVisible(false);
      }
    }, IMMERSIVE_IDLE_MS);
  }, []);

  const holdChrome = useCallback((held: boolean) => {
    heldRef.current = held;
    wake();
  }, [wake]);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      heldRef.current = false;
      pointerRef.current = null;
      setChromeVisible(true);
      return;
    }
    const onPointerMove = (event: PointerEvent) => {
      const next = { x: event.clientX, y: event.clientY };
      const moved = isImmersivePointerActivity(pointerRef.current, next);
      pointerRef.current = next;
      if (moved) wake();
    };
    const onActivity = () => wake();
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerdown", onActivity);
    document.addEventListener("keydown", onActivity);
    document.addEventListener("wheel", onActivity, { passive: true });
    wake();
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", onActivity);
      document.removeEventListener("keydown", onActivity);
      document.removeEventListener("wheel", onActivity);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active, wake]);

  return { chromeVisible: !active || chromeVisible, holdChrome, wakeChrome: wake };
}
