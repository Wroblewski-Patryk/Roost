# Architecture Graph

Generated: 2026-07-18T01:10:42.431Z

## Canonical Exports

- `architecture-awareness.json`
- `architecture-awareness.csv`
- `architecture-graph.mmd`
- `../status/architecture-awareness-report.md`

## Entity Index

| Type | Status | Name | Path | Owner |
| --- | --- | --- | --- | --- |
| agent | implemented | Agent Checklists | .agents/checklists/README.md | Engineering Delivery Lead |
| agent | implemented | Anti-Regression System | .agents/core/anti-regression.md | Engineering Delivery Lead |
| agent | implemented | Execution Loop | .agents/core/execution-loop.md | Engineering Delivery Lead |
| agent | implemented | Mission Control | .agents/core/mission-control.md | Engineering Delivery Lead |
| agent | implemented | Agent Operating System | .agents/core/operating-system.md | Engineering Delivery Lead |
| agent | implemented | Product Delivery System | .agents/core/product-delivery-system.md | Engineering Delivery Lead |
| agent | implemented | Product Intake And Decision Handshake | .agents/core/product-intake-and-decision-handshake.md | Engineering Delivery Lead |
| agent | implemented | Project Memory Index | .agents/core/project-memory-index.md | Engineering Delivery Lead |
| agent | implemented | Quality Gates | .agents/core/quality-gates.md | Engineering Delivery Lead |
| agent | implemented | Requirements Verification System | .agents/core/requirements-verification-system.md | Engineering Delivery Lead |
| agent | implemented | backend-builder | .agents/prompts/backend-builder.md | Engineering Delivery Lead |
| agent | implemented | code-reviewer | .agents/prompts/code-reviewer.md | Engineering Delivery Lead |
| agent | implemented | db-migrations | .agents/prompts/db-migrations.md | Engineering Delivery Lead |
| agent | implemented | frontend-builder | .agents/prompts/frontend-builder.md | Engineering Delivery Lead |
| agent | implemented | ops-release | .agents/prompts/ops-release.md | Engineering Delivery Lead |
| agent | implemented | planner | .agents/prompts/planner.md | Engineering Delivery Lead |
| agent | implemented | product-docs | .agents/prompts/product-docs.md | Engineering Delivery Lead |
| agent | implemented | qa-test | .agents/prompts/qa-test.md | Engineering Delivery Lead |
| agent | implemented | security-auditor | .agents/prompts/security-auditor.md | Engineering Delivery Lead |
| agent | implemented | Agent Reports | .agents/reports/README.md | Engineering Delivery Lead |
| agent | implemented | Procedure | .agents/skills/_templates/SKILL.template.md | Engineering Delivery Lead |
| agent | implemented | Capture Agent Learnings | .agents/skills/capture-agent-learnings/SKILL.md | Engineering Delivery Lead |
| agent | implemented | README | .agents/skills/README.md | Engineering Delivery Lead |
| agent | implemented | Active Mission Packet | .agents/state/active-mission.md | Engineering Delivery Lead |
| agent | implemented | Agent Process Evals | .agents/state/agent-evals.md | Engineering Delivery Lead |
| agent | implemented | Current Focus | .agents/state/current-focus.md | Engineering Delivery Lead |
| agent | implemented | Decision Register | .agents/state/decision-register.md | Engineering Delivery Lead |
| agent | implemented | Delivery Map | .agents/state/delivery-map.md | Engineering Delivery Lead |
| agent | implemented | Known Issues | .agents/state/known-issues.md | Engineering Delivery Lead |
| agent | implemented | 2026-07-18 LUC-1459 Module Confidence Update | .agents/state/module-confidence-ledger.md | Engineering Delivery Lead |
| agent | implemented | Next Steps | .agents/state/next-steps.md | Engineering Delivery Lead |
| agent | implemented | Quality Attribute Scenarios | .agents/state/quality-attribute-scenarios.md | Engineering Delivery Lead |
| agent | implemented | Regression Log | .agents/state/regression-log.md | Engineering Delivery Lead |
| agent | implemented | Requirements Verification Matrix | .agents/state/requirements-verification-matrix.md | Engineering Delivery Lead |
| agent | implemented | Responsibility Learning | .agents/state/responsibility-learning.md | Engineering Delivery Lead |
| agent | implemented | Risk Register | .agents/state/risk-register.md | Engineering Delivery Lead |
| agent | implemented | 2026-07-18 LUC-1459 Relationships Proof Health Signal | .agents/state/system-health.md | Engineering Delivery Lead |
| agent | implemented | Agent Tasks | .agents/tasks/README.md | Engineering Delivery Lead |
| agent | implemented | Agent Hierarchy | .agents/workflows/agent-hierarchy.md | Engineering Delivery Lead |
| agent | implemented | Codex Power Use Workflow | .agents/workflows/codex-power-use.md | Engineering Delivery Lead |
| agent | implemented | Documentation Governance Workflow | .agents/workflows/documentation-governance.md | Engineering Delivery Lead |
| agent | implemented | General Workspace Rules | .agents/workflows/general.md | Engineering Delivery Lead |
| agent | implemented | Responsibility Lanes | .agents/workflows/responsibility-lanes.md | Engineering Delivery Lead |
| agent | implemented | Subagent Orchestration Workflow | .agents/workflows/subagent-orchestration.md | Engineering Delivery Lead |
| agent | implemented | User Collaboration Workflow | .agents/workflows/user-collaboration.md | Engineering Delivery Lead |
| agent | implemented | World-Class Delivery Workflow | .agents/workflows/world-class-delivery.md | Engineering Delivery Lead |
| agent | implemented | Agents Module | src/modules/agents/README.md | Engineering Delivery Lead |
| api_endpoint | verified | GET / | src/app.ts#/ | Engineering Delivery Lead |
| api_endpoint | verified | USE /agent-events | src/app.ts#/agent-events | Engineering Delivery Lead |
| api_endpoint | verified | USE /agent-logs | src/app.ts#/agent-logs | Engineering Delivery Lead |
| api_endpoint | verified | USE /agents | src/app.ts#/agents | Engineering Delivery Lead |
| api_endpoint | verified | USE /api-keys | src/app.ts#/api-keys | Engineering Delivery Lead |
| api_endpoint | verified | USE /api/build-info | src/app.ts#/api/build-info | Engineering Delivery Lead |
| api_endpoint | verified | USE /assets | src/app.ts#/assets | Engineering Delivery Lead |
| api_endpoint | implemented | USE /auth | src/app.ts#/auth | Engineering Delivery Lead |
| api_endpoint | verified | USE /clients | src/app.ts#/clients | Engineering Delivery Lead |
| api_endpoint | verified | USE /commercial-exceptions | src/app.ts#/commercial-exceptions | Engineering Delivery Lead |
| api_endpoint | verified | USE /company-os | src/app.ts#/company-os | Engineering Delivery Lead |
| api_endpoint | verified | USE /connection | src/app.ts#/connection | Engineering Delivery Lead |
| api_endpoint | verified | USE /dashboard | src/app.ts#/dashboard | Engineering Delivery Lead |
| api_endpoint | verified | USE /deals | src/app.ts#/deals | Engineering Delivery Lead |
| api_endpoint | verified | USE /decisions | src/app.ts#/decisions | Engineering Delivery Lead |
| api_endpoint | verified | USE /departments | src/app.ts#/departments | Engineering Delivery Lead |
| api_endpoint | verified | USE /events | src/app.ts#/events | Engineering Delivery Lead |
| api_endpoint | implemented | USE /finance | src/app.ts#/finance | Engineering Delivery Lead |
| api_endpoint | verified | USE /goals | src/app.ts#/goals | Engineering Delivery Lead |
| api_endpoint | implemented | USE /google-drive | src/app.ts#/google-drive | Engineering Delivery Lead |
| api_endpoint | verified | USE /health | src/app.ts#/health | Engineering Delivery Lead |
| api_endpoint | verified | USE /intake | src/app.ts#/intake | Engineering Delivery Lead |
| api_endpoint | implemented | USE /integration-settings | src/app.ts#/integration-settings | Engineering Delivery Lead |
| api_endpoint | verified | USE /interactions | src/app.ts#/interactions | Engineering Delivery Lead |
| api_endpoint | verified | USE /mcp | src/app.ts#/mcp | Engineering Delivery Lead |
| api_endpoint | verified | USE /notes | src/app.ts#/notes | Engineering Delivery Lead |
| api_endpoint | verified | USE /operating-graph | src/app.ts#/operating-graph | Engineering Delivery Lead |
| api_endpoint | verified | USE /operating-model | src/app.ts#/operating-model | Engineering Delivery Lead |
| api_endpoint | verified | USE /operations | src/app.ts#/operations | Engineering Delivery Lead |
| api_endpoint | verified | USE /pipeline-stages | src/app.ts#/pipeline-stages | Engineering Delivery Lead |
| api_endpoint | verified | USE /process-core | src/app.ts#/process-core | Engineering Delivery Lead |
| api_endpoint | verified | USE /projects | src/app.ts#/projects | Engineering Delivery Lead |
| api_endpoint | verified | USE /ready | src/app.ts#/ready | Engineering Delivery Lead |
| api_endpoint | verified | USE /relationships | src/app.ts#/relationships | Engineering Delivery Lead |
| api_endpoint | implemented | USE /sales | src/app.ts#/sales | Engineering Delivery Lead |
| api_endpoint | verified | USE /strategy | src/app.ts#/strategy | Engineering Delivery Lead |
| api_endpoint | implemented | USE /targets | src/app.ts#/targets | Engineering Delivery Lead |
| api_endpoint | implemented | USE /task-lists | src/app.ts#/task-lists | Engineering Delivery Lead |
| api_endpoint | implemented | USE /tasks | src/app.ts#/tasks | Engineering Delivery Lead |
| api_endpoint | implemented | USE /v1 | src/app.ts#/v1 | Engineering Delivery Lead |
| api_endpoint | implemented | USE /v1/auth | src/app.ts#/v1/auth | Engineering Delivery Lead |
| api_endpoint | implemented | USE /v1/health | src/app.ts#/v1/health | Engineering Delivery Lead |
| api_endpoint | implemented | USE /v1/ready | src/app.ts#/v1/ready | Engineering Delivery Lead |
| api_endpoint | implemented | USE /v1/webhooks/clickup | src/app.ts#/v1/webhooks/clickup | Engineering Delivery Lead |
| api_endpoint | implemented | USE /workforce | src/app.ts#/workforce | Engineering Delivery Lead |
| api_endpoint | implemented | USE /workspaces | src/app.ts#/workspaces | Engineering Delivery Lead |
| component | verified | cc-button.tsx | web/src/components/cc-button.tsx | Engineering Delivery Lead |
| component | verified | cc-data-table.tsx | web/src/components/cc-data-table.tsx | Engineering Delivery Lead |
| component | verified | cc-field.tsx | web/src/components/cc-field.tsx | Engineering Delivery Lead |
| component | verified | cc-notice.tsx | web/src/components/cc-notice.tsx | Engineering Delivery Lead |
| component | verified | cc-resource-selector.tsx | web/src/components/cc-resource-selector.tsx | Engineering Delivery Lead |
| component | verified | cc-route-loading.tsx | web/src/components/cc-route-loading.tsx | Engineering Delivery Lead |
| component | verified | cc-text-input.tsx | web/src/components/cc-text-input.tsx | Engineering Delivery Lead |
| document | implemented | pull_request_template.md | .github/pull_request_template.md | Engineering Delivery Lead |
| document | implemented | Workflow Guidance | .github/workflows/README.md | Engineering Delivery Lead |
| document | implemented | Architecture Graph | .tmp/luc-5770-architecture-baseline/graphs/architecture-graph.md | Engineering Delivery Lead |
| document | deprecated | Architecture Awareness Report | .tmp/luc-5770-architecture-baseline/status/architecture-awareness-report.md | Engineering Delivery Lead |
| document | implemented | Dependency Report | .tmp/luc-5770-architecture-baseline/status/architecture-dependency-report.md | Engineering Delivery Lead |
| document | deprecated | Ownership Report | .tmp/luc-5770-architecture-baseline/status/architecture-ownership-report.md | Engineering Delivery Lead |
| document | implemented | Task Synchronization Report | .tmp/luc-5770-architecture-baseline/status/task-synchronization-report.md | Engineering Delivery Lead |
| document | implemented | AGENTS.md - Unified Project Conductor Standard | AGENTS.md | Engineering Delivery Lead |
| document | implemented | AI Testing Protocol | AI_TESTING_PROTOCOL.md | Engineering Delivery Lead |
| document | implemented | Definition Of Done | DEFINITION_OF_DONE.md | Engineering Delivery Lead |
| document | implemented | Deployment Gate | DEPLOYMENT_GATE.md | Engineering Delivery Lead |
| document | implemented | API | docs/API.md | Docs Memory Lead |
| document | implemented | Architecture | docs/ARCHITECTURE.md | Docs Memory Lead |
| document | implemented | Agent System Primitives | docs/architecture/agent-system-primitives.md | Docs Memory Lead |
| document | implemented | Architecture Evidence Graph System | docs/architecture/architecture-evidence-graph-system.md | Docs Memory Lead |
| document | implemented | Architecture Evidence System | docs/architecture/architecture-evidence-system.md | Docs Memory Lead |
| document | implemented | Architecture Source Of Truth | docs/architecture/architecture-source-of-truth.md | Docs Memory Lead |
| document | implemented | Autonomous Company Operating System Architecture | docs/architecture/autonomous-company-operating-system.md | Docs Memory Lead |
| document | implemented | Business Ontology Import Strategy | docs/architecture/business-ontology-import-strategy.md | Docs Memory Lead |
| document | implemented | Function Chains | docs/architecture/chains/README.md | Docs Memory Lead |
| document | implemented | Codebase Map | docs/architecture/codebase-map.md | Docs Memory Lead |
| document | implemented | Company OS Definition Editing Contract | docs/architecture/company-os-definition-editing-contract.md | Docs Memory Lead |
| document | implemented | Company OS Workflow Definition Command Contract | docs/architecture/company-os-workflow-definition-command-contract.md | Docs Memory Lead |
| document | implemented | CompanyCore Business Module Map | docs/architecture/companycore-business-module-map.md | Docs Memory Lead |
| document | implemented | companycore-global-business-flow.md | docs/architecture/companycore-global-business-flow.md | Docs Memory Lead |
| document | implemented | Data Ownership Map | docs/architecture/data-ownership-map.md | Docs Memory Lead |
| document | implemented | department-management-systems-architecture.md | docs/architecture/department-management-systems-architecture.md | Docs Memory Lead |
| document | implemented | Department Management Systems V1 Blueprint | docs/architecture/department-management-systems-v1-blueprint.md | Docs Memory Lead |
| document | implemented | MCP Tool Discovery And Refresh Contract | docs/architecture/mcp-tool-discovery-and-refresh-contract.md | Docs Memory Lead |
| document | implemented | Coordinator agent role | docs/architecture/nodes/generated/AGENT-COORDINATOR.md | Docs Memory Lead |
| document | implemented | Documentation and memory lane | docs/architecture/nodes/generated/AGENT-DOCUMENTATION-MEMORY.md | Docs Memory Lead |
| document | implemented | GET /v1/assets/context | docs/architecture/nodes/generated/API-ASSETS-CONTEXT.md | Docs Memory Lead |
| document | implemented | DELETE /v1/agents/:id | docs/architecture/nodes/generated/API-AUTO-0001.md | Docs Memory Lead |
| document | implemented | DELETE /v1/clients/:id | docs/architecture/nodes/generated/API-AUTO-0002.md | Docs Memory Lead |
| document | implemented | DELETE /v1/company-os/standards/:id | docs/architecture/nodes/generated/API-AUTO-0003.md | Docs Memory Lead |
| document | implemented | DELETE /v1/deals/:id | docs/architecture/nodes/generated/API-AUTO-0004.md | Docs Memory Lead |
| document | implemented | DELETE /v1/decisions/:id | docs/architecture/nodes/generated/API-AUTO-0005.md | Docs Memory Lead |
| document | implemented | DELETE /v1/goals/:id | docs/architecture/nodes/generated/API-AUTO-0006.md | Docs Memory Lead |
| document | implemented | DELETE /v1/integration-settings/clickup/webhooks/:id | docs/architecture/nodes/generated/API-AUTO-0007.md | Docs Memory Lead |
| document | implemented | DELETE /v1/interactions/:id | docs/architecture/nodes/generated/API-AUTO-0008.md | Docs Memory Lead |
| document | implemented | DELETE /v1/notes/:id | docs/architecture/nodes/generated/API-AUTO-0009.md | Docs Memory Lead |
| document | implemented | DELETE /v1/operating-model/areas/:id | docs/architecture/nodes/generated/API-AUTO-0010.md | Docs Memory Lead |
| document | implemented | DELETE /v1/operating-model/automation-definitions/:id | docs/architecture/nodes/generated/API-AUTO-0011.md | Docs Memory Lead |
| document | implemented | DELETE /v1/operating-model/folders/:id | docs/architecture/nodes/generated/API-AUTO-0012.md | Docs Memory Lead |
| document | implemented | DELETE /v1/operating-model/knowledge-roots/:id | docs/architecture/nodes/generated/API-AUTO-0013.md | Docs Memory Lead |
| document | implemented | DELETE /v1/operating-model/storage-locations/:id | docs/architecture/nodes/generated/API-AUTO-0014.md | Docs Memory Lead |
| document | implemented | DELETE /v1/pipeline-stages/:id | docs/architecture/nodes/generated/API-AUTO-0015.md | Docs Memory Lead |
| document | implemented | DELETE /v1/projects/:id | docs/architecture/nodes/generated/API-AUTO-0016.md | Docs Memory Lead |
| document | implemented | DELETE /v1/targets/:id | docs/architecture/nodes/generated/API-AUTO-0017.md | Docs Memory Lead |
| document | implemented | DELETE /v1/task-lists/:id | docs/architecture/nodes/generated/API-AUTO-0018.md | Docs Memory Lead |
| document | implemented | DELETE /v1/tasks/:id | docs/architecture/nodes/generated/API-AUTO-0019.md | Docs Memory Lead |
| document | implemented | DELETE /v1/workforce/:id | docs/architecture/nodes/generated/API-AUTO-0020.md | Docs Memory Lead |
| document | implemented | GET /v1/agent-events | docs/architecture/nodes/generated/API-AUTO-0021.md | Docs Memory Lead |
| document | implemented | GET /v1/agent-logs | docs/architecture/nodes/generated/API-AUTO-0022.md | Docs Memory Lead |
| document | implemented | GET /v1/agent-logs/:id | docs/architecture/nodes/generated/API-AUTO-0023.md | Docs Memory Lead |
| document | implemented | GET /v1/agents | docs/architecture/nodes/generated/API-AUTO-0024.md | Docs Memory Lead |
| document | implemented | GET /v1/agents/:id | docs/architecture/nodes/generated/API-AUTO-0025.md | Docs Memory Lead |
| document | implemented | GET /v1/assets/files/:id/preview | docs/architecture/nodes/generated/API-AUTO-0026.md | Docs Memory Lead |
| document | implemented | GET /v1/clients | docs/architecture/nodes/generated/API-AUTO-0027.md | Docs Memory Lead |
| document | implemented | GET /v1/clients/:id | docs/architecture/nodes/generated/API-AUTO-0028.md | Docs Memory Lead |
| document | implemented | GET /v1/commercial-exceptions | docs/architecture/nodes/generated/API-AUTO-0029.md | Docs Memory Lead |
| document | implemented | GET /v1/company-os | docs/architecture/nodes/generated/API-AUTO-0030.md | Docs Memory Lead |
| document | implemented | GET /v1/company-os/:collection | docs/architecture/nodes/generated/API-AUTO-0031.md | Docs Memory Lead |
| document | implemented | GET /v1/company-os/:collection/:id | docs/architecture/nodes/generated/API-AUTO-0032.md | Docs Memory Lead |
| document | implemented | GET /v1/company-os/workflow-definitions/drafts | docs/architecture/nodes/generated/API-AUTO-0033.md | Docs Memory Lead |
| document | implemented | GET /v1/company-os/workflow-definitions/drafts/:id | docs/architecture/nodes/generated/API-AUTO-0034.md | Docs Memory Lead |
| document | implemented | GET /v1/connection | docs/architecture/nodes/generated/API-AUTO-0035.md | Docs Memory Lead |
| document | implemented | GET /v1/deals | docs/architecture/nodes/generated/API-AUTO-0036.md | Docs Memory Lead |
| document | implemented | GET /v1/deals/:id | docs/architecture/nodes/generated/API-AUTO-0037.md | Docs Memory Lead |
| document | implemented | GET /v1/decisions | docs/architecture/nodes/generated/API-AUTO-0038.md | Docs Memory Lead |
| document | implemented | GET /v1/decisions/:id | docs/architecture/nodes/generated/API-AUTO-0039.md | Docs Memory Lead |
| document | implemented | GET /v1/events | docs/architecture/nodes/generated/API-AUTO-0040.md | Docs Memory Lead |
| document | implemented | GET /v1/finance/context | docs/architecture/nodes/generated/API-AUTO-0041.md | Docs Memory Lead |
| document | implemented | GET /v1/goals | docs/architecture/nodes/generated/API-AUTO-0042.md | Docs Memory Lead |
| document | implemented | GET /v1/goals/:id | docs/architecture/nodes/generated/API-AUTO-0043.md | Docs Memory Lead |
| document | implemented | GET /v1/google-drive/files | docs/architecture/nodes/generated/API-AUTO-0044.md | Docs Memory Lead |
| document | implemented | GET /v1/google-drive/files/:id/content | docs/architecture/nodes/generated/API-AUTO-0045.md | Docs Memory Lead |
| document | implemented | GET /v1/intake | docs/architecture/nodes/generated/API-AUTO-0046.md | Docs Memory Lead |
| document | implemented | GET /v1/intake/route-proposals | docs/architecture/nodes/generated/API-AUTO-0047.md | Docs Memory Lead |
| document | implemented | GET /v1/integration-settings/clickup | docs/architecture/nodes/generated/API-AUTO-0048.md | Docs Memory Lead |
| document | implemented | GET /v1/integration-settings/clickup/events | docs/architecture/nodes/generated/API-AUTO-0049.md | Docs Memory Lead |
| document | implemented | GET /v1/integration-settings/clickup/webhooks | docs/architecture/nodes/generated/API-AUTO-0050.md | Docs Memory Lead |
| document | implemented | GET /v1/integration-settings/google_drive | docs/architecture/nodes/generated/API-AUTO-0051.md | Docs Memory Lead |
| document | implemented | GET /v1/integration-settings/google_drive/folders/discover | docs/architecture/nodes/generated/API-AUTO-0052.md | Docs Memory Lead |
| document | implemented | GET /v1/interactions | docs/architecture/nodes/generated/API-AUTO-0053.md | Docs Memory Lead |
| document | implemented | GET /v1/interactions/:id | docs/architecture/nodes/generated/API-AUTO-0054.md | Docs Memory Lead |
| document | implemented | GET /v1/mcp/manifest | docs/architecture/nodes/generated/API-AUTO-0055.md | Docs Memory Lead |
| document | implemented | GET /v1/notes | docs/architecture/nodes/generated/API-AUTO-0056.md | Docs Memory Lead |
| document | implemented | GET /v1/notes/:id | docs/architecture/nodes/generated/API-AUTO-0057.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-graph/areas/:areaKey | docs/architecture/nodes/generated/API-AUTO-0058.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model | docs/architecture/nodes/generated/API-AUTO-0059.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/area-inventory | docs/architecture/nodes/generated/API-AUTO-0060.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/areas | docs/architecture/nodes/generated/API-AUTO-0061.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/automation-definitions | docs/architecture/nodes/generated/API-AUTO-0062.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/automation-definitions/:id | docs/architecture/nodes/generated/API-AUTO-0063.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/external-fields | docs/architecture/nodes/generated/API-AUTO-0064.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/external-mappings | docs/architecture/nodes/generated/API-AUTO-0065.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/folders | docs/architecture/nodes/generated/API-AUTO-0066.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/folders/:id | docs/architecture/nodes/generated/API-AUTO-0067.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/knowledge-roots | docs/architecture/nodes/generated/API-AUTO-0068.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/knowledge-roots/:id | docs/architecture/nodes/generated/API-AUTO-0069.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/storage-locations | docs/architecture/nodes/generated/API-AUTO-0070.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/storage-locations/:id | docs/architecture/nodes/generated/API-AUTO-0071.md | Docs Memory Lead |
| document | implemented | GET /v1/operating-model/tables | docs/architecture/nodes/generated/API-AUTO-0072.md | Docs Memory Lead |
| document | implemented | GET /v1/operations/context | docs/architecture/nodes/generated/API-AUTO-0073.md | Docs Memory Lead |
| document | implemented | GET /v1/pipeline-stages | docs/architecture/nodes/generated/API-AUTO-0074.md | Docs Memory Lead |
| document | implemented | GET /v1/pipeline-stages/:id | docs/architecture/nodes/generated/API-AUTO-0075.md | Docs Memory Lead |
| document | implemented | GET /v1/projects | docs/architecture/nodes/generated/API-AUTO-0076.md | Docs Memory Lead |
| document | implemented | GET /v1/projects/:id | docs/architecture/nodes/generated/API-AUTO-0077.md | Docs Memory Lead |
| document | implemented | GET /v1/relationships/graph | docs/architecture/nodes/generated/API-AUTO-0078.md | Docs Memory Lead |
| document | implemented | GET /v1/sales/context | docs/architecture/nodes/generated/API-AUTO-0079.md | Docs Memory Lead |
| document | implemented | GET /v1/strategy/context | docs/architecture/nodes/generated/API-AUTO-0080.md | Docs Memory Lead |
| document | implemented | GET /v1/targets | docs/architecture/nodes/generated/API-AUTO-0081.md | Docs Memory Lead |
| document | implemented | GET /v1/targets/:id | docs/architecture/nodes/generated/API-AUTO-0082.md | Docs Memory Lead |
| document | implemented | GET /v1/task-lists | docs/architecture/nodes/generated/API-AUTO-0083.md | Docs Memory Lead |
| document | implemented | GET /v1/task-lists/:id | docs/architecture/nodes/generated/API-AUTO-0084.md | Docs Memory Lead |
| document | implemented | GET /v1/tasks | docs/architecture/nodes/generated/API-AUTO-0085.md | Docs Memory Lead |
| document | implemented | GET /v1/tasks/:id | docs/architecture/nodes/generated/API-AUTO-0086.md | Docs Memory Lead |
| document | implemented | GET /v1/workforce/:id | docs/architecture/nodes/generated/API-AUTO-0087.md | Docs Memory Lead |
| document | implemented | PATCH /v1/agents/:id | docs/architecture/nodes/generated/API-AUTO-0088.md | Docs Memory Lead |
| document | implemented | PATCH /v1/assets/folders/:id | docs/architecture/nodes/generated/API-AUTO-0089.md | Docs Memory Lead |
| document | implemented | PATCH /v1/clients/:id | docs/architecture/nodes/generated/API-AUTO-0090.md | Docs Memory Lead |
| document | implemented | PATCH /v1/company-os/standards/:id | docs/architecture/nodes/generated/API-AUTO-0091.md | Docs Memory Lead |
| document | implemented | PATCH /v1/company-os/workflow-definitions/drafts/:id | docs/architecture/nodes/generated/API-AUTO-0092.md | Docs Memory Lead |
| document | implemented | PATCH /v1/deals/:id | docs/architecture/nodes/generated/API-AUTO-0093.md | Docs Memory Lead |
| document | implemented | PATCH /v1/decisions/:id | docs/architecture/nodes/generated/API-AUTO-0094.md | Docs Memory Lead |
| document | implemented | PATCH /v1/goals/:id | docs/architecture/nodes/generated/API-AUTO-0095.md | Docs Memory Lead |
| document | implemented | PATCH /v1/google-drive/docs/:id | docs/architecture/nodes/generated/API-AUTO-0096.md | Docs Memory Lead |
| document | implemented | PATCH /v1/google-drive/files/:id/description | docs/architecture/nodes/generated/API-AUTO-0097.md | Docs Memory Lead |
| document | implemented | PATCH /v1/google-drive/files/:id/scope | docs/architecture/nodes/generated/API-AUTO-0098.md | Docs Memory Lead |
| document | implemented | PATCH /v1/google-drive/files/:id/text-content | docs/architecture/nodes/generated/API-AUTO-0099.md | Docs Memory Lead |
| document | implemented | PATCH /v1/interactions/:id | docs/architecture/nodes/generated/API-AUTO-0100.md | Docs Memory Lead |
| document | implemented | PATCH /v1/notes/:id | docs/architecture/nodes/generated/API-AUTO-0101.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operating-model/areas/:id | docs/architecture/nodes/generated/API-AUTO-0102.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operating-model/automation-definitions/:id | docs/architecture/nodes/generated/API-AUTO-0103.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operating-model/external-mappings/:id/scope | docs/architecture/nodes/generated/API-AUTO-0104.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operating-model/folders/:id | docs/architecture/nodes/generated/API-AUTO-0105.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operating-model/knowledge-roots/:id | docs/architecture/nodes/generated/API-AUTO-0106.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operating-model/storage-locations/:id | docs/architecture/nodes/generated/API-AUTO-0107.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operations/task-lists/:id | docs/architecture/nodes/generated/API-AUTO-0108.md | Docs Memory Lead |
| document | implemented | PATCH /v1/pipeline-stages/:id | docs/architecture/nodes/generated/API-AUTO-0109.md | Docs Memory Lead |
| document | implemented | PATCH /v1/projects/:id | docs/architecture/nodes/generated/API-AUTO-0110.md | Docs Memory Lead |
| document | implemented | PATCH /v1/targets/:id | docs/architecture/nodes/generated/API-AUTO-0111.md | Docs Memory Lead |
| document | implemented | PATCH /v1/task-lists/:id | docs/architecture/nodes/generated/API-AUTO-0112.md | Docs Memory Lead |
| document | implemented | PATCH /v1/tasks/:id | docs/architecture/nodes/generated/API-AUTO-0113.md | Docs Memory Lead |
| document | implemented | PATCH /v1/workforce/:id | docs/architecture/nodes/generated/API-AUTO-0114.md | Docs Memory Lead |
| document | implemented | POST /v1/agent-events/:id/ack | docs/architecture/nodes/generated/API-AUTO-0115.md | Docs Memory Lead |
| document | implemented | POST /v1/agent-logs | docs/architecture/nodes/generated/API-AUTO-0116.md | Docs Memory Lead |
| document | implemented | POST /v1/agents | docs/architecture/nodes/generated/API-AUTO-0117.md | Docs Memory Lead |
| document | implemented | POST /v1/clients | docs/architecture/nodes/generated/API-AUTO-0118.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/approvals/:id/decision | docs/architecture/nodes/generated/API-AUTO-0119.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/approvals/request | docs/architecture/nodes/generated/API-AUTO-0120.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/events/:id/actions/evaluate-automation-rules | docs/architecture/nodes/generated/API-AUTO-0121.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/pipeline-runs/:id/actions/start-stage | docs/architecture/nodes/generated/API-AUTO-0122.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/stage-runs/:id/actions/block | docs/architecture/nodes/generated/API-AUTO-0123.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/stage-runs/:id/actions/complete | docs/architecture/nodes/generated/API-AUTO-0124.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/stage-runs/:id/actions/validate | docs/architecture/nodes/generated/API-AUTO-0125.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/standards | docs/architecture/nodes/generated/API-AUTO-0126.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive | docs/architecture/nodes/generated/API-AUTO-0127.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft | docs/architecture/nodes/generated/API-AUTO-0128.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/workflow-definitions/drafts | docs/architecture/nodes/generated/API-AUTO-0129.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate | docs/architecture/nodes/generated/API-AUTO-0130.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact | docs/architecture/nodes/generated/API-AUTO-0131.md | Docs Memory Lead |
| document | implemented | POST /v1/deals | docs/architecture/nodes/generated/API-AUTO-0132.md | Docs Memory Lead |
| document | implemented | POST /v1/decisions | docs/architecture/nodes/generated/API-AUTO-0133.md | Docs Memory Lead |
| document | implemented | POST /v1/goals | docs/architecture/nodes/generated/API-AUTO-0134.md | Docs Memory Lead |
| document | implemented | POST /v1/google-drive/docs | docs/architecture/nodes/generated/API-AUTO-0135.md | Docs Memory Lead |
| document | implemented | POST /v1/google-drive/sheets | docs/architecture/nodes/generated/API-AUTO-0136.md | Docs Memory Lead |
| document | implemented | POST /v1/intake/actions/propose-route | docs/architecture/nodes/generated/API-AUTO-0137.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/clickup/discover | docs/architecture/nodes/generated/API-AUTO-0138.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/clickup/events/retry-failed | docs/architecture/nodes/generated/API-AUTO-0139.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/clickup/maintenance/run | docs/architecture/nodes/generated/API-AUTO-0140.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/clickup/webhooks/reconcile | docs/architecture/nodes/generated/API-AUTO-0141.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/google_drive/changes/reconcile | docs/architecture/nodes/generated/API-AUTO-0142.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/google_drive/import | docs/architecture/nodes/generated/API-AUTO-0143.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/google_drive/oauth/authorize-url | docs/architecture/nodes/generated/API-AUTO-0144.md | Docs Memory Lead |
| document | implemented | POST /v1/integration-settings/google_drive/oauth/exchange | docs/architecture/nodes/generated/API-AUTO-0145.md | Docs Memory Lead |
| document | implemented | POST /v1/interactions | docs/architecture/nodes/generated/API-AUTO-0146.md | Docs Memory Lead |
| document | implemented | POST /v1/notes | docs/architecture/nodes/generated/API-AUTO-0147.md | Docs Memory Lead |
| document | implemented | POST /v1/operating-model/areas | docs/architecture/nodes/generated/API-AUTO-0148.md | Docs Memory Lead |
| document | implemented | POST /v1/operating-model/automation-definitions | docs/architecture/nodes/generated/API-AUTO-0149.md | Docs Memory Lead |
| document | implemented | POST /v1/operating-model/folders | docs/architecture/nodes/generated/API-AUTO-0150.md | Docs Memory Lead |
| document | implemented | POST /v1/operating-model/knowledge-roots | docs/architecture/nodes/generated/API-AUTO-0151.md | Docs Memory Lead |
| document | implemented | POST /v1/operating-model/storage-locations | docs/architecture/nodes/generated/API-AUTO-0152.md | Docs Memory Lead |
| document | implemented | POST /v1/pipeline-stages | docs/architecture/nodes/generated/API-AUTO-0153.md | Docs Memory Lead |
| document | implemented | POST /v1/projects | docs/architecture/nodes/generated/API-AUTO-0154.md | Docs Memory Lead |
| document | implemented | POST /v1/targets | docs/architecture/nodes/generated/API-AUTO-0155.md | Docs Memory Lead |
| document | implemented | POST /v1/task-lists | docs/architecture/nodes/generated/API-AUTO-0156.md | Docs Memory Lead |
| document | implemented | POST /v1/tasks | docs/architecture/nodes/generated/API-AUTO-0157.md | Docs Memory Lead |
| document | implemented | POST /v1/tasks/:id/clickup/custom-fields/:fieldId | docs/architecture/nodes/generated/API-AUTO-0158.md | Docs Memory Lead |
| document | implemented | POST /v1/tasks/sync/clickup | docs/architecture/nodes/generated/API-AUTO-0159.md | Docs Memory Lead |
| document | implemented | POST /v1/tasks/sync/clickup/native | docs/architecture/nodes/generated/API-AUTO-0160.md | Docs Memory Lead |
| document | implemented | POST /v1/workforce | docs/architecture/nodes/generated/API-AUTO-0161.md | Docs Memory Lead |
| document | implemented | POST /v1/workforce/:id/actions/delete | docs/architecture/nodes/generated/API-AUTO-0162.md | Docs Memory Lead |
| document | implemented | POST /v1/workforce/:id/actions/sync | docs/architecture/nodes/generated/API-AUTO-0163.md | Docs Memory Lead |
| document | implemented | PUT /v1/google-drive/sheets/:id/values | docs/architecture/nodes/generated/API-AUTO-0164.md | Docs Memory Lead |
| document | implemented | PUT /v1/integration-settings/clickup | docs/architecture/nodes/generated/API-AUTO-0165.md | Docs Memory Lead |
| document | implemented | PUT /v1/integration-settings/google_drive | docs/architecture/nodes/generated/API-AUTO-0166.md | Docs Memory Lead |
| document | implemented | GET /v1/relationships/context | docs/architecture/nodes/generated/API-AUTO-0167.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/pipeline-runs/:id/task-links | docs/architecture/nodes/generated/API-AUTO-0168.md | Docs Memory Lead |
| document | implemented | POST /v1/company-os/knowledge-links | docs/architecture/nodes/generated/API-AUTO-0169.md | Docs Memory Lead |
| document | implemented | GET /v1/process-core/coverage | docs/architecture/nodes/generated/API-AUTO-0170.md | Docs Memory Lead |
| document | implemented | GET /v1/dashboard/command | docs/architecture/nodes/generated/API-DASHBOARD-COMMAND.md | Docs Memory Lead |
| document | implemented | POST /v1/departments | docs/architecture/nodes/generated/API-DEPARTMENTS-CREATE.md | Docs Memory Lead |
| document | implemented | GET /v1/departments | docs/architecture/nodes/generated/API-DEPARTMENTS-LIST.md | Docs Memory Lead |
| document | implemented | PATCH /v1/departments/:id | docs/architecture/nodes/generated/API-DEPARTMENTS-UPDATE.md | Docs Memory Lead |
| document | implemented | POST /v1/operations/work-items | docs/architecture/nodes/generated/API-OPERATIONS-CREATE-WORK-ITEM.md | Docs Memory Lead |
| document | implemented | PATCH /v1/operations/work-items/:id | docs/architecture/nodes/generated/API-OPERATIONS-UPDATE-WORK-ITEM.md | Docs Memory Lead |
| document | implemented | GET /v1/operations/work-items | docs/architecture/nodes/generated/API-OPERATIONS-WORK-ITEMS.md | Docs Memory Lead |
| document | implemented | GET /v1/workforce | docs/architecture/nodes/generated/API-WORKFORCE-LIST.md | Docs Memory Lead |
| document | implemented | Clickup.Client | docs/architecture/nodes/generated/CLS-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Errors | docs/architecture/nodes/generated/CLS-AUTO-0002.md | Docs Memory Lead |
| document | implemented | Google Drive.Client | docs/architecture/nodes/generated/CLS-AUTO-0003.md | Docs Memory Lead |
| document | implemented | Client | docs/architecture/nodes/generated/CLS-AUTO-0004.md | Docs Memory Lead |
| document | implemented | AssetsRoute component | docs/architecture/nodes/generated/COMP-ASSETS-ROUTE.md | Docs Memory Lead |
| document | implemented | CcDataTable component | docs/architecture/nodes/generated/COMP-CC-DATA-TABLE.md | Docs Memory Lead |
| document | implemented | GeneralDashboard component | docs/architecture/nodes/generated/COMP-GENERAL-DASHBOARD.md | Docs Memory Lead |
| document | implemented | ManagementRoute component | docs/architecture/nodes/generated/COMP-MANAGEMENT-ROUTE.md | Docs Memory Lead |
| document | implemented | OperationsRoute component | docs/architecture/nodes/generated/COMP-OPERATIONS-ROUTE.md | Docs Memory Lead |
| document | implemented | PeopleAgentsRoute component | docs/architecture/nodes/generated/COMP-PEOPLE-AGENTS-ROUTE.md | Docs Memory Lead |
| document | implemented | Authenticated Shell component | docs/architecture/nodes/generated/COMP-SHELL.md | Docs Memory Lead |
| document | implemented | package.json scripts | docs/architecture/nodes/generated/CONFIG-PACKAGE-JSON.md | Docs Memory Lead |
| document | implemented | Clickup.Maintenance Scheduler | docs/architecture/nodes/generated/CRON-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Function chain CSV | docs/architecture/nodes/generated/CSV-CHAINS.md | Docs Memory Lead |
| document | implemented | Node registry CSV | docs/architecture/nodes/generated/CSV-NODES.md | Docs Memory Lead |
| document | implemented | Dependency relation CSV | docs/architecture/nodes/generated/CSV-RELATIONS.md | Docs Memory Lead |
| document | implemented | Test map CSV | docs/architecture/nodes/generated/CSV-TESTS.md | Docs Memory Lead |
| document | implemented | acceptance_criteria model | docs/architecture/nodes/generated/DB-AUTO-0001.md | Docs Memory Lead |
| document | implemented | agent_event_outbox model | docs/architecture/nodes/generated/DB-AUTO-0002.md | Docs Memory Lead |
| document | implemented | agent_logs model | docs/architecture/nodes/generated/DB-AUTO-0003.md | Docs Memory Lead |
| document | implemented | agents model | docs/architecture/nodes/generated/DB-AUTO-0004.md | Docs Memory Lead |
| document | implemented | api_keys model | docs/architecture/nodes/generated/DB-AUTO-0005.md | Docs Memory Lead |
| document | implemented | approvals model | docs/architecture/nodes/generated/DB-AUTO-0006.md | Docs Memory Lead |
| document | implemented | artifacts model | docs/architecture/nodes/generated/DB-AUTO-0007.md | Docs Memory Lead |
| document | implemented | audit_logs model | docs/architecture/nodes/generated/DB-AUTO-0008.md | Docs Memory Lead |
| document | implemented | automation_definitions model | docs/architecture/nodes/generated/DB-AUTO-0009.md | Docs Memory Lead |
| document | implemented | automation_rules model | docs/architecture/nodes/generated/DB-AUTO-0010.md | Docs Memory Lead |
| document | implemented | business_functions model | docs/architecture/nodes/generated/DB-AUTO-0011.md | Docs Memory Lead |
| document | implemented | checklist_items model | docs/architecture/nodes/generated/DB-AUTO-0012.md | Docs Memory Lead |
| document | implemented | checklist_templates model | docs/architecture/nodes/generated/DB-AUTO-0013.md | Docs Memory Lead |
| document | implemented | clients model | docs/architecture/nodes/generated/DB-AUTO-0014.md | Docs Memory Lead |
| document | implemented | company_roles model | docs/architecture/nodes/generated/DB-AUTO-0015.md | Docs Memory Lead |
| document | implemented | controls model | docs/architecture/nodes/generated/DB-AUTO-0016.md | Docs Memory Lead |
| document | implemented | deals model | docs/architecture/nodes/generated/DB-AUTO-0017.md | Docs Memory Lead |
| document | implemented | decision_logs model | docs/architecture/nodes/generated/DB-AUTO-0018.md | Docs Memory Lead |
| document | implemented | decisions model | docs/architecture/nodes/generated/DB-AUTO-0019.md | Docs Memory Lead |
| document | implemented | dependencies model | docs/architecture/nodes/generated/DB-AUTO-0020.md | Docs Memory Lead |
| document | implemented | events model | docs/architecture/nodes/generated/DB-AUTO-0021.md | Docs Memory Lead |
| document | implemented | external_container_mappings model | docs/architecture/nodes/generated/DB-AUTO-0022.md | Docs Memory Lead |
| document | implemented | external_field_mappings model | docs/architecture/nodes/generated/DB-AUTO-0023.md | Docs Memory Lead |
| document | implemented | external_webhook_registrations model | docs/architecture/nodes/generated/DB-AUTO-0024.md | Docs Memory Lead |
| document | implemented | goals model | docs/architecture/nodes/generated/DB-AUTO-0025.md | Docs Memory Lead |
| document | implemented | google_drive_content_snapshots model | docs/architecture/nodes/generated/DB-AUTO-0026.md | Docs Memory Lead |
| document | implemented | integration_capabilities model | docs/architecture/nodes/generated/DB-AUTO-0027.md | Docs Memory Lead |
| document | implemented | integration_settings model | docs/architecture/nodes/generated/DB-AUTO-0028.md | Docs Memory Lead |
| document | implemented | interactions model | docs/architecture/nodes/generated/DB-AUTO-0029.md | Docs Memory Lead |
| document | implemented | knowledge_items model | docs/architecture/nodes/generated/DB-AUTO-0030.md | Docs Memory Lead |
| document | implemented | knowledge_roots model | docs/architecture/nodes/generated/DB-AUTO-0031.md | Docs Memory Lead |
| document | implemented | metrics model | docs/architecture/nodes/generated/DB-AUTO-0032.md | Docs Memory Lead |
| document | implemented | notes model | docs/architecture/nodes/generated/DB-AUTO-0033.md | Docs Memory Lead |
| document | implemented | operating_areas model | docs/architecture/nodes/generated/DB-AUTO-0034.md | Docs Memory Lead |
| document | implemented | operating_folders model | docs/architecture/nodes/generated/DB-AUTO-0035.md | Docs Memory Lead |
| document | implemented | operating_tables model | docs/architecture/nodes/generated/DB-AUTO-0036.md | Docs Memory Lead |
| document | implemented | pipeline_runs model | docs/architecture/nodes/generated/DB-AUTO-0037.md | Docs Memory Lead |
| document | implemented | pipeline_stages model | docs/architecture/nodes/generated/DB-AUTO-0038.md | Docs Memory Lead |
| document | implemented | pipelines model | docs/architecture/nodes/generated/DB-AUTO-0039.md | Docs Memory Lead |
| document | implemented | policies model | docs/architecture/nodes/generated/DB-AUTO-0040.md | Docs Memory Lead |
| document | implemented | procedure_steps model | docs/architecture/nodes/generated/DB-AUTO-0041.md | Docs Memory Lead |
| document | implemented | procedures model | docs/architecture/nodes/generated/DB-AUTO-0042.md | Docs Memory Lead |
| document | implemented | processes model | docs/architecture/nodes/generated/DB-AUTO-0043.md | Docs Memory Lead |
| document | implemented | projects model | docs/architecture/nodes/generated/DB-AUTO-0044.md | Docs Memory Lead |
| document | implemented | provider_event_inbox model | docs/architecture/nodes/generated/DB-AUTO-0045.md | Docs Memory Lead |
| document | implemented | resources model | docs/architecture/nodes/generated/DB-AUTO-0046.md | Docs Memory Lead |
| document | implemented | risks model | docs/architecture/nodes/generated/DB-AUTO-0047.md | Docs Memory Lead |
| document | implemented | stage_runs model | docs/architecture/nodes/generated/DB-AUTO-0048.md | Docs Memory Lead |
| document | implemented | stakeholders model | docs/architecture/nodes/generated/DB-AUTO-0049.md | Docs Memory Lead |
| document | implemented | standards model | docs/architecture/nodes/generated/DB-AUTO-0050.md | Docs Memory Lead |
| document | implemented | storage_locations model | docs/architecture/nodes/generated/DB-AUTO-0051.md | Docs Memory Lead |
| document | implemented | targets model | docs/architecture/nodes/generated/DB-AUTO-0052.md | Docs Memory Lead |
| document | implemented | task_lists model | docs/architecture/nodes/generated/DB-AUTO-0053.md | Docs Memory Lead |
| document | implemented | tool_adapters model | docs/architecture/nodes/generated/DB-AUTO-0054.md | Docs Memory Lead |
| document | implemented | triggers model | docs/architecture/nodes/generated/DB-AUTO-0055.md | Docs Memory Lead |
| document | implemented | users model | docs/architecture/nodes/generated/DB-AUTO-0056.md | Docs Memory Lead |
| document | implemented | workspace_memberships model | docs/architecture/nodes/generated/DB-AUTO-0057.md | Docs Memory Lead |
| document | implemented | workspaces model | docs/architecture/nodes/generated/DB-AUTO-0058.md | Docs Memory Lead |
| document | implemented | pipeline_run_task_links model | docs/architecture/nodes/generated/DB-AUTO-0059.md | Docs Memory Lead |
| document | implemented | knowledge_links model | docs/architecture/nodes/generated/DB-AUTO-0060.md | Docs Memory Lead |
| document | implemented | google_drive_files model | docs/architecture/nodes/generated/DB-GOOGLE-DRIVE-FILE.md | Docs Memory Lead |
| document | implemented | Task model | docs/architecture/nodes/generated/DB-TASK.md | Docs Memory Lead |
| document | implemented | workforce_entities model | docs/architecture/nodes/generated/DB-WORKFORCE-ENTITY.md | Docs Memory Lead |
| document | implemented | workspace_departments model | docs/architecture/nodes/generated/DB-WORKSPACE-DEPARTMENTS.md | Docs Memory Lead |
| document | implemented | Architecture evidence source doc | docs/architecture/nodes/generated/DOC-ARCH-EVIDENCE-SYSTEM.md | Docs Memory Lead |
| document | implemented | Architecture README | docs/architecture/nodes/generated/DOC-ARCH-README.md | Docs Memory Lead |
| document | implemented | Architecture source of truth | docs/architecture/nodes/generated/DOC-ARCH-SOURCE-OF-TRUTH.md | Docs Memory Lead |
| document | implemented | Assets context task contract | docs/architecture/nodes/generated/DOC-ASSETS-CONTEXT-CONTRACT.md | Docs Memory Lead |
| document | implemented | Dashboard operations workforce foundation contract | docs/architecture/nodes/generated/DOC-DASHBOARD-CONTRACT.md | Docs Memory Lead |
| document | implemented | Design memory | docs/architecture/nodes/generated/DOC-DESIGN-MEMORY.md | Docs Memory Lead |
| document | implemented | Department management systems architecture | docs/architecture/nodes/generated/DOC-DMS-ARCH.md | Docs Memory Lead |
| document | implemented | Management department catalog task contract | docs/architecture/nodes/generated/DOC-MGMT-DEPT-CONTRACT.md | Docs Memory Lead |
| document | implemented | Operations agent runtime coverage ledger | docs/architecture/nodes/generated/DOC-OPS-AGENT-RUNTIME-LEDGER.md | Docs Memory Lead |
| document | implemented | Operations foundation task contract | docs/architecture/nodes/generated/DOC-OPS-WORK-ITEM-CONTRACT.md | Docs Memory Lead |
| document | implemented | People/Agents premium UX contract | docs/architecture/nodes/generated/DOC-PEOPLE-AGENTS-CONTRACT.md | Docs Memory Lead |
| document | implemented | Shared managed table task contract | docs/architecture/nodes/generated/DOC-SHARED-TABLE-CONTRACT.md | Docs Memory Lead |
| document | implemented | Testing documentation | docs/architecture/nodes/generated/DOC-TESTING.md | Docs Memory Lead |
| document | implemented | Unified organizational operating system architecture | docs/architecture/nodes/generated/DOC-UNIFIED-ORG.md | Docs Memory Lead |
| document | implemented | Web layer React ownership | docs/architecture/nodes/generated/DOC-WEB-LAYER-OWNERSHIP.md | Docs Memory Lead |
| document | implemented | operations_work_item_created | docs/architecture/nodes/generated/EVENT-OPERATIONS-WORK-ITEM-CREATED.md | Docs Memory Lead |
| document | implemented | paperclip_agent_config_sync_requested | docs/architecture/nodes/generated/EVENT-PAPERCLIP-SYNC-REQUESTED.md | Docs Memory Lead |
| document | implemented | Architecture Evidence System | docs/architecture/nodes/generated/FEAT-ARCH-EVIDENCE-SYSTEM.md | Docs Memory Lead |
| document | implemented | Assets Context Workbench | docs/architecture/nodes/generated/FEAT-ASSETS-CONTEXT.md | Docs Memory Lead |
| document | implemented | Agent Events Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Agent Logs Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0002.md | Docs Memory Lead |
| document | implemented | Agents Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0003.md | Docs Memory Lead |
| document | implemented | Clients Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0004.md | Docs Memory Lead |
| document | implemented | Commercial Exceptions Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0005.md | Docs Memory Lead |
| document | implemented | Company Os Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0006.md | Docs Memory Lead |
| document | implemented | Connection Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0007.md | Docs Memory Lead |
| document | implemented | Deals Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0008.md | Docs Memory Lead |
| document | implemented | Decisions Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0009.md | Docs Memory Lead |
| document | implemented | Events Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0010.md | Docs Memory Lead |
| document | implemented | Finance Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0011.md | Docs Memory Lead |
| document | implemented | Goals Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0012.md | Docs Memory Lead |
| document | implemented | Google Drive Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0013.md | Docs Memory Lead |
| document | implemented | Intake Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0014.md | Docs Memory Lead |
| document | implemented | Integration Settings Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0015.md | Docs Memory Lead |
| document | implemented | Interactions Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0016.md | Docs Memory Lead |
| document | implemented | Mcp Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0017.md | Docs Memory Lead |
| document | implemented | Notes Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0018.md | Docs Memory Lead |
| document | implemented | Operating Graph Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0019.md | Docs Memory Lead |
| document | implemented | Operating Model Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0020.md | Docs Memory Lead |
| document | implemented | Pipeline Stages Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0021.md | Docs Memory Lead |
| document | implemented | Projects Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0022.md | Docs Memory Lead |
| document | implemented | Relationships Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0023.md | Docs Memory Lead |
| document | implemented | Sales Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0024.md | Docs Memory Lead |
| document | implemented | Strategy Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0025.md | Docs Memory Lead |
| document | implemented | Targets Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0026.md | Docs Memory Lead |
| document | implemented | Task Lists Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0027.md | Docs Memory Lead |
| document | implemented | Tasks Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0028.md | Docs Memory Lead |
| document | implemented | Process Core Coverage Expansion | docs/architecture/nodes/generated/FEAT-AUTO-0029.md | Docs Memory Lead |
| document | implemented | Dashboard Command Packet | docs/architecture/nodes/generated/FEAT-DASHBOARD-COMMAND.md | Docs Memory Lead |
| document | implemented | Shared Managed Table | docs/architecture/nodes/generated/FEAT-MANAGED-TABLE.md | Docs Memory Lead |
| document | implemented | Management Department Catalog | docs/architecture/nodes/generated/FEAT-MGMT-DEPT-CATALOG.md | Docs Memory Lead |
| document | implemented | Operations Work Items | docs/architecture/nodes/generated/FEAT-OPERATIONS-WORK-ITEMS.md | Docs Memory Lead |
| document | implemented | People and Agents Directory | docs/architecture/nodes/generated/FEAT-PEOPLE-AGENTS-DIRECTORY.md | Docs Memory Lead |
| document | implemented | riskRank | docs/architecture/nodes/generated/FUNC-DASHBOARD-RISK-RANK.md | Docs Memory Lead |
| document | implemented | ensureDefaultDepartments | docs/architecture/nodes/generated/FUNC-ENSURE-DEFAULT-DEPARTMENTS.md | Docs Memory Lead |
| document | implemented | generateArchitectureGraph | docs/architecture/nodes/generated/FUNC-GENERATE-ARCH-GRAPH.md | Docs Memory Lead |
| document | implemented | serializeDepartment | docs/architecture/nodes/generated/FUNC-SERIALIZE-DEPARTMENT.md | Docs Memory Lead |
| document | implemented | visibleWorkItemRelations | docs/architecture/nodes/generated/FUNC-VISIBLE-WORK-ITEM-RELATIONS.md | Docs Memory Lead |
| document | implemented | Use Owner Packet | docs/architecture/nodes/generated/HOOK-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Clickup.Client | docs/architecture/nodes/generated/INT-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Clickup.Maintenance Scheduler | docs/architecture/nodes/generated/INT-AUTO-0002.md | Docs Memory Lead |
| document | implemented | Clickup.Mapper | docs/architecture/nodes/generated/INT-AUTO-0003.md | Docs Memory Lead |
| document | implemented | Clickup.Sync | docs/architecture/nodes/generated/INT-AUTO-0004.md | Docs Memory Lead |
| document | implemented | Clickup.Webhooks | docs/architecture/nodes/generated/INT-AUTO-0005.md | Docs Memory Lead |
| document | implemented | Webhook Signature | docs/architecture/nodes/generated/INT-AUTO-0006.md | Docs Memory Lead |
| document | implemented | Errors | docs/architecture/nodes/generated/INT-AUTO-0007.md | Docs Memory Lead |
| document | implemented | Google Drive.Auth | docs/architecture/nodes/generated/INT-AUTO-0008.md | Docs Memory Lead |
| document | implemented | Google Drive.Client | docs/architecture/nodes/generated/INT-AUTO-0009.md | Docs Memory Lead |
| document | implemented | Google Drive.Content | docs/architecture/nodes/generated/INT-AUTO-0010.md | Docs Memory Lead |
| document | implemented | Google Drive.Sync | docs/architecture/nodes/generated/INT-AUTO-0011.md | Docs Memory Lead |
| document | implemented | Integration Settings.Service | docs/architecture/nodes/generated/INT-AUTO-0012.md | Docs Memory Lead |
| document | implemented | Secrets | docs/architecture/nodes/generated/INT-AUTO-0013.md | Docs Memory Lead |
| document | implemented | Public Layout | docs/architecture/nodes/generated/LAY-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Shell | docs/architecture/nodes/generated/LAY-AUTO-0002.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0002.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0003.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0004.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0005.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0006.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0007.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0008.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0009.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0010.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0011.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0012.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0013.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0014.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0015.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0016.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0017.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0018.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0019.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0020.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0021.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0022.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0023.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0024.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0025.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0026.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0027.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0028.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0029.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0030.md | Docs Memory Lead |
| document | implemented | Migration | docs/architecture/nodes/generated/MIG-AUTO-0031.md | Docs Memory Lead |
| document | implemented | Api Key.Middleware | docs/architecture/nodes/generated/MW-AUTO-0001.md | Docs Memory Lead |
| document | implemented | Api Error | docs/architecture/nodes/generated/MW-AUTO-0002.md | Docs Memory Lead |
| document | implemented | Async Handler | docs/architecture/nodes/generated/MW-AUTO-0003.md | Docs Memory Lead |
| document | implemented | Error Handler | docs/architecture/nodes/generated/MW-AUTO-0004.md | Docs Memory Lead |

## Relation Index

| Type | From | To | Evidence |
| --- | --- | --- | --- |
| connected_to | api_endpoint:get:1998daec82 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-agent-events:1b4c65ace9 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-agent-logs:fe1d6cbaa9 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-agents:1c136317c6 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-api-build-info:36fe7c3255 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-api-keys:d7553f1e44 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-assets:ac41eec16d | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-auth:d272d61067 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-clients:da4494ab5d | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-commercial-exceptions:18765c44f9 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-company-os:fb1b853293 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-connection:b52b509477 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-dashboard:a4fbc07380 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-deals:2ceaef3b27 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-decisions:b29cd45684 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-departments:876f72fd71 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-events:679c33c90e | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-finance:b8821dee32 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-goals:da30547c55 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-google-drive:2b5bd7ccd8 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-health:8aa829ec00 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-intake:3c22276373 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-integration-settings:7da089bd2f | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-interactions:eb228af9f5 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-mcp:3055a10566 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-notes:c833b4443f | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-operating-graph:90c17b9387 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-operating-model:dcc5e71b5f | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-operations:f4ce71f687 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-pipeline-stages:d21ba6038b | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-process-core:ccf2131793 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-projects:2ab7f26357 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-ready:cd82f6ee50 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-relationships:acd9b6327c | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-sales:0c7ec2cf8b | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-strategy:0ead398998 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-targets:7ea27c60ae | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-task-lists:7770c51ee4 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-tasks:de5ac00ee8 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-v1-auth:02d088cd05 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-v1-health:145d12bca3 | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-v1-ready:035c4febde | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-v1-webhooks-clickup:61d965c5ad | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-v1:347b48829e | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-workforce:a03aa869cd | module:src:13b5974e74 | src/app.ts |
| connected_to | api_endpoint:use-workspaces:8d243549bd | module:src:13b5974e74 | src/app.ts |
| connected_to | function:mergegoogledrivesecret:3382200622 | feature:settings-routes-tsx:8e262225e5 | LUC-6911 Exchange event-chain frontend mapping after LUC-6905 |
| connected_to | function:mergegoogledrivesecret:3382200622 | model:types-ts:1fce583d96 | LUC-6911 Exchange event-chain frontend type mapping after LUC-6905 |
| connected_to | function:mergegoogledrivesecret:3382200622 | feature:messages-ts:2ff8f72a93 | LUC-6911 Exchange event-chain frontend copy mapping after LUC-6905 |
| connected_to | project:roost:122c92a083 | task:luc-1001-account-access-workforce-entityauthority-doc-link:b7994c7a4e | .codex/tasks/luc-1001-account-access-workforce-entityauthority-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:b1280c7901 | .codex/tasks/luc-1008-architecture-chain-integrity-proof.md |
| connected_to | project:roost:122c92a083 | task:task:66b2514fdb | .codex/tasks/luc-1010-account-access-workspaces-requireuserauth-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-1015-account-access-workspace-requireuserauth-doc-link:30073f9d5d | .codex/tasks/luc-1015-account-access-workspaces-requireuserauth-doc-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1018-account-access-clearownertoken-doc-link:3ab92912b8 | .codex/tasks/luc-1018-account-access-clear-owner-token-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:e2dcf18d2c | .codex/tasks/luc-1028-projects-route-get-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-1034-account-access-issignedin-doc-link:08458c7797 | .codex/tasks/luc-1034-account-access-issignedin-doc-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1041-account-access-ownertoken-doc-link:bbec1f6195 | .codex/tasks/luc-1041-account-access-owner-token-doc-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1058-account-access-setownertoken-doc-link:aa33623fe1 | .codex/tasks/luc-1058-account-access-set-owner-token-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:c8961e2120 | .codex/tasks/luc-1068-dashboard-architecture-health-dashboard-proof.md |
| connected_to | project:roost:122c92a083 | task:task:b5c3bb06fb | .codex/tasks/luc-1070-dashboard-architecture-health-dashboard-gate-proof.md |
| connected_to | project:roost:122c92a083 | task:task:57e15dbd18 | .codex/tasks/luc-1072-dashboard-overview-src-modules-dashboard-proof-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1074-dashboard-overview-src-modules-dashboard-doc-link:a6b7ca04de | .codex/tasks/luc-1074-dashboard-overview-src-modules-dashboard-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:906ce7e0df | .codex/tasks/luc-1076-dashboard-overview-cc-button-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:71631e2c9d | .codex/tasks/luc-1078-dashboard-overview-cc-data-table-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:ee81433627 | .codex/tasks/luc-1080-dashboard-overview-cc-field-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:5c63e3ca31 | .codex/tasks/luc-1082-dashboard-overview-cc-notice-proof-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1084-dashboard-overview-cc-resource-selector-proof-link:9d3790e9a7 | .codex/tasks/luc-1084-dashboard-overview-cc-resource-selector-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:56da1c12f2 | .codex/tasks/luc-1086-dashboard-overview-cc-route-loading-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:a11b12588b | .codex/tasks/luc-1088-dashboard-overview-cc-text-input-proof-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1090-dashboard-overview-assetsoverview-proof-link:cff55f352d | .codex/tasks/luc-1090-dashboard-overview-assetsoverview-proof-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1092-route-mixed-dirty-packet-after-luc-1090-assetsoverview-proof:8dcf3045c2 | .codex/tasks/luc-1092-route-mixed-dirty-packet-after-luc-1090-assetsoverview-proof.md |
| connected_to | project:roost:122c92a083 | task:task:157c1a1016 | .codex/tasks/luc-1093-trading-operation-use-strategy-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:c4a21764fb | .codex/tasks/luc-1095-trading-operation-src-modules-strategy-proof-link.md |
| connected_to | project:roost:122c92a083 | task:luc-1097-trading-operation-asjsonarray-doc-link:26dda14ec0 | .codex/tasks/luc-1097-trading-operation-asjsonarray-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:8cf71581bf | .codex/tasks/luc-1099-trading-operation-strategy-route-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:148fa638f5 | .codex/tasks/luc-1101-unclassified-root-get-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:0fcef1b6c4 | .codex/tasks/luc-1107-unclassified-user-workflow-use-agent-events-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:877880df05 | .codex/tasks/luc-1108-unclassified-user-workflow-use-agent-logs-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:9d14f2d371 | .codex/tasks/luc-1114-unclassified-user-workflow-use-agents-proof-link.md |
| connected_to | project:roost:122c92a083 | task:task:a5b42ad253 | .codex/tasks/luc-1131-prove-unclassified-user-workflow-missing-test-link-for-use-api-keys.md |
| connected_to | project:roost:122c92a083 | task:luc-1135-completion-evidence:78293fc999 | .codex/tasks/luc-1135-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:1b9a59bb7c | .codex/tasks/luc-1135-prove-unclassified-user-workflow-missing-test-link-for-use-api-build-info.md |
| connected_to | project:roost:122c92a083 | task:luc-1151-completion-evidence:3773ef3c2d | .codex/tasks/luc-1151-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:c9bb805c35 | .codex/tasks/luc-1151-prove-unclassified-user-workflow-missing-doc-link-for-use-api-build-info.md |
| connected_to | project:roost:122c92a083 | task:task:612815b6ef | .codex/tasks/luc-1160-normalize-luc-1151-task-status-indexing.md |
| connected_to | project:roost:122c92a083 | task:luc-1161-task-contract:4a0638966f | .codex/tasks/luc-1161-prove-unclassified-user-workflow-missing-test-link-for-use-assets.md |
| connected_to | project:roost:122c92a083 | task:task:1d586e023e | .codex/tasks/luc-1168-source-control-closure-classify-project-docs-dirty-packet-from-luc-1167.md |
| connected_to | project:roost:122c92a083 | task:task:7879ec3809 | .codex/tasks/luc-1169-prove-unclassified-user-workflow-missing-test-link-for-use-clients.md |
| connected_to | project:roost:122c92a083 | task:luc-1174-completion-evidence:65eeab039e | .codex/tasks/luc-1174-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:2dc0937607 | .codex/tasks/luc-1174-prove-unclassified-user-workflow-missing-doc-link-for-use-clients.md |
| connected_to | project:roost:122c92a083 | task:task:6d90bf89a7 | .codex/tasks/luc-1183-prove-unclassified-user-workflow-missing-test-link-for-use-commercial-exceptions.md |
| connected_to | project:roost:122c92a083 | task:task:a4043edcc7 | .codex/tasks/luc-1187-prove-unclassified-user-workflow-missing-test-link-for-use-company-os.md |
| connected_to | project:roost:122c92a083 | task:task:a4602ebb73 | .codex/tasks/luc-1192-prove-unclassified-user-workflow-missing-test-link-for-use-connection.md |
| connected_to | project:roost:122c92a083 | task:task:ddc3a8e8e4 | .codex/tasks/luc-1196-source-control-closure-for-luc-1192-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:3bd9e6a95e | .codex/tasks/luc-1197-prove-unclassified-user-workflow-missing-test-link-for-use-deals.md |
| connected_to | project:roost:122c92a083 | task:task:2ab0356051 | .codex/tasks/luc-1200-source-control-closure-for-luc-1197-deals-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1219-completion-evidence:98848bd2c8 | .codex/tasks/luc-1219-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:38d6160edc | .codex/tasks/luc-1219-prove-unclassified-user-workflow-missing-doc-link-for-use-deals.md |
| connected_to | project:roost:122c92a083 | task:task:9998bf4030 | .codex/tasks/luc-1225-source-control-closure-for-luc-1219-doc-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:3ae9aeea44 | .codex/tasks/luc-1226-prove-unclassified-user-workflow-missing-test-link-for-use-decisions.md |
| connected_to | project:roost:122c92a083 | task:task:abc2f7c89a | .codex/tasks/luc-1233-source-control-closure-for-luc-1226-decisions-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1234-completion-evidence:e71d774108 | .codex/tasks/luc-1234-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:7eb0086c15 | .codex/tasks/luc-1234-prove-unclassified-user-workflow-missing-doc-link-for-use-decisions.md |
| connected_to | project:roost:122c92a083 | task:task:911c812404 | .codex/tasks/luc-1239-prove-unclassified-user-workflow-missing-test-link-for-use-departments.md |
| connected_to | project:roost:122c92a083 | task:task:26fdd09e52 | .codex/tasks/luc-1248-source-control-closure-for-luc-1239-departments-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1252-completion-evidence:c000ca2f7f | .codex/tasks/luc-1252-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:114941343a | .codex/tasks/luc-1252-prove-unclassified-user-workflow-missing-doc-link-for-use-departments.md |
| connected_to | project:roost:122c92a083 | task:task:e7aac91c09 | .codex/tasks/luc-1253-source-control-closure-for-luc-1252-departments-doc-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:a05666404b | .codex/tasks/luc-1254-prove-unclassified-user-workflow-missing-test-link-for-use-events.md |
| connected_to | project:roost:122c92a083 | task:luc-1258-completion-evidence:048944e711 | .codex/tasks/luc-1258-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:f932d29e9c | .codex/tasks/luc-1258-prove-unclassified-user-workflow-missing-doc-link-for-use-events.md |
| connected_to | project:roost:122c92a083 | task:task:374c03f32d | .codex/tasks/luc-1260-source-control-closure-for-luc-1258-use-events-doc-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:cb123a5f7b | .codex/tasks/luc-1266-prove-unclassified-user-workflow-missing-test-link-for-use-goals.md |
| connected_to | project:roost:122c92a083 | task:task:7b0a53df15 | .codex/tasks/luc-1269-source-control-closure-for-luc-1266-goals-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1270-completion-evidence:8790938b1a | .codex/tasks/luc-1270-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:a899cba104 | .codex/tasks/luc-1270-prove-unclassified-user-workflow-missing-doc-link-for-use-goals.md |
| connected_to | project:roost:122c92a083 | task:task:1e499a208d | .codex/tasks/luc-1273-source-control-closure-for-luc-1270-goals-doc-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:f34eb5702c | .codex/tasks/luc-1274-prove-unclassified-user-workflow-missing-test-link-for-use-health.md |
| connected_to | project:roost:122c92a083 | task:luc-1277-completion-evidence:0d7e1b5688 | .codex/tasks/luc-1277-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:e137113372 | .codex/tasks/luc-1277-prove-unclassified-user-workflow-missing-doc-link-for-use-health.md |
| connected_to | project:roost:122c92a083 | task:task:d9f8ae7c84 | .codex/tasks/luc-1281-source-control-closure-for-luc-1274-health-proof-packet.md |
| connected_to | project:roost:122c92a083 | task:task:a36fad4d13 | .codex/tasks/luc-1283-source-control-closure-for-luc-1277-health-doc-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:50eb4549aa | .codex/tasks/luc-1285-prove-unclassified-user-workflow-missing-test-link-for-use-intake.md |
| connected_to | project:roost:122c92a083 | task:task:6229f32690 | .codex/tasks/luc-1295-source-control-closure-for-luc-1285-intake-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1296-completion-evidence:5eb8811167 | .codex/tasks/luc-1296-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:77784c1c77 | .codex/tasks/luc-1296-prove-account-access-missing-doc-link-for-use-intake.md |
| connected_to | project:roost:122c92a083 | task:task:0284a99c50 | .codex/tasks/luc-1304-source-control-closure-for-luc-1296-intake-doc-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1305-closeout:fd93d8fba1 | .codex/tasks/luc-1305-closeout.md |
| connected_to | project:roost:122c92a083 | task:task:28cea16a09 | .codex/tasks/luc-1307-prove-unclassified-user-workflow-missing-test-link-for-use-interactions.md |
| connected_to | project:roost:122c92a083 | task:task:78030d7e0e | .codex/tasks/luc-1309-source-control-closure-for-luc-1307-interactions-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1312-completion-evidence:cf52da37f0 | .codex/tasks/luc-1312-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:b7673d1487 | .codex/tasks/luc-1312-prove-unclassified-user-workflow-missing-doc-link-for-use-interactions.md |
| connected_to | project:roost:122c92a083 | task:task:4eb999ffe9 | .codex/tasks/luc-1321-prove-unclassified-user-workflow-missing-test-link-for-use-mcp.md |
| connected_to | project:roost:122c92a083 | task:task:d6ae16976f | .codex/tasks/luc-1324-source-control-closure-for-luc-1321-mcp-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:luc-1326-completion-evidence:a044857f4e | .codex/tasks/luc-1326-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:689aaedcdf | .codex/tasks/luc-1326-prove-account-access-missing-doc-link-for-use-mcp.md |
| connected_to | project:roost:122c92a083 | task:task:9a1f050127 | .codex/tasks/luc-1328-source-control-closure-for-luc-1326-mcp-doc-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:371375ddf4 | .codex/tasks/luc-1331-prove-unclassified-user-workflow-missing-test-link-for-use-notes.md |
| connected_to | project:roost:122c92a083 | task:task:af7e52de0d | .codex/tasks/luc-1333-source-control-closure-for-luc-1331-use-notes-packet.md |
| connected_to | project:roost:122c92a083 | task:task:09f7884c16 | .codex/tasks/luc-1339-classify-and-close-local-dirty-state-for-luc-1331-luc-1333.md |
| connected_to | project:roost:122c92a083 | task:task:6a5d255122 | .codex/tasks/luc-1344-classify-and-close-local-dirty-state-for-luc-1331-luc-1333-luc-1339.md |
| connected_to | project:roost:122c92a083 | task:task:98df478e4f | .codex/tasks/luc-1345-source-control-closure-commit-for-luc-1331-luc-1333-luc-1339-luc-1344.md |
| connected_to | project:roost:122c92a083 | task:luc-1347-closeout:d520ded342 | .codex/tasks/luc-1347-closeout.md |
| connected_to | project:roost:122c92a083 | task:luc-1347-completion-evidence:0cb7a1d1c3 | .codex/tasks/luc-1347-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:4f33f2ade9 | .codex/tasks/luc-1347-prove-unclassified-user-workflow-missing-doc-link-for-use-notes.md |
| connected_to | project:roost:122c92a083 | task:luc-1352-closeout:d0a30725cf | .codex/tasks/luc-1352-closeout.md |
| connected_to | project:roost:122c92a083 | task:task:272a8962ca | .codex/tasks/luc-1352-prove-unclassified-user-workflow-missing-test-link-for-use-operating-graph.md |
| connected_to | project:roost:122c92a083 | task:task:75a4d8a255 | .codex/tasks/luc-1360-classify-and-close-local-dirty-state-for-luc-1352.md |
| connected_to | project:roost:122c92a083 | task:task:c9bf465e72 | .codex/tasks/luc-1373-classify-and-close-local-dirty-state-for-luc-1352-luc-1360.md |
| connected_to | project:roost:122c92a083 | task:luc-1378-closeout:4e98222998 | .codex/tasks/luc-1378-closeout.md |
| connected_to | project:roost:122c92a083 | task:luc-1378-completion-evidence:d206c8492f | .codex/tasks/luc-1378-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:3e7deaf3b8 | .codex/tasks/luc-1378-prove-unclassified-user-workflow-missing-doc-link-for-use-operating-graph.md |
| connected_to | project:roost:122c92a083 | task:task:08cb3d15bf | .codex/tasks/luc-1390-classify-and-close-local-dirty-state-for-luc-1378.md |
| connected_to | project:roost:122c92a083 | task:task:eec1aa4bd0 | .codex/tasks/luc-1392-prove-unclassified-user-workflow-missing-test-link-for-use-operating-model.md |
| connected_to | project:roost:122c92a083 | task:task:73b70c3048 | .codex/tasks/luc-1398-prove-unclassified-user-workflow-missing-test-link-for-use-operations.md |
| connected_to | project:roost:122c92a083 | task:task:f3fe506692 | .codex/tasks/luc-1399-close-local-dirty-state-for-luc-1392-use-operating-model-packet.md |
| connected_to | project:roost:122c92a083 | task:task:32691a8433 | .codex/tasks/luc-1401-prove-unclassified-user-workflow-missing-test-link-for-use-pipeline-stages.md |
| connected_to | project:roost:122c92a083 | task:task:4eb0b00428 | .codex/tasks/luc-1411-classify-and-close-local-dirty-state-for-luc-1401.md |
| connected_to | project:roost:122c92a083 | task:task:4e239f4f9b | .codex/tasks/luc-1416-prove-unclassified-user-workflow-missing-test-link-for-use-process-core.md |
| connected_to | project:roost:122c92a083 | task:task:2cdef4141c | .codex/tasks/luc-1430-prove-unclassified-user-workflow-missing-test-link-for-use-projects.md |
| connected_to | project:roost:122c92a083 | task:task:5f06d262c9 | .codex/tasks/luc-1439-close-local-dirty-state-for-luc-1430-projects-proof-link-packet.md |
| connected_to | project:roost:122c92a083 | task:task:7f3cb89713 | .codex/tasks/luc-1442-prove-unclassified-user-workflow-missing-test-link-for-use-ready.md |
| connected_to | project:roost:122c92a083 | task:luc-1450-completion-evidence:59439e16e1 | .codex/tasks/luc-1450-completion-evidence.md |
| connected_to | project:roost:122c92a083 | task:task:f270fa190d | .codex/tasks/luc-1450-prove-user-configuration-missing-doc-link-for-use-connection.md |
| connected_to | project:roost:122c92a083 | task:task:fdab369c50 | .codex/tasks/luc-1455-source-control-closure-for-luc-1442-luc-1450.md |
| connected_to | project:roost:122c92a083 | task:task:ba12a9ca2b | .codex/tasks/luc-1459-prove-unclassified-user-workflow-missing-test-link-for-use-relationships.md |
| connected_to | project:roost:122c92a083 | task:luc-267-roost-public-route-alias-task-link-curation:fbf174e3ba | .codex/tasks/luc-267-roost-public-route-alias-task-link-curation.md |
| connected_to | project:roost:122c92a083 | task:luc-268-roost-app-completion-proof-link-curation-after-luc-262:9e2f15239f | .codex/tasks/luc-268-roost-app-completion-proof-link-curation-after-luc-262.md |
| connected_to | project:roost:122c92a083 | task:luc-321-source-control-closure-for-luc-262-luc-267-luc-268:d550d2aafb | .codex/tasks/luc-321-source-control-closure-for-luc-262-267-268.md |
| connected_to | project:roost:122c92a083 | task:luc-3712-architecture-task-link-backfill-for-173-implementation-rows:7fd1216070 | .codex/tasks/luc-3712-architecture-task-link-backfill.md |
| connected_to | project:roost:122c92a083 | task:luc-527-account-access-missing-test-link-proof:559cf874cf | .codex/tasks/luc-527-account-access-missing-test-link-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-538-account-access-google-drive-auth-proof:5704d9d0a8 | .codex/tasks/luc-538-account-access-google-drive-auth-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-546-account-access-google-drive-authorization-url-proof:14978d5a65 | .codex/tasks/luc-546-account-access-google-drive-authorization-url-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-550-project-truth-readback-after-luc-546:43739fbe1a | .codex/tasks/luc-550-project-truth-readback-after-luc-546.md |
| connected_to | project:roost:122c92a083 | task:luc-563-account-access-google-drive-authorization-url-doc-link:ee62128225 | .codex/tasks/luc-563-account-access-google-drive-authorization-url-doc-link.md |
| connected_to | project:roost:122c92a083 | task:luc-567-account-access-google-drive-authorization-code-exchange-proof:1628c6b299 | .codex/tasks/luc-567-account-access-google-drive-authorization-code-exchange-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-570-account-access-google-drive-authorization-code-exchange-doc-link:a79611a3b6 | .codex/tasks/luc-570-account-access-google-drive-authorization-code-exchange-doc-link.md |
| connected_to | project:roost:122c92a083 | task:luc-576-account-access-google-drive-fresh-oauth-proof:8796d3b129 | .codex/tasks/luc-576-account-access-google-drive-fresh-oauth-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-582-account-access-google-drive-fresh-oauth-doc-link:37fe22c7ac | .codex/tasks/luc-582-account-access-google-drive-fresh-oauth-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:6dfadbc975 | .codex/tasks/luc-602-source-control-closure-classification-before-deploy-readiness.md |
| connected_to | project:roost:122c92a083 | task:task:69188765b3 | .codex/tasks/luc-603-source-control-closure-project-truth-packet.md |
| connected_to | project:roost:122c92a083 | task:task:72d51c9ff1 | .codex/tasks/luc-610-account-access-google-drive-client-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-614-account-access-google-drive-client-doc-link:97708da9d1 | .codex/tasks/luc-614-account-access-google-drive-client-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:db7795a324 | .codex/tasks/luc-617-account-access-google-oauth-client-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-620-account-access-google-oauth-client-doc-link:884bb5c6d4 | .codex/tasks/luc-620-account-access-google-oauth-client-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:0dc3773294 | .codex/tasks/luc-623-source-control-classification-before-deploy-readiness.md |
| connected_to | project:roost:122c92a083 | task:task:fa04be220c | .codex/tasks/luc-721-account-access-stored-google-drive-secret-proof.md |
| connected_to | project:roost:122c92a083 | task:task:b7bc2d8179 | .codex/tasks/luc-726-dashboard-overview-route-gaps-local-proof.md |
| connected_to | project:roost:122c92a083 | task:task:abe276f713 | .codex/tasks/luc-742-account-access-stored-google-drive-secret-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:6d579ee56c | .codex/tasks/luc-754-account-access-has-fresh-access-token-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-776-account-access-merge-google-drive-config-proof:e36150e530 | .codex/tasks/luc-776-account-access-merge-google-drive-config-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-777-account-access-normalize-token-response-proof:a0e8285b13 | .codex/tasks/luc-777-account-access-normalize-token-response-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-778-account-access-post-google-oauth-token-proof:9be0ffde49 | .codex/tasks/luc-778-account-access-post-google-oauth-token-proof.md |
| connected_to | project:roost:122c92a083 | task:task:23d2637e83 | .codex/tasks/luc-786-account-access-merge-google-drive-config-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:8f65f8da2d | .codex/tasks/luc-787-account-access-normalize-token-response-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:506a5a0842 | .codex/tasks/luc-788-account-access-post-google-oauth-token-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:780e0f6c76 | .codex/tasks/luc-822-roost-source-control-classify-dirty-project-state.md |
| connected_to | project:roost:122c92a083 | task:task:d0b2850854 | .codex/tasks/luc-893-account-access-refresh-google-drive-oauth-proof-link.md |
| connected_to | project:roost:122c92a083 | task:luc-894-account-access-integration-settings-service-proof:457629a0b9 | .codex/tasks/luc-894-account-access-integration-settings-service-proof.md |
| connected_to | project:roost:122c92a083 | task:task:431cec34c5 | .codex/tasks/luc-895-account-access-parse-google-drive-oauth-secret-proof.md |
| connected_to | project:roost:122c92a083 | task:task:bfa3c4d5b9 | .codex/tasks/luc-904-source-control-closure-local-dirty-state-sidecar.md |
| connected_to | project:roost:122c92a083 | task:task:d5122aa43d | .codex/tasks/luc-905-source-control-closure-parent-dirty-state.md |
| connected_to | project:roost:122c92a083 | task:task:c2d0550ce1 | .codex/tasks/luc-926-source-control-closure-for-luc-895.md |
| connected_to | project:roost:122c92a083 | task:task:3f22b73136 | .codex/tasks/luc-928-account-access-refresh-google-drive-oauth-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:a2f6573d7c | .codex/tasks/luc-939-account-access-non-production-oauth-secret-proof-closure.md |
| connected_to | project:roost:122c92a083 | task:task:6f7cafdc16 | .codex/tasks/luc-943-account-access-parse-google-drive-oauth-secret-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:546ca92f5c | .codex/tasks/luc-948-source-control-closure-for-luc-943.md |
| connected_to | project:roost:122c92a083 | task:task:638b05362c | .codex/tasks/luc-949-account-access-secrets-proof.md |
| connected_to | project:roost:122c92a083 | task:task:ec249a7163 | .codex/tasks/luc-958-source-control-closure-for-luc-949.md |
| connected_to | project:roost:122c92a083 | task:task:8d9a7cbaa9 | .codex/tasks/luc-959-account-access-company-os-authactor-proof.md |
| connected_to | project:roost:122c92a083 | task:task:e460cf345a | .codex/tasks/luc-961-source-control-closure-for-luc-959.md |
| connected_to | project:roost:122c92a083 | task:task:37eea451f8 | .codex/tasks/luc-962-account-access-company-os-authactor-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:29cc94d553 | .codex/tasks/luc-971-account-access-authenticated-image-frontend-proof.md |
| connected_to | project:roost:122c92a083 | task:task:348405838f | .codex/tasks/luc-974-account-access-workflow-definition-drafts-authactor-proof.md |
| connected_to | project:roost:122c92a083 | task:task:30e7505193 | .codex/tasks/luc-977-account-access-workflow-definition-drafts-authactor-doc-link.md |
| connected_to | project:roost:122c92a083 | task:luc-982-account-access-intake-authactor-proof:0b12794747 | .codex/tasks/luc-982-account-access-intake-authactor-proof.md |
| connected_to | project:roost:122c92a083 | task:task:39692675ee | .codex/tasks/luc-988-account-access-intake-authactor-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:447271a3e0 | .codex/tasks/luc-989-source-control-closure-for-luc-982.md |
| connected_to | project:roost:122c92a083 | task:task:83795f24a5 | .codex/tasks/luc-990-account-access-intake-authactor-doc-link.md |
| connected_to | project:roost:122c92a083 | task:task:4e382263fe | .codex/tasks/luc-997-account-access-workforce-entityauthority-proof.md |
| connected_to | project:roost:122c92a083 | task:luc-998-dashboard-and-public-home-frontend-proof:d13d2bb165 | .codex/tasks/luc-998-dashboard-public-home-frontend-proof.md |
| connected_to | project:roost:122c92a083 | task:learning-journal:2ea07ed275 | .codex/context/LEARNING_JOURNAL.md |
| connected_to | project:roost:122c92a083 | task:project-state:c9626d46bd | .codex/context/PROJECT_STATE.md |
| connected_to | project:roost:122c92a083 | task:task-board:9aaadac0a2 | .codex/context/TASK_BOARD.md |
| documents | agent:2026-07-18-luc-1459-module-confidence-update:ad8518459c | module:agents:4ae71ba13a | .agents/state/module-confidence-ledger.md |
| documents | agent:2026-07-18-luc-1459-relationships-proof-health-signal:5da52bd83d | module:agents:4ae71ba13a | .agents/state/system-health.md |
| documents | agent:active-mission-packet:a0e3255194 | module:agents:4ae71ba13a | .agents/state/active-mission.md |
| documents | agent:agent-checklists:0b1e39f5f6 | module:agents:4ae71ba13a | .agents/checklists/README.md |
| documents | agent:agent-hierarchy:4835752b62 | module:agents:4ae71ba13a | .agents/workflows/agent-hierarchy.md |
| documents | agent:agent-operating-system:2f229839b5 | module:agents:4ae71ba13a | .agents/core/operating-system.md |
| documents | agent:agent-process-evals:143b49414c | module:agents:4ae71ba13a | .agents/state/agent-evals.md |
| documents | agent:agent-reports:5756740a98 | module:agents:4ae71ba13a | .agents/reports/README.md |
| documents | agent:agent-tasks:5144b7fe4a | module:agents:4ae71ba13a | .agents/tasks/README.md |
| documents | agent:agents-module:31b4780178 | module:src-modules-agents:b6d45c0d31 | src/modules/agents/README.md |
| documents | agent:anti-regression-system:9473e90460 | module:agents:4ae71ba13a | .agents/core/anti-regression.md |
| documents | agent:backend-builder:0af4fbb735 | module:agents:4ae71ba13a | .agents/prompts/backend-builder.md |
| documents | agent:capture-agent-learnings:cfb51edd20 | module:agents:4ae71ba13a | .agents/skills/capture-agent-learnings/SKILL.md |
| documents | agent:code-reviewer:5e88200e7b | module:agents:4ae71ba13a | .agents/prompts/code-reviewer.md |
| documents | agent:codex-power-use-workflow:fa752fdb73 | module:agents:4ae71ba13a | .agents/workflows/codex-power-use.md |
| documents | agent:current-focus:5edf18eb23 | module:agents:4ae71ba13a | .agents/state/current-focus.md |
| documents | agent:db-migrations:8a8b9e125f | module:agents:4ae71ba13a | .agents/prompts/db-migrations.md |
| documents | agent:decision-register:73d1cd6fc8 | module:agents:4ae71ba13a | .agents/state/decision-register.md |
| documents | agent:delivery-map:704464f41b | module:agents:4ae71ba13a | .agents/state/delivery-map.md |
| documents | agent:documentation-governance-workflow:75973b1953 | module:agents:4ae71ba13a | .agents/workflows/documentation-governance.md |
| documents | agent:execution-loop:c01d026946 | module:agents:4ae71ba13a | .agents/core/execution-loop.md |
| documents | agent:frontend-builder:8a06b01964 | module:agents:4ae71ba13a | .agents/prompts/frontend-builder.md |
| documents | agent:general-workspace-rules:2b434882d7 | module:agents:4ae71ba13a | .agents/workflows/general.md |
| documents | agent:known-issues:5043444a16 | module:agents:4ae71ba13a | .agents/state/known-issues.md |
| documents | agent:mission-control:86ecd445b8 | module:agents:4ae71ba13a | .agents/core/mission-control.md |
| documents | agent:next-steps:f65f9bc52d | module:agents:4ae71ba13a | .agents/state/next-steps.md |
| documents | agent:ops-release:1193a6d307 | module:agents:4ae71ba13a | .agents/prompts/ops-release.md |
| documents | agent:planner:5b56a0bd47 | module:agents:4ae71ba13a | .agents/prompts/planner.md |
| documents | agent:procedure:c3a7bc0b5d | module:agents:4ae71ba13a | .agents/skills/_templates/SKILL.template.md |
| documents | agent:product-delivery-system:bef3a71135 | module:agents:4ae71ba13a | .agents/core/product-delivery-system.md |
| documents | agent:product-docs:06b3b295a9 | module:agents:4ae71ba13a | .agents/prompts/product-docs.md |
| documents | agent:product-intake-and-decision-handshake:d20b921348 | module:agents:4ae71ba13a | .agents/core/product-intake-and-decision-handshake.md |
| documents | agent:project-memory-index:8428fccaed | module:agents:4ae71ba13a | .agents/core/project-memory-index.md |
| documents | agent:qa-test:b0c0bd2105 | module:agents:4ae71ba13a | .agents/prompts/qa-test.md |
| documents | agent:quality-attribute-scenarios:df9832217e | module:agents:4ae71ba13a | .agents/state/quality-attribute-scenarios.md |
| documents | agent:quality-gates:d55623d7b6 | module:agents:4ae71ba13a | .agents/core/quality-gates.md |
| documents | agent:readme:051638d4c8 | module:agents:4ae71ba13a | .agents/skills/README.md |
| documents | agent:regression-log:43781d0a01 | module:agents:4ae71ba13a | .agents/state/regression-log.md |
| documents | agent:requirements-verification-matrix:048af4ced3 | module:agents:4ae71ba13a | .agents/state/requirements-verification-matrix.md |
| documents | agent:requirements-verification-system:0730ae07c7 | module:agents:4ae71ba13a | .agents/core/requirements-verification-system.md |
| documents | agent:responsibility-lanes:5223e4bc50 | module:agents:4ae71ba13a | .agents/workflows/responsibility-lanes.md |
| documents | agent:responsibility-learning:82503fb0f6 | module:agents:4ae71ba13a | .agents/state/responsibility-learning.md |
| documents | agent:risk-register:a357934902 | module:agents:4ae71ba13a | .agents/state/risk-register.md |
| documents | agent:security-auditor:63dc9d9ff4 | module:agents:4ae71ba13a | .agents/prompts/security-auditor.md |
| documents | agent:subagent-orchestration-workflow:7e6a3994c0 | module:agents:4ae71ba13a | .agents/workflows/subagent-orchestration.md |
| documents | agent:user-collaboration-workflow:98bfb8bc00 | module:agents:4ae71ba13a | .agents/workflows/user-collaboration.md |
| documents | agent:world-class-delivery-workflow:8464f9dcd7 | module:agents:4ae71ba13a | .agents/workflows/world-class-delivery.md |
| documents | api_endpoint:use-auth:d272d61067 | document:system-architecture:1149ef3528 | LUC-6696 app-completion proof-link association |
| documents | api_endpoint:use-finance:b8821dee32 | document:get-v1-finance-context:db0b7f023e | LUC-6696 app-completion proof-link association |
| documents | api_endpoint:use-pipeline-stages:d21ba6038b | document:pipeline-stages-module:f43b558577 | LUC-1401 pipeline stages route documentation proof-link closure |
| documents | api_endpoint:use-process-core:ccf2131793 | document:luc-5220-process-core-api-journey-proof:fbb338f2c1 | LUC-1416 process core route documentation proof-link closure |
| documents | api_endpoint:use-projects:2ab7f26357 | document:api:a617d1cb61 | LUC-1430 projects route documentation proof-link closure |
| documents | api_endpoint:use-ready:cd82f6ee50 | document:api:a617d1cb61 | LUC-1442 ready route documentation proof-link closure |
| documents | api_endpoint:use-relationships:acd9b6327c | document:luc-5208-relationships-api-journey-proof:002b1cab4c | LUC-1459 relationships route documentation proof-link closure |
| documents | api_endpoint:use-sales:0c7ec2cf8b | document:get-v1-sales-context:078045055f | LUC-6696 app-completion proof-link association |
| documents | api_endpoint:use-v1-auth:02d088cd05 | document:system-architecture:1149ef3528 | LUC-6696 app-completion proof-link association |
| documents | document:acceptance-criteria-model:13886f82fd | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0001.md |
| documents | document:account-settings:d3a7a298ae | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-AUTO-0001.md |
| documents | document:acf-maint-001-large-file-modularization:17a3f6c8ae | module:docs:6784d83cb0 | docs/planning/acf-maint-001-task-contract.md |
| documents | document:acf-ops-002-build-metadata-health-restoration:55b154f815 | module:docs:6784d83cb0 | docs/planning/acf-ops-002-build-metadata-health-task-contract.md |
| documents | document:acf-prod-001-operating-model-data-completion-decision:30c5cfad2d | module:docs:6784d83cb0 | docs/planning/acf-prod-001-task-contract.md |
| documents | document:acf-ux-001-task-contract:ece1279d64 | module:docs:6784d83cb0 | docs/planning/acf-ux-001-task-contract.md |
| documents | document:adapter-onboarding:930aac71cb | module:docs:6784d83cb0 | docs/integrations/adapter-onboarding.md |
| documents | document:adapter-smoke:83bd4b3188 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0001.md |
| documents | document:adr-000-decision-title:4a89719d88 | module:docs:6784d83cb0 | docs/decisions/ADR-000-template.md |
| documents | document:advanced-template-propagation-index-2026-05-25-md:973c7b19ac | module:docs:6784d83cb0 | docs/status/advanced-template-propagation-index-2026-05-25.md |
| documents | document:agent-companycore-api-playbook:119914c85e | module:docs:6784d83cb0 | docs/operations/agent-companycore-api-playbook.md |
| documents | document:agent-crud-api-rollout-plan:eee605a7df | module:docs:6784d83cb0 | docs/planning/agent-crud-api-rollout-plan.md |
| documents | document:agent-event-outbox-model:ed353a03a4 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0002.md |
| documents | document:agent-events-coverage-expansion:e7bfd2fe67 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0001.md |
| documents | document:agent-logs-coverage-expansion:3f56f225d3 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0002.md |
| documents | document:agent-logs-model:2ee194fa18 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0003.md |
| documents | document:agent-logs-module:09e2b8691e | module:src-modules-agent-logs:a40b906887 | src/modules/agent-logs/README.md |
| documents | document:agent-readiness-checklist:fa550f48a9 | module:docs:6784d83cb0 | docs/governance/agent-readiness-checklist.md |
| documents | document:agent-runtime-contract:8994a426da | module:docs:6784d83cb0 | docs/governance/agent-runtime-contract.md |
| documents | document:agent-runtime-gap-closure-plan:091e4768b6 | module:docs:6784d83cb0 | docs/planning/agent-runtime-gap-closure-plan.md |
| documents | document:agent-setup-blueprint:779a2042f8 | module:docs:6784d83cb0 | docs/governance/agent-setup-blueprint.md |
| documents | document:agent-system-primitives:2b8f0fb433 | module:docs:6784d83cb0 | docs/architecture/agent-system-primitives.md |
| documents | document:agent-training-smoke:4fd0ff3d74 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0002.md |
| documents | document:agent-work-map:60c6758360 | module:docs:6784d83cb0 | docs/maps/agent-work-map.md |
| documents | document:agents-coverage-expansion:0fdda69aa1 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0003.md |
| documents | document:agents-md-unified-project-conductor-standard:07f601c4bd | module:item:884f3f28db | AGENTS.md |
| documents | document:agents-model:cb7c29dea8 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0004.md |
| documents | document:ai-testing-protocol:ef94a5ec65 | module:item:884f3f28db | AI_TESTING_PROTOCOL.md |
| documents | document:aog-be-001-area-operating-graph-read-api-task-contract:f384330046 | module:docs:6784d83cb0 | docs/planning/aog-be-001-area-operating-graph-read-api-task-contract.md |
| documents | document:aog-deploy-smoke:cbc098b32e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0040.md |
| documents | document:api-error:c49b0bf4a0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/MW-AUTO-0002.md |
| documents | document:api-key-middleware:071d632449 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/MW-AUTO-0001.md |
| documents | document:api-keys-model:02bff86e2b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0005.md |
| documents | document:api:a617d1cb61 | module:docs:6784d83cb0 | docs/API.md |
| documents | document:api:a617d1cb61 | api_endpoint:use-api-build-info:36fe7c3255 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-health:8aa829ec00 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-connection:b52b509477 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-intake:3c22276373 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-agents:1c136317c6 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-clients:da4494ab5d | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-deals:2ceaef3b27 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-decisions:b29cd45684 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-departments:876f72fd71 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-events:679c33c90e | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-goals:da30547c55 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-interactions:eb228af9f5 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-mcp:3055a10566 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-operating-graph:90c17b9387 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | api_endpoint:use-notes:c833b4443f | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:authactor:b3f790a259 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:authactor:8f0ce27a64 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:requireuserauth:215e610fd9 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:entityauthority:b0421607e6 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:ownertoken:cff9bd9e05 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:setownertoken:7303fbe684 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:clearownertoken:2ccc56ad47 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:issignedin:ca7bd93172 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | module:src-modules-dashboard:371b871372 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | feature:dashboard-routes-ts:cb24115ec5 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:coercecount:f105944c04 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:pickhealth:97c44d9ddb | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:riskrank:b7e74a6224 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:startoftoday:6c9c4ddbb2 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:startoftomorrow:8692cea6c0 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:sumcounts:369b91fee6 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | module:src-modules-strategy:af6e751a33 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | feature:strategy-routes-ts:cedc4e61d8 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:asjsonarray:b4688e6d13 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:textmatchesstrategy:aaa24fc170 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:api:a617d1cb61 | function:tasklooksstrategic:830e2f3cd4 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:app-completion-index:2db9905a4e | module:docs:6784d83cb0 | docs/status/app-completion-index.md |
| documents | document:app-creation-playbook:4c3d8fc278 | module:docs:6784d83cb0 | docs/governance/app-creation-playbook.md |
| documents | document:application-completion-audit-task-contract-template:6956f095d1 | module:docs:6784d83cb0 | docs/planning/application-completion-audit-task-contract-template.md |
| documents | document:application-completion-audit-task-contract:202895e688 | module:docs:6784d83cb0 | docs/planning/application-completion-audit-task-contract.md |
| documents | document:application-completion-audit:c86263d4f1 | module:docs:6784d83cb0 | docs/operations/application-completion-audit-2026-05-14.md |
| documents | document:application-foundation-audit:de4d22e079 | module:docs:6784d83cb0 | docs/planning/application-foundation-audit-2026-05-18.md |
| documents | document:approval-aware-agent-command-flow:0786da2dd2 | module:docs:6784d83cb0 | docs/operations/approval-aware-agent-command-flow.md |
| documents | document:approval-aware-mcp-command-flow:6e97e6838d | module:docs:6784d83cb0 | docs/operations/approval-aware-mcp-command-flow.md |
| documents | document:approvals-model:fb962cf3cd | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0006.md |
| documents | document:architecture-awareness-report:e81b52bbfb | module:tmp:8b20b5b6eb | .tmp/luc-5770-architecture-baseline/status/architecture-awareness-report.md |
| documents | document:architecture-documentation:80d86f79f2 | module:docs:6784d83cb0 | docs/architecture/README.md |
| documents | document:architecture-drift-report:2048752ce8 | module:docs:6784d83cb0 | docs/status/architecture-drift-report.md |
| documents | document:architecture-evidence-graph-system:0193b4b4eb | module:docs:6784d83cb0 | docs/architecture/architecture-evidence-graph-system.md |
| documents | document:architecture-evidence-source-doc:1c50446955 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DOC-ARCH-EVIDENCE-SYSTEM.md |
| documents | document:architecture-evidence-summary:2a1dc38c25 | module:docs:6784d83cb0 | docs/status/architecture-evidence-summary.md |
| documents | document:architecture-evidence-system:780cdf55cd | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-ARCH-EVIDENCE-SYSTEM.md |
| documents | document:architecture-evidence-system:a7d552a139 | module:docs:6784d83cb0 | docs/architecture/architecture-evidence-system.md |
| documents | document:architecture-graph-check-prompt:784b214385 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PROMPT-ARCH-GRAPH-CHECK.md |
| documents | document:architecture-graph-generator:2fc512b479 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/SCRIPT-ARCH-GRAPH-GENERATOR.md |
| documents | document:architecture-graph:b786238bfa | module:tmp:8b20b5b6eb | .tmp/luc-5770-architecture-baseline/graphs/architecture-graph.md |
| documents | document:architecture-health-dashboard:3341f66d62 | module:docs:6784d83cb0 | docs/status/architecture-health-dashboard.md |
| documents | document:architecture-map-status:40009e1221 | module:docs:6784d83cb0 | docs/status/architecture-map-status.md |
| documents | document:architecture-map:9fa8863725 | module:docs:6784d83cb0 | docs/maps/architecture-map.md |
| documents | document:architecture-proof-bundle:8c4c597891 | module:docs:6784d83cb0 | docs/status/architecture-proof-bundle.md |
| documents | document:architecture-readme:7af3bff899 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DOC-ARCH-README.md |
| documents | document:architecture-registry-catalog:437d3d1152 | module:docs:6784d83cb0 | docs/status/architecture-registry-catalog.md |
| documents | document:architecture-registry-guide:511ff039ac | module:docs:6784d83cb0 | docs/architecture/registry/README.md |
| documents | document:architecture-roadmap:bd5296dea5 | module:docs:6784d83cb0 | docs/status/architecture-roadmap.md |
| documents | document:architecture-source-of-truth:11677e8b75 | module:docs:6784d83cb0 | docs/architecture/architecture-source-of-truth.md |
| documents | document:architecture-source-of-truth:869628df31 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DOC-ARCH-SOURCE-OF-TRUTH.md |
| documents | document:architecture:465b92d208 | module:docs:6784d83cb0 | docs/ARCHITECTURE.md |
| documents | document:areas-area-00-ogolny-view-overview:eae5a91042 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-00-GENERAL.md |
| documents | document:areas-area-04-operacje-view-tasks:3494bd8a54 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-04-OPERATIONS-TASKS.md |
| documents | document:areas-area-06-kadry-view-directory:56e32723db | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-06-PEOPLE-AGENTS.md |
| documents | document:areas-area-08-zasoby-view-files:bc6ca69301 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-08-ASSETS-FILES.md |
| documents | document:areas-area-12-zarzadzanie-view-departments:aa5b5b39dd | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-12-MANAGEMENT-DEPARTMENTS.md |
| documents | document:areas-route-body-usability-audit:aaabf779c4 | module:docs:6784d83cb0 | docs/ux/areas-route-body-usability-audit-2026-05-15.md |
| documents | document:areas:4e45507f22 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-AUTO-0002.md |
| documents | document:artifacts-model:30261cbb05 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0007.md |
| documents | document:assets-context-task-contract:6168923e2f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DOC-ASSETS-CONTEXT-CONTRACT.md |
| documents | document:assets-context-workbench:254e824cea | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-ASSETS-CONTEXT.md |
| documents | document:assets-file-preview-workbench-task-contract:660367fec6 | module:docs:6784d83cb0 | docs/planning/assets-file-preview-workbench-task-contract.md |
| documents | document:assets-file-preview:69fbadc843 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/UI-ASSETS-FILE-PREVIEW.md |
| documents | document:assets-folders-002-folder-tree-and-edit-command:b728ac58f6 | module:docs:6784d83cb0 | docs/planning/assets-folder-tree-and-edit-task-contract.md |
| documents | document:assetsroute-component:926d9a1886 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/COMP-ASSETS-ROUTE.md |
| documents | document:async-handler:5c6db072d9 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/MW-AUTO-0003.md |
| documents | document:audit-logs-model:35ebf92ba3 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0008.md |
| documents | document:auth-login:bc06ab7f2d | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-AUTO-0003.md |
| documents | document:auth-register:f4cb58594c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-AUTO-0004.md |
| documents | document:auth-workspace-and-integration-plan:3a747b15bf | module:docs:6784d83cb0 | docs/planning/auth-workspace-integration-plan.md |
| documents | document:authenticated-shell-component:a65936ca97 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/COMP-SHELL.md |
| documents | document:authenticated-shell-layout-audit:7f0c0d0e83 | module:docs:6784d83cb0 | docs/ux/authenticated-shell-layout-audit-2026-05-14.md |
| documents | document:automation-definitions-model:15b4171168 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0009.md |
| documents | document:automation-rules-model:513ac21582 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0010.md |
| documents | document:autonomous-company-operating-system-architecture:8cf88d25f1 | module:docs:6784d83cb0 | docs/architecture/autonomous-company-operating-system.md |
| documents | document:autonomous-engineering-loop:471c2db101 | module:docs:6784d83cb0 | docs/governance/autonomous-engineering-loop.md |
| documents | document:background-and-decorative-asset-strategy:b4d245d374 | module:docs:6784d83cb0 | docs/ux/background-and-decorative-asset-strategy.md |
| documents | document:brand-personality-tokens:5473524fe5 | module:docs:6784d83cb0 | docs/ux/brand-personality-tokens.md |
| documents | document:browser-rendered-assets-overview-proof:c48814f824 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/TEST-BROWSER-ASSETS-OVERVIEW.md |
| documents | document:browser-rendered-department-catalog-proof:983521a027 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/TEST-BROWSER-MGMT-DEPT.md |
| documents | document:build-architecture-chain-hardening-worklist:6c78d54b25 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0003.md |
| documents | document:build-architecture-dead-nodes-report:f7c2559c71 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0028.md |
| documents | document:build-architecture-delta-report:90a12daf4c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0031.md |
| documents | document:build-architecture-evidence-worklist:efce1c0fff | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0004.md |
| documents | document:build-architecture-health-dashboard:48532726c0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0005.md |
| documents | document:build-architecture-impact-index:51eec2d9c0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0026.md |
| documents | document:build-architecture-registry-catalog:5bb17c445d | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0039.md |
| documents | document:build-architecture-roadmap:feafa81220 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0029.md |
| documents | document:business-functions-model:36ebbf604e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0011.md |
| documents | document:business-ontology-import-strategy:637ff1982d | module:docs:6784d83cb0 | docs/architecture/business-ontology-import-strategy.md |
| documents | document:canonical-visual-implementation-workflow:4cbd389999 | module:docs:6784d83cb0 | docs/ux/canonical-visual-implementation-workflow.md |
| documents | document:capability-map:9042ff3c9c | module:docs:6784d83cb0 | docs/product/capability-map.md |
| documents | document:cc-00-001-route-proposal-lifecycle-readback-plan:b6eb1449b5 | module:docs:6784d83cb0 | docs/planning/cc-00-001-route-proposal-lifecycle-readback-plan.md |
| documents | document:cc-00-04-08-architecture-and-ux-audit:06862dfa38 | module:docs:6784d83cb0 | docs/planning/cc-00-04-08-architecture-ux-audit.md |
| documents | document:cc-04-001-operations-task-model-gap-audit:ee69c13329 | module:docs:6784d83cb0 | docs/planning/cc-04-001-operations-task-model-gap-audit.md |
| documents | document:cc-08-001-assets-resource-system-spec:9be168cc00 | module:docs:6784d83cb0 | docs/planning/cc-08-001-assets-resource-system-spec.md |
| documents | document:cc-ui-001-shared-component-inventory:6cb375d48f | module:docs:6784d83cb0 | docs/planning/cc-ui-001-shared-component-inventory.md |
| documents | document:ccdatatable-component:a1c691e020 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/COMP-CC-DATA-TABLE.md |
| documents | document:check-architecture-chain-coverage:6770854a5c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0006.md |
| documents | document:check-architecture-chain-integrity:78fee47a1a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0007.md |
| documents | document:check-architecture-connectivity:7a34da1db0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0025.md |
| documents | document:check-architecture-csv-contract:74e8f755a4 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0032.md |
| documents | document:check-architecture-delta-zero:3b22c5dedf | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0037.md |
| documents | document:check-architecture-doc-baseline:7d1c3283ce | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0033.md |
| documents | document:check-architecture-evidence-gate:4043f66b18 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0008.md |
| documents | document:check-architecture-node-artifacts:7d617b34ed | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0035.md |
| documents | document:check-architecture-node-catalog-consistency:ac65c65034 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0027.md |
| documents | document:check-architecture-node-integrity:fa80820c43 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0009.md |
| documents | document:check-architecture-node-links:b9c1bfc942 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0034.md |
| documents | document:check-architecture-relation-integrity:cbc2c5b1a2 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0030.md |
| documents | document:check-architecture-report-presence:fd4c336b36 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0036.md |
| documents | document:check-route-capabilities:50d1d99598 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0010.md |
| documents | document:checklist-items-model:3116555902 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0012.md |
| documents | document:checklist-templates-model:05ec497598 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0013.md |
| documents | document:clean-react-build:44284e87cf | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0011.md |
| documents | document:clickup-client:921c705e28 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/CLS-AUTO-0001.md |
| documents | document:clickup-client:eae5ec3dac | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0001.md |
| documents | document:clickup-maintenance-scheduler:477b5530e9 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/CRON-AUTO-0001.md |
| documents | document:clickup-maintenance-scheduler:57c62aeb4b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0002.md |
| documents | document:clickup-mapper:3e147de5ac | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0003.md |
| documents | document:clickup-owner-console-deployment-plan:156340fa9a | module:docs:6784d83cb0 | docs/planning/clickup-owner-console-deployment-plan.md |
| documents | document:clickup-production-bootstrap:896398f070 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0012.md |
| documents | document:clickup-production-bootstrap:e10971a69a | module:docs:6784d83cb0 | docs/operations/clickup-production-bootstrap.md |
| documents | document:clickup-shaped-operating-model-plan:fff07f0326 | module:docs:6784d83cb0 | docs/planning/clickup-shaped-operating-model-plan.md |
| documents | document:clickup-sync:d557b99177 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0004.md |
| documents | document:clickup-webhook-trigger-plan:98cc0d641f | module:docs:6784d83cb0 | docs/planning/clickup-webhook-trigger-plan.md |
| documents | document:clickup-webhooks:7b652c9063 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0005.md |
| documents | document:client:3d3b77b40b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/CLS-AUTO-0004.md |
| documents | document:clients-coverage-expansion:355fcd5c44 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0004.md |
| documents | document:clients-model:68c6d8818b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0014.md |
| documents | document:code-quality-guardrails:5e712340e2 | module:docs:6784d83cb0 | docs/governance/code-quality-guardrails.md |
| documents | document:codebase-map:1e1145f7bb | module:docs:6784d83cb0 | docs/architecture/codebase-map.md |
| documents | document:commercial-exceptions-coverage-expansion:531ff73757 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0005.md |
| documents | document:commit-and-task-naming-standard:8c2358dc94 | module:docs:6784d83cb0 | docs/governance/commit-task-naming-standard.md |
| documents | document:company-city-dashboard-v3-spec:b284180660 | module:docs:6784d83cb0 | docs/ux/company-city-dashboard-v3-spec.md |
| documents | document:company-core:8b9b9cf11b | module:docs:6784d83cb0 | docs/README.md |
| documents | document:company-os-coverage-expansion:f8e2a73449 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0006.md |
| documents | document:company-os-definition-editing-contract:f92c4f0f81 | module:docs:6784d83cb0 | docs/architecture/company-os-definition-editing-contract.md |
| documents | document:company-os-lifecycle-trace-smoke:986784755a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0013.md |
| documents | document:company-os-stage-1-task-contracts:d0249625db | module:docs:6784d83cb0 | docs/planning/company-os-stage1-task-contracts.md |
| documents | document:company-os-stage-1-task-contracts:d0249625db | function:authactor:8976974c1d | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:company-os-workflow-definition-command-contract:5c46b8fae5 | module:docs:6784d83cb0 | docs/architecture/company-os-workflow-definition-command-contract.md |
| documents | document:company-roles-model:4fbf469048 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0015.md |
| documents | document:companycore-00-04-08-operating-loop-plan:e0c5fa88f8 | module:docs:6784d83cb0 | docs/planning/companycore-00-04-08-operating-loop-plan.md |
| documents | document:companycore-ai-ready-smoke:64eeb1c5dc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0014.md |
| documents | document:companycore-business-module-map-task-contract:c83c741a86 | module:docs:6784d83cb0 | docs/planning/companycore-business-module-map-task-contract.md |
| documents | document:companycore-business-module-map:614ddc0cfc | module:docs:6784d83cb0 | docs/architecture/companycore-business-module-map.md |
| documents | document:companycore-global-business-flow-md:59bf93466f | module:docs:6784d83cb0 | docs/architecture/companycore-global-business-flow.md |
| documents | document:companycore-mcp-bridge:ecc584a940 | module:docs:6784d83cb0 | docs/operations/companycore-mcp-bridge.md |
| documents | document:companycore-mcp-smoke:577e032900 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0015.md |
| documents | document:companycore-v1-achievement-and-blocker-handoff:8ae971d5ef | module:docs:6784d83cb0 | docs/operations/v1-achievement-and-blocker-handoff.md |
| documents | document:companycore-v1-release-readiness:43f1d13622 | module:docs:6784d83cb0 | docs/operations/v1-release-readiness.md |
| documents | document:companycore-v1-simple-dashboard-canonical-audit:9b3a28fcca | module:docs:6784d83cb0 | docs/ux/v1-simple-dashboard-canonical-audit-2026-05-15.md |
| documents | document:companycore-v1-simple-dashboard-canonical-spec:9caeb68764 | module:docs:6784d83cb0 | docs/ux/v1-simple-dashboard-canonical-spec-2026-05-15.md |
| documents | document:companycore-v1-task-contracts:a9e9191dd4 | module:docs:6784d83cb0 | docs/planning/companycore-v1-task-contracts.md |
| documents | document:companycore-v1-ux-ui-audit:f5a71c6294 | module:docs:6784d83cb0 | docs/ux/companycore-v1-ux-ui-audit.md |
| documents | document:connection-coverage-expansion:0222ef61e8 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0007.md |
| documents | document:controls-model:4add8d36bc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0016.md |
| documents | document:coolify-vps-deployment-contract:36a9336290 | module:docs:6784d83cb0 | docs/operations/coolify-vps-deployment-contract.md |
| documents | document:coordinator-agent-role:f9d6576e2f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/AGENT-COORDINATOR.md |
| documents | document:dashboard-command-packet:dc4e8c57d2 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-DASHBOARD-COMMAND.md |
| documents | document:dashboard-next-action-panel:e0a21fe7a5 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/UI-DASHBOARD-NEXT-ACTION.md |
| documents | document:dashboard-operations-workforce-foundation-contract:4633ca5bcc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DOC-DASHBOARD-CONTRACT.md |
| documents | document:dashboard:af351ec215 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PAGE-AUTO-0005.md |
| documents | document:data-ownership-map:1824d7eca5 | module:docs:6784d83cb0 | docs/architecture/data-ownership-map.md |
| documents | document:database:7994689b74 | module:docs:6784d83cb0 | docs/DATABASE.md |
| documents | document:deals-coverage-expansion:0db07a2e19 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0008.md |
| documents | document:deals-model:c3b2988999 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0017.md |
| documents | document:decision-logs-model:ff6e7581b0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0018.md |
| documents | document:decisions-coverage-expansion:44c3ae195e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0009.md |
| documents | document:decisions-model:67ce0b7aab | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0019.md |
| documents | document:decisions-module:0eff59d7cc | module:src-modules-decisions:aa86f9f5a9 | src/modules/decisions/README.md |
| documents | document:decisions:aa34f8e19e | module:docs:6784d83cb0 | docs/decisions/README.md |
| documents | document:definition-of-done:12c5acae60 | module:item:884f3f28db | DEFINITION_OF_DONE.md |
| documents | document:delete-v1-agents-id:a369cb6c82 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0001.md |
| documents | document:delete-v1-clients-id:62f4ae6895 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0002.md |
| documents | document:delete-v1-company-os-standards-id:882edcd580 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0003.md |
| documents | document:delete-v1-deals-id:d5687d7456 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0004.md |
| documents | document:delete-v1-decisions-id:0cabd60bce | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0005.md |
| documents | document:delete-v1-goals-id:a23d09e3fd | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0006.md |
| documents | document:delete-v1-integration-settings-clickup-webhooks-id:3dacf46c8a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0007.md |
| documents | document:delete-v1-interactions-id:d98aae24c7 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0008.md |
| documents | document:delete-v1-notes-id:5aa8d76efc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0009.md |
| documents | document:delete-v1-operating-model-areas-id:45aca8ab48 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0010.md |
| documents | document:delete-v1-operating-model-automation-definitions-id:3d17a96b27 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0011.md |
| documents | document:delete-v1-operating-model-folders-id:4f2482dae0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0012.md |
| documents | document:delete-v1-operating-model-knowledge-roots-id:2839743adf | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0013.md |
| documents | document:delete-v1-operating-model-storage-locations-id:e899557dd6 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0014.md |
| documents | document:delete-v1-pipeline-stages-id:e82908091f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0015.md |
| documents | document:delete-v1-projects-id:b0d453a049 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0016.md |
| documents | document:delete-v1-targets-id:8eece92783 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0017.md |
| documents | document:delete-v1-task-lists-id:c08e7da996 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0018.md |
| documents | document:delete-v1-tasks-id:6e7cba305c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0019.md |
| documents | document:delete-v1-workforce-id:401db85f05 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0020.md |
| documents | document:department-catalog-form:0a8dbf6f9c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/UI-MGMT-DEPARTMENT-FORM.md |
| documents | document:department-management-systems-architecture-md:ca69fb5352 | module:docs:6784d83cb0 | docs/architecture/department-management-systems-architecture.md |
| documents | document:department-management-systems-architecture:debe32f959 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DOC-DMS-ARCH.md |
| documents | document:department-management-systems-v1-blueprint:6b147b19d9 | module:docs:6784d83cb0 | docs/architecture/department-management-systems-v1-blueprint.md |
| documents | document:dependencies-model:dcedb370d9 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0020.md |
| documents | document:dependency-relation-csv:7f2e92b2e9 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/CSV-RELATIONS.md |
| documents | document:dependency-report:a1d3f8ab43 | module:tmp:8b20b5b6eb | .tmp/luc-5770-architecture-baseline/status/architecture-dependency-report.md |
| documents | document:deployment-gate:a45551c4d4 | module:item:884f3f28db | DEPLOYMENT_GATE.md |
| documents | document:deployment-template-local-stage-production:ccee546c5b | module:docs:6784d83cb0 | docs/operations/deployment-template-local-stage-production.md |
| documents | document:deployment:a292540d71 | module:docs:6784d83cb0 | docs/DEPLOYMENT.md |
| documents | document:design-memory:702ecb623a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DOC-DESIGN-MEMORY.md |
| documents | document:design-memory:b968bead4f | module:docs:6784d83cb0 | docs/ux/design-memory.md |
| documents | document:design-system-contract:c7bc13f14b | module:docs:6784d83cb0 | docs/ux/design-system-contract.md |
| documents | document:dms-00-001-global-intake-and-paperclip-output-review-contract:d909371e26 | module:docs:6784d83cb0 | docs/planning/dms-00-global-intake-paperclip-review-contract.md |
| documents | document:dms-00-002-intake-source-audit:4d51a19160 | module:docs:6784d83cb0 | docs/planning/dms-00-intake-source-audit.md |
| documents | document:dms-00-003-global-intake-read-api-task-contract:e87212350d | module:docs:6784d83cb0 | docs/planning/dms-00-global-intake-read-api-task-contract.md |
| documents | document:dms-00-004-global-intake-web-panel-task-contract:bb88a12f89 | module:docs:6784d83cb0 | docs/planning/dms-00-global-intake-web-panel-task-contract.md |
| documents | document:dms-00-005-global-intake-classify-route-command-contract:019cc5173e | module:docs:6784d83cb0 | docs/planning/dms-00-global-intake-classify-route-command-contract.md |
| documents | document:dms-00-006-first-safe-global-intake-route-command-task-contract:0fa5016d34 | module:docs:6784d83cb0 | docs/planning/dms-00-global-intake-route-command-task-contract.md |
| documents | document:dms-00-007-paperclip-background-output-review-proof-task-contract:7ca7b0a033 | module:docs:6784d83cb0 | docs/planning/dms-00-paperclip-background-output-review-proof-task-contract.md |
| documents | document:dms-00-007-paperclip-background-output-review-proof:08ad294adc | module:docs:6784d83cb0 | docs/planning/dms-00-paperclip-background-output-review-proof.md |
| documents | document:dms-03-005-commercial-exception-read-model-spec:f0cd3bae65 | module:docs:6784d83cb0 | docs/planning/dms-03-commercial-exception-read-model-spec.md |
| documents | document:dms-03-005-commercial-exception-read-model-task-contract:e7c880d7ae | module:docs:6784d83cb0 | docs/planning/dms-03-commercial-exception-read-model-task-contract.md |
| documents | document:dms-03-005a-commercial-exception-read-api-task-contract:f578c8831d | module:docs:6784d83cb0 | docs/planning/dms-03-commercial-exception-read-api-task-contract.md |
| documents | document:dms-03-sales-context-and-board-task-contract:7997600f80 | module:docs:6784d83cb0 | docs/planning/dms-03-sales-context-and-board-task-contract.md |
| documents | document:dms-07-001-finance-system-spec-task-contract:ffa233585c | module:docs:6784d83cb0 | docs/planning/dms-07-finance-system-spec-task-contract.md |
| documents | document:dms-07-001-finance-system-spec:2c4dc94c71 | module:docs:6784d83cb0 | docs/planning/dms-07-finance-system-spec.md |
| documents | document:dms-07-002-finance-context-read-api-task-contract:cc694173ec | module:docs:6784d83cb0 | docs/planning/dms-07-finance-context-read-api-task-contract.md |
| documents | document:dms-07-003-read-only-finance-web-board-task-contract:575faa7aac | module:docs:6784d83cb0 | docs/planning/dms-07-finance-web-board-task-contract.md |
| documents | document:dms-13-systems-v1-implementation-audit-task-contract:91c6d85646 | module:docs:6784d83cb0 | docs/planning/dms-13-systems-v1-implementation-audit-task-contract.md |
| documents | document:dms-13-systems-v1-implementation-audit:d5623d6452 | module:docs:6784d83cb0 | docs/planning/dms-13-systems-v1-implementation-audit.md |
| documents | document:dms-money-001-pricing-and-discount-source-inventory-task-contract:5c41ecb4ab | module:docs:6784d83cb0 | docs/planning/dms-money-pricing-discount-source-inventory-task-contract.md |
| documents | document:dms-money-001-pricing-and-discount-source-inventory:db748f5eb3 | module:docs:6784d83cb0 | docs/planning/dms-money-pricing-discount-source-inventory.md |
| documents | document:dms-shell-001-shared-department-management-shell-task-contract:e25cefac04 | module:docs:6784d83cb0 | docs/planning/dms-shell-001-shared-department-management-shell-task-contract.md |
| documents | document:dms-shell-002-department-subsystem-registry-task-contract:a4a7f68ac5 | module:docs:6784d83cb0 | docs/planning/dms-shell-002-department-subsystem-registry-task-contract.md |
| documents | document:dms-shell-003-department-data-backbone-task-contract:2e00039d00 | module:docs:6784d83cb0 | docs/planning/dms-shell-003-department-data-backbone-task-contract.md |
| documents | document:documentation-and-memory-lane:a851b78ed6 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/AGENT-DOCUMENTATION-MEMORY.md |
| documents | document:documentation-map:23179022f5 | module:docs:6784d83cb0 | docs/documentation-map.md |
| documents | document:documentation-maps:b6c771bf6f | module:docs:6784d83cb0 | docs/maps/documentation-maps.md |
| documents | document:ensuredefaultdepartments:8e7ed13cf8 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FUNC-ENSURE-DEFAULT-DEPARTMENTS.md |
| documents | document:environment-matrix:60c809a6f7 | module:docs:6784d83cb0 | docs/operations/environment-matrix.md |
| documents | document:error-handler:ed4c1d1625 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/MW-AUTO-0004.md |
| documents | document:errors:3c1f230b6b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/CLS-AUTO-0002.md |
| documents | document:errors:e24da99501 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0007.md |
| documents | document:event-chain-index:888e4c737d | module:docs:6784d83cb0 | docs/status/event-chain-index.md |
| documents | document:event-service:082f02c205 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/SVC-AUTO-0002.md |
| documents | document:events-coverage-expansion:7365d41bb3 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0010.md |
| documents | document:events-model:ad16fd0164 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0021.md |
| documents | document:evidence-driven-ux-review:01d5b34628 | module:docs:6784d83cb0 | docs/ux/evidence-driven-ux-review.md |
| documents | document:existing-project-adoption-playbook:6eb430b769 | module:docs:6784d83cb0 | docs/governance/existing-project-adoption-playbook.md |
| documents | document:experience-quality-bar:221317f3af | module:docs:6784d83cb0 | docs/ux/experience-quality-bar.md |
| documents | document:external-container-mappings-model:853a0708e7 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0022.md |
| documents | document:external-field-mappings-model:9fd7f8fc3e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0023.md |
| documents | document:external-operational-memory-agent-playbook:335f134a4e | module:docs:6784d83cb0 | docs/operations/external-operational-memory-agent-playbook.md |
| documents | document:external-webhook-registrations-model:467b9a640c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0024.md |
| documents | document:finance-coverage-expansion:d3237a1de3 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0011.md |
| documents | document:foundation-p1-hardening-task-contract:24bdd509bd | module:docs:6784d83cb0 | docs/planning/foundation-p1-hardening-task-contract.md |
| documents | document:full-function-architecture-audit-task-contract:12a0ad70db | module:docs:6784d83cb0 | docs/planning/full-function-architecture-audit-task-contract.md |
| documents | document:function-chain-csv:c32e61317d | module:docs:6784d83cb0 | docs/architecture/nodes/generated/CSV-CHAINS.md |
| documents | document:function-chains:a49f4ce2b7 | module:docs:6784d83cb0 | docs/architecture/chains/README.md |
| documents | document:function-coverage-ledger-standard:99d7a85eab | module:docs:6784d83cb0 | docs/governance/function-coverage-ledger-standard.md |
| documents | document:generaldashboard-component:8d09180e87 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/COMP-GENERAL-DASHBOARD.md |
| documents | document:generatearchitecturegraph:dc04b5ef1b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FUNC-GENERATE-ARCH-GRAPH.md |
| documents | document:get-v1-agent-events:258fae5143 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0021.md |
| documents | document:get-v1-agent-logs-id:f530f28e8f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0023.md |
| documents | document:get-v1-agent-logs:1f4443f302 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0022.md |
| documents | document:get-v1-agents-id:f66fcf6bbc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0025.md |
| documents | document:get-v1-agents:7618f6d287 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0024.md |
| documents | document:get-v1-assets-context:48a9e66918 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-ASSETS-CONTEXT.md |
| documents | document:get-v1-assets-files-id-preview:378a4524e6 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0026.md |
| documents | document:get-v1-clients-id:60d7128eb7 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0028.md |
| documents | document:get-v1-clients:68757373b0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0027.md |
| documents | document:get-v1-commercial-exceptions:e192e48ef0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0029.md |
| documents | document:get-v1-company-os-collection-id:b26fa4bdde | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0032.md |
| documents | document:get-v1-company-os-collection:3f8a00680c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0031.md |
| documents | document:get-v1-company-os-workflow-definitions-drafts-id:9f0549debc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0034.md |
| documents | document:get-v1-company-os-workflow-definitions-drafts:d3545de13f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0033.md |
| documents | document:get-v1-company-os:98097bc6d4 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0030.md |
| documents | document:get-v1-connection:6ba0907deb | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0035.md |
| documents | document:get-v1-dashboard-command:b32b11e451 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-DASHBOARD-COMMAND.md |
| documents | document:get-v1-deals-id:d38423c393 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0037.md |
| documents | document:get-v1-deals:b697d48855 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0036.md |
| documents | document:get-v1-decisions-id:d8e43ca75b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0039.md |
| documents | document:get-v1-decisions:d190031eaf | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0038.md |
| documents | document:get-v1-departments:3eee62ca7d | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-DEPARTMENTS-LIST.md |
| documents | document:get-v1-events:edc862eef8 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0040.md |
| documents | document:get-v1-finance-context:db0b7f023e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0041.md |
| documents | document:get-v1-goals-id:4b261fef2f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0043.md |
| documents | document:get-v1-goals:efd11a8646 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0042.md |
| documents | document:get-v1-google-drive-files-id-content:07eca09668 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0045.md |
| documents | document:get-v1-google-drive-files:63dedbcdd0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0044.md |
| documents | document:get-v1-intake-route-proposals:7c1de92917 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0047.md |
| documents | document:get-v1-intake:abb9d0dc89 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0046.md |
| documents | document:get-v1-integration-settings-clickup-events:a8caac4072 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0049.md |
| documents | document:get-v1-integration-settings-clickup-webhooks:eadd43fb25 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0050.md |
| documents | document:get-v1-integration-settings-clickup:6f00b9efba | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0048.md |
| documents | document:get-v1-integration-settings-google-drive-folders-discover:9adff880b1 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0052.md |
| documents | document:get-v1-integration-settings-google-drive:15be161199 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0051.md |
| documents | document:get-v1-interactions-id:97537d3c3e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0054.md |
| documents | document:get-v1-interactions:e3a68bf41a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0053.md |
| documents | document:get-v1-mcp-manifest:5ca61817ec | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0055.md |
| documents | document:get-v1-notes-id:77f91deba3 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0057.md |
| documents | document:get-v1-notes:ff25b3ba83 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0056.md |
| documents | document:get-v1-operating-graph-areas-areakey:4dc810c616 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0058.md |
| documents | document:get-v1-operating-model-area-inventory:00335e82fc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0060.md |
| documents | document:get-v1-operating-model-areas:d836075174 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0061.md |
| documents | document:get-v1-operating-model-automation-definitions-id:f5c061c42d | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0063.md |
| documents | document:get-v1-operating-model-automation-definitions:3597e4dfa4 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0062.md |
| documents | document:get-v1-operating-model-external-fields:d45ddb2139 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0064.md |
| documents | document:get-v1-operating-model-external-mappings:71f326312e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0065.md |
| documents | document:get-v1-operating-model-folders-id:6952780b43 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0067.md |
| documents | document:get-v1-operating-model-folders:3b0163dde4 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0066.md |
| documents | document:get-v1-operating-model-knowledge-roots-id:4361954273 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0069.md |
| documents | document:get-v1-operating-model-knowledge-roots:143b003267 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0068.md |
| documents | document:get-v1-operating-model-storage-locations-id:28307f6fd9 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0071.md |
| documents | document:get-v1-operating-model-storage-locations:84cefb46bc | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0070.md |
| documents | document:get-v1-operating-model-tables:4ab8288ba9 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0072.md |
| documents | document:get-v1-operating-model:997880b743 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0059.md |
| documents | document:get-v1-operations-context:2cdacaad9c | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0073.md |
| documents | document:get-v1-operations-work-items:5562fb788b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-OPERATIONS-WORK-ITEMS.md |
| documents | document:get-v1-pipeline-stages-id:071f3379bf | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0075.md |
| documents | document:get-v1-pipeline-stages:87f66eb935 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0074.md |
| documents | document:get-v1-process-core-coverage:5d68bdcf0d | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0170.md |
| documents | document:get-v1-projects-id:b1527bf6fe | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0077.md |
| documents | document:get-v1-projects:2db380359a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0076.md |
| documents | document:get-v1-relationships-context:4d668e8337 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0167.md |
| documents | document:get-v1-relationships-graph:76706ddff8 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0078.md |
| documents | document:get-v1-sales-context:078045055f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0079.md |
| documents | document:get-v1-strategy-context:e07ee7ac8e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0080.md |
| documents | document:get-v1-targets-id:238be0dc99 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0082.md |
| documents | document:get-v1-targets:58474f13c1 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0081.md |
| documents | document:get-v1-task-lists-id:858dc613be | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0084.md |
| documents | document:get-v1-task-lists:7565d6ff4e | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0083.md |
| documents | document:get-v1-tasks-id:ef81e822f1 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0086.md |
| documents | document:get-v1-tasks:e5dc75d5f5 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0085.md |
| documents | document:get-v1-workforce-id:b4db227a92 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-AUTO-0087.md |
| documents | document:get-v1-workforce:4408d67f49 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/API-WORKFORCE-LIST.md |
| documents | document:goals-coverage-expansion:4df024eae3 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0012.md |
| documents | document:goals-model:229e0b8194 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0025.md |
| documents | document:google-drive-auth:0ead918d86 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0008.md |
| documents | document:google-drive-client:897ca59766 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0009.md |
| documents | document:google-drive-client:99b9b60f85 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/CLS-AUTO-0003.md |
| documents | document:google-drive-content-snapshots-model:9af6b5d255 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0026.md |
| documents | document:google-drive-content:f07acd9cea | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0010.md |
| documents | document:google-drive-coverage-expansion:78b439c41a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0013.md |
| documents | document:google-drive-files-model:9a1fea058f | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-GOOGLE-DRIVE-FILE.md |
| documents | document:google-drive-owner-setup:9c6bc70541 | module:docs:6784d83cb0 | docs/operations/google-drive-owner-setup.md |
| documents | document:google-drive-production-smoke:fc9bb13362 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/PIPE-AUTO-0016.md |
| documents | document:google-drive-sync:c5c94bd078 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0011.md |
| documents | document:google-drive-v2-task-contracts:9974023e7e | module:docs:6784d83cb0 | docs/planning/google-drive-v2-task-contracts.md |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:buildgoogledriveauthorizationurl:bab074bcc0 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:exchangegoogledriveauthorizationcode:7cbd2d2e54 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:getfreshgoogledriveoauthforworkspace:86a58962cc | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:hasfreshaccesstoken:beeb6487ae | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:getgoogledriveclientforworkspace:1d1d0eae6f | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:getgoogleoauthclient:f132646466 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:getstoredgoogledrivesecret:2763c40172 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:mergegoogledriveconfig:814153a3bb | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:normalizetokenresponse:b4d666013c | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:postgoogleoauthtoken:aed8d79cd2 | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:refreshgoogledriveoauth:04d8992f2d | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:google-drive-v2-task-contracts:9974023e7e | function:parsegoogledriveoauthsecret:de301200ef | C:\Personal\Projekty\Aplikacje\Roost\docs\architecture\relations\documentation-links.csv |
| documents | document:guardrail-commands:15d613ea93 | module:docs:6784d83cb0 | docs/automation/guardrail-commands.md |
| documents | document:history-overview:a2f6cccbc0 | module:history:95c2eae45a | history/history-overview.md |
| documents | document:human-agent-web-architecture-map:de4023df03 | module:docs:6784d83cb0 | docs/planning/human-agent-web-architecture-map.md |
| documents | document:idea-to-function-chain-playbook:21e69643ef | module:docs:6784d83cb0 | docs/planning/idea-to-function-chain-playbook.md |
| documents | document:intake-coverage-expansion:b8a37d4e36 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0014.md |
| documents | document:integration-capabilities-model:af41cef9e0 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0027.md |
| documents | document:integration-checklist:721c1de001 | module:item:884f3f28db | INTEGRATION_CHECKLIST.md |
| documents | document:integration-settings-coverage-expansion:4cecd2cb5b | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0015.md |
| documents | document:integration-settings-model:064e4fc640 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/DB-AUTO-0028.md |
| documents | document:integration-settings-service:961a85f1fd | module:docs:6784d83cb0 | docs/architecture/nodes/generated/SVC-AUTO-0001.md |
| documents | document:integration-settings-service:a19c08b680 | module:docs:6784d83cb0 | docs/architecture/nodes/generated/INT-AUTO-0012.md |
| documents | document:integrations:ec6d120857 | module:src-integrations:5ddfa7c31f | src/integrations/README.md |
| documents | document:integrations:f7626c47da | module:docs:6784d83cb0 | docs/INTEGRATIONS.md |
| documents | document:interactions-coverage-expansion:50040c7a2a | module:docs:6784d83cb0 | docs/architecture/nodes/generated/FEAT-AUTO-0016.md |