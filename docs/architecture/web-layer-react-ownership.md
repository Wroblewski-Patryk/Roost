# Web Layer React Ownership

Last updated: 2026-05-20

## Decision

CompanyCore web UI is React-owned. The backend may still serve static files,
health endpoints, and JSON APIs, but user-facing web routes must render through
the Vite React bundle in `public/react/index.html`.

As of 2026-05-16, `/` is the canonical public home route and
`/areas?area=00-ogolny&view=overview` is the canonical authenticated
post-login landing route. `/dashboard` and `/react-dashboard` remain temporary
compatibility aliases that redirect to the `00 Ogolny` selected-area
dashboard.

As of WEB-CORE-001 on 2026-05-16, the active React web product was
intentionally narrowed. As of the 2026-05-20 function audit, the active web
views are public home, login, registration, `00 General`, `04 Operations`,
`06 People / Agents`, `08 Assets`, account settings, and workspace settings.
Historical v0/v1 workbenches such as data, relationships, tasks, pipeline,
Company OS cockpit, MCP catalog, and provider-specific setup consoles are not
active web screens unless they have been rebuilt through the React route
registry. Their backend APIs remain in place for future department-system
rebuilds.

React route metadata now lives in `web/src/app-route-registry.ts`. That file is
the source of truth for the current active route set, compatibility aliases,
shell navigation entries, route titles, and safe post-auth redirect
normalization. Future web views must extend the registry and the view index
only after a scoped department-system task accepts them.

The legacy vanilla owner console files under `public/` are removed from the
active runtime path:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/relationship-workbench.js`
- `public/google-drive-workbench.js`

## Route Ownership

The Express web host serves the React bundle for:

- `/`
- `/auth/login`
- `/auth/register`
- `/dashboard`
- `/areas`
- `/operations`
- `/people-agents`
- `/workforce`
- `/account/settings`
- `/workspace/settings`
- `/react-dashboard`

Active private route behavior:

- `/areas?area=00-ogolny&view=overview`: canonical `00 General` dashboard.
- `/areas?area=04-operacje&view=tasks`: `04 Operations` task board.
- `/areas?area=04-operacje&view=calendar`: `04 Operations` calendar.
- `/areas?area=06-kadry&view=directory`: `06 People / Agents` directory.
- `/areas?area=08-zasoby&view=overview`: `08 Assets` overview.
- `/areas?area=08-zasoby&view=files`: `08 Assets` files and folders.
- `/dashboard`, `/react-dashboard`, and bare `/areas`: compatibility entries
  that normalize to the `00 General` dashboard.
- `/operations`: compatibility entry that normalizes to the `04 Operations`
  selected-area view.
- `/people-agents` and `/workforce`: compatibility entries that normalize to
  the `06 People / Agents` directory.
- `/account/settings` and `/workspace/settings`: lightweight authenticated
  settings surfaces for account/workspace context.

Old private web paths are no longer served as React app routes. If a future
screen needs one of those addresses, it must be reintroduced through a scoped
task contract and route-registry update.

API hosts still use the existing JSON API behavior. Protected backend contracts
remain under `/v1/*` and root protected compatibility routes.

## Implementation Rules

- New web UI must be implemented in `web/src/` using React, Tailwind, DaisyUI,
  and existing shared CompanyCore primitives.
- Do not reintroduce page-local vanilla JavaScript for product routes.
- Shared data fetching, auth redirect behavior, and route primitives should
  live in React helpers or route-kit modules, not global browser scripts.
- Add new authenticated views through `web/src/app-route-registry.ts` first,
  then bind the route component in `web/src/main.tsx`. Do this only from an
  accepted department-system task contract.
- Shared shell navigation must be derived from the route registry so desktop
  and mobile route chrome stay consistent.
- React views must consume existing backend endpoints. UI may simplify a
  workflow during migration, but it must not fake backend state.
- Deep workflows that were previously only vanilla must be rebuilt as React
  slices against the existing backend contracts.

## Current React Coverage

The current active React coverage is:

- public home;
- owner login;
- owner registration;
- `00 General` post-login dashboard;
- `04 Operations` task board and calendar;
- `06 People / Agents` directory;
- `08 Assets` management read view and files/folders workbench;
- account settings;
- workspace settings.
No old private workbench component remains in the active `web/src` bundle.

These views consume existing backend contracts where applicable. The removed
web views are not deleted from backend architecture; they are simply not active
as user-facing screens until rebuilt as department-specific management systems.

## Area Detail Routing

The active area-first surface uses `/areas?area=:areaKey&view=:viewKey` for
the approved management systems. Only these department keys are active in web:

- `00-ogolny`
- `04-operacje`
- `06-kadry`
- `08-zasoby`

Other `00`-`12` departments may be displayed as planned architecture context
inside `00 General`, but they must not open unfinished web screens before a
new scoped implementation task rebuilds them.

## Known Follow-Up

Settings, data, relationship review, tasks, pipeline, Company OS cockpit, MCP
catalog, and connector workbenches are future rebuild candidates, not active
web surfaces. Reintroduce them only through a department-specific management
system or explicit admin/settings task contract.
