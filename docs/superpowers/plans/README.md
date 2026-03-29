# Plans Index

This index tracks implementation plans derived from approved specs.

## Documents

- [Fortune Board Bright Amusement Map Polish Implementation Plan](./2026-03-29-fortune-board-bright-amusement-map-polish.md): execution plan for the responsive bright-amusement visual pass, covering scenic asset import, structured tile rendering, and framed HUD composition.
- [Fortune Board City Park Map Rework Implementation Plan](./2026-03-28-fortune-board-city-park-map-rework.md): execution plan for rebuilding the Battle scene into a city-park competition board with richer tile variety and presentation.
- [Fortune Board Cards And Skills Alpha Implementation Plan](./2026-03-28-fortune-board-cards-skills-alpha.md): next-iteration plan for adding deterministic cards, role skills, and AI usage to the existing playable Battle scene.
- [Fortune Board Cocos CI Verification Implementation Plan](./2026-03-28-fortune-board-cocos-ci-verification-implementation-plan.md): execution plan for adding generic-runner preflight checks, an authoritative Cocos build wrapper, and macOS GUI CI coverage.
- [Fortune Board First Playable MVP Implementation Plan](./2026-03-28-fortune-board-first-playable-mvp.md): implemented execution record for initializing the real Cocos project and building the first playable board loop.

## Current Commands

- `npm run verify:cocos-preflight`: repo-level preflight command for generic CI runners.
- `npm run verify:cocos-build`: authoritative smoke command for GUI-capable macOS runners with Cocos Creator `3.8.8`.
- `.github/workflows/cocos-verify.yml`: GitHub Actions workflow that runs both commands, uploads Cocos build artifacts from the macOS GUI runner, and isolates the build job `HOME` to reduce host-profile contamination.

## Maintenance Rules

- Add every durable implementation plan in this folder with a one-line summary.
- If a plan is superseded, mark the older plan clearly and link the replacement.
