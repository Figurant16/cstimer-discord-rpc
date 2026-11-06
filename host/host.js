#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { DiscordClient } = require('./discord-ipc');
const { Decoder } = require('./native-messaging');
const { buildActivity } = require('./presence');

function readClientId() {
  if (process.env.CSTIMER_RPC_CLIENT_ID) return process.env.CSTIMER_RPC_CLIENT_ID;
  const file = path.join(__dirname, 'config.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).clientId;
}

// stdout belongs to the browser protocol, so logs go to stderr.
const discord = new DiscordClient(readClientId());
const decoder = new Decoder();
const startedAt = Date.now();
let queue = Promise.resolve();

process.stdin.on('data', (chunk) => {
  for (const message of decoder.push(chunk)) {
    queue = queue
      .then(() => discord.setActivity(buildActivity(message, startedAt)))
      .catch((err) => console.error(err.message));
  }
});

process.stdin.on('end', () => {
  discord.close();
  process.exit(0);
});
