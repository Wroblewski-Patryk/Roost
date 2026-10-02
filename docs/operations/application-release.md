# Permanent application release

The current gate and authority remain in [implementation](../implementation.md).
This document describes Gate 4 support and its evidence; it does not certify a
production application release.

## Current evidence — 2026-10-02

The managed Windows Worker/Hermes read-only PWA audit completed as execution
`ab672c9f-57d9-44e6-9df4-ccee24e05b5f`, task
`23429a09-e322-4254-b00e-57033436f9fa`. Its signed native receipt records
unchanged Git, filesystem, process and Docker state, no native model tools and
zero changed files. Evidence digest:
`517f65ed9ee71809211396e3ac51f6838c07c679821693ebf6aace3d0babba1d`.
The pinned baseline is `cf90418cc694dc0cb773a44c001c569407d05f9f`.

The audit identifies a PWA screenshot declared as 512 by 512 while the shipped
PNG is 1000 by 1000. A separate HTTPS observation reproduced the mismatch.
The audit distinguishes that supplied observation from an independent native
retrieval. Independent audit verification, separate owner first-write consent,
a managed repair, exact-commit acceptance and production release are unproven.
The earlier accepted local pilot branch/commit is preserved.

The actual deployment has separate Dockerfile targets and mixed baseline source
versions. Source support retains this topology without another application or
deployment migration. Production safety reads found active LIVE activity and
nonterminal orders. No trading, cancellation, data mutation, push or application
deployment was performed for this repair.

## Sealed release contract

Historical `roost-release-manifest-v1` certification manifests retain their
wire shape. Permanent applications use `roost-release-manifest-v2`, purpose
`application_release`, protected resources and `archiveRepository:false`.

For `coolify_git_set`, the source artifact set seals each target identifier,
Dockerfile, accepted commit/tree and configuration digest. This differs from
the immutable OCI images observed after builds. Rollback seals the actual
baseline image and commit/tree per target, including mixed source versions.
Compatible schema and exact configuration/data evidence remain required.

Roost installation metadata binds the target/Dockerfile list and HTTPS origins.
The private ownership ledger, outside repositories, binds application, canonical
clone, repository, targets and protected resources. The installed adapter accepts
no disposable resources and cannot delete an application/clone or archive Git.

## Installation and effects

The dedicated Worker uses strict `adapter:'coolify_git_set'` settings: TLS pins,
fixed SSH host, installed controller source pins, baseline queue identities,
immutable PostgreSQL endpoint, capacity bounds, private ownership ledger and
verified encrypted backup/restore receipts. Credentials remain in Windows
Credential Manager. Model packets/settings cannot choose executable scripts or SQL.

Native SSH/Git operations use the existing owned Windows Job and durable Writer
checkpoint. Normal HTTPS application configuration changes only the exact source
pin. Automatic deployment must be disabled before release push/merge; exact
configuration and actual runtime are rechecked.

Services may seal `expectedJsonStatus:'ok'` or `'ready'` in addition to HTTP
status. Such probes reject a failure payload returned with HTTP 200; volatile
timestamps do not enter the health digest. Probe bodies remain transient.

Each target deployment/rollback has a separate durable Roost intent and
deterministic controller queue identity. Builds are serialized. An uncertain
reply requires reading the exact queue and runtime before repeating an effect.
Read-only reconciliation cannot dispatch another target; a later target needs
its own admitted intent. Final observation matches all accepted queue identities
and actual container/image/source/configuration.

Safety reads real bot/session/order/position/dedupe state. Missing evidence is
blocked. This adapter requires quiescence and stable database fingerprints;
active LIVE or unresolved activity cannot be substituted with zero counts.
Operating or closing real financial state requires separate owner authority.
A PWA task/login grants neither that authority nor exact-commit release approval.

## Verification boundary

Source checks passed 233 Node release tests, including actual Windows owned
process/recovery/local Git checks; 62 TypeScript tests passed and one optional
PostgreSQL case was skipped. `typecheck`, build, lint and `codex:check` passed.
The additive purpose migration passed two actual isolated PostgreSQL checks:
unchanged existing records, preserved guards and rejected altered scope. Six
installed container/image/source/queue identities were read through the new
state module; services without a Docker HEALTHCHECK were handled explicitly.
These read-only observations do not prove production release/rollback. Actual
grant admission and installed configuration still need verification before release.
