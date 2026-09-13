# Direct Codex qualification decision packet v1

RF-HERMES-006, 2026-09-13. Decision-packet version: **1**.
Scope: one candidate profile for the existing Windows Worker plus WSL2 execution
boundary, under [ADR-001](../decisions/ADR-001-direct-codex-app-server-pilot.md).
**D01–D06 BLOCKED; D07 DECIDED for document/schema design only.**
No adapter implementation, installed runtime or pilot is qualified.

The [normalized profile](direct-codex-qualification-profile-v1.json) is a
**non-executable decision document**. Its [closed schema](direct-codex-qualification-schema-v1.json)
also defines a future capability/effective-control receipt. Both are outside
runtime configuration; no existing launcher or API consumes them. The
[CAS contract](direct-codex-app-server-contract-v1.md) and
[30-family acceptance matrix](direct-codex-app-server-acceptance-v1.md) remain
normative. Every gate stays false: executionSupported=false,
implementationReady=false, pilotReady=false, liveAdmissionAllowed=false.

## Evidence and classification

| Source ID | Existing local basis; no new network/runtime evidence |
| --- | --- |
| E01 | [ADR-001](../decisions/ADR-001-direct-codex-app-server-pilot.md): direct App Server target, optional Hermes/OpenShell, no admission and ≤5s stop requirement. |
| E02 | [Execution packet](execution-packet-contract.md) and [Foundation V2](../product/interview-foundation-v2.md): approved model/effort, bounded time/output/attempts, authority and resource invariants. The current packet permits repository read/write/local tests and externalWrites=false. |
| E03 | [RF005 contract](direct-codex-app-server-contract-v1.md) and [matrix](direct-codex-app-server-acceptance-v1.md): exact required controls and unproven mappings. |
| E04 | [RF001](hermes-codex-isolation-assessment.md), unchanged [source manifest](../../config/hermes/source-assessment.json), [RF002](../operations/hermes-linux-synthetic-transport.md) and [RF003](hermes-clean-transport-api.md): dated source facts and bounded research only. Official App Server snapshot `openai-1` is hash-bound there; no exact direct adapter binary/schema is qualified. |
| E05 | [Recovery](agent-host-recovery.md), [host lifecycle safety](../operations/host-lifecycle-safety.md) and [WSL environment](../operations/agent-wsl-environment.md): existing Windows ownership and Linux prerequisites, not whole-tree/FS/network proof. |
| E06 | [Pinned stock Docker-driver assessment](../operations/openshell-docker-v3-delivery.md): missing read-only-root configuration, mandatory writable workspace backing and missing fixture-membership proof. |
| E07 | Existing [provider-input serializer](../../scripts/lib/agent-host-provider-input.mjs): recursively sorted object keys, array order preserved, JSON UTF-8 SHA-256 seal; existing input limit 131,072 bytes. |
| E08 | Governing RF-HERMES-006 request: integrations belong to their responsible user's account; a reported long redeploy can take about 900 seconds; external implementation dispatch has an 80% account-usage rule. These are task requirements/observations, not credential access, measured capacity or runtime approval. |

The profile classifies **every setting and research value**:

- OWNER_APPROVED: an explicit governing requirement, with source. It grants no
  broader action or access than stated.
- EXISTING_CONTRACT: retained normative value/range, not proof of enforcement.
- SAFE_TECHNICAL_DEFAULT: a reversible restrictive representation/behavior
  choice within the existing contract; local documentary/static basis is stated.
- RESEARCH_ONLY: separately stored observations, never admission defaults.
- UNRESOLVED/BLOCKED: null value; no fallback, coercion or silent substitution.

Nulls make the candidate inspectable, not executable. A materialized invocation
must have every applicable field resolved and approved under CAS-R02/27; none of
these nulls is legal in required invocation controls. Schema validity does not
make a profile runnable. Test pinning, policy approval and proof are separate.

## D01 — Pin, OS, inventory and wire — BLOCKED

**Decision/recommendation.** Define one installation-local qualification pin:
Windows Worker ownership, one selected WSL2 distribution and Linux x86_64 Codex
App Server connected over owned stdio. This is the candidate to qualify, not an
approved change to the existing Windows CLI execution path. Native Windows
Codex is an alternative requiring a different profile/review, not automatic
fallback. No Codex version/hash is invented from the observed CLI references.

The private pin receipt must bind installationRef, Windows build, WSL kernel,
distribution/runtime/toolchain identity, exact native executable version and
SHA-256, inventory manifest, schema bundle and capability receipt. Distributed
documents contain opaque IDs and digests only. Private inventory records contain
canonical paths, file type/size/hash and ACL/owner constraints, reject extra or
changed files/links, and seal all executable dependencies. Verify open-handle or
equivalent identity through launch to close replacement races. No PATH resolution,
shell launcher, floating tag or implicit version probe during task admission.

**Basis:** E03/E04/E05. The existing Linux examination pins Hermes/Python and
does not pin a direct Codex executable. Official docs specify a per-version
schema generator; docs metadata alone cannot replace those exact artifacts.
**Alternatives:** native Windows-only pin avoids the cross-OS bridge but needs
its own complete containment proof; floating installed CLI is rejected for drift.
**Risk:** wrong ABI/protocol, changed dependencies or alias/TOCTOU can bypass
otherwise valid field checks. **Unblock:** B01/B02, independently checked exact
artifact and source-derived wire mapping, then authorized compatibility probes.
**CAS impact:** R/T02–04, 09–12, 26–29.

Test pin is immutable and scoped to its profile revision. Upgrade/rotation is a
separate candidate revision: new inventory/schema hashes, regression evidence,
drain/reconcile active attempts, explicit rollout and retained rollback artifact.
Old receipts never qualify a new executable; rollback never replays old work.

### Required probes; specified, not run

| Stage | Required evidence | Admission consequence |
| --- | --- | --- |
| Before adapter implementation | Offline exact-artifact/provenance inspection and version-bound official schema/source mapping of every sealed field; separately authorized no-model initialize/config/thread/interrupt/shutdown probe only if needed to resolve mappings. Check config/discovery side effects before accepting a handshake. | No model, no tools, no real secret. Missing pin/schema/behavior mapping leaves implementation blocked. Probe execution itself needs a later bounded task. |
| Before pilot | Same pin plus all required C/O/A evidence in CAS-T01..30: allowed and denied tool operations, effective policy/readback, auth isolation, accounting and whole-tree stop. Exact profile/input/evidence hashes and existing-workload continuity. | JSON field acceptance alone fails. No current C/O qualification or consent is claimed. |

## D02 — Finite task budgets and buffers — BLOCKED

**Decision/recommendation.** Retain approved API bounds, require explicit task
values and a reviewed installation resource profile, and keep production defaults
unset. Never copy the RF002 fixture caps into that profile. This is one bounded
configuration mechanism, not an unbounded long-running mode.

| Quantity | Fixed basis or required bounded configuration |
| --- | --- |
| Overall execution | Existing accepted integer 60–3,600 seconds from original server startedAt; includes preparation, model/tools, waiting and downtime. Default null. |
| Startup and turn | Explicit positive phase maxima per profile/task; each fits within overall minus stop reserve. Turn must include every admitted long operation plus pre/post verification, not reset per command. Current production values null. |
| Stop | 5,000 ms total, included in lease/overall budget; abnormal stop split in D04. Normal clean-server-exit wait has a separate finite normalExitMs, currently null, also inside the same original deadline. |
| Input/descriptor | Existing model input ≤131,072 bytes. Descriptor cap is separate and null; must fit canonical input plus bounded control metadata/encoding overhead. No smaller implicit descriptor cap may silently exclude a legal input. |
| Line/aggregate/queue | Positive integer caps; line ≤aggregate, pending ≤aggregate; count both pipes before parsing and include already delivered/discarded bytes. Current production values null. |
| Parser/item/callback/rate | Explicit positive depth/string/array/item/callback and per-second event/callback bounds, bounded decoded memory, at most one outstanding approval. Values null; no wildcard/default unlimited. |
| Report | Positive reportTimeoutMs null; only idempotent terminal reporting after confirmed stop, no renewed model/tool time or new budget. |
| Retention | Raw log retention zero. Redacted evidence age/bytes/policy and storage capacity null until owner/resource decision; no raw fallback or automatic deletion of unresolved work. |

For a future separately authorized long operation, require
`expectedOperationMs + preparationMs + verificationMs + normalExitMs + stopMs`
to fit the remaining original overall budget **and** the approved turn budget.
The observed approximately 900-second redeploy is a RESEARCH_ONLY sizing input,
not a new 900-second cap or a default. The approved 3,600-second ceiling can
accommodate it when the full plan fits; RF002's 20-second turn is irrelevant to
production sizing. No concrete preparation/verification headroom was measured,
so no 15/20/30-minute production default is selected here. If the plan cannot fit,
block and seek an independently reviewed plan; never reset the timer or split
effects into retries to evade the cap.

Current local-change access has externalWrites=false. This timing design does
not authorize redeploys or extend CAS v1 to release work. A future release task
also needs independent authority and a qualified release boundary.

**Basis:** E02/E03/E04/E08. **Alternatives:** fixed RF002 caps are too restrictive
and unapproved; automatic growth is rejected; individually approved finite task
values are recommended. **Risk:** guessed small caps interrupt legitimate work;
guessed large caps consume host resources. **Unblock:** B03/B08 via owner sizing
and capacity/evidence review. **CAS impact:** R/T02, 13–16, 19–23, 27–29.

## D03 — Responsible-user credential references — BLOCKED

**Decision/recommendation.** Keep the responsible integration user's account as
the credential owner. Worker identity and integration account ownership are
distinct; a company task or another user's agent cannot borrow that ownership.
Private credential binding resolves integrationRef, responsibleUserRef, provider,
audience/scope, local secret-store reference, expiry and current grant. Only
opaque references enter Roost or the descriptor. A change/revocation of owner,
grant, audience or scope invalidates admission and refresh.

Worker may resolve a reference only after current authority checks in a future
qualified auth implementation. Never read existing Codex profiles, export user
login tokens, scrape browser sessions, put values into argv/env/prompts/checkpoints,
or create a shared integration account as an implicit solution. No real secret
or auth record was inspected here.

E04's official App Server snapshot describes experimental externally managed
ChatGPT tokens and a refresh callback. It does not prove the current user's
credential source is permitted/available, that the selected binary stores no
values, or that tools cannot access token material. Consequently the current
credentialChannel is null; no invented proxy, injected config file, secret env
variable or custom authentication protocol is accepted. Any future supported
channel must keep values in bounded private memory, bind refresh to the same
attempt/audience/owner/lease, count its retries/cost and fail before use on expiry.

**Basis:** E03/E04/E08. **Alternatives:** a separately reviewed official channel
on the responsible user's account may qualify; a dedicated service account needs
an explicit owner change and still requires the same channel proof; copied
desktop auth is rejected. **Risk:** cross-user authority, persistence/leakage or
unbudgeted refresh. **Unblock:** B04: owner identifies only references/ownership;
technical review proves an official allowed channel and isolated refresh.
**CAS impact:** R/T05, 07, 14, 17, 23, 27–29.

## D04 — Windows/WSL ownership and isolation — BLOCKED

**Decision/recommendation.** One Windows Worker owns the existing machine-wide
writer and one task session. Its WSL2 bridge must be pinned and unable to become
a second writer. A Windows process job without breakaway can be a candidate
boundary for native bridge descendants; it is **not assumed to own Linux
descendants**. The Linux side needs a delegated task-only containment unit
(candidate cgroup plus PID/mount/network/user isolation) with a supervisor that
the model cannot disable. Support, delegation and privileges are unproven on
the existing installation. No ordinary process group is substituted for it.

The same physical application checkout must be mapped once, without copying;
Windows ACL, WSL mount and Linux permissions must jointly deny sibling projects,
excluded user files, Git control metadata, host homes, auth/scratch and host-control
endpoints. Agent writable roots remain exactly one application root. Server-only
scratch is a separate capability, inaccessible to tools; provider egress and
tool network must be separated. If any cross-OS boundary cannot be enforced,
block instead of broadening paths or mounting host sockets.

Require finite cpuMillisPerSecond, ramBytes, processCount, handleCount and
scratchBytes plus diskReserveBytes and a hostCapacityReceiptRef. Current values are
null. CPU must be ≤1,000×approved CPU capacity; all byte/count caps must fit a
reviewed host reserve and the finite parser/queue budget. Windows limits must
cover the bridge; Linux limits must cover all task descendants, never all WSL
workloads. Never use distro-wide termination, Windows job closure alone, global
Docker cleanup or an expired lease as Linux tree-stop evidence.

For **abnormal stop**, select the restrictive reversible technical default:
0 ms waiting for protocol interrupt, 0 ms optional graceful wait, all 5,000 ms
for owned containment-unit termination and confirmation. Interrupt is optional
in CAS-R19; skip it rather than waiting without a turn ID. This allocates the
already required ceiling; it is not evidence that the platform meets it.
Do not kill anything until ownership is established. Normal terminal shutdown
still closes cleanly under separately approved normalExitMs; forced cleanup
cannot turn an otherwise normal result into success. An unconfirmed stop retains
writer/checkpoint and blocks new work.

OpenShell is optional. E06 found that the pinned stock Docker driver did not set
read-only rootfs and required writable workspace backing; exact fixture delivery
was unproven. That historical zero-write fixture differs from repository coding,
so its result is neither a universal impossibility proof nor a usable isolation
guarantee. A configuration label or healthy Docker is insufficient. Do not
install, execute, patch or change OpenShell as part of this decision packet.

**Basis:** E01/E03/E05/E06. **Alternatives:** native Windows-only qualification
could avoid cross-OS ownership but needs its own profile; optional isolation
components can be reconsidered only with exact enforcement evidence. Killing
the distribution is rejected. **Risk:** escaped descendants, host interruption,
unbounded resources and scratch/credential exposure. **Unblock:** B05 with
supported-platform source/design evidence, then authorized native deny/escape/
resource/stop tests and unchanged unrelated workloads. **CAS impact:** R/T03,
05–08, 12–16, 19, 23–24, 27–29.

## D05 — Hard generation, money and retry bounds — BLOCKED

**Decision/recommendation.** Model and reasoning effort remain separate mandatory
task selections under the existing minimum-5.6 allowlist. No inherited defaults,
silent downgrade or automatic escalation. Accepted per-attempt output/attempt
bounds remain unchanged; monetary amount, currency/pricing revision, retry
maximum and enforcement mechanism are null.

Require a synchronous enforcement boundary or a proved finite reservation for
all possible unreported generation, reasoning, retries and interrupt latency.
For token and monetary budgets separately:
`confirmedSpent + maximumInFlight + interruptionReserve + proposedRequestMax`
must not exceed the accepted cap before a request can proceed. Every quantity
must be known and nonnegative; unknown partial usage or unbounded overshoot
blocks launch. No reservation is refunded just because a response was lost.
The stop reserve is part of the original duration, not a fresh paid generation
pool. After tree stop, reporting may use only its finite control-plane timeout;
it cannot call a model or replenish token/money budgets.

The App Server usage report and account rate-limit percentages are observations,
not hard caps. No locally evidenced selected binary enforces the required full
execution cap. Keep B06. Adapter request/process replay count is zero by CAS v1;
that does not assert zero hidden provider retries. Provider backoff/Retry-After
must fit exact verified count, lease, duration and reserved money/tokens.
Unmeasurable retries, repeated ineffective actions or exhaustion stop for
independent plan/budget review, never a self-approved increase.

The **80% account-usage rule belongs only to external dispatch of implementation
work**. It is not a Worker budget, API readiness field, model token cap or runtime
Roost configuration. The normalized profile and receipt contain no such field.
No account usage was queried and no external dispatcher was altered here.

**Basis:** E02/E03/E04/E08. **Alternatives:** verified upstream hard caps or a
separately admitted enforcing provider boundary may qualify; post-hoc usage,
prompts and guessed overshoot do not. **Risk:** hidden charges and runaway retries.
**Unblock:** B06 plus B03 for exact independently approved budget values; owner
approval cannot replace enforcement proof. **CAS impact:** R/T09, 13–14, 18–23,
27–29.

## D06 — Effective native controls and task authority — BLOCKED

**Decision/recommendation.** Choose base approvalPolicy=never as a restrictive
technical default within CAS-R08. It never means unsandboxed execution. The
base profile cannot accept requests to enlarge permissions; an unexpected
approval cancels/stops. Current native policy target is workspaceWrite with
restricted reads, one writable root and no tool egress. Required Roost approval
becomes a bounded Decision and stopped/replanned work, not permission to replace
the active seal or enable session-wide trust. A later approval-capable profile
needs separate qualification of the existing single-use Roost decision contract.

The required probe must observe effective config/layers and actual permitted
write/test behavior, then demonstrate denial of excluded files, `.git` refs/index/
hooks/config, shell aliases/interpreters, arbitrary network, inherited credentials
and indirect API routes. Inspecting a JSON response alone is insufficient.
Unknown settings, policy downgrade, missing callbacks or auto-trusted execution
fail closed. No fake-only probe qualifies native enforcement.

No current packet grants commit/push/merge/deploy. These must be blocked even if
a model uses raw filesystem writes, command aliases, hooks or HTTP instead of
the named operation. Future release authority must identify exact task/principal/
action and current independent review, with effective enforcement on every route.
The 900-second sizing observation grants no release permission.

**Basis:** E02/E03/E04. **Alternatives:** separately qualified unlessTrusted with
single-use decisions may follow; auto-accept/session grants and prompt-only
restrictions are rejected. **Risk:** native trust rules bypassing Roost authority.
**Unblock:** B07, exact pinned effective-control and negative-tool evidence,
including prevented side effects. **CAS impact:** R/T06–10, 17–18, 21–24, 27–29.

## D07 — Schema, receipt and integration design — DECIDED

**Decision.** Adopt the closed document identities and semantic rules below;
this closes schema design only, not D01–D06, independent review or implementation.
The local basis is existing strict/versioned inputs and hash sealing (E03/E07).
No new runtime state machine, provider protocol or executable registry is added.

| Identity | Exact meaning |
| --- | --- |
| `roost-codex-qualification-profile-v1` | Required top-level keys: schemaId, profileId, revision, contractVersion, admission, decisionStatus, gates, settings, research, blockers. The schema fixes every setting name and type; unknown fields rejected recursively. |
| `roost-codex-capability-receipt-v1` | Private qualification receipt, schema in `$defs.capabilityReceipt`; profile/profile-schema/inventory/wire/platform hashes, current execution/attempt/input/lease/checkpoint binding, timestamp, qualification-only verdict/reasons, 14 exact effective-control results, test evidence, reviewer reference and tree-stop result. No secret/raw-path fields. |
| `urn:roost:codex-qualification-document:v1` | Local schema identity; its standard JSON Schema declaration is descriptive and must never cause network retrieval during validation. All schema references are local. |

Every profile binding has exactly classification, value and sourceRefs. Active
settings may not use RESEARCH_ONLY; research observations remain in their own
closed object. UNRESOLVED/BLOCKED means value=null and a linked blocker. All
other classifications require a concrete typed value and valid E01–E08 source.
No classification is an assertion of tested runtime enforcement. The selected
profile has 75 settings and seven research observations; it remains NOT_ADMITTED.

Use UTF-8 JSON with recursively sorted ASCII keys, preserved array order, no
whitespace, duplicate keys, non-finite numbers, floats or values outside safe
integer range. All machine-document strings are ASCII identifiers/enums; private
Unicode paths stay behind references. SHA-256 binds these canonical bytes.
This narrows the existing serializer pattern to avoid cross-language number/key
ambiguity. Store the resulting profile/schema/receipt digests externally, never
as a self-referential field in the object being hashed. A hash is integrity under
the trusted Worker boundary, not remote attestation or proof against an operator
who can replace both artifact and receipt.

Receipt controls are exactly executable, configuration, environment,
credentialIsolation, filesystem, network, sandboxApproval, modelEffort,
processTree, resourceCaps, budgetsRetries, checkpointAuthority, redaction and
protocol. Each has status PASS/FAIL/UNPROVEN/UNSUPPORTED, effectiveSha256 and
opaque evidenceRefs. PASS needs a non-null digest and evidence; it cannot be
inferred from a successful initialize. Reject duplicate test IDs, wrong profile
revision/hash, stale attempt/lease/input/checkpoint or future timestamp.
Qualification PASS requires every control and all 30 CAS families at their
required D/S/C/O/A levels, no blocker, independent reviewer and confirmed stop.
It still carries all four gates false and never authorizes a production claim.

Reason codes are closed in the schema: qualification_pass, pin_unresolved,
protocol_unproven, limits_unapproved, credentials_unproven, containment_unproven,
budget_enforcement_unsupported, policy_unproven, evidence_policy_unapproved,
independent_review_missing, schema_invalid, integrity_drift, authority_stale,
checkpoint_ambiguous, stop_unconfirmed, redaction_blocked,
resource_limit_exceeded, budget_exceeded, protocol_violation. Unknown codes
fail decoding; no raw error string or private path becomes a reason. The first
stop reason is immutable; uncertainty forbids success.

Plan later integration through a separately versioned API/Worker change: bind
profile receipt hash and compatibility identity to existing execution evidence,
leave recovery-v1 shape untouched until a reviewed extension is supported on
both sides, and map qualification reasons into existing bounded diagnostics.
Do not write unknown fields to today's API/checkpoint. Receipt metadata stays
private until that mapping exists. No new DB status enum is inferred from a
local verdict. Redacted evidence retention values belong to D02/B08; no new
artifact retention service or purge is introduced by D07.

Future registry reconciliation must distinguish App Server from CLI/Hermes,
version required capabilities, preserve all false gates, drain/reconcile work,
reject old/new mismatches and preserve data/leases/checkpoints on rollout or
rollback. Do not edit applied migrations or reset data. Current v5 and legacy
requiredPilotProvider=hermes_codex stay byte-for-byte unchanged.

**Alternatives:** free-form metadata/unknown-field tolerance rejected; a new
queue/receipt authority service is unnecessary. **Risk:** a structurally valid
receipt mistaken for admission; constant-false gates and qualification-only scope
prevent that interpretation. **Remaining evidence:** independent design review
B09 and future implementation/native tests; no owner secret is needed to decide
the document shape. **CAS impact:** R/T02, 16, 20–23, 25–30.

## Decision to CAS coverage

Each CAS-R maps to the identically numbered CAS-T in the unchanged acceptance
matrix. This table is the complete decision-to-test mapping for this packet.

| Decision | Requirements | Tests |
| --- | --- | --- |
| D01 | CAS-R02 CAS-R03 CAS-R04 CAS-R09 CAS-R10 CAS-R11 CAS-R12 CAS-R26 CAS-R27 CAS-R28 CAS-R29 | CAS-T02 CAS-T03 CAS-T04 CAS-T09 CAS-T10 CAS-T11 CAS-T12 CAS-T26 CAS-T27 CAS-T28 CAS-T29 |
| D02 | CAS-R02 CAS-R13 CAS-R14 CAS-R15 CAS-R16 CAS-R19 CAS-R20 CAS-R21 CAS-R22 CAS-R23 CAS-R27 CAS-R28 CAS-R29 | CAS-T02 CAS-T13 CAS-T14 CAS-T15 CAS-T16 CAS-T19 CAS-T20 CAS-T21 CAS-T22 CAS-T23 CAS-T27 CAS-T28 CAS-T29 |
| D03 | CAS-R05 CAS-R07 CAS-R14 CAS-R17 CAS-R23 CAS-R27 CAS-R28 CAS-R29 | CAS-T05 CAS-T07 CAS-T14 CAS-T17 CAS-T23 CAS-T27 CAS-T28 CAS-T29 |
| D04 | CAS-R03 CAS-R05 CAS-R06 CAS-R07 CAS-R08 CAS-R12 CAS-R13 CAS-R14 CAS-R15 CAS-R16 CAS-R19 CAS-R23 CAS-R24 CAS-R27 CAS-R28 CAS-R29 | CAS-T03 CAS-T05 CAS-T06 CAS-T07 CAS-T08 CAS-T12 CAS-T13 CAS-T14 CAS-T15 CAS-T16 CAS-T19 CAS-T23 CAS-T24 CAS-T27 CAS-T28 CAS-T29 |
| D05 | CAS-R09 CAS-R13 CAS-R14 CAS-R18 CAS-R19 CAS-R20 CAS-R21 CAS-R22 CAS-R23 CAS-R27 CAS-R28 CAS-R29 | CAS-T09 CAS-T13 CAS-T14 CAS-T18 CAS-T19 CAS-T20 CAS-T21 CAS-T22 CAS-T23 CAS-T27 CAS-T28 CAS-T29 |
| D06 | CAS-R06 CAS-R07 CAS-R08 CAS-R09 CAS-R10 CAS-R17 CAS-R18 CAS-R21 CAS-R22 CAS-R23 CAS-R24 CAS-R27 CAS-R28 CAS-R29 | CAS-T06 CAS-T07 CAS-T08 CAS-T09 CAS-T10 CAS-T17 CAS-T18 CAS-T21 CAS-T22 CAS-T23 CAS-T24 CAS-T27 CAS-T28 CAS-T29 |
| D07 | CAS-R02 CAS-R16 CAS-R20 CAS-R21 CAS-R22 CAS-R23 CAS-R25 CAS-R26 CAS-R27 CAS-R28 CAS-R29 CAS-R30 | CAS-T02 CAS-T16 CAS-T20 CAS-T21 CAS-T22 CAS-T23 CAS-T25 CAS-T26 CAS-T27 CAS-T28 CAS-T29 CAS-T30 |

## Closed blocker register

| Blocker | Decisions | Exact missing condition and owner |
| --- | --- | --- |
| B01 | D01 | Exact privately pinned Codex/version/inventory/platform artifact evidence; compatibility reviewer. |
| B02 | D01 | Version-bound wire schemas and effective-field/initialization/ephemeral compatibility evidence; compatibility reviewer. |
| B03 | D02,D05 | Approved concrete phase/buffer/parser/rate/resource-budget values and independently accepted task plan/model/effort/money sizing; owner and resource/budget reviewer. |
| B04 | D03 | Responsible-user credential references and a permitted official channel with no persistence/tool leakage and bounded refresh; owner plus security/compatibility reviewer. |
| B05 | D04 | Supported Windows/WSL cross-boundary ownership, whole-tree/FS/network/scratch/resource enforcement and ≤5s stop proof; platform/security reviewer. |
| B06 | D05 | Enforceable total generation/cost/retry bound with known partial accounting/overshoot; budget/compatibility reviewer. |
| B07 | D06 | Actual native policy/approval and shell/Git/network/excluded-file bypass denial; security/authority reviewer. |
| B08 | D02 | Approved bounded private evidence storage/retention capacity and preservation/reconciliation policy; owner/privacy reviewer. |
| B09 | D01,D02,D03,D04,D05,D06,D07 | Independent exact-profile/CAS design and later evidence review plus separately scoped authority; original author cannot qualify itself. |

## Consolidated interview packet I01 — prepared, not sent

This is one pending packet for the interview coordinator, not questions sent to
the user or permission to inspect credentials. Answers record only references,
choices and numeric bounds; never passwords/tokens/private account data. Owner
decisions cannot waive B01/B02/B05/B06/B07 or manufacture technical evidence.

| Item | Decision requested | Recommendation, alternative and consequence |
| --- | --- | --- |
| I01-A | Approve a finite task/resource/retention sizing policy and supply phase/buffer/parser/rate/resource/report/evidence caps, currency/pricing basis and per-task monetary/output budgets; include a plan for long operations. | Recommend explicit per-task values within existing 60–3,600s bounds and installation caps, with measured pre/post/stop headroom and no inherited duration/model default. Alternative: retain blocked status until capacity evidence exists. Arbitrary large caps or the RF002 caps as production policy are not offered. |
| I01-B | Identify the responsible integration principal and permitted private credential-store reference/source; confirm that official external token handling may be evaluated if available. | Recommend the existing responsible user's supported official route, references only. Alternative: defer authenticated qualification; any service-account ownership change needs a separate decision. No answer authorizes copying desktop auth or proves the channel safe. |
| I01-C | Select whether to authorize a later bounded, non-model compatibility/evidence task for the single Windows/WSL candidate after exact artifacts can be inspected, or keep qualification paused. | Recommend artifact/schema/containment design review first; separately request any needed probe execution, installation or real-model authority with exact scope. Alternative: pause. This packet itself authorizes none of those actions. |

## Verification and next task

The static [profile validator](../../scripts/validate_direct_codex_qualification.py)
checks the closed schema subset, classifications/sources, decision/blocker/CAS
coverage, privacy and links. It checks only documentation and synthetic receipt
objects; it never starts a process, opens a network connection or reads auth.
Its own schema/negative tests do not qualify runtime or act as independent review.

Exactly one recommended next atomic task: **RF-HERMES-007 — resolve consolidated
interview packet I01 through the interview coordinator and record the resulting
owner decisions/references, preserving every technical blocker requiring separate
evidence.** Do not implement, probe, activate or start that task here.
