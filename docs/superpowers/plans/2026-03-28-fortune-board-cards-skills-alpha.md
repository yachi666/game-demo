# Fortune Board Cards And Skills Alpha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: ready for execution
- Date: `2026-03-28`
- Depends on: `../../product/requirements.md`, `../specs/2026-03-28-fortune-board-first-playable-mvp-design.md`
- Related docs: `./2026-03-28-fortune-board-first-playable-mvp.md`, `./2026-03-28-fortune-board-cocos-ci-verification-implementation-plan.md`

**Goal:** Add the first strategic-depth slice to the playable Battle scene by introducing a deterministic card system and lightweight role skills that create a second path to advantage beyond pure property economy.

**Architecture:** Keep cards, skills, and temporary status effects inside the pure TypeScript rules layer so they stay testable outside Cocos. Extend the existing `BattleController` and HUD with minimal new presentation surfaces for hand state, skill activation, and card resolution, while keeping the current one-scene playable loop intact.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Node.js, Vitest, npm

---

## Why This Next

The current repository already proves the first playable loop works: rolling, movement, property purchase, tolls, AI turns, win checks, and CI-backed Cocos verification are all in place.

The largest product gap versus the PRD is that the match still plays like a deterministic economy demo. It does not yet provide the promised “card / skill reversal” layer, role differentiation, or mid-turn choice tension. That makes cards and skills the highest-value next iteration because they:

- unlock the second meaningful path to advantage called out in the PRD
- make turn-to-turn choices more interesting without needing new platform work
- pressure-test whether the current deterministic rules architecture can absorb richer gameplay without collapsing into scene-driven logic

## Scope

### Included

- `4` lightweight role archetypes with one skill each
- a small deterministic starter deck of `6-8` card definitions with duplicated copies as needed
- hand, draw, discard, and per-turn card-use limits in match state
- temporary status effects needed by the selected cards and skills
- a minimal in-scene role selection overlay before the first turn starts
- one human card-use flow inside the existing `Battle` scene
- simple AI heuristics for when to use cards and skills
- turn log entries for every card and skill resolution
- deterministic tests for card, skill, status-effect, and AI decision logic

### Excluded

- menu scene or lobby flow
- card collection metagame
- paid economy, progression, or permanent unlocks
- expanded board size or property upgrade system
- tutorial flow
- production art polish

## Product Decisions Locked By This Plan

- Keep the existing `Battle` scene as the only runtime scene for this slice.
- Put human role choice in a lightweight overlay inside `Battle` rather than adding a new lobby scene yet.
- Keep the current tiny board so the new strategic systems can be observed quickly.
- Let each player use at most `1` card and `1` skill per turn.
- Restrict human card / skill interaction windows to explicit, low-ambiguity moments:
  - before roll
  - after landing resolution if the effect allows it
- Use a closed starter set of simple effects only:
  - gain coins
  - move forward or backward a fixed distance
  - shield against one penalty or toll
  - temporarily boost toll or discount a purchase
- Do not add target-selection UX beyond self-target or automatic opponent targeting in this slice.

## File Surface

- Create: `assets/scripts/ai/decide-card.ts`
- Create: `assets/scripts/ai/decide-skill.ts`
- Create: `assets/scripts/data/card-config.ts`
- Create: `assets/scripts/data/role-config.ts`
- Create: `assets/scripts/core/turn-flow.ts`
- Create: `assets/scripts/gameplay/cards.ts`
- Create: `assets/scripts/gameplay/skills.ts`
- Create: `assets/scripts/gameplay/status-effects.ts`
- Create: `assets/scripts/ui/CardHandController.ts`
- Create: `assets/scripts/ui/RoleSelectionController.ts`
- Create: `assets/scripts/ui/SkillButtonController.ts`
- Create: `tests/core/turn-flow.test.ts`
- Create: `tests/ai/decide-card.test.ts`
- Create: `tests/ai/decide-skill.test.ts`
- Create: `tests/gameplay/cards.test.ts`
- Create: `tests/gameplay/skills.test.ts`
- Create: `tests/gameplay/status-effects.test.ts`
- Modify: `assets/scenes/Battle.scene`
- Modify: `assets/scripts/core/advance-phase.ts`
- Modify: `assets/scripts/core/create-match.ts`
- Modify: `assets/scripts/core/phases.ts`
- Modify: `assets/scripts/core/types.ts`
- Modify: `assets/scripts/data/match-config.ts`
- Modify: `assets/scripts/gameplay/economy.ts`
- Modify: `assets/scripts/gameplay/movement.ts`
- Modify: `assets/scripts/gameplay/resolve-tile.ts`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

## Task 1: Extend Deterministic Match State For Strategic Systems

**Files:**
- Modify: `assets/scripts/core/types.ts`
- Modify: `assets/scripts/core/phases.ts`
- Modify: `assets/scripts/core/create-match.ts`
- Modify: `assets/scripts/data/match-config.ts`
- Create: `assets/scripts/data/card-config.ts`
- Create: `assets/scripts/data/role-config.ts`
- Create: `assets/scripts/core/turn-flow.ts`
- Create: `tests/core/turn-flow.test.ts`

- [ ] Define new pure-data types for card definitions, role definitions, per-player hands, discard pile, skill state, and temporary status effects in `assets/scripts/core/types.ts`.
- [ ] Extend the phase model in `assets/scripts/core/phases.ts` with explicit card / skill interaction windows instead of folding them into ad hoc scene callbacks.
- [ ] Update `assets/scripts/data/match-config.ts` so the starter match defines a deterministic starter deck profile plus the ordered pool of role ids available for human selection and AI auto-assignment.
- [ ] Add `assets/scripts/data/card-config.ts` with a minimal starter set of `6-8` simple card definitions and document each effect in comments or labels.
- [ ] Add `assets/scripts/data/role-config.ts` with `4` roles mapped to simple, testable skill effects.
- [ ] Update `assets/scripts/core/create-match.ts` so a new match snapshot includes:
  - shuffled or deterministic draw pile
  - discard pile
  - per-player hand arrays
  - `roleId` for AI players only after assignment
  - `roleId: null` and `requiresRoleSelection: true` for the human player before the first turn starts
  - an `availableRoleIds` pool that runtime selection can consume exactly once
  - per-turn card-use flag
  - per-turn skill-use flag
  - active status-effect list
- [ ] Add `assets/scripts/core/turn-flow.ts` as a pure orchestration layer for turn-start draw, human pre-roll actions, roll modifiers, landing resolution, and end-of-turn cleanup so `BattleController` can stay a scene adapter instead of remaining the only place where game sequencing is testable.
- [ ] Lock ownership explicitly in the plan and in code comments:
  - `assets/scripts/core/advance-phase.ts` owns legal state transitions only
  - `assets/scripts/core/turn-flow.ts` owns multi-step sequencing by calling `advancePhase` and the pure gameplay helpers
  - `assets/scripts/ui/BattleController.ts` owns scene wiring and animation only
- [ ] Write `tests/core/turn-flow.test.ts` for phase gating and sequencing behavior that should not depend on Cocos node wiring.
- [ ] Run: `npm test -- tests/core/create-match.test.ts`
- [ ] Expected: existing match-creation tests are updated and passing with the expanded state shape.

## Task 2: Add Card Resolution And Status-Effect Rules

**Files:**
- Create: `assets/scripts/gameplay/cards.ts`
- Create: `assets/scripts/gameplay/status-effects.ts`
- Create: `tests/gameplay/cards.test.ts`
- Create: `tests/gameplay/status-effects.test.ts`
- Modify: `assets/scripts/gameplay/economy.ts`
- Modify: `assets/scripts/gameplay/resolve-tile.ts`

- [ ] Write failing tests in `tests/gameplay/cards.test.ts` for:
  - drawing cards into hand
  - playing a gain-money card
  - playing a move card
  - discarding used cards
  - enforcing one-card-per-turn
- [ ] Write failing tests in `tests/gameplay/status-effects.test.ts` for:
  - shielded toll / penalty prevention
  - one-turn purchase discount
  - one-turn toll boost expiry
- [ ] Implement `assets/scripts/gameplay/status-effects.ts` as the single source of truth for adding, consuming, and clearing temporary effects.
- [ ] Implement `assets/scripts/gameplay/cards.ts` with pure functions for draw, validate-play, resolve-play, and discard behavior.
- [ ] Update `assets/scripts/gameplay/economy.ts` and `assets/scripts/gameplay/resolve-tile.ts` so tolls, penalties, and property costs can consume relevant temporary effects rather than bypassing the rules layer.
- [ ] Run:
  - `npm test -- tests/gameplay/cards.test.ts`
  - `npm test -- tests/gameplay/status-effects.test.ts`
  - `npm test -- tests/gameplay/resolve-tile.test.ts`
- [ ] Expected: all targeted tests pass, and existing tile-resolution behavior remains deterministic when no cards are active.

## Task 3: Add Role Skill Resolution

**Files:**
- Create: `assets/scripts/gameplay/skills.ts`
- Create: `tests/gameplay/skills.test.ts`
- Modify: `assets/scripts/core/types.ts`
- Modify: `assets/scripts/gameplay/movement.ts`
- Modify: `assets/scripts/gameplay/resolve-tile.ts`

- [ ] Write failing tests in `tests/gameplay/skills.test.ts` for all four starter roles.
- [ ] Keep skill effects lightweight and orthogonal to the starter cards, for example:
  - economy role: discount next property purchase this turn
  - toll role: boost next collected toll this turn
  - mobility role: add a fixed movement bonus to the next roll before movement is resolved
  - defense role: ignore next penalty or toll
- [ ] Implement `assets/scripts/gameplay/skills.ts` with pure functions for:
  - validating skill availability
  - applying skill effects
  - marking per-turn skill use
  - clearing end-of-turn skill state
- [ ] Update `assets/scripts/gameplay/movement.ts` so any roll modifier or forced movement effect is applied through one explicit movement pipeline rather than direct position mutation inside `BattleController`.
- [ ] Update any affected rules helpers so skill effects are consumed through the same status-effect system as cards where possible.
- [ ] Run:
  - `npm test -- tests/gameplay/skills.test.ts`
  - `npm test -- tests/gameplay/status-effects.test.ts`
- [ ] Expected: every role produces one distinct, observable strategic advantage without introducing scene-only state.

## Task 4: Integrate Cards And Skills Into Turn Flow

**Files:**
- Modify: `assets/scripts/core/turn-flow.ts`
- Modify: `assets/scripts/core/advance-phase.ts`
- Modify: `assets/scripts/ui/BattleController.ts`
- Modify: `assets/scripts/ui/HudController.ts`
- Create: `assets/scripts/ui/CardHandController.ts`
- Create: `assets/scripts/ui/RoleSelectionController.ts`
- Create: `assets/scripts/ui/SkillButtonController.ts`
- Modify: `assets/scenes/Battle.scene`

- [ ] Add `assets/scripts/ui/RoleSelectionController.ts` and a minimal overlay in `assets/scenes/Battle.scene` so the human player explicitly chooses one of the four roles before the first turn starts; AI players can auto-claim remaining roles.
- [ ] Extend `assets/scripts/core/advance-phase.ts` so legal state transitions explicitly model:
  - pre-match role selection
  - turn start draw
  - optional human pre-roll card / skill window
  - AI auto-decision window
  - end-of-turn cleanup for card / skill usage flags and status expiry
- [ ] Route actual turn sequencing through `assets/scripts/core/turn-flow.ts`, and keep `BattleController` responsible only for:
  - wiring scene events into pure actions
  - animating tokens
  - re-rendering HUD, hand, role selection, and skill controls
- [ ] In `assets/scripts/core/turn-flow.ts`, make startup sequencing explicit:
  - consume the human-selected role from `availableRoleIds`
  - assign the remaining roles to AI players deterministically
  - clear `requiresRoleSelection`
  - only then dispatch `START_MATCH` and `BEGIN_TURN`
- [ ] Add `assets/scripts/ui/CardHandController.ts` to render the active player hand, highlight playable cards, and expose a single-card activation callback back to `BattleController`.
- [ ] Add `assets/scripts/ui/SkillButtonController.ts` to render the active role skill state, including disabled / already-used cases.
- [ ] Modify `assets/scripts/ui/HudController.ts` so it can show:
  - current role name
  - card count
  - latest card / skill log lines
- [ ] Modify `assets/scripts/ui/BattleController.ts` so it becomes the only scene-side orchestrator for:
  - delegating deterministic turn operations into `turn-flow`
  - relaying human play-card / use-skill actions
  - relaying AI card / skill auto-usage requests
  - re-rendering HUD, hand, token state, and role selection visibility after every deterministic state transition
- [ ] Update `assets/scenes/Battle.scene` with the minimal new nodes needed for hand and skill controls without redesigning the entire scene.
- [ ] Add or update automated `tests/core/turn-flow.test.ts` cases that prove:
  - role selection gates the first turn
  - pre-roll card / skill windows open and close legally
  - human cannot play a second card in the same turn
  - end-of-turn cleanup restores the next player to a legal state
- [ ] Manually verify in Cocos preview that:
  - role selection appears before the first turn
  - a human can still roll and move
  - hand and skill controls appear for the active human
  - card / skill actions do not bypass phase restrictions

## Task 5: Add AI Heuristics For Card And Skill Usage

**Files:**
- Create: `assets/scripts/ai/decide-card.ts`
- Create: `assets/scripts/ai/decide-skill.ts`
- Create: `tests/ai/decide-card.test.ts`
- Create: `tests/ai/decide-skill.test.ts`
- Modify: `assets/scripts/ui/BattleController.ts`

- [ ] Write failing tests for AI heuristics that stay intentionally simple and deterministic.
- [ ] Implement `assets/scripts/ai/decide-card.ts` with starter rules such as:
  - play gain-money card when cash is below reserve threshold
  - play shield card when entering a vulnerable low-cash turn
  - play move card only when it reaches a reward or unowned property
- [ ] Implement `assets/scripts/ai/decide-skill.ts` with one clear decision rule per role.
- [ ] Integrate both decision helpers into `assets/scripts/ui/BattleController.ts` so AI turns can use cards / skills before rolling without stalling the turn loop.
- [ ] Run:
  - `npm test -- tests/ai/decide-card.test.ts`
  - `npm test -- tests/ai/decide-skill.test.ts`
  - `npm test`
- [ ] Expected: AI completes full legal turns with the new systems active and still never blocks the match.

## Task 6: Playtest, Balance Pass, And Documentation

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`
- Modify: `assets/scripts/data/card-config.ts`
- Modify: `assets/scripts/data/role-config.ts`

- [ ] Run browser-based smoke tests against a built web-desktop artifact to verify:
  - the match still boots
  - human roll interaction still works
  - card / skill actions visibly change state
  - no console errors appear during a short autoplay sequence
- [ ] Do one quick balance pass on starter card numbers and skill magnitudes so no single effect instantly invalidates property play on the tiny board.
- [ ] Update the relevant docs indexes so the new plan is discoverable from the documentation entry points.
- [ ] Re-run:
  - `npm test`
  - `npm run verify:cocos-preflight`
  - `npm run verify:cocos-build`
- [ ] Expected: the cards-and-skills slice remains compatible with the current CI verification surface and is ready for execution.

## Verification Checklist

- [ ] Human turns can still complete with explicit roll interaction in `Battle.scene`
- [ ] AI turns can use eligible cards and skills without deadlocking the match
- [ ] The match log clearly records card and skill effects
- [ ] At least one card or skill effect can produce a comeback swing that pure economy alone could not
- [ ] `npm test` passes
- [ ] `npm run verify:cocos-preflight` passes
- [ ] `npm run verify:cocos-build` passes
