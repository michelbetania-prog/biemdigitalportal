#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .compiled
rm -f src/App.js src/main.js src/icons.js
tsc
for file in main App icons; do
  sed -e "s#'./App.jsx'#'./App.js'#g" -e "s#'./icons.jsx'#'./icons.js'#g" ".compiled/${file}.js" > "src/${file}.js"
done
rm -rf .compiled
printf 'Portal compiled successfully.\n'
