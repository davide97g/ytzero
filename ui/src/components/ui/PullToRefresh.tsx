import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown } from "lucide-react";
import {
  dampPullDistance,
  isAbandonedPull,
  isPullGesture,
  pullProgress,
  resolvePullPhase,
  PULL_COMMIT_DURATION,
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
 * Pull-down-to-refresh for the window scroller. Renders only its indicator, and
 * the indicator only owns the gesture: it follows the finger below the top bar,
 * turns its arrow upward once the pull arms the refresh, then commits and gets
 * out of the way. The running refresh is reported by the top bar's own sweep, so
 * the dial never competes with it.
 *
 * The indicator is portalled to the body: the page layout raises its own
 * stacking context, so an indicator rendered in place could only ever draw
 * behind the top bar.
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
  const [busy, setBusy] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<PullPhase>("idle");
  const busyRef = useRef(false);
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
    let commitTimer: number | null = null;

    const paint = (next: number, progress: number) => {
      indicator.style.setProperty("--pull-distance", `${next}px`);
      indicator.style.setProperty("--pull-progress", `${progress}`);
    };

    const enter = (next: PullPhase) => {
      if (!mounted || phaseRef.current === next) return;
      phaseRef.current = next;
      setPhase(next);
    };

    const markBusy = (next: boolean) => {
      busyRef.current = next;
      if (mounted) setBusy(next);
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
      // The commit plays from where the finger let go and runs to its own
      // rhythm; the refresh can finish sooner or much later.
      paint(PULL_REST_DISTANCE, 1);
      enter("committing");
      markBusy(true);
      commitTimer = window.setTimeout(() => {
        commitTimer = null;
        settle();
      }, PULL_COMMIT_DURATION);
      try {
        await onRefreshRef.current();
      } finally {
        markBusy(false);
      }
    }

    function onTouchCancel() {
      detach();
      settle();
    }

    const onTouchStart = (event: TouchEvent) => {
      if (disabledRef.current || busyRef.current || phaseRef.current === "committing") return;
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
      if (commitTimer !== null) window.clearTimeout(commitTimer);
      window.removeEventListener("touchstart", onTouchStart);
      detach();
    };
  }, []);

  return createPortal(
    <div className="ui-pull-to-refresh" data-phase={phase} ref={indicatorRef}>
      <div className="ui-pull-to-refresh__dial" aria-hidden="true">
        <span className="ui-pull-to-refresh__glyph"><ArrowDown /></span>
      </div>
      <span className="sr-only" role="status" aria-live="polite">{busy ? busyLabel : ""}</span>
    </div>,
    document.body,
  );
}
