#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE_DIR="$SCRIPT_DIR/../server/.keystore"

FILES=("$KEYSTORE_DIR"/*.json)
if [ ${#FILES[@]} -eq 0 ] || [ ! -f "${FILES[0]}" ]; then
  echo "No keystore files found in $KEYSTORE_DIR"
  exit 1
fi

echo "Add these as environment variables in Railway dashboard:"
echo ""
for FILE in "${FILES[@]}"; do
  FILENAME=$(basename "$FILE" .json)
  ENV_KEY="KEYSTORE_${FILENAME//-/_}"
  ENV_VAL=$(base64 < "$FILE" | tr -d '\n')
  echo "$ENV_KEY=$ENV_VAL"
done
