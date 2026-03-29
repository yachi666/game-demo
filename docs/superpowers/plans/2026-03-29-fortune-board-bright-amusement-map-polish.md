# Fortune Board Bright Amusement Map Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current `Battle` scene into a bright amusement-map product surface with Stitch-generated scenic assets, card-like tile rendering, and responsive desktop/mobile layout behavior.

**Architecture:** Keep match rules and board data intact, then introduce a presentation layer split between responsive layout math, art-binding contracts, and scene-node rendering. Static atmosphere comes from imported scenic assets; runtime state stays in `BattleController`, `HudController`, and presentation helpers. Verification starts with layout and presentation tests before any scene or controller rewrite.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Node.js, Vitest, npm, Stitch

---

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: ready for execution
- Date: `2026-03-29`
- Depends on: `../specs/2026-03-29-fortune-board-bright-amusement-map-polish-design.md`
- Related docs: `../specs/2026-03-28-fortune-board-city-park-map-rework-design.md`, `./2026-03-28-fortune-board-city-park-map-rework.md`

## Why This Plan Exists

The current scene is functionally playable but visually defined by raw labels and geometry. The approved spec shifts the next slice from “layout exists” to “scene feels like a product”. This plan therefore focuses on:

- locking responsive layout behavior in tests first
- defining an explicit art contract for Stitch-generated scenic assets
- refactoring `Battle.scene` into stable visual layers
- moving tile, HUD, prompt, and result rendering onto framed card surfaces
- verifying the desktop and mobile-like layouts before claiming the pass is done

## File Surface

- Create: `assets/scripts/ui/battle-art.ts`
- Create: `assets/scripts/ui/battle-responsive-layout.ts`
- Create: `tests/ui/battle-art.test.ts`
- Create: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `assets/scripts/ui/battle-layout.ts`
- Modify: `assets/scripts/ui/battle-presentation.ts`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/PropertyPrompt.ts`
- Modify: `assets/scripts/ui/ResultPanel.ts`
- Modify: `assets/scenes/Battle.scene`
- Modify: `tests/ui/battle-layout.test.ts`
- Modify: `tests/ui/battle-presentation.test.ts`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

## Task 1: Lock The Responsive Layout Contract First

**Files:**
- Create: `assets/scripts/ui/battle-responsive-layout.ts`
- Create: `tests/ui/battle-responsive-layout.test.ts`
- Modify: `tests/ui/battle-layout.test.ts`

- [ ] **Step 1: Write the failing responsive-layout tests**

Create `tests/ui/battle-responsive-layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { getBattleLayoutProfile } from '../../assets/scripts/ui/battle-responsive-layout';

describe('getBattleLayoutProfile', () => {
  it('returns the desktop profile for a wide canvas', () => {
    const layout = getBattleLayoutProfile({ width: 1280, height: 720 });

    expect(layout.profile).toBe('desktop');
    expect(layout.boardScale).toBeGreaterThan(0.9);
    expect(layout.centerStage.width).toBeGreaterThan(260);
  });

  it('returns the narrow profile for compressed landscape', () => {
    const layout = getBattleLayoutProfile({ width: 960, height: 720 });

    expect(layout.profile).toBe('narrow');
    expect(layout.seatPanels.topLeft.x).toBeLessThan(0);
    expect(layout.seatPanels.topRight.x).toBeGreaterThan(0);
  });

  it('returns the portrait profile for mobile-like canvases', () => {
    const layout = getBattleLayoutProfile({ width: 720, height: 1280 });

    expect(layout.profile).toBe('portrait');
    expect(layout.boardScale).toBeLessThan(0.9);
    expect(layout.centerStage.y).toBeGreaterThan(-80);
  });
});
```

- [ ] **Step 2: Run the new failing test**

Run: `npm test -- tests/ui/battle-responsive-layout.test.ts`
Expected: FAIL because `battle-responsive-layout.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal responsive-layout module**

Create `assets/scripts/ui/battle-responsive-layout.ts`:

```ts
export type BattleLayoutProfile = 'desktop' | 'narrow' | 'portrait';

export interface LayoutRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface BattleLayoutProfileResult {
  boardScale: number;
  centerStage: LayoutRect;
  profile: BattleLayoutProfile;
  seatPanels: {
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
  };
}

export function getBattleLayoutProfile(viewport: { height: number; width: number }): BattleLayoutProfileResult {
  const aspect = viewport.width / viewport.height;

  if (aspect >= 1.45) {
    return {
      profile: 'desktop',
      boardScale: 1,
      centerStage: { x: 0, y: 0, width: 320, height: 132 },
      seatPanels: {
        topLeft: { x: -360, y: 216 },
        topRight: { x: 360, y: 216 },
        bottomRight: { x: 360, y: -156 },
        bottomLeft: { x: -360, y: -156 },
      },
    };
  }

  if (aspect >= 1) {
    return {
      profile: 'narrow',
      boardScale: 0.88,
      centerStage: { x: 0, y: -12, width: 280, height: 120 },
      seatPanels: {
        topLeft: { x: -286, y: 224 },
        topRight: { x: 286, y: 224 },
        bottomRight: { x: 286, y: -214 },
        bottomLeft: { x: -286, y: -214 },
      },
    };
  }

  return {
    profile: 'portrait',
    boardScale: 0.76,
    centerStage: { x: 0, y: 52, width: 250, height: 108 },
    seatPanels: {
      topLeft: { x: -176, y: 448 },
      topRight: { x: 176, y: 448 },
      bottomRight: { x: 176, y: -448 },
      bottomLeft: { x: -176, y: -448 },
    },
  };
}
```

- [ ] **Step 4: Expand the existing board-layout tests around scaling assumptions**

Add to `tests/ui/battle-layout.test.ts`:

```ts
it('keeps the ring centered even when later consumers scale the board root', () => {
  const positions = createDiamondTrackPositions(18, 330, 210);
  const xs = positions.map(({ x }) => x);
  const ys = positions.map(({ y }) => y);

  expect(Math.max(...xs)).toBe(330);
  expect(Math.min(...xs)).toBe(-330);
  expect(Math.max(...ys)).toBe(210);
  expect(Math.min(...ys)).toBe(-210);
});
```

- [ ] **Step 5: Run the focused UI layout tests**

Run:
- `npm test -- tests/ui/battle-responsive-layout.test.ts`
- `npm test -- tests/ui/battle-layout.test.ts`

Expected: PASS, giving the later scene rewrite a stable layout contract.

## Task 2: Define The Stitch Art Contract Before Touching The Scene

**Files:**
- Create: `assets/scripts/ui/battle-art.ts`
- Create: `tests/ui/battle-art.test.ts`
- Modify: `assets/scripts/ui/battle-presentation.ts`
- Modify: `tests/ui/battle-presentation.test.ts`

- [ ] **Step 1: Write failing tests for the art manifest and richer tile presentation**

Create `tests/ui/battle-art.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { BATTLE_ART_ASSETS, REQUIRED_BATTLE_LAYER_NAMES } from '../../assets/scripts/ui/battle-art';

describe('battle art contract', () => {
  it('declares the scenic assets required by the polished board', () => {
    expect(BATTLE_ART_ASSETS.background).toContain('battle-polish');
    expect(BATTLE_ART_ASSETS.centerStage).toContain('battle-polish');
    expect(BATTLE_ART_ASSETS.seatPanelFrame).toContain('battle-polish');
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
});
```

Extend `tests/ui/battle-presentation.test.ts` with:

```ts
it('returns bounded tile-card copy rather than raw three-line debug text', () => {
  const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
  const presentation = getTilePresentation(match, 1);

  expect(presentation.title).toBe('Mayor Plaza');
  expect(presentation.badgeLabel).toBe('Open');
  expect(presentation.supportingLabel).toContain('Buy 120');
});
```

- [ ] **Step 2: Run the focused failing tests**

Run:
- `npm test -- tests/ui/battle-art.test.ts`
- `npm test -- tests/ui/battle-presentation.test.ts`

Expected: FAIL because the new art manifest and richer tile shape do not exist yet.

- [ ] **Step 3: Implement the art manifest with exact asset filenames**

Create `assets/scripts/ui/battle-art.ts`:

```ts
export const REQUIRED_BATTLE_LAYER_NAMES = [
  'BackgroundLayer',
  'BoardDecorLayer',
  'TileLayer',
  'TokenLayer',
  'HudLayer',
  'OverlayLayer',
] as const;

export const BATTLE_ART_ASSETS = {
  background: 'battle-polish/amusement-map-background',
  centerStage: 'battle-polish/amusement-center-stage',
  seatPanelFrame: 'battle-polish/amusement-seat-panel',
  tileFrame: 'battle-polish/amusement-tile-frame',
  propertyPromptFrame: 'battle-polish/amusement-prompt-frame',
  resultPanelFrame: 'battle-polish/amusement-result-frame',
} as const;
```

- [ ] **Step 4: Implement the minimal richer tile presentation surface**

Update `assets/scripts/ui/battle-presentation.ts` so `TilePresentation` becomes:

```ts
export interface TilePresentation {
  accentHex: string;
  badgeLabel: string;
  supportingLabel: string;
  title: string;
}
```

Update one property branch first:

```ts
return {
  title: tile.label,
  supportingLabel: `Buy ${tile.purchaseCost ?? 0} | Toll ${tile.tollCost ?? 0}`,
  badgeLabel: 'Open',
  accentHex: tile.accentColor ?? '#ffffff',
};
```

Update the owned-property branch:

```ts
return {
  title: tile.label,
  supportingLabel: `Toll ${tile.tollCost ?? 0}`,
  badgeLabel: owner.label,
  accentHex: owner.color,
};
```

- [ ] **Step 5: Record the Stitch asset generation contract in the plan execution notes**

During implementation, generate and import the following original PNG assets into Cocos under `assets/resources/battle-polish/`:

- `amusement-map-background.png`
- `amusement-center-stage.png`
- `amusement-seat-panel.png`
- `amusement-tile-frame.png`
- `amusement-prompt-frame.png`
- `amusement-result-frame.png`

Use prompts that explicitly request:

- bright daytime amusement park
- candy-color district accents
- clean empty center area for runtime labels
- no embedded UI numbers or player-specific text

- [ ] **Step 6: Re-run the focused art and presentation tests**

Run:
- `npm test -- tests/ui/battle-art.test.ts`
- `npm test -- tests/ui/battle-presentation.test.ts`

Expected: PASS, proving the runtime has a stable scenic-art contract before scene wiring starts.

## Task 3: Rebuild `Battle.scene` Around Stable Visual Layers

**Files:**
- Modify: `assets/scenes/Battle.scene`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/PropertyPrompt.ts`
- Modify: `assets/scripts/ui/ResultPanel.ts`
- Modify: `assets/scripts/ui/battle-layout.ts`
- Modify: `assets/scripts/ui/battle-responsive-layout.ts`

- [ ] **Step 1: Add a failing presentation-layout test for controller-facing scene roots**

Extend `tests/ui/battle-art.test.ts`:

```ts
it('keeps the overlay layer separate from scenic and token layers', () => {
  expect(REQUIRED_BATTLE_LAYER_NAMES.indexOf('OverlayLayer')).toBeGreaterThan(
    REQUIRED_BATTLE_LAYER_NAMES.indexOf('HudLayer'),
  );
});
```

- [ ] **Step 2: Refactor the scene hierarchy in `Battle.scene`**

Restructure the canvas tree so it contains:

```text
Canvas
  BackgroundLayer
  BoardDecorLayer
  TileLayer
  TokenLayer
  HudLayer
    SeatPanels
    CenterStage
    ActionArea
  OverlayLayer
    PropertyPrompt
    ResultPanel
    RoleSelection
```

Do not leave `Board`, `Hud`, and `Tokens` as the only top-level presentation buckets.

- [ ] **Step 3: Refactor `BattleController.ts` to bind named roots instead of building a text-only scene ad hoc**

Introduce a minimal root lookup shape near the controller top:

```ts
interface BattleSceneRoots {
  backgroundLayer: Node;
  boardDecorLayer: Node;
  tileLayer: Node;
  tokenLayer: Node;
  hudLayer: Node;
  overlayLayer: Node;
}
```

Add a helper:

```ts
private getSceneRoots(canvasNode: Node): BattleSceneRoots {
  return {
    backgroundLayer: this.getOrCreateChild(canvasNode, 'BackgroundLayer'),
    boardDecorLayer: this.getOrCreateChild(canvasNode, 'BoardDecorLayer'),
    tileLayer: this.getOrCreateChild(canvasNode, 'TileLayer'),
    tokenLayer: this.getOrCreateChild(canvasNode, 'TokenLayer'),
    hudLayer: this.getOrCreateChild(canvasNode, 'HudLayer'),
    overlayLayer: this.getOrCreateChild(canvasNode, 'OverlayLayer'),
  };
}
```

- [ ] **Step 4: Apply the responsive layout profile during scene binding**

In `BattleController.ts`, after discovering the canvas size, use:

```ts
const viewport = this.getCanvasRoot().getComponent(UITransform)!.contentSize;
const layout = getBattleLayoutProfile({ width: viewport.width, height: viewport.height });
```

Then apply `layout.seatPanels`, `layout.centerStage`, and `layout.boardScale` to:

- seat panel positions
- center-stage root size and position
- board root scale
- overlay prompt positions

- [ ] **Step 5: Update tile rendering so each tile node owns multiple labels or subnodes**

Replace the current single `Label` consumer in `renderBoardTiles()` with explicit sub-labels:

```ts
const titleLabel = this.getRequiredLabel(tileNode, 'TitleLabel');
const supportingLabel = this.getRequiredLabel(tileNode, 'SupportingLabel');
const badgeLabel = this.getRequiredLabel(tileNode, 'BadgeLabel');
```

Then bind:

```ts
titleLabel.string = presentation.title;
supportingLabel.string = presentation.supportingLabel;
badgeLabel.string = presentation.badgeLabel;
```

- [ ] **Step 6: Update `HudController.ts`, `PropertyPrompt.ts`, and `ResultPanel.ts` to render into framed card structures**

Add fields needed for framed UI rather than a single raw label block. At minimum:

```ts
// HudController seat content fields should support title + stats + state tint
// PropertyPrompt should support a framed title, district line, cost line, and button row
// ResultPanel should support a framed headline label
```

Keep controller logic data-driven; do not hard-code player copy into art textures.

- [ ] **Step 7: Run the focused UI suite after the scene/controller rewrite**

Run:
- `npm test -- tests/ui/battle-layout.test.ts`
- `npm test -- tests/ui/battle-responsive-layout.test.ts`
- `npm test -- tests/ui/battle-art.test.ts`
- `npm test -- tests/ui/battle-presentation.test.ts`

Expected: PASS, with the scene now honoring the same layout and art contract introduced earlier.

## Task 4: Finish Prompt, HUD, And Documentation Integration

**Files:**
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/PropertyPrompt.ts`
- Modify: `assets/scripts/ui/ResultPanel.ts`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Tighten center-stage and prompt copy for small screens**

Adjust the center-stage rendering rules in `BattleController.ts` and `HudController.ts` so:

```ts
// desktop: allow full "Latest: Player 1 bought Mayor Plaza"
// portrait: collapse to shorter event copy such as "Bought Mayor Plaza"
```

The implementation should key from `layout.profile`, not from hard-coded device names.

- [ ] **Step 2: Add or update presentation tests for compressed copy**

Extend `tests/ui/battle-presentation.test.ts` with:

```ts
it('keeps seat panel copy compact and role-aware', () => {
  const match = createMatch(BOARD_CONFIG, MATCH_CONFIG);
  match.players[0].roleId = 'role-economy';

  const seat = getSeatPanelPresentation(match, 0);

  expect(seat.title).toContain('Player 1');
  expect(seat.lines.some((line) => line.includes('Role: Broker'))).toBe(true);
});
```

- [ ] **Step 3: Run the UI suite and the broader deterministic test suite**

Run:
- `npm test -- tests/ui/battle-presentation.test.ts`
- `npm test -- tests/ui/battle-layout.test.ts`
- `npm test -- tests/ui/battle-responsive-layout.test.ts`
- `npm test`

Expected: PASS, confirming the presentation refactor did not break rules or AI tests.

- [ ] **Step 4: Update documentation indexes for the new plan**

Add this plan to:

- `docs/README.md`
- `docs/superpowers/README.md`
- `docs/superpowers/plans/README.md`

Use a one-line description that mentions:

- bright amusement-map polish
- Stitch scenic assets
- responsive desktop/mobile layout support

- [ ] **Step 5: Perform the final visual verification pass**

Open the project in Cocos and verify:

- desktop landscape composition
- narrow landscape composition
- portrait-like composition
- tile labels remain bounded inside their card surfaces
- seat panels stay readable
- prompts and result panels sit inside framed overlays

Preferred commands:

```bash
open -a /Applications/CocosDashboard.app /Users/lzn/Documents/trae_projects/demo
npm test
```

- [ ] **Step 6: Commit the implementation**

```bash
git add assets/scenes/Battle.scene \
  assets/scripts/ui/battle-art.ts \
  assets/scripts/ui/battle-responsive-layout.ts \
  assets/scripts/ui/battle-layout.ts \
  assets/scripts/ui/battle-presentation.ts \
  assets/scripts/ui/BattleController.ts \
  assets/scripts/ui/HudController.ts \
  assets/scripts/ui/PropertyPrompt.ts \
  assets/scripts/ui/ResultPanel.ts \
  tests/ui/battle-art.test.ts \
  tests/ui/battle-responsive-layout.test.ts \
  tests/ui/battle-layout.test.ts \
  tests/ui/battle-presentation.test.ts \
  docs/README.md \
  docs/superpowers/README.md \
  docs/superpowers/plans/README.md
git commit -m "Polish battle scene into bright amusement map"
```

## Self-Review Notes

- Spec coverage check: this plan covers scenic assets, layer roots, tile/HUD framing, responsive rules, and docs updates. It intentionally does not expand rules systems because the spec marked those out of scope.
- Placeholder scan: the plan avoids TBD/TODO placeholders and names the exact files, tests, and asset filenames needed for execution.
- Type consistency: the new layout and art modules are introduced before controller refactors depend on them, so later tasks have stable interfaces to target.
