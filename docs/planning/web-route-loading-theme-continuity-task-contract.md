# Web Route Loading Theme Continuity Task Contract

## Header
- ID: WEB-ROUTE-LOADING-001
- Title: Keep lazy route loading inside the Roost dark visual system
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Priority: P1
- Module Confidence Rows: Authenticated shell density, Roost brand, department routes
- Requirement Rows: REQ-WEB-ROUTE-LOADING-001
- Quality Scenario Rows: QA-WEB-ROUTE-LOADING-001
- Risk Rows: RISK-WEB-ROUTE-LOADING-001
- Iteration: 2026-06-01
- Operation Mode: BUILDER
- Mission ID: WEB-ROUTE-LOADING-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches this targeted builder iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for bounded mission rules.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by removing a route-level UX regression.

## Mission Block
- Mission objective: remove the white flash when authenticated React views lazy-load.
- Release objective advanced: Roost authenticated shell quality and route transition polish.
- Included slices: shared lazy route fallback component, root loading background continuity, build and rendered route proof.
- Explicit exclusions: no route rewrites, no backend/API changes, no public homepage redesign.
- Checkpoint cadence: inspect, implement, build, browser proof, state update.
- Stop conditions: route fallback remains themed dark during private route transitions or validation exposes a blocker.
- Handoff expectation: concise validation summary plus next follow-up if production smoke is still needed.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | AGENTS, task board, module confidence | Mission integration and state updates | Task contract and final report | Parent validation gate | VERIFIED |
| Implementation | Active chat | `web/src/main.tsx`, Roost tokens | Lazy route fallback and global loading background | Shared component | `npm run build:web` | VERIFIED |
| QA/Test | Active chat | Browser workflow | Authenticated route transition | Rendered proof | Browser attempt plus Playwright delayed-chunk screenshots | VERIFIED |
| Documentation/Memory | Active chat | Planning/state files | Durable evidence | Updated task/state rows | Source review | VERIFIED |

## Context
The authenticated app uses dark Roost surfaces through `Shell`, but lazy route fallback currently renders outside `Shell`, so DaisyUI uses the default light theme while route chunks load.

## Goal
All authenticated route-loading states must stay visually aligned with the dark Roost application shell.

## Scope
- `web/src/main.tsx`
- `web/src/components/cc-route-loading.tsx`
- `web/src/styles.css`
- planning and source-of-truth notes for this fix

## Implementation Plan
1. Replace the page-local fallback in `main.tsx` with a shared route loading component.
2. Apply `data-theme="roost"` directly to the fallback root and mirror authenticated shell structure.
3. Ensure the document/root background does not expose a light surface while the fallback is mounted.
4. Validate with web build and rendered navigation proof.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issue: lazy route fallback used `bg-base-200` without an enclosing `data-theme="roost"`.
- Gap: fallback rendered before route components mount `Shell`, creating a white flash.
- Architecture constraints: reuse existing Roost DaisyUI theme and shell patterns.

### 2. Select One Priority Mission Objective
- Selected task: `WEB-ROUTE-LOADING-001`.
- Priority rationale: user-visible transition regression affects every lazy private view.

### 3. Plan Implementation
- Files or surfaces to modify: shared component, React entry fallback, global CSS root background.
- Edge cases: initial private route load, switching between route chunks, mobile shell loading.

### 4. Execute Implementation
- Implementation notes: added shared `CcRouteLoading`, replaced the inline `main.tsx` Suspense fallback, and set root/body height plus dark background continuity while the route fallback is mounted.

### 5. Verify and Test
- Validation performed: `npm run build:web`, `npm run build:server`, `git diff --check`, Browser public render smoke, Playwright delayed route-chunk desktop proof, and Playwright delayed route-chunk mobile proof.
- Result: passed. `git diff --check` reported line-ending warnings only. Playwright desktop intentionally delayed `strategy-route-*.js`; fallback rendered with `data-theme="roost"`, body and fallback background `rgb(22, 27, 34)`, no framework overlay, then the final shell rendered with no horizontal overflow. Mobile delayed `management-route-*.js`; fallback rendered with `data-theme="roost"`, dark background, and no horizontal overflow.

### 6. Self-Review
- Technical debt introduced: no.
- Scalability assessment: a shared component avoids per-route fixes.
- Refinements made: the fallback mirrors the authenticated shell instead of showing a disconnected full-screen card.

### 7. Update Documentation and Knowledge
- Docs updated: this task contract plus project state/task board/module confidence rows.
- Learning journal updated: not applicable unless validation finds a recurring tooling pitfall.

## Acceptance Criteria
- [x] Lazy route fallback uses the Roost dark theme without white background.
- [x] The fallback is centralized and reusable for all lazy routes.
- [x] Web build passes.
- [x] Rendered route proof shows no white flash or framework overlay.

## Success Signal
- User or operator problem: route navigation no longer flashes from dark app to white loader and back.
- Expected product or reliability outcome: smoother, coherent authenticated app transitions.
- How success will be observed: screenshot/DOM/browser proof of dark fallback during navigation.
- Post-launch learning needed: production smoke after deploy.

## Deliverable For This Stage
Implemented and verified global route loading fallback.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No temporary bypass remains.
- [x] No existing functionality is broken.
- [x] Feature works after reload or navigation.
- [x] Changes are documented in the relevant source of truth.
- [x] `DEFINITION_OF_DONE.md` was checked before status changes to `DONE`.

## Result Report
- Completed on 2026-06-01. Files changed: `web/src/components/cc-route-loading.tsx`, `web/src/main.tsx`, and `web/src/styles.css`. Validation-owned processes were cleaned up after proof. Residual risk: production smoke is still needed after deployment, and Playwright final-route console showed expected `401 Unauthorized` API responses because the proof used a synthetic session token to validate frontend route loading without a real owner API session.
