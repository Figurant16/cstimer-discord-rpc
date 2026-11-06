// Tourne dans la page pour accéder au kernel global de csTimer.
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
