# LUC-5246 Commercial Exceptions API Journey Proof

Status: DONE
Task type: QA verification
Current stage: verification
Last updated: 2026-06-20
Owner: QA & Verification Engineer
Parent: [LUC-5238](/LUC/issues/LUC-5238)

## Goal

Reduce the remaining Roost `implementation_without_tests` confidence signal by
selecting and proving one named release-relevant CompanyCore journey after the
[LUC-5238](/LUC/issues/LUC-5238) known-state baseline.

## Selected Slice

Selected journey: Commercial Exceptions read-only risk packet,
`GET /v1/commercial-exceptions`.

Architecture entities and paths:

- `API-AUTO-0029` - `GET /v1/commercial-exceptions`.
- `FEAT-AUTO-0005` - Commercial Exceptions Coverage Expansion.
- `src/modules/commercial-exceptions/commercial-exceptions.routes.ts`.
- `src/modules/finance/finance.routes.ts` and
  `src/modules/sales/sales.routes.ts` as downstream consumers of the packet.
- `src/tests/api.test.ts` commercial exception assertions.

Reason:

- The [LUC-5238](/LUC/issues/LUC-5238) baseline reports
  `implementation_without_tests=1162`, actionable `1153`.
- Recent proof rungs already covered Strategy, Finance, Assets preview,
  Relationships, Process Core, Operating Model, and Dashboard command.
- Commercial exceptions are release-relevant because discount, invoice
  readiness, client, approval, note, task, and agent-event evidence can affect
  money-impacting owner decisions.
- The selected route is locally safe to prove through the existing isolated API
  harness and does not require protected production access.

## Scope

Allowed scope:

- Select and prove one local API journey.
- Use disposable local PostgreSQL through the project-native test harness.
- Run route/capability and architecture status checks.
- Record cleanup evidence.

Explicit exclusions:

- No production smoke, deploy, push, restart, live-account mutation,
  credential access, secret disclosure, schema change, migration authoring,
  browser proof, or runtime feature change.

## Expected Behavior

`GET /v1/commercial-exceptions` must:

- deny unauthenticated access;
- return workspace-scoped commercial exception evidence from notes, approvals,
  tasks, and agent events;
- classify high-risk commercial cases such as 100% discounts, missing sources,
  and invoice-readiness blockers;
- support client filtering without mutating source records;
- isolate foreign-workspace data;
- expose the read-only agent packet with blocked discount actions;
- remain registered in the MCP manifest as
  `companycore_get_commercial_exceptions` with
  `commercial-exceptions:read`, read risk, and no approval requirement.

## Verification Evidence

| Check | Result |
| --- | --- |
| `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5246-postgres COMPANYCORE_TEST_DB_PORT=55446 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | INCONCLUSIVE. The command hit the shell tool timeout after `184120ms`. Follow-up inspection showed the validation-owned container still running. A same-container rerun built server/web successfully but failed during `prisma:migrate:deploy` with a bare Prisma `Schema engine error`; the harness then removed the container. |
| `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5246b-postgres COMPANYCORE_TEST_DB_PORT=55447 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | PASS. Built server/web, applied `31` migrations to disposable PostgreSQL, seeded data, and ran `node --test dist/tests/api.test.js`: `7/7` subtests passed, including `CompanyCore v1 protected API flow` (`duration_ms=54690.5319`, total `60690.0263ms`). Existing assertions covered unauthenticated denial, total and filtered exception reads, note/approval/task/agent-event evidence, 100% discount values, missing-source and owner-decision risk flags, invoice-readiness blockers, no source mutation, foreign-workspace isolation, MCP manifest exposure, and blocked `apply_discount` action. |
| `npm run check:route-capabilities` | PASS: `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| `npm run architecture:status` | PASS: `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup: `docker ps -a --filter "name=^/companycore-luc-5246b-postgres$" --format "{{.Names}} {{.Status}}"` | PASS: no validation DB container remained. |
| Cleanup: `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` | PASS: no browser validation process was present. |

## Classification

Reality status: verified.

The Commercial Exceptions API journey is locally verified for protected
workspace-scoped read behavior, money-impacting risk classification,
non-mutating read-only behavior, foreign-workspace isolation, MCP/capability
exposure, and blocked discount-action posture. No defect or repair child issue
is warranted from this proof.

## Integration And Safety Notes

- Existing systems reused: project-native `scripts/test-api-local.mjs`,
  existing API assertions, existing route/capability checker, and existing
  architecture status gate.
- No workaround, temporary bypass, duplicated logic, architecture change, or
  product/runtime change was introduced.
- Deploy impact: none.
- Push status: not needed for this QA-only evidence packet.
- Residual risk: browser proof for any Commercial Exceptions UI projection and
  protected production proof remain separate future gates.

## Result Report

Task summary: completed the focused QA proof-ladder selection requested by
[LUC-5246](/LUC/issues/LUC-5246) by selecting and proving the Commercial
Exceptions read-only risk packet from the remaining
`implementation_without_tests=1162` signal.

Files changed:

- `docs/planning/luc-5246-commercial-exceptions-api-journey-proof.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`

What is incomplete: no runtime defect remains for this selected journey.
Browser proof for any UI projection and protected production proof are
intentionally outside this issue.
