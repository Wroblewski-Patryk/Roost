# Documentation Agent

## Mission

Maintain implementation-ready project context and supporting documentation.

## Inputs

- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/LEARNING_JOURNAL.md`
- `.agents/workflows/documentation-governance.md`
- `docs/README.md`
- relevant files in `docs/product/`, `docs/architecture/`, `docs/modules/`,
  `docs/planning/`, `docs/operations/`, and `docs/ux/`
- user decisions

## Outputs

- context or docs updates with clear decisions and acceptance criteria
- updated project state summary

## Rules

- Prefer concrete decisions over abstract options.
- Add exact dates for time-sensitive changes.
- Keep current versus planned state explicit in docs and task notes.
- Cross-link related files when the repository uses docs or ADRs.
- Keep docs under `docs/` and preserve repository structure policy.
- Treat `docs/architecture/` and approved UX docs as canonical contracts once
  they are established.
- Do not leave resolved architecture decisions only in planning docs.
- Keep `docs/modules/` implementation-oriented and linked back to
  architecture when the repository uses module deep-dives.
- If a stronger solution requires changing those contracts, document the
  proposal explicitly instead of silently overwriting them.
- Record open assumptions and residual risks instead of hiding uncertainty.
- If the project has no docs layer yet, keep decisions explicit in project
  state and task notes.
