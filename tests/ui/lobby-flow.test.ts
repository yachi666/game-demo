import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, '../..');
const LOBBY_SCENE_PATH = path.join(ROOT_DIR, 'assets/scenes/Lobby.scene');
const LOBBY_SCENE_META_PATH = path.join(ROOT_DIR, 'assets/scenes/Lobby.scene.meta');
const LOBBY_CONTROLLER_META_PATH = path.join(ROOT_DIR, 'assets/scripts/ui/LobbyController.ts.meta');
const BATTLE_SCENE_PATH = path.join(ROOT_DIR, 'assets/scenes/Battle.scene');
const BUILD_CONFIG_PATH = path.join(ROOT_DIR, 'tools/ci/cocos-build-web-desktop.json');

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

type MockCcModule = ReturnType<typeof createCcMock>;
type MockNode = InstanceType<MockCcModule['Node']>;

function readSceneRecords(scenePath: string): SceneNodeRecord[] | null {
  if (!fs.existsSync(scenePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(scenePath, 'utf8')) as SceneNodeRecord[];
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

function getCompressedScriptType(metaPath: string): string | null {
  if (!fs.existsSync(metaPath)) {
    return null;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ScriptMetaRecord;
  return compressUuid(meta.uuid);
}

function getNodeRecord(sceneRecords: SceneNodeRecord[], name: string): SceneNodeRecord {
  const record = sceneRecords.find((candidate) => candidate._name === name);
  expect(record, `Missing node ${name}`).toBeDefined();
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

function getCanvasChildNames(sceneRecords: SceneNodeRecord[]): string[] {
  return getChildNames(sceneRecords, 'Canvas').filter((name) => name !== 'UICamera_Canvas');
}

function createCcMock(loadSceneCalls: string[]) {
  class Component {
    public node!: InstanceType<typeof Node>;

    public scheduleOnce(callback: () => void): void {
      callback();
    }
  }

  class Vec3 {
    public constructor(
      public x = 0,
      public y = 0,
      public z = 0,
    ) {}

    public add(other: Vec3): Vec3 {
      this.x += other.x;
      this.y += other.y;
      this.z += other.z;
      return this;
    }

    public clone(): Vec3 {
      return new Vec3(this.x, this.y, this.z);
    }
  }

  class Node {
    public active = true;
    public children: Node[] = [];
    public layer = 0;
    public name: string;
    public parent: Node | null = null;
    public position = { x: 0, y: 0, z: 0 };
    public scale = { x: 1, y: 1, z: 1 };
    private readonly components: Component[] = [];
    private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    public constructor(name = '') {
      this.name = name;
    }

    public addChild(child: Node): void {
      child.parent = this;
      this.children.push(child);
    }

    public addComponent<T extends Component>(ctor: new () => T): T {
      const component = new ctor();
      component.node = this;
      this.components.push(component);
      return component;
    }

    public destroyAllChildren(): void {
      this.children = [];
    }

    public getChildByName(name: string): Node | null {
      return this.children.find((child) => child.name === name) ?? null;
    }

    public getComponent<T extends Component>(ctor: new () => T): T | null {
      return (this.components.find((component) => component instanceof ctor) as T | undefined) ?? null;
    }

    public off(eventType?: string): void {
      if (!eventType) {
        this.listeners.clear();
        return;
      }

      this.listeners.delete(eventType);
    }

    public on(eventType: string, callback: (...args: unknown[]) => void, target?: unknown): void {
      const listeners = this.listeners.get(eventType) ?? [];
      listeners.push(target ? callback.bind(target) : callback);
      this.listeners.set(eventType, listeners);
    }

    public emit(eventType: string, ...args: unknown[]): void {
      this.listeners.get(eventType)?.forEach((listener) => {
        listener(...args);
      });
    }

    public setPosition(x: number, y: number, z = 0): void {
      this.position = { x, y, z };
    }

    public setScale(x: number, y = x, z = 1): void {
      this.scale = { x, y, z };
    }

    public setSiblingIndex(index: number): void {
      if (!this.parent) {
        return;
      }

      const currentIndex = this.parent.children.indexOf(this);
      if (currentIndex < 0) {
        return;
      }

      this.parent.children.splice(currentIndex, 1);
      this.parent.children.splice(Math.max(0, Math.min(index, this.parent.children.length)), 0, this);
    }

    public setWorldPosition(position: Vec3): void {
      this.position = { x: position.x, y: position.y, z: position.z };
    }

    public get worldPosition(): Vec3 {
      return new Vec3(this.position.x, this.position.y, this.position.z);
    }
  }

  class UITransform extends Component {
    public contentSize = { height: 0, width: 0 };

    public setContentSize(width: number, height: number): void {
      this.contentSize = { width, height };
    }
  }

  class Label extends Component {
    public static Overflow = {
      SHRINK: 'shrink',
    } as const;

    public color: Color | null = null;
    public overflow: string | null = null;
    public string = '';
  }

  class Graphics extends Component {
    public commands: string[] = [];

    public clear(): void {
      this.commands.push('clear');
    }

    public moveTo(x: number, y: number): void {
      this.commands.push(`moveTo:${x}:${y}`);
    }

    public lineTo(x: number, y: number): void {
      this.commands.push(`lineTo:${x}:${y}`);
    }

    public roundRect(x: number, y: number, width: number, height: number, radius: number): void {
      this.commands.push(`roundRect:${x}:${y}:${width}:${height}:${radius}`);
    }

    public circle(x: number, y: number, radius: number): void {
      this.commands.push(`circle:${x}:${y}:${radius}`);
    }

    public fill(): void {
      this.commands.push('fill');
    }

    public stroke(): void {
      this.commands.push('stroke');
    }
  }

  class Button extends Component {
    public static EventType = {
      CLICK: 'click',
    } as const;

    public static Transition = {
      NONE: 'none',
    } as const;

    public interactable = true;
    public transition = Button.Transition.NONE;
  }

  class Color {
    public constructor(
      public r: number,
      public g: number,
      public b: number,
      public a: number,
    ) {}
  }

  class UIOpacity extends Component {
    public opacity = 255;
  }

  function tween<T>(target: T) {
    let onDone: (() => void) | undefined;

    return {
      call(callback: () => void) {
        onDone = callback;
        return this;
      },
      start() {
        onDone?.();
        return target;
      },
      to() {
        return this;
      },
    };
  }

  const _decorator = {
    ccclass:
      () =>
      <T>(target: T) =>
        target,
    property: () => () => undefined,
  };

  const director = {
    loadScene: (sceneName: string) => {
      loadSceneCalls.push(sceneName);
    },
  };

  const profiler = {
    hideStats: () => undefined,
  };

  return {
    _decorator,
    Button,
    Color,
    Component,
    Graphics,
    Label,
    Node,
    profiler,
    tween,
    UIOpacity,
    UITransform,
    Vec3,
    director,
  };
}

function createLabelNode(NodeCtor: MockCcModule['Node'], LabelCtor: MockCcModule['Label'], name: string): MockNode {
  const node = new NodeCtor(name);
  node.addComponent(LabelCtor);
  return node;
}

function createButtonNode(
  NodeCtor: MockCcModule['Node'],
  ButtonCtor: MockCcModule['Button'],
  LabelCtor: MockCcModule['Label'],
  name: string,
): MockNode {
  const node = new NodeCtor(name);
  node.addComponent(ButtonCtor);
  node.addComponent(LabelCtor);
  return node;
}

function createSeatPanel(NodeCtor: MockCcModule['Node'], LabelCtor: MockCcModule['Label'], index: number): MockNode {
  const node = new NodeCtor(`SeatPanel${index}`);
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'TitleLabel'));
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'StatsLabel'));
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'StateLabel'));
  return node;
}

function createTileNode(NodeCtor: MockCcModule['Node'], LabelCtor: MockCcModule['Label'], index: number): MockNode {
  const node = new NodeCtor(`Tile${index}`);
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'TitleLabel'));
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'SupportingLabel'));
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'BadgeLabel'));
  return node;
}

describe('product shell lobby flow', () => {
  it('serializes a tiny lobby scene with a bound LobbyController and start affordance', () => {
    const sceneRecords = readSceneRecords(LOBBY_SCENE_PATH);
    const lobbyControllerType = getCompressedScriptType(LOBBY_CONTROLLER_META_PATH);

    expect(sceneRecords, 'Missing Lobby.scene').toBeTruthy();
    expect(lobbyControllerType, 'Missing LobbyController.ts.meta').toBeTruthy();
    if (!sceneRecords || !lobbyControllerType) {
      return;
    }

    expect(getCanvasChildNames(sceneRecords)).toEqual(['LobbyRoot']);
    expect(getChildNames(sceneRecords, 'LobbyRoot')).toEqual(['TitleLabel', 'SelectionLabel', 'StartButton']);
    expect(getComponentTypes(sceneRecords, 'LobbyRoot')).toContain(lobbyControllerType);
    expect(getComponentTypes(sceneRecords, 'StartButton')).toEqual(expect.arrayContaining(['cc.Button', 'cc.Label']));
  });

  it('boots into Lobby before Battle in the committed web-desktop build config', () => {
    const buildConfig = JSON.parse(fs.readFileSync(BUILD_CONFIG_PATH, 'utf8')) as {
      scenes?: Array<{ url?: string; uuid?: string }>;
      startScene?: string;
    };
    const lobbySceneMeta = JSON.parse(fs.readFileSync(LOBBY_SCENE_META_PATH, 'utf8')) as ScriptMetaRecord;

    expect(buildConfig.startScene).toBe(lobbySceneMeta.uuid);
    expect(buildConfig.scenes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'db://assets/scenes/Lobby.scene',
          uuid: lobbySceneMeta.uuid,
        }),
        expect.objectContaining({
          url: 'db://assets/scenes/Battle.scene',
        }),
      ]),
    );
  });

  it('normalizes oversized setup selections from the StartButton click and relabels seats consistently', async () => {
    vi.resetModules();
    const loadSceneCalls: string[] = [];
    vi.doMock('cc', () => createCcMock(loadSceneCalls));

    let lobbyModule: typeof import('../../assets/scripts/ui/LobbyController') | null = null;

    try {
      lobbyModule = await import('../../assets/scripts/ui/LobbyController');
    } catch {
      lobbyModule = null;
    }

    expect(lobbyModule, 'Missing LobbyController module').toBeTruthy();
    if (!lobbyModule) {
      return;
    }

    expect(typeof lobbyModule.applyMatchSetupSelection).toBe('function');
    expect(typeof lobbyModule.getCurrentMatchSetupSelection).toBe('function');
    if (
      typeof lobbyModule.applyMatchSetupSelection !== 'function' ||
      typeof lobbyModule.getCurrentMatchSetupSelection !== 'function'
    ) {
      return;
    }

    const cc = (await import('cc')) as MockCcModule;
    const { Button, Label, Node } = cc;
    const lobbyRoot = new Node('LobbyRoot');
    const startButtonNode = createButtonNode(Node, Button, Label, 'StartButton');
    lobbyRoot.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    lobbyRoot.addChild(createLabelNode(Node, Label, 'SelectionLabel'));
    lobbyRoot.addChild(startButtonNode);

    const controller = lobbyRoot.addComponent(lobbyModule.LobbyController);
    controller.root = lobbyRoot;
    controller.start();
    controller.render({
      humanPlayers: 3,
      aiPlayers: 3,
    });
    startButtonNode.emit(Button.EventType.CLICK);

    expect(lobbyModule.getCurrentMatchSetupSelection()).toEqual({
      humanPlayers: 3,
      aiPlayers: 1,
    });
    expect(loadSceneCalls).toEqual(['Battle']);

    const battleConfig = lobbyModule.applyMatchSetupSelection(
      MATCH_CONFIG,
      lobbyModule.getCurrentMatchSetupSelection(),
    );
    expect(battleConfig.players.map((player) => ({ label: player.label, isHuman: player.isHuman }))).toEqual([
      { label: 'Player 1', isHuman: true },
      { label: 'Player 2', isHuman: true },
      { label: 'Player 3', isHuman: true },
      { label: 'AI 1', isHuman: false },
    ]);
  });

  it('falls back to supported seat counts when setup values are not finite', async () => {
    vi.resetModules();
    vi.doMock('cc', () => createCcMock([]));

    let lobbyModule: typeof import('../../assets/scripts/ui/LobbyController') | null = null;

    try {
      lobbyModule = await import('../../assets/scripts/ui/LobbyController');
    } catch {
      lobbyModule = null;
    }

    expect(lobbyModule, 'Missing LobbyController module').toBeTruthy();
    if (!lobbyModule) {
      return;
    }

    const normalizedSelection = lobbyModule.setCurrentMatchSetupSelection({
      humanPlayers: Number.NaN,
      aiPlayers: Number.NaN,
    });

    expect(normalizedSelection).toEqual({
      humanPlayers: 1,
      aiPlayers: 3,
    });
    expect(lobbyModule.applyMatchSetupSelection(MATCH_CONFIG, normalizedSelection).players).toHaveLength(4);
  });

  it('boots Battle from a non-default lobby selection and applies the stored role choice', async () => {
    vi.resetModules();
    const loadSceneCalls: string[] = [];
    vi.doMock('cc', () => createCcMock(loadSceneCalls));

    let lobbyModule: typeof import('../../assets/scripts/ui/LobbyController') | null = null;
    let battleModule: typeof import('../../assets/scripts/ui/BattleController') | null = null;

    try {
      lobbyModule = await import('../../assets/scripts/ui/LobbyController');
      battleModule = await import('../../assets/scripts/ui/BattleController');
    } catch {
      lobbyModule = null;
      battleModule = null;
    }

    expect(lobbyModule, 'Missing LobbyController module').toBeTruthy();
    expect(battleModule, 'Missing BattleController module').toBeTruthy();
    if (!lobbyModule || !battleModule) {
      return;
    }

    expect(typeof battleModule.createInitialBattleMatch).toBe('function');
    if (typeof battleModule.createInitialBattleMatch !== 'function') {
      return;
    }

    const cc = (await import('cc')) as MockCcModule;
    const { Button, Label, Node } = cc;
    const lobbyRoot = new Node('LobbyRoot');
    const startButtonNode = createButtonNode(Node, Button, Label, 'StartButton');
    lobbyRoot.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    lobbyRoot.addChild(createLabelNode(Node, Label, 'SelectionLabel'));
    lobbyRoot.addChild(startButtonNode);

    const controller = lobbyRoot.addComponent(lobbyModule.LobbyController);
    controller.root = lobbyRoot;
    controller.start();
    controller.render({
      humanPlayers: 2,
      aiPlayers: 1,
      selectedRoleId: 'role-toll',
    });
    startButtonNode.emit(Button.EventType.CLICK);

    expect(loadSceneCalls).toEqual(['Battle']);
    expect(lobbyModule.getCurrentMatchSetupSelection()).toEqual({
      humanPlayers: 2,
      aiPlayers: 1,
      selectedRoleId: 'role-toll',
    });

    const battleMatch = battleModule.createInitialBattleMatch();
    expect(battleMatch.requiresRoleSelection).toBe(false);
    expect(
      battleMatch.players.map((player) => ({ label: player.label, isHuman: player.isHuman, roleId: player.roleId })),
    ).toEqual([
      { label: 'Player 1', isHuman: true, roleId: 'role-toll' },
      { label: 'Player 2', isHuman: true, roleId: 'role-economy' },
      { label: 'AI 1', isHuman: false, roleId: 'role-mobility' },
    ]);
  });

  it('falls back to live role selection when the stored lobby role is invalid', async () => {
    vi.resetModules();
    vi.doMock('cc', () => createCcMock([]));

    let lobbyModule: typeof import('../../assets/scripts/ui/LobbyController') | null = null;
    let battleModule: typeof import('../../assets/scripts/ui/BattleController') | null = null;

    try {
      lobbyModule = await import('../../assets/scripts/ui/LobbyController');
      battleModule = await import('../../assets/scripts/ui/BattleController');
    } catch {
      lobbyModule = null;
      battleModule = null;
    }

    expect(lobbyModule, 'Missing LobbyController module').toBeTruthy();
    expect(battleModule, 'Missing BattleController module').toBeTruthy();
    if (!lobbyModule || !battleModule) {
      return;
    }

    lobbyModule.setCurrentMatchSetupSelection({
      humanPlayers: 1,
      aiPlayers: 3,
      selectedRoleId: 'role-unknown',
    });

    const battleMatch = battleModule.createInitialBattleMatch();
    expect(battleMatch.requiresRoleSelection).toBe(true);
    expect(battleMatch.players.map((player) => player.roleId)).toEqual([null, null, null, null]);
    expect(battleMatch.availableRoleIds).toEqual(MATCH_CONFIG.availableRoleIds);
  });

  it('persists a role picked in Battle for replay and return-to-lobby shell actions', async () => {
    vi.resetModules();
    const loadSceneCalls: string[] = [];
    vi.doMock('cc', () => createCcMock(loadSceneCalls));

    let lobbyModule: typeof import('../../assets/scripts/ui/LobbyController') | null = null;
    let battleModule: typeof import('../../assets/scripts/ui/BattleController') | null = null;

    try {
      lobbyModule = await import('../../assets/scripts/ui/LobbyController');
      battleModule = await import('../../assets/scripts/ui/BattleController');
    } catch {
      lobbyModule = null;
      battleModule = null;
    }

    expect(lobbyModule, 'Missing LobbyController module').toBeTruthy();
    expect(battleModule, 'Missing BattleController module').toBeTruthy();
    if (!lobbyModule || !battleModule) {
      return;
    }

    expect(typeof battleModule.createInitialBattleMatch).toBe('function');
    if (typeof battleModule.createInitialBattleMatch !== 'function') {
      return;
    }

    const cc = (await import('cc')) as MockCcModule;
    const { Button, Label, Node, UITransform } = cc;
    const { CardHandController } = await import('../../assets/scripts/ui/CardHandController');
    const { HudController } = await import('../../assets/scripts/ui/HudController');
    const { PropertyPrompt } = await import('../../assets/scripts/ui/PropertyPrompt');
    const { ResultPanel } = await import('../../assets/scripts/ui/ResultPanel');
    const { RoleSelectionController } = await import('../../assets/scripts/ui/RoleSelectionController');
    const { SkillButtonController } = await import('../../assets/scripts/ui/SkillButtonController');

    const lobbyRoot = new Node('LobbyRoot');
    const startButtonNode = createButtonNode(Node, Button, Label, 'StartButton');
    lobbyRoot.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    lobbyRoot.addChild(createLabelNode(Node, Label, 'SelectionLabel'));
    lobbyRoot.addChild(startButtonNode);

    const lobbyController = lobbyRoot.addComponent(lobbyModule.LobbyController);
    lobbyController.root = lobbyRoot;
    lobbyController.start();
    startButtonNode.emit(Button.EventType.CLICK);

    expect(loadSceneCalls).toEqual(['Battle']);
    expect(lobbyModule.getCurrentMatchSetupSelection()).toEqual({
      humanPlayers: 1,
      aiPlayers: 3,
      selectedRoleId: 'role-economy',
    });

    lobbyModule.setCurrentMatchSetupSelection({
      humanPlayers: 1,
      aiPlayers: 3,
    });

    const canvas = new Node('Canvas');
    canvas.addComponent(UITransform).setContentSize(960, 640);

    const backgroundLayer = new Node('BackgroundLayer');
    const boardDecorLayer = new Node('BoardDecorLayer');
    const tileLayer = new Node('TileLayer');
    const tokenLayer = new Node('TokenLayer');
    const hudLayer = new Node('HudLayer');
    hudLayer.addComponent(HudController);
    const overlayLayer = new Node('OverlayLayer');

    canvas.addChild(backgroundLayer);
    canvas.addChild(boardDecorLayer);
    canvas.addChild(tileLayer);
    canvas.addChild(tokenLayer);
    canvas.addChild(hudLayer);
    canvas.addChild(overlayLayer);

    const seatPanels = new Node('SeatPanels');
    MATCH_CONFIG.players.forEach((_player, index) => {
      seatPanels.addChild(createSeatPanel(Node, Label, index));
    });

    const centerStage = new Node('CenterStage');
    centerStage.addComponent(UITransform);
    centerStage.addChild(createLabelNode(Node, Label, 'ActivePlayerLabel'));
    centerStage.addChild(createLabelNode(Node, Label, 'TurnLabel'));
    centerStage.addChild(createLabelNode(Node, Label, 'LatestEventLabel'));
    centerStage.addChild(createButtonNode(Node, Button, Label, 'RollButton'));

    const actionArea = new Node('ActionArea');
    actionArea.addChild(createLabelNode(Node, Label, 'LogLabel'));

    const cardHand = new Node('CardHand');
    cardHand.addComponent(CardHandController);
    cardHand.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    cardHand.addChild(new Node('Cards'));
    actionArea.addChild(cardHand);

    const skillButton = new Node('SkillButton');
    skillButton.addComponent(Button);
    skillButton.addComponent(SkillButtonController);
    skillButton.addChild(createLabelNode(Node, Label, 'Label'));
    actionArea.addChild(skillButton);

    hudLayer.addChild(seatPanels);
    hudLayer.addChild(centerStage);
    hudLayer.addChild(actionArea);

    const propertyPrompt = new Node('PropertyPrompt');
    propertyPrompt.addComponent(PropertyPrompt);
    propertyPrompt.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    propertyPrompt.addChild(createLabelNode(Node, Label, 'DistrictLabel'));
    propertyPrompt.addChild(createLabelNode(Node, Label, 'CostLabel'));
    propertyPrompt.addChild(createLabelNode(Node, Label, 'ProjectedCashLabel'));
    propertyPrompt.addChild(createButtonNode(Node, Button, Label, 'BuyButton'));
    propertyPrompt.addChild(createButtonNode(Node, Button, Label, 'SkipButton'));

    const resultPanelNode = new Node('ResultPanel');
    const resultLabelNode = createLabelNode(Node, Label, 'ResultLabel');
    const replayButtonNode = createButtonNode(Node, Button, Label, 'ReplayButton');
    const lobbyButtonNode = createButtonNode(Node, Button, Label, 'LobbyButton');
    resultPanelNode.addComponent(ResultPanel);
    resultPanelNode.addChild(resultLabelNode);
    resultPanelNode.addChild(replayButtonNode);
    resultPanelNode.addChild(lobbyButtonNode);

    const roleSelection = new Node('RoleSelection');
    roleSelection.addComponent(RoleSelectionController);
    roleSelection.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    roleSelection.addChild(new Node('Options'));

    overlayLayer.addChild(propertyPrompt);
    overlayLayer.addChild(resultPanelNode);
    overlayLayer.addChild(roleSelection);

    BOARD_CONFIG.forEach((_tile, index) => {
      tileLayer.addChild(createTileNode(Node, Label, index));
    });
    MATCH_CONFIG.players.forEach((_player, index) => {
      tokenLayer.addChild(new Node(`Token${index}`));
    });

    const battleController = canvas.addComponent(battleModule.BattleController);
    battleController.start();
    battleController.onRoleSelected('role-defense');

    expect(lobbyModule.getCurrentMatchSetupSelection()).toEqual({
      humanPlayers: 1,
      aiPlayers: 3,
      selectedRoleId: 'role-defense',
    });

    battleController.resultPanel?.show('Guardian wins');
    replayButtonNode.emit(Button.EventType.CLICK);
    lobbyButtonNode.emit(Button.EventType.CLICK);

    expect(loadSceneCalls).toEqual(['Battle', 'Battle', 'Lobby']);

    const replayMatch = battleModule.createInitialBattleMatch();
    expect(replayMatch.requiresRoleSelection).toBe(false);
    expect(replayMatch.players.map((player) => player.roleId)).toEqual([
      'role-defense',
      'role-economy',
      'role-toll',
      'role-mobility',
    ]);
    expect(lobbyModule.getCurrentMatchSetupSelection()).toEqual({
      humanPlayers: 1,
      aiPlayers: 3,
      selectedRoleId: 'role-defense',
    });
  });

  it('keeps the last valid shell role when Battle rejects an invalid role pick', async () => {
    vi.resetModules();
    vi.doMock('cc', () => createCcMock([]));

    let lobbyModule: typeof import('../../assets/scripts/ui/LobbyController') | null = null;
    let battleModule: typeof import('../../assets/scripts/ui/BattleController') | null = null;
    let turnFlowModule: typeof import('../../assets/scripts/core/turn-flow') | null = null;

    try {
      lobbyModule = await import('../../assets/scripts/ui/LobbyController');
      battleModule = await import('../../assets/scripts/ui/BattleController');
      turnFlowModule = await import('../../assets/scripts/core/turn-flow');
    } catch {
      lobbyModule = null;
      battleModule = null;
      turnFlowModule = null;
    }

    expect(lobbyModule, 'Missing LobbyController module').toBeTruthy();
    expect(battleModule, 'Missing BattleController module').toBeTruthy();
    expect(turnFlowModule, 'Missing turn-flow module').toBeTruthy();
    if (!lobbyModule || !battleModule || !turnFlowModule) {
      return;
    }

    const cc = (await import('cc')) as MockCcModule;
    const { Node } = cc;
    const controller = new Node('BattleRoot').addComponent(battleModule.BattleController);

    lobbyModule.setCurrentMatchSetupSelection({
      humanPlayers: 1,
      aiPlayers: 3,
      selectedRoleId: 'role-defense',
    });
    (controller as typeof controller & { match: ReturnType<typeof battleModule.createInitialBattleMatch> }).match =
      turnFlowModule.openRoleSelectionFlow(
        battleModule.createInitialBattleMatch({
          humanPlayers: 1,
          aiPlayers: 3,
        }),
      );

    expect(() => controller.onRoleSelected('role-unknown')).toThrow('Unknown role selection');
    expect(lobbyModule.getCurrentMatchSetupSelection()).toEqual({
      humanPlayers: 1,
      aiPlayers: 3,
      selectedRoleId: 'role-defense',
    });
  });

  it('adds replay and return-to-lobby affordances to the battle result shell', async () => {
    const battleSceneRecords = readSceneRecords(BATTLE_SCENE_PATH);

    expect(battleSceneRecords, 'Missing Battle.scene').toBeTruthy();
    if (!battleSceneRecords) {
      return;
    }

    expect(getChildNames(battleSceneRecords, 'ResultPanel')).toEqual(['ResultLabel', 'ReplayButton', 'LobbyButton']);
    expect(getComponentTypes(battleSceneRecords, 'ReplayButton')).toContain('cc.Button');
    expect(getComponentTypes(battleSceneRecords, 'LobbyButton')).toContain('cc.Button');

    vi.resetModules();
    const loadSceneCalls: string[] = [];
    vi.doMock('cc', () => createCcMock(loadSceneCalls));

    const cc = (await import('cc')) as MockCcModule;
    const { Button, Label, Node } = cc;
    const { ResultPanel } = await import('../../assets/scripts/ui/ResultPanel');

    const panelNode = new Node('ResultPanel');
    const resultLabelNode = createLabelNode(Node, Label, 'ResultLabel');
    const replayButtonNode = createButtonNode(Node, Button, Label, 'ReplayButton');
    const lobbyButtonNode = createButtonNode(Node, Button, Label, 'LobbyButton');
    panelNode.addChild(resultLabelNode);
    panelNode.addChild(replayButtonNode);
    panelNode.addChild(lobbyButtonNode);

    const panel = panelNode.addComponent(ResultPanel);
    panel.root = panelNode;
    panel.frameNode = panelNode;
    panel.headlineLabel = resultLabelNode.getComponent(Label);
    panel.resultLabel = resultLabelNode.getComponent(Label);

    panel.onLoad();
    panel.show('Collector wins');
    replayButtonNode.emit(Button.EventType.CLICK);
    lobbyButtonNode.emit(Button.EventType.CLICK);

    expect(panelNode.active).toBe(true);
    expect(panel.resultLabel?.string).toBe('Collector wins');
    expect(loadSceneCalls).toEqual(['Battle', 'Lobby']);
  });
});
