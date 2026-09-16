# Original fixture ownership before process resume

RF-RUNTIME-005B28, 2026-09-17. ADR-004 contract amendment v14.
Scope: authorized source implementation and synthetic Windows qualification only.
All six readiness/execution flags remain false. Historical execution authority
v13 stays spent; native-risk v7, registry/profile v5 and startup v2 are unchanged.
No provider activation, credential, installation or production change follows.

## Lifecycle and authority

1. Acquire the existing Writer. Exclusively reserve the native-review directory
   and its existing integrity key before creating a new fixture. Persist
   fixture-created.json with exclusive creation, fsync and readback. Bind the
   full execution/workspace/task/application/attempt tuple, owner authority,
   expiry, canonical path digest, root/parent/repository physical identities,
   owner marker and Writer. Partial publication stays fenced; an existing
   directory cannot be adopted or reconstructed.
2. Construct Ready and application lease through the existing boundary. Persist
   fixture-ready.json, binding review, origin, Ready/root manifest, scope marker,
   startup and budget receipts, accepted deadline, approved installation controls
   and complete physical inventory, Node, provider and launcher identities.
   Installation observation alone is not approval: the managed boundary first
   validates the existing opaque installation proof.
3. The native launcher creates an unnamed kill-on-close Job and assigns the
   target atomically inside CreateProcess with CREATE_SUSPENDED. It emits actual
   Job/root/launcher identities and a fresh challenge while the target remains
   suspended. Planned identifiers cannot substitute for this event.
4. Recheck authority and bindings. Exclusively persist resume-authorized.json
   and its signed review reference, then read back both. Only afterward send
   the one-use acknowledgment over the existing stdin. It binds version,
   attempt, actual Job, challenge and receipt digest.
5. ResumeThread requires strict matching acknowledgment within the existing
   3000 ms startup deadline. Stop and resume share a lock; the independent
   3500 ms watchdog remains. Missing, malformed, wrong, replayed, negative or
   late acknowledgment, EOF and controller death close the Job.

The gated protocol is roost-windows-job-v2. Native coding boundaries always
request it. Generic low-level v1 qualification helpers remain supported and
are not a fallback for native coding. A managed fixture marker without original
durable proof is refused. Ordinary application repositories retain their normal
Ready boundary and do not become owned/deletable fixture roots.

No new channel or secret store is introduced: the existing review key moves
earlier and the existing private control pipe carries acknowledgment. Immutable,
domain-separated HMAC records bind physical self/key/parent identities. Checks
reject copied receipts, replacement objects, root/marker drift, reparse points,
changed runtime, stale execution deadlines and mismatched task/authority.
Same-owner filesystem access remains a trust assumption; this is not hostile-host
isolation.

## Terminal review and ordinary reconciliation

Terminal review captures a genuine observed Job receipt and the complete bounded
fixture inventory. A stopped, assigned but never resumed v2 Job can produce
cleanup evidence. It cannot satisfy isWindowsJobReceipt, launch qualification,
task success or any execution-readiness flag.

Existing native reconciliation accepts explicit fixture/runtime locations only
as lookup inputs. Authority comes from the original signed chain, signed terminal
inventory, fresh owner cleanup approval and proven original controller, root and
launcher absence. PID reuse or uncertain identity refuses cleanup. There is no
parallel recovery engine, legacy exception, backfill or execution restore.
A prepared origin without sufficient terminal Job evidence remains blocked,
even when no code is believed to have run.

Cleanup verifies the original chain, remaining inventory and runtime before each
effect. It removes fixture entries using per-object durable intent, then lease
and Writer, under the existing recovery barrier. A crash after an effect may
tolerate absence only of that exact pending object. An exclusive signed
reconciliation controller prevents concurrent cleanup; only a proven dead
controller can be reclaimed. A fresh managed-fixture cleanup grant lasts at most
10 minutes with wall/monotonic checks; legacy grants retain their 60-second bound.
Historical execution expiry does not grant a new run or prevent separately
approved cleanup. Origin, Ready, resume, review and spent evidence remain.

## Implementation and traceability

| Contract | Source / evidence |
| --- | --- |
| Original creation | [ownership](../../scripts/lib/agent-host-fixture-ownership.mjs), [fixture](../../scripts/fixtures/hermes-coding-smoke.mjs), [controller](../../scripts/lib/agent-host-hermes-coding-smoke.mjs) |
| Ready and actual Job binding | [boundary](../../scripts/lib/agent-host-hermes-native-boundary.mjs), [review](../../scripts/lib/agent-host-native-review.mjs), [quiet adapter](../../scripts/lib/agent-host-hermes-quiet.mjs) |
| Native suspended gate | [launcher](../../scripts/roost-windows-job.cs), [receiver](../../scripts/lib/agent-host-windows-job.mjs) |
| Cleanup-only restart | [ordinary reconciliation](../../scripts/lib/agent-host-native-reconciliation.mjs) |
| Qualification | [ownership tests](../../scripts/agent-host-fixture-ownership.test.mjs), [synthetic child](../../scripts/fixtures/fixture-ownership-child.mjs), [coding smoke regression](../../scripts/agent-host-hermes-coding-smoke.test.mjs) |

## Verification

Tests use owned synthetic resources and actual harmless Node processes inside
native Windows Jobs. Cases cover publication failure, tampering and physical
replacement, wrong task/root/marker/runtime, duplicate/copied evidence, expiry,
missing/malformed/replayed acknowledgment, controller/launcher crash, code absence
before acknowledgment, genuine stopped-unresumed cleanup, restart after durable
deletion intent and effect, concurrent controller refusal, and fixture → lease →
Writer cleanup with preserved evidence.

Verification completed: the 21-file Windows regression exercised 398 tests
in 780 seconds: 396 passed and two legacy cancellation checks failed because
their timer started before preparation rather than Job assignment. Only the
synthetic helper/test synchronization was changed; the full launch-admission
file then passed 11/11, including both affected checks. The other 387 tests
were unchanged and were not rerun. All 20 new ownership/gate/recovery tests
passed in the full run. No test was skipped or cancelled.

npm run validate passed (lint: 333 routes/45 files, typecheck, server/web build).
Existing Vite warnings remain for two runtime-resolved resources and a large
bundle. Syntax checks, 793 local documentation links, added-content privacy,
documentation budgets and git diff --check passed. Default context is below
150000 bytes; all three planning documents remain within their budgets.

No installed Python, real provider/model, API/DB integration, production,
Docker/WSL or Linux/macOS qualification is included. The complete installation
recheck under the 3-second gate has not been measured with the frozen real
provider installation; excess latency fails closed.

See the [readiness table](agent-delivery-readiness.md) for the single proposed
next step. Closed B21–B26 observations remain unchanged.
