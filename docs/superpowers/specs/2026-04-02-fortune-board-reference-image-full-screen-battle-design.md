# Fortune Board Reference Image Full-Screen Battle Design

## Document Info

- Project: `fortune-board`
- Document type: implementation design spec
- Status: approved for implementation planning
- Date: `2026-04-02`
- Scope: rebuild `Battle.scene` toward a full-screen high-fidelity match surface that closely follows the user-provided reference screenshot grammar
- Reference image: `../../research/tiantian-fuweng-map-references/assets/world-map-baidu-jingyan.jpg`
- Supersedes: `./2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md`
- Related docs: `../../product/requirements.md`, `../../research/tiantian-fuweng-map-references/README.md`, `../plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md`, `./2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md`

## Goal

Rebuild the current `Battle` scene so the whole screen reads much closer to the provided Tiantian-Fuweng-style reference screenshot, not just as a generic world-map board but as a dense, commercial-mobile-game match UI with:

- a thicker, fuller board footprint
- a strong center dice stage
- a dedicated top information banner
- richer four-corner player panels
- visible edge action clusters
- denser map decoration and less dead space

The target is full-screen high fidelity to the reference image's structure and screen grammar while keeping shipped resources, names, and text original.

## Why This Slice Exists

The current world-map direction fixed the broad product target, but it still leaves a gap between:

- `high-fidelity world-map battle surface`, and
- `a screen that actually feels like the provided effect image at first glance`

The user has now clarified a stronger requirement: implementation should follow the supplied effect image directly, not just a generalized world-map interpretation.

That changes the bar for this slice:

- the board cannot be the only thing that improves
- the whole screen hierarchy must move closer to the reference
- the reference image must shape layout, density, panel grammar, and visual emphasis

## Locked Product Decisions

The following decisions are fixed for this slice:

- The target is now **full-screen high-fidelity recreation of the provided reference image's screen grammar**.
- The first pass should already cover the whole match screen, not just the board core.
- Desktop landscape remains the canonical target for fidelity evaluation.
- The implementation must preserve data-driven Cocos nodes and deterministic rules integration.
- The project may get very close on composition, density, and visual hierarchy, but must keep shipped art, icons, names, and copy original.

## Recreation Boundary

The project should intentionally get close on these axes:

- board occupancy and thickness
- top-center info banner presence and placement
- center dice-stage prominence
- four-corner player-panel grammar
- edge action cluster density
- colorful district segmentation and building-like tile dressing
- reduced empty space across the screen

The project should not directly ship these protected elements:

- exact character faces or portraits
- exact city names, district names, or copy
- exact icons, logos, badges, or menu art
- exact decorative landmark illustrations from the source image

The practical rule is: match the screen structure and feel very closely, but keep all shipped expression original.

## Target Screen Grammar

### Overall Composition

The Battle screen should read as one dense full-screen competitive board UI rather than a board floating inside a sparse shell.

The first read of the screen should be:

1. four corner player panels
2. top-center info banner
3. center dice stage
4. thick ring board
5. edge action buttons and map dressing

The screen should no longer read as `center labels + supporting decorations`.

### Board Ring

The route should move closer to the reference image's visual behavior:

- thicker and fuller around the center
- more card-like tile surfaces
- stronger district color segmentation
- visible building or stack anchors on property/event slots
- less empty negative space inside and outside the ring

Each tile should feel like a compact mobile-game board slot, not a text box.

### Top Information Banner

A dedicated top-center floating banner is now required.

This banner should:

- sit above the center dice stage
- carry round, income, or event emphasis
- read as a separate high-priority plate
- visually connect the upper-left and upper-right player panels

### Center Dice Stage

The center must become a stronger composed stage, not just a status card.

It should include:

- a stage base or medallion (`DiceStageBase`)
- dice-plaza glow and frame
- a stable anchor for dice visuals (`DicePairAnchor`)
- strong roll CTA framing
- current-turn or round messaging

The center should feel closer to the screenshot's `platform + dice + title/income panel` grammar.

### Corner Player Panels

Each corner panel should follow a more reference-like HUD grammar:

- avatar or avatar-plate zone
- strong colored frame/accent
- readable cash / asset / status separation
- compact property ownership stack or mini pile
- clearer active-player emphasis
- loser / eliminated muting that preserves readability

The panels should stop feeling like minimal debug cards and start feeling like product HUD blocks.

### Edge Action Clusters

The screen must add visible edge control density.

A first-pass implementation should include:

- a right-side action cluster
- at least one bottom-corner action cluster
- original placeholder icons / buttons that structurally match the screenshot's edge-control density

The goal is not to ship identical buttons, but to make the screen stop feeling empty around the ring.

### Scenic Massing

Map dressing should be denser and more structured:

- larger city-block or district masses around the route
- stronger corner landmarks or prop clusters
- fewer isolated tiny decorative elements
- more obvious world-map floor / urban-block feeling

## Layer And Stable Node Architecture

The scene should keep the current explicit layer stack:

1. `BackgroundLayer`
2. `BoardDecorLayer`
3. `TileLayer`
4. `TokenLayer`
5. `HudLayer`
6. `OverlayLayer`

But the stable node contract must be expanded toward a full-screen reference-image grammar.

### BackgroundLayer

`BackgroundLayer` should serialize stable backdrop and atmosphere nodes, including:

- `MapBackdrop`
- `OceanGlow`
- additional edge or scenic mass nodes needed so the screen no longer opens onto large empty areas

The exact art may remain original stand-ins, but the layer must carry real full-screen visual mass.

### BoardDecorLayer

`BoardDecorLayer` should serialize the route-adjacent visual body of the screen, including:

- `WorldMapScenicMass`
- `RouteRing`
- `CenterStageFrame`
- `CornerLandmark0`
- `CornerLandmark1`
- `CornerLandmark2`
- `CornerLandmark3`
- any additional top-banner base or surrounding world-map decorative mass needed to support the reference-image composition

### TileLayer

Every tile must serialize a richer stable skeleton:

- `TileFrame`
- `TileAccentBand`
- `TileBadgePlate`
- `BuildingStackAnchor`
- `TitleLabel`
- `SupportingLabel`
- `BadgeLabel`

`BuildingStackAnchor` is required so ownership or upgrade stacks can read as actual board-state mass instead of text-only status.

### TokenLayer

`TokenLayer` remains the match-piece layer, but tokens should support:

- stronger highlight / plate treatment beneath or around tokens
- better visual coexistence with denser tile art

### HudLayer

`HudLayer` must expand into a full-screen gameplay HUD shell.

Stable children should include:

- `TopInfoBanner`
- `SeatPanels`
- `CenterStage`
- `EdgeActions`
- `ActionArea`

#### TopInfoBanner

`TopInfoBanner` should hold:

- a stable banner frame
- primary summary label(s) for round / income / event emphasis

#### CenterStage

`CenterStage` should hold:

- `DiceStageBase`
- `DicePlazaGlow`
- `DicePlazaFrame`
- `DicePairAnchor`
- `RoundInfoLabel`
- `RollButtonFrame`
- `RollButton`

#### SeatPanels

Each player panel should serialize a stronger fixed skeleton:

- `AvatarPlate`
- `PanelFrame`
- `PanelAccent`
- `PropertyStack`
- `CashLabel`
- `AssetLabel`
- `StatusBadge`
- any additional current-player marker needed for clear emphasis

#### EdgeActions

`EdgeActions` should serialize stable edge-control groups such as:

- `RightActionStack`
- `BottomLeftActionStack`
- `BottomRightActionStack`

The action buttons may use original placeholder assets or drawn shells, but they must exist structurally in the scene.

### OverlayLayer

`OverlayLayer` should keep:

- `PropertyPrompt`
- `ResultPanel`
- `RoleSelection`

These overlays should visually match the richer screen but remain logically separate from the full-screen battle shell.

## Runtime And Data Boundary

### Scene vs Runtime Responsibility

`assets/scenes/Battle.scene` must serialize the stable whole-screen skeleton.

`assets/scripts/ui/BattleController.ts` may still create or redraw detail nodes at runtime, but it should not be solely responsible for conjuring the entire high-fidelity screen from nothing.

The rule is:

- **stable screen grammar belongs in the scene**
- **dynamic state, visibility, colors, and emphasis belong in controller/presentation code**

### Presentation Source Of Truth

`assets/scripts/ui/battle-presentation.ts` should be expanded so the richer shell stays data-driven.

It should be the source for display-facing state such as:

- tile accent color
- tile badge meaning
- property stack / ownership emphasis
- player panel highlight state
- top-banner tone and message
- muted / active / danger state styling

Any node that visually communicates live match state should derive from shared presentation data, not duplicated one-off controller logic.

### Tile Decor Binding Rule

`TileAccentBand`, `TileBadgePlate`, and any building-stack visuals must derive from the same tile presentation source that drives tile labels.

The implementation must not split tile color meaning across:

- one hard-coded path for decorative plates, and
- another path for label color or state text

## Responsive Rules

Desktop landscape remains the canonical composition target.

The screen must be judged first in `设计分辨率 (960X640)` or desktop/fullscreen preview.

Responsive adaptation rules are:

1. preserve board footprint
2. preserve top-banner readability
3. preserve center-stage prominence
4. preserve four-corner player-panel visibility
5. compress decorative scenery before compressing the core screen grammar

The board must never regress into a tiny center cluster because full-screen fidelity is the whole point of this slice.

## Asset Strategy

The implementation may use a mix of:

- original authored stand-in textures
- runtime-drawn plates and frames
- stylized placeholder icons
- serialized scene nodes for map dressing mass

The asset bar for this slice is:

- closer in structure and vibe to the reference image
- original in shipped expression
- good enough to sell the whole-screen grammar, even before final polished art arrives

## File Surface

This design is expected to affect at least:

- `assets/scenes/Battle.scene`
- `assets/scripts/ui/BattleController.ts`
- `assets/scripts/ui/HudController.ts`
- `assets/scripts/ui/battle-art.ts`
- `assets/scripts/ui/battle-presentation.ts`
- `assets/scripts/ui/battle-responsive-layout.ts`
- `tests/ui/battle-art.test.ts`
- `tests/ui/battle-responsive-layout.test.ts`
- `tests/ui/battle-hud-flow.test.ts`
- `tests/ui/battle-presentation.test.ts`
- `docs/README.md`
- `docs/superpowers/README.md`
- `docs/superpowers/specs/README.md`

## Testing And Verification

### Automated Verification

Automated checks should prove the following:

- `tests/ui/battle-art.test.ts` locks the expanded full-screen stable skeleton, including `TopInfoBanner`, `EdgeActions`, `AvatarPlate`, `PropertyStack`, `DiceStageBase`, and `BuildingStackAnchor`
- `tests/ui/battle-responsive-layout.test.ts` rejects regressions where the board, top banner, edge actions, or corner panels collapse back toward the center
- `tests/ui/battle-hud-flow.test.ts` verifies runtime binding for richer HUD state, player emphasis, and top-banner messaging
- `tests/ui/battle-presentation.test.ts` verifies tile and panel visuals remain driven by shared presentation data

### Manual Verification

Manual preview checks must be performed in:

- `设计分辨率 (960X640)`, or
- desktop/fullscreen preview

And should explicitly use:

- `Show FPS` disabled
- screenshot evaluation against the supplied reference-image structure

The manual check is successful when the first read of the screen is the whole competitive match surface, not a center-cluster prototype.

## Non-Goals

This slice does not require:

- exact copying of the source image's portraits, icons, or text
- final production-quality art for every edge button or prop
- rewriting deterministic gameplay rules
- separate desktop and mobile scene files

## Supersession Note

This document replaces `2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md` as the canonical visual target for Battle-scene reconstruction.

That earlier spec established the world-map direction. This document narrows the target further by requiring the whole-screen grammar to follow the user-provided reference image much more closely.