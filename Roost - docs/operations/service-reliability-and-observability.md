# Service Reliability And Observability

Use this for deployable services, background workers, public APIs, scheduled
jobs, and product flows where downtime or data loss would matter.

## Reliability Contract

Define the smallest useful reliability contract before launch:

- Critical user journey:
- SLI:
- SLO:
- Error budget window:
- Alert threshold:
- Owner or escalation path:
- Dashboard or log query:
- Smoke test:
- Rollback or disable path:

## Choosing SLIs

Prefer user-centered indicators:

- availability: did the system respond successfully?
- latency: did it respond fast enough for the user journey?
- correctness: did it return the right result or persist the right state?
- freshness: is synchronized or cached data current enough?
- durability: did data survive restart, retry, and deploy?

Do not track every available metric as an SLI. Pick a small set that describes
whether users are actually receiving the expected service.

## Error Budget Posture

Use error budget thinking for release decisions:

- Healthy: normal feature delivery can continue.
- Burning: reduce risky change size, increase validation, and prioritize
  reliability fixes.
- Exhausted: pause non-critical risky launches until the failure mode is
  understood and mitigated.

## Observability Minimum

Every meaningful runtime path should provide:

- structured logs for success and failure
- request or job correlation where practical
- health/readiness signal
- visible dependency failures
- operator-readable error messages
- smoke command or manual verification path

## CompanyCore v1 Minimum

Before v1 is considered stable, observability must cover:

- owner registration/login success and failure without logging credentials
- workspace-scoped API key authentication success/failure without logging raw
  keys
- workspace scoping failures without leaking target record details
- integration settings changes without logging secret values
- ClickUp sync start, success, failure, and item counts
- event creation failures
- database migration/startup failures

## Critical Journeys

- Public health check responds.
- Owner can register/login and receive workspace context.
- Protected route can create and read workspace-scoped task data.
- Cross-workspace access is denied.
- Workspace owner can configure ClickUp settings without secret leakage.
- Native ClickUp sync creates or updates tasks and emits events.

## Suggested SLIs

- API availability for protected core routes.
- Auth success/error rate.
- ClickUp sync success rate.
- ClickUp sync freshness for configured workspaces.
- Event creation success rate for meaningful state changes.

## Smoke Signals

Production smoke should verify:

- `GET /health`
- owner registration/login or approved first-owner bootstrap
- protected workspace-scoped project/task call
- denied cross-workspace or unauthorized call
- ClickUp integration settings read/write with redacted response
- native ClickUp sync
- `GET /events` includes the expected sync event

## Integration Adapter Observability

Every native adapter should expose enough information to answer:

- which workspace requested the sync
- which provider and sync scope were used
- whether workspace settings were present and active
- whether the provider call failed before persistence
- how many provider items were seen, created, updated, skipped, or failed
- which safe event or log line correlates the request to resulting records

Minimum event/log fields:

- `provider`
- `workspaceId`
- `correlationId`
- `operation`, such as `discover` or `sync_tasks`
- `status`, such as `started`, `succeeded`, or `failed`
- `itemCount`, `createdCount`, `updatedCount`, `skippedCount` when relevant
- `errorCode` for failures

Forbidden fields:

- raw provider token
- raw API key
- password or auth token
- full provider response body
- stack trace in API response

The disable path for a failing integration is to set the workspace provider
setting `active = false` and retry after configuration or provider health is
recovered.

## Incident Learning

After a production incident, failed deploy, or serious smoke failure:

- record what happened
- record user impact
- record root cause or current best hypothesis
- record detection gap
- record fix and rollback outcome
- add a regression, alert, runbook update, or task-board follow-up
