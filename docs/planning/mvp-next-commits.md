# Next development work

The repository cleanup established a stable baseline for continued product
development. No Codex Agent Host issue queue is stored in the repository.

## Recommended order

First-agent runtime work follows the proposed
[RF-RUNTIME-001 decision packet](../architecture/first-agent-runtime-decision-v1.md).
Its next atomic task is **RF-RUNTIME-002: owner decision**, not a pilot launch.
If accepted, the bounded dependency order is provider/readiness reconciliation,
exact native CLI envelope evidence, scoped admission/lifecycle implementation,
uncommitted-result binding, synthetic verification with independent review, then
a separately granted single live attempt. Each step has the packet's exit gates;
none is automatically authorized. Do not require RF023's additional VM/Sandbox
qualification for this proposed CLI route or silently disable existing guards.
Keep execution/pilot/live gates false pending their exact future admission.

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
