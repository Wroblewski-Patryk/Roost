# Current Focus

Last updated: 2026-05-08

## Active Focus

CompanyCore v1 runtime is accepted and live for the approved owner, ClickUp,
Jarvis, Paperclip, workspace API, and agent CRUD scope. The current focus has
shifted to owner-console UX/UI polish planning after the 2026-05-08 audit in
`docs/ux/companycore-v1-ux-ui-audit.md`. The active UXA-002 through UXA-010
polish, framework-foundation, and React dashboard migration wave is complete;
UXA-011 is the next ready table and notification primitive task.

## Current System Objective

Optimize for source-of-truth clarity, no regression, correct owner workflows,
and UX polish that makes the console answer what matters now, what is blocked,
and what the next action is.

## Current Delivery Stage

Post-verification. V1 operator handoff remains documented in
`docs/operations/v1-operator-handoff.md`; release readiness is documented in
`docs/operations/v1-release-readiness.md`. Runtime work is not being reopened.
The UX audit implementation lane `UXA-002..UXA-012` is complete.
UXA-002 closed the private-route screenshot evidence gap with a local
Playwright harness, and UXA-003 tightened the dashboard command surface.
UXA-004 reordered mobile auth so login/register forms appear before static
onboarding context.
UXA-005 clarified visual roles across filters, lists, selected details, and
compact dense rows.
UXA-006 added local action feedback placement for auth, ClickUp, and Google
Drive setup/import while preserving typed editor and API key local feedback.
UXA-007 compressed the authenticated mobile topbar so private route content
starts earlier while drawer navigation and sign-out remain available.
UXA-008 added local Phosphor dashboard iconography and canonical
management-first UX rules.
UXA-009 added the React + Vite + Tailwind + DaisyUI foundation and a
framework-backed `/react-dashboard` route.
UXA-010 added the `companycore` DaisyUI theme, live `/v1/connection` loading,
and reusable React dashboard primitives on `/react-dashboard`.
UXA-011 added reusable React/DaisyUI table and local-notification primitives,
live operating-model preview rows, and a repeatable React build cleanup step.
UXA-012 added `/react-tasks` as the first real React workbench route with live
`/v1/tasks` data, task metrics, filters, local states, and reusable table
rendering while preserving vanilla task routes.
UXA-013 decided to keep `/react-tasks` as a parallel route until one more React
workbench proves migration parity.
UXA-014 added `/react-integrations` as a parallel React integration map with
provider/data-path cards, readiness guidance, filters, and a 12-area coverage
table while preserving `/settings/integrations`.
The next ready slice is UXA-015: decide whether a React route can safely become
canonical or whether remaining parity needs another migration/refactor slice.

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
