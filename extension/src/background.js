importScripts("shared.js");

const ENHANCE_SCRIPT_ID = "ytzero-enhance-page";
const ENHANCE_SCRIPT_FILES = [
  "src/enhance/contract.js",
  "src/enhance/matcher.js",
  "src/enhance/controller.js",
  "src/enhance/bridge.js",
  "src/enhance/ytzero.js",
];
const RELAY = "ytzero:enhance:relay";

// The content script proposes a destination; the worker only opens URLs that
// live on the configured YT Zero instance.
async function isAllowed(url) {
  try {
    const base = await instanceOrigin();
    return base ? new URL(url).origin === base : false;
  } catch {
    return false;
  }
}

async function instanceOrigin() {
  const settings = await globalThis.YTZ.loadSettings();
  const base = globalThis.YTZ.normalizeInstanceUrl(settings.instanceUrl);
  return base ? new URL(base).origin : null;
}

/**
 * The instance origin is user-configured, so its content script cannot be
 * declared statically. Re-register it whenever the origin or its permission
 * changes; a missing permission simply leaves the enhance side inactive.
 */
async function syncEnhanceScript() {
  const origin = await instanceOrigin();
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [ENHANCE_SCRIPT_ID] }).catch(() => []);
  const pattern = origin ? `${origin}/*` : null;
  const granted = pattern ? await chrome.permissions.contains({ origins: [pattern] }).catch(() => false) : false;

  if (!granted) {
    if (registered.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [ENHANCE_SCRIPT_ID] });
    return { registered: false, origin };
  }

  const definition = {
    id: ENHANCE_SCRIPT_ID,
    matches: [pattern],
    js: ENHANCE_SCRIPT_FILES,
    runAt: "document_start",
    allFrames: false,
    persistAcrossSessions: true,
  };
  if (registered.length > 0) await chrome.scripting.updateContentScripts([definition]);
  else await chrome.scripting.registerContentScripts([definition]);
  return { registered: true, origin };
}

chrome.runtime.onInstalled.addListener((details) => {
  void syncEnhanceScript();
  // Nothing works until an instance URL exists, so make the first run obvious.
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(() => void syncEnhanceScript());
chrome.permissions.onAdded.addListener(() => void syncEnhanceScript());
chrome.permissions.onRemoved.addListener(() => void syncEnhanceScript());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.instanceUrl) void syncEnhanceScript();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ytzero:open" && typeof message.url === "string") {
    isAllowed(message.url).then((allowed) => {
      if (!allowed) return;
      if (message.newTab || sender.tab?.id === undefined) {
        chrome.tabs.create({ url: message.url, openerTabId: sender.tab?.id });
      } else {
        chrome.tabs.update(sender.tab.id, { url: message.url });
      }
    });
    return false;
  }

  // Relay between the YT Zero page and its embedded player frame. Both live in
  // the same tab, so the broadcast stays inside that tab and each side ignores
  // envelopes addressed to the other.
  if (message?.type === RELAY && sender.tab?.id !== undefined) {
    chrome.tabs.sendMessage(sender.tab.id, message).catch(() => {});
    return false;
  }

  if (message?.type === "ytzero:sync-enhance") {
    syncEnhanceScript().then(sendResponse, () => sendResponse({ registered: false }));
    return true;
  }

  return false;
});
