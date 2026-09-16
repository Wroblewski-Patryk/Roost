# Next development work

RF-RUNTIME-005C [native owned-job qualification](../architecture/windows-owned-process-job-v1.md)
is complete for local fixture process lifetime/cleanup. Native receipt validation
is required per attempt; missing proof remains fail-closed.
[RF-RUNTIME-005B2 credential-source qualification](../architecture/hermes-credential-source-qualification-v1.md)
is **NOT_QUALIFIED** for current stable 0.21.3 and the inspected immutable upstream
snapshot; public provider/middleware/secret-source extensions do not establish the
complete auth boundary. Exactly one proposed next atom: **RF-RUNTIME-005B3 — specify
and qualify an external native Worker credential-access guard with synthetic data**.
Owner acceptance is required first; B3 is not started. The existing 0.21.2 pin, all
six false gates and the pending profile/OAuth setup remain unchanged.

The repository cleanup established a stable baseline for continued product
development. No Codex Agent Host issue queue is stored in the repository.

## Recommended order

First-agent direction remains native Hermes behind Windows Worker under
[ADR-004 version 2](../decisions/ADR-004-native-hermes-codex-pilot.md).
[RF-RUNTIME-005A quiet v1](../architecture/hermes-supervised-quiet-v1.md) retains
stable 0.21.2 and removes stream-json waiting from the supervised pilot scope.
RF-RUNTIME-005B1 split out configuration and OAuth preflight; it stopped at the
credential-source gap above. Profile creation/sealing and owner-present OAuth
remain pending. They do not grant a model run, upgrade or automatic pilot authority.
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
