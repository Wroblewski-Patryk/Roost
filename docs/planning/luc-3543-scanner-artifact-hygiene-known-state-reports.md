# LUC-3543 Scanner Artifact Hygiene For Known-State Reports

Status: DONE
Task type: architecture scanner hygiene
Current stage: verification
Last updated: 2026-06-11
Owner: Core Backend Engineer

## Goal

Remove generated artifact noise from Roost known-state architecture reports so
temporary web QA mock files and Vite build assets do not appear as source
implementation entities requiring task links or tests.

## Scope

- Roost scanner input: `docs/architecture/scanner-overrides.json`.
- Generated Roost reports under `docs/graphs/` and `docs/status/`.
- Paperclip architecture-awareness scanner support:
  `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs`.

## Implementation

- Added scanner support for `excludePathPrefixes` while preserving existing
  exact `excludePaths` behavior.
- Added Roost prefix exclusions for:
  - `.tmp/web-qa-001`
  - `.tmp/web-qa-audit`
  - `public/react/assets`
- Regenerated architecture awareness exports with the Paperclip scanner.

## Evidence

| Check | Result |
| --- | --- |
| `node --check C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs` | PASS |
| `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` | PASS; `entities=2222`, `relations=4143`, `files=13548`; override prefixes applied to `34` files |
| `npm run architecture:status` | PASS; `GREEN`, graph `452/761/34`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass |
| Generated report grep | PASS; target generated implementation paths are no longer present in `docs/status/architecture-awareness-report.md`, `docs/status/task-synchronization-report.md`, or `docs/graphs/architecture-health.json` |

Before the LUC-3543 hygiene pass, the LUC-3533 repair packet recorded
`implementation entities without task links=215` with `.tmp/web-qa-*` and
`public/react/assets` entries at the top of the missing-link list. After this
pass, `docs/status/task-synchronization-report.md` reports
`implementation entities without task links=173`; the remaining rows are real
source or script candidates for the documentation/task-link classification
lane.

## Non-Actions

- No runtime application code, schema, migration, protected smoke, deploy,
  push, restart, production mutation, server process, browser process, or
  secret access occurred.
- No generated artifacts were deleted.
- Full `npm run validate` was not run because this lane only changed scanner
  input/reporting and the parent evidence contract requested scanner refresh
  plus `npm run architecture:status`.

## Result Report

LUC-3543 is complete. Known-state scanner reports now exclude the generated
web QA and Vite build-output directories through a reusable prefix override
mechanism. The architecture status gate remains green, and the remaining
task-link debt is no longer led by those generated artifacts.
