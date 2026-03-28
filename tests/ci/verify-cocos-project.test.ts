import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CANONICAL_SCENE_PATH,
  CANONICAL_SCENE_UUID,
  BUILD_CONFIG_PATH,
  collectPreflightIssues,
  compressScriptUuidToClassId,
  loadBuildConfig,
} from '../../tools/ci/verify-cocos-project.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, '../..');

describe('compressScriptUuidToClassId', () => {
  it('matches the current BattleController scene binding', () => {
    expect(compressScriptUuidToClassId('8d77e944-c80d-434d-a4f6-18ca01c62a70')).toBe('8d77elEyA1DTaT2GMoBxipw');
  });

  it('matches the pinned Cocos builder type example', () => {
    expect(compressScriptUuidToClassId('fc991dd7-0033-4b80-9d41-c8a86a702e59')).toBe('fc9913XADNLgJ1ByKhqcC5Z');
  });
});

describe('loadBuildConfig', () => {
  it('loads the committed web-desktop build contract for Battle.scene', () => {
    const config = loadBuildConfig(ROOT_DIR);

    expect(config.platform).toBe('web-desktop');
    expect(config.startScene).toBe(CANONICAL_SCENE_UUID);
    expect(config.scenes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: `db://${CANONICAL_SCENE_PATH}`,
          uuid: CANONICAL_SCENE_UUID,
        }),
      ]),
    );
    expect(path.normalize(BUILD_CONFIG_PATH)).toContain(path.join('tools', 'ci', 'cocos-build-web-desktop.json'));
  });
});

describe('collectPreflightIssues', () => {
  it('accepts the current repository baseline', () => {
    expect(collectPreflightIssues(ROOT_DIR)).toEqual([]);
  });

  it('reports malformed script meta files instead of throwing', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fortune-board-preflight-'));
    const requiredPaths = [
      'package.json',
      'tsconfig.json',
      'tmp/tsconfig.cocos.json',
      'settings/v2/packages/engine.json',
      'profiles/v2/packages/scene.json',
      '.creator/default-meta.json',
      'assets/scenes/Battle.scene',
      'assets/scenes/Battle.scene.meta',
      BUILD_CONFIG_PATH,
      'assets/scripts/ui/BattleController.ts.meta',
    ];

    for (const relativePath of requiredPaths) {
      const sourcePath = path.join(ROOT_DIR, relativePath);
      const destinationPath = path.join(tempRoot, relativePath);
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }

    const malformedMetaPath = path.join(tempRoot, 'assets/scripts/ui/Broken.ts.meta');
    fs.mkdirSync(path.dirname(malformedMetaPath), { recursive: true });
    fs.writeFileSync(malformedMetaPath, '{"uuid": 123}', 'utf8');

    expect(() => collectPreflightIssues(tempRoot)).not.toThrow();
    expect(collectPreflightIssues(tempRoot)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('assets/scripts/ui/Broken.ts.meta'),
      ]),
    );
  });
});
