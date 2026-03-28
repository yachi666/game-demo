#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/templates/empty-2d"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Missing Cocos template at: $TEMPLATE_DIR" >&2
  exit 1
fi

rsync -a \
  --exclude ".git" \
  --exclude "node_modules" \
  "$TEMPLATE_DIR"/ \
  "$ROOT_DIR"/

mkdir -p \
  "$ROOT_DIR/assets/scenes" \
  "$ROOT_DIR/assets/scripts/core" \
  "$ROOT_DIR/assets/scripts/gameplay" \
  "$ROOT_DIR/assets/scripts/ai" \
  "$ROOT_DIR/assets/scripts/data" \
  "$ROOT_DIR/assets/scripts/ui" \
  "$ROOT_DIR/assets/scripts/utils" \
  "$ROOT_DIR/tests/core" \
  "$ROOT_DIR/tests/gameplay" \
  "$ROOT_DIR/tests/ai" \
  "$ROOT_DIR/tests/setup" \
  "$ROOT_DIR/tools"
