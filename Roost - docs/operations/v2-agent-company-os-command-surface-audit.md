# V2 Agent Company OS Command Surface Audit

Last updated: 2026-05-11

## Purpose

This audit starts the selected V2 lane: Agent-First Company OS. It maps the
existing Company OS HTTP command surface to MCP exposure, capabilities,
event/audit evidence, and the first safe follow-up slice.

No runtime behavior changed during this audit.

## Source Review

| Source | Finding |
| --- | --- |
| `src/modules/company-os/company-os.routes.ts` | Company OS read routes and lifecycle command routes already exist. Writes are command-shaped, not raw table CRUD. |
| `src/auth/capabilities.ts` | The Company OS command routes are present in `adapterManifest.routes.companyOs`, so MCP tools are generated from the same route contract. |
| `src/mcp/manifest.ts` | MCP tools are capability-filtered and mark stage, pipeline-run, approval-decision, and automation-execute routes as `requiresApproval`. |
| `scripts/companycore-mcp-server.mjs` | The bridge is intentionally thin and calls the HTTP API; it does not enforce an extra approval handshake before tool calls. |
| `src/auth/agent-key-profiles.ts` | `mcp_company_os_reader` is documented as read-only but currently includes approval request and approval decision scopes. |
| `docs/API.md` | Company OS commands are documented as lifecycle routes with event/audit evidence. |
| `docs/operations/mcp-agent-runtime-setup.md` | Runtime setup tells agents to use least-privilege profiles and reserve `mcp_operator` for supervised sessions. |

## Command Surface Matrix

| Route | Capability | MCP exposure | Risk | Evidence | Audit result |
| --- | --- | --- | --- | --- | --- |
| `GET /v1/company-os` | `company-os:read` | Safe for read profiles | Low | V1EVID-001, MCP-005, API tests | Keep exposed to `mcp_company_os_reader`. |
| `GET /v1/company-os/:collection` | `company-os:read` | Safe for read profiles | Low | API tests, Company OS collection evidence | Keep exposed to `mcp_company_os_reader`. |
| `GET /v1/company-os/:collection/:id` | `company-os:read` | Safe for read profiles | Low | API tests, audit-log readback smoke | Keep exposed to `mcp_company_os_reader`. |
| `POST /v1/company-os/approvals/request` | `company-os:approval:request` | Exposed to any key with scope | Medium | V1EVID-001 approval request event/audit evidence | Do not expose to a read-only profile; safe candidate for a future supervised approval-request profile. |
| `POST /v1/company-os/approvals/:id/decision` | `company-os:approval:decide` | Exposed to any key with scope and marked `requiresApproval` | High | V1EVID-001 approval decision and repeated-decision rejection | Do not expose to read-only or unsupervised profiles. |
| `POST /v1/company-os/pipeline-runs/:id/actions/start-stage` | `company-os:pipeline-run:write` | Exposed to `mcp_operator`, marked `requiresApproval` | High | V1EVID-001 stage start event/audit evidence | Keep restricted to supervised operator profile until a separate approval-aware agent flow exists. |
| `POST /v1/company-os/stage-runs/:id/actions/block` | `company-os:stage-run:write` | Exposed to `mcp_operator`, marked `requiresApproval` | Medium | Integration test evidence; adjacent V1EVID-001 lifecycle smoke | Keep restricted to supervised operator profile. |
| `POST /v1/company-os/stage-runs/:id/actions/validate` | `company-os:stage-run:write` | Exposed to `mcp_operator`, marked `requiresApproval` | Medium | V1EVID-001 validation event/audit evidence | Keep restricted to supervised operator profile. |
| `POST /v1/company-os/stage-runs/:id/actions/complete` | `company-os:stage-run:write` | Exposed to `mcp_operator`, marked `requiresApproval` | High | V1EVID-001 completion event/audit evidence and fail-closed integration tests | Keep restricted to supervised operator profile. |
| `POST /v1/company-os/events/:id/actions/evaluate-automation-rules` | `company-os:automation:execute` | Exposed to `mcp_operator`, marked `requiresApproval` | High | V1EVID-001 automation dry-run/execute evidence; integration tests | Keep restricted to supervised operator profile. |

## Gaps

| ID | Gap | Severity | Required action |
| --- | --- | --- | --- |
| V2AGENT-GAP-001 | `mcp_company_os_reader` included `company-os:approval:request` and `company-os:approval:decide` despite being documented as read-only and low risk. | P1 | Closed by V2AGENT-002: approval write scopes were removed, and regression assertions verify the profile-created reader key cannot see or call approval write tools. |
| V2AGENT-GAP-002 | MCP manifest `requiresApproval` is metadata only; the stdio bridge still forwards `tools/call` if the key has the capability. | P1 | Design closed by V2AGENT-003: `docs/operations/approval-aware-mcp-command-flow.md` defines default fail-closed bridge behavior and a supervised-only override. Implementation remains V2AGENT-004. |
| V2AGENT-GAP-003 | Target-environment MCP smoke after final runtime key creation remains pending. | P2 | Run target MCP smoke when production/service keys are created or rotated. |

## Decision

The first safe Agent-First Company OS slice is not a new command. It is a
least-privilege correction:

`V2AGENT-002 MCP Company OS Reader Least-Privilege Correction`

That slice removed approval write scopes from `mcp_company_os_reader`, verified
the MCP manifest no longer exposes approval write tools for that profile, and
kept command writes limited to `mcp_operator` until a separate approval-aware
agent workflow is designed.

## Next Slice

`V2AGENT-004 MCP Requires-Approval Bridge Guard`

Scope:

- `src/mcp/manifest.ts`
- `scripts/companycore-mcp-server.mjs`
- `scripts/companycore-mcp-smoke.mjs`
- `docs/operations/companycore-mcp-bridge.md`
- `docs/operations/mcp-agent-runtime-setup.md`
- `docs/operations/v2-agent-company-os-command-surface-audit.md`
- canonical state files and planning queue

Implementation direction:

- Default bridge calls to `requiresApproval` tools must return
  `mcp_tool_requires_supervision` without forwarding the HTTP request.
- Safe read tools must keep working through the HTTP API.
- Supervised override must be explicit and documented.

V2AGENT-002 validation:

- `npm run build`: passed.
- `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && node --test dist/tests/api.test.js"`: passed.
