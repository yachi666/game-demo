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
  const avatarPlate = new NodeCtor('AvatarPlate');
  avatarPlate.addComponent(LabelCtor);
  const statusBadge = new NodeCtor('StatusBadge');
  statusBadge.addComponent(LabelCtor);

  node.addChild(avatarPlate);
  node.addChild(new NodeCtor('PanelFrame'));
  node.addChild(new NodeCtor('PanelAccent'));
  node.addChild(new NodeCtor('PropertyStack'));
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'PlayerNameLabel'));
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'CashLabel'));
  node.addChild(createLabelNode(NodeCtor, LabelCtor, 'AssetLabel'));
  node.addChild(statusBadge);
  return node;
}

function createTileNode(NodeCtor: MockCcModule['Node'], LabelCtor: MockCcModule['Label'], index: number): MockNode {
  const node = new NodeCtor(`Tile${index}`);
  node.addChild(new NodeCtor('TileFrame'));
  node.addChild(new NodeCtor('TileAccentBand'));
  node.addChild(new NodeCtor('TileBadgePlate'));
  node.addChild(new NodeCtor('BuildingStackAnchor'));
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

  it('returns the reference-image desktop geometry at the 1.45 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 1450, height: 1000 });

    expect(layout).toMatchObject({
      profile: 'desktop',
      boardScale: 1.14,
      topInfoBanner: { x: 0, y: 244, width: 406, height: 78 },
      centerStage: { x: 0, y: 42, width: 360, height: 208 },
      actionArea: { x: 0, y: -246, width: 360, height: 148 },
      edgeActions: {
        rightStack: { x: 452, y: 18 },
        bottomLeftStack: { x: -372, y: -248 },
        bottomRightStack: { x: 372, y: -248 },
      },
    });
  });

  it('returns the narrow profile at the 1.0 aspect-ratio threshold without collapsing the shell', () => {
    const layout = getBattleLayoutProfile({ width: 1000, height: 1000 });

    expect(layout.profile).toBe('narrow');
    expect(layout.boardScale).toBeGreaterThan(1);
    expect(layout.topInfoBanner).toBeDefined();
    expect(layout.centerStage).toBeDefined();
    expect(layout.actionArea).toBeDefined();
    expect(layout.edgeActions).toBeDefined();
    expect(layout.seatPanels).toBeDefined();
    expect(layout.topInfoBanner?.height).toBeGreaterThanOrEqual(70);
    expect(layout.centerStage?.width).toBeGreaterThanOrEqual(320);
    expect(layout.centerStage?.height).toBeGreaterThanOrEqual(180);
    expect(layout.actionArea?.width).toBeGreaterThanOrEqual(320);
    expect(layout.topInfoBanner?.y).toBeGreaterThan(layout.centerStage!.y);
    expect(layout.centerStage?.y).toBeGreaterThan(layout.actionArea!.y);
    expect(layout.edgeActions?.rightStack.x).toBeGreaterThan(0);
    expect(layout.edgeActions?.bottomLeftStack.x).toBeLessThan(0);
    expect(layout.edgeActions?.bottomRightStack.x).toBeGreaterThan(0);
    expect(layout.seatPanels?.topLeft.x).toBeLessThan(0);
    expect(layout.seatPanels?.topRight.x).toBeGreaterThan(0);
    expect(layout.seatPanels?.topLeft.y).toBeGreaterThan(layout.seatPanels!.bottomLeft.y);
    expect(layout.seatPanels?.topRight.y).toBeGreaterThan(layout.seatPanels!.bottomRight.y);
  });

  it('returns a readable portrait geometry below the 1.0 aspect-ratio threshold', () => {
    const layout = getBattleLayoutProfile({ width: 999, height: 1000 });

    expect(layout.profile).toBe('portrait');
    expect(layout.boardScale).toBeLessThan(1);
    expect(layout.topInfoBanner).toBeDefined();
    expect(layout.centerStage).toBeDefined();
    expect(layout.actionArea).toBeDefined();
    expect(layout.edgeActions).toBeDefined();
    expect(layout.seatPanels).toBeDefined();
    expect(layout.topInfoBanner?.height).toBeGreaterThanOrEqual(70);
    expect(layout.centerStage?.width).toBeGreaterThanOrEqual(280);
    expect(layout.centerStage?.height).toBeGreaterThanOrEqual(150);
    expect(layout.actionArea?.width).toBeGreaterThanOrEqual(292);
    expect(layout.edgeActions?.rightStack.x).toBeGreaterThanOrEqual(280);
    expect(layout.seatPanels?.topLeft.x).toBeLessThanOrEqual(-200);
  });

  // Anti-regression note: evaluate desktop-fidelity screenshots/previews in 设计分辨率 (960X640)
  // or desktop/fullscreen with Show FPS disabled, not in a portrait phone shell.
  it('returns the desktop profile for a wide canvas', () => {
    const layout = getBattleLayoutProfile({ width: 1280, height: 720 });

    expect(layout.profile).toBe('desktop');
    expect(layout.boardScale).toBe(1.14);
    expect(layout.topInfoBanner).toEqual({ x: 0, y: 244, width: 406, height: 78 });
    expect(layout.centerStage).toEqual({ x: 0, y: 42, width: 360, height: 208 });
    expect(layout.actionArea).toEqual({ x: 0, y: -246, width: 360, height: 148 });
  });

  it('returns the narrow profile for compressed landscape', () => {
    const layout = getBattleLayoutProfile({ width: 960, height: 720 });

    expect(layout.profile).toBe('narrow');
    expect(layout.boardScale).toBeGreaterThan(1);
    expect(layout.topInfoBanner).toBeDefined();
    expect(layout.centerStage).toBeDefined();
    expect(layout.actionArea).toBeDefined();
    expect(layout.topInfoBanner?.height).toBeGreaterThanOrEqual(70);
    expect(layout.centerStage?.width).toBeGreaterThanOrEqual(320);
    expect(layout.centerStage?.height).toBeGreaterThanOrEqual(180);
    expect(layout.actionArea?.width).toBeGreaterThanOrEqual(320);
    expect(layout.topInfoBanner?.y).toBeGreaterThan(layout.centerStage!.y);
    expect(layout.centerStage?.y).toBeGreaterThan(layout.actionArea!.y);
  });

  it('returns the portrait profile for mobile-like canvases without collapsing the board shell', () => {
    const layout = getBattleLayoutProfile({ width: 720, height: 1280 });

    expect(layout.profile).toBe('portrait');
    expect(layout.boardScale).toBeLessThan(1);
    expect(layout.topInfoBanner).toBeDefined();
    expect(layout.centerStage).toBeDefined();
    expect(layout.actionArea).toBeDefined();
    expect(layout.edgeActions).toBeDefined();
    expect(layout.seatPanels).toBeDefined();
    expect(layout.topInfoBanner?.height).toBeGreaterThanOrEqual(70);
    expect(layout.centerStage?.width).toBeGreaterThanOrEqual(280);
    expect(layout.centerStage?.height).toBeGreaterThanOrEqual(150);
    expect(layout.actionArea?.width).toBeGreaterThanOrEqual(292);
    expect(layout.edgeActions?.bottomLeftStack.y).toBeLessThanOrEqual(-470);
    expect(layout.seatPanels?.topLeft.x).toBeLessThanOrEqual(-200);
  });

  it('maps desktop profile geometry into deterministic runtime node layout order', () => {
    const runtimeLayout = getBattleRuntimeLayout(getBattleLayoutProfile({ width: 1280, height: 720 }));

    expect(runtimeLayout).toMatchObject({
      boardScale: 1.14,
      topInfoBanner: { x: 0, y: 244, width: 406, height: 78 },
      centerStage: { x: 0, y: 42, width: 360, height: 208 },
      actionArea: { x: 0, y: -246, width: 360, height: 148 },
      edgeActions: {
        rightStack: { x: 452, y: 18 },
        bottomLeftStack: { x: -372, y: -248 },
        bottomRightStack: { x: 372, y: -248 },
      },
    });
    expect(runtimeLayout.seatPanelPositions).toHaveLength(MATCH_CONFIG.players.length);
    expect(runtimeLayout.seatPanelPositions[0]).toMatchObject({ y: expect.any(Number) });
    expect(runtimeLayout.seatPanelPositions[0]!.x).toBeLessThan(0);
    expect(runtimeLayout.seatPanelPositions[1]!.x).toBeGreaterThan(0);
    expect(runtimeLayout.seatPanelPositions[2]!.x).toBeGreaterThan(0);
    expect(runtimeLayout.seatPanelPositions[3]!.x).toBeLessThan(0);
    expect(runtimeLayout.seatPanelPositions[0]!.y).toBeGreaterThan(0);
    expect(runtimeLayout.seatPanelPositions[1]!.y).toBeGreaterThan(0);
    expect(runtimeLayout.seatPanelPositions[2]!.y).toBeLessThan(0);
    expect(runtimeLayout.seatPanelPositions[3]!.y).toBeLessThan(0);
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

    const topInfoBanner = new Node('TopInfoBanner');
    topInfoBanner.addChild(new Node('BannerFrame'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'RoundSummaryLabel'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'IncomeSummaryLabel'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'EventSummaryLabel'));

    const centerStage = new Node('CenterStage');
    centerStage.addComponent(UITransform);
    centerStage.addChild(new Node('DiceStageBase'));
    centerStage.addChild(new Node('DicePlazaGlow'));
    centerStage.addChild(new Node('DicePlazaFrame'));
    centerStage.addChild(new Node('DicePairAnchor'));
    centerStage.addChild(createLabelNode(Node, Label, 'RoundInfoLabel'));
    centerStage.addChild(new Node('RollButtonFrame'));
    centerStage.addChild(createButtonNode(Node, Button, 'RollButton'));

    const edgeActions = new Node('EdgeActions');
    const rightActionStack = new Node('RightActionStack');
    rightActionStack.addChild(new Node('ChatButton'));
    rightActionStack.addChild(new Node('EmojiButton'));
    rightActionStack.addChild(new Node('MenuButton'));
    edgeActions.addChild(rightActionStack);

    const bottomLeftActionStack = new Node('BottomLeftActionStack');
    bottomLeftActionStack.addChild(new Node('MapButton'));
    bottomLeftActionStack.addChild(new Node('TravelButton'));
    edgeActions.addChild(bottomLeftActionStack);

    const bottomRightActionStack = new Node('BottomRightActionStack');
    bottomRightActionStack.addChild(new Node('RankButton'));
    bottomRightActionStack.addChild(new Node('EventButton'));
    edgeActions.addChild(bottomRightActionStack);

    const actionArea = new Node('ActionArea');
    actionArea.addComponent(UITransform);
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

    hudLayer.addChild(topInfoBanner);
    hudLayer.addChild(seatPanels);
    hudLayer.addChild(centerStage);
    hudLayer.addChild(edgeActions);
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

    expect(boardDecorLayer.scale.x).toBeGreaterThan(0.76);
    expect(tileLayer.scale.x).toBeGreaterThan(0.76);
    expect(tokenLayer.scale.x).toBeGreaterThan(0.76);
    expect(centerStage.getComponent(UITransform)?.contentSize.width).toBeGreaterThanOrEqual(280);
    expect(centerStage.getComponent(UITransform)?.contentSize.height).toBeGreaterThanOrEqual(132);
    expect(seatPanels.getChildByName('SeatPanel0')?.position.x).toBeLessThanOrEqual(-200);
    expect(seatPanels.getChildByName('SeatPanel1')?.position.x).toBeGreaterThanOrEqual(200);
    expect(seatPanels.getChildByName('SeatPanel2')?.position.x).toBeGreaterThanOrEqual(200);
    expect(seatPanels.getChildByName('SeatPanel3')?.position.x).toBeLessThanOrEqual(-200);
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

    const topInfoBanner = new Node('TopInfoBanner');
    topInfoBanner.addChild(new Node('BannerFrame'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'RoundSummaryLabel'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'IncomeSummaryLabel'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'EventSummaryLabel'));

    const centerStage = new Node('CenterStage');
    centerStage.addComponent(UITransform);
    centerStage.addChild(new Node('DiceStageBase'));
    centerStage.addChild(new Node('DicePlazaGlow'));
    centerStage.addChild(new Node('DicePlazaFrame'));
    centerStage.addChild(new Node('DicePairAnchor'));
    centerStage.addChild(createLabelNode(Node, Label, 'RoundInfoLabel'));
    centerStage.addChild(new Node('RollButtonFrame'));
    centerStage.addChild(createButtonNode(Node, Button, 'RollButton'));

    const edgeActions = new Node('EdgeActions');
    const rightActionStack = new Node('RightActionStack');
    rightActionStack.addChild(new Node('ChatButton'));
    rightActionStack.addChild(new Node('EmojiButton'));
    rightActionStack.addChild(new Node('MenuButton'));
    edgeActions.addChild(rightActionStack);

    const bottomLeftActionStack = new Node('BottomLeftActionStack');
    bottomLeftActionStack.addChild(new Node('MapButton'));
    bottomLeftActionStack.addChild(new Node('TravelButton'));
    edgeActions.addChild(bottomLeftActionStack);

    const bottomRightActionStack = new Node('BottomRightActionStack');
    bottomRightActionStack.addChild(new Node('RankButton'));
    bottomRightActionStack.addChild(new Node('EventButton'));
    edgeActions.addChild(bottomRightActionStack);

    const actionArea = new Node('ActionArea');
    actionArea.addComponent(UITransform);
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

    hudLayer.addChild(topInfoBanner);
    hudLayer.addChild(seatPanels);
    hudLayer.addChild(centerStage);
    hudLayer.addChild(edgeActions);
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
      expect.arrayContaining(['MapBackdrop', 'OceanGlow', 'EdgeGlow']),
    );
    expect(boardDecorLayer.getChildByName('RouteRing')).toBeTruthy();
    expect(boardDecorLayer.getChildByName('WorldMapScenicMass')).toBeTruthy();
    expect(boardDecorLayer.getChildByName('TopBannerBridge')).toBeTruthy();
    expect(topInfoBanner.getChildByName('BannerFrame')).toBeTruthy();
    expect(centerStage.getChildByName('DiceStageBase')).toBeTruthy();
    expect(centerStage.getChildByName('DicePlazaGlow')).toBeTruthy();
    expect(centerStage.getChildByName('DicePlazaFrame')).toBeTruthy();
    expect(centerStage.getChildByName('DicePairAnchor')).toBeTruthy();
    expect(centerStage.getChildByName('RoundInfoLabel')).toBeTruthy();
    expect(centerStage.getChildByName('RollButtonFrame')).toBeTruthy();
    expect(edgeActions.getChildByName('RightActionStack')).toBeTruthy();
    expect(edgeActions.getChildByName('BottomLeftActionStack')).toBeTruthy();
    expect(edgeActions.getChildByName('BottomRightActionStack')).toBeTruthy();
    expect(tileLayer.getChildByName('Tile0')?.getChildByName('TileFrame')).toBeTruthy();
    expect(tileLayer.getChildByName('Tile0')?.getChildByName('TileAccentBand')).toBeTruthy();
    expect(tileLayer.getChildByName('Tile0')?.getChildByName('TileBadgePlate')).toBeTruthy();
    expect(tileLayer.getChildByName('Tile0')?.getChildByName('BuildingStackAnchor')).toBeTruthy();
    expect(seatPanels.getChildByName('SeatPanel0')?.getChildByName('AvatarPlate')).toBeTruthy();
    expect(seatPanels.getChildByName('SeatPanel0')?.getChildByName('PanelFrame')).toBeTruthy();
    expect(seatPanels.getChildByName('SeatPanel0')?.getChildByName('PanelAccent')).toBeTruthy();
    expect(seatPanels.getChildByName('SeatPanel0')?.getChildByName('PropertyStack')).toBeTruthy();
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

    const topInfoBanner = new Node('TopInfoBanner');
    topInfoBanner.addChild(new Node('BannerFrame'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'RoundSummaryLabel'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'IncomeSummaryLabel'));
    topInfoBanner.addChild(createLabelNode(Node, Label, 'EventSummaryLabel'));

    const centerStage = new Node('CenterStage');
    centerStage.addComponent(UITransform);
    centerStage.addChild(new Node('DiceStageBase'));
    centerStage.addChild(new Node('DicePlazaGlow'));
    centerStage.addChild(new Node('DicePlazaFrame'));
    centerStage.addChild(new Node('DicePairAnchor'));
    centerStage.addChild(createLabelNode(Node, Label, 'RoundInfoLabel'));
    centerStage.addChild(new Node('RollButtonFrame'));
    centerStage.addChild(createButtonNode(Node, Button, 'RollButton'));

    const edgeActions = new Node('EdgeActions');
    const rightActionStack = new Node('RightActionStack');
    rightActionStack.addChild(new Node('ChatButton'));
    rightActionStack.addChild(new Node('EmojiButton'));
    rightActionStack.addChild(new Node('MenuButton'));
    edgeActions.addChild(rightActionStack);

    const bottomLeftActionStack = new Node('BottomLeftActionStack');
    bottomLeftActionStack.addChild(new Node('MapButton'));
    bottomLeftActionStack.addChild(new Node('TravelButton'));
    edgeActions.addChild(bottomLeftActionStack);

    const bottomRightActionStack = new Node('BottomRightActionStack');
    bottomRightActionStack.addChild(new Node('RankButton'));
    bottomRightActionStack.addChild(new Node('EventButton'));
    edgeActions.addChild(bottomRightActionStack);

    const actionArea = new Node('ActionArea');
    actionArea.addComponent(UITransform);
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

    hudLayer.addChild(topInfoBanner);
    hudLayer.addChild(seatPanels);
    hudLayer.addChild(centerStage);
    hudLayer.addChild(edgeActions);
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
