# Managed Hermes backend admission contract v1

2026-09-23, owner amendment v16 after v15's Hermes-only correction.
**Source/synthetic contract DONE; real issuer and launch BLOCKED.** The sole task
flow is Roost -> Windows Local Worker -> managed Hermes -> one selected model
backend. This slice extends existing model/input, trusted-pilot and launch
contracts; it adds no provider, supervisor, routing algorithm or real invocation.

## Explicit selection

`roost-managed-hermes-backend-v1` is a strict, versioned variant of the existing
task `modelSelection`. It accepts exactly one discriminated backend and rejects
unknown keys, combined selections, aliases, fallback and missing reasoning.
Legacy task intent is retained for compatibility; it cannot silently become a
versioned managed-backend selection. The Ready editor's existing catalogue is
unchanged; this is not a new routing or backend-choice user interface.

| Selection | Required binding |
| --- | --- |
| `codex_responses` | Existing managed Hermes class, `openai-codex`, explicit allowlisted Codex model >=5.6 and supported reasoning, `same_owner_subscription`, no fallback. |
| `ollama_loopback` | Same managed Hermes class, `ollama`, exact `http://127.0.0.1:11434`, explicit model tag/family/SHA-256 digest/reasoning and configuration forbidding remote use. |
| Common policy | `managed_hermes`, explicit risk class, 1–24 logical turns, 0–2 API retries, unavailable -> stop attempt, never restart. Task duration/output/attempt budgets remain separately mandatory. |

The existing local family schema permits `gpt-oss` and `devstral` intent; the
owner's current model direction is `gpt-oss:20b`. Neither family nor any real
digest is admitted by this contract. A local model that works in `hermes-manual`
does not establish managed availability or authority. Direct Codex,
`codex_app_server` and manual profiles always deny.

Future cost/quality/risk/resource routing must propose explicit input before
Ready and satisfy the same checks. No selection algorithm, availability probe,
automatic escalation or backend fallback is implemented here.

## Exact upstream and authentication boundary

The managed reference remains Hermes **0.21.2**, commit
`939e45c91d751fadd94dcd1b873ac3cb44846213`, unchanged. The existing
[CLI contract](hermes-cli-launch-v1.md) and
[Responses-path qualification](hermes-attempt-budget-contract-v1.md#selected-path-and-counter-meanings)
are the source basis. The pinned
[provider resolver](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/runtime_provider.py)
selects Responses for explicit `openai-codex`; local App Server is a separate
opt-in and is excluded. The [CLI inventory](codex-static-inventory-v1.md) is not
a launch dependency, and the new reader does not import the CLI observer.

Codex uses the existing `roost-hermes-same-owner-auth-v2` and
`roost-hermes-owner-attestation-v1` nonsecret attestation reader. It rechecks the
fixed sibling file, ID/digest, profile binding, confirmed state and expiry.
The legacy `same-owner-codex-cli` source-class name denotes auth provenance,
not a binary execution requirement. Status remains
`unavailable_not_qualified`; an owner attestation is not a live login, account
fingerprint, available subscription quota or backend-health proof. No credentials
are read, imported, renewed or written. Tests create synthetic attestations only.

Ollama requires a separate fixed-sibling
`roost-managed-ollama-model-v1` record. Its `managed-agent` purpose, installation,
physical managed-profile identity/digest, exact endpoint and full selection
digest must match, and it must be accepted and unexpired. `hermes-manual`
receipts, another profile's receipt, missing evidence and changed model data
deny even if a future installation shares the same physical model store.
Only `closed_fixture_only` evidence exists here; a real managed-model receipt
issuer and live resource/availability checks remain unqualified.

## One existing admission chain

The existing private signed trusted-pilot decision now accepts versioned backend
intent through the existing `hermes_codex` class. `hermes_local` remains the
older bounded fixture policy, not a second orchestration layer. Both new
selections use the same host-containment WeakMap and genuine fixed execution
grant. Fixed sibling `managed-backend-evidence.json` is bounded/read-only, outside
the checkout, with physical identity, digest, expiry and the following bindings:

| Binding | Evidence |
| --- | --- |
| Task/attempt/Ready | Sealed input, task/execution identity, all input revisions, claim and existing Ready/risk checks. |
| Roles/competence | Task role authorities, assignment and competence context; no routing-derived role or authority. |
| Risk | Explicit Ready-approved selection risk class plus the existing risk-admission evidence digest. This does not independently calculate or prove a risk tier. |
| Workspace | Genuine Writer, physical checkout and filesystem scope, task scope and allowed tools/permissions. |
| Budget | Task attempts/duration/output digest, exact turn/retry policy, original deadline. The fixture has zero model tokens and exactly 22 output bytes; this is not a real model-budget proof. |
| Runtime/profile/config | Pinned Hermes source version/commit, measured fixed-fixture runtime/configuration digests, physical managed fixture profile and content digest. No installed Hermes identity is fabricated from source metadata. |
| Lifecycle/release | Genuine Windows Job v2 launcher capability, original ownership, durable resume, owned-zero-process cleanup, B28-only recovery, independent review and no release authority. |

The signed decision binds the newly observed backend evidence and auth/model
receipt identities/digests. Caller metadata cannot substitute for the reader's
fresh observation. Checks repeat during receipt consumption, before target
creation and before suspended-process resume through the existing runner.
Observed drift revokes the attempt; JSON copies and replay cannot recreate the
in-process receipt.

Preparation reserves the existing grant before backend/auth/model availability
checks. A refused trusted attempt also consumes its input seal. Restoration of
old evidence does not renew it, and a backend/model change after Ready or during
the attempt cannot reuse that grant. Unavailability ends the attempt explicitly;
only a separately prepared task/decision may change selection later. No fallback
process is dispatched.

Real command projection explicitly returns `managed_backend_real_launch_unqualified`
for this versioned input. Only positive synthetic cases reach the original fixed
22-byte program, with Job cleanup and independent durable review. All six public
readiness/activation flags remain false.

## Hygiene and unresolved real authority

Read-only inventory identified **39** prior test-state parent directories by
their bounded creation interval and matching previous CLI fixture profile. All
39 were canonical, none was a root reparse point, all had child fixture creation
markers, and all original child fixture roots were absent. **Cleanup BLOCKED**:
none had an original parent creation/ownership marker. Names, timestamps and
child receipts do not prove parent ownership; process/reference absence was not
fully established and cannot repair that gap. No deletion or policy retry was
attempted in this slice. Exact locations remain private, outside repository docs.

The previous automatic deletion refusal remains historical. New test helpers
check their still-live, in-memory parent physical identity before cleanup; this
does not retroactively supply ownership proof for abandoned parents.

The unresolved private signing/public-key-anchor provisioning and inherited
Users directory write permissions remain real-issuer blockers. This contract
neither provisions a key/anchor nor changes ACLs. `privateAnchorQualified=false`
and `realIssuerQualified=false` are explicit even on a positive synthetic result.
Additional real gaps include installed managed runtime/config identity, qualified
backend/model availability, safe auth/profile binding and retained independent
budget, Job, recovery and release enforcement. Fixture evidence replaces none of
them. No private profile, model store, system installation or production state
was changed.

## Verification

**503/503 tests passed:** 225 backend/trusted-pilot/containment/launch cases
(90 new backend cases), 274 model/packet/input/profile/startup/budget/admission
regressions, and four API provider projections. Both positive backend fixtures
produced exactly 22 bytes, verified zero remaining Job processes and removed
their owned fixture. Negative cases cover malformed or combined selections,
direct/App Server/manual profiles, model/reasoning/digest/endpoint errors,
missing managed receipt, auth and lifecycle drift, unavailable resources,
copy/replay/tamper, post-consumption switches and refusal after restoration.
New tests create only synthetic nonsecret evidence and ephemeral test signing
keys through the existing fixture helper; no installation key is provisioned.

`npm run validate` passed lint, TypeScript and server/web builds, retaining the
existing large-chunk warning. Both documentation validators, Node syntax and
whitespace checks passed. No database-backed API integration, real backend,
model, production or end-to-end provider trial ran. The eight unrelated dirty
product/planning documents are excluded; `design-qa.md` was not read or staged.
Final readback retained the same 39 prior parent directories and found zero new
residual roots from this slice. Privacy, 621 changed-document local links and
the 118,295-byte default-context budget passed; provider registry is unchanged.

**Exactly one proposed next atom:** source-only qualification of secure private
trust-anchor provisioning and verification within the existing Worker state
architecture, addressing inherited Users write and the operator/runtime trust
split. Specify fail-closed checks and synthetic tests; do not create keys,
change ACLs, install software or activate a provider. Stop after this contract.
