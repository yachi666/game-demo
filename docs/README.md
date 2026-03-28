# Documentation Index

This index is the canonical entry point for durable project documentation in `docs/`.
When adding, moving, or replacing documentation, update this file in the same change.

## Product

- [Product Docs](./product/README.md): product-facing documents, including scope, goals, and acceptance criteria.

## Research

- [Research Docs](./research/README.md): research and technical evaluation notes that support delivery decisions.

## Delivery

- [Superpowers Docs](./superpowers/README.md): validated design specs and execution plans for implementation work.
- [Fortune Board First Playable MVP Design](./superpowers/specs/2026-03-28-fortune-board-first-playable-mvp-design.md): approved design for the first playable Cocos board-game slice.
- [Fortune Board First Playable MVP Implementation Plan](./superpowers/plans/2026-03-28-fortune-board-first-playable-mvp.md): implemented execution record for initializing the real Cocos project and shipping the first playable board loop.
- [Fortune Board Cocos CI Verification Design](./superpowers/specs/2026-03-28-fortune-board-cocos-ci-verification-design.md): approved design for automated Cocos import/build verification in CI using a GUI-capable macOS runner.
- [Fortune Board Cocos CI Verification Implementation Plan](./superpowers/plans/2026-03-28-fortune-board-cocos-ci-verification-implementation-plan.md): task-by-task plan for wiring generic preflight checks, an authoritative build wrapper, and CI workflow coverage.

## Local Development

- Create or refresh the Cocos project baseline with `bash tools/create-cocos-project.sh`
- Install JS dependencies with `npm install`
- Run deterministic rules tests with `npm test`
- Run repository preflight verification with `npm run verify:cocos-preflight`
- Run the authoritative Cocos build smoke with `npm run verify:cocos-build` on a GUI-capable macOS machine with Cocos Creator `3.8.8`
- GitHub Actions wires both checks through `.github/workflows/cocos-verify.yml`; the authoritative build job expects a self-hosted macOS runner labeled `gui-capable` and `cocos-3_8_8`, and runs Cocos with an isolated `HOME` under the runner temp directory
- Open the project in Cocos Creator with:
  `open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app /Users/lzn/.codex/worktrees/fe99/demo`
- If `assets/scenes/Battle.scene.meta` UUID or the playable build target changes, update the committed CI build config in the same change

## Index Rules

- Add every durable document in `docs/` to this index with a one-line description.
- Group entries by document type or topic so readers can scan the tree quickly.
- If a topic expands into multiple files, create a topic folder with its own `README.md` and link that folder here.
- Mark temporary, draft, or superseded documents clearly instead of leaving their status implicit.
