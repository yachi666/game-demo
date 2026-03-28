# Fortune Board First Playable MVP Design

## Document Info

- Project: `fortune-board`
- Document type: implementation design spec
- Status: approved for planning
- Date: `2026-03-28`
- Scope: first playable vertical slice in a real `Cocos Creator 3.8.8 + TypeScript` project
- Related docs: `../../product/requirements.md`, `../../research/cocos-creator.md`, `../README.md`

## Goal

Initialize a real Cocos Creator project and ship the smallest playable board-game slice that proves the core loop is viable on iOS-oriented foundations.

This slice must let a player enter a battle scene, roll dice, move around a simplified board, resolve tile effects, buy property, pay tolls, advance turns, let AI complete legal turns, and eventually reach a win condition. The goal is to validate the game loop and architecture, not to deliver final art, cards, skills, or onboarding.

## Why This Slice First

The current repository has product and technical direction but no executable project. The highest-value next step is to prove the game can run as a real Cocos project while keeping scope tight enough to finish quickly.

This design deliberately prioritizes:

- a real editor-backed project instead of paper architecture only
- a rules loop that can complete a full match
- clear boundaries between rules, data, presentation, and AI
- low-cost placeholder visuals that still feel testable

This design deliberately excludes:

- cards and character skills
- multiple maps
- polished art pipelines
- network play
- remote config or hot update
- crash reporting and analytics SDK integration

## Success Criteria

The slice is successful when all of the following are true:

- The repository contains a real `Cocos Creator 3.8.8` project that opens without missing-core setup work.
- A `Battle` scene can be run in the editor and enters a complete turn loop.
- The board contains a small set of tiles with visible ownership and movement feedback.
- At least one human-controlled player and at least one AI-controlled player can finish legal turns.
- A match can end through either asset target or bankruptcy.
- Turn-state changes and important rule outcomes are visible in an on-screen log and in code-level structured logs.

## Scope

### Included

- Real Cocos project initialization
- Minimal project folders aligned with repository conventions
- One battle scene
- Direct boot into the battle scene for the first slice
- Simplified board with `8-12` tiles
- Tile types: `start`, `property`, `reward`, `penalty`
- `1` human player and `1-3` simple AI players
- Dice roll, movement, tile resolution, property purchase, toll payment, turn rotation, and win check
- Basic HUD showing current player, money, total assets, dice action, and turn log
- Placeholder animation for movement and state changes
- Local config data for board, players, and economy
- Basic automated tests for deterministic rules outside Cocos scene glue

### Excluded

- Cards
- Character skills
- Save/load beyond any editor-friendly defaults
- Settings page
- Tutorial
- Production art or sound
- Native iOS SDK bridges
- Asset bundle splitting

## Product Decisions Locked By This Spec

To keep the first slice small and testable, the following decisions are fixed for now:

- The first playable build uses generic placeholder characters with no differentiated abilities.
- The initial board is intentionally tiny so repeated loops are easy to observe and debug.
- A human player uses an explicit roll button; AI turns auto-advance after a short delay.
- Landing on an unowned property presents a deterministic buy decision:
  - Human player sees a simple buy or skip choice.
  - AI buys when it still keeps a configured reserve threshold.
- Victory checks run at the end of each resolved turn, not mid-animation.

These decisions can be expanded later, but they should not be reopened while building this slice.

## Player Flow

1. Open the project and run the initial scene.
2. Enter the battle scene immediately.
3. See the board, token positions, current player panel, and roll control.
4. Active player rolls.
5. Piece moves step-by-step across the board.
6. Landing tile resolves one effect.
7. Property ownership or money totals update.
8. Optional buy prompt appears for the human player on eligible tiles.
9. Turn advances to the next living player.
10. Game ends when a win condition is met and a simple result panel appears.

## System Design

### Scene Strategy

Use one primary scene:

- `Battle` scene: default launch scene for this slice

Do not add a separate boot or menu scene yet. The first slice should open as directly as possible into the playable loop.

### Runtime Layers

The implementation should keep the following boundaries:

- `core`
  - turn phases
  - match state
  - win checks
  - deterministic rule application
- `gameplay`
  - property system
  - economy calculations
  - tile resolution helpers
  - player state helpers
- `ai`
  - buy-or-skip rule
  - roll timing
  - simple turn completion
- `data`
  - typed configuration objects for board layout and economy values
- `ui`
  - HUD
  - property prompt
  - result panel
  - turn log
- `presentation`
  - token movement
  - tile highlighting
  - ownership visuals

Rules must remain callable without scene nodes so tests can validate them directly.

### Match State Model

The rules layer should maintain a single match snapshot containing at least:

- current phase
- active player index
- turn counter
- per-player money
- per-player owned properties
- per-player position
- bankruptcy status
- per-property owner
- configured victory target
- event log entries

This match snapshot should be plain TypeScript data. Scene components can observe it or consume emitted events, but they should not be the source of truth.

### Turn State Machine

The first slice should adopt an explicit phase model based on the earlier research:

- `GameInit`
- `TurnStart`
- `AwaitRoll`
- `MovePiece`
- `ResolveTile`
- `ResolvePropertyDecision`
- `TurnEnd`
- `GameOver`

Behavior notes:

- `AwaitRoll` is only interactive for the human player.
- AI players transition from `TurnStart` to `AwaitRoll` to roll automatically after a short delay.
- `ResolvePropertyDecision` only occurs when the active player lands on an unowned property.
- No UI callback may directly skip state transitions. All transitions go through a single game-flow controller.

### Board Rules

The board is circular and uses a simple indexed tile list. Each move advances modulo board length.

Tile rules for this slice:

- `start`
  - grants a fixed bonus only when passed, including wrap-around movement
- `property`
  - if unowned, eligible for purchase
  - if owned by another living player, pay toll
  - if self-owned, no effect for this slice
- `reward`
  - grant a fixed money reward
- `penalty`
  - subtract a fixed money amount

If a player cannot pay a required amount, bankruptcy is triggered immediately and their owned properties return to unowned state.

### Economy Rules

The first slice uses a deliberately simple economy:

- each property defines its own purchase cost and toll in config
- one start bonus amount
- one reward amount
- one penalty amount
- one asset target for alternate victory

Asset total is defined as:

`cash + sum(current value of owned properties)`

Property upgrades are out of scope for the first slice.

### AI Rules

AI is intentionally predictable. It should:

- wait for its turn
- roll automatically
- buy unowned property if cash after purchase stays above a reserve threshold
- otherwise skip

AI should never attempt advanced tactics, target selection, or bluff behavior in this slice.

### Presentation Rules

Use simple placeholder visuals that still make debugging easy:

- flat board tiles with color-coded types
- circular or capsule player tokens with distinct colors
- clear owner color marking on purchased properties
- one highlighted active tile or movement path
- short tween-based movement between tile anchors

Animation priorities:

- movement clarity over polish
- immediate feedback when money changes
- readable turn transition

### HUD Requirements

The battle HUD must show:

- active player name or label
- active player money
- active player total assets
- turn number
- roll button for human turns
- scrolling or bounded turn log

The HUD may also show a compact player roster if it improves debugging with minimal cost.

### Logging

The slice should emit readable logs for:

- phase transitions
- dice results
- movement completion
- tile resolution results
- purchase decisions
- toll payments
- bankruptcy
- win condition reached

Use one shared logger utility or event recorder so UI log output and debug output come from the same source of truth.

## Data Design

Use local typed configuration for the first slice instead of spreadsheets or remote files.

Expected config groups:

- board definition
- player starting values
- property economy values
- AI reserve threshold
- win condition values

The config format should be easy to replace later with table-driven content, but the first implementation should stay simple and code-local.

## Testing Strategy

Automated tests should focus on deterministic rules that do not require the Cocos scene runtime. At minimum, cover:

- circular movement math
- property purchase ownership changes
- toll payment calculations
- bankruptcy handling
- end-turn win checks
- AI buy threshold logic

Manual editor verification should cover:

- scene boot
- human roll flow
- AI auto-turn flow
- UI prompt flow
- result screen flow

## File and Folder Direction

The implementation should aim for the following minimal structure:

```text
assets/
  scenes/
  prefabs/
  ui/
  art/
  scripts/
    core/
    gameplay/
    ai/
    data/
    ui/
    utils/
tests/
tools/
docs/
```

Exact Cocos-generated support files may vary, but custom game code should follow this shape unless the editor generates a stronger default requirement.

## Risks and Controls

### Risk: Rule logic drifts into scene components

Control:
Keep match state and transitions in plain TypeScript modules and let components act as adapters.

### Risk: The first slice grows into a half-finished full MVP

Control:
Cards, skills, upgrades, and nonessential menus remain out of scope until the board loop is proven fun and stable.

### Risk: AI stalls the flow

Control:
AI behavior is fixed and state-machine-driven, with explicit logging around every automatic decision.

### Risk: Cocos project initialization consumes more time than expected

Control:
Prefer the smallest editor-supported project template and avoid nonessential plugins or package setup in the first pass.

## Follow-On Work

If this slice succeeds, the next implementation layers should be:

1. cards and skill hooks
2. richer board content and property depth
3. onboarding and polish
4. analytics, crash reporting, and iOS packaging hardening

## Approval Summary

This design is approved for implementation planning with the following intent:

- build a real Cocos project now
- validate the board loop before broader systems
- keep architecture ready for later expansion without prematurely building those systems
