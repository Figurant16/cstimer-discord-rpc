const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTime, buildActivity } = require('../host/presence');

test('formatte un temps sous la minute sur deux décimales', () => {
  assert.equal(formatTime([0, 11220]), '11.22');
});

test('formatte un temps au-delà de la minute', () => {
  assert.equal(formatTime([0, 62300]), '1:02.30');
});

test('ajoute la pénalité +2 au temps affiché', () => {
  assert.equal(formatTime([2000, 11220]), '13.22+');
});

test('affiche DNF pour une résolution non terminée', () => {
  assert.equal(formatTime([-1, 11220]), 'DNF');
});

test('renvoie null quand le temps est absent ou invalide', () => {
  assert.equal(formatTime(undefined), null);
  assert.equal(formatTime(['x', 1]), null);
});

test('met les moyennes en details et le dernier temps en state', () => {
  const a = buildActivity({ avg1: 'ao5: 12.34', avg2: 'ao12: 13.00', last: [0, 11220] }, 1000);
  assert.equal(a.details, 'ao5: 12.34 • ao12: 13.00');
  assert.equal(a.state, 'Dernier temps : 11.22');
});

test('fixe le début de session au timestamp reçu', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -' }, 1234);
  assert.deepEqual(a.timestamps, { start: 1234 });
});

test('indique l’absence de temps pour une session vide', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -' }, 1000);
  assert.equal(a.state, 'Aucun temps pour le moment');
});

test('tronque les textes reçus à la limite Discord de 128 caractères', () => {
  const a = buildActivity({ avg1: 'x'.repeat(200), avg2: 'y'.repeat(200) }, 1000);
  assert.ok(a.details.length <= 128);
});

test('ignore des moyennes qui ne sont pas du texte', () => {
  const a = buildActivity({ avg1: 42, avg2: null }, 1000);
  assert.equal(a.details, 'ao5: - • ao12: -');
});

test('affiche le logo csTimer comme image du statut', () => {
  const a = buildActivity({ avg1: 'ao5: -', avg2: 'ao12: -' }, 1000);
  assert.deepEqual(a.assets, {
    large_image: 'https://cstimer.net/cstimer512x512.png',
    large_text: 'csTimer',
  });
});
