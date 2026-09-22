# Trusted provider pilot v1

Current owner amendment v15, 2026-09-23:
[Hermes-only target flow](codex-static-inventory-v1.md) supersedes this document's
original equal-provider policy and next atom. Direct Codex has no pilot authority;
even a validly signed old direct decision is rejected. Only managed-local intent
currently has fixture policy qualification; Hermes-Codex backend admission needs
a separately qualified contract. Codex CLI inventory is inactive evidence and
is not bound to Hermes admission. The original v14 findings below remain history.
Accepted account risk and all independent gates remain; no real activation.

2026-09-23, RF-HOST-035 owner decision: **accepted**. Full OS isolation or LPAC
is no longer a prerequisite for a narrowly scoped pilot of exactly pinned
Codex and managed local Hermes. This supersedes the LPAC/broker investigation
as the next pilot prerequisite; it does not qualify arbitrary providers.
It records the governing owner instruction, not a newly created API Decision,
private installation acceptance or authority to start a real provider now.

**Implementation status: PARTIAL for real pilot admission; decision validation
and fixture policy qualification DONE.** The existing containment registry now
accepts an authenticated private risk decision through
[`prepareTrustedProviderPilot`](../../scripts/lib/agent-host-containment.mjs).
The sole available execution issuer is still the original closed fixed program.
Both trusted classes can qualify their policy against that fixture, but neither
can substitute a real executable. No real provider is activated by this change.

## Accepted risk and retained authority

A trusted provider process runs with the Windows account's authority. Roost's
task scope, configured workspace, prompts, model pin and review controls are
organizational/application restrictions, not an impenetrable OS boundary.
The accepted residual risk includes access available to that account outside
the intended task through native code. Roost does not claim protection from a
malicious same-account process altering its code or operator configuration.

`mode=trusted_provider_pilot`, `systemIsolation=false` and
`residualRiskAccepted=true` describe only this explicitly accepted mode.
`arbitraryProviderAdmission=false`, `fullAutonomy=false` and all six existing
readiness/activation flags stay false. An unknown, changed, unpinned or
unaccepted provider is denied. Full sandbox qualification remains necessary
before claiming full isolation; no sandbox is installed in this slice.

One physical checkout, one Writer, application lease, task/Ready/claim identity,
scope, checkpoints, existing Windows Job lifetime/cleanup, original ownership,
durable resume and independent review/release remain mandatory. Risk acceptance
cannot add filesystem scope, tools, release rights, retries or automatic fallback.
The current pilot policy permits only repository read/write and local tests;
commit, push, deployment and external writes require separate authority.

## Private installation decision

[`roost-trusted-provider-pilot-v1`](../../scripts/lib/agent-host-trusted-pilot.mjs)
is read from `trusted-provider-pilot/installation.json` beneath the genuine
Writer state directory, outside the task checkout. This is private installation
configuration, never task/API/provider metadata or a distributed owner record.
The anchor names only the fixed sibling decision/profile filenames and binds
installation ID, workspace ID, owner authority public key, decision ID,
revision and expected decision digest. No environment-selected alternate anchor
or arbitrary sibling filename is supported. Physical paths must be canonical,
without reparse components or hardlinked files; reads are bounded and checked
for identity/content drift.

The decision is an Ed25519-signed canonical payload. Its private signing key
is not loaded by Worker, written by this implementation or shipped in Git.
The trusted operator must provision the public-key anchor and sign the exact
reviewed decision separately. Tests generate an ephemeral key in memory only.
There is no automatic acceptance writer, renewal, key generation or provisioning
at host startup. A public key supplied in task JSON is never an authority source.

| Binding | Required contents |
| --- | --- |
| Decision | Version, ID, positive revision, accepted/revoked state, decision time and expiry within 24 hours; explicit `windows_account_authority_not_os_isolation` acknowledgement and residual-risk acceptance. |
| Installation | One installation/workspace, physical configuration and private-directory identities; current anchor and signed decision digests. Copying files elsewhere does not preserve this identity. |
| Runtime | Provider class/version, exact existing runtime/launcher binding digests and execution configuration digest. This slice measures the actual fixed fixture, not a pretend installed provider. |
| Profile | Physical file identity and digest; `managed-agent` purpose, provider/backend/version, explicit model selection, no fallback. Owner manual profiles are rejected even when signed. |
| Task | Workspace/application/task/execution, one attempt, exact input seal and single-task/access/filesystem/Writer digests, physical checkout identity. Model/Ready/scope changes require new authority, not reuse. |
| Qualification | `closed_fixture_only` is the only implemented execution qualification. A signed `real_provider` field cannot promote it; an independent genuine real-runtime issuer is still required. |

The mode uses the existing host-containment WeakMap, receipt lifecycle and
one-attempt consumption, not a parallel execution registry. Private files are
read again at consumption, immediately before process creation and before
suspended-process resume. Any observed change/revocation expires the prepared
binding; failed handoff revokes the receipt and the input remains spent. Copies,
JSON round trips, modified signatures, current Job-only receipts and API/config
booleans cannot enter that registry. The existing maximum 60-second preparation
lifetime is also capped by the decision's expiry; it is not a renewable grant.
Same-account replacement of the trusted anchor or rollback of all operator state
is within the acknowledged residual trust, not a cryptographic OS guarantee.

## Provider and model conditions

**Codex:** only the current exact registry version and the existing explicit
Roost model allowlist, all at least generation 5.6. The task must name both
model and supported reasoning; aliases, omitted values and silent fallback
are rejected. The registry's reference CLI version is not a verified binary
installation pin. Real admission still lacks a genuine pinned runtime/Job
handoff and must retain the independent hard-output-budget gate.

**Managed Hermes local:** only the registry-pinned managed Hermes version,
`ollama_loopback`, no remote fallback and an exact local model tag, family,
SHA-256 digest and explicit reasoning. The task schema can now express local
`gpt-oss`/`devstral` intent; it does not install or admit either family.
The existing Codex and Hermes-Codex launchers reject that local selection.
There is no managed Ollama/model admission issuer or local launch contract in
this slice. A profile declaration and synthetic model digest do not establish
that a real model exists or is approved. `hermes-manual` never supplies agent
authority. No manual, managed, Desktop, model or Ollama state was read or changed.

Neither real provider currently has the complete launch chain. The public
API/Worker admission remains closed, even with forged readiness metadata.
Historical public isolation blocker codes remain conservative legacy diagnostics;
they must not be interpreted as a renewed requirement to install LPAC for the
accepted trusted pilot. The remaining gaps are pinning, qualified execution,
model/configuration and independent budget/lifecycle authority.

## Verification and next atom

Synthetic tests cover both provider policy classes reaching only the existing
22-byte fixed effect with genuine Windows Job cleanup and durable review.
Negative tests check zero target creation/effect/resume for missing acceptance,
signature/copy attacks, changed runtime/launcher/version/profile/configuration,
model/digest, workspace/task/scope/Writer, remote fallback, manual profile,
unknown provider, missing model/reasoning and authority expansion. Revocation,
revision and anchor/profile drift invalidate prepared and consumed attempts.
Isolation and autonomy flags never become true. No real provider/model ran.

Final checks: **84/84** trusted-pilot and containment cases (51 new pilot
cases), **92/92** packet/model cases, **170/170** existing Hermes
profile/startup/budget/native-admission cases and **4/4** API provider projection
cases passed. Earlier input/provider/fixed-runner regressions also passed; the
one missing-model diagnostic regression was corrected and rechecked. Ready
editor choices remain the explicit Codex catalogue rather than introspecting
the new union schema. `npm run validate` passed lint, TypeScript and server/web
builds with existing asset/chunk-size warnings. Syntax, whitespace/privacy,
761 local links and documentation budgets passed (113,441 default-context
bytes; three planning files, largest 30,228 bytes at validation).

No database/API integration, real provider/model or production trial ran.
No private acceptance, key, runtime/profile/model or system setting was
provisioned or changed. The eight pre-existing dirty documents received
concurrent edits outside this slice and are excluded from its commit; no
global hash equality is claimed. `design-qa.md` was neither read nor staged.

**Exactly one next atom:** connect one genuinely pinned Codex installation to
this existing trusted-pilot decision and Windows Job v2 execution boundary,
with synthetic launch/denial verification and the independent budget gate
retained. Reuse existing ownership, Ready/Writer, review and recovery; do not
add a supervisor or relax the model allowlist. No real invocation follows
without its separate complete admission. Managed Hermes remains blocked pending
its own later exact managed-model qualification. Stop after the present slice.
