# Service Topology

Last updated: YYYY-MM-DD

## Purpose

Map runtime services, dependencies, ports, queues, jobs, storage, and health
surfaces.

## Services

| Service | Runtime | Path / image | Depends on | Exposes | Health/readiness | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| web |  |  | api |  |  |  |
| api |  |  | database/cache |  |  |  |
| worker |  |  | queue/database |  |  |  |

## Dependency Graph

```text
user -> web -> api -> database
api -> queue -> worker -> external provider
```

## Maintenance Rule

When a service, worker, queue, provider integration, or storage dependency is
added or changed, update this topology and the environment matrix.
