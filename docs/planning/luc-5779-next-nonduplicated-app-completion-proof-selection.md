# LUC-5779 Next Non-Duplicated App-Completion Proof Selection

## Task Contract

- Task Type: QA proof selection
- Current Stage: verification
- Deliverable For This Stage: selected row group, duplicate check, local
  validation result, and next owner for [LUC-5779](/LUC/issues/LUC-5779)
- Goal: inspect the current app-completion missing-test-link priority queue
  after [LUC-5777](/LUC/issues/LUC-5777) and choose one non-duplicated proof
  lane or close the selection when no legal non-duplicated runtime lane remains.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - recent proof packets for Account access, Dashboard overview, User
    configuration, Exchange connection/configuration, Trading/Strategy,
    Unclassified workflow, and Subscription inference
  - lightweight route/capability drift check
- Exclusions: product code changes, test authoring, browser/server/database
  startup, Docker validation containers, push, deploy, restart, protected
  production smoke, provider mutation, credential access, or secret disclosure.

## Selection Result

Selected row group for duplicate review:

| Row | Path | Flow | Current disposition |
| --- | --- | --- | --- |
| `USE /auth` | `src/app.ts#/auth` | Account access | Covered by prior auth/API/browser proof and alias-parity proof; evidence-link debt. |
| `USE /v1/auth` | `src/app.ts#/v1/auth` | Account access | Covered by [LUC-5661](/LUC/issues/LUC-5661) alias parity and [LUC-5561](/LUC/issues/LUC-5561) auth smoke; evidence-link debt. |
| `USE /dashboard` | `src/app.ts#/dashboard` | Dashboard overview | Covered by [LUC-5774](/LUC/issues/LUC-5774) dashboard command API proof; evidence-link debt. |

Selected next proof: none.

Reason: the current top-200 priority sample has no concrete non-duplicated
runtime-shaped row outside already-covered Account access and Dashboard
overview surfaces. Running `npm run test:api:local` again from this snapshot
would duplicate recent proof rather than reduce a new risk.

## Current App-Completion Readback

| Signal | Value |
| --- | --- |
| Generated at | `2026-06-28T02:42:41.423Z` |
| Counts | `934` items / `7` flows / `903` missing test links / `0` missing doc links / `0` blocked / `0` browser-review records |
| Priority rows inspected | `200` |
| Priority rows by flow | Account access `88`, Dashboard overview `6`, Exchange connection and configuration `1`, Subscription and entitlement `105` |
| Runtime-shaped missing rows | `74` |
| Runtime-shaped missing rows by flow | Account access `68`, Dashboard overview `6` |
| Route-mount rows | `USE /auth`, `USE /v1/auth`, `USE /dashboard` |

## Duplicate Check

| Flow family | Existing proof packet | Result |
| --- | --- | --- |
| Account access | [LUC-5561](/LUC/issues/LUC-5561), [LUC-5661](/LUC/issues/LUC-5661), [LUC-5713](/LUC/issues/LUC-5713) | Already covered for registration/login/auth-me, alias parity, fail-closed paths, and settings profile contract. |
| Dashboard overview | [LUC-5669](/LUC/issues/LUC-5669), [LUC-5774](/LUC/issues/LUC-5774) | Already covered by dashboard command route/API proof and route-signal curation. |
| User configuration | [LUC-5569](/LUC/issues/LUC-5569), [LUC-5713](/LUC/issues/LUC-5713) | Already covered by API prerequisite plus desktop/tablet/mobile settings browser proof and auth profile contract. |
| Exchange connection and configuration | [LUC-5409](/LUC/issues/LUC-5409) | Already covered by local adapter connection/configuration API proof without live provider mutation. |
| Trading operation | [LUC-5664](/LUC/issues/LUC-5664), [LUC-5417](/LUC/issues/LUC-5417) | Already mapped to Strategy read-only context proof; remaining label is classifier debt. |
| Unclassified user workflow | [LUC-5425](/LUC/issues/LUC-5425) | Already covered by local API backbone proof. |
| Subscription and entitlement | [LUC-5647](/LUC/issues/LUC-5647), [LUC-5658](/LUC/issues/LUC-5658), [LUC-5775](/LUC/issues/LUC-5775) | Current visible rows are document/generated evidence-link and scanner inference debt unless a future refresh surfaces a fresh concrete route/API/page row. |

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| App-completion JSON classification | PASS | Node readback confirmed `200` priority rows, `74` runtime-shaped missing rows, and route-mount rows limited to `USE /auth`, `USE /v1/auth`, and `USE /dashboard`. |
| Prior proof packet readback | PASS | `rg` readback found PASS/verified evidence in the relevant prior proof packets listed above. |
| Route/capability drift | PASS | `npm run check:route-capabilities` returned `180` manifest routes, `35` route files, `status=ok`. |
| Diff whitespace | PASS | `git diff --check` reported only existing LF-to-CRLF warnings. |

## Result Report

Status: verified QA selection.

No new product repair, test-authoring lane, protected runtime proof, browser
proof, or broad duplicate QA sweep is warranted from the current
app-completion snapshot. The actionable QA decision is to stop proof selection
until a future app-completion refresh surfaces a concrete unverified runtime
row outside the already-covered flow families, or until a fresh regression is
reproduced.

Next owner/action: Docs/Architecture or scanner curation should link existing
proof packets to the generated app-completion rows and separate
document/generated evidence-link debt from runtime proof candidates. QA/Test
should not rerun Auth, Dashboard, Settings, Exchange, Strategy, Unclassified,
or Subscription proof from this aggregate signal alone.

Files changed by this lane: this packet and source-of-truth state notes only.

Commit status: not committed in this heartbeat because the shared workspace is
already mixed-dirty and `main` is ahead of `origin/main` by `128` commits.

Push status: not needed.

Deploy impact: none.

Residual risk: app-completion still reports broad missing-test-link debt until
scanner/evidence-link curation attaches historical proof packets to generated
rows. This is classification debt from the current QA view, not a newly
reproduced runtime defect.
