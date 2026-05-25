# Company OS Definition Editing Contract

Last updated: 2026-05-14

## Purpose

Company OS definitions describe how agents, users, integrations, policies, and
automations execute work. Editing them can change real operating behavior, so
definition editors must not be introduced as casual raw CRUD.

This contract decides which definition objects may use scoped write APIs, which
need command-shaped routes, and which need versioning or approval before the
web console exposes editing.

## Current Boundary

The current `/v1/company-os` collection API is read-only for definition and
governance records. Runtime writes already use command routes for approvals,
stage lifecycle, and automation evaluation. This boundary remains approved.

No web definition editor may write directly to PostgreSQL, bypass the HTTP API,
or mutate runtime evidence tables such as pipeline runs, stage runs, approvals,
events, audit logs, acceptance criteria evidence, or automation execution
results.

## Editing Classes

| Class | Objects | Allowed write shape | Approval/versioning need | Web editor status |
| --- | --- | --- | --- | --- |
| A: Registry-like definitions | `company_roles`, `standards`, low-risk labels and metadata | Scoped CRUD may be acceptable if capability-gated and audited | Versioning optional; approval not required by default | Candidate for first editor after API contract exists |
| B: Workflow definitions | `processes`, `pipelines`, `pipeline_stages`, `procedures`, `procedure_steps` | Command-shaped create/update/archive routes | Versioning required before active definitions can change; approval required for active production-impacting changes | Do not build editor before command/version contract |
| C: Execution tool definitions | `tool_adapters`, `integration_capabilities` | Mostly provider/config command routes, not generic CRUD | Approval required when changing risky or provider-affecting capabilities | Keep read-only except existing integration settings surfaces |
| D: Governance definitions | `policies`, `risks`, `controls`, `metrics` | Command-shaped create/update/archive routes with audit evidence | Approval required for blocking policies and critical risks; versioning required for policies | Do not build generic editor before command contract |
| E: Automation definitions | `automation_rules`, `triggers`, automation actions | Command-shaped draft, dry-run, activate, pause, archive routes | Versioning and dry-run proof required before activation; approval required for high-risk execute paths | Do not build editor before automation studio contract |
| F: Runtime evidence | `pipeline_runs`, `stage_runs`, `approvals`, `acceptance_criteria` evidence, `events`, `audit_logs` | Existing lifecycle/evaluation command routes only | N/A; evidence is append/update through approved commands only | Never raw-edit from definition editors |

## First Allowed Editor

The first definition editor should be a Class A editor for low-risk role or
standard metadata only after backend routes exist with:

- workspace scope checks;
- capability checks;
- create, update, and archive/delete semantics;
- audit/event evidence;
- integration test coverage for owner access, scoped service denial where
  appropriate, cross-workspace denial, and archive/delete behavior;
- MCP manifest exposure only when the capability model is explicit.

Current implementation status:

- `standards` now has the first approved Class A backend write contract:
  `POST /v1/company-os/standards`, `PATCH /v1/company-os/standards/:id`, and
  `DELETE /v1/company-os/standards/:id`.
- The route contract is guarded by `company-os:definition:write`, emits
  events, records audit logs with correlation IDs, validates workspace-scoped
  owner role and checklist links, and archives by setting `status` to
  `archived`.
- `/react-company-os` now includes the narrow standards web editor for this
  contract. It is implemented and verified by V2WEB-AGENT-007R browser render
  and create-interaction proof.
- No web editor may broaden this into process, pipeline, procedure,
  governance, automation, or runtime evidence editing without the additional
  contracts below.

## Required Contracts Before Other Editors

Workflow definition editors require:

- immutable version records or equivalent version fields;
- draft versus active state;
- activation command that records audit evidence;
- impact preview listing affected pipelines, procedures, stage runs,
  automation rules, policies, and MCP-visible command behavior;
- rollback or archive behavior for mistaken definitions.

The canonical command contract for this class is
`docs/architecture/company-os-workflow-definition-command-contract.md`.

Governance editors require:

- policy/risk/control audit evidence;
- blocking-policy approval handling;
- clear escalation role behavior;
- explainability in web command panels.

Automation editors require:

- draft rule editing;
- condition/action schema validation;
- dry-run proof against selected events;
- explicit activate/pause/archive commands;
- idempotency and approval handling for high-risk actions.

## Non-Goals

- No raw table editor for Company OS definitions.
- No runtime evidence editor.
- No definition editor that silently changes active agent behavior.
- No MCP write exposure before web and API command contracts are explicit.

## Next Implementation Slice

The next implementation slice should not be a broad editor. It should design
versioned workflow definition commands, including draft/active lifecycle,
impact preview, approval handling, activation evidence, and rollback/archive
behavior.
