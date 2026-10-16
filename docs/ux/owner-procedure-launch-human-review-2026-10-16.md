# Procedure launch and manual Task review — G0

## Authorized outcome

The owner already approved and performed one real production Procedure run. This gate repairs its owner-console path: a launch preview with three inputs must confirm despite different JSON key order, with one launch request and explicit stale/expired/error states. A manual or human-review Task must lead to its exact Procedure run and owner assessment, while its status remains editable. The existing signed preview token, stale check and request-id replay contract stay authoritative. This gate does not create a second production run or Task, execute an agent, change company records for a smoke, or advance G24c/G25.

## Baseline and implementation

- Before this repair, the launch panel compared `JSON.stringify` of input maps. A server-canonicalized key order could make a valid preview appear unchanged on screen yet silently prevent confirmation. The direct Task link opened generic agent Ready for a manual step.
- The client now compares input keys and values without relying on object order. An invalid confirmation gives a visible stale notice and removes the preview. The server preview and launch routes, signed token and idempotent request handling are unchanged.
- The owner-only Task read projects its pinned manual or human-review run step. The owner console reads the exact run again and checks run, Procedure, version, step, Task, order, executor and status before offering run/assessment navigation. The work board and direct Task link use the same manual path; a separate exact status link opens the Task editor without agent Ready.
- The Procedure view accepts validated exact Procedure/run links and focuses the requested run. No new write route, migration, recurring seed or data cleanup was added.

## Verification checkpoint

- PL/EN browser fixture: launch preview across 390/1440 px, three input fields entered in a different order, eligible/blocked/stale/expired/server-error outcomes, one POST, keyboard confirmation and focus: 20 cases passed.
- PL/EN read-only Task preview: 390/1440 px, exact run/stale/404/transient error with explicit retry and Escape: 16 cases passed.
- PL/EN route fixture: 390/1440 px, direct Task link, work board, Calendar, department scope and exact status editor, with no agent Ready action or write; Close/Escape restores the originating view and focus: 20 cases passed.
- The native API case `RF-CTX-029 native procedure launch is scoped, atomic, idempotent and traceable` passed 1/1 on the disposable local PostgreSQL database. It includes exact Task→run projection, non-owner and foreign-workspace refusal, and exact status-editor packet selection. The runner returned the previously stopped Roost PostgreSQL container to stopped state. `npm run validate`, `npm run codex:check` and `git diff --check` passed.
- Independent Security review found no concrete authorization, workspace-scope or token/idempotency bypass in the inspected diff, including the exact Task filter. Independent UX review found the board-path Ready action, raw English status values, missing retry and loss of Calendar/department origin on Close; all were repaired, and the reviewer reran the affected browser fixture without a remaining concrete issue. The browser API responses are synthetic; signed-in deployed behavior remains unverified.

## Release boundary

Fresh VPS capacity read (2026-10-16): root free space was 11,359,617,024 bytes; the established release planning allowance is 12,884,901,888 bytes. Docker reported about 1.251 GB reclaimable unused build cache. Even complete recovery of that cache would leave the host below the planning allowance before backup or build. The current Roost backend still ran source `7e3546ca99e18409d78e29a4d39b89a18bd04342`, its PostgreSQL container was healthy, and nine backend images including current remained available. No cache prune, image/container/volume cleanup, backup, push or deploy was performed. Release is blocked on additional safe capacity; another preflight and verified backup are required after capacity changes. Signed-in deployed read-back remains pending. Do not create another production business record for proof.
