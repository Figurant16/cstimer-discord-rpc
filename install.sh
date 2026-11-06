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
DATA_DIR="${HELIUM_DATA_DIR:-$HOME/Library/Application Support/net.imput.helium}"
NODE="$(command -v node)"

printf '{ "clientId": "%s" }\n' "$CLIENT_ID" > "$ROOT/host/config.json"

# Apps launched from the Dock do not get the terminal PATH, so pin the node path.
cat > "$ROOT/host/run.sh" <<RUN
#!/bin/sh
exec "$NODE" "$ROOT/host/host.js"
RUN
chmod +x "$ROOT/host/run.sh"

mkdir -p "$DATA_DIR/NativeMessagingHosts"
cat > "$DATA_DIR/NativeMessagingHosts/$HOST_NAME.json" <<MANIFEST
{
  "name": "$HOST_NAME",
  "description": "csTimer Discord RPC",
  "path": "$ROOT/host/run.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXTENSION_ID/"]
}
MANIFEST

echo "Native host installed for Helium."
