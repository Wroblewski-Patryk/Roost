# TASK_BOARD

## Ready

No local Company OS workflow recovery task is currently ready. External or
target-environment tasks remain below.

## In Progress

No active local implementation task is currently in progress.

## Blocked

- AGRUN-010 Upstream Agent Source Merge Execution
  - Stage: planning
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: external GitHub write access or an approved fork/PR route for
    Paperclip and OpenJarvis source handoff.
- CCV1-057B Paperclip upstream branch push
  - Stage: release
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: GitHub returned `403` for pushing
    `codex/companycore-adapter-v1` to `paperclipai/paperclip` as
    `Wroblewski-Patryk`. The adapter commit is validated locally and remains
    available as `4cfa476f` plus the managed CompanyCore patch.
- CCV1-058B OpenJarvis upstream branch push
  - Stage: release
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: GitHub returned `403` for pushing
    `codex/companycore-connector-v1` to `open-jarvis/OpenJarvis` as
    `Wroblewski-Patryk`. The connector change was replayed on clean
    `origin/main`, validated with 6 targeted tests, and remains available as
    the documented OpenJarvis source handoff.

## Backlog

- Future v2 OAuth browser consent UI and token refresh hardening after core
  server-side API slices are complete.
- Future v2 dashboard surfaces that show ClickUp Lists, Drive folders/files,
  storage locations, knowledge roots, automations, and CompanyCore tables as
  one company operating area.
- Upstream OpenJarvis/Paperclip source merge execution and blocked GitHub
  auto-deploy webhook administration task.

## Done

- PROD-HOTFIX-001 Owner Console Snapshot Routing.
  - Evidence: production now runs commit
    `a7557120b8ea4630a0b32097e66ba0d4bb012b1b`; public `/health` and
    `/v1/health` report that commit; signed-in Playwright route checks for
    `/dashboard`, `/data`, `/relationships`, `/settings/drive`,
    `/settings/api`, and `/areas` reported no failed requests and no console
    warnings or errors.

- AGRUN-007 Google Drive Owner Consent And First Import.
  - Evidence: production runs commit
    `c5878d95a47f17745f65689c08e9e317a6465777`; OAuth is active; folder
    discovery found 172 folders; 13 numbered department roots (`00`-`12`) were
    selected and imported; `/v1/google-drive/files` readback returned 748
    imported Drive items, including 171 folders; all imported items have an
    operating-area assignment and descendant scope verification reported
    `mismatches=[]`.

- V2WEB-AGENT-009 Workflow Definition Draft Backend Contract.
- V2WEB-AGENT-010 Workflow Definition Activation Backend Contract.
- V2WEB-AGENT-011 Process And Pipeline Workflow Versioning Migration Decision.
- V2WEB-AGENT-012 Workflow Definition Draft Web Surface.
- V2WEB-AGENT-013 Workflow Draft History And Resume Decision.
- V2WEB-AGENT-014 Workflow Draft Readback And Resume Slice.
- V2WEB-AGENT-015 Workflow Archive And Rollback Command Decision.
- V2WEB-AGENT-016 Workflow Historical Version Archive Backend Slice.
- V2WEB-AGENT-017 Workflow Rollback Draft Backend Slice.
- V2WEB-AGENT-018 Workflow Recovery Controls Web Decision.
- V2WEB-AGENT-019 Workflow Recovery Controls Web Surface.
- V2WEB-AGENT-020 Workflow Version Lineage Decision.
- V2WEB-AGENT-021 Workflow Version Lineage Implementation.
- V2WEB-AGENT-022 Company OS Collection Fetch Alignment.
- V2WEB-AGENT-023 Workflow Recovery End-To-End Activation Proof.
- V2WEB-AGENT-024 Workflow Recovery Real Backend Proof.
- V2WEB-AGENT-008 Versioned Workflow Definition Command Contract.
- V2WEB-AGENT-007R Standards Editor Render Proof.
- V2WEB-AGENT-007 Standards Definition Editor Web Surface.
- UXD-003 Company City Dashboard V3 Department Model.
- UXD-002 Company City Dashboard V2 Target Spec.
- UXD-001 Company City UX Direction Decision.
- V2WEB-AGENT-006 Class A Definition Editor Backend Contract.
- V2WEB-AGENT-005 Definition Editing Contract Decision.
- V2WEB-AGENT-004 Workflow-Grade Command Panels.
- V2WEB-AGENT-003 Operating Graph Detail.
- V2WEB-AGENT-002 Company OS Correlation Timeline.
- V2WEB-AGENT-001 Agent Tool Surface Workbench.
- V2WEB-ARCH-001 Human-Agent Web Architecture Map.
- V2AGENT-006R Agent Command Queue Render Proof.
- V2AGENT-006 Agent Command Queue Cockpit Slice.
- V1CLOSE-001 V1 Achievement And External Blocker Handoff.
- V2AGENT-005 Supervised Operator MCP Smoke Harness.
- V2AGENT-004 MCP Requires-Approval Bridge Guard.
- V2AGENT-003 Approval-Aware MCP Command Flow Design.
- V2AGENT-002 MCP Company OS Reader Least-Privilege Correction.
- V2AGENT-001 Agent-First Company OS MCP Command Surface Audit.
- V2PLAN-001 V2 Product Lane Selection.
- V1EVID-002 Operating Model Registry Lifecycle Smoke.
- V1EVID-001 Company OS Lifecycle Trace Smoke.
- V1CTRL-002 Canonical Queue Cleanup.
- V1CTRL-001 Function Coverage Ledger.
- UXA-031 V1 Architecture Completion Audit.
- UXA-030 React Areas Canonical Route Switch.
- UXA-029 React Areas Canonical Route Switch Decision.
- UXA-028 React Areas Assigned Scope Reassignment Controls.
- UXA-027 React Areas Selected Context Data Hook.
- UXA-026 React Areas Selected Context Parity Decision.
- UXA-025 React Areas Area Lifecycle Controls.
- UXA-024 React Areas Canonical Switch Decision.
- UXA-023 React Areas Scope Assignment Controls.
- UXA-022 React Areas Canonical Switch Decision.
- UXA-021 React Areas Relationship Data Hook.
- UXA-020 React Areas Data Contract Gap Decision.
- UXA-019 React Areas Mapping Parity Slice.
- UXA-018 React Canonical Route Switch Decision.
- UXA-017 React Workbench Third Route Candidate.
- CCOS-020 Company OS Automation Lifecycle Proposal Execution.
- CCOS-019 Company OS Stage Lifecycle Command Service Extraction.
- CCOS-018 Company OS Automation Lifecycle Helper Reuse Design.
- CCOS-017 Company OS Automation Evaluator UI Actions.
- CCOS-016 Company OS Automation Rule Evaluator Backend.
- CCOS-015 Company OS Automation Rule Execution Design.
- CCOS-014 Company OS Stage Lifecycle UI Actions.
- CCOS-013 Company OS Stage Lifecycle Backend.
- CCOS-012 Company OS Pipeline Stage Lifecycle Design.
- CCOS-011 Company OS Approval UI Actions.
- CCOS-010 Company OS Approval Lifecycle Backend.
- CCOS-009 Company OS Approval Lifecycle Design.
- CCOS-008 Company OS Agent Context Panel.
- CCOS-007 Company OS Collection Detail Route.
- CCOS-006 Company OS Collection Drill-Down.
- CCOS-005 Company OS Dashboard Surface.
- UXA-016 React Route Shell Extraction.
- MCP-006 MCP Agent Runtime Setup Guide.
- MCP-005 MCP Bridge Runtime Smoke Harness.
- MCP-004 Dynamic MCP Profile UI Loading.
- MCP-001 MCP Bridge Manifest Foundation.
- MCP-002 CompanyCore MCP Bridge Server.
- MCP-003 MCP Agent Key Profiles.
- CCOS-001 Company OS Stage 1 Data Foundation.
- CCOS-002 Company OS Stage 2 Runtime Evidence Foundation.
- CCOS-003 Company OS Stage 3 Governance Intelligence Foundation.
- CCOS-004 Company OS Read API Surface.
- UXA-015 React Canonical Route Switch Readiness.
- UXA-014 React Integration Map Workbench Route.
- UXA-013 React Workbench Canonical Route Decision.
- UXA-012 React Workbench Route Migration.
- UXA-011 React Table And Notification Primitive Migration.
- UXA-010 React Dashboard Component Migration.
- UXA-009 React Tailwind DaisyUI Migration Foundation.
- UXA-008 Dashboard Iconography And UX Governance.
- UXA-007 Mobile Private Header Compression.
- UXA-006 Local Action Feedback Placement.
- UXA-005 Workbench Visual Role Cleanup.
- UXA-004 Mobile Auth Action-First Layout.
- UXA-003 Dashboard First-Viewport Command Polish.
- UXA-002 Authenticated Private Route UX Evidence Harness.
- UXA-001 CompanyCore V1 UX/UI Audit.
- CCV1-067 Tech Stack Runtime Status Refresh.
- CCV1-066 Historical Guardrail Plan Classification.
- CCV1-065 Front-Door Docs Scope Refresh.
- CCV1-064 Historical Checklist Closure.
- CCV1-063 Historical Next Steps Refresh.
- CCV1-062 V1 Operator Runtime Pointer Refresh.
- AGRUN-008 Route-Level Business Editing Surfaces.
- AGRUN-009 Deploy Automation Reliability.
- CCV1-061 Agent State Source-Of-Truth Sync.
- V2WEB-049 Table Workbench Empty State Polish.
- V2WEB-048 Global Feedback Panel Polish.
- V2WEB-047 Public Entry Context Polish.
- V2WEB-046 Auth Onboarding Context Polish.
- V2WEB-045 ClickUp Setup Context Polish.
- V2WEB-044 Account Context Polish.
- V2WEB-043 Integration Map Context Polish.
- V2WEB-042 Google Drive Import Context Polish.
- V2WEB-041 Operating Area Context Polish.
- V2WEB-040 API Agent Access Context Polish.
- V2WEB-039 Relationships Mapping Context Polish.
- V2WEB-038 Pipeline Workflow Context Polish.
- V2WEB-037 Tasks Adapter Context Polish.
- V2WEB-036 Table Workbench Context Polish.
- V2WEB-035 Data Operations Index Polish.
- V2WEB-034 Command Bar Module Switcher Polish.
- V2WEB-033 App Shell Navigation Polish.
- V2WEB-032 Dashboard Command Layout Polish.
- V2WEB-031 Cross-Department Pipeline Semantics.
- V2GD-012 Drive Consent Guidance And Folder Picker.
- V2WEB-030 Typed Tasks Editor Workbench.
- V2WEB-029 Typed Task Lists Editor Workbench.
- V2WEB-028 Typed Clients Editor Workbench.
- V2WEB-027 Typed Projects Editor Workbench.
- V2WEB-026 Typed Notes Editor Workbench.
- V2WEB-025 Generic Table Record Workbench.
- AGRUN-005 Scoped Agent Key Owner UI.
- V2WEB-024 Data Operations Index.
- V2WEB-023 Dashboard Operational Cockpit.
- V2WEB-022 Unified API Integration Setup.
- V2GD-011 Drive Setup Operator Instructions.
- AGRUN-001 Agent Runtime Gap Plan.
- AGRUN-006 Agent Event Ack Positive Smoke.
- AGRUN-004 Reusable Agent Training Smoke.
- AGRUN-003 Machine-Readable Agent Contract.
- AGRUN-002 Service Key Scope Enforcement.
- V2WEB-021 User-Created Area Deletion Guardrails.
- AGCRUD-006 Agent CompanyCore API Playbook.
- AGCRUD-005 Provider/System Lifecycle Manifest.
- AGCRUD-004 Registry Resource Lifecycle API.
- AGCRUD-003 Business Archive/Delete Policy And Slice.
- AGCRUD-002 Business Read/Update API Completion.
- AGCRUD-001 Agent CRUD Capability Matrix.
- Initialize `companycore` from `!template`.
- Add Express/TypeScript/Prisma backend foundation.
- Add PostgreSQL schema for CompanyCore v1 entities.
- Add API key auth using `X-API-Key`.
- Add minimal endpoints required for v1.
- Add event creation for project/task/goal/target lifecycle events.
- Add initial ClickUp-shaped task sync endpoint.
- Add Dockerfile and Docker Compose.
- Add handoff documentation.
- Validate build and Docker smoke flow.
- Audit current repository architecture against CompanyCore v1 expectations.
- CCV1-002 Real planning queue and task contracts.
- CCV1-001 Canonical architecture and deployment docs alignment.
- CCV1-011 Workspace ownership and auth architecture contract.
- CCV1-014 API contract and error response standard.
- CCV1-015 Workspace guardrail test matrix.
- CCV1-003 Prisma migration baseline and deployment entrypoint.
- CCV1-012 Registration, login, and workspace bootstrap.
- CCV1-013 Workspace-scoped integration settings and secret storage.
- CCV1-017 Integration adapter contract and observability minimum.
- CCV1-010 Native ClickUp integration contract and first adapter slice.
- CCV1-004 Complete required v1 event emission.
- CCV1-005 Deployment domain documentation and smoke checklist.
- CCV1-016 Migration safety and seed/bootstrap policy.
- CCV1-007 API key hardening plan and implementation.
- CCV1-006 Endpoint test foundation.
- CCV1-008 Missing module route decision and minimal route slice.
- CCV1-018 Owner-managed adapter API keys.
- CCV1-009 Production deployment recovery and public smoke.
- CCV1-019 Database/API workspace coverage for core records.
- CCV1-021 Adapter connection handshake for Paperclip and Jarvis.
- CCV1-022 Adapter manifest for service clients.
- CCV1-023 Workspace-scoped agents API.
- CCV1-024 Workspace-scoped interactions API.
- CCV1-025 Task list and pipeline stage API.
- CCV1-026 Adapter smoke script.
- CCV1-009P Protected production smoke for adapter CRUD.
- CCV1-027 Paperclip and Jarvis production env wiring.
- CCV1-029 ClickUp production bootstrap slot.
- CCV1-030 Minimal owner ClickUp web console.
- CCV1-031P ClickUp owner console deployment plan.
- CCV1-028 Jarvis application-side CompanyCore Data Source deployment.
- CCV1-031 ClickUp Discovery Backend.
- CCV1-032 Guided Owner Console.
- CCV1-033 Production deploy and smoke for guided ClickUp owner console.
- CCV1-034 ClickUp-shaped operating model architecture and implementation plan.
- CCV1-034A Operating Model Registry Schema.
- CCV1-034B ClickUp Structure Persistence.
- CCV1-034B2 ClickUp Views and Custom Fields Persistence.
- CCV1-034C Registry-Backed Table API Contract.
- CCV1-034D Storage and Knowledge Roots.
- CCV1-034E Automation Scope Registry.
- CCV1-035 ClickUp first-run import policy and launch audit.
- CCV1-036 ClickUp webhook trigger architecture plan.
- CCV1-037 ClickUp list selection UX fix.
- CCV1-038 Dashboard task table.
- CCV1-039 ClickUp config-only save fix.
- CCV1-040 ClickUp save-and-sync activation fix.
- CCV1-036A Webhook Schema And Security Foundation.
- CCV1-036B ClickUp Webhook Registration.
- CCV1-036C ClickUp Webhook Receiver And Inbox.
- CCV1-036D Task Event Processor.
- CCV1-036E Agent Event Bridge.
- CCV1-036G CompanyCore to ClickUp write-back.
- CCV1-036F Production Webhook Smoke.
- CCV1-041 Template Agent Governance Sync.
- CCV1-042 ClickUp Full API Bridge Completion.
- CCV1-043 ClickUp Task Comment Bridge.
- CCV1-044 ClickUp Provider Event Retry And Health.
- CCV1-045 ClickUp Maintenance Freshness Run.
- CCV1-046 ClickUp Maintenance Scheduler.
- CCV1-047 Paperclip Application-Side CompanyCore Adapter.
- CCV1-048 V1 Closure Audit.
- CCV1-049 Authenticated Jarvis Smoke And Managed Paperclip Source Path.
- CCV1-050 Jarvis CompanyCore Answer Precision Hardening.
- CCV1-051 Clean Sync Data Hygiene.
- CCV1-052 V1 Launch Boundary And Source Handoff.
- CCV1-053 V1 Source Handoff Package.
- CCV1-054 Final V1 Runtime Rollover Smoke.
- CCV1-055 Full V1 Live System Smoke.
- CCV1-056 V1 Post-Release Artifact Cleanup.
- CCV1-057 Paperclip Source Handoff Validation.
- CCV1-058 OpenJarvis Source Handoff Validation.
- CCV1-059 GitHub Auto-Deploy Capability Audit.
- CCV1-060 V1 Operator Handoff.
- V2GD-001 Google Drive Architecture And Queue.
- V2GD-002 Google Drive Persistence Foundation.
- V2GD-003 Google Drive Provider Client And OAuth Settings.
- V2GD-004 Folder Discovery And File Import.
- V2GD-005 Docs And Sheets Read/Create/Edit.
- V2GD-006 Drive Changes Freshness.
- V2GD-007 Google Drive Deploy Smoke Hardening.
- V2GD-008 Google Drive OAuth Runtime Hardening.
- V2GD-009 Google Drive Production Rollover Smoke.
- V2GD-010 Drive Hierarchy Preview And Descriptions.
- V2WEB-001 Operating Map And Google Drive Console.
- V2WEB-002 Manual Provider Scope Mapping.
- V2WEB-003 Main Branch Web Console Shell Reconciliation.
- CCV1-020 GitHub webhook auto-deploy completion.
- V2WEB-004 Dedicated Operating Areas View.
- V2WEB-005 Dedicated Tasks Adapter View.
- V2WEB-006 Settings Integration Taxonomy View.
- V2WEB-007 Dedicated Pipeline View.
- V2WEB-008 Dashboard Command Center.
- V2WEB-009 Account Settings View.
- V2WEB-010 Relationship Review Center.
- V2WEB-011 Task Workbench Filters.
- V2WEB-012 Pipeline Workbench Filters.
- V2WEB-013 Operating Area Workbench Filters.
- V2WEB-014 Integration Matrix Filters.
- V2WEB-015 Google Drive Files Workbench Filters.
- V2WEB-016 API Workbench Filters.
- V2WEB-017 ClickUp List Tree Filters.
- V2WEB-018 Global Module Switcher.
- V2WEB-019 Relationship Review Filters.
- V2WEB-020 Main Operating Area Foundation.
