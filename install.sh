#!/bin/sh
# Usage: ./install.sh <discord_application_id>
set -eu

CLIENT_ID="${1:-}"
case "$CLIENT_ID" in
  ''|*[!0-9]*) echo "Usage: ./install.sh <discord_application_id>" >&2; exit 1 ;;
esac

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST_NAME="local.cstimer_discord_rpc"
EXTENSION_ID="maceonlipciopmaiampojajefeebaibk"
SUPPORT_DIR="$HOME/Library/Application Support"
NODE="$(command -v node)"

printf '{ "clientId": "%s" }\n' "$CLIENT_ID" > "$ROOT/host/config.json"

# Apps launched from the Dock do not get the terminal PATH, so pin the node path.
cat > "$ROOT/host/run.sh" <<RUN
#!/bin/sh
exec "$NODE" "$ROOT/host/host.js"
RUN
chmod +x "$ROOT/host/run.sh"

install_manifest() {
  mkdir -p "$1/NativeMessagingHosts"
  cat > "$1/NativeMessagingHosts/$HOST_NAME.json" <<MANIFEST
{
  "name": "$HOST_NAME",
  "description": "csTimer Discord RPC",
  "path": "$ROOT/host/run.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXTENSION_ID/"]
}
MANIFEST
  echo "Native host installed for: $1"
  INSTALLED=$((INSTALLED + 1))
}

INSTALLED=0
if [ -n "${CHROMIUM_DATA_DIR:-}" ]; then
  install_manifest "$CHROMIUM_DATA_DIR"
else
  # Each browser reads manifests from its own data folder.
  while IFS= read -r browser; do
    if [ -d "$SUPPORT_DIR/$browser" ]; then
      install_manifest "$SUPPORT_DIR/$browser"
    fi
  done <<BROWSERS
Google/Chrome
Google/Chrome Beta
Google/Chrome Canary
Chromium
BraveSoftware/Brave-Browser
Microsoft Edge
Vivaldi
Arc/User Data
com.operasoftware.Opera
net.imput.helium
BROWSERS
fi

if [ "$INSTALLED" -eq 0 ]; then
  echo "No browser found. Set its data folder with CHROMIUM_DATA_DIR." >&2
  exit 1
fi
