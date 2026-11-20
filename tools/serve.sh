#!/usr/bin/env bash
# Serve the SHIP2666 explorable reconstruction locally.
# Usage: ./tools/serve.sh [port]
# Then open http://localhost:<port> in a browser.
set -euo pipefail
PORT="${1:-5173}"
cd "$(dirname "$0")/.."
echo "Serving SHIP2666 on http://localhost:$PORT"
echo "Open http://localhost:$PORT in your browser."
python3 -m http.server "$PORT"
