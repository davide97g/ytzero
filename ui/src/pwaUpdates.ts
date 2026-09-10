import { hasActivePlayback, shouldApplyUpdate, shouldReloadOnControllerChange } from "./pwaUpdatePolicy";

const SW_URL = "/sw.js";

/**
 * How often an open page asks the server whether a new build was deployed.
 * Browsers only check on navigation, and an installed PWA can stay open for
 * days — without this poll a deployment would not arrive until the viewer
 * force-quit the app. The same tick retries an update that is already waiting.
 */
const CHECK_INTERVAL_MS = 60_000;

function isEditing(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return active.isContentEditable
    || active instanceof HTMLInputElement
    || active instanceof HTMLTextAreaElement
    || active instanceof HTMLSelectElement;
}

/**
 * Registers the service worker and applies deployments on its own.
 *
 * The new worker waits (see ui/sw.template.js) until this page hands the app
 * over to it, which happens as soon as the reload costs nothing: no playback
 * running, no field being typed into. The worker then claims the page and the
 * `controllerchange` below reloads it onto the new build.
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
  const hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !shouldReloadOnControllerChange({ hadController, sawNewWorker })) return;
    reloading = true;
    window.location.reload();
  });

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
        playing: hasActivePlayback(document.querySelectorAll<HTMLMediaElement>("audio, video")),
        waitingWorker: Boolean(waiting),
      });
      if (!ready) return;
      waiting!.postMessage({ type: "SKIP_WAITING" });
    };

    const check = () => {
      if (reloading) return;
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

    window.setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener("online", check);
    // Leaving the app and coming back to it are both free moments to swap the
    // build: nothing is on screen, or a fresh start is expected anyway.
    document.addEventListener("visibilitychange", check);
    check();
  }
}
