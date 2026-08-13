# MVP Scope

## In Scope

- Owner/workspace authentication and workspace-scoped service API keys.
- Owner-console control of operating data, API keys, integration settings,
  operating areas, relationships, and accepted typed business editors.
- HTTP API and MCP access to the same governed operational source of truth.
- Workspace-scoped ClickUp sync/webhooks and Google Drive connection, selected
  folder, metadata/content, Docs, and Sheets foundation.

## Out Of Scope

- Native mobile, Company City, and gamification.
- Invitations, advanced RBAC, billing, and a full CRM suite.
- A requirement to migrate every vanilla owner-console route to React in V1.

## MVP Quality Bar

- Minimum usable flows: owner authentication, workspace-safe business/editor
  actions, integration setup and sync, and API/MCP access using the same
  workspace boundary.
- Required validation: focused build/API/UI checks appropriate to the changed
  surface, including workspace scoping and denied access when applicable.
- Required deployment readiness: documented migration, health, owner-console,
  protected API, integration, and event-readback smoke gates.
