# LUC-3545 First Proof Ladder From Implementation-Without-Tests

Status: DONE
Task type: QA verification
Current stage: verification
Last updated: 2026-06-11
Owner: QA & Verification Engineer
Parent: [LUC-3533](/LUC/issues/LUC-3533)

## Goal

Convert the broad `implementation_without_tests=2138` known-state signal into
one small, repeatable QA proof ladder without running protected smoke,
deploying, pushing, restarting services, mutating production, or reading
secrets.

## Selected Slice

Selected slice: Process Core read-only coverage packet,
`GET /v1/process-core/coverage`.

Reason:

- It is an active P1 confidence gap from the current Roost Process Core lane.
- It is explicitly recorded as implemented but not fully integration-verified
  in `docs/planning/luc-2713-process-core-read-only-coverage-packet.md`.
- It touches high-value surfaces that must remain fail-closed: protected API
  route, `process-core:read`, agent key profiles, MCP manifest visibility, and
  no-mutation API assertions.
- It is narrow enough for a first ladder and avoids turning the full
  `2138` signal into unbounded QA work.

## Evidence Reviewed

| Source | Result |
| --- | --- |
| `docs/graphs/architecture-health.json` | Fresh known-state graph reports `3203` entities, `3182` implemented, and `implementation_without_tests.count=2138`. |
| `docs/status/task-synchronization-report.md` | `tasks without architecture links=0`, `implementation entities without task links=215`, `verified entities without proof evidence=0`; scanner noise includes `.tmp/web-qa-*` and generated `public/react/assets`. |
| `docs/planning/luc-3533-known-state-repair-lanes.md` | Confirms LUC-3545 scope is to define a first QA proof ladder from the `2138` signal, not to test every entity. |
| `docs/planning/luc-2713-process-core-read-only-coverage-packet.md` | Shows the selected Process Core packet is implemented and statically/build verified, but `npm run test:api:local` remains the missing integration rung. |
| `src/tests/api.test.ts` | Contains Process Core assertions for unauthenticated denial, workspace-scoped counts, read-only exposure, no audit/event mutation, profile/MCP visibility, and scoped API-key denial. |

## Proof Ladder

| Rung | Purpose | Command / method | Result |
| --- | --- | --- | --- |
| 1 | Prove protected route/capability manifest alignment for the selected route. | `npm run check:route-capabilities` | PASS: `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| 2 | Prove TypeScript server, web build, MCP/profile wiring, and API assertions compile together. | `npm run build` | PASS: `build:server` and `build:web` completed. Vite reported `/vendor/phosphor/bold/style.css` remains runtime-resolved, matching existing build behavior. |
| 3 | Execute the Process Core API integration assertions against disposable local PostgreSQL. | `npm run test:api:local` | BLOCKED: Docker Desktop Linux engine is unavailable: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` No validation DB container was started. |

## Classification

Selected slice status: partially verified.

- Static route/capability proof: verified.
- Compile/build proof: verified.
- Repeatable integration proof: blocked by local validation database
  provisioning, not by a Process Core code failure observed in this QA lane.

## Smallest Next Proof

Next owner/action: local environment owner enables Docker Desktop Linux engine
or provides an authorized disposable local `DATABASE_URL` using a database
named `companycore_test`; then QA or Core Backend reruns:

```powershell
npm run test:api:local
```

Expected promotion condition: the Process Core assertions in
`src/tests/api.test.ts` execute and pass, covering auth denial, workspace
scoping, read-only/no-mutation behavior, MCP/profile visibility, and scoped key
denial.

## Non-Actions

- No protected smoke was run.
- No deploy, push, restart, production mutation, key rotation, or secret access
  occurred.
- No source code was edited for this QA lane.
- No validation-owned Docker container was left running because Docker was not
  available.

## Source-Control Closure

Commit decision: not committed. This QA lane produced an evidence packet and
state sync only, while the workspace already contains a mixed multi-lane dirty
tree and `npm run build` regenerated Vite assets under `public/react/assets`.

Push status: not needed.

Deploy impact: none.

## Result Report

LUC-3545 is complete for the first proof-ladder scope. The broad
implementation-without-tests signal now has a concrete first target, executed
low-cost proof rungs, and a named integration blocker with the exact next
command.
