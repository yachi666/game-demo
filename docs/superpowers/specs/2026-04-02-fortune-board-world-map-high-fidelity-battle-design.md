# Fortune Board World Map High-Fidelity Battle Design

## Document Info

- Project: `fortune-board`
- Document type: implementation design spec
- Status: approved for implementation planning
- Date: `2026-04-02`
- Scope: rebuild the current `Battle` scene toward a high-fidelity Tiantian-Fuweng-style world-map match surface
- Related docs: `../../product/requirements.md`, `../../research/tiantian-fuweng-map-references/README.md`, `../plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md`

## Goal

Replace the current text-heavy prototype `Battle` scene with a high-fidelity world-map match surface that gets as close as practical to the original Tiantian Fuweng world-map experience while keeping protected expressive content original.

The target feel is:

- world-map bird's-eye board composition
- center dice-plaza presentation
- four-corner player HUD framing
- bright, commercial-mobile-game information density
- map props and district blocks that read much closer to the reference than the current abstract prototype

## Why This Slice Exists

The current `Battle` scene still reads like a debug harness:

- the board is mostly labels arranged into a diamond loop
- the center of the screen still behaves like a text status block rather than a dice stage
- player seat cards do not resemble the four-corner original layout
- the screen has no authored map background, no city-block dressing, and no property-slot identity
- the previous `bright amusement park` direction is no longer the desired product target

The user has clarified a new priority: the project should aim to reproduce the original world-map match feel as closely as practical for learning and study, rather than continue drifting toward an original amusement-map look.

## Success Criteria

This design is successful when all of the following are true:

- `Battle.scene` immediately reads as a Tiantian-Fuweng-style world-map board rather than a text prototype.
- The board still uses original project assets and names, but its composition, density, and screen hierarchy feel very close to the reference.
- The central dice stage, four corner HUDs, ring track, tile cards, and map decorations all occupy recognizably similar roles to the original world map.
- The scene works in desktop landscape first, then degrades gracefully for narrower layouts without collapsing into a tiny central text cluster.
- Dynamic game-state labels remain data-driven and testable instead of being flattened into a single illustration.

## Locked Product Decisions

To keep implementation focused, the following decisions are fixed for this slice:

- The visual target is now `high-fidelity world-map recreation`, not `bright amusement park`.
- The scene should get as close as practical to the original world-map layout, color energy, and screen hierarchy.
- Protected expression still remains out of scope: no direct shipping of third-party art, names, copy, or character assets.
- The board remains one shared `Battle.scene`; this slice does not fork separate scene files for desktop and mobile.
- Dynamic state remains driven by Cocos nodes and deterministic rules code, even when the visual shell becomes much richer.

## Recreation Boundary

The project should intentionally get close on these axes:

- board topology and tile density
- four-corner HUD placement
- center-stage dice-plaza emphasis
- bright daytime palette and saturated district colors
- city-block-like decorative massing around the route
- dense yet readable mobile board-game HUD hierarchy

The project should not directly copy these protected elements:

- exact map art
- exact city, district, and tile names
- exact avatars, character faces, or role branding
- exact icon art, badge art, text copy, or decorative logos

The practical rule is: match structure and feel closely, keep shipped expression original.

## Experience Targets

The desired player-facing reactions are:

- "This looks much closer to the real world-map board."
- "The screen hierarchy matches the original kind of game."
- "The dice plaza, property ring, and corner HUDs feel like a commercial mobile board-game screen."
- "Even though the names and final art are original, the match surface clearly studies and reproduces the source experience."

## Visual Direction

### Theme

The board should read as a polished global-city competition map viewed from above:

- bright daylight lighting
- warm neutral board floor with colorful districts
- small architectural silhouettes and landmark blocks around tile clusters
- a large central plaza that hosts dice, turn messaging, and outcome emphasis

### Palette

The palette should move away from the current dark slate placeholder look and toward:

- pale warm ground or map-surface neutrals
- bright district color coding around the ring
- clean white or cream tile bases
- saturated accent blocks for district identity
- dark, high-contrast HUD text with gold or orange action emphasis

### Board Read

Each tile should feel like a real property or event slot:

- card-like or plate-like tile base
- explicit district color edge or badge
- stronger title hierarchy
- secondary price/toll or event detail in bounded typography
- ownership and special state shown as a compact overlay instead of equally weighted text rows

### Center Stage

The center must become a real dice plaza:

- visible platform or medallion framing
- strong current-player and turn emphasis
- larger roll CTA placement
- support for winner/result overlays without collapsing into raw labels

### Seat Panels

The four player panels should closely follow the original screen grammar:

- anchored to the four corners
- compact but strong framing
- immediate read of player number, status, cash, assets, and role
- active player state clearly emphasized
- eliminated or losing players visibly muted

## Asset Strategy

### Near-Term Asset Approach

The first pass may use authored original assets or high-fidelity programmatic stand-ins for:

- map floor or backdrop
- property slot bases
- center dice plaza frame
- corner player panel frames
- event and result overlay plates

The key requirement is that these assets must now aim at world-map recreation, not amusement-park novelty.

### Future Asset Target

As the project matures, the screen should migrate from runtime-drawn stand-ins toward reusable authored assets for:

- map backdrop
- district props and scenic masses
- tile frame variants
- center stage
- player panels
- result and prompt shells

### Runtime Composition

The final surface should remain layered:

1. map backdrop
2. board route and scenic dressing
3. tile slots and ownership state
4. tokens
5. corner HUD and center-stage labels
6. prompts, result overlays, and celebration effects

## Layout Architecture

### Canonical Composition

The canonical composition should mirror the reference structure closely:

- a diamond-loop board occupying most of the screen
- a large center dice plaza
- four corner player status panels
- decorative city blocks and landmarks hugging the route
- a denser screen with much less empty dead space

### Layer Stack

The scene should continue to use explicit visual layers:

1. `BackgroundLayer`
2. `BoardDecorLayer`
3. `TileLayer`
4. `TokenLayer`
5. `HudLayer`
6. `OverlayLayer`

### Desktop-First Responsive Rule

Desktop landscape is the primary target for this slice. Narrow layouts must preserve:

1. board footprint
2. center-stage readability
3. player-panel visibility

If trade-offs are required, decorative scenery should compress first. The board must never collapse back into a tiny center cluster of labels.

## Implementation Shape

This slice should be delivered in the following visual order:

1. correct the product direction and document hierarchy
2. rebuild the static board composition toward a world-map-like screen grammar
3. replace tiny text-only tile rendering with framed tile cards
4. rebuild the center dice plaza and corner HUDs
5. layer scenic props and richer visual zoning around the route
6. keep all interactive state wired to existing deterministic match logic

## Testing Strategy

Testing should cover both structure and anti-regression checks:

- scene binding tests should assert that decorative layers and frames exist
- responsive-layout tests should reject tiny collapsed board footprints
- UI tests should verify center stage, player panels, prompt frames, and result frames bind correctly
- manual browser preview checks should use the `960x640` design resolution rather than a portrait phone shell when evaluating desktop fidelity

## Superseded Direction

The `2026-03-29-fortune-board-bright-amusement-map-polish-design.md` document is now superseded as a mainline visual target. It remains only as project history for a direction that has been replaced by the current high-fidelity world-map recreation goal.
