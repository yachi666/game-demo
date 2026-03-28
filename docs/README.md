# Documentation Index

This index is the canonical entry point for durable project documentation in `docs/`.
When adding, moving, or replacing documentation, update this file in the same change.

## Product

- [Product Docs](./product/README.md): product-facing documents, including scope, goals, and acceptance criteria.

## Research

- [Research Docs](./research/README.md): research and technical evaluation notes that support delivery decisions.

## Delivery

- [Superpowers Docs](./superpowers/README.md): validated design specs and execution plans for implementation work.
- [Fortune Board Cocos CI Verification Design](./superpowers/specs/2026-03-28-fortune-board-cocos-ci-verification-design.md): approved design for automated Cocos import/build verification in CI using a GUI-capable macOS runner.

## Local Development

- Create or refresh the Cocos project baseline with `bash tools/create-cocos-project.sh`
- Install JS dependencies with `npm install`
- Run deterministic rules tests with `npm test`
- Open the project in Cocos Creator with:
  `open -a /Applications/Cocos/Creator/3.8.8/CocosCreator.app /Users/lzn/.codex/worktrees/fe99/demo`

## Index Rules

- Add every durable document in `docs/` to this index with a one-line description.
- Group entries by document type or topic so readers can scan the tree quickly.
- If a topic expands into multiple files, create a topic folder with its own `README.md` and link that folder here.
- Mark temporary, draft, or superseded documents clearly instead of leaving their status implicit.
