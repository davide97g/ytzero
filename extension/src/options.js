const fields = {
  instanceUrl: document.getElementById("instanceUrl"),
  enabled: document.getElementById("enabled"),
  redirectDirectLoads: document.getElementById("redirectDirectLoads"),
  openInNewTab: document.getElementById("openInNewTab"),
};
const status = document.getElementById("status");

globalThis.YTZ.loadSettings().then((settings) => {
  fields.instanceUrl.value = settings.instanceUrl;
  fields.enabled.checked = settings.enabled;
  fields.redirectDirectLoads.checked = settings.redirectDirectLoads;
  fields.openInNewTab.checked = settings.openInNewTab;
});

function report(message, tone) {
  status.textContent = message;
  status.dataset.tone = tone;
}

document.getElementById("save").addEventListener("click", async () => {
  const instanceUrl = globalThis.YTZ.normalizeInstanceUrl(fields.instanceUrl.value);
  if (!instanceUrl) {
    report("Enter a valid http(s) instance URL.", "error");
    return;
  }
  await chrome.storage.sync.set({
    instanceUrl,
    enabled: fields.enabled.checked,
    redirectDirectLoads: fields.redirectDirectLoads.checked,
    openInNewTab: fields.openInNewTab.checked,
  });
  fields.instanceUrl.value = instanceUrl;
  report("Saved. Reload open YouTube tabs to apply.", "ok");
});
