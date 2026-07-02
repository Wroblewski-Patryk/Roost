# Task

## Header
- ID: LUC-6905
- Title: Map Exchange connection/configuration into visible settings chain
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: CTO / Frontend Builder lane
- Depends on: LUC-6902, LUC-6906
- Priority: P1
- Module Confidence Rows: Exchange connection and configuration frontend chain
- Iteration: 2026-07-02
- Operation Mode: BUILDER
- Mission ID: LUC-6905
- Mission Status: PARTIALLY_VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] Affected module confidence row was updated.
- [x] The task improves release confidence by removing the frontend-visible chain gap.

## Mission Block
- Mission objective: replace the disabled workspace settings integration/API placeholders with a backend-connected, redacted connection/configuration status chain.
- Release objective advanced: Project Truth `Exchange connection and configuration` chain no longer has an absent frontend implementation in the settings surface.
- Included slices: `/workspace/settings` React UI, shared frontend types, i18n strings, desktop/mobile browser proof with backend-shaped responses, build proof, state documentation.
- Explicit exclusions: secret editing, provider mutations, protected provider actions, database migrations, production deploy, broad Project Truth generated-index refresh.
- Stop conditions: raw secret exposure, raw backend error exposure, broken web build, route overflow, or missing settings proof.
- Handoff expectation: generated Project Truth/event-chain index refresh is tracked in [LUC-6911](/LUC/issues/LUC-6911) because Docker/local backend was unavailable for real backend journey proof.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | AGENTS.md, Paperclip wake payload | Integration, task closure, state updates | Mission packet and issue disposition | Parent validation gate | DONE |
| Frontend implementation | Active chat | `web/src/features/settings/settings-routes.tsx`, backend route contracts | Workspace settings route, types, i18n | Visible redacted connector settings chain | `npm run build:web`, browser proof | DONE |
| QA/Test | Active chat | Acceptance criteria | Desktop/mobile settings proof | Responsive screenshots/report | Playwright fallback proof | PARTIALLY_VERIFIED |
| Documentation/Memory | Active chat + [LUC-6911](/LUC/issues/LUC-6911) | Project memory index | State files and follow-up issue | Durable evidence and generated-index follow-up | State/doc updates | DONE |

## Context
LUC-6902 and LUC-6906 both identified the same Project Truth event-chain gap:
`Exchange connection and configuration` had backend contracts but no visible
frontend settings chain. The existing workspace settings UI exposed disabled
API/integration buttons even though `/v1/connection` and
`/v1/integration-settings/:provider` already return redacted configuration
posture.

## Goal
Expose the Exchange connection/configuration posture in signed-in workspace
settings using existing backend contracts, without displaying secret values or
raw provider/backend errors.

## Scope
- `web/src/features/settings/settings-routes.tsx`
- `web/src/types.ts`
- `web/src/i18n/messages.ts`
- `docs/planning/luc-6905-exchange-connection-configuration-visible-settings-chain.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`

## Implementation Plan
1. Inspect the settings route and backend connection/integration-settings contracts.
2. Add typed frontend readback for `/v1/connection`, ClickUp settings, and Google Drive settings.
3. Replace disabled placeholder controls with redacted provider cards and valid recovery/navigation actions.
4. Verify build and browser rendering across desktop/mobile.
5. Record state, residual proof limits, cleanup, and source-control disposition.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Gap: workspace settings had disabled API/integration placeholders.
- Existing contracts: `src/modules/connection/connection.routes.ts` and `src/modules/integration-settings/integration-settings.routes.ts`.
- Architecture constraint: no new settings subsystem, no secret disclosure, no provider mutation.

### 2. Select One Priority Mission Objective
- Selected task: LUC-6905.
- Rationale: parent event-chain diagnosis identified this as the blocking frontend gap.

### 3. Plan Implementation
- Modify only the existing React settings surface and shared frontend types/i18n.
- Cover loading, unconfigured, configured, error, redacted, and disabled/inactive provider states.

### 4. Execute Implementation
- Added `ConnectionPacket` and `IntegrationStatus` frontend types.
- Added provider readback hook and redacted provider cards.
- `/workspace/settings` now reads `/v1/connection`, `/v1/integration-settings/clickup`, and `/v1/integration-settings/google_drive`.
- Disabled placeholder buttons were replaced with real route actions to Technology and Assets.

### 5. Verify and Test
- `npm run build:web`: PASS.
- `npm run build:server`: PASS.
- Playwright fallback proof: PASS on desktop `1440x960` and mobile `390x844`.
- Browser proof used intercepted backend-shaped responses because Docker/local DB were unavailable.

### 6. Self-Review
- Existing backend contracts and route surface were reused.
- No secret mutation or temporary UI-only fake path was introduced.
- Raw provider/backend errors are converted into local user-language recovery text.

### 7. Update Documentation and Knowledge
- This task packet and state files were updated.
- Generated Project Truth/event-chain refresh is tracked in [LUC-6911](/LUC/issues/LUC-6911) because this heartbeat could not run the full local backend stack.

## Acceptance Criteria
- [x] Signed-in workspace settings exposes backend-connected connection/configuration posture instead of disabled placeholders.
- [x] Loading, unconfigured, configured/redacted, inactive/disabled, and provider error recovery states are represented.
- [x] Secret values and raw backend/provider errors are not displayed.
- [x] Desktop/mobile browser proof was captured.
- [x] `npm run build:web` passed.
- [x] Project truth refresh is not silently skipped; [LUC-6911](/LUC/issues/LUC-6911) is created for generated-index refresh.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the rendered UI with backend-shaped contract responses.
- [x] No mock-only delivered behavior was added to production code.
- [x] Backend and UI/client error handling exists.
- [x] No existing functionality was intentionally broken.
- [x] Changes are documented in source-of-truth state.
- [x] `DEFINITION_OF_DONE.md` was checked before closure.

## Validation Evidence
- Tests: `npm run build:web` PASS; `npm run build:server` PASS.
- Manual checks: Playwright fallback route proof for `/workspace/settings`.
- Screenshots/logs:
  - `C:\Users\wrobl\AppData\Local\Temp\roost-luc-6905-settings-proof\desktop-workspace-settings.png`
  - `C:\Users\wrobl\AppData\Local\Temp\roost-luc-6905-settings-proof\mobile-workspace-settings.png`
  - `C:\Users\wrobl\AppData\Local\Temp\roost-luc-6905-settings-proof\report.json`
- Cleanup evidence: temporary static server stopped; ports `3240` and `3241` clear; no `chrome-headless-shell` or `chromium` process remained.
- Reality status: partially verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: partial; production code calls real API paths, browser proof intercepted backend-shaped responses.
- Endpoint and client contract match: yes, by code inspection and proof responses.
- Loading state verified: yes.
- Error state verified: yes, by UI state coverage and localized recovery copy.
- Refresh/restart behavior verified: route reload in fallback browser proof.
- Regression check performed: build and browser render proof.

## Security / Privacy Evidence
- Data classification: workspace connection/configuration metadata; provider secrets are sensitive and must stay redacted.
- Trust boundaries: signed-in owner route calls authenticated backend APIs.
- Secret handling: UI displays only redacted configured/missing status, config field names, active state, and timestamps.
- Fail-closed behavior: provider read errors show recovery text and do not expose raw backend errors or secrets.
- Residual risk: no full real-backend proof due local Docker/database unavailability.

## UX/UI Evidence
- Design source type: existing route/system pattern.
- Existing shared pattern reused: `Shell`, `CcButton`, `CcNotice`, DaisyUI badges/cards.
- State checks: loading, empty/unconfigured, error, success/configured, inactive/blocked.
- Feedback locality checked: yes.
- Raw technical errors hidden from end users: yes.
- Responsive checks: desktop and mobile.
- Accessibility checks: semantic headings, `dl` metadata, icon `aria-hidden`, readable text labels.
- Parity evidence: screenshots listed above.

## Deployment / Ops Evidence
- Deploy impact: low frontend-only runtime change.
- Env or secret changes: none.
- Health-check impact: none.
- Rollback note: revert the three frontend files if the settings chain regresses.
- `DEPLOYMENT_GATE.md` reviewed: yes; no deploy performed.

## Result Report
- Task summary: `/workspace/settings` now maps existing Exchange connection/configuration backend contracts into visible, secret-safe provider readiness cards for ClickUp and Google Drive.
- Files changed: `web/src/features/settings/settings-routes.tsx`, `web/src/types.ts`, `web/src/i18n/messages.ts`, this task packet, and state files.
- How tested: `npm run build:web`, `npm run build:server`, Playwright fallback proof on desktop/mobile with backend-shaped API responses.
- What is incomplete: real backend/database browser journey and generated Project Truth/event-chain index refresh remain follow-up work because Docker/local database were unavailable.
- Next steps: [LUC-6911](/LUC/issues/LUC-6911) refreshes generated Project Truth/event-chain indexes and links this packet as frontend evidence.
- Decisions made: no secret editing, no provider mutation, no new settings subsystem, no commit/push from this mixed dirty/ahead worktree.
