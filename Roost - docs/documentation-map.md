# Documentation Map

Updated: YYYY-MM-DD

This is the main entrypoint for current project documentation.

Use it to find the current source of truth. Historical task files, old plans,
audits, proof artifacts, release packets, and raw generated outputs belong in
`history/`, not in canonical `docs/`.

## Choose A Map

| Need | Go to |
| --- | --- |
| Product intent, scope, roadmap, user value, limits | `docs/maps/product-map.md` |
| Durable decisions and ADRs | `docs/decisions/README.md` |
| System shape, contracts, modules, architecture truth | `docs/maps/architecture-map.md` |
| End-to-end user/system flows across layers | `docs/pipelines/pipeline-registry.md` |
| Deploy, smoke, rollback, release gates, operator proof | `docs/maps/release-ops-map.md` |
| Coordinator startup, active state, validation, proof lookup | `docs/maps/agent-work-map.md` |
| Documentation structure and graph navigation | `docs/maps/documentation-maps.md` |

## Choose A Work Route

| Situation | Start With | Then Check | Close By Updating |
| --- | --- | --- | --- |
| New coordinator chat or continuation | `docs/maps/agent-work-map.md` | `.agents/state/active-mission.md`, `.codex/context/TASK_BOARD.md`, `.agents/state/next-steps.md` | active mission, task board, project state |
| Product or scope question | `docs/maps/product-map.md` | `docs/planning/open-decisions.md`, idea ledger, current focus | product docs or open decisions |
| New idea or feature concept | `docs/planning/idea-to-function-chain-playbook.md` | pipelines, architecture graph, module docs | idea ledger, chain registry, next task |
| Architecture or ownership change | `docs/maps/architecture-map.md` | architecture docs, module registry, graph records | architecture, module docs, graph CSVs |
| Feature-chain or impact analysis | `docs/architecture/architecture-evidence-graph-system.md` | `docs/architecture/registry/*.csv`, `docs/architecture/relations/dependencies.csv`, `docs/architecture/chains/chains.csv` | graph registries, status exports |
| Runtime, worker, agent, or side-effect change | `docs/governance/agent-runtime-contract.md` or relevant architecture doc | pipelines, tests, operations runbooks | architecture, runtime playbook, evidence |
| Release, deploy, rollback, or production proof | `docs/maps/release-ops-map.md` | operations runbooks, system health, release history | operations docs, system health, release evidence |
| Need proof for a claim | `docs/maps/agent-work-map.md` | `history/evidence/`, `history/releases/`, `history/audits/` | task record and relevant state file |

## Current Source Of Truth

| Path | Role | Primary entry |
| --- | --- | --- |
| `docs/product/` | Product scope, vision, glossary, roadmap inputs, and known limits. | `docs/product/overview.md` |
| `docs/decisions/` | Accepted, rejected, proposed, and superseded decisions. | `docs/decisions/README.md` |
| `docs/architecture/` | Canonical runtime, ownership, data, contract, graph, and safety truth. | `docs/maps/architecture-map.md` |
| `docs/modules/` | Implementation-facing module ownership, dependencies, routes, tests, and confidence. | `docs/modules/README.md` |
| `docs/pipelines/` | End-to-end system flows across UI, API, services, data, workers, agents, and tests. | `docs/pipelines/pipeline-registry.md` |
| `docs/planning/` | Active plans, idea intake, next commits, and unresolved decisions. | `docs/planning/planning-catalog-index.md` |
| `docs/operations/` | Living deploy, smoke, rollback, incident, reliability, and operator runbooks. | `docs/maps/release-ops-map.md` |
| `docs/releases/` | Release trains, release scopes, validation gates, and release evidence index. | `docs/releases/release-train.md` |
| `docs/quality/` | Quality attribute scenarios and non-functional release gates. | `docs/quality/quality-attribute-scenarios.md` |
| `docs/automation/` | Tooling and command safety contracts for agents and operators. | `docs/automation/tooling-contract.md` |
| `docs/security/` | Secure development, secrets, authorization, and sensitive-area policy. | `docs/security/security-baseline.md` |
| `docs/ux/` | Design system, quality bars, evidence rules, and reusable pattern memory. | `docs/ux/design-system-contract.md` |
| `docs/governance/` | Repository, agent, template, and delivery rules. | `docs/governance/template-usage.md` |

## Historical Lookup

Use `history/history-overview.md` when reconstructing what happened before.

Historical files can support claims, but they do not replace current docs. If a
historical file describes current behavior, promote the distilled truth into
the owning current document and link back to the historical evidence.

## Useful Documentation Standard

A current doc is useful only if a future reader can answer:

1. what source owns this truth;
2. which code, route, module, workflow, operation, or product decision it
   affects;
3. what evidence proves the current status;
4. which graph, pipeline, module, or ledger row must change when this truth
   changes.

If a file mainly answers "what happened before", move it to `history/` or link
to the historical record from the current owner doc.

## Maintenance Rule

Every feature, route, module, data model, pipeline, deployment behavior, agent
behavior, or test coverage change must update the matching traceability docs in
the same task.
