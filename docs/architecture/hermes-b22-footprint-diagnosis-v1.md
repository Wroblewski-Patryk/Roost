# Hermes B22 preserved-footprint diagnosis v1

B23 follow-up: the [Windows environment contract](windows-startup-environment-v1.md)
now fixes the demonstrated SystemDrive omission and rejects unresolved startup
path tokens. The historical findings below retain their B22 timing: attribution
of all eight B21 entries is still unknown, and recovery remains blocked. No
B21 evidence or original terminal result was changed by this implementation.

RF-RUNTIME-005B22, 2026-09-16. **BLOCKED; unknown attribution count: 8.**
The authorized read-only diagnosis is complete. All eight extra entries are
identified and unchanged, but their creating process/component is not proven.
Do not label this ROOT_CAUSE_CONFIRMED. The independent arithmetic test now
passes; [B21](hermes-b21-coding-smoke-v1.md) remains acceptance_failed and spent.
ADR-004 v13, native-risk v7, profile/registry v5 and all six false public flags
are unchanged. This diagnosis grants no provider start or recovery authority.

## Evidence binding and preservation

Before inspecting the fixture, the durable review HMAC/key identity and report
digest matched, as did public binding/Job digests, the task/workspace/application/
attempt tuple, Ready/root binding, lease/Writer nonce, application digest and
spent record. Writer, lease and spent physical identities and bytes matched
their signed snapshots. The source-proven original sealed identity serialization
was used **only for diagnostic comparison**, because the ordinary recovery
serializer has the defect described below. No record was repaired or rewritten.

The root's physical identity matched the signed binding. A fresh bounded native
footprint exactly matched the original post-footprint, including Git metadata,
entry identities, file sizes, mtimes and dirty-file hashes. The same comparisons
passed after the independent test. All relative labels below are literal
synthetic-fixture paths; no host root, operator identifier, prompt, model output,
credential content or binary payload is published.

| Evidence | SHA-256 |
| --- | --- |
| Original signed final review | `6499e65e3a959d2d58f66941a92ef01f1d6645f2769ebc9bdb7b767bdd9f9961` |
| Original and B22 pre/post native footprint | `5cb59713c1e96b2b299a0756feafdf14b1b7a298f535bc8325b22e40b3e0e934` |
| B21 installation manifest | `3498d884a84ee77fa996380f9e596c49b309bc6a2bf3219292a0d1cc4726fa32` |

## Eight extra entries

Let `P` denote the literal relative directory
`%SystemDrive%/ProgramData/Microsoft/Windows/Caches`. Percent signs were actually
present in the directory name; they are not anonymization or an expanded path.
All eight changes were additions, classified as ordinary content rather than
protected paths. Directory sizes/content hashes are not applicable; their
physical identity and signed inventory membership were checked. File statuses
are `??`; directories have no separate Git status.

| # | Relative path | Kind | Bytes | Attribution |
| --- | --- | --- | ---: | --- |
| 1 | `%SystemDrive%` | directory | n/a | unknown; parent of P |
| 2 | `%SystemDrive%/ProgramData` | directory | n/a | unknown; parent of P |
| 3 | `%SystemDrive%/ProgramData/Microsoft` | directory | n/a | unknown; parent of P |
| 4 | `%SystemDrive%/ProgramData/Microsoft/Windows` | directory | n/a | unknown; parent of P |
| 5 | P | directory | n/a | unknown; contains the three files |
| 6 | `P/cversions.2.db` | file | 16,384 | unknown; cache-shaped name/binary |
| 7 | `P/{6AF0698E-D558-4F6E-9B3C-3716689AF493}.2.ver0x0000000000000001.db` | file | 309,024 | unknown; cache-shaped name/binary |
| 8 | `P/{DDF571F2-BE98-426D-8288-1A9A39C3FDA2}.2.ver0x0000000000000001.db` | file | 662,848 | unknown; cache-shaped name/binary |

| File # | SHA-256 | First 16 bytes, hex |
| --- | --- | --- |
| 6 | `de800ec458c404e412158787a7bc6660fe54a2bc3b6903b31d07a661325056f0` | `0200000060000000a0000000030000000` |
| 7 | `4e8a96ee41b7dbe0ef68cb5477d447897402f35b9601831e79ec845b8371bbb9` | `100000000e93f5684b36dd010e93f5684b` |
| 8 | `42c71c1ba8d7d130c684db2573d5a6f7dc1682039fd1579811faf6fdb71eaabe` | `130000000e93f5684b36dd010e93f5684b` |

The binary headers are not `SQLite format 3`; extension alone does not identify
the format. No database engine was opened and no payload strings were extracted.
The supported content classification is **opaque binary, cache-shaped name**,
not confirmed Windows cache provenance or Hermes session data.

The signed Job root started at 21:31:00.164 UTC. Directory birthtimes for #1-5
are 21:31:05.889606; #1-4 retain that mtime and #5 has mtime 21:31:05.9198066.
File #6 was born/modified at 21:31:05.9047402; #7 at 21:31:05.9198066; #8 was
born at 21:31:05.9047402 and modified at 21:31:05.9060594. The expected add.cjs
repair's mtime is 21:31:21.7428315. These filesystem times place the additions
early in the provider phase, before the repair. They do not identify a writer
and are not a syscall/process trace. No directory-content origin is inferred
from the common creation time.

## Exact source trace and uncertainty

Source was read from the installed manifest's checkout at Hermes 0.21.2 commit
`939e45c91d751fadd94dcd1b873ac3cb44846213`. Sixteen relevant source files and one test source were
hashed against their immutable manifest entries. No installed Python module,
Hermes command, model, status probe, OAuth or MCP was executed. Source/test
references below are relative to that exact pin, not a floating upstream branch.

| Route/control | Exact source and observed behavior |
| --- | --- |
| Worker environment | `scripts/lib/agent-host-hermes-startup.mjs`, plumbing and hermesStartupEnvironment: copies SYSTEMROOT/WINDIR/PATH/PATHEXT/COMSPEC/TEMP/TMP/USERPROFILE/HOME/APPDATA/LOCALAPPDATA; **omits SYSTEMDRIVE**, ProgramData and XDG variables. The current parent has a valid drive-shaped SystemDrive; a synthetic call proves the Worker drops it. |
| Provider cwd | Same Worker source sets candidate.cwd to the assigned repository. An unresolved percent-token Windows path is relative and resolves under that cwd. This is a path-resolution reproduction, not an OS writer trace. |
| HERMES_HOME | Worker sets it to the profile binding directory. `hermes_constants.py:82-89,131-138` chooses a context override, then HERMES_HOME, then platform default; explicit HERMES_HOME is not the repository. `tests/test_hermes_constants.py:59-65,132-138` covers LOCALAPPDATA fallback when unset; read only. |
| Session state | `hermes_state.py:160-178,308-315` routes state.db and sessions under get_hermes_home(); `cli.py:2833-2848` opens SessionDB independently of the memory feature. No state.db signature/name matches the extras. |
| Terminal state | `tools/environments/local.py:711-743` uses HERMES_HOME/cache/terminal on Windows before TEMP fallbacks; `302-337` copies/sanitizes the existing process environment, without reconstructing SystemDrive. |
| HOME / user profile | `hermes_constants.py:872-905` handles subprocess HOME; host auto mode retains/repairs real HOME. USERPROFILE and APPDATA are copied by the Worker. XDG variables are excluded there, so changing them alone is not a source-backed fix for these entries. |
| File write boundary | `agent/file_safety.py:109-115,156-175` checks HERMES_WRITE_SAFE_ROOT in file-tool path policy. It is not a guard on every OS/runtime write or terminal subprocess. |
| SAFE_MODE | `hermes_cli/plugins.py`, `agent/shell_hooks.py`, `agent/outbound_webhooks.py`, `tools/mcp_tool_config.py` gate plugins/hooks/webhooks/MCP registration. This flag does not supply OS filesystem isolation. |
| Memory disabled | Profile v5 sets both memory flags false. `agent/agent_init.py:1230-1266` creates/loads MemoryStore only if a corresponding flag is enabled; `tools/memory_tool.py:223-225` resolves those flags. |
| Skills disabled parts | Profile disables project discovery and inline shell (`agent/skill_utils.py:484`, `agent/skill_preprocessing.py:101-102`). Bundled local sync remains an accepted startup effect: `hermes_cli/main.py:897-911`; `tools/skills_sync.py:57-66` targets HERMES_HOME/skills. |
| Checkpoints / LSP | Profile disables checkpoints; `cli.py:2756` resolves that flag. `agent/lsp/manager.py:118,156-159,190-193,300` honors enabled=false, with install_strategy=off in profile. Disabling these does not disable all native caches. |

Representative verified source hashes: hermes_constants.py
`d26e0db65ed08561a061db3bf6a51e4446938dc8d90737a9ba9c52e1983d15f2`;
tools/environments/local.py
`96e51d2e528bb413486931a7bbe59d09ba5ac5749f0838b9b1f63038f0ea9c32`;
agent/file_safety.py
`e7aaf61a7c7be5f1af0b2947657caad99a1f5055b08acdb89f0601a24f7f6ea3`.

Bounded Python-source searches excluding installed environments found no literal
SystemDrive/ProgramData/cversions/cache-GUID producer. The winreg hits concern
browser selection, installation repair and uninstall; they do not establish the
chat writer. A wider test-tree text search was interrupted without a result;
only the named test source above contributes evidence. No third-party binary or
system-cache implementation was inspected or executed.

**Supported hypothesis:** removal of SystemDrive permits a native dependency
using an unresolved `%SystemDrive%` path to create relative cache-shaped entries
under provider cwd. Confirmed facts are the environment omission, relative path
semantics, exact preserved additions and their timing. The causal invocation and
writer process remain unknown for all eight entries. HERMES_HOME misrouting,
memory, skills, checkpoint and LSP attribution are not supported by this evidence.

## Independent test and exact diff

After matching the signed footprint, exact baseline/implementation/test bytes
and all additional file types, system Node v22.13.0 ran **`node --test`: exit 0,
one pass, zero failures**. The three additions are .db binaries with no additional
test target or JavaScript entrypoint; discovery found the one existing test.
The process used a bounded environment without NODE_OPTIONS or provider hooks.
No fallback explicit-target run was needed.

Read-only Git confirmed one baseline commit, unchanged baseline implementation
and test, and the exact one-character `a - b` to `a + b` implementation repair.
The three untracked binaries remain visible. Semantic repair is correct;
single-file acceptance is still false. No Git index/config or fixture bytes
changed, and the full footprint, signed review, Writer, lease and spent record
were read back unchanged after the test.

| New B22 evidence | SHA-256 |
| --- | --- |
| Existing test bytes | `960309122f83cd1836eb502eed5d07dcaf4fb36d221e266789a1f227e6c2018e` |
| Corrected implementation | `754052599694724afaf234c67ab548b34584aa20a91a46e3f61ecfdca6f5383e` |
| Read-only add.cjs diff | `a4fb6855f09cde3528c0b902007a5d20507c5873baf5586ece16115210265fde` |
| Independent test stdout | `b495bd00c2c766bc3f87c00a60d18e8f8c0c84e1c4907999af9c1ca2013740d9` |

This is B22 diagnostic evidence, not a replacement signed terminal B21 result.

## Recovery gate and safe plan

The [ordinary B19 gate](hermes-root-scoped-review-reconciliation-v2.md) is **not
complete**. Read-only qualifyNativeReconciliation returns
`native_recovery_spent_chain_missing`; no capability or barrier was created.

1. **Serialization defect:** provider-input seal() canonicalizes object keys.
   The original identity order is applicationId, attempt, executionId, taskId,
   workspaceId. B21 spent hashes that order. createNativeReview verifies it,
   then reprojects identity as executionId, workspaceId, taskId, applicationId,
   attempt. The reconciler hashes this reordered object with JSON.stringify.
   Equal values now produce different digests. Reconstructing original order
   proves the diagnostic join, but is not permission to bypass the gate.
2. **Missing eligible terminal verification:** the authentic final receipt says
   REFUSED/smoke_unexpected_diff. B19 requires signed PASS or FAIL. Even after
   correcting serialization, recovery would reject native_recovery_review_not_eligible.
   Today's standalone PASS cannot be inserted into the old receipt or converted
   into the original process-local cleanup capability.
3. The signed chain does contain Ready/root/pre/post bindings, matching
   lease/Writer/spent identities, original Writer creation/executable identities,
   root/launcher creation identities and Job completion with active=0, closed=true,
   assigned-before-resume, kill-on-close, no breakaway, installation PASS. Those
   are evidence, not current liveness checks or owner cleanup authorization.
   Fresh bounded owner/root/launcher absence checks are still required immediately
   before any future operation; B22 did not claim them or issue an approval.

**Safe alternative now:** retain the exact fixture and pair. A future expressly
authorized recovery contract must preserve the original signed receipt, fix the
versioned identity serialization and attach an append-only signed supplemental
acceptance-negative verification to its exact digest/root/tuple/footprint. It
must revalidate all artifacts and process identities, obtain a fresh opaque owner
grant, journal intents behind the exclusive barrier, and preserve all spent
records. It must not treat the binaries as allowed task output. This is a design
requirement, not an implemented bridge or a new B20-style exception.

Ordinary reconciliation currently removes only the lease/Writer pair; it does
not restore the lost process-local fixture ownership proof. Any future fixture
cleanup additionally needs an explicit identity-bound inventory/marker protocol,
with reparse/hardlink/drift refusal and bounded deletion. A saved path or marker
alone is insufficient. Do not manually delete the fixture to make the gate pass.

## One proposed B23 change and owner action

**Recommend B23: repair the minimal Windows environment contract to carry a
validated SystemDrive.** Accept exactly one case-insensitive key, require an
absolute drive designator consistent with SYSTEMROOT, seal it into the startup
candidate, and fail before launch on missing/conflicting/invalid values. Keep
secrets excluded and retain the existing root/diff acceptance policy. Add
synthetic missing/duplicate/invalid/changed-drive and candidate-seal tests.
This fixes a demonstrated omission; elimination of the real cache additions
remains unproven until separately authorized evidence can establish causality.

Owned per-attempt state/cache outside the repository was considered. The traced
Hermes state already routes through HERMES_HOME; no supported Hermes setting
redirects the unidentified native cache producer. Changing HERMES_HOME, XDG, HOME,
or inventing a fake SystemDrive would therefore be a broader, unproven change.
Do not widen writePaths, ignore the caches, fork Hermes, add a proxy or introduce
a VM to accept this fixture.

**One owner decision:** authorize this bounded B23 environment correction and
synthetic verification. It includes no provider start, B21 retry, cleanup, new
grant, profile/installation change or recovery bypass. Recovery remains blocked
until its separate evidence-contract requirements above are met. B22 stops after
one local docs/tests commit and a report to the coordinator.

## Verification of this atom

The B22 diagnostic suite covers the actual environment omission and routing,
ambiguous/secret environment handling, real provider-input canonicalization,
actual review projection, both recovery refusal reasons, HMAC tampering and
binary-signature uncertainty. Its owned synthetic trees are removed and absence
checked by the bounded ownership helper. No real B21 state is used by these tests.

The B22 suite passed 8/8; combined B22, provider-input and startup regressions
passed 103/103, with no skipped tests. All 733 checked documentation links resolve;
default context is 81,834 bytes within its 150,000-byte budget; all three active
planning files meet their budgets. Added-content privacy and git diff whitespace
checks pass. The interrupted search has no remaining process. No B22 synthetic
fixture or recovery barrier remains.

Application lint/typecheck/build are not rerun: production runtime code is
unchanged; only documentation and an isolated diagnostic test file are added.
Installed Python/provider tests are not run.
