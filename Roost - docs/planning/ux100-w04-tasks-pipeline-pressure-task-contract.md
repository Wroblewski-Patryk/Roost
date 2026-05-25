# UX100-W04 Tasks/Pipeline Operating Pressure Summaries

## Header
- ID: UX100-W04
- Title: Tasks/Pipeline Operating Pressure Summaries
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: UX100-W03
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: Owner web tasks and pipeline workbenches
- Requirement Rows: UX100 task/pipeline pressure and next-action steps
- Quality Scenario Rows: usability, responsive layout, accessibility
- Risk Rows: owner decision latency, stale delivery pressure, pipeline ambiguity
- Iteration: UX100 wave 04
- Operation Mode: BUILDER
- Mission ID: UX100-W04
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the active UX100 implementation wave.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed earlier in the UX100 mission and remains current.
- [x] Missing or template-like state tables were confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by making operating pressure visible from real state.

## Mission Block
- Mission objective: make task and pipeline pressure immediately visible from loaded workspace data.
- Release objective advanced: improve the web foundation so owners can act on execution pressure before V2 visual expansion.
- Included slices: `/tasks-adapter`, `/pipeline`, shared operating-pressure CSS, documentation/state updates.
- Explicit exclusions: new backend routes, new task/pipeline schemas, fake metrics, Company City work.
- Checkpoint cadence: implement one cohesive UI slice, validate static/build/API/browser, then update evidence.
- Stop conditions: pressure cannot be derived from existing state, validation fails, or architecture mismatch appears.
- Handoff expectation: leave next UX100 work queued after proof.

## Context
UX100-W03 made trust and provenance visible. The next problem is operating pressure: tasks and pipeline records exist, but the owner still has to infer which work is urgent, stale, blocked, or light from tables and counts.

## Goal
Add real-state operating pressure summaries to task and pipeline surfaces so users can quickly see what is overdue/due soon/open, whether work is provider-heavy or local, and where pipeline usage is thin or ready.

## Scope
- `public/app.js`
- `public/styles.css`
- this task contract
- project state, task board, next steps, system health, module confidence, planning queue, and design memory

## Implementation Plan
1. Inspect task and pipeline render functions and reuse existing filters/context cards.
2. Add helper functions that compute pressure from task status, due date, priority, source, stage count, and CRM usage counts.
3. Render compact pressure cards and next-action language in task and pipeline context panels.
4. Add responsive CSS for mobile/tablet/desktop.
5. Run validation and update evidence.

## Acceptance Criteria
- [x] `/tasks-adapter` shows operating pressure derived from existing task state, including due/overdue/open/source signals and a next action.
- [x] `/pipeline` shows pressure/readiness derived from existing stage, client, deal, and interaction counts with a next action.
- [x] Desktop, tablet, and mobile checks pass with no overflow, console issues, failed requests, or unnamed visible controls.
- [x] Existing static, build, API, and diff checks pass.

## Validation Evidence
- Tests: `npm run check:public-js`, `npm run validate`, `git diff --check`,
  and `npm run test:api` passed.
- Browser proof: Playwright fallback verified `/tasks-adapter` and
  `/pipeline` on `http://127.0.0.1:3123` at desktop `1366x900`, tablet
  `834x1112`, and mobile `390x844`. Report:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-ux100w04-verified\report.json`.
  Post-proof cleanup removed the temporary QA script and stopped leftover
  `chrome-headless-shell` processes; no portable PostgreSQL process remained.
- Reality status: verified

## Result Report
- Task summary: added task and pipeline pressure cards plus local next-action
  guidance derived from existing workspace state.
- Files changed: `public/app.js`, `public/styles.css`, this task contract,
  task/state/planning/UX docs.
- How tested: static public JS check, full validate build, diff check, API
  tests on portable PostgreSQL, and desktop/tablet/mobile Playwright route
  proof.
- What is incomplete: production signed-in route proof is optional after the
  next deploy.
- Next steps: UX100-W05 Company OS And MCP Tools Alignment.
