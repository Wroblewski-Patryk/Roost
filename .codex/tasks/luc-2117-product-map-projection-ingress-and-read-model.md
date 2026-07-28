# LUC-2117 Product Map Projection Ingress And Read Model

## Task Contract

- Task Type: backend/data vertical implementation
- Current Stage: implementation
- Deliverable For This Stage: a Roost-owned server ingress, durable workspace-scoped projection state, and separate authenticated read adapter.

## Goal

Implement the consumer half of the approved one-way Product Map projection transport without exposing Paperclip or an ingest credential to browsers.

## Scope

- Roost server modules, existing capability/error/route/migration/scheduler/test conventions, and directly affected API/architecture documentation.
- Excluded: publisher/Paperclip changes, browser UI, secrets, deploys, pushes, production operations, and protected smoke.

## Implementation Plan

1. Reuse the existing workspace-scoped hashed service-key and route conventions to add exact ingest/read authorization boundaries.
2. Persist active/LKG, immutable accepted, quarantine/conflict, and idempotency receipt records through a versioned migration.
3. Implement admission, digest/envelope, replay/order/conflict, retention, and read-state semantics from the approved architecture.
4. Add focused server/migration tests and document the exact routes and response state schema.
5. Review the integrated diff, run targeted validation, update project evidence, and return the handoff to [LUC-1910](/LUC/issues/LUC-1910).

## Acceptance Criteria

- Exact capability-only ingress rejects sessions, broad/legacy keys, encoded, oversized, concurrent, invalid, replayed, cross-workspace, and out-of-order input before projection disclosure or pointer movement.
- Durable state supports idempotent retry, re-observation, four-field conflict quarantine, source-based stale/LKG states, retention, and no backward active pointer.
- The separate owner/read route has no ingest-key or receipt-only disclosure and exposes loading, empty, unavailable, stale, conflict, and success semantics.
- Focused tests and API/architecture documentation identify evidence for the implementation. No protected action is performed.

## Definition Of Done

The server/data packet is committed with a clean worktree, focused verification is recorded, impacted state/requirements evidence is updated, and the exact read route/schema plus residual independent Security/Ops/release gates are returned to [LUC-1910](/LUC/issues/LUC-1910).

## Result Report

- Implemented: `POST /v1/product-map/projection/ingest` with exact ingest-key
  admission, raw 256 KiB body handling, generic denials, envelope
  digest/idempotency validation, workspace/company binding, durable
  snapshot/receipt/quarantine/active state, and separate
  `GET /v1/product-map/projection` read semantics.
- Verified: `npm run prisma:generate`, `npm run build:server`, and
  `node --test dist/tests/product-map-projection.test.js` pass.
- Not verified: end-to-end database route cases, scheduler registration for
  retention cleanup, workspace/company provisioning, and distributed
  rate-limit behavior. These remain explicit release gates; no publisher,
  deploy, or production action was performed.
