# Native Windows no-model schema probe contract v1

RF-CODEX-016, 2026-09-15. Contract version **1**.
Verdict: **NATIVE-SCHEMA-PROBE-CONTRACT-BLOCKED**.
This specifies a future single generator invocation, not a runnable launcher or
permission to execute. `generatorArgv=null`, `sourceBuildBinding=null`.
Follow-up: [RF017 Windows standard isolation](direct-codex-windows-standard-isolation-v1.md)
prefers the official elevated sandbox dependency but retains BLOCKED: existing
accounts/rules do not prove a supported pre-initialization generator boundary.
The RF017 recommendation below is historical. [RF018 outer-launch research](direct-codex-native-outer-launch-v1.md)
finds configuration work before the wrapper's child boundary and leaves all
launch gates closed. Its RF-CODEX-019 proposal investigates version-bound official
JSON data. [RF019 precomputed-schema research](direct-codex-precomputed-schema-v1.md)
records a complete 305-file source inventory, but no exact PE/schema binding.
[RF021 setup admission](direct-codex-native-setup-admission-v1.md) retains BLOCKED:
the private runner and shared setup delta are not an admitted outer boundary.
Its RF022 proposal requires an owner architecture decision. No NSP requirement,
256-file limit or entry gate is relaxed.
No Codex instruction, generator, App Server, model, authentication or network
operation ran in RF016. The [acceptance matrix](direct-codex-native-schema-probe-acceptance-v1.md)
owns evidence classifications and current prerequisite gaps.

Authority is [ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md), retaining
[ADR-001](../decisions/ADR-001-direct-codex-app-server-pilot.md) ownership and
[ADR-002](../decisions/ADR-002-codex-qualification-owner-decisions.md) I01-A/B.
The [native preflight](direct-codex-native-artifact-preflight-v1.md),
[CAS contract](direct-codex-app-server-contract-v1.md), [CAS matrix](direct-codex-app-server-acceptance-v1.md),
[qualification packet](direct-codex-qualification-decisions-v1.md),
[recovery](agent-host-recovery.md) and [host lifecycle safety](../operations/host-lifecycle-safety.md)
remain applicable. CDL-R04/R08/R09/R11/R16 provide the schema-only evidence
principles of the [delivery contract](direct-codex-artifact-delivery-v1.md);
its Linux acquisition/placement clauses are not silently imposed on Windows.

## NSP-R01 — Single operation and official source binding

Choose exactly one JSON-schema generator operation, or a TypeScript operation
only through an explicit reviewed contract revision. No second invocation to
obtain both formats. The RF001/RF014 official App Server snapshot names schema
generators, but neither that general snapshot nor the Appx version is matched
to this executable's internal build. Therefore **exact argv remains null**.
Do not guess a flag, output parameter, subcommand or startup side effect from
another release. Do not invoke help/version to discover it under this contract.

Before admission, an official build-matched source/document reference and its
hash must establish the precise argv, output kind and initialization path.
The only parameter substitution may be the admitted private output location,
in the documented argument position. No shell string, wildcard flags, config
override, model argument or unreviewed extra argument. This is separate from
CAS-R04's normal App Server `argv=["app-server"]`; it does not expand that API.

## NSP-R02 — Candidate identity and drift

The candidate is Appx `OpenAI.Codex` version `26.908.4834.0`, x64,
relative `app/resources/codex.exe`, 297,858,352 bytes, SHA-256
`081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575`.
RF016 read-only registration/hash observations still match this RF015 identity;
that is not a fresh full trust/dependency qualification. RF015's offline Windows
PE/catalog proof remains dated evidence. Whole-package binding, closed helper/
loader inventory, future principal and protected launch identity remain blocked.

Resolve installationRef privately to the exact physical package and executable;
use an explicit application path, `shell=false`, hidden window, pipes and owned
scratch cwd. No PATH/alias resolution, package copying or desktop UI activation.
Compare accepted registration, package/metadata/helper hashes, trust-policy and
OS/principal evidence before and after. Changed or unavailable fields deny,
even at the same version. Establish verification-to-spawn race protection before
launch; sequential hashing alone is insufficient. No automatic new pin/fallback.

## NSP-R03 — Environment replacement

Construct a new Windows environment block from zero. The only names are
`SystemRoot`, `WINDIR`, `HOME`, `CODEX_HOME`, `TEMP`, `TMP`, compared case-insensitively.
The first two resolve the privately pinned Windows root. The other four resolve
distinct initially empty `home`, `codex`, `temp`, `tmp` children of one owned
scratch root. No parent environment copy and no PATH variable. Additional names,
including USERPROFILE/APPDATA/XDG variables, require evidence and a new version.

No provider/token/proxy, Git/GitHub/SSH, cloud/exchange/browser, Docker/WSL,
loader-injection, Node/Python, telemetry or caller-supplied variables. Environment
values never enter the repository or public receipt. Replacing HOME does not
redirect Windows Known Folder, registry, credential-store or other account APIs;
the independent access boundary below must cover them before initialization.

## NSP-R04 — Pre-initialization discovery denial

The exact selected process and all descendants must be unable to read real user
homes, auth/config/history/logs, secrets or unrelated installations before the
first instruction. Any attempted auth/config/plugin/skill/hook/MCP discovery,
including an attempted default-config read from an empty synthetic home, must
be denied and terminate the probe. Do not accept discovery because it found
nothing, or inspect config/read after an earlier side effect.

No login/account/credential API, service discovery, browser or external-token
channel belongs to schema generation. An unavoidable generator initialization
path requiring such behavior is BLOCKED. Empty directories and environment
replacement alone do not establish this guarantee; it remains unqualified.

## NSP-R05 — Network boundary

Require a standard Windows deny boundary effective before spawn, covering all
descendants, direct sockets, DNS, loopback, proxies, inherited network handles
and host-control endpoints throughout the invocation. No model/provider egress
exception. The attempted operation must be denied before connection or data
delivery and produce only a fixed failure reason/count.

A Job, empty proxy environment, prompt instruction or post-event kill is not
network isolation. No suitable mechanism has been qualified here without durable
host setup. No firewall/account/service/registry change or networking fixture ran.
This is an evidence gap, not a claim that Windows cannot implement the boundary.

## NSP-R06 — Filesystem and principal

Child reads are limited to the sealed exact package/runtime/system-library
inventory required by the build. Child writes are limited to the one fresh
owned scratch root, with output only in its initially empty `output` child.
No repository read/write, ancestor enumeration, other user files, mutable
configuration, named-pipe host control or arbitrary DLL search. Scratch reads
are not an implicit extra grant: any generator need must be specifically reviewed
and remain within this boundary. The trusted post-stop inspector reads output.

Require a supported private principal/access mechanism and protected root/ancestor
identity, denying reparse/alias/hardlink escape and access through other APIs.
No administrator candidate process. No token/ACL/firewall setup was performed.
Normal Windows token access, even with correct environment, does not prove this
boundary. A scanner that detects writes afterward is not a filesystem sandbox.

## NSP-R07 — Process ownership and stop

Own a Windows Job with kill-on-close and no breakaway/silent breakaway, or a
separately evidenced equivalent. Associate the suspended initial process before
resuming its first instruction; assignment failure terminates only that owned
suspended process and permits no resume. Keep the Job handle non-inheritable and
owned by the trusted supervisor. All actual helper/alternate-user descendants
and resource limits must be covered; own process handles, not process names.

Abnormal stop spends zero time awaiting protocol interrupt or optional grace;
terminate the owned unit and confirm every descendant within 5,000 ms, inside the
original deadline. Closing stdout or parent exit is insufficient. Unconfirmed
stop retains evidence/ownership and blocks a new attempt. No global process,
service, Docker or WSL stop. Normal completion requires clean exit without forced
cleanup. The fixture proves a narrow same-token parent/child case, not all these
properties or a surviving watchdog under supervisor/OS failure.

## NSP-R08 — Finite budgets

These are restrictive **proposed schema-probe ceilings**, not measured generator
requirements or production defaults. A later grant may lower them; increasing
one requires reviewed new authority. No automatic budget extension/refill.

| Quantity | Ceiling and rationale |
| --- | --- |
| Overall / phases | 120,000 ms monotonic from original attempt start; preparation 30,000, spawn/attach/resume 5,000, generator 40,000, clean exit/drain 5,000, inspection/report 20,000, stop reserve 5,000; 15,000 unallocated margin. Each phase also obeys the original absolute expiry. Short schema-only work, never a task/model duration default. |
| stdout/stderr | 16,384 raw bytes per line per pipe; 1,048,576 raw bytes combined, including discarded/queued data; at most one counted overflow sentinel. Queue 32,768 bytes, read chunk 4,096; deny before parsing/persistence. No raw-log retention. |
| Output | At most 256 regular schema files, 2,097,152 bytes each, 16,777,216 bytes aggregate; 32 directories, depth 4 below output; relative path≤240 UTF-8 bytes and component≤64 ASCII characters. Fixed small export envelope; actual output size unknown. |
| Scratch/disk | 33,554,432 bytes for output+all homes/temp/metadata, 256 files and 32 directories across the entire scratch root; output consumes these same quotas, not additional ones. Maintain at least 1,073,741,824 free host bytes after reservation. Hard quota enforcement remains unqualified; polling/free-space checks cannot substitute. |
| Processes/memory/CPU | At most 4 total Job processes; 536,870,912 committed bytes across Job; CPU 20% hard-rate ceiling and 20,000 ms cumulative job CPU. No claim that these fit the unknown actual helper/runtime closure; deny if necessary resources exceed them. |
| Handles | At most 256 per process and 512 across Job; no inherited handles beyond the approved stdio set. No complete hard handle-count enforcement mechanism was qualified. |
| Parsing/receipt | JSON depth 32, 100,000 nodes, individual string≤65,536 bytes; canonical manifest≤65,536 bytes, private receipt≤65,536 bytes. Never fetch schema references. |
| Retries/model | Zero retry, one attempt, zero threads/turns/model/tool calls and no credential channel. |

Resource presence/configuration is not enforcement. Before actual spawn, evidence
must establish effective aggregate CPU/RAM/process/handle/disk/output bounds and
fresh capacity; null or unsupported controls deny rather than become unlimited.

## NSP-R09 — Output inspection and manifest

Create one exclusive task-owned scratch root under an approved private parent,
outside repositories, account profiles and the package. No reuse of pre-existing
contents. Enumerate/hash only after confirmed stop while the inspector has
exclusive ownership. Enforce aggregate counts and size before allocation; stream
bounded reads and verify type/size/file identity before/after each read.

Reject reparse/symlink/junction, hardlink count other than 1, special/device files,
ADS/colon, rooted/UNC/device/traversal paths, case-fold collisions, reserved
Windows names, trailing dots/spaces, invalid encoding and unknown extensions.
The selected output kind controls allowed extension, not whatever appeared.
Hashes do not make generated content executable or trusted as instructions.

Canonical manifest is a relative-path-sorted array of exactly `{path,bytes,sha256}`
records, UTF-8 JSON with sorted keys/no whitespace, whose SHA-256 seals the complete
output membership. Reject duplicate JSON keys/non-finite values, excess parser
bounds and unresolved/non-local schema refs; never import/compile generated TS,
run scripts, or follow remote `$ref`. Static syntax alone does not prove protocol
compatibility. Any post-stop mutation invalidates the bundle.

## NSP-R10 — Success and failure

Success requires exact generator completion with exit 0, clean pipe closure,
confirmed whole-tree stop, nonempty complete valid output, budget accounting and
unchanged package/host. Do not demand an App Server turn/completed event from a
schema CLI. The specific generator's expected terminal behavior is part of the
missing build-bound source evidence. Exit 0 or a printed success message alone
never qualifies a bundle; forced cleanup forbids success.

Any unexpected model/provider initialization, tool/turn/thread/RPC operation,
discovery, denied access, timeout, malformed output, accounting gap or uncertain
stop yields BLOCKED/FAILED evidence, never a partially accepted schema.

## NSP-R11 — No model, retries or recovery

No App Server initialize/thread/start/turn/start conversation, tools, auth or model
activity is allowed. This is not a compatibility/agent session. If schema export
cannot avoid forbidden initialization, stop and retain a blocker rather than
disable the boundary. No transport retry, restart, alternate command, second
format, WSL fallback or new deadline. A later attempt needs failure analysis,
fresh authority and fresh scratch; laptop restart does not replay this attempt.

## NSP-R12 — Receipt and privacy

Use the existing per-installation private evidence location, outside repository/
build contexts and real Codex homes. The bounded receipt binds contract/matrix
hashes, task/attempt/grant refs and expiry, artifact/package/metadata/inventory
hashes, exact argv and official source binding, private root/principal/policy refs,
supervisor/OS/Job evidence, phase times, raw byte/file/resource counters, denial
counts, manifest digest, exit/stop result, before/after state and reviewer ref.
Missing required evidence is not a zero or PASS. No new evidence service.

Public evidence contains fixed codes/counts/digests and opaque refs only: no
absolute paths, usernames, environment values, real account identifiers or raw
logs. Inspector redacts before persistence; bounded sensitive output causes
denial, not publication. Do not read real profiles to check redaction.

## NSP-R13 — Cleanup

Only an explicitly granted, exclusively owned scratch root can be cleaned after
confirmed stop. Verify its canonical parent/identity and every deletion target;
never traverse reparse entries, touch package/repository/global caches, or remove
the only unresolved evidence. On failure, preserve a bounded private failure
receipt and quarantine necessary output under its quota. If safe retention or
ownership cannot be established, stop and request scoped reconciliation. No
automatic evidence expiry/refill or cleanup-induced retry. Fixture scratch contains
only synthetic disposable data and is separately removed after its actors stop.

## NSP-R14 — Fixed reasons and mapping

Closed primary reasons: `argv_unbound`, `artifact_drift`, `trust_unproven`,
`closure_unproven`, `principal_unproven`, `environment_mismatch`, `discovery_attempt`,
`filesystem_denied`, `network_denied`, `containment_unproven`, `timeout`,
`stop_unconfirmed`, `budget_exceeded`, `output_invalid`, `model_activity`,
`host_unknown`, `authority_missing`, `review_missing`, `internal_error`,
`probe_complete`. Preserve the first cause; do not put raw errors into reason fields.

| Evidence area | Existing decision/blocker and normative mapping |
| --- | --- |
| Identity/argv/closure/schema | D01; B01/B02; CAS-R/T02–04,10,27–29; CDL-R/T04,08,09,11,16. |
| Empty environment/no discovery/auth | D03/D06; B04/B07; CAS-R/T04–08,17,23; CDL-R/T08,11. This does not close the eventual logged-in account channel. |
| FS/network/Job/resources/stop | D04/D06; B05/B07; CAS-R/T06–08,13,15,19,23–24; CDL-R/T08,11. Numeric gaps also retain B03/B08. |
| Authority/receipt/independent review | D01/D03/D04/D06/D07; B09; CAS-R/T20–29; CDL-R/T09,11,16. No registry v5 reconciliation yet. |

## NSP-R15 — Separate authority and entry gates

Future authority must name exact artifact/package/hash, build-matched argv,
task/attempt and original deadline, scratch location/quota, enumerated allowed
reads/writes, environment/no-network/principal/Job policy, stop/cleanup and
receipt reviewer. Authority cannot waive an unresolved prerequisite. This
specification, ADR-003 or a successful fixture is **not** that execution grant.

Exactly these 15 entry gates must be present and literal true: `argv`, `artifact`,
`trust`, `closure`, `principal`, `environment`, `discovery`, `filesystem`,
`network`, `process_tree`, `budgets`, `output`, `host`, `authority`, `review`.
They resolve to independently checked current evidence, not task-supplied booleans.
Unknown/null/false/missing/extra/coerced values mean **zero Codex spawn**. No branch
may create a candidate while evaluating a gate. Only the authorized system-only
fixture has run here; it cannot accept a Codex path or launch argv.

## NSP-R16 — Independent review before schema use

A reviewer separate from the probe author must inspect the exact grant, official
source/argv binding, artifact/inventory/OS/policy pins, fixture coverage and gaps,
complete attempt counters, denial/stop evidence, package/host drift and canonical
output manifest. Recompute manifest hashes and validate all JSON/TS as inert data;
check no external refs, omitted files, spurious success or version substitution.
Require all 17 matrix rows at their stated evidence level, with failures/skips
explicit. No independent review is claimed by RF016. A reviewed bundle is input
to later adapter mapping, not API compatibility, account isolation or activation.

## NSP-R17 — Disposition and next task

The system-only fixture passed environment replacement, bounded collector
rejection, timeout, post-stop file checks and one Job parent/child case. Its
collector has bounded prefetched data beyond the consumed-byte threshold; this
does not prove the contract's exact aggregate/sentinel accounting. Memory/process
Job limits were configured, not exhaustively stress-tested. FS/network/disk/handle
enforcement, hostile/alternate-principal descendants and crash watchdog remain
unqualified. Exact generator argv/source/build mapping is absent. Entry stays shut.

Docker read-only baseline and final query were unavailable on 2026-09-15.
No restart, repair or lifecycle action was attempted. Host/workload continuity cannot be
certified from a failed query; historical RF015 counts are not current evidence.
These fixtures perform no workload or Docker action, and no network attempt.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; actualProbeAuthorized=false; actualProbeStarted=false.
A future actual probe **cannot presently be admitted or authorized for execution**
under this contract. Its missing prerequisites cannot be replaced by consent alone.

Exactly one recommended next atomic task: **RF-CODEX-017 — bounded read-only
qualification of a standard Windows filesystem/network isolation mechanism for
this schema-only profile.** Determine whether the required pre-initialization
denials can use existing supported mechanisms without persistent host setup;
otherwise state the minimal separately approvable setup and its impact. No Codex,
network attempt, installation or account/firewall/ACL/service/registry change is
implicit. Exact argv/build and other independent gaps stay blocked.
RF-CODEX-017 was not started.
