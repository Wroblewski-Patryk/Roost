# Product Definition

## Product Identity

Roost is LuckySparrow's internal company operating system. It gives the owner
and supervised agents one workspace-scoped place to operate company work:
strategy and delivery, customer context, operating-model records,
integrations, knowledge, decisions, and governed automation.

`CompanyCore` is the legacy/runtime name that remains in API namespaces,
database and environment identifiers, integration names, and some source
files. It does not name a separate product. New product-facing documentation
should use **Roost**; technical references may use `CompanyCore` where they
identify an existing compatibility surface.

### Evidence Basis

This definition is derived from the approved [architecture direction](../architecture/architecture-source-of-truth.md), the
[system architecture](../architecture/system-architecture.md), the
[technology stack](../architecture/tech-stack.md), and the implemented
[runtime and route inventory](../operations/v1-code-surface-index.md). It does
not authorize new product scope or change existing API/database identifiers.

## Product Goal

- Core user problem: company operations and agent activity otherwise drift
  between tools, providers, and unscoped automation.
- Core promise: give an owner and approved agents a reliable, workspace-scoped
  operating record with an API/MCP boundary and a human control plane.
- Business intent: establish the web, backend, and MCP foundation required to
  run LuckySparrow operations safely before expanding into V2 visual, mobile,
  or gamified experiences.

## Target Users

- Primary user: the LuckySparrow workspace owner who configures integrations,
  reviews operating data, and performs governed business actions.
- Secondary user: supervised agents and automations (including local Codex
  Agent Hosts and Jarvis) that use workspace-scoped API keys or MCP tools.
- Early adopter profile: a small company operator who needs one accountable
  operational source of truth while continuing to use ClickUp and Google Drive.

## Current Product Surface

- A backend-served React owner console provides the public and authentication
  routes, account and workspace settings, the `00 General` dashboard and
  product map, and active workbenches for departments `01`-`12`.
- `11 Innovation` provides the Product Engineering source of truth for
  applications, capability definitions and application-specific target versus
  observed state, evidence, gaps, architecture, interfaces, and calculated
  readiness. `02 Products & Services` commercializes the same application
  records through product/service offerings. `04 Operations` provides a
  versioned procedure workbench for shared human and supervised-agent work.
- All active user-facing web routes render through the React bundle. `/areas`
  with an `area` and `view` query is the canonical department surface, with a
  small set of compatibility aliases normalized by the route registry. The
  retired vanilla console is not an active runtime path; backend capabilities
  without a current React view remain available through API/MCP contracts.
  Route ownership is recorded in `docs/operations/v1-code-surface-index.md`.
- PostgreSQL is the canonical operational data store. Human web clients and
  agent clients use the HTTP API; MCP is the preferred agent interface above
  that API.
- Native ClickUp and Google Drive adapters are workspace-scoped. n8n is an
  optional orchestrator, not the required operating path.
- The owner can queue a Codex run from a Roost task, observe its local execution
  from the VPS-hosted console, cancel or retry it, and review the reported diff,
  checks, final response, and task evidence before committing or deploying.

## Product Rules

- Key constraints: records, service keys, integration settings, and provider
  sync state are workspace-scoped; external tools do not write PostgreSQL
  directly.
- Trust or safety expectations: protected actions resolve the workspace before
  access, cross-workspace access fails closed, and significant state changes
  are auditable through events or logs.
- Data sensitivity notes: owner credentials, service API keys, and integration
  tokens are secret material and must not be returned in API responses or logs.
- UX complexity policy: the web console is the reliable human control plane;
  active screens use responsive, reusable React components, and retired legacy
  workbenches must not be described as available until rebuilt in React.

## Success Signals

- Usage success: an owner can bootstrap a workspace, manage its operating
  context and integrations, and complete the supported business-editor flows.
- Quality success: the API, MCP, and owner-console paths preserve workspace
  scoping, authentication, validation, events, and audit behavior.
- Delivery success: build, focused API/UI checks, migration review when
  applicable, and documented deployment/smoke gates provide evidence for the
  changed surface.
