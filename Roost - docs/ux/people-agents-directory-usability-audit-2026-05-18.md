# People/Agents Directory Usability Audit

Date: 2026-05-18

## Scope

Reviewed `06 People & Agents -> Directory` after the Paperclip director import
slice. The audit focused on whether the screen works as a daily workforce
management tool for humans and AI agents.

## Findings

| ID | Severity | Finding | Impact | Fix |
| --- | --- | --- | --- | --- |
| PA-DIR-UX-001 | P1 | The inspector selected the first visible record automatically. | The view felt noisy and unclear because details were always open even when the user had not chosen a person or agent. | Make preview explicit. Show the detail panel only after `Preview` is clicked. |
| PA-DIR-UX-002 | P1 | Row/card actions were not local to the record. | Managing a specific person or agent required selecting first and using global actions, which is slower and less legible. | Add per-record `Preview`, `Edit`, `Archive`, and `Delete` icon actions. |
| PA-DIR-UX-003 | P1 | Archive and delete had the same backend meaning. | The UI could not safely offer both lifecycle archive and permanent removal. | Keep `DELETE /v1/workforce/:id` as archive and add explicit `POST /v1/workforce/:id/actions/delete` for guarded hard delete. |
| PA-DIR-UX-004 | P1 | Seeded human identity could display as `Local owner`. | The roster presented a fake human record instead of the real owner profile. | Seed the owner as Patryk Wroblewski with an INTJ-aligned Big Five profile and owner/operator indexes. |
| PA-DIR-UX-005 | P2 | The list/card presentation still mixed scanning data with management actions. | Dense data became harder to parse as more fields were added. | Keep metadata compact, reserve badges for status, and place actions in a fixed right-side action group. |

## Implementation Principles

- The roster is the primary work surface.
- The inspector is a deliberate preview, not the default state.
- Actions live beside the record they affect.
- Archive is reversible lifecycle state; delete is permanent and must be a
  separate guarded command.
- User-backed human records can be edited or archived through workforce
  lifecycle, but cannot be hard-deleted from the workforce UI because that
  would imply deleting identity/auth state.

## Verification Plan

- Build server and web.
- Run route/capability validation.
- Run API local integration tests.
- Run seed smoke to verify owner identity and 13 Paperclip directors.
- Render desktop, tablet, and mobile Directory proof with explicit preview and
  no horizontal overflow.
