# Task

## Header
- ID: WEBFOUND-010
- Title: MCP Key Workspace Clarity
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: WEBFOUND-009
- Priority: P1
- Module Confidence Rows: MCL-MCP, MCL-WEB-SHELL, WEBFOUND-010
- Requirement Rows: REQ-WEBFOUND-007
- Quality Scenario Rows: QA-WEBFOUND-006
- Risk Rows: RISK-WEBFOUND-003
- Iteration: 12
- Operation Mode: ARCHITECT
- Mission ID: WEBFOUND-MISSION-2026-05-14
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed in this mission wave.
- [x] `.agents/core/mission-control.md` was reviewed in this mission wave.
- [x] Missing state rows were not needed; active rows exist for the web/MCP foundation.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local appearance.

## Mission Block
- Mission objective: Make API key creation safer and clearer before agents use workspace context through MCP.
- Release objective advanced: Owners can see workspace scope, selected profile risk, selected scopes, and MCP tool exposure before creating service keys.
- Included slices: `/settings/api` context panel, agent key preview, responsive styling, validation, source-of-truth updates.
- Explicit exclusions: new backend key profiles, new MCP bridge behavior, raw secret lifecycle changes.
- Checkpoint cadence: implement UI preview, run quality gates, run browser proof, update docs.
- Stop conditions: selected scopes cannot be mapped to MCP manifest tools, browser proof fails, or backend contract mismatch appears.
- Handoff expectation: next task can start from a verified `/settings/api` key-creation clarity surface.

## Context
WEBFOUND-009 made integration readiness visible, but `/settings/api` still allowed owners to create service keys without seeing the workspace, MCP tool exposure, or risk impact of the selected scopes.

## Goal
Add an owner-visible pre-creation preview to `/settings/api` that explains active workspace, selected risk, scope count, MCP tool count, write/destructive exposure, supervised tools, relationship graph availability, and missing MCP base scopes.

## Scope
- `public/app.js`
- `public/index.html`
- `public/styles.css`
- canonical planning, state, and UX docs touched by this task

## Implementation Plan
1. Reuse existing `/v1/connection`, `/v1/mcp/manifest`, `/v1/api-keys`, and `/v1/api-keys/profiles` client state.
2. Add a derived key preview from selected preset and scope textarea.
3. Update `/settings/api` context copy to foreground workspace-scoped agent access.
4. Validate build/test/browser responsive behavior.
5. Update canonical state files and task evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: selected key scopes were editable, but their MCP effect was not visible before creation.
- Gaps: API context showed route counts but not workspace/key/tool preview at the decision point.
- Inconsistencies: integration dashboard reported MCP readiness, while key creation did not show the same readiness mechanics.
- Architecture constraints: HTTP API remains the policy boundary; no new backend route needed.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: `public/app.js`, `public/index.html`, `public/styles.css`, `src/mcp/manifest.ts`, `src/auth/agent-key-profiles.ts`.
- Rows created or corrected: module confidence, requirement, quality, and risk rows updated after verification.
- Assumptions recorded: selected key scopes can be mapped to visible MCP tools by matching `tool.capability`.
- Blocking unknowns: none.
- Why it was safe to continue: the change is a read-only frontend preview over existing profile and manifest contracts.

### 2. Select One Priority Mission Objective
- Selected task: WEBFOUND-010.
- Priority rationale: MCP key clarity is the next risk after integration readiness.
- Why other candidates were deferred: React-shell convergence and V2 visuals depend on safer foundation surfaces.

### 3. Plan Implementation
- Files or surfaces to modify: API settings route, agent key form, frontend styles, state docs.
- Logic: derive risk and tool preview from selected profile/scopes and current manifest.
- Edge cases: signed-out state, fallback presets, custom scopes, no MCP tools, missing `connection:read` or `mcp:read`.

### 4. Execute Implementation
- Implementation notes: Added API context workspace/MCP counts and a live
  agent key preview derived from selected preset, scope textarea, backend
  profiles, and the current MCP manifest.

### 5. Verify and Test
- Validation performed: `node --check public/app.js`, `npm run build`,
  `npm test`, and Playwright fallback browser smoke.
- Result: pass.

### 6. Self-Review
- Simpler option considered: static warning copy. Rejected because selected scope changes need live preview.
- Technical debt introduced: no intended.
- Scalability assessment: helper functions can support future profile/tool previews without new architecture.
- Refinements made: Preview warns when base MCP scopes are missing and keeps
  raw-key reveal unchanged.

### 7. Update Documentation and Knowledge
- Docs updated: task plan, task board, module confidence, requirements matrix,
  quality scenarios, risk register, next steps, MVP queue, system health,
  project state, delivery map, project memory index, and design memory.
- Context updated: yes.
- Learning journal updated: not applicable unless validation exposes a recurring pitfall.

## Acceptance Criteria
- [x] `/settings/api` shows active workspace context in the API command panel.
- [x] Agent key form previews selected risk, selected scopes, MCP tool count, write/destructive tool count, supervised tool count, and relationship graph availability before creation.
- [x] Preview updates when preset or scopes change.
- [x] Raw key behavior remains one-time reveal only after creation.
- [x] Build, tests, and responsive browser smoke pass.

## Success Signal
- User or operator problem: owners cannot safely hand keys to agents if scope and MCP impact are unclear.
- Expected product or reliability outcome: key creation becomes self-explanatory and less likely to over-permission agents.
- How success will be observed: browser smoke on `/settings/api` with fixture owner session and key/profile state.
- Post-launch learning needed: yes

## Deliverable For This Stage
A verified `/settings/api` key-preview surface and updated canonical execution records.

## Constraints
- use existing systems and approved mechanisms
- do not change backend key authorization behavior
- no fake MCP tools or placeholder health states
- do not expose raw key values except the existing one-time creation reveal

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Feature works after reload/navigation.
- [x] Relevant source-of-truth docs are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changes to `DONE`.

## Validation Evidence
- Tests: `node --check public/app.js`; `npm run build`; `npm test` against disposable PostgreSQL on `localhost:55460`.
- Manual checks: Playwright fallback rendered `/settings/api` on `http://127.0.0.1:3110` with a real owner token, existing profile-created key, backend key profiles, and MCP manifest.
- Screenshots/logs: `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound010-desktop-1778786927486.png`; `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound010-tablet-1778786927486.png`; `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound010-mobile-1778786927486.png`.
- High-risk checks: preset change to `mcp_operator` updated preview to high risk; manual scope edit showed missing `mcp:read`; no horizontal overflow at desktop `1366x900`, tablet `820x1000`, or mobile `390x844`; no console errors; no failed requests.
- Module confidence ledger updated: yes.
- Requirements matrix updated: yes.
- Quality scenarios updated: yes.
- Risk register updated: yes.
- Reality status: verified

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- Loading state verified: yes.
- Error state verified: no new error path; existing API key/profile error handling retained.
- Refresh/restart behavior verified: yes, browser smoke reloaded at tablet and mobile sizes.
- Regression check performed: `npm test`.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: API key metadata, capabilities, and one-time raw key reveal.
- Trust boundaries: owner browser session; workspace-scoped service keys; MCP tool exposure.
- Permission or ownership checks: existing backend auth unchanged.
- Secret handling: raw key preview not introduced; existing one-time reveal preserved.
- Fail-closed behavior: existing backend key/profile validation unchanged.
- Residual risk: preview is explanatory and does not replace backend policy.

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference: existing authenticated shell and WEBFOUND-009 readiness pattern.
- Fidelity target: structurally_faithful
- Evidence-driven UX review used: yes
- Primary user question answered within 3 seconds: yes, key preview is inside the creation form.
- Next action visibility: yes, create/reset actions remain next to the preview.
- Blocked-state visibility: yes, missing MCP base scopes are called out locally.
- Existing shared pattern reused: status pills, context cards, local form feedback, readiness cards.
- New shared pattern introduced: scoped key impact preview.
- Design-memory update required: yes, completed.
- Surface strategy checked: mobile | tablet | desktop
- State checks: loading | empty | error | success
- Responsive checks: desktop `1366x900`, tablet `820x1000`, mobile `390x844`.
- Accessibility checks: preview section has an `aria-label`, visible text labels, and no new unnamed interactive control.
- Parity evidence: structurally faithful to the existing settings form and WEBFOUND readiness pattern.

## Result Report
- Task summary: `/settings/api` now previews workspace, risk, scopes, and MCP tool exposure before service key creation.
- Files changed: `public/app.js`, `public/index.html`, `public/styles.css`, `docs/planning/webfound-010-task-contract.md`, and canonical state/UX docs.
- How tested: `node --check public/app.js`, `npm run build`, `npm test`, and Playwright fallback desktop/tablet/mobile smoke.
- What is incomplete: agent tool surface still needs canonical shell convergence.
- Next steps: WEBFOUND-011 Agent Tool Surface In Canonical Shell.
- Decisions made: Use existing manifest capability matching for frontend preview.
