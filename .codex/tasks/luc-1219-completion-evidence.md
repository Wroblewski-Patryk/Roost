Completed LUC-1219 as durable documentation-link closure for unclassified
`src/app.ts#/deals`.

Completion evidence:
- API contract: `docs/API.md` now explicitly documents the protected
  `/v1/deals` routes, their compatibility `/deals` aliases, workspace-scoped
  relation checks, and archive-on-delete behavior.
- Documentation linkage: `docs/architecture/relations/documentation-links.csv`
  now links `src/app.ts#/deals` to the accepted API contract.
- Generated truth: `docs/status/app-completion-index.json` and
  `docs/status/app-completion-index.md` now report `missingDocLink=1`, and the
  exact `USE /deals` row is gone.
- Project Truth routing: `docs/status/project-truth-index.json` and
  `docs/status/project-truth-index.md` now advance the first gap to
  `src/app.ts#/decisions` `missing_test_link`.
- State handoff updates: `.codex/context/TASK_BOARD.md`,
  `.codex/context/PROJECT_STATE.md`, `.agents/state/active-mission.md`,
  `.agents/state/current-focus.md`, `.agents/state/next-steps.md`, and
  `.agents/state/module-confidence-ledger.md` record the doc-link closure and
  the next routed gap.
- Task contract updated:
  `.codex/tasks/luc-1219-prove-unclassified-user-workflow-missing-doc-link-for-use-deals.md`.

No runtime product changes, provider calls, protected smoke, deploy/push/restart,
production mutation, credential access, or secret disclosure occurred.

Indexing rule:
- Architecture-awareness task indexing should prefer the task packet's
  structured `- Status:` header value.
- A separate completion-evidence artifact is useful durable proof, but
  terminal task status must not depend on that sibling file to index as
  complete.

Next owner/action: Test Automation Engineer + QA Regression Lead for the routed
`src/app.ts#/decisions` `missing_test_link` gap.
