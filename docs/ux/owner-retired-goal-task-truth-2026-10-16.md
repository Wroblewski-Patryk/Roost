# Retired Goal Task truth — 2026-10-16

## Authorized correction

One retired Goal and mandate left a provider-owned `todo` Task with a preserved failed Worker attempt. Today still treated that attempt as current attention, while the direct Task opened a blank Goal chooser and offered Ready/authorization controls. The owner authorized one bounded Outcome 0/1 correction: keep Task, execution, audit and provider status; remove obsolete Today attention; expose the historical Goal, retired mandate and stopped attempt to the owner without a new execution path. This does not resume G24c/G25 or complete RF-OUT-001/002 or RF-UX-012 as a whole.

## Implemented read and interface contract

- Today excludes result, blocker and overdue rows only for Tasks whose Goal is archived **and** has a retired mandate version. Other active attention remains eligible. A saved Today result link explains Goal retirement and opens the preserved Task history; a changed execution keeps its separate stale-link state.
- The owner Task projection reports the archived Goal and retired mandate version. The direct Task panel labels the provider-owned status, no current mandate and stopped execution, retains the earlier result and timeline, and removes Ready, authorization, launch, continuation and current review controls. The board preview labels the Worker result as history and links to the exact Goal in Strategy History.
- The archived Goal relation is hidden from nonowner Task projections. Agent context still excludes the retired Goal, while the existing Ready/queue/database guards continue to refuse new execution. The owner History deep link opens the exact archived Goal; it grants no history access to other roles.
- No migration or production business-data mutation is part of this correction.

## Verification checkpoint

The disposable PostgreSQL Goal-retirement HTTP journey applied the migration chain and passed Task status/history, Today suppression of the linked overdue row, preservation of an unrelated active blocker, owner-only archived Goal projection, cross-workspace refusal and Ready execution refusal. A separate native company-information journey created a real runtime-class failed result, confirmed its Today attention before retirement, retired the linked Goal through the owner command, and confirmed that only its current attention disappeared while the Task, failed execution and historical work item remained. No model/provider was invoked. Production read-only verification must inspect the exact retired result and any unrelated active failed result.

PL/EN browser checks at 390/1440 CSS pixels cover the saved Today link, direct historical Task, board preview, historical Goal link, action absence, overflow and keyboard return. Independent Security review found and prompted fixes to an overbroad Today exclusion and archived Goal disclosure to nonowner Task readers. Independent UX review prompted retirement-specific stale-link copy and historical Goal navigation. The full Task browser suite passed 94 checks. `npm run validate`, `npm run codex:check` and `git diff --check` passed.

Before release, remote `main`, running backend image and public health matched `12b58bf7`; PostgreSQL was healthy on its retained named volume with 159 finished migrations and no unresolved row. The previous backend image was retained. Read-only SQL confirmed the exact retired Goal, no mandate head, retired v1, linked provider Task `todo` with `needs_revalidation`, and one retained failed execution. A fresh encrypted backup captured 286,584,599 archive bytes and passed isolated restore and prerequisite read-back at 13:38 UTC; its receipt is private outside the repository. The temporary restore database and backup lock were absent; the same backend and public health remained available. VPS root had 13,959,077,888 bytes free after backup, above the prior release planning allowance. Deployment and signed-in production read-back are pending.

Applicable clauses: RF-OUT-001/002, RF-UX-012, RF-CTX-027 and the existing Goal governance and authority rules. Wider acceptance remains open.
