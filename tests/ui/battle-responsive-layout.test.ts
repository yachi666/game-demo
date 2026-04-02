import { describe, expect, it, vi } from 'vitest';

import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';
import { MATCH_CONFIG } from '../../assets/scripts/data/match-config';
import { getBattleLayoutProfile, getBattleRuntimeLayout } from '../../assets/scripts/ui/battle-responsive-layout';

type MockCcModule = ReturnType<typeof createCcMock>;
type MockNode = InstanceType<MockCcModule['Node']>;

function createCcMock() {
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

    public on(eventType: string, callback: (...args: unknown[]) => void): void {
      const callbacks = this.listeners.get(eventType) ?? [];
      callbacks.push(callback);
      this.listeners.set(eventType, callbacks);
    }

    public setPosition(x: number, y: number, z = 0): void {
      this.position = { x, y, z };
    }

    public setScale(x: number, y = x, z = 1): void {
      this.scale = { x, y, z };
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
  };
}

function createLabelNode(NodeCtor: MockCcModule['Node'], LabelCtor: MockCcModule['Label'], name: string): MockNode {
  const node = new NodeCtor(name);
  node.addComponent(LabelCtor);
  return node;
}

function createButtonNode(NodeCtor: MockCcModule['Node'], ButtonCtor: MockCcModule['Button'], name: string): MockNode {
  const node = new NodeCtor(name);
  node.addComponent(ButtonCtor);
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

describe('getBattleLayoutProfile', () => {
  it('throws a clear error for invalid viewport dimensions', () => {
    const invalidViewports = [
      { width: 0, height: 720 },
      { width: -1, height: 720 },
      { width: 1280, height: 0 },
      { width: 1280, height: -1 },
      { width: Number.NaN, height: 720 },
      { width: 1280, height: Number.POSITIVE_INFINITY },
    ];

    for (const viewport of invalidViewports) {
      expect(() => getBattleLayoutProfile(viewport)).toThrow(
        'Viewport width and height must be positive finite numbers',
      );
    }
  });

  it('returns the desktop geometry at the 1.45 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 1450, height: 1000 });

    expect(layout).toEqual({
      profile: 'desktop',
      boardScale: 1,
      centerStage: { x: 0, y: 0, width: 320, height: 132 },
      seatPanels: {
        topLeft: { x: -360, y: 216 },
        topRight: { x: 360, y: 216 },
        bottomRight: { x: 360, y: -156 },
        bottomLeft: { x: -360, y: -156 },
      },
    });
  });

  it('returns the narrow geometry at the 1.0 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 1000, height: 1000 });

    expect(layout).toEqual({
      profile: 'narrow',
      boardScale: 0.88,
      centerStage: { x: 0, y: -12, width: 280, height: 120 },
      seatPanels: {
        topLeft: { x: -286, y: 224 },
        topRight: { x: 286, y: 224 },
        bottomRight: { x: 286, y: -214 },
        bottomLeft: { x: -286, y: -214 },
      },
    });
  });

  it('returns the portrait geometry below the 1.0 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 999, height: 1000 });

    expect(layout).toEqual({
      profile: 'portrait',
      boardScale: 0.76,
      centerStage: { x: 0, y: 52, width: 250, height: 108 },
      seatPanels: {
        topLeft: { x: -176, y: 448 },
        topRight: { x: 176, y: 448 },
        bottomRight: { x: 176, y: -448 },
        bottomLeft: { x: -176, y: -448 },
      },
    });
  });

  it('returns the desktop profile for a wide canvas', () => {
    const layout = getBattleLayoutProfile({ width: 1280, height: 720 });

    expect(layout.profile).toBe('desktop');
    expect(layout.boardScale).toBe(1);
    expect(layout.centerStage).toEqual({ x: 0, y: 0, width: 320, height: 132 });
  });

  it('returns the narrow profile for compressed landscape', () => {
    const layout = getBattleLayoutProfile({ width: 960, height: 720 });

    expect(layout.profile).toBe('narrow');
    expect(layout.boardScale).toBe(0.88);
    expect(layout.centerStage).toEqual({ x: 0, y: -12, width: 280, height: 120 });
  });

  it('returns the portrait profile for mobile-like canvases', () => {
    const layout = getBattleLayoutProfile({ width: 720, height: 1280 });

    expect(layout.profile).toBe('portrait');
    expect(layout.boardScale).toBe(0.76);
    expect(layout.centerStage).toEqual({ x: 0, y: 52, width: 250, height: 108 });
  });

  it('maps profile geometry into deterministic runtime node layout order', () => {
    const runtimeLayout = getBattleRuntimeLayout(getBattleLayoutProfile({ width: 999, height: 1000 }));

    expect(runtimeLayout).toEqual({
      boardScale: 0.76,
      centerStage: { x: 0, y: 52, width: 250, height: 108 },
      seatPanelPositions: [
        { x: -176, y: 448 },
        { x: 176, y: 448 },
        { x: 176, y: -448 },
        { x: -176, y: -448 },
      ],
    });
  });

  it('applies the computed layout to the bound battle scene nodes', async () => {
    vi.resetModules();
    vi.doMock('cc', () => createCcMock());

    const cc = (await import('cc')) as MockCcModule;
    const { Button, Label, Node, UITransform } = cc;
    const { BattleController } = await import('../../assets/scripts/ui/BattleController');
    const { CardHandController } = await import('../../assets/scripts/ui/CardHandController');
    const { HudController } = await import('../../assets/scripts/ui/HudController');
    const { PropertyPrompt } = await import('../../assets/scripts/ui/PropertyPrompt');
    const { ResultPanel } = await import('../../assets/scripts/ui/ResultPanel');
    const { RoleSelectionController } = await import('../../assets/scripts/ui/RoleSelectionController');
    const { SkillButtonController } = await import('../../assets/scripts/ui/SkillButtonController');

    const canvas = new Node('Canvas');
    canvas.addComponent(UITransform).setContentSize(720, 1280);

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
    centerStage.addChild(createButtonNode(Node, Button, 'RollButton'));

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
    propertyPrompt.addChild(createButtonNode(Node, Button, 'BuyButton'));
    propertyPrompt.addChild(createButtonNode(Node, Button, 'SkipButton'));

    const resultPanel = new Node('ResultPanel');
    resultPanel.addComponent(ResultPanel);
    resultPanel.addChild(createLabelNode(Node, Label, 'ResultLabel'));

    const roleSelection = new Node('RoleSelection');
    roleSelection.addComponent(RoleSelectionController);
    roleSelection.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    roleSelection.addChild(new Node('Options'));

    overlayLayer.addChild(propertyPrompt);
    overlayLayer.addChild(resultPanel);
    overlayLayer.addChild(roleSelection);

    BOARD_CONFIG.forEach((_tile, index) => {
      tileLayer.addChild(createTileNode(Node, Label, index));
    });
    MATCH_CONFIG.players.forEach((_player, index) => {
      tokenLayer.addChild(new Node(`Token${index}`));
    });

    const controller = canvas.addComponent(BattleController);

    (controller as BattleController & { bindScene: () => void }).bindScene();

    expect(boardDecorLayer.scale).toEqual({ x: 0.76, y: 0.76, z: 1 });
    expect(tileLayer.scale).toEqual({ x: 0.76, y: 0.76, z: 1 });
    expect(tokenLayer.scale).toEqual({ x: 0.76, y: 0.76, z: 1 });
    expect(centerStage.position).toEqual({ x: 0, y: 52, z: 0 });
    expect(centerStage.getComponent(UITransform)?.contentSize).toEqual({ width: 250, height: 108 });
    expect(seatPanels.getChildByName('SeatPanel0')?.position).toEqual({ x: -176, y: 448, z: 0 });
    expect(seatPanels.getChildByName('SeatPanel1')?.position).toEqual({ x: 176, y: 448, z: 0 });
    expect(seatPanels.getChildByName('SeatPanel2')?.position).toEqual({ x: 176, y: -448, z: 0 });
    expect(seatPanels.getChildByName('SeatPanel3')?.position).toEqual({ x: -176, y: -448, z: 0 });
  });

  it('builds world-map scenic layers and card frames instead of leaving bare text nodes', async () => {
    vi.resetModules();
    vi.doMock('cc', () => createCcMock());

    const cc = (await import('cc')) as MockCcModule;
    const { Button, Label, Node, UITransform } = cc;
    const { BattleController } = await import('../../assets/scripts/ui/BattleController');
    const { CardHandController } = await import('../../assets/scripts/ui/CardHandController');
    const { HudController } = await import('../../assets/scripts/ui/HudController');
    const { PropertyPrompt } = await import('../../assets/scripts/ui/PropertyPrompt');
    const { ResultPanel } = await import('../../assets/scripts/ui/ResultPanel');
    const { RoleSelectionController } = await import('../../assets/scripts/ui/RoleSelectionController');
    const { SkillButtonController } = await import('../../assets/scripts/ui/SkillButtonController');

    const canvas = new Node('Canvas');
    canvas.addComponent(UITransform).setContentSize(1280, 720);

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
    centerStage.addChild(createButtonNode(Node, Button, 'RollButton'));

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
    propertyPrompt.addChild(createButtonNode(Node, Button, 'BuyButton'));
    propertyPrompt.addChild(createButtonNode(Node, Button, 'SkipButton'));

    const resultPanel = new Node('ResultPanel');
    resultPanel.addComponent(ResultPanel);
    resultPanel.addChild(createLabelNode(Node, Label, 'ResultLabel'));

    const roleSelection = new Node('RoleSelection');
    roleSelection.addComponent(RoleSelectionController);
    roleSelection.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    roleSelection.addChild(new Node('Options'));

    overlayLayer.addChild(propertyPrompt);
    overlayLayer.addChild(resultPanel);
    overlayLayer.addChild(roleSelection);

    BOARD_CONFIG.forEach((_tile, index) => {
      tileLayer.addChild(createTileNode(Node, Label, index));
    });
    MATCH_CONFIG.players.forEach((_player, index) => {
      const token = new Node(`Token${index}`);
      token.addChild(createLabelNode(Node, Label, 'Label'));
      tokenLayer.addChild(token);
    });

    const controller = canvas.addComponent(BattleController);

    (controller as BattleController & { bindScene: () => void }).bindScene();

    expect(backgroundLayer.children.map((child) => child.name)).toEqual(
      expect.arrayContaining(['MapBackdrop', 'OceanGlow']),
    );
    expect(boardDecorLayer.children.map((child) => child.name)).toEqual(
      expect.arrayContaining(['RouteRing', 'CenterStageFrame', 'CornerLandmark0', 'CornerLandmark1']),
    );
    expect(tileLayer.getChildByName('Tile0')?.getChildByName('TileFrame')).toBeTruthy();
    expect(seatPanels.getChildByName('SeatPanel0')?.getChildByName('PanelFrame')).toBeTruthy();
    expect(propertyPrompt.getChildByName('PromptFrame')).toBeTruthy();
    expect(resultPanel.getChildByName('ResultFrame')).toBeTruthy();
  });

  it('hides unused seat panels and tokens for reduced player-count battle setups', async () => {
    vi.resetModules();
    vi.doMock('cc', () => createCcMock());

    const cc = (await import('cc')) as MockCcModule;
    const { Button, Label, Node, UITransform } = cc;
    const { setCurrentMatchSetupSelection } = await import('../../assets/scripts/ui/LobbyController');
    const { BattleController } = await import('../../assets/scripts/ui/BattleController');
    const { CardHandController } = await import('../../assets/scripts/ui/CardHandController');
    const { HudController } = await import('../../assets/scripts/ui/HudController');
    const { PropertyPrompt } = await import('../../assets/scripts/ui/PropertyPrompt');
    const { ResultPanel } = await import('../../assets/scripts/ui/ResultPanel');
    const { RoleSelectionController } = await import('../../assets/scripts/ui/RoleSelectionController');
    const { SkillButtonController } = await import('../../assets/scripts/ui/SkillButtonController');

    setCurrentMatchSetupSelection({
      humanPlayers: 2,
      aiPlayers: 1,
      selectedRoleId: 'role-toll',
    });

    const canvas = new Node('Canvas');
    canvas.addComponent(UITransform).setContentSize(720, 1280);

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
    centerStage.addChild(createButtonNode(Node, Button, 'RollButton'));

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
    propertyPrompt.addChild(createButtonNode(Node, Button, 'BuyButton'));
    propertyPrompt.addChild(createButtonNode(Node, Button, 'SkipButton'));

    const resultPanel = new Node('ResultPanel');
    resultPanel.addComponent(ResultPanel);
    resultPanel.addChild(createLabelNode(Node, Label, 'ResultLabel'));

    const roleSelection = new Node('RoleSelection');
    roleSelection.addComponent(RoleSelectionController);
    roleSelection.addChild(createLabelNode(Node, Label, 'TitleLabel'));
    roleSelection.addChild(new Node('Options'));

    overlayLayer.addChild(propertyPrompt);
    overlayLayer.addChild(resultPanel);
    overlayLayer.addChild(roleSelection);

    BOARD_CONFIG.forEach((_tile, index) => {
      tileLayer.addChild(createTileNode(Node, Label, index));
    });
    MATCH_CONFIG.players.forEach((_player, index) => {
      tokenLayer.addChild(new Node(`Token${index}`));
    });

    const controller = canvas.addComponent(BattleController);

    (controller as BattleController & { bindScene: () => void }).bindScene();

    expect(seatPanels.getChildByName('SeatPanel0')?.active).toBe(true);
    expect(seatPanels.getChildByName('SeatPanel1')?.active).toBe(true);
    expect(seatPanels.getChildByName('SeatPanel2')?.active).toBe(true);
    expect(seatPanels.getChildByName('SeatPanel3')?.active).toBe(false);
    expect(tokenLayer.getChildByName('Token0')?.active).toBe(true);
    expect(tokenLayer.getChildByName('Token1')?.active).toBe(true);
    expect(tokenLayer.getChildByName('Token2')?.active).toBe(true);
    expect(tokenLayer.getChildByName('Token3')?.active).toBe(false);
  });
});
