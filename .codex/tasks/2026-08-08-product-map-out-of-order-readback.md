# Task

## Header
- ID: PAPERCLIP-ROOST-PROJECTION-2026-08-08
- Title: Keep rejected Product Map replay from poisoning active readback
- Task Type: fix
- Current Stage: verification
- Status: REVIEW
- Owner: Backend Builder
- Priority: P0
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: PAPERCLIP-AUTONOMY
- Mission Status: PARTIALLY_VERIFIED

## Context
Paperclip's protected Roost verification correctly sent an old replay to prove
fail-closed ingress. Roost rejected and quarantined it, but every later read
treated that expected audit record as an active conflict.

## Goal
Preserve replay rejection and audit evidence without degrading the unchanged
last-known-good projection. Real same-snapshot/different-digest conflicts must
still fail closed.

## Scope
- `src/modules/product-map/product-map-projection.service.ts`
- `src/tests/product-map-projection.test.ts`
- `docs/maps/product-map.md`
- task and confidence evidence only

## Autonomous Loop Evidence
1. Analyze: active snapshot was healthy; the latest quarantine reason alone
   forced public `status=conflict`.
2. Select: P0 because false conflict prevented autonomous delivery acceptance.
3. Plan: distinguish audit-only out-of-order replay from active-data conflict.
4. Execute: filter lifecycle conflict derivation while preserving quarantine.
5. Verify: targeted unit test, typecheck, and protected readback are required.
6. Self-review: no schema, API shape, or ingress acceptance behavior changes.
7. Document: Product Map contract and module confidence ledger are updated.

## Acceptance Criteria
- [x] Out-of-order packets remain rejected and quarantined.
- [x] Out-of-order quarantine does not invalidate active LKG readback.
- [x] Same-snapshot/different-digest quarantine still causes conflict.
- [x] A source/deployed mismatch remains scoped to the affected offering.
- [ ] Protected target readback proves current/fresh exact projection after deployment.

## Validation Evidence
- Tests: `node --test --import tsx src/tests/product-map-projection.test.ts` PASS (8/8); `npm run build:server`, architecture chain gate (34/34), and architecture evidence gate PASS.
- Manual checks: protected readback pending deployment
- Module confidence ledger updated: yes; protected deployment remains pending.
- Reality status: verified locally

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: pending protected readback
- Endpoint and client contract match: yes
- DB schema and migrations verified: not applicable
- Regression check performed: pending

## Reliability / Security / Ops
- Fail-closed behavior: real digest conflict remains blocking; rejected replay is audit-only.
- Rollback: revert the quarantine classification helper and documentation.
- Deploy impact: low; runtime behavior changes only for rejected old replay history.
- Secrets or permission changes: none.

## Result Report
- Task summary: implementation complete; verification and deployment evidence pending.
- What is incomplete: protected deployed readback and exact production SHA evidence.
