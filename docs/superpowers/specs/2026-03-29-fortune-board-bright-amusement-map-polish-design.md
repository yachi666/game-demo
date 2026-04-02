# Fortune Board Bright Amusement Map Polish Design

## Document Info

- Project: `fortune-board`
- Document type: implementation design spec
- Status: superseded
- Date: `2026-03-29`
- Scope: visual and layout rework of the current `Battle` scene into a bright amusement-park-style product surface with responsive support
- Related docs: `../../product/requirements.md`, `../../research/tiantian-fuweng-map-references/README.md`, `./2026-03-28-fortune-board-city-park-map-rework-design.md`, `./2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md`

## Status Note

This document is kept only as project history for an abandoned visual direction.

The current mainline visual target is `2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md`, which replaces the bright-amusement approach with a near-original world-map recreation goal.

## Goal

Upgrade the current `Battle` scene from a text-heavy prototype into a visually authored board-game match surface that feels closer to a commercial mobile title while staying original, testable, and maintainable in Cocos Creator.

The target look is:

- bright amusement-park mood
- candy-color district palette
- light, playful energy
- strong center-stage presentation
- responsive layouts that hold together on desktop and mobile aspect ratios

## Why This Slice Exists

The current board logic is playable, but the scene presentation still reads like a debug harness:

- the board is mostly colored text over an empty dark background
- the four-corner seat layout exists logically but not as a polished HUD surface
- the board path has no real tile framing, map background, or center-stage art
- the screen does not communicate a cohesive visual identity
- there is no responsive art-direction strategy for smaller screens or alternate aspect ratios

The project already has enough rules and tile variety to justify a product-surface pass. This slice turns the existing scene into something that can be meaningfully evaluated for feel, readability, and thematic direction.

## Success Criteria

This design is successful when all of the following are true:

- `Battle.scene` presents a fully composed amusement-map board rather than a text-only debug layout.
- The board retains the diamond-ring topology but reads as a stylized authored map with a clear center stage.
- The screen feels original and product-ready without directly copying any third-party reference art.
- The scene is readable on desktop landscape, narrow landscape, and mobile portrait-like canvases through responsive layout rules.
- Player panels, center announcements, and tile states remain legible without relying on oversized raw text.
- Static art and dynamic UI responsibilities are clearly separated so future iteration does not require rewriting rules code.

## Locked Product Decisions

To keep implementation focused, the following decisions are fixed for this slice:

- The visual direction is `bright amusement park`, not night-city neon.
- The board remains a single-loop diamond ring with four corner seat panels and a center stage.
- Third-party reference images remain internal inspiration only and are not shipped as game art.
- Static scenic assets may be generated with Stitch, but runtime state remains driven by Cocos nodes and game state.
- Responsive support is in scope for the same slice and must not be deferred to a later pass.
- This slice does not expand gameplay rules, online systems, or menu flow.

## Design Principles

### 1. Product Surface Over Prototype Scaffolding

The scene should feel like a real match screen first. Raw labels may still exist internally, but they should no longer define the player-facing look.

### 2. Original Structure, Not Reference Copying

The project may borrow broad structure from commercial board-game references, such as a ring board, center stage, and corner panels, but must keep its own color story, landform shapes, district identities, and panel styling.

### 3. Static Art Owns Atmosphere, Dynamic Nodes Own State

Backgrounds, frames, scenic dressing, and decorative tile beds should come from reusable art assets. Active ownership, values, prompts, token movement, and announcements should remain node-driven and data-driven in Cocos.

### 4. Responsive By Composition, Not By Separate Scenes

The layout should adapt through anchors, safe bounds, proportional scaling, and priority rules. This slice should not fork into separate desktop and mobile scenes.

### 5. Brightness Without Chaos

The palette can be playful and saturated, but it must stay readable. The board should feel cheerful, not noisy.

## Experience Targets

The desired player-facing feelings are:

- “This looks like a real board-game arena, not a debug sandbox.”
- “The center of the screen tells me what is happening right now.”
- “Each district feels like part of the same park, but still has its own personality.”
- “The UI is lively and colorful without becoming cluttered.”
- “Even on a smaller screen, I can still tell where I am, whose turn it is, and what action matters.”

## Visual Direction

### Theme

The board should read as a compact fantasy amusement district:

- bright daytime lighting
- soft shadows and high-key backgrounds
- candy-color zoning by district
- playful architectural silhouettes, such as fountains, arcades, promenade markers, balloons, canopies, or park signage

### Palette

The palette should bias toward:

- warm creams and pale sky tones for the global background
- saturated but softened district accents
- readable navy or deep charcoal for primary HUD text
- high-contrast action accents for the current turn and CTA elements

Avoid a black fullscreen base except in tiny framed UI regions where contrast is needed.

### Tile Read

Each tile should visually include:

- a clear tile base or badge
- a district accent color
- title and status text in a bounded container
- ownership or event identity that does not rely on three equally weighted text lines

Property tiles, event tiles, and special tiles should look related but not identical.

### Center Stage

The center stage is the emotional focus of the scene. It should visually host:

- current player emphasis
- turn number
- latest event or major announcement
- the roll action surface

It should feel like a staged plaza or ride-platform area rather than an empty text box.

### Seat Panels

Each player seat should appear as a compact framed card:

- corner-anchored
- readable at a distance
- active seat highlighted
- bankrupt seats muted without becoming invisible

Panels should use hierarchy, not sheer font size, to communicate importance.

## Asset Strategy

### Asset Sources

This slice may use Stitch to generate original project art for:

- global board background
- center-stage base art
- reusable tile-bed or tile-card textures
- seat panel frames
- optional action-card or prompt backplates

### Asset Boundaries

Generated assets should be treated as scenic and structural layers, not as flattened screenshots with hard-coded game state. Assets must remain reusable across turns and across multiple resolutions.

### Runtime Composition

The final screen should be assembled from layered assets plus dynamic UI:

- background map art
- district and board framing
- tile containers
- player tokens
- seat panel text and indicators
- center-stage state labels and roll CTA

This keeps the scene maintainable and allows future gameplay additions without regenerating a full-page illustration.

## Layout Architecture

### Layer Stack

The scene should be organized into explicit visual layers:

1. `BackgroundLayer`
   scenic backdrop and large map atmosphere
2. `BoardDecorLayer`
   center stage, route accents, district scenic dressing
3. `TileLayer`
   tile containers, tile text, ownership markers
4. `TokenLayer`
   player pieces and movement emphasis
5. `HudLayer`
   seat panels, center-stage labels, buttons, prompts
6. `OverlayLayer`
   result panel, modal prompts, role selection, future celebration effects

### Board Topology

The board keeps the current diamond-ring logic, but visual treatment should make it feel intentionally authored:

- tiles should sit in framed slots rather than floating text positions
- the center stage should occupy stable visual real estate even when the screen narrows
- the track should feel like it belongs to a park route rather than a geometric debugging shape

### Responsive Rules

The same scene must support at least three practical layout states:

- `desktop landscape`: full composition with large center stage and full-size corner seat cards
- `narrow landscape`: preserved board footprint with compressed corner panels and tighter center copy
- `mobile portrait or portrait-leaning`: board remains dominant, seat cards shrink and hug edges, center messaging condenses, supporting UI reflows downward or inward

The board itself should scale uniformly as much as possible. Decorative art may crop; gameplay-critical surfaces may not.

### Safe-Priority Order

When space gets tight, preserve this order:

1. board readability
2. center-stage action readability
3. active-player and turn clarity
4. player economy summaries
5. secondary logs or decorative framing

## Technical Design

### Scene Composition

`Battle.scene` should stop depending on text-only placeholder nodes as the primary appearance. Instead, it should expose named roots for visual layers and reusable child anchors. The controller should hydrate content into those structures without rebuilding the whole scene ad hoc every frame.

### Presentation Boundaries

The code should separate these concerns:

- layout math for board positions and responsive anchors
- scenic asset binding and visual-node setup
- match-state-to-copy mapping
- tile-state rendering
- seat-panel rendering

This should reduce the current coupling where the controller both creates hierarchy and pushes literal text into bare labels.

### Asset Loading

Generated art should be referenced through normal Cocos asset workflows and attached to sprite-bearing nodes. If generated art is not ready yet, the code should still support placeholder textures or color blocks without changing the runtime architecture.

### Dynamic Tile Rendering

Tile rendering should evolve from:

- `title`
- `subtitle`
- `ownerLabel`

into a structured tile card presentation with bounded title, smaller supporting line, and ownership/event badge treatment. The presentation helper may still produce text fields, but the final node structure should support differentiated placement and styling.

### Dynamic HUD Rendering

Seat panels should render into a framed card structure with:

- title or player label
- cash
- assets
- role
- active or muted visual state

The center-stage HUD should render concise match-state messaging with tighter copy rules on smaller screens.

## Stitch Usage Guidance

Stitch should be used to generate reusable visual assets, not to define layout logic. The most valuable candidates are:

- bright amusement board background
- center plaza / dice stage frame
- playful district sign or tile-bed treatments
- corner player-card frames

Generated art should avoid embedded textual state so runtime localization and gameplay state remain under code control.

## Out Of Scope

The following are intentionally excluded from this slice:

- new gameplay systems
- branching movement paths
- full character portraits or avatar pipeline
- particle-heavy celebration polish beyond simple layout-ready placeholders
- separate mobile-only scene implementations
- direct reuse of third-party screenshots as shipping assets

## Verification Strategy

This slice should be considered done only if it passes both visual and structural checks:

- targeted tests cover responsive layout math and presentation helpers
- the scene still runs with deterministic match logic intact
- desktop and mobile-like previews both keep the board and HUD readable
- generated art integrates without breaking runtime labels, prompts, or token placement

## Risks And Mitigations

### Risk: Beautiful Background, Weak Runtime Integration

Mitigation: keep assets scenic and structural; keep stateful copy and ownership markers runtime-driven.

### Risk: Desktop Layout Looks Good, Mobile Becomes Cluttered

Mitigation: define layout priority and compression rules upfront; test narrow and portrait-ish sizes as first-class cases.

### Risk: Stitch Output Feels Generic

Mitigation: generate only bounded assets with strong visual prompts and compose them inside Cocos rather than relying on a single full-scene image.

### Risk: Overbuilding A One-Off Art Stack

Mitigation: prefer reusable layer roots, tile beds, and panel frames that can support future board variants.

## Intended Follow-Up

The next document after this spec should be an implementation plan that:

- identifies the exact scene and script files to change
- sequences Stitch asset generation and import work
- introduces layout tests before runtime changes
- defines verification steps for desktop and mobile-like canvases
