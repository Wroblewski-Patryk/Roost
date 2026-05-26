# LUC-187 Canonical Docs Root Pin And Takeover Handoff (Preparation)

Date: 2026-05-26
Issue: `LUC-187` `[Roost][Prep] Pin canonical docs root and takeover handoff`
Mode: preparation-only, non-mutating

## Goal

Pin one canonical documentation root for Roost takeover readiness and publish a
handoff note that removes path ambiguity for future specialist lanes.

## Canonical Decision

- Canonical local workspace root is:
  `C:\Personal\Projekty\Aplikacje\Roost`.
- Canonical docs root for this repository is: `docs/`.
- Legacy historical path `Roost - docs/` is treated as prior-state context, not
  current canonical root.
- Legacy aliases may appear only as product-history references in notes. They
  are not valid targets for new source-of-truth updates.

## Evidence

- Active workspace contains a live `docs/` tree with planning, architecture,
  governance, operations, and UX artifacts.
- Intake scan for `LUC-183` confirms the old path
  `C:\Personal\Projekty\Aplikacje\Roost\Roost - docs` is missing in the current
  workspace while `docs/` is present.
- `LUC-186` confirms the tracked legacy-path deletion set maps cleanly to
  canonical `docs/**` (`1119/1119` counterparts, `0` mapped misses), so the
  current evidence supports docs-root migration churn rather than content loss.
- Current prep artifacts already resolve from `docs/*` paths.

## Takeover Handoff Contract

1. All new source-of-truth and planning updates must target `docs/*`.
2. Any script, checklist, or note that still references `Roost - docs` must be
   updated to `docs` before activation lanes begin implementation.
3. First activation lanes should use this pinned root with:
   - `LUC-101` baseline:
     `docs/planning/luc-101-roost-takeover-readiness-known-state-baseline.md`
   - `LUC-183` intake note:
     `docs/planning/luc-183-intake-readiness-scan-note.md`

## Dependency Order For First Specialist Lanes

1. Path-contract normalization lane (Docs/PM):
   ensure active planning/state references use canonical workspace/docs roots.
2. SCM cleanup lane (Engineering Delivery + Board):
   normalize the legacy `Roost - docs/**` deletion churn in a dedicated commit
   while preserving `docs/**` as canonical root and avoiding runtime changes.
3. Backend/QA verification lane:
   only after steps 1-2, run the smallest protected runtime proof sequence
   already defined in prep artifacts.
4. Ops/release evidence lane:
   collect deploy-surface proof and rollback notes after backend/QA proof.

## Readiness State

- Current state: `planning-ready`.
- Deletion-churn classification is complete via `LUC-186`, but implementation
  lanes should still wait for an SCM-only cleanup commit or explicit board
  acceptance of the current legacy deletion state.

## Next Issue Proposal

1. `LUC-188` `[Roost][Prep] SCM-only legacy docs root cleanup commit`
   (Engineering Delivery lane; no runtime mutation).
2. `LUC-189` `[Roost][Prep] Activation readiness review after SCM cleanup`
   (Roost PM + Portfolio lane).
3. `LUC-190` `[Roost][Prep] Protected deploy-time proof replay after prep gates`
   (Backend + QA lane, opened only after `LUC-188` and `LUC-189` are done).

## Status

- `LUC-187` preparation objective: complete in repository state.
- Deployment, runtime, and production mutation: not performed.
