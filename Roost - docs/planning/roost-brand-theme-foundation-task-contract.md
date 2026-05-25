# Roost Brand Theme Foundation Task Contract

## Header
- ID: ROOST-BRAND-001
- Title: Roost Brand Definition And Theme Tokens
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + Product Docs
- Depends on: WEB-THEME-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: WEB-THEME-002
- Requirement Rows: REQ-ROOST-BRAND-001
- Quality Scenario Rows: not applicable
- Risk Rows: RISK-ROOST-BRAND-001
- Iteration: 2026-05-17
- Operation Mode: BUILDER
- Mission ID: ROOST-BRAND-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was considered; this is a bounded single-slice task.
- [x] Missing or template-like state tables were not found for this scope.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement and risk rows were identified.
- [x] The task improves release confidence by making the owner-approved brand direction durable and code-addressable.

## Mission Block
- Mission objective: Turn the owner-provided Roost brand notes into durable UX documentation and reusable theme tokens.
- Release objective advanced: Future web and AI/MCP-facing UI work can reuse a shared Roost brand foundation instead of inventing page-local styling.
- Included slices: UX docs, decision memory, DaisyUI theme, Tailwind/CSS tokens, validation evidence.
- Explicit exclusions: Full visual restyle of all current screens, logo asset generation, favicon replacement, and route-by-route dark-mode parity.
- Checkpoint cadence: One verification checkpoint after build and diff hygiene.
- Stop conditions: Theme build failure, architecture conflict, or a blocking product decision about replacing the current runtime theme immediately.
- Handoff expectation: Future UI tasks can opt into `data-theme="roost"` or migrate surfaces intentionally to the Roost visual system.

## Context

The active React web layer already has a `companycore` Tailwind/DaisyUI foundation from WEB-THEME-001. The owner has now supplied a more specific brand definition: Roost is the LuckySparrow operating center, a dark cinematic command system for humans, AI agents, processes, knowledge, tasks, pipelines, and company resources.

## Goal

Record Roost as the target brand and provide reusable code tokens for future work.

## Scope

- `web/src/styles.css`
- `tailwind.config.mjs`
- `web/index.html`
- `docs/ux/design-system-contract.md`
- `docs/ux/visual-direction-brief.md`
- `docs/ux/brand-personality-tokens.md`
- `docs/ux/design-memory.md`
- `.agents/state/decision-register.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/risk-register.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/core/project-memory-index.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/system-health.md`

## Implementation Plan

1. Inspect the existing design-system contract, visual direction, theme CSS, and validation commands.
2. Add `roost` as a reusable DaisyUI theme and Tailwind/CSS token family without rewriting unrelated route CSS.
3. Update canonical UX documentation, memory, requirements, risks, and module confidence.
4. Run build and diff validation, then commit the documentation and theme changes.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Current docs described the earlier `companycore` light theme as the active foundation and did not contain the owner-approved Roost brand notes.
- Gaps: No DaisyUI `roost` theme existed; no Roost palette, gradient, dark glass, or logo direction was durable in source.
- Inconsistencies: Existing UI still has many light `companycore` route styles, so a global dark restyle would exceed the safe slice.
- Architecture constraints: The task is UX/theme source-of-truth only; CompanyCore remains the operating system and AI agents remain external API/MCP clients.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: design-system contract, visual direction brief, brand tokens, design memory, Tailwind config, CSS theme, project memory, module confidence ledger.
- Assumptions recorded: Roost is the target brand direction; current `companycore` theme remains a compatibility runtime theme until a scoped dark UI migration.
- Blocking unknowns: none for tokens/docs.
- Why it was safe to continue: The user explicitly supplied brand direction and asked for documentation plus theme implementation.

### 2. Select One Priority Mission Objective
- Selected task: ROOST-BRAND-001.
- Priority rationale: Brand/theme source of truth affects all future UI work and should be durable before more surface implementation.
- Why other candidates were deferred: Active department work would risk visual drift without the brand contract.

### 3. Plan Implementation
- Files or surfaces to modify: UX docs, theme CSS, Tailwind config, source-of-truth registers.
- Logic: Add reusable tokens and documentation, not a broad page restyle.
- Edge cases: Keep existing hardcoded light route CSS functional; avoid adding a second icon family.

### 4. Execute Implementation
- Implementation notes: Added DaisyUI `roost`, Tailwind `roost` colors/radius, CSS variables, brand gradient, dark glass utility, Roost label utility, and Inter-only font loading.

### 5. Verify and Test
- Validation performed: `npm run build:web`; `git diff --check`.
- Result: Passed.

### 6. Self-Review
- Simpler option considered: Documentation only.
- Technical debt introduced: no.
- Scalability assessment: The token set is reusable across future route migrations and keeps a compatibility path for the current light theme.
- Refinements made: Kept `companycore` default to avoid accidental route-wide dark restyle without parity proof.

### 7. Update Documentation and Knowledge
- Docs updated: yes.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Roost brand definition is recorded in canonical UX documentation.
- [x] A reusable DaisyUI/Tailwind/CSS `roost` theme foundation exists.
- [x] Source-of-truth registers record the decision, requirement, risk, and module confidence state.
- [x] Web build and diff hygiene pass.

## Success Signal
- User or operator problem: Future agents had only chat notes for Roost and could drift into inconsistent UI styling.
- Expected product or reliability outcome: Future UI tasks can reuse the same Roost palette, typography, surface, motion, and icon principles.
- How success will be observed: New UI work cites `docs/ux/design-system-contract.md` and uses `roost` tokens rather than page-local color recipes.
- Post-launch learning needed: no.

## Deliverable For This Stage

Verified documentation and theme-token foundation.

## Constraints
- Use existing Tailwind/DaisyUI theme mechanism.
- Do not introduce a new UI framework.
- Do not restyle all routes without scoped visual QA.
- Keep repository artifacts in English.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the web build path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow is not applicable; this is theme/documentation scope.
- [x] Backend and UI/client error handling is not applicable.
- [x] No existing functionality is intentionally changed beyond font/title/theme tokens.
- [x] Feature works after rebuild.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] Success signal and rollback evidence are recorded.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches `verification`.
- [x] Later-stage full visual migration was not mixed in.
- [x] Risks and assumptions are stated clearly.

## Validation Evidence
- Tests: `npm run build:web`; `git diff --check`.
- Manual checks: source review of Roost theme tokens and UX docs.
- Screenshots/logs: not required; no route visual migration was in scope.
- High-risk checks: compatibility default preserved for `companycore`.
- Module confidence ledger updated: yes.
- Requirements matrix updated: yes.
- Risk register updated: yes.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: not applicable.
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: build output verified.
- Regression check performed: `npm run build:web`; `git diff --check`.

## UX/UI Evidence
- Design source type: approved_snapshot
- Design source reference: owner-provided Roost brand notes, 2026-05-17.
- Canonical visual target: Roost cinematic dark operating center.
- Fidelity target: structurally_faithful.
- Evidence-driven UX review used: no, no route restyle.
- Primary user question answered within 3 seconds: not applicable to route UI.
- Existing shared pattern reused: Tailwind/DaisyUI theme and `cc-*` utility strategy.
- New shared pattern introduced: yes, `roost` theme and Roost token utilities.
- Design-memory update required: yes.
- Anti-patterns checked: yes.
- Surface strategy checked: mobile, tablet, desktop as future migration guidance.
- State checks: not applicable for theme token slice.
- Responsive checks: build-level only.
- Accessibility checks: contrast and focus tokens recorded; route-level checks deferred to future migrations.
- Parity evidence: not applicable because no full route restyle was delivered.

## Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: not needed.
- Rollback note: Revert this commit to remove the Roost theme definition.
- Observability or alerting impact: none.
- Staged rollout or feature flag: `companycore` remains the default runtime theme; `roost` is opt-in until a scoped migration.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed.
- [x] Current stage is declared and respected.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Integration checklist evidence is attached where applicable.
- [x] Deployment gate evidence is attached where applicable.
- [x] Definition of Done evidence is attached.
- [x] Relevant validations were run.
- [x] Docs and context were updated.

## Result Report
- Task summary: Added the Roost brand definition and reusable theme-token foundation.
- Files changed: see scope.
- How tested: `npm run build:web`; `git diff --check`.
- What is incomplete: Full route-by-route dark UI migration and logo asset creation are future scoped work.
- Next steps: Use `data-theme="roost"` or Roost tokens in the next approved UI migration slice.
- Decisions made: `roost` is the target brand direction; `companycore` remains the compatibility default until visual QA approves a full migration.
