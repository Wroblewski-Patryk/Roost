# OpenShell publication approval (RF-HOST-046)

## Wyjaśnienie dla właściciela

Chcemy poprosić zespół NVIDIA/OpenShell o opcjonalny tryb uruchamiania jednego
małego programu, który nie potrzebuje zapisu plików ani dostępu do sieci.
Przed startem powinno dać się sprawdzić, czy te ograniczenia rzeczywiście
obowiązują. Obecny sprawdzony sposób uruchamiania wymaga zapisywalnego katalogu
roboczego, dlatego taki program pozostaje u nas zablokowany.

To propozycja funkcji, a nie oskarżenie o lukę bezpieczeństwa ani zobowiązanie do
pisania kodu. Wybrana opcja A pozwoliła sprawdzić aktualne źródła i przygotować
zgłoszenie. **Nic nie zostało opublikowane.**

Do zatwierdzenia jest [dokładna angielska treść](openshell-prepublication-issue.md),
wraz z krótkim załącznikiem wewnątrz tego samego issue. Ma 575 słów. Następna
osobna decyzja TAK/NIE może dotyczyć wyłącznie utworzenia jednego issue o tej
dokładnej treści. Każda zmiana treści wymaga ponownej zgody. Zgoda nie obejmuje
PR, komentarzy, gista, kodu, instalacji ani uruchomienia agentów.

## Result and exact approval identity

**PREPUBLICATION-PACKET-READY**, with **publishAuthorized=false** and owner
publication decision pending. The owner selected A for read-only prepublication
inspection only; this supersedes RF045's pending choice for that limited phase.
The [RF045 packet](openshell-upstream-owner-decision.md) stays immutable history.
No implementation, pilot, live-admission or runtime-policy identity is admitted.

Observed **2026-09-13T10:52:30Z to 2026-09-13T10:59:48Z**; expires **2026-09-13T11:59:48Z**.
A dated observation is not permanent proof of release, template or search state.
The next publication step must recheck freshness and current state before any
write; expiry or changed evidence blocks it. An owner reply does not refresh
evidence or bypass a new stable release, duplicate or channel change.

Exact title: **Add an opt-in Docker profile for immutable, nonwriting stdio workloads**

| Artifact | Identity |
| --- | --- |
| Packet | `openshell.upstream-prepublication.v1` |
| Packet canonical SHA-256 | `2ead74b813afa1cb492ad0364a1512e659e5b1e956586b41c32c13d3722375d8` |
| Title SHA-256 | `4f971e0ced1fe7910eb6cd9944f72672cb10a898b454566229227df95b5add29` |
| Body including inline appendix SHA-256 | `2dc092c0d70f88309a1da42a9384c3247d3e27a41045c9fa5b04c25623f9222b` |
| Canonical title/body payload SHA-256 | `ec617fe12f291feff5d3e60c2092a59368339f699916f486fb4667e955d5fc01` |
| Title bytes | `70` |
| Body bytes / words | `4775 / 575` |

The [machine-readable packet](../../config/openshell/upstream-prepublication.json)
pins every identity. The public Markdown file has the title in its first H1;
the issue body begins after the first blank line and includes the final LF.
Text hashes use UTF-8/LF (the current public text is ASCII); the payload hash
uses sorted-key compact ASCII JSON of exactly `{title, body}`, without trailing
newline. The appendix is part of this body, not a second attachment or gist.
No internal packet, host inventory, raw receipt or private path belongs in the issue.

## Current release and guidance review

Fresh public [latest release](https://github.com/NVIDIA/OpenShell/releases/tag/v0.0.116)
remains **v0.0.116**, commit `d1155aa70042d3e2ee49dbfa15346b108b7c1d92`.
Complete bounded pagination found 97 public releases
(94 stable, 3 prerelease) and 119 tag refs.
No newer stable or versioned public release was found. The rolling dev and VM
prereleases and the tag-only v0.1.0-pre.1 remain informational, unqualified and
uninstalled. Their refs/commits match the historical RF044 identities; all five
immutable Git objects were reverified against fresh public references.
Fifty-four relevant asset metadata records were checked; no asset was downloaded.

The default branch is `main`, pinned to **`5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0`**,
tree `7cdfe1f3b30bbcd647695fde9dbaab0584ed8427`. Beginning/end head, latest-release and
tag inventories agree. Sixteen source/governance/architecture/RFC files were
downloaded only as evidence and verified by Git blob and SHA-256 against this
complete tree. No checkout, build or runtime was created.

The current [Feature Request template](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/.github/ISSUE_TEMPLATE/feature_request.yml)
requires story, problem, impact, proposed workflow, observable acceptance and
alternatives. Agent Investigation is optional and supplied; both truthful
review checkboxes are checked. The compact appendix is nested in Acceptance
Criteria, preserving the form's field layout. [Config](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/.github/ISSUE_TEMPLATE/config.yml)
disables blank issues. Submission remains one feature issue, not an RFC PR.

Current [CONTRIBUTING](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/CONTRIBUTING.md) permits agent-assisted investigation
and expects contributor understanding; first-time PR authors need a human-written
vouch request unless exempt, and code contributions require DCO sign-off. These
PR rules do not authorize or require a vouch for this feature issue. No vouch or
contribution is prepared. LICENSE identifies Apache-2.0; no rights approval is inferred.

Current [SECURITY](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/SECURITY.md) routes suspected vulnerabilities privately.
This text asks for a stricter optional capability and makes no exploit claim,
security advisory or allegation of broken existing guarantees. It can use the
feature channel; reclassification would block public submission. The current
[Code of Conduct](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/CODE_OF_CONDUCT.md) exists and references CNCF's code.
Its external reference was outside the authorized NVIDIA/OpenShell network
scope and was not fetched; the repository file itself was reviewed. No contact
address or private reporting channel was used.

Architecture review covered the current architecture index, compute runtimes,
sandbox and policy boundaries, contributor documentation guidance, and RFC 0012
with its non-normative topology matrix. These distinguish current implementation
from proposed isolation-backend directions. Current Docker source still omits
readonly_rootfs and requires workspace write access; explicit argv and other
partial controls are not reported as complete nonwriting admission.

## Duplicate search and closure

**NO-DUPLICATE-FOUND-IN-BOUNDED-SEARCH**. Fourteen GitHub API issue/PR queries and ten public
HTML discussion queries covered readonly_rootfs/read-only Docker, nonwriting,
no workspace/workspace none, exact cwd, immutable artifacts, mount namespaces,
supervisor workspace, pre-exec, attestation, receipts and stdio. No open/closed
state filter excluded either state. The broadest query required five pages;
all 24 queries completed within declared bounds, without incomplete-results,
login or limited-results signals.

The inspection retained metadata for **340 issue/PR records and 15 discussions**,
including directly followed relevant issue links. Of these, **49 candidates**
were individually classified below. Remaining IDs and screening reasons are
bound in the packet; raw public bodies remain private. Search is limited to
GitHub's index and these terms, not an assertion that no semantic duplicate can
exist anywhere. Issue/PR state and labels are pinned observations. Discussion
state is the displayed HTML badge; absence is recorded as unknown rather than
assumed open. Discussion labels were explicitly shown as none.

| Candidate | State | Assessment | Distinction |
| --- | --- | --- | --- |
| [pull-request #132: fix(sandbox): verify effective UID/GID after privilege drop](https://github.com/NVIDIA/OpenShell/pull/132) | closed | RELATED | Privilege-drop checks are useful isolation foundations but do not define workspace none or read-only backing. |
| [issue #578: sec(sandbox): seccomp filter allows dangerous syscalls (ptrace, mount, unshare, bpf)](https://github.com/NVIDIA/OpenShell/issues/578) | closed | NOT-A-DUPLICATE | This historical syscall-filter report concerns specific restrictions, not the requested optional stdio profile. |
| [issue #579: sec(sandbox): reduce SYS_ADMIN and SYS_PTRACE capabilities on sandbox pods](https://github.com/NVIDIA/OpenShell/issues/579) | closed | NOT-A-DUPLICATE | This historical pod-capability report does not specify Docker workspace-none or image-baked stdio admission. |
| [issue #664: bug: Landlock ruleset abandoned entirely when a single path does not exist](https://github.com/NVIDIA/OpenShell/issues/664) | closed | NOT-A-DUPLICATE | A Landlock missing-path failure differs from eliminating writable backing and workspace preparation. |
| [issue #698: feat(sandbox): support file-level read_only overrides within read_write directories](https://github.com/NVIDIA/OpenShell/issues/698) | closed | NOT-A-DUPLICATE | File-level deny overrides retain a writable parent workspace and do not supply this profile. |
| [pull-request #810: fix(sandbox): two-phase Landlock to fix privilege ordering and add enforcement tests](https://github.com/NVIDIA/OpenShell/pull/810) | closed | RELATED | Landlock setup ordering and tests do not establish a read-only root or workspace-none mode. |
| [issue #848: feat: support custom sandbox entrypoint command](https://github.com/NVIDIA/OpenShell/issues/848) | open | RELATED | Custom workload command selection addresses argv, not the full no-write and pre-exec boundary. |
| [issue #981: Proposal: Split Supervisor and Agent into Separate Pods with gVisor Isolation](https://github.com/NVIDIA/OpenShell/issues/981) | open | RELATED | The Kubernetes split-pod design concerns topology and mediated egress rather than a Docker no-workspace profile. |
| [issue #1435: feat(policy): define agent-oriented policy modes and safety levels](https://github.com/NVIDIA/OpenShell/issues/1435) | closed | RELATED | Policy presets and safety levels do not require complete read-only backing or exact prepared stdio state. |
| [pull-request #1549: feat(sandbox): operator-declared skippable bootstrap subsystems](https://github.com/NVIDIA/OpenShell/pull/1549) | closed | RELATED | Delegating bootstrap controls to an outer sandbox does not establish the proposed Docker profile and is not an approved workaround. |
| [pull-request #1629: feat(policy): add runtime baseline conflict controls](https://github.com/NVIDIA/OpenShell/pull/1629) | closed | RELATED | Baseline-conflict policy controls do not remove mandatory workspace writes or attest complete child mounts. |
| [issue #1737: feat: establish the Isolation Backend interface](https://github.com/NVIDIA/OpenShell/issues/1737) | open | RELATED | The Isolation Backend interface can host this outcome but does not prescribe a nonwriting workspace-none workload profile. |
| [issue #1746: Support First-Class Shared Filesystem Mounts for HPC Sandboxes](https://github.com/NVIDIA/OpenShell/issues/1746) | open | NOT-A-DUPLICATE | Shared filesystem provisioning adds mounts, whereas this use case requests no user/shared mounts. |
| [issue #1748: Enforce Sandbox Filesystem Policy on Shared-Mounted HPC Paths](https://github.com/NVIDIA/OpenShell/issues/1748) | open | RELATED | Restricting shared HPC paths differs from proving no writable child backing anywhere. |
| [issue #1760: feat(sandbox): support gated host mounts through driver_config](https://github.com/NVIDIA/OpenShell/issues/1760) | open | NOT-A-DUPLICATE | Opt-in host mounts provide external data access rather than a mount-free immutable workload boundary. |
| [pull-request #1785: feat(drivers): support docker and podman config mounts](https://github.com/NVIDIA/OpenShell/pull/1785) | closed | RELATED | Typed local-driver mount configuration does not supply the no-workspace nonwriting profile. |
| [issue #1842: feat(policy): support signed frozen policy bundles](https://github.com/NVIDIA/OpenShell/issues/1842) | closed | RELATED | Signed policy ceilings are related to immutable policy, not proof of child root, mounts, FDs and exact executable state. |
| [pull-request #2001: fix(supervisor): drop sandbox child capability bounding set](https://github.com/NVIDIA/OpenShell/pull/2001) | closed | RELATED | Dropping the child capability bounding set addresses one control, not the complete requested profile. |
| [pull-request #2012: fix(supervisor): wire prepare_supervisor_identity_mount_namespace_from_env](https://github.com/NVIDIA/OpenShell/pull/2012) | closed | RELATED | Preparing SPIFFE identity masking does not establish full child mount and workspace isolation. |
| [pull-request #2048: rfc-0012: Isolation Backend interface](https://github.com/NVIDIA/OpenShell/pull/2048) | closed | RELATED | RFC 0012 defines general boundary lifecycle and conformance, not this specific read-only workspace-none outcome. |
| [issue #2159: fix(sandbox): acknowledge initial policy load and expose SDK labels](https://github.com/NVIDIA/OpenShell/issues/2159) | closed | RELATED | Acknowledging initial policy load does not attest complete prepared child state or immutable executable identity. |
| [pull-request #2170: fix(sandbox): acknowledge initial policy revision; expose SDK labels/selectors](https://github.com/NVIDIA/OpenShell/pull/2170) | closed | RELATED | Initial policy revision acknowledgement is a useful component, not a complete nonwriting profile. |
| [issue #2228: [Bug]: ExecSandboxInteractive ignores tty=false and always allocates a PTY](https://github.com/NVIDIA/OpenShell/issues/2228) | closed | NOT-A-DUPLICATE | Honoring tty=false fixes stdio transport but does not remove workspace writes or prove containment. |
| [issue #2255: feat: native Linux compute driver (openshell-driver-oci)](https://github.com/NVIDIA/OpenShell/issues/2255) | open | NOT-A-DUPLICATE | A native Linux compute driver is a different backend and does not qualify this Docker request. |
| [issue #2294: bug: Kubernetes sandbox crashes EROFS — recursive `chown /sandbox` fails on read-only submounts (0.0.82)](https://github.com/NVIDIA/OpenShell/issues/2294) | closed | RELATED | Handling read-only submounts during Kubernetes workspace ownership changes retains a writable workspace model. |
| [issue #2331: feat: preserve image-declared identity in Docker and Podman](https://github.com/NVIDIA/OpenShell/issues/2331) | closed | RELATED | Image-declared identity and immutable image selection do not remove workspace preparation. |
| [issue #2526: feat: honor OCI WorkingDir for Docker and Podman workspaces](https://github.com/NVIDIA/OpenShell/issues/2526) | open | RELATED | OCI working-directory support explicitly preserves a writable workspace and maps root to the sandbox directory. |
| [pull-request #2530: feat(sandbox): honor OCI image working directories](https://github.com/NVIDIA/OpenShell/pull/2530) | closed | RELATED | Docker OCI workdir implementation retains write-access validation rather than workspace none. |
| [issue #2550: feat: add registered trusted workload initialization before Ready](https://github.com/NVIDIA/OpenShell/issues/2550) | open | RELATED | Trusted initialization authorizes bounded root-owned writes before Ready, rather than a no-write child profile. |
| [pull-request #2551: feat(sandbox): add trusted workload initialization](https://github.com/NVIDIA/OpenShell/pull/2551) | closed | RELATED | The trusted initialization implementation addresses registered setup writes, not the requested child mount/stdio boundary. |
| [pull-request #2563: feat(podman): honor OCI image working directories](https://github.com/NVIDIA/OpenShell/pull/2563) | closed | RELATED | The superseded Podman workdir probe validates a writable directory and is not a Docker nonwriting mode. |
| [issue #2571: bug(supervisor): SPIFFE-enabled sandboxes crash because identity mount namespace is never prepared](https://github.com/NVIDIA/OpenShell/issues/2571) | open | RELATED | SPIFFE namespace startup failure concerns credential masking, not complete root and workspace semantics. |
| [issue #2589: feat: support in-place supervisor upgrade via re-exec](https://github.com/NVIDIA/OpenShell/issues/2589) | open | NOT-A-DUPLICATE | Supervisor re-exec preserves ongoing workloads; this use case instead requires single-use attempts. |
| [pull-request #2606: feat(kubernetes): add cni-sidecar supervisor topology](https://github.com/NVIDIA/OpenShell/pull/2606) | closed | RELATED | The CNI-sidecar Kubernetes topology separates network setup but does not define this Docker profile. |
| [issue #2680: CreateSandbox Template and API Cleanup Proposal](https://github.com/NVIDIA/OpenShell/issues/2680) | open | NOT-A-DUPLICATE | Sandbox template/API restructuring is independent of the concrete nonwriting containment outcome. |
| [issue #2708: Support SPIFFE-backed provider token grants on non-Kubernetes drivers (Docker, Podman, VM)](https://github.com/NVIDIA/OpenShell/issues/2708) | open | NOT-A-DUPLICATE | SPIFFE provider grants concern credential mediation, while this profile needs no provider credentials. |
| [pull-request #2715: feat(podman): honor OCI image working directories](https://github.com/NVIDIA/OpenShell/pull/2715) | open | RELATED | Podman workdir support retains persistent writable workspace semantics and does not satisfy workspace none. |
| [issue #2722: Add identity-bound CAS and secret-free attestation for provider mutations](https://github.com/NVIDIA/OpenShell/issues/2722) | open | NOT-A-DUPLICATE | Provider-mutation attestation binds credential updates rather than workload pre-exec filesystem/FD state. |
| [issue #2818: Support declarative artifact delivery and stable endpoint for governed sandboxes](https://github.com/NVIDIA/OpenShell/issues/2818) | open | RELATED | Declarative artifact delivery and stable endpoints address long-running services, not a no-network single stdio process. |
| [pull-request #2848: feat(sandbox): track exec processes](https://github.com/NVIDIA/OpenShell/pull/2848) | closed | RELATED | Exec process identities and inspection do not provide complete pre-exec containment evidence. |
| [issue #2853: refactor(supervisor): treat sandbox workspace as immutable startup context](https://github.com/NVIDIA/OpenShell/issues/2853) | open | NOT-A-DUPLICATE | This workspace is an organizational identity context, not removal of the filesystem working directory. |
| [issue #2949: feat: fail-closed capability negotiation for gateway↔supervisor signals under version skew](https://github.com/NVIDIA/OpenShell/issues/2949) | open | RELATED | Version-skew negotiation is related infrastructure but does not specify the full nonwriting profile. |
| [pull-request #2965: feat(docker): isolate workloads behind a companion supervisor](https://github.com/NVIDIA/OpenShell/pull/2965) | open | RELATED | The open Docker companion-supervisor PR separates mediation but retains control channels and does not specify workspace none or read-only child backing. |
| [issue #3146: bug(sandbox): supervisor hardcodes /bin/bash and fails to start on images without bash (e.g. Alpine)](https://github.com/NVIDIA/OpenShell/issues/3146) | closed | NOT-A-DUPLICATE | Default shell discovery is unrelated to an explicit static executable requiring no shell. |
| [pull-request #3147: fix(sandbox): detect an available login shell instead of hardcoding /bin/bash](https://github.com/NVIDIA/OpenShell/pull/3147) | closed | NOT-A-DUPLICATE | Choosing an available default login shell does not implement exact no-shell stdio admission. |
| [issue #3171: refactor(platform)!: make sandbox environments explicitly composed](https://github.com/NVIDIA/OpenShell/issues/3171) | open | RELATED | Explicit platform compositions reduce implicit grants but do not require workspace none, immutable exec and observed complete child backing. |
| [discussion #2661: Trustworthy sandbox attestation: durable operations, applied-state snapshots, complete observations, and exact cleanup receipts](https://github.com/NVIDIA/OpenShell/discussions/2661) | not exposed | RELATED | Lifecycle attestation for a no-write motivating operation overlaps evidence needs, but does not request read-only backing, workspace none or the exact isolated stdio profile. |
| [discussion #2626: Using openshell-sandbox standalone on edge devices (automotive/robotics)](https://github.com/NVIDIA/OpenShell/discussions/2626) | unanswered | RELATED | Standalone edge-device sandbox use concerns deployment shape rather than this Docker nonwriting profile. |
| [discussion #2966: curl/https within sandbox fails with "insufficient randomness"](https://github.com/NVIDIA/OpenShell/discussions/2966) | closed-as-resolved | NOT-A-DUPLICATE | The resolved HTTPS randomness failure is a network troubleshooting question, not a nonwriting capability request. |

In particular, discussion #2661 concerns lifecycle attestation with a no-write
motivating operation, but does not require read-only child backing and workspace
none. PR #2965 separates the Docker companion supervisor but does not define the
whole requested profile. Issue #2526 retains a writable workdir. All three are
acknowledged in the final public text. RFC 0012 is a compatible design direction,
not evidence that the requested optional outcome is released. None is classified
DUPLICATE; discovering one later blocks a new issue and requires a separate owner
decision about observation or a comment. No comment is authorized here.

## Review, validation and preserved runtime

Privacy review checked the exact public title/body/appendix for private company,
operator, installation and host details, secrets, local paths and internal IDs.
Only generic paths and verified public source/related-work links are present.
Accuracy and defamation review kept statements tied to observed code, distinguished
feature requests from vulnerabilities and avoided accusations or promises.

The [offline validator](../../scripts/openshell_prepublication.py) binds code-owned
packet and text hashes, current template fields and source blobs, all 76 response/
metadata identities, complete release/search pagination, every candidate and
screened-out ID, five Git objects, prior RF043/RF044/RF045 identities and a one-hour
freshness ceiling. Total retained HTTP payload is 11,764,586 bytes. Acquisition
used HTTPS GET only, no credentials/cookies/proxy/redirects, a 20-second timeout,
2 MiB per response and 20 MiB aggregate cap. Issue queries used at most five
pages; discussion results fit one page each. No response URLs were followed
outside the explicit allowlist. No API result is treated as an instruction.

```text
python -B scripts/openshell_prepublication.py --evidence-root <private-evidence-root>
python -B -m unittest discover -s scripts -p test_openshell_prepublication.py
```

Ten synthetic tests cover fresh/expired/future observations, new releases and
duplicates, required fields, mutable evidence, exact text/privacy drift, one-issue
limits, hidden authority, URL restrictions and incomplete search. A READY exit 0
means approval material only; other verdicts return exit 2. CLI provides no clock
or hash override and cannot perform network requests or writes. Local regression
checks do not qualify upstream enforcement. Full app/API/DB/UI builds and all
runtime/adversarial tests are outside this task.

All 114 OpenShell Python tests and seven synthetic preflight tests passed;
syntax checks for two files, privacy checks for seven files, 403 local links
and diff checks passed. The actual offline validator returned READY with fresh
evidence and every external-action flag false.

Before/after continuity preserved Engine 29.7.2 linux/amd64, the same four
container names/states (two Up), five networks, 107 volumes and 16 image rows.
All 15 pre-existing OpenShell JSON files
and earlier public drafts remain unchanged. Docker/WSL/runtime/lifecycle,
restart/shutdown/termination/toggle/prune/reset/socket/stale/recovery, image,
fixture/parser/model/agent actions, push, deploy and production work are excluded.

Exactly one next action: show the final text and ask the owner for an explicit
TAK/NIE decision on publishing that exact single issue. No automatic next task.
