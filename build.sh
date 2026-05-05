#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="${SCRIPT_DIR}/distraction-free-web.zip"

rm -f "$OUTPUT"

cd "$SCRIPT_DIR"
zip -r "$OUTPUT" \
  manifest.json \
  _locales/ \
  config/ \
  icons/ \
  popup/ \
  scripts/ \
  styles/ \
  -x "*.DS_Store" \
  -x "__MACOSX/*"

echo "Created: $OUTPUT"
echo ""
unzip -l "$OUTPUT"
