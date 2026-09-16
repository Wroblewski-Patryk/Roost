# Hermes controlled rebuild and split attestation v1

RF-RUNTIME-005B16, 2026-09-16: **DONE — canonical rebuild and file-only admission
verified, with no provider/model execution.** Owner-authorized maintenance of the existing
Hermes 0.21.2 installation at `939e45c91d751fadd94dcd1b873ac3cb44846213`.
This follows the [B15 provenance analysis](hermes-installation-reconciliation-v1.md).
It permits replacement of the managed environment and additive profile binding
migration, not a model run, login, new smoke grant or public activation. The
execution decision remains [ADR-004 v9](../decisions/ADR-004-native-hermes-codex-pilot.md).
Both B13 and B14 remain spent; all six public flags remain false.

## Installation transaction

The maintenance entrypoint accepts explicit private installation/profile/state
locations. It verifies the original manifest, source pin, base interpreter,
package-manager hash, owner attestation, capacity, process exclusion and absence
of application leases under a genuine Writer. A bounded journal is external to
the repository. Private authentication/session contents are never read; their
file identities, sizes and timestamps are compared separately. Spent record
bytes are preserved.

A fresh relocatable staging environment uses the existing pinned base Python
3.13.1 and uv 0.11.8. The two separately recorded wheels remain setuptools
83.0.0 and wheel 0.48.0, with exact original SHA-256 requirements. Frozen core+mcp
selection uses the existing lock. Cache is attempted first; only a missing
cached artifact permits standard-registry retrieval of the pinned artifact.
No upgrade, new checkout, optional AWS closure or installed-provider import is
allowed. `--inexact` retains the two explicit build wheels in this initially
empty staging environment; the subsequent exact distribution inventory admits
only the original 83 distributions. It is never applied to the drifted old venv.

Before swap, validation checks distribution names/versions, every RECORD path,
size and SHA-256, package payload ownership, source/base hashes and generated
code equivalence. Windows separators in RECORD are normalized before enforcing
physical containment. The Pygments JMESPath lexer is ordinary pinned source;
the separately installed jmespath distribution/import root and `jp.py` launcher
are excluded with boto3, botocore and s3transfer.

The old environment is renamed to one rollback path and staging to the canonical
path while launch exclusion remains held. Config, owner record, binding and
installation evidence are published in the same maintenance transaction.
Durable copies of only the changed nonsecret metadata support reconciliation
after interruption. Every precommit failure restores names and metadata and
removes owned staging. Canonical full inventory, hashes, generated receipt,
distribution RECORDs, profile and preservation checks precede commit/rollback
removal. After commit, cleanup failure is reported explicitly and does not try
to restore a partially deleted old environment. A previous transaction requires
explicit reconciliation; the command never automatically resumes it.

## Profile and startup denial

The current native profile is `roost-hermes-profile-v5`. It preserves v4 native
tool controls and adds the official `security.allow_lazy_installs=false` key.
Worker startup always constructs `HERMES_DISABLE_LAZY_INSTALLS=1`; it selects
allowed parent variable names before reading their values and never copies
`HERMES_LAZY_INSTALL_TARGET`. Missing/changed denial or a supplied target fails
candidate sealing and Ready/pre-spawn revalidation. Config bytes, environment,
owner identity and input remain bound to the receipt.

The historical v4 digest/schema remain available for reading old evidence and
explicit migration. They cannot satisfy the current native launch admission.
Migration preserves the owner-attestation ID, confirmation time, expiry and
native-risk reference. It does not renew authentication or prove login status.

## Split integrity evidence

Schema 2 separates immutable installation inventory from a generated receipt.
Immutable evidence covers source/Git metadata, interpreter and launchers,
package payload/dist-info, exact closure, lock, pinned build inputs, tool and
build-report hashes. Profile binding remains separately sealed; private mutable
HERMES_HOME data is outside the installation roots. Nothing broadly excludes
venv, temporary files or arbitrary package/cache additions.

The generated receipt binds the immutable digest, pinned interpreter digest,
maintenance generation and exact generated file hashes. Only mapped
`__pycache__/*.cpython-313[.opt-1|.opt-2].pyc` and the one checkout fingerprint
are admitted. Magic, timestamp flags, source timestamp/size and source hashes
must match. A maintenance-only isolated base-interpreter check compiles verified
sources in memory and compares code objects, including nested filename mapping,
without executing/importing the provider. Header shape alone is insufficient.
Unexpected cache regeneration fails admission until explicit maintenance
verifies it and replaces its generated receipt. Immutable source hashes do not
need to change for legitimate regeneration. Orphan caches and new source files
remain failures.

The B13/B14 file-only installation verifier accepts the split format and issues
only opaque, expiring local receipts. Serialized copies cannot authorize a
launch. Receipt consumption rechecks evidence, inventory and source. No spent
record is removed or converted into a fresh activation.

## Verification and outcome

The successful build used cached artifacts only. Canonical readback verified:

| Evidence | Result |
| --- | --- |
| Distribution closure | Exactly 83 original versions; optional AWS closure absent |
| RECORD validation | 6,275 rows; 6,192 SHA-256/size checks; 83 expected unhashed RECORD self-entries |
| Immutable files | 23,653; original checkout/base source preserved |
| Generated files | 826: 825 source-equivalent bytecode bodies and one exact fingerprint |
| Profile | v5, digest `e9cd95d374b0ffe6b06efd374e02e81d791681ce49f4d671b4e75940d1be55e9` |
| Owner attestation | Same ID, confirmation, expiry and native-risk reference |
| Preservation | Private state metadata and both spent-record byte digests unchanged |
| Cleanup | Zero staging/rollback/build scratch/metadata backup trees; Writer released, application leases zero |
| Execution | No Hermes CLI/import, login, model, new grant, push or deployment |

Early staging validations failed closed before any canonical swap while the
validator was adapted to native RECORD separators, retention of the two pinned
build wheels, legitimate package source names and Windows physical path aliases.
Those staging trees were removed. The successful transaction performed one
canonical swap, full readback, rollback removal and a fresh file-only admission.
Local bounded journals retain the maintenance history without private logs.

Synthetic tests cover changed/added/missing immutable payload,
generated drift and renewal, orphan/header/source mismatch, private-state
separation, lazy denial omissions/overrides, metadata/name rollback at each
precommit phase and transaction replay denial. Repository checks include
typecheck, lint, build, documentation links/contracts, privacy and whitespace.
The full Hermes test suite passed, followed by the final 16 rebuild tests and
65 provider/input tests. Lint, typecheck and build passed. Build retains the
existing unresolved font/ambient-asset warnings and large-chunk warning.
Python documentation validators were not invoked: base Python was restricted to
the pinned build/bytecode-verification flow; Node checked document structure,
links/anchors, budgets and retained gates instead.
Final Node documentation checks passed for 712 local links/anchors, 71,860 bytes
of default context, three bounded planning files, 30 contract requirements and
30 test families. The qualification JSON schema and 53 technical nulls remain
valid, all six public gates remain false, and changed-text privacy/whitespace
checks passed. A fresh canonical file-only proof also rejected serialized and
expired receipts without starting a provider.

This closes B16 only. No later execution atom has started, and historical B13/B14
authentication/repair outcomes are not rewritten by successful maintenance.
