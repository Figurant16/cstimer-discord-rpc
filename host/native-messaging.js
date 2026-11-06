// Protocole Native Messaging de Chromium : longueur sur 4 octets, puis JSON.
function encode(message) {
  const json = Buffer.from(JSON.stringify(message));
  const head = Buffer.alloc(4);
  head.writeUInt32LE(json.length, 0);
  return Buffer.concat([head, json]);
}

class Decoder {
  #buffer = Buffer.alloc(0);

  push(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    const messages = [];
    while (this.#buffer.length >= 4) {
      const end = 4 + this.#buffer.readUInt32LE(0);
      if (this.#buffer.length < end) break;
      messages.push(JSON.parse(this.#buffer.subarray(4, end)));
      this.#buffer = this.#buffer.subarray(end);
    }
    return messages;
  }
}

module.exports = { encode, Decoder };
