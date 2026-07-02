# LUC-5571 Browser Proof Handoff For High-Risk Workbench Coverage Debt

Date: 2026-07-01
Issue: [LUC-5571](/LUC/issues/LUC-5571)
Parent: [LUC-5562](/LUC/issues/LUC-5562)
Stage: verification

## Task Contract

- Goal: turn the reassigned frontend/browser proof issue into an executable
  specialist handoff for one high-risk workbench route.
- Task Type: PM triage and specialist handoff.
- Current Stage: verification.
- Deliverable For This Stage: integrated child proof result, final parent
  disposition, and residual-risk classification.

## Scope

Inspected inputs:

- Paperclip heartbeat context for [LUC-5571](/LUC/issues/LUC-5571)
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/planning/v1-operations-cockpit-task-contract.md`
- `docs/planning/v1-tasks-delivery-workbench-task-contract.md`
- `docs/planning/v1-data-evidence-browser-task-contract.md`
- `docs/planning/assets-file-preview-workbench-task-contract.md`
- `docs/planning/ops-assets-workbench-polish-task-contract.md`
- `docs/planning/ops-assets-workbench-refinement-task-contract.md`
- `docs/ux/evidence/`

Exclusions:

- No product code, test code, schema/API change, provider mutation, protected
  smoke, push, deploy, restart, credential value read, or secret disclosure.
- No duplicate proof selected for workbenches that already have suitable
  real-backend browser evidence.

## Implementation Plan

1. Acknowledge the reassignment from the paused role and confirm this PM lane
   must triage or delegate rather than silently absorb frontend QA ownership.
2. Read the live issue context and current app-completion/browser evidence
   signals.
3. Compare candidate workbench routes against existing proof packets.
4. Select one route with the strongest unresolved browser confidence gap.
5. Create a specialist child issue with exact proof commands, route, evidence,
   exclusions, and final report requirements.
6. Put [LUC-5571](/LUC/issues/LUC-5571) into a clear blocked-by-child
   disposition until the browser proof is complete.

## Candidate Review

| Candidate | Existing evidence | Decision |
| --- | --- | --- |
| `/operations` | `docs/planning/v1-operations-cockpit-task-contract.md`; desktop/mobile screenshots `docs/ux/evidence/v1-operations-cockpit-real-backend-*.png`; real backend proof recorded no horizontal overflow. | Do not duplicate. |
| `/tasks-adapter` | `docs/planning/v1-tasks-delivery-workbench-task-contract.md`; desktop/mobile screenshots `docs/ux/evidence/v1-tasks-delivery-real-backend-*.png`; real backend proof created and moved a task. | Do not duplicate. |
| `/data` and `/data/procedures` | `docs/planning/v1-data-evidence-browser-task-contract.md`; desktop/mobile screenshots `docs/ux/evidence/v1-data-evidence-browser-*.png`; real backend proof covered table evidence. | Lower priority than Assets/Drive for this handoff. |
| `08 Assets -> Files and folders` / Drive preview | `docs/planning/assets-file-preview-workbench-task-contract.md`, `docs/planning/ops-assets-workbench-polish-task-contract.md`, and `docs/planning/ops-assets-workbench-refinement-task-contract.md` record mocked/static route proofs for Markdown, CSV, JSON, image, PDF, and path context. | Selected because it remains the clearest high-risk workbench candidate for a fresh scoped browser proof against the current local app surface. |

## Selected Handoff

Selected route family: `08 Assets -> Files and folders` / Drive preview.

Recommended route target for the specialist:

- preferred: authenticated Assets route opened through the current active
  shell navigation to `08 Assets -> Files and folders`;
- acceptable if route identity is clearer from code inspection: the direct
  Assets route path registered for the Assets files/folders workbench.

Required proof:

- Run `npm run build:web`.
- Run a scoped owner-console/browser proof for the selected Assets/Drive
  preview route on desktop, tablet, and mobile.
- Record report path and screenshots.
- Record console errors, page errors, failed required requests, and horizontal
  overflow status.
- Verify loading, ready, empty/error or unsupported-file state, and at least
  one content preview state from the current route implementation.
- State whether product repair is warranted. If no defect appears, classify the
  remaining debt as proof-linkage or stale evidence debt.

## Acceptance Criteria

- [x] Current issue and reassignment context were read.
- [x] Existing high-risk workbench proof packets were compared.
- [x] A single specialist route target was selected.
- [x] A child issue was prepared for the appropriate active specialist owner.
- [x] Parent disposition is explicit and not left as inert `in_progress`.
- [x] Delegated browser proof [LUC-6698](/LUC/issues/LUC-6698) completed.
- [x] `npm run build:web` passed in the delegated proof.
- [x] `/areas?area=08-zasoby&view=files` was proved at desktop, tablet, and
  mobile.
- [x] Console issues, page errors, failed required requests, horizontal
  overflow failures, and state failures were all empty in the delegated
  report.
- [x] Product repair assessment recorded: no repair warranted; remaining debt
  is stale proof-linkage/evidence debt.

## Result Report

Status: `DONE`.

The latest comment changed the action from waiting on a paused role to PM
triage and reassignment. The selected unresolved proof lane is the Assets/Drive
preview workbench because Operations and Tasks already have real-backend
browser proof, while Assets/Drive proof is currently documented through
mocked/static route proofs and remains the better high-risk UI-facing coverage
gap.

Delegated follow-up [LUC-6698](/LUC/issues/LUC-6698) completed the scoped
browser proof. Evidence packet:
`docs/planning/luc-6698-assets-drive-workbench-browser-proof.md`. Browser
report:
`docs/ux/evidence/luc-6698-assets-drive-workbench-browser-proof/report.json`.
The route `/areas?area=08-zasoby&view=files` rendered through the current
authenticated app surface at desktop, tablet, and mobile with loading, ready,
empty-filter, markdown preview, and unsupported-file states covered. Aggregate
result: `consoleIssues=[]`, `pageErrors=[]`,
`failedRequiredRequests=[]`, `horizontalOverflowFailures=[]`, and
`stateFailures=[]`.

Decision: product repair is not warranted from the current proof. The blocker
on [LUC-5571](/LUC/issues/LUC-5571) can be cleared and the issue closed as
done; any remaining work is stale proof-linkage/evidence debt outside this
browser-proof handoff.

Source-control closure: this packet is a PM planning/handoff artifact in the
existing shared mixed-dirty Roost worktree. Commit was not created because the
branch was already ahead of `origin/main` with many unrelated modified and
untracked planning/evidence files. Push status: not needed. Deploy impact:
none.
