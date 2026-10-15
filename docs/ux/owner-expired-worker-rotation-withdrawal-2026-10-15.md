# Expired Worker rotation proposal withdrawal — Outcome 0

This bounded correction lets the signed-in human owner withdraw one original,
pending `workerCredential.action=rotate` proposal only when the proposal and
handoff have expired, no issuance or active credential/execution remains, and
every impacted task is archived. The database writes a typed immutable receipt;
the Decision and source evidence stay in history. It does not alter a credential,
handoff, task or execution. There is no batch action. This release does not
withdraw any of the nine existing production proposals.

## Local proof and independent review

- Additive migration reviewed for data loss: existing withdrawal rows retain
  their historical kind, and the G24c command and effects remain available.
- New native PostgreSQL fixture: 1/1. It covers owner/workspace binding,
  expiry and malformed intent, live credential, issuance and active-execution
  blockers, archived-only impact, unavailable impact, stale digest, exact
  replay, acceptance racing after withdrawal and unchanged dependent rows.
- Targeted HTTP test on a disposable database after all migrations: 1/1. It
  covers owner preview, active-task denial, workspace/API-key denial, fresh
  exact-body proof, single-use proof, one ledger row and history read-back.
- PL/EN browser fixture at 390 and 1440 pixels: 32 scenarios. It covers
  confirmation, blockers, typed history receipt, G24c history, stale-preview
  refresh, retry binding, focus and keyboard actions. Existing governance UI
  fixture: 168 checks.
- `npm run validate`, `npm run codex:check`, G24c native regression (1/1),
  `git diff --check` and the real TypeScript v5 catalog verifier in a
  serializable transaction on disposable PostgreSQL passed.
- Independent Security/UX review found three presentation/recovery defects;
  the SQL and UI corrections were applied and retested. It found no further
  concrete authority, replay, SQL-race or G24c bypass. Reverse acceptance
  ordering and simultaneous key/handoff/task/execution writes were inspected
  in source but not separately exercised in the native fixture.

## Read-only production preflight

Before release, remote `main` and both public health routes agreed on
`7113bc9b`; PostgreSQL had 156 finished migrations and no unresolved migration.
There were nine pending Worker rotation proposals, one historical withdrawal
and no nonterminal agent execution. These observations made no Decision or
business-data changes.

An encrypted PostgreSQL backup was captured and restored into a separately
owned temporary database. Its schema/data/sequence comparison passed; the
temporary database was proved absent after cleanup. The verified encrypted
laptop copy was read back at `2026-10-15T13:48:12.647Z` (245,142,613 bytes;
SHA-256 `946249461ff5db7b1d433254e259501f8ab1f5a309e8f2367b005d9bfd4b8e17`).
The first attempt timed out waiting for restore sessions under a five-second
cleanup limit. Its owned temporary database was reconciled after the sessions
ended, without promoting a copy; one retry with the supported longer cleanup
limit produced the verified copy above. The older verified copy remained intact
until successful promotion.

## Release status

The production release and read-only post-release smoke remain pending at this
checkpoint. No production proposal has been withdrawn.
