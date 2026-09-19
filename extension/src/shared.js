// Plain (non-module) shared code: content scripts, the classic service worker
// and the options page all load this file directly.
(function (global) {
  const DEFAULT_SETTINGS = {
    instanceUrl: "https://ytzero.davideghiotto.it",
    enabled: true,
    openInNewTab: false,
    redirectDirectLoads: true,
  };

  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
  const YT_NO_REDIRECT_MARKER = "ytNoRedirect";

  function normalizeInstanceUrl(value) {
    const raw = (value ?? "").trim();
    if (!raw) return null;
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    } catch {
      return null;
    }
  }

  function loadSettings() {
    return chrome.storage.sync.get(DEFAULT_SETTINGS).then((stored) => ({ ...DEFAULT_SETTINGS, ...stored }));
  }

  // Mirrors ui/src/youtubeUrl.ts so the extension and the app agree on what a
  // YouTube video URL is and when a link opts out of redirection.
  function youtubeVideoId(value) {
    try {
      const url = new URL(value, "https://www.youtube.com");
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      let id;
      if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0];
      else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
        if (url.pathname === "/watch") id = url.searchParams.get("v");
        else if (/^\/(?:shorts|live|embed)\//.test(url.pathname)) id = url.pathname.split("/")[2];
      } else if (host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")) {
        if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2];
      }
      return id && VIDEO_ID_PATTERN.test(id) ? id : null;
    } catch {
      return null;
    }
  }

  function hasNoRedirectMarker(value) {
    try {
      const url = new URL(value, "https://www.youtube.com");
      return url.hash.slice(1).split("&").includes(YT_NO_REDIRECT_MARKER);
    } catch {
      return false;
    }
  }

  // YouTube writes start offsets as `90`, `90s` or `1h2m3s`; YT Zero reads `t`
  // as plain seconds.
  function startSeconds(value) {
    try {
      const url = new URL(value, "https://www.youtube.com");
      const raw = (url.searchParams.get("t") ?? url.searchParams.get("start") ?? "").trim();
      if (!raw) return null;
      if (/^\d+$/.test(raw)) return Number(raw) || null;
      const parts = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
      if (!parts) return null;
      const seconds = Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
      return seconds > 0 ? seconds : null;
    } catch {
      return null;
    }
  }

  function ytZeroWatchUrl(instanceUrl, sourceUrl) {
    const id = youtubeVideoId(sourceUrl);
    if (!id) return null;
    const target = new URL(`${instanceUrl}/watch/${id}`);
    const t = startSeconds(sourceUrl);
    if (t !== null) target.searchParams.set("t", String(t));
    return target.toString();
  }

  global.YTZ = {
    DEFAULT_SETTINGS,
    YT_NO_REDIRECT_MARKER,
    normalizeInstanceUrl,
    loadSettings,
    youtubeVideoId,
    hasNoRedirectMarker,
    startSeconds,
    ytZeroWatchUrl,
  };
})(globalThis);
