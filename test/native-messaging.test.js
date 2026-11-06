const test = require('node:test');
const assert = require('node:assert/strict');
const { encode, Decoder } = require('../host/native-messaging');

test('encode préfixe le JSON par sa longueur sur 4 octets', () => {
  const buf = encode({ a: 1 });
  assert.equal(buf.readUInt32LE(0), buf.length - 4);
  assert.deepEqual(JSON.parse(buf.subarray(4)), { a: 1 });
});

test('le décodeur reconstitue un message reçu en morceaux', () => {
  const buf = encode({ hello: 'é' });
  const d = new Decoder();
  assert.deepEqual(d.push(buf.subarray(0, 2)), []);
  assert.deepEqual(d.push(buf.subarray(2)), [{ hello: 'é' }]);
});

test('le décodeur sépare deux messages reçus d’un coup', () => {
  const d = new Decoder();
  const got = d.push(Buffer.concat([encode({ n: 1 }), encode({ n: 2 })]));
  assert.deepEqual(got, [{ n: 1 }, { n: 2 }]);
});
