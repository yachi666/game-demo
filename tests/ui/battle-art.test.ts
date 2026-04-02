import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { BATTLE_ART_ASSETS, REQUIRED_BATTLE_LAYER_NAMES } from '../../assets/scripts/ui/battle-art';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, '../..');
const BATTLE_SCENE_PATH = path.join(ROOT_DIR, 'assets/scenes/Battle.scene');
const HUD_CONTROLLER_META_PATH = path.join(ROOT_DIR, 'assets/scripts/ui/HudController.ts.meta');
const PROPERTY_PROMPT_META_PATH = path.join(ROOT_DIR, 'assets/scripts/ui/PropertyPrompt.ts.meta');
const RESULT_PANEL_META_PATH = path.join(ROOT_DIR, 'assets/scripts/ui/ResultPanel.ts.meta');
const ROLE_SELECTION_META_PATH = path.join(ROOT_DIR, 'assets/scripts/ui/RoleSelectionController.ts.meta');
const CARD_HAND_META_PATH = path.join(ROOT_DIR, 'assets/scripts/ui/CardHandController.ts.meta');
const SKILL_BUTTON_META_PATH = path.join(ROOT_DIR, 'assets/scripts/ui/SkillButtonController.ts.meta');

interface SceneNodeRecord {
  _children?: Array<{ __id__: number }>;
  _components?: Array<{ __id__: number }>;
  _name?: string;
  __type__?: string;
  node?: { __id__: number };
}

interface ScriptMetaRecord {
  uuid: string;
}

function readSceneRecords(): SceneNodeRecord[] {
  return JSON.parse(fs.readFileSync(BATTLE_SCENE_PATH, 'utf8')) as SceneNodeRecord[];
}

function compressUuid(uuid: string): string {
  const normalized = uuid.replace(/-/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = normalized.slice(0, 5);

  for (let index = 5; index < normalized.length; index += 3) {
    const chunk = Number.parseInt(normalized.slice(index, index + 3), 16);
    output += alphabet[chunk >> 6] + alphabet[chunk & 63];
  }

  return output;
}

function getCompressedScriptType(metaPath: string): string {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ScriptMetaRecord;
  return compressUuid(meta.uuid);
}

function getNodeRecord(sceneRecords: SceneNodeRecord[], name: string): SceneNodeRecord {
  const record = sceneRecords.find((candidate) => candidate._name === name);
  expect(record, `Missing node ${name} in Battle.scene`).toBeDefined();
  return record!;
}

function getChildNames(sceneRecords: SceneNodeRecord[], name: string): string[] {
  const record = getNodeRecord(sceneRecords, name);
  return (record._children ?? []).map((childReference) => sceneRecords[childReference.__id__]?._name ?? '');
}

function getComponentTypes(sceneRecords: SceneNodeRecord[], name: string): string[] {
  const record = getNodeRecord(sceneRecords, name);
  return (record._components ?? []).map(
    (componentReference) => sceneRecords[componentReference.__id__]?.__type__ ?? '',
  );
}

function getSerializedComponentTypesForNode(sceneRecords: SceneNodeRecord[], name: string): string[] {
  const nodeIndex = sceneRecords.findIndex((candidate) => candidate._name === name);
  expect(nodeIndex, `Missing node ${name} in Battle.scene`).toBeGreaterThanOrEqual(0);

  return sceneRecords.filter((record) => record.node?.__id__ === nodeIndex).map((record) => record.__type__ ?? '');
}

function getCanvasChildNames(): string[] {
  const sceneRecords = readSceneRecords();
  const canvasRecord = getNodeRecord(sceneRecords, 'Canvas');
  expect(canvasRecord?._children).toBeDefined();

  return (canvasRecord?._children ?? [])
    .map((childReference) => sceneRecords[childReference.__id__]?._name ?? '')
    .filter((name) => name !== 'UICamera_Canvas');
}

describe('battle art contract', () => {
  it('declares battle art assets under world-map-oriented identifiers', () => {
    expect(BATTLE_ART_ASSETS).toMatchObject({
      background: expect.stringMatching(/^battle-polish\//),
      topBanner: expect.stringMatching(/^battle-polish\//),
      centerStage: expect.stringMatching(/^battle-polish\//),
      edgeActionShell: expect.stringMatching(/^battle-polish\//),
      seatPanelFrame: expect.stringMatching(/^battle-polish\//),
      tileFrame: expect.stringMatching(/^battle-polish\//),
      propertyPromptFrame: expect.stringMatching(/^battle-polish\//),
      resultPanelFrame: expect.stringMatching(/^battle-polish\//),
    });

    Object.values(BATTLE_ART_ASSETS).forEach((assetIdentifier) => {
      expect(assetIdentifier).not.toContain('amusement');
    });
  });

  it('declares every required scene layer root', () => {
    expect(REQUIRED_BATTLE_LAYER_NAMES).toEqual([
      'BackgroundLayer',
      'BoardDecorLayer',
      'TileLayer',
      'TokenLayer',
      'HudLayer',
      'OverlayLayer',
    ]);
  });

  it('keeps the overlay layer separate from scenic, tile, token, and hud roots in Battle.scene order', () => {
    expect(getCanvasChildNames()).toEqual([
      'BackgroundLayer',
      'BoardDecorLayer',
      'TileLayer',
      'TokenLayer',
      'HudLayer',
      'OverlayLayer',
    ]);
  });

  it('prebuilds the stable polished battle UI skeleton inside Battle.scene', () => {
    const sceneRecords = readSceneRecords();

    expect(getChildNames(sceneRecords, 'BackgroundLayer')).toEqual(['MapBackdrop', 'OceanGlow', 'EdgeGlow']);
    expect(getChildNames(sceneRecords, 'BoardDecorLayer')).toEqual([
      'WorldMapScenicMass',
      'RouteRing',
      'CenterStageFrame',
      'TopBannerBridge',
      'CornerLandmark0',
      'CornerLandmark1',
      'CornerLandmark2',
      'CornerLandmark3',
    ]);
    expect(getChildNames(sceneRecords, 'HudLayer')).toEqual([
      'TopInfoBanner',
      'SeatPanels',
      'CenterStage',
      'EdgeActions',
      'ActionArea',
    ]);
    expect(getChildNames(sceneRecords, 'TopInfoBanner')).toEqual([
      'BannerFrame',
      'RoundSummaryLabel',
      'IncomeSummaryLabel',
      'EventSummaryLabel',
    ]);
    expect(getChildNames(sceneRecords, 'OverlayLayer')).toEqual(['PropertyPrompt', 'ResultPanel', 'RoleSelection']);
    expect(getChildNames(sceneRecords, 'ActionArea')).toEqual(['LogLabel', 'CardHand', 'SkillButton']);
    expect(getChildNames(sceneRecords, 'CenterStage')).toEqual([
      'DiceStageBase',
      'DicePlazaGlow',
      'DicePlazaFrame',
      'DicePairAnchor',
      'RoundInfoLabel',
      'RollButtonFrame',
      'RollButton',
    ]);
    expect(getChildNames(sceneRecords, 'EdgeActions')).toEqual([
      'RightActionStack',
      'BottomLeftActionStack',
      'BottomRightActionStack',
    ]);
    expect(getChildNames(sceneRecords, 'RightActionStack')).toEqual(['ChatButton', 'EmojiButton', 'MenuButton']);
    expect(getChildNames(sceneRecords, 'BottomLeftActionStack')).toEqual(['MapButton', 'TravelButton']);
    expect(getChildNames(sceneRecords, 'BottomRightActionStack')).toEqual(['RankButton', 'EventButton']);
    expect(getChildNames(sceneRecords, 'CardHand')).toEqual(['TitleLabel', 'Cards']);
    expect(getChildNames(sceneRecords, 'SkillButton')).toEqual(['Label']);
    expect(getChildNames(sceneRecords, 'PropertyPrompt')).toEqual([
      'TitleLabel',
      'DistrictLabel',
      'CostLabel',
      'ProjectedCashLabel',
      'BuyButton',
      'SkipButton',
    ]);
    expect(getChildNames(sceneRecords, 'RoleSelection')).toEqual(['TitleLabel', 'Options']);
    const expectedSeatPanelNames = MATCH_CONFIG.players.map((_player, index) => `SeatPanel${index}`);
    expect(getChildNames(sceneRecords, 'SeatPanels')).toEqual(expectedSeatPanelNames);
    expectedSeatPanelNames.forEach((seatPanelName) => {
      expect(getChildNames(sceneRecords, seatPanelName)).toEqual([
        'AvatarPlate',
        'PanelFrame',
        'PanelAccent',
        'PropertyStack',
        'PlayerNameLabel',
        'CashLabel',
        'AssetLabel',
        'StatusBadge',
      ]);
    });
    const expectedTileNames = BOARD_CONFIG.map((_tile, index) => `Tile${index}`);
    expect(getChildNames(sceneRecords, 'TileLayer')).toEqual(expectedTileNames);
    expectedTileNames.forEach((tileName) => {
      expect(getChildNames(sceneRecords, tileName)).toEqual([
        'TileFrame',
        'TileAccentBand',
        'TileBadgePlate',
        'BuildingStackAnchor',
        'TitleLabel',
        'SupportingLabel',
        'BadgeLabel',
      ]);
    });
    const expectedTokenNames = MATCH_CONFIG.players.map((_player, index) => `Token${index}`);
    expect(getChildNames(sceneRecords, 'TokenLayer')).toEqual(expectedTokenNames);
    expectedTokenNames.forEach((tokenName) => {
      expect(getChildNames(sceneRecords, tokenName)).toEqual(['Label']);
    });
  });

  it('uses container nodes instead of repurposed legacy labels for the stable scene skeleton', () => {
    const sceneRecords = readSceneRecords();

    ['SeatPanels', 'CenterStage', 'ActionArea', 'RoleSelection'].forEach((containerName) => {
      expect(getComponentTypes(sceneRecords, containerName)).not.toContain('cc.Label');
      expect(getSerializedComponentTypesForNode(sceneRecords, containerName)).not.toContain('cc.Label');
    });
  });

  it('serializes stable battle controllers into Battle.scene instead of relying on runtime addComponent fallbacks', () => {
    const sceneRecords = readSceneRecords();

    expect(getComponentTypes(sceneRecords, 'HudLayer')).toContain(getCompressedScriptType(HUD_CONTROLLER_META_PATH));
    expect(getComponentTypes(sceneRecords, 'PropertyPrompt')).toContain(
      getCompressedScriptType(PROPERTY_PROMPT_META_PATH),
    );
    expect(getComponentTypes(sceneRecords, 'ResultPanel')).toContain(getCompressedScriptType(RESULT_PANEL_META_PATH));
    expect(getComponentTypes(sceneRecords, 'RoleSelection')).toContain(
      getCompressedScriptType(ROLE_SELECTION_META_PATH),
    );
    expect(getComponentTypes(sceneRecords, 'CardHand')).toContain(getCompressedScriptType(CARD_HAND_META_PATH));
    expect(getComponentTypes(sceneRecords, 'SkillButton')).toContain(getCompressedScriptType(SKILL_BUTTON_META_PATH));
  });
});
