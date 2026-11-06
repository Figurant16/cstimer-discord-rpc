const HOST_NAME = 'local.cstimer_discord_rpc';
const tabs = new Set();
let host = null;
let lastPayload = null;

function openHost() {
  if (host) return host;
  host = chrome.runtime.connectNative(HOST_NAME);
  host.onDisconnect.addListener(() => {
    console.warn('Native host disconnected:', chrome.runtime.lastError?.message);
    host = null;
  });
  return host;
}

function closeHost() {
  if (!host) return;
  host.disconnect();
  host = null;
}

async function publish() {
  if (!lastPayload) return;
  const { language, enabled = true } = await chrome.storage.local.get(['language', 'enabled']);
  if (!lastPayload) return;
  if (!enabled) {
    closeHost();
    return;
  }
  openHost().postMessage({ ...lastPayload, language: language || chrome.i18n.getUILanguage() });
}

chrome.storage.onChanged.addListener(publish);

chrome.runtime.onConnect.addListener((port) => {
  tabs.add(port);
  port.onMessage.addListener((payload) => {
    lastPayload = payload;
    publish();
  });
  port.onDisconnect.addListener(() => {
    tabs.delete(port);
    if (tabs.size > 0) return;
    lastPayload = null;
    // Closing the native host drops its connection, so Discord clears the status.
    closeHost();
  });
});
