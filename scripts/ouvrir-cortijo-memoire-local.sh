#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/ouvrir-cortijo-local.sh" "http://localhost:5173/?view=cortijo-memoire"
