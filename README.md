# csTimer Discord RPC

Shows your [csTimer](https://cstimer.net) ao5, ao12 and last solve in your Discord status.

The status looks like this, with the csTimer logo and the session duration:

```
csTimer
ao5: 12.34 • ao12: 13.00
Last solve: 11.22
```

The project runs on macOS with [Helium](https://helium.computer) and the Discord desktop app. It has no npm dependencies.

## How it works

An extension alone cannot talk to the Discord app, so the project has two parts:

```
cstimer.net ──> Helium extension ──> native host ──> Discord app
              "avg" signal        Native Messaging   discord-ipc socket
```

- **The extension** subscribes to csTimer's `avg` signal and forwards the stats. It does not read the page HTML.
- **The native host** (`host/`) formats the stats and sends them to Discord over its local socket.

You never start anything yourself. Helium starts the host when the first stats arrive and stops it when the last csTimer tab closes, which clears the status. The host does not run permanently and opens no network port.

## Installation

You need Node.js, Helium and the Discord desktop app.

1. Create an application on the [Discord Developer Portal](https://discord.com/developers/applications). Its name becomes the title shown on your profile.
2. Copy its **Application ID**, then run:
   ```sh
   ./install.sh <application_id>
   ```
3. In Helium, open `helium://extensions`, enable developer mode, click **Load unpacked** and select the `extension` folder.
4. Reload cstimer.net with the Discord app open.

`install.sh` writes `host/config.json` and `host/run.sh`, both ignored by git, plus the Native Messaging manifest in `~/Library/Application Support/net.imput.helium/NativeMessagingHosts/`.

The generated files store the project path and the Node.js path. If either changes, run `install.sh` again and reload the extension.

## Uninstall

1. Remove the extension from `helium://extensions`.
2. Delete the manifest:
   ```sh
   rm "$HOME/Library/Application Support/net.imput.helium/NativeMessagingHosts/local.cstimer_discord_rpc.json"
   ```
3. Delete the project folder.

## Limitations

- The two averages shown are the first two configured in csTimer: ao5 and ao12 by default.
- Before reaching 5 or 12 solves, an average shows `-`, or the best possible average (`bpa5`) when one solve short.
- The status stays visible while a csTimer tab is open, even if you stop solving.
- With several csTimer tabs open, the tab that last recorded a solve sets the status.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Nothing on Discord | The Discord desktop app is open and activity sharing is enabled in its settings. |
| Still nothing on Discord | In `helium://extensions`, open the extension's service worker and read its console. |
| `Specified native messaging host not found` | `install.sh` was not run, or the folder was moved. |
| `Access to the specified native messaging host is forbidden` | The extension ID does not match: the `key` field in `manifest.json` changed. |

## Project layout

```
extension/
  page.js              reads the avg signal in the page
  bridge.js            relays stats to the service worker
  background.js        manages the native host connection
host/
  host.js              entry point started by Helium
  presence.js          formats stats for Discord
  discord-ipc.js       Discord socket client with reconnect
  native-messaging.js  Native Messaging protocol
test/                  unit and end-to-end tests
install.sh             native host installer
```

## Tests

```sh
npm test                  # unit tests and fake Discord server
node test/e2e-helium.js   # real Helium (throwaway profile) and real cstimer.net
```

`e2e-helium.js` uses a fake Discord and a temporary profile, so it touches neither your status nor your Helium profile.
