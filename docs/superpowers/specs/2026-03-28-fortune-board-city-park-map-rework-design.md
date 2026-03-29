# Fortune Board City Park Map Rework Design

## Document Info

- Project: `fortune-board`
- Document type: implementation design spec
- Status: proposed for planning
- Date: `2026-03-28`
- Scope: modern city-park board presentation and gameplay rework for the current `Battle` scene
- Related docs: `../../product/requirements.md`, `../../research/tiantian-fuweng-map-references/README.md`, `./2026-03-28-fortune-board-first-playable-mvp-design.md`

## Goal

Rework the current playable `Battle` scene so it feels closer to a commercial mobile board-game map: a themed city-park arena with a formal ring track, stronger presentation, clearer player information, more varied tile outcomes, and better turn-to-turn spectacle.

This slice should keep the existing match-state foundation and deterministic rules philosophy, but upgrade the scene from a prototype board into a near-product-ready match surface.

## Why This Rework Now

The current implementation proves the core loop but still reads like a debug board:

- the map is too small to feel like a real match board
- the HUD is useful for debugging but not shaped like a player-facing game surface
- the center of the screen is visually empty
- tile outcomes are too repetitive to sustain the “fortune board” fantasy

The newly collected reference material shows that the intended feel depends on three things happening together:

- a strong arena layout with a center stage
- clearly themed and highly legible tile identities
- a loop with enough event variety that each lap feels different

This rework is the right next slice because it raises both visual credibility and gameplay pacing without requiring online features, monetization systems, or a full content pipeline.

## Success Criteria

The rework is successful when all of the following are true:

- `Battle.scene` presents a city-park-themed ring board with a clear center stage and a stronger sense of spectacle.
- The board expands from the current tiny loop to a medium-size track with meaningful tile variety.
- The HUD is reorganized into a four-corner competitive layout that remains readable for `1v3 AI`.
- The match loop includes at least one new non-property event category that changes turn outcomes in a visible way.
- Movement, landings, turn focus, and tile ownership feel readable without relying on debug-style labels alone.
- The rules remain deterministic and testable outside scene glue.

## Design Principles

### 1. Product Surface First

The scene should look and read like a real board-game match, not a rules sandbox. Large visual primitives and clear hierarchy matter more than dense data labels.

### 2. Preserve Deterministic Core

The match model, turn phases, and deterministic gameplay helpers stay as the source of truth. The rework upgrades presentation and board data, not the fundamental state architecture.

### 3. Theme Through Structure

The “city park” fantasy should come from layout, district grouping, landmark silhouettes, color zoning, and celebratory event language. It should not depend on final art assets being available.

### 4. More Variety, Not More Chaos

Gameplay should feel livelier through additional tile categories and short event effects, but still remain easy to read, easy to test, and easy to tune.

## Locked Product Decisions

To keep scope controlled, the following decisions are fixed in this spec:

- The visual theme is `modern city park`, inspired by theme-park and city-model board layouts rather than realistic urban simulation.
- The board remains a single-loop ring; no branching paths, shortcut choices, or multi-layer navigation are introduced in this slice.
- The match still launches directly into `Battle.scene`; no menu or lobby rework is included.
- The core win conditions remain asset target or last surviving player.
- The new event variety comes from tile resolution and short status effects, not from a full collectible-card system expansion.
- The scene is built to look correct for four players even if the current default match composition remains `1 human + AI`.

## Experience Targets

This rework should create the following player-facing feelings:

- the board looks like a compact competition arena
- the center of the screen feels active and important
- each district of the map is easy to identify at a glance
- a landing creates anticipation because not every non-property tile resolves the same way
- turn ownership is obvious even during AI turns

## Scope

### Included

- `Battle.scene` layout rework
- city-park-themed board composition
- board expansion to a medium-size loop
- new tile categorization and distribution
- four-corner player panel layout
- center-stage dice and event focus area
- stronger active-turn highlighting and movement readability
- lightweight event tile outcomes
- supporting rule, data, and UI updates
- automated tests for new deterministic gameplay helpers

### Excluded

- full menu flow
- final art pipeline or outsourcing-ready asset production
- online multiplayer
- monetization systems
- map selection between multiple boards
- complex branching event chains
- camera system overhaul or 3D board presentation

## Map Structure

### Board Topology

The board becomes a diamond-oriented ring that surrounds a central stage area. The shape should visually echo the reference layout:

- top edge, right edge, bottom edge, and left edge each contain a district run
- the four corners act as major board anchors
- the center remains open for the dice, event banner, and key turn feedback

The board should expand to `16-20` tiles. The exact count should be chosen based on layout readability in the existing scene canvas, but it must be large enough to create meaningful district grouping.

### District Framing

The loop should be organized into visually distinct district groups rather than evenly repeating generic tiles. Example district logic:

- `Civic Plaza`
- `Play Street`
- `Harbor Leisure`
- `Sky Garden`

Each district should use a coordinated palette and landmark silhouette style so players can quickly understand where they are on the map.

### Tile Visual Roles

Each tile must read as one of the following without needing text-first interpretation:

- `start`: ceremonial anchor tile
- `property`: color-zoned ownable district tile
- `reward`: positive event tile
- `penalty`: setback tile
- `chance`: higher-variance event tile
- `festival` or `landmark`: special showcase tile with a distinct visual frame

## Gameplay Rework

### Board Data Expansion

The board config must be redesigned around the new city-park layout rather than simply adding more copies of current tiles.

The tile sequence should intentionally alternate between long-term investment and short-term event beats. A typical distribution should look like:

- `1` start tile
- `8-10` property tiles
- `2-3` reward tiles
- `2` penalty tiles
- `2-3` chance or festival tiles

This sequence should avoid long dead stretches where several adjacent tiles all resolve similarly.

### New Tile Outcome Surface

The new gameplay slice should introduce lightweight event-driven variety that remains deterministic and testable.

Allowed event outcomes:

- gain fixed cash
- lose fixed cash
- move forward fixed spaces
- move backward fixed spaces
- gain one-time toll shield
- gain one-time next-property discount
- gain one-time next-toll boost for owned property income

These effects should be chosen from a small fixed pool rather than a broad random narrative system.

### Chance Tile Behavior

`chance` tiles should resolve by selecting one outcome from a deterministic event table.

The event selection model should be simple enough to test directly. Acceptable approaches include:

- cycling through a seeded index
- deriving from turn number and landing position
- using a small pseudo-random helper that can be injected or overridden in tests

The important constraint is that tests must be able to assert exact results.

### Festival Or Landmark Tile Behavior

At least one special tile type should exist beyond plain reward and penalty. Its role is to make the board feel more authored.

Recommended behavior:

- `festival` grants a stronger positive effect than a standard reward tile
- it should be visually larger or framed more prominently
- it should trigger a more noticeable announcement in the center stage area

## HUD And Information Architecture

### Four-Corner Competitive Layout

The HUD should move away from the current debug-style top panel and instead reserve the four corners for player panels.

Requirements:

- one panel slot per player
- active player state strongly highlighted
- readable cash and asset totals
- role indicator and simple status indicator support
- bankrupt or defeated players visibly muted

The layout must still support the current player count even if not all four seats are filled by humans.

### Center Stage

The middle of the board becomes a dedicated presentation zone for:

- dice result focus
- current event resolution text
- current turn owner emphasis
- major announcements such as purchases, tolls, and event triggers

This zone should visually explain “what is happening right now” even when AI is acting.

### Action Surfaces

The human player controls should remain simple, but their placement should feel integrated into the product UI:

- roll button should belong to the current-player action area rather than float as a debug control
- property buy or skip prompt should feel like a match decision card, not a raw modal
- optional action state such as skill or card hooks should still fit without forcing a future HUD rewrite

## Presentation Rules

### Movement Readability

Movement should feel more staged and readable than the current minimal hop:

- active path or destination tile should light up
- landing tile should receive a clear highlight pulse
- current-player token emphasis should remain visible while moving

Animation should favor clarity and anticipation over speed.

### Ownership Readability

Purchased property tiles should visibly change state beyond a hidden data update. Expected signals:

- owner color frame, ribbon, or badge
- district grouping remains readable after ownership tinting
- stronger visual distinction when landing on another player’s tile

### Match Spectacle

Every turn should expose at least one focal visual beat:

- dice roll
- movement
- landing result
- center-stage announcement

This is the minimum level needed to feel like a product match rather than a data replay.

## System Design

### Runtime Boundaries

The current architectural boundary remains valid and should be preserved:

- `core`: match state, turn phases, transitions
- `gameplay`: tile resolution, economy, effects, win logic
- `data`: board layout and event definitions
- `ui`: player panels, prompts, result panel, center-stage surfaces
- `presentation`: tile visuals, movement emphasis, turn highlighting

The rework may add files and split existing UI responsibilities further, but it should not move scene nodes into the role of source-of-truth gameplay state.

### Scene Composition

`Battle.scene` should evolve into distinct composition zones:

- `BoardRoot`
- `CenterStage`
- `SeatPanels`
- `PromptLayer`
- `TokenLayer`

The scene hierarchy should reflect responsibility clearly enough that future polish work does not require another full reorganization.

### Data Model Changes

The match model may need small extensions for event presentation and tile categorization, but the rework should avoid broad type churn.

Expected additions may include:

- richer tile metadata for district or display category
- deterministic event definitions for chance and festival tiles
- temporary presentation-facing event summary strings or event payload metadata

### Rules Integration

Existing helpers for economy and status effects should be reused where possible. New event tile logic should compose with the same effect system instead of inventing a second parallel buff model.

## Testing Strategy

Automated tests must cover:

- new board config invariants if helper validation is introduced
- deterministic chance-event resolution
- festival or landmark tile resolution
- movement effects triggered by event tiles
- interaction between new event effects and existing toll or property logic

Scene-level visual correctness does not need snapshot testing in this slice, but the deterministic rules behind the new map must remain unit-testable.

## Risks And Constraints

### Risk: Scope Blowout

The main danger is trying to ship final-production polish and a gameplay expansion at the same time.

Mitigation:

- keep the theme strong but use simple geometric shapes that work without final art
- keep event variety narrow and reusable
- avoid branching paths and cinematic systems

### Risk: UI Rewrite Destabilizes Battle Flow

The current `BattleController` already owns a lot of scene orchestration.

Mitigation:

- preserve rules ownership in `core/` and `gameplay/`
- split presentation responsibilities if controller growth becomes unmanageable
- make scene hierarchy clearer before layering more stateful UI

### Risk: Event Variety Makes Rules Harder To Follow

Mitigation:

- define a small fixed event set
- give each event a clear center-stage announcement
- keep every event effect deterministic and short-lived

## Recommended Implementation Direction

The implementation should proceed in this order:

1. redesign the board data and tile taxonomy
2. extend deterministic tile resolution for the new event types
3. restructure `Battle.scene` into board, center-stage, and seat-panel zones
4. rebuild the HUD and prompt surfaces around the new layout
5. add presentation polish for movement, ownership, and turn focus

This sequencing keeps rule integrity in place before heavy scene work.
