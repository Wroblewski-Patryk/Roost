# Working Agreements

- Keep changes tiny, single-purpose, and reversible.
- Keep docs and implementation in sync.
- Use `.agents/workflows/documentation-governance.md` when deciding where new
  repository truth should live.
- Treat `docs/architecture/` as implementation law unless the user explicitly
  approves an architectural change.
- If a better solution would require changing architecture, propose it in
  conversation instead of changing it implicitly.
- Use findings-first review style.
- Do not mark work done without validation evidence.
- Keep repository artifacts in English.
- Keep AI/user communication in the user's language.
- Delegate via subagents only with explicit ownership and non-overlapping scope.
- Keep root minimal. Project docs belong in `docs/`.
- Do not reference files from sibling repositories.
- Scope lock is mandatory: implement only explicitly requested behavior unless a
  bridge change is required by tests, build contracts, or runtime safety.
- Do not apply opportunistic cleanup, UI tweaks, or copy rewrites outside the
  accepted task scope.
- Reuse existing shared UI patterns before creating new visual variants or
  page-local component styling.
- For substantial UI work, establish or review the project's visual direction
  before broad implementation.
- When a canonical UI reference exists, decompose the task into visual audit,
  asset strategy, implementation, and screenshot comparison instead of one
  vague styling pass.
- Do not call a screen polished without checking responsive behavior, state
  coverage, and accessibility.
- Do not silently downgrade decorative fidelity by replacing image-based
  backgrounds with gradient approximations.
- Do not leave resolved architecture decisions only in planning files or
  closure notes.
- Before each commit, run tests and checks for the impacted area.
- In delivery notes, record exact validation commands executed and their
  outcomes.
- Treat every change as potentially cross-module until consumers are checked.
- Do not remove shared code without verifying runtime, test, and doc references.
- When runtime behavior changes, review deployment docs, smoke steps, and rollback notes in the same task.
- Keep planning docs, task board, and project state synchronized.
- Treat docs parity as a release-quality requirement for structural changes:
  update affected architecture, module, route, and index docs in the same task.
- Before reporting that no work is planned, cross-check active canonical queues
  and non-canonical historical checklists separately.
- When publishing a new execution plan, activate `NOW` and `NEXT` in canonical
  queue files in the same turn.
