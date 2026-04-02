# Superpowers Docs

This folder contains validated delivery documents that turn approved product direction into implementation-ready specs and plans.

## Specs

- [Specs Index](./specs/README.md): approved design documents for concrete implementation slices.
- [Fortune Board City Park Map Rework Design](./specs/2026-03-28-fortune-board-city-park-map-rework-design.md): proposed design for upgrading the Battle scene into a more product-like city-park competition board.
- [Fortune Board Reference Image Full-Screen Battle Design](./specs/2026-04-02-fortune-board-reference-image-full-screen-battle-design.md): canonical visual-design spec for rebuilding Battle toward the user-provided full-screen reference image with denser HUD, board, and edge-action structure.
- [Fortune Board World Map High-Fidelity Battle Design](./specs/2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md): superseded predecessor spec that established the broader world-map direction before the tighter reference-image target.
- [Fortune Board Bright Amusement Map Polish Design](./specs/2026-03-29-fortune-board-bright-amusement-map-polish-design.md): superseded visual-direction spec from the earlier bright-amusement branch of the project.

## Plans

- [Plans Index](./plans/README.md): implementation plans created after a spec is approved and reviewed.
- [Fortune Board High-Fidelity Tiantian Fuweng Roadmap Implementation Plan](./plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md): current roadmap for shifting delivery priority toward high-fidelity gameplay recreation, then feel, presentation, and product-shell phases.
- [Fortune Board Reference Image Full-Screen Battle Implementation Plan](./plans/2026-04-02-fortune-board-reference-image-full-screen-battle.md): current execution plan for rebuilding Battle toward the user-provided reference image with a denser full-screen shell, richer corner HUDs, and stronger edge-action structure.
- [Fortune Board World Map High-Fidelity Battle Implementation Plan](./plans/2026-04-02-fortune-board-world-map-high-fidelity-battle.md): older execution plan for the superseded world-map target; retained as project history after the newer reference-image full-screen direction.
- [Fortune Board City Park Map Rework Implementation Plan](./plans/2026-03-28-fortune-board-city-park-map-rework.md): execution plan for the next Battle-scene presentation and pacing upgrade.
- [Fortune Board Bright Amusement Map Polish Implementation Plan](./plans/2026-03-29-fortune-board-bright-amusement-map-polish.md): superseded original greenfield plan from the abandoned bright-amusement direction.
- [Fortune Board Battle Scene Visual Recovery Implementation Plan](./plans/2026-04-01-fortune-board-battle-scene-visual-recovery.md): superseded recovery plan from the abandoned bright-amusement direction.

## Current Delivery Surface

- The first playable Fortune Board MVP is implemented in this repository as a runnable Cocos Creator 3.8.8 project baseline with deterministic rules, simple AI, a battle scene, and Vitest-driven gameplay coverage.
- The Cocos CI verification design is now implemented as a repo-local preflight verifier, an authoritative Cocos build wrapper, and a GitHub Actions workflow for macOS GUI build validation.
- The current mainline delivery direction is high-fidelity recreation of the Tiantian Fuweng play experience, with the world-map Battle scene now treated as a first-class product surface rather than a later optional polish pass.

## Current CI Verification Contract

- `npm run verify:cocos-preflight` is the repo-level preflight entrypoint for generic CI runners.
- `npm run verify:cocos-build` is the authoritative Cocos smoke entrypoint and requires a GUI-capable macOS machine with Cocos Creator `3.8.8`.
- `.github/workflows/cocos-verify.yml` runs both checks; the authoritative build job targets a self-hosted macOS runner labeled `gui-capable` and `cocos-3_8_8`, and gives Cocos an isolated `HOME` to avoid profile-state bleed from the host session.
- Changes to `assets/scenes/Battle.scene.meta` UUID or the committed playable build target must update the CI config in the same change.

## Maintenance Rules

- Keep specs focused on one implementation slice or milestone.
- Keep plans separate from specs so design intent and execution steps do not get mixed.
- When adding a spec or a plan, update the relevant local index in the same change.
