// CustomEvent transport plus the extension-internal relay envelope. Detail is
// always a JSON string so it survives the isolated-world boundary.
(function (global) {
  const RELAY = "ytzero:enhance:relay";

  function dispatchEvent(name, payload, options = {}) {
    return document.dispatchEvent(new CustomEvent(name, {
      detail: JSON.stringify(payload),
      cancelable: Boolean(options.cancelable),
    }));
  }

  function parseDetail(event) {
    if (typeof event?.detail !== "string") return null;
    try {
      return JSON.parse(event.detail);
    } catch {
      return null;
    }
  }

  /** @param to "frame" for the embedded player, "top" for the YT Zero page. */
  function relay(to, payload) {
    try {
      chrome.runtime.sendMessage({ type: RELAY, to, payload });
    } catch {
      // The worker restarts between messages; a dropped relay is recoverable
      // because the next context/state publish repeats the state.
    }
  }

  function onRelay(to, handler) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type !== RELAY || message.to !== to) return;
      handler(message.payload);
    });
  }

  global.YTZEnhance = {
    ...(global.YTZEnhance ?? {}),
    bridge: { RELAY, dispatchEvent, parseDetail, relay, onRelay },
  };
})(globalThis);
