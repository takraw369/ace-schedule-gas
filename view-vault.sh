#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://127.0.0.1:3690"

if lsof -iTCP:3690 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Server already running on ${URL}"
else
  echo "Starting local vault server..."
  nohup node "${ROOT_DIR}/server.js" >"${ROOT_DIR}/.vault-server.log" 2>&1 &
  sleep 1
fi

if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  echo "Open this URL in your browser: $URL"
fi
