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

async function publish() {
  if (!lastPayload) return;
  const { language } = await chrome.storage.local.get('language');
  if (!lastPayload) return;
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
    if (host) {
      // Closing the native host drops its connection, so Discord clears the status.
      host.disconnect();
      host = null;
    }
  });
});
