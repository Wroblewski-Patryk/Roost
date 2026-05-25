# Architecture Map

Last updated: YYYY-MM-DD

## Purpose

Use this map to navigate current architecture truth and implementation
traceability.

## Architecture Sources

| Need | Start With |
| --- | --- |
| Architecture policy | `docs/architecture/architecture-source-of-truth.md` |
| System overview | `docs/architecture/system-architecture.md` |
| Stack decisions | `docs/architecture/tech-stack.md` |
| Agent cognition/runtime stages | `docs/architecture/agent-system-primitives.md` |
| Code inventory and ownership | `docs/architecture/codebase-map.md` |
| Requirement and feature traceability | `docs/architecture/traceability-matrix.md` |
| Graph evidence system | `docs/architecture/architecture-evidence-graph-system.md` |
| Module ownership | `docs/modules/README.md` |
| End-to-end flows | `docs/pipelines/pipeline-registry.md` |

## Graph Sources

| Path | Meaning |
| --- | --- |
| `docs/architecture/registry/nodes.csv` | Master node registry. |
| `docs/architecture/registry/features.csv` | Feature/capability rows. |
| `docs/architecture/registry/functions.csv` | Function/service/helper rows. |
| `docs/architecture/registry/components.csv` | UI component rows. |
| `docs/architecture/registry/api_routes.csv` | API route rows. |
| `docs/architecture/registry/tests.csv` | Test/proof rows. |
| `docs/architecture/relations/dependencies.csv` | Dependency edges. |
| `docs/architecture/chains/chains.csv` | End-to-end function chains. |

## Work Rule

Before changing a user-visible or runtime-significant behavior:

1. identify the feature, chain, module, and owner files;
2. inspect all linked UI, API, service, data, event, test, and docs records;
3. decide whether the task is implementation, proof, repair, or architecture
   mismatch;
4. update the same records after the change.
