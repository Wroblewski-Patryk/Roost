# Codex static inventory and Hermes-only owner amendment

2026-09-23, RF-HOST-035, owner amendment v15. **Static inventory DONE;
original Codex pilot-binding atom PARTIAL / architecture mismatch; real launch
BLOCKED.** This amendment supersedes v14's treatment of direct Codex and managed
Hermes as equal pilot classes. It does not undo its accepted Windows-account
residual risk or create a fresh execution grant.

## Target flow and present enforcement

The owner-selected flow is **Roost -> Windows Local Worker -> managed Hermes
Agent -> explicitly selected backend/model**. Hermes is the only agent/tool
orchestration layer for Roost tasks. Its two target model backends are:

- Codex OAuth/subscription, an explicitly allowlisted model of generation 5.6 or
  later and its supported reasoning effort;
- local Ollama, exact model tag/digest (currently the owner's `gpt-oss:20b`
  direction), through a separate managed profile. A working manual model does
  not qualify managed execution; `hermes-manual` cannot supply that authority.

Future per-task routing considers cost, quality, risk and resources. No implicit
provider switch or silent fallback is allowed. Routing is not implemented here.
Direct Codex remains a disabled diagnostic/emergency reference, with no pilot
authority and no bypass of Hermes. Legacy default/reference configuration and
read-only argv projection do not authorize dispatch.

The signed trusted-pilot schema now refuses `direct_codex`, including a validly
signed historical v14 decision. The final task launch boundary also refuses
direct dispatch and consumes its input seal. Existing public API/Worker denial
remains closed. The only positive trusted-policy test is managed-local intent
executing the existing closed 22-byte fixture, never Hermes or a model. No new
Hermes-Codex issuer, launcher, supervisor or parallel admission registry exists.

## Why the CLI pin is not a Hermes backend prerequisite

The repository pins managed Hermes 0.21.2 at commit
`939e45c91d751fadd94dcd1b873ac3cb44846213`. Its
[explicit provider resolution](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/runtime_provider.py)
maps `openai-codex` to `codex_responses`; local `codex_app_server` is a separate
explicit opt-in through `model.openai_runtime`. This agrees with the existing
[selected Responses path](hermes-attempt-budget-contract-v1.md#selected-path-and-counter-meanings).
Therefore the CLI binary is not an established dependency of the selected
managed-Hermes transport. No installed profile, credentials or runtime resolver
was read or invoked to infer otherwise. Future runtime changes need their own
source-bound assessment.

The new [static observer](../../scripts/lib/agent-host-codex-pin.mjs) has no import
from any admission/launch module. Its result is inventory only, not a Job,
ownership, model, profile, budget or launch receipt. The incomplete direct-pin
integration was removed before this commit. No pin is bound to managed-Hermes
admission and no public registry version is upgraded.

## Bounded local observation

The current shell resolved one native `codex.exe`, with no cmd/bat/PowerShell
shim. Its unique embedded build marker is **0.155.0-alpha.9.2**; file/product
version metadata was empty. This is static evidence, not `--version` output.
The app package version is separate from the CLI version. Private running Worker
configuration was not inspected; this shell observation does not prove which
command a future Worker would use.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `codex.exe` | 316853040 | `bc45017e8239dc150258f69309ced9df6bbcdf5b8e4f346decf780ac0999e226` |
| `codex-code-mode-host.exe` | 72514864 | `b0deb8a88723e9ff59d2a0bf069f2446a9d14f6d23b91497f2fae58deb3273c6` |
| `codex-command-runner.exe` | 8234800 | `673f263039d9547efdbc445dce700bc20549d8ab480fdfa99bca9dfb040fb0d1` |
| `codex-windows-sandbox-setup.exe` | 15455024 | `827cbf395d0da31be53a1a8a85e98f8bdbce2c265c4f1e95b4ccaae61d728370` |

All four are AMD64 PE32+ files. Offline Windows `WinVerifyTrust` returned
`0x00000000` for each using flags `0x1080`, including
[`WTD_CACHE_ONLY_URL_RETRIEVAL`](https://learn.microsoft.com/en-us/windows/win32/api/wintrust/ns-wintrust-wintrust_data).
This uses existing local trust material; it is not online revocation or complete
package/protocol qualification. The observer itself does not perform signature
verification or treat a matching hash as publisher authorization.

Static imports yielded 22 direct System32 file identities/hashes and four OS API
set names. Transitive DLLs, API-set host mapping, dynamic loads, other tools and
profile-dependent helpers are not a complete qualified dependency closure.
The observer checks physical file identity, content, the three sibling helpers,
bounded PE parsing, PATH/PATHEXT and the observed version. The versioned private
record expires within 24 hours and fails readback on revocation or drift. This
does not promise atomic installation immutability or executable compatibility.

One nonsecret observation record was written outside Git. It grants no authority.
The existing Writer state directory has inherited Users directory write/create
and child-file read permissions; secure trust-anchor/private-key provisioning
was not established. No signing key, private acceptance or anchor was created,
and no ACL was changed. This remains a separate real-issuer blocker. No private
machine paths, installation IDs or credentials are distributed in this document.

## Verification and remaining scope

Static tests use synthetic PE bytes and one explicit read-only installed-record
reference. They cover changed runtime/helper/identity/version/dependency records,
missing helpers, malformed/oversized/expired/revoked records, shim substitution
and PATH/PATHEXT drift, with process creation disabled. An ordinary test run
without the explicit private reference skips only the installed-record case.
Signed direct-policy rejection and no-effect/no-resume checks retain the existing
fixed Job, ownership, durable review and recovery tests. No candidate PE, help,
version, auth/status, API prompt, Hermes/Ollama/model or application task ran.

All six readiness flags remain false. Task/Ready/Writer/scope, original ownership,
Windows Job v2, budget/output limits, durable review/recovery and independent
release authority remain required. Neither a static pin nor residual-risk
acceptance satisfies missing gates.

Final validation: **19/19** static inventory cases, **135/135** trusted-policy,
containment and launch cases, and **149/149** provider/lifecycle/fixed-program/
model/packet regressions passed. The installed-record test initially rejected
its noncanonical test path; the harness now normalizes that path and its full
19-case suite passed. `npm run validate` passed lint, TypeScript and server/web
builds, retaining the existing large-chunk warning. Both documentation validators
and whitespace checks passed. No database/API integration or production trial ran.

An earlier test-helper cleanup failure was fixed (missing assertion import).
Temporary test-state directories from that failed run remain: automatic approval
review blocked their proposed removal with `blocked by policy`, without further
reason. This is not a provider run or production-state recovery authorization.
Unrelated product/planning edits are excluded from this commit; `design-qa.md`
was not read or staged.

**Exactly one proposed next atom:** qualify a source-only, backend-aware managed
Hermes admission contract for explicit Codex Responses versus local Ollama,
mapping existing authority/model/profile/budget/Job requirements and denial
cases. Keep unresolved safe anchor provisioning explicit; no routing
implementation, installation, key provisioning or real launch follows from this
proposal. Stop after this inventory/amendment slice.
