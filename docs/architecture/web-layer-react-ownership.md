# Web Layer React Ownership

Last updated: 2026-05-15

## Decision

CompanyCore web UI is React-owned. The backend may still serve static files,
health endpoints, and JSON APIs, but user-facing web routes must render through
the Vite React bundle in `public/react/index.html`.

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
- `/relationships`
- `/data`
- `/data/:table`
- `/tasks-adapter`
- `/pipeline`
- `/settings`
- `/settings/account`
- `/settings/integrations`
- `/settings/drive`
- `/settings/api`
- `/react-agent-tools`
- `/react-company-os`
- `/react-areas`
- `/react-dashboard`
- `/react-integrations`
- `/react-tasks`

API hosts still use the existing JSON API behavior. Protected backend contracts
remain under `/v1/*` and root protected compatibility routes.

## Implementation Rules

- New web UI must be implemented in `web/src/` using React, Tailwind, DaisyUI,
  and existing shared route-kit helpers.
- Do not reintroduce page-local vanilla JavaScript for product routes.
- Shared data fetching, auth redirect behavior, and route primitives should
  live in React helpers or route-kit modules, not global browser scripts.
- React views must consume existing backend endpoints. UI may simplify a
  workflow during migration, but it must not fake backend state.
- Deep workflows that were previously only vanilla must be rebuilt as React
  slices against the existing backend contracts.

## Current React Coverage

The first consolidation slice covers the active web routing layer and baseline
React views for:

- owner login and registration
- Company Atlas dashboard
- operating areas
- relationship graph review
- data table browsing
- tasks workbench
- pipeline / CRM
- integration health
- Google Drive status and imported files
- agent API keys
- account context
- ClickUp bridge status
- Company OS cockpit
- MCP tool surface

## Known Follow-Up

The legacy ClickUp token discovery and list-selection form is intentionally not
copied as vanilla. The current React `/settings` route shows real ClickUp
connection status from `/v1/connection`; a later React slice should rebuild the
guided connector form against:

- `POST /v1/integration-settings/clickup/discover`
- `PUT /v1/integration-settings/clickup`
- `POST /v1/integration-settings/clickup/maintenance/run`

The Google Drive React route currently exposes readiness, imported files, and
safe import/reconcile actions. A later React slice should rebuild the full OAuth
client, folder discovery, selection, and exchange workflow if owner re-consent
must happen through the browser UI.

