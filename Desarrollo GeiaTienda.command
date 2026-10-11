#!/bin/bash
# Doble clic en macOS: modo desarrollo con vista previa en vivo.
# Los cambios en el código se ven en el navegador al instante. Cierra esta ventana para detenerlo.
source "$(dirname "$0")/scripts/mac-common.sh"

echo "=== GeiaTienda · modo desarrollo ==="
ensure_docker
# The normal mode uses the same ports; stop it first.
docker compose stop app >/dev/null 2>&1

( wait_for_app && open "http://localhost:$(app_port)" ) &

echo "Arrancando (la primera vez instala dependencias y tarda unos minutos)..."
echo "Deja esta ventana abierta. Para detener: cierra la ventana o presiona Ctrl+C."
echo
docker compose -f docker-compose.dev.yml up --remove-orphans
docker compose -f docker-compose.dev.yml stop
