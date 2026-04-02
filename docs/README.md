# Documentation Index

This index is the canonical entry point for durable project documentation in `docs/`.
When adding, moving, or replacing documentation, update this file in the same change.

## Product

- [Product Docs](./product/README.md): product-facing documents, including scope, goals, acceptance criteria, and the current high-fidelity gameplay-recreation direction.

## Research

- [Research Docs](./research/README.md): research and technical evaluation notes that support delivery decisions.
- [Tiantian Fuweng Map References](./research/tiantian-fuweng-map-references/README.md): public screenshots of Tiantian Fuweng maps collected for internal reference only.

## Delivery

- [Superpowers Docs](./superpowers/README.md): validated design specs and execution plans for implementation work.
- [Fortune Board High-Fidelity Tiantian Fuweng Roadmap Implementation Plan](./superpowers/plans/2026-04-01-fortune-board-high-fidelity-tianti-fuweng-roadmap.md): current mainline implementation roadmap for shifting the project toward a phased high-fidelity Tiantian-Fuweng-style gameplay target.
- [Fortune Board World Map High-Fidelity Battle Design](./superpowers/specs/2026-04-02-fortune-board-world-map-high-fidelity-battle-design.md): canonical visual-design spec for rebuilding the Battle scene toward a near-original world-map match surface.
- [Fortune Board World Map High-Fidelity Battle Implementation Plan](./superpowers/plans/2026-04-02-fortune-board-world-map-high-fidelity-battle.md): task-by-task implementation plan for replacing the current text-heavy Battle scene with a world-map-style board surface.
- [Fortune Board First Playable MVP Design](./superpowers/specs/2026-03-28-fortune-board-first-playable-mvp-design.md): approved design for the first playable Cocos board-game slice.
- [Fortune Board First Playable MVP Implementation Plan](./superpowers/plans/2026-03-28-fortune-board-first-playable-mvp.md): implemented execution record for initializing the real Cocos project and shipping the first playable board loop.
- [Fortune Board Cocos CI Verification Design](./superpowers/specs/2026-03-28-fortune-board-cocos-ci-verification-design.md): approved design for automated Cocos import/build verification in CI using a GUI-capable macOS runner.
- [Fortune Board Cocos CI Verification Implementation Plan](./superpowers/plans/2026-03-28-fortune-board-cocos-ci-verification-implementation-plan.md): task-by-task plan for wiring generic preflight checks, an authoritative build wrapper, and CI workflow coverage.
- [Fortune Board Cards And Skills Alpha Implementation Plan](./superpowers/plans/2026-03-28-fortune-board-cards-skills-alpha.md): next-iteration plan for adding deterministic cards, role skills, and AI usage on top of the first playable Battle scene.
- [Fortune Board City Park Map Rework Design](./superpowers/specs/2026-03-28-fortune-board-city-park-map-rework-design.md): approved design for reworking the Battle scene into a city-park-style competition board.
- [Fortune Board City Park Map Rework Implementation Plan](./superpowers/plans/2026-03-28-fortune-board-city-park-map-rework.md): execution plan for rebuilding the Battle scene into a city-park competition board with richer tile variety and presentation.
- [Fortune Board Bright Amusement Map Polish Implementation Plan](./superpowers/plans/2026-03-29-fortune-board-bright-amusement-map-polish.md): superseded execution plan from the earlier bright-amusement visual direction.
- [Fortune Board Battle Scene Visual Recovery Implementation Plan](./superpowers/plans/2026-04-01-fortune-board-battle-scene-visual-recovery.md): superseded recovery plan from the abandoned bright-amusement direction.
- [Fortune Board Bright Amusement Map Polish Design](./superpowers/specs/2026-03-29-fortune-board-bright-amusement-map-polish-design.md): superseded visual-direction spec from the earlier bright-amusement branch.
- [Infrastructure Checklist](./infrastructure-checklist.md): phased recommendation for the minimum client, tooling, observability, and backend infrastructure needed before and after MVP validation.

## Local Development

- Create or refresh the Cocos project baseline with `bash tools/create-cocos-project.sh`
- Install JS dependencies with `npm install`
- Run repo-local lint with `npm run lint`
- Check formatting for supported code/config files with `npm run format:check`
- Auto-fix supported code/config files with `npm run format` and `npm run lint:fix`
- Run deterministic rules tests with `npm test`
- Run repository preflight verification with `npm run verify:cocos-preflight` (lint, format check, tests, and project verification)
- Run the authoritative Cocos build smoke with `npm run verify:cocos-build` on a GUI-capable macOS machine with Cocos Creator `3.8.8`
- GitHub Actions wires both checks through `.github/workflows/cocos-verify.yml`; the authoritative build job expects a self-hosted macOS runner labeled `gui-capable` and `cocos-3_8_8`, and runs Cocos with an isolated `HOME` under the runner temp directory
- Open the project through Cocos Dashboard with:
  `'/Applications/CocosDashboard.app/Contents/MacOS/CocosDashboard' /Users/lzn/Documents/trae_projects/demo`
- If `assets/scenes/Battle.scene.meta` UUID or the playable build target changes, update the committed CI build config in the same change

## Index Rules

- Add every durable document in `docs/` to this index with a one-line description.
- Group entries by document type or topic so readers can scan the tree quickly.
- If a topic expands into multiple files, create a topic folder with its own `README.md` and link that folder here.
- Mark temporary, draft, or superseded documents clearly instead of leaving their status implicit.
