#!/bin/bash
# Doble clic en macOS: importa firebase-backup.json a la base de datos de GeiaTienda.
# Se puede repetir sin duplicar datos. Si algo falla, no se guarda nada.
source "$(dirname "$0")/scripts/mac-common.sh"

echo "=== Importar copia de Firebase ==="
[ -f firebase-backup.json ] || { echo "No encuentro firebase-backup.json. Primero ejecuta 'Exportar Firebase.command'."; pause_and_exit 1; }
ensure_docker

echo "Arrancando la app (crea las tablas si es la primera vez)..."
docker compose up -d --build --remove-orphans || pause_and_exit 1
wait_for_app || { echo "La app no respondió. Revisa 'docker compose logs app'."; pause_and_exit 1; }

echo
echo "Importando..."
if docker compose run --rm --no-deps -v "$PWD":/data app node scripts/import-firestore.mjs /data/firebase-backup.json; then
  echo
  echo "Revisa 'reporte-importacion.txt' y 'reporte-stock.csv' en esta carpeta."
  echo "Para entrar: con Google (si lo configuraste en .env) o crea tu contraseña con 'Crear contraseña admin.command'."
  pause_and_exit 0
else
  echo
  echo "La importación no se completó (no se guardó nada). Copia el texto de arriba y compártelo."
  pause_and_exit 1
fi
