#!/bin/bash
# Make sure the one shared dev server is running on http://127.0.0.1:5173. Safe to call from many shells at once.
cd "$(dirname "$0")/.." || exit 1
up() { curl -s -o /dev/null --max-time 3 http://127.0.0.1:5173/; }
if ! up; then
  ( flock -n 9 || exit 0; up || (SKEP_NO_HMR=1 nohup npx vite --port 5173 --strictPort --host 127.0.0.1 > /tmp/vite.log 2>&1 &) ) 9>/tmp/vite.lock
  for i in $(seq 1 30); do up && break; sleep 1; done
fi
up && echo "dev server up on http://127.0.0.1:5173" || { echo "dev server failed to start; see /tmp/vite.log"; exit 1; }
