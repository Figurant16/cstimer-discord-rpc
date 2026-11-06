const HOST_NAME = 'local.cstimer_discord_rpc';
const tabs = new Set();
let host = null;

function openHost() {
  if (host) return host;
  host = chrome.runtime.connectNative(HOST_NAME);
  host.onDisconnect.addListener(() => {
    console.warn('Programme local déconnecté :', chrome.runtime.lastError?.message);
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
      // Fermer le programme local coupe sa connexion, et Discord retire le statut.
      host.disconnect();
      host = null;
    }
  });
});
