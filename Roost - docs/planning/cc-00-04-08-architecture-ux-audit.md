# CC-00-04-08 Architecture And UX Audit

Last updated: 2026-05-16

## Scope

This audit covers the user-requested operating-system surfaces:

- `00 Ogolny` as the post-login company dashboard and orchestration layer for
  the other twelve departments.
- `04 Operations` as the work execution and task-management layer.
- `08 Assets` as the files, knowledge, and AI-context-readiness layer.

The audit compares current implementation against
`docs/architecture/autonomous-company-operating-system.md`, the shared
Tailwind/DaisyUI component direction, and the selected-area web route at
`/areas`.

## Findings

| ID | Area | Finding | Severity | Status | Evidence / Fix |
| --- | --- | --- | --- | --- | --- |
| CC-AUDIT-001-F01 | `00 Ogolny` | The architecture says `00 Ogolny` is the main company dashboard after login, but the compatibility `/dashboard` route still rendered a separate Company Atlas surface. | P0 | Fixed | `web/src/app-route-registry.ts` now defines `canonicalGeneralDashboardPath=/areas?area=00-ogolny&view=overview`; `canonicalPostAuthPath()` defaults to that route and `/dashboard` redirects there. |
| CC-AUDIT-001-F02 | `00 Ogolny` | Pending private paths containing query parameters could be normalized down to the pathname and lose selected-area context after auth. | P1 | Fixed | Route normalization now strips query/hash only for route matching while `canonicalPostAuthPath()` preserves a valid private target path with its query string. |
| CC-AUDIT-001-F03 | `00 Ogolny` | The selected-area `00` board now consumes route proposal readback, but accept/reject/route finalization remains intentionally absent. | P1 | Planned | Command-shaped writes remain future work because the architecture requires explicit safe commands and no autonomous backend AI behavior. |
| CC-AUDIT-001-F04 | `04 Operations` | The read packet and board exist, but rich task fields such as subtasks, checklists, time tracking, owner/agent/reviewer assignments, calendar, workload, and timeline views are not yet complete. | P1 | Planned | Current implementation is a verified read-first slice over existing task/project/pipeline/evidence records. Schema/UI expansion should follow explicit task contracts. |
| CC-AUDIT-001-F05 | `08 Assets` | The read packet and board exist, but provider write commands, folder move/share/delete actions, full graph view, and freshness remediation commands are not implemented. | P1 | Planned | Current implementation keeps provider writes blocked and exposes Drive/resource/knowledge context as an AI-compatible read packet. |
| CC-AUDIT-001-F06 | Shared UI | `CcButton` and `CcDataTable` are now used by the three surfaces, but future cards, badges, toolbar, fields, and tabs still need shared primitives before broad department buildout. | P2 | Planned | Reuse direction is recorded in `CC-UI-001`; future modules should extend shared primitives instead of page-local variants. |

## Architecture Alignment

| Requirement | Current Result | Status |
| --- | --- | --- |
| CompanyCore is not an AI runtime; AI is an API/MCP client. | Backend exposes read packets and guarded capabilities; no chatbot or agent personality is embedded in the backend. | Delivered |
| `00 Ogolny` connects the twelve other departments. | Selected-area dashboard lists the department system, route proposals, ownership/status metrics, and routes into department capabilities. Post-login now opens this surface. | Delivered for first slice |
| `04 Operations` manages execution work. | `GET /v1/operations/work-items` and the Operations board expose task-centered work, hierarchy, dependencies, evidence, blocked/overdue signals, and read-only agent packet. | Delivered for first slice |
| `08 Assets` manages company memory. | `GET /v1/assets/context` and the Assets board expose Drive files, folders, resources, knowledge roots/items, AI-readiness labels, cleanup needs, and blocked provider actions. | Delivered for first slice |
| Shared visual system across modules. | `CcButton` and `CcDataTable` are shared across the new 00/04/08 surfaces; the shell and DaisyUI/Tailwind theme remain the common base. | Delivered for first slice |
| Mobile, tablet, and desktop remain usable without clutter. | The selected-area shell uses compact cards/tables and mobile card mode for data packets. New proof must include post-login route plus desktop/mobile checks. | Verification required per release |

## UX Direction

- `00 Ogolny` is the first screen after successful owner authentication.
- `/dashboard` is retained as a compatibility alias, but it should not become a
  second product surface.
- First viewport should answer: what matters now, what is blocked, and what the
  next action is.
- Department surfaces must reuse shared primitives, keep dense management UI,
  and avoid marketing-style hero pages.
- Write actions must stay local to an approved command contract with visible
  loading, success, empty, and error states.

## Execution Plan For Remaining Gaps

| Step | Task | Why | Exit criteria |
| --- | --- | --- | --- |
| 1 | Verify post-login, `/dashboard`, `00`, `04`, and `08` routes after the dashboard redirect fix. | Confirms the P0 architecture/UX mismatch is closed. | Build passes; rendered route proof records no blank page, framework overlay, console/page errors, or horizontal overflow. |
| 2 | Create `05 Relationships` read packet and board. | It is the next coherent department slice in the active queue after 00/04/08. | Protected read API, MCP exposure, UI board, API tests, and desktop/mobile proof. |
| 3 | Plan `04 Operations` command contract only after read-model acceptance. | Prevents unsafe task mutation and keeps AI as a client. | Task command contract covers assignments, status moves, checklist/subtask writes, idempotency, permissions, and evidence. |
| 4 | Plan `08 Assets` provider-safe command contract. | Prevents accidental Drive/file mutation. | Command contract explicitly gates move/share/delete/sync actions, permissions, audit events, and rollback behavior. |
| 5 | Continue shared UI primitives. | Keeps all department views consistent and maintainable. | `CcCard`, `CcBadge`, `CcToolbar`, `CcTabs`, and `CcField` are implemented only when adopted by real surfaces. |

## Validation Notes

The audit implementation must be considered complete only when the task
contract records fresh build and rendered route evidence for:

- owner login defaulting to `00 Ogolny`;
- `/dashboard` redirecting to `00 Ogolny`;
- desktop `00 Ogolny`;
- desktop `04 Operations`;
- desktop and mobile `08 Assets`.

