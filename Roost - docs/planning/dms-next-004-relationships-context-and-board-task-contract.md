# Task

## Header
- ID: DMS-NEXT-004
- Title: Relationships Management read packet and board foundation
- Task Type: feature
- Current Stage: verification
- Status: IN_PROGRESS
- Owner: Coordinator + Backend Builder + QA/Test
- Priority: P1
- Mission ID: DMS-NEXT-004-RELATIONSHIPS-CONTEXT
- Mission Status: CHECKPOINTED

## Goal
Deliver the first verified backend read packet for `05 Relacje` so the department can be operated as a system context, not as an isolated graph endpoint.

## Scope
- `src/modules/relationships/relationships.routes.ts`
- `src/auth/capabilities.ts`
- `src/tests/api.test.ts`
- Source-of-truth status updates in planning/mission/task board files

## Implementation Plan
1. Add `GET /v1/relationships/context` with workspace-scoped, read-only packet data.
2. Reuse existing models (`Client`, `Interaction`, `Stakeholder`, `Deal`, `Note`, `Decision`, `Task`, `GoogleDriveFile`) and enforce owner-safe blocked actions.
3. Expose the route through `relationships:read` in adapter manifest.
4. Add API and MCP-manifest assertions in integration tests.
5. Run full validation gate and sync source-of-truth docs.

## Acceptance Criteria
- [x] `GET /v1/relationships/context` returns a structured packet for `05-relacje`.
- [x] Packet includes summary, entity lists, and agent safety contract (`allowedActions`, `blockedActions`).
- [x] Route is capability-scoped under `relationships:read` and visible in MCP manifest.
- [x] Regression validation passes (`npm run validate`).

## Definition of Done
- [x] Backend builds without errors.
- [x] New route is covered by API tests.
- [x] No temporary workaround or parallel subsystem introduced.
- [x] Architecture/runtime evidence gate remains green.

## Result Report
- Implemented and verified backend context packet route for `05 Relacje`.
- Kept existing `/v1/relationships/graph` untouched and complementary.
- Full `npm run validate` passed with architecture gates green (`443/755/34`, queues `0`).
- Remaining scope for full `DMS-NEXT-004`: web board surface over this packet (next checkpoint).
