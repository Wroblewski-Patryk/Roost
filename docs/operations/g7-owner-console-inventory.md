# G7 owner-console entry inventory

Source inspection: 2026-10-10, HEAD `7a66c062`. This is a route and surface inventory, not functional acceptance. `web/src/app-route-registry.ts`, `web/src/main.tsx`, `web/src/features/departments/core-area-data.ts`, `src/modules/departments/departments.routes.ts`, the shell and settings route are the inspected sources. The server catalog is configurable; its `/v1/departments` GET calls `ensureDefaultDepartments` and can upsert defaults. The 51 fallback views below must not be reported as the exact current production menu without an authorized catalog read.

## Top-level entry and routing

| Surface | Current entries | G7 disposition |
| --- | --- | --- |
| Public and access | `/`, `/auth/login`, `/auth/register`, `/auth/invitations/:token` | Inventory only; public redesign is G25. |
| Private route registry | 13 area entries on `/areas`, Product Map, `/account/settings`, `/workspace/settings` (16 entries) | Inspect all; only attention journey changes in G7. |
| Compatibility | `/dashboard`, `/react-dashboard`, `/operations`, `/people-agents`, `/workforce`; `/settings/drive` OAuth return | Keep normalization and return behavior; no new route family. |
| Cross-area router | Company Graph, entity inspector, department overviews, application graph, project workspace, executions, goals, projects, tasks, Decisions, procedures, files, objects and 21 company-record area/view mappings | Contextual projections use canonical records. Exact Task (`taskId`) and governed Decision (`decisionId`) navigation already exists. |
| Configuration | Account profile/security/access; workspace identity, integrations and ClickUp/Google Drive editors; human access, invitations and roles; agent connections/credentials, API/MCP and host/provider activation; workflow settings; department management | Inventory only. These surfaces need separate bounded UX repair or later functional gate; G7 does not alter permissions or providers. |

## Fallback area views

| Area | View keys in `coreAreas` | G7 relation |
| --- | --- | --- |
| `00-ogolny` | overview, company-updates, product-map | Attention entry in overview. |
| `01-strategia` | overview, goals, metrics, initiatives, decisions | Exact governed Decision and review route. |
| `02-produkt` | overview, requirements, deliverables | Contextual record/task projections; deferred. |
| `03-sprzedaz` | overview, offers | Deferred. |
| `04-operacje` | overview, tasks, calendar, procedures, issues, events | Exact Task, Worker result and owner review. |
| `05-relacje` | overview, feedback | Deferred. |
| `06-kadry` | overview, directory, competencies | Execution list is routed separately. |
| `07-finanse` | overview, budgets, invoices | Deferred. |
| `08-zasoby` | overview, files, resources, knowledge | Deferred. |
| `09-technologia` | overview, integrations, automations, incidents, environments | Incident context in attention; other UX deferred. |
| `10-prawo` | overview, contracts, policies, compliance | Deferred. |
| `11-innowacje` | overview, projects, application-graph, requirements, experiments | Deferred. |
| `12-zarzadzanie` | overview, departments, risks, portfolio, escalations, reviews | Blocker context in attention; other UX deferred. |

The 13 areas contain 51 fallback view entries. Server definitions also expose contextual views from other areas, notably goals, Decisions, metrics, tasks, procedures, directory, files, resources, policies, projects and risks. The router additionally maps 21 area/view combinations to shared company-record types. Neither a view entry nor a route match proves a successful journey.

## Initial flow findings and evidence still needed

1. The dashboard's owner-decision list currently mixes overdue Tasks, risks and intake proposals. It omits current reviewable Worker results, pending governed Decisions and technical incidents, and `general-dashboard.tsx` guesses a source area by matching labels. This can route the owner away from the selected item.
2. Task preview, Ready, `CompanyInformationResult` and governed Decision are separate surfaces. Their statuses must remain distinct: a ClickUp Task can stay `todo` while a Worker result is accepted. The result component has loading, pending, running, completed, failed, stopped and conflict states; G7 must make the journey visible and check those states.
3. The Operations Task preview contains unlocalized English labels in the Polish view. Responsive and keyboard behavior require live before/after proof.
4. The initial independent read-only UX audit had no authenticated live session. Production catalog, screens at 390/834/1440, PL/EN, focus, keyboard, empty/error and exact positive/denied navigation are open proof. Record their actual outcome before marking G7 met.

## G7 local verification, 2026-10-10

The central attention read model now combines pending governed Decisions, current unreviewed Worker results, blocked and overdue Tasks, active technical incidents and high/critical risks. It pages after 25 entries and uses exact IDs for Decision, Task and incident navigation; a risk opens its register. The newest Worker attempt determines whether a Task has a current reviewable result. An accepted result leaves the separately owned provider Task status unchanged. Record IDs survive the authentication return path and are checked against the selected workspace before a detail view opens.

Local checks passed: 12/12 native information API scenarios on a disposable PostgreSQL database, 80 Task Ready UI checks, eight route-navigation unit checks, `npm run typecheck`, `npm run codex:check`, and 63 G7 Playwright checks. The Playwright set covers Polish and English at 390, 834 and 1440 px, central attention and information-result states, focus return, Escape and keyboard navigation, overflow, pagination, and a simulated review-version conflict followed by refresh. Captures are local test artifacts, not production screenshots. The native database and role were removed and the previous local PostgreSQL container state restored. An independent read-only UX reviewer found the earlier pagination, retry, stale time badge, translation, touch target and denied-Task problems repaired in source; final production proof remains separate.

The prior production result review is evidence of an action through an owner account. It does not prove who operated that session or who authored the selected company record. The append-only review text includes an unsupported personal attribution; G7 does not rewrite that historical event or use it as provenance.

## G7 deployed read-back, 2026-10-10

Coolify webhook deployment `jm259ytqg94txdvvt4q2ub63` imported exact `250f6174a438450f48204f375fa19b10bcf7a782`, finished and displayed Running. The web and API public `/health` endpoints returned `ok` with that build. Production observation used the existing authenticated owner browser session and read-only navigation. The English and Polish desktop dashboard showed the new paged attention list. An exact Decision link retained its ID and `from=attention` return route. Its first context read conflicted; Refresh displayed the current proposal and impact with acceptance disabled, so the stale state did not silently become an accepted Decision. Direct entry to the known Task showed the existing accepted Worker result, its selected source and declared limits, while Task status remained `todo`. The first Task read during rollout asked for a retry; a later direct entry loaded normally. A non-existent Task ID displayed the unavailable-in-workspace state in both languages. No decision, Task, source, review or model state was changed by these checks.

The deployed first attention page contained five pending historical Decisions followed by active incidents, and no reviewable Worker result. Therefore a live dashboard-to-current-result click, a new accept/return, and responsive production screenshots remain unproved. The local 63-check visual suite covers these branches with synthetic fixtures; the prior G6 owner-account acceptance proves the existing production review endpoint, not this newly combined entry journey. The dashboard's large incident volume and historical pending Decisions are later triage-quality candidates; G7 did not close or alter those records.
