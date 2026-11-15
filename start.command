#!/bin/bash
# Double-click on a Mac: installs once, fetches the bronze horse once, then runs the site on localhost.
cd "$(dirname "$0")" || exit 1
# Install on the first run, and again whenever the package list has changed.
if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
  echo "Installing packages..."
  npm install || { echo "npm install failed"; read -r -p "Press Return to close."; exit 1; }
fi
HORSE="public/models/bronze_horse.glb"
if [ ! -f "$HORSE" ]; then
  echo "Fetching the bronze horse (3.5 MB, first run only)..."
  curl -fsSL -o "$HORSE" "https://api.getlayers.ai/storage/v1/object/public/public/assets/laocoon-59f84455c6/bronze_horse.glb" || rm -f "$HORSE"
fi
(sleep 3; open "http://localhost:5173") &
npm run dev
