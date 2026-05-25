# UX100-W05 Company OS And MCP Tools Alignment

## Header
- ID: UX100-W05
- Title: Company OS And MCP Tools Alignment
- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: UX100-W04
- Priority: P1
- Module Confidence Rows: Company OS cockpit and MCP tool surface
- Requirement Rows: UX100-W05
- Quality Scenario Rows: usability, AI supervision, responsive layout, accessibility
- Risk Rows: agent authority ambiguity, approval bypass confusion, MCP tool risk comprehension
- Iteration: UX100 wave 05
- Operation Mode: BUILDER
- Mission ID: UX100-W05
- Mission Status: VERIFIED

## Goal
Make `/react-company-os` and `/react-agent-tools` share a clear agent authority
and approval-readiness vocabulary so owners understand how Company OS command
surfaces, MCP tools, approval gates, and supervised actions connect.

## Scope
- `web/src/main.tsx`
- this task contract
- project state, task board, next steps, system health, module confidence,
  planning queue, and design memory

## Implementation Plan
1. Reuse existing React shell, Company OS, MCP manifest, approval, and risk data.
2. Add a small shared React bridge component rather than route-local duplicate cards.
3. Render it near the top of both Company OS and Agent tools routes.
4. Verify desktop/tablet/mobile route behavior and existing build/API gates.

## Acceptance Criteria
- [x] `/react-company-os` shows an agent supervision bridge that explains pending approvals, attention, approval-first commands, and the MCP manifest handoff.
- [x] `/react-agent-tools` shows the same bridge vocabulary for visible tools, supervised tools, Company OS risky tools, and destructive routes.
- [x] Desktop, tablet, and mobile checks pass with no overflow, console issues, failed requests, or unnamed visible controls.
- [x] Existing static, build, API, and diff checks pass.

## Validation Evidence
- Tests: `npm run build`, `git diff --check`, and `npm run test:api` passed.
  The API gate used portable PostgreSQL on `localhost:55475`.
- Browser proof: Playwright fallback verified `/react-company-os` and
  `/react-agent-tools` on `http://127.0.0.1:3124` at desktop `1366x900`,
  tablet `834x1112`, and mobile `390x844` with `badCount=0`, no console
  issues, no failed requests, no horizontal overflow, zero unnamed visible
  controls, and bridge/approval/MCP handoff markers present.
- Reality status: verified

## Result Report
- Task summary: added a shared React `AgentAuthorityBridge` and rendered it in
  both the Company OS cockpit and MCP tool surface so owners see the same
  approval-first language before handing authority to agents.
- Files changed: `web/src/main.tsx`, this task contract, project state,
  task board, next steps, system health, module confidence, planning queue,
  and design memory.
- How tested: `npm run build`; `git diff --check`; `npm run test:api` against
  portable PostgreSQL; Playwright fallback desktop/tablet/mobile proof for
  `/react-company-os` and `/react-agent-tools`.
- What is incomplete: no product gap remains for this slice. Target production
  signed-in proof remains optional after deployment.
- Next steps: select the next ready product slice from the canonical queue;
  current unblocked UX100-W01 through UX100-W05 implementation wave is closed.
