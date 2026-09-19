// Turns a plain left click on a YouTube video link into a YT Zero watch page.
// Modified clicks (new tab, new window, download) keep YouTube's own behavior.
(function () {
  const { loadSettings, hasNoRedirectMarker, ytZeroWatchUrl, youtubeVideoId } = globalThis.YTZ;
  let settings = null;

  loadSettings().then((loaded) => {
    settings = loaded;
    redirectDirectLoad();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !settings) return;
    for (const [key, change] of Object.entries(changes)) settings[key] = change.newValue;
  });

  function instance() {
    if (!settings?.enabled) return null;
    return globalThis.YTZ.normalizeInstanceUrl(settings.instanceUrl);
  }

  function open(target, newTab) {
    chrome.runtime.sendMessage({ type: "ytzero:open", url: target, newTab: !!newTab });
  }

  // A direct load of youtube.com/watch (typed, bookmarked, opened from another
  // app) never goes through a click, so handle it separately.
  function redirectDirectLoad() {
    const base = instance();
    if (!base || !settings.redirectDirectLoads) return;
    const here = location.href;
    if (hasNoRedirectMarker(here) || !youtubeVideoId(here)) return;
    const target = ytZeroWatchUrl(base, here);
    if (target) open(target, false);
  }

  // Safety net: if YouTube's own SPA router wins the click, the URL still ends
  // up on a watch page, so redirect from there.
  document.addEventListener("yt-navigate-finish", () => redirectDirectLoad());
  window.addEventListener("popstate", () => redirectDirectLoad());

  document.addEventListener("click", (event) => {
    const base = instance();
    if (!base) return;
    if (event.defaultPrevented || event.button !== 0) return;
    const newTab = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;

    // composedPath crosses the shadow roots YouTube's Polymer elements use.
    const anchor = event.composedPath().find((node) => node?.tagName === "A" && node.href);
    if (!anchor || hasNoRedirectMarker(anchor.href)) return;

    const target = ytZeroWatchUrl(base, anchor.href);
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    open(target, newTab || settings.openInNewTab);
  }, true);
})();
