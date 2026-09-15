# Official native sandbox outer-launch qualification v1

RF-CODEX-018, 2026-09-15. Decision candidate version **1**.
Verdict: **OFFICIAL-NATIVE-SANDBOX-OUTER-LAUNCH-BLOCKED**.

Follow-up [RF019 precomputed-schema research](direct-codex-precomputed-schema-v1.md)
confirms a complete source JSON inventory, but retains BLOCKED for exact
PE/schema binding. Its RF020 proposal concerns publisher metadata only.
The RF019 recommendation below records this report's historical handoff.
[RF021 setup admission](direct-codex-native-setup-admission-v1.md) inspects the
private runner/setup paths and retains all launch gaps and closed gates.

An official source-level Windows command wrapper exists outside model turns.
The inspected path loads configuration before requesting the sandboxed child,
and conditionally bootstraps authentication/cloud configuration. Its Windows
request supplies no timeout. This is not the required confinement of the first
Codex process before discovery. Exact installed-build mapping, full CLI dispatch
and supported external interface remain unqualified.

[ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md),
[RF015 native preflight](direct-codex-native-artifact-preflight-v1.md),
[RF016 contract](direct-codex-native-schema-probe-v1.md) /
[acceptance](direct-codex-native-schema-probe-acceptance-v1.md),
[RF017 standard isolation](direct-codex-windows-standard-isolation-v1.md),
[CAS](direct-codex-app-server-contract-v1.md) and
[qualification](direct-codex-qualification-decisions-v1.md) retain their gates.
No custom sandbox, wrapper implementation or new execution profile is proposed.

## NOL-01 — Evidence and capture limits

F = an inspected official source fact; O = a local static observation;
U = unresolved; R = an unchanged NSP requirement. Source commit
`6b9826e3aa83b1a5947db50f4332cb9c65f1b340` was already identified in official-source
research and used by RF017. It is a **source candidate, not this PE's build**.
RF017's captured setup.rs and Windows documentation remain available evidence;
their bodies were not fetched again. S08 matches the earlier RF001/RF014 hash.

| ID | Exact official source | HTTP status / delivered body bytes / SHA-256 |
| --- | --- | --- |
| S01 | [CLI main (body denied)](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/cli/src/main.rs) | 200 / 0 / `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| S02 | [CLI sandbox implementation](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/cli/src/debug_sandbox.rs) | 200 / 42,056 / `9de78749cbf8305b0731361439b84769d91598e3e5df4fae861c316b88f4e6ec` |
| S03 | [Requested schema module](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/app-server-protocol/src/schema.rs) | 404 / 14 / `d5558cd419c8d46bdc958064cb97f963d1ea793866414c025906ec15033512ed` |
| S04 | [Protocol export surface](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/app-server-protocol/src/lib.rs) | 200 / 2,447 / `60ccfaa6e8f3319966fb86150f51722ed9160e1fcf92aced3a8a326d287efd5f` |
| S05 | [Precomputed export implementation](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/app-server-protocol/src/precomputed_exports.rs) | 200 / 6,874 / `661397f6329f7fac05e9d7ccfc7bceead266389d0975da7d1ef57544ee5aaa0c` |
| S06 | [Sandbox cloud-config bootstrap](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/cli/src/debug_sandbox/cloud_config.rs) | 200 / 1,743 / `0456eb4adf5dbdfee8eeddb665b280f4a01a0c223e3ab6fc36a2e97d62088893` |
| S07 | [Windows sandbox library surface](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/lib.rs) | 200 / 33,039 / `c83b62919b99ad62db69b023b4b82ef5db3a9dd35b5f8c4e346e7ecd31898e7f` |
| S08 | [Official App Server documentation](https://learn.chatgpt.com/docs/app-server.md) | 200 / 99,470 / `a72a5c88ab05ab9737ec28b432708f2776f696be48eae09ee39c02dd2f9480e0` |

[RF018 request ledger](codex-native-outer-launch-source-ledger-v1.json) is closed:
8 requests, 185,643 delivered body bytes, zero retries and zero redirects.
There were six complete 200 bodies, one 404 body and one 200 whose body was
rejected before reading: S01 declared 184,508 bytes, above the 131,072-byte cap.
S03's requested file returned 404; S04 located the actual export module.
No bodies, credentials or executable payloads are stored in the repository.

The reused capture helper initially halted on the oversized declaration. The
ledger explicitly records a route-only continuation decision: delivered bytes
and in-flight bytes were both zero, the same URL was not retried, and only
distinct requests within the original limits continued. The denied row remains
unchanged. No range request, alternate URL for the same file, limit increase or
hidden replay followed. Ceilings remain 8 requests / 786,432 total bytes /
131,072 per response / 20 seconds per request / zero retry. No ninth request.

Consequently CLI main's argument definitions, top-level dispatch and startup
code were **not inspected**. Full call-graph closure cannot be claimed. S02,
S04–S07 establish the narrower paths below; S08 supplies public generator command
examples, not version-matched parser definitions. Missing source is recorded,
not filled in from guesses.

## NOL-02 — Exact artifact and build binding

O: current Appx registration remains OpenAI.Codex 26.908.4834.0, status Ok.
The exact candidate is relative `app/resources/codex.exe`, 297,858,352 bytes,
SHA-256 `081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575`.
Fresh hashing agrees with RF015–017. FileVersion and ProductVersion remain null.

A bounded data-only inspection read PE headers/section table, the small debug
directory and CodeView record, and the first 33,554,432 bytes of the 58,735,616-byte
.rdata section. No .text instructions, package DLL or executable were loaded.
Eight section entries contained no .rsrc entry. COFF timestamp was 1789088807.
CodeView was RSDS, age 1, PDB basename codex.pdb; raw GUID bytes
`c0a79bb95fadf2944c4c44205044422e`, 34-byte record SHA-256
`695d4c9e5aee77584dcf7d836fb936788683120dac74a5c63d56fcd80c7fc58c`.
These identify debug metadata, not a source commit or authenticated release.

Selected string searches found no Codex-labelled semantic version, rust-v tag
or CARGO_PKG_VERSION marker in that sample. They found 76 distinct version-like
strings and generic Git-related strings, none qualified as the application
version or build hash. The unsampled remainder might contain other metadata;
this is not proof that the entire binary lacks it. No raw strings, embedded
instructions or private build paths were persisted or treated as instructions.

RF015's signed package/member findings bind observed bytes under their recorded
policy. They do not supply a signed mapping from those bytes to this repository
commit. Neither Appx version, timestamp, PDB ID, arbitrary embedded version nor
a source file at a known commit repairs that gap. Reads/hashing were not an atomic
verification-to-launch lock.

`sourceBuildBinding=null`; `installedCodexVersion=null`.
No official signed build manifest or authoritative source mapping was found in
the bounded evidence. Installed-build argv cannot be promoted from S08 examples.

## NOL-03 — Command tree and candidate argv

These are inert descriptions, not commands authorized to run.

| Path | Evidence and dispatch boundary | Qualification |
| --- | --- | --- |
| app-server → generate-json-schema | S08 lines 130–135 documents `["app-server","generate-json-schema","--out","<output>"]`. S04 exports generate_json / generate_json_with_experimental from precomputed_exports. S05 contains their bodies. | General official candidate. Main's exact match arm, defaults and earlier side effects are U. |
| app-server → generate-ts | S08 documents `["app-server","generate-ts","--out","<output>"]`. S04 exports generate_ts / generate_ts_with_options; S05 implements them. | General official candidate. CLI option-to-function mapping, including formatter selection, is U. |
| Windows sandbox command wrapper | S02's run_command_under_windows_sandbox takes WindowsCommand and a Vec<String> command, then delegates to run_command_under_sandbox and the Windows session path. Its comments identify the codex sandbox family. | A separate source command path exists, not only tool execution inside a turn. Exact public CLI spelling, accepted flags and stability are U because S01 was not read. |
| Global sandbox option | No inspected source/docs establishes a global wrapper around every CLI subcommand. | Do not infer that a sandbox flag confines CLI startup or standalone exports. |
| App Server setup RPC | S08 documents windowsSandbox/setupStart as asynchronous setup for custom clients. | Requires an App Server conversation; it is not a pre-start generator boundary or a setup grant here. |
| Direct helper/library call | S07 reexports Windows session, token, process, setup and cleanup functions. | A Rust pub export is not a supported external CLI/ABI promise. Do not call private helper protocols or compile a new host around them. |

`generatorArgv=null`; `sandboxLauncherArgv=null`.
The exact executable identity is observed, but no complete qualified
executable-plus-argv-plus-policy descriptor exists. Do not add guessed flags,
assume a PATH-resolved helper, invoke help/version or promote these candidates.

## NOL-04 — Observed wrapper order

S02 source path, excluding the uninspected earlier CLI entrypoint:

| Order | Observed operation | Implication before target confinement |
| --- | --- | --- |
| 1 | run_command_under_windows_sandbox passes command/config fields to run_command_under_sandbox (131–165). Sandbox-state JSON is parsed (212–238). | Already executing the outer Codex program; no outer token boundary is proved. |
| 2 | load_debug_sandbox_config runs before child creation (240–248, 573–595). It invokes the cloud-config bootstrap. | Configuration work precedes the Windows sandbox request. |
| 3, conditional | S06 returns an empty cloud loader unless a permissions profile plus managed requirements is selected. Otherwise it resolves the home, loads the configuration layer stack, calls bootstrap_auth_config and the cloud-config loader. | Auth/config bootstrap is a real branch. Network effects inside its callees are U, not claimed to happen in every invocation. |
| 4 | S02 ConfigBuilder.build runs (627–687), potentially again for legacy read-only defaults. | Skipping cloud bootstrap does not skip local configuration loading. A synthetic empty home cannot prove no attempted discovery. |
| 5 | create_env uses shell_environment_policy; effective profile is selected (260–298). | No six-name replacement guarantee follows from supplying a synthetic HOME. create_env implementation was not inspected. |
| 6 | Disabled/External enforcement has a direct child branch; managed Windows routes to its session (300–338). | A sandbox command name alone is not enforcement. Exact effective managed/elevated policy must be verified. |
| 7 | Windows resolves deny-read paths, then calls spawn_windows_sandbox_session_for_level (493–528). | The target request is later than configuration. It includes command, cwd, env map and selected level. |
| 8 | S07 reexports that function from unified_exec, then token/process/runner/setup implementations in other modules. | Exact internal setup, identity/token creation, ACL/firewall application, Job attachment and child-spawn ordering remain U; reexports are not an implementation trace. |
| 9 | Windows stdio forwarding returns an exit code; wrapper exits with it (530–539). | Exit propagation exists at this level, but clean tree stop and bounded output are not proved. |

RF017's already captured setup orchestrator (same source candidate) creates
persistent setup state, invokes the setup helper and verifies a completion marker.
Its elevated path uses runas and an infinite wait; helper lookup has a basename
fallback. It does not establish first-process protection, exact helper resolution
for every path or an approved setup mutation/rollback contract.

The inspected wrapper therefore cannot satisfy NSP's no-discovery condition for
**all Codex processes from their first instruction**. Even a future proof that the
child generator is confined would leave the preceding outer Codex config path.
Do not redefine that outer process as exempt trusted setup without an explicit
contract decision. No such exemption is made here.

## NOL-05 — Generator side effects at the inspected function boundary

F, S05: the normal JSON export selects a stable embedded precomputed bundle,
decompresses it, parses JSON and writes its json_schema map. Its export path
validates relative components, creates parent directories and writes files
under the output path (94–176). The inspected function body contains no auth,
provider, plugin, MCP, model or network call. This is **function-local evidence**:
uninspected CLI startup and other callees prevent a whole-invocation claim.

The decoder uses decode_all; no NSP aggregate decompression/parser bound is
visible there. Relative-component validation is not no-reparse/effective-access
proof: ordinary filesystem writes can still encounter pre-existing aliases.
Artifact file count/size is U because no compressed bundle was downloaded,
decoded or extracted. No schema or TypeScript output was generated.

S05's TypeScript path writes files, may execute a supplied Prettier program,
then reads files again to trim trailing whitespace (58–92, 125–146, 180–191).
The library default enables formatter use, conditional on a supplied path;
CLI selection of that path is U. It is not safe to claim TS export is always
a single-process write-only operation. generate_types calls both exports, so
it is not the single JSON operation selected by NSP.

Prefer the official JSON path over TS for future qualification. More simply,
the source already uses precomputed protocol data: an officially published,
version-bound JSON bundle could satisfy CAS's publisher/source-artifact route
without executing a generator. Its availability, complete manifest and binding
to this exact PE remain unqualified; a source filename alone is not delivery
proof. No bundle acquisition, extraction or adapter use is authorized here.

## NOL-06 — Policy, environment, timeout and interface status

| Requirement | Inspected evidence | Remaining gap |
| --- | --- | --- |
| Strict reads / one write root | S02 passes a PermissionProfile, materialized workspace roots and resolved deny-read paths. Direct read/write overrides are None. RF017 source has narrower override machinery. | Exact CLI exposure, platform/helper additions, effective token access and race-safe denial are U. No proof of a single strict root set. |
| Zero network | S02 can restrict sandbox-state network policy. Its Windows request preserves proxy settings, sets proxy_enforced=false and no proxy restricting SID. | Preservation is not an empty-exception guarantee. Effective IPv4/IPv6/DNS/loopback/broker/local-control denial before target start is U. |
| Identity | S02 chooses WindowsSandboxLevel::from_config. S07 exports identity/token primitives and session selection. | No verified exact offline principal selection, credentials-free setup-revision attestation or no-fallback behavior for this PE. |
| Environment / cwd | S02 derives env from configured shell policy; Windows passes env_map and config cwd. Non-Windows/direct branches clear env before supplying their map. | Do not transfer that branch's env_clear proof to Windows internals. Six-name Windows replacement and startup discovery remain U. |
| Helper / executable path | The command is a Vec<String>; RF017 helper lookup can fall back to a basename. | Exact program resolution, signed helper closure and race protection are U. No PATH or copy fallback admitted. |
| Timeout / Job | S02 supplies timeout_ms=None, tty=false and stdin_open=true. S07 exports cancellation/session APIs, but those internals were not read. | No finite wrapper timeout or whole-tree stop≤5s proof. An optional library control is not a CLI guarantee. |
| Pipes / exit | Windows forwards session stdio then exits with the returned code. | Native pipe ownership, EOF, raw-byte caps, failure cleanup and descendant lifetime remain U. |
| Public stability | S08 documents generator examples and setup RPC; S02 is an upstream debug_sandbox module. | No stable arbitrary-command Windows wrapper contract for external integrations was established. Public Rust symbols do not fill this gap. |

S07 also contains a separate legacy capture implementation. Its timeout,
cancellation or Job code must not be attributed to the elevated session used by
S02 without tracing that path. No path was executed, linked, compiled or tested.

## NOL-07 — Existing setup revision and host boundary

RF017 observed the two vendor accounts and selected matching firewall rules.
Those observations are historical, not current effective-isolation evidence.
S07 reexports setup version and marker-checking functions; the source setup
version recorded by RF017 was 5. Names, enabled status and rule counts carry no
authenticated link to that version or to this exact PE.

`setupRevision=null`; `accountPolicyBinding=null`.
No safe public, non-executing attestation connecting existing accounts/rules to
the exact setup revision was established. Real CODEX_HOME, markers, credentials,
profiles, config/history/logs and secrets were not read. No login, impersonation,
effective-access or network fixture ran. Existing identities/policies were not
adopted, reset or modified. Docker is outside this task; it was not queried,
started, repaired or used as a dependency.

## NOL-08 — All fifteen entry gates and existing decisions

Every row remains closed. Partial source/O evidence is not an entry-gate PASS.

| NSP gate | Current evidence / blocker | Decision, blocker and CAS mapping |
| --- | --- | --- |
| argv | General generator example only; outer CLI and installed parser U. | D01, B01/B02; CAS-R/T02–04,10,27–29. |
| artifact | Exact current bytes observed; full protected launch identity U. | D01, B01; CAS-R/T02–04. |
| trust | Dated RF015 trust; no signed source/build attestation. | D01, B01; CAS-R/T02–04,27. |
| closure | Main startup, unified_exec/token/process/runner and embedded bundle closure U. | D01/D04, B02/B05; CAS-R/T02–04,07,15. |
| principal | Exact effective offline token and setup revision U. | D03/D04/D06, B04/B05/B07; CAS-R/T05–08,17,23. |
| environment | Config-derived env, Windows replacement U. | D03/D06, B04/B07; CAS-R/T04–05,17,23. |
| discovery | Wrapper config before child; conditional auth bootstrap. | D03/D06, B04/B07; CAS-R/T04–05,17,23. |
| filesystem | Profile request is not effective strict-read/write enforcement. | D04/D06, B05/B07; CAS-R/T06–08,19,23. |
| network | Preserved proxy policy, no complete pre-start deny proof. | D04/D06, B05/B07; CAS-R/T07–08,17,23–24. |
| process_tree | No complete elevated session/Job/alternate-user stop trace. | D04/D06, B05/B07; CAS-R/T13,15,19,24. |
| budgets | No wrapper timeout; decompression/output/resource bounds U. | D02/D04, B03/B05/B08; CAS-R/T13–16,19. |
| output | Precomputed exporter body known; actual manifest/byte counts U. | D01/D04, B02/B05; CAS-R/T10,19,27–29. |
| host | No shared-state mutation/rollback qualification or fresh workload proof. | D04/D06, B05/B07; CAS-R/T07,19,23–24. |
| authority | This is read-only research; no setup or probe grant. | D06/D07, B07/B09; CAS-R/T20–29. |
| review | No independent real probe/output acceptance. | D07, B09; CAS-R/T27–29. |

RF017's setup impact/rollback gaps remain separate. Even resolving the PE build
alone would not remove the outer-wrapper discovery or timeout gaps. No registry
v5 reconciliation or runtime admission follows from source understanding.

## NOL-09 — Disposition and one next task

Static verification passed: the new RF018 ledger/report validator, RF017
isolation validator and six existing qualification/CAS/delivery/artifact/source/
standard-policy validators; eight negative accounting/readiness cases; four
provenance-review and five standard-policy regression tests. Historical review
bindings, profile/schema/registry v5, RF016 fixture and RF017 ledger remain
unchanged. Python syntax, local links/public-path checks and Git whitespace
checks passed. No custom cryptographic verifier or system sandbox test ran.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; actualProbeAuthorized=false; actualProbeStarted=false;
setupAuthorized=false; setupStarted=false; outerLaunchReady=false.

No Codex, setup helper, command-runner, App Server, generator, model, Worker,
Hermes/OpenShell or downloaded code ran. No account, ACL, firewall, registry,
service, task, UAC/admin, reboot, install, package copy/move, PATH/profile,
WSL/Docker lifecycle, runtime/API/DB or production change occurred. No push or
deployment. The request ledger and report are research artifacts only.

The current wrapper is blocked for the stated first-process/no-discovery
contract. Retain the official native sandbox for separately qualified command
containment; do not build a custom outer sandbox or weaken NSP. The simpler
publisher-provided JSON data route is a recommendation, not an accepted artifact.

Exactly one recommended next atomic task: **RF-CODEX-019 — read-only qualification
of an official precomputed App Server JSON Schema bundle and its binding to the
exact installed native build.** Determine whether the publisher provides a
complete version-bound bundle/manifest that can satisfy CAS/CDL without running
the generator; establish the signed PE-to-build/source relation or retain the
precise missing provenance. No payload acquisition, extraction, setup, generator
or adapter execution is implicit. RF-CODEX-019 was not started.
