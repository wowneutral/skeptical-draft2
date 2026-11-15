#!/bin/bash
# Type-check the whole project but report only the errors in one version's folder.
# usage: bash test/tscheck.sh <slug>      (no slug: report everything)
cd "$(dirname "$0")/.." || exit 1
out=$(npx tsc --noEmit -p tsconfig.json 2>&1)
if [ -n "$1" ]; then out=$(echo "$out" | grep -A3 "src/versions/$1/"); fi
if [ -z "$out" ]; then echo "types OK${1:+ for $1}"; else echo "$out" | head -60; exit 1; fi
