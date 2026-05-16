# Next Steps

Last updated: 2026-05-16

## NOW

1. V1REL-001 Area relationship provenance review.
   - Source: `docs/ux/v1-web-view-index-2026-05-15.md`.
   - Rebuild `/relationships` around selected-area provenance, confidence
     labels, review gaps, unsupported families, and agent-safe relationship
     context.

## NEXT

1. Use the CompanyCore business module map during upcoming product intake.
   - Source: `docs/architecture/companycore-business-module-map.md`.
   - Apply it before settings, Drive, ClickUp, CRM, pipeline, knowledge,
     resource, or agent work so each slice is classified as native core,
     provider-backed, future adapter, or derived view.
   - This is a planning guardrail, not a runtime task that displaces the next
     production proof.
2. Use the CompanyCore global business flow during upcoming CRM, marketing,
   delivery, finance, support, feedback, graph, dashboard, or AI-agent intake.
   - Source: `docs/architecture/companycore-global-business-flow.md`.
   - Map the request to the 13-stage value pipeline before adding runtime
     surfaces.
   - Start with read models and visualization before adding write behavior,
     billing/payment commands, survey flows, or generic graph relations.
3. Use the department management systems architecture before generating or
   implementing department views.
   - Source: `docs/architecture/department-management-systems-architecture.md`.
   - Detailed blueprint:
     `docs/architecture/department-management-systems-v1-blueprint.md`.
   - View map: `docs/ux/v1-department-management-systems-view-map.md`.
   - Prompt pack: `docs/ux/v1-department-system-prompt-pack.md`.
   - Generate one department spec at a time, then implement one read-only
     department shell before adding writes.
4. Review and apply the Department Management Systems V1 Blueprint.
   - Source:
     `docs/architecture/department-management-systems-v1-blueprint.md`.
   - It defines `00 Main` orchestration, the 12 operating department systems,
     implementation waves, backend gap register, Paperclip/agent packets, and
     recommended build order.
   - Recommended order after user review: deepen `04 Operations`, then build
     read-only `01 Strategy`, `03 Sales`, `05 Relationships`, and
     `02 Product And Delivery` systems.
5. Use the V1 Department Systems Global Implementation Plan.
   - Source:
     `docs/planning/v1-department-systems-global-implementation-plan.md`.
   - Follow its waves and task IDs for web, backend, Paperclip, QA,
     production, and closeout work.
6. Plan the minimum company control loop command layer.
   - Source:
     `docs/architecture/department-management-systems-v1-blueprint.md`.
   - `00 Main` is the global intake for owner ideas, client requests,
     documents, tasks, risks, bugs, opportunities, Paperclip background
     outputs, feedback, and improvement signals.
   - First backend implementation is `GET /v1/intake`; first web
     implementation is the verified `00 Main` read-only panel. DMS-00-006 now
     implements proposal-only classification and routing; the next AI-facing
     proof is DMS-00-007.
7. Implement pricing, discounts, current client work, and archived clients from
   the completed inventory.
   - Source:
     `docs/planning/dms-money-pricing-discount-source-inventory.md`.
   - Use `DMS-07-001`, `DMS-03-005`, `DMS-03-006`, and `DMS-05-002` as the
     next scoped steps. Keep agents in analysis/proposal mode until pricing,
     invoice, payment, and discount write contracts are explicit.
8. Run production smoke for the `04 Operacje` department system after deploy.
   - Route: `/areas?area=04-operacje&view=overview`.
   - Source: `docs/planning/operations-management-system-v1-task-contract.md`.
   - Local database-backed proof is complete; target proof should compare the
     deployed build metadata and use a real deployed owner session.
9. AOG-BE-002 through AOG-BE-006 backend graph follow-ups.
   - After deployed AOG read proof is complete, plan and implement:
     `Target.metricId`,
     goal/workflow bridge, normalized workflow-task links, knowledge/source
     link contract, and read-only MCP exposure. Keep write relations
     command-shaped and avoid generic edge CRUD.
10. AGRUN-010 Upstream Agent Source Merge Execution.
   - Blocked until upstream write access or an approved fork/PR route exists.
11. Production push-to-running-image smoke after the next deploy.
   - Build metadata restoration is implemented locally; after deploy, compare
     public `/health` `build.commit` with the pushed commit before claiming
     auto-deploy proof.
12. Production AOG/settings smoke.
   - After the next deploy, compare public `/health` build metadata with the
     pushed commit.
   - Smoke `/v1/operating-graph/areas/01-strategia` and authenticated settings
     before raising production confidence.
13. V1 operations route-depth slices.
   - Deepen one existing-contract workbench from the operations cockpit:
     `relationships`, then selected-area `knowledge`.
14. Production smoke for locally verified V1 command surfaces.
   - After the next deploy, compare public `/health` build metadata with the
     pushed commit.
   - Smoke `/v1/operating-graph/areas/01-strategia`, authenticated settings,
     authenticated `/operations`, and authenticated `/tasks-adapter`.
15. V1AREA capability actions.
   - Add create/edit/filter actions only where an existing backend contract
     already supports the selected capability safely.

## LATER

1. ACF-UX-002 Company City Dashboard / Gamified Strategic Map.
   - Deferred to V2 readiness gate.
2. ACF-OPS-001 Auto-Deploy Proof Or Manual Path Acceptance.
3. ACF-QA-001 Lint And Split Test Gates.
4. AGRUN-010 Upstream Agent Source Merge Execution, blocked until upstream
   write access or an approved fork/PR route exists.

## Selection Rules

- Pick one bounded mission objective for each autonomous iteration; use small
  checkpoint tasks inside that mission when useful.
- Prefer tasks that reduce blocker risk, regression risk, or unclear source of
  truth.
- Do not start new feature work when a P0/P1 regression or release blocker is
  unresolved.
- Keep this file synchronized with `.codex/context/TASK_BOARD.md` and
  `docs/planning/mvp-next-commits.md`.
