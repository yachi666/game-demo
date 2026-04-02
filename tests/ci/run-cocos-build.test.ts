import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(__dirname, '../..');
const WRAPPER_PATH = path.join(ROOT_DIR, 'tools/ci/run-cocos-build.sh');

function createFakeCreatorApp(tempDir: string): string {
  const appRoot = path.join(tempDir, 'FakeCocosCreator.app');
  const binaryPath = path.join(appRoot, 'Contents/MacOS/CocosCreator');
  const script = `#!/bin/sh
set -eu

build_arg=""

while [ "$#" -gt 0 ]; do
  if [ "$1" = "--build" ]; then
    build_arg="$2"
    shift 2
    continue
  fi
  shift
done

config_path=$(printf '%s' "$build_arg" | sed -n 's/.*configPath=\\([^;]*\\).*/\\1/p')
log_dest=$(printf '%s' "$build_arg" | sed -n 's/.*logDest=\\([^;]*\\).*/\\1/p')

if [ -n "\${FAKE_COCOS_STDOUT_TEXT:-}" ]; then
  printf '%s\\n' "$FAKE_COCOS_STDOUT_TEXT"
fi

if [ -n "\${FAKE_COCOS_LOG_TEXT:-}" ]; then
  mkdir -p "$(dirname "$log_dest")"
  printf '%s\\n' "$FAKE_COCOS_LOG_TEXT" > "$log_dest"
fi

if [ "\${FAKE_COCOS_CREATE_OUTPUT:-1}" = "1" ]; then
  node -e "const fs=require('fs');const path=require('path');const config=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const publishedDir=path.join(config.buildPath,config.outputName);fs.mkdirSync(publishedDir,{recursive:true});const mode=process.env.FAKE_COCOS_OUTPUT_MODE||'index';if(mode==='index'){fs.writeFileSync(path.join(publishedDir,'index.html'),'<html></html>');}else{fs.writeFileSync(path.join(publishedDir,'junk.txt'),'junk');}" "$config_path"
fi

exit "\${FAKE_COCOS_EXIT_CODE:-36}"
`;

  fs.mkdirSync(path.dirname(binaryPath), { recursive: true });
  fs.writeFileSync(binaryPath, script, { encoding: 'utf8', mode: 0o755 });
  return appRoot;
}

function runWrapper(tempDir: string, extraEnv: NodeJS.ProcessEnv = {}) {
  const fakeApp = createFakeCreatorApp(tempDir);
  const editorLogPath = path.join(tempDir, 'editor-source.log');
  fs.writeFileSync(editorLogPath, 'editor log', 'utf8');

  return spawnSync('bash', [WRAPPER_PATH], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    env: {
      ...process.env,
      COCOS_CREATOR_APP: fakeApp,
      COCOS_ARTIFACTS_DIR: path.join(tempDir, 'artifacts'),
      COCOS_EDITOR_LOG_SOURCE: editorLogPath,
      COCOS_PROJECT_ROOT: ROOT_DIR,
      COCOS_RUN_ID: 'test-run',
      ...extraEnv,
    },
  });
}

function writeBuildConfig(
  tempDir: string,
  transform: (config: Record<string, unknown>) => Record<string, unknown>,
): string {
  const configPath = path.join(tempDir, 'build-config.json');
  const baseConfig = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'tools/ci/cocos-build-web-desktop.json'), 'utf8'),
  ) as Record<string, unknown>;
  const config = transform(baseConfig);
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return configPath;
}

describe('run-cocos-build.sh', () => {
  it('writes effective config and preserved artifacts for a successful build', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const result = runWrapper(tempDir, {
      FAKE_COCOS_STDOUT_TEXT: 'creator build ok',
      FAKE_COCOS_LOG_TEXT: 'build completed',
      FAKE_COCOS_EXIT_CODE: '36',
    });

    const artifactDir = path.join(tempDir, 'artifacts', 'test-run');
    const sourceConfigPath = path.join(artifactDir, 'config.source.json');
    const effectiveConfigPath = path.join(artifactDir, 'config.effective.json');

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(artifactDir, 'command.log'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'cocos-log.txt'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'editor-log.txt'))).toBe(true);
    expect(fs.existsSync(sourceConfigPath)).toBe(true);
    expect(fs.existsSync(effectiveConfigPath)).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'output-tree.txt'))).toBe(true);

    const sourceConfig = JSON.parse(fs.readFileSync(sourceConfigPath, 'utf8'));
    const effectiveConfig = JSON.parse(fs.readFileSync(effectiveConfigPath, 'utf8'));
    const publishedOutputDir = path.join(effectiveConfig.buildPath, effectiveConfig.outputName);

    expect(sourceConfig.buildPath).toBe('build/cocos/web-desktop');
    expect(effectiveConfig.buildPath).toBe(path.join(artifactDir, 'output'));
    expect(fs.existsSync(path.join(publishedOutputDir, 'index.html'))).toBe(true);
  });

  it('fails when Cocos exits with a non-success status', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const result = runWrapper(tempDir, {
      FAKE_COCOS_STDOUT_TEXT: 'creator build failed',
      FAKE_COCOS_EXIT_CODE: '34',
      FAKE_COCOS_LOG_TEXT: 'failure',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Cocos build failed with exit code 34');
  });

  it('fails on hard-failure markers even after exit code 36', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const result = runWrapper(tempDir, {
      FAKE_COCOS_EXIT_CODE: '36',
      FAKE_COCOS_LOG_TEXT: 'build failed',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Hard-failure marker found');
  });

  it('preserves command artifacts even when wrapper validation fails before invocation', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const result = runWrapper(tempDir, {
      COCOS_BUILD_CONFIG_PATH: path.join(tempDir, 'missing-config.json'),
    });

    const artifactDir = path.join(tempDir, 'artifacts', 'test-run');

    expect(result.status).toBe(1);
    expect(fs.existsSync(path.join(artifactDir, 'command.log'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'command.txt'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'output-tree.txt'))).toBe(true);
  });

  it('fails when a hard-failure marker appears in an additional editor log file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const editorLogDir = path.join(tempDir, 'editor-logs');
    fs.mkdirSync(editorLogDir, { recursive: true });
    fs.writeFileSync(path.join(editorLogDir, 'main.log'), 'all good', 'utf8');
    fs.writeFileSync(path.join(editorLogDir, 'builder.log'), 'deserialization error happened', 'utf8');

    const result = runWrapper(tempDir, {
      COCOS_EDITOR_LOG_SOURCE: editorLogDir,
      FAKE_COCOS_EXIT_CODE: '36',
      FAKE_COCOS_LOG_TEXT: 'build completed',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Hard-failure marker found');
  });

  it('fails when output is non-empty but the expected web entrypoint is missing', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const result = runWrapper(tempDir, {
      FAKE_COCOS_EXIT_CODE: '36',
      FAKE_COCOS_LOG_TEXT: 'build completed',
      FAKE_COCOS_OUTPUT_MODE: 'junk',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing expected web entrypoint');
  });

  it('fails with preserved artifacts when the effective config is missing outputName', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const configPath = writeBuildConfig(tempDir, (config) => {
      const nextConfig = { ...config };
      delete nextConfig.outputName;
      return nextConfig;
    });

    const result = runWrapper(tempDir, {
      COCOS_BUILD_CONFIG_PATH: configPath,
    });

    const artifactDir = path.join(tempDir, 'artifacts', 'test-run');
    const commandLog = fs.readFileSync(path.join(artifactDir, 'command.log'), 'utf8');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Effective build config is missing outputName');
    expect(result.stderr).toContain('Artifacts:');
    expect(commandLog).toContain('Effective build config is missing outputName');
  });

  it('fails when a hard-failure marker appears in a nested editor log file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-build-'));
    const editorLogDir = path.join(tempDir, 'editor-logs');
    const nestedDir = path.join(editorLogDir, 'nested');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(nestedDir, 'builder.txt'), 'build failed', 'utf8');

    const result = runWrapper(tempDir, {
      COCOS_EDITOR_LOG_SOURCE: editorLogDir,
      FAKE_COCOS_EXIT_CODE: '36',
      FAKE_COCOS_LOG_TEXT: 'build completed',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Hard-failure marker found');
  });
});
