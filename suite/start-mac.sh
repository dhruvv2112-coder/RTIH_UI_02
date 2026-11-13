#!/bin/sh
# macOS / Linux: ./start-mac.sh
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Install Node.js LTS from https://nodejs.org/ first."; exit 1; }
PORT=${PORT:-8080}
export PORT
( sleep 1; open "http://localhost:$PORT/" 2>/dev/null || xdg-open "http://localhost:$PORT/" 2>/dev/null ) &
exec node server/server.mjs
