#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
URL="${1:-http://127.0.0.1:5173/}"
SERVER_URL="http://127.0.0.1:5173"
LOG_FILE="${TMPDIR:-/tmp}/finca-maria-local.log"
for tool in node npm curl; do
  command -v "$tool" >/dev/null 2>&1 || { printf '%s est nécessaire.\n' "$tool" >&2; exit 1; }
done
server_ready() {
  curl --silent --fail --max-time 1 "$SERVER_URL/api/finca/local-identity" 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",b=>s+=b);process.stdin.on("end",()=>{try{const x=JSON.parse(s);process.exit(x.application==="finca-maria"&&x.checkout===process.argv[1]?0:1)}catch{process.exit(1)}})' "$APP_DIR"
}
cd "$APP_DIR"
if ! server_ready; then
  if curl --silent --max-time 1 "$SERVER_URL/" >/dev/null 2>&1; then
    printf 'Le port 5173 est occupé par une autre application ou une autre copie de FINCA MARIA. Fermer ce serveur avant de relancer.\n' >&2
    exit 1
  fi
  if [[ ! -d node_modules ]]; then npm ci --no-audit --no-fund; fi
  : > "$LOG_FILE"
  nohup npm run dev -- --host 127.0.0.1 --port 5173 --strictPort >> "$LOG_FILE" 2>&1 &
  SERVER_PID=$!
  for _ in {1..45}; do
    if server_ready; then break; fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
    sleep 1
  done
fi
if ! server_ready; then
  printf 'FINCA MARIA ne démarre pas. Journal : %s\n' "$LOG_FILE" >&2
  tail -n 12 "$LOG_FILE" >&2
  exit 1
fi
xdg-open "$URL" >/dev/null 2>&1 || { printf 'Ouvrir cette adresse dans le navigateur : %s\n' "$URL"; }
