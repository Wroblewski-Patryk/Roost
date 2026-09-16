# Hermes B20 exact legacy recovery exception

The separately authorized [B21 attempt](hermes-b21-coding-smoke-v1.md) is now
spent and acceptance-blocked, with its own new retained fixture/Writer/lease.
B20 recovery remains complete and its exception permanently disabled; these are
new B21 artifacts, not a return of the removed B17 pair.

RF-RUNTIME-005B20, 2026-09-16. The owner authorized one narrowly bound recovery
exception for the retained legacy B17 application lease and global Writer lock.
This is ADR-004 v12, not another provider attempt. No B13/B14/B17 authorization
may be replayed. The strict [B19 reconciliation contract](hermes-root-scoped-review-reconciliation-v2.md)
remains mandatory for every new/future attempt.

## Scope and accepted historical gap

The exception accepts only B17's missing historical Writer creation/executable
identity, signed terminal review, full attempt tuple join, Ready/root/manifest
binding, root/launcher creation identity and original durable Job binding. The
fresh owner decision resolves the former missing approval, not the six remaining
evidence gaps. These facts are explicitly unavailable; no chain is backfilled.
Historical B17 Job cleanup and zero-active evidence remain historical signals,
not newly minted process ownership proof. B17's code/test result stays BLOCKED.

The implementation pins an opaque digest of the exact private B17 pair, all three
spent records, their physical identities/content digests, state directory identity,
historical root/Job digests and owner decision reference. Private names/identifiers
and installation paths do not enter distributed documentation. No API, CLI,
configuration switch or serialized approval creates the opaque grant. The
synthetic entrypoint requires a genuine newly allocated owned temp proof and
cannot adopt a host directory.

## Transaction and refusal semantics

An exclusive existing recovery barrier blocks Writer admission before live pair
checks. Preparation verifies the exact pair, Writer/lease nonce and application
join, unchanged B13/B14/B17 spent records and absence of additional Writer/lease
artifacts. Fresh process inspection is bounded to the old owner/children and
known runtime/Job executable candidates. It reads no command lines, environment,
credentials or authentication state, and kills no process. Zero matching current
processes is a bounded observation, not retrospective proof about PID reuse or
unobservable escaped historical descendants.

The nonserializable grant has a 60-second wall/monotonic lifetime, rechecked after
process observations and before mutation. It is burned in memory before execution
checks and durably consumed before the first deletion. The private append-only
journal is flushed/read back and chained by digest/physical identity. It records
the accepted missing evidence, binding, intended order, timestamps, fresh process
counts and each removal intent/readback. The journal and consumed exception stay
outside the repository. They contain no raw prompt, model output or credentials.

Only exact single-file deletion is implemented: lease first, readback absent,
then Writer, readback absent. Every step rechecks barrier, parent, artifacts, spent
records, journal, owner authority and process observations. Mismatch, expiry,
foreign replacement, additional lease, process appearance or journal failure
stops the transaction without another deletion. No force takeover, adoption,
directory deletion or recreation of a missing legacy lease is allowed.

A partial transaction retains the Writer/barrier and durable last stage. Its
consumed grant cannot be resumed, copied or reconstructed after restart. The
journal allows a separately approved recovery to identify the remaining exact
artifact; this implementation grants no automatic retry or resume authority.
Barrier release occurs only after complete pair-absence/spent-preservation
readback. The production exception is then permanently disabled in source;
its private consumed marker and journal remain as terminal evidence.

## Outcome and validation

**DONE:** the exact application lease was deleted first and the exact Writer
second. Each absence was read back. All three B13/B14/B17 spent records retained
their original physical identities and byte digests. Seven fresh bounded process
checks passed: owner absent in Node and Windows CIM, no immediate owner children,
no executable under the known managed runtime root and no matching Job launcher.
No process was killed. Historical creation/executable/Job ownership remains
unavailable and is accepted only for this particular owner-authorized exception.

The private journal records `barrier`, `prepared`, `grant_consumed`,
`lease_remove_intent`, `lease_removed`, `writer_remove_intent`, `writer_removed`,
then `complete`. The exception is durably spent, replay was refused, the barrier
was released after complete readback and the production entrypoint is permanently
disabled in source. A final private readback confirms the exact pair absent,
all three spent records unchanged and only the expected new recovery journal in
managed state. A private binding/readback is retained as evidence, not authority.

The implementation has no provider/model/installation/auth operation.
Focused synthetic checks include wrong digest/identity/order, replay, expiry,
additional artifacts, process appearance, journal failure and partial recovery
requiring new approval. Writer admission and normal B19 recovery regressions
remain separate from the exceptional production scope.

Validation passed: 17 focused B20 cases plus 5 Writer tests (rerun after disabling
the production entrypoint), 8 strict B19 reconciliation regressions, and application
lint/typecheck/build. Synthetic roots were removed by their original owned-temp
proofs and all test child processes finished. No installed interpreter/provider,
database, Docker/WSL, credential or production test was run. Existing bundler
warnings about assets/chunk size are unrelated to this private recovery change.

All six public flags remain false. Profile and registry remain v5; native-risk
reference remains v7. No new smoke, public dispatch, push or deployment follows
from this exception.

One proposed next atom is **RF-RUNTIME-005B21**, a separately owner-authorized
single new coding smoke using B19's durable review order and a fresh one-use
authorization. It must not reuse B13/B14/B17. This is a proposal only: no new
activation is created and B20 stops after its local commit and coordinator report.
