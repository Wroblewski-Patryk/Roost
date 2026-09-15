# Hermes replacement-pin proposal v1

RF-RUNTIME-004, 2026-09-15. Proposal: `roost-hermes-replacement-v1`.
Verdict: **BLOCKED — NO COMPATIBLE STABLE REPLACEMENT QUALIFIED**.
The reviewed candidate is **rejected**, not approved for installation.

This follows [ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md),
[launch v1](hermes-cli-launch-v1.md) and the
[RF003 preflight](hermes-windows-installation-preflight-v1.md). Active pin,
provider admission, candidate argv and all runtime gates are unchanged.

## Exact candidate and scope

The [official release list](https://github.com/NousResearch/hermes-agent/releases)
and [release metadata](https://api.github.com/repos/NousResearch/hermes-agent/releases/tags/v2026.9.14)
identify **v2026.9.14 / package 0.21.3**, published 2026-09-14T16:04:14Z,
as the newest stable release: draft=false, prerelease=false. It is the sole
newer stable release than the active v2026.9.11 / 0.21.2 in the inspected release
list. Older downgrades, main and previews were not selected as replacement routes.
This is a dated release snapshot, not a claim about future releases.

The documentation discrepancy has a precise cause: upstream added
[--format stream-json in commit 1657a1ce2ddccdc2d3e6884bc4d0415484a2e16c](https://github.com/NousResearch/hermes-agent/commit/1657a1ce2ddccdc2d3e6884bc4d0415484a2e16c)
on 2026-09-15T10:53:13Z, after the stable release. Its changed-file inventory adds
hermes_cli/stream_json.py and tests/hermes_cli/test_stream_json.py and changes
the parser, CLI and docs. The official comparison reports it 364 commits ahead
of the stable candidate and zero behind. This is an unreleased feature reference,
not a replacement candidate; its emitter/tests were not qualified or executed.

[Tag object 7a963716b81be13ba513d4f127633b7da493aff2](https://api.github.com/repos/NousResearch/hermes-agent/git/tags/7a963716b81be13ba513d4f127633b7da493aff2)
resolves to **345cd2b057a452236de401d3534b8502a7465e8d**.
Both tag and [commit](https://api.github.com/repos/NousResearch/hermes-agent/git/commits/345cd2b057a452236de401d3534b8502a7465e8d)
report verified=false, reason=unsigned. Release metadata has no uploaded assets;
no signed Windows binary or artifact attestation was established. HTTPS source
hashes identify reviewed bytes; they do not turn unsigned source into a signed
release. Both pyproject.toml and hermes_cli/__init__.py report 0.21.3.

## Public CLI and output semantics

All source/test links below refer to that exact commit. Source was read as data;
no upstream Python imports, tests, executable or model were run.

| Requirement | Static evidence and verdict |
| --- | --- |
| Input and EOF | [main.py](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/main.py) reads --query-file - with sys.stdin.read(), so EOF completes the input. Empty input/read errors exit 2; query and query-file are exclusive. There is no input byte cap in that reader; Worker must bound input and deadline. |
| Provider/model/reasoning | [_parser.py](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/_parser.py) has --provider, --model and --reasoning; main forwards them. openai-codex is implemented by the Codex auth provider. Supported flags alone do not prove isolated auth or exact effective configuration. |
| Structured stream | The parser is byte-identical to 0.21.2 and has no --format argument or stream-json value. Thus launch v1 argv is unsupported. No matching init/text/tool/result JSONL contract can be qualified for this CLI. |
| Final result/error/exit | [cli.py](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/cli.py) quiet path prints response text and a stderr session_id. Failed results normally exit 1, success 0; KeyboardInterrupt exits 130. There is no terminal JSON result binding these fields. Kanban-specific exit behavior is outside the permitted route. |
| One turn | --oneshot prevents interactive seeding, but quiet completion notifications can call run_conversation again. Therefore one CLI invocation is not proof of exactly one inference turn. |
| Tools/usage | Quiet mode suppresses callbacks, not tool execution. Separate top-level -z [oneshot.py](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/oneshot.py) supports a best-effort JSON usage file, not the required event stream. It is not an accepted replacement; that path also enables automatic command approvals and loads configured tools/fallbacks. |
| Retry/fallback | Ordinary runtime/configuration still selects fallbacks and credential pools. No execution-wide zero-retry/zero-fallback proof was established. Finite CLI mode does not imply those controls. |
| Timeout/cancel | Public run-budget is a run-level control, not proof of complete Windows child-tree termination or bounded stdin wait. Signal/cleanup paths exist; static review does not establish stop recovery on Windows. |
| Adapter v1 | Not compatible. Keep command/args null and admission closed. Do not parse plain text as JSONL, infer tool absence from silence, synthesize a final result or map -z usage fields into a claimed stream contract. |

[Query-file tests](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/tests/hermes_cli/test_chat_query_file.py)
cover literal hostile text, the parser option and mutually exclusive inputs.
[Quiet-output tests](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/tests/hermes_cli/test_cli_quiet_stdout_leak.py)
assert callback suppression before execution.
[Usage-file tests](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/tests/hermes_cli/test_oneshot_usage_file.py)
cover successful and failed accounting-file writes. These are source observations,
not executed test results and not evidence for launch v1 JSONL semantics.

Minimal upstream gap: a **stable tagged release containing the structured CLI
feature** must actually implement the
documented chat --format stream-json parser and emitter with one terminal result,
identity/model/usage/exit agreement, tool events and tested failure/cancellation
semantics. Strict one-turn enforcement must also exclude background follow-up
turns. No approved replacement exists until those source obligations are met;
auth/config/tool isolation and hard budgets remain separate later gates.

## Bounded dependency, license and security delta

[Package metadata](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/pyproject.toml)
retains Python >=3.11,<3.14 and MIT. LICENSE and setup.py are unchanged. Core adds
pillow-heif>=1.4.0,<2. The [lockfile](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/uv.lock)
grows from 254 to 258 package names: adds pillow-heif 1.5.0, google-cloud-pubsub
2.39.0, grpc-google-iam-v1 0.14.5 and grpcio-status 1.81.1; removes none. Besides
Hermes, version changes are slack-sdk 3.43.0→3.44.1 and tornado 6.5.7→6.5.8.
These are lock resolutions, not a claim that all optional packages would be installed.

Maintainer-published package metadata declares Apache-2.0 for
[Pub/Sub](https://pypi.org/pypi/google-cloud-pubsub/2.39.0/json),
[IAM](https://pypi.org/pypi/grpc-google-iam-v1/0.14.5/json),
[grpcio-status](https://pypi.org/pypi/grpcio-status/1.81.1/json) and
[Tornado](https://pypi.org/pypi/tornado/6.5.8/json), and MIT for
[Slack SDK](https://pypi.org/pypi/slack-sdk/3.44.1/json).
[pillow-heif metadata](https://pypi.org/pypi/pillow-heif/1.5.0/json) mixes a
BSD-3-Clause license field with a GPLv2 classifier. Exact wheel/native codec
licenses therefore need artifact review before adoption; no legal conclusion or
complete dependency/security audit is claimed. No wheels were downloaded.

[Codex auth](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/auth_codex.py)
changes refresh ownership/locking and write-through to the source credential
store. Cross-store Codex CLI recovery remains present. This is material to
credential isolation, not permission to read or import those stores.
[Auth persistence](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/auth.py)
changes atomic writes and adds OpenRouter OAuth; POSIX mode arguments do not
establish Windows ACL isolation. [MCP](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/tools/mcp_tool.py)
changes profile-scoped connection/trust bookkeeping and SSE reconnect state.
One-shot session storage changes to a shared registry writer. None of these
changes removes Roost's isolation, no-memory or process-closure requirements.

The [Windows installer](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/scripts/install.ps1)
is unchanged. It supports explicit Commit/Tag and separate stages; its dependency
stage tries uv sync --extra all --locked but falls back to unpinned pip resolution
on failure. Other stages can write user PATH/HERMES_HOME, provision dependencies
and start configured services. Running the full installer is therefore not the
bounded replacement plan below. A locked resolution failure must stop replacement.

## Reviewed SHA-256 values

Hashes below are raw HTTP source bytes (LF); installer CRLF checkout hashing is
explained in RF003. Full source/lockfiles are not copied into this repository.

| File | SHA-256 |
| --- | --- |
| hermes_cli/_parser.py | 8f6573f8bc211208ae884e9ca21987240abd28bc3312c7189f323286dfc29a21 |
| hermes_cli/main.py | d21135792593599715c194999a97621cb86b09180b19e51db58d1910f1bdabf3 |
| cli.py | f660357c101629a0ebcd8f4ce6aa2d3874fcfe87de6ea4b1d121cc8b2746584f |
| hermes_cli/oneshot.py | 271dc0cc23ab1794e1e61c3ad3c1c1b765f097cb0d2310a2afbedfcdcd121801 |
| scripts/install.ps1 | 226c70a90ad47e8a4d34cb11aca4ecbeb649e2f9b67fbd009ea49791de2d56f5 |
| pyproject.toml | a674c321c63c3bfd9fa099fab5957a64092416f7771680b370a4d77e992744ba |
| uv.lock | 4426ffd292c32cd8edda5779db49951833e87c73cab7cee845e7afe92ecb17b9 |
| setup.py | d476dd1c28d707acd72f1d0551d7178123832ae18b6e201ca1ac48cd040653ae |
| LICENSE | 821556e6336796450ab852d375117b48a4887e71d255794fd6318d99982a5ab6 |
| hermes_cli/auth.py | b947d385b4810ddb6f262fad6c589b187726b8ad57c8fc508e75ba16783f0db8 |
| hermes_cli/auth_codex.py | cfac1743394306fdc529d62ba287beb68ca7a1efb28cd28c94eefeebbc4625b0 |
| tools/mcp_tool.py | 0eb6e0a592722d2af4814fa4a9f00d2d260b4bd8bf71392c14116e8fcfcce7cb |

## Conditional replacement transaction — not executable approval

No replacement of 0.21.2 with rejected 0.21.3 is proposed. For a future qualified
pin, the owner-reviewed transaction must bind the exact commit, source/dependency
hashes, private canonical paths and effective configuration before mutation:

1. Keep task admission closed and establish no process using the installation.
   Verify installation-only inventory and available disk by metadata. Leave
   config/credentials in place and outside source/venv replacement; no credential
   read, import, migration or backup is part of this transaction.
2. Use one existing canonical checkout and venv. Because an in-place venv rebuild
   can fail, retain at most one private rollback snapshot of the prior source/
   venv, bound to its original absolute paths and hashes. It is a rollback copy,
   not a second runnable installation or a claim the previous runtime was admitted.
3. Proposed limits: one attempt, 15 minutes, 2 GiB maximum rollback snapshot,
   8 GiB total added temporary/build/download space. If inventory or dependency
   sizing cannot fit, stop before mutation and revise the proposal. These are
   proposed ceilings, not measured installation cost or current authorization.
4. Fetch only the approved source ref and verified dependencies into one uniquely
   owned temporary directory. Update the existing checkout to the detached exact
   commit and rebuild its venv at the same final absolute path using the official
   locked sync mechanism. Never use installer fallback resolution, modify base
   Python/Git/Node, add PATH, invoke setup/gateway or run update-to-latest.
5. Use controlled downtime, not an allegedly atomic directory swap: Windows
   launchers/venvs contain absolute path bindings. Keep admission closed until
   no-model identity/help/config checks and inventory pass. Any failure restores
   the previous checkout and venv at their original paths and verifies hashes.
6. Cleanup only transaction-owned downloads, temporary build directories and the
   rollback snapshot after successful verification or successful restore. On an
   uncertain restore preserve that sole recovery copy and report its location;
   do not delete the only recoverable state. Never touch unrelated installation
   receipts, caches, application folders or credentials. No second persistent
   instance, global PATH, admin/UAC, antivirus or production change is allowed.

Effective Blank Slate config, native credential/tool isolation, single-turn
enforcement and complete process cleanup are still unqualified. A future
replacement grant must explicitly bind their checks; the current rejected pin
cannot be made acceptable merely by following this transaction outline.

## Validation and sole next task

Only metadata/documentation changes are made. Active pin, sourceHashes, policies,
admission and adapter files are unchanged. Static checks compare those sections
against the parent commit, verify candidate identity/rejection and local links,
and run existing documentation validators plus git diff --check. No runtime test,
upstream test suite, install/update, host inventory, credential access, OAuth,
model/MCP/VPS, Docker/WSL/VM/Sandbox action or production write occurred in RF004.
Fetched source remained in memory; no installation or download files require cleanup.
Result: both documentation validators and static checks passed; the historical
qualification seals and active registry sections remain unchanged. Runtime tests
were not repeated because no adapter/admission code changed.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; pilotExecutionAuthorized=false;
pilotExecutionStarted=false.

Exactly one next task: **RF-RUNTIME-005 — resolve the stable upstream structured
CLI and strict single-turn gap before proposing replacement**. A compatible stable
release with parser/emitter/tests must be identified; otherwise retain BLOCKED.
This does not start background monitoring, request an upstream change, authorize
a fork/private wrapper or grant installation. The known unreleased feature commit
above supplies a bounded reference for that future release check. RF-RUNTIME-005
was not started.
