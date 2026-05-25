# Commit And Task Naming Standard

## Goal

Keep change history searchable, consistent, and easy to trace to roadmap tasks.

## Task ID Format

- Use stable project task IDs, for example `PRJ-001` or the repository's
  configured prefix.
- One logical task per commit where possible.
- If a task needs multiple commits, keep all commits prefixed with the same
  task ID.
- Do not invent a task ID when the repository already has an active planning
  system. Use the existing ID source.

## Commit Message Format

- Preferred: `PRJ-001: short action summary`
- Optional scope when useful: `PRJ-001(api): add account export endpoint`
- Use imperative voice: `add`, `fix`, `harden`, `remove`, `document`.
- Keep the summary concise and specific.

## Pull Request Title

- Prefer the same style as commit messages.
- If a PR contains multiple related tasks, use a shared outcome:
  `PRJ-001/PRJ-002: stabilize export workflow`.

## Prohibited Patterns

- `WIP`, `fix`, `changes`, `update`, or `misc` without context.
- Missing task ID for planned roadmap work.
- Combining unrelated tasks in one commit.
- Referencing a task ID that is not present in the task board or planning docs.

## Agent Rule

Before committing, agents must verify:

- the task ID exists or the user explicitly asked for an untracked maintenance
  commit
- the commit contains one logical concern
- validation commands for the touched area have run or are documented as
  blocked
