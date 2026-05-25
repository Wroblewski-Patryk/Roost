# Pipeline Registry

Last updated: YYYY-MM-DD

## Purpose

Map core system flows across UI, API, services, data, workers, agents, failure
points, tests, and docs.

Pipelines are grounded in current code and link back to architecture/module
sources. They do not redefine architecture.

## Registered Pipelines

| Pipeline | Trigger | Primary Frontend | Primary Backend | Data Read/Write | Tests | Doc |
| --- | --- | --- | --- | --- | --- | --- |
| Example flow | User or system trigger | `path/to/frontend` | `path/to/backend` | Data model or store | test path | `docs/pipelines/pipeline-template.md` |

## Pipeline Document Contract

Every pipeline document must include:

- trigger
- user/system action
- involved frontend files
- involved backend/API files
- involved services/functions
- data read/write
- side effects/events/audit
- failure points
- tests
- related docs
- known gaps or `UNVERIFIED / NEEDS CONFIRMATION`

## Maintenance Rule

When a new system flow is introduced, add a row here and create a pipeline
document before closing the implementation task.
