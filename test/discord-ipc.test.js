const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DiscordClient, socketPaths } = require('../host/discord-ipc');
const { startFakeDiscord } = require('./fake-discord');

const sockDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dipc-'));
const isActivity = (f) => f.data.cmd === 'SET_ACTIVITY';

test('handshakes with client_id before sending the activity', async () => {
  const dir = sockDir();
  const fake = startFakeDiscord(path.join(dir, 'discord-ipc-0'));
  await fake.listen();
  const c = new DiscordClient('123', { dir });
  await c.setActivity({ details: 'x' });
  assert.deepEqual(fake.frames[0], { op: 0, data: { v: 1, client_id: '123' } });
  assert.deepEqual(fake.frames[1].data.args.activity, { details: 'x' });
  assert.equal(fake.frames[1].data.args.pid, process.pid);
  c.close();
  await fake.close();
});

test('tries later sockets when discord-ipc-0 is missing', async () => {
  const dir = sockDir();
  const fake = startFakeDiscord(path.join(dir, 'discord-ipc-3'));
  await fake.listen();
  const c = new DiscordClient('123', { dir });
  await c.setActivity({ details: 'x' });
  assert.ok(fake.frames.some(isActivity));
  c.close();
  await fake.close();
});

test('fails cleanly when Discord is not running', async () => {
  const c = new DiscordClient('123', { dir: sockDir() });
  await assert.rejects(c.setActivity({ details: 'x' }), /Discord/);
});

test('reconnects on the next send after Discord drops', async () => {
  const dir = sockDir();
  const fake = startFakeDiscord(path.join(dir, 'discord-ipc-0'));
  await fake.listen();
  const c = new DiscordClient('123', { dir });
  await c.setActivity({ details: 'a' });
  const closed = new Promise((r) => { c.onClose = r; });
  fake.dropClients();
  await closed;
  await c.setActivity({ details: 'b' });
  const handshakes = fake.frames.filter((f) => f.op === 0);
  assert.equal(handshakes.length, 2);
  c.close();
  await fake.close();
});

test('uses named pipes on Windows', () => {
  assert.equal(socketPaths('/ignored', 'win32')[0], '\\\\?\\pipe\\discord-ipc-0');
});

test('also looks for Flatpak and Snap Discord on Linux', () => {
  const paths = socketPaths('/run/user/1000', 'linux');
  assert.ok(paths.includes('/run/user/1000/discord-ipc-0'));
  assert.ok(paths.includes('/run/user/1000/app/com.discordapp.Discord/discord-ipc-0'));
  assert.ok(paths.includes('/run/user/1000/snap.discord/discord-ipc-0'));
});

test('only uses the temp folder on macOS', () => {
  const paths = socketPaths('/tmp/x', 'darwin');
  assert.equal(paths.length, 10);
  assert.equal(paths[9], '/tmp/x/discord-ipc-9');
});
