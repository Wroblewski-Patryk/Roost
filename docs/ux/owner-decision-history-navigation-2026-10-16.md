# Decision history read-only navigation, 2026-10-16

## Approved boundary

A historical Decision opened from History or an exact `decisionId` URL must show only retained details, including after refresh, sign-in and browser back. The current governed Decision flow stays available. A historical view must not offer or issue a mutation. Invalid, missing and foreign-workspace IDs fail closed. This is one bounded owner-console navigation gate under RF-UX-010/012 and the existing Decision governance rules; it does not reclassify or alter company records.

The approved work covers frontend routing, PL/EN narrow/wide and keyboard/error checks, independent UX and Security review, a scoped commit and push, at most one normal Coolify deployment after preflight, and read-only production smoke. No migration, Worker/model task, portfolio change, cleanup or production company-record write belongs to this gate. Estimate: 4–8 technical hours, without a hard cap.

## Local implementation and proof

The exact workspace-scoped `GET /v1/decisions/:id` already supplies `historyReason`. The owner route now checks that server-derived field before selecting a detail component. A historical legacy or governed record uses the same read-only inspector. History scope and exact UUID survive browser navigation and post-login canonicalization; a current record forced into a history URL is refused. Current records continue to use their existing legacy editor or governed modal.

`npm run validate`, `npm run codex:check` and `git diff --check` passed. The exact-link unit suite passed 14/14. The Decision UI fixture passed 16 PL/EN checks at 390 and 1440 CSS pixels, covering populated/empty/retry, keyboard activation, historical governed and legacy detail, direct URL, refresh, back, current legacy detail, invalid/missing IDs, nonempty current queues hidden in History, Archive confirmation cleared on Back, no non-GET request, no page error and no document overflow. Independent read-only UX and Security reviews found no remaining P0/P1 blocker after those fixes. This fixture is local and synthetic; production proof remains pending.

## Read-only release checkpoint

Remote `main` and the running backend both remain at `cb6e05c7`; Coolify deployment `6441` is finished. PostgreSQL is healthy with 158 finished migrations and no unresolved migration. A signed-in PL owner view shows one actionable Task on Today, no Decision there, and a populated Decision History with withdrawn and superseded records. This confirms a positive production history sample and the absent Today-to-Decision click; it does not verify this new code in production. Current production also still displays actionable governance queues in History, the defect covered by the repair.

The VPS has 6.4 GB free (91% used) after `6441`. The current gate excludes cleanup; the earlier one-time builder-cache approval belonged to another commit and is already spent. No code push or new deployment has been performed for this gate. Recheck capacity, retained image, backup/restore receipt, Coolify collision state and health before any release. Do not infer a full RF-UX-010/012 or Outcome 0 acceptance from this slice.
