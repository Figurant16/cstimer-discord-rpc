const test = require('node:test');
const assert = require('node:assert/strict');
const { encode, Decoder } = require('../host/native-messaging');

test('encode prefixes JSON with its 4-byte length', () => {
  const buf = encode({ a: 1 });
  assert.equal(buf.readUInt32LE(0), buf.length - 4);
  assert.deepEqual(JSON.parse(buf.subarray(4)), { a: 1 });
});

test('decoder reassembles a message received in chunks', () => {
  const buf = encode({ hello: 'é' });
  const d = new Decoder();
  assert.deepEqual(d.push(buf.subarray(0, 2)), []);
  assert.deepEqual(d.push(buf.subarray(2)), [{ hello: 'é' }]);
});

test('decoder splits two messages received at once', () => {
  const d = new Decoder();
  const got = d.push(Buffer.concat([encode({ n: 1 }), encode({ n: 2 })]));
  assert.deepEqual(got, [{ n: 1 }, { n: 2 }]);
});
