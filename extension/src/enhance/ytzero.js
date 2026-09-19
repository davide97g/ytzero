// Runs in the top frame of the configured YT Zero instance. Owns configuration
// discovery, the ready/context handshake, the status badge, and the routing of
// commands and screenshot requests to the embedded player frame.
(function () {
  const { contract, bridge } = globalThis.YTZEnhance;
  if (window.top !== window) return;

  let configuration = null;
  let events = contract.EVENTS;
  let frameReady = false;
  let statusMarked = false;
  let lastContext = null;

  function readConfiguration() {
    const element = document.getElementById(contract.CONFIGURATION_ELEMENT_ID);
    if (!element) return false;
    const parsed = contract.parseConfiguration(element.textContent ?? "");
    if (!parsed.ok) {
      // Keep the last valid configuration as a resilience cache, but never
      // enable integration against a contract this build does not understand.
      console.warn(`YT Zero Enhance: ignoring configuration (${parsed.reason})`);
      return false;
    }
    configuration = parsed.configuration;
    events = { ...contract.EVENTS, ...configuration.bridge.events };
    if (configuration.enabled) bridge.relay("frame", { kind: "configuration", configuration });
    return true;
  }

  function watchConfiguration() {
    readConfiguration();
    const observer = new MutationObserver(() => readConfiguration());
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  // The page publishes `contentType`; the route is only the legacy fallback.
  function legacyContentType() {
    return location.pathname.startsWith("/shorts") ? "short" : "default";
  }

  function markExtensionActive() {
    if (statusMarked || !configuration?.enabled) return;
    const status = configuration.bridge.extensionStatus;
    const element = document.getElementById(status.elementId);
    if (!element) return;
    element.setAttribute(status.attribute, status.activeValue);
    statusMarked = true;
  }

  function enabled() {
    return Boolean(configuration?.enabled);
  }

  function onContext(event) {
    if (!enabled()) return;
    const context = contract.parseContext(bridge.parseDetail(event), legacyContentType(), (action, value) => {
      console.warn(`YT Zero Enhance: disabling shortcut "${action}" with an invalid chord`, value);
    });
    if (!context) return;
    lastContext = context;
    bridge.relay("frame", { kind: "context", context });
  }

  // Both requests are cancelable: claiming them synchronously is what tells YT
  // Zero the extension, not the page, will do the work.
  function onPlayerCommand(event) {
    if (!enabled() || !frameReady) return;
    const message = bridge.parseDetail(event);
    if (!message || message.version !== contract.BRIDGE_VERSION) return;
    if (typeof message.requestId !== "string" || typeof message.command !== "string") return;
    event.preventDefault();
    bridge.relay("frame", {
      kind: "command",
      requestId: message.requestId,
      videoId: message.videoId,
      command: message.command,
      payload: message.payload ?? {},
    });
  }

  function onScreenshotRequest(event) {
    if (!enabled() || !frameReady) return;
    const request = contract.parseScreenshotRequest(bridge.parseDetail(event));
    if (!request) return;
    event.preventDefault();
    bridge.relay("frame", { kind: "screenshot", request });
  }

  function fromFrame(payload) {
    if (!payload || !enabled()) return;
    if (payload.kind === "frame-ready") {
      frameReady = true;
      markExtensionActive();
      // A frame that loads after the context was published needs it replayed.
      if (lastContext) bridge.relay("frame", { kind: "context", context: lastContext });
      if (configuration) bridge.relay("frame", { kind: "configuration", configuration });
      return;
    }
    if (payload.kind === "player-event") {
      bridge.dispatchEvent(events.playerEvent, {
        version: contract.BRIDGE_VERSION,
        videoId: payload.videoId,
        type: payload.type,
        payload: payload.payload,
      });
      return;
    }
    if (payload.kind === "screenshot-result") {
      bridge.dispatchEvent(events.screenshotResult, {
        version: contract.BRIDGE_VERSION,
        status: payload.status === "saved" ? "saved" : "error",
      });
    }
  }

  // Listeners must exist before `ready`, or the context answer is missed.
  document.addEventListener(contract.EVENTS.context, onContext);
  document.addEventListener(contract.EVENTS.playerCommand, onPlayerCommand);
  document.addEventListener(contract.EVENTS.screenshotRequest, onScreenshotRequest);
  bridge.onRelay("top", fromFrame);

  watchConfiguration();
  bridge.dispatchEvent(contract.EVENTS.ready, {});

  // The status node and the watch page both mount after the first paint.
  const observer = new MutationObserver(() => markExtensionActive());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
