// Test de bout en bout : vrai Helium (profil jetable), vrai cstimer.net, faux Discord.
// Lancement : node test/e2e-helium.js
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startFakeDiscord } = require('./fake-discord');

const ROOT = path.join(__dirname, '..');
const HELIUM = '/Applications/Helium.app/Contents/MacOS/Helium';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isActivity = (f) => f.data.cmd === 'SET_ACTIVITY';

async function poll(fn, what, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(200);
  }
  throw new Error(`Délai dépassé : ${what}`);
}

function cdp(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
  };
  const ready = new Promise((r) => { ws.onopen = r; });
  return {
    ready,
    send: (method, params = {}) => new Promise((resolve) => {
      id += 1;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    }),
    close: () => ws.close(),
  };
}

const SPACE = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 49, text: ' ' };

async function solve(page) {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...SPACE });
  await sleep(800);
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...SPACE });
  await sleep(600);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...SPACE });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...SPACE });
}

async function main() {
  const work = fs.mkdtempSync('/tmp/cst-e2e-');
  const profile = path.join(work, 'profile');
  fs.mkdirSync(profile);
  const sockDir = path.join(work, 's');
  fs.mkdirSync(sockDir);

  const backupConfig = path.join(ROOT, 'host/config.json');
  const hadConfig = fs.existsSync(backupConfig) ? fs.readFileSync(backupConfig) : null;
  execFileSync(path.join(ROOT, 'install.sh'), ['123'], { env: { ...process.env, HELIUM_DATA_DIR: profile } });

  const fake = startFakeDiscord(path.join(sockDir, 'discord-ipc-0'));
  await fake.listen();
  let clientClosed = false;
  fake.onClientClose = () => { clientClosed = true; };

  const browser = spawn(HELIUM, [
    '--headless=new', `--user-data-dir=${profile}`, '--no-first-run',
    '--remote-debugging-port=0', '--disable-features=DisableLoadExtensionCommandLineSwitch',
    `--disable-extensions-except=${path.join(ROOT, 'extension')}`,
    `--load-extension=${path.join(ROOT, 'extension')}`, 'about:blank',
  ], { env: { ...process.env, TMPDIR: sockDir, XDG_RUNTIME_DIR: '' }, stdio: 'ignore' });

  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    const port = await poll(() => fs.existsSync(portFile) && fs.readFileSync(portFile, 'utf8').split('\n')[0], 'port CDP');
    const base = `http://127.0.0.1:${port}`;
    const created = await (await fetch(`${base}/json/new?https://cstimer.net/`, { method: 'PUT' })).json();
    const page = cdp(created.webSocketDebuggerUrl);
    await page.ready;
    await page.send('Page.bringToFront');
    const loaded = await poll(async () => {
      const r = await page.send('Runtime.evaluate', { expression: 'typeof kernel + "/" + document.readyState' });
      return r.result?.result?.value === 'object/complete';
    }, 'chargement de cstimer.net');
    assert.ok(loaded);
    await sleep(3000);
    console.log('Trames après chargement :', fake.frames.filter(isActivity).length);

    for (let i = 0; i < 6; i += 1) { await solve(page); await sleep(500); }
    const frame = await poll(() => fake.frames.filter(isActivity).at(-1), 'statut reçu par Discord');
    const { activity } = frame.data.args;
    console.log('Dernier statut :', JSON.stringify(activity));
    const shown = await page.send('Runtime.evaluate', { expression: 'document.getElementById("avgstr")?.innerText' });
    console.log('Affiché par csTimer :', JSON.stringify(shown.result?.result?.value));
    assert.equal(fake.frames[0].data.client_id, '123');
    assert.match(activity.details, /^ao5: \d/);
    assert.match(activity.state, /^Dernier temps : \d/);

    await fetch(`${base}/json/close/${created.id}`);
    await poll(() => clientClosed, 'connexion Discord fermée à la fermeture de l’onglet');
    console.log('Onglet fermé : connexion Discord coupée.');
    console.log('E2E OK');
  } finally {
    browser.kill();
    await fake.close();
    if (hadConfig) fs.writeFileSync(backupConfig, hadConfig); else fs.rmSync(backupConfig, { force: true });
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 3 });
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
