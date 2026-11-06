// Relays page stats to the extension service worker.
let port = null;
let lastPayload = null;

function connect() {
  port = chrome.runtime.connect();
  port.onDisconnect.addListener(() => {
    port = null;
    // Chromium may stop the service worker: reconnect and resend the state.
    setTimeout(() => {
      if (!chrome.runtime?.id) return;
      connect();
      if (lastPayload) port.postMessage(lastPayload);
    }, 1000);
  });
}

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== 'cstimer-discord-rpc') return;
  lastPayload = event.data.payload;
  port?.postMessage(lastPayload);
});

connect();
