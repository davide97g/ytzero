importScripts("shared.js");

// The content script proposes a destination; the worker only accepts URLs that
// live on the configured YT Zero instance.
async function isAllowed(url) {
  try {
    const settings = await globalThis.YTZ.loadSettings();
    const base = globalThis.YTZ.normalizeInstanceUrl(settings.instanceUrl);
    if (!base) return false;
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "ytzero:open" || typeof message.url !== "string") return;
  isAllowed(message.url).then((allowed) => {
    if (!allowed) return;
    if (message.newTab || sender.tab?.id === undefined) {
      chrome.tabs.create({ url: message.url, openerTabId: sender.tab?.id });
    } else {
      chrome.tabs.update(sender.tab.id, { url: message.url });
    }
  });
});
