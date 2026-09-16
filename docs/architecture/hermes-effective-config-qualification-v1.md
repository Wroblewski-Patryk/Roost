# Hermes effective configuration qualification v1

RF-RUNTIME-005B5, 2026-09-16. **BLOCKED for complete effective-runtime qualification.** The exact official loader read the synthetic copy of the approved profile and returned all explicit overrides, but this is a partial, intercepted loader observation, not qualification of startup consumers. No inference was performed. The existing `hermes_sealed_config_enforcement_unproven` blocker and all six false gates remain.

## Mechanism and actual observation

The [opt-in qualification runner](../../scripts/qualify-hermes-effective-config.mjs) uses the installed venv Python with `-I -S -B` and the [minimal loader probe](../../scripts/hermes_effective_config_probe.py). It imports official `hermes_cli.config.load_config`, without patching upstream code or using a fork. Installed checkout HEAD is exactly **0.21.2 / 939e45c91d751fadd94dcd1b873ac3cb44846213**. Fourteen local source files were compared, after CRLF normalization, with the same commit's Git blobs; the private receipt records their hashes. This is not a new whole-installation/dependency attestation.

Version/help were qualified statically before any executable path. Public CLI execution was rejected: [main.py lines 579–602](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/main.py#L579-L602) performs launcher repair and dotenv/external-secret loading before normal command dispatch. [env_loader.py lines 327–409](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/env_loader.py#L327-L409) handles local/project env files, external secrets and managed environment overlays. Therefore no Hermes version/help/config/doctor/chat command was run through that entry point. Public config get/check and doctor parsers do not bypass it.

Each probe runs inside the existing native Windows Job Object, with a 15-second lifetime, bounded stdout/stderr, atomic membership, KILL_ON_JOB_CLOSE and zero-active-process cleanup. Only OS plumbing and synthetic HOME/USERPROFILE/APPDATA/LOCALAPPDATA/CODEX_HOME/HERMES_HOME/managed/temp paths enter the environment. No real home/auth source is inherited. The real private config is read only by Roost to verify its digest; **Hermes reads an identical synthetic copy**, never the private profile or real credentials.

The Python audit hook rejects network transport, process creation, credential-file access, restricted auth/agent/tool/plugin imports and reads/writes outside its reviewed source/runtime/synthetic roots. This is instrumentation of reviewed Python code, not a native-code security sandbox. Exceptions may be caught by upstream, so any denial prevents a clean qualification claim even if values are returned.

The final observed negative receipt records:

- all 33 explicit-value/path/version/integrity/thread checks true;
- network/process/outside-write denials: 0/0/0;
- credential-or-restricted-import denials: 13; outside-read denials: 22;
- synthetic initialization operations: 23; local metadata calls: 1;
- private profile unchanged; native process exit 0; owned-tree cleanup complete, active processes 0;
- 886 bytes of stderr discarded; no raw stderr/exception/path/account output retained.

The `credential` counter combines prohibited module imports and credential-file attempts. It does **not** mean 13 credential reads occurred. Blocked operations did not proceed. The full returned merged configuration was never printed or persisted, only fixed boolean categories.

Early probe preparation was stopped by instrumentation: local hostname lookup, then an outside read. Static examination established that installed Python's `platform.system()` obtains local hostname metadata, not network transport; only `socket.gethostname` was classified separately, with no value recorded. [config.py lines 570–583](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config.py#L570-L583) exposes `HERMES_SKIP_CHMOD`, used solely in the synthetic environment to bypass its irrelevant `/proc/1/cgroup` probe. Network/credential/process restrictions were not relaxed. After the final nonzero denial counters, further loader probes stopped.

## What is and is not proven

| Requirement | Evidence and limit |
| --- | --- |
| Selected profile and overrides | Official [load_config](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config.py#L2152-L2209) selected the synthetic HERMES_HOME file. Every explicit override matched; its bytes equal the approved config digest `883654f3e75f23f4b2dd273dfef690bf60285772ca42b0ec6e81ef9e2c252223`. Real private launch-location behavior was not executed. |
| Provider/model/reasoning | Worker candidate argv is packet-derived. Empty configured model/providers and disabled smart routing were observed. No execution of provider resolution or reasoning consumers occurred. |
| Fallback and rotation | Empty fallback list observed. [Credential pool strategy](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/credential_pool.py#L555-L562) has selection strategies, not a qualified no-rotation switch. Approved same-owner reuse remains allowed; a general rotation/fallback prohibition is not established. |
| MCP and tools | Empty MCP and CLI toolsets observed. [Tool resolution](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/tools_config.py#L551-L602) also consults plugin/native tool recovery and merges MCP. The actual registry was not instantiated, so no runtime minimal-tool-surface claim. |
| Delegation, cron, gateway, background tasks | Worker has no gateway/cron/delegation command path; no such process ran in the probe. No blanket configuration switch was invented. Job cleanup controls lifetime, not what a permitted child can do before exit. Consumer-level prevention remains unqualified. |
| Plugins, skills and memory | Empty plugins/hooks and explicit skill/memory controls observed. [Home initialization](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config_home.py#L43-L67) still creates directories and seeds SOUL.md; this occurred only in disposable synthetic storage. No private profile mutation occurred. Config-readonly means shared cache, not side-effect-free initialization. |
| Telemetry/update | Explicit shared-metrics and update-check controls returned disabled. Their full startup consumers were not invoked or qualified. |
| Secrets/environment | Real stores were never read. Restricted import/read attempts were intercepted; [scope-aware env access](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config.py#L2657-L2688) catches some import errors and can fall back. Thus returned values under interception cannot certify an unrestricted startup. |

Current enforcement for every unqualified capability is **deny before spawn**, not an assertion that Job membership or an empty list disables that capability inside a running Hermes process.

## Receipt and admission

The versioned [diagnostic schema](../../scripts/lib/agent-host-hermes-effective-config.mjs) accepts only the exact pin/config digest, the official-loader mechanism, complete fixed boolean categories, bounded counters and `result=blocked`. Unknown fields, raw output, different pin/digest/mechanism, incomplete results and asserted `qualified` outcomes are rejected with a fixed error. No successful issuer was invented.

A new private `effective-config-qualification.json` was created outside application repositories and read back exactly. It contains schema/policy/profile versions, pin, config digest, source hashes, timestamp, categories and the negative result. No existing file was overwritten; no backup was needed. B3 config and B4 owner-attestation/binding stayed unchanged.

**The negative receipt is diagnostic, not bound as Ready authority.** There is no qualified effective-config receipt or admission path in this atom. Missing, expired, forged and partial receipts cannot remove the existing mandatory blocker; candidate `configReceipt` remains null and command/args remain null. Profile/provider strict schemas reject adding an invented receipt field. Binding a PASS receipt to Ready/expiry is deliberately unimplemented because no complete PASS evidence exists. Positive full-qualification tests are therefore not claimed. Existing B3/B4 Ready drift and authority checks still apply.

## Verification and next step

Eighteen targeted negative-schema/admission tests pass. Profile/owner-attestation, adapter/input/quiet/provider/lifecycle and native Job regressions passed, as did typecheck/lint/build, both documentation validators, 498 changed-document local links, privacy, Python/Node syntax and diff checks. Build retains static-asset and large-chunk warnings. Private negative receipt readback passed; task fixture directories and native fixture processes remaining: zero. Native Job fixtures cover child/grandchild and controller-loss cleanup; the real loader probe itself created no child process. No model, MCP, login/logout, OAuth, browser, installation, update, Docker/WSL/VPS/production or push/deploy operation occurred.

B1/B2 historical findings and B4's authoritative single-owner attestation/residual account-switch and unreported-session-loss risks remain unchanged. No separate token store, VM or Restricted Token/ACL guard was introduced.

The B5 handoff recommended B6 source-only startup/tool/rotation analysis. Subsequent
[RF-RUNTIME-005B6](hermes-minimal-startup-contract-v1.md) is complete with
NOT_SUPPORTED for strict minimal startup on the unchanged public CLI. B5's negative
receipt remains diagnostic only. The sole next recommendation is B7's narrow owner
decision on enumerated startup side effects; no probe, pin change or requirement
waiver follows automatically.

`implementationReady=false`; `executionSupported=false`; `pilotReady=false`; `liveAdmissionAllowed=false`; `pilotExecutionAuthorized=false`; `pilotExecutionStarted=false`.
