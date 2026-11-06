const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { STRINGS } = require('../host/languages');

const read = (file) => fs.readFileSync(path.join(__dirname, '../extension', file), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));

function fakeChrome({ language, uiLanguage = 'en-US' } = {}) {
  const store = language ? { language } : {};
  const sent = [];
  const events = {};
  const hook = (name) => ({ addListener: (fn) => { events[name] = fn; } });
  const chrome = {
    i18n: { getUILanguage: () => uiLanguage },
    runtime: {
      lastError: null,
      onConnect: hook('connect'),
      connectNative: () => ({
        postMessage: (m) => sent.push(JSON.parse(JSON.stringify(m))),
        onDisconnect: hook('hostDisconnect'),
        disconnect: () => {},
      }),
    },
    storage: {
      onChanged: hook('storageChanged'),
      local: {
        get: async () => ({ ...store }),
        set: async (value) => {
          Object.assign(store, value);
          events.storageChanged?.();
        },
      },
    },
  };
  return { chrome, sent, events, store };
}

function connectTab(events) {
  const handlers = {};
  events.connect({
    onMessage: { addListener: (fn) => { handlers.message = fn; } },
    onDisconnect: { addListener: (fn) => { handlers.disconnect = fn; } },
  });
  return handlers;
}

function loadBackground(options) {
  const fake = fakeChrome(options);
  vm.runInNewContext(read('background.js'), { chrome: fake.chrome, console });
  return fake;
}

function loadPopup(options) {
  const fake = fakeChrome(options);
  const select = {
    options: [],
    value: '',
    append(option) { this.options.push(option); },
    addEventListener(_type, fn) { this.onChange = fn; },
  };
  const context = {
    chrome: fake.chrome,
    document: {
      getElementById: () => select,
      createElement: () => ({}),
    },
  };
  vm.createContext(context);
  vm.runInContext(read('languages.js'), context);
  vm.runInContext(read('popup.js'), context);
  return { ...fake, select, context };
}

test('the menu lists every translated language', () => {
  const { context } = loadPopup();
  const codes = vm.runInContext('LANGUAGES.map((l) => l.code)', context);
  assert.deepEqual([...codes].sort(), Object.keys(STRINGS).sort());
});

test('sends the chosen language with the stats', async () => {
  const { events, sent } = loadBackground({ language: 'de' });
  connectTab(events).message({ avg1: 'ao5: 1' });
  await settle();
  assert.deepEqual(sent, [{ avg1: 'ao5: 1', language: 'de' }]);
});

test('uses the browser language until one is chosen', async () => {
  const { events, sent } = loadBackground({ uiLanguage: 'it-IT' });
  connectTab(events).message({ avg1: 'ao5: 1' });
  await settle();
  assert.equal(sent[0].language, 'it-IT');
});

test('resends the status when the language changes', async () => {
  const { chrome, events, sent } = loadBackground({ language: 'de' });
  connectTab(events).message({ avg1: 'ao5: 1' });
  await settle();
  await chrome.storage.local.set({ language: 'ko' });
  await settle();
  assert.deepEqual(sent.at(-1), { avg1: 'ao5: 1', language: 'ko' });
});

test('does not reopen the host after the last tab closes', async () => {
  const { chrome, events, sent } = loadBackground({ language: 'de' });
  const tab = connectTab(events);
  tab.message({ avg1: 'ao5: 1' });
  await settle();
  tab.disconnect();
  await chrome.storage.local.set({ language: 'ko' });
  await settle();
  assert.equal(sent.length, 1);
});

test('the menu preselects the saved language', async () => {
  const { select } = loadPopup({ language: 'ru' });
  await settle();
  assert.equal(select.value, 'ru');
});

test('the menu preselects the browser language by default', async () => {
  const { select } = loadPopup({ uiLanguage: 'es-ES' });
  await settle();
  assert.equal(select.value, 'es');
});

test('the menu falls back to English for other browser languages', async () => {
  const { select } = loadPopup({ uiLanguage: 'nl-NL' });
  await settle();
  assert.equal(select.value, 'en');
});

test('the menu saves the selected language', async () => {
  const { select, store } = loadPopup();
  await settle();
  select.value = 'zh';
  await select.onChange();
  assert.equal(store.language, 'zh');
});
