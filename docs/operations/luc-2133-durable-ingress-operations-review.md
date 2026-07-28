# LUC-2133 Durable Ingress Operations Review

Reviewed commit: `635c4943ffe2d4e4c8e3fc872f95efdc2badb092`

## Task Contract

- Task Type: independent reliability and operations review
- Current Stage: verification
- Deliverable For This Stage: operational verdict for the durable Product Map
  ingress-controls packet without any protected environment mutation.

## Goal

Confirm that the local packet has safe migration, retention, multi-instance,
cleanup, and recovery behavior, and distinguish that evidence from the
protected Product Map release gate.

## Scope

- PostgreSQL-backed `(ingest key, workspace)` admission bucket and its
  migration.
- Transaction-scoped per-workspace advisory lock behavior.
- Retention cleanup and its named failure signal.
- Disposable local backup/restore of the projection schema and representative
  active-pointer state.
- Required release monitoring and deployment preconditions.

## Operational Verdict

**Approved for the local implementation gate. The Product Map release remains
`NO-GO`.**

The commit replaces process-local admission state with a PostgreSQL table keyed
by API key and workspace, uses a transaction-scoped PostgreSQL advisory lock,
and deletes expired admission state alongside the 30-day accepted/receipt and
90-day quarantine windows. The existing maintenance scheduler invokes cleanup
at most once per process per 24 hours, logs successful bounded-result counts,
and emits the exact stderr failure signal
`product_map_projection_cleanup_failed` before propagating a failure.

The process-local cleanup due marker is acceptable: duplicate cleanup attempts
from multiple instances are bounded and the database deletes are idempotent.
Admission and locking themselves are database-coordinated across instances.

## Recovery Evidence

On 2026-07-28, two new disposable `postgres:16-alpine` containers were used:

1. Applied all 33 Prisma migrations, including
   `20260728110000_product_map_projection` and
   `20260728120000_product_map_ingress_controls`, to an empty source database.
2. Seeded the source and inserted representative projection snapshot, receipt,
   active-pointer, and admission records with valid foreign-key references.
3. Restored a `pg_dump --clean --if-exists --no-owner` stream into a separate
   empty target database.
4. Read back two migration rows and one row each for the projection snapshot,
   receipt, active pointer, and admission record (`2, 1, 1, 1, 1`).
5. Removed both proof containers and confirmed their temporary host port had
   no listener.

This is sufficient evidence that this commit's schema and representative
projection state are logically backup/restorable in a local disposable
PostgreSQL environment. It is not a production restore acceptance: the
protected release still requires a current volume/backup, capacity and
rollback-target readback, post-restore health and authorization smoke, and the
release monitoring window.

## Required Monitoring And Release Preconditions

Before any protected promotion, preserve the fail-closed requirements in
`docs/operations/product-map-protected-release-preflight.md`:

- verify candidate SHA, Coolify target, persistent volume, and current rollback
  image;
- confirm publisher schedule/service health and delivery age from source
  `observedAt`;
- capture attempt, success, failure, retry, authorization-denial, duplicate,
  conflict, quarantine, unsupported-schema, cleanup-failure, restart, and
  migration signals with no private packet content or credentials;
- observe at least three public health samples over 15 minutes, including a
  post-authenticated-smoke sample; and
- use DRE as first responder and CTO as escalation owner.

## Acceptance Criteria And Result Report

- Approved against the exact local commit: yes.
- Safe local backup/restore exercised: yes; scope and limits recorded above.
- Deployment, restart, production probe, publisher activation, secret access,
  and configuration mutation: not performed.
- Remaining release gates: independent Security review and the protected
  preflight's candidate-specific deployment, monitoring, and recovery checks.
