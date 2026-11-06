const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOST_FILE = 'NativeMessagingHosts/local.cstimer_discord_rpc.json';

// Throwaway copy: install.sh writes next to itself and must not touch the real config.
function sandbox(browserDirs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cst-install-'));
  const project = path.join(root, 'project');
  const home = path.join(root, 'home');
  fs.mkdirSync(path.join(project, 'host'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '../install.sh'), path.join(project, 'install.sh'));
  const support = path.join(home, 'Library/Application Support');
  browserDirs.forEach((dir) => fs.mkdirSync(path.join(support, dir), { recursive: true }));
  const run = (env = {}) => spawnSync('/bin/sh', [path.join(project, 'install.sh'), '123'], {
    env: { PATH: process.env.PATH, HOME: home, ...env },
    encoding: 'utf8',
  });
  return { project, support, run };
}

test('registers with every detected browser', () => {
  const s = sandbox(['Google/Chrome', 'BraveSoftware/Brave-Browser', 'net.imput.helium']);
  assert.equal(s.run().status, 0);
  for (const dir of ['Google/Chrome', 'BraveSoftware/Brave-Browser', 'net.imput.helium']) {
    assert.ok(fs.existsSync(path.join(s.support, dir, HOST_FILE)), dir);
  }
});

test('skips missing browsers', () => {
  const s = sandbox(['Google/Chrome']);
  s.run();
  assert.equal(fs.existsSync(path.join(s.support, 'Microsoft Edge')), false);
});

test("handles Arc's nested folder", () => {
  const s = sandbox(['Arc/User Data']);
  assert.equal(s.run().status, 0);
  assert.ok(fs.existsSync(path.join(s.support, 'Arc/User Data', HOST_FILE)));
});

test('fails when no browser is found', () => {
  const s = sandbox([]);
  const r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CHROMIUM_DATA_DIR/);
});

test('CHROMIUM_DATA_DIR targets only the given folder', () => {
  const s = sandbox(['Google/Chrome']);
  const custom = path.join(s.project, 'custom');
  assert.equal(s.run({ CHROMIUM_DATA_DIR: custom }).status, 0);
  assert.ok(fs.existsSync(path.join(custom, HOST_FILE)));
  assert.equal(fs.existsSync(path.join(s.support, 'Google/Chrome', HOST_FILE)), false);
});

test('writes a manifest that allows only the extension', () => {
  const s = sandbox(['Google/Chrome']);
  s.run();
  const manifest = JSON.parse(fs.readFileSync(path.join(s.support, 'Google/Chrome', HOST_FILE)));
  assert.equal(manifest.path, path.join(s.project, 'host/run.sh'));
  assert.deepEqual(manifest.allowed_origins, ['chrome-extension://maceonlipciopmaiampojajefeebaibk/']);
});
