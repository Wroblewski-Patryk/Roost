# V1 Web View Index

Date: 2026-05-15
Last updated: 2026-05-16
Stage: verified implementation index
Owner: Frontend Builder + Product Docs

## Purpose

This index marks the current CompanyCore web views by UX maturity so future
work can move from the old route/module-shaped app into a useful V1 company
management layer.

As of 2026-05-16, the target V1 direction is department management systems:
each of the 13 Company Atlas areas is a scalable department system composed
from shared CompanyCore tables, pipelines, tasks, knowledge, resources,
metrics, decisions, governance, and AI/MCP tools. The detailed system view map
lives in `docs/ux/v1-department-management-systems-view-map.md`.

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
| Department Management Systems | `/areas?area=:areaKey&view=:viewId` for all 00-12 departments | `V1 target architecture` | `docs/ux/v1-department-management-systems-view-map.md` | to be generated per department | to be generated per department | How do I manage this department as a system with subsystems, evidence, actions, metrics, and AI handoff? | `docs/architecture/department-management-systems-architecture.md`; `docs/ux/v1-department-system-prompt-pack.md` |
| Unified Settings | `/settings` plus `/settings/integrations`, `/settings/drive`, `/settings/api`, and `/react-agent-tools` section entries | `V1 canonical` | `docs/ux/v1-settings-canonical-spec-2026-05-15.md` | `docs/ux/assets/companycore-v1-settings-desktop-canonical.png` | `docs/ux/assets/companycore-v1-settings-mobile-canonical.png` | Where do I paste connector credentials, set active/sync policy, create Jarvis/Paperclip keys, and find MCP handoff fields without entering operational queues? | `docs/planning/v1-settings-react-implementation-task-contract.md`; `docs/ux/evidence/v1-settings-unified-proof-desktop.png`; `docs/ux/evidence/v1-settings-unified-proof-mobile.png`; `docs/ux/evidence/v1-settings-real-backend-desktop.png`; `docs/ux/evidence/v1-settings-drive-save-real-backend-desktop.png`; `docs/ux/evidence/v1-settings-real-backend-mobile.png` |
| Operations Cockpit | `/operations` | `V1 canonical` | `docs/planning/v1-operations-cockpit-task-contract.md` | `docs/ux/evidence/v1-operations-cockpit-real-backend-desktop.png` | `docs/ux/evidence/v1-operations-cockpit-real-backend-mobile.png` | What do I need to supervise now across clients, tasks, department evidence, files, and AI-agent handoff? | `docs/planning/v1-operations-cockpit-task-contract.md`; `docs/ux/assets/companycore-v1-operations-cockpit-concept.png`; `docs/ux/evidence/v1-operations-cockpit-real-backend-desktop.png`; `docs/ux/evidence/v1-operations-cockpit-real-backend-mobile.png` |
| Tasks & Delivery | `/tasks-adapter` | `V1 canonical` | `docs/planning/v1-tasks-delivery-workbench-task-contract.md` | `docs/ux/evidence/v1-tasks-delivery-real-backend-desktop.png` | `docs/ux/evidence/v1-tasks-delivery-real-backend-mobile.png` | What execution pressure needs owner direction, and what task can I create or move now? | `docs/planning/v1-tasks-delivery-workbench-task-contract.md`; `docs/ux/assets/companycore-v1-tasks-delivery-concept.png`; `docs/ux/evidence/v1-tasks-delivery-real-backend-desktop.png`; `docs/ux/evidence/v1-tasks-delivery-real-backend-mobile.png` |
| Data Evidence Browser | `/data` and `/data/:table` | `V1 foundation` | `docs/planning/v1-data-evidence-browser-task-contract.md` | `docs/ux/evidence/v1-data-evidence-browser-desktop.png` | `docs/ux/evidence/v1-data-evidence-browser-mobile.png` | Which department owns this evidence, can agents read it, what is empty, and where do I inspect records? | `docs/planning/v1-data-evidence-browser-task-contract.md`; `docs/ux/evidence/v1-data-evidence-browser-desktop.png`; `docs/ux/evidence/v1-data-evidence-browser-mobile.png` |

## Active Route Index

Department management system route inventory:
`docs/ux/v1-department-management-systems-view-map.md`.

Prompt pack for generating department specs, concepts, implementation plans,
and Paperclip/AI packets: `docs/ux/v1-department-system-prompt-pack.md`.

| Route | Current Status | V1 Direction | Keep / Rebuild / Remove |
| --- | --- | --- | --- |
| `/` | `V1 canonical` | Public CompanyCore home on the public layout. | Keep as public entry; do not require owner auth. |
| `/react-dashboard` | `V0 compatibility` | Dashboard alias only. | Keep temporarily, remove once no references use it. |
| `/dashboard` | `V1 canonical` | Whole-company Company Atlas. | Keep and extend carefully. |
| `/operations` | `V1 canonical` | Owner supervision cockpit for clients, tasks, department files/tables, and AI-agent handoff. | Keep as the cross-perspective command surface; deepen downstream workbenches instead of turning it into raw admin CRUD. |
| `/areas?area=:areaKey&view=:viewId` | `V1 canonical` | Department operating room with capability tabs. | Keep and deepen capability views. |
| `/areas` | `V0 rebuild` | All-areas mapping/lifecycle workbench; useful but not canonical owner flow. | Keep for admin/mapping, simplify later. |
| `/react-areas` | `V0 compatibility` | Alias to `/areas`. | Remove after route references are cleaned. |
| `/relationships` | `V0 rebuild` | Area-scoped relationship and provenance view. | Rebuild around selected area and confidence labels. |
| `/data` and `/data/:table` | `V1 foundation` | Evidence browser tied to areas, workflows, source routes, and agent-readable context. | Keep and deepen with typed table actions only where existing backend contracts support them. |
| `/tasks-adapter` | `V1 canonical` | Area-scoped execution pressure, priorities, task creation, status movement, and owner/AI task handoff. | Keep as the delivery workbench; add deeper area ownership only after a backend relation exists. |
| `/react-tasks` | `V0 compatibility` | Alias to tasks workbench. | Remove after references are cleaned. |
| `/pipeline` | `V0 rebuild` | Sales/operations workflow pressure tied to areas and decisions. | Rebuild as V1 workflow/pipeline capability. |
| `/settings/integrations` | `V1 canonical` | Tab-aware entry into unified settings `Integrations`, with ClickUp selected by default. | Keep as section entry; move operational review queues to dedicated work views. |
| `/react-integrations` | `V0 compatibility` | Alias to integration readiness. | Remove after references are cleaned. |
| `/settings` | `V1 canonical` | Canonical unified settings entry with sections for Integrations, Agent keys, and MCP. | Keep as contextual connector settings, not a sync dashboard. |
| `/settings/drive` | `V1 canonical` | Section-aware entry into unified settings `Integrations`, with Google Drive selected. | Keep settings fields here; move deep content-quality reviews to dedicated work views. |
| `/settings/api` | `V1 canonical` | Section-aware entry into unified settings `Agent keys`, preserving owner/AI least-privilege safety. | Keep minimal Jarvis/Paperclip key setup. |
| `/react-agent-tools` | `V1 canonical` | Section-aware entry into unified settings `MCP`, preserving manifest URL and local command fields. | Keep large MCP catalog outside the first settings view. |
| `/react-company-os` | `V1 foundation` | Company OS command/evidence cockpit. | Keep, contextualize from selected areas. |
| `/settings/account` | `V0 rebuild` | Quiet workspace/account/admin settings. | Rebuild after core owner journeys. |
| `/auth/login` | `V1 canonical` | Owner entry into Company Atlas on the public layout. | Keep and extend only inside public auth shell. |
| `/auth/register` | `V1 canonical` | Workspace bootstrap on the public layout. | Keep and extend only inside public auth shell. |

## Primary User Journeys

### Journey 1: Owner Opens Company

```text
/auth/login -> /dashboard -> /operations -> /areas?area=01-strategia&view=overview
```

Goal: understand company state, pick a department, and inspect what matters.

V1 status:

- `/dashboard`: canonical.
- `/operations`: canonical.
- selected-area detail: canonical.
- next gap: capability-specific depth for `knowledge`, `tasks`, and `ai`.

### Journey 1A: Owner Runs The Company

```text
/operations -> create client or task -> /tasks-adapter or /data
```

Goal: create the next operational item and see where clients, tasks, tables,
files, and AI handoff stand.

V1 status:

- `/operations`: canonical with local real-backend proof.
- next gap: production smoke and deeper downstream task/data/relationship
  workbench routes.

### Journey 2: Owner Reviews Department Work

```text
/dashboard -> /areas?area=:areaKey&view=tasks -> /tasks-adapter
```

Goal: start from department context, then inspect execution pressure.

V1 status:

- selected-area entry is canonical.
- `/tasks-adapter` is canonical for delivery pressure, task creation, status
  movement, and AI handoff.

### Journey 3: Owner Validates Knowledge Scope

```text
/areas?area=:areaKey&view=knowledge -> /settings/drive
```

Goal: see which Drive files/folders support the department and fix missing
knowledge ownership.

V1 status:

- selected-area knowledge preview is canonical foundation.
- `/settings/drive` is a V1 settings entry for Drive credentials and sync
  policy; deeper Drive content review belongs in dedicated work views.

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

1. Deploy and run production smoke for `/operations`, AOG, and settings before raising production
   confidence.
2. Rebuild `/relationships` as V1 area provenance and confidence review.
3. Deepen selected-area `knowledge` view.
4. Deepen selected-area `tasks` view.
5. Polish `/react-company-os` into
   area-aware V1 foundations.
6. Remove or hide compatibility aliases once no route references need them.

## Route Registry Rule

`web/src/app-route-registry.ts` carries a lightweight `uxStage` marker for
active routes. The documentation in this file is the human-readable source of
truth; the route registry marker keeps implementation work honest while agents
are editing code.

## Production Parity Status

Latest audit: `docs/ux/v1-production-canonical-discrepancy-audit-2026-05-15.md`.

Status on 2026-05-15: `public and signed-out skeleton deployed`.

Production web/API health now reports
`build.commit="ff5e04192db93a53280fab58bcd8f47cba30f554"` and image
`rnqqkhl3o3dut4qv56mlxly2_backend:ff5e041`. The production root serves the V1
public home, and production login/registration use the V1 public layout.
Desktop/mobile screenshot proof is in
`docs/ux/evidence/production-v1-ff5e041-2026-05-15/`.

Private dashboard and selected-area canonical views were checked only as
signed-out redirects in this pass because no production owner browser session
was available. The remaining parity step is authenticated production
desktop/tablet/mobile screenshots for `/dashboard` and selected-area detail.
