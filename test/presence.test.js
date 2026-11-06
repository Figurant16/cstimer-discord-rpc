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
