#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "Python 3 is required. Install it, then run ./play.sh again."
  exit 1
fi
echo "ELOVE GAME: http://localhost:8081/"
echo "Press Ctrl+C to stop."
(sleep 1; command -v open >/dev/null 2>&1 && open "http://localhost:8081/" || command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:8081/") &
exec "$PY" -m http.server 8081
