#!/bin/bash
# Doble clic en macOS: descarga una copia completa del Firestore de GeiaTienda a firebase-backup.json.
# Necesita firebase-key.json (clave de cuenta de servicio) en esta misma carpeta. Firebase solo se lee.
source "$(dirname "$0")/scripts/mac-common.sh"

echo "=== Exportar copia de Firebase ==="
[ -f firebase-key.json ] || { echo "No encuentro firebase-key.json en esta carpeta (ver README, sección Firebase)."; pause_and_exit 1; }
ensure_docker

echo "Conectando con Firebase (la primera vez descarga herramientas, tarda un poco)..."
if docker run --rm \
  -v "$PWD":/work -w /work \
  -v geiatienda_npm_cache:/root/.npm \
  node:22-alpine sh -c '
    set -e
    mkdir -p /tmp/fx && cd /tmp/fx
    npm init -y >/dev/null 2>&1
    npm install --no-audit --no-fund --silent firebase-admin@13
    cd /work
    NODE_PATH=/tmp/fx/node_modules node scripts/firestore-export.cjs firebase-key.json firebase-backup.json
  '; then
  echo
  echo "Copia guardada en: $PWD/firebase-backup.json"
  echo "Siguiente paso: doble clic en 'Importar Firebase.command'."
  pause_and_exit 0
else
  echo
  echo "La exportación falló. Copia el texto de arriba y compártelo."
  pause_and_exit 1
fi
