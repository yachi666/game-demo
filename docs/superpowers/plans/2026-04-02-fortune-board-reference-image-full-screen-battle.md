# Fortune Board Reference Image Full-Screen Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `Battle.scene` so the whole match screen reads much closer to `docs/research/tiantian-fuweng-map-references/assets/world-map-baidu-jingyan.jpg`, with a top banner, thicker board, stronger center dice stage, richer four-corner panels, and visible edge-action density while keeping shipped art and copy original.

**Architecture:** Keep the deterministic rules/runtime split intact, but move the stable full-screen shell into `Battle.scene` and drive the richer visuals from shared presentation helpers. Extend the responsive layout contract so the board, top banner, center stage, seat panels, action area, and edge controls all have explicit desktop-first positions, then let `HudController` and `BattleController` bind and paint the richer shell from those shared contracts.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Vitest, npm, Cocos scene serialization

---

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: ready for execution
- Date: `2026-04-02`
- Depends on: `../specs/2026-04-02-fortune-board-reference-image-full-screen-battle-design.md`
- Related docs: `../../product/requirements.md`, `./2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md`, `./2026-04-02-fortune-board-world-map-high-fidelity-battle.md`
- Reference image: `../../research/tiantian-fuweng-map-references/assets/world-map-baidu-jingyan.jpg`

## File Structure

- `assets/scenes/Battle.scene` — serialize the stable full-screen battle shell: top banner, richer seat panels, center stage, edge action stacks, and tile building anchors.
- `assets/scripts/ui/battle-responsive-layout.ts` — define deterministic desktop / narrow / portrait geometry for the thicker ring board, top banner, edge controls, seat panels, center stage, and action area.
- `assets/scripts/ui/battle-presentation.ts` — derive data-driven top-banner, seat-panel, center-stage, and tile visuals from `MatchState`.
- `assets/scripts/ui/HudController.ts` — bind the new labels/nodes in `HudLayer` and render richer banner/panel state without hard-coding gameplay logic into the scene controller.
- `assets/scripts/ui/BattleController.ts` — bind the expanded scene skeleton, apply the new layout, paint the full-screen shell, and render tile/building/edge-action stand-ins.
- `assets/scripts/ui/battle-art.ts` — keep the named battle-art identifiers aligned with the richer reference-image shell.
- `tests/ui/battle-art.test.ts` — lock the serialized `Battle.scene` node hierarchy and asset identifier contract.
- `tests/ui/battle-responsive-layout.test.ts` — lock layout numbers and mocked scene binding for the expanded HUD shell.
- `tests/ui/battle-presentation.test.ts` — lock the new presentation data for banner, panels, center stage, and tile building stacks.
- `tests/ui/battle-hud-flow.test.ts` — make sure pre-roll/role-selection flow still drives the richer HUD messaging correctly.
- `tests/ui/lobby-flow.test.ts` — keep lobby-to-battle boot, replay, and return-to-lobby flows working after `BattleController` requires the richer scene contract.

### Task 1: Write failing tests for the reference-image scene contract

**Files:**
- Modify: `tests/ui/battle-art.test.ts`
- Modify: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `tests/ui/battle-presentation.test.ts`
- Modify: `tests/ui/battle-hud-flow.test.ts`

- [ ] **Step 1: Tighten the serialized node contract in `tests/ui/battle-art.test.ts`**

Replace the old world-map expectations with the full-screen shell contract:

```ts
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
```

and tighten the seat/tile skeletons to:

```ts
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

expect(getChildNames(sceneRecords, tileName)).toEqual([
  'TileFrame',
  'TileAccentBand',
  'TileBadgePlate',
  'BuildingStackAnchor',
  'TitleLabel',
  'SupportingLabel',
  'BadgeLabel',
]);
```

- [ ] **Step 2: Add the richer layout/presentation red tests**

In `tests/ui/battle-presentation.test.ts`, add expectations like:

```ts
const startedMatch = beginTurnFlow(createAssignedMatch());
startedMatch.logs.push({ turn: startedMatch.turn, phase: startedMatch.phase, message: 'Player 1 bought Mayor Plaza' });

expect(getTopInfoBannerPresentation(startedMatch)).toEqual({
  roundLabel: 'Round 0',
  incomeLabel: 'Assets 400',
  eventLabel: 'Bought Mayor Plaza',
  accentHex: startedMatch.players[startedMatch.activePlayerIndex]!.color,
});

expect(getSeatPanelPresentation(startedMatch, 0)).toMatchObject({
  playerNameLabel: 'Player 1',
  cashLabel: 'Cash 400',
  assetLabel: 'Assets 400',
  statusLabel: 'ACTIVE',
  propertyCount: 0,
  avatarLabel: '1',
});

expect(getTilePresentation(startedMatch, 1)).toMatchObject({
  title: 'Mayor Plaza',
  badgeLabel: 'Open',
  buildingCount: 0,
});
```

In `tests/ui/battle-hud-flow.test.ts`, add a phase-driven banner check:

```ts
const roleSelectionMatch = openRoleSelectionFlow(createMatch(BOARD_CONFIG, MATCH_CONFIG));
expect(getTopInfoBannerPresentation(roleSelectionMatch)).toMatchObject({
  eventLabel: 'Choose a role',
});

const activeTurnMatch = beginTurnFlow(createAssignedMatch());
expect(getTopInfoBannerPresentation(activeTurnMatch)).toMatchObject({
  roundLabel: 'Round 0',
  accentHex: activeTurnMatch.players[0]!.color,
});
```

In `tests/ui/battle-responsive-layout.test.ts`, add the new desktop-first geometry contract:

```ts
expect(layout.profile).toBe('desktop');
expect(layout.boardScale).toBe(1.14);
expect(layout.topInfoBanner).toEqual({ x: 0, y: 244, width: 406, height: 78 });
expect(layout.centerStage).toEqual({ x: 0, y: 42, width: 360, height: 208 });
expect(layout.actionArea).toEqual({ x: 0, y: -246, width: 360, height: 148 });
expect(layout.edgeActions.rightStack).toEqual({ x: 452, y: 18 });
expect(layout.edgeActions.bottomLeftStack).toEqual({ x: -372, y: -248 });
expect(layout.edgeActions.bottomRightStack).toEqual({ x: 372, y: -248 });
```

- [ ] **Step 3: Run the focused tests to confirm the current implementation fails**

Run:

```bash
npm test -- tests/ui/battle-art.test.ts tests/ui/battle-presentation.test.ts tests/ui/battle-hud-flow.test.ts tests/ui/battle-responsive-layout.test.ts
```

Expected: FAIL because the current scene still uses `TitleLabel` / `StatsLabel` / `StateLabel`, the HUD has no `TopInfoBanner` or `EdgeActions`, and the layout contract only knows about `boardScale`, `centerStage`, and `seatPanels`.

- [ ] **Step 4: Commit the red tests**

```bash
git add tests/ui/battle-art.test.ts tests/ui/battle-responsive-layout.test.ts tests/ui/battle-presentation.test.ts tests/ui/battle-hud-flow.test.ts
git commit -m "test: lock reference-image battle shell"
```

### Task 2: Extend the deterministic layout and presentation contracts

**Files:**
- Modify: `assets/scripts/ui/battle-responsive-layout.ts`
- Modify: `assets/scripts/ui/battle-presentation.ts`
- Modify: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `tests/ui/battle-presentation.test.ts`
- Modify: `tests/ui/battle-hud-flow.test.ts`

- [ ] **Step 1: Expand `battle-responsive-layout.ts` to cover banner, edge actions, and action area geometry**

Add the richer layout shape:

```ts
export interface BattleLayoutProfileResult {
  boardScale: number;
  topInfoBanner: LayoutRect;
  centerStage: LayoutRect;
  actionArea: LayoutRect;
  profile: BattleLayoutProfile;
  edgeActions: {
    rightStack: { x: number; y: number };
    bottomLeftStack: { x: number; y: number };
    bottomRightStack: { x: number; y: number };
  };
  seatPanels: {
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
  };
}

export interface BattleRuntimeLayout {
  boardScale: number;
  topInfoBanner: LayoutRect;
  centerStage: LayoutRect;
  actionArea: LayoutRect;
  seatPanelPositions: Array<{ x: number; y: number }>;
  edgeActions: {
    rightStack: { x: number; y: number };
    bottomLeftStack: { x: number; y: number };
    bottomRightStack: { x: number; y: number };
  };
}
```

Use explicit reference-image-biased numbers:

```ts
if (aspect >= 1.45) {
  return {
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
    seatPanels: {
      topLeft: { x: -410, y: 250 },
      topRight: { x: 410, y: 250 },
      bottomRight: { x: 410, y: -216 },
      bottomLeft: { x: -410, y: -216 },
    },
  };
}
```

and compress, but do not collapse, for narrow/portrait:

```ts
if (aspect >= 1) {
  return {
    profile: 'narrow',
    boardScale: 1.04,
    topInfoBanner: { x: 0, y: 226, width: 370, height: 72 },
    centerStage: { x: 0, y: 28, width: 332, height: 188 },
    actionArea: { x: 0, y: -252, width: 328, height: 142 },
    edgeActions: {
      rightStack: { x: 374, y: 10 },
      bottomLeftStack: { x: -298, y: -258 },
      bottomRightStack: { x: 298, y: -258 },
    },
    seatPanels: {
      topLeft: { x: -334, y: 236 },
      topRight: { x: 334, y: 236 },
      bottomRight: { x: 334, y: -240 },
      bottomLeft: { x: -334, y: -240 },
    },
  };
}

return {
  profile: 'portrait',
  boardScale: 0.86,
  topInfoBanner: { x: 0, y: 508, width: 300, height: 70 },
  centerStage: { x: 0, y: 92, width: 280, height: 150 },
  actionArea: { x: 0, y: -520, width: 292, height: 140 },
  edgeActions: {
    rightStack: { x: 286, y: 32 },
    bottomLeftStack: { x: -202, y: -470 },
    bottomRightStack: { x: 202, y: -470 },
  },
  seatPanels: {
    topLeft: { x: -212, y: 430 },
    topRight: { x: 212, y: 430 },
    bottomRight: { x: 212, y: -410 },
    bottomLeft: { x: -212, y: -410 },
  },
};
```

- [ ] **Step 2: Expand `battle-presentation.ts` into the source of truth for the richer shell**

Add the new data contracts:

```ts
export interface TopInfoBannerPresentation {
  roundLabel: string;
  incomeLabel: string;
  eventLabel: string;
  accentHex: string;
}

export interface SeatPanelPresentation {
  playerNameLabel: string;
  cashLabel: string;
  assetLabel: string;
  statusLabel: string;
  avatarLabel: string;
  propertyCount: number;
  accentHex: string;
  opacity: number;
}

export interface TilePresentation {
  accentHex: string;
  badgeLabel: string;
  buildingCount: number;
  supportingLabel: string;
  title: string;
}

export interface CenterStagePresentation {
  roundInfoLabel: string;
}
```

Use data the rules layer already has instead of inventing new gameplay state:

```ts
function getDefaultBannerEvent(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.AwaitRoleSelection:
      return 'Choose a role';
    case GamePhase.AwaitPreRollActions:
      return 'Plan cards or skill';
    case GamePhase.AwaitAiPreRollActions:
      return 'AI planning';
    case GamePhase.AwaitRoll:
      return 'Ready for roll';
    default:
      return `Phase ${phase}`;
  }
}

export function getTopInfoBannerPresentation(match: MatchState): TopInfoBannerPresentation {
  const activePlayer = assertDefined(match.players[match.activePlayerIndex], `Missing active player at index ${match.activePlayerIndex}`);
  const latestMessage = match.logs[match.logs.length - 1]?.message ?? getDefaultBannerEvent(match.phase);

  return {
    roundLabel: `Round ${match.turn}`,
    incomeLabel: `Assets ${getAssetTotal(match, match.activePlayerIndex)}`,
    eventLabel: compressLatestEvent(latestMessage),
    accentHex: activePlayer.color,
  };
}

export function getSeatPanelPresentation(match: MatchState, playerIndex: number): SeatPanelPresentation {
  const player = assertDefined(match.players[playerIndex], `Missing player at index ${playerIndex}`);
  const propertyCount = match.properties.filter((property) => property.ownerId === player.id).length;
  const statusLabel = player.isBankrupt ? 'BANKRUPT' : playerIndex === match.activePlayerIndex ? 'ACTIVE' : 'READY';

  return {
    playerNameLabel: player.label,
    cashLabel: `Cash ${player.cash}`,
    assetLabel: `Assets ${getAssetTotal(match, playerIndex)}`,
    statusLabel,
    avatarLabel: `${playerIndex + 1}`,
    propertyCount,
    accentHex: player.isBankrupt ? '#c47474' : player.color,
    opacity: player.isBankrupt ? 140 : playerIndex === match.activePlayerIndex ? 255 : 210,
  };
}

export function getCenterStagePresentation(match: MatchState, profile: BattleLayoutProfile): CenterStagePresentation {
  const activePlayer = assertDefined(match.players[match.activePlayerIndex], `Missing active player at index ${match.activePlayerIndex}`);
  return {
    roundInfoLabel: profile === 'portrait' ? `T${match.turn} · ${activePlayer.label}` : `Turn ${match.turn} · ${activePlayer.label}`,
  };
}
```

Keep `buildingCount` grounded in current ownership only:

```ts
if (tile.type === 'property') {
  const ownerId = match.properties.find((property) => property.tileId === tile.id)?.ownerId ?? null;
  const owner = ownerId ? assertDefined(match.players.find((player) => player.id === ownerId), `Missing owner ${ownerId}`) : null;

  return {
    title: tile.label,
    badgeLabel: owner ? owner.label : 'Open',
    supportingLabel: owner ? `Toll ${tile.tollCost ?? 0}` : `Buy ${tile.purchaseCost ?? 0} | Toll ${tile.tollCost ?? 0}`,
    accentHex: owner ? owner.color : tile.accentColor ?? '#ffffff',
    buildingCount: owner ? 1 : 0,
  };
}

return {
  title: tile.label,
  badgeLabel: 'Fortune',
  supportingLabel: 'Chance Event',
  accentHex: tile.accentColor ?? '#8bc34a',
  buildingCount: 0,
};
```

- [ ] **Step 3: Run the deterministic layout/presentation tests**

Run:

```bash
npm test -- tests/ui/battle-presentation.test.ts tests/ui/battle-hud-flow.test.ts
npm test -- tests/ui/battle-responsive-layout.test.ts -t getBattleLayoutProfile
```

Expected: PASS for the pure geometry and presentation contracts, even though the scene/controller integration still fails.

- [ ] **Step 4: Commit the pure contract updates**

```bash
git add assets/scripts/ui/battle-responsive-layout.ts assets/scripts/ui/battle-presentation.ts tests/ui/battle-responsive-layout.test.ts tests/ui/battle-presentation.test.ts tests/ui/battle-hud-flow.test.ts
git commit -m "feat: define reference-image battle layout contracts"
```

### Task 3: Serialize the stable full-screen shell in `Battle.scene`

**Files:**
- Modify: `assets/scenes/Battle.scene`
- Modify: `assets/scripts/ui/battle-art.ts`
- Modify: `tests/ui/battle-art.test.ts`

- [ ] **Step 1: Replace the old serialized HUD skeleton with the richer node tree**

Update `Battle.scene` so the stable hierarchy is:

```text
BackgroundLayer
├─ MapBackdrop
├─ OceanGlow
└─ EdgeGlow

BoardDecorLayer
├─ WorldMapScenicMass
├─ RouteRing
├─ CenterStageFrame
├─ TopBannerBridge
├─ CornerLandmark0
├─ CornerLandmark1
├─ CornerLandmark2
└─ CornerLandmark3

HudLayer
├─ TopInfoBanner
│  ├─ BannerFrame
│  ├─ RoundSummaryLabel
│  ├─ IncomeSummaryLabel
│  └─ EventSummaryLabel
├─ SeatPanels
│  ├─ SeatPanel0
│  │  ├─ AvatarPlate      (cc.Label on the node)
│  │  ├─ PanelFrame
│  │  ├─ PanelAccent
│  │  ├─ PropertyStack
│  │  ├─ PlayerNameLabel
│  │  ├─ CashLabel
│  │  ├─ AssetLabel
│  │  └─ StatusBadge      (cc.Label on the node)
│  ├─ SeatPanel1
│  ├─ SeatPanel2
│  └─ SeatPanel3
├─ CenterStage
│  ├─ DiceStageBase
│  ├─ DicePlazaGlow
│  ├─ DicePlazaFrame
│  ├─ DicePairAnchor
│  ├─ RoundInfoLabel
│  ├─ RollButtonFrame
│  └─ RollButton
├─ EdgeActions
│  ├─ RightActionStack
│  │  ├─ ChatButton
│  │  ├─ EmojiButton
│  │  └─ MenuButton
│  ├─ BottomLeftActionStack
│  │  ├─ MapButton
│  │  └─ TravelButton
│  └─ BottomRightActionStack
│     ├─ RankButton
│     └─ EventButton
└─ ActionArea
   ├─ LogLabel
   ├─ CardHand
   └─ SkillButton

TileLayer
└─ TileN
   ├─ TileFrame
   ├─ TileAccentBand
   ├─ TileBadgePlate
   ├─ BuildingStackAnchor
   ├─ TitleLabel
   ├─ SupportingLabel
   └─ BadgeLabel
```

Keep `PropertyPrompt`, `ResultPanel`, and `RoleSelection` under `OverlayLayer` exactly as independent overlays.

- [ ] **Step 2: Align `battle-art.ts` with the richer shell identifiers**

Extend the named assets to cover the full-screen shell:

```ts
export const BATTLE_ART_ASSETS = {
  background: 'battle-polish/reference-fullscreen-background',
  centerStage: 'battle-polish/reference-dice-stage',
  topBanner: 'battle-polish/reference-top-banner',
  seatPanelFrame: 'battle-polish/reference-seat-panel',
  tileFrame: 'battle-polish/reference-tile-frame',
  edgeActionShell: 'battle-polish/reference-edge-action',
  propertyPromptFrame: 'battle-polish/reference-prompt-frame',
  resultPanelFrame: 'battle-polish/reference-result-frame',
} as const;
```

and update the asset-contract test to require `topBanner` and `edgeActionShell` under the same `battle-polish/` namespace.

- [ ] **Step 3: Run the static scene-contract test**

Run:

```bash
npm test -- tests/ui/battle-art.test.ts
```

Expected: PASS with the serialized node tree matching the new full-screen contract.

- [ ] **Step 4: Commit the scene serialization update**

```bash
git add assets/scenes/Battle.scene assets/scripts/ui/battle-art.ts tests/ui/battle-art.test.ts
git commit -m "feat: serialize reference-image battle shell"
```

### Task 4: Bind and render the richer HUD shell in `HudController` and `BattleController`

**Files:**
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `tests/ui/lobby-flow.test.ts`

- [ ] **Step 1: Rebind `HudController` to the new banner, panel, and center-stage labels**

Replace the old title/stats/state bindings with the richer node map:

```ts
@property(Label)
public roundSummaryLabel: Label | null = null;

@property(Label)
public incomeSummaryLabel: Label | null = null;

@property(Label)
public eventSummaryLabel: Label | null = null;

@property([Node])
public avatarPlateNodes: Node[] = [];

@property([Node])
public propertyStackNodes: Node[] = [];

@property([Label])
public playerNameLabels: Label[] = [];

@property([Label])
public cashLabels: Label[] = [];

@property([Label])
public assetLabels: Label[] = [];

@property([Label])
public statusBadgeLabels: Label[] = [];

@property(Label)
public roundInfoLabel: Label | null = null;
```

Render from `battle-presentation.ts` instead of local string assembly:

```ts
const banner = getTopInfoBannerPresentation(match);
this.roundSummaryLabel!.string = banner.roundLabel;
this.incomeSummaryLabel!.string = banner.incomeLabel;
this.eventSummaryLabel!.string = banner.eventLabel;

match.players.forEach((_player, index) => {
  const seat = getSeatPanelPresentation(match, index);
  this.playerNameLabels[index]!.string = seat.playerNameLabel;
  this.cashLabels[index]!.string = seat.cashLabel;
  this.assetLabels[index]!.string = seat.assetLabel;
  this.statusBadgeLabels[index]!.string = seat.statusLabel;
  this.syncPropertyStack(this.propertyStackNodes[index]!, seat.propertyCount, seat.accentHex);
});

const centerStage = getCenterStagePresentation(match, this.layoutProfile);
this.roundInfoLabel!.string = centerStage.roundInfoLabel;
```

Use a simple chip renderer for `PropertyStack` instead of inventing upgrade data:

```ts
private syncPropertyStack(root: Node, count: number, accentHex: string): void {
  root.destroyAllChildren();
  for (let index = 0; index < Math.min(count, 4); index += 1) {
    const chip = new Node(`PropertyChip${index}`);
    chip.addComponent(UITransform).setContentSize(18, 10);
    const graphics = chip.addComponent(Graphics);
    graphics.roundRect(-9, -5, 18, 10, 4);
    graphics.fillColor = this.colorFromHex(accentHex);
    graphics.fill();
    chip.setPosition(index * 22, 0, 0);
    root.addChild(chip);
  }
}
```

- [ ] **Step 2: Update `BattleController.ts` to bind the richer skeleton and paint the full-screen shell**

Expand `applyResponsiveLayout` so it positions the new shell roots explicitly:

```ts
const topInfoBanner = this.getRequiredChild(sceneRoots.hudLayer, 'TopInfoBanner');
const topInfoTransform = topInfoBanner.getComponent(UITransform) ?? topInfoBanner.addComponent(UITransform);
topInfoBanner.setPosition(layout.topInfoBanner.x, layout.topInfoBanner.y, 0);
topInfoTransform.setContentSize(layout.topInfoBanner.width, layout.topInfoBanner.height);

const centerStage = this.getRequiredChild(sceneRoots.hudLayer, 'CenterStage');
const centerStageTransform = centerStage.getComponent(UITransform) ?? centerStage.addComponent(UITransform);
centerStage.setPosition(layout.centerStage.x, layout.centerStage.y, 0);
centerStageTransform.setContentSize(layout.centerStage.width, layout.centerStage.height);

const actionArea = this.getRequiredChild(sceneRoots.hudLayer, 'ActionArea');
const actionAreaTransform = actionArea.getComponent(UITransform) ?? actionArea.addComponent(UITransform);
actionArea.setPosition(layout.actionArea.x, layout.actionArea.y, 0);
actionAreaTransform.setContentSize(layout.actionArea.width, layout.actionArea.height);

const edgeActions = this.getRequiredChild(sceneRoots.hudLayer, 'EdgeActions');
this.getRequiredChild(edgeActions, 'RightActionStack').setPosition(layout.edgeActions.rightStack.x, layout.edgeActions.rightStack.y, 0);
this.getRequiredChild(edgeActions, 'BottomLeftActionStack').setPosition(layout.edgeActions.bottomLeftStack.x, layout.edgeActions.bottomLeftStack.y, 0);
this.getRequiredChild(edgeActions, 'BottomRightActionStack').setPosition(layout.edgeActions.bottomRightStack.x, layout.edgeActions.bottomRightStack.y, 0);
```

Rebind `bindHud()` to the new label nodes:

```ts
const topInfoBanner = this.getRequiredChild(root, 'TopInfoBanner');
controller.roundSummaryLabel = this.getRequiredLabel(topInfoBanner, 'RoundSummaryLabel');
controller.incomeSummaryLabel = this.getRequiredLabel(topInfoBanner, 'IncomeSummaryLabel');
controller.eventSummaryLabel = this.getRequiredLabel(topInfoBanner, 'EventSummaryLabel');

controller.avatarPlateNodes = controller.seatPanelNodes.map((panelNode) => this.getRequiredChild(panelNode, 'AvatarPlate'));
controller.propertyStackNodes = controller.seatPanelNodes.map((panelNode) => this.getRequiredChild(panelNode, 'PropertyStack'));
controller.playerNameLabels = controller.seatPanelNodes.map((panelNode) => this.getRequiredLabel(panelNode, 'PlayerNameLabel'));
controller.cashLabels = controller.seatPanelNodes.map((panelNode) => this.getRequiredLabel(panelNode, 'CashLabel'));
controller.assetLabels = controller.seatPanelNodes.map((panelNode) => this.getRequiredLabel(panelNode, 'AssetLabel'));
controller.statusBadgeLabels = controller.seatPanelNodes.map((panelNode) =>
  this.getRequiredComponent(this.getRequiredChild(panelNode, 'StatusBadge'), Label, 'Label'),
);
controller.roundInfoLabel = this.getRequiredLabel(centerStage, 'RoundInfoLabel');
```

Add dedicated painting helpers for the new shell:

```ts
this.decorateTopInfoBanner(this.getRequiredChild(sceneRoots.hudLayer, 'TopInfoBanner'), layoutProfile);
this.decorateEdgeActions(this.getRequiredChild(sceneRoots.hudLayer, 'EdgeActions'), layoutProfile);
this.decorateSeatPanels(this.getRequiredChild(sceneRoots.hudLayer, 'SeatPanels'), layoutProfile);
this.decorateCenterStage(this.getRequiredChild(sceneRoots.hudLayer, 'CenterStage'), layoutProfile);
this.decorateTileNodes(layoutProfile);
```

Use the new center/tile nodes instead of the old label-only frame:

```ts
const stageBase = this.ensureGraphicChild(centerStage, 'DiceStageBase', width - 42, height - 70);
this.paintRoundedRect(stageBase, width - 42, height - 70, '#efe5c8', '#c9a45b', 32);

const dicePairAnchor = this.getRequiredChild(centerStage, 'DicePairAnchor');
dicePairAnchor.setPosition(0, 4, 0);
this.syncDicePairPreview(dicePairAnchor);
this.getRequiredLabel(centerStage, 'RoundInfoLabel').node.setPosition(0, 58, 0);

const stackRoot = this.getRequiredChild(tileNode, 'BuildingStackAnchor');
stackRoot.setPosition(0, 4, 0);
this.syncBuildingStack(stackRoot, presentation.buildingCount, presentation.accentHex);
```

and paint the edge-action stacks with original placeholder buttons:

```ts
private decorateEdgeActions(root: Node, layoutProfile: BattleLayoutProfile): void {
  this.decorateActionStack(this.getRequiredChild(root, 'RightActionStack'), ['CHAT', 'EMOJI', 'MENU'], layoutProfile === 'portrait');
  this.decorateActionStack(this.getRequiredChild(root, 'BottomLeftActionStack'), ['MAP', 'TRAVEL'], false);
  this.decorateActionStack(this.getRequiredChild(root, 'BottomRightActionStack'), ['RANK', 'EVENT'], false);
}
```

- [ ] **Step 3: Update the mocked scene factories used by the integration tests**

In both `tests/ui/battle-responsive-layout.test.ts` and `tests/ui/lobby-flow.test.ts`, replace the old `createSeatPanel` / `createTileNode` helpers with the richer skeleton:

```ts
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
```

and build the new HUD roots before `BattleController.start()`:

```ts
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
const rollButton = new Node('RollButton');
rollButton.addComponent(Button);
centerStage.addChild(rollButton);

const edgeActions = new Node('EdgeActions');
const rightActionStack = new Node('RightActionStack');
rightActionStack.addChild(new Node('ChatButton'));
rightActionStack.addChild(new Node('EmojiButton'));
rightActionStack.addChild(new Node('MenuButton'));
edgeActions.addChild(rightActionStack);
```

- [ ] **Step 4: Run the integration-facing UI tests**

Run:

```bash
npm test -- tests/ui/battle-responsive-layout.test.ts tests/ui/lobby-flow.test.ts tests/ui/battle-hud-flow.test.ts
```

Expected: PASS with `BattleController.start()` and replay/lobby flows binding the new full-screen shell without missing-node errors.

- [ ] **Step 5: Commit the controller + integration pass**

```bash
git add assets/scripts/ui/HudController.ts assets/scripts/ui/BattleController.ts tests/ui/battle-responsive-layout.test.ts tests/ui/lobby-flow.test.ts
git commit -m "feat: render reference-image battle hud shell"
```

### Task 5: Run the full verification pass and compare against the reference image

**Files:**
- Modify: `assets/scenes/Battle.scene`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/battle-art.ts`
- Modify: `assets/scripts/ui/battle-presentation.ts`
- Modify: `assets/scripts/ui/battle-responsive-layout.ts`
- Modify: `tests/ui/battle-art.test.ts`
- Modify: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `tests/ui/battle-presentation.test.ts`
- Modify: `tests/ui/battle-hud-flow.test.ts`
- Modify: `tests/ui/lobby-flow.test.ts`

- [ ] **Step 1: Run the full UI test suite**

Run:

```bash
npm test -- tests/ui
```

Expected: PASS for the full UI suite, including the richer static scene contract, responsive layout, presentation, HUD flow, and lobby shell coverage.

- [ ] **Step 2: Run the repo preflight verification**

Run:

```bash
npm run verify:cocos-preflight
```

Expected: PASS for lint, format check, tests, and repository verification.

- [ ] **Step 3: Perform the manual fidelity check in desktop resolution**

Use the repo’s documented preview path:

```bash
open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app "$PWD"
```

Then verify manually:

```md
- open `Battle.scene`
- preview in `设计分辨率 (960X640)` or fullscreen desktop
- disable `Show FPS`
- compare against `docs/research/tiantian-fuweng-map-references/assets/world-map-baidu-jingyan.jpg`
- confirm the first read is: corner panels → top banner → center dice stage → thick ring board → edge actions
- confirm empty space is reduced and the board no longer reads as a center-cluster prototype
```

- [ ] **Step 4: Commit the finished reference-image pass**

```bash
git add assets/scenes/Battle.scene assets/scripts/ui/BattleController.ts assets/scripts/ui/HudController.ts assets/scripts/ui/battle-art.ts assets/scripts/ui/battle-presentation.ts assets/scripts/ui/battle-responsive-layout.ts tests/ui/battle-art.test.ts tests/ui/battle-responsive-layout.test.ts tests/ui/battle-presentation.test.ts tests/ui/battle-hud-flow.test.ts tests/ui/lobby-flow.test.ts
git commit -m "feat: match battle screen to reference image"
```

## Spec Coverage Check

- Full-screen shell: covered by Tasks 1, 3, and 4 through `TopInfoBanner`, `EdgeActions`, richer seat panels, and `Battle.scene` serialization.
- Desktop-first layout and anti-collapse rules: covered by Tasks 1 and 2 through the expanded `battle-responsive-layout.ts` contract and test assertions.
- Data-driven presentation: covered by Task 2 and Task 4 through `battle-presentation.ts`, `HudController.ts`, and tile/building/property-stack rendering.
- Stable scene-vs-runtime boundary: covered by Task 3 (scene serialization) plus Task 4 (controller binding/painting only on top of serialized roots).
- Verification and manual comparison against the provided screenshot: covered by Task 5.
