#!/bin/bash
# Doble clic en macOS para arrancar GeiaTienda con Docker Desktop.
source "$(dirname "$0")/scripts/mac-common.sh"

echo "=== GeiaTienda Tracker ==="
ensure_docker

echo "Construyendo y arrancando (la primera vez tarda unos minutos)..."
if ! docker compose up -d --build --remove-orphans; then
  echo "Algo falló al arrancar. Copia el texto de arriba y compártelo."
  pause_and_exit 1
fi

echo "Esperando a que la app responda..."
if wait_for_app; then
  URL="http://localhost:$(app_port)"
  echo
  echo "Listo: $URL"
  open "$URL"
  echo "Para detenerla, haz doble clic en 'Detener GeiaTienda.command'."
  pause_and_exit 0
fi
echo "La app no respondió a tiempo. Últimos registros:"
docker compose logs --tail=40 app
pause_and_exit 1
