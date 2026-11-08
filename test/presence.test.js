const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTime, buildActivity } = require('../host/presence');

test('formats a sub-minute time with two decimals', () => {
  assert.equal(formatTime([0, 11220]), '11.22');
});

test('formats a time over one minute', () => {
  assert.equal(formatTime([0, 62300]), '1:02.30');
});

test('adds the +2 penalty to the displayed time', () => {
  assert.equal(formatTime([2000, 11220]), '13.22+');
});

test('shows DNF for an unfinished solve', () => {
  assert.equal(formatTime([-1, 11220]), 'DNF');
});

test('returns null for a missing or invalid time', () => {
  assert.equal(formatTime(undefined), null);
  assert.equal(formatTime(['x', 1]), null);
});

test('puts averages in details and the last solve in state', () => {
  const a = buildActivity({ avg1: 'ao5: 12.34', avg2: 'ao12: 13.00', last: [0, 11220] }, 1000);
  assert.equal(a.details, 'ao5: 12.34 • ao12: 13.00');
  assert.equal(a.state, 'Last solve: 11.22');
});

test('shows the session name before the averages', () => {
  const a = buildActivity({ session: '3x3', avg1: 'ao5: 12.34', avg2: 'ao12: 13.00' }, 1000);
  assert.equal(a.details, '3x3 • ao5: 12.34 • ao12: 13.00');
});

test('ignores an empty or invalid session name', () => {
  assert.equal(buildActivity({ session: '  ', avg1: 'ao5: 1', avg2: 'ao12: 1' }, 1000).details, 'ao5: 1 • ao12: 1');
  assert.equal(buildActivity({ session: 3, avg1: 'ao5: 1', avg2: 'ao12: 1' }, 1000).details, 'ao5: 1 • ao12: 1');
});

test('uses the given timestamp as session start', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -' }, 1234);
  assert.deepEqual(a.timestamps, { start: 1234 });
});

test('reports no solves for an empty session', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -' }, 1000);
  assert.equal(a.state, 'No solves yet');
});

test('truncates text to the 128-character Discord limit', () => {
  const a = buildActivity({ avg1: 'x'.repeat(200), avg2: 'y'.repeat(200) }, 1000);
  assert.ok(a.details.length <= 128);
});

test('ignores averages that are not strings', () => {
  const a = buildActivity({ avg1: 42, avg2: null }, 1000);
  assert.equal(a.details, 'ao5: - • ao12: -');
});

test('shows the csTimer logo as the status image', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -' }, 1000);
  assert.deepEqual(a.assets, {
    large_image: 'https://cstimer.net/cstimer512x512.png',
    large_text: 'csTimer',
  });
});

test('translates the status into the chosen language', () => {
  const stats = { avg1: 'ao5: 1', avg2: 'ao12: 1', last: [0, 11220] };
  assert.equal(buildActivity({ ...stats, language: 'fr' }, 1000).state, 'Dernier temps : 11.22');
  assert.equal(buildActivity({ ...stats, language: 'ja' }, 1000).state, '前回のタイム：11.22');
});

test('translates the empty session text', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -', language: 'es' }, 1000);
  assert.equal(a.state, 'Aún no hay tiempos');
});

test('accepts a regional browser language', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -', language: 'pt-BR' }, 1000);
  assert.equal(a.state, 'Ainda sem tempos');
});

test('falls back to the default language when unknown', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -', language: 'xx' }, 1000);
  assert.equal(a.state, 'No solves yet');
});
