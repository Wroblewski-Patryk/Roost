# Outcome 1 owner work surface: local checkpoint, 2026-10-15

The unreleased Today candidate shows current Decisions, Task results and blockers, overdue Tasks and blocked technical incidents with exact links, reason, actor and context. History is separate. An agent-verified information result stays visible until the owner's distinct decision. The Today API is owner-only. Repeat documentation import preserves archived CompanyRecords and components.

## Local evidence

- Focused API tests passed on a disposable PostgreSQL database with all migrations: current/archived attention, unknown provenance, owner-only access and repeat import. The runner removed its test database and role.
- The full company-information native run passed 13/13 subtests with `ROOST_G11_REVIEW_ACTION=agent-local-approve`, including the agent-verifier result awaiting the owner and its Today projection. Its fixture was corrected to use the current null-prompt risk contract; the earlier `P2010` was a test fixture error, not a production finding. The run made no model call and removed its disposable database and role.
- PL/EN mock browser checks passed 83 cases at 390, 720, 834 and 1440 CSS pixels, including keyboard access to exact-record links. Mock screenshots prove component layout and interaction, not signed-in or production behavior.
- Typecheck, server build, web build and `git diff --check` passed before the final rerun. Independent Security and UX source re-reviews found no concrete P0/P1 in the scoped candidate; neither review is production acceptance.

## Provenance and release limit

The 2026-10-15 read-only production inventory confirmed one disposable Task, already `archived`, and no active confirmed test among the inspected Task, Decision and CompanyRecord families. The archived Task remains audit history. Today uses canonical current/terminal status instead of source-name regexes: the known archived test stays out of Today and its counts while actionable business or uncertain-source rows remain visible. Each returned item still states `provenanceConfirmed: false`. This bounded evidence does not classify all company data or complete Outcome 0 or full RF-UX-012; no production record was changed or deleted for it.

Read-only release inventory found remote `main`, the running backend image and public API health aligned at `37f6f219922cf3d3de9e87e422b5054da4ec0430`; PostgreSQL was healthy on its retained container and the VPS had 11 GB free (86% used). No cleanup ran. Backup freshness and retained-image rollback were not rechecked, so this is not a complete release preflight. The candidate starts from the local, unpushed documentation commit `f6378089`, which is ahead of remote `main`; pushing this branch would also release that earlier commit.

Signed-in production PL/EN navigation, deployment and exact-build read-back remain unproved. Decision governance GET currently increments `ready_source_fence` and runs authority invalidation as part of its existing path; opening that modal in production would exceed this gate's read-only smoke authority. The exact Decision link can be checked via its canonical read endpoint and URL, but a production modal-open proof requires a separately safe method or explicit authority for the existing effects. No push, deployment, production company-data write, Worker/model call or deletion occurred at this checkpoint.
