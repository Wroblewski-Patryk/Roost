# Repository Bootstrap Usage

This repository uses local, manual bootstrap artifacts.

## Flow

1. Start from this repository bootstrap package.
2. Rename the folder.
3. Do not copy this repository's `.git` directory into the generated app.
4. Open the new project in Codex.
5. Tailor docs, plans, context, and deployment contract through guided setup.
6. Confirm the initial architecture and visual-system contracts before broad
   implementation begins.
7. If the repository has multiple major modules, activate the `docs/modules/`
   starter docs and keep them aligned with architecture.
8. When the project reaches a release-readiness, handoff, incident-review, or
   stalled-queue moment, copy
   `docs/governance/function-coverage-ledger-template.csv` into
   `docs/operations/` as a dated function coverage matrix and use
   `docs/governance/function-coverage-ledger-standard.md` to classify the next
   smallest evidence, fix, blocker, or scope-decision tasks.

## Why Manual Mode

- Fast setup for early-stage projects
- Full flexibility per project without template-update tooling
- Easy human review of every initial decision

## Guardrails

- Keep the repository docs as the canonical baseline.
- Treat `docs/architecture/` as the approved app architecture baseline.
- Use `.agents/workflows/documentation-governance.md` to keep architecture,
  planning, modules, and operations docs from drifting apart.
- If the project has a reusable UI layer, document its shared style rules in
  `docs/ux/` early.
- For UI-heavy products, fill `docs/ux/visual-direction-brief.md` before broad
  frontend expansion and use the UX starter docs during review.
- Do not skip the bootstrap checklist.
- Keep changes small and auditable in each new repo.
- Keep template Git history separate from app Git history.
- Keep subagent rules aligned with
  `docs/governance/subagent-delegation-policy.md`.
- Keep repository layout aligned with
  `docs/governance/repository-structure-policy.md`.
- Treat the function coverage ledger as optional until the project has enough
  module surface area that ad-hoc "test everything" loops stop being useful.

## App-Building Addendum

- Start broad app creation from `docs/governance/app-creation-playbook.md`, not ad hoc scaffolding.
- Use `docs/governance/user-feedback-loop.md` to preserve user notes and priority changes.
- Use `.codex/templates/handoff-packet-template.md` for substantial or multi-session closeout.
