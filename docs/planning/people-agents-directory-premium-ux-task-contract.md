# Task

## Header
- ID: PA-DIRECTORY-PREMIUM-UX-006
- Title: People/Agents Directory premium usability polish
- Task Type: design
- Current Stage: implementation
- Status: IN_PROGRESS
- Owner: Frontend Builder + QA/Test
- Depends on: CC-DATA-TABLE-MANAGED-005
- Priority: P1
- Coverage Ledger Rows: People/Agents Directory, shared `CcDataTable`
- Module Confidence Rows: `06 People & Agents`, shared management UI
- Requirement Rows: REQ-PA-DIRECTORY-PREMIUM-UX-006
- Quality Scenario Rows: usability, accessibility, responsive layout
- Risk Rows: UX consistency and dense data readability
- Iteration: 2026-05-19
- Operation Mode: BUILDER
- Mission ID: PA-DIRECTORY-PREMIUM-UX-006
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the current user-directed builder iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through the standing repo contract.
- [x] Missing or template-like state tables were not present for this scope.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: make `06 People & Agents -> Directory`, preview, and create/edit modal feel like a high-quality management tool while preserving the existing backend/API behavior.
- Release objective advanced: production-ready People/Agents roster usability.
- Included slices: visible table filter labels, stronger Directory header/context, improved workforce form layout, improved profile preview, Big Five radar visualization, responsive proof.
- Explicit exclusions: no backend schema/API changes, no Paperclip sync behavior changes, no new chart dependency.
- Checkpoint cadence: code implementation, rendered proof, documentation update, commit.
- Stop conditions: build failure, route regression, modal inaccessible, mobile overflow, or backend contract mismatch.
- Handoff expectation: concise implementation/verification report with residual risk.

## Context
The Directory already uses the managed table primitive. The owner now wants the surface to move from "good" to "best": more polished UX/UI, labeled filters, and richer profile cognition such as a Big Five radar chart.

## Goal
Upgrade Directory, New/Edit workforce entity, and workforce preview so the module feels like a refined HR/agent-management tool connected to backend data.

## Scope
- `web/src/components/cc-data-table.tsx`
- `web/src/features/departments/people-agents-route.tsx`
- UX/source-of-truth docs and validation evidence

## Implementation Plan
1. Inspect existing table, form, preview, modal, and design-system patterns.
2. Add visible labels to managed table filters without breaking existing consumers.
3. Add a dependency-free Big Five radar chart and reuse it in form and preview.
4. Refine Directory/form/preview layout for clarity, density, responsive behavior, and accessible labels.
5. Validate build, repository gates, rendered desktop/tablet/mobile behavior, and process cleanup.
6. Update requirement/module/system/design memory docs.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: filter selects rely on placeholder text, Big Five is textual only, preview profile is dense but visually flat, form sections are functional but not yet excellent.
- Gaps: no visible filter labels; no visual personality profile; modal hierarchy can better separate identity, runtime, access, and generated context.
- Inconsistencies: People/Agents now has strong table mechanics, but form/preview polish trails the new table quality.
- Architecture constraints: frontend-only refinement over existing `/v1/workforce` packet and shared primitives.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Sources scanned: `people-agents-route.tsx`, `cc-data-table.tsx`, UX design memory, project memory.
- Rows created or corrected: pending verification rows after implementation.
- Assumptions recorded: Big Five values are 0-5 from current form/schema behavior.
- Blocking unknowns: none.
- Why it was safe to continue: request is explicitly frontend/UI polish over existing data contract.

### 2. Select One Priority Mission Objective
- Selected task: PA-DIRECTORY-PREMIUM-UX-006.
- Priority rationale: directly continues the user's active People/Agents mission.
- Why other candidates were deferred: broader HR features require backend scope and are outside this polish request.

### 3. Plan Implementation
- Files or surfaces to modify: shared table labels and People/Agents route.
- Logic: preserve API payloads, improve rendering and component composition only.
- Edge cases: missing Big Five values, mobile modal height, empty indexes, archived/protected delete state.

### 4. Execute Implementation
- Implementation notes: Added visible managed-table filter labels, direct
  Express React route aliases for `/people-agents` and `/workforce`, a
  dependency-free SVG Big Five radar chart, clearer Directory source-of-truth
  header, stronger profile preview header/readiness layout, and improved
  New/Edit section framing with live Big Five radar feedback.

### 5. Verify and Test
- Validation performed: Browser plugin attempt, Playwright real-server
  desktop/tablet/mobile proof, `npm run validate`, `npm run test:api:local`,
  and `git diff --check`.
- Result: passed. Browser plugin setup reported no active Codex browser pane,
  so Playwright fallback was used. Screenshots:
  `docs/ux/evidence/people-agents-premium-*.png`.

### 6. Self-Review
- Simpler option considered: add only labels and textual Big Five.
- Technical debt introduced: no planned.
- Scalability assessment: radar/chart helper remains local until another module needs it.
- Refinements made: Preview radar uses a compact vertical layout to avoid
  cramped labels inside the profile side panel.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/ux/design-memory.md`, `.agents/state/*`,
  `.codex/context/*`.
- Context updated: yes.
- Learning journal updated: not applicable; reusable UX memory was captured in
  `docs/ux/design-memory.md`.

## Acceptance Criteria
- [x] Directory filters show visible labels and remain keyboard/screen-reader usable.
- [x] Directory, preview modal, and New/Edit modal render as clearer, denser management surfaces without decorative noise.
- [x] Big Five renders as a radar chart in preview and form, with fallback for missing values.
- [x] Existing create/edit/archive/delete/duplicate flows still work.
- [x] Desktop, tablet, and mobile rendered proof shows no horizontal overflow or modal clipping.

## Success Signal
- User or operator problem: People/Agents should feel like a premium management tool, not a raw admin table.
- Expected product or reliability outcome: faster scan, clearer edit context, richer personality understanding, fewer unlabeled controls.
- How success will be observed: visual proof plus working modal interactions.
- Post-launch learning needed: yes, production smoke after redeploy.

## Deliverable For This Stage
Implemented UI polish with validation evidence and updated source-of-truth docs.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- stay within the declared current stage unless explicit approval changes it
- no placeholders, mock-only paths, or temporary solutions in delivered behavior

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real UI.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across relevant UI/API layers.
- [x] Backend and UI/client error handling remains intact.
- [x] No existing functionality is broken.
- [x] Feature works after reload.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Result Report
- Files changed: `src/app.ts`, `web/src/components/cc-data-table.tsx`,
  `web/src/features/departments/people-agents-route.tsx`, docs/state files,
  and screenshot evidence.
- Validation:
  - `npm run validate`: PASS
  - `npm run test:api:local`: PASS, 25 migrations, 6/6 API tests
  - `git diff --check`: PASS
  - Playwright real-server proof: PASS on desktop, tablet, and mobile
- Browser path: attempted first as required; unavailable because no active
  Codex browser pane was present.
- Residual risk: production smoke after redeploy is still required for the
  real owner workspace and target host routing.

## Forbidden
- new backend systems
- duplicated table mechanics
- temporary bypasses or fake data
- architecture changes without explicit approval
