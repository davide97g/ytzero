// Service worker source. `ui/vite.config.ts` copies this file into the build
// with the build id below filled in, which is the whole point of that
// placeholder: a browser only notices a deployment when the worker script's
// bytes change, and nothing else in this file does.
//
// YT Zero keeps no offline cache. The worker exists so the app can be
// installed and so a new deployment can reach pages that are already open:
// ui/src/pwaUpdates.ts sends SKIP_WAITING once a reload is safe, and the claim
// below moves every open page onto the new build.
const BUILD_ID = "__BUILD_ID__";

// There is deliberately no install handler calling skipWaiting(): the new
// worker waits until the page asks for it, so a reload never lands in the
// middle of playback or a half-typed form.

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const message = event.data;
  if (message?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  // Lets a page (or a developer console) ask which build is serving it.
  if (message?.type === "BUILD_ID") event.source?.postMessage({ type: "BUILD_ID", buildId: BUILD_ID });
});
