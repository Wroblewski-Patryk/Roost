# Direct Codex platform selection v1

RF-CODEX-014, 2026-09-13. Decision candidate version **1**.
Follow-up: [ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md) records
owner acceptance in RF-CODEX-015; its [native preflight](direct-codex-native-artifact-preflight-v1.md)
owns current artifact findings and the next task. The proposal/status and RF015
recommendation below are preserved as RF014 history.
Verdict: **NATIVE-WINDOWS-CODEX-PREFERRED** for further pilot qualification.
This is a comparative recommendation, not an accepted platform revision or
execution qualification. All gates remain false.

Prefer **C: Windows Worker → native Windows x64 Codex App Server for the pilot;
WSL2 as a deferred, separately qualified alternative with no automatic fallback**.
The existing Windows checkout and Worker favor this route. It removes the
cross-OS launch/ownership/filesystem boundary and the currently proposed separate
Linux acquisition toolchain. Native sandbox setup, official account isolation,
exact build/schema identity and complete stop still need evidence.

This task explicitly supersedes the recommendation to begin RF-HERMES-014
Sigstore/Node qualification. RF-HERMES-008..013 remain dated evidence for the
deferred Linux candidate. Nothing was installed, copied, executed or activated.

## Evidence and limits

The bounded context included [ADR-001](../decisions/ADR-001-direct-codex-app-server-pilot.md),
[ADR-002](../decisions/ADR-002-codex-qualification-owner-decisions.md),
[CAS contract](direct-codex-app-server-contract-v1.md),
[acceptance matrix](direct-codex-app-server-acceptance-v1.md),
[qualification packet](direct-codex-qualification-decisions-v1.md),
[recovery](agent-host-recovery.md), [host lifecycle safety](../operations/host-lifecycle-safety.md)
and [WSL environment](../operations/agent-wsl-environment.md).
RF008's [local artifact observation](direct-codex-artifact-preflight-v1.json),
RF009's [delivery contract](direct-codex-artifact-delivery-v1.md),
RF010/011's [source research](direct-codex-official-source-research-v1.md),
RF012's [review](direct-codex-provenance-review-v1.md) and RF013's
[standard policy](direct-codex-standard-provenance-policy-v1.md) were retained.

The local RF001 [source manifest](../../config/hermes/source-assessment.json)
and [assessment](hermes-codex-isolation-assessment.md) preserve the official
documentation snapshot's hashes and findings. Full original response bodies
were not located in the bounded repository/temporary-directory checks.
Fresh App Server and Windows sandbox responses match the recorded `openai-1`
and `openai-2` hashes exactly. These are general documentation snapshots, not
build-bound evidence for the installed executable.

Official [Windows sandbox documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox.md)
describes native execution without WSL or a VM and prefers native Windows;
[WSL documentation](https://learn.chatgpt.com/docs/windows/wsl.md) retains WSL2 for
Linux tooling and workflows. WSL1 is excluded from recent Linux sandbox support.
The [Windows app documentation](https://learn.chatgpt.com/docs/windows/windows-app.md)
states that the native agent is the default. The
[App Server documentation](https://learn.chatgpt.com/docs/app-server.md), Windows
sandbox setup section, explicitly addresses custom Windows clients. This supports
both platform families; it is not a compatibility test or a promise that the
bundled internal path is a stable external integration interface.

## Native artifact: fresh static observation

Only the current user's exact `OpenAI.Codex` Appx registration and selected
installation files were inspected. Absolute paths, identity SIDs and raw ACLs
stayed in memory. No account/config/history/log directories were inspected.

| Field | Observation and interpretation |
| --- | --- |
| Appx identity | `OpenAI.Codex`, package version `26.908.4834.0`, X64, publisher ID `2p2nqsd0c76g0`; one matching registration, `SignatureKind=Store`, `Status=Ok`, development/partial staging false. Manifest name/version agree. These are OS registration observations. |
| Relative executable | `app/resources/codex.exe`; regular, no file reparse attribute. Appx manifest's application executable is `app/ChatGPT.exe`; manifest registration alone does not declare the child CLI's public interface. |
| Native format | MZ + PE signature; machine `0x8664` (AMD64), optional header `0x20b` (PE32+), executable-image characteristic set, console subsystem 3; eight sections. |
| Size and SHA-256 | 297,858,352 bytes; `081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575`. Both match RF008. Hashing did not load the PE as code. |
| Codex version | PE FileVersion and ProductVersion are absent. Exact Codex build/version remains unknown. Neither Appx `26.908.4834.0` nor RF008's desktop application `26.908.40834` fills it. |
| Access | SYSTEM owner; one execute-allow ACL rule and zero execute-deny rules matching the current token's SID set; zero file-data/attribute write-allow rules for the three checked broad principals. These are rule observations, not full AccessCheck, token-group attribute analysis, sandbox-user access, AppLocker/WDAC, loader or race proof. No launch attempted. |
| Embedded signing metadata | Certificate table present: offset 297,842,688, size 15,664. Standard .NET CMS decoding found one signer, five certificates and a code-signing EKU. No signature, chain, timestamp or revocation validation was performed; no trust-fetching API was called. |
| Package signing metadata | `AppxSignature.p7x` CMS decoded: one signer, three certificates, code-signing EKU. `CodeIntegrity.cat` is present. Registration, signature presence and blockmap consistency are not independently accepted publisher trust. |
| Dependency closure | Not established. Selected same-directory files include `codex-command-runner.exe` (8,218,928 bytes), `codex-windows-sandbox-setup.exe` (15,467,312), `codex-code-mode-host.exe` (72,471,856) and `rg.exe` (4,234,536). Names and sizes establish presence only; loading/discovery, DLLs and required helper inventory remain unqualified. |

The embedded signer's certificate SHA-256 is
`c9eec7ee53b304dd5e00969da569a5b69917c939a2aa7c0a0134b59c750e48f9`;
its recorded validity ends 2026-09-13T00:41:20Z. The Appx signer's certificate
SHA-256 is `5a528836a92a2f7ca1dca53ced38b255405c9f4a1bf1650942fc1e7059aa6076`,
ending 2026-09-14T19:14:12Z. These are decoded assertions, not trusted signing
times. The first date passing does not by itself prove an invalid Authenticode
signature: accepted timestamp/chain policy has not been evaluated.

Fresh metadata hashes match RF008 for `AppxManifest.xml`
(`aca43873f91174a1dda5b58e2cbb816f41b3e0d01a0aabe6c249fafed8f0a226`),
`AppxBlockMap.xml`
(`f7ece161c63f5bf6d300481f2e3fde111bbe2a86070b3712489fe38a07405065`)
and `AppxSignature.p7x`
(`9e78891a529a57f39dda2c50109d4ce0ba30398e69f32de5a26aa88f56fa095c`).
`AppxMetadata/CodeIntegrity.cat` is 23,788 bytes, SHA-256
`5eea5ef426953a60340603cc53b24ec45355857a794e2e7e8ffb1f4c4ba87668`.
RF008's 4,545-block match for the Windows binary is historical consistency
evidence; that full comparison was not rerun. No full installation inventory,
hardlink-alias search or atomic snapshot was performed here.

## A/B/C comparison

Counts below describe logical operational boundaries, not a measured dependency
inventory or a count of all OS/library processes.

| Dimension | A: Windows Worker → WSL2 Linux App Server | B: Windows Worker → native Windows App Server |
| --- | --- | --- |
| Launch path | Worker → pinned Windows WSL bridge → Linux executable, plus a qualified task-only Linux containment mechanism. Two OS environments and a cross-OS process/stdio boundary. | Worker → pinned native executable, one OS environment and no WSL launch bridge. Worker runtime already exists; no new agent daemon or package manager is implied. |
| Current artifact | RF008 ELF: 262,804,768 bytes, SHA-256 `6970ad6a5b7615d2f5838879e19c1369e5527cb1544f1515f76900267740a403`; Linux view mode 0444 and execute access false. Those observations were not refreshed through WSL. RF011's npm artifact is a different candidate. | Fresh PE identity above; current-token ACLs include execute, but effective launch and exact version remain unproven. It is about 35 MB larger than the observed ELF; memory/startup performance was not measured. |
| Working files | Preserve one Windows checkout; mounted-path mapping, Linux permissions, Windows ACLs and alias/race behavior all require proof. Vendor guidance favors Linux-local repositories for WSL performance; moving or cloning the checkout is not authorized. | Uses the existing physical Windows checkout directly. Removes mount translation, not the requirements to protect sibling projects, Git control files, secrets, scratch and aliases. |
| Whole-process stop | Windows Job ownership of the bridge does not prove ownership of Linux descendants. Needs task-only Linux cgroup/namespaces or an independently qualified equivalent, trusted supervision and cross-boundary stop confirmation. | Job Object containment is the candidate already named by CAS-R15. Association before first instruction, no breakaway, protected ownership and closure/termination confirmation must cover all descendants, including differently privileged sandbox helpers. |
| Native sandbox | Linux/WSL sandbox support is documented; kernel, namespace/delegation, mounts, interop and host-control access remain unproven here. | Preferred vendor `elevated` mode uses dedicated lower-privilege users, ACLs, firewall and policy setup approved by an administrator. It does not mean running Worker/App Server with administrator rights. Existing setup was not inspected. |
| Other security components | WSL2/kernel/distro and their maintenance remain in the dependency boundary. Docker/OpenShell are not intrinsically required for direct App Server. | Vendor documentation does not require the Microsoft Windows Sandbox VM feature or Hyper-V for native Codex sandboxing. Local users/ACL/firewall policy remain real components. No evidence that a separate Roost account or extra service is required; none is proposed without need. |
| Filesystem/network/approval | Neither healthy Docker nor Linux sandbox configuration proves isolation from host management or all outside reads. | A Job Object controls lifetime/resources, not filesystem/network authorization. Vendor unelevated mode has weaker network controls; its suggested fallback is not admitted by Roost. Full-access mode, prompt rules and clean PATH cannot replace enforcement. |
| Authentication | Official docs state that Linux and Windows homes do not automatically share auth. Vendor syncing/shared-home examples conflict with this task's no-copy/isolation requirements. | Shares the native platform with the logged-in desktop account, reducing cross-OS identity mapping. Default home sharing still exposes configuration/history/auth and does not establish the isolated official channel required by I01-B. |
| Supply chain | RF009–013's selected npm route introduces separate acquisition plus proposed Node/Sigstore/TUF qualification. These are that route's verification dependencies, not mandatory Linux App Server runtime dependencies. | Reuses installed packaged bytes and standard Windows package/signature mechanisms as the candidate trust route. Avoids that separate acquisition route; local presence and Store labels alone do not close B01. |
| Resource/failure domains | Guest memory/disk/kernel plus bridge, mapping and distro lifetime. Existing Docker integration is a shared failure concern; prior forced-stop incidents do not prove normal WSL use unsafe. | Removes the guest/bridge from this launch. Remains on the same host as other workloads; CPU/RAM/process/disk/network caps and host-control denial still need proof. No claim of zero impact or measured resource savings. |
| Updates and maintenance | WSL/kernel/distro, artifact placement and bridge identities need qualification; npm verifier dependencies add maintenance if that acquisition route is used. | Appx update/package removal, changed bundled helpers, Windows policy and DLL changes can invalidate the pin. Coupled desktop updates may cause more frequent requalification; installed convenience is not immutability. |
| Rollback/reversibility | No automatic distro repair, old artifact fallback, replay or renewed budget. | No automatic downgrade, copy-out of bundled files or selection of a prior Store directory. Preserve evidence and deny until an approved artifact/profile is qualified. Changing the recommendation has no installation rollback because this task changes only documents. |

**C** uses B for pilot qualification and preserves A as a later profile for a
demonstrated Linux tooling need. It is one selected platform per admitted task,
never two servers, two writers or a failover chain. A native failure stops and
retains the checkpoint/writer; it cannot silently start WSL or weaker sandboxing.

## Exact launch proposal and drift

For B, the future private descriptor resolves the selected Appx identity and
its exact registered physical installation to `app/resources/codex.exe`.
The resolved absolute executable is supplied directly as the process application's
path, with exactly `argv=["app-server"]`, `shell=false`, hidden window,
stdin/stdout/stderr pipes and the admitted physical repository as actual cwd.
Use a sealed replacement environment/configuration recipe under CAS-R04/05;
no PATH resolution, app-execution alias, shell command, UI activation, package
copy, runtime install or invocation through the desktop executable.

The exact supported Windows process-creation/Job attachment procedure is still
to be qualified. Existing local CAS-R15/R19 and D04 documentation establish the
required ownership/stop boundary; no local Windows SDK headers were present in
the checked standard SDK include location, and no Microsoft network request was
made under the OpenAI-only budget. Job kill-on-close/no-breakaway and protected
handle ownership are proposed standard mechanisms, not tested guarantees.
Nested jobs, alternate-user launch, inherited handles, crash, descendant escape,
PID reuse, retained pipes and stop within 5,000 ms need a later bounded OS probe.
Closing the parent or using process-name termination is insufficient.

This is an exact launch *shape*, not a runnable admitted descriptor: version,
closed dependency inventory, loader/search policy, effective ACLs, job/config
recipe and replacement-race prevention are unresolved. A library/DLL or helper
loaded via ambient search would invalidate the closure. No launch occurred.

Before each future admission, compare the accepted package identity/version,
Codex build/version, executable hash, helper/loader inventory and OS/security
profile. A mismatch, removed package, unproven signature policy or update race
must deny before any candidate instruction. Requalify through a fresh explicit
task; do not update a pin from observed bytes automatically. Preserve active
ownership and safe stop if drift is discovered during a run. Update pausing,
package retention and rollback availability were not tested or changed.

Both platforms use the documented stdio JSONL App Server route. Generic docs
describe `generate-json-schema` and `generate-ts`; no matching version-bound
bundle was established and neither generator ran. A future no-model generator
probe is separate from normal CAS argv and requires its own finite authority
and pre-initialization no-auth/no-discovery/no-network/stop prerequisites.
B02 remains. Windows-specific setup RPCs are not part of ordinary task authority.

For account access, I01-B still permits only the official logged-in local Codex
account, with reference/state in Roost. Native platform alignment is useful but
does not authorize reading the desktop home or exporting tokens. Documented
managed login and experimental host-managed tokens do not demonstrate a safe
existing-account handoff for this Worker. No custom auth bridge is proposed.
B04 remains; no account or auth API was called.

## Proposed minimal decision revision and retained blockers

After owner acceptance, propose ADR-001 **decision version 2** adding only the
native-Windows pilot preference and deferred WSL profile, without changing its
direct Worker→App Server ownership. ADR-002 I01-A/B remain unchanged; a versioned
I01-C amendment must name native Windows for future evidence tasks because its
current wording names WSL2. Approval of a platform is not setup/probe authority.

The current `direct-codex-windows-wsl2-candidate` profile revision 3 and schema
hard-code that identity and WSL fields. Preserve them as the deferred candidate;
do not relabel it or turn WSL nulls into fictitious passing native values.
Propose a separate `direct-codex-windows-native-candidate` revision 1 under a
minimal version 2 profile contract supporting explicit platform applicability.
Reuse shared controls and evidence fields, replace only platform-specific pin/
containment fields, preserve unresolved values and NOT_ADMITTED. No such schema
or profile is created in RF-CODEX-014. D07's present approval covers v1 only.

| Decisions / blockers | Effect of this recommendation |
| --- | --- |
| D01 / B01,B02 | Prefer native candidate; exact build, accepted Windows package/signature trust, supported bundled-path use, immutable dependency/loader closure and wire bundle still missing. Neither blocker closes. |
| D02 / B03,B08 | Phase/parser/rate/resource/storage values remain unmeasured. No RAM or retention number is inherited from a different platform. |
| D03 / B04 | Account-source policy unchanged; isolated official channel remains unproven. |
| D04 / B05 | Replace the proposed cross-OS containment investigation with native Job + vendor sandbox qualification if the owner accepts. Filesystem, network, privileged-helper and host-control denial/stop are still unproven. |
| D05 / B03,B06 | Exact model/effort and hard duration/output/cost/retry/partial-usage requirements unchanged. Platform choice supplies no monetary enforcement. |
| D06 / B07 | Effective sandbox/approval, excluded files, Git/shell/network bypass denial and callback authority still require exact-platform proof. |
| D07 / B09 | v1 document/schema design remains DECIDED; future native profile requires its own review. No independent RF-CODEX-014 runtime/security acceptance is claimed. |

CAS-R/T01..30 remain SPECIFIED, NOT QUALIFIED. In particular R/T03–08,10,15,19,
23–29 retain their pin, configuration, containment, authority and admission
conditions. Registry v5 and runtime/API/DB/production are unchanged. RF009–013's
Linux delivery and Sigstore work is deferred, not invalidated or weakened.
implementationReady=false, executionSupported=false, pilotReady=false,
liveAdmissionAllowed=false; install/probe/model authority remains absent.

Prepared owner question (direction only): **Czy zatwierdzasz natywny Windows
jako profil pilota, z WSL2 jako późniejszą alternatywą bez automatycznego
fallbacku? Rekomenduję tak: odpada most WSL i osobne pozyskanie Linux Codex,
ale izolacja, tożsamość artefaktu, konto i zatrzymywanie nadal wymagają dowodów.**
This question does not request sandbox setup, installation or execution now.

## Verification and bounded network ledger

Five requests used 123,483 response-body bytes out of the allowed 6 requests /
524,288 bytes; maximum response 99,470 bytes, ceiling 131,072. Every request used
a 20-second deadline and zero retry; four 200 responses and one 404, no redirects,
transport/limit failures or in-flight reads. The guessed parent Windows page
returned 404 and provides no support claim. Other paths came from prior captured
sources or links in received official documentation. No executable/archive or
package payload was requested. The ledger was persisted before transport and
after reads through the existing bounded capture helper; budget changes were
process-local, with no helper edit. The ledger is closed; remaining capacity
does not authorize continuation. Public projection:

| # / UTC start | Official documentation path under `https://learn.chatgpt.com` | HTTP / bytes / elapsed ms | Response SHA-256 |
| --- | --- | --- | --- |
| 1 / 14:08:38.873390 | `/docs/windows.md` | 404 / 9 / 269 | `e3ebaa16dd9d9b9fc107c42183fb6cf9d22927e1af03dbbdfa0ccc38e4e4ac31` |
| 2 / 14:08:39.144614 | `/docs/windows/windows-sandbox.md` | 200 / 11,206 / 240 | `294f0c8de1d2201ba562ccb88367a21bce2f2472f65f4dc8486b7c0b2e3f3efc` |
| 3 / 14:08:39.389176 | `/docs/app-server.md` | 200 / 99,470 / 385 | `a72a5c88ab05ab9737ec28b432708f2776f696be48eae09ee39c02dd2f9480e0` |
| 4 / 14:08:50.305064 | `/docs/windows/wsl.md` | 200 / 3,392 / 253 | `116d5d9f02c5435fe8a6da1889e758833ef17b952ff44b541e0d076e3d666ac6` |
| 5 / 14:08:50.561377 | `/docs/windows/windows-app.md` | 200 / 9,406 / 258 | `5bbae21f535849b2ab51ec9472d43e2f1ade4f954b3d5241bcec4674e7761ad7` |

Only static metadata/document consistency checks are applicable here. No Codex,
Worker, generator, model, sandbox setup, Node/npm/Sigstore/TUF operation, WSL
entry/lifecycle, Docker mutation, dependency install, auth read or production
operation ran. Application/API/DB suites and OS enforcement probes are not run.
The unrelated user file was neither read, modified nor staged.

PASS: the six existing qualification, CAS, delivery, RF008 preflight, RF011
source and RF013 standard-policy validators. CAS retains 30/30 families;
delivery retains 16/16; profile revision 3 retains 75 values, 53 technical nulls,
seven research values and nine blockers. RF013 validation is static only;
the RF012 mathematical checker was not executed. The existing qualification
validator changed only its expected next-task identifier. No new test framework,
schema or permanent validation program was added. Documentation link/accounting,
scope/privacy checks and `git diff --check` also passed.

Native Docker read-only before/after observations agree: 4 containers,
5 networks, 107 volumes and 16 image rows. Selected container identity, state,
start/restart and inventory digest remained
`328c45deb5fb79f841aafbfb974beb261c37b5708140102d1c63e43c02a03bf0`.
No workload payload, environment, mounts or logs were inspected. The final
Appx registration/version and native executable size/hash also match the initial
observation. This confirms sampled continuity, not future runtime isolation.

Exactly one recommended next atomic task: **RF-CODEX-015 — bounded static
preflight of the existing native Windows Codex candidate.** After platform
direction acceptance, assess standard offline Windows trust/signing/build and
loader/helper identity, private no-shell pin/update-race protection, and the
documented containment prerequisites for a separately granted no-model schema
probe. Return precise missing evidence where static inspection cannot establish
it. No custom verifier, installation, sandbox setup, auth access, Codex execution,
model, WSL/Docker lifecycle or automatic probe. RF-CODEX-015 was not started.
