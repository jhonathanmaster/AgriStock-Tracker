#!/bin/bash
# Doble clic en macOS: genera una contraseña nueva para el administrador (o para el correo que escribas).
# Útil después de importar desde Firebase, donde todos entraban con Google.
source "$(dirname "$0")/scripts/mac-common.sh"

echo "=== Crear contraseña ==="
ensure_docker
docker compose up -d --remove-orphans >/dev/null || pause_and_exit 1
wait_for_app || { echo "La app no respondió. Primero haz doble clic en 'Iniciar GeiaTienda.command'."; pause_and_exit 1; }
read -r -p "Correo (Enter = administrador principal): " EMAIL
docker compose exec -T app node scripts/set-password.mjs $EMAIL
pause_and_exit $?
