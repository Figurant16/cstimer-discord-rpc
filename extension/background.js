const HOST_NAME = 'local.cstimer_discord_rpc';
const tabs = new Set();
let host = null;

function openHost() {
  if (host) return host;
  host = chrome.runtime.connectNative(HOST_NAME);
  host.onDisconnect.addListener(() => {
    console.warn('Native host disconnected:', chrome.runtime.lastError?.message);
    host = null;
  });
  return host;
}

chrome.runtime.onConnect.addListener((port) => {
  tabs.add(port);
  port.onMessage.addListener((payload) => openHost().postMessage(payload));
  port.onDisconnect.addListener(() => {
    tabs.delete(port);
    if (tabs.size === 0 && host) {
      // Closing the native host drops its connection, so Discord clears the status.
      host.disconnect();
      host = null;
    }
  });
});
