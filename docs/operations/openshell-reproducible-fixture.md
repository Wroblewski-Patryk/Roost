# Reproducible synthetic fixture (RF-HOST-039)

**REPRODUCIBLE-FIXTURE-READY**, verified 2026-09-13. Two independent builds
produced identical bytes; static inspection passed. This verdict covers only
materialization and artifact identity. **The fixture was never executed.**
`executionSupported=false`, `pilotReady=false`, `liveAdmissionAllowed=false`,
disabled providers/Hermes and Worker observe mode remain unchanged.

## Sources, behavior and limits

The audited [C source](../../fixtures/openshell/fake-app-server.c) is a
freestanding Linux x86-64 program with no libc, startup library, interpreter,
dynamic dependency, environment/argument handling or bundled agent code.
It uses only `read`, `write`, `poll`, `fcntl` and `exit` system calls.

It accepts exactly one newline-terminated byte sequence on stdin:
`{"id":1,"method":"initialize"}` followed by LF. It responds on stdout with
`{"id":1,"result":{"fixture":"synthetic-stdio-v2","ok":true}}` followed by LF,
then exits 0. Invalid input, EOF, exhausted wait budget or I/O failure exits 2;
a signal may terminate it before that exit. It does not parse general JSON-RPC,
handle additional requests or implement a production App Server.

Input storage is 128 bytes, output is exactly 61 bytes on success, and stderr
output is zero. One shared budget permits at most 100 polls requesting at most
20 ms each, including interrupted calls and I/O retries. Input fragmentation
uses that same budget. This is a finite operation/wait budget, not a guaranteed
wall-clock deadline under kernel scheduling. A later launcher must enforce its
own deadline and supply dedicated stdin/stdout pipes: the fixture uses `fcntl`
to make those open-file descriptions nonblocking. It never opens files, uses
scratch, performs network I/O, forks or executes another binary. No source
behavior was tested live in this task.

The [v2 policy](../../config/openshell/synthetic-isolation-v2.policy.json) retains
the v1 restrictions: one exact fixture RO path, one bounded scratch RW path,
`include_workdir=false`, non-root `sandbox`, Landlock `hard_requirement`, empty
middleware, one `fixture.roost.test:18080` `GET /probe` REST/enforce allowance,
and no inherited/default policy. Only its rule name changes to v2; OpenShell
schema version stays 1. This fixture makes **no use of that network allowance**.
Network, output-flood and descendant-stop experiments require a separately
reviewed behavior revision; materializing this minimal stdio fixture does not
claim those scenarios are implemented. No real service or hostname was contacted.

## Immutable identities

| Artifact | SHA-256 |
| --- | --- |
| Source, ASCII with LF | `6c99e3fa3651ca2109e26a2e2fe1e818dbd4c882dbc1f34b781ddaad42afa052` |
| Build recipe, ASCII with LF | `6cf8f0766bf2407d8293c50e28c28329ab7ccd1fb4e05eb677137823f8d7a472` |
| ELF, exact bytes | `c4c7bbc5d9d73629c4ebb88ffc1dfa48cb58e85e5477f69ec1128aaab156c85d` |
| Canonical v2 policy | `79082418e3e24beb7c3ba22b8d01fc8c3e0408f4def7e68ca1974d3b98b4372e` |
| Canonical v2 Roost contract | `7f3e0061e305e6ed5a672a451ad4881d2d76e083990c863d6b0ae495241031f8` |

The [contract](../../config/openshell/synthetic-isolation-v2.contract.json) has
schema version 2, policy ID `roost.synthetic-isolation.v2`, policy revision 2,
and fixture identity `roost.synthetic-stdio.v2`. It pins the exact **8,656-byte**
ELF, source, recipe, build parameters and toolchain identity. Canonical policy
and contract are **580** and **4,049** bytes using the unchanged
`roost-ascii-json-sorted-compact-v1` algorithm. Their own digests live in the
validator and this document, avoiding a self-referential contract hash.
Source/recipe CRLF is normalized to LF before hashing and transmission; no other
normalization is allowed. ELF bytes are never normalized.

Toolchain: the already-local
`ghcr.io/nvidia/openshell-community/sandboxes/base@sha256:c2a43bb0d765774e2790b3babfb20997bb2eac7b4bf4c6d7d8661e99817bf904`,
verified Linux/amd64 with the exact RF-HOST-036/037 image ID/RepoDigest, user
`sandbox` and no declared volumes. Both builds reported **GCC 13.3.0** and
**GNU ld 2.42**. The immutable image pins the toolchain closure; version output
alone is not an attestation. No image, install root or toolchain was modified.

| Independent build | Bytes | SHA-256 comparison |
| --- | ---: | --- |
| 1, fresh container/tmpfs | 8,656 | Exact ELF hash above |
| 2, fresh container/tmpfs | 8,656 | Exact ELF hash above |

Both size/hash comparison **and direct byte-for-byte comparison passed**.
One verified ELF remains read-only in the private versioned RF-HOST-039 artifact
root. The second output was selectively deleted after comparison and static
validation. Windows read-only is an accidental-write guard, not immutable
storage or protection against the owner; every later use must rehash the bytes.
No generated ELF, archive, private path or build log is committed.

## Deterministic build recipe and containment

The [recipe](../../fixtures/openshell/build-fixture.sh) is passed as shell text
to `/usr/bin/env -i /bin/sh -c` inside each approved container; the canonical
source arrives on stdin. It sets `SOURCE_DATE_EPOCH=0`, `LC_ALL=LANG=C`, `TZ=UTC`,
fixed PATH/HOME/TMPDIR and workdir `/build`. GCC uses no standard libraries,
static ET_EXEC linking, fixed random seed, path-prefix maps, no debug/unwind/
compiler-ident metadata, no build ID, stripped symbols and non-executable stack.
No built output is executed. `cat` returns its exact bytes on stdout; compiler
identity/diagnostics use stderr. Only shell/builtins, `env`, `cat`, GCC and the
linker/compiler subprocesses needed for compilation ran in the containers.

The two containers were created sequentially under unique task names and their
full IDs recorded **before start**. The host used these exact restrictions:

```text
--pull=never --platform linux/amd64 --network none --read-only
--user sandbox --cap-drop ALL --security-opt no-new-privileges=true
--cpus 1 --memory 512m --memory-swap 512m --pids-limit 64 --restart no
--tmpfs /build:rw,noexec,nosuid,nodev,size=16m,mode=1777
--shm-size 1m --ipc private --ulimit nofile=64:64 --log-driver none
```

The recipe sets an additional file-size ulimit and 30-second CPU-time limit.
There were no user bind mounts, named volumes, repository mounts, sockets,
ports, provider credentials, network access, package managers or new pulls.
Only `/build` (16 MiB) and the bounded shared-memory mount (1 MiB) were writable
task scratch; standard Docker virtual files/devices are not a claim of future
OpenShell filesystem enforcement. The tmpfs is noexec: compilation reads/writes
temporary objects there while compiler executables come from the pinned image.

Before each start, selected settings from **that new container only** were
checked against the restrictions, including empty binds/volumes. A private
binary-safe Python bridge used argument arrays and streamed `docker start -a -i`;
it did not use PowerShell text redirection for ELF. Concurrent readers bounded
stdout to 4 MiB and stderr to 8 KiB before retention; the producer deadline was
45 seconds. Both completed successfully well within it. Docker logging was
disabled, and no shell helper or large archive was retained.

Teardown removed only the two recorded build IDs. There was no image removal,
prune, restart, WSL entry/termination, integration toggle, socket manipulation,
stale-directory operation or automatic recovery. These build-container settings
are not the OpenShell runtime policy and do not establish sandbox enforcement.

## Offline validation and remaining gates

The default [linter](../../scripts/openshell_minimal_policy.py) now routes to
the [v2 artifact validator](../../scripts/openshell_fixture.py). Supply
`--fixture <private-artifact-path>`; a valid exact bundle returns exit 0 and
`REPRODUCIBLE-FIXTURE-READY`, with all execution flags false. No fixture argument
returns exit 2 / `fixture_required`. v1 is rejected by default; `--template`
remains explicit historical v1 review and never grants execution. The v1 policy,
contract and canonical hashes are unchanged.

The validator uses the bounded strict JSON reader from RF-HOST-038 and exact
whole-object policy/contract hashes. Every missing/unknown field or changed
type/value, including source, recipe, image pin, fixture hash/size/identity,
placeholder and activation flags, fails closed. It checks the supplied source
and recipe bytes and the private artifact before success. Caller-provided hashes
cannot replace trusted constants. This checks the approved toolchain declaration
and recorded artifact, not a fresh proof of which compiler produced arbitrary
caller-supplied bytes.

The stdlib ELF parser verifies ELF64 little-endian x86-64 **ET_EXEC**, bounded
headers/tables/sections/segments, a file-backed executable entry, no writable
executable segment/stack, and only approved section/segment kinds. All PT_INTERP,
PT_DYNAMIC, dynamic/relocation sections and dynamic symbol tables are rejected;
therefore DT_NEEDED, RPATH and RUNPATH cannot be accepted through that subset.
The only accepted note type is GNU property; build-ID and unknown notes fail.
The actual artifact contains a GNU property note, not a build-ID note.
Known private-path, provider, credential and agent markers are absent. Marker
screening is not general secret discovery or semantic machine-code attestation;
the audited source, pinned build and exact artifact hash are the evidence chain.

**Official OpenShell parser and all live enforcement gates remain unrun**, as
documented in [RF-HOST-038](openshell-minimal-policy.md). No gateway, supervisor,
sandbox, fixture, model or agent ran. Exact effective-policy equality, upstream
ancestor identity behavior, inferred routes, mTLS/admin separation, Landlock,
network/host-control denial, process-tree stop, hard resource/output bounds and
provider compatibility still need separately authorized proof. No Worker/API/DB
or production integration changed.

The [12 synthetic artifact tests](../../scripts/test_openshell_fixture.py),
16 v1 policy regressions and seven existing preflight tests passed. Tests use
inert ELF table bytes in memory; a test-only mocked trust pin exercises positive
acceptance without shipping the real artifact. The actual retained artifact
also passed the real CLI. Full application/API/DB/UI build suites were not run
because this is an offline fixture/contract change. Syntax, privacy, **401 local
link checks**, real CLI positive/negative checks and diff checks passed.

Before/after Engine and workload/inventory continuity passed and are recorded privately.
Only existing container names/status and network/volume inventory were read;
no existing workload payload, log, environment, mount or application data was
inspected. Engine stayed **29.7.2 linux/amd64**. All four existing containers
(two Up), five networks and 107 volumes matched after both build IDs were
confirmed absent. No application-health or uninterrupted-uptime claim is made.

Exactly one recommended next atomic task, **not started**: establish a pinned,
offline official OpenShell parser/effective-policy validation route for v2,
without executing the fixture or starting a gateway/sandbox.
