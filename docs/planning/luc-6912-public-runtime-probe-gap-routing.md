# LUC-6912 Public Runtime Probe Gap Routing

## Goal

Route the Project Truth `operational_gate_gap` for
`public_runtime_probe: unknown` into a concrete owner path with current runtime
evidence.

## Task Type

Project Truth gap routing and operational readiness triage.

## Current Stage

Verification.

## Deliverable For This Stage

Evidence packet, refreshed Project Truth indexes, child DRE repair/proof issue,
and Paperclip disposition for [LUC-6912](/LUC/issues/LUC-6912).

## Scope

- Issue [LUC-6912](/LUC/issues/LUC-6912)
- Project Truth indexes:
  - `docs/status/project-truth-index.json`
  - `docs/status/project-truth-index.md`
  - `docs/status/operational-readiness-index.json`
  - `docs/status/operational-readiness-index.md`
  - `docs/status/runtime-error-index.json`
  - `docs/status/runtime-error-index.md`
  - `docs/status/event-chain-index.json`
  - `docs/status/event-chain-index.md`
- Public no-secret runtime probes for Roost web/API
- Child issue [LUC-6913](/LUC/issues/LUC-6913)

## Implementation Plan

1. Read the scoped wake payload and current Project Truth indexes.
2. Run safe no-secret public probes for Roost web/API.
3. Rebuild Project Truth indexes with `ROOST_PUBLIC_URL` and
   `ROOST_API_PUBLIC_URL` configured.
4. Classify the resulting gap and create the smallest owner-scoped follow-up.
5. Record source-control and deployment impact.

## Acceptance Criteria

- The unknown public runtime probe is converted into current evidence.
- Project Truth indexes reflect the current public probe result.
- Any remaining runtime work is delegated to the indexed owner with exact
  failing endpoints and acceptance criteria.
- No protected smoke, credential value read, secret disclosure, push, deploy,
  restart, or production mutation occurs.

## Evidence

- Wake payload: [LUC-6912](/LUC/issues/LUC-6912), status `in_progress`,
  priority `high`, no pending comments, fallback fetch not needed, checkout
  already claimed by the harness.
- Initial readback: `docs/status/project-truth-index.json` generated
  `2026-07-02T14:48:16.075Z` reported `totalGaps=1`,
  `operationalGateGaps=1`, and first gap `public_runtime_probe: unknown`.
- `npm run architecture:status` PASS:
  - `Architecture Status: GREEN`
  - graph `454` nodes / `765` relations / `35` chains
  - evidence queue `0`
  - chain worklist `0`
  - delta `0/0/0`
  - all gates pass `yes`
- `npm run check:route-capabilities` PASS:
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`
- Direct no-secret public probe:
  - `GET https://api.roost.luckysparrow.ch/health` returned `200`, service
    `companycore`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, image `unknown`.
  - `GET https://api.roost.luckysparrow.ch/v1/health` returned `200`, service
    `companycore`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, image `unknown`.
  - `GET https://roost.luckysparrow.ch/` returned `200` with Roost public HTML.
- Project Truth apply:
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  PASS, final readback generated `2026-07-02T14:52:18.743Z`.
- Generator public probe result:
  - `web_home https://roost.luckysparrow.ch` returned `200`.
  - `api_health https://api.roost.luckysparrow.ch/health` returned `200`.
  - `web_build_info https://roost.luckysparrow.ch/api/build-info` returned
    `401 missing_api_key`, request id
    `0c23dcbb-4744-49a3-87ab-af912d62587e`.
  - `api_ready https://api.roost.luckysparrow.ch/ready` returned
    `401 missing_api_key`, request id
    `4850c994-21ec-411a-acef-96884afab274`.
- Refreshed `docs/status/project-truth-index.json` now reports:
  - `eventChains=7`
  - `incompleteEventChains=0`
  - `runtimeFindings=1`
  - `criticalRuntimeFindings=1`
  - `operationalGateGaps=2`
  - `totalGaps=3`
- Child [LUC-6913](/LUC/issues/LUC-6913) created and assigned to
  `09 DRE (Deployment & Reliability Engineer)` to diagnose whether the public
  probe contract is wrong for Roost, the routes are incorrectly protected, or
  production/proxy config is missing public readiness/build-info paths.

## Result Report

The original `public_runtime_probe: unknown` state is no longer unknown. Public
web and API health are live, but the Project Truth generator's required public
runtime probes fail on `web_build_info` and `api_ready` with `401
missing_api_key`. This is now a concrete DRE/Ops runtime-readiness diagnosis,
not a PM routing gap.

No product code, test code, provider action, protected smoke, credential value
read, secret disclosure, runtime server, browser, Docker, database, push,
deploy, restart, or production mutation occurred.

## Source-Control Closure

- Repo path: `C:\Personal\Projekty\Aplikacje\Roost`
- HEAD inspected: `95e654423fd7874f7d20a2c24894e59271f4caff`
- Files changed by this issue: this packet plus refreshed Project Truth status
  indexes and source-of-truth state files.
- Commit: not created because the workspace is a shared mixed-dirty Roost
  worktree and `main` is already ahead of `origin/main` by `132`.
- Push: not needed.
- Deploy impact: none.

## Residual Risk

Production parity is not fully proven because the authenticated/protected
workspace smoke remains separate and prior protected attempts are still blocked
by key/scope issues. [LUC-6913](/LUC/issues/LUC-6913) owns the next DRE
diagnosis for the public readiness/build-info probe failures.
