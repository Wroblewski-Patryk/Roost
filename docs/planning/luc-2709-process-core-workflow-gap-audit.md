# Task

## Header
- ID: LUC-2709
- Title: Roost Process Core workflow gap audit from LUC-2708 review
- Task Type: architecture/backend audit
- Current Stage: verification
- Status: DONE
- Owner: Technical Solution Architect
- Priority: P1
- Parent: [LUC-2708](/LUC/issues/LUC-2708)
- Mission ID: LUC-2709-PROCESS-CORE-WORKFLOW-GAP-AUDIT
- Mission Status: DONE

## Goal
Convert the `PROCESS-CORE-002` planning packet into a current-state coverage matrix over workflows, approvals, evidence, resources, workforce, capabilities, and MCP exposure before any schema migration, API/MCP write tool, UI implementation, deploy, protected smoke, restart, or production mutation.

## Scope
- `docs/planning/luc-2708-roost-companycore-readiness-and-milestone-review.md`
- `docs/planning/luc-1215-process-core-002-architecture-backend-workflow-gap-audit-plan.md`
- `docs/planning/luc-1214-child-arch-be-process-core-002-audit.md`
- `docs/architecture/process-core-workflow-core-architecture.md`
- `prisma/schema.prisma`
- `src/modules/company-os/company-os.routes.ts`
- `src/modules/operating-graph/operating-graph.routes.ts`
- `src/modules/operations/operations.routes.ts`
- `src/modules/intake/intake.routes.ts`
- `src/modules/assets/assets.routes.ts`
- `src/modules/workforce/workforce.routes.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`

## Implementation Plan
1. Re-read the accepted Process Core target and `PROCESS-CORE-002` audit plan.
2. Inventory current Prisma models, Company OS collection/read routes, command routes, capabilities, MCP manifest exposure, and department packets.
3. Classify each target concept as `covered`, `partial`, `missing`, or `deferred`.
4. Record architecture alignment, implementation risk, read-packet order, and the exact next narrow lane.
5. Sync source-of-truth state files and close the Paperclip issue with evidence.

## Acceptance Criteria
- [x] Audit packet includes a covered/partial/missing/deferred matrix.
- [x] Audit packet covers workflows, approvals, evidence, resources, workforce, capabilities, and MCP exposure.
- [x] Audit packet includes an architecture alignment note.
- [x] Audit packet recommends the read-packet sequence before migrations or write commands.
- [x] Audit packet names an exact next implementation lane only where evidence supports it.

## Definition Of Done
- [x] No runtime code, schema migration, API/MCP write tool, UI implementation, deploy, protected smoke, restart, production mutation, or secret disclosure was performed.
- [x] All classifications cite source paths.
- [x] Residual risks and owner handoff are explicit.
- [x] Source-of-truth pointers were updated.

## Coverage Matrix

| Target concept | Current evidence | Status | Gap / risk | Next action |
| --- | --- | --- | --- | --- |
| `Pipeline` | `prisma/schema.prisma` has `Pipeline` with workspace, process, name, purpose, trigger, input/output schema, owner role, status, version, automatable flag, risk, stages, runs, metrics, targets, risks, knowledge, decisions, and automation rules. `/v1/company-os/pipelines` read exists through `src/modules/company-os/company-os.routes.ts`; capability route is in `src/auth/capabilities.ts`. | partial | Target fields for reusable type, target entity type, template/active flags, and Paperclip-enabled flag are not explicit. Current model is process-centric rather than universal entity-centric. | Add a read-only Process Core coverage packet that reports current pipeline shape and missing target fields before any migration decision. |
| `PipelineStage` | `prisma/schema.prisma` has `PipelineStage` with position, expected input/output, entry/exit conditions, assigned role, procedure, required tools, required approvals, duration, failure strategy, retry policy, status, source/external ID. Generic CRUD route and Company OS collection read exist. | partial | WIP limit, explicit evidence requirements, and Paperclip instruction are not first-class fields. Approval/evidence semantics are stored in JSON or related runtime records. | Include stage requirement normalization in the read packet; defer migration until actual consumers need first-class fields. |
| `PipelineTransition` | No explicit model or route found in `prisma/schema.prisma`, `src/modules/company-os/company-os.routes.ts`, or capability inventory. Stage movement commands exist for runtime stage runs. | missing | Allowed movement, conditional transitions, and transition-level approval/evidence requirements are not modeled separately. Automation/stage commands cannot substitute for a reusable transition graph. | Next design lane should decide whether transitions are new schema or derived from stage conditions for MVP. |
| `WorkflowItem` / `PipelineItem` | `PipelineRun` can link to pipeline, current stage, task IDs, document IDs, client, project, task links, stage runs, approvals, audit logs, and acceptance criteria. `PipelineRunTaskLink` normalizes task links. Operating graph exposes workflows/runs in `src/modules/operating-graph/operating-graph.routes.ts`. | partial | There is no universal attachment model for `entityType/entityId` across product, subscription product, service project, internal project, innovation project, task, client, department, repository, or custom entities. JSON `linkedTaskIds` and limited `linkedClientId/linkedProjectId` leave attachment semantics fragmented. | Exact next implementation lane: create a read-only Process Core workflow coverage packet that maps current `PipelineRun` attachments and flags unsupported entity families. Do not add `WorkflowItem` schema until this packet proves required fields. |
| `Procedure` | `Procedure` and `ProcedureStep` models exist with process relation, owner role, status/version, required tools/permissions, expected result, quality standard, stages, and policies. Company OS collection reads expose procedures and steps. Workflow definition draft/activation commands exist for guarded definition work. | partial | Target wants optional department, type, trigger, input/output requirements, responsible actor, related pipeline/stage, approval policy, and Paperclip context. Several are missing or indirect. | Include procedure target-field coverage in the read packet and reuse existing workflow-definition draft commands for future writes. |
| `ProcedureStep` | `ProcedureStep` has order, instruction, step type, required tool adapter, expected input/output, validation rule, rollback instruction. | partial | Human approval flag, evidence flag, and Paperclip instruction are not explicit; approval/evidence are inferred through procedure, stage, acceptance, audit, or tool risk. | Keep writes blocked. Add read-only step-risk/evidence projection before schema change. |
| `Checklist` / `ChecklistItem` | `ChecklistTemplate`, `ChecklistItem`, and `AcceptanceCriterion` exist. Acceptance criteria can attach to target type/id, pipeline run, and stage run with validation status and evidence JSON. | partial | Checklist attachment is not first-class across all target families listed by Process Core, and evidence requirements are not normalized as reusable policy. | Use current checklist/acceptance models in the read packet; consider attachment normalization only after workflow item decision. |
| `EvidenceLog` | `AuditLog`, `Event`, `AcceptanceCriterion.evidence`, `Artifact`, `KnowledgeLink`, and department packets expose evidence-like records. Stage lifecycle commands create audit logs and events in `src/modules/company-os/company-os.routes.ts`. | partial | There is no dedicated `EvidenceLog` model with entity type/id, task, workflow item, stage, procedure, submitter, evidence type, and file/link/commit/screenshot metadata. Audit logs prove commands, but they are not a universal evidence ledger. | Read packet should classify evidence sources and identify which evidence types are currently representable without migration. |
| `ApprovalPolicy` / `ApprovalRequest` / `ApprovalDecision` | `Approval` model represents request and decision state in one table; `Policy` and `Control` provide general governance; Company OS approval request/decision command routes exist and are capability-gated. MCP marks risky stage/pipeline/activation tools as approval-requiring in `src/mcp/manifest.ts`. | partial | There is no separate `ApprovalPolicy`, `ApprovalRequest`, and immutable `ApprovalDecision` split. Policy-to-approval binding is indirect. Decision history lives in fields plus audit logs, not a separate decision record. | Keep existing commands. Add policy/request/decision coverage to the read packet and defer split until an approval policy consumer requires it. |
| `Blueprint` / `EntitySchema` | Existing JSON schemas appear on workflow-related records (`Pipeline.inputSchema`, `Pipeline.outputSchema`, `IntegrationCapability.inputSchema/outputSchema`, tool metadata). No dedicated blueprint/entity schema model was found. | missing | Product wants structured object definitions for arbitrary entity types. Current schemas are local to pipelines and integration capabilities. | Defer implementation. Route to a separate schema/blueprint design lane after workflow item read coverage is known. |
| `LinkedAsset` | `Resource`, `Artifact`, `Dependency`, `KnowledgeItem`, `KnowledgeLink`, Google Drive file/content snapshot models, and Assets context routes provide asset/resource linkage foundations. | partial | No universal `LinkedAsset` relation with `entityType/entityId`, `assetType/assetId`, relation type, and description across all target entities. Existing relations are split by resource, dependency, knowledge, and Drive concepts. | Include linked-asset coverage in the read packet; reuse Resources/Artifacts/KnowledgeLink first and avoid generic edge CRUD. |
| `PaperclipSyncContext` | MCP manifest exposes capability-scoped tools from the HTTP route manifest. `WorkforceEntity` has Paperclip agent fields, sync flags, generated files, profile, sync log, and last sync. Department/intake/operations/assets packets include allowed and blocked actions. | partial | No per-object `PaperclipSyncContext` model or endpoint exists for entity type/id, allowed actions, blocked actions, default agent, approval policy, and last sync date. Current context is spread across packets, MCP manifest, workforce records, and issue docs. | Exact next implementation lane should start read-only: `GET /v1/process-core/context/:entityType/:entityId` is premature; first build `GET /v1/process-core/coverage` or equivalent internal packet to prove common fields. |

## Coverage By Required Audit Area

| Area | Current coverage | Status | Evidence paths | Recommendation |
| --- | --- | --- | --- | --- |
| Workflows | Processes, pipelines, stages, procedures, pipeline runs, stage runs, workflow-definition draft/activation commands, operating graph workflow layer. | partial | `prisma/schema.prisma`; `src/modules/company-os/company-os.routes.ts`; `src/modules/operating-graph/operating-graph.routes.ts`; `src/auth/capabilities.ts` | Build a read-only Process Core coverage packet before adding transition or workflow-item schema. |
| Approvals | `Approval`, `Policy`, `Control`, approval request/decision commands, audit/event evidence, MCP approval metadata. | partial | `prisma/schema.prisma`; `src/modules/company-os/company-os.routes.ts`; `src/mcp/manifest.ts`; `src/auth/capabilities.ts` | Preserve command-shaped approval writes; model policy split only after read coverage proves need. |
| Evidence | Audit logs, events, acceptance criteria evidence JSON, artifacts, resources, knowledge links, route proposal audit/event evidence. | partial | `prisma/schema.prisma`; `src/modules/company-os/company-os.routes.ts`; `src/modules/intake/intake.routes.ts`; `src/modules/operations/operations.routes.ts` | Classify evidence sources before creating an `EvidenceLog` table. |
| Resources / assets | Resources, artifacts, dependencies, knowledge links, Google Drive files/snapshots, Assets context packet. | partial | `prisma/schema.prisma`; `src/modules/assets/assets.routes.ts`; `src/modules/operating-model/operating-model.routes.ts` | Reuse existing resource/knowledge/Drive relations; avoid generic linked-asset writes until target families are proven. |
| Workforce | Users, roles, agents, workforce entities, assigned tasks, Paperclip director fields, workforce routes. | partial | `prisma/schema.prisma`; `src/modules/workforce/workforce.routes.ts`; `src/modules/operations/operations.routes.ts` | Include workforce assignment and approver role coverage in Process Core read packet. |
| Capabilities | Route manifest maps Company OS, operations, workforce, assets, MCP, approvals, pipeline/stage commands, automation, and department packets to capabilities. | covered for current routes; partial for target Process Core | `src/auth/capabilities.ts`; `src/auth/agent-key-profiles.ts` | Add new Process Core read capability only after the packet shape is defined; do not expose new writes yet. |
| MCP exposure | MCP manifest derives tools from capability-scoped HTTP route manifest and requires approval for high-risk Company OS lifecycle tools. | partial | `src/mcp/manifest.ts`; `src/modules/mcp/mcp.routes.ts`; `scripts/companycore-mcp-smoke.mjs` | Expose only read-only Process Core packet first; write tools remain blocked until command contract and approval proof exist. |

## Architecture Alignment Note

The existing backend aligns with the accepted Process Core guardrail in one important way: Company OS writes are already command-shaped and audit/event-producing for approval, stage lifecycle, workflow definition activation, knowledge links, and automation evaluation. MCP exposure also derives from HTTP route capabilities instead of direct database access.

The current architecture is not yet the reusable Process Core target. The largest gaps are structural, not cosmetic: no universal workflow attachment (`WorkflowItem`), no explicit transition model, no dedicated evidence ledger, no separate approval policy/request/decision split, no blueprint/entity schema model, no universal linked-asset relation, and no object-level Paperclip sync context.

## Recommended Read-Packet Sequence

1. `Process Core coverage packet`: internal/read-only aggregate over current `Process`, `Pipeline`, `PipelineStage`, `Procedure`, `ProcedureStep`, `ChecklistTemplate`, `AcceptanceCriterion`, `PipelineRun`, `StageRun`, `Approval`, `AuditLog`, `Event`, `Resource`, `Artifact`, `Dependency`, `KnowledgeLink`, `WorkforceEntity`, capabilities, and MCP exposure. Purpose: show current coverage and unsupported target fields.
2. `Workflow attachment packet`: read-only view of how current runs attach to tasks, clients, projects, documents, goals, targets, departments, resources, and unsupported entity families. Purpose: prove whether `WorkflowItem` is needed and what fields it needs.
3. `Governance and evidence packet`: read-only approval, policy, audit, event, acceptance criteria, and evidence-source projection. Purpose: decide whether `EvidenceLog` and `ApprovalPolicy/Request/Decision` split are needed now.
4. `Asset and workforce context packet`: read-only mapping of resources/artifacts/knowledge/Drive files and workforce actors/roles to workflow stages and procedures. Purpose: avoid duplicating existing resource and workforce models.
5. `Paperclip authority packet`: read-only object-level projection of allowed actions, blocked actions, approval requirements, evidence requirements, default agent/role, and last sync where current data supports it. Purpose: define `PaperclipSyncContext` without granting new authority.
6. `MCP read exposure`: expose only the verified read packets through a new read capability and MCP manifest entry after local API tests cover workspace isolation and no-mutation behavior.

## Exact Next Implementation Lane

Created child issue: [LUC-2713](/LUC/issues/LUC-2713) Roost Process Core read-only coverage packet, assigned to Core Backend Engineer.

Recommended scope:
- Add a protected read-only route such as `GET /v1/process-core/coverage`.
- Add a read capability such as `process-core:read`.
- Aggregate current model counts, field coverage, unsupported target fields, and MCP exposure metadata.
- Include no migrations, no writes, no seed data, no UI, no provider mutation, and no protected smoke.
- Verify with API tests for auth, workspace isolation, no mutation, and capability/MCP visibility.

This is the smallest safe lane because it turns the audit into machine-readable evidence before deciding on `WorkflowItem`, `PipelineTransition`, `EvidenceLog`, `ApprovalPolicy`, `Blueprint`, `LinkedAsset`, or `PaperclipSyncContext` schema.

## Residual Risks

| Risk | Severity | Owner | Mitigation |
| --- | --- | --- | --- |
| Premature migration duplicates existing Company OS workflow/runtime tables. | high | Technical Solution Architect + Backend Builder | Require the read-only coverage packet and attachment packet before any schema change. |
| MCP write exposure could infer authority from manifest metadata instead of approval policy. | high | Backend Builder + Security/QA | Keep new Process Core MCP exposure read-only until command contract, approval proof, and fail-closed tests exist. |
| Evidence remains fragmented across audit logs, events, acceptance criteria, artifacts, and knowledge links. | medium | Backend Builder | Classify evidence sources in the governance/evidence packet before adding `EvidenceLog`. |
| Universal entity attachment may conflict with existing typed relations if designed too broadly. | medium | Technical Solution Architect | Start with a read-only attachment packet and concrete unsupported-family list. |

## Validation Evidence
- Source inspection only; no runtime mutation.
- `rg` inventories over `docs`, `src`, `prisma`, `.agents`, and `.codex`.
- Direct reads of scoped files listed above.
- `git diff --check` -> PASS with existing line-ending warnings only after this docs/state update.

## Result Report
- Task summary: current Company OS workflow foundations are useful but only partially cover the accepted Process Core target. The next safe lane is a read-only Process Core coverage packet, not migrations or write tools.
- Files changed:
  - `docs/planning/luc-2709-process-core-workflow-gap-audit.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
- Deployment impact: none.
- What remains: Backend Builder implementation of the read-only coverage packet and API/MCP visibility tests.
- Delegated follow-up: [LUC-2713](/LUC/issues/LUC-2713) owns the Backend Builder lane.
