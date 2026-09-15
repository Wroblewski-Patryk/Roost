# Native schema setup and outer-isolation admission v1

RF-CODEX-021, 2026-09-15.
Verdict: **NATIVE-SCHEMA-SETUP-ADMISSION-BLOCKED**.

The official runner can derive a restricted child token from its sandbox-user
process, but no supported, build-bound external launch contract or complete
bounded setup/rollback delta is established for this Appx. Starting an
unconfined Codex wrapper is not an admissible substitute. Neither setup nor
probe is ready for approval; this packet does not implement a new sandbox.

[ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md),
[RF015 identity](direct-codex-native-artifact-preflight-v1.md),
[RF016 contract](direct-codex-native-schema-probe-v1.md) /
[acceptance](direct-codex-native-schema-probe-acceptance-v1.md),
[RF017 isolation](direct-codex-windows-standard-isolation-v1.md),
[RF018 wrapper](direct-codex-native-outer-launch-v1.md),
[RF019 schema](direct-codex-precomputed-schema-v1.md) and
[RF020 metadata closure](direct-codex-windows-build-binding-v1.md) remain applicable.
The publisher-metadata route stays closed; no new build-binding search occurred.

## NSA-01 — Sources and current observations

Existing RF017 setup.rs, RF018 library/export/docs and RF019–020 evidence were
reused. New sources are at commit 6b9826e3aa83b1a5947db50f4332cb9c65f1b340,
not asserted to be the installed helpers' source.
[Closed ledger](codex-native-setup-admission-source-ledger-v1.json):
**8 requests / 185,705 body bytes**, all complete HTTP 200, zero retries/redirects.
Ceilings: 8 requests, 1,048,576 aggregate, 163,840/response, 20 seconds.
The existing capture persisted accounting before parsing. closed=true;
halted=false; closureReason=source_round_complete_no_more_requests.
No downloaded source was executed or persisted as executable code.

| ID | Official source | Body bytes / SHA-256 |
| --- | --- | --- |
| S01 | [Source directory](https://api.github.com/repos/openai/codex/contents/codex-rs/windows-sandbox-rs/src?ref=6b9826e3aa83b1a5947db50f4332cb9c65f1b340) | 62153 / `b47a246a8620daafc555fb1a6f8870548dbbc428d4e36b7ead03aaa869f345eb` |
| S02 | [Helper source tree](https://api.github.com/repos/openai/codex/git/trees/2b1f7821502b139be41206f73035015a4dece812?recursive=1) | 4461 / `6ea54d8600f69033caaaf0fa508f3705b246f9b403605880b00b3b31fe6fcd86` |
| S03 | [Elevated source tree](https://api.github.com/repos/openai/codex/git/trees/e6a24d8cd50aa1e487e2b5c73f72cb8e190066fd?recursive=1) | 1042 / `37b2519370c9704874c86492cf8d6369a24a89c5005dfa5a81ab30a3efe05285` |
| S04 | [Setup implementation](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/bin/setup_main/win.rs) | 52043 / `3eaa52f7c6ca9c86c37d8c9f31378631db56205d01708ee18e44b5815c7a4dd2` |
| S05 | [Runner implementation](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs) | 25675 / `5d5ac13c90ad8c6825cd33831935618eb4b0568222df9f35a3b00d089264743f` |
| S06 | [Runner client](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs) | 19333 / `7299e172087b80e84c1a11a113ca3f7ed1fcc6a79d42ae8db059184fc13d482b` |
| S07 | [IPC schema](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs) | 9312 / `ae0d979b8c6cf4ef91a2698ecc189b5c71475699a4a6fc26db04ffbbd65863d5` |
| S08 | [Process creation](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/process.rs) | 11686 / `ab8a804dbd6589de60cd79fad6e759e93d6440ef7d99d24c54da7c2c77548f20` |

Fresh read-only registration remains OpenAI.Codex 26.908.4834.0, x64, Ok.
Two selected files under the registered package's app/resources were rehashed:

| File | Bytes | SHA-256 |
| --- | --- | --- |
| codex-windows-sandbox-setup.exe | 15,467,312 | `f10e0a6d40c3bce4e65fd0a5c2550965b6e709c330711d7be5c918aa41579546` |
| codex-command-runner.exe | 8,218,928 | `dfaa6a729dfcac4a1bfcdcb47cf42d1b3662848e31cbd8420ecc3eabbb014a31` |

Both match RF015; its dated selected-member signature/catalog policy is reused,
not a fresh trust check. The target remains exact codex.exe, 297,858,352 bytes,
SHA-256 081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575,
freshly hashed by RF020. No helper/source mapping is inferred from filenames.

Both known vendor offline/online accounts exist and are enabled. The same bounded
ActiveStore display-name selector returns 16 enabled rules: 12 inbound allows,
one outbound allow, three outbound blocks. All three blocks mention the offline
SID and Any program; protocols TCP/UDP/Any, TCP remote ports restricted, other two
Any. Account/rule counts and those projected properties match RF017. This is not
full per-object identity, effective WFP/filter coverage or a no-op setup proof.
No password, credential store, profile, setup marker or private state was read.
All existing objects remain shared vendor state, not task-owned.

## NSA-02 — Setup contract and persistent effects

S04 accepts exactly one argument after argv[0]: base64-encoded JSON Payload.
It checks version against SETUP_VERSION=5 before dispatching Full,
InteractiveProvision, ProvisionOnly or ReadAclsOnly. Payload names include
offline/online usernames, codex_home, command_cwd, read/write/deny roots,
proxy_ports, allow_local_binding, optional otel, real_user, mode and refresh_only.
This is a **source-private candidate**, not a supported public command or an
accepted payload for the installed helper. setupArgv=null; setupRevision=null.

RF017 setup.rs selects the fixed vendor offline/online account names and uses
runas/ShellExecuteExW when elevation is needed. It waits INFINITE after UAC;
its non-elevated .status()/wait path is also unbounded. S04 additionally acquires
the provisioning mutex with INFINITE. User cancellation is reported, not a
transactional undo. Helper lookup has a basename fallback. No bound-approved
helper path/argv/timeout descriptor exists.

S04's observed sequence and limits:

| Operation | Source evidence / admission consequence |
| --- | --- |
| Accounts and group | provision_sandbox_users and resolve_sandbox_users_group_sid; existing disabled accounts trigger a repair branch that can create disabled replacements and later re-enable accounts. Exact group membership, logon rights, password reuse/rotation and idempotency are delegated to uninspected sandbox_users.rs; not qualified. |
| Private state | Creates sandbox directories, writes setup logs/errors, prepares a marker and commits it after the selected routine returns. RF017 defines .sandbox/.sandbox-bin/.sandbox-secrets and DPAPI-protected password records. Neither marker contents nor current credentials were inspected. A marker is not full transactional completion proof. |
| Network | Configures offline proxy allowlist plus outbound block, then calls install_wfp_filters. In ordinary provisioning, the stored WFP Result is not propagated; repair of disabled accounts propagates it before re-enabling. Strict all-route deny cannot be inferred from setup success. Exact filter/rule exceptions remain unqualified. |
| ACLs | Persistent deny-read synchronization occurs synchronously before command start. Nonempty read roots can start a detached ReadAclsOnly helper; write grants run in scoped threads. Missing deny-write carveouts may be created as directories. Private directories get protected ACLs. These are persistent/shared effects, not only scratch writes. |
| Additional effects | hide_newly_created_users and runtime-path readability helpers are called; their full registry/profile/ACL footprint is not established in this capture. Telemetry settings exist in the payload; a no-network/no-telemetry setup claim is unproved. |
| Refresh/rollback | Refresh skips provisioning but can change ACLs/readability and reports errors. A setup error records failure; no per-object reverse transaction was established. The library exports cleanup, but uninstall implementation was not read and is not an accepted task rollback. |
| Reboot/admin | Account, system-right and firewall/ACL provisioning requires a separately authorized administrative operation; runas is an explicit source path. No reboot call is visible in the inspected entrypoint, but complete no-reboot/feature/service impact is unproved through its callees. No admin/UAC/reboot operation occurred. |

The bounded source inventory identified but did not fetch account, firewall,
identity/token, framing implementation, helper materialization, cleanup, Job and
desktop internals. Their exact effects remain unknown, not assumed absent.
The eight-request source round is closed; these gaps are not a proposal for
another open-ended research task.

## NSA-03 — Runner transport and child creation

S06 spawn_runner_transport is pub(crate); RF018 lib.rs exposes some Rust
functions/types but no stable external ABI/support promise was established.
The inspected official docs expose App Server setup RPC, requiring an App Server
session, not a pre-start generator host API. Do not compile a custom host or
invoke this private runner transport as a new Roost interface.

| Boundary | Observed source behavior | Remaining gap |
| --- | --- | --- |
| Runner launch | S06 uses CreateProcessWithLogonW with supplied SandboxCreds, logon flags 0, exact string from find_runner_exe, hidden window, cwd and null environment pointer. No CREATE_SUSPENDED/parent-owned Job assignment is visible there; the handle closes after handshake. | Offline identity must be selected by upstream credential logic, not a SpawnRequest switch. Credential selection/DPAPI and full helper lookup are uninspected; supplied credentials are forbidden in this task. No six-name runner environment or whole-tree owner proof. |
| IPC | S05 parses --pipe-in= and --pipe-out=, connects two named pipes and expects SpawnRequest first. S07 is length-prefixed JSON IPC_PROTOCOL_VERSION=6, snake_case message type plus version and payload. | Not stdin JSON-RPC or a public protocol. Actual prefix width/endianness/frame limit lives in uninspected framed_io.rs; no executable encoder or request is provided. Named-pipe security and helper/source binding remain required. |
| Request schema | command vector, cwd, env map, permission_profile, workspace_roots, codex_home, real_codex_home, cap_sids, optional network_proxy_restricting_sid and timeout_ms, tty, stdin_open, private-desktop selection/name. | A version field does not establish compatibility with the installed PE or public support. No accepted request, credential references or real homes supplied. |
| Before child | S05 hides the sandbox user's profile directory, resolves token mode/capabilities, restricts its current token, adjusts null-device access, may create/fall back from a cwd junction, and opens a parent-owned private desktop. | These helper-side profile/ACL/log/junction operations have their own footprint. Full groups/privileges/integrity and effective access are unknown. No proof of zero discovery or network across callees. |
| Child executable/env | S08 quotes the command vector and builds a new sorted environment block from req.env. CreateProcessAsUserW receives null lpApplicationName and a command line; no shell is inserted at this layer. | Absolute argv[0] is representable, but no enforced absolute-only executable selection or path/alias lock is shown. No six-key whitelist, collision/NUL validation or upstream proxy-removal proof follows from the map. |
| Child Job/stdio | S08 creates a Job and supplies it through startup attributes before CreateProcessAsUserW; pipe path supplies an inherited-handle list, explicit env/cwd and hidden separate stdio. | This is a candidate for atomic creation-time Job assignment, not the requested suspended→assign→resume sequence. Its independently proved equivalent and Job limits/no-breakaway implementation were not inspected or tested. Do not claim a race merely because CREATE_SUSPENDED is absent. |
| Time/exit | S06 has 15-second pipe/ready deadlines. S05 casts optional timeout_ms u64 to u32, uses INFINITE if absent, and on timeout attempts termination then waits 5,000 ms on the root. Exit frames contain exit_code and timed_out; process exits with that code. | No overall original deadline/output quota or confirmed all-descendant stop. Large values can narrow; RF018 actually supplied None. |
| Descendants | On non-timeout root exit S05 calls preserve_descendants; output-reader joins can then wait for open descendant pipes. | Incompatible with assuming clean whole-tree completion. A root wait or Exit frame is insufficient; protocol termination is not an independent crash watchdog. |

Messages include SpawnRequest/SpawnReady, Stdin/CloseStdin, Output with base64
bytes, Resize, Terminate, Exit and Error. No protocol exchange ran.
The runner source has no direct config/auth loader call in the shown main/spawn
body, but it uses home/log/profile/capability helpers; that is not proof of
startup purity. No direct external-network call is shown at this layer; named
pipes and uninspected callees prevent a whole-program no-network conclusion.

## NSA-04 — First-instruction admission and setup delta

A child can conceptually start under the runner's already restricted token.
The current path does not establish all preconditions for that token, network,
filesystem and the initial helper itself. RF018's config-before-confinement,
timeout=None, helper basename fallback and Preserve proxy gaps are not solved by
calling the private protocol. A new unrestricted outer Codex remains inadmissible.

Inert official generator candidate from RF018's retained App Server docs:
["app-server","generate-json-schema","--out","<output>"]. No TS run is needed
unless JSON completeness later fails and a new contract is reviewed.
generatorArgv=null; runnerArgv=null; sourceBuildBinding=null.
This candidate is not installed-build-qualified. RF020's closed metadata result
also leaves NSP-R01's build-matched argv prerequisite unresolved; changing the
isolation host alone cannot silently waive that requirement.

The following is a **blocked delta worksheet**, not an exact approved mutation
manifest. mutationManifest=null; rollbackPlan=null; setupMaxDurationSeconds=null.

| Object / owner | Proposed create/update/no-op/remove classification | Required preimage, rollback and test |
| --- | --- | --- |
| Two vendor accounts; vendor/operator owned | Exist: no create/remove/reset authorized. Future UPDATE vs NO-OP unknown. | Privately bind identities, groups, rights, enabled state and vendor-supported credential-preserving recovery. Reject shared-state conflict; no password/profile export. |
| Vendor group/logon rights; shared | CREATE/UPDATE/NO-OP unknown; REMOVE forbidden. | Exact membership/right delta and concurrency-protected inverse; account/rights callees unqualified. |
| Sixteen selected firewall rules and unenumerated WFP policy; shared | No approved change; UPDATE/NO-OP cannot be decided from counts. | Exact object/filter keys, conditions, ordering and preimages, all-route deny tests. No blanket firewall restore, deletion or isolation claim from display names. |
| Read/write/deny and runtime/private-state ACLs; mixed/shared | CREATE/UPDATE/NO-OP per path unknown. No broad REMOVE. | Sealed root/object identities, before/after DACLs and inverse ACE changes only where owned; synthetic outside-root/alias denial and partial-failure tests. |
| Markers, DPAPI records, logs and helper state; vendor owned | CREATE/UPDATE/NO-OP unknown; no copy, deletion or credential rotation. | Official secret-preserving backup/recovery procedure, marker/credential consistency and interruption tests; no real-profile backup into artifacts. |
| Detached ACL helper, desktop/junction/null-device side effects | Possible CREATE/UPDATE; cleanup/REMOVE ownership unproved. | Bound all actors and side effects before first instruction; cancellation/crash checks and exact cleanup handles. Existing shared objects cannot be claimed by this task. |
| New probe scratch; future task owned only | CREATE then scoped REMOVE only after a separate grant/confirmed stop. | Exclusive root, quotas, pre/post inventory and no reparse traversal; no existing directory reuse. |
| Registry/services/tasks/features/reboot | No action authorized; source-wide empty delta not verified. | Must positively establish absent changes or reject setup. No permission inferred from a no-reboot preference. |

A future thin supervisor may enforce a finite process deadline/Job and collect
bounded results without changing vendor setup semantics. Killing a process does
not undo persistent account/ACL/firewall/credential changes, cancel arbitrary UAC
broker activity or adopt a detached/elevated child automatically. Unknown rollback
or unowned children still block setup. No supervisor was implemented or run.

## NSA-05 — Independent packet and gate mapping

Independent review has not run; this is its input checklist, not acceptance.

| Stage | Required evidence and separate authority |
| --- | --- |
| Before setup | Supported build-bound interface, exact selected helpers/trust/closure, per-object mutation manifest and vendor ownership, no-reboot proof, private preimages/recovery without secrets in artifacts, finite setup/UAC/whole-tree deadline, rollback failure policy and reviewer. No setup grant until these exist. |
| After setup | Exact delta receipt, marker/account consistency without credential disclosure, effective token/ACL/network/desktop policy, all actors stopped and no shared-workload drift. Failure preserves ownership and blocks automatic retry; no automatic probe. |
| Before probe | Separate exact artifact/argv/input/deadline grant, six-name environment, first-instruction isolation and closed helper/loader inventory, no proxy/discovery, complete Job/resource/output/stop evidence and all NSP-R/T01–17 at their required level. No source-private transport substitution. |

| Gate | Current missing evidence / mapping |
| --- | --- |
| argv | Exact installed-build supported setup/runner/generator commands; B01/B02, D01, NSP01, CAS02–04. |
| artifact | Hashes observed, protected resolve-to-spawn binding missing; B01, D01, NSP02, CAS02–03. |
| trust | Dated selected-file policy only; complete accepted closure missing; B01, D01, NSP02, CAS02–03. |
| closure | Dynamic helpers/library/API-set paths and detached actors unclosed; B01/B02, D01/D06, NSP02/07, CAS03/15/23. |
| principal | Offline selection and effective groups/rights/privileges/integrity unknown; B04/B05/B07, D03/D04/D06, NSP04–06, CAS05–08. |
| environment | Child map exists, runner and upstream six-name/no-proxy guarantees absent; B04/B07, D03/D06, NSP03, CAS04–08. |
| discovery | Outer configuration plus runner profile/log/capability side effects; B04/B07, D03/D06, NSP04, CAS04–08/17. |
| filesystem | Exact allow/deny roots, Appx/system reads and alternate API/alias denial unproved; B05/B07, D04/D06, NSP06/09, CAS06–08/19/23. |
| network | Accounts/rules not effective IPv4/IPv6/DNS/loopback/broker/descendant denial; B05/B07, D04/D06, NSP05, CAS07–08/17/23. |
| process_tree | Creation-time Job candidate, unqualified outer ownership and preserve_descendants; B05/B07, D04/D06, NSP07/10, CAS13/15/19/23–24. |
| budgets | INFINITE paths, narrowing timeout, no complete hard quotas/whole-tree stop; B05/B07, D04/D06, NSP08, CAS13–16/19. |
| output | No schema, terminal/manifest/semantic completeness unverified; B02, D01, NSP09–10, CAS10/13–16/27–29. |
| host | Shared account/rule/ACL mutation, rollback and continuity unresolved; B05/B07, D04/D06, NSP12–13, CAS19/23–25. |
| authority | No setup or probe grant; unknown delta cannot be approved into readiness; NSP15, CAS20–29. |
| review | No independent admission or runtime proof; NSP16, CAS27–29. |

All fifteen NSP entry gates remain closed. Existing limits, including 256 output
files and stop≤5 seconds, are unchanged. No setup/runner/probe privilege is granted.

## NSA-06 — Architecture decision and owner question

No qualified standard outer path is available under the current selected-package
contract. This closes the current shared-sandbox setup-admission attempt, not a
claim that every possible official implementation is impossible.

Recommendation: decide on a separate disposable Windows isolation boundary and a
versioned schema-only qualification contract instead of adopting the private
runner protocol or modifying shared Desktop sandbox state. That decision must
address exact artifact placement and bounded argv discovery as well as isolation;
it is not approval to copy/install/execute anything, enable a Windows feature or
relax the current NSP. Continuing to block this host is the alternative.

Administrative setup on this shared host would require explicit owner consent
for persistent account/group/right, firewall/WFP, ACL/private-state and possible
helper side effects. Their exact delta and rollback are not known, so a fully
informed UAC/setup approval question cannot yet be prepared honestly. Do not ask
for a blanket approval or launch UAC. One **draft architecture question** for the
coordinator, not submitted as a setup grant:

> Czy wybrać osobne, jednorazowe środowisko Windows i osobny kontrakt probe
> (rekomendowane), zamiast integracji prywatnego runnera oraz zmian współdzielonych
> kont, praw, ACL, firewall/WFP i stanu sandboxu na tym hoście? Decyzja dotyczy
> architektury; nie zezwala na instalację, UAC, kopiowanie pakietu ani uruchomienie.

Exactly one recommended next atomic task: **RF-CODEX-022 — owner architecture
decision for a disposable Windows boundary and versioned schema-probe contract.**
Record acceptance/rejection and impact on ADR-003/NSP, including the unresolved
build-bound argv prerequisite; preserve exact artifact identity and false gates.
No further general metadata research, private-protocol integration, environment
provisioning or probe execution is implicit. RF-CODEX-022 was not started.

setupContractReady=false; setupAuthorized=false; setupStarted=false;
outerLaunchReady=false; actualProbeAuthorized=false; actualProbeStarted=false;
implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false.

No setup/helper/Codex/App Server/generator/model/Worker/Hermes/OpenShell code ran.
No credential/profile/config/history/log/private-state read, host mutation,
payload/archive download, extraction/copy/chmod, installation, Docker query/action,
WSL lifecycle, runtime/API/DB/registry v5/production change, push or deployment.

Verification: nine existing static validators passed, including the extended
[Windows isolation validator](../../scripts/validate_direct_codex_windows_isolation.py).
Eight in-memory negative cases rejected ledger reopening/budget/count drift,
setup promotion, fabricated mutation/rollback readiness, omitted descendant
preservation and an implicitly started next task. The existing 15 metadata,
four RF012 and five RF013 tests passed, as did RF012 static review/ledger/bindings.
Profile/schema seals remain unchanged. No system fixture, custom cryptographic
verifier, effective sandbox/probe test or independent admission review ran.
