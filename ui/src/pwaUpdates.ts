import { BUILD_ID } from "./buildId";
import {
  hasActivePlayback,
  isStaleBuild,
  shouldApplyUpdate,
  shouldReloadOnControllerChange,
  shouldReloadStaleBuild,
} from "./pwaUpdatePolicy";

const SW_URL = "/sw.js";

/**
 * How often an open page asks the server whether a new build was deployed.
 * Browsers only check on navigation, and an installed PWA can stay open for
 * days — without this poll a deployment would not arrive until the viewer
 * force-quit the app. The same tick retries an update that is already waiting.
 */
const CHECK_INTERVAL_MS = 60_000;

/** Remembers a stale-build reload across the reload itself. */
const STALE_RELOAD_KEY = "pwa_stale_reload_at";

function isEditing(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return active.isContentEditable
    || active instanceof HTMLInputElement
    || active instanceof HTMLTextAreaElement
    || active instanceof HTMLSelectElement;
}

function readLastStaleReload(): number | null {
  try {
    const stored = sessionStorage.getItem(STALE_RELOAD_KEY);
    return stored === null ? null : Number(stored);
  } catch {
    return null; // Private mode, or storage the viewer blocked. Reload anyway.
  }
}

function rememberStaleReload(now: number): void {
  try {
    sessionStorage.setItem(STALE_RELOAD_KEY, String(now));
  } catch {
    // Not being able to write it only costs the cooldown, not the update.
  }
}

/**
 * Registers the service worker and applies deployments on its own.
 *
 * The new worker waits (see ui/sw.template.js) until this page hands the app
 * over to it, which happens as soon as the reload costs nothing: leaving the
 * app, or sitting on a screen with no playback and nothing being typed. The
 * worker then claims the page and the `controllerchange` below reloads it onto
 * the new build.
 *
 * Coming back is handled separately, because iOS freezes an installed app the
 * moment it leaves the screen — usually before the handover finishes and often
 * dropping `controllerchange` entirely. So every resume also asks the worker
 * which build it was cut from, and a page older than its worker reloads on the
 * spot. That is what makes closing the app once enough to be on the new build.
 */
export function initPwaUpdates(): void {
  if (!("serviceWorker" in navigator)) return;
  if ((import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) {
    // The worker is emitted by the production build only. Clear a leftover
    // registration so a dev server is never served by a stale build.
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => registrations.forEach((registration) => void registration.unregister()))
      .catch(() => {});
    return;
  }

  let reloading = false;
  let sawNewWorker = false;
  /** Whether this document has ever left the screen. See `askWorkerBuild`. */
  let wasBackgrounded = false;
  const hadController = Boolean(navigator.serviceWorker.controller);

  const reloadNow = () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!shouldReloadOnControllerChange({ hadController, sawNewWorker })) return;
    reloadNow();
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    const message = event.data as { type?: string; buildId?: unknown } | null;
    if (message?.type !== "BUILD_ID") return;
    if (!isStaleBuild(BUILD_ID, message.buildId)) return;
    const now = Date.now();
    if (!shouldReloadStaleBuild({ lastAttemptAt: readLastStaleReload(), now })) return;
    rememberStaleReload(now);
    reloadNow();
  });

  /**
   * Answered by the message listener above, if at all.
   *
   * Only worth asking once the app has been backgrounded, because a mismatch
   * means the opposite thing on either side of that. A document that has been
   * away and comes back to a worker from another build is behind it. A document
   * that has never been away and sees one is a cold start on fresh HTML being
   * served by the previous build's worker, which is about to be replaced by the
   * usual waiting-worker path — reloading for that would only flash the app.
   */
  const askWorkerBuild = () => {
    if (reloading || !wasBackgrounded) return;
    navigator.serviceWorker.controller?.postMessage({ type: "BUILD_ID" });
  };

  const start = () => { void register(); };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });

  async function register(): Promise<void> {
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    } catch {
      return; // No worker: the app still runs, it just updates on the next load.
    }

    const apply = () => {
      const waiting = registration.waiting;
      const ready = shouldApplyUpdate({
        editing: isEditing(),
        hidden: document.visibilityState === "hidden",
        playing: hasActivePlayback(document.querySelectorAll<HTMLMediaElement>("audio, video")),
        waitingWorker: Boolean(waiting),
      });
      if (!ready) return;
      waiting!.postMessage({ type: "SKIP_WAITING" });
    };

    const check = () => {
      if (reloading) return;
      // Re-asked on every tick, not only on resume: an answer that never came
      // back costs at most one interval rather than the whole session.
      askWorkerBuild();
      if (registration.waiting) {
        apply();
        return;
      }
      void registration.update().catch(() => {});
    };

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      // Nothing active and nothing controlling this page: a first installation,
      // which has no previous build to replace.
      if (!installing || !(hadController || registration.active)) return;
      installing.addEventListener("statechange", () => {
        if (installing.state !== "installed") return;
        sawNewWorker = true;
        apply();
      });
    });

    // A build can already be waiting from an earlier visit in this tab.
    if (registration.waiting && (hadController || registration.active)) {
      sawNewWorker = true;
      apply();
    }

    // Leaving the app is the last chance to hand over before iOS freezes the
    // page, so the swap is asked for directly rather than through `check` — a
    // network round trip started here would not survive the freeze anyway.
    const leave = () => {
      wasBackgrounded = true;
      apply();
    };
    // Coming back is the other half: the handover may have completed while
    // frozen, in which case this page is already behind its own worker and
    // `check` says so.
    const resume = () => { check(); };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") leave();
      else resume();
    });
    // iOS reports a backgrounded standalone app more reliably through the page
    // lifecycle than through visibility alone, and a restored page arrives on
    // `pageshow` without a visibility change of its own.
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", resume);
    window.addEventListener("online", check);

    window.setInterval(check, CHECK_INTERVAL_MS);
    check();
  }
}
