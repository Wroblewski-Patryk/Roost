# B24 preserved-attempt recovery evidence

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


RF-RUNTIME-005B24 implements canonical identity bridging and a separate,
append-only later-verification record. It does not grant cleanup or execution.
The original B21 review, rejected acceptance and spent authorization remain
historical truth. B19's ordinary recovery still refuses an original REFUSED
verification, even when a later diagnostic test passes.

## Versioned identity bridge

`roost-recovery-identity-v2` serializes an ordered array of five named values:
execution, workspace, task, application and attempt. UUIDs normalize to lowercase;
attempt is a positive safe integer. Exact fields, plain objects and data properties
are required. Unknown/missing fields, accessors, symbols and duplicate JSON keys
(including escaped duplicates) fail closed.

Two explicit legacy formats remain verifiable: sorted provider-input keys
(`roost-provider-input-identity-v1`) and the original review projection order
(`roost-native-review-identity-v1`). The bridge reconstructs the historical bytes,
including UUID case, before comparing the spent digest. B21 requires the former.
It records both versions/digests, five field-equality bindings and the canonical
digest. Neither the original spent record nor its hash is rewritten. A different
attempt or any changed tuple field cannot join the chain.

## Append-only supplement v1

`roost-recovery-supplement-v1` has exactly three successive stages:
`prepared` -> `verification_captured` -> `finalized`. A new private directory,
selected deterministically from the original review digest, is reserved exclusively
under the existing state directory. A separate integrity key and exclusive event
files prevent an ordinary restart or duplicate invocation from overwriting evidence.
Every event is fsynced, HMAC checked and read back. It binds the previous event's
digest, current event/key/directory/state physical identities and unchanged inputs.
This is integrity evidence within the existing same-owner trust boundary, not
protection from an actor able to replace both local code and keys.

Bindings cover the signed original review/key, full tuple, Ready/root/pre/post
footprints, genuine-at-origin Job evidence, Writer/lease/spent and installation.
Only digests, bounded counts, policy versions, statuses and timestamps enter the
new journal. Paths, tuple UUIDs, code, diffs and raw process output are omitted.
The original private review can retain its existing richer evidence unchanged.

Preparation expires after five minutes (wall and monotonic clocks). Appending
after expiry, stage reordering, replay, unknown fields, missing events, changed
identities or observation drift fail closed and retain the partial journal.
Finalized evidence remains historical after that window; eligibility always
performs fresh filesystem and process observations. An interrupted chain is not
automatically resumed, deleted or overwritten, and cannot authorize another test.

## B21-specific independent verification

The controller requires the preserved B21 scope, one spent attempt, the signed
REFUSED/smoke_unexpected_diff result, no protected changes, exactly one expected
arithmetic edit and eight unexplained additions (five directories, three files).
It checks exact baseline/test/current implementation bytes before running only
system Node with `--test add.test.cjs` once. No provider interpreter is executed.
Its child environment uses B23's verified Windows plumbing and excludes Node
options and provider inputs. A later PASS is recorded separately; the eight extra
entries remain unacceptable and their attribution remains unknown.

Fresh read-only checks cover the full fixture including Git metadata, original
report and control artifacts, scope/owner markers, launcher bytes and repository
footprint. File-only installation checks verify every immutable/generated file
against the existing manifest and generated receipt before and after the test.
No profile, OAuth or credential inspection is involved. Exact original owner,
root and launcher process identities must be absent; PID reuse or an unavailable
observation blocks qualification. Original Job zero-active/closed/assigned-before-
resume evidence remains required. A recovery barrier also blocks qualification.

## Eligibility and the remaining gap

The read-only qualifier reports `eligible`, exact `missingEvidence`, and always
false deletion/execution authority. Even complete diagnostic eligibility is not
a grant: the existing B19 API continues rejecting REFUSED, and opaque cleanup
capabilities cannot be reconstructed from serialized evidence or this report.

The B21 original review binds the repository identity but contains no durable
ownership receipt for the parent fixture and markers. Its original ownership
secret/proof lived only in the previous controller's process-local state.
Observing the same marker now does not establish that missing historical proof.
The supplement must not backfill it. The exact missing requirement is
`native_recovery_original_fixture_ownership_missing`.

A synthetic positive case uses a deliberately complete original signed
`roost-native-fixture-ownership-v1` binding for repository, fixture root/parent,
owner marker identity/digest and scope marker identity/digest. This tests the
diagnostic predicate only; no production ownership writer or adoption mechanism
is introduced by B24. The preserved B21 record cannot satisfy that case.

Therefore recovery remains **BLOCKED**, with no automatic next action. The one
proposed owner decision is a separately scoped, exact-identity recovery/adoption
contract that explicitly addresses unavailable historical fixture ownership.
That future decision must define its own evidence and authority; it is not
approval to delete, release locks, retry a smoke or activate a provider now.

ADR-004 execution authority stays v13, native-risk v7, profile/registry v5 and
startup policy/receipt v2. All six public flags remain false. B20's spent legacy
exception cannot be reused.

## Validation

Synthetic tests cover all identity permutations, legacy joins, cross-attempt and
invalid inputs; append-only HMAC stages, physical replacement, tampering, replay,
expiry and drift; private-data exclusion; independent test capture and unchanged
original REFUSED; missing versus complete synthetic ownership; and no cleanup
authority. B19, B21, B22 and B23 regressions are required alongside application
lint/typecheck/build and documentation/privacy checks.

Final validation: **122/122 tests PASS, zero failures/skips**, including 38 B24
cases and the B19/B21/B22/B23 suites. Application lint, typecheck and server/web
builds pass. Existing Vite warnings remain for two runtime-resolved assets and a
large chunk. All 755 local links in the twelve changed documentation files
resolve. A broader 1,417-link check found two pre-existing missing image targets
in the unrelated company-city UX specification; those files were left untouched.
Default context is 85,058 bytes; three active planning files meet their budgets.
Added-content privacy and whitespace checks pass. Native checks ran on Windows;
no separate Linux/macOS execution was performed.

## Preserved B21 result, 2026-09-17

Exactly one actual B24 independent `node --test add.test.cjs` ran: exit 0,
one test passed, zero failed. Exact arithmetic repair, unchanged original test
and single baseline commit were verified. The private supplement reached all
three stages and was read back with its HMAC and physical identity chain intact.
Its final digest is
`607fa394b9ea427e1e79f1b1a55887350252248740e597f949def104a2eea75f`.
The original signed review digest remains
`6499e65e3a959d2d58f66941a92ef01f1d6645f2769ebc9bdb7b767bdd9f9961`.

Original review/key identity, report, Writer, exact application lease, spent
record, fixture root/markers, launcher and full repository footprint matched
before/after. Full file-only installation verification passed for 23,653 immutable
and 826 generated files (24,479 total); manifest/generated receipt and installation
attestation were unchanged. Original owner/root/launcher processes are absent.
The recovery barrier is absent; no cleanup or recovery grant was issued.

The exact read-only outcome is `eligible=false`, `evidenceComplete=false`, with
the sole missing requirement `native_recovery_original_fixture_ownership_missing`.
Original acceptance_failed / REFUSED / spent remain unchanged. Later independent
PASS does not accept the eight extra entries or establish their creator. B24's
implementation and later verification are complete, but the requested recovery
evidence chain remains **BLOCKED**. No provider, model, auth/profile mutation,
remote write, push or deployment occurred. Stop after the local commit/report.
