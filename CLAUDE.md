# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project snapshot

- `fortune-board` is a `Cocos Creator 3.8.8 + TypeScript` iOS-first board-game project.
- The main playable scene is `assets/scenes/Battle.scene`.
- `docs/README.md` is the canonical index for durable documentation. When adding or moving docs, update the relevant index in the same change.
- `AGENTS.md` expects deliberate use of the superpowers skills. Use process skills first when they apply.
- The command surface in `AGENTS.md`, `package.json`, `docs/README.md`, and `.github/workflows/cocos-verify.yml` should stay aligned; update them together when the workflow changes.

## Common commands

- Install dependencies: `npm install`
- Run repo-local lint: `npm run lint`
- Apply safe lint fixes: `npm run lint:fix`
- Check formatting for supported code/config files: `npm run format:check`
- Rewrite supported code/config files: `npm run format`
- Run all tests: `npm test`
- Watch tests: `npm run test:watch`
- Run a single test file: `npm test -- tests/core/turn-flow.test.ts`
- Run repo preflight verification: `npm run verify:cocos-preflight`
  - Runs lint, format checks, tests, and repository verification
- Run the authoritative Cocos build smoke: `npm run verify:cocos-build`
  - Requires macOS with GUI access and Cocos Creator `3.8.8` at `/Applications/Cocos/Creator/3.8.8/CocosCreator.app`
- Refresh the local Cocos project baseline from the pinned template: `bash tools/create-cocos-project.sh`
- Open the project in Cocos Creator from the repo root: `open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app "$PWD"`
- Biome currently covers TypeScript, `.mjs`, JSON, and JSONC files; Markdown, YAML, shell scripts, and Cocos-managed asset metadata remain manual.

## Code architecture

- `assets/scripts/core/` is the rules backbone: shared types, phase/state transitions, match creation, and turn-flow orchestration. `MatchState` is the source of truth and should stay plain TypeScript data.
- `assets/scripts/gameplay/` applies deterministic rules such as movement, tile resolution, economy, cards, skills, status effects, and win checks.
- `assets/scripts/ai/` contains simple deterministic decision helpers for AI turns.
- `assets/scripts/data/` holds typed configuration for the board, starter deck, roles, and match defaults. Content and balance changes usually start here.
- `assets/scripts/ui/` contains Cocos scene adapters/controllers. `assets/scripts/ui/BattleController.ts` is the main runtime orchestrator for the `Battle` scene: it creates the match, binds scene nodes, runs role selection and pre-roll flows, triggers movement/tile resolution, advances AI turns, and re-renders HUD/panels.
- Keep deterministic rules callable without scene nodes. The test suite runs in Node via Vitest and mirrors the runtime layers under `tests/core`, `tests/gameplay`, and `tests/ai`.
- `tests/ci/` covers project/build verification scripts rather than scene runtime behavior.
- `tools/ci/run-cocos-build.sh` is the authoritative Cocos build wrapper used by CI. It validates the committed build config, launches the pinned Cocos binary, and preserves logs/artifacts under `artifacts/cocos-build/`.

## Key docs

- `docs/product/requirements.md` is the current product requirements document (Chinese).
- `docs/research/cocos-creator.md` explains the engine/platform choice and the intended layered architecture.
- `docs/superpowers/specs/2026-03-28-fortune-board-first-playable-mvp-design.md` captures the base runtime boundaries for the first playable slice.
- `docs/superpowers/plans/2026-03-28-fortune-board-cards-skills-alpha.md` is closer to the current cards/skills implementation than the original MVP spec.
- If `Battle.scene` UUID or the playable build target changes, update the committed Cocos build config used by CI in the same change.
