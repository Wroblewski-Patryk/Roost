# Relationship Graph Audit

Last updated: 2026-05-14

## Purpose

This audit defines the current pre-V2 relationship graph truth for the web,
backend, and future MCP surface. It exists to prevent `/relationships`,
integration readiness, and AI tools from inventing links that are not already
supported by the database or approved inference rules.

Company City, strategy-game visuals, gamification, and native mobile remain V2
scope. The current foundation needs a trustworthy relationship read model that
helps owners and AI agents answer:

- what is linked to this workspace, area, table, provider item, Drive file, or
  business object;
- which links are direct versus inferred;
- which links need owner review;
- which actions can safely fix the relationship.

## Existing Relationship Sources

| Source | Current relationship shape | Status | Notes |
| --- | --- | --- | --- |
| `Workspace` | Owns operating model, provider mappings, Drive files, registry records, business objects, Company OS records, and agent events. | implemented | This is the mandatory boundary for all relationship reads and MCP tools. |
| `OperatingArea` | Direct parent of folders, tables, provider mappings, storage locations, knowledge roots, Drive files, and automation definitions. | implemented | This is the strongest existing organizing relationship for the owner shell. |
| `OperatingFolder` | Direct child of an operating area and parent/scope for operating tables plus mapped provider, storage, knowledge, Drive, and automation records. | implemented | Folder-level assignment exists in schema but current sidebar inventory is area-first. |
| `OperatingTable` | Direct child of area/folder and target for external container mappings, external field mappings, storage, knowledge, Drive, and automation definitions. | implemented | Business records are usually connected through the table route and `apiSlug`, not a table FK on every business record. |
| `ExternalContainerMapping` | Provider/entity/external ID mapped to optional operating area, folder, and table. | implemented | Current `/relationships` can review and assign ClickUp space/folder/list mappings by area. |
| `ExternalFieldMapping` | Provider field/external ID mapped to optional operating table and native field. | implemented | Field mapping is not yet surfaced in the relationship workbench. |
| `GoogleDriveFile` | Provider/external file or folder mapped to optional operating area, folder, table, storage location, and knowledge root. | implemented | Drive hierarchy uses `parentExternalId`, so parent-child links are provider-derived, not database FK-derived. |
| `StorageLocation` | Provider storage target scoped to optional area, folder, and table; can own Drive file records. | implemented | Empty containers are accepted until real owner/import flows populate them. |
| `KnowledgeRoot` | Provider knowledge target scoped to optional area, folder, and table; can own Drive file records. | implemented | Empty containers are accepted until real owner/import flows populate them. |
| `AutomationDefinition` | Provider/trigger definition scoped to optional area, folder, and table. | implemented | This is a registry definition, distinct from Company OS `AutomationRule`. |
| `Project -> Goal -> Target -> TaskList -> Task` | Business execution graph through direct optional FKs. | implemented | These records may have `workspaceId`, `source`, and `externalId`, but they do not directly point at operating tables. |
| `Client -> Deal -> Interaction/Note` | CRM relationship graph through direct optional FKs. | implemented | Useful for record-level graph detail, but not yet connected to `/relationships`. |
| `Note` and `Decision` | Optional links to project/task/client/deal or project. | implemented | They can become record-neighborhood nodes in a read graph. |
| `Resource` | Provider-neutral resource can link to owner role, project, process, artifacts, and dependencies. | implemented | It is part of Company OS graph detail but not part of vanilla `/relationships` yet. |
| `ToolAdapter -> IntegrationCapability` | Integration provider, health, capabilities, permissions, and risk. | implemented | This belongs in integration readiness and MCP authority views, then can be referenced by relationship graph. |
| `AgentEventOutbox` | Workspace-scoped provider/outbox delivery evidence. | partial | Events are evidence links rather than canonical resource links; they need cautious graph treatment. |

## Current Web Surface

| Surface | What it can show now | Gap |
| --- | --- | --- |
| Authenticated sidebar | Workspace selector and area resource counts for folders, tables, provider mappings, Drive files, storage, knowledge, and automation definitions. | It is area-first and does not show record-neighborhood graph details. |
| `/areas` / React areas route | Operating area tables, records, provider mappings, Drive files, and assignment controls through existing routes. | It focuses on area context, not a canonical multi-node relationship graph. |
| `/relationships` | Provider mappings plus Drive folders, with review queues and area assignment controls. | It omits external field mappings, storage locations, knowledge roots, automation definitions, Company OS resources, business object links, confidence, and MCP-readable graph shape. |
| `/settings/integrations` | Provider readiness, mapping counts, Drive counts, and integration matrix. | It does not yet consolidate relationship gaps into a single readiness queue. |
| `/react-company-os` | Operating graph detail from existing connection and Company OS collection reads. | It is a cockpit graph preview, not the canonical relationship review workbench. |
| `/react-agent-tools` | MCP tool manifest, risk, approval, and route family visibility. | It does not yet expose relationship-read tool readiness or sample graph reads. |

## Relationship Confidence Model

The next read API must return relationship confidence explicitly:

| Confidence | Meaning | Allowed examples |
| --- | --- | --- |
| `direct` | A database FK or direct relation field proves the edge. | `OperatingArea -> OperatingTable`, `GoogleDriveFile -> OperatingArea`, `Task -> Project`, `Deal -> Client`. |
| `provider_hierarchy` | The edge comes from provider external IDs and stored parent metadata. | `GoogleDriveFile.parentExternalId`, provider container hierarchy in mapping raw payload. |
| `route_inferred` | The edge is inferred from an operating table `apiSlug` and a workspace-scoped collection route. | `OperatingTable(apiSlug="tasks") -> Task records`. |
| `needs_review` | The record exists but has no operating area/table assignment or has an ambiguous assignment. | unmapped provider containers, unassigned Drive folders/files. |
| `unsupported` | A useful edge cannot be derived from current schema or existing read contracts without inventing data. | arbitrary resource-to-business-record edges without FK, free-form provider payload relations. |

The graph API and UI must never present `route_inferred` or
`provider_hierarchy` as if they were direct relationships.

## Missing Or Unsupported Links

| Gap | Impact | Required handling |
| --- | --- | --- |
| No canonical relationship graph endpoint. | UI and MCP must compose several endpoints and may diverge. | Add a read-only graph endpoint before expanding the workbench heavily. |
| No universal edge table. | Cross-domain links outside current FKs cannot be stored generically. | Do not add a generic edge table until a concrete user workflow needs editable custom links. |
| Provider hierarchy parent links are not normalized FKs. | Drive/provider tree can be read but not enforced by database constraints. | Mark as `provider_hierarchy`; use external IDs and workspace scope. |
| Business records lack direct operating table FKs. | Area-to-record counts depend on route/table inference. | Mark as `route_inferred`; keep table slug mapping visible. |
| Field mappings are absent from `/relationships`. | Owners cannot inspect provider field-to-native-field quality in the same review place. | Include field mapping rows in the next API and UI workbench slice. |
| Storage, knowledge, and automation definitions are scoped but empty by accepted decision. | UI could look incomplete if it treats emptiness as an error. | Show honest empty-ready states and real create/import paths later. |
| Agent events are evidence, not durable object links. | Graph could overstate event outbox as entity relationships. | Keep event edges in evidence/readiness panels unless a durable target relation exists. |

## Canonical Next Architecture

The read-only relationship graph API is now implemented:

1. `GET /v1/relationships/graph`
   - workspace-scoped;
   - no write behavior;
   - returns `nodes`, `edges`, `reviewItems`, and `unsupportedFamilies`;
   - every edge includes `confidence`, `sourceModel`, `sourceField`, and
     `actionHint` when a safe existing fix route exists.
2. `GET /v1/relationships/review-items`
   - optional narrower endpoint if `/graph` becomes too heavy;
   - returns only gaps that require owner attention.
3. MCP exposure
   - read-only capability first: `relationships:read`;
   - no relationship write tools until the owner UI and HTTP routes prove
     safe command-shaped fixes.

WEBFOUND-008A implemented item 1 and the read-only MCP capability exposure.
Item 2 remains optional and should be added only if `/graph` becomes too heavy
for a specific UI or MCP workflow.

## Implementation Boundaries

- Reuse existing operating model, Drive, integration, and Company OS read
  contracts before adding storage.
- Do not add demo links, seed fake relationships, or synthesize project/storage
  content.
- Do not create a generic relationship edge table in this phase.
- Relationship writes must remain existing scoped assignment routes until a
  separate command contract is approved.
- Every graph response must be workspace-scoped from auth context, not request
  body or query parameters.
