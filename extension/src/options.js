const fields = {
  instanceUrl: document.getElementById("instanceUrl"),
  enabled: document.getElementById("enabled"),
  redirectDirectLoads: document.getElementById("redirectDirectLoads"),
  openInNewTab: document.getElementById("openInNewTab"),
};
const status = document.getElementById("status");
const access = document.getElementById("access");
const grantButton = document.getElementById("grant");

globalThis.YTZ.loadSettings().then((settings) => {
  fields.instanceUrl.value = settings.instanceUrl;
  fields.enabled.checked = settings.enabled;
  fields.redirectDirectLoads.checked = settings.redirectDirectLoads;
  fields.openInNewTab.checked = settings.openInNewTab;
  void refreshAccess();
});

function report(message, tone) {
  status.textContent = message;
  status.dataset.tone = tone;
}

function originPattern() {
  const instanceUrl = globalThis.YTZ.normalizeInstanceUrl(fields.instanceUrl.value);
  return instanceUrl ? `${new URL(instanceUrl).origin}/*` : null;
}

async function refreshAccess() {
  const pattern = originPattern();
  if (!pattern) {
    access.textContent = "Enter an instance URL first.";
    grantButton.disabled = true;
    return;
  }
  grantButton.disabled = false;
  const granted = await chrome.permissions.contains({ origins: [pattern] });
  access.textContent = granted ? "Access granted." : "Access not granted yet.";
  grantButton.hidden = granted;
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
  await refreshAccess();
  report("Saved. Reload open YouTube tabs to apply.", "ok");
});

// Requesting an optional origin needs this click as its user gesture.
grantButton.addEventListener("click", async () => {
  const pattern = originPattern();
  if (!pattern) {
    report("Enter a valid http(s) instance URL.", "error");
    return;
  }
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) {
    report("Access was declined, so player enhancement stays off.", "error");
    await refreshAccess();
    return;
  }
  await chrome.runtime.sendMessage({ type: "ytzero:sync-enhance" });
  await refreshAccess();
  report("Access granted. Reload the YT Zero tab to enhance it.", "ok");
});

fields.instanceUrl.addEventListener("change", () => void refreshAccess());
