# Windows standard isolation qualification v1

RF-CODEX-017, 2026-09-15. Decision candidate version **1**.
Verdict: **WINDOWS-STANDARD-ISOLATION-BLOCKED**.
Follow-up: [RF018 outer-launch qualification](direct-codex-native-outer-launch-v1.md)
finds an official source command wrapper with configuration before its child
boundary and no supplied Windows timeout. First-process protection and installed
build binding remain BLOCKED. The RF018 handoff below is historical; the current
RF019 proposal is owned by that follow-up report.
The preferred dependency for further qualification is the official Codex native
`elevated` command sandbox. No supported, build-bound way to use it as the outer
boundary of the schema generator has yet been established. Neither an admitted
setup contract nor an already effective no-setup route exists in this evidence.
This is a qualification failure, not a claim that Windows isolation is impossible.

Authority remains [ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md).
[RF014 platform research](direct-codex-platform-selection-v1.md),
[RF015 native preflight](direct-codex-native-artifact-preflight-v1.md), the
[RF016 schema contract](direct-codex-native-schema-probe-v1.md) and
[acceptance matrix](direct-codex-native-schema-probe-acceptance-v1.md) remain
normative or dated evidence in their stated roles. No runtime policy is changed.

## WSI-01 — Alternatives and decision

| Variant | Assessment for the exact NSP boundary | Disposition |
| --- | --- | --- |
| A: official Codex native elevated sandbox | Maintained vendor dependency with lower-privilege command execution, filesystem policy and offline-principal firewall. Existing installed helper bytes are identified. External generator launch, strict reads, full network coverage, setup effects and rollback remain unqualified. | Sole preferred dependency to investigate; not ready for setup or execution. |
| B: restricted token / AppContainer / low-privilege principal, ACL, Job and Firewall/WFP | Standard Windows primitives are real, but composing them into a launcher, policy compiler, account manager and recovery system would be a new sandbox implementation. No already supported composition for this exact generator was qualified. | Do not implement a Roost sandbox. Use these primitives to assess A, not as an automatic replacement. |
| C: Windows Sandbox / Hyper-V | Hypervisor presence alone does not establish Windows Sandbox availability. Its conventional executable was absent; supported feature/configuration, exact package visibility and lifecycle/stop behavior were not qualified. No evidence makes a VM necessary for native Codex. | Not selected. No feature enablement, VM, package copy, reboot or lifecycle action. |
| D: no demonstrated sufficient path without setup | Existing accounts/rules do not prove the complete policy or a supported pre-initialization launch. New setup would itself affect shared host resources and needs a complete mutation/rollback contract. | Current result is BLOCKED; do not interpret existing components as NO-SETUP-READY. |

The thin Worker may eventually supply an accepted configuration, validate native
evidence and own the Job/deadline. It must not reproduce vendor token/ACL/firewall
logic, patch helpers, create a security broker, or silently choose unelevated,
OpenShell, WSL or Docker. A vendor mechanism that cannot satisfy NSP stays blocked.

## WSI-02 — Sources and bounded capture

F denotes a source statement; O a local read-only observation; R a required
future condition; U an unresolved field. General source facts are not evidence
that the installed executable has the same build or behavior.

The local RF001 source manifest and RF014 report supplied the earlier official
Windows snapshot hash. Original bodies were not part of those retained files.
S01 freshly matches that hash. S04 is pinned to the official repository commit
previously identified by RF011, **not** mapped to this installed Windows build.
Only S03's selected directory listing and S04 were read from that source tree;
helper internals and transitive source closure were not fetched.

| ID | Exact official source | Status / bytes / SHA-256 |
| --- | --- | --- |
| S01 | [OpenAI Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox.md) | 200 / 11,206 / `294f0c8de1d2201ba562ccb88367a21bce2f2472f65f4dc8486b7c0b2e3f3efc` |
| S02 | [Requested crate README](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/README.md) | 404 / 14 / `d5558cd419c8d46bdc958064cb97f963d1ea793866414c025906ec15033512ed` |
| S03 | [Official crate directory listing](https://api.github.com/repos/openai/codex/contents/codex-rs/windows-sandbox-rs?ref=6b9826e3aa83b1a5947db50f4332cb9c65f1b340) | 200 / 7,268 / `496f40bb0136ebe2721553d2183c8a8b3b18314ab2f5b1727a401bdaff819006` |
| S04 | [Official setup orchestrator source](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/setup.rs) | 200 / 90,820 / `14ca824808b74a43f5aa8cd64f5804c31f97720ea5a4470debdf2a739de02bc4` |
| S05 | [Microsoft AppContainer isolation](https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation) | 200 / 5,325 / `dedac3be2cf79b0bd12a6992ca707b4db33037f92670ef96ec599479d24d0bb4` |
| S06 | [Microsoft CreateRestrictedToken](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-createrestrictedtoken) | 200 / 14,159 / `52c554e392f151d359a87a3b56340d67f576c451dd993cb486f28e3992c67b0f` |
| S07 | [Microsoft WFP filtering conditions](https://learn.microsoft.com/en-us/windows/win32/fwp/filtering-condition-identifiers-) | 200 / 37,266 / `f08d37d292b672779f01a381fc00ac61f1b125d1e30435cebb43c6e53bcae57f` |
| S08 | [Requested Windows Sandbox overview](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview) | 301 / 0 / `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

[Request ledger](codex-windows-isolation-source-ledger-v1.json): closed at
8 requests / 166,058 response-body bytes; six 200s, one 404, one unfollowed 301.
Ceilings: 8 requests, 786,432 aggregate bytes, 131,072 per response, 20 seconds
per request, zero retries. Redirect following was manual-only; none was followed.
The last redirect was denied by the request's exact-URL policy. No ninth request,
payload, dependency or executable download. Bodies were read in memory; the
repository retains hashes, references and this analysis, not downloaded code.
The existing bounded metadata capture implementation was reused with this task's
budget and separate ledger; previous ledgers were not reopened.

## WSI-03 — Local inventory and proof limits

Read-only observations on 2026-09-15:

| Item | Observation | Does not establish |
| --- | --- | --- |
| Host | Windows version 10.0.26200, build 26200, x64; current process not elevated. | Supported effective sandbox policy or admin authority. |
| Package | One registered OpenAI.Codex 26.908.4834.0, status Ok; the three selected files below have no reparse attribute. | Full package trust, internal build mapping, effective access or race protection. |
| Native image | `app/resources/codex.exe`, 297,858,352 bytes; SHA-256 `081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575`. | Permission to launch. |
| Runner helper | `app/resources/codex-command-runner.exe`, 8,218,928 bytes; SHA-256 `dfaa6a729dfcac4a1bfcdcb47cf42d1b3662848e31cbd8420ecc3eabbb014a31`. | Public supported external launch interface. |
| Setup helper | `app/resources/codex-windows-sandbox-setup.exe`, 15,467,312 bytes; SHA-256 `f10e0a6d40c3bce4e65fd0a5c2550965b6e709c330711d7be5c918aa41579546`. | Complete mutation list or permission to execute. |
| Standard services | BFE and MpsSvc running/automatic; vmcompute running/manual. Hypervisor present; conventional WindowsSandbox executable absent. | Effective firewall, feature installation, VM readiness or workload health. |
| Vendor principals | Both exact source-named offline/online local accounts exist and are enabled. No credentials or profile data read. | Ownership by this task, setup version, logon rights, token restrictions or safe reuse. |
| Selected firewall rules | Display-name vendor selector, cap 32: 16 rules returned. Three enabled outbound block rules reference the offline SID and any program; their protocols are TCP, UDP and Any. TCP remote ports are restricted rather than Any. | Complete filter closure, exception-free blocking, actual DNS/loopback denial or principal inheritance. |

The other selected entries are one outbound allow and twelve inbound program
allow entries. Their existence does not show whether they apply to a proposed
probe. Names, paths, SIDs, port values and raw filters are not public evidence.
The selector is not an exhaustive WFP inventory; filter addresses, weights,
exceptions and service-mediated traffic remain unqualified. Running firewall
services and matching rule text cannot become an effective-access PASS.

All three hashes match RF015. Its accepted offline Windows signature/catalog
checks remain dated evidence; no package trust API or executable was run here.
The existing sandbox's private state was deliberately not inspected. Do not
reset or adopt these accounts/rules just because their vendor names match.
Docker was not queried or operated in RF017; the task reports it unavailable,
and RF016's two failed reads remain historical. Current workload continuity is
unknown; this research does not depend on a healthy Engine.

## WSI-04 — Official native support contract

F, S01: Windows 11 is recommended. Native operation does not require WSL/VM.
Preferred elevated mode uses lower-privilege users, ACL boundaries, firewall and
local policy; provisioning needs administrator approval and may be blocked by
enterprise account, firewall or logon-right policy. Unelevated mode derives a
restricted current-user token and uses weaker environment-based offline controls.
The documented private desktop is enabled by default. The documented managed
policy can restrict implementations to elevated only. Documentation also names
winget as an environment assumption; that does not authorize installing it.

F, S04 (line references to the hashed source):

- 50–76, 185–203, 420–480: setup version 5, fixed offline/online users, persistent
  sandbox/helper/state locations and DPAPI-protected credential records.
- 532–612, 1176–1256: full-read defaults include platform/profile roots; restricted
  overrides exist but retain helper roots and additional root filtering.
- 701–773: offline identity depends on policy; proxy ports/local binding are
  explicit settings, also derived from environment. Offline is not synonymous
  with no exceptions.
- 854–865, 920–1035: bundled-helper lookup has a basename fallback; elevation
  uses ShellExecuteEx/runas and an unbounded wait. Refresh also invokes a helper.
- 1049–1173: provisioning and refresh have separate paths; provisioning payload
  has empty read/write lists and is not the final command-access policy.

These are source observations only. They neither establish installed setup
version 5 nor a stable public helper API. Full helper account/firewall/ACL
implementation, uninstall behavior and rollback were not in the captured source.

## WSI-05 — Boundary before initialization

R: NSP-R01/R03/R04 require an already confined initial generator process, before
auth/config/plugin/skill/MCP discovery. S01 describes sandboxed commands; S04
orchestrates provisioning/policy refresh. Neither establishes a supported way to
start this exact standalone schema generator under that boundary. It is unsafe
to infer that an App Server setting wraps its own process or all CLI subcommands.

`generatorArgv=null`; `sourceBuildBinding=null`; `sandboxLauncherArgv=null`.
No guessed helper arguments, help/version invocation, base64 payload reproduction
or App Server setup RPC is an admitted substitute. The synthetic six-variable
environment from NSP is necessary but cannot redirect all Windows account APIs.
Existing vendor accounts do not prove no discovery before spawn. Any supported
route needing real-profile discovery, helper materialization outside the allowed
inventory or unrestricted initialization fails this profile.

Provisioning is a separate trusted, effect-bearing host operation. It cannot run
inside the no-model schema attempt as an implicit repair, nor widen that attempt's
read/write roots. The source's service-related paths are not proof that installing
a Windows service is required or permitted. The exact entrypoint remains U.

## WSI-06 — Filesystem and effective access

R: the child may read the exact protected package and closed system-library
inventory and write only the one owned scratch root. It may not read real
profiles, repositories, other drives, control files or credentials. Strict source
overrides are promising, but enumerating allowed ACL entries is not proof that
the full effective token cannot access broader Everyone/Users/owner grants.

F, S06: restricting SID checks must pass in addition to normal enabled-SID checks;
WRITE_RESTRICTED limits those checks to writes. Therefore write-only restriction
cannot establish NSP read isolation. F, S05: AppContainer mediates file/registry,
credential, network and process access, but read access can be broader and the
container has its own storage. No empty-capability AppContainer launch, storage
closure or vendor support was proved for this executable.

R: later tests must use synthetic outside files, never real secrets. Cover allowed
package read/scratch write and denied outside read/write; canonical and lexical
paths; junctions, symlinks, hardlinks, ADS, device paths and handle inheritance;
registry/account APIs; writable parent replacement and post-check races. Include
existing broad grants, directories created after setup and denied targets reached
through aliases. A post-stop scanner is not an access boundary. If effective
denial requires changing unrelated host ACLs, stop for a new scoped decision.

No ACL, token or filesystem enforcement fixture ran in RF017. Existing accounts
were not logged into or impersonated, and no effective-access result is claimed.

## WSI-07 — Network and host-control access

F, S07: WFP exposes distinct application-path, local-user and AppContainer-SID
conditions, IPv4/IPv6 address/protocol conditions and separate RPC/remote-pipe
conditions. Their existence is not a complete deny policy. O: the three selected
vendor blocks reference the offline user, not just codex.exe. This can cover
same-principal helpers; it does not prove alternate-user or brokered operations.

R: before the first child instruction, the effective vendor boundary must deny
IPv4, IPv6, DNS including brokered resolution, TCP/UDP/raw sockets, loopback,
listening, inherited sockets and all proxy routes for every descendant. Require
no proxy ports and no local-binding exception, verified against effective policy.
Environment cleanup alone cannot enforce this. A program-only firewall selector
would leave separately named helpers unresolved; a shared-principal change can
affect normal desktop sessions. Prove the complete filters, not their names.

Local named pipes, ALPC/RPC, COM and host-control handles require object/token
access controls as well. IP blocking cannot be assumed to block local Docker or
other management APIs; S07's remote-pipe condition is not evidence for every local
pipe. Standard firewall/WFP changes need their own authority and persistence
assessment; no filters or sessions were created here. No socket/DNS/loopback
fixture ran. The eight official-source HTTPS reads are research traffic only,
not sandbox traffic or a network-isolation test.

## WSI-08 — Identity, helpers and process tree

R: a later receipt must bind the actual sandbox SID, enabled/deny-only groups,
removed privileges, integrity level, restricting SIDs or AppContainer SID and
capabilities, logon type, private desktop and inherited handles. Normal Worker
and generator operation must remain non-admin. Setup elevation is not permission
to run the generator elevated. These exact token properties are U; account
presence and S01's lower-privilege description are insufficient.

F, S06: removing maximum privileges retains SeChangeNotifyPrivilege; the API
warns against the default desktop and permits launching with a restricted token.
R: never substitute SANDBOX_INERT or a bypass policy. Apply the vendor's supported
mechanism; do not build a token launcher from this API description.

RF016 proved only one same-token parent/child Job fixture. Alternate-principal
runner launches, broker/service-created children, nested jobs, private desktop,
no breakaway and suspended assignment before initialization remain unqualified.
The entire actual tree must stay in the owned Job with protected handles and
confirmed abnormal stop within 5 seconds. Never kill by name or touch foreign
processes. S04's unbounded setup wait is not an accepted NSP deadline mechanism.

## WSI-09 — Host impact and coexistence

This table separates known effect classes from the exact mutation plan, which is
still U. It is not an authorization to apply any item.

| Surface | Evidence / impact to resolve before setup |
| --- | --- |
| Accounts, groups, rights | S01/S04 require vendor identity/policy provisioning. Both accounts already exist. Determine ownership, group/logon-right changes and whether provisioning resets existing state or credentials. Never delete, rotate or recreate them implicitly. |
| ACLs | S01/S04 require directory permission work. Enumerate exact targets, inheritance/deny/allow changes, old security descriptors and rollback; strict roots must not require grants across user profiles, repositories, drives or the installed package. |
| Firewall/WFP | Existing rules are shared host state. Identify exact rule/filter IDs, principal binding, exceptions, before/after semantics, persistence and removal ownership. No broad program or host-network block. |
| Private files | Vendor helper/control/state and protected credential storage require a separately approved installation location and budgets. Existing state is not task scratch and cannot be purged. No actual credentials in repository receipts. |
| Services, scheduled tasks, registry | Complete helper behavior was not captured: mutations or absence are U. Existing running services are not proposed installs. No new service/task/registry write may hide inside setup. |
| Defender, Hyper-V, reboot | No change is justified or authorized. Candidate native path does not require a VM per S01. Exact helper no-reboot/no-feature/no-Defender-change behavior still needs proof; any such requirement stops the proposed setup. |
| Laptop/workloads | One existing installation and one bounded attempt; no ports, listeners, Docker/WSL lifecycle, duplicate runtime or machine-wide firewall/ACL reset. Shared vendor principal/rule changes might disrupt desktop use and must be ruled out before approval. |

No resource ownership is acquired by this document. Preserve the existing
machine-wide single-writer/recovery rules and the
[host lifecycle contract](../operations/host-lifecycle-safety.md),
[recovery contract](agent-host-recovery.md) and
[security baseline](../security/security-baseline.md). This research causes no
setup-related workload change; current workload health itself was not verified.

## WSI-10 — Update, interruption and cleanup

R: bind package/helper hashes, source/policy versions, effective SID/rule/ACL
identities, trusted supervisor and original grant. Any update, missing state,
different proxy policy or ambiguous prior setup blocks launch, even with the
same display name or package version. Do not auto-refresh, reuse another home,
fall back, replay, or reset the original attempt deadline.

Require a vendor-supported bounded setup completion/failure contract and an
exact reversible mutation journal. Review interrupted steps and orphan accounts,
rules, ACL entries, helper materialization and protected state. Rollback removes
only newly created, provably owned effects and restores an old descriptor only
if it has not been concurrently changed. Existing identities/rules and unrelated
host settings must survive. A stale marker, account name or exit 0 cannot prove
completion; credential-containing state is never copied into public evidence.

The captured orchestrator checks setup completion and reports failure but does
not establish transactional rollback. Missing reversal or ownership proof blocks
setup. If interrupted, preserve bounded private evidence, reconcile, and obtain
fresh authority; do not turn cleanup into an automatic second attempt.

## WSI-11 — Minimal future authority packet, presently incomplete

This describes required fields, not a runnable payload or signed grant.
`setupAuthorized=false`; `setupStarted=false`; `setupContractReady=false`.

| Required field | Current value / acceptance condition |
| --- | --- |
| Artifact | Observed exact Appx identity and setup-helper SHA above; full signed package/closure and official build binding still required. No PATH fallback, helper copying or arbitrary executable selection. |
| Supported operation | `setupArgv=null`, `sandboxLauncherArgv=null`; official supported entrypoint, wire/argument schema and generator outer-boundary proof required. Source-private functions are not a public launch contract. |
| Authority | Named operator/grant, exact task/expiry and independent reviewer; administrator permission for the enumerated setup only, never the generator. No automatic UAC prompt now. |
| Mutations | Exact per-object before/after account/group/right, ACL, firewall/WFP and private-state changes; `mutationManifest=null`. Explicit empty lists for service/task/registry/Defender/feature changes must be verified, not assumed. |
| Shared-state safety | Existing vendor resources identified privately; proof of no reset, credential rotation or interference with normal desktop sessions and workloads. A conflict blocks instead of duplicating accounts. |
| Backup and rollback | `rollbackPlan=null`; protected preimages, per-object ownership/concurrency checks, step order and interrupted-step reversals. No broad firewall export/import reset or real-profile backup into task artifacts. |
| Limits and termination | Finite setup time/UAC wait/output/disk/process budget and owned stop, separate from NSP's generator budget. `setupMaxDurationSeconds=null`; unsupported bounded termination blocks approval. |
| No reboot | Mandatory no reboot, feature enablement or service restart. Unsupported no-reboot proof or a pending restart requirement denies setup. |
| Verification | System-only fixtures first under a separate precise grant; all positive/negative cases below, closed counters and private receipts. Actual Codex remains a later separate gate. |

The smallest admissible change is a proved vendor-supported configuration of
existing components, if available. It is not yet known whether zero host mutations
suffice. If changes are needed, approve only the exact delta after every U above
is resolved. An operator cannot approve an unknown mutation list into readiness.

## WSI-12 — Acceptance cases and existing mappings

All cases below are requirements for later qualification, **NOT RUN** in RF017.
No new sandbox implementation or independent acceptance review is claimed.

| Case | Positive / negative evidence required | Mapping |
| --- | --- | --- |
| WSI-T01 | Build-matched supported outer launcher applies identity/FS/network before initialization; absent binding or startup discovery denies before any candidate instruction. | NSP-R/T01–04,15; gates argv/artifact/trust/closure/environment/discovery/authority/review; D01/D06, B01/B02/B07; CAS-R/T02–05,17,23,27–29. |
| WSI-T02 | Exact package/library read and sole scratch write; outside read/write, broad grant, aliases/ADS/devices/registry/handles and races deny. | NSP-R/T06,09; gates principal/filesystem/output; D04/D06, B05/B07; CAS-R/T06–08,19,23. |
| WSI-T03 | Effective offline-principal policy for every helper; IPv4/IPv6/DNS/loopback/raw/broker/proxy/inherited-socket/local-control routes deny. Missing filter/service, alternate identity or exception denies admission. | NSP-R/T05–07; gates network/principal/closure; D04/D06, B05/B07; CAS-R/T07–08,15,17,23–24. |
| WSI-T04 | Suspended assignment, actual alternate-user tree, private desktop, no breakaway, crash/timeout/cancellation stop within 5 seconds; foreign handles, unconfirmed stop or unbounded setup wait fail. | NSP-R/T07–08,10–11; gates process_tree/budgets; D04/D06, B05/B07; CAS-R/T13,15,19,23–24. |
| WSI-T05 | Exact setup delta, no shared-state/port/workload/reboot change; denied UAC, interrupted setup, stale marker/version, orphan effects and concurrent edits preserve ownership and block retry. | NSP-R/T12–17; gates host/authority/review; D04/D06/D07, B05/B07/B09; CAS-R/T19–29. |

Use disposable synthetic targets and isolated network test endpoints only under
their future explicit authority; this task's source-read budget is closed and
cannot fund them. Tests must establish actual denied operations and complete
receipts, not just policy declarations. Existing resource/disk/handle bounds,
schema manifest and no-model/no-retry requirements remain additional blockers.

## WSI-13 — Disposition and next task

Static verification passed: the new isolation ledger/report validator, all six
existing qualification/CAS/delivery/artifact/source/standard-policy validators,
11 in-memory negative cases for accounting, source drift and false readiness,
and the four provenance-review plus five standard-policy regression tests.
Historical review bindings, profile/schema/registry v5 and the RF016 system
fixture remain unchanged. Python syntax, new local links/public-path checks and
Git whitespace checks passed. No custom cryptographic verifier or new system
fixture was executed. These checks validate the research record, not isolation.

No variant meets the entire exact NSP boundary with current evidence. A remains
the sole preferred maintained dependency, but the unsupported outer-launch/build
binding and incomplete shared-state mutation/rollback inventory prevent
READY-FOR-SETUP-CONTRACT. Existing accounts and selected rules do not establish
NO-SETUP-READY. B is not permission to develop a sandbox; C is not a fallback.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; actualProbeAuthorized=false; actualProbeStarted=false.
No Codex/helper/App Server/generator/model/Worker/Hermes/OpenShell execution,
setup, account/ACL/firewall/registry/service/task/Defender/Hyper-V mutation,
installation, UAC, reboot or Docker/WSL lifecycle operation occurred. No runtime,
API, database, registry v5, production, push or deployment change.

Exactly one recommended next atomic task: **RF-CODEX-018 — read-only qualification
of the official native sandbox's supported outer-launch interface for the exact
schema generator.** Establish an official build/source binding and determine
whether identity, strict reads and zero network can be applied before generator
initialization using the maintained vendor interface. If that cannot be proved,
record the precise unsupported boundary; do not write a custom launcher or run
setup/Codex. This is a source/interface qualification task, not a setup request.
RF-CODEX-018 was not started.
