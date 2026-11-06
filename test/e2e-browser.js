// End-to-end test: real browser (throwaway profile), real cstimer.net, fake Discord.
// Run with: BROWSER_BINARY=/path/to/browser node test/e2e-browser.js
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startFakeDiscord } = require('./fake-discord');

const ROOT = path.join(__dirname, '..');
const BROWSER = process.env.BROWSER_BINARY || '/Applications/Helium.app/Contents/MacOS/Helium';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isActivity = (f) => f.data.cmd === 'SET_ACTIVITY';

async function poll(fn, what, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(200);
  }
  throw new Error(`Timed out: ${what}`);
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

  // Throwaway copy: install.sh writes next to itself and must not touch the real config.
  const project = path.join(work, 'project');
  fs.cpSync(path.join(ROOT, 'host'), path.join(project, 'host'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'install.sh'), path.join(project, 'install.sh'));
  execFileSync(path.join(project, 'install.sh'), ['123'], { env: { ...process.env, CHROMIUM_DATA_DIR: profile } });

  const fake = startFakeDiscord(path.join(sockDir, 'discord-ipc-0'));
  await fake.listen();
  let clientClosed = false;
  fake.onClientClose = () => { clientClosed = true; };

  const browser = spawn(BROWSER, [
    '--headless=new', `--user-data-dir=${profile}`, '--no-first-run',
    '--remote-debugging-port=0', '--disable-features=DisableLoadExtensionCommandLineSwitch',
    `--disable-extensions-except=${path.join(ROOT, 'extension')}`,
    `--load-extension=${path.join(ROOT, 'extension')}`, 'about:blank',
  ], { env: { ...process.env, TMPDIR: sockDir, XDG_RUNTIME_DIR: '' }, stdio: 'ignore' });

  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    const port = await poll(() => fs.existsSync(portFile) && fs.readFileSync(portFile, 'utf8').split('\n')[0], 'CDP port');
    const base = `http://127.0.0.1:${port}`;
    const created = await (await fetch(`${base}/json/new?https://cstimer.net/`, { method: 'PUT' })).json();
    const page = cdp(created.webSocketDebuggerUrl);
    await page.ready;
    await page.send('Page.bringToFront');
    const loaded = await poll(async () => {
      const r = await page.send('Runtime.evaluate', { expression: 'typeof kernel + "/" + document.readyState' });
      return r.result?.result?.value === 'object/complete';
    }, 'cstimer.net load');
    assert.ok(loaded);
    await sleep(3000);
    console.log('Frames after load:', fake.frames.filter(isActivity).length);

    for (let i = 0; i < 6; i += 1) { await solve(page); await sleep(500); }
    const frame = await poll(() => fake.frames.filter(isActivity).at(-1), 'status received by Discord');
    const { activity } = frame.data.args;
    console.log('Latest status:', JSON.stringify(activity));
    const shown = await page.send('Runtime.evaluate', { expression: 'document.getElementById("avgstr")?.innerText' });
    console.log('Shown by csTimer:', JSON.stringify(shown.result?.result?.value));
    assert.equal(fake.frames[0].data.client_id, '123');
    assert.match(activity.details, /^ao5: \d/);
    assert.match(activity.state, /^Last solve: \d/);

    await fetch(`${base}/json/close/${created.id}`);
    await poll(() => clientClosed, 'Discord connection closed with the tab');
    console.log('Tab closed: Discord connection dropped.');
    console.log('E2E passed');
  } finally {
    browser.kill();
    await fake.close();
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 3 });
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
