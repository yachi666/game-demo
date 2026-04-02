# Fortune Board Battle Scene Visual Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the current half-migrated `Battle` scene back to a coherent, testable, art-backed state so it can match the approved bright-amusement direction instead of the legacy text prototype.

**Architecture:** Use the existing failing `tests/ui/battle-art.test.ts` contract as the first gate. First make `Battle.scene` and `BattleController` agree on a single layer-based scene tree, then add the missing reusable scenic PNGs and serialize them onto sprite-bearing scene nodes. Keep deterministic rules unchanged; this is a UI/scene recovery slice only.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Cocos scene serialization, Sprite/SpriteFrame components, Vitest, npm

---

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: superseded
- Date: `2026-04-01`
- Depends on: `../specs/2026-03-29-fortune-board-bright-amusement-map-polish-design.md`
- Related docs: `./2026-03-29-fortune-board-bright-amusement-map-polish.md`, `./2026-04-02-fortune-board-world-map-high-fidelity-battle.md`, `../../product/requirements.md`

## Status Note

This plan is kept only as project history from the abandoned bright-amusement direction.

The current mainline Battle-scene execution document is `2026-04-02-fortune-board-world-map-high-fidelity-battle.md`.

## Why This Plan Exists

- `tests/ui/battle-art.test.ts` already describes the desired layer tree and serialized controller skeleton, but `Battle.scene` still contains the old top-level `Hud`, `PropertyPrompt`, `ResultPanel`, `Board`, and `Tokens` buckets.
- `assets/scripts/ui/BattleController.ts` is mid-refactor: it already contains `getSceneRoots()` plus bind helpers for role selection, hand, and skill UI, but `bindScene()` still binds the legacy nodes and never uses the new roots consistently.
- `assets/scripts/ui/battle-art.ts` declares the bright-amusement art manifest, but none of the six `assets/resources/battle-polish/*.png` files are currently in the repo.
- This should be executed as a recovery slice from the current repo state, not as a rerun of the original greenfield polish plan.

## Non-Goals

- Do not change `assets/scripts/core/**`, `assets/scripts/gameplay/**`, or AI decision logic.
- Do not redesign board topology beyond the approved single-loop ring.
- Do not add menus, avatars, monetization HUD, or live-service systems from third-party reference screenshots.

## File Surface

- Create: `assets/resources/battle-polish/amusement-map-background.png`
- Create: `assets/resources/battle-polish/amusement-center-stage.png`
- Create: `assets/resources/battle-polish/amusement-seat-panel.png`
- Create: `assets/resources/battle-polish/amusement-tile-frame.png`
- Create: `assets/resources/battle-polish/amusement-prompt-frame.png`
- Create: `assets/resources/battle-polish/amusement-result-frame.png`
- Modify: `assets/scenes/Battle.scene`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/battle-art.ts`
- Modify: `tests/ui/battle-art.test.ts`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

## Task 1: Restore the serialized Battle scene skeleton

**Files:**
- Modify: `tests/ui/battle-art.test.ts`
- Modify: `assets/scenes/Battle.scene`

- [ ] **Step 1: Extend the existing scene-contract test so the legacy prototype roots stay gone**

Add to `tests/ui/battle-art.test.ts` near the other canvas-tree assertions:

```ts
it('removes the legacy top-level prototype buckets from the canvas tree', () => {
  const canvasChildren = getCanvasChildNames();

  expect(canvasChildren).not.toContain('Hud');
  expect(canvasChildren).not.toContain('PropertyPrompt');
  expect(canvasChildren).not.toContain('ResultPanel');
  expect(canvasChildren).not.toContain('Board');
  expect(canvasChildren).not.toContain('Tokens');
});
```

- [ ] **Step 2: Run the focused UI contract test and confirm the current scene is still on the old structure**

Run: `npm test -- tests/ui/battle-art.test.ts`

Expected: FAIL with the canvas children still equal to `['Hud', 'PropertyPrompt', 'ResultPanel', 'Board', 'Tokens']` and missing nodes such as `HudLayer` and `SeatPanels`.

- [ ] **Step 3: Rebuild `Battle.scene` in Cocos Creator around the layer contract that the tests already encode**

Restructure the scene tree to this exact shape:

```text
Canvas
  BackgroundLayer
    BackgroundArt
  BoardDecorLayer
    CenterStageFrame
  TileLayer
    Tile0
      TitleLabel
      SupportingLabel
      BadgeLabel
    Tile1
      TitleLabel
      SupportingLabel
      BadgeLabel
    ...
    Tile17
      TitleLabel
      SupportingLabel
      BadgeLabel
  TokenLayer
    Token0
      Label
    Token1
      Label
    Token2
      Label
    Token3
      Label
  HudLayer
    SeatPanels
      SeatPanel0
        TitleLabel
        StatsLabel
        StateLabel
      SeatPanel1
        TitleLabel
        StatsLabel
        StateLabel
      SeatPanel2
        TitleLabel
        StatsLabel
        StateLabel
      SeatPanel3
        TitleLabel
        StatsLabel
        StateLabel
    CenterStage
      ActivePlayerLabel
      TurnLabel
      LatestEventLabel
      RollButton
    ActionArea
      LogLabel
      CardHand
        TitleLabel
        Cards
      SkillButton
        Label
  OverlayLayer
    PropertyPrompt
      TitleLabel
      DistrictLabel
      CostLabel
      ProjectedCashLabel
      BuyButton
      SkipButton
    ResultPanel
      ResultLabel
    RoleSelection
      TitleLabel
      Options
```

While rebuilding the scene, make these script attachments explicit instead of relying on runtime `addComponent` fallbacks:

```text
Canvas -> BattleController
HudLayer -> HudController
OverlayLayer/PropertyPrompt -> PropertyPrompt
OverlayLayer/ResultPanel -> ResultPanel
OverlayLayer/RoleSelection -> RoleSelectionController
HudLayer/ActionArea/CardHand -> CardHandController
HudLayer/ActionArea/SkillButton -> SkillButtonController
```

Keep `TileLayer` children aligned with `BOARD_CONFIG.length` and `TokenLayer` children aligned with `MATCH_CONFIG.players.length`.

- [ ] **Step 4: Re-run the focused contract test**

Run: `npm test -- tests/ui/battle-art.test.ts`

Expected: PASS on the canvas-layer, scene-skeleton, and serialized-controller checks.

- [ ] **Step 5: Commit the scene-contract recovery**

```bash
git add tests/ui/battle-art.test.ts assets/scenes/Battle.scene
git commit -m "test: lock battle scene layer contract"
```

## Task 2: Bind `BattleController` to the new scene roots instead of the legacy buckets

**Files:**
- Modify: `assets/scripts/ui/BattleController.ts`

- [ ] **Step 1: Replace legacy root lookup inside `bindScene()` with the existing `getSceneRoots()` helper**

Use the layer roots as the only source of scene binding:

```ts
private bindScene(): void {
  const canvasNode = this.getCanvasRoot();
  const viewport = canvasNode.getComponent(UITransform)?.contentSize ?? { width: 960, height: 640 };
  const layout = getBattleLayoutProfile({ width: viewport.width, height: viewport.height });
  const roots = this.getSceneRoots(canvasNode);

  const seatPanelsRoot = this.getRequiredChild(roots.hudLayer, 'SeatPanels');
  const centerStageRoot = this.getRequiredChild(roots.hudLayer, 'CenterStage');
  const actionAreaRoot = this.getRequiredChild(roots.hudLayer, 'ActionArea');

  const hud = this.getRequiredComponent(roots.hudLayer, HudController, 'HudController');
  hud.seatPanelNodes = MATCH_CONFIG.players.map((_player, index) =>
    this.getRequiredChild(seatPanelsRoot, `SeatPanel${index}`),
  );
  hud.seatPanelTitleLabels = hud.seatPanelNodes.map((panel) => this.getRequiredLabel(panel, 'TitleLabel'));
  hud.seatPanelStatsLabels = hud.seatPanelNodes.map((panel) => this.getRequiredLabel(panel, 'StatsLabel'));
  hud.seatPanelStateLabels = hud.seatPanelNodes.map((panel) => this.getRequiredLabel(panel, 'StateLabel'));
  hud.activePlayerLabel = this.getRequiredLabel(centerStageRoot, 'ActivePlayerLabel');
  hud.turnLabel = this.getRequiredLabel(centerStageRoot, 'TurnLabel');
  hud.latestEventLabel = this.getRequiredLabel(centerStageRoot, 'LatestEventLabel');
  hud.logLabel = this.getRequiredLabel(actionAreaRoot, 'LogLabel');
  hud.layoutProfile = layout.profile;
  this.hud = hud;
```

Delete the legacy fallback lookups for `Hud`, `Board`, `Tokens`, and `Overlay`.

- [ ] **Step 2: Bind overlay controls, hand, and skill UI from serialized nodes**

Finish the scene-owned bindings so the controller stops depending on missing fallback nodes:

```ts
  this.roleSelection = this.bindRoleSelection(roots.overlayLayer);
  this.cardHand = this.bindCardHand(actionAreaRoot);
  this.skillButton = this.bindSkillButton(actionAreaRoot);

  const propertyPromptNode = this.getRequiredChild(roots.overlayLayer, 'PropertyPrompt');
  const propertyPrompt = this.getRequiredComponent(propertyPromptNode, PropertyPrompt, 'PropertyPrompt');
  propertyPrompt.root = propertyPromptNode;
  propertyPrompt.frameNode = propertyPromptNode;
  propertyPrompt.titleLabel = this.getRequiredLabel(propertyPromptNode, 'TitleLabel');
  propertyPrompt.districtLabel = this.getRequiredLabel(propertyPromptNode, 'DistrictLabel');
  propertyPrompt.costLabel = this.getRequiredLabel(propertyPromptNode, 'CostLabel');
  propertyPrompt.projectedCashLabel = this.getRequiredLabel(propertyPromptNode, 'ProjectedCashLabel');
  propertyPrompt.buyButton = this.getRequiredButton(propertyPromptNode, 'BuyButton');
  propertyPrompt.skipButton = this.getRequiredButton(propertyPromptNode, 'SkipButton');
  propertyPrompt.layoutProfile = layout.profile;
  this.propertyPrompt = propertyPrompt;

  const resultPanelNode = this.getRequiredChild(roots.overlayLayer, 'ResultPanel');
  const resultPanel = this.getRequiredComponent(resultPanelNode, ResultPanel, 'ResultPanel');
  resultPanel.root = resultPanelNode;
  resultPanel.frameNode = resultPanelNode;
  resultPanel.headlineLabel = this.getRequiredLabel(resultPanelNode, 'ResultLabel');
  resultPanel.resultLabel = resultPanel.headlineLabel;
  this.resultPanel = resultPanel;
```

- [ ] **Step 3: Bind tile and token arrays from `TileLayer` and `TokenLayer` and delete dead fallback code**

Replace the old `Board` / `Tokens` lookups with required layer children:

```ts
  this.tileNodes = BOARD_CONFIG.map((_tile, index) => this.getRequiredChild(roots.tileLayer, `Tile${index}`));
  this.tokenNodes = this.match.players.map((_player, index) => this.getRequiredChild(roots.tokenLayer, `Token${index}`));
}
```

Also remove the duplicated `getOptionalChild()` method body so the class has exactly one implementation.

- [ ] **Step 4: Apply the responsive layout profile to the new layer roots, not to legacy nodes**

Keep the first recovery pass small: only board scale, seat panel positions, and center-stage geometry should come from `getBattleLayoutProfile()`.

```ts
const seatPositions = [
  layout.seatPanels.topLeft,
  layout.seatPanels.topRight,
  layout.seatPanels.bottomRight,
  layout.seatPanels.bottomLeft,
];

hud.seatPanelNodes.forEach((panel, index) => {
  const seat = seatPositions[index]!;
  panel.setPosition(seat.x, seat.y, 0);
});

roots.tileLayer.setScale(layout.boardScale, layout.boardScale, 1);
centerStageRoot.setPosition(layout.centerStage.x, layout.centerStage.y, 0);
this.getRequiredTransform(centerStageRoot).setContentSize(layout.centerStage.width, layout.centerStage.height);
```

Leave `ActionArea` and overlay prompts at scene-authored defaults for this recovery slice; do not widen the scope into a full layout redesign.

- [ ] **Step 5: Run focused UI tests plus formatting and lint checks**

Run:
- `npm test -- tests/ui/battle-art.test.ts`
- `npm test -- tests/ui/battle-presentation.test.ts`
- `npm run format:check`
- `npm run lint`

Expected: PASS on both test files; format and lint complete without changes or reported errors.

- [ ] **Step 6: Commit the controller realignment**

```bash
git add assets/scripts/ui/BattleController.ts
git commit -m "refactor: bind battle scene through stable layer roots"
```

## Task 3: Import the missing bright-amusement art pack and serialize it into the scene

**Files:**
- Create: `assets/resources/battle-polish/amusement-map-background.png`
- Create: `assets/resources/battle-polish/amusement-center-stage.png`
- Create: `assets/resources/battle-polish/amusement-seat-panel.png`
- Create: `assets/resources/battle-polish/amusement-tile-frame.png`
- Create: `assets/resources/battle-polish/amusement-prompt-frame.png`
- Create: `assets/resources/battle-polish/amusement-result-frame.png`
- Modify: `assets/scripts/ui/battle-art.ts`
- Modify: `tests/ui/battle-art.test.ts`
- Modify: `assets/scenes/Battle.scene`

- [ ] **Step 1: Extend the art manifest with the exact checked-in PNG paths**

Add this export to `assets/scripts/ui/battle-art.ts`:

```ts
export const BATTLE_ART_REQUIRED_FILES = [
  'assets/resources/battle-polish/amusement-map-background.png',
  'assets/resources/battle-polish/amusement-center-stage.png',
  'assets/resources/battle-polish/amusement-seat-panel.png',
  'assets/resources/battle-polish/amusement-tile-frame.png',
  'assets/resources/battle-polish/amusement-prompt-frame.png',
  'assets/resources/battle-polish/amusement-result-frame.png',
] as const;
```

Keep `BATTLE_ART_ASSETS` unchanged; this new list is only the checked-in file contract.

- [ ] **Step 2: Add failing tests for art-file presence and sprite-backed scene nodes**

Update `tests/ui/battle-art.test.ts` imports:

```ts
import {
  BATTLE_ART_ASSETS,
  BATTLE_ART_REQUIRED_FILES,
  REQUIRED_BATTLE_LAYER_NAMES,
} from '../../assets/scripts/ui/battle-art';
```

Add two new tests:

```ts
it('checks in every scenic art file used by the battle polish pass', () => {
  BATTLE_ART_REQUIRED_FILES.forEach((relativePath) => {
    expect(fs.existsSync(path.join(ROOT_DIR, relativePath)), `Missing ${relativePath}`).toBe(true);
  });
});

it('serializes sprite-backed scenic nodes into Battle.scene', () => {
  const sceneRecords = readSceneRecords();

  ['BackgroundArt', 'CenterStageFrame', 'SeatPanel0', 'Tile0', 'PropertyPrompt', 'ResultPanel'].forEach((nodeName) => {
    expect(getComponentTypes(sceneRecords, nodeName)).toContain('cc.Sprite');
  });
});
```

- [ ] **Step 3: Run the failing art-contract test**

Run: `npm test -- tests/ui/battle-art.test.ts`

Expected: FAIL because the six PNG files are missing and the relevant scene nodes do not yet have `cc.Sprite` components.

- [ ] **Step 4: Generate/import the six scenic PNGs and assign them in `Battle.scene`**

Check the following files into the repo:

```text
assets/resources/battle-polish/amusement-map-background.png
assets/resources/battle-polish/amusement-center-stage.png
assets/resources/battle-polish/amusement-seat-panel.png
assets/resources/battle-polish/amusement-tile-frame.png
assets/resources/battle-polish/amusement-prompt-frame.png
assets/resources/battle-polish/amusement-result-frame.png
```

Use prompts or art direction that explicitly request:
- bright daytime amusement park
- candy-color district accents
- empty center areas for runtime labels
- no embedded player-specific text, numbers, or ownership marks

Assign the imported art to the scene with this exact reuse pattern:

```text
BackgroundLayer/BackgroundArt -> amusement-map-background.png
BoardDecorLayer/CenterStageFrame -> amusement-center-stage.png
HudLayer/SeatPanels/SeatPanel0..SeatPanel3 -> amusement-seat-panel.png
TileLayer/Tile0..Tile17 -> amusement-tile-frame.png
OverlayLayer/PropertyPrompt -> amusement-prompt-frame.png
OverlayLayer/ResultPanel -> amusement-result-frame.png
```

Keep text-bearing label children above the sprite-bearing nodes in draw order so runtime copy stays readable.

- [ ] **Step 5: Re-run the art contract and full preflight suite**

Run:
- `npm test -- tests/ui/battle-art.test.ts`
- `npm run verify:cocos-preflight`

Expected: PASS; the repo now has the declared art pack, the scene serializes sprite-backed nodes, and the standard preflight surface stays green.

- [ ] **Step 6: Commit the art import**

```bash
git add assets/resources/battle-polish assets/scripts/ui/battle-art.ts tests/ui/battle-art.test.ts assets/scenes/Battle.scene
git commit -m "feat: import bright amusement battle art"
```

## Task 4: Verify the restored scene across tests and Cocos previews, then update the docs indexes

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Run the focused UI suite together so the scene, layout math, and presentation copy stay aligned**

Run:
- `npm test -- tests/ui/battle-art.test.ts tests/ui/battle-layout.test.ts tests/ui/battle-presentation.test.ts tests/ui/battle-responsive-layout.test.ts`

Expected: PASS on all four files.

- [ ] **Step 2: Run the authoritative Cocos build smoke after the scene rewrite**

Run: `npm run verify:cocos-build`

Expected: PASS with build logs and artifacts under `artifacts/cocos-build/`.

- [ ] **Step 3: Do a manual visual check in Cocos Creator at the three supported layout profiles**

Open the project:

```bash
open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app "$PWD"
```

Preview `Battle.scene` at:
- `1280x720` (`desktop`)
- `960x720` (`narrow`)
- `720x1280` (`portrait`)

Confirm all of the following before calling the slice done:
- the board remains centered and no tile frame is clipped
- all four seat panels stay readable at the edges
- the center stage remains the dominant action surface
- the background, center-stage frame, seat panels, tile frames, prompt frame, and result frame show no missing textures
- role selection, hand, and skill UI sit above scenic layers instead of behind them
- the screen reads as a bright amusement-map board, not the old text-only prototype

- [ ] **Step 4: Add this recovery plan to the docs indexes and mark the older greenfield plan accordingly**

Add to `docs/README.md`:

```md
- [Fortune Board Battle Scene Visual Recovery Implementation Plan](./superpowers/plans/2026-04-01-fortune-board-battle-scene-visual-recovery.md): recovery plan for reconciling the current half-migrated Battle scene, missing scenic assets, and layer-based controller bindings.
```

Add to `docs/superpowers/README.md`:

```md
- [Fortune Board Battle Scene Visual Recovery Implementation Plan](./plans/2026-04-01-fortune-board-battle-scene-visual-recovery.md): recovery plan for finishing the bright-amusement Battle scene from the current repo state.
```

Update `docs/superpowers/plans/README.md` so both plan states are explicit:

```md
- [Fortune Board Battle Scene Visual Recovery Implementation Plan](./2026-04-01-fortune-board-battle-scene-visual-recovery.md): recovery plan for reconciling the current half-migrated scene, missing art assets, and layer-based controller bindings.
- [Fortune Board Bright Amusement Map Polish Implementation Plan](./2026-03-29-fortune-board-bright-amusement-map-polish.md): original greenfield polish plan; superseded for execution from the current repo state by the 2026-04-01 visual recovery plan.
```

- [ ] **Step 5: Commit the documentation updates**

```bash
git add docs/README.md docs/superpowers/README.md docs/superpowers/plans/README.md docs/superpowers/plans/2026-04-01-fortune-board-battle-scene-visual-recovery.md
git commit -m "docs: add battle scene visual recovery plan"
```

## Verification Checklist

- [ ] `tests/ui/battle-art.test.ts` passes
- [ ] `Battle.scene` uses the required layer roots instead of the legacy top-level buckets
- [ ] `BattleController.ts` binds `getSceneRoots()` and no longer depends on `Hud`, `Board`, `Tokens`, or runtime controller fallbacks
- [ ] All six `assets/resources/battle-polish/*.png` files are checked in
- [ ] `npm run verify:cocos-preflight` passes
- [ ] `npm run verify:cocos-build` passes
- [ ] Desktop, narrow, and portrait previews keep the board, seat panels, and center stage readable
