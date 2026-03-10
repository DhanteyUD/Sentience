#!/bin/bash
# Uploads .keystore files to the Railway volume via railway run
# Usage: ./scripts/upload-keystores.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE_DIR="$SCRIPT_DIR/../server/.keystore"
REMOTE_DIR="/app/.keystore"

if ! command -v railway &> /dev/null; then
  echo "Railway CLI not found. Install it: npm install -g @railway/cli"
  exit 1
fi

FILES=("$KEYSTORE_DIR"/*.json)
if [ ${#FILES[@]} -eq 0 ] || [ ! -f "${FILES[0]}" ]; then
  echo "No keystore files found in $KEYSTORE_DIR"
  exit 1
fi

echo "Uploading ${#FILES[@]} keystore file(s) to Railway volume at $REMOTE_DIR..."

for FILE in "${FILES[@]}"; do
  FILENAME=$(basename "$FILE")
  CONTENT=$(cat "$FILE")
  echo "  -> $FILENAME"
  railway run -- bash -c "mkdir -p $REMOTE_DIR && cat > $REMOTE_DIR/$FILENAME << 'KEYSTORE_EOF'
$CONTENT
KEYSTORE_EOF
chmod 600 $REMOTE_DIR/$FILENAME"
done

echo "Done. Verify with: railway run -- ls -la $REMOTE_DIR"
