#!/bin/bash
# Doble clic en macOS para detener GeiaTienda. Los datos se conservan.
source "$(dirname "$0")/scripts/mac-common.sh"
docker compose down --remove-orphans
docker compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null
echo
echo "GeiaTienda detenida. Tus datos siguen guardados."
pause_and_exit 0
