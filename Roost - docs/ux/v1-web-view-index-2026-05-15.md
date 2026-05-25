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

## Active Web Scope As Of WEB-CORE-001

As of 2026-05-16, the active web runtime is intentionally narrowed to the
approved current product slice:

- public home;
- owner login;
- owner registration;
- `00 General` at `/areas?area=00-ogolny&view=overview`;
- `04 Operations` at `/areas?area=04-operacje&view=overview`;
- `08 Assets` at `/areas?area=08-zasoby&view=overview`.

Former v0/v1 workbenches are not active web screens. Their backend APIs remain
available for future department-system rebuilds, but the web shell must not
surface them until a new scoped task accepts and verifies them.

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
| 00 Ogolny Dashboard | `/areas?area=00-ogolny&view=overview` | `V1 canonical` | `docs/architecture/autonomous-company-operating-system.md`; `docs/planning/cc-00-04-08-architecture-ux-audit.md` | `docs/ux/evidence/cc-audit-001-post-login-00-dashboard.png` | `docs/ux/evidence/cc-audit-001-08-assets-mobile.png` | What matters across the company, which department owns it, and what should I open next? | `docs/planning/cc-00-04-08-architecture-ux-audit-task-contract.md` |
| Selected Area Operating Room | `/areas?area=:areaKey&view=:viewId` | `V1 canonical` | `docs/ux/v1-area-detail-canonical-spec-2026-05-15.md` | `docs/ux/assets/companycore-v1-area-detail-desktop-canonical.png` | `docs/ux/assets/companycore-v1-area-detail-mobile-canonical.png` | What is happening inside this department, where is the proof, and what can I decide or delegate next? | `docs/planning/v1-area-detail-canonical-task-contract.md`; `docs/planning/v1-selected-area-knowledge-depth-task-contract.md`; `docs/planning/v1-selected-area-tasks-depth-task-contract.md`; `docs/ux/evidence/v1-area-knowledge-depth-desktop.png`; `docs/ux/evidence/v1-area-knowledge-depth-mobile.png`; `docs/ux/evidence/v1-area-tasks-depth-desktop.png`; `docs/ux/evidence/v1-area-tasks-depth-mobile.png` |
| Department Management Systems | `/areas?area=:areaKey&view=:viewId` for all 00-12 departments | `V1 target architecture` | `docs/ux/v1-department-management-systems-view-map.md` | to be generated per department | to be generated per department | How do I manage this department as a system with subsystems, evidence, actions, metrics, and AI handoff? | `docs/architecture/department-management-systems-architecture.md`; `docs/ux/v1-department-system-prompt-pack.md` |
| Unified Settings | `/settings` plus `/settings/integrations`, `/settings/drive`, `/settings/api`, and `/react-agent-tools` section entries | `Removed from active web` | `docs/ux/v1-settings-canonical-spec-2026-05-15.md` | historical only | historical only | This screen family is not active in the current web runtime. | Backend contracts remain for future rebuild; old web routes are no longer React app routes. |
| Operations Cockpit | `/operations` | `V0 compatibility` | `docs/planning/v1-operations-cockpit-task-contract.md` | historical only | historical only | `/operations` is now an alias into the active `04 Operations` selected-area view. | Rebuild any broader cockpit only from a new task contract. |
| Tasks & Delivery | `/tasks-adapter` | `Removed from active web` | `docs/planning/v1-tasks-delivery-workbench-task-contract.md` | historical only | historical only | This screen is not active in the current web runtime. | Backend task APIs remain for future Operations rebuilds. |
| Data Evidence Browser | `/data` and `/data/:table` | `Removed from active web` | `docs/planning/v1-data-evidence-browser-task-contract.md` | historical only | historical only | This screen is not active in the current web runtime. | Backend data APIs remain for future department-specific evidence views. |
| Relationship Provenance Review | `/relationships?area=:areaKey` | `Removed from active web` | `docs/planning/v1-relationship-provenance-review-task-contract.md` | historical only | historical only | This screen is not active in the current web runtime. | Backend relationship graph APIs remain for future relationship-system rebuilds. |

## Active Route Index

Department management system route inventory:
`docs/ux/v1-department-management-systems-view-map.md`.

Prompt pack for generating department specs, concepts, implementation plans,
and Paperclip/AI packets: `docs/ux/v1-department-system-prompt-pack.md`.

| Route | Current Status | V1 Direction | Keep / Rebuild / Remove |
| --- | --- | --- | --- |
| `/` | `V1 canonical` | Public CompanyCore home on the public layout. | Keep as public entry; do not require owner auth. |
| `/auth/login` | `V1 canonical` | Owner entry into `00 General`. | Keep and extend only inside public auth shell. |
| `/auth/register` | `V1 canonical` | Workspace bootstrap. | Keep and extend only inside public auth shell. |
| `/areas?area=00-ogolny&view=overview` | `V1 canonical` | Company dashboard after login, connecting the 12 planned departments while only opening verified active systems. | Keep as the only authenticated home/dashboard. |
| `/dashboard` and `/react-dashboard` | `V0 compatibility` | Alias into `/areas?area=00-ogolny&view=overview`. | Keep temporarily; do not build a second dashboard surface. |
| `/areas` | `V0 compatibility` | Bare selected-area entry normalizes to `00 General`. | Keep only as compatibility. |
| `/areas?area=04-operacje&view=overview` | `V1 canonical` | Operations management system over verified work item packet. | Keep and deepen only through Operations task contracts. |
| `/operations` | `V0 compatibility` | Alias into `/areas?area=04-operacje&view=overview`. | Keep temporarily; do not restore the old cockpit. |
| `/areas?area=08-zasoby&view=overview` | `V1 canonical` | Assets and knowledge management system over verified resource packet. | Keep and deepen only through Assets task contracts. |
| Old private web paths such as `/settings`, `/settings/api`, `/settings/drive`, `/relationships`, `/data`, `/tasks-adapter`, `/pipeline`, `/react-agent-tools`, and `/react-company-os` | `Removed from active web` | Backend remains available, but these addresses are not React app routes. | Rebuild only from a new accepted department-system or admin/settings task contract. |

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
2. Polish `/react-company-os` into
   area-aware V1 foundations.
3. Remove or hide compatibility aliases once no route references need them.

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
