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

Release, signed-in production read-back, final checks and remaining limits are recorded below after delivery.
