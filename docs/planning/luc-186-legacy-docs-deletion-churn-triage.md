# LUC-186 Legacy Docs Deletion Churn Triage (Read-Only)

Date: 2026-05-26
Issue: `LUC-186` `[Roost][Prep] Triage legacy docs deletion churn`
Mode: read-only triage (no restore/remove/archive mutation)

## Goal

Determine whether `Roost - docs/**` deletions represent accidental data loss or
path migration churn, then provide an operator-safe resolution decision.

## Scope

- Inspect Git working tree deletions under `Roost - docs/**`.
- Compare deleted legacy paths against active `docs/**`.
- Produce a decision packet only.
- Excluded: destructive restore/remove/archive actions, deploy, secret access,
  production mutation.

## Findings

### 1) Deletion volume and shape

- Deleted legacy-path files detected: `1119`.
- Representative deleted paths:
  - `Roost - docs/API.md`
  - `Roost - docs/architecture/architecture-evidence-system.md`
  - `Roost - docs/planning/mvp-next-commits.md`
  - `Roost - docs/status/architecture-health-dashboard.json`
  - `Roost - docs/ux/design-memory.md`

Category distribution (top groups):

- `architecture`: `520`
- `ux`: `226`
- `planning`: `206`
- `status`: `64`
- `operations`: `31`
- `governance`: `20`

### 2) Migration/equivalence evidence

- `1119/1119` deleted legacy paths have a direct mapped counterpart under
  `docs/**` by replacing prefix `Roost - docs/ -> docs/`.
- Missing mapped counterparts: `0`.
- Set comparison:
  - mapped legacy set size: `1119`
  - tracked `docs/**` files: `1120`
  - extra current docs file: `docs/planning/luc-183-intake-readiness-scan-note.md`

Interpretation: current evidence supports path-root migration churn, not content
loss.

### 3) Working tree risk context

- The repository is currently highly dirty with broad pre-existing changes.
- Because of that baseline, this packet does not assert *who* performed the
  path shift; it only classifies the resulting diff shape.

## Decision

Recommended disposition: `defer destructive action` and treat the current
deletion set as **legacy-path churn from docs-root migration** unless a board
owner provides contrary evidence.

## Operator-Safe Resolution

1. Keep this issue in prep/documentation triage lane only.
2. Ask SCM owner to execute a dedicated cleanup commit that:
   - keeps `docs/**` as canonical root,
   - removes legacy `Roost - docs/**` path churn from active workspace state,
   - includes no runtime/deploy mutations.
3. If owner suspects accidental loss, require a focused diff audit on a clean
   branch before any restore action.

## Acceptance Check (for this triage issue)

- [x] Deletion count summary produced.
- [x] Category summary produced.
- [x] Representative paths listed.
- [x] Migration/equivalence evidence captured.
- [x] Safe resolution recommendation produced.

## Validation Evidence

Commands used:

- `git status --short` filtered for `Roost - docs/**` deletions
- mapped path existence check (`Roost - docs/*` -> `docs/*`)
- set comparison against `git ls-files docs`

Outcome: read-only evidence collection complete; no destructive or runtime
mutation performed.
