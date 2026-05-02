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

## Incident Learning

After a production incident, failed deploy, or serious smoke failure:

- record what happened
- record user impact
- record root cause or current best hypothesis
- record detection gap
- record fix and rollback outcome
- add a regression, alert, runbook update, or task-board follow-up
