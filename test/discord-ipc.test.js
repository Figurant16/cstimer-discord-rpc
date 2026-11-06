const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DiscordClient } = require('../host/discord-ipc');
const { startFakeDiscord } = require('./fake-discord');

const sockDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dipc-'));
const isActivity = (f) => f.data.cmd === 'SET_ACTIVITY';

test('fait le handshake avec le client_id avant d’envoyer l’activité', async () => {
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

test('essaie les sockets suivants si discord-ipc-0 n’existe pas', async () => {
  const dir = sockDir();
  const fake = startFakeDiscord(path.join(dir, 'discord-ipc-3'));
  await fake.listen();
  const c = new DiscordClient('123', { dir });
  await c.setActivity({ details: 'x' });
  assert.ok(fake.frames.some(isActivity));
  c.close();
  await fake.close();
});

test('échoue proprement quand Discord n’est pas lancé', async () => {
  const c = new DiscordClient('123', { dir: sockDir() });
  await assert.rejects(c.setActivity({ details: 'x' }), /Discord/);
});

test('se reconnecte à l’envoi suivant après une coupure de Discord', async () => {
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
