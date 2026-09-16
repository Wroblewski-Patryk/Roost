# Hermes native tool boundary v1

RF-RUNTIME-005B10, 2026-09-16. Source-only qualification is complete.
**BLOCKED on one owner decision:** acceptance of the residual native-tool risk
specified below. Recommended contract: **roost-hermes-native-audited-coding-v1**.
This is a practical same-owner coding contract, not filesystem/network isolation.
No Hermes execution, loader, model, tool, upstream test or private-profile read
was used. Hermes remains 0.21.2 at
`939e45c91d751fadd94dcd1b873ac3cb44846213`; links below identify that exact source.

[ADR-004 v6](../decisions/ADR-004-native-hermes-codex-pilot.md),
[B7 startup](hermes-minimal-startup-contract-v1.md) and
[B9 attempt budget](hermes-practical-attempt-budget-v1.md) remain authoritative.
Their accepted authentication, startup and accounting risks do not constitute
acceptance of unrestricted native file/terminal effects. B10 proposes no new ADR
version and changes no runtime, private configuration, dependency or admission.

## Source evidence and actual authority

| Surface | Exact source | Control and gap |
| --- | --- | --- |
| Tool expansion | [toolsets.py L100-L124](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/toolsets.py#L100-L124), [resolution L353-L395](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/toolsets.py#L353-L395) | `file` expands to read_file, write_file, patch, search_files. `terminal` includes terminal and process_manage. Registry contributions can extend resolved sets; a label is not proof of a fixed list. |
| Selection and dispatch | [model_tools.py L280-L334](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/model_tools.py#L280-L334), [turn_tool_round.py L89-L114](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/turn_tool_round.py#L89-L114) | Agent rejects unavailable tool names; public toolset selection does not expose a general per-tool read-only subset. Disabled toolsets subtract sets, not write methods within file. |
| Safe mode | [plugins.py L1204-L1221](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/plugins.py#L1204-L1221), [portable MCP L1382-L1404](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/plugins.py#L1382-L1404), [MCP config L320-L326](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/mcp_tool_config.py#L320-L326), [shell hooks L139-L147](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/shell_hooks.py#L139-L147) | Required safe mode disables these extension-loading paths. A custom plugin/MCP/pre-tool hook is therefore not the boundary for this contract. Built-in tools retain host authority. |
| Path anchoring | [file_tools_paths.py L81-L200](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_tools_paths.py#L81-L200) | cwd is an anchor, not an allowlist. Absolute paths remain possible. Windows anchoring uses ntpath normalization; outside-workspace resolution can produce a warning rather than denial. |
| Public write root | [file_safety.py L54-L74](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/file_safety.py#L54-L74), [L109-L160](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/file_safety.py#L109-L160) | Nonempty `HERMES_WRITE_SAFE_ROOT` adds a realpath-based file-write check. Unset/empty roots do not restrict writes. Credential/protected-state denies remain. SSH-config approval handling precedes the root test, so quiet deny must also remain fixed. This does not guard terminal commands or reads. |
| Read/search and special paths | [file_tools.py L171-L214](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_tools.py#L171-L214), [read L540-L587](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_tools.py#L540-L587), [search L929-L978](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_tools.py#L929-L978) | Selected device, binary, sensitive-file checks and redaction do not restrict all reads/searches to the repository. Search-result filtering occurs after backend work. |
| Patch/delete/move | [file_tools.py L816-L841](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_tools.py#L816-L841), [file_operations.py L1019-L1058](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_operations.py#L1019-L1058) | Patch can delete or move files; these paths call the write guard. V4A traversal-header rejection is not a universal ban on absolute paths or legacy path input. Hidden schema variants do not remove handler capabilities. |
| File tools execute helpers | [file_operations.py L180-L207](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_operations.py#L180-L207), [atomic writes L360-L414](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_operations.py#L360-L414), [write L1208-L1265](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_operations.py#L1208-L1265) | Shell helpers run directly through the environment, outside terminal-tool command approval. Atomic writes create adjacent temporary files; hard termination can leave them behind. File-only is not process-free. |
| Lint and LSP | [file_operations_lint.py L15-L23](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_operations_lint.py#L15-L23), [L130-L169](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/file_operations_lint.py#L130-L169), [config_defaults.py L2128-L2147](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config_defaults.py#L2128-L2147), [LSP manager L100-L174](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/lsp/manager.py#L100-L174) | Post-write checks can launch node, npx, go or rustfmt. LSP defaults enabled with automatic installation. Inference: dependency-resolving helpers may access the network; selecting file alone does not prove network silence. Proposed profile explicitly disables LSP. |
| cwd and shell | [local.py L172-L201](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/environments/local.py#L172-L201), [L341-L390](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/environments/local.py#L341-L390), [L754-L788](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/environments/local.py#L754-L788) | Windows uses Git Bash, which evaluates a command string. Missing cwd can recover to an ancestor/temp directory. Shell access can invoke PowerShell, Git, Docker or programs outside cwd using ambient owner rights. |
| Environment and initialization | [local.py L542-L603](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/environments/local.py#L542-L603), [L685-L743](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/environments/local.py#L685-L743) | Child environment is inherited/merged with filtering, not a filesystem credential barrier. Disabling auto_source_bashrc does not eliminate login-Bash startup behavior. Environment initialization precedes command approval. Windows uses the profile terminal cache even with TERMINAL_TEMP_DIR. |
| Temporary-cache pruning | [local.py L51-L105](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/environments/local.py#L51-L105) | Startup pruning of the managed cache uses age, not Roost attempt ownership. Redirecting TEMP is not proof of exclusive cleanup. Proposed preflight must refuse an unowned/nonempty auto-pruned cache rather than delete its contents. |
| Approvals and unattended mode | [approval.py L876-L925](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/approval.py#L876-L925), [L994-L1053](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/approval.py#L994-L1053), [approval_context.py L260-L284](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/approval_context.py#L260-L284) | Quiet single-query deny refuses approval-requiring commands; ordinary unflagged commands can run. Permanent allowlists bypass prompts for matches, not deny every nonmatch. No strict executable/argument, path, network or destructive-operation allowlist follows. |
| Rule/parser limitations | [approval_floors.py L23-L80](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/approval_floors.py#L23-L80), [L188-L204](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/approval_floors.py#L188-L204), [deny tests L42-L60](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/tools/test_approval_deny_rules.py#L42-L60) | Glob/normalized-command detection is not shell-program analysis. Deny config failures can fall open. Parser-limit handling may write raw command scripts to a profile cache; these must not become repository/evidence content. |
| Foreground/background | [terminal_tool.py L949-L974](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/terminal_tool.py#L949-L974), [L1170-L1235](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/terminal_tool.py#L1170-L1235) | Explicit background mode exists; an oversized foreground timeout can promote execution to background. Per-command timeout is not the B9 attempt deadline. Model dispatch does not forward the internal force bypass. |
| Process management | [process_registry.py L901-L955](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/process_registry.py#L901-L955), [L2109-L2193](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/process_registry.py#L2109-L2193) | Registry handles background sessions and poll/log/wait/kill/write/submit/close. Interactive stdin can extend a previously approved interpreter. Scoped session IDs are not confinement of arbitrary shell-created processes or daemon-mediated effects. |

Detection of selected destructive patterns is not a blanket ban on ordinary Git
commit/push, arbitrary PowerShell, Docker, package scripts or application starts.
A permitted build/test command can itself run nested programs or network requests.
The command's full transitive behavior is not derived from its displayed name.
The [model terminal handler L1302-L1354](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/terminal_tool.py#L1302-L1354)
does not forward internal force; adding an unknown model argument does not grant
that bypass. This still does not turn pattern approvals into containment.

## Windows path boundary

| Input or race | Practical interpretation |
| --- | --- |
| Absolute paths / `..` | Public write-root guard checks resolved file-write targets; cwd alone does not. Read/search and shell are outside this root restriction. |
| Symlink / junction / reparse point | Realpath checks improve file-write screening. They do not establish handle-relative Windows confinement, cover all reparse types, or bind a later shell open to the checked identity. |
| UNC / device namespace / ADS | Some special devices are rejected. Comprehensive Windows rejection/canonicalization of these forms is not established by this qualification; no fail-closed containment claim. |
| Case aliases | Windows anchoring normalizes paths; containment helper also has string comparisons. No universal case-insensitive identity proof follows. Conservative rejection is preferable to widening scope. |
| TOCTOU | Validation and actual access occur separately, including shell helpers and later symlink dereference. A same-owner process can change the target between them. |

Pinned [write-root tests L71-L99](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/tools/test_file_write_safety.py#L71-L99)
and [outside-write test L194-L208](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/tools/test_file_write_safety.py#L194-L208)
support ordinary guarded writes, not the complete Windows/race matrix.
[cwd warning test L157-L179](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/tools/test_file_tools_cwd_resolution.py#L157-L179)
is evidence of warning behavior. Tests were inspected as source, not executed.

## What the current Worker can enforce

| Phase | Existing control | Limit / recovery |
| --- | --- | --- |
| Before spawn | [workspace guard](../../scripts/lib/agent-host-workspace-guard.mjs) validates mapped canonical Git root/origin and root/repository link identity. [Writer lock](../../scripts/lib/agent-host-writer-lock.mjs) admits one supported writer per laptop. | Not a global scan for clones, OS-wide exclusion, or native-tool path restriction. Other owner processes can still act. |
| Before spawn | [Startup seal](../../scripts/lib/agent-host-hermes-startup.mjs), [profile](../../scripts/lib/agent-host-hermes-profile.mjs), [budget](../../scripts/lib/agent-host-hermes-budget.mjs) bind Ready/input/config/route/toolsets and finite attempt. | Current profile v3 does not implement this proposed write-root/approval/LSP/footprint policy. Existing packet tools are read/write/local_test; no typed commit authority. |
| During execution | [Windows Job](../../scripts/lib/agent-host-windows-job.mjs) owns the descendant tree; B9 enforces the original deadline and cleanup margin. | No filesystem/network denial. A request to an already-running daemon, service or remote endpoint can have effects outside the Job. Killing descendants cannot undo such effects. |
| After execution | [Workspace evidence](../../scripts/lib/agent-host-workspace-evidence.mjs) takes consistent bounded snapshots of Git-visible uncommitted bytes and identity. | Ignored files, arbitrary external paths, network effects and transient create/delete activity are not covered. Prompt rules are intent, not a sandbox. |
| Review / recovery | Independent review of exact candidate bytes, tests and genuine cleanup receipt; missing evidence blocks completion. | No automatic rollback of arbitrary effects, no reset --hard/checkout -- to hide damage. Preserve unrelated changes and report uncertainty. |

## One recommended authority contract

The selected contract keeps public unmodified Hermes, required safe mode, exact
pin, B7 startup and B9 coding-small-v1. No fork, custom plugin, VM, Restricted
Token, ACL redesign, proxy or additional agent framework is a prerequisite.

| Authority profile | Proposed admission |
| --- | --- |
| inspect-readonly | Native Hermes file toolset is **not admitted** as technically read-only: it bundles writes and helper processes. Use bounded Worker inspection until a separately qualified public read-only route exists; do not silently grant file. This does not block the coding-local proposal. |
| coding-local | Explicit repository_read + repository_write; file selected. Add terminal only with explicit local_test and a finite declared list of local commands. This list is task/review authority, not an enforced shell allowlist. No network installation, extra checkout/worktree, background app server, Docker/service operation, commit, push or deploy is implied. |
| release | Separate reviewed authority and execution. Native coding tools do not inherit push/deploy or production access. A local commit can be a later Worker-owned finalization after tests and independent review with explicit typed commit authority. Existing repository_write alone cannot grant it. |

Future sealed profile must set `HERMES_WRITE_SAFE_ROOT` to exactly the validated
canonical application root, reject empty/multiple/drifting values, and preserve
manual approvals with single_query_mode deny, no yolo/off/approve shortcuts and
no approval-bypass allowlist. Keep public deny rules as defense in depth; do not
call them an exact command allowlist. Explicit `lsp.enabled: false` prevents the
default LSP auto-install/start path; file lint/shell helpers remain a disclosed
capability. Disabling extra bashrc sourcing does not seal login-shell profiles.
No additional provider/network toolsets or dynamic extensions are selected.

### Workspace and resource hygiene

Before Ready, bind the canonical clone identity, Git common directory, branch and
head; inventory worktree registrations, existing dirty/staged/ignored outputs in
declared task scope, and the declared app's processes/ports. Keep one canonical
clone, no new checkout/worktree and one laptop writer. The first later coding
smoke starts **zero app servers**; if a later task needs one local app instance,
bind its identity and either reuse an explicitly authorized existing instance or
stop admission. Never kill an unrelated process to make a slot available.

Use bounded metadata inventories only for declared writable/cache/output roots;
do not scan the whole home directory or read credentials. Include repository
outputs, relevant package/build caches and upstream terminal/blocked-script cache
classes, plus accepted B7 profile/session effects. Bounds exceeded or unidentified
pre-existing entries in either upstream auto-pruned cache block startup; age-based pruning
must never be treated as Roost ownership. Additional possible helper/cache writes
remain disclosed unknowns, not a fabricated complete allowlist.

An attempt manifest binds root identity, baseline, created artifact identities,
process PID plus creation time, declared app/port and cleanup responsibility.
Compare the same inventory after execution and after cleanup. Evidence records
coverage and `unknown` explicitly. No observed extra clone or app instance is
evidence within coverage, not proof that a transient duplicate never existed.

Allow owned temporary files and build outputs without creating extra source
clones. Cleanup removes only artifacts proven created/owned by that attempt and
still matching their identities; ambiguous or changed paths are preserved and
reported. Adjacent atomic-write temporary files and killed helper output require
reconciliation. Never delete shared caches or existing user data as cleanup.
Do not use reset --hard, checkout --, clean -fd or blanket staging to conceal
failures. Unrelated staged/unstaged changes remain untouched.

Any later local commit finalization must verify tests, independent review,
unchanged expected head/index and exact approved paths/diff before selective
staging and committing. Until typed commit authority is implemented, return the
reviewed diff only. Push/deploy remains a separate release decision.

## One missing owner decision and residual risk

The precise decision requested is acceptance of this statement:

> For the small supervised coding-local pilot, I accept native Hermes running
> with the same owner's file and shell rights under the proposed audited coding
> contract. The public write-root check covers only guarded file writes; shell
> commands/helpers can read or write outside the application and use the network.
> Bounded inventories, review and owned process cleanup may detect some effects
> but cannot prevent or reverse every effect, prove absence of transient extra
> clones/app instances, or eliminate Windows path/TOCTOU races. This acceptance
> does not authorize those out-of-scope actions, release, or immediate execution.

That is one risk decision, not a demand for absolute safety or a new isolation
project. If accepted, the selected contract is ready to implement. If declined,
native coding-local remains blocked; do not silently substitute a weaker claim.
Neither source-only completion nor an exit-0 candidate substitutes for acceptance.

## Minimum implementation delta and next atom

After that owner decision, exactly one proposed atom is **RF-RUNTIME-005B11:
implement and synthetically qualify roost-hermes-native-audited-coding-v1**.
It must add the derived write-root and exact public approval/LSP settings to
versioned profile/startup validation; bind the accepted risk version, authority
profile, canonical root, task command intent and bounded footprint manifest to
Ready/input; recheck drift before spawn; and produce coverage-aware before/after
and owned-cleanup receipts. Diagnostic JSON cannot supply launch authority.

Minimum tests cover empty/drifting/extra roots; profile/approval/LSP drift;
toolset expansion and rejection of inspect-readonly-as-file; incorrect authority;
changed head/root/worktree/process identity; one-writer/app-instance admission;
inventory overflow/unknown ownership; preserving unrelated edits/cache entries;
cleanup after timeout/interruption; and receipts that never label partial
observation as containment. Synthetic Windows path cases should explicitly
report unsupported junction/device/ADS/race coverage rather than fake a pass.
Existing native Job fixtures remain the process-cleanup boundary; no real Hermes
or model run is implicitly included in B11. Typed local-commit finalization is
not required for the initial edit/test candidate and remains separately gated.

All six flags remain false: implementationReady, executionSupported, pilotReady,
liveAdmissionAllowed, pilotExecutionAuthorized, pilotExecutionStarted. Global
registry/API, pin, private files and final real-launch denial remain unchanged.
Runtime/inference/E2E/pilot/release qualification still needs its own authority.
