// Faux serveur IPC Discord pour les tests : vrai socket Unix, même format de trame.
const net = require('node:net');

function startFakeDiscord(path) {
  const frames = [];
  const waiters = [];
  const sockets = new Set();
  const server = net.createServer((sock) => {
    sockets.add(sock);
    let buf = Buffer.alloc(0);
    sock.on('error', () => {});
    sock.on('close', () => { sockets.delete(sock); fake.onClientClose?.(); });
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 8 && buf.length >= 8 + buf.readInt32LE(4)) {
        const op = buf.readInt32LE(0);
        const len = buf.readInt32LE(4);
        const data = JSON.parse(buf.subarray(8, 8 + len));
        buf = buf.subarray(8 + len);
        const frame = { op, data };
        frames.push(frame);
        if (op === 0) reply(sock, 1, { cmd: 'DISPATCH', evt: 'READY', data: { v: 1 } });
        else reply(sock, 1, { cmd: data.cmd, nonce: data.nonce, data: {} });
        waiters.splice(0).forEach((w) => w(frame));
      }
    });
  });
  function reply(sock, op, obj) {
    const json = Buffer.from(JSON.stringify(obj));
    const head = Buffer.alloc(8);
    head.writeInt32LE(op, 0);
    head.writeInt32LE(json.length, 4);
    sock.write(Buffer.concat([head, json]));
  }
  const fake = {
    frames,
    waitFrame: (pred) => new Promise((resolve) => {
      const check = () => {
        const f = frames.find(pred);
        if (f) resolve(f); else waiters.push(check);
      };
      check();
    }),
    dropClients: () => sockets.forEach((s) => s.destroy()),
    close: () => new Promise((r) => {
      sockets.forEach((s) => s.destroy());
      server.close(r);
    }),
    listen: () => new Promise((r) => server.listen(path, r)),
  };
  return fake;
}

module.exports = { startFakeDiscord };
