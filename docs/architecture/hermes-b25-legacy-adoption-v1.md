# B25 exact B21 legacy fixture adoption

Later B26 update: [exact adopted recovery](hermes-b26-adopted-recovery-v1.md)
records the separately authorized consumption/cleanup and terminal resource state.
Original review, supplement, adoption and spent are preserved; recovery does not
rewrite historical acceptance or grant another execution. Earlier ownership,
retention and successor statements below describe their original observation.


RF-RUNTIME-005B25 is **DONE**. It implements the owner's explicitly approved adoption of the
exact preserved synthetic B21 fixture. The sole exception is the historical
absence of its original opaque parent-fixture ownership receipt. Adoption records
new owner acceptance of that gap; it does not reconstruct or backdate the proof.
Original B21 REFUSED / acceptance_failed / spent and B24's separate later PASS
remain unchanged. The eight unexplained additions remain unacceptable task output.

## Authority and frozen identity

`roost-b21-owner-legacy-adoption-v1` has only the scope
`b25_exact_b21_fixture_legacy_adoption_only`. Its record class is explicitly
`owner_approved_legacy_adoption`, with the reason
`original_opaque_fixture_ownership_receipt_historically_unavailable` and
`originalOwnershipBackfilled=false`.

The caller must pin the previously reviewed B21 review and finalized B24 supplement
digests. Paths alone cannot select an adoption target. The existing B24 read-only
verifier must find exactly one gap: original fixture ownership. Any other missing
evidence, active/reused/unobservable original process, recovery barrier, protected
change, installation drift or incomplete supplement rejects adoption.

The frozen evidence covers:

- Canonical paths for state, fixture, repository, owner/scope markers, original
  report/review, installation manifest/attestation and B24 supplement, represented
  by digests. Aliased/noncanonical paths are rejected.
- Physical root/parent/repository/marker identities, marker bytes and full bounded
  fixture inventory, including Git metadata, launcher and all extra entries.
  The Windows identity combines canonical path, device and file ID. A foreign
  replacement at the same path is not the adopted object.
- Exact task/workspace/application/execution/attempt identity, Ready and original
  pre/post footprints; signed review/key; genuine-at-origin Job and original
  owner/root/launcher identity chain; exact Writer, lease and spent records.
- All B24 event hashes and physical file identities, directory/key identity and
  separate later-verification result.
- Approved installation manifest/generated receipt/attestation and physical
  roots; every immutable/generated file; pinned provider source/version/commit,
  provider executable hash and the unchanged B24 system-Node verifier hash.
  B25 additionally freezes every current installation file's device/file ID and
  stable metadata, plus the verifier executable's physical identity, so a
  byte-identical runtime replacement cannot qualify after a controller restart.
  These are new B25 observations, not retroactive claims about historical B24
  leaf-file identities that were not stored in its durable snapshot.

Installation inspection is file-only. No provider, interpreter, model, OAuth,
private profile or production configuration is executed or changed. Read-only Git
and exact-PID observations support evidence validation; B25 does not rerun the
preserved fixture's test or launch another smoke.

## One-shot publication

An opaque observation permits a separate owner-approval callback with the exact
frozen evidence digest, B21/B24 digests, explicit acceptance of missing original
ownership and a digest of the governing owner decision. Serialized copies cannot
approve or publish. Approval expires after five minutes on wall and monotonic
clocks; authority and all original evidence are rechecked before each append and
after publication. A failed invocation consumes its in-memory publication grant.

One deterministic private directory under the existing state root is reserved
exclusively by the original B21 review digest. It contains only
`01-prepared.json` then `02-adopted.json`; each is an exclusive, flushed, read-back
HMAC record bound to its physical identity, directory/state identity and previous
digest. Signing uses the existing B24 integrity key read-only with a distinct
domain prefix and signing context. No key or other secret is copied into the new
records; B21/B24 files are never rewritten.

The new records contain only policy labels, timestamps, statuses, bounded counts
and digests, not host paths, raw tuple IDs, source, output or credentials. This
uses the existing same-owner local integrity boundary; it is not isolation from
an actor controlling local code and integrity keys.

Restart, duplicate issuance, a foreign directory/file, reordered/missing stages,
tampering or extra replay files fail closed. A partial journal is retained and
blocks automatic resume/reissue. A completed adoption cannot be transferred to
another path, object, attempt, installation or evidence set. Reading its
qualification again is an observation, not reuse of authority.

The adopted record expires **24 hours after preparation**. There is no automatic
renewal, extension, replacement or reactivation. Expiry preserves all records
and blocks qualification; a later owner decision must explicitly address that
state rather than modifying this record.

## B26 boundary

B25's strongest result is `eligibleForB26Preparation=true` with
`b26OwnerApprovalRequired=true`. Cleanup, execution, configuration and API authority
are always false. The ordinary B19 gate still rejects the original REFUSED review;
B25 does not widen that gate or expose a cleanup capability, endpoint or command.
All six public/operational agent flags stay false; production autonomy is not ready.
ADR execution v13, native-risk v7, registry/profile v5 and startup v2 are unchanged.

**The exact next owner decision:** separately authorize B26 for one bounded recovery
of this adopted fixture and its exact application lease/Writer pair, preserving
all original evidence and spent records. B26 must first define and verify its
exclusive, append-only one-use consumption/intent journal, fresh identity/process/
installation checks, recovery barrier, bounded deletion and release ordering.
No B26 consumer or destructive implementation is included in B25. Adoption alone
cannot be consumed as a cleanup grant; any future consumer must durably reserve
the exact adoption before its first effect and reject already consumed evidence.
Any expiry, drift or unavailable proof blocks that later atom too. No new provider
attempt, task acceptance or release authority follows from recovery.

## Verification and live result

Synthetic tests cover successful qualification without cleanup, exact approval,
cross-attempt/serialized grants, restart/replay, withdrawal, expiry, active/reused/
unobservable processes, path and physical replacements, Writer/lease/spent/review/
supplement/installation drift, interrupted publication and journal tampering.
All destructive setup/teardown in these tests is restricted to freshly owned
synthetic fixtures; no real B21 cleanup is invoked.

Validation passed **145 distinct tests**: 23 B25 cases and 122 B19/B21/B22/B23/B24
regressions, with zero failures/skips. After the final runtime-file-identity and
clock guard tightening, the two affected complete-adoption/expiry cases passed
again, including byte-identical runtime replacement after restart. The initial
smallest happy-path check also passed before the larger suites.

Application lint, typecheck and server/web builds pass. Existing Vite warnings
remain for two runtime-resolved static assets and a large chunk. All 759 local
links in eleven changed documentation files resolve; default context is 86,568
bytes and the three active planning files meet their budgets. Changed-content
privacy and whitespace checks pass. Usage readback is 65%, ordinary usage allowed;
no reset was used.

No real provider/model, preserved-fixture test, installed Python compiler,
database/integration/API lifecycle, Docker/WSL, production or Linux/macOS-native
test was run. There is no API/configuration change. Synthetic Windows tests use
their own disposable fixtures; the preserved B21 state is read-only except for
creation of the separately authorized B25 journal beside the existing evidence.

B25 stops after one local commit and the coordinator report.

## Live result, 2026-09-17

The exact preserved fixture was adopted once. The two-stage private journal was
HMAC/identity/readback verified, and an independent fresh read-only qualification
returned `eligibleForB26Preparation=true`, `missingEvidence=[]` and
`b26OwnerApprovalRequired=true`. Cleanup, execution, configuration and API authority
all remain false. Its frozen evidence digest is
`e49e6dbfb447406d121065c99f31de45f4fab38e6714b9b1ea7be15bbf25b75a`;
the final adoption digest is
`58abd3801403968f918111b2780c77d81b428eb201f6b0bd3b368969db0db567`.
Expiry is **2026-09-17 22:34:04.343 UTC** (2026-09-18 00:34:04.343 Europe/Berlin).
This qualification is an observation at completion; B26 must obtain fresh proof
and its own owner approval before that deadline, with no automatic renewal.

The original B21 review digest remains
`6499e65e3a959d2d58f66941a92ef01f1d6645f2769ebc9bdb7b767bdd9f9961`.
The B24 supplement digest remains
`607fa394b9ea427e1e79f1b1a55887350252248740e597f949def104a2eea75f`.
Original review/key, B24 events/key, report, root/markers, full fixture/footprint,
Writer, application lease and spent record passed unchanged binding checks.
The complete approved installation passed file-only verification: 23,653 immutable
and 826 generated files (24,479 total), with every current file identity additionally
frozen by B25. The original owner/root/launcher processes were absent. No recovery
barrier or cleanup grant was created; no preserved artifact was deleted or changed.

No Hermes/Codex/model or real provider trial ran. Auth, private profile,
installation, API and production configuration were untouched; no push/deploy
occurred. `design-qa.md` was neither read, changed nor staged. Production autonomy
remains unavailable. The sole next action is the separate B26 owner decision
specified above; B25 does not begin B26 automatically.
