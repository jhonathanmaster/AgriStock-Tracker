# Shared helpers for the .command files (macOS double-click scripts).
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

pause_and_exit() {
  echo
  read -r -p "Presiona Enter para cerrar esta ventana..." _
  exit "$1"
}

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker Desktop no está instalado."
    echo "Se abrirá la página de descarga. Instálalo, ábrelo una vez y vuelve a hacer doble clic en este archivo."
    open "https://www.docker.com/products/docker-desktop/"
    pause_and_exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Abriendo Docker Desktop (puede tardar un minuto)..."
    open -a Docker
    for _ in $(seq 1 90); do
      docker info >/dev/null 2>&1 && break
      sleep 2
    done
    if ! docker info >/dev/null 2>&1; then
      echo "Docker Desktop no terminó de arrancar. Ábrelo manualmente, espera a que diga 'Running' y vuelve a intentarlo."
      pause_and_exit 1
    fi
  fi
  [ -f .env ] || cp .env.example .env
}

app_port() {
  local p
  p=$(grep -E '^APP_PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '"[:space:]')
  echo "${p:-3001}"
}

wait_for_app() {
  local url="http://localhost:$(app_port)"
  for _ in $(seq 1 120); do
    if curl -fs "$url/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}
