# B26 one-use adopted B21 recovery

RF-RUNTIME-005B26 implements the owner's separately authorized recovery of the
exact synthetic fixture adopted by [B25](hermes-b25-legacy-adoption-v1.md), followed
by its exact application lease and Writer. It preserves B21's historical
REFUSED / acceptance_failed / spent and B24's separate independent PASS. Recovery
does not accept the eight unexplained additions or attribute their creation.

## Authority and preflight

The scope is `b26_exact_adopted_b21_fixture_lease_writer_only`, under
`roost-b21-adopted-recovery-v1`. Inputs pin the B21/B24/B25 digests, B25 frozen
evidence and the governing B26 owner-decision digest. Fresh B25 qualification
must pass before initial consumption. There is no renewal/adoption path in B26.
B25 expiry remains an absolute deadline; an individual opaque invocation also
has a one-hour wall/monotonic limit. Copies or a second invocation of a failed
grant cannot perform effects. Resume requires a newly checked opaque grant under
the same exact B26 decision and still-valid original adoption.

The full preflight checks signed review, supplement and adoption identities;
task/workspace/application/execution/attempt/Ready/Job bindings; marker/root/parent
and complete fixture inventory; control artifacts; original process absence; and
file-only installation/runtime verification. Every current runtime file's physical
identity remains bound to B25, including byte-identical replacements after restart.
No installed interpreter, model, auth/private profile or API is run or altered.

## Exclusive consumption, barrier and order

One deterministic new private directory, selected by adoption digest, reserves
consumption exclusively. A HMAC chain of exclusive, flushed, read-back event files
binds each event's physical identity, parent state/directory, predecessor, frozen
deletion plan and adoption. Every event also identifies its signed controller
receipt. Digests and counts replace paths, source/output and raw task identifiers.
The existing B24 integrity key is read-only and domain-separated for B26; no key
or credential is copied into records. This retains the same-owner trust boundary,
not protection from an actor controlling both local code and integrity keys.

A separate exclusive controller lease blocks concurrent resume. It records its
genuine process creation/executable identity and its own physical file identity;
an immutable signed copy survives lease release. A crashed controller can be
replaced only after exact signed-lease validation and confirmed original process
absence. PID reuse, a live process, copied/foreign lock or unavailable observation
blocks takeover. Only this transient B26 controller lease can be released on an
error; the recovery barrier and original resources remain at the last checkpoint.

After durable consumption, the existing recovery barrier is acquired exclusively.
The normal host checks this barrier before Writer acquisition, recovery/claims
and existing-Writer use. A new Writer cannot start while recovery is partial.
The barrier's exact identity/digest is recorded before any original deletion.

The immutable schedule is:

1. `consumed`, then `barrier_ready`.
2. Per-object `remove_intent` and `removed`, in child-before-parent order, ending
   with the exact fixture root, followed by durable `fixture_removed`.
3. Exact application lease removal intent and confirmed absence.
4. Exact Writer removal intent and confirmed absence.
5. Exact barrier removal intent and confirmed absence, then `complete`.

No later resource is released without the earlier durable result. Every deletion
is preceded by fresh authority/expiry, original evidence, installation/runtime,
process, managed-state and remaining-inventory checks. The immediate target is
then checked again. File deletion uses one exact unlink; directory deletion is
nonrecursive and requires an empty exact directory. No shell wildcard or recursive
delete, path adoption, process kill, provider launch or general force takeover is
available. The plan is limited to 512 objects, depth 24, 12 MiB per file and 32 MiB
total, and must reproduce B25's complete frozen fixture inventory before use.
Traversal, reparse/symlink/hardlink, unexpected file/object, identity or byte drift
fails closed. The signed evidence, installation and spent records are outside
the deletion plan.

## Interruption and postflight

Resume reconstructs only the remaining suffix of the same plan. An absent target
is accepted only after its exact durable intent; it can then receive an absence
confirmation without another unlink. Missing earlier evidence, a reappearing
deleted object or a foreign replacement blocks resume. A completed chain is a
read-only idempotent result, never another consumption.

An incomplete/unreadable event or an unbound barrier created before its identity
receipt is durable cannot be guessed into validity: recovery stops BLOCKED and
retains the checkpoint and barrier for a separate evidence-resolution decision.
No automatic overwrite, journal repair, expiry extension or broader cleanup occurs.
TTL expiry during partial recovery similarly leaves remaining resources fenced.

Independent postflight starts with fresh file-only installation verification and
checks the entire signed chain, preserved evidence/spent/adoption, original process
absence, fixture/lease/Writer/barrier absence and no active controller lease. A
metadata snapshot covers all other managed-state entries without reading unrelated
contents. Together with exact-path deletion bounds this audits the authorized
effect set; it is not a host-wide claim about concurrent activity outside managed
state. Once complete, historical audit can be read after expiry, but all recovery
events themselves must have occurred within the adoption deadline.

## Readiness and next atom

All six public/operational flags remain false. B26 is not task acceptance,
production autonomy, a new provider trial or release authority. Ordinary B19
reconciliation is unchanged. Execution ADR v13, native-risk v7, registry/profile
v5 and startup v2 remain unchanged; B26 has its own narrowly scoped recovery
authority and journal.

The next proposed atom is **B27: durable original fixture-ownership evidence at
creation, with source/synthetic qualification**. Future attempts should preserve
the ownership chain across controller restart from the start, avoiding another
legacy-adoption exception. B27 must not launch a model or activate agents; a later
real trial still needs its own exact authorization and readiness contract.

## Verification and result

All 156 distinct Windows tests pass: six B26 scenarios and 150 regression tests
covering B19, B21, B22, B23, B24, B25 and Writer locking. B26 covers thirteen
durable/effect interruption checkpoints, actual controller-process exit and
dead-controller resume, concurrent-controller refusal, one-use grants and
completed replay, expiry/withdrawal/cross-attempt refusal, original process
observation, partial-inventory drift, physical artifact replacement, journal
tampering and incomplete barrier publication. Synthetic tests use separate owned
fixtures and do not launch a provider. An unbound barrier is an expected BLOCKED
result, with original fixture and control artifacts retained.

Application lint, typecheck and server/web builds pass with `npm run validate`.
Existing Vite warnings remain for two runtime-resolved static assets and a large
chunk; build timing notices under parallel synthetic-test load are informational.
All 771 local links in the twelve changed documentation files resolve. Default
context is 88,130 bytes; three active planning files meet the documented budgets.
The changed-content privacy scan, module syntax checks and `git diff --check`
pass.

No real provider/model trial, installed Python compiler, database/integration/API
lifecycle, Docker/WSL, production or Linux/macOS-native test was run. No push or
deployment is authorized. B26 stops after its scoped local commit and coordinator
report; B27 remains a proposed source/synthetic successor.

## Live result, 2026-09-17

The one authorized recovery completed **DONE**, followed by a fresh independent
read-only postflight **DONE**. The exact frozen fixture contained 60 objects:
35 files and 25 directories including its root, with 1,045,232 file bytes. All
were removed individually in the signed order. The exact application lease,
Writer and recovery barrier were then removed in that order. The controller
lease is absent; immutable controller and event receipts remain.
The journal contains 130 events and one controller receipt. Its terminal
`complete` event is dated 2026-09-16 23:08:28.616 UTC
(2026-09-17 01:08:28.616 Europe/Berlin), within the original adoption deadline.

The final recovery digest is
`65f6cd83348ad1552f3eb31261e7ba863beade93695930ffb5d737dc4d5d9540`.
It consumes only B25 adoption
`58abd3801403968f918111b2780c77d81b428eb201f6b0bd3b368969db0db567`,
with frozen evidence
`e49e6dbfb447406d121065c99f31de45f4fab38e6714b9b1ea7be15bbf25b75a`.
The governing B26 owner-decision digest is
`f74608c59a148ca0a60c02adfcd80369ca8355aebcbef5d2223ce3b1c9c7a47b`.
The original adoption deadline was not renewed or changed.

Postflight confirms fixture, lease, Writer and barrier absence; the complete
retained signed evidence and spent record; original process absence; and unchanged
metadata/physical identities of all other managed-state entries. The installation
passed fresh file-only verification across 23,653 immutable and 826 generated
files (24,479 total). This is the bounded evidence described above, not a claim
about all activity on the host.

B21 remains REFUSED / acceptance_failed / spent, and B24's independent test PASS
remains separate. No provider/model was launched and no auth/private profile,
installation, API or production configuration was changed. All six flags remain
false. Usage readback is 69%, ordinary usage allowed; no reset was used.
`design-qa.md` was neither read, changed nor staged.
