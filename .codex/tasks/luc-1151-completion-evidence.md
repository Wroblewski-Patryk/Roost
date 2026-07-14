Completed LUC-1151 as durable documentation-link closure for unclassified `src/app.ts#/api/build-info`.

Completion evidence:
- API contract: `docs/API.md` now documents `/api/build-info` as a public runtime metadata alias alongside `/health`, `/v1/health`, `/ready`, and `/v1/ready`.
- Documentation linkage: `docs/architecture/relations/documentation-links.csv` now links `src/app.ts#/api/build-info` to the accepted API contract.
- Generated truth: `docs/status/app-completion-index.json` and `docs/status/app-completion-index.md` now report `missingDocLink=0`.
- Project Truth routing: `docs/status/project-truth-index.json` and `docs/status/project-truth-index.md` now advance the first gap to `src/app.ts#/assets` `missing_test_link`.
- State handoff updates: `.codex/context/TASK_BOARD.md`, `.codex/context/PROJECT_STATE.md`, `.agents/state/active-mission.md`, `.agents/state/current-focus.md`, and `.agents/state/next-steps.md` record the doc-link closure and the next routed gap.
- Task contract updated: `.codex/tasks/luc-1151-prove-unclassified-user-workflow-missing-doc-link-for-use-api-build-info.md`.

No runtime product changes, provider calls, protected smoke, deploy/push/restart, production mutation, credential access, or secret disclosure occurred.

Indexing rule:
- Architecture-awareness task indexing should prefer the task packet's structured `- Status:` header value.
- A separate completion-evidence artifact is useful durable proof, but terminal task status must not depend on that sibling file to index as complete.

Next owner/action: Test Automation Engineer + QA Regression Lead for the routed `src/app.ts#/assets` `missing_test_link` gap.
