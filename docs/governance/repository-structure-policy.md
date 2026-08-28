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
  - source directories such as `apps/`, `packages/`, `scripts/`, `docs/`
- Do not add ad-hoc project documentation files directly in root.

## Documentation Placement

- Product, architecture, engineering, operations, security, and UX docs must
  live in `docs/` subfolders.
- Use existing category folders first.
- File names should use kebab-case and domain-specific names.
- `docs/README.md` is the canonical docs index. Update it whenever docs are
  added, moved, renamed, or archived.

## Migration Rule For Existing Root Docs

- When a root markdown file is project documentation rather than top-level repo
  metadata, move it under `docs/` in the correct category.
- After moving, update inbound links in:
  - `docs/README.md`
  - `AGENTS.md` canonical list if relevant
  - planning or context files that referenced the old path

## Generated artifacts

Generated reports, screenshots, logs, task histories and agent memory are not
repository truth. Keep them in ignored temporary directories or external task
systems. Never commit secrets or production data.

## Cross-Project Isolation

- Do not reference files from sibling repositories.
- Use only paths that exist inside the current repository.
- Avoid hardcoded absolute local paths in docs and prompts.

## Documentation Move Checklist

When moving or renaming docs in `docs/`:

- Update internal links in the same change set.
- Update `docs/README.md` if the canonical reading path changed.
- Update `AGENTS.md` if the canonical file list changed.
- Search for stale paths with `rg` before closing the change.

## Enforcement

- Any PR that adds new root docs should justify why the file cannot live in
  `docs/`.
- If no strong reason exists, move it to `docs/` before merge.
