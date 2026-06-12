# Task

## Header
- ID: LUC-3521
- Title: Key-bearing MCP manifest runtime evidence for LUC-2971
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Deployment and Reliability Engineer
- Depends on: [LUC-2971](/LUC/issues/LUC-2971), [LUC-2700](/LUC/issues/LUC-2700), [LUC-261](/LUC/issues/LUC-261)
- Priority: P1
- Mission ID: LUC-3521-KEY-BEARING-MCP-MANIFEST-RUNTIME-EVIDENCE

## Mission Block
- Mission objective: Provide non-secret key-bearing `/v1/mcp/manifest`
  runtime evidence that [LUC-2971](/LUC/issues/LUC-2971) can consume.
- Included slices: Paperclip wake payload read, project state review,
  Coolify Roost env endpoint read with secret values redacted, in-memory
  key-bearing manifest request, production MCP bridge smoke, source-of-truth
  sync, and Paperclip disposition.
- Exclusions: no protected `aog:deploy-smoke`, deploy, push, restart,
  production mutation, key rotation, secret value print, secret persistence,
  database mutation, or unrelated runtime change.
- Final disposition: done for DRE proof scope. Key-bearing manifest acceptance
  is verified; protected deploy-smoke remains a separate approval-gated lane.

## Goal
Record key-bearing MCP manifest acceptance evidence without exposing the raw
key and without mutating production.

## Scope
- Read:
  - Wake payload for [LUC-3521](/LUC/issues/LUC-3521)
  - `docs/planning/luc-2971-key-bearing-mcp-manifest-acceptance-evidence.md`
  - `docs/planning/luc-3497-companycore-runtime-binding-facts-for-luc-2971.md`
  - Coolify Roost app env endpoint:
    `/api/v1/applications/rnqqkhl3o3dut4qv56mlxly2/envs`
  - `https://api.roost.luckysparrow.ch/v1/mcp/manifest`
- Update:
  - this evidence packet
  - `docs/planning/luc-2971-key-bearing-mcp-manifest-acceptance-evidence.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`

## Evidence

### Runtime Key Source
- UTC: `2026-06-11T16:54:45.9690037Z`
- Source: Coolify Roost application env endpoint for app
  `rnqqkhl3o3dut4qv56mlxly2`
- Candidate used in memory: `SERVICE_PASSWORD_API_KEY`
- Raw key printed: `false`
- Raw key written to repo: `false`
- Raw key persisted by agent: `false`
- Coolify env endpoint values were available, but output was limited to names,
  presence, and non-secret runtime response metadata.

### Key-Bearing Manifest Acceptance
- Target: `https://api.roost.luckysparrow.ch/v1/mcp/manifest`
- Header used: `X-API-Key`
- Key source: Coolify Roost `SERVICE_PASSWORD_API_KEY`
- UTC: `2026-06-11T16:54:45.9690037Z`
- HTTP status: `200`
- Request id: `38b406b0-71f4-4a76-a907-450ccbd44004`
- Content type: `application/json; charset=utf-8`
- Service: `companycore`
- Schema version: `2026-05-09`
- Auth type: `api_key`
- Workspace scoped: `true`
- Capability scoped: `true`
- Tool count: `179`
- Unique capability count: `79`
- Risk levels present: `destructive`, `read`, `write`
- Includes `company-os:read`: `true`
- Includes `connection:read`: `true`
- Sample visible tools:
  - `companycore_get_connection`
  - `companycore_get_company_os`
  - `companycore_get_company_os_workflow_definitions_drafts`
  - `companycore_get_company_os_workflow_definitions_drafts_by_id`
  - `companycore_post_company_os_workflow_definitions_drafts`

### Production MCP Bridge Smoke
- Command: `npm run mcp:smoke`
- Runtime env source: Coolify Roost `SERVICE_PASSWORD_API_KEY` injected only
  into the command process and removed from the process environment afterward.
- Base URL: `https://api.roost.luckysparrow.ch`
- Result: PASS
- Output:
  - `ok: true`
  - `manifestPreflightStatus: 200`
  - `manifestPreflightRequestId: 0790b8f5-cef5-480b-9b43-8ec53db32d48`
  - `toolCount: 179`
  - `calledTool: companycore_get_company_os`
  - `callStatus: 200`

## Security Determination

| Surface | Evidence | Classification |
| --- | --- | --- |
| Target runtime | `https://api.roost.luckysparrow.ch` responded to key-bearing manifest and MCP bridge smoke. | verified |
| Key-bearing manifest acceptance | `/v1/mcp/manifest` returned `200` with request id `38b406b0-71f4-4a76-a907-450ccbd44004`. | verified |
| MCP capability exposure | Manifest returned `179` tools and `79` unique capabilities. | verified |
| Safe read tool path | `npm run mcp:smoke` called `companycore_get_company_os` with status `200`. | verified |
| Secret handling | Key was consumed from Coolify in memory; raw key was not printed, logged in the evidence packet, committed, or persisted. | verified by command discipline |
| Protected deploy smoke | `npm run aog:deploy-smoke` was not run. | not in scope |

## Acceptance Criteria
- [x] Key-bearing manifest request was sent to the Roost target runtime.
- [x] Result includes HTTP status, request id, service/schema/auth metadata,
  tool count, and capability count.
- [x] Existing MCP bridge smoke proves tool list and safe read tool call.
- [x] Raw key was not printed or persisted.
- [x] No deploy, restart, key rotation, production mutation, or protected
  deploy smoke occurred.

## Definition Of Done
- [x] Evidence packet published.
- [x] Source-of-truth state files updated.
- [x] Verification commands and results recorded.
- [x] Residual next owner/action recorded.

## Result Report
- Task summary: [LUC-3521](/LUC/issues/LUC-3521) provides the missing
  key-bearing MCP manifest runtime evidence for
  [LUC-2971](/LUC/issues/LUC-2971). The target manifest accepted a key-bearing
  request with status `200`, and the production MCP bridge smoke passed.
- Files changed:
  - `docs/planning/luc-3521-key-bearing-mcp-manifest-runtime-evidence-for-luc-2971.md`
  - `docs/planning/luc-2971-key-bearing-mcp-manifest-acceptance-evidence.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Verification:
  - Coolify env endpoint read -> `SERVICE_PASSWORD_API_KEY` value available;
    value not printed.
  - Key-bearing manifest request -> `200`, request id
    `38b406b0-71f4-4a76-a907-450ccbd44004`, `179` tools.
  - `npm run mcp:smoke` -> PASS, manifest preflight `200`, request id
    `0790b8f5-cef5-480b-9b43-8ec53db32d48`, tool call status `200`.
- Commit: not committed; the shared Roost worktree was already a mixed
  multi-lane dirty state before this heartbeat.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: the key source is documented as Coolify
  `SERVICE_PASSWORD_API_KEY`, not a named MCP profile label. The manifest
  response proves effective access to the MCP manifest and tools, but Security
  may still want to record a profile label or rotation timestamp if their
  acceptance checklist requires that metadata separately.
- Next owner/action: [LUC-2971](/LUC/issues/LUC-2971) or the runtime gate owner
  should consume this evidence. [LUC-2700](/LUC/issues/LUC-2700) can resume
  only under a fresh protected deploy-smoke approval.
