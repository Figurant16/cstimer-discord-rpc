const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOST_FILE = 'NativeMessagingHosts/local.cstimer_discord_rpc.json';

// Throwaway copy: install.sh writes next to itself and must not touch the real config.
function sandbox(browserDirs, system = 'Darwin') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cst-install-'));
  const project = path.join(root, 'project');
  const home = path.join(root, 'home');
  fs.mkdirSync(path.join(project, 'host'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '../install.sh'), path.join(project, 'install.sh'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'uname'), `#!/bin/sh\necho ${system}\n`, { mode: 0o755 });
  const support = path.join(home, system === 'Linux' ? '.config' : 'Library/Application Support');
  browserDirs.forEach((dir) => fs.mkdirSync(path.join(support, dir), { recursive: true }));
  const run = (env = {}) => spawnSync('/bin/sh', [path.join(project, 'install.sh'), '123'], {
    env: { PATH: `${bin}:${process.env.PATH}`, HOME: home, ...env },
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

test('registers with Linux browsers in ~/.config', () => {
  const s = sandbox(['google-chrome', 'BraveSoftware/Brave-Browser'], 'Linux');
  assert.equal(s.run().status, 0);
  assert.ok(fs.existsSync(path.join(s.support, 'google-chrome', HOST_FILE)));
  assert.ok(fs.existsSync(path.join(s.support, 'BraveSoftware/Brave-Browser', HOST_FILE)));
});

test('honours XDG_CONFIG_HOME on Linux', () => {
  const s = sandbox([], 'Linux');
  const config = path.join(s.project, 'config');
  fs.mkdirSync(path.join(config, 'chromium'), { recursive: true });
  assert.equal(s.run({ XDG_CONFIG_HOME: config }).status, 0);
  assert.ok(fs.existsSync(path.join(config, 'chromium', HOST_FILE)));
});

test('points Windows users to install.ps1', () => {
  const r = sandbox([], 'MINGW64_NT').run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /install\.ps1/);
});

test('the Windows installer uses the same host and extension', () => {
  const windows = fs.readFileSync(path.join(__dirname, '../install.ps1'), 'utf8');
  const unix = fs.readFileSync(path.join(__dirname, '../install.sh'), 'utf8');
  for (const value of ['local.cstimer_discord_rpc', 'maceonlipciopmaiampojajefeebaibk']) {
    assert.ok(windows.includes(value), value);
    assert.ok(unix.includes(value), value);
  }
});

test('the Windows installer stays ASCII for PowerShell 5', () => {
  const windows = fs.readFileSync(path.join(__dirname, '../install.ps1'));
  assert.ok(windows.every((byte) => byte < 128));
});
