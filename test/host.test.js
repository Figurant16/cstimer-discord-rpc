const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { encode } = require('../host/native-messaging');
const { startFakeDiscord } = require('./fake-discord');

function startHost(t, dir, clientId = '123') {
  const host = spawn(process.execPath, [path.join(__dirname, '../host/host.js')], {
    env: { ...process.env, TMPDIR: dir, XDG_RUNTIME_DIR: '', CSTIMER_RPC_CLIENT_ID: clientId },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  t.after(() => host.kill());
  return host;
}

async function startDiscord(t, dir) {
  const fake = startFakeDiscord(path.join(dir, 'discord-ipc-0'));
  await fake.listen();
  t.after(() => fake.close());
  return fake;
}
const exited = (p) => new Promise((r) => p.on('exit', r));
const isActivity = (f) => f.data.cmd === 'SET_ACTIVITY';

test('transforme un message de l’extension en statut Discord', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhost-'));
  const fake = await startDiscord(t, dir);
  const host = startHost(t, dir);
  host.stdin.write(encode({ avg1: 'ao5: 12.34', avg2: 'ao12: 13.00', last: [0, 11220] }));
  const f = await fake.waitFrame(isActivity);
  assert.equal(f.data.args.activity.details, 'ao5: 12.34 • ao12: 13.00');
  assert.equal(f.data.args.activity.state, 'Last solve: 11.22');
  host.stdin.end();
  await exited(host);
});

test('garde le même début de session entre deux résolutions', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhost-'));
  const fake = await startDiscord(t, dir);
  const host = startHost(t, dir);
  host.stdin.write(encode({ avg1: 'ao5: 1', avg2: 'ao12: 1', last: [0, 1000] }));
  await fake.waitFrame(isActivity);
  host.stdin.write(encode({ avg1: 'ao5: 2', avg2: 'ao12: 2', last: [0, 2000] }));
  await fake.waitFrame((f) => isActivity(f) && f.data.args.activity.details.startsWith('ao5: 2'));
  const [a, b] = fake.frames.filter(isActivity);
  assert.equal(a.data.args.activity.timestamps.start, b.data.args.activity.timestamps.start);
  host.stdin.end();
  await exited(host);
});

test('s’arrête quand le navigateur ferme la connexion', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhost-'));
  const host = startHost(t, dir);
  host.stdin.end();
  assert.equal(await exited(host), 0);
});

test('reste en vie quand Discord est fermé', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhost-'));
  const host = startHost(t, dir);
  const done = exited(host);
  host.stdin.write(encode({ avg1: 'ao5: 1', avg2: 'ao12: 1' }));
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(host.exitCode, null);
  host.stdin.end();
  assert.equal(await done, 0);
});

test('n’écrit jamais sur stdout, réservé au protocole du navigateur', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhost-'));
  const host = startHost(t, dir);
  let out = '';
  host.stdout.on('data', (d) => { out += d; });
  host.stdin.write(encode({ avg1: 'ao5: 1', avg2: 'ao12: 1' }));
  await new Promise((r) => setTimeout(r, 200));
  host.stdin.end();
  await exited(host);
  assert.equal(out, '');
});
