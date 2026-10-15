# Decision register current and history slice, 2026-10-15

This bounded Outcome 0/RF-UX-012 slice makes the ordinary owner Decision register current by default. An explicit History tab for an authenticated user in the same workspace retains archived, rejected and withdrawn records, plus predecessors only after an accepted successor. Pending and deferred questions remain in the current register and their dedicated queues. History keeps the exact record ID, status, content, author, dates and decision lineage; opening a legacy history row is read only. No production Decision or business record is archived, withdrawn, deleted or rewritten by this release.

## Local proof

- The disposable PostgreSQL API test passed 1/1 after all 156 migrations. It covered current/history status routing, exact archived ID, foreign workspace 404 and relation isolation (including a deliberately malformed historical cross-workspace pointer), unauthenticated 401, API-key 403 and invalid/duplicate scope 400.
- The existing native governance test passed 2/2 subtests: an accepted predecessor remains current while its replacement is pending, then moves to history only after the successor is accepted. The exact predecessor GET retains its ID and history reason. The separate terminal-state unit test passed 1/1.
- Real DecisionsWorkbench browser fixtures passed 12/12: PL/EN at 390 and 1440 CSS pixels, each with populated, empty and recoverable-error states; Enter switches History, historical ID/content/lineage are visible, Escape closes the read-only detail, and no write, page error or horizontal document overflow occurred.
- `npm run validate`, `npm run codex:check` and `git diff --check` passed. Independent read-only Security/UX review found no remaining actionable finding in the scoped diff after workspace relation isolation, complete legacy detail and Polish current/history labels were repaired.

## Release limit

Read-only preflight aligned remote `main`, the running backend and both public health routes at `451d2577`; PostgreSQL was healthy with 156 finished migrations, no unresolved migration and no active agent execution. The VPS had 23 GB free; the previous backend image remained. A retained encrypted backup file has envelope metadata recording isolated restoration at 2026-10-14 18:53 UTC, consistent with the earlier release account. It is an older recovery point and was not reauthenticated in this preflight. There is no new migration or production data write in this slice.

Local fixtures and a static review do not prove a signed-in production owner journey or classify existing production Decisions by provenance. Full Outcome 0, RF-UX-010 and RF-UX-012 remain open.

## Deployed read-back

The scoped code, reviewed documentation handoff and this pre-release evidence fast-forwarded `main` as build `7113bc9bfafcde281d3c4775b023083d02fa1296`. Coolify webhook deployment `6433` finished once at 2026-10-15 01:19:37 UTC. Public `/health` and `/v1/health` both returned `ok` with that exact commit; the public root and login returned 200. Anonymous current and history Decision reads returned 401. The replacement backend ran that image; PostgreSQL was healthy on the same named volume with 156 finished migrations and no unresolved migration. Execution counts remained terminal-only; the previous two backend images were retained and the VPS had 20 GB free after rollout. No production Decision, task, Worker execution, model call, deletion or business-data mutation was performed for this smoke.

A read-only aggregate found 71 accepted and 10 proposed Decision rows; governance state included one withdrawn record. This identifies a possible positive history case, but does not prove which workspace owns it or that the owner can inspect it. The available browser session reached only the public page and had no owner login. Signed-in PL/EN current/history navigation, exact withdrawn-record comparison and a full RF-UX-012 journey remain unobserved. This completes only the bounded Decision register slice and authorizes no next gate.
