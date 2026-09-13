# Static OpenShell base image audit (RF-HOST-037)

**STATIC-BASE-AUDIT-READY**, verified 2026-09-13. This verdict means the pinned
image has a documented static inventory. It grants no execution admission.
The [RF-HOST-035 host lifecycle denial](host-lifecycle-safety.md), observe mode,
disabled providers/Hermes, `executionSupported=false` and `pilotReady=false`
remain unchanged. No Worker or production configuration was changed.

## Image identity and method

Only this already-local [RF-HOST-036 artifact](openshell-installation-preflight.md)
was read:

`ghcr.io/nvidia/openshell-community/sandboxes/base@sha256:c2a43bb0d765774e2790b3babfb20997bb2eac7b4bf4c6d7d8661e99817bf904`

The local image ID equals that platform-manifest digest. `RepoDigests` contains
exactly the reference above, with OS `linux` and architecture `amd64`.
Config digest is
`sha256:65fa5d3d598a07d385ddbea41bf593be15af306337b76255b40705287cebcbbf`.

The existing Windows Docker client streamed `image save --platform linux/amd64`
from the local named-pipe Engine into the existing Python 3.13 interpreter.
The [parser](../../scripts/openshell_static_audit.py) does not launch processes,
access the network, invoke Docker or write files. It reads an OCI-style Docker-save stream;
other layouts/unsupported sparse records fail closed. No archive was written to
disk, no filesystem was extracted, and no image content was executed. Docker
run/create/start/exec/export/cp, Compose and build commands were not used.

Every blob's SHA-256 and length were checked against its name and the pinned
manifest descriptors. Every decompressed layer hash matched the ordered config
`rootfs.diff_ids`. Archive ordering was not treated as layer ordering. Every
regular file was hashed; final metadata retains type, mode, UID/GID, length,
layer provenance, link target/hash and capability-xattr presence/hash.

The parser reconstructs a virtual path map in memory. Whiteouts remove only
lower entries; opaque directories remove only lower descendants before new
entries are applied. Replacing a directory removes its old descendants.
Hardlinks preserve the referenced file's content metadata at link creation;
unresolved/nonregular hardlinks fail. Symlinks resolve only inside the virtual
root, with cycle/hop checks. Traversal, drive paths, escaping links and writes
through link/non-directory parents fail. POSIX package names containing
`:amd64` are valid. Device/FIFO records can be represented only as inert
metadata, never created/opened or accepted as hardlink targets. None occurred
in this image's final view.

## Bounds and completeness

| Bound | Configured ceiling | Observed final pass |
| --- | ---: | ---: |
| Input stream | 6 GiB | 1,399,670,272 B |
| Expanded layers, aggregate | 10 GiB | 3,422,793,216 B |
| Single file | 1 GiB | All entries within limit |
| Layer entries, aggregate | 300,000 | 32,516 |
| Accounted metadata | 192 MiB | 15,474,244 B |
| Layers / outer members | 64 / 512 | 13 layers |
| Path / PAX or GNU extension | 4 KiB / 64 KiB | No limit violation |
| Selected text per file / aggregate | 32 KiB / 512 KiB | 21,448 B captured, including selected package metadata |
| Selected findings / symlink hops | 12,000 / 40 | No limit or selected-link resolution failure |
| Save producer lifetime / stderr | 600 s / 32 KiB | 35.573 s / 0 B; exit 0 |

Measured parser peak working set was **54,648,832 B**. Metadata accounting and
stream bounds are not an OS memory quota; the measured peak does not include
Docker Engine internals. The helper's deadline bounds its save producer, not
host services. No large persistent image copy or temporary extracted tree exists.

Final view: **26,747 paths**, comprising 21,048 regular files, six hardlinks,
2,270 symlinks and 3,423 directories. All 13 layers were fully consumed; no
whiteout or opaque records occurred in this particular image. Their behavior
is verified by synthetic tests, not claimed as exercised by these layers.
Canonical sorted final metadata SHA-256:
`f58a65c38c8a0c05cf11ae303e714e2734a9163fadfc4e9e4bee976396e8e43d`.

Two early reads stopped at the first valid Debian package filename because the
initial parser rejected every colon. A regression test corrected this without
relaxing drive-path/traversal checks. Two subsequent complete passes verified
the same 13 layer digests and path/type counts. The final pass additionally
records package metadata and narrows policy-name candidates. No retry performed
a pull, host repair or lifecycle change.

## Executable and control inventory

Absence below means no exact named entry in the fully reconstructed view,
including non-executable files and symlinks. It is not proof against renamed
programs, embedded SDKs, script-generated code, future downloads or direct APIs.
Named library/wrapper/config candidates and link targets were also searched;
arbitrary program contents were not semantically analyzed.

| Category | Static finding |
| --- | --- |
| Container control | No `docker`, `dockerd`, `docker-compose`, `compose`, `podman`, `podman-remote`, `nerdctl`, `ctr`, `crictl`, `kubectl`, `containerd`, `runc`, `crun`, `buildctl` or `buildkitd` basename. The six Docker-name matches are ordinary APT/dpkg image settings, not clients or daemon wrappers. Their small texts and hashes are in the private receipt. |
| Socket paths | `/var/run/docker.sock` resolves virtually to `/run/docker.sock`, which is absent; `/run/containerd/containerd.sock` and `/run/podman/podman.sock` are also absent. This says nothing about future bind mounts, runtime-created sockets or reachable TCP APIs. |
| System/namespace tools | Present: `/usr/bin/mount`, `umount`, `nsenter`, `unshare`, `su`, `setpriv`; `/usr/sbin/chroot`, `runuser`, `capsh`, `getcap`, `setcap`. `sudo` is absent. |
| Network/firewall | Present: `ip`, `ss`, `ifconfig`, `route`, `iptables`, `ip6tables`, `nft`, with alternative symlinks and ordinary capability libraries. No `ufw` or `firewall-cmd` basename. |
| Package/SSH tooling | APT, apt-get, apt-cache, dpkg, Python pip/uv and Node npm/npx are present. SSH client, ssh-agent, ssh-keygen, scp and sftp are present; `sshd` is absent. No named APK/YUM/DNF/RPM/Pacman/Zypper/Snap tool. |
| Development/runtime | Shells, Node, Python, Git, GitHub CLI, curl, GCC and make are present. Python installation paths identify 3.14.3 in the managed workdir; this is not a runtime version probe or Hermes compatibility proof. |
| Privilege metadata | Nine regular setuid files, five regular setgid files, and two setgid directories. This includes mount/umount/su and OpenSSH helper metadata. `ping` has a capability xattr; its hash is recorded without claiming an effective runtime capability. |

These system utilities are normal distribution tools, but supply additional
attack surface if privilege drop, namespaces, capabilities or mount boundaries
fail. Their presence is not evidence that they can administer the host.
The sandbox must receive **no daemon socket/API, arbitrary host mounts or
administrator identity**, regardless of whether a Docker executable is present.
Host-lifecycle isolation remains a blocker until separately proven. No image
modification was attempted. A derived image requires a separate approved
decision and reproducible build.

| Bundled agent | Static identity and SHA-256 |
| --- | --- |
| Codex | `/usr/bin/codex` is a symlink to the Node launcher `@openai/codex/bin/codex.js`, hash `baefc109b871e73a7bab298ee19b8bf73c8b647c4f8649a9794fc5db01db17b9`. Package metadata says **0.117.0**. Its x86_64 musl ELF at `@openai/codex/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/codex/codex` is 180,298,312 B, hash `2bee4e33ec222241606e6c5ac3e89a0d3c860fb1684a66e9f134da227b0a2699`. Paths beginning with `@` here are below `/usr/lib/node_modules/`. |
| Claude | `/usr/local/bin/claude` is an ELF, 240,420,560 B, hash `6d83cd2264450c5e54fc988be1032c288cf418ee604294acfb8fc4ac28f5f7a3`. The image's root-home symlink points to a version path labeled **2.1.156**; that label was not executed or independently version-attested. |
| Copilot | `/usr/bin/copilot` links to the npm loader; package metadata **1.0.16**. Bundled Linux ELF hash `e1b58084d50bfa0c71e0db09106bcb13daa854856779a3def3bcac53db0485fa`, 141,757,632 B. |
| OpenCode | `/usr/bin/opencode` links to a script; package metadata **1.2.18**. `.opencode` ELF hash `d7d67202d71f39f7ddb0fe2a61a7d13b6a090909bcbb1aa8c73d25b9a148edf8`, 160,166,720 B; additional glibc/musl variants and a hardlink are present. |

No exact `hermes`, `gemini`, `aider`, `goose`, `cursor-agent` or `qwen` basename
was found. No agent, interpreter, wrapper or version command from the image ran.
Presence, package declarations and link resolution do not attest runtime behavior.

## Image config and policy

Image config declares user **`sandbox`**, entrypoint **`["/bin/bash"]`**, null
Cmd and workdir **`/sandbox`**. No volumes or ports are declared. Environment
names only: `DEBIAN_FRONTEND`, `PATH`, `PYTHONDONTWRITEBYTECODE`,
`PYTHONUNBUFFERED`, `UV_PYTHON_INSTALL_DIR`, `VIRTUAL_ENV`; values are not retained.
OCI labels identify NVIDIA OpenShell-Community, Apache-2.0 and source revision
`fffb6b2248ff6ba585f50517f3711b08122089f2`, created 2026-05-29. The `latest`
version label is descriptive and does not replace the digest pin. All label
fields, entrypoint/config metadata and 13 rootfs diff IDs are in the private
receipt. Labels are publisher claims, not signature/attestation proof.

The final view contains **`/etc/openshell/policy.yaml`**, 6,635 B, SHA-256
`775fc9173919279ce33341a4d4b9a03d3a6bd1fda940dedfd9bbaf722bc3888f`.
Its bounded text was read statically and redacted for potential secrets:

- Policy version 1; process user/group `sandbox`.
- Landlock compatibility is **`best_effort`**, not the required `hard_requirement`.
- `include_workdir: true`; writable paths `/sandbox`, `/tmp`, `/dev/null`;
  read-only paths `/usr`, `/lib`, `/proc`, `/dev/urandom`, `/app`, `/etc`, `/var/log`.
- Ten named network groups allow agent/provider APIs, GitHub, Python package
  downloads and editor services. They include full Anthropic API access,
  read/write Copilot APIs, generic Node/shell clients and recursive binary globs.
  Some GitHub rules are read-only; this is not unrestricted allow-all networking.
  It is nevertheless **too permissive for the planned single-endpoint test**.
- Text includes API/telemetry/download endpoints and wildcard binary paths.
  Their effective matching, trust-on-first-use behavior and denied connections
  were not tested. Policy references do not prove every named executable exists.

The other small selected network config is the distribution's sysctl source-
address filtering file. Remaining policy-name matches are library/header files
or the ordinary package service-start policy, not an additional OpenShell policy.
The candidate search is deterministic and bounded, not a universal semantic
configuration discovery engine. No discovered policy is approved by Roost.
The later experiment must supply a complete minimal policy: strict Landlock,
default-deny networking and exactly one explicit synthetic endpoint/binary.

## Verification, continuity and next task

The [synthetic parser tests](../../scripts/test_openshell_static_audit.py) cover
whiteout ordering/subtree removal, opaque directories/root, replacements,
traversal, virtual links/cycles, hardlink identity, inert devices, limits,
redaction, manifest/blob/config-diff-ID binding and deterministic reconstruction.
They never use the real image as a fixture or contact Docker. Run with
`python -B -m unittest discover -s scripts -p test_openshell_static_audit.py`.
All **26 parser tests** and **seven existing preflight tests** passed, together
with syntax, privacy, 388 local-link and diff checks. The final parser source
hash matches the private receipt used for the complete image pass.

Before and after: Windows Engine **29.7.2 linux/amd64**, the same two workloads
Up; all four container names/states, five network IDs/names and 107 volume names
unchanged. Containers were read only through names/status, without payloads,
logs, mounts, environment or application health checks. Changing uptime strings
were normalized to Up; raw status samples remain private. Two nonrunning
containers are part of the RF-HOST-037 baseline, not claimed as additions since
RF-HOST-036, which inventoried only running workloads. No new Docker resources
were created and no image was removed. No pull, network request, package install,
WSL entry/restart/termination, Docker restart or settings/recovery action occurred.

Private evidence retains exact identity, bounds, hashes, selected inventories,
redacted policy, before/after snapshots and selective cleanup receipts. The
one private helper and intermediate task-owned receipts are removed after
consolidation; no archive/layer files were ever created. Repository changes are
limited to the offline parser/tests and portable documentation/traceability.
No application/API/DB/container build suite is needed for this non-runtime
change; those suites were not run. No push, deployment or activation follows.

Unproven gates include signatures/attestations, vulnerability/dependency
suitability, effective UID/capabilities and privilege drop, gateway mTLS/admin
separation, network/filesystem enforcement, host mount/API denial, process-tree
stop, CPU/RAM/PID limits, hard bounds on every writable/log path, whole-path
32-KiB capture and live provider compatibility. Static READY clears none of them.

Exactly one recommended next atomic task, **not started**: prepare and statically
validate the minimal experiment policy (`hard_requirement`, default deny, one
synthetic endpoint/binary), without starting a gateway or sandbox.
