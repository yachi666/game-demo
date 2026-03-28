# Fortune Board Cocos CI Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Document Info

- Project: `fortune-board`
- Document type: implementation plan
- Status: implemented
- Date: `2026-03-28`
- Depends on: `../specs/2026-03-28-fortune-board-cocos-ci-verification-design.md`
- Related docs: `./2026-03-28-fortune-board-first-playable-mvp.md`

## Goal

Implement the approved CI verification surface so the repository can automatically prove:

- the project baseline is still internally consistent
- the committed Cocos build config still targets `Battle.scene`
- Cocos Creator `3.8.8` can still import and build the playable slice on a GUI-capable macOS runner

## Locked Decisions

- Keep preflight runnable on a generic Node-capable CI runner.
- Keep the authoritative build on a GUI-capable macOS runner with Cocos Creator `3.8.8`.
- Treat `assets/scenes/Battle.scene` and UUID `6d8fa4db-c84c-4c65-9490-29da8a5d74cd` as the current playable-scene contract.
- Keep the committed exported build config immutable in git; generate a per-run effective config for output-path isolation.

## File Surface

- Create: `tools/ci/cocos-build-web-desktop.json`
- Create: `tools/ci/verify-cocos-project.mjs`
- Create: `tools/ci/run-cocos-build.sh`
- Create: `.github/workflows/cocos-verify.yml`
- Modify: `package.json`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

## Task 1: Commit The Canonical Build Config

**Files:**
- Create: `tools/ci/cocos-build-web-desktop.json`

- [x] **Step 1: Export the `web-desktop` build task from the Cocos Build Panel**

Requirements:

- use the full task export that preserves project-setting-dependent fields
- keep `platform` as `web-desktop`
- ensure `startScene` is `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`
- ensure `scenes` contains `assets/scenes/Battle.scene` with UUID `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`

- [x] **Step 2: Commit the exported JSON without runner-specific output paths**

Requirements:

- the committed file is the canonical build contract in git
- its output-path-related fields may be stable defaults, but CI must not mutate this file in place
- any future playable-scene UUID change must update this file in the same change

## Task 2: Add Generic-Runner Preflight Verification

**Files:**
- Create: `tools/ci/verify-cocos-project.mjs`
- Modify: `package.json`

- [x] **Step 1: Implement baseline and scene checks**

The script must:

- run under plain Node.js without requiring a local Creator install
- parse `assets/scenes/Battle.scene`
- verify required `.meta` files exist for scene-bound scripts
- verify required baseline files exist, including `tmp/tsconfig.cocos.json`
- verify `assets/scenes/Battle.scene.meta` still carries UUID `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`
- verify the committed build config still targets the canonical playable scene

- [x] **Step 2: Implement repo-local UUID compression verification**

Requirements:

- keep the UUID compression helper repo-local and deterministic so preflight can run on generic CI
- pin it to current Creator `3.8.8` behavior using at least two committed normative test vectors
- include the current repo example:
  - `8d77e944-c80d-434d-a4f6-18ca01c62a70` -> `8d77elEyA1DTaT2GMoBxipw`
- include the official pinned Creator example:
  - `fc991dd7-0033-4b80-9d41-c8a86a702e59` -> `fc9913XADNLgJ1ByKhqcC5Z`
- fail if serialized component ids in `Battle.scene` do not match the expected compressed UUIDs

- [x] **Step 3: Expose the command surface**

Update `package.json` scripts so CI can run:

- `npm run verify:cocos-preflight`

That command should run deterministic tests first, then the preflight verifier.

## Task 3: Add The Authoritative Cocos Build Wrapper

**Files:**
- Create: `tools/ci/run-cocos-build.sh`
- Modify: `package.json`

- [x] **Step 1: Generate a per-run effective build config**

The wrapper must:

- copy `tools/ci/cocos-build-web-desktop.json` into the artifact directory as `config.source.json`
- duplicate `config.source.json` as `config.effective.json`
- rewrite only the output-path-related fields needed in `config.effective.json` for that run, starting with `buildPath`
- preserve the committed config file untouched

- [x] **Step 2: Capture durable evidence for both success and failure**

The wrapper must:

- create a per-run artifact directory such as `artifacts/cocos-build/<run-id>/`
- capture combined stdout/stderr into `command.log`
- request `logDest` and preserve it when created
- copy editor temp logs when present
- emit `command.txt`, `config.source.json`, `config.effective.json`, and `output-tree.txt`

- [x] **Step 3: Enforce the pass/fail contract**

The wrapper must:

- fail on missing editor binary or missing committed config
- fail when the effective config no longer targets `Battle.scene`
- treat `36` as the pinned success code for Creator `3.8.8`
- treat `32`, `34`, and any other non-`36` code as failure
- after a nominal `36`, scan every preserved log that exists for the run after lowercasing for fixed-string hard-failure markers:
  - `missing script`
  - `deserialization error`
  - `import failed`
  - `build failed`

- [x] **Step 4: Expose the command surface**

Update `package.json` scripts so CI can run:

- `npm run verify:cocos-build`

## Task 4: Wire CI Jobs

**Files:**
- Create: `.github/workflows/cocos-verify.yml`

- [x] **Step 1: Add the generic preflight job**

Requirements:

- run on every push and pull request update
- install npm dependencies
- run `npm run verify:cocos-preflight`

- [x] **Step 2: Add the authoritative Cocos build job**

Requirements:

- run on the GUI-capable macOS runner
- require the pinned Creator `3.8.8` app path
- serialize access so no concurrent Creator job shares the same logged-in session
- run `npm run verify:cocos-build`
- upload artifacts on both success and failure

## Task 5: Document The New Verification Surface

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/superpowers/README.md`
- Modify: `docs/superpowers/plans/README.md`

- [x] **Step 1: Document the commands and runner expectations**

Add or update docs so contributors can quickly find:

- `npm run verify:cocos-preflight`
- `npm run verify:cocos-build`
- the requirement for a GUI-capable macOS runner with Cocos Creator `3.8.8`
- the rule that scene-UUID or build-config-target changes must be updated in the same change

## Verification Checklist

- [x] `npm run verify:cocos-preflight` passes on a generic Node-capable machine
- [x] `npm run verify:cocos-build` passes on the macOS GUI runner
- [x] artifacts are preserved on success and failure
- [x] the committed build config and `Battle.scene.meta` still agree on the canonical scene UUID
