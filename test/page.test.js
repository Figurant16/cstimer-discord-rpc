const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../extension/page.js'), 'utf8');

function load(kernelAvailableAfter = 0) {
  const posted = [];
  const listeners = {};
  const timers = [];
  const kernel = { regListener: (mod, sig, cb) => { listeners[sig] = cb; } };
  const window = {
    postMessage: (m) => posted.push(m),
    location: { origin: 'https://cstimer.net' },
  };
  if (kernelAvailableAfter === 0) window.kernel = kernel;
  const ctx = { window, setTimeout: (fn) => timers.push(fn) };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return { posted, listeners, window, kernel, tick: () => timers.shift()?.() };
}

test('publie les moyennes et le dernier temps à chaque signal avg', () => {
  const { posted, listeners } = load();
  listeners.avg('avg', ['ao5: 12.34', 'ao12: 13.00', null, null, null, [[0, 11220], 'R U', '', 1], null]);
  const msg = JSON.parse(JSON.stringify(posted[0]));
  assert.equal(msg.source, 'cstimer-discord-rpc');
  assert.deepEqual(msg.payload, { avg1: 'ao5: 12.34', avg2: 'ao12: 13.00', last: [0, 11220] });
});

test('omet le dernier temps pour une session vide', () => {
  const { posted, listeners } = load();
  listeners.avg('avg', ['ao5: -', 'ao12: -', null, null, null, undefined, null]);
  assert.equal(posted[0].payload.last, undefined);
});

test('attend que kernel existe avant de s’abonner', () => {
  const h = load(1);
  assert.equal(h.listeners.avg, undefined);
  h.window.kernel = h.kernel;
  h.tick();
  assert.equal(typeof h.listeners.avg, 'function');
});
