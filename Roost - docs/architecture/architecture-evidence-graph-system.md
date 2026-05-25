# Architecture Evidence Graph System

Last updated: YYYY-MM-DD

## Purpose

Use an architecture evidence graph when prose docs are no longer enough to know
where the project really stands.

The goal is a living proof system:

- meaningful features, routes, services, components, tests, documents, data
  models, workflows, events, agents, prompts, and configuration surfaces have
  stable node records;
- nodes link to dependencies, consumers, tests, docs, parent/child records, and
  evidence;
- function chains describe end-to-end execution from trigger to readback,
  side effects, tests, and documentation;
- missing records or missing evidence are treated as confidence gaps.

This system extends codebase maps, module docs, requirement matrices, and
module confidence ledgers. It does not replace them.

## Source Of Truth

CSV registries are the machine-readable source of truth:

- `docs/architecture/registry/nodes.csv`
- `docs/architecture/registry/features.csv`
- `docs/architecture/registry/functions.csv`
- `docs/architecture/registry/components.csv`
- `docs/architecture/registry/api_routes.csv`
- `docs/architecture/registry/ui_elements.csv`
- `docs/architecture/registry/tests.csv`
- `docs/architecture/registry/agents.csv`
- `docs/architecture/registry/prompts.csv`
- `docs/architecture/registry/events.csv`
- `docs/architecture/registry/workflows.csv`
- `docs/architecture/registry/pages.csv`
- `docs/architecture/relations/dependencies.csv`
- `docs/architecture/chains/chains.csv`

Generated or project-specific files may include:

- `docs/architecture/nodes/*.md`
- `docs/architecture/chains/*.md`
- `docs/architecture/graphs/*`
- `docs/status/architecture-map-status.md`
- `docs/status/architecture-graph-drift.md`
- `docs/architecture/indices/*`

## Record Contract

Every node record should include:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable unique identifier. |
| `name` | yes | Human-readable name. |
| `type` | yes | Feature, page, component, hook, API route, service, data model, test, documentation, workflow, event, agent, prompt, config, etc. |
| `status` | yes | Implementation/proof state. |
| `layer` | yes | Frontend, backend, data, worker, testing, docs, agent-system, operations, fullstack, etc. |
| `module` | yes | Owning module or project area. |
| `feature` | yes | Parent feature or capability. |
| `description` | yes | What this node owns. |
| `file_path` | yes | Primary repo path or canonical doc path. |
| `related_files` | no | Supporting files separated by semicolons. |
| `parent_id` | no | Parent graph node. |
| `child_ids` | no | Child graph nodes separated by semicolons. |
| `depends_on` | no | Required upstream nodes. |
| `used_by` | no | Downstream consumers. |
| `tests_related` | no | Related test nodes. |
| `docs_related` | no | Related documentation nodes. |
| `risk_level` | yes | Low, medium, high, or critical. |
| `completion_percent` | yes | Evidence-backed completion estimate, not optimism. |
| `last_verified_at` | yes | ISO date of latest meaningful verification. |
| `verification_status` | yes | Evidence state. |
| `notes` | no | Caveats and residual risk. |

## Status Vocabulary

Use these statuses unless the project explicitly expands the vocabulary:

- `planned`
- `in_progress`
- `implemented`
- `implemented_not_verified`
- `partially_verified`
- `verified_local`
- `verified`
- `blocked`
- `broken`
- `missing`
- `deprecated`

No proof means no confidence. A node may exist as code, but if its tests,
runtime proof, connection proof, or documentation links are missing, it remains
`implemented_not_verified` or `partially_verified`.

## Function Chain Rule

Every user-facing or runtime-significant function should have a chain in
`docs/architecture/chains/chains.csv`.

Expected shape:

```text
UI trigger -> component -> hook/action -> API request -> backend route ->
controller/service -> repository/data model -> event/side effect ->
readback/projection -> tests -> docs
```

Agents must inspect the whole chain before answering "does this work?"

Correct workflow:

1. Find the feature node.
2. Follow its chain record.
3. Inspect every node and relation in the chain.
4. Check linked UI, API, data, tests, docs, events, agents, and side effects.
5. Report verified, partially verified, blocked, broken, or missing based on
   evidence.

Local file-only analysis is not sufficient for feature status.

## Missing-Connection Semantics

Treat these as graph defects:

- code exists without a node record;
- a feature node has no chain;
- an API route has no UI/API/test/doc relation where applicable;
- a node has no tests or explicit `not applicable` note;
- a docs node is missing for current architecture behavior;
- a relation references a missing node;
- a node points to a missing file.

## Maintenance Rule

Every new or changed function should update the graph in the same task:

1. add or update CSV node records;
2. add or update relation rows;
3. add or update function-chain rows;
4. regenerate graph files when tooling exists;
5. update requirement/module confidence when behavior or proof changed;
6. record residual missing links as `missing`, `blocked`, or
   `implemented_not_verified`, never as implicit success.
