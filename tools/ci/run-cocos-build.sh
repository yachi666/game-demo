#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROJECT_ROOT="${COCOS_PROJECT_ROOT:-$ROOT_DIR}"
CONFIG_SOURCE_PATH="${COCOS_BUILD_CONFIG_PATH:-$ROOT_DIR/tools/ci/cocos-build-web-desktop.json}"
ARTIFACTS_BASE_DIR="${COCOS_ARTIFACTS_DIR:-$ROOT_DIR/artifacts/cocos-build}"
RUN_ID="${COCOS_RUN_ID:-$(date +%Y%m%d-%H%M%S)-$$}"
ARTIFACT_DIR="$ARTIFACTS_BASE_DIR/$RUN_ID"
SOURCE_CONFIG_ARTIFACT="$ARTIFACT_DIR/config.source.json"
EFFECTIVE_CONFIG_ARTIFACT="$ARTIFACT_DIR/config.effective.json"
COMMAND_LOG="$ARTIFACT_DIR/command.log"
COCOS_LOG="$ARTIFACT_DIR/cocos-log.txt"
EDITOR_LOG="$ARTIFACT_DIR/editor-log.txt"
COMMAND_FILE="$ARTIFACT_DIR/command.txt"
OUTPUT_TREE_FILE="$ARTIFACT_DIR/output-tree.txt"
OUTPUT_DIR="$ARTIFACT_DIR/output"
COCOS_CREATOR_APP="${COCOS_CREATOR_APP:-/Applications/Cocos/Creator/3.8.8/CocosCreator.app}"
COCOS_CREATOR_BIN="${COCOS_CREATOR_BIN:-$COCOS_CREATOR_APP/Contents/MacOS/CocosCreator}"
BUILD_ARGUMENT="configPath=$EFFECTIVE_CONFIG_ARTIFACT;logDest=$COCOS_LOG"
OUTPUT_NAME=""
PUBLISHED_OUTPUT_DIR=""
EXPECTED_WEB_ENTRYPOINT=""

mkdir -p "$ARTIFACT_DIR"
: > "$COMMAND_LOG"
printf 'build not started\n' > "$OUTPUT_TREE_FILE"
printf '%s\n' "$COCOS_CREATOR_BIN --project $PROJECT_ROOT --build $BUILD_ARGUMENT" > "$COMMAND_FILE"

log_info() {
  printf '%s\n' "$*" | tee -a "$COMMAND_LOG"
}

log_error() {
  printf '%s\n' "$*" | tee -a "$COMMAND_LOG" >&2
}

if [[ ! -f "$CONFIG_SOURCE_PATH" ]]; then
  log_error "Missing committed Cocos build config: $CONFIG_SOURCE_PATH"
  exit 1
fi

if [[ ! -x "$COCOS_CREATOR_BIN" ]]; then
  log_error "Missing Cocos Creator binary: $COCOS_CREATOR_BIN"
  exit 1
fi

cp "$CONFIG_SOURCE_PATH" "$SOURCE_CONFIG_ARTIFACT"
cp "$SOURCE_CONFIG_ARTIFACT" "$EFFECTIVE_CONFIG_ARTIFACT"

node --input-type=module - "$EFFECTIVE_CONFIG_ARTIFACT" "$OUTPUT_DIR" <<'NODE'
import fs from 'node:fs';

const [configPath, outputDir] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.buildPath = outputDir;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
NODE

if ! node --input-type=module - "$EFFECTIVE_CONFIG_ARTIFACT" >>"$COMMAND_LOG" 2>&1 <<'NODE'
import fs from 'node:fs';

const [configPath] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const lobbySceneUuid = '8f9373fa-06d5-41db-be49-dc9e9903478f';
const lobbySceneUrl = 'db://assets/scenes/Lobby.scene';
const battleSceneUuid = '6d8fa4db-c84c-4c65-9490-29da8a5d74cd';
const battleSceneUrl = 'db://assets/scenes/Battle.scene';
const scenes = Array.isArray(config.scenes) ? config.scenes : [];
const hasLobbyScene = scenes.some((scene) => scene?.uuid === lobbySceneUuid && scene?.url === lobbySceneUrl);
const hasBattleScene = scenes.some((scene) => scene?.uuid === battleSceneUuid && scene?.url === battleSceneUrl);

if (config.startScene !== lobbySceneUuid || !hasLobbyScene || !hasBattleScene) {
  console.error('Effective build config no longer targets the Lobby shell and Battle scene');
  process.exit(1);
}
NODE
then
  log_error "Effective build config validation failed."
  exit 1
fi

if ! OUTPUT_NAME="$(node --input-type=module - "$EFFECTIVE_CONFIG_ARTIFACT" 2>>"$COMMAND_LOG" <<'NODE'
import fs from 'node:fs';

const [configPath] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const outputName = typeof config.outputName === 'string' ? config.outputName.trim() : '';

if (!outputName) {
  console.error('Effective build config is missing outputName');
  process.exit(1);
}

process.stdout.write(outputName);
NODE
)"; then
  log_error "Effective build config is missing outputName."
  log_error "Artifacts: $ARTIFACT_DIR"
  exit 1
fi

PUBLISHED_OUTPUT_DIR="$OUTPUT_DIR/$OUTPUT_NAME"
EXPECTED_WEB_ENTRYPOINT="$PUBLISHED_OUTPUT_DIR/index.html"

rm -rf "$OUTPUT_DIR"

set +e
"$COCOS_CREATOR_BIN" --project "$PROJECT_ROOT" --build "$BUILD_ARGUMENT" >>"$COMMAND_LOG" 2>&1
COCOS_EXIT_CODE=$?
set -e

copy_editor_log() {
  local candidate
  local source_path="${COCOS_EDITOR_LOG_SOURCE:-}"
  local found=0

  append_logs_from_dir() {
    local dir_path="$1"
    local log_file

    [[ -d "$dir_path" ]] || return 1

    while IFS= read -r log_file; do
      found=1
      {
        printf '===== %s =====\n' "$log_file"
        cat "$log_file"
        printf '\n'
      } >> "$EDITOR_LOG"
    done < <(find "$dir_path" -type f | sort)

    [[ "$found" -eq 1 ]]
  }

  if [[ -n "$source_path" && -f "$source_path" ]]; then
    cp "$source_path" "$EDITOR_LOG"
    return 0
  fi

  if [[ -n "$source_path" ]] && append_logs_from_dir "$source_path"; then
    return 0
  fi

  for candidate in \
    "$HOME/Library/Logs/CocosCreator" \
    "$HOME/Library/Logs/CocosDashboard"
  do
    if append_logs_from_dir "$candidate"; then
      return 0
    fi
  done

  return 1
}

copy_editor_log || true

if [[ -d "$OUTPUT_DIR" ]]; then
  find "$OUTPUT_DIR" -print | sort > "$OUTPUT_TREE_FILE"
else
  printf 'missing output directory: %s\n' "$OUTPUT_DIR" > "$OUTPUT_TREE_FILE"
fi

scan_logs_for_markers() {
  local marker
  local log_path
  local markers=(
    'missing script'
    'deserialization error'
    'import failed'
    'build failed'
  )
  local log_paths=(
    "$COMMAND_LOG"
    "$COCOS_LOG"
    "$EDITOR_LOG"
  )

  for log_path in "${log_paths[@]}"; do
    [[ -f "$log_path" ]] || continue
    for marker in "${markers[@]}"; do
      if tr '[:upper:]' '[:lower:]' < "$log_path" | grep -Fq "$marker"; then
        log_error "Hard-failure marker found in $log_path: $marker"
        return 1
      fi
    done
  done

  return 0
}

if [[ "$COCOS_EXIT_CODE" -ne 36 ]]; then
  log_error "Cocos build failed with exit code $COCOS_EXIT_CODE"
  log_error "Artifacts: $ARTIFACT_DIR"
  exit 1
fi

if [[ ! -d "$OUTPUT_DIR" ]] || [[ -z "$(find "$OUTPUT_DIR" -mindepth 1 -print -quit 2>/dev/null)" ]]; then
  log_error "Cocos build succeeded but output directory is missing or empty: $OUTPUT_DIR"
  log_error "Artifacts: $ARTIFACT_DIR"
  exit 1
fi

if [[ ! -f "$EXPECTED_WEB_ENTRYPOINT" ]]; then
  log_error "Cocos build succeeded but output is missing expected web entrypoint: $EXPECTED_WEB_ENTRYPOINT"
  log_error "Artifacts: $ARTIFACT_DIR"
  exit 1
fi

if ! scan_logs_for_markers; then
  log_error "Artifacts: $ARTIFACT_DIR"
  exit 1
fi

log_info "Cocos build smoke passed."
log_info "Artifacts: $ARTIFACT_DIR"
