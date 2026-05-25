# Company OS Workflow Definition Command Contract

Last updated: 2026-05-14

## Purpose

Workflow definitions describe how CompanyCore work should run: processes,
pipelines, pipeline stages, procedures, and procedure steps. These definitions
feed stage lifecycle commands, approval requirements, automation rules, MCP
tool context, policy checks, and owner-facing cockpit guidance.

Because a workflow edit can change how agents execute work, workflow
definition editing must use command-shaped APIs with versioning, impact
preview, approval handling, and audit evidence. A web editor must not mutate
these records through generic CRUD.

## Current Boundary

Current Company OS workflow collections are readable through `/v1/company-os`
and `/v1/company-os/:collection`. Runtime transitions already use command
routes for approvals, stage lifecycle, and automation evaluation.

The existing workflow definition tables include `status` and `version` fields
on `processes`, `pipelines`, and `procedures`, while `pipeline_stages` and
`procedure_steps` are child definition records. That is enough to display
current state, but not enough to safely edit active production definitions
without an explicit draft/version command layer.

As of V2WEB-AGENT-011, activation is implemented for `process`, `pipeline`,
and `procedure` drafts. `processes`, `pipelines`, and `procedures` use
`workspace_id + name + version` uniqueness, so activation can create a new
active root version and deprecate the previous one without overwriting runtime
evidence. Pipeline stages and procedure steps remain child definitions copied
or replaced as part of the parent activation command.

## Command Surface

Future workflow definition editing must use this command family:

| Route | Capability | Purpose |
| --- | --- | --- |
| `GET /v1/company-os/workflow-definitions/drafts` | `company-os:workflow-definition:write` | List resumable workflow definition drafts for the authenticated workspace with narrow filters. |
| `GET /v1/company-os/workflow-definitions/drafts/:id` | `company-os:workflow-definition:write` | Read one workflow definition draft and its last preview state for resume/review. |
| `POST /v1/company-os/workflow-definitions/drafts` | `company-os:workflow-definition:write` | Create a draft workflow definition change set for one root object. |
| `PATCH /v1/company-os/workflow-definitions/drafts/:id` | `company-os:workflow-definition:write` | Update draft metadata and child definition changes before preview. |
| `POST /v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact` | `company-os:workflow-definition:write` | Return affected runtime, governance, automation, MCP, and owner UX surfaces without applying changes. |
| `POST /v1/company-os/workflow-definitions/drafts/:id/actions/request-approval` | `company-os:approval:request` | Request owner approval when the draft affects active production behavior. |
| `POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate` | `company-os:workflow-definition:activate` | Activate an approved or low-risk draft, write audit/event evidence, and create a new active version. |
| `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive` | `company-os:workflow-definition:activate` | Archive an inactive historical workflow definition version when no unsafe active runtime dependency blocks it. |
| `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft` | `company-os:workflow-definition:write` | Create a rollback draft from a prior known-good version so existing preview and activation gates still apply. |

These routes are intentionally grouped by "workflow definition" instead of
separate raw endpoints for processes, pipelines, stages, procedures, and steps.
The draft command owns consistency across parent and child records.

## Draft Shape

A draft must name one root object:

- `process`
- `pipeline`
- `procedure`

Pipeline stage and procedure step changes are allowed only as children of a
pipeline or procedure draft. They must not be edited as standalone active
records because their ordering, approval needs, tool needs, and runtime effects
depend on the parent definition.

Minimum draft fields:

- workspace ID from the authenticated context;
- root object type and optional root object ID;
- proposed name, description, owner role, status, version target, and metadata;
- child stage or step changes with stable client IDs for reorder operations;
- change reason;
- risk level;
- expected activation mode: `draft_only`, `activate_low_risk`, or
  `requires_approval`;
- actor and source channel;
- idempotency key for command retries.

## Impact Preview

Impact preview is mandatory before activation. It must return:

- affected active pipelines, procedures, stages, and steps;
- active or recent pipeline runs and stage runs that reference the definition;
- automation rules tied to affected pipelines;
- policies, risks, controls, and standards linked to the definition;
- MCP tools or command panels whose behavior or labels would change;
- approval requirement summary;
- rollback candidate version;
- blocking conflicts such as active terminal-incompatible runs, duplicate
  names, broken stage order, missing required procedure/tool/role relations, or
  invalid schemas.

Preview must be read-only. It must not create runtime records, mutate active
definitions, or silently repair invalid draft data.

## Activation Rules

Activation must:

- reject stale drafts whose base active version changed;
- reject missing or invalid workspace-scoped relations;
- require approval for active production-impacting changes, high-risk
  pipelines, automation-linked pipelines, blocking-policy changes, approval
  requirement changes, and tool-adapter requirement changes;
- create a new version rather than overwriting active definitions;
- set previous active versions to a non-active state when appropriate;
- preserve existing runtime evidence by keeping historical runs linked to the
  definition version they used, or by recording the resolved snapshot in the
  audit payload until dedicated version tables exist;
- emit event and audit evidence with one correlation ID;
- include preview summary, approval ID when used, previous version, new
  version, and affected object IDs in the audit payload.

## Archive And Rollback

Archive is allowed only when:

- the target definition is not required by active non-terminal runtime work, or
  the command provides an explicit migration/retarget plan;
- affected automation rules are paused, migrated, or included in the preview;
- owner approval exists for active production-impacting archives.

Rollback must behave like activation of a prior known-good version. It must
still run impact preview and approval checks; rollback is safer, not free.

Decision as of V2WEB-AGENT-015:

- Do not implement rollback as a direct status flip on workflow roots.
- Do not implement archive as a generic raw update over active process,
  pipeline, or procedure rows.
- The first archive command should target an existing workflow root version by
  explicit root type and root ID:
  `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive`.
- The first archive implementation should allow only non-active historical
  versions such as `deprecated`, `paused`, or already inactive versions. Active
  archive remains deferred until a migration or replacement plan is modeled and
  tested.
- The archive command must require `company-os:workflow-definition:activate`,
  idempotency, a human-readable reason, workspace scoping, event/audit
  evidence, and MCP supervision metadata.
- Rollback should first be implemented as rollback-draft creation, not direct
  rollback execution:
  `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft`.
- A rollback draft copies the selected historical version into
  `workflow_definition_drafts` with `changeSet.kind = "rollback_to_version"`,
  stores the target version/root IDs in `metadata`, runs impact preview, and
  then uses the existing draft activation command for approval, evidence, and
  version creation.
- Direct rollback execution may be added later only as a wrapper around
  rollback-draft creation plus activation, never as a bypass of preview,
  approval, stale-version, audit, or event checks.

## Data Model Direction

Preferred implementation path:

1. Add workflow definition draft/version tables that store proposed changes and
   immutable activated snapshots.
2. Keep existing current tables as the read-optimized active projection until
   the application is ready to resolve versioned reads everywhere.
3. Store activated version IDs or snapshot payloads on future runtime records
   before allowing agents to execute against mutable workflow definitions.

Current implementation note:

- `workflow_definition_drafts` exists and stores draft/change/preview state.
- Draft list/readback exists for workspace-scoped resume in the owner cockpit
  and MCP/API command flows. It requires
  `company-os:workflow-definition:write` because draft payloads include
  proposed change sets and impact previews.
- Procedure activation exists through
  `POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate`.
- Process and pipeline activation now use the same route after
  `202605143_workflow_root_version_uniqueness`.
- Process, pipeline, and procedure roots carry `family_id` lineage after
  `202605144_workflow_root_family_lineage`; activation must copy the previous
  root family into the new active root.
- Historical-version archive exists through
  `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive`.
  It is limited to inactive workflow roots without active runtime
  dependencies.
- Rollback-draft creation exists through
  `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft`.
  The current implementation resolves the active rollback target by matching
  workspace, root type, and `family_id`, so renamed historical versions can
  still create a rollback draft against the current active version. Direct
  rollback execution remains intentionally unimplemented.

Do not add only a generic `PATCH /v1/company-os/pipelines/:id` path. That would
skip the version, preview, approval, and evidence boundary this contract
requires.

## MCP Exposure

MCP manifest exposure for these routes must be conservative:

- draft create/update and preview are write-risk tools;
- approval request uses existing approval request policy;
- activate, archive, and rollback require approval metadata and must be blocked
  by the MCP bridge unless supervised mode is explicit;
- read-only agent profiles must not receive workflow definition write tools.

## Web Editor Gate

A workflow definition web editor may start only after:

- draft create/update and impact preview routes exist;
- activation/rollback/archive commands exist or are explicitly excluded from
  the first editor slice;
- tests prove workspace scoping, stale-version rejection, relation validation,
  approval requirement, audit/event evidence, and MCP manifest filtering;
- the web surface shows preview impact, blockers, approval need, and rollback
  or archive consequence before activation.

Until then, workflow definitions remain read-only in the Company OS cockpit.
