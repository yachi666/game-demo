# Repository Guidelines

## Superpowers Skills
This repository expects agents to use the available superpowers skills deliberately instead of treating them as optional reference material.

- Check whether a skill applies before responding, asking clarifying questions, exploring files, or making changes.
- If a relevant skill exists, invoke and follow it before taking action. Re-read the current skill definition instead of relying on memory.
- Follow priority in this order: direct user instructions and this `AGENTS.md`, then superpowers skills, then default assistant behavior.
- When multiple skills apply, use process skills first, such as brainstorming or debugging, and then use implementation skills for the actual code or content changes.
- If a skill turns out not to fit after invocation, state that briefly and continue with the next best applicable workflow.
- For this repository in particular, prefer these defaults:
  - `using-superpowers` at the start of work to decide whether other skills should be activated
  - `brainstorming` before creative feature work, new gameplay ideas, or behavior changes
  - `writing-plans` before larger multi-step implementations or doc restructures
  - `systematic-debugging` when investigating bugs, regressions, or unexpected runtime behavior
  - `test-driven-development` when adding or changing implementation code
  - `verification-before-completion` before claiming a task is done, fixed, or ready to ship

## Project Structure & Module Organization
This repository already contains product and technical documentation and is expected to grow into a `Cocos Creator + TypeScript` iOS game project. Keep the root minimal and introduce structure deliberately around that workflow:

- `assets/` for Cocos project assets, scenes, prefabs, UI, audio, effects, and gameplay scripts
- `assets/scripts/` for TypeScript gameplay and client logic if the default Cocos layout is used
- `docs/` for product, research, architecture, and operational docs
- `native/` for native iOS bridge or platform-specific integration work when needed
- `tools/` for local automation, content pipelines, validation scripts, or build helpers
- `tests/` for automated tests that do not naturally live inside the Cocos asset tree

When adding a new module, prefer the structure that best matches the Cocos workflow instead of forcing a generic `src/` layout. Keep related code, tests, and fixtures close together and avoid deep nesting unless it clearly improves separation.

## Documentation Architecture & Indexing
When creating or updating documents, reason about the document structure before writing. Follow these rules:

- Prefer natural, table-of-contents-style hierarchy over arbitrary splitting by file length.
- Split a document into layered documents when a single file would otherwise mix different audiences, decision levels, or lifecycles.
- Keep one document focused on one job: for example, PRD for product intent, research for options and trade-offs, architecture for system boundaries, and runbooks for operations.
- Use Markdown heading levels deliberately so the heading tree can serve as a reliable index for humans and future agents.
- Maintain `docs/README.md` as the top-level documentation index. Every durable document in `docs/` should be linked there with a short purpose note.
- If a topic grows into multiple files, create a local index file such as `docs/<topic>/README.md` and link it from the top-level index.
- When adding or moving a document, update the relevant index files in the same change. Do not leave orphaned documents.
- Prefer semantic boundaries when splitting docs: split by topic, workflow stage, or ownership, not by token count or convenience alone.
- Add a short metadata block near the top of each substantial document when useful, such as document type, status, date, and related docs.
- If a document is exploratory, temporary, or superseded, mark that status clearly and point readers to the next canonical document.
- Keep filenames descriptive and stable so indexes and cross-references remain durable over time.

## Build, Test, and Development Commands
There are no project-local build or test commands configured yet. Before opening a feature PR, add and document the commands the Cocos/iOS stack needs. Prefer a small, standard surface such as:

- a project-open or local development command for the Cocos Creator project
- an iOS build command for generating a native package or Xcode project
- `npm run lint` or equivalent TypeScript lint/format checks once JS/TS tooling is added
- `npm test` or equivalent automated tests for gameplay logic, data validation, or tooling once a test runner exists

For the current repository state, the most universally useful commands are still `git status` and `git log --oneline`, plus file-level inspection in `docs/`.

When opening the Cocos project locally, prefer `Cocos Dashboard` over launching `CocosCreator.app` directly so project discovery and editor startup stay aligned with the recommended workflow. The preferred command is:

- `open -a /Applications/CocosDashboard.app /Users/lzn/Documents/trae_projects/demo`

## Coding Style & Naming Conventions
Use clear, descriptive names and follow the dominant convention of the surrounding toolchain. Baseline formatting rules:

- UTF-8 files with LF line endings
- 2 spaces for Markdown, YAML, and JSON
- 4 spaces for Python if Python is added
- TypeScript should follow the formatter and lint rules adopted with the first Cocos code contribution

For docs and helper scripts, prefer lowercase, descriptive filenames. For Cocos assets and scenes, preserve naming patterns that improve editor readability and asset searchability. Adopt an automatic formatter and linter with the first real code contribution, then commit the config with the change.

## Testing Guidelines
No test framework is configured yet. New features should introduce or extend automated tests at the same time as the code. Prefer `tests/` for suite-level coverage and use colocated tests only when the toolchain strongly favors it. Prioritize coverage for deterministic gameplay logic, config validation, and content-processing tools over editor-only glue code. Name tests after the behavior they verify.

## Commit & Pull Request Guidelines
The repository history is still minimal, so no strict repository-specific commit convention exists yet. Start with short, imperative commit subjects such as `Add board turn state machine` or `Document Cocos build workflow`.

Pull requests should include:

- a brief summary of the change
- linked issue or task reference, if any
- setup, test, and verification notes
- screenshots only when UI or visual output changes
