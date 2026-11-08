const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../extension/page.js'), 'utf8');

function load(kernelAvailableAfter = 0, props = {}) {
  const posted = [];
  const listeners = {};
  const timers = [];
  const kernel = {
    regListener: (mod, sig, cb) => { listeners[sig] = cb; },
    getProp: (key) => props[key],
  };
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

test('posts averages and the last solve on each avg signal', () => {
  const { posted, listeners } = load();
  listeners.avg('avg', ['ao5: 12.34', 'ao12: 13.00', null, null, null, [[0, 11220], 'R U', '', 1], null]);
  const msg = JSON.parse(JSON.stringify(posted[0]));
  assert.equal(msg.source, 'cstimer-discord-rpc');
  assert.deepEqual(msg.payload, { avg1: 'ao5: 12.34', avg2: 'ao12: 13.00', last: [0, 11220] });
});

test('posts the name of the current session', () => {
  const sessionData = JSON.stringify({ 1: { name: 1 }, 2: { name: '3x3' } });
  const { posted, listeners } = load(0, { session: 2, sessionData });
  listeners.avg('avg', ['ao5: -', 'ao12: -', null, null, null, undefined, null]);
  assert.equal(posted[0].payload.session, '3x3');
});

test('turns a numeric default session name into text', () => {
  const { posted, listeners } = load(0, { session: 1, sessionData: '{"1":{"name":1}}' });
  listeners.avg('avg', ['ao5: -', 'ao12: -', null, null, null, undefined, null]);
  assert.equal(posted[0].payload.session, '1');
});

test('omits the session when csTimer has no session data', () => {
  const { posted, listeners } = load(0, { sessionData: 'not json' });
  listeners.avg('avg', ['ao5: -', 'ao12: -', null, null, null, undefined, null]);
  assert.equal(posted[0].payload.session, undefined);
});

test('omits the last solve for an empty session', () => {
  const { posted, listeners } = load();
  listeners.avg('avg', ['ao5: -', 'ao12: -', null, null, null, undefined, null]);
  assert.equal(posted[0].payload.last, undefined);
});

test('waits for kernel before subscribing', () => {
  const h = load(1);
  assert.equal(h.listeners.avg, undefined);
  h.window.kernel = h.kernel;
  h.tick();
  assert.equal(typeof h.listeners.avg, 'function');
});
