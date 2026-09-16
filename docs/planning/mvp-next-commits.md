# Next development work

RF-RUNTIME-005C [native owned-job qualification](../architecture/windows-owned-process-job-v1.md)
is complete for local fixture process lifetime/cleanup. Native receipt validation
is required per attempt; missing proof remains fail-closed.
[RF-RUNTIME-005B3 same-owner profile](../architecture/hermes-same-owner-profile-v1.md)
implements the accepted reuse of the owner's Codex CLI auth source. The owner
rejected a separate token store and external Restricted Token/ACL credential guard.
Profile creation/readback and synthetic Ready-bound admission are complete; live
identity remains BLOCKED / owner-interaction-required. Exactly one recommended
next atom: **RF-RUNTIME-005B4 — owner-present qualification of nonsecret same-owner
identity evidence**. It is not started. The owner must confirm the intended account
in a visible interface without sharing secrets; this alone grants no model run.
The 0.21.2 pin, native Job lifecycle and all six false runtime gates are unchanged.

The repository cleanup established a stable baseline for continued product
development. No Codex Agent Host issue queue is stored in the repository.

## Recommended order

First-agent direction remains native Hermes behind Windows Worker under
[ADR-004 version 3](../decisions/ADR-004-native-hermes-codex-pilot.md).
[RF-RUNTIME-005A quiet v1](../architecture/hermes-supervised-quiet-v1.md) retains
stable 0.21.2 and removes stream-json waiting from the supervised pilot scope.
RF-RUNTIME-005B3 prepares a private profile and synthetic admission binding under
the accepted same-owner auth policy. Nonsecret identity qualification remains
pending; no model run, upgrade or automatic pilot authority follows.
Native whole-tree recovery now has fixture evidence; remaining
configuration/auth/tool/turn/budget blockers still require proof. All six runtime
flags remain false. Direct CLI is an alternative, Herdr optional, VM/Sandbox is
not a prerequisite. Future local Ollama stays planned/disabled until confirmed
disk expansion and separate qualification; routing never hides a fallback.

Other product work remains available independently of that runtime decision:

1. Run the application locally and verify the owner flows against a disposable
   development database.
2. Review each `00`-`12` department workbench with real workspace data and
   record product gaps as normal issues outside the repository.
3. Finish the first owner-authorized Google Drive import.
4. Refresh production deployment identity only after an approved release.
5. Add focused regression tests alongside every changed runtime contract.

## Definition of ready

A change is ready to commit when typecheck, structural lint and build pass,
relevant tests pass, documentation matches behavior, and no generated cache or
sensitive local artifact is staged.
