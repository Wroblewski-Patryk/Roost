# Architecture Evidence System

Last updated: 2026-05-24

## Purpose

The architecture evidence system is the project nervous system for
CompanyCore/Roost. It maps features, functions, routes, components, data
models, tests, documents, agents, prompts, workflows, events, and operational
proof into records and relationships that can be queried, rendered in
Obsidian, and used by AI agents before changing code.

This is not ordinary documentation. A feature is official only when it has a
registry record, relationships, chain mapping, and evidence status.

## Source Of Truth

CSV files are the source of truth. Generated Markdown, Mermaid, JSON, and
status summaries are derived artifacts.

Primary registries:

- `docs/architecture/nodes/nodes.csv`
- `docs/architecture/nodes/features.csv`
- `docs/architecture/nodes/functions.csv`
- `docs/architecture/nodes/components.csv`
- `docs/architecture/nodes/services.csv`
- `docs/architecture/nodes/classes.csv`
- `docs/architecture/nodes/api_routes.csv`
- `docs/architecture/nodes/pages.csv`
- `docs/architecture/nodes/layouts.csv`
- `docs/architecture/nodes/hooks.csv`
- `docs/architecture/nodes/stores.csv`
- `docs/architecture/nodes/ui_elements.csv`
- `docs/architecture/nodes/animations.csv`
- `docs/architecture/nodes/database_models.csv`
- `docs/architecture/nodes/migrations.csv`
- `docs/architecture/nodes/integrations.csv`
- `docs/architecture/nodes/middleware.csv`
- `docs/architecture/nodes/pipelines.csv`
- `docs/architecture/nodes/cron_jobs.csv`
- `docs/architecture/nodes/tests.csv`
- `docs/architecture/nodes/docs.csv`
- `docs/architecture/nodes/config_files.csv`
- `docs/architecture/nodes/agents.csv`
- `docs/architecture/nodes/prompts.csv`
- `docs/architecture/nodes/events.csv`
- `docs/architecture/nodes/workflows.csv`
- `docs/architecture/relations/dependencies.csv`
- `docs/architecture/chains/chains.csv`
- `docs/testing/test-map.csv`
- `docs/status/evidence-status.csv`

Generated outputs:

- `docs/architecture/nodes/generated/*.md`
- `docs/graphs/project-graph.mmd`
- `docs/graphs/project-graph.json`
- `docs/status/architecture-evidence-summary.md`
- `docs/status/architecture-drift-report.md`
- `docs/status/architecture-drift-missing-scaffold.csv`
- `docs/status/architecture-sync-report.json`
- `docs/status/architecture-extended-sync-report.json`
- `docs/status/architecture-node-backfill-report.json`
- `docs/status/architecture-evidence-sync-report.json`
- `docs/status/architecture-evidence-enrichment-report.json`
- `docs/status/architecture-evidence-priority-queue.json`
- `docs/status/architecture-evidence-worklist.csv`
- `docs/status/architecture-evidence-worklist-summary.json`
- `docs/status/architecture-csv-contract-report.json`
- `docs/status/architecture-node-verification-sync-report.json`
- `docs/status/architecture-node-integrity-report.json`
- `docs/status/architecture-chain-coverage-report.json`
- `docs/status/architecture-feature-coverage-sync-report.json`
- `docs/status/architecture-chain-sync-report.json`
- `docs/status/architecture-chain-hardening-worklist.csv`
- `docs/status/architecture-chain-hardening-worklist-summary.json`
- `docs/status/architecture-chain-normalization-report.json`
- `docs/status/architecture-relation-enrichment-report.json`
- `docs/status/architecture-chain-integrity-report.json`
- `docs/status/architecture-health-dashboard.md`
- `docs/status/architecture-health-dashboard-gate-report.json`
- `docs/status/architecture-connectivity-report.json`
- `docs/status/architecture-impact-index.json`
- `docs/status/architecture-impact-top.csv`
- `docs/status/architecture-impact-delta-report.json`
- `docs/status/architecture-impact-delta-gate-report.json`
- `docs/status/architecture-risk-hotspots-report.json`
- `docs/status/architecture-risk-hotspots-top.csv`
- `docs/status/architecture-risk-hotspots-gate-report.json`
- `docs/status/architecture-dead-nodes-report.json`
- `docs/status/architecture-dead-nodes.csv`
- `docs/status/architecture-roadmap.md`
- `docs/status/architecture-roadmap.json`
- `docs/status/architecture-roadmap-gate-report.json`
- `docs/status/architecture-runtime-snapshot.json`
- `docs/status/architecture-delta-report.json`
- `docs/status/architecture-doc-baseline-report.json`
- `docs/status/architecture-doc-baseline-sync-report.json`
- `docs/status/architecture-node-links-report.json`
- `docs/status/architecture-node-artifacts-report.json`
- `docs/status/architecture-generated-node-frontmatter-report.json`
- `docs/status/architecture-pipeline-nodes-report.json`
- `docs/status/architecture-evidence-cardinality-report.json`
- `docs/status/architecture-delta-zero-report.json`
- `docs/status/architecture-report-presence-report.json`
- `docs/status/architecture-registry-catalog.json`
- `docs/status/architecture-registry-catalog.md`
- `docs/status/architecture-graph-artifact-consistency-report.json`
- `docs/status/architecture-proof-bundle.json`
- `docs/status/architecture-proof-bundle.md`
- `docs/status/architecture-proof-bundle-gate-report.json`
- `scripts/check-architecture-evidence-gate.mjs`
- `scripts/check-architecture-node-integrity.mjs`
- `scripts/check-architecture-node-catalog-consistency.mjs`
- `scripts/check-architecture-chain-integrity.mjs`
- `scripts/check-architecture-connectivity.mjs`
- `scripts/check-architecture-relation-integrity.mjs`
- `scripts/check-architecture-csv-contract.mjs`
- `scripts/check-architecture-doc-baseline.mjs`
- `scripts/check-architecture-node-links.mjs`
- `scripts/check-architecture-node-artifacts.mjs`
- `scripts/check-architecture-generated-node-frontmatter.mjs`
- `scripts/check-architecture-pipeline-nodes.mjs`
- `scripts/check-architecture-evidence-cardinality.mjs`
- `scripts/check-architecture-delta-zero.mjs`
- `scripts/check-architecture-report-presence.mjs`
- `scripts/check-architecture-graph-artifact-consistency.mjs`
- `scripts/check-architecture-proof-bundle-gate.mjs`
- `scripts/build-architecture-health-dashboard.mjs`
- `scripts/check-architecture-health-dashboard-gate.mjs`
- `scripts/sync-architecture-extended-registry.mjs`
- `scripts/build-architecture-impact-index.mjs`
- `scripts/build-architecture-impact-delta-report.mjs`
- `scripts/check-architecture-impact-delta-gate.mjs`
- `scripts/build-architecture-risk-hotspots-report.mjs`
- `scripts/check-architecture-risk-hotspots-gate.mjs`
- `scripts/build-architecture-dead-nodes-report.mjs`
- `scripts/build-architecture-roadmap.mjs`
- `scripts/check-architecture-roadmap-gate.mjs`
- `scripts/build-architecture-delta-report.mjs`
- `scripts/build-architecture-registry-catalog.mjs`
- `scripts/build-architecture-proof-bundle.mjs`
- `scripts/sync-architecture-doc-baseline.mjs`
- `scripts/print-architecture-status.mjs`

## Required Record Fields

Every canonical element should eventually have:

- `id`
- `name`
- `type`
- `status`
- `layer`
- `module`
- `feature`
- `description`
- `file_path`
- `related_files`
- `parent_id`
- `child_ids`
- `depends_on`
- `used_by`
- `ui_related`
- `api_related`
- `database_related`
- `tests_related`
- `docs_related`
- `agent_related`
- `risk_level`
- `completion_percent`
- `last_verified_at`
- `verification_status`
- `notes`
- `tags`

## Status Model

Allowed implementation statuses:

- `planned`
- `in_progress`
- `implemented`
- `broken`
- `missing`
- `deprecated`
- `tested`
- `verified`
- `blocked`

Allowed evidence statuses:

- `missing`
- `partial`
- `implemented_not_verified`
- `tested`
- `verified`
- `failed`
- `blocked`

Brak dowodu oznacza brak zaufania. A record without implementation, test,
runtime, connection, and documentation proof must not be reported as reliable.

## Function Chain Rule

Every meaningful function or feature must have a chain row that maps the full
execution path. Agents must analyze the chain before answering whether a
feature works.

Minimum chain shape:

`UI -> component -> action -> API request -> backend route -> service or domain
logic -> database or provider -> event or side effect -> UI update -> tests ->
docs`

## Agent Workflow

When adding or changing a feature:

1. Add or update node records in CSV.
2. Add or update dependency relations.
3. Add or update function chain rows.
4. Add or update test coverage mapping.
5. Add or update evidence status.
6. Run `npm run architecture:graph`.
7. Run `npm run architecture:ensure-docs-root` (also embedded in
   `architecture:refresh`) to guarantee canonical `docs/*` paths are available
   even when the repository documentation root is named `Roost - docs`.
8. Run `npm run architecture:sync` when drift scaffold contains missing rows.
9. Run `npm run architecture:backfill-nodes` to enrich auto-added node metadata
   (module, feature, docs/test links).
10. Run `npm run architecture:sync-extended` to synchronize extended node
   registries (`services`, `classes`, `layouts`, `hooks`, `stores`,
   `animations`, `migrations`, `integrations`, `middleware`, `pipelines`,
   `cron_jobs`) from repository sources.
11. Run `npm run architecture:gate-csv-contract` to enforce required CSV
    schemas and status vocabulary across node, relation, chain, and evidence
    registries.
12. Run `npm run architecture:sync-feature-coverage` to create missing
    module-level feature records for auto API rows and attach API parent links.
13. Run `npm run architecture:sync-evidence` to guarantee one evidence row per
    node.
14. Run `npm run architecture:enrich-evidence` to populate proof fields and
    generate a risk-prioritized evidence queue (actionable rows only: missing,
    partial, implemented_not_verified, failed, blocked).
15. Run `npm run architecture:sync-chains` to scaffold missing feature chains.
16. Run `npm run architecture:enrich-relations` to auto-link feature/API/page/DB
    relations.
17. Run `npm run architecture:sync-node-verification` to align node
    `verification_status` and `last_verified_at` with evidence outcomes.
18. Run `npm run architecture:gate-node-integrity` to enforce node status
    consistency (`status` aligned with `verification_status` expectations).
19. Run `npm run architecture:gate-node-catalog` to enforce duplicate-id
    consistency across the canonical typed ledgers and `nodes.csv`.
20. Re-run `npm run architecture:graph` and inspect updated evidence/drift.
21. Run `npm run architecture:build-worklist` to generate the top actionable
    evidence queue CSV for focused execution.
22. Run `npm run architecture:normalize-chains` to remove noisy duplicate chain
    steps and infer missing test/doc links when possible.
23. Run `npm run architecture:build-chain-worklist` to generate prioritized
    hardening tasks for `partial`/`partially_verified` execution chains.
24. Run `npm run architecture:gate-chains` to enforce that every feature with
    mapped API routes has an execution chain.
25. Run `npm run architecture:gate-chain-integrity` to enforce chain status
    integrity (verified/tested chains require coherent proof fields and
    structural metadata).
26. Run `npm run architecture:gate-connectivity` to fail on orphan actionable
    nodes without relation/chain/link-field connectivity.
27. Run `npm run architecture:gate-relations` to enforce relation integrity
    (`id` uniqueness, semantic tuple uniqueness, valid source/target node
    references, and non-empty endpoints).
28. Run `npm run architecture:build-impact-index` for direct/transitive change
    impact analysis.
29. Run `npm run architecture:build-impact-delta-report` to track
    previous-vs-current impact changes per node.
30. Run `npm run architecture:gate-impact-delta` to enforce impact-delta
    report schema and delta-ranking consistency.
31. Run `npm run architecture:build-risk-hotspots-report` to prioritize
    high-impact/high-volatility nodes for system-level regression attention.
32. Run `npm run architecture:gate-risk-hotspots` to enforce risk-hotspot
    report schema and ranking consistency.
33. Run `npm run architecture:build-dead-nodes` to detect disconnected
    actionable nodes.
34. Run `npm run architecture:build-roadmap` to generate system-prioritized
    next actions from current evidence/integrity/impact/dead-node reports.
35. Run `npm run architecture:gate-roadmap` to enforce roadmap status/metric
    consistency.
36. Run `npm run architecture:build-delta-report` to persist snapshot and delta
    between consecutive refresh runs.
37. Run `npm run architecture:gate-health-dashboard` to enforce semantic
    consistency of `allGreen` and supporting dashboard metrics.
38. Run `npm run architecture:gate-doc-baseline` to enforce that the
    `Current validated baseline` section in this document matches live runtime
    health metrics from `architecture-health-dashboard.json`.
39. Run `npm run architecture:gate` (also included in `architecture:refresh`)
    to fail fast when actionable evidence gaps are reintroduced.
40. Run `npm run architecture:status` for a one-command GREEN/RED readiness
    snapshot sourced from the proof bundle.

Evidence enrichment now also applies deterministic fallback inference for
connection proofs using mapped module/feature peers:

- API route -> database models in the same module/feature
- database model -> API routes in the same module/feature
- page -> API routes in the same module/feature
- test -> feature peers (API/page/database)
- feature/module -> mapped operational peers

This closes structural evidence gaps without inventing fake runtime behavior.

If a record is missing from this system, future agents must treat the feature
as unofficial until it is mapped.

## Obsidian Compatibility

Generated node pages use YAML frontmatter and wiki links so Obsidian Graph
View, Dataview, Breadcrumbs, Juggl, and Excalibrain can render relationships.

CSV remains canonical because it is easier for agents and scripts to validate.
Markdown remains generated because it is easier for humans to browse.

## Current Scope

The current checkpoint operates in green-state maintenance mode for active
CompanyCore/Roost runtime surfaces with deterministic evidence and integrity
gates.

Current validated baseline:

- graph: `445` nodes, `755` relations, `34` chains
- evidence queue: `0`
- chain hardening worklist: `0`
- chain coverage gate: `33/33` features (`100%`)
- chain integrity issues: `0`
- node integrity issues: `0`
- architecture health dashboard: `allGreen=true`

Automatic drift detection runs between code and registry for:

- adapter manifest API routes
- Prisma mapped table models
- backend React entry routes
- architecture-related test commands

Drift artifacts are generated into:

- `docs/status/architecture-drift-report.md`
- `docs/graphs/architecture-drift.json`
