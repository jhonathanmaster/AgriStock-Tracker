#!/bin/sh
# Development container: install dependencies when package-lock.json changes, then run Next.js
# with hot reload.
set -e
HASH=$(md5sum package-lock.json | cut -d' ' -f1)
if [ ! -f node_modules/.lock-hash ] || [ "$(cat node_modules/.lock-hash)" != "$HASH" ]; then
  echo "[dev] instalando dependencias..."
  npm install --no-audit --no-fund
  echo "$HASH" > node_modules/.lock-hash
fi
exec npx next dev -H 0.0.0.0 -p 3000
