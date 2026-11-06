// Runs in the page to reach csTimer's global kernel.
(function attach() {
  const { kernel } = window;
  if (!kernel?.regListener) {
    setTimeout(attach, 50);
    return;
  }
  kernel.regListener('discordRpc', 'avg', (_signal, value) => {
    const [avg1, avg2, , , , lastSolve] = value;
    window.postMessage({
      source: 'cstimer-discord-rpc',
      payload: { avg1, avg2, last: lastSolve?.[0] },
    }, window.location.origin);
  });
}());
