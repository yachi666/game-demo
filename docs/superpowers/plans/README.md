# Plans Index

This index tracks implementation plans derived from approved specs.

## Documents

- [Fortune Board Cocos CI Verification Implementation Plan](./2026-03-28-fortune-board-cocos-ci-verification-implementation-plan.md): execution plan for adding generic-runner preflight checks, an authoritative Cocos build wrapper, and macOS GUI CI coverage.
- [Fortune Board First Playable MVP Implementation Plan](./2026-03-28-fortune-board-first-playable-mvp.md): task-by-task plan for initializing the real Cocos project and building the first playable board loop, now paired with a runnable repo baseline and deterministic tests.

## Current Commands

- `npm run verify:cocos-preflight`: repo-level preflight command for generic CI runners.
- `npm run verify:cocos-build`: authoritative smoke command for GUI-capable macOS runners with Cocos Creator `3.8.8`.
- `.github/workflows/cocos-verify.yml`: GitHub Actions workflow that runs both commands, uploads Cocos build artifacts from the macOS GUI runner, and isolates the build job `HOME` to reduce host-profile contamination.

## Maintenance Rules

- Add every durable implementation plan in this folder with a one-line summary.
- If a plan is superseded, mark the older plan clearly and link the replacement.
