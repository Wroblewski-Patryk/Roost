# Repository Structure Policy

## Goal

Keep the repository predictable, searchable, and automation-friendly.

## Root Directory Rules

- Keep root minimal and intentional.
- Allowed in root:
  - top-level project files such as `README.md`, `AGENTS.md`, `LICENSE`,
    `CHANGELOG.md`
  - runtime, package-manager, and build config files
  - infrastructure entry files such as compose files or CI config
  - agent and context folders such as `.agents/`, `.claude/`, `.codex/`
  - source directories such as `apps/`, `packages/`, `scripts/`, `docs/`
- Do not add ad-hoc project documentation files directly in root.

## Documentation Placement

- Product, architecture, engineering, operations, security, and UX docs must
  live in `docs/` subfolders.
- Use existing category folders first.
- File names should use kebab-case and domain-specific names.

## Migration Rule For Existing Root Docs

- When a root markdown file is project documentation rather than top-level repo
  metadata, move it under `docs/` in the correct category.
- After moving, update inbound links in:
  - `docs/README.md`
  - `AGENTS.md` canonical list if relevant
  - planning or context files that referenced the old path

## Cross-Project Isolation

- Do not reference files from sibling repositories.
- Use only paths that exist inside the current repository.
- Avoid hardcoded absolute local paths in docs and prompts.

## Enforcement

- Any PR that adds new root docs should justify why the file cannot live in
  `docs/`.
- If no strong reason exists, move it to `docs/` before merge.
