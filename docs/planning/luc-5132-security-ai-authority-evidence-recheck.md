# LUC-5132 Security And AI Authority Evidence Recheck

## Header

- ID: LUC-5132
- Title: Security and AI authority evidence recheck before unsupervised agent writes
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Security
- Priority: P1
- Risk Rows: RISK-MCP-001, RISK-MCP-002, RISK-CC-ARCH-001, SEC-003
- Mission ID: LUC-5132-SECURITY-AI-AUTHORITY-RECHECK
- Mission Status: VERIFIED

## Context

Paperclip woke the Security and Privacy Auditor for a high-priority Roost
recheck before unsupervised agent writes. This heartbeat was scoped to
evidence review and focused guardrail proof. It did not authorize runtime
mutation, production smoke, deploy, push, credential access, or broad
implementation work.

## Goal

Recheck whether current repository evidence supports unsupervised agent write
authority, and record the security disposition with proof.

## Scope

Reviewed and verified:

- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `scripts/companycore-mcp-server.mjs`
- `scripts/companycore-ai-ready-smoke.mjs`
- `docs/operations/approval-aware-mcp-command-flow.md`
- `docs/operations/mcp-agent-runtime-setup.md`
- `.agents/state/risk-register.md`
- `.agents/state/module-confidence-ledger.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`

Explicit exclusions:

- no product code changes
- no schema or migration work
- no production or protected smoke
- no deploy, push, restart, or production mutation
- no credential access or secret disclosure
- no browser, database, Docker, server, watcher, or long-running process

## Findings

| ID | Check | Evidence | Status | Security Disposition |
| --- | --- | --- | --- | --- |
| LUC-5132-F1 | Read-only MCP Company OS profile does not carry approval write scopes | `src/auth/agent-key-profiles.ts` shows `mcp_company_os_reader` scoped to read capabilities plus `mcp:read`; approval request/decision and lifecycle write scopes are absent. | verified by source inspection | Reader profile is acceptable for planning/review context, not write authority. |
| LUC-5132-F2 | MCP manifest marks risky write commands as approval-required | `src/mcp/manifest.ts` sets `requiresApproval` for destructive routes, approval decisions, automation execution, workflow activation, stage-run, and pipeline-run commands. | verified by source inspection | Risky command exposure remains metadata plus API capability gated; not autonomous approval. |
| LUC-5132-F3 | MCP bridge fails closed for `requiresApproval` tools in default mode | Mock MCP bridge proof returned `mcp_tool_requires_supervision`, `isError=true`, and `riskyForwarded=false` in default `read_only` mode. | verified by command | Default unsupervised bridge does not forward risky commands. |
| LUC-5132-F4 | Existing route/capability map remains synchronized | `npm run check:route-capabilities` passed with `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. | verified by command | Capability manifest drift was not detected. |
| LUC-5132-F5 | Architecture status remains green after the recheck | `npm run architecture:status` passed with `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. | verified by command | Recheck did not expose source-of-truth drift. |

## Validation Evidence

Commands run:

```text
node --check scripts/companycore-mcp-server.mjs
PASS

node --check scripts/companycore-ai-ready-smoke.mjs
PASS

npm run check:route-capabilities
PASS: checkedManifestRoutes=180, checkedRouteFiles=35, status=ok

npm run architecture:status
PASS: GREEN, graph 454/765/35, evidence queue 0, chain worklist 0, delta 0/0/0, all gates pass

inline Node mock MCP bridge guard proof
PASS: { passed: true, error: "mcp_tool_requires_supervision", isError: true, riskyForwarded: false }
```

Source-control readback:

```text
git status --short --branch
## main...origin/main [ahead 66]
```

## Security / Privacy Evidence

- Data classification: no user data, production data, credentials, provider
  tokens, cookies, screenshots, or private account data accessed.
- Trust boundaries: CompanyCore remains the API/MCP authority boundary; MCP
  bridge stays a thin HTTP client and does not read PostgreSQL or provider
  APIs directly.
- Permission checks: profile inspection confirms the default reader profile is
  read-only; route-capability gate confirms manifest coverage remains
  synchronized.
- Abuse cases checked:
  - read-profile agent attempts approval decision: denied by missing scope;
  - unsupervised high-scope bridge attempts `requiresApproval` tool: blocked
    by bridge before HTTP forwarding;
  - bridge tries to bypass API policy: source inspection confirms it forwards
    through HTTP only and supervised mode still relies on API validation.
- Secret handling: no secret values were read or printed.
- Fail-closed behavior: verified by mock bridge proof with `riskyForwarded=false`.

## AI Testing Evidence

- AI authority boundary reviewed against `AI_TESTING_PROTOCOL.md` expectations
  for unauthorized access, role-break, and fail-closed command behavior.
- Result: current evidence supports read-only and supervised write models only.
  It does not justify enabling broad unsupervised agent writes.

## Result Report

Security disposition: done for the recheck. Roost has current local evidence
that default MCP agent usage is read-only or fail-closed for risky commands.
Unsupervised broad write rollout remains not approved until a future scoped
design and AI red-team proof explicitly covers autonomous write policy,
approval-token semantics, target runtime configuration, and production smoke.

Files changed:

- `docs/planning/luc-5132-security-ai-authority-evidence-recheck.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`

Commit status: not committed in this heartbeat; documentation/evidence-only
security recheck. Push status: not needed. Deploy impact: none.
