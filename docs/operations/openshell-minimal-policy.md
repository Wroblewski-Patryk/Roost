# Minimal synthetic isolation policy (RF-HOST-038)

[RF-HOST-040](openshell-official-policy-validation.md) later executed the
official parser for v2 but found supervisor-injected filesystem grants. Its
overall BLOCKED result does not change the historical source-only evidence here.

Historical v1 template: [RF-HOST-039](openshell-reproducible-fixture.md) adds a
separate materialized v2 revision. v1 bytes/hashes remain unchanged and v1 is
never live-ready. The default CLI now validates v2 with explicit fixture bytes;
`--template` retains the historical v1 review described below.

**STATIC-MINIMAL-POLICY-READY**, verified 2026-09-13, for the **unmaterialized
template contract only**. Execution remains blocked. No fixture existed at RF-HOST-038;
no fixture, OpenShell CLI, gateway, supervisor, sandbox, agent or model ran.
The [host lifecycle guards](host-lifecycle-safety.md), observe mode, disabled
providers/Hermes, `executionSupported=false` and `pilotReady=false` are unchanged.

## Exact artifacts and identity

- [OpenShell policy](../../config/openshell/synthetic-isolation-v1.policy.json)
  uses policy schema version **1**, expressed in the JSON subset of YAML.
- [Separate Roost contract](../../config/openshell/synthetic-isolation-v1.contract.json)
  has identity **`roost.synthetic-isolation.v1`**, policy version **1**.
- [Offline linter](../../scripts/openshell_minimal_policy.py) accepts only this
  pinned template; it is not an OpenShell parser or a Worker admission adapter.

| Identity | SHA-256 |
| --- | --- |
| Policy | `f975cd82cf69b06813f3f7086cc7d0215b3affd57efef75ce7a1001b0012a512` |
| Roost contract | `35c60e554191d34a3e83e4c9ef9772674a3b721c0706b04fc03f1b90cec36f33` |

Hashes cover **`roost-ascii-json-sorted-compact-v1`**: recursively sorted object
keys, compact JSON separators, ASCII strings, integers/booleans/null, UTF-8,
no trailing newline. Floats, duplicate keys and non-ASCII strings are rejected.
The canonical policy is **580 bytes**; its contract is **2,781 bytes**. Whitespace
in source files is not identity. A future transport must submit exactly the
validated canonical bytes and compare their hash, version and separately
approved contract hash immediately before admission. Do not compare the
pretty-printed file bytes to the canonical hash.

Every semantic change, including fixture materialization or upstream version,
requires a new immutable revision, validation and explicit approval. Replacing
hash constants in a caller or supplying a self-declared digest grants nothing.
Missing policy, hash mismatch, unknown effective-policy additions or a stale
revision must deny admission; never fall back to the image/default policy.
This task does not implement that future gateway/Worker admission path.

## Allowance and exclusions

The entire policy is an explicit replacement of the
[RF-HOST-037 permissive image policy](openshell-static-base-audit.md). There is
no include, merge, inheritance, provider composition or global-policy override.
`network_middlewares` is explicitly empty. Missing/invalid explicit policy must
stop the future test rather than use either image policy path or a default.

| Surface | Sole allowance |
| --- | --- |
| Process | `/opt/roost-fixture/bin/fake-app-server`, explicit argv containing only that path, user/group `sandbox`. |
| Network | `fixture.roost.test:18080`, `protocol: rest`, `enforcement: enforce`, exactly `GET /probe`, for exactly the fixture binary path. |
| Filesystem read/execute | Only the fixture's exact immutable file path. |
| Filesystem write | Only `/sandbox/roost-fixture/scratch`, also the explicit workdir. `include_workdir=false`. |
| Landlock | `hard_requirement`, with nonempty rules and no skipped or missing paths. |

The future fixture must be a small **static Linux amd64 ELF**, at most **4 MiB**,
with **no dynamic libraries, interpreter, shell or subprocess exec**. This is
a requirement, not a produced or verified binary. Using a static fixture avoids
granting broad `/usr`, `/lib`, `/etc`, `/proc`, `/tmp` or real home access.
Its contract contains the explicit marker **`UNMATERIALIZED_FIXTURE_SHA256`**;
this is never a valid executable hash and must be replaced under a new approved
revision after a reproducible build and byte verification. No fixture source,
binary, executable directory or scratch directory was created in this task.

Scratch must be a separate disposable **1 MiB** bounded filesystem with
`nodev,noexec,nosuid`, while the rest of the container filesystem is read-only.
The fixture is immutable and not under scratch. These are external runtime
requirements; OpenShell policy path entries do **not** enforce mount flags,
disk size, total log/output limits or prohibition of executing writable content.
Inherited stdin/stdout/stderr must be bounded and contain no privileged host
descriptors; the fixture contract needs no file-backed credentials or real XDG.
If fixture/library/runtime requirements cannot fit this contract, stop and
request a new revision instead of expanding paths or downgrading Landlock.

All other destinations, ports, methods, paths and binary entries are rejected
by the linter. In particular: provider APIs, GitHub/package registries, arbitrary
DNS names, globs, CIDRs, loopback/metadata endpoints, broad HTTP access,
generic shell/Node/Python/curl/Git egress and bundled agents. No credentials,
provider bindings, signing/rewriting, inference routes or middleware are allowed.

The reserved test hostname is **not a live service or a DNS lookup performed by
this task**. A later trusted responder must own exactly one pinned isolated
address for it, with no external DNS fallback, redirects, host-admin destination
or rebinding. That binding needs separate evidence/approval; no extra endpoint
or `allowed_ips` range is hidden in this policy. The responder is not another
permitted agent process. Its creation is outside this task.

The child must never receive `/mnt/c`, host repositories, real `CODEX_HOME` or
XDG directories, `/var/run/docker.sock`, containerd/Podman sockets or APIs,
gateway/admin mTLS material, provider credentials, arbitrary user bind mounts
or named volumes. These are explicit requirements in the separate Roost
contract. The OpenShell filesystem schema is an allowlist, not an authored
deny-path list; adding unsupported `deny`, `sha256` or mount fields would be
incorrect. No installed CLI, image or private installation root was modified.

## Upstream schema and control-plane limits

The authoritative source is **OpenShell v0.0.116**, commit
`d1155aa70042d3e2ee49dbfa15346b108b7c1d92`. Nine bounded official source files
were retrieved by that exact commit, SHA-256 recorded, and each Git blob SHA-1
checked against the commit's Git tree. The contract pins all nine source hashes.
No dependency/toolchain or newer release was installed.

The [official schema reference](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/docs/reference/policy-schema.mdx)
and [canonical serde DTO/parser source](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-policy/src/lib.rs)
were checked for all nine used DTO structures. The policy uses their existing
field names/types; REST rule combinations were cross-checked against the pinned
[L7 validator](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-policy/src/l7_validate.rs).
This is a static source/schema cross-check, **not execution of those Rust functions**.

Default deny is inherent in the pinned
[Rego policy](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-network/data/sandbox-policy.rego):
unmatched network/request decisions deny. There is no top-level YAML
`default_deny` switch; `networkDefault: deny` belongs to the Roost contract and
is never sent as an invented OpenShell field.

The same source has **ancestor-path matching**, and trusted runtime settings
can relax binary identity. Therefore a single `binaries` entry is **not an
exact-process execution allowlist**. The future test must prove required binary
identity, immutable fixture, no other executable/ancestor bypass, non-root
privilege drop and no executable writable/memfd path. No bundled agent or shell
is admitted merely because it is present in the base image.

The official binary DTO accepts `path` and an ignored legacy `harness` flag;
it does **not** accept an authored binary SHA-256. Upstream TOFU is not a Roost
build pin. The fixture hash consequently belongs to the separately approved
contract, checked against actual immutable bytes before any launch.

The [Landlock implementation](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-process/src/sandbox/linux/landlock.rs)
supports file-specific rights and treats inaccessible paths as fatal in strict
mode. Empty lists can bypass ruleset preparation, which is why this contract
requires one explicit RO file and one explicit RW directory. Effective
enforcement, inherited descriptor behavior and scratch restrictions remain live gates.

Supervisor proxy/listener, policy DNS and gateway control channels are trusted
runtime infrastructure, separate from the one process-policy endpoint. They
are not additional fixture egress grants. The pinned
[core conversion](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-core/src/policy.rs)
selects proxy networking and notes the special inference route. Omission of
provider endpoints alone does not prove that route unreachable. Before a live
test, prove no configured provider/inference route, no implicit additional
egress and no child access to gateway/admin identity or control descriptors.
None of this control-plane setup was created or tested here.

## Validation and result boundaries

Run `python -B scripts/openshell_minimal_policy.py --template` for explicit
template review: exit **0**, `STATIC-MINIMAL-POLICY-READY`, with
`fixtureMaterialized=false`, `officialRuntimeParserExecuted=false` and
`liveAdmissionAllowed=false`. At RF-HOST-038, running without `--template` failed with exit **2**,
`STATIC-MINIMAL-POLICY-BLOCKED`, `fixture_unmaterialized`. The v1 validator accepts
no materialized execution bundle, even if an arbitrary 64-digit hash is supplied.

The linter bounds policy/contract input to **8/16 KiB**, **512 nodes**, **12 levels**
and **512 ASCII characters per string**. It rejects duplicate/unknown/missing
keys, floats/nonfinite numbers, type coercions, YAML aliases/includes, schema or
source-pin drift, path/endpoint expansion, missing strict/default-deny settings,
extra binaries/RW paths, potential secret values and any unapproved identity.
Diagnostics are fixed codes without input values. There is no UI/PL/EN change.

**Official runtime parser validation was not run.** The pinned
[CLI command/dispatch source](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-cli/src/main.rs)
offers policy set/update/get/list/delete, but no standalone file-validation
command. Dispatch resolves gateway/auth context; update's dry-run is a merge
preview, not established offline validation. No compiled pinned local Rust
parser was available, and no toolchain/dependency installation was permitted.
Neither `--help`, WSL nor the installed Linux CLI was invoked. JSON syntax and
the narrow Roost checks do not substitute for the official parser, effective
policy equality or live enforcement tests; these remain mandatory later gates.

The [synthetic tests](../../scripts/test_openshell_minimal_policy.py) cover every
restriction above, template/default CLI behavior, semantic hash stability and
negative mutations at each policy object. They use fictional names/data and
generic forbidden path literals, with no live endpoint, secret or image fixture.
All **16 policy/linter tests**, **seven existing preflight tests**, syntax,
privacy, **394 local-link checks** and diff checks passed. Both real linter CLI
branches returned the expected exit codes and fixed diagnostics.
Application/API/DB/container build suites were not run because this change is
an offline policy contract/linter, not runtime integration.

Windows Engine and existing container names/status, network IDs/names and
volume names matched before and after; all continuity checks passed. Both snapshots show
Engine **29.7.2 linux/amd64**, four containers (two Up), five networks and
107 volumes. Uptime changes are normalized without container payload, log,
mount or environment inspection. No image save/pull/run/create, WSL entry,
Docker/WSL restart/termination, integration toggle, prune, socket/recovery
operation, provider/Worker activation, push or deployment is performed.

The then-recommended materialization task was completed separately by
[RF-HOST-039](openshell-reproducible-fixture.md). Its v2 result and remaining
gates do not alter this historical v1 template or grant execution.
