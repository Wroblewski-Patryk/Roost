# Database

Primary keys are UUIDs. Tables include `created_at`, `updated_at`, and
integration fields such as `external_id` and `source` where relevant.

## Tables

- `users`: human account records for owner login.
- `workspaces`: workspace containers owned by users.
- `workspace_memberships`: future-proof membership table; v1 activates only
  the `owner` role.
- `projects`: company projects and strategic work containers.
- `goals`: outcomes, optionally linked to projects.
- `targets`: measurable targets, optionally linked to goals.
- `task_lists`: task grouping layer, optionally linked to projects.
- `tasks`: operational tasks linked to projects, goals, targets, or task lists.
- `clients`: CRM contacts or companies.
- `pipeline_stages`: shared workflow/status stages that CRM and other
  departments can use.
- `deals`: sales opportunities linked to clients and pipeline stages.
- `interactions`: CRM interactions linked to clients.
- `notes`: notes linked to projects, tasks, clients, or deals.
- `decisions`: recorded decisions, usually linked to projects.
- `agents`: AI agents such as Paperclip/Jarvis workers.
- `agent_logs`: logs emitted by agents.
- `events`: append-style system events for important changes.
- `company_roles`: human, agent, and system roles with responsibilities,
  permissions, allowed tools, escalation targets, and default policies.

The target unified workforce direction is documented in
`docs/architecture/unified-organizational-operating-system.md`. Current
`users`, `agents`, `company_roles`, `business_functions`, service API keys,
capabilities, tasks, workflow runs, approvals, events, and audit logs are the
foundation for humans and AI agents as organizational workforce members. A
future shared workforce/member, rank, supervisor, delegation, escalation, or
contextual visibility schema must start from a scoped audit or read model
instead of duplicating these existing foundations.
- `processes`: durable company processes owned by roles and mapped to
  departments/categories, maturity, policy references, and metric references.
- `pipelines`: reusable workflow definitions linked to processes, owners,
  trigger types, input/output schemas, automation flags, status, version, and
  risk.
- `pipeline_stages`: ordered pipeline stages; the original CRM-compatible
  stage table now also supports pipeline ownership, expected input/output,
  entry/exit conditions, role assignment, procedure links, required tools,
  approval hints, duration, failure strategy, retry policy, and validated
  `OperatingStatus`.
- `procedures`: standard operating procedures linked to processes, pipeline
  stages, tools, permissions, expected result, owner role, and quality
  standard.
- `procedure_steps`: ordered SOP steps for manual, automated, agent,
  human-review, and integration-call work.
- `standards`: versioned quality standards for operations, code, UX,
  documentation, security, task structure, Drive structure, and agent prompts,
  including `OperatingStatus` for soft archive behavior.
- `resources`: provider-neutral resources such as ClickUp tasks, Drive files,
  folders, GitHub repos, database tables, documents, automations, prompts, and
  API endpoints.
- `tool_adapters`: workspace-scoped integration adapter definitions for
  ClickUp, Google Drive, Gmail, GitHub, Coolify, n8n, and custom providers.
- `integration_capabilities`: provider-neutral adapter capabilities with
  required permissions, schemas, risk, approval, and audit flags.
- `pipeline_runs`: concrete pipeline executions with initiating actor,
  current stage, input/output payloads, linked task/document IDs, optional
  client/project links, status, timestamps, error state, and correlation ID.
- `stage_runs`: concrete execution records for pipeline stages, including
  assigned actor, logs, validation result, approval status, input/output, and
  timestamps.
- `approvals`: approval requests for risky user, agent, system, or integration
  actions, with approver role/user, risk level, decision reason, expiry, and
  optional run/stage-run links.
- `checklist_templates`: reusable completion checklist definitions for tasks,
  pipeline stages, procedures, pipeline runs, and stage runs.
- `checklist_items`: ordered checklist template items with required/optional
  flags and verification type.
- `acceptance_criteria`: target-specific completion criteria with validation
  status, verifier, evidence, and optional run/stage-run links.
- `audit_logs`: append-style action evidence with actor, resource, tool
  adapter, input, output, approval, errors, run links, and correlation ID.
- `policies`: policy-driven rules with severity, enforcement mode, escalation
  role, and optional process/procedure links.
- `metrics`: KPI definitions with measurement type, unit, target/current
  values, calculation metadata, owner, and process/pipeline links.
- `risks`: process and pipeline risk records.
- `controls`: controls that reduce risks through approvals, tests, snapshots,
  permission limits, validation gates, and rollback plans.
- `knowledge_items`: company knowledge linked to processes, pipelines,
  projects, clients, agents, and external document sources.
- `decision_logs`: structured decisions with context, options, chosen option,
  reason, consequences, and review date.
- `automation_rules`: condition/action rules that can launch or escalate
  Company OS workflows.
- `triggers`: manual, schedule, webhook, provider-event, agent-decision, and
  system-event trigger records.
- `artifacts`: concrete work outputs such as reports, documents, branches,
  pull requests, pages, graphics, prompts, contracts, and invoices.
- `dependencies`: dependencies between resources and runtime or business
  entities.
- `business_functions`: LuckySparrow department/business-function catalog with
  accountable roles.
- `stakeholders`: client, internal, partner, vendor, and other stakeholders.
- `api_keys`: workspace-scoped service credentials for agents and automations.
- `integration_settings`: workspace-scoped provider configuration and protected
  secret material, starting with ClickUp.
- `google_drive_files`: workspace-scoped Google Drive folder/file metadata.
- `google_drive_content_snapshots`: extracted searchable text, summary,
  preview, and scan state for Drive files.

## Organizational Bridge Concept Map

The accepted product direction includes a user-facing target vocabulary for the
organizational operating system. Implementation should reuse the current schema
first, then add migrations only for real gaps:

| Target concept | Current or preferred table/model |
| --- | --- |
| `departments` | `operating_areas`, `business_functions` |
| `agents` | `agents` |
| `agent_roles` | `company_roles` |
| `process_domains` | future taxonomy linked to `processes` |
| `responsibilities` | `company_roles`, `business_functions`, future explicit responsibility rows |
| `governance_rules` | `policies`, `controls`, `risks`, approvals |
| `workflows` | `processes`, `pipelines`, `workflow_definition_drafts` |
| `workflow_steps` | `pipeline_stages`, `procedures`, `procedure_steps`, `stage_runs` |
| `permissions` | API key scopes, capabilities, `integration_capabilities`, future role permissions |
| `tools` | `tool_adapters`, `integration_capabilities`, MCP manifest tools |
| `knowledge_sources` | `knowledge_roots`, `knowledge_items`, `google_drive_files`, content snapshots |
| `kpis` | `metrics` |
| `audit_logs` | `audit_logs` |
| `decision_logs` | `decision_logs`, legacy `decisions` |

Do not create duplicate tables for these concepts until an approved task proves
the existing model cannot express the required ownership, workflow, governance,
or MCP behavior.

## Operating Registry

The schema includes a registry that keeps business areas, folders, tables, API
surfaces, storage, knowledge roots, automations, and provider mappings aligned.
Registration and seed/bootstrap paths create the standard operating model for
each workspace.

Target hierarchy:

```text
workspaces
  -> operating_areas
  -> operating_folders
  -> operating_tables
  -> business records
```

ClickUp mapping:

```text
workspaces.id
  -> ClickUp team_id / Workspace
operating_areas.external mapping
  -> ClickUp Space
operating_folders.external mapping
  -> ClickUp Folder
operating_tables.external mapping
  -> ClickUp List
business record external mapping
  -> ClickUp Task or provider-specific entity
```

The approved business areas are fixed catalog values owned by CompanyCore:

| Area | Example current/future tables |
| --- | --- |
| Strategy and governance | `goals`, `targets`, `policies`, `metrics`, `risks`, `controls` |
| Projects and delivery | `projects`, future milestones/releases |
| Tasks and workflow | `task_lists`, `tasks`, `pipelines`, `pipeline_stages`, `pipeline_runs`, `stage_runs`, `checklist_templates`, `checklist_items`, `acceptance_criteria`, future statuses/checklists |
| Sales and CRM | `clients`, `deals`, `interactions`, `stakeholders` |
| Marketing and growth | future campaigns, experiments, channels |
| Finance and billing | future invoices, expenses, subscriptions |
| People and roles | `company_roles`, future teammates, responsibilities, role maps |
| Operations and administration | `procedures`, `procedure_steps`, `approvals`, `dependencies`, `business_functions`, future vendors and assets |
| Knowledge and decisions | `notes`, `decisions`, `decision_logs`, `knowledge_items`, `standards`, future docs index |
| Assets and storage | `resources`, `artifacts`, future file/storage objects and media references |
| Automations and integrations | `tool_adapters`, `integration_capabilities`, `automation_rules`, `triggers`, `integration_settings`, future automations |
| AI agents and observability | `agents`, `agent_logs`, `events`, `audit_logs` |

System tables remain outside the 12 business areas:

- `users`
- `workspaces`
- `workspace_memberships`
- `api_keys`
- provider mapping tables
- migration, audit, schema, and platform metadata tables

Registry tables:

- `operating_areas`: one row per approved area per workspace, with a stable
  area key and `is_system` metadata that protects CompanyCore catalog areas
  from owner/agent deletion.
- `operating_folders`: workspace and area-owned grouping layer equivalent to a
  ClickUp Folder.
- `operating_tables`: registry rows for each business table or custom table,
  with `workspace_id`, optional `operating_area_id`,
  optional `operating_folder_id`, stable `api_slug`, storage and knowledge
  references, and sync policy.
- `external_container_mappings`: provider IDs for ClickUp Workspaces, Spaces,
  Folders, Lists, Views, and equivalent future systems.
- `external_field_mappings`: provider field definitions and links to
  CompanyCore fields, including ClickUp Custom Field metadata.
- `storage_locations`: local disk, object storage, Google Drive folder, or
  other provider roots for a workspace/folder/table.
- `knowledge_roots`: Obsidian Markdown branch, Google Drive Docs root, or
  other durable knowledge base root for a workspace/folder/table.
- `automation_definitions`: workspace/folder/table-scoped automations and
  provider triggers.
- `processes`, `pipelines`, `procedures`, `company_roles`, `resources`,
  `tool_adapters`, and `integration_capabilities`: Company OS foundation
  records used to describe what the company does, how work flows, how stages
  are performed, who or what is accountable, what resources are touched, and
  which tool capabilities are allowed.
- `pipeline_runs`, `stage_runs`, `approvals`, `checklist_templates`,
  `checklist_items`, `acceptance_criteria`, and `audit_logs`: Company OS
  runtime evidence records used to prove what happened, who or what acted,
  which approval or checklist applied, and how events correlate across a
  workflow.
- `policies`, `metrics`, `risks`, `controls`, `knowledge_items`,
  `decision_logs`, `automation_rules`, `triggers`, `artifacts`,
  `dependencies`, `business_functions`, and `stakeholders`: Company OS
  governance intelligence records used to make agent behavior policy-driven,
  measurable, risk-aware, explainable, and tied to real business functions and
  stakeholders.

The operating model API exposes these registry records through
`/v1/operating-model`. Storage locations, knowledge roots, and automation
definitions can be created through that API after their optional area, folder,
or table scope has been validated inside the active workspace.

Runtime routes should eventually resolve table API behavior through
`operating_tables.api_slug` or an equivalent registry lookup, while preserving
explicit typed routes for the stable first-party domain tables.

Implemented first-party table assignments:

| Area | Tables |
| --- | --- |
| Strategy and governance | `goals`, `targets`, `policies`, `metrics`, `risks`, `controls` |
| Projects and delivery | `projects` |
| Tasks and workflow | `task_lists`, `tasks`, `pipelines`, `pipeline_stages`, `pipeline_runs`, `stage_runs`, `workflow_definition_drafts`, `checklist_templates`, `checklist_items`, `acceptance_criteria` |
| Sales and CRM | `clients`, `deals`, `interactions`, `stakeholders` |
| People and roles | `company_roles` |
| Operations and administration | `procedures`, `procedure_steps`, `approvals`, `dependencies`, `business_functions` |
| Knowledge and decisions | `notes`, `decisions`, `decision_logs`, `knowledge_items`, `standards` |
| Assets and storage | `resources`, `artifacts` |
| Automations and integrations | `tool_adapters`, `integration_capabilities`, `automation_rules`, `triggers` |
| AI agents and observability | `agents`, `agent_logs`, `events`, `audit_logs` |

The remaining approved areas are created even when they do not yet have
first-party tables, so future finance, people, marketing, operations, storage,
and automation records can attach to stable area keys without reshaping the
workspace contract.

Catalog operating areas, including `00. Glowny` / `main-general`, are
system-owned. User-created operating areas use `is_system = false`. Deleting a
user-created area must reassign linked folders, tables, provider mappings,
storage locations, knowledge roots, automation definitions, and Google Drive
file scope to a selected target area before the area row is removed.

## Migration Policy

Production schema changes must be represented by Prisma migrations committed
under `prisma/migrations/`. `prisma db push` is not a production migration
mechanism.

Every migration that touches ownership, auth, service keys, integration
settings, tasks, events, or external ID uniqueness must include:

- generated SQL review
- empty-database validation
- existing-database validation or a documented reason it cannot be run locally
- rollback or forward-fix note
- data ownership impact review

Applied production migrations should normally be recovered through forward-fix
migrations. Restore from backup only when data corruption or unsafe ownership
state makes forward-fix unsafe.

## Important Relations

- Users can own workspaces.
- Workspaces have membership rows. v1 supports only the `owner` role.
- Workspaces own business records, service API keys, integration settings, and
  events.
- Projects have goals, task lists, tasks, notes, decisions, and events.
- Goals have targets and tasks.
- Targets can have tasks.
- Clients have deals, interactions, and notes.
- Deals belong to clients and optional pipeline stages.
- Events can reference projects and tasks.

## Workspace Ownership

All business tables include `workspace_id` for v1 workspace isolation:

- `projects`
- `goals`
- `targets`
- `task_lists`
- `tasks`
- `clients`
- `pipeline_stages`
- `processes`
- `pipelines`
- `procedures`
- `procedure_steps`
- `company_roles`
- `resources`
- `tool_adapters`
- `integration_capabilities`
- `standards`
- `pipeline_runs`
- `stage_runs`
- `workflow_definition_drafts`
- `approvals`
- `checklist_templates`
- `checklist_items`
- `acceptance_criteria`
- `audit_logs`
- `policies`
- `metrics`
- `risks`
- `controls`
- `knowledge_items`
- `decision_logs`
- `automation_rules`
- `triggers`
- `artifacts`
- `dependencies`
- `business_functions`
- `stakeholders`
- `deals`
- `interactions`
- `notes`
- `decisions`
- `agents`
- `agent_logs`
- `events`
- `operating_areas`
- `operating_folders`
- `operating_tables`
- `external_container_mappings`
- `external_field_mappings`
- `storage_locations`
- `knowledge_roots`
- `automation_definitions`
- `external_webhook_registrations`
- `provider_event_inbox`
- `agent_event_outbox`
- `api_keys`
- `integration_settings`

Protected reads and writes must filter by the active `workspace_id`. If the
request cannot resolve a workspace from a user session/token or service API key,
the request must fail closed.

## Workflow Definition Drafts

`workflow_definition_drafts` is the persistence ledger for planned workflow
definition changes before activation. It is intentionally implemented through
the command routes in `docs/API.md` rather than Prisma model delegates so the
active workflow definition tables stay protected from generic raw editing.

Key fields:

- `workspace_id`: workspace isolation boundary.
- `root_object_type`: `process`, `pipeline`, or `procedure`.
- `root_object_id`: optional existing definition being revised.
- `name`, `reason`, `risk_level`, `status`: human review metadata.
- `base_version` and `target_version`: version planning before activation.
- `change_set`: proposed definition changes.
- `impact_preview`: generated affected-count and approval-reason summary.
- `idempotency_key`: optional workspace-scoped create deduplication key.
- `actor_type`, `actor_id`, `source_channel`: command provenance.

Draft create/update/preview commands must emit audit logs and events. The
table does not mutate processes, pipelines, procedures, stages, or procedure
steps by itself.

Draft list/readback is available through guarded workflow-definition routes
for operators and agents that already have `company-os:workflow-definition:write`.
The readback surface is intentionally not exposed through generic
`/v1/company-os/:collection` reads because draft `change_set` and
`impact_preview` payloads are command metadata, not ordinary read-only company
records.

The current activation command supports `process`, `pipeline`, and
`procedure` drafts. `processes`, `pipelines`, and `procedures` use
`workspace_id + name + version` uniqueness so activation can mark the previous
root `deprecated`, create a new active version, and copy/apply child pipeline
stages or procedure steps without overwriting historical runtime evidence.
They also persist `family_id` on each root row and copy it during activation,
which gives workflow recovery a stable version lineage independent of display
name changes.

Historical workflow archive is also command-shaped. It updates the selected
process, pipeline, or procedure root `status` to `archived` only through the
guarded workflow-definition archive command, and blocks active roots or roots
with active non-terminal runtime dependencies.

Rollback-draft creation stores planned rollback as another
`workflow_definition_drafts` row. The rollback source root ID and version are
recorded in `change_set` with `kind = "rollback_to_version"`; activation still
uses the current active root as `root_object_id` and normal base/target version
checks. The active rollback target is resolved through the root `family_id`,
not through the mutable workflow name.

## User And Workspace Tables

Planned v1 shape:

- `users`
  - `id`
  - `email` unique
  - `password_hash`
  - `name`
  - timestamps

- `workspaces`
  - `id`
  - `name`
  - `owner_user_id`
  - timestamps

- `workspace_memberships`
  - `id`
  - `workspace_id`
  - `user_id`
  - `role`, with only `owner` active in v1
  - timestamps

Registration must create the user, workspace, and owner membership in one
transaction.

## Seed And Bootstrap

`prisma/seed.ts` creates local/bootstrap data:

- owner user from `SEED_OWNER_EMAIL`
- owner password from `SEED_OWNER_PASSWORD`
- workspace from `SEED_WORKSPACE_NAME`
- local workspace API key from `SEED_API_KEY`
- default pipeline stages
- Company OS Stage 1 foundation records:
  - Human Owner plus CEO, CTO, Project Manager, Developer, QA,
    Documentation, Sales, and Finance agent roles
  - ClickUp, Google Drive, GitHub, Coolify, and n8n tool adapters with
    provider-neutral capabilities
  - the first seven LuckySparrow pipelines:
    Feature Development, Client Onboarding, Content Production, Agent Task
    Execution, Integration Onboarding, Documentation Update, and Deployment
  - matching processes, SOP procedures, procedure steps, pipeline stages, and
    provider-neutral pipeline resources

This seed path is acceptable for local development and intentional first-owner
bootstrap. It must not become a permanent production admin shortcut. Production
operators should prefer `POST /auth/register` for the first owner when public
registration is acceptable, or run seed once with explicit deployment secrets
and then rotate bootstrap credentials.

## Service API Keys

`api_keys` should become workspace-scoped and hashed:

- `workspace_id`
- `name`
- `key_hash`
- optional `key_prefix` for operator identification
- `scopes`, JSON array reserved for service-client permissions
- `active`
- `last_used_at`
- timestamps

Raw API keys should only be shown at creation time if a creation endpoint is
added. Existing plaintext foundation keys require a migration or explicit
rotation plan before production use.

Current transition state keeps the legacy `key` column for compatibility while
new seed/bootstrap paths populate `key_hash` and `key_prefix`. Middleware checks
`key_hash` first and only falls back to plaintext rows when `key_hash` is null.
Production should rotate service keys and remove plaintext dependence in a
future cleanup migration.

Owner-created API keys leave the legacy `key` column null and store only
`key_hash`, `key_prefix`, metadata, scopes, and active state. The raw key is
shown once by the API and cannot be recovered from the database.

## Integration Settings

`integration_settings` stores workspace-owned integration configuration:

- `workspace_id`
- `provider`, for example `clickup`
- `secret_ciphertext`, encrypted with authenticated encryption
- non-secret configuration JSON
- `active`
- `last_validated_at`
- timestamps

Each workspace can have one setting per provider through the
`(workspace_id, provider)` unique key. Secret values must not be returned in API
responses or logs.

## Integration Fields

`source` identifies the origin system, for example `companycore`, `clickup`, or
`paperclip`.

`external_id` stores the upstream identifier from the source system. External
records should be unique per workspace and source, for example
`(workspace_id, source, external_id)`, so ClickUp sync can upsert records
without crossing workspace boundaries.

Runtime routes must write `workspace_id` from auth context and filter protected
reads by that workspace. Relation IDs supplied by clients must be checked
against the active workspace before creating dependent records.

Native ClickUp sync writes `tasks.workspace_id` from auth context and uses the
`(workspace_id, source, external_id)` unique key for idempotent task imports.

`events` are workspace-scoped so agent and operator event readback cannot leak
activity across workspaces.

## Provider Webhook And Agent Event Tables

Continuous provider sync uses durable, workspace-scoped tables before any
business processing:

- `external_webhook_registrations`
  - provider webhook identity, scope, endpoint URL, subscribed events, status,
    health metadata, and encrypted webhook secret
- `provider_event_inbox`
  - verified provider deliveries, idempotency key, payload hash, safe payload,
    processing state, retry count, and timestamps
- `agent_event_outbox`
  - provider-neutral follow-up events for Paperclip, Jarvis, Aviary, and future
    consumers

ClickUp webhook secrets are secret material and must be encrypted like provider
tokens. Incoming webhook payloads must be signature-verified against the raw
request body before any durable business update is processed.

The live-sync direction is:

- ClickUp -> CompanyCore: signed webhook -> provider inbox -> full task fetch
  when needed -> task upsert -> internal event -> agent outbox.
- CompanyCore -> ClickUp: updates to ClickUp-sourced tasks call ClickUp's task
  update API before the local task write is accepted.

## Google Drive Persistence Direction

Google Drive v2 adds file and content records without changing PostgreSQL as
the CompanyCore source of truth for operational state.

Implemented tables:

- `google_drive_files`
  - `workspace_id`
  - `provider`, fixed to `google_drive`
  - `external_id`, the Drive file or folder ID
  - `name`
  - `description`, the CompanyCore-owned operator/agent note describing what
    the item contains
  - `mime_type`
  - `drive_id`
  - `parent_external_id`
  - `is_folder`
  - `trashed`
  - `web_view_link`
  - `head_revision_id`
  - `modified_time`
  - optional `operating_area_id`, `operating_folder_id`, `operating_table_id`,
    `storage_location_id`, and `knowledge_root_id`
  - `sync_status`, `last_synced_at`, `last_scanned_at`, and safe metadata
- `google_drive_content_snapshots`
  - `workspace_id`
  - `google_drive_file_id`
  - `source_revision_id`
  - `content_kind`, for example `google_doc`, `google_sheet`, `pdf`, or
    `binary_metadata_only`
  - extracted text or structured preview
  - extracted summary for search and agent context
  - scan status, error code, and timestamps

Uniqueness must be enforced by `(workspace_id, provider, external_id)` for file
metadata and by file/revision for content snapshots. The adapter may keep only
the latest searchable snapshot in v2 unless a later audit feature explicitly
requires historical content retention.

Google Drive rows are provider-owned records. Repeated imports must update the
same rows, not duplicate them. Destructive repair modes must be scoped to
selected provider-owned folders/files only and must never delete native
CompanyCore records.
