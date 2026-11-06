const crypto = require('node:crypto');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;
const SOCKET_COUNT = 10;
const REPLY_TIMEOUT_MS = 5000;
// Discord installed through Flatpak or Snap puts its socket in a subfolder.
const LINUX_SUBDIRS = ['', 'app/com.discordapp.Discord', 'snap.discord'];

function socketPaths(dir, platform = process.platform) {
  const indexes = [...Array(SOCKET_COUNT).keys()];
  if (platform === 'win32') return indexes.map((i) => `\\\\?\\pipe\\discord-ipc-${i}`);
  const dirs = platform === 'linux' ? LINUX_SUBDIRS.map((sub) => path.join(dir, sub)) : [dir];
  return dirs.flatMap((folder) => indexes.map((i) => path.join(folder, `discord-ipc-${i}`)));
}

function connectSocket(file) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(file);
    sock.once('connect', () => { sock.removeListener('error', reject); resolve(sock); });
    sock.once('error', reject);
  });
}

class DiscordClient {
  #clientId;
  #dir;
  #sock = null;
  #buffer = Buffer.alloc(0);
  #pending = null;
  onClose = null;

  constructor(clientId, { dir = process.env.XDG_RUNTIME_DIR || os.tmpdir() } = {}) {
    this.#clientId = clientId;
    this.#dir = dir;
  }

  async setActivity(activity) {
    if (!this.#sock) await this.#connect();
    const reply = await this.#request(OP_FRAME, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity },
      nonce: crypto.randomUUID(),
    });
    if (reply.evt === 'ERROR') throw new Error(`Discord: ${reply.data?.message}`);
  }

  close() {
    this.#sock?.destroy();
  }

  async #connect() {
    for (const file of socketPaths(this.#dir)) {
      try {
        this.#attach(await connectSocket(file));
        await this.#request(OP_HANDSHAKE, { v: 1, client_id: this.#clientId });
        return;
      } catch (err) {
        this.close();
        if (err.code !== 'ENOENT' && err.code !== 'ECONNREFUSED') throw err;
      }
    }
    throw new Error('Discord is not running');
  }

  #attach(sock) {
    this.#sock = sock;
    this.#buffer = Buffer.alloc(0);
    sock.on('data', (chunk) => this.#onData(chunk));
    sock.on('error', () => {});
    sock.on('close', () => {
      this.#sock = null;
      this.#settle(new Error('Discord closed the connection'));
      this.onClose?.();
    });
  }

  #onData(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    while (this.#buffer.length >= 8) {
      const end = 8 + this.#buffer.readInt32LE(4);
      if (this.#buffer.length < end) break;
      const op = this.#buffer.readInt32LE(0);
      const data = JSON.parse(this.#buffer.subarray(8, end));
      this.#buffer = this.#buffer.subarray(end);
      if (op === OP_CLOSE) this.#settle(new Error(`Discord rejected the connection: ${data.message}`));
      else this.#settle(null, data);
    }
  }

  #settle(err, value) {
    const pending = this.#pending;
    if (!pending) return;
    this.#pending = null;
    clearTimeout(pending.timer);
    if (err) pending.reject(err); else pending.resolve(value);
  }

  #request(op, payload) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => this.#settle(new Error('Discord is not responding')),
        REPLY_TIMEOUT_MS,
      );
      this.#pending = { resolve, reject, timer };
      const json = Buffer.from(JSON.stringify(payload));
      const head = Buffer.alloc(8);
      head.writeInt32LE(op, 0);
      head.writeInt32LE(json.length, 4);
      this.#sock.write(Buffer.concat([head, json]));
    });
  }
}

module.exports = { DiscordClient, socketPaths };
