# LUC-4914 Roost Protected Recheck

## Goal

Run the narrow protected Roost CompanyCore recheck allowed by the gate watcher
after reassignment from a paused role to the active Roost PM.

## Scope

- Issue: [LUC-4914](/LUC/issues/LUC-4914)
- Root blocker: [LUC-261](/LUC/issues/LUC-261)
- Gate source: [LUC-2697](/LUC/issues/LUC-2697)
- Command: `npm run aog:deploy-smoke`
- Repository: `C:\Personal\Projekty\Aplikacje\Roost`

## Implementation Plan

1. Acknowledge the reassignment comment and treat it as ownership repair.
2. Verify non-secret runtime metadata presence without printing values.
3. Run exactly one protected smoke command.
4. Record pass/fail evidence and residual blocker.
5. Do not mutate product code, push, deploy, restart, or change runtime
   configuration.

## Acceptance Criteria

- CompanyCore API key presence is recorded without value disclosure.
- CompanyCore base URL presence is recorded without secret disclosure.
- The smoke result includes the exact command, failure or pass reason, UTC
  timestamp, and request id when available.
- Next blocker is named if the smoke fails.

## Definition of Done

- Evidence is recorded in this packet and source-of-truth state files.
- Paperclip issue receives a clear final disposition.
- No product-code mutation, push, deploy, restart, unrelated runtime change, or
  secret disclosure occurs.

## Result Report

Status: blocked by credential/policy failure.

Evidence:

- Reassignment comment `9e82feb0-b4cf-48be-9497-069381b9bff9` changed the next
  action from paused-role waiting to active Roost PM protected recheck triage.
- Redacted runtime presence check: `COMPANYCORE_API_KEY_PRESENT=True`;
  `COMPANYCORE_BASE_URL_PRESENT=True HOST=api.roost.luckysparrow.ch`;
  `COMPANYCORE_MCP_COMMAND_MODE_PRESENT=False`.
- UTC before smoke: `2026-07-01T21:26:47.1273839Z`.
- `npm run aog:deploy-smoke` failed at MCP manifest preflight:
  `status=403`, `error=invalid_api_key`,
  `requestId=406a2e5d-c88e-4bbf-8965-09cd63a26040`.
- Source ref during recheck: `95e654423fd7874f7d20a2c24894e59271f4caff`.
- Git posture before evidence packet: `main...origin/main [ahead 132]` with
  existing mixed dirty tracked state and many untracked planning/evidence files.

Disposition:

- [LUC-4914](/LUC/issues/LUC-4914) should remain blocked.
- Unblock owner/action: runtime secret owner, Security/Ops owner, or board gate
  owner must repair or replace the Roost CompanyCore service key so the MCP
  manifest endpoint accepts the key, then create a fresh one-run protected
  recheck lane or explicit same-session approval.
- Deploy impact: none. No product code, test code, push, deploy, restart,
  provider mutation, runtime config change, credential value read, secret
  disclosure, browser, database, Docker, or background process was started.
