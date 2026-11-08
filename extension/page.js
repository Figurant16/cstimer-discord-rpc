// Runs in the page to reach csTimer's global kernel.
(function attach() {
  const { kernel } = window;
  if (!kernel?.regListener) {
    setTimeout(attach, 50);
    return;
  }
  const sessionName = () => {
    try {
      const sessions = JSON.parse(kernel.getProp('sessionData'));
      const name = sessions[kernel.getProp('session')]?.name;
      return name == null ? undefined : String(name);
    } catch {
      return undefined;
    }
  };
  kernel.regListener('discordRpc', 'avg', (_signal, value) => {
    const [avg1, avg2, , , , lastSolve] = value;
    window.postMessage({
      source: 'cstimer-discord-rpc',
      payload: { session: sessionName(), avg1, avg2, last: lastSolve?.[0] },
    }, window.location.origin);
  });
}());
