# Fortune Board World Map High-Fidelity Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current `Battle` scene from a text-heavy prototype into a near-original Tiantian-Fuweng-style world-map battle surface while keeping protected assets and names original.

**Architecture:** Keep deterministic gameplay state and scene binding in the existing TypeScript rules/UI layer, but replace the current tiny-label presentation with a desktop-first world-map composition. The implementation should harden layout tests first, then progressively rebuild backdrop, tile cards, center plaza, and four-corner HUD framing in a way that remains data-driven.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Vitest, npm, Cocos scene serialization

---

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: retained as an older execution plan for the superseded world-map target; replacement planning is required for the newer reference-image full-screen direction
- Date: `2026-04-02`
- Depends on: `../specs/2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md`
- Related docs: `../../product/requirements.md`, `./2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md`, `../specs/2026-04-02-fortune-board-reference-image-full-screen-battle-design.md`

## File Surface

- Modify: `docs/README.md`
- Modify: `docs/product/requirements.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/specs/README.md`
- Modify: `docs/superpowers/plans/README.md`
- Modify: `docs/superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md`
- Create: `docs/superpowers/plans/2026-04-02-fortune-board-world-map-high-fidelity-battle.md`
- Modify: `assets/scripts/ui/battle-responsive-layout.ts`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/battle-presentation.ts`
- Modify: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `tests/ui/battle-art.test.ts`
- Modify: `tests/ui/lobby-flow.test.ts`

### Task 1: Lock the documentation and planning entrypoints

**Files:**
- Modify: `docs/product/requirements.md`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/specs/README.md`
- Modify: `docs/superpowers/plans/README.md`
- Modify: `docs/superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md`
- Create: `docs/superpowers/plans/2026-04-02-fortune-board-world-map-high-fidelity-battle.md`

- [ ] **Step 1: Rewrite the remaining doc entrypoints to make world-map recreation canonical**

Add or update wording so these points are explicit:

```md
- the current Battle-scene target is near-original world-map recreation
- bright-amusement documents are project history, not mainline direction
- the Battle-scene rebuild is a first-class milestone, not a later polish-only step
```

- [ ] **Step 2: Verify every changed doc is linked from the right index**

Run:

```bash
rg -n "world-map|Bright Amusement|superseded|Battle Implementation Plan" docs/README.md docs/product/requirements.md docs/superpowers/README.md docs/superpowers/specs/README.md docs/superpowers/plans/README.md docs/superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md
```

Expected: the new world-map spec/plan appear in indexes, and older bright-amusement entries are marked superseded.

- [ ] **Step 3: Commit the docs-only direction change**

```bash
git add docs/product/requirements.md docs/README.md docs/superpowers/README.md docs/superpowers/specs/README.md docs/superpowers/plans/README.md docs/superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md docs/superpowers/plans/2026-04-02-fortune-board-world-map-high-fidelity-battle.md
git commit -m "docs: switch battle target to world-map recreation"
```

### Task 2: Make layout tests fail for collapsed prototype-style battle composition

**Files:**
- Modify: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `tests/ui/battle-art.test.ts`

- [ ] **Step 1: Add failing assertions for desktop-first world-map layout**

Add test expectations that reject the current weak layout:

```ts
expect(layout.profile).toBe('desktop');
expect(layout.centerStage.width).toBeGreaterThanOrEqual(360);
expect(layout.centerStage.height).toBeGreaterThanOrEqual(180);
expect(layout.seatPanels.topLeft.x).toBeLessThan(-320);
expect(layout.seatPanels.bottomRight.y).toBeLessThan(-140);
```

and add structural expectations such as:

```ts
expect(boardDecorLayer.getChildByName('WorldMapScenicMass')).toBeTruthy();
expect(centerStage.getChildByName('DicePlazaFrame')).toBeTruthy();
expect(tileNode.getChildByName('TileAccentBand')).toBeTruthy();
```

- [ ] **Step 2: Run the focused UI tests to confirm the current prototype fails**

Run:

```bash
npm test -- tests/ui/battle-responsive-layout.test.ts
npm test -- tests/ui/battle-art.test.ts
```

Expected: FAIL because the current scene still allows small prototype-style geometry and lacks the richer world-map node contract.

- [ ] **Step 3: Commit the red tests**

```bash
git add tests/ui/battle-responsive-layout.test.ts tests/ui/battle-art.test.ts
git commit -m "test: lock world-map battle layout contract"
```

### Task 3: Rebuild the responsive geometry around a desktop-first world-map board

**Files:**
- Modify: `assets/scripts/ui/battle-responsive-layout.ts`
- Modify: `tests/ui/battle-responsive-layout.test.ts`

- [ ] **Step 1: Implement stronger desktop, narrow, and portrait geometry targets**

Update the layout profile contract along these lines:

```ts
desktop: {
  boardScale: 1.08,
  centerStage: { x: 0, y: 8, width: 380, height: 188 },
}

narrow: {
  boardScale: 0.98,
  centerStage: { x: 0, y: 0, width: 336, height: 168 },
}
```

while keeping portrait readable without compressing the board into a tiny center cluster.

- [ ] **Step 2: Run the layout tests**

Run:

```bash
npm test -- tests/ui/battle-responsive-layout.test.ts
```

Expected: PASS for the updated geometry contract.

- [ ] **Step 3: Commit the geometry rewrite**

```bash
git add assets/scripts/ui/battle-responsive-layout.ts tests/ui/battle-responsive-layout.test.ts
git commit -m "feat: widen battle layout for world-map composition"
```

### Task 4: Replace text-only route rendering with framed world-map tile cards

**Files:**
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/battle-presentation.ts`
- Modify: `tests/ui/battle-art.test.ts`

- [ ] **Step 1: Implement bounded tile-card hierarchy**

Each tile should create or bind child nodes like:

```ts
'TileFrame'
'TileAccentBand'
'TileBadgePlate'
'TitleLabel'
'SupportingLabel'
'BadgeLabel'
```

and property/event/special tiles should apply differentiated color or badge treatment rather than relying on three equal-weight labels.

- [ ] **Step 2: Run the art and UI tests**

Run:

```bash
npm test -- tests/ui/battle-art.test.ts
npm test -- tests/ui/battle-responsive-layout.test.ts
```

Expected: PASS with the richer tile-card structure present.

- [ ] **Step 3: Commit the tile-card pass**

```bash
git add assets/scripts/ui/BattleController.ts assets/scripts/ui/battle-presentation.ts tests/ui/battle-art.test.ts tests/ui/battle-responsive-layout.test.ts
git commit -m "feat: render world-map tile cards"
```

### Task 5: Rebuild the center dice plaza and four-corner HUD frames

**Files:**
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `tests/ui/lobby-flow.test.ts`
- Modify: `tests/ui/battle-art.test.ts`

- [ ] **Step 1: Implement a stronger center-stage and seat-panel node contract**

Bind or create a node structure like:

```ts
'DicePlazaFrame'
'DicePlazaGlow'
'RollButtonFrame'
'PanelFrame'
'PanelAccent'
'PanelStatStack'
```

so the center and corners read more like the reference screen grammar.

- [ ] **Step 2: Run the focused UI tests**

Run:

```bash
npm test -- tests/ui/battle-art.test.ts
npm test -- tests/ui/lobby-flow.test.ts
```

Expected: PASS and no regression in battle boot or lobby-to-battle flow.

- [ ] **Step 3: Commit the HUD reconstruction**

```bash
git add assets/scripts/ui/BattleController.ts tests/ui/battle-art.test.ts tests/ui/lobby-flow.test.ts
git commit -m "feat: rebuild battle dice plaza and corner hud"
```

### Task 6: Verify the browser-preview contract before claiming fidelity gains

**Files:**
- Modify: `tests/ui/battle-responsive-layout.test.ts`

- [ ] **Step 1: Preserve the anti-regression verification note in tests or comments**

Add a concise note near the relevant test or helper that desktop-fidelity screenshots should be evaluated in `设计分辨率 (960X640)` or a desktop/fullscreen preview, not in a portrait phone shell.

- [ ] **Step 2: Run the full UI suite**

Run:

```bash
npm test -- tests/ui
```

Expected: PASS for all Battle-scene UI tests.

- [ ] **Step 3: Record manual verification targets**

Use this checklist during GUI validation:

```md
- preview device set to `设计分辨率 (960X640)` or desktop/fullscreen
- `Show FPS` disabled
- board fills the stage rather than collapsing into the center
- center dice plaza dominates the middle
- four player HUDs stay anchored to corners
```

- [ ] **Step 4: Commit the verification pass**

```bash
git add tests/ui/battle-responsive-layout.test.ts
git commit -m "test: codify world-map battle preview verification"
```
