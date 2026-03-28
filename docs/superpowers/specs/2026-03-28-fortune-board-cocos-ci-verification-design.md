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

It verifies:

- deterministic rules tests via `npm test`
- `Battle.scene` parses as valid JSON
- required `.meta` files exist for scene-bound scripts
- scene-referenced custom component class ids match the compressed UUIDs derived from their `.meta` UUIDs
- expected project baseline files exist:
  - `package.json`
  - `tsconfig.json`
  - `tmp/tsconfig.cocos.json`
  - `settings/`
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

- raw Cocos build log
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

Recommended runner contract:

- `COCOS_CREATOR_APP=/Applications/Cocos/Creator/3.8.8/CocosCreator.app`
- binary path:
  - `$COCOS_CREATOR_APP/Contents/MacOS/CocosCreator`

Preferred operational model:

- a dedicated self-hosted macOS runner or managed macOS runner that supports logged-in GUI execution

This spec assumes the runner is provisioned outside the repo. The repo should validate and fail clearly if the binary is missing.

## Build Configuration Strategy

The CI pipeline must not depend on hand-maintained semicolon-heavy build strings as the primary build source of truth.

Instead:

- configure the build once in the Cocos Build Panel
- export the Build Panel configuration JSON
- commit that exported JSON into the repository
- use `configPath` in CI

Reasons:

- it matches the official editor-supported workflow
- it reduces drift between local build settings and CI build settings
- it preserves plugin-specific `packages[pkgName]` parameters in a stable shape

Recommended committed file location:

- `tools/ci/cocos-build-web-desktop.json`

This path is only a recommendation; the exact file path should remain repo-local, descriptive, and version-controlled.

## Commands Surface

### Preflight Command

The repository should expose one command that performs all static preflight checks:

- recommended script name: `npm run verify:cocos-preflight`

That command should:

1. run deterministic tests
2. validate scene JSON
3. validate script meta presence
4. validate scene component class ids against compressed UUIDs
5. validate required project baseline files

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
- choose deterministic log output location
- invoke Cocos
- normalize or explain exit codes
- print paths to preserved logs on failure

## Pass/Fail Rules

### Preflight Pass Conditions

The preflight layer passes only if:

- `npm test` exits `0`
- the scene JSON parses successfully
- all required meta files exist
- all expected scene-bound custom component ids match their script meta UUIDs
- required baseline project files exist

### Authoritative Build Pass Conditions

The authoritative build layer passes only if:

- the Cocos process exits with official success code `36`
- the expected output directory exists
- the output directory is non-empty
- the build log does not contain known hard-failure signals such as:
  - `missing script`
  - `deserialize`
  - `import failed`
  - `build failed`

Log scanning is secondary to the exit code, not a replacement for it.

### Failure Conditions

The authoritative build must fail if any of the following occur:

- editor binary missing
- config JSON missing
- process exits with `32`
- process exits with `34`
- process exits with any unexpected non-success code
- build output missing after a nominally successful invocation

## Logging And Evidence

The design assumes that build logs are the primary debugging artifact for CI failures.

The wrapper must always write logs to a deterministic path, for example:

- `artifacts/cocos-build/build.log`

Recommended retained artifacts:

- `artifacts/cocos-build/build.log`
- `artifacts/cocos-build/config.json`
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
- compress UUIDs using the same algorithm Cocos uses for component class ids
- compare expected and actual ids
- validate required project files

### `tools/ci/run-cocos-build.sh`

Purpose:

- run the authoritative Cocos build smoke

Responsibilities:

- resolve editor binary
- invoke build with `configPath`
- capture logs
- preserve artifact paths
- exit with CI-friendly failure semantics

### `tools/ci/cocos-build-web-desktop.json`

Purpose:

- serve as the committed exported build config for the smoke target

Responsibilities:

- encode the build panel configuration actually used by CI

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

### False Confidence From Preflight Alone

Preflight can only prove repository integrity, not editor behavior.

Mitigation:

- never treat preflight success as sufficient for merge safety
- require the authoritative Cocos build job for the protected branch path

## Rollout Plan

The implementation should be staged:

1. Add repository preflight script and expose it through npm.
2. Add committed exported build config file.
3. Add Cocos build wrapper script.
4. Add macOS GUI-capable CI workflow.
5. Tune artifact retention and log scanning based on first failures.

This rollout keeps the first merge small while still moving toward the authoritative build goal quickly.

## Open Questions Closed By This Spec

The following choices are fixed and should not be re-debated during implementation:

- Use `web-desktop` as the smoke build target.
- Use `configPath` rather than manually curated CLI build strings as the primary CI build input.
- Use a GUI-capable macOS runner for the authoritative build layer.
- Keep manual visual/editor QA separate from CI import/build verification.
