# Hermes Desktop, profile isolation and local model routing

Status: **read-only inventory and proposed contract**, 2026-09-21. No runtime
admission, installation, configuration or model evaluation was performed.
The [delivery gate](agent-delivery-readiness.md) remains RF-HOST-035; all six
readiness/authority flags remain false. Manual Desktop use is a separate concern
and does not qualify Roost execution.

## Detected state and evidence limits

Installation locations below are logical labels, not operator paths. Evidence
came from filesystem metadata, installed package/build metadata, static code,
process/service inventory and narrowly scoped startup metadata. Credentials,
configuration contents, private logs, sessions and databases were not read.

| Component | Observed state |
| --- | --- |
| Pinned Hermes CLI source | Version `0.21.2`, commit `939e45c91d751fadd94dcd1b873ac3cb44846213`; no tracked source changes. This verifies source identity, not interpreter/dependency integrity. |
| Desktop package | Actual `resources/app.asar` package version **`0.17.6`**. Installed `Hermes.exe` reports Electron `40.10.2`; this is not the application version. Start-menu shortcut targets the unpacked release beneath the Hermes source tree. |
| Desktop provenance | Packaged install stamp: commit `a3d7f9ae257d5db6bb9759a10c437d786eec1610`, branch `main`, CI build `2026-09-21T16:49:27.690Z`, `dirty: false`. This differs from the pinned CLI commit. The checkout's Desktop package says `0.17.2`, so source-package metadata must not stand in for installed Desktop identity. |
| Installer | `hermes-setup.exe` reports `0.0.1`; separate bootstrap WebView state exists. Installer identity does not establish Desktop/backend compatibility. |
| Backend installation | Desktop-adjacent source and the managed manifest's source location report the same filesystem identity and commit in the inspecting process, despite different Windows path spellings. No second independent Python source installation was established. A `venv` exists with both `hermes_agent-0.21.2.dist-info` and `hermes_agent-0.21.3.dist-info`; effective import/version and dependency provenance remain unqualified. Do not repair it as a side effect. |
| Profile/state | Existing managed home `hermes-pilot` has separate configuration, auth, state, sessions, logs and lock files (names only inspected). Desktop's current user-level `HERMES_HOME` points to the general installation home. Its Electron user-data state is separate from the Python source, but effective profile selection was not read or exercised. |
| Process/autostart | No named Hermes/Ollama processes or services found at observation. No matching scheduled tasks or Run entries found. An Ollama Startup shortcut exists; its effective StartupApproved state was not verified. No Hermes startup shortcut found. This is a bounded inventory, not proof of all possible launch mechanisms. |
| Ollama | Installed version `0.34.2` from uninstall metadata; application and CLI binaries present. User/machine `OLLAMA_MODELS` and `OLLAMA_HOST` overrides absent. Default model store has zero blob files and no manifests directory: no installed model was found there. No server/API or CLI model-list call was made; alternate stores were not exhaustively searched. |

The read-only resource snapshot found approximately 39.5 GiB free on the system
disk and 31.7 GiB physical RAM; GPU identity reports an RTX 3050 Laptop variant
with nominal 6 GB VRAM. Free runtime memory and inference throughput were not
measured. This is not confirmation of the owner-required storage expansion.

The official [Ollama model listing](https://ollama.com/library/gpt-oss:20b), checked
on the audit date, lists a 14 GB MXFP4 artifact and describes operation with as
little as 16 GB memory. These are different quantities, not a complete resource
budget. Six GB VRAM does not fit those weights wholly on the GPU; CPU/RAM
offload, context/KV cache, concurrent applications and latency require a measured
evaluation. No model was downloaded, reserved or loaded.

## One installation: conditional, not qualified

Inspection of the **packaged** `dist/electron-main.mjs` confirms an external
Python backend: `HERMES_DESKTOP_HERMES_ROOT` selects a source root and
`HERMES_DESKTOP_PYTHON` can select its interpreter. The explicit source-root
branch constructs the backend without the normal bootstrap flag. Desktop has
its own Electron runtime, but a second Hermes Python installation is not an
inherent requirement.

However, `resolveUpdateRoot()` also selects that override root. Sharing it can
therefore expose the frozen managed installation to Desktop updates. Invalid
overrides can fall through to other backend/bootstrap paths. Mixed installed
package metadata and Desktop/CLI revision differences also prevent claiming
compatibility. A single shared Python installation is a **design candidate**,
not an approved launch configuration. No updater-disable control was qualified.

If these boundaries cannot be proven, retain the existing managed installation
unchanged and propose a separately qualified manual backend as the minimum
fallback. Do not silently create it, migrate profiles or merge installations.
An incompatible Desktop is not a reason to modify the pinned managed runtime.

## Future two-profile contract

These labels describe per-installation private configuration; this document is
not a launch script. No listed profile or setting was created by the audit.

| Boundary | Manual Desktop | Managed Roost |
| --- | --- | --- |
| Identity | `hermes-manual` | Existing `hermes-pilot` |
| Process-scoped `HERMES_HOME` | Distinct `MANUAL_HOME` | Existing `MANAGED_HOME` |
| Desktop state | Distinct `MANUAL_DESKTOP_STATE` via `HERMES_DESKTOP_USER_DATA_DIR` | No reuse of manual Electron state |
| Mutable data | Own config, auth, sessions, memory, DB, logs, cache, locks and runtime state under the manual boundary | Existing managed state and authority records remain exclusively managed |
| Python code/interpreter | Explicit `SHARED_RUNTIME` and exact interpreter only after compatibility and update isolation qualification | Frozen manifest-bound code/interpreter; no Desktop repair/update authority |
| Ollama | One explicitly configured server/store, shared weights | Same server/store only after provider admission; separate requests and execution evidence |

The two homes must be independent roots, **not** siblings inside a common
`profiles/<name>` tree: packaged `normalizeHermesHomeRoot()` collapses that form
to the parent home. Process environment and subprocess inheritance need a
separate qualification before launch; global user environment, PATH and registry
must not be changed implicitly. Profile separation is not an OS security sandbox.

One Ollama model store holds one copy of each qualified model's weights. Neither
Hermes home receives copied weights; concurrency/resource admission belongs to
the future server contract. Shared weights do not imply shared conversations,
credentials, state or Roost execution authority. Roles, hierarchy, task context,
delegation and review remain in Roost; do not create a Hermes profile per agent.

## Future explicit routing contract

This section does not change the
[provider registry](../../src/modules/agent-runtime/execution-providers.json)
or the [current model allowlist](../../scripts/lib/agent-host-model-policy.mjs).

| Provider/model identity | Separate effort field | Qualification |
| --- | --- | --- |
| Codex `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-terra` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` | Current local allowlist; actual account/runtime capability must be checked at admission. |
| Codex `gpt-5.6-luna` | `low`, `medium`, `high`, `xhigh`, `max` | `ultra` is rejected by the local policy. |
| Ollama `gpt-oss:20b` | `low`, `medium`, `high` mapped explicitly to API `think` | Candidate only; immutable model digest, installed runtime and endpoint still need qualification. |

Ollama's [thinking contract](https://docs.ollama.com/capabilities/thinking)
specifies those three GPT-OSS levels; boolean `think` is ignored for this model.
Do not map Codex `max`/`ultra` to a local level implicitly or treat matching effort
names as evidence of equal capability.

Every future task route must record provider, model/version or digest, effort,
profile, selection reason, required capabilities, quality evidence, risk and
privacy class, context/output budget, quota/cost, hardware/resource headroom,
latency expectation and applicable authority. Model and effort are independent
fields. Roles cannot override task scope, filesystem boundaries, one-writer
ownership, review or release gates.

Quota exhaustion, unavailable models, unsupported effort, poor evidence or
insufficient resources produce an explicit blocked/queued outcome. **No silent
fallback** between models, providers, profiles or effort. Any replacement route
needs a visible decision and fresh applicable authority; it cannot revive spent
execution grants or inherit a broader permission set.

Before local coding or autonomy, separately authorize a small evaluation of
low-risk, non-sensitive tasks such as classification, extraction and summaries
with known expected results. Record quality, output-format compliance, instruction
adherence, failure handling, tokens/context, peak resources and latency against
predeclared acceptance criteria. Neither installation nor a successful response
constitutes a coding/provider-admission result.

## Closure and next bounded step

This docs atom is complete with metadata/static inspection, local Markdown link,
privacy, documentation-budget and scoped diff checks. No runtime tests or full
`npm run validate` were run because executable behavior was not changed.
No application/model launch, download, login, private configuration mutation,
autostart change, push or deployment was performed.

The next manual-Desktop blocker is a separately authorized qualification of
**packaged Desktop 0.17.6 with pinned CLI 0.21.2**, covering dependency provenance,
profile/subprocess isolation and update/bootstrap isolation before configuration.
Do not begin it automatically. The next Roost execution gate remains
**RF-HOST-035**; this inventory supplies no evidence that closes that gate.
