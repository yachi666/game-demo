# Superpowers Docs

This folder contains validated delivery documents that turn approved product direction into implementation-ready specs and plans.

## Specs

- [Specs Index](./specs/README.md): approved design documents for concrete implementation slices.

## Plans

- [Plans Index](./plans/README.md): implementation plans created after a spec is approved and reviewed.

## Current Delivery Surface

- The first playable Fortune Board MVP is implemented in this repository as a runnable Cocos Creator 3.8.8 project baseline with deterministic rules, simple AI, a battle scene, and Vitest-driven gameplay coverage.
- The Cocos CI verification design is now implemented as a repo-local preflight verifier, an authoritative Cocos build wrapper, and a GitHub Actions workflow for macOS GUI build validation.
- The next planned gameplay iteration is a cards-and-skills alpha slice that adds role differentiation and comeback tools without leaving the current single-scene Battle loop.

## Current CI Verification Contract

- `npm run verify:cocos-preflight` is the repo-level preflight entrypoint for generic CI runners.
- `npm run verify:cocos-build` is the authoritative Cocos smoke entrypoint and requires a GUI-capable macOS machine with Cocos Creator `3.8.8`.
- `.github/workflows/cocos-verify.yml` runs both checks; the authoritative build job targets a self-hosted macOS runner labeled `gui-capable` and `cocos-3_8_8`, and gives Cocos an isolated `HOME` to avoid profile-state bleed from the host session.
- Changes to `assets/scenes/Battle.scene.meta` UUID or the committed playable build target must update the CI config in the same change.

## Maintenance Rules

- Keep specs focused on one implementation slice or milestone.
- Keep plans separate from specs so design intent and execution steps do not get mixed.
- When adding a spec or a plan, update the relevant local index in the same change.
