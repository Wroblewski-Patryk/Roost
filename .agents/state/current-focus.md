# Current Focus

Last updated: 2026-05-08

## Active Focus

CompanyCore v1 runtime is accepted and live for the approved owner, ClickUp,
Jarvis, Paperclip, workspace API, and agent CRUD scope. The current focus has
shifted to owner-console UX/UI polish planning after the 2026-05-08 audit in
`docs/ux/companycore-v1-ux-ui-audit.md`. Ready UX tasks now start with an
authenticated private-route evidence harness before dashboard and mobile-auth
polish.

## Current System Objective

Optimize for source-of-truth clarity, no regression, correct owner workflows,
and UX polish that makes the console answer what matters now, what is blocked,
and what the next action is.

## Current Delivery Stage

Planning. V1 operator handoff remains documented in
`docs/operations/v1-operator-handoff.md`; release readiness is documented in
`docs/operations/v1-release-readiness.md`. Runtime work is not being reopened.
The active planning lane is `UXA-002..UXA-006`, derived from the UX/UI audit.

## Current Priority Order

1. Stability
2. Architecture alignment
3. No regressions
4. Correct flows
5. UX quality
6. Visual polish
7. New features

## Active Constraints

- Do not touch unrelated in-progress code changes.
- Keep source-of-truth docs in English.
- Reuse existing `.codex/context`, planning, governance, and architecture
  systems.
- Do not mark Google Drive owner consent/import complete until real OAuth
  credentials, owner consent, and target-environment import evidence exist.
- Do not mark upstream Paperclip/OpenJarvis merge execution complete until
  write access or an approved fork/PR route exists.
- Treat GitHub-to-Coolify auto-deploy as a P2 release-automation evidence item,
  not as a v1 runtime blocker.
