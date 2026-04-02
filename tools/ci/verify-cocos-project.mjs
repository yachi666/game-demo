import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const BUILTIN_CLASS_ID_RE = /^(?:cc|dragonBones|sp|ccsg)\./;
const SCRIPT_CLASS_ID_RE = /^[0-9a-f]{5}[A-Za-z0-9+/]{18}$/i;

export const CANONICAL_SCENE_PATH = 'assets/scenes/Lobby.scene';
export const CANONICAL_SCENE_META_PATH = 'assets/scenes/Lobby.scene.meta';
export const CANONICAL_SCENE_UUID = '8f9373fa-06d5-41db-be49-dc9e9903478f';
export const BATTLE_SCENE_PATH = 'assets/scenes/Battle.scene';
export const BATTLE_SCENE_META_PATH = 'assets/scenes/Battle.scene.meta';
export const BATTLE_SCENE_UUID = '6d8fa4db-c84c-4c65-9490-29da8a5d74cd';
export const BUILD_CONFIG_PATH = 'tools/ci/cocos-build-web-desktop.json';
export const REQUIRED_BASELINE_PATHS = [
  'package.json',
  'tsconfig.json',
  'tmp/tsconfig.cocos.json',
  'settings/v2/packages/engine.json',
  'profiles/v2/packages/scene.json',
  '.creator/default-meta.json',
  BATTLE_SCENE_PATH,
  BATTLE_SCENE_META_PATH,
];

function resolveRepoPath(rootDir, relativePath) {
  return path.join(rootDir, relativePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkDirectory(currentPath, results = []) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const nextPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(nextPath, results);
      continue;
    }
    results.push(nextPath);
  }

  return results;
}

function isCustomScriptClassId(typeId) {
  return SCRIPT_CLASS_ID_RE.test(typeId) && !BUILTIN_CLASS_ID_RE.test(typeId);
}

function collectSceneCustomComponentIds(value, results = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectSceneCustomComponentIds(entry, results);
    }
    return results;
  }

  if (!value || typeof value !== 'object') {
    return results;
  }

  if (typeof value.__type__ === 'string' && isCustomScriptClassId(value.__type__)) {
    results.add(value.__type__);
  }

  for (const nestedValue of Object.values(value)) {
    collectSceneCustomComponentIds(nestedValue, results);
  }

  return results;
}

function collectScriptMetaEntries(rootDir, issues) {
  const scriptsDir = resolveRepoPath(rootDir, 'assets/scripts');
  if (!fs.existsSync(scriptsDir)) {
    return [];
  }

  const scriptMetaEntries = [];

  for (const filePath of walkDirectory(scriptsDir).filter((candidate) => candidate.endsWith('.ts.meta'))) {
    let meta;
    try {
      meta = readJson(filePath);
    } catch (error) {
      issues.push(
        `Failed to parse ${path.relative(rootDir, filePath)}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    if (typeof meta.uuid !== 'string') {
      issues.push(`${path.relative(rootDir, filePath)} must contain a string uuid`);
      continue;
    }

    try {
      scriptMetaEntries.push({
        filePath,
        uuid: meta.uuid,
        classId: compressScriptUuidToClassId(meta.uuid),
      });
    } catch (error) {
      issues.push(
        `Invalid uuid in ${path.relative(rootDir, filePath)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return scriptMetaEntries;
}

function validateBuildConfig(config) {
  const issues = [];
  const expectedSceneUrl = `db://${CANONICAL_SCENE_PATH}`;
  const expectedBattleSceneUrl = `db://${BATTLE_SCENE_PATH}`;

  if (config.platform !== 'web-desktop') {
    issues.push(`Build config platform must be web-desktop, got ${String(config.platform)}`);
  }

  if (config.startScene !== CANONICAL_SCENE_UUID) {
    issues.push(`Build config startScene must be ${CANONICAL_SCENE_UUID}, got ${String(config.startScene)}`);
  }

  const scenes = Array.isArray(config.scenes) ? config.scenes : [];
  const hasCanonicalScene = scenes.some((scene) => {
    return scene && scene.url === expectedSceneUrl && scene.uuid === CANONICAL_SCENE_UUID;
  });
  const hasBattleScene = scenes.some((scene) => {
    return scene && scene.url === expectedBattleSceneUrl && scene.uuid === BATTLE_SCENE_UUID;
  });

  if (!hasCanonicalScene) {
    issues.push(`Build config scenes must include ${expectedSceneUrl} with UUID ${CANONICAL_SCENE_UUID}`);
  }

  if (!hasBattleScene) {
    issues.push(`Build config scenes must include ${expectedBattleSceneUrl} with UUID ${BATTLE_SCENE_UUID}`);
  }

  if (typeof config.buildPath !== 'string' || config.buildPath.length === 0) {
    issues.push('Build config buildPath must be a non-empty string');
  }

  return issues;
}

export function compressScriptUuidToClassId(uuid) {
  const compactUuid = uuid.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compactUuid)) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }

  let classId = compactUuid.slice(0, 5);

  for (let index = 5; index < compactUuid.length; index += 3) {
    const first = Number.parseInt(compactUuid[index], 16);
    const second = Number.parseInt(compactUuid[index + 1], 16);
    const third = Number.parseInt(compactUuid[index + 2], 16);
    const lhs = (first << 2) | (second >> 2);
    const rhs = ((second & 0x3) << 4) | third;
    classId += BASE64_KEYS[lhs] + BASE64_KEYS[rhs];
  }

  return classId;
}

export function loadBuildConfig(rootDir) {
  return readJson(resolveRepoPath(rootDir, BUILD_CONFIG_PATH));
}

export function collectPreflightIssues(rootDir) {
  const issues = [];

  for (const relativePath of REQUIRED_BASELINE_PATHS) {
    if (!fs.existsSync(resolveRepoPath(rootDir, relativePath))) {
      issues.push(`Missing required baseline path: ${relativePath}`);
    }
  }

  const scenePath = resolveRepoPath(rootDir, CANONICAL_SCENE_PATH);
  const sceneMetaPath = resolveRepoPath(rootDir, CANONICAL_SCENE_META_PATH);

  let scene;
  try {
    scene = readJson(scenePath);
  } catch (error) {
    issues.push(`Failed to parse ${CANONICAL_SCENE_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const sceneMeta = readJson(sceneMetaPath);
    if (sceneMeta.uuid !== CANONICAL_SCENE_UUID) {
      issues.push(`${CANONICAL_SCENE_META_PATH} must preserve UUID ${CANONICAL_SCENE_UUID}`);
    }
  } catch (error) {
    issues.push(
      `Failed to read ${CANONICAL_SCENE_META_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const battleSceneMeta = readJson(resolveRepoPath(rootDir, BATTLE_SCENE_META_PATH));
    if (battleSceneMeta.uuid !== BATTLE_SCENE_UUID) {
      issues.push(`${BATTLE_SCENE_META_PATH} must preserve UUID ${BATTLE_SCENE_UUID}`);
    }
  } catch (error) {
    issues.push(`Failed to read ${BATTLE_SCENE_META_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const buildConfig = loadBuildConfig(rootDir);
    issues.push(...validateBuildConfig(buildConfig));
  } catch (error) {
    issues.push(`Failed to read ${BUILD_CONFIG_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (scene) {
    const customComponentIds = [...collectSceneCustomComponentIds(scene)];
    const scriptMetaEntries = collectScriptMetaEntries(rootDir, issues);
    const classIdToMeta = new Map(scriptMetaEntries.map((entry) => [entry.classId, entry]));

    for (const classId of customComponentIds) {
      if (!classIdToMeta.has(classId)) {
        issues.push(`Scene custom component id ${classId} does not match any assets/scripts/*.ts.meta UUID`);
      }
    }
  }

  return issues;
}

export function main(argv = process.argv.slice(2)) {
  const rootArgIndex = argv.indexOf('--root');
  const rootDir = rootArgIndex >= 0 && argv[rootArgIndex + 1] ? path.resolve(argv[rootArgIndex + 1]) : process.cwd();

  const issues = collectPreflightIssues(rootDir);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    return 1;
  }

  console.log('Cocos preflight passed.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
