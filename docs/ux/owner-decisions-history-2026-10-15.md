# Decision register current and history slice, 2026-10-15

This bounded Outcome 0/RF-UX-012 slice makes the ordinary owner Decision register current by default. An explicit owner-only History tab retains archived, rejected and withdrawn records, plus predecessors only after an accepted successor. Pending and deferred questions remain in the current register and their dedicated queues. History keeps the exact record ID, status, content, author, dates and decision lineage; opening a legacy history row is read only. No production Decision or business record is archived, withdrawn, deleted or rewritten by this release.

## Local proof

- The disposable PostgreSQL API test passed 1/1 after all 156 migrations. It covered current/history status routing, exact archived ID, foreign workspace 404 and relation isolation (including a deliberately malformed historical cross-workspace pointer), unauthenticated 401, API-key 403 and invalid/duplicate scope 400.
- The existing native governance test passed 2/2 subtests: an accepted predecessor remains current while its replacement is pending, then moves to history only after the successor is accepted. The exact predecessor GET retains its ID and history reason. The separate terminal-state unit test passed 1/1.
- Real DecisionsWorkbench browser fixtures passed 12/12: PL/EN at 390 and 1440 CSS pixels, each with populated, empty and recoverable-error states; Enter switches History, historical ID/content/lineage are visible, Escape closes the read-only detail, and no write, page error or horizontal document overflow occurred.
- `npm run validate`, `npm run codex:check` and `git diff --check` passed. Independent read-only Security/UX review found no remaining actionable finding in the scoped diff after workspace relation isolation, complete legacy detail and Polish current/history labels were repaired.

## Release limit

Read-only preflight aligned remote `main`, the running backend and both public health routes at `451d2577`; PostgreSQL was healthy with 156 finished migrations, no unresolved migration and no active agent execution. The VPS had 23 GB free; the previous backend image remained. A retained encrypted backup file has envelope metadata recording isolated restoration at 2026-10-14 18:53 UTC, consistent with the earlier release account. It is an older recovery point and was not reauthenticated in this preflight. There is no new migration or production data write in this slice.

Local fixtures and a static review do not prove a signed-in production owner journey or classify existing production Decisions by provenance. Full Outcome 0, RF-UX-010 and RF-UX-012 remain open.
