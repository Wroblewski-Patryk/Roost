# Next development work

The repository cleanup established a stable baseline for continued product
development. No Codex Agent Host issue queue is stored in the repository.

## Recommended order

First-agent direction is accepted in
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md). Next atomic task:
**RF-RUNTIME-005 — resolve the stable upstream structured-CLI/single-turn gap**,
following the [RF004 proposal](../architecture/hermes-replacement-pin-proposal-v1.md).
Newest stable 0.21.3 is rejected: missing --format stream-json and unqualified
strict one-turn behavior. No compatible stable replacement is ready to install;
do not begin OAuth or model/MCP runs. Native Hermes is first,
direct CLI alternative, Herdr optional. Disposable VM/Windows Sandbox/Hyper-V is
not a prerequisite. All existing execution/pilot/live gates remain false.

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
