# Capability Map

Last updated: 2026-06-20

## Purpose

Map what the product can do independently of how the UI is currently arranged.

Capability mapping helps agents avoid confusing pages with product value.

## Capability Hierarchy

```text
Capability -> Feature -> Function Chain -> Modules -> Code -> Tests -> Evidence
```

## Capabilities

| Capability ID | Capability | User/operator value | Features | Chains | Current status | Evidence | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAP-001 | Owner command dashboard | Gives the owner a current read-only command packet for priorities, blockers, next actions, workforce signals, and operating context. | FEAT-DASHBOARD-COMMAND | CHAIN-DASHBOARD-COMMAND | verified | `docs/planning/dashboard-operations-workforce-foundation-task-contract.md`; `docs/architecture/chains/chains.csv`; `.agents/state/module-confidence-ledger.md` | Keep dashboard writes routed through domain surfaces; rerun production smoke after the next release batch. |
| CAP-002 | Department management systems | Turns the 00-12 operating areas into scoped management surfaces with department identity, linked views, and milestone proof. | FEAT-MGMT-DEPT-CATALOG | CHAIN-MGMT-DEPT-CATALOG | verified | `docs/planning/management-department-catalog-task-contract.md`; `docs/planning/luc-4927-management-proof-selection.md`; `docs/planning/luc-4936-management-departments-api-regression-coverage.md` | Continue thin milestone proof selection department by department; protected production proof remains release/credential gated. |
| CAP-003 | Operations work management | Lets operators inspect and manage operations work items through workspace-scoped packets and domain create/update commands. | FEAT-OPERATIONS-WORK-ITEMS | CHAIN-OPERATIONS-WORK-ITEM | verified | `docs/planning/dashboard-operations-workforce-foundation-task-contract.md`; `docs/architecture/chains/chains.csv`; `.agents/state/system-health.md` | Keep provider calendar creation and recurrence execution blocked until separate command contracts exist. |
| CAP-004 | Assets and knowledge context | Lets operators inspect Drive-backed files, folders, previews, and knowledge context without bypassing CompanyCore permissions. | FEAT-ASSETS-CONTEXT | CHAIN-ASSETS-CONTEXT | verified | `docs/planning/cc-08-002-assets-context-read-api-task-contract.md`; `docs/architecture/chains/chains.csv`; `.agents/core/project-memory-index.md` | Keep deeper Drive write/freshness work as separate scoped slices with provider proof. |
| CAP-005 | People and agents directory | Gives the owner a unified human/AI workforce roster with role, department, runtime, and Paperclip sync context. | FEAT-PEOPLE-AGENTS-DIRECTORY | CHAIN-PEOPLE-AGENTS-DIRECTORY | verified | `docs/planning/people-agents-directory-premium-ux-task-contract.md`; `docs/architecture/chains/chains.csv`; `docs/architecture/unified-organizational-operating-system.md` | Prove production parity after deployment; keep richer RBAC/skills as future scoped contracts. |
| CAP-006 | Area operating graph | Lets users and agents ask one stable question about an operating area and receive linked goals, workflows, tasks, knowledge, and gaps. | FEAT-AUTO-0019 | CHAIN-AUTO-0019 | tested | `docs/planning/v1-area-operating-graph-backend-gap-plan.md`; `docs/planning/luc-4880-technology-ai-proof-ladder.md`; `docs/planning/luc-4906-legal-proof-ladder.md`; `docs/planning/luc-4920-innovation-proof-ladder.md` | Continue local proof ladders for remaining departments; protected deploy smoke remains credential gated. |
| CAP-007 | Capability-scoped API and MCP access | Gives agents read/write discovery through route manifests, MCP tools, service keys, and capability gates instead of raw database/provider access. | FEAT-AUTO-0017; FEAT-AUTO-0007 | CHAIN-AUTO-0017; CHAIN-AUTO-0007 | tested | `docs/architecture/system-architecture.md`; `docs/planning/webfound-012-task-contract.md`; `.agents/state/system-health.md` | Keep protected production key smoke under explicit credential approval; expand tools only through capability-scoped routes. |
| CAP-008 | Architecture evidence and release confidence | Keeps product, code, tests, chains, and evidence connected through generated architecture awareness and source-of-truth status ledgers. | FEAT-ARCH-EVIDENCE-SYSTEM | CHAIN-ARCH-EVIDENCE-SYSTEM | tested | `docs/architecture/architecture-evidence-system.md`; `docs/status/architecture-roadmap.md`; `.agents/state/module-confidence-ledger.md` | Keep generated awareness artifacts current at source-control closure checkpoints. |

## Maintenance Rule

When a feature is added, removed, or re-scoped, update this map and the
capability-to-implementation map.
