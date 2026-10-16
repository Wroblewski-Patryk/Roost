# Procedure provenance and use — bounded Outcome 0 slice

## Authority and boundary

The owner approved this single slice on 2026-10-16: show recorded purpose and scope, direct creation/revision evidence or an explicit unknown, configuration links, current task bindings and historical task bindings in the existing Procedure catalog. RF-UX-010/012 and RF-CTX-027 apply; RF-CTX-012/026 authority remains unchanged. RF-CTX-029 procedure launch remains unproved. No production business record is reclassified, archived, deleted or changed. No schema migration, provider write, Worker operation or new registry is part of this slice.

## Read contract

`GET /v1/process-core/procedures/:id/provenance` is read-only and owner-only. It checks the Procedure and every projected relation against the authenticated workspace. It returns the stored purpose/scope/version/status, direct Procedure audit/event lifecycle metadata without payloads, an origin state of `recorded` only for a direct creation/revision record (otherwise `unknown`), configuration links to process, role, pipeline stages, policies, applications and capabilities, and task admission/composition bindings. The latest task admission version is current only when the Task is not done or archived; a composition selection is current only when it is the latest selection for its operation and belongs to the latest admission scope. Other bindings are historical. These relationships are not proof that the procedure ran or succeeded. The endpoint grants no execution or release authority.

The owner opens a Procedure in the existing catalog. The PL/EN detail shows intent, source status, lifecycle, configuration, current and historical task links, an error state and refresh. A missing direct origin record stays unknown even when the Procedure is active or has a purpose. The dialog returns keyboard focus to the originating action and supports Escape and Tab containment. The ordinary catalog and archive preview retain their existing behavior.

## Verification before release

- Read-only production baseline: 23 active and 10 archived Procedure versions; 24 `procedure.create_draft`, 24 `procedure.activate` and 10 `procedure.archive` direct audit entries; 119 task admission scopes and 223 task composition selections. These are aggregate counts, not a provenance classification.
- Native API test on disposable PostgreSQL: owner read, unknown origin, direct audit origin, workspace isolation, demoted owner denial, configuration relations and no Procedure status write passed. The test database and role were removed by the runner.
- UI test: 16 PL/EN × 390/1440 px × recorded/unknown/error/readonly cases passed. It checks links, empty/unknown/error states, zero writes, overflow, initial focus, Tab containment, Escape and focus return. Existing archive UI regression passed 40 cases.
- Independent Security review found and repaired stale composition classification after re-admission and an unnecessary cross-workspace nested pipeline label. Independent UX review found and repaired detail-dialog keyboard behavior and untranslated technical labels.

## Release and signed-in read-back

`npm run validate`, `npm run codex:check`, the focused native PostgreSQL API test, 16 provenance UI cases, 40 archive UI regression cases and `git diff --check` passed on the release candidate. A fresh encrypted backup captured 290,266,360 archive bytes, passed isolated restore parity and prerequisite read-back, and left no temporary restore database or backup lock. The private receipt is outside this repository. Before the push, public health and remote `main` matched `5c1b6f2a`, the deployment queue was empty, PostgreSQL had 159 completed and zero unfinished migrations, and the previous backend image was retained.

Commit `393af0a252d157403139bc23f764c3f1c5a39c43` was pushed to `main` and deployed in Coolify run 6448 (the only deployment in this slice). `/health` and `/v1/health` returned `ok` with that exact commit. PostgreSQL remained healthy with 159 completed and zero unfinished migrations; the prior backend image remained available. After release, root storage had 8,827,191,296 bytes free. Anonymous provenance GET returned 401.

In the signed-in owner console, an active procedure with no direct origin record showed `Nieustalone`, nine pipeline stages, two current task admissions and six historical admissions. A different active procedure showed its direct creation audit, application link and 69 historical composition selections; the interface did not claim these were successful executions. An archived procedure in the All view showed its direct creation audit, one admission and one composition link in history and no current link. Production totals remained 23 active and 10 archived Procedure versions, 119 admission scopes and 223 composition selections. The original Goal History tab was restored after read-back. No production business record was written by this verification.

Observed UX limits: a one-step Procedure reads `1 kroków` in Polish, and a Procedure with 69 historical links requires a long modal scroll. Both remain visible in the deployed build; no second deployment was authorized in this slice. This bounded view does not establish business authorship where direct origin is unknown, verify that a linked Procedure ran successfully, or close wider Outcome 0 and RF-UX-012 acceptance.
