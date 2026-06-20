# LUC-4857 Product & Delivery Proof-Ladder Target After Relationships

## Header
- ID: LUC-4857
- Title: Select next proof-ladder target after Relationships
- Task Type: research
- Current Stage: planning
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-4850](/LUC/issues/LUC-4850), [LUC-4844](/LUC/issues/LUC-4844)
- Priority: P1
- Module Confidence Rows: DMS `02 Product And Delivery`, architecture test-evidence debt
- Iteration: 2026-06-20 QA target selection
- Operation Mode: TESTER
- Mission ID: LUC-4857-PRODUCT-DELIVERY-PROOF-LADDER-TARGET
- Mission Status: VERIFIED

## Goal
Select the next release-relevant QA proof-ladder target from the remaining Roost architecture-health evidence debt after Operations, Assets, and Relationships received current local proof-ladder evidence.

## Scope
- Read current source-of-truth state for [LUC-4850](/LUC/issues/LUC-4850), the module confidence ledger, DMS planning, architecture health, and route/capability readiness.
- Select exactly one next target.
- Create the executable QA follow-up when the target is ready.
- Exclusions: runtime code, schema, migration, protected smoke, deploy, push, restart, production mutation, credential access, secret disclosure, server, database, browser proof, or watcher process.

## Selected Target
Selected target: `02 Product & Delivery -> Operating Graph Overview`.

Executable proof issue: [LUC-4861](/LUC/issues/LUC-4861).

Affected surfaces:
- Route: `/areas?area=02-produkt&view=overview`
- Frontend: `web/src/features/departments/product-delivery-route.tsx`
- Route registry: `web/src/app-route-registry.ts`, `web/src/main.tsx`
- API packet used by route: `GET /v1/operating-graph/areas/02-produkt?limit=80`
- Architecture/product sources: `docs/planning/dms-13-systems-v1-implementation-audit.md`, `docs/planning/v1-department-systems-global-implementation-plan.md`

## Rationale
- Operations, Assets, and Relationships have current local proof-ladder evidence.
- Sales is already locally verified in existing source-of-truth notes.
- The active broader DMS sequence after Relationships is `02 Product And Delivery`, then `09 Technology/AI`, then `10 Legal/Standards`.
- Product & Delivery is release-relevant because it connects promises, tasks, artifacts, and acceptance evidence, which is the next business-core management surface after client relationship context.
- The route already exists and uses an approved read-only operating-graph packet, so QA can run a proof ladder without requiring a new implementation lane first.

## Readiness Proof
- `npm run check:route-capabilities` passed:
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`
- Static inspection found:
  - `web/src/app-route-registry.ts` defines `canonicalProductDeliveryPath = "/areas?area=02-produkt&view=overview"`.
  - `web/src/main.tsx` routes `/areas?area=02-produkt&view=overview` to `ProductDeliveryRoute`.
  - `web/src/features/departments/product-delivery-route.tsx` loads `/v1/operating-graph/areas/02-produkt?limit=80`.
- `docs/graphs/architecture-health.json` still reports broad `implementation_without_tests=1168`, so a focused proof ladder remains useful even though the architecture status gate is green.

## Deferred Candidates
- `09 Technology/AI`: deferred because Product & Delivery is next in the post-Relationships DMS sequence.
- `10 Legal/Standards`: deferred because it should follow Technology/AI in the current DMS order and carries stronger governance/security review implications.
- `06 People/Agents`: deferred because current queue positions it after Technology/AI and Legal/Standards for this proof-ladder wave.

## Follow-Up Proof Contract
[LUC-4861](/LUC/issues/LUC-4861) should:
1. Run `npm run test:api:local`.
2. If green, run authenticated local desktop and mobile proof for `/areas?area=02-produkt&view=overview`.
3. Verify Product & Delivery identity, operating-graph evidence, goals/workflow/task/knowledge/source mapping signals when present, honest empty/degraded states when data is sparse, safe synthetic backend error language, no relevant failed requests, no console errors, and no horizontal overflow.
4. Capture evidence under `docs/ux/evidence/`.
5. Publish a proof packet under `docs/planning/`.
6. Clean up all validation-owned local processes.

## Validation Evidence
- Tests: `npm run check:route-capabilities` PASS.
- Manual checks: DMS audit and global implementation plan source review; static route/API packet inspection with `rg`.
- Screenshots/logs: not applicable for selection-only scope.
- Reality status: verified for target selection; executable API/browser proof delegated to [LUC-4861](/LUC/issues/LUC-4861).

## Result Report
- Task summary: selected `02 Product & Delivery -> Operating Graph Overview` as the next QA proof-ladder target after Relationships.
- Files changed: this planning packet and source-of-truth state files.
- How tested: `npm run check:route-capabilities` passed and static route inspection confirmed route/API alignment.
- What is incomplete: API/browser proof is intentionally not run in this selection issue; [LUC-4861](/LUC/issues/LUC-4861) owns it.
- Next steps: execute [LUC-4861](/LUC/issues/LUC-4861), then update module confidence with the proof result or create a repair issue if a rung fails.
