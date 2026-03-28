# Repository Guidelines

## Project Structure & Module Organization
This repository is currently an empty Git workspace with no application code checked in yet. Keep the root minimal and introduce structure deliberately:

- `src/` for application code
- `tests/` for automated tests
- `assets/` for static files such as images or fixtures
- `docs/` for design notes, architecture, or operational docs

When adding a new module, keep related code, tests, and fixtures close together and avoid deep nesting unless it clearly improves separation.

## Build, Test, and Development Commands
There are no project-local build or test commands configured yet. Before opening a feature PR, add and document the commands your stack needs. Prefer a small, standard surface such as:

- `make dev` or `npm run dev` to start local development
- `make test` or `npm test` to run the test suite
- `make lint` or `npm run lint` to run formatting and lint checks

For the current repository state, the only universally useful commands are `git status` and `git log --oneline`.

## Coding Style & Naming Conventions
Use clear, descriptive names and keep file names lowercase with hyphens or the dominant convention of the chosen language. Baseline formatting rules:

- UTF-8 files with LF line endings
- 2 spaces for Markdown, YAML, and JSON
- 4 spaces for Python if Python is added

Adopt an automatic formatter and linter with the first real code contribution, then commit the config with the change.

## Testing Guidelines
No test framework is configured yet. New features should introduce or extend automated tests at the same time as the code. Prefer `tests/` for suite-level coverage and colocated tests only when the toolchain strongly favors it. Name tests after the behavior they verify, for example `auth-login.test.ts` or `test_auth_login.py`.

## Commit & Pull Request Guidelines
There is no Git history yet, so no repository-specific commit convention exists. Start with short, imperative commit subjects such as `Add initial CLI scaffold` or `Create health check test`.

Pull requests should include:

- a brief summary of the change
- linked issue or task reference, if any
- setup, test, and verification notes
- screenshots only when UI or visual output changes
