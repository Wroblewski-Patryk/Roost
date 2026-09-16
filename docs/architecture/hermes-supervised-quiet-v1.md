# Hermes supervised quiet adapter v1

RF-RUNTIME-005B17 [one-shot coding smoke](hermes-b17-coding-smoke-v1.md) is **BLOCKED** after
one authorized provider start under ADR-004 v10. Root exit 0 was rejected by
native review (unexpected_changed_path); exact repair and independent test PASS
were not established. Genuine Job cleanup and owned fixture removal passed.
Separate post-result full installation readback passed without receipt changes.
Writer and one application lease remain held for reconciliation; all B13/B14/B17
authorizations are spent. All six public flags remain false. Exactly one proposed
successor is B18 source-only footprint diagnosis and reconciliation-plan
qualification, with no runtime/private mutation or new execution. Earlier
B16/no-launch/version-9 and successor statements below are historical.

RF-RUNTIME-005B16 [controlled rebuild and split attestation](hermes-controlled-rebuild-v1.md)
is **DONE**. The unchanged exact source pin now has a verified canonical venv
with 83 original distributions, no optional AWS closure, 23,653 immutable files
and 826 separately verified generated files. Profile v5 and the sealed Worker
environment deny lazy installation. Owner identity/confirmation/expiry, private
data and B13/B14 spent records are preserved. Staging/rollback cleanup and fresh
file-only admission passed. No Hermes/model run or new activation occurred.
ADR-004 execution decision remains v9 and all six public flags remain false.
Earlier next-step/lock/launch statements below are historical.

RF-RUNTIME-005B11 [native tool boundary](hermes-native-tool-boundary-v1.md) is
implemented under ADR-004 v7's explicit same-owner residual-risk acceptance.
Profile v4, typed coding authority, canonical workspace/Writer/application leases,
bounded footprint receipts and owned-only cleanup are qualified synthetically.
Detected violations block review/release; partial observation is not isolation.
Only fresh opaque local proof removes the native-tool blocker. All six flags
remain false and real launch remains denied; B12 is source/synthetic launch
qualification only. Earlier B10 pending-acceptance text below is historical.

RF-RUNTIME-005B10 [native tool qualification](hermes-native-tool-boundary-v1.md)
is source-only complete. Recommended roost-hermes-native-audited-coding-v1 is
**BLOCKED on one owner decision**: acceptance of the disclosed same-owner native
file/shell residual risk. Public write-root checks cover guarded file writes;
reads, shell/helpers, network effects and Windows path races are not contained.
B11 implementation is proposed only after that acceptance. ADR-004 remains v6;
no runtime/private changes, real launch or activation; all six flags stay false.

RF-RUNTIME-005B9 [practical attempt policy](hermes-practical-attempt-budget-v1.md)
is implemented under ADR-004 v6: the owner accepts unavailable physical counters
and hard token/cost enforcement for the supervised pilot. coding-small-v1 uses
24 logical turns, retry setting 2, an original deadline of at most 900 seconds,
Windows Job cleanup and no automatic restart. Receipts keep unknowns null and
exit 0 is only a candidate for independent review. This supersedes B8's required
pre-dispatch budget boundary and proposed source-only B9; its source findings
below remain historical evidence. Real launch and all six flags stay false.

RF-RUNTIME-005B8 [attempt/budget qualification](hermes-attempt-budget-contract-v1.md)
is source-only complete and **BLOCKED** for a coding pilot. One Roost attempt may
contain multiple controlled model/tool exchanges. Public max-turns is not a
physical-call cap; run-budget is advisory and quiet hides internal counters and
partial/exhaustion details. Selected coding-small-v1 requires a Worker pre-dispatch
budget boundary which this CLI does not expose. No runtime/private changes or
activation; all six flags remain false. B9 is proposed qualification only.

RF-RUNTIME-005C amendment: the production Worker branch now uses
[native owned-job v1](windows-owned-process-job-v1.md), qualified with real local
fixture processes. It replaces the raw-child collector's missing ownership proof.
Only its fresh native receipt removes the local candidate stop blocker; all other
blockers and all six false flags remain. The RF005A statement below that no native
backend exists records the original implementation, not the current backend.

RF-RUNTIME-005A, 2026-09-16. Contract: `roost-hermes-supervised-quiet-v1`.
Status: **SYNTHETIC ADAPTER IMPLEMENTED; NATIVE EXECUTION BLOCKED**.
Authority: owner handoff BATCH-RUNTIME-005A and
[ADR-004 version 2](../decisions/ADR-004-native-hermes-codex-pilot.md).

## Narrow replacement of the stream requirement

The first supervised pilot may use the existing stable **0.21.2**, source
`939e45c91d751fadd94dcd1b873ac3cb44846213`, with public quiet output.
Waiting for an unreleased `--format stream-json` implementation is no longer
its prerequisite. This does not qualify unattended execution or tool telemetry.
The old [launch contract](hermes-cli-launch-v1.md),
[installation preflight](hermes-windows-installation-preflight-v1.md) and
[replacement proposal](hermes-replacement-pin-proposal-v1.md) remain dated evidence
for the superseded stream requirement. Their rejected newer candidate is not
installed or promoted. The registry's historical `cliLaunchQualification` is
separate from its current `supervisedQuietQualification`.

The [pinned public parser](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/_parser.py)
registers the following public arguments; its SHA-256 is
`8f6573f8bc211208ae884e9ca21987240abd28bc3312c7189f323286dfc29a21`.
This is source evidence, not a fresh private launcher/configuration attestation.

```text
hermes chat --oneshot --quiet --query-file - --provider openai-codex --model <approved> --reasoning <approved>
```

Worker uses the validated absolute executable, exact argv, `shell:false` and
canonical working directory. Approved model/reasoning come from the sealed
selection. The existing single-use input envelope is consumed once; its bounded
payload goes to `stdin.end` once, never a shell argument. Worker makes one attempt,
with no retry, resume or Direct fallback. `prepareProviderLaunch` still denies
Hermes before spawn. The unqualified environment/configuration boundary must be
replaced with verified private allowlisting before that denial can be lifted.

## Output and process semantics

`agent-host-hermes-quiet.mjs` independently bounds stdout at 131072 bytes and
stderr at 32768 bytes, performs fatal incremental UTF-8 decoding and checks both
completed channels against required redaction and known secrets. No raw stderr
or private error details become the result. Arbitrary stdout, including JSON-like
text, remains `untrusted_process_output`; it cannot approve a task or fabricate
tool events. Exit 0 means only that the process finished, exit 1 is an error and
130 is interruption; other nonzero/null exits also fail. Empty stdout is allowed
at the transport boundary, without implying a useful or correct result.

Quiet output has no reliable tool events, internal turn count, transport retry
count or token/cost accounting. These are explicitly unavailable, not zero.
The one-result/one-child guard prevents a second Worker completion, not a hidden
Hermes follow-up turn. `hermes_single_turn_enforcement_unproven` and
`hermes_output_cost_budget_unproven` remain. A byte/deadline bound does not prove
a hard provider token/cost cap. Configuration must separately close auxiliary
models, background follow-ups, retries, fallbacks, memory, delegation and native
tools outside the approved scope. The pilot agent may not commit, push or deploy.

Timeout (including silence), cancellation, lost lease, controller shutdown,
pipe/process errors, malformed output and normal exit all require whole-owned-tree
cleanup before the collector returns. Worker awaits bounded cleanup even if an
outer deadline or checkpoint fails. Cleanup uncertainty retains ownership and
prevents a completion or ordinary retry. Synthetic tests inject a code-only owned
tree receipt; private configuration cannot supply such a receipt.

**No native owned-tree backend is qualified here.** Existing `taskkill /T /F`
cannot prove atomic ownership, descendants surviving an exited root, or cleanup
after abrupt controller death. Its success therefore always produces
`hermes_stop_recovery_unproven`, including root exit 0. Synthetic fake descendants
test orchestration only. Admission stays closed until an actual native mechanism
has independent whole-tree and controller-death evidence; no VM is prescribed.

## Evidence for independent review

The Worker gathers a baseline and post-run evidence under the execution deadline.
`agent-host-workspace-evidence.mjs` checks the exact expected HEAD and branch;
an agent-created commit is rejected. Evidence includes porcelain status, exact
working/index byte digests and modes for changed paths, and bounded binary diff
digests for staged and unstaged patches. Untracked binary files, deletions and
renames are represented. Limits are 128 paths, 8 MiB per file/Git response,
32 MiB aggregate content and 64 KiB returned snapshot metadata. Conflicts,
gitlinks, symlinks, invalid paths, known credential filenames, oversized material
and inconsistent consecutive snapshots fail closed with a fixed public error.

No file or patch contents, credentials or machine paths enter the artifact.
The result seal binds the input seal, baseline seal, HEAD, branch, status, manifest
and diff digests. `verification.workspaceEvidence` participates in the existing
`task_review_material` fingerprint, which includes the whole verification object;
changing the captured dirty bytes therefore changes review material. No migration
or review-role relaxation is required. Tests also verify that changed evidence
changes the review contract digest.

This is a snapshot of **Git-visible uncommitted bytes**, not proof of all filesystem
effects. Ignored files, out-of-workspace effects and concurrent adversarial writers
still require containment and the exclusive-writer boundary. Two equal snapshots
are not an atomic filesystem transaction. A later review/application action must
recapture and compare the seal before using changed material; this task does not
add live disk verification to the server or authorize applying an approval.

## Admission and next boundary

All six flags remain false: `implementationReady`, `executionSupported`,
`pilotReady`, `liveAdmissionAllowed`, `pilotExecutionAuthorized` and
`pilotExecutionStarted`. Public argv support removes the old stream incompatibility
blocker only. Sealed effective configuration, authentication separation, native
tool containment, internal-turn control, hard budgets and owned-tree recovery
remain unqualified. Direct CLI arguments, input and event path remain unchanged.
No real provider, model, OAuth flow, credential store or MCP service was invoked.

The sole next atom is **RF-RUNTIME-005B: owner-present Codex OAuth plus minimal
Blank Slate configuration** in the approved private instance, with its own explicit
scope and secret-free evidence. It is not started here and does not itself grant
model execution or clear the other blockers.

Future **Ollama local**, OpenAI gpt-oss or Mistral/Devstral, is **PLANNED/DISABLED**
only, outside executable providers. Installation remains blocked until the owner
confirms disk expansion and separate resource/quality qualification. Future
routing must explicitly weigh competencies, risk, quality, cost, available
resources and privacy; escalation must be visible, never a hidden fallback.

## Verification scope

Synthetic Node tests cover quiet argv and sealed single input, byte/UTF-8/secret
guards, exit semantics, one completion, no retry, timeout/cancel/lease/shutdown,
pipe errors and successful/failed/hanging synthetic cleanup. Temporary Git
fixtures exercise byte seals, staging, renames/deletions, binary untracked files,
forbidden commits, size limits and fixed private-error handling. Direct/provider,
context, duration, lease and API/review regressions remain required. No result
from these tests constitutes native Hermes, OAuth, containment or live qualification.
