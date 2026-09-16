# Hermes root-scoped review and reconciliation v2

Later B26 update: [exact adopted recovery](hermes-b26-adopted-recovery-v1.md)
records the separately authorized consumption/cleanup and terminal resource state.
Original review, supplement, adoption and spent are preserved; recovery does not
rewrite historical acceptance or grant another execution. Earlier ownership,
retention and successor statements below describe their original observation.


Later B25 update: [exact owner legacy adoption](hermes-b25-legacy-adoption-v1.md)
records explicit acceptance of the missing historical ownership receipt without
backfilling it or altering B21/B24. It grants no cleanup or execution authority;
B26 requires a separate owner decision and fresh checks before expiry. The
outcomes and requirements below retain their original historical scope.


Later B24 update: [recovery supplement v1](hermes-b24-recovery-supplement-v1.md)
bridges the legacy identity ordering and records later verification separately.
Original B21 REFUSED/acceptance_failed/spent remain unchanged; missing historical
fixture ownership keeps recovery BLOCKED. No cleanup or execution grant follows.
The outcomes and successor proposals below retain their historical scope.


[B21 real validation](hermes-b21-coding-smoke-v1.md) records acceptance_failed
for safe extra paths with independent verification REFUSED. Evidence and fixture
remain intact; scope failure does not become a security violation or authorize
cleanup. The normal reconciliation gate remains strict.

The separately owner-approved [B20 legacy exception](hermes-b20-legacy-recovery-v1.md)
completed exact B17 lease/Writer removal and preserved all spent records. The
exception is terminally spent/disabled; B19 strict recovery remains unchanged.
Earlier recovery-pending statements below are historical. B17 repair/test
acceptance remains unproven; no new execution is authorized.

RF-RUNTIME-005B19, 2026-09-16. Source implementation and synthetic qualification
are complete. Legacy B17 recovery is **BLOCKED**, with a read-only refusal.
No installed provider/interpreter, model, account operation or new activation was
used. ADR-004 v11 records the accepted policy amendment; profile/registry remain
v5 and the installed native-risk reference remains v7. All six public flags are
false. This is not evidence that the previous B17 repair succeeded.

## Scope and protected boundaries

`repository_write` authorizes ordinary coding within the single canonical root.
The optional `writePaths` list expresses literal file/directory-prefix acceptance
expectations, not an exhaustive security allowlist. With no expectations, safe
new files, directories and ordinary edits are eligible for independent review.
An unexpected safe path sets scope review and prevents verified acceptance; it
does not by itself become a security violation. A completed atomic replacement
is ordinary content. Safe `.example`, `.sample` and `.template` configuration
names are allowed; their suffix does not prove their contents safe to publish.

Protected changes still fail closed: root/Git identity or metadata, nested/bare
repositories and worktrees, reparse points, hardlinks, traversal, alternate-data
stream path syntax, secret/private names, and modification of pre-existing dirty
files. Git metadata is traversed within fixed inventory limits; dependencies
remain partially observed. Secret-shaped contents are never read for review.
Additional applications and declared listening-port drift remain disallowed.

Native shell is not an OS filesystem sandbox. Parent sibling identities are
checked, but transient effects, writes to existing sibling contents, undeclared
processes/ports, filesystem races and arbitrary outside-root access are not fully
observable. Existing accepted residual risk is preserved, not promoted to proof
of containment. Bounds refuse large/unsupported inventories rather than silently
claiming complete coverage.

## Durable evidence and terminal order

New private state is outside the application/repository, under the managed Writer
state. It binds the full task/workspace/application/execution/attempt tuple, Ready
revision, root and footprint identities, Writer/application lease and consumed
authorization record. New Writers record the actual process creation time plus
executable/path digests. The native Job records root/launcher creation identities
and aggregate zero-active, closed-Job descendant termination evidence.

Each private review is bounded, atomically replaced, flushed and read back, with
a local integrity key and HMAC. Private changes retain safe relative filenames,
Git statuses, categories, physical metadata and available byte digests. Protected
or suspicious labels are withheld. No source bytes, raw model/shell output,
prompts, absolute host paths or account information are saved in the review.
Relative owner-local filenames are not a universal PII classifier. Public
projection contains only categories/counts, keyed path identifiers, digests and
verdicts; it never includes filenames. Integrity protects accidental/cross-record
tampering within the managed control state, not a hostile process with the same
OS identity and access to that state's integrity key.

The enforced sequence is:

1. Genuine same-attempt Job completion, captured within its original freshness
   window. Serialized Job JSON cannot acquire execution or cleanup authority.
2. Durable post-run footprint and bounded change inventory (`captured` stage).
3. Independent trusted verification while the fixture exists. Unknown/unsafe test
   material is refused without running arbitrary generated tests. Its result is
   persisted as `verified`; a refusal retains the original fixture and evidence.
4. File-only installation validation, still before cleanup. Workspace stability
   is checked after verification and installation and immediately before cleanup.
   Later drift blocks cleanup and retains the previously signed evidence.
5. Durable terminal receipt. Exit zero is only a candidate; test failure, scope
   review, process failure, installation drift or missing evidence prevents
   verified acceptance. The API review guard refuses missing/negative v2 evidence.
   Structural API checks do not make a serialized receipt an authority token.
6. Only a genuine, attempt-bound cleanup capability can remove owned fixtures
   and temps. A safe acceptance-negative result may be cleaned after its evidence
   is durable; a boundary/verification refusal retains the fixture. Cleanup is
   recorded before application lease release, then Writer release.

The original Job token expires after 60 seconds. Capturing it permits a separate
cleanup-only capability to survive a long independent verification. That
capability cannot launch a process or complete a task. Public receipts always
require review and forbid release; `CANDIDATE` never means task DONE.

## Future owner-authorized reconciliation

The implementation accepts only a complete terminal signed identity chain and a
fresh, explicit owner-authority callback. The opaque grant is short-lived,
single-use and bound to review/key/directory physical identities and content.
Approval is not an evidence substitute. Before any mutation it proves original
Writer, root and launcher absence from their saved creation identities, rejects
PID reuse/live owners, and requires the original genuine-at-capture Job chain.

A dedicated exclusive recovery barrier blocks new Writer admission. Every phase
rechecks exact artifact identities/digests, parent state, spent record, review
and process absence. A signed journal records removal intent before deleting the
bound application lease, then the bound Writer. The spent authorization remains.
Interrupted removal retains the barrier; a new explicit approval can resume only
that signed pair. Normal cleanup's signed release intent also handles interrupted
lease/Writer release. Foreign replacements are never adopted or removed. A used
grant is idempotent. No force takeover, process killing or execution grant exists
in this path.

## Legacy B17 refusal and one owner action

The real read-only dry run returned `eligible=false`, `deletionAuthorized=false`.
The Writer/application lease nonce relationship matches, but seven evidence
requirements remain missing:

- Writer process creation/executable identity.
- Signed terminal review.
- Full task/workspace/application/attempt join to the spent record.
- Ready/root/manifest binding.
- Root and launcher creation/executable identity.
- Genuine-at-origin Job/descendant termination chain in the durable binding.
- Scoped owner cleanup approval.

The exact Writer, single application lease and all three B13/B14/B17 spent records
were checked unchanged. No historical chain was backfilled. B17's deleted fixture
cannot be reconstructed as evidence of the original repair or changed paths.

**One next owner action:** decide whether to authorize a separately specified,
legacy-only manual recovery exception for this retained B17 pair despite its
missing historical chain. Ordinary approval cannot pass the implemented strict
gate. No such exception, bypass, deletion or new provider run is implemented or
authorized by B19. Until that decision is separately scoped, retain the pair.

## Validation and stop

Synthetic tests exercise ordinary/scope/protected changes, secret templates and
hardlinks, real harmless Node Jobs, privacy, durable publication faults, late
workspace drift, copied capabilities, cleanup refusal, full-chain reconciliation,
restart barriers, foreign replacement, PID reuse, revoked/expired approvals and
legacy refusal. Native Job tests cover cancellation, timeout, crash, descendants,
breakaway denial and preparation failure. The installed Python compiler test is
excluded; no installed provider or interpreter is executed.

API review/provider tests and application lint/typecheck/build pass. Documentation
links, budgets, preserved contract registries, changed-text privacy and Git diff
are checked before the local commit. Database/integration/production tests,
Docker/WSL lifecycle work, push and deployment are outside B19. Historical B17/B18
reports remain dated evidence. One local commit and coordinator report close this
atom; no automatic successor execution follows.

Final checks: 79 native/review/Writer tests passed, 42 workspace/input tests passed,
and 8 API review/provider tests passed. After tightening approval expiry at each
recovery phase, all 6 affected recovery cases passed, including expiry after a
durable removal intent. The 740 local links in changed documents resolve; default
context remains below 150,000 bytes. Qualification keeps 75 settings/53 unresolved
nulls and the 30 CAS requirements/tests. The exact real legacy dry run again
refused deletion, with all five retained artifacts unchanged. No Python-based
validator or installed-interpreter compiler test ran in B19.
