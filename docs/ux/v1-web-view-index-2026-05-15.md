# V1 Web View Index

Date: 2026-05-15
Stage: planning
Owner: Frontend Builder + Product Docs

## Purpose

This index marks the current CompanyCore web views by UX maturity so future
work can move from the old route/module-shaped app into a useful V1 company
management layer.

V1 means:

- the view is built around the owner's company-management task;
- the view follows the area-first UX model;
- the view uses the shared React route registry and atlas shell direction;
- the view consumes real backend contracts without fake placeholder data;
- the view has desktop and mobile proof.

V0 means:

- the view exists and may be functional;
- the view is still module/workbench/admin shaped;
- the view should be rebuilt into a clearer V1 user journey or removed if it
  no longer earns its place.

## Status Vocabulary

| Status | Meaning | Rule |
| --- | --- | --- |
| `V1 canonical` | Approved canonical UX surface with implementation proof. | Future work extends this pattern. |
| `V1 foundation` | Useful React foundation with real data, but not yet canonical UX. | Keep, then polish into area-first journeys. |
| `V0 rebuild` | Functional or transitional view that does not yet meet V1 UX. | Rebuild before treating as finished. |
| `V0 compatibility` | Alias or compatibility route. | Keep only while it helps navigation or migration. |
| `V2 deferred` | Future Company City / richer visual direction. | Do not implement before V1 foundation is useful. |

## Canonical V1 Views

| View | Route | Status | Canonical Source | Desktop Target | Mobile Target | User Question Answered | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public Home | `/` | `V1 canonical` | `docs/ux/v1-web-view-index-2026-05-15.md` | `docs/ux/assets/companycore-v1-home-desktop-canonical.png` | `docs/ux/assets/companycore-v1-home-mobile-canonical.png` | What is CompanyCore and where do I enter the owner workspace? | `docs/planning/v1-web-five-canonical-surfaces-task-contract.md` |
| Owner Login | `/auth/login` | `V1 canonical` | `docs/ux/v1-web-view-index-2026-05-15.md` | `docs/ux/assets/companycore-v1-login-desktop-canonical.png` | `docs/ux/assets/companycore-v1-login-mobile-canonical.png` | How do I safely return to my private company operating room? | `docs/planning/v1-web-five-canonical-surfaces-task-contract.md` |
| Owner Registration | `/auth/register` | `V1 canonical` | `docs/ux/v1-web-view-index-2026-05-15.md` | `docs/ux/assets/companycore-v1-register-desktop-canonical.png` | `docs/ux/assets/companycore-v1-register-mobile-canonical.png` | How do I create the first owner workspace? | `docs/planning/v1-web-five-canonical-surfaces-task-contract.md` |
| Company Atlas | `/dashboard` | `V1 canonical` | `docs/ux/v1-simple-dashboard-canonical-spec-2026-05-15.md` | `docs/ux/assets/companycore-v1-dashboard-desktop-canonical.png` | `docs/ux/assets/companycore-v1-dashboard-mobile-canonical.png` | What matters across the company, which area owns it, and what should I open next? | `docs/planning/v1-area-first-pixel-perfect-task-contract.md` |
| Selected Area Operating Room | `/areas?area=:areaKey&view=:viewId` | `V1 canonical` | `docs/ux/v1-area-detail-canonical-spec-2026-05-15.md` | `docs/ux/assets/companycore-v1-area-detail-desktop-canonical.png` | `docs/ux/assets/companycore-v1-area-detail-mobile-canonical.png` | What is happening inside this department, where is the proof, and what can I decide or delegate next? | `docs/planning/v1-area-detail-canonical-task-contract.md` |

## Canonical Planning Targets

| View | Route Direction | Status | Canonical Source | Desktop Target | Mobile Target | User Question Answered | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Unified Settings | `/settings` with tab-aware entries for integrations, Drive, API, and MCP | `V1 planned canonical` | `docs/ux/v1-settings-canonical-spec-2026-05-15.md` | `docs/ux/assets/companycore-v1-settings-desktop-canonical.png` | `docs/ux/assets/companycore-v1-settings-mobile-canonical.png` | What is connected, what can AI know, what can AI do, and what still needs owner review? | `docs/planning/v1-settings-canonical-design-task-contract.md` |

## Active Route Index

| Route | Current Status | V1 Direction | Keep / Rebuild / Remove |
| --- | --- | --- | --- |
| `/` | `V1 canonical` | Public CompanyCore home on the public layout. | Keep as public entry; do not require owner auth. |
| `/react-dashboard` | `V0 compatibility` | Dashboard alias only. | Keep temporarily, remove once no references use it. |
| `/dashboard` | `V1 canonical` | Whole-company Company Atlas. | Keep and extend carefully. |
| `/areas?area=:areaKey&view=:viewId` | `V1 canonical` | Department operating room with capability tabs. | Keep and deepen capability views. |
| `/areas` | `V0 rebuild` | All-areas mapping/lifecycle workbench; useful but not canonical owner flow. | Keep for admin/mapping, simplify later. |
| `/react-areas` | `V0 compatibility` | Alias to `/areas`. | Remove after route references are cleaned. |
| `/relationships` | `V0 rebuild` | Area-scoped relationship and provenance view. | Rebuild around selected area and confidence labels. |
| `/data` and `/data/:table` | `V0 rebuild` | Evidence browser tied to areas, workflows, and owner questions. | Rebuild table browsing into V1 evidence views. |
| `/tasks-adapter` | `V0 rebuild` | Area-scoped execution pressure, priorities, and owner/AI task handoff. | Rebuild as V1 tasks capability. |
| `/react-tasks` | `V0 compatibility` | Alias to tasks workbench. | Remove after references are cleaned. |
| `/pipeline` | `V0 rebuild` | Sales/operations workflow pressure tied to areas and decisions. | Rebuild as V1 workflow/pipeline capability. |
| `/settings/integrations` | `V0 rebuild` | Tab-aware entry into unified settings `Integrations`, showing provider readiness by area and workflow. | Rebuild, do not leave as provider directory. |
| `/react-integrations` | `V0 compatibility` | Alias to integration readiness. | Remove after references are cleaned. |
| `/settings` | `V0 rebuild` | Canonical unified settings entry with tabs for General, Integrations, Knowledge, Tools, API, MCP, and Access & audit. | Rebuild as one settings module, not ClickUp-only setup. |
| `/settings/drive` | `V0 rebuild` | Tab-aware entry into unified settings `Integrations` or `Knowledge`, focused on Drive connect, scope, import, map, and verify. | Rebuild as clean React setup/knowledge flow. |
| `/settings/api` | `V1 foundation` | Tab-aware entry into unified settings `API`, preserving owner/AI least-privilege safety. | Keep safety model, polish into unified settings workflow. |
| `/react-agent-tools` | `V1 foundation` | Tab-aware entry into unified settings `MCP` or `Tools`, preserving manifest inspection and safe agent delegation. | Keep MCP foundation, polish into unified settings workflow. |
| `/react-company-os` | `V1 foundation` | Company OS command/evidence cockpit. | Keep, contextualize from selected areas. |
| `/settings/account` | `V0 rebuild` | Quiet workspace/account/admin settings. | Rebuild after core owner journeys. |
| `/auth/login` | `V1 canonical` | Owner entry into Company Atlas on the public layout. | Keep and extend only inside public auth shell. |
| `/auth/register` | `V1 canonical` | Workspace bootstrap on the public layout. | Keep and extend only inside public auth shell. |

## Primary User Journeys

### Journey 1: Owner Opens Company

```text
/auth/login -> /dashboard -> /areas?area=01-strategia&view=overview
```

Goal: understand company state, pick a department, and inspect what matters.

V1 status:

- `/dashboard`: canonical.
- selected-area detail: canonical.
- next gap: capability-specific depth for `knowledge`, `tasks`, and `ai`.

### Journey 2: Owner Reviews Department Work

```text
/dashboard -> /areas?area=:areaKey&view=tasks -> /tasks-adapter
```

Goal: start from department context, then inspect execution pressure.

V1 status:

- selected-area entry is canonical.
- `/tasks-adapter` is V0 and must become a V1 area-scoped task capability.

### Journey 3: Owner Validates Knowledge Scope

```text
/areas?area=:areaKey&view=knowledge -> /settings/drive
```

Goal: see which Drive files/folders support the department and fix missing
knowledge ownership.

V1 status:

- selected-area knowledge preview is canonical foundation.
- `/settings/drive` is V0 and must become a V1 Drive setup/knowledge-scope
  workflow.

### Journey 4: Owner Delegates Safely To AI

```text
/areas?area=:areaKey&view=ai -> /react-agent-tools -> /settings/api
```

Goal: decide what Jarvis/Paperclip can safely read or do.

V1 status:

- selected-area AI entry is canonical.
- agent tools and API settings are V1 foundations, not yet fully area-aware.

### Journey 5: Owner Fixes Relationships

```text
/areas?area=:areaKey&view=resources -> /relationships
```

Goal: understand direct, provider-derived, inferred, missing, and unsupported
links that affect an area.

V1 status:

- selected-area resource evidence is canonical foundation.
- `/relationships` is V0 and should become an area-scoped provenance review.

## Build Order

1. Deepen selected-area `knowledge` view.
2. Deepen selected-area `tasks` view.
3. Rebuild `/settings` as the unified V1 settings module, using the canonical
   settings desktop/mobile targets and tab-aware entries for Drive, ClickUp,
   API, and MCP.
4. Rebuild `/tasks-adapter` as V1 execution-pressure capability.
5. Rebuild `/relationships` as V1 area provenance and confidence review.
6. Rebuild ClickUp setup inside unified settings rather than as the root
   settings route.
7. Rebuild `/settings/integrations` as a unified settings integrations tab.
8. Polish `/settings/api`, `/react-agent-tools`, and `/react-company-os` into
   area-aware V1 foundations.
9. Remove or hide compatibility aliases once no route references need them.

## Route Registry Rule

`web/src/app-route-registry.ts` carries a lightweight `uxStage` marker for
active routes. The documentation in this file is the human-readable source of
truth; the route registry marker keeps implementation work honest while agents
are editing code.

## Production Parity Status

Latest audit: `docs/ux/v1-production-canonical-discrepancy-audit-2026-05-15.md`.

Status on 2026-05-15: `blocked by deploy drift`.

Production web/API health reported `build.commit="b716f02"` while the current
V1 canonical web implementation exists in the local `9b575e2` working tree.
The production root still redirects to `/auth/login`, so it does not yet match
the V1 public home canonical target. Production login and registration also
use the older auth layout. Private dashboard and selected-area canonical views
could only be checked as signed-out redirects during this audit because no
production owner browser session was available.

The next required parity step is to commit and deploy the V1 canonical web
layer, confirm production health reports the deployed commit, then recapture
desktop/mobile public screenshots and authenticated desktop/tablet/mobile
private screenshots.
