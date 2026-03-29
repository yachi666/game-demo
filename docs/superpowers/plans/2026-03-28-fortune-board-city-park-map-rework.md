# Fortune Board City Park Map Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: ready for execution
- Date: `2026-03-28`
- Depends on: `../specs/2026-03-28-fortune-board-city-park-map-rework-design.md`
- Related docs: `./2026-03-28-fortune-board-first-playable-mvp.md`, `./2026-03-28-fortune-board-cards-skills-alpha.md`

**Goal:** Rebuild the current `Battle` scene into a city-park-style competition board with richer tile variety, stronger HUD structure, and more product-like turn presentation.

**Architecture:** Keep deterministic match state and rule resolution inside `core/` and `gameplay/`, then layer the map rework through `data/`, `ui/`, and the scene hierarchy. Add a small deterministic event surface for `chance` and `festival` tiles, then recompose `Battle.scene` and `BattleController` around a center stage plus four-corner seat panels.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Node.js, Vitest, npm

---

## Why This Plan Exists

The project already proves the loop works, but it still presents like a prototype. The approved spec intentionally shifts the next milestone from “rules proof” to “product surface + better pacing”. This plan therefore focuses on:

- expanding the board into a medium-size ring
- introducing deterministic event variety beyond simple reward and penalty tiles
- reorganizing the HUD around a competitive four-seat presentation
- making the scene hierarchy and controller logic durable enough for future polish

## File Surface

- Create: `assets/scripts/data/event-config.ts`
- Create: `assets/scripts/gameplay/events.ts`
- Create: `tests/gameplay/events.test.ts`
- Create: `tests/data/board-config.test.ts`
- Modify: `assets/scripts/core/types.ts`
- Modify: `assets/scripts/core/create-match.ts`
- Modify: `assets/scripts/data/board-config.ts`
- Modify: `assets/scripts/gameplay/movement.ts`
- Modify: `assets/scripts/gameplay/resolve-tile.ts`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/PropertyPrompt.ts`
- Modify: `assets/scenes/Battle.scene`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

## Task 1: Extend Tile And Event Types

**Files:**
- Create: `assets/scripts/data/event-config.ts`
- Modify: `assets/scripts/core/types.ts`
- Test: `tests/data/board-config.test.ts`
- Test: `tests/gameplay/events.test.ts`

- [ ] **Step 1: Write failing tests for the expanded tile and event surface**

Create `tests/data/board-config.test.ts` with assertions that the board:

```ts
import { describe, expect, it } from 'vitest';
import { BOARD_CONFIG } from '../../assets/scripts/data/board-config';

describe('BOARD_CONFIG', () => {
  it('contains a medium-size city park loop', () => {
    expect(BOARD_CONFIG.length).toBeGreaterThanOrEqual(16);
    expect(BOARD_CONFIG.length).toBeLessThanOrEqual(20);
  });

  it('contains start, property, reward, penalty, chance, and festival tiles', () => {
    const types = new Set(BOARD_CONFIG.map((tile) => tile.type));
    expect(types.has('start')).toBe(true);
    expect(types.has('property')).toBe(true);
    expect(types.has('reward')).toBe(true);
    expect(types.has('penalty')).toBe(true);
    expect(types.has('chance')).toBe(true);
    expect(types.has('festival')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the targeted failing test**

Run: `npm test -- tests/data/board-config.test.ts`
Expected: FAIL because `chance` / `festival` tiles and the larger board shape do not exist yet.

- [ ] **Step 3: Extend `assets/scripts/core/types.ts` for richer tile metadata**

Add exact type surface for districts and event references:

```ts
export type TileType = 'start' | 'property' | 'reward' | 'penalty' | 'chance' | 'festival';

export type BoardDistrict = 'civic-plaza' | 'play-street' | 'harbor-leisure' | 'sky-garden';

export type EventEffectType =
  | 'gainCash'
  | 'loseCash'
  | 'moveForward'
  | 'moveBackward'
  | 'shieldPenaltyOrToll'
  | 'discountNextProperty'
  | 'boostNextToll';

export interface EventDefinition {
  id: string;
  label: string;
  effectType: EventEffectType;
  amount: number;
}
```

Also extend `TileConfig` with:

```ts
district?: BoardDistrict;
eventId?: string;
accentColor?: string;
```

- [ ] **Step 4: Add the deterministic event table**

Create `assets/scripts/data/event-config.ts` with a small fixed pool:

```ts
import type { EventDefinition } from '../core/types';

export const EVENT_DEFINITIONS: EventDefinition[] = [
  { id: 'cash-bonus', label: 'Park Grant', effectType: 'gainCash', amount: 120 },
  { id: 'cash-loss', label: 'Repair Bill', effectType: 'loseCash', amount: 90 },
  { id: 'move-forward', label: 'Express Tram', effectType: 'moveForward', amount: 2 },
  { id: 'move-backward', label: 'Road Closure', effectType: 'moveBackward', amount: 2 },
  { id: 'toll-shield', label: 'VIP Pass', effectType: 'shieldPenaltyOrToll', amount: 1 },
  { id: 'property-discount', label: 'Investor Coupon', effectType: 'discountNextProperty', amount: 40 },
  { id: 'toll-boost', label: 'Peak Crowd', effectType: 'boostNextToll', amount: 35 },
];
```

- [ ] **Step 5: Add event-resolution tests before implementation**

Create `tests/gameplay/events.test.ts` with deterministic expectations:

```ts
import { describe, expect, it } from 'vitest';
import { getEventForLanding } from '../../assets/scripts/gameplay/events';

describe('getEventForLanding', () => {
  it('returns a deterministic event for the same turn and tile', () => {
    expect(getEventForLanding(3, 5).id).toBe(getEventForLanding(3, 5).id);
  });
});
```

- [ ] **Step 6: Run the new event test to confirm it fails**

Run: `npm test -- tests/gameplay/events.test.ts`
Expected: FAIL because `assets/scripts/gameplay/events.ts` does not exist yet.

## Task 2: Implement Deterministic Chance And Festival Resolution

**Files:**
- Create: `assets/scripts/gameplay/events.ts`
- Modify: `assets/scripts/gameplay/resolve-tile.ts`
- Modify: `assets/scripts/gameplay/movement.ts`
- Modify: `assets/scripts/core/create-match.ts`
- Test: `tests/gameplay/events.test.ts`
- Test: `tests/gameplay/resolve-tile.test.ts`

- [ ] **Step 1: Implement deterministic event lookup**

Create `assets/scripts/gameplay/events.ts`:

```ts
import { EVENT_DEFINITIONS } from '../data/event-config';

export function getEventForLanding(turn: number, tileIndex: number) {
  const index = Math.abs(turn + tileIndex) % EVENT_DEFINITIONS.length;
  return EVENT_DEFINITIONS[index]!;
}
```

- [ ] **Step 2: Add failing rule tests for chance and festival tiles**

Extend `tests/gameplay/resolve-tile.test.ts` with:

```ts
it('resolves a chance tile through the deterministic event table', () => {
  // Arrange a player on a chance tile and assert the chosen event result.
});

it('resolves a festival tile as a stronger positive authored event', () => {
  // Arrange a player on a festival tile and assert cash or status gain.
});
```

- [ ] **Step 3: Run the targeted tile-resolution tests**

Run: `npm test -- tests/gameplay/resolve-tile.test.ts`
Expected: FAIL because `resolveTileForPlayer` does not yet understand `chance` or `festival`.

- [ ] **Step 4: Extend `assets/scripts/gameplay/resolve-tile.ts`**

Implement new branches:

```ts
if (tile.type === 'chance') {
  const event = getEventForLanding(match.turn, player.position);
  return resolveEventForPlayer(match, playerIndex, event);
}

if (tile.type === 'festival') {
  return resolveEventForPlayer(match, playerIndex, {
    id: 'festival-bonus',
    label: 'City Festival',
    effectType: 'gainCash',
    amount: 180,
  });
}
```

`resolveEventForPlayer` should:

- apply cash changes
- apply status effects through the existing status-effect pipeline
- trigger forced movement through one movement helper instead of mutating `position` inline
- append a readable log entry

- [ ] **Step 5: Route forward and backward movement effects through `assets/scripts/gameplay/movement.ts`**

Add a reusable helper:

```ts
export function applyForcedMovement(match: MatchState, playerIndex: number, delta: number) {
  // normalize modulo board length and return next position in pure data form
}
```

- [ ] **Step 6: Keep match initialization compatible with the new board**

Update `assets/scripts/core/create-match.ts` only as needed so the larger board and new tile types still initialize properties and status arrays correctly.

- [ ] **Step 7: Re-run the focused rules tests**

Run:
- `npm test -- tests/gameplay/events.test.ts`
- `npm test -- tests/gameplay/resolve-tile.test.ts`

Expected: PASS for deterministic event lookup and new tile-resolution behavior.

## Task 3: Redesign The Board Data Around City Districts

**Files:**
- Modify: `assets/scripts/data/board-config.ts`
- Test: `tests/data/board-config.test.ts`

- [ ] **Step 1: Replace the tiny board with a medium-size district loop**

Rewrite `assets/scripts/data/board-config.ts` around `16-20` tiles. Use a sequence that clearly alternates economy and event beats. The final file should resemble:

```ts
export const BOARD_CONFIG: TileConfig[] = [
  { id: 'start', label: 'Grand Gate', type: 'start', district: 'civic-plaza', accentColor: '#f8d34f' },
  { id: 'civic-1', label: 'Mayor Plaza', type: 'property', district: 'civic-plaza', purchaseCost: 120, tollCost: 45, accentColor: '#4fc3f7' },
  { id: 'chance-1', label: 'Transit Hub', type: 'chance', district: 'civic-plaza', accentColor: '#8bc34a' },
  { id: 'civic-2', label: 'Library Walk', type: 'property', district: 'civic-plaza', purchaseCost: 145, tollCost: 55, accentColor: '#4fc3f7' },
  // ...continue through play-street, harbor-leisure, sky-garden
];
```

- [ ] **Step 2: Make sure district grouping is intentional**

Keep the final distribution within:

- `8-10` property tiles
- `2-3` reward tiles
- `2` penalty tiles
- `2-3` chance or festival tiles

Do not allow more than two adjacent tiles to resolve identically.

- [ ] **Step 3: Run the board-config tests**

Run: `npm test -- tests/data/board-config.test.ts`
Expected: PASS with the new board size and type diversity.

## Task 4: Rebuild The Battle Scene Layout And HUD

**Files:**
- Modify: `assets/scenes/Battle.scene`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/PropertyPrompt.ts`
- Modify: `assets/scripts/ui/BattleController.ts`

- [ ] **Step 1: Recompose `Battle.scene` into explicit zones**

Restructure the scene hierarchy to include:

```text
Battle
├── BoardRoot
│   ├── DistrictTop
│   ├── DistrictRight
│   ├── DistrictBottom
│   └── DistrictLeft
├── CenterStage
├── SeatPanels
│   ├── SeatA
│   ├── SeatB
│   ├── SeatC
│   └── SeatD
├── Tokens
└── PromptLayer
```

- [ ] **Step 2: Place tile anchors as a diamond-oriented ring**

In `assets/scenes/Battle.scene`, move or recreate tile nodes so they form a diamond ring around the center stage. Keep node naming sortable, such as `Tile01` through `Tile18`, so `BattleController` can continue mapping by order.

- [ ] **Step 3: Redesign the HUD for four-corner competition**

Update `assets/scripts/ui/HudController.ts` so it can drive:

- one current-player summary in the center stage
- four seat panels with cash, assets, role, and active-seat emphasis
- a bounded recent-event log

If the current controller is too narrow, extend its API with explicit render inputs instead of packing more ad hoc node lookups into `BattleController`.

- [ ] **Step 4: Upgrade the property prompt to feel like a match decision card**

Modify `assets/scripts/ui/PropertyPrompt.ts` so the prompt can show:

- tile name
- district label
- purchase cost
- current cash after purchase

The visual structure should fit inside the new `PromptLayer` rather than float like a debug modal.

- [ ] **Step 5: Update `BattleController` scene binding for the new layout**

Adjust node lookup and binding logic so:

- `BoardRoot`, `CenterStage`, `SeatPanels`, and `PromptLayer` are discovered explicitly
- tile nodes and seat-panel nodes are mapped deterministically
- missing-node assertions remain precise

Do not push gameplay resolution into scene code during this step.

## Task 5: Add Product-Like Turn Presentation And Documentation

**Files:**
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Add presentation helpers in `BattleController`**

Extend `BattleController` so each turn visibly stages:

- active-player seat highlight
- path or destination highlight during movement
- center-stage event announcement on landing
- owner-color property state after purchase

Keep these as presentation helpers hanging off deterministic state, for example:

```ts
private renderCenterStage(): void
private renderSeatPanels(): void
private highlightLandingTile(tileIndex: number): void
private updatePropertyOwnershipVisuals(): void
```

- [ ] **Step 2: Verify the upgraded flow at the rules and integration layers**

Run:
- `npm test -- tests/data/board-config.test.ts`
- `npm test -- tests/gameplay/events.test.ts`
- `npm test -- tests/gameplay/resolve-tile.test.ts`
- `npm test`

Expected: all focused tests pass, and the wider suite remains green.

- [ ] **Step 3: Run the repository preflight**

Run: `npm run verify:cocos-preflight`
Expected: PASS.

- [ ] **Step 4: Update documentation indexes**

Add this plan to:

- `docs/superpowers/plans/README.md`
- `docs/README.md`
- `docs/superpowers/README.md` if the new execution surface should be called out there

Suggested one-line summary:

```md
- [Fortune Board City Park Map Rework Implementation Plan](./2026-03-28-fortune-board-city-park-map-rework.md): execution plan for rebuilding the Battle scene into a city-park competition board with richer tile variety and presentation.
```

## Self-Review

- Spec coverage: covered map topology, district grouping, new tile taxonomy, deterministic chance/festival rules, center stage, seat panels, presentation helpers, testing, and docs.
- Placeholder scan: no unresolved implementation markers remain.
- Type consistency: this plan uses `chance`, `festival`, `EventDefinition`, and district metadata consistently across data, rules, and UI tasks.
