import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  dampPullDistance,
  isAbandonedPull,
  isPullGesture,
  pullProgress,
  resolvePullPhase,
  PULL_REST_DISTANCE,
  PULL_START_SLOP,
  type PullPhase,
} from "./pullToRefreshGesture";
import "./PullToRefresh.css";

/** A touch that starts inside an already scrolled region belongs to that region. */
function startsInsideScrolledRegion(target: EventTarget | null): boolean {
  let node = target instanceof Element ? target : null;
  while (node) {
    if (node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Pull-down-to-refresh for the window scroller. Renders only its indicator: it
 * slides out from under the top bar, winds its glyph as the pull progresses,
 * and runs `onRefresh` when a pull past the trigger is released.
 */
export function PullToRefresh({
  onRefresh,
  busyLabel,
  disabled = false,
}: {
  onRefresh: () => void | Promise<void>;
  /** Announced to screen readers while the refresh runs. */
  busyLabel: string;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<PullPhase>("idle");
  const indicatorRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<PullPhase>("idle");
  const onRefreshRef = useRef(onRefresh);
  const disabledRef = useRef(disabled);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    let mounted = true;
    let origin: { x: number; y: number } | null = null;
    let owned = false;
    let distance = 0;

    const paint = (next: number, progress: number) => {
      indicator.style.setProperty("--pull-distance", `${next}px`);
      indicator.style.setProperty("--pull-progress", `${progress}`);
    };

    const enter = (next: PullPhase) => {
      if (!mounted || phaseRef.current === next) return;
      phaseRef.current = next;
      setPhase(next);
    };

    const settle = () => {
      distance = 0;
      paint(0, 0);
      enter("idle");
    };

    const detach = () => {
      origin = null;
      owned = false;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };

    function onTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!origin || !touch) return;
      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;

      if (!owned) {
        if (isAbandonedPull(deltaX, deltaY)) {
          detach();
          return;
        }
        if (!isPullGesture(deltaX, deltaY)) return;
        owned = true;
      }
      if (window.scrollY > 0) {
        settle();
        detach();
        return;
      }

      // Owning the gesture means owning the overscroll: without this the page
      // rubber-bands (or the browser runs its own refresh) under the indicator.
      if (event.cancelable) event.preventDefault();
      distance = dampPullDistance(deltaY - PULL_START_SLOP);
      const progress = pullProgress(distance);
      paint(distance, progress);
      enter(resolvePullPhase(distance));
    }

    async function onTouchEnd() {
      const armed = owned && phaseRef.current === "armed";
      detach();
      if (!armed) {
        settle();
        return;
      }
      paint(PULL_REST_DISTANCE, 1);
      enter("refreshing");
      try {
        await onRefreshRef.current();
      } finally {
        settle();
      }
    }

    function onTouchCancel() {
      detach();
      settle();
    }

    const onTouchStart = (event: TouchEvent) => {
      if (disabledRef.current || phaseRef.current === "refreshing") return;
      if (event.touches.length !== 1 || window.scrollY > 0) return;
      if (startsInsideScrolledRegion(event.target)) return;
      const touch = event.touches[0];
      origin = { x: touch.clientX, y: touch.clientY };
      owned = false;
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
      window.addEventListener("touchcancel", onTouchCancel);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      mounted = false;
      window.removeEventListener("touchstart", onTouchStart);
      detach();
    };
  }, []);

  return <div className="ui-pull-to-refresh" data-phase={phase} ref={indicatorRef}>
    <div className="ui-pull-to-refresh__dial" aria-hidden="true">
      <span className="ui-pull-to-refresh__glyph"><RefreshCw /></span>
    </div>
    <span className="sr-only" role="status" aria-live="polite">{phase === "refreshing" ? busyLabel : ""}</span>
  </div>;
}
