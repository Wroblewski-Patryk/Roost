# Deployment Template: Local -> Stage -> Production

Last updated: YYYY-MM-DD

## Purpose

Use this template for projects deployed through a local gate, a staging
environment, and a production promotion.

The core rule is simple: production should promote a known SHA that already
passed local and stage gates. Do not turn production into the first real
integration test.

## Phase 0: Prerequisites

Before a deployable release:

1. Runtime services have build definitions, such as Dockerfiles or platform
   service config.
2. Environment variables are listed in one source of truth.
3. Database migration and rollback policy are defined.
4. Domains are mapped for web, API, and stage equivalents.
5. Health and readiness endpoints exist where applicable.
6. Worker processes or background jobs have a health/readback strategy.
7. Smoke checks exist for auth, persistence, and the critical business flow.

## Phase 1: Local Gate

Run local verification against the exact code intended for deploy:

1. Install dependencies.
2. Run lint/typecheck where applicable.
3. Run tests for auth, persistence, permissions, and critical flows.
4. Build API, web, worker, or app artifacts.
5. Run local smoke:
   - login or identity check
   - protected route or permission check
   - create/list persistence readback
   - critical user or operator flow
6. Record the immutable commit SHA.

## Phase 2: Stage Deploy

Deploy the exact SHA to staging:

1. Deploy API, web, workers, and related services.
2. Validate database and cache bindings.
3. Run migration gate against the stage database.
4. Validate stage health:
   - `/health`
   - `/ready`
   - worker health or queue readback
5. Run stage smoke:
   - login or identity flow
   - dashboard/protected route redirect
   - create/list critical entity
   - critical business flow
6. Record timestamp, SHA, operator, environment, and pass/fail evidence.

## Phase 3: Production Promotion

Promote the same verified SHA to production:

1. Confirm production environment values match the approved matrix.
2. Promote or deploy the exact stage-verified SHA.
3. Run migrations according to the release policy.
4. Validate production health/readiness.
5. Run production smoke with safe, approved data.
6. Mark release healthy only after smoke passes.

## Mandatory Service Contract

Adapt the service map to the project:

| Service | Required proof |
| --- | --- |
| API | stable domain, secrets present, database/cache connectivity, health endpoint |
| Web | points to the correct public API base URL, static/runtime config checked |
| Worker | running process, queue or scheduled-job visibility, no crash loop |
| Database | persistent storage, migrations applied, backup posture known |
| Cache/queue | bindings correct and worker-visible |
| External provider | credentials scoped, sandbox/live mode intentional |

## Fast Triage Matrix

| Symptom | First checks |
| --- | --- |
| Web shows no available server | Service running, domain attached to correct app, deployment target healthy. |
| API starts but DB table is missing | Migration status, target database URL, migration logs. |
| Login succeeds but session redirects fail | Cookie domain, duplicate cookies, public API URL, auth callback URL. |
| Create succeeds but list is empty | Same actor/session for create and list; tenant/workspace ID consistency. |
| Worker output is stale | Worker health, queue subscription, cron schedule, runtime env. |
| Stage works but production fails | SHA mismatch, env matrix drift, provider mode mismatch, migration drift. |

## Post-Deploy Evidence Template

Record this in the release task or operations evidence:

```text
SHA:
Environment:
Deployed services:
Migration status:
Health checks:
Smoke checks:
Operator:
Timestamp:
Rollback needed: yes/no
Residual risks:
Notes:
```

## Agent Deployment Prompt Contract

When delegating deployment to an agent, provide:

1. repository path
2. target SHA or branch
3. target environment
4. web and API URLs
5. platform/project/service IDs when relevant
6. critical secret names only, never secret values
7. smoke checks and rollback criteria

Required agent behavior:

1. confirm clean/dirty tree and target SHA
2. validate service map
3. confirm migration strategy
4. deploy in the approved order
5. run health checks
6. run auth and persistence smoke checks
7. stop on critical failure and report exact endpoint/status
8. return status, evidence, risks, and next actions

Prompt starter:

```text
Deploy <PROJECT_NAME> to <ENVIRONMENT> using SHA <GIT_SHA>.
Validate api/web/workers, run migrations, then run auth and persistence smoke checks.
If a critical gate fails, stop and report the exact blocker with endpoint/status.
Return final status, evidence summary, risks, and next actions.
```
