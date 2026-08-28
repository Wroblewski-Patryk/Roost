# MVP Scope

## In Scope

- Owner/workspace authentication and workspace-scoped service API keys.
- React owner-console views for authentication, account/workspace settings,
  the `00`-`12` department surfaces, and their accepted dashboard/workbench
  slices.
- API/MCP control of workspace-scoped operating data, service keys,
  integrations, relationships, and accepted typed business records.
- HTTP API and MCP access to the same governed operational source of truth.
- Workspace-scoped ClickUp sync/webhooks and Google Drive connection, selected
  folder, metadata/content, Docs, and Sheets foundation.

## Out Of Scope

- Native mobile, Company City, and gamification.
- Invitations, advanced RBAC, billing, and a full CRM suite.
- React UI parity for every backend capability or restoration of retired
  legacy owner-console routes.

## MVP Quality Bar

- Minimum usable flows: owner authentication, workspace-safe business/editor
  actions, integration setup and sync, and API/MCP access using the same
  workspace boundary.
- Required validation: focused build/API/UI checks appropriate to the changed
  surface, including workspace scoping and denied access when applicable.
- Required deployment readiness: documented migration, health, owner-console,
  protected API, integration, and event-readback smoke gates.
