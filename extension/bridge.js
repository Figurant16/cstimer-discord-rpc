// Relaie les stats de la page vers le service worker de l'extension.
let port = null;
let lastPayload = null;

function connect() {
  port = chrome.runtime.connect();
  port.onDisconnect.addListener(() => {
    port = null;
    // Chromium peut arrêter le service worker : on se reconnecte et on renvoie l'état.
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
