# Fortune Board Cocos CI Verification Design

## Document Info

- Project: `fortune-board`
- Document type: implementation design spec
- Status: approved for planning
- Date: `2026-03-28`
- Scope: automated Cocos Creator import, build, and startup-adjacent verification for CI
- Related docs: `./2026-03-28-fortune-board-first-playable-mvp-design.md`, `../plans/2026-03-28-fortune-board-first-playable-mvp.md`, `../../research/cocos-creator.md`
- External references:
  - `https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-in-command-line.html`
  - `https://docs.cocos.com/creator/3.8/manual/en/editor/publish/build-panel.html`
  - `https://docs.cocos.com/creator/3.8/manual/en/editor/publish/build-guide.html`

## Goal

Provide a CI verification surface that can automatically detect whether the repository still imports into Cocos Creator, whether the project can be built through the official command-line interface, and whether failures leave enough evidence to debug without reproducing locally first.

This spec is not trying to fully automate in-editor playtesting. It is defining the most reliable automated substitute for manual editor opening and startup validation.

## Locked Decision

The canonical automated verification path will use:

- a `GUI-capable macOS runner`
- a fixed `Cocos Creator 3.8.8` installation
- official command-line build entrypoints
- exported Build Panel JSON passed through `configPath`

Pure CLI runners without GUI support are explicitly out of scope as the authoritative verification environment because official Cocos documentation states command-line publishing still requires a GUI environment.

## Why This Design

The current repository can run deterministic rule tests, but those tests do not prove that Cocos can:

- import the project assets
- resolve scene data and script metadata
- deserialize the playable scene
- compile scripts during a real build
- generate a valid platform output

The most stable way to cover those risks in automation is to use the official build pipeline, not to attempt brittle editor UI automation first.

This design therefore separates validation into:

- a fast repository preflight layer
- an authoritative Cocos command-line build smoke layer
- evidence retention for debugging

## Source Of Truth

Until a later spec explicitly changes it, the canonical playable scene for this repository is:

- scene asset path: `assets/scenes/Battle.scene`
- scene asset UUID: `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`

Both verification layers must treat that scene identity as contract data, not as an inferred convenience.

## Success Criteria

This CI verification design is successful when all of the following become true after implementation:

- A CI run can fail before merge if the playable project no longer builds through Cocos Creator `3.8.8`.
- The authoritative verification step runs from a fixed exported build config instead of ad hoc CLI parameter strings.
- A failing run preserves logs and build configuration so the failure can be diagnosed offline.
- A passing run proves more than static correctness:
  - project metadata is internally consistent
  - Cocos can process the project through its real build pipeline
  - build output exists at the expected destination
- The fast preflight step remains cheap enough to run on every branch update.

## Non-Goals

This design does not attempt to automate:

- in-editor button clicking or full gameplay completion
- visual diffing of the running scene
- screenshot-based UI approval
- iOS simulator launch from the Cocos editor
- final release packaging for App Store submission

Those can be added later, but they are separate concerns from CI-grade import and build verification.

## Verification Architecture

### Layer 1: Repository Preflight

This layer runs before any Cocos build. It is expected to be fast and deterministic.

It is designed to run on a generic Node-capable CI runner and must not require a local Creator installation.

It verifies:

- deterministic rules tests via `npm test`
- `Battle.scene` parses as valid JSON
- required `.meta` files exist for scene-bound scripts
- scene-referenced custom component class ids match the compressed UUIDs derived from their `.meta` UUIDs
- the canonical playable scene UUID from `assets/scenes/Battle.scene.meta` is still `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`
- expected project baseline files exist:
  - `package.json`
  - `tsconfig.json`
  - `tmp/tsconfig.cocos.json`
  - `settings/v2/packages/engine.json`
  - `profiles/v2/packages/scene.json`
  - `.creator/`

This layer should fail fast with human-readable messages before invoking Cocos itself.

### Layer 2: Authoritative Cocos Build Smoke

This is the canonical automated import-and-startup-adjacent validation.

The CI runner launches the real editor binary in command-line build mode:

- `CocosCreator --project <repo> --build "configPath=<exported-json>;logDest=<path>"`

The build target should be the smallest stable platform with the least external dependencies. For this project, the default smoke target should be:

- `web-desktop`

Reasoning:

- it exercises scene deserialization, script compilation, asset graph traversal, and build output generation
- it avoids native signing and Xcode integration complexity
- it is the lowest-friction way to prove that the playable scene participates in a real Cocos build

### Layer 3: Debug Artifact Retention

Every authoritative build attempt should preserve:

- wrapper-captured combined stdout/stderr log
- raw Cocos build log when `logDest` is successfully created
- copied editor-side temporary log if the wrapper can locate one
- the immutable committed config copied into the artifact directory for reference
- the per-run `config.effective.json` that Cocos actually consumed
- exported build config JSON used for the run
- command invocation metadata
- build output directory listing

On failure, this evidence is mandatory. On success, retaining a compact subset is still useful for auditability.

## CI Runner Requirements

The authoritative runner must satisfy all of the following:

- macOS
- GUI-capable session with access to WindowServer
- local installation of `Cocos Creator 3.8.8`
- stable absolute path or environment variable for the editor binary
- serialized execution so only one Cocos build uses the GUI session at a time
- a dedicated logged-in user/session for the Cocos job, not an opportunistic shared desktop

Recommended runner contract:

- `COCOS_CREATOR_APP=/Applications/Cocos/Creator/3.8.8/CocosCreator.app`
- binary path:
  - `$COCOS_CREATOR_APP/Contents/MacOS/CocosCreator`

Preferred operational model:

- a dedicated self-hosted macOS runner or managed macOS runner that supports logged-in GUI execution

This spec assumes the runner is provisioned outside the repo. The repo should validate and fail clearly if the binary is missing.

The runner contract also assumes there is no concurrently running Creator instance for the same user profile while CI is executing. Preventing `SingletonLock` and profile-migration contention is part of runner provisioning, not a repo concern.

## Build Configuration Strategy

The CI pipeline must not depend on hand-maintained semicolon-heavy build strings as the primary build source of truth.

Instead:

- configure the build once in the Cocos Build Panel
- export the Build Panel configuration JSON using the full task export that preserves project-setting-dependent fields
- commit that exported JSON into the repository
- use `configPath` in CI

Reasons:

- it matches the official editor-supported workflow
- it reduces drift between local build settings and CI build settings
- it preserves plugin-specific `packages[pkgName]` parameters in a stable shape

Recommended committed file location:

- `tools/ci/cocos-build-web-desktop.json`

This path is only a recommendation; the exact file path should remain repo-local, descriptive, and version-controlled.

The committed config is valid only if all of the following remain true:

- `platform` is `web-desktop`
- `startScene` is `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`
- `scenes` contains an entry for `assets/scenes/Battle.scene` with UUID `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`

If the playable scene changes in the future, updating the committed build config is part of the same change.

## Effective Build Config Rule

`configPath` remains the source of truth, but the wrapper must never mutate the committed JSON in place.

The normative override mechanism is:

1. copy the committed config JSON into the per-run artifact directory as `config.source.json`
2. duplicate `config.source.json` as `config.effective.json`
3. rewrite only the output-path-related fields needed in `config.effective.json` to isolate that run, starting with `buildPath`
4. pass `config.effective.json`, not the committed file, through `configPath`

This preserves the committed config as the canonical build contract while still preventing stale-output false greens on persistent runners.

## Commands Surface

### Preflight Command

The repository should expose one command that performs all static preflight checks:

- recommended script name: `npm run verify:cocos-preflight`

That command should:

1. run deterministic tests
2. validate scene JSON
3. validate script meta presence
4. validate scene component class ids against a repo-local deterministic UUID compression helper that matches the pinned Cocos serialization behavior for the normative test vectors in this spec
5. validate required project baseline files
6. validate that the committed build config still targets the canonical playable scene

### Authoritative Build Command

The repository should expose one wrapper command for the real Cocos build smoke:

- recommended script name: `npm run verify:cocos-build`

That command should call a repo-local wrapper script rather than inlining the full editor invocation in CI YAML.

Recommended wrapper location:

- `tools/ci/run-cocos-build.sh`

Wrapper responsibilities:

- resolve editor binary path
- validate required environment variables
- resolve project path
- resolve config JSON path
- validate that the committed config still targets `Battle.scene`
- choose a per-run artifact directory and a per-run build output path
- remove or recreate the chosen build output directory before invoking Cocos
- write a wrapper-owned combined stdout/stderr log even if `logDest` is never created
- invoke Cocos
- preserve `logDest` output when present
- opportunistically copy editor temp logs when present
- explain version-pinned exit codes
- print paths to preserved logs on failure

## Pass/Fail Rules

### Preflight Pass Conditions

The preflight layer passes only if:

- `npm test` exits `0`
- the scene JSON parses successfully
- all required meta files exist
- all expected scene-bound custom component ids match their script meta UUIDs
- required baseline project files exist
- the committed build config still points at the canonical playable scene

### Authoritative Build Pass Conditions

The authoritative build layer passes only if:

- the committed config still targets the canonical playable scene
- the Cocos process exits with the repository's pinned Cocos `3.8.8` success code `36`
- the expected output directory exists at the per-run path chosen by the wrapper
- the output directory is non-empty
- none of the preserved logs that exist for the run contain known hard-failure signals such as:
  - `missing script`
  - `deserialization error`
  - `import failed`
  - `build failed`

Exit code is primary. Log scanning is a post-success guardrail used only after a nominal success code is observed.

For consistency, log scanning should normalize every preserved log that exists for the run to lowercase and perform fixed-string matching against the hard-failure markers listed in this spec.

### Failure Conditions

The authoritative build must fail if any of the following occur:

- editor binary missing
- config JSON missing
- config JSON does not include `Battle.scene` in `scenes`
- config JSON does not set `startScene` to `6d8fa4db-c84c-4c65-9490-29da8a5d74cd`
- process exits with `32`
- process exits with `34`
- process exits with any unexpected non-success code
- build output missing after a nominally successful invocation
- log scanning finds a hard-failure marker after a nominally successful invocation

### Exit Code Contract

This repository treats the Cocos command exit code contract as version-pinned behavior for Creator `3.8.8`, not as a cross-version invariant:

- `36` means the build step completed successfully for this repository's pinned Creator version
- `32` and `34` are treated as known failure/early-exit codes for this pinned version
- any other non-`36` exit code is a failure

When the wrapper reports failure, it must print both the raw exit code and the artifact paths so future Creator upgrades can revisit this contract with evidence.

## Logging And Evidence

The design assumes that build logs are the primary debugging artifact for CI failures.

The wrapper must always write its own combined process log to a deterministic artifact path, for example:

- `artifacts/cocos-build/command.log`

`logDest` output from Cocos is still requested and preserved when present, but it must be treated as best-effort rather than the only guaranteed log source because early configuration failures can terminate before that file is created.

Recommended retained artifacts:

- `artifacts/cocos-build/command.log`
- `artifacts/cocos-build/cocos-log.txt`
- `artifacts/cocos-build/editor-log.txt`
- `artifacts/cocos-build/config.source.json`
- `artifacts/cocos-build/config.effective.json`
- `artifacts/cocos-build/output-tree.txt`
- `artifacts/cocos-build/command.txt`

The CI job should upload these artifacts on both success and failure, with longer retention on failure if the platform supports it.

## Implementation Units

The implementation should be split into focused pieces:

### `tools/ci/verify-cocos-project.mjs`

Purpose:

- perform repository preflight checks

Responsibilities:

- parse `Battle.scene`
- find scene custom component ids
- read relevant `.ts.meta` files
- use a repo-local deterministic UUID compression helper for component class id comparison
- compare expected and actual ids
- validate required project files
- validate that the committed build config still targets the canonical playable scene

Normative current-repo example:

- `assets/scripts/ui/BattleController.ts.meta` UUID `8d77e944-c80d-434d-a4f6-18ca01c62a70`
- corresponding serialized component id in `assets/scenes/Battle.scene`: `8d77elEyA1DTaT2GMoBxipw`
- official Cocos example from the pinned local Builder type declarations:
  - `fc991dd7-0033-4b80-9d41-c8a86a702e59` -> `fc9913XADNLgJ1ByKhqcC5Z`

Optional maintenance check:

- on a Creator-capable machine, a non-blocking maintainer script may compare the repo-local helper output against Cocos `3.8.8` `IBuild.Utils.compressUuid`

### `tools/ci/run-cocos-build.sh`

Purpose:

- run the authoritative Cocos build smoke

Responsibilities:

- resolve editor binary
- invoke build with `configPath`
- capture wrapper-owned logs
- capture `logDest` output when present
- isolate per-run output paths so stale artifacts cannot false-green the job
- preserve artifact paths
- exit with CI-friendly failure semantics

### `tools/ci/cocos-build-web-desktop.json`

Purpose:

- serve as the committed exported build config for the smoke target

Responsibilities:

- encode the build panel configuration actually used by CI
- explicitly include `Battle.scene` in `scenes`
- explicitly set `startScene` to `Battle.scene`

### CI Workflow File

Purpose:

- orchestrate layered verification

Recommended responsibilities:

- run preflight on every push and PR update
- run authoritative Cocos build on the macOS GUI-capable runner
- upload artifacts
- expose clear job names so failures are attributable immediately

## Failure Diagnosis Model

The design should make it obvious which class of problem failed:

- `preflight` failure:
  - repository inconsistency
  - malformed scene asset
  - missing meta
  - class id mismatch
  - deterministic rules regression
- `cocos-build` failure:
  - editor import/build issue
  - script compile error inside Cocos
  - asset deserialization error
  - scene participation/build graph issue

This split is important because it sharply reduces debugging scope.

## Risks And Tradeoffs

### GUI Runner Cost

Using a macOS GUI-capable runner is more expensive and operationally heavier than generic Linux CI.

This is accepted because it is the minimum environment that aligns with the official Cocos command-line behavior.

### Build Config Drift

If the Build Panel config is changed locally but the exported JSON in git is not updated, CI can validate the wrong target behavior.

Mitigation:

- treat the committed exported config as the canonical CI build contract
- require updating it intentionally when build settings change
- fail preflight if the committed config no longer points at the canonical playable scene

### Stale Artifact False Positives

Persistent runners can retain previous output directories. A naive "directory exists and is non-empty" check can therefore produce a false green.

Mitigation:

- use a unique per-run build output path under the wrapper-controlled artifact root, or delete and recreate the configured output directory before each build
- list the produced output tree from that per-run path only

### False Confidence From Preflight Alone

Preflight can only prove repository integrity, not editor behavior.

Mitigation:

- never treat preflight success as sufficient for merge safety
- require the authoritative Cocos build job for the protected branch path

## Rollout Plan

The implementation should be staged:

1. Add the committed exported build config file.
2. Add the repository preflight script and expose it through npm.
3. Add the Cocos build wrapper script with effective-config rewriting and artifact capture.
4. Add the macOS GUI-capable CI workflow.
5. Tune artifact retention and log scanning based on first failures.

This rollout keeps the first merge small while still moving toward the authoritative build goal quickly.

## Open Questions Closed By This Spec

The following choices are fixed and should not be re-debated during implementation:

- Use `web-desktop` as the smoke build target.
- Use `configPath` rather than manually curated CLI build strings as the primary CI build input.
- Use a GUI-capable macOS runner for the authoritative build layer.
- Keep manual visual/editor QA separate from CI import/build verification.
- Treat `assets/scenes/Battle.scene` and UUID `6d8fa4db-c84c-4c65-9490-29da8a5d74cd` as the current playable-scene contract.
