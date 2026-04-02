# Fortune Board High-Fidelity Tiantian Fuweng Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorient the current `fortune-board` project from an original lightweight MVP into a phased roadmap that can progressively reproduce the core gameplay experience of the Tiantian Fuweng mobile game while keeping protected expressive content original.

**Architecture:** Keep the current deterministic rules-first Cocos architecture, but treat the existing first-playable loop as a foundation rather than the target product shape. The roadmap should first expand the rules and data model to support a larger map, richer property economy, card and skill interplay, and random-event pressure, then layer in higher-fidelity pacing, UI feedback, and product-shell surfaces without forcing a rewrite of the core match state.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Vitest, npm, Biome, Cocos scene serialization

---

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: ready for execution
- Date: `2026-04-01`
- Depends on: `../../product/requirements.md`
- Related docs: `../README.md`, `./2026-03-28-fortune-board-cards-skills-alpha.md`, `./2026-04-01-fortune-board-battle-scene-visual-recovery.md`

## Why This Plan Exists

- The current PRD and early implementation slices were optimized for a small original MVP.
- The user has now clarified a different target: get as close as practical to the gameplay feel of the Tiantian Fuweng mobile game, delivered in phases.
- The repository already has useful foundations, but the active delivery order needs to change: gameplay fidelity must lead, while visual polish and product shell work become supporting phases.

## Scope

### Included

- Reframe the current project roadmap around high-fidelity gameplay recreation
- Expand the board and match-state model beyond the tiny prototype assumptions
- Promote cards, skills, random events, and richer economy pacing into the core gameplay milestone
- Define a later phase for feel tuning, AI improvement, and presentation polish
- Keep all content packaging original where the source material would be protected expression

### Excluded

- Direct copying of the original game's names, art, sound, UI assets, or text
- Online multiplayer
- Monetization systems
- Rankings, live-service operations, or social features

## File Surface

- Modify: `docs/product/requirements.md`
- Modify: `docs/README.md`
- Modify: `docs/product/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`
- Modify later during execution: `assets/scripts/core/types.ts`
- Modify later during execution: `assets/scripts/core/create-match.ts`
- Modify later during execution: `assets/scripts/core/turn-flow.ts`
- Modify later during execution: `assets/scripts/gameplay/economy.ts`
- Modify later during execution: `assets/scripts/gameplay/resolve-tile.ts`
- Modify later during execution: `assets/scripts/gameplay/cards.ts`
- Modify later during execution: `assets/scripts/gameplay/skills.ts`
- Modify later during execution: `assets/scripts/ui/BattleController.ts`
- Modify later during execution: `assets/scripts/ui/HudController.ts`
- Modify later during execution: `assets/scenes/Battle.scene`
- Modify later during execution: `tests/core/turn-flow.test.ts`
- Modify later during execution: `tests/gameplay/*.test.ts`
- Modify later during execution: `tests/ui/*.test.ts`

## Task 1: Lock the roadmap and document hierarchy

**Files:**
- Modify: `docs/product/requirements.md`
- Create: `docs/superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md`
- Modify: `docs/README.md`
- Modify: `docs/product/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Rewrite the PRD to replace the lightweight-original-MVP positioning**

Write the PRD so it states all of the following explicitly:

```md
- the target is a phased, high-fidelity gameplay recreation of the Tiantian Fuweng mobile experience
- the first gameplay milestone must include property economy, toll pressure, cards, skills, random events, and AI opponents
- small-map prototype assumptions are no longer the mainline product direction
- protected expressive content stays original
```

- [ ] **Step 2: Add the roadmap plan document**

Create `docs/superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md` with:

```md
- a why section explaining the goal change
- a scope section separating gameplay fidelity from protected-expression limits
- phased tasks for gameplay foundation, feel tuning, presentation polish, and product shell work
```

- [ ] **Step 3: Update every relevant docs index in the same change**

Update the indexes so they mention the new roadmap as the current planning entrypoint:

```md
- docs/README.md
- docs/product/README.md
- docs/superpowers/README.md
- docs/superpowers/plans/README.md
```

- [ ] **Step 4: Run formatting checks only if existing doc tooling covers changed files**

Run: `npm run format:check`

Expected: either PASS for supported files or no changes required for Markdown files outside formatter coverage.

- [ ] **Step 5: Commit the roadmap-documentation change**

```bash
git add docs/product/requirements.md docs/README.md docs/product/README.md docs/superpowers/README.md docs/superpowers/plans/README.md docs/superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md
git commit -m "docs: redefine high-fidelity gameplay roadmap"
```

## Task 2: Expand the gameplay foundation milestone beyond the tiny prototype

**Files:**
- Modify: `assets/scripts/core/types.ts`
- Modify: `assets/scripts/core/create-match.ts`
- Modify: `assets/scripts/core/phases.ts`
- Modify: `assets/scripts/core/turn-flow.ts`
- Modify: `assets/scripts/data/match-config.ts`
- Modify: `assets/scripts/data/board-config.ts`
- Modify: `assets/scripts/gameplay/economy.ts`
- Modify: `assets/scripts/gameplay/resolve-tile.ts`
- Modify: `tests/core/create-match.test.ts`
- Modify: `tests/core/turn-flow.test.ts`
- Modify: `tests/gameplay/resolve-tile.test.ts`

- [ ] **Step 1: Write the failing tests for a larger, richer board contract**

Add targeted test cases like:

```ts
it('supports a board with at least twelve ownable properties and multiple functional tiles', () => {
  const ownableTiles = BOARD_CONFIG.filter((tile) => tile.type === 'property');
  const functionalTiles = BOARD_CONFIG.filter((tile) => tile.type !== 'property');

  expect(ownableTiles.length).toBeGreaterThanOrEqual(12);
  expect(functionalTiles.length).toBeGreaterThanOrEqual(8);
});

it('creates a match state that can track event-oriented tiles and larger-map pacing', () => {
  const match = createMatch();

  expect(match.boardSnapshot.length).toBe(BOARD_CONFIG.length);
  expect(match.turnCount).toBe(0);
});
```

- [ ] **Step 2: Run the focused tests to verify the current prototype assumptions fail**

Run:

```bash
npm test -- tests/core/create-match.test.ts
npm test -- tests/gameplay/resolve-tile.test.ts
```

Expected: FAIL because the current board and match setup still reflect the tiny prototype assumptions.

- [ ] **Step 3: Implement the minimal data-model expansion**

Make the rules layer support a first real gameplay map milestone:

```ts
export type TileType =
  | 'start'
  | 'property'
  | 'chance'
  | 'reward'
  | 'penalty'
  | 'jail'
  | 'teleport';
```

and update match creation so event-oriented tile state and larger board pacing can be tracked without scene-only hacks.

- [ ] **Step 4: Run the focused tests to verify the expanded contract passes**

Run:

```bash
npm test -- tests/core/create-match.test.ts
npm test -- tests/core/turn-flow.test.ts
npm test -- tests/gameplay/resolve-tile.test.ts
```

Expected: PASS for the updated board and flow contract.

- [ ] **Step 5: Commit the larger-map foundation**

```bash
git add assets/scripts/core/types.ts assets/scripts/core/create-match.ts assets/scripts/core/phases.ts assets/scripts/core/turn-flow.ts assets/scripts/data/match-config.ts assets/scripts/data/board-config.ts assets/scripts/gameplay/economy.ts assets/scripts/gameplay/resolve-tile.ts tests/core/create-match.test.ts tests/core/turn-flow.test.ts tests/gameplay/resolve-tile.test.ts
git commit -m "feat: expand board rules beyond prototype scale"
```

## Task 3: Promote cards, skills, and random events into the core milestone

**Files:**
- Modify: `assets/scripts/gameplay/cards.ts`
- Modify: `assets/scripts/gameplay/skills.ts`
- Modify: `assets/scripts/gameplay/status-effects.ts`
- Modify: `assets/scripts/core/turn-flow.ts`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `tests/gameplay/cards.test.ts`
- Modify: `tests/gameplay/skills.test.ts`
- Create: `tests/gameplay/random-events.test.ts`

- [ ] **Step 1: Write failing tests that treat cards, skills, and events as first-class loop elements**

Add tests such as:

```ts
it('lets a turn include event resolution plus a later card or skill consequence', () => {
  const match = createMatch();
  // arrange a deterministic landing on an event tile and assert the state change pipeline
});

it('keeps at least one comeback path available through cards or skills when a player trails in cash', () => {
  const match = createMatch();
  // arrange a behind state and assert a legal reactive action exists
});
```

- [ ] **Step 2: Run the targeted gameplay tests and capture the missing behavior**

Run:

```bash
npm test -- tests/gameplay/cards.test.ts
npm test -- tests/gameplay/skills.test.ts
npm test -- tests/gameplay/random-events.test.ts
```

Expected: FAIL until event resolution is fully integrated into the same deterministic pipeline as cards and skills.

- [ ] **Step 3: Implement random-event resolution through the rules layer**

Keep event resolution alongside cards and skills rather than scene callbacks:

```ts
export interface RandomEventResolution {
  kind: 'gain-coins' | 'lose-coins' | 'move-forward' | 'move-backward' | 'grant-card' | 'skip-next-toll';
  amount?: number;
}
```

and integrate it through `turn-flow` and `resolve-tile`.

- [ ] **Step 4: Run the gameplay tests again**

Run:

```bash
npm test -- tests/gameplay/cards.test.ts
npm test -- tests/gameplay/skills.test.ts
npm test -- tests/gameplay/random-events.test.ts
npm test -- tests/core/turn-flow.test.ts
```

Expected: PASS with deterministic cards, skills, and random events all living in one legal turn pipeline.

- [ ] **Step 5: Commit the core-strategy milestone**

```bash
git add assets/scripts/gameplay/cards.ts assets/scripts/gameplay/skills.ts assets/scripts/gameplay/status-effects.ts assets/scripts/core/turn-flow.ts assets/scripts/ui/BattleController.ts tests/gameplay/cards.test.ts tests/gameplay/skills.test.ts tests/gameplay/random-events.test.ts tests/core/turn-flow.test.ts
git commit -m "feat: make cards skills and events core gameplay"
```

## Task 4: Tune feel, pacing, and AI for a more Tiantian-Fuweng-like match flow

**Files:**
- Modify: `assets/scripts/ai/decide-card.ts`
- Modify: `assets/scripts/ai/decide-skill.ts`
- Modify: `assets/scripts/ai/decide-purchase.ts`
- Modify: `assets/scripts/data/match-config.ts`
- Modify: `assets/scripts/data/card-config.ts`
- Modify: `assets/scripts/data/role-config.ts`
- Modify: `tests/ai/decide-card.test.ts`
- Modify: `tests/ai/decide-skill.test.ts`
- Create: `tests/ai/decision-priority.test.ts`

- [ ] **Step 1: Write failing AI and pacing tests**

Add focused tests like:

```ts
it('prefers preserving comeback tools when the AI is trailing', () => {
  // assert card or skill reservation behavior
});

it('does not overbuy properties when a hostile toll zone is ahead', () => {
  // assert simple forward-risk heuristic
});
```

- [ ] **Step 2: Run the AI tests to verify the current heuristics are too prototype-like**

Run:

```bash
npm test -- tests/ai/decide-card.test.ts
npm test -- tests/ai/decide-skill.test.ts
npm test -- tests/ai/decision-priority.test.ts
```

Expected: FAIL or expose missing heuristics for the richer gameplay target.

- [ ] **Step 3: Implement minimal, deterministic higher-fidelity heuristics**

Keep the AI readable and testable:

```ts
const shouldHoldShieldCard = player.cash <= reserveThreshold && incomingThreatScore > 0;
const shouldAvoidPurchase = projectedCashAfterBuy < dangerReserve;
```

- [ ] **Step 4: Run the AI and gameplay regression tests**

Run:

```bash
npm test -- tests/ai/decide-card.test.ts
npm test -- tests/ai/decide-skill.test.ts
npm test -- tests/ai/decision-priority.test.ts
npm test -- tests/core/turn-flow.test.ts
```

Expected: PASS with simple but more lifelike opponent behavior.

- [ ] **Step 5: Commit the pacing and AI improvement**

```bash
git add assets/scripts/ai/decide-card.ts assets/scripts/ai/decide-skill.ts assets/scripts/ai/decide-purchase.ts assets/scripts/data/match-config.ts assets/scripts/data/card-config.ts assets/scripts/data/role-config.ts tests/ai/decide-card.test.ts tests/ai/decide-skill.test.ts tests/ai/decision-priority.test.ts tests/core/turn-flow.test.ts
git commit -m "feat: tune ai and pacing for richer matches"
```

## Task 5: Upgrade the battle presentation to support the richer rules surface

**Files:**
- Modify: `assets/scenes/Battle.scene`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `assets/scripts/ui/CardHandController.ts`
- Modify: `assets/scripts/ui/SkillButtonController.ts`
- Modify: `assets/scripts/ui/RoleSelectionController.ts`
- Modify: `tests/ui/battle-art.test.ts`
- Create: `tests/ui/battle-hud-flow.test.ts`

- [ ] **Step 1: Write failing UI-contract tests for the richer gameplay HUD**

Add checks such as:

```ts
it('renders enough seat, hand, event, and state surfaces for the richer gameplay loop', () => {
  // assert battle scene roots and required labels/buttons exist
});

it('keeps event feedback visible without hiding the active turn controls', () => {
  // assert UI state contract after deterministic event resolution
});
```

- [ ] **Step 2: Run the focused UI tests**

Run:

```bash
npm test -- tests/ui/battle-art.test.ts
npm test -- tests/ui/battle-hud-flow.test.ts
```

Expected: FAIL until the battle scene can expose the larger rules surface cleanly.

- [ ] **Step 3: Implement the minimal scene and controller updates**

Keep the UI aligned with the rules:

```ts
hud.latestEventLabel.string = latestEventSummary;
hud.turnLabel.string = `Turn ${match.turnCount + 1}`;
hud.activeRoleLabel.string = currentRoleName;
```

and ensure the scene has stable nodes for cards, skills, event readouts, and property details.

- [ ] **Step 4: Run the UI and gameplay regression tests**

Run:

```bash
npm test -- tests/ui/battle-art.test.ts
npm test -- tests/ui/battle-hud-flow.test.ts
npm test -- tests/core/turn-flow.test.ts
```

Expected: PASS with a stable richer gameplay presentation surface.

- [ ] **Step 5: Commit the battle HUD upgrade**

```bash
git add assets/scenes/Battle.scene assets/scripts/ui/BattleController.ts assets/scripts/ui/HudController.ts assets/scripts/ui/CardHandController.ts assets/scripts/ui/SkillButtonController.ts assets/scripts/ui/RoleSelectionController.ts tests/ui/battle-art.test.ts tests/ui/battle-hud-flow.test.ts tests/core/turn-flow.test.ts
git commit -m "feat: upgrade battle ui for richer gameplay"
```

## Task 6: Add the product-shell phase without derailing gameplay fidelity

**Files:**
- Create later during execution: `assets/scenes/Lobby.scene`
- Create later during execution: `assets/scripts/ui/LobbyController.ts`
- Modify later during execution: `assets/scenes/Battle.scene`
- Modify later during execution: `assets/scripts/ui/ResultPanel.ts`
- Create later during execution: `tests/ui/lobby-flow.test.ts`

- [ ] **Step 1: Write failing tests for the basic shell flow**

Add tests like:

```ts
it('can navigate from lobby to match setup and into battle', () => {
  // assert scene and controller flow contract
});

it('can return from the result panel to the lobby entrypoint', () => {
  // assert replay and exit affordances
});
```

- [ ] **Step 2: Run the focused shell tests**

Run:

```bash
npm test -- tests/ui/lobby-flow.test.ts
```

Expected: FAIL because the repository still boots straight into the battle scene.

- [ ] **Step 3: Implement the minimal lobby and return flow**

Keep the shell small and subordinate to gameplay:

```ts
export interface MatchSetupSelection {
  humanPlayers: number;
  aiPlayers: number;
  selectedRoleId?: string;
}
```

- [ ] **Step 4: Run the shell and regression tests**

Run:

```bash
npm test -- tests/ui/lobby-flow.test.ts
npm test -- tests/ui/battle-hud-flow.test.ts
npm test -- tests/core/turn-flow.test.ts
```

Expected: PASS with basic shell flow in place.

- [ ] **Step 5: Commit the product-shell slice**

```bash
git add assets/scenes/Lobby.scene assets/scripts/ui/LobbyController.ts assets/scenes/Battle.scene assets/scripts/ui/ResultPanel.ts tests/ui/lobby-flow.test.ts tests/ui/battle-hud-flow.test.ts tests/core/turn-flow.test.ts
git commit -m "feat: add lobby and shell flow"
```

## Self-Review

### Spec coverage

- The PRD repositioning is covered by Task 1.
- The shift from tiny prototype assumptions to a larger gameplay map is covered by Task 2.
- Cards, skills, and random events being mandatory core systems are covered by Task 3.
- Match feel, pacing, and AI improvements are covered by Task 4.
- Richer battle HUD and feedback are covered by Task 5.
- Product shell work is covered by Task 6.

### Placeholder scan

- The plan avoids `TODO`, `TBD`, or “similar to Task N” references.
- Every task includes explicit files, commands, and expected outcomes.

### Type consistency

- The plan consistently treats `turn-flow` as the orchestration layer.
- The plan keeps cards, skills, and events inside deterministic rules helpers rather than scene-only callbacks.
- The product-shell task introduces a `MatchSetupSelection` shape only in the shell phase, after gameplay foundations are in place.
