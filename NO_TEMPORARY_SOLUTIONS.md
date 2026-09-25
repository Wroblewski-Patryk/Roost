# No Temporary Solutions

Production work must use the correct architecture path. Temporary fixes are not
allowed to pass review.

## Rules

- No placeholders.
- No fake data in delivered behavior.
- No temporary fixes.
- No "for now" implementations.
- No parallel bypass of an existing system.
- No hidden fallback that changes business behavior silently.
- No local-only behavior presented as production-ready.

## Missing Production Path

When the proper implementation is missing, treat the endpoint, schema,
adapter, migration, test or reversible architecture correction as work inside
the current outcome. Implement the correct path, verify it and continue. Do not
ship a workaround or ask the owner to choose an ordinary technical detail.

Pause only for a true owner dependency defined in `docs/implementation.md`.
Before pausing, complete independent preparation, preserve recoverable state,
describe the exact blocked action and ask one concrete question.

## Review Rule

Any task containing a temporary solution must be marked `CHANGES_REQUIRED` or
`BLOCKED`, never `DONE`.
