#!/usr/bin/env bash
# Builds build/macaed.html, installing the dependencies on the first run.
# `./build.sh --watch` rebuilds on every change.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm ci
fi

node build.mjs "$@"
