# Owner Goal retirement correction — 2026-10-16

## Authorized outcome

The owner authorized one exact historical test Goal to leave Current Strategy without being marked achieved. Its adopted mandate, linked Task, past execution and audit remain traceable. The linked external Task's status is not changed. The retired Goal and mandate must no longer authorize Ready or agent execution. This correction does not resume the stopped G24c/G25 work or complete the wider Goal and owner-console requirements.

## Implemented contract

- The owner sees the exact Goal, current mandate version, linked Tasks and statuses, targets, child Goals, measurements, historical executions and blockers before acting. The preview expires after five minutes and is bound to owner, workspace, Goal and a digest of the inspected state.
- A separate owner password proof and a reason are required to retire. The atomic command checks the preview again, removes the current mandate head, marks its adopted version `retired`, archives the Goal, and writes one audit record and event. A repeated identical request returns its recorded result; a changed request ID/body or changed inspected state refuses.
- The migration is additive and does not delete a Task, mandate version or execution. It blocks new Ready, execution, mandate head, Goal reactivation and Task relinking for a retired Goal. Deleting the head invalidates any existing Ready pin linked to that Goal.
- Current Strategy excludes archived Goals; owner History exposes them and their version and execution records. Ordinary agent/task contexts and current work projections omit the retired Goal's content. The owner can inspect its History.

## Verification and limits

The focused disposable PostgreSQL HTTP test applied the full migration chain and passed the owner preview/proof/retire/read-back journey, stale preview and replay refusal, historical links, unchanged linked Task status, Current/History separation, API and database execution/Ready/relink guards, and the event/audit record. The integrated PL/EN retirement browser journey passed at 390 and 1440 CSS pixels with preview-before-proof, owner proof, Current-to-History navigation and focus return. The existing PL/EN Goal mandate browser journey, `npm run validate`, `npm run codex:check` and `git diff --check` passed. Exact release preflight, signed-in deployed owner journey and production read-back are pending at this local checkpoint. No production business data was changed by these tests.

RF-OUT-003, RF-OUT-007, RF-GOV-001/002, RF-CTX-006/018/027 and RF-UX-012 are applicable. This bounded correction does not assert their whole-product acceptance.
