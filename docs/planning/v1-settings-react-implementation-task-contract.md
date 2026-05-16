# V1SETTINGS-002 Unified Settings React Implementation

## Header
- ID: V1SETTINGS-002
- Title: Unified settings React implementation
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + Backend Builder
- Depends on: V1SETTINGS-001, REACT-WEB-001, REACT-WEB-LAYOUT-001
- Priority: P1
- Module Confidence Rows: WEB-V1-SETTINGS
- Requirement Rows: REQ-V1SETTINGS-002
- Risk Rows: RISK-V1SETTINGS-002
- Iteration: 2026-05-15 web mission
- Operation Mode: BUILDER
- Mission ID: V1-WEB-SETTINGS
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority mission objective is selected.
- [x] The task is aligned with `docs/ux/v1-settings-canonical-spec-2026-05-15.md`.
- [x] `.agents/core/project-memory-index.md` and mission-control rules were reviewed.
- [x] Affected module confidence, requirement, risk, and route-index rows were identified.
- [x] The task improves release confidence by replacing provider-shaped settings routes with one settings module.

## Mission Block
- Mission objective: make `/settings` the unified V1 settings module for integrations, agent keys, and MCP.
- Release objective advanced: V1 web becomes useful for the owner and AI agents by exposing credentials, active state, sync policy, agent key creation, and MCP handoff in one place.
- Included slices: route registry convergence, unified settings UI, provider active switches, setup/mapping/sync provider tabs, agent-key tab, MCP tab, responsive proof.
- Explicit exclusions: production deploy, new provider backends, raw MCP tool catalog inside settings.
- Stop conditions: architecture mismatch, missing backend contract for a write, failing build, or browser proof with horizontal overflow.
- Handoff expectation: queues and ledgers point next work to production proof
  and the next smallest V1 view-function slice after local AOG/settings proof.

## Context
The canonical V1 settings spec says `/settings`, `/settings/integrations`,
`/settings/drive`, `/settings/api`, and `/react-agent-tools` should converge
into one contextual settings module. Settings must stay a calm configuration
surface, not a sync dashboard or provider operations console.

## Goal
Implement the canonical V1 settings module in React using existing backend
contracts and the shared React shell.

## Scope
- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `.agents/state/*` source-of-truth rows

## Implementation Plan
1. Reuse the existing React route registry and shared shell.
2. Route old settings entries into the unified settings module.
3. Show Integrations, Agent keys, and MCP as top-level settings sections.
4. Use existing backend contracts for ClickUp, Google Drive, API keys, MCP, external mappings, Drive files, and provider sync actions.
5. Verify build, route metadata, responsive rendering, and local action states.
6. Update canonical queue and evidence files.

## Autonomous Loop Evidence

### 1. Analyze Current State
- `/settings` was still represented in shell metadata as a ClickUp bridge.
- Existing React settings implementation already used backend contracts but needed route-registry convergence and proof.
- Local verification now uses workspace-local PostgreSQL when Docker is not
  responsive, so `npm run test:api` can run before handoff.

### 2. Select One Priority Mission Objective
- Selected task: V1SETTINGS-002.
- Priority rationale: user requested useful V1 web for operating the company and AI agents; settings is the active P1 web queue item after V1 dashboard/area work.

### 3. Plan Implementation
- Use one unified route component and no new backend routes.
- Keep operational queues and large MCP catalogs out of settings.
- Preserve provider data when active switches are disabled.

### 4. Execute Implementation
- `/settings`, `/settings/integrations`, `/settings/drive`, `/settings/api`, and `/react-agent-tools` render `UnifiedSettingsRoute`.
- Integrations render ClickUp and Google Drive provider cards, active switches, Setup/Mapping/Sync tabs, credentials, scope IDs, `syncMode`, and `importMode`.
- Agent keys render a minimal Jarvis/Paperclip/external-app key creation path.
- MCP renders manifest URL and local server command, linking onward to Company OS instead of looping back to the same settings route.
- `web/src/app-route-registry.ts` now marks unified settings entry routes as V1 canonical and prevents `/settings` from resolving as ClickUp bridge.

### 5. Verify and Test
- `npm run build:web`: PASS.
- `npm run validate`: PASS.
- `git diff --check`: PASS.
- `npm run test:api`: PASS against workspace-local PostgreSQL on
  `127.0.0.1:55476`.
- Playwright fallback: PASS on mock owner API at `http://127.0.0.1:3158`.
  - Desktop `/settings` clicked `Mapping`; no horizontal overflow; `Workspace settings` and `Map before sync` rendered.
  - Mobile `/settings/drive` clicked `Sync`; no horizontal overflow; Drive sync actions rendered.
  - Screenshots: `docs/ux/evidence/v1-settings-unified-proof-desktop.png` and `docs/ux/evidence/v1-settings-unified-proof-mobile.png`.
- Real backend Playwright proof: PASS on `http://127.0.0.1:3160`.
  - Registered a disposable owner, opened `/settings`, saved Google Drive OAuth
    client credentials from `/settings/drive`, and read back
    `oauthClientConfigured=true` from `/v1/integration-settings/google_drive`.
  - Screenshots: `docs/ux/evidence/v1-settings-real-backend-desktop.png`,
    `docs/ux/evidence/v1-settings-drive-save-real-backend-desktop.png`, and
    `docs/ux/evidence/v1-settings-real-backend-mobile.png`.
- Cleanup: no `chrome-headless-shell` processes remained.

### 6. Self-Review
- Existing systems reused: React route registry, shared shell, owner API helper, existing integration settings/API key/MCP endpoints.
- No new provider backend, schema, raw editing route, or temporary bypass was added.
- Remaining risk is production deployment proof, not missing local
  implementation or database-backed verification.

### 7. Update Documentation and Knowledge
- Updated task board, next commits, web view index, requirement matrix, module confidence, risk register, system health, and project state.

## Acceptance Criteria
- [x] `/settings` is the canonical settings entry, not a ClickUp-only route.
- [x] Old settings routes enter the unified settings module sections.
- [x] Integrations expose backend-backed ClickUp and Google Drive fields.
- [x] Provider rows include active/disabled switches that preserve imported data.
- [x] Selected provider exposes Setup, Mapping, and Sync tabs backed by existing contracts.
- [x] Agent keys and MCP are available as simple settings sections.
- [x] Desktop and mobile proof shows no horizontal overflow.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the local rendered UI proof.
- [x] No mock, placeholder, fake, or temporary product path was added to shipped code.
- [x] Backend/client contracts match existing routes.
- [x] Loading, error, empty, and success patterns are present through `PrivateStateGate` and local notices.
- [x] Changes are documented in relevant source-of-truth files.
- [x] `DEFINITION_OF_DONE.md` was checked before marking this task done.

## Validation Evidence
- Tests: `npm run build:web`; `npm run validate`; `git diff --check`;
  `npm run test:api`.
- Manual checks: Playwright fallback desktop/mobile proof against mocked owner
  API; real backend Playwright proof with owner registration, settings
  navigation, Google Drive OAuth client save, and API readback.
- Screenshots: `docs/ux/evidence/v1-settings-unified-proof-desktop.png`;
  `docs/ux/evidence/v1-settings-unified-proof-mobile.png`;
  `docs/ux/evidence/v1-settings-real-backend-desktop.png`;
  `docs/ux/evidence/v1-settings-drive-save-real-backend-desktop.png`;
  `docs/ux/evidence/v1-settings-real-backend-mobile.png`.
- Reality status: verified locally.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: existing route contracts were used by the React
  client; real backend proof saved and read back Google Drive settings against
  PostgreSQL-backed API state.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: yes, through `npm run test:api` against
  workspace-local PostgreSQL on `127.0.0.1:55476`.
- Loading state verified: yes, through route state gate.
- Error state verified: source inspection of local notices and gate.
- Refresh/restart behavior verified: navigation refresh in Playwright proof.

## UX/UI Evidence
- Design source type: approved_snapshot.
- Design source reference: `docs/ux/v1-settings-canonical-spec-2026-05-15.md`.
- Canonical visual target: `docs/ux/assets/companycore-v1-settings-desktop-canonical.png`; `docs/ux/assets/companycore-v1-settings-mobile-canonical.png`.
- Fidelity target: structurally_faithful.
- Existing shared pattern reused: shared React shell, route registry, DaisyUI form controls, local notices.
- Screenshot comparison pass completed: yes.
- Remaining mismatches: current shell is the implemented React command shell rather than the simplified planning-shell in the PNG; accepted as structural fidelity because V1 route registry now owns shell navigation and route metadata.
- Responsive checks: desktop and mobile.
- Accessibility checks: route buttons and provider switches have native button/input semantics and explicit labels.

## Security / Privacy Evidence
- Secret handling: tokens/client secrets are password inputs and optional on update to preserve stored encrypted secrets.
- Permission or ownership checks: existing protected owner API routes remain the trust boundary.
- Fail-closed behavior: missing owner token renders signed-out state; provider actions disable when inactive.

## Review Checklist
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced beyond route entry aliases into one component.
- [x] Relevant validations were run or recorded as blocked.
- [x] Docs and context were updated.

## Result Report
- Task summary: Unified V1 settings is implemented as the canonical React settings module.
- Files changed: `web/src/main.tsx`, `web/src/app-route-registry.ts`, source-of-truth docs/state files.
- How tested: build, validate, diff check, Playwright desktop/mobile proof; API gate blocked by missing database URL.
- What is incomplete: production authenticated settings proof.
- Next steps: deploy when ready and rerun authenticated settings proof against production before raising production confidence.
