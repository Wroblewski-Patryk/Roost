# Current Focus

Last updated: 2026-05-08

## Active Focus

CompanyCore v1 runtime is accepted and live for the approved owner, ClickUp,
Jarvis, Paperclip, workspace API, and agent CRUD scope. The current focus has
shifted to owner-console UX/UI polish planning after the 2026-05-08 audit in
`docs/ux/companycore-v1-ux-ui-audit.md`. The active UXA-002 through UXA-009
polish and framework-foundation wave is complete; UXA-010 is the next ready
dashboard migration task.

## Current System Objective

Optimize for source-of-truth clarity, no regression, correct owner workflows,
and UX polish that makes the console answer what matters now, what is blocked,
and what the next action is.

## Current Delivery Stage

Post-verification. V1 operator handoff remains documented in
`docs/operations/v1-operator-handoff.md`; release readiness is documented in
`docs/operations/v1-release-readiness.md`. Runtime work is not being reopened.
The UX audit implementation lane `UXA-002..UXA-009` is complete.
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
framework-backed `/react-dashboard` route. The next approved slice is UXA-010:
dashboard component migration.

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
