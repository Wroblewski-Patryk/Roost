# LUC-5612 Stale Blocked App-Completion Spec Record Curation

Date: 2026-06-27
Issue: [LUC-5612](/LUC/issues/LUC-5612)
Stage: verification

## Task Contract

- Goal: reconcile the two stale app-completion blocked records for completed
  Assets and Finance planning specs.
- Task Type: architecture/scanner curation
- Current Stage: verification
- Deliverable For This Stage: scanner metadata correction plus evidence that
  the app-completion blocked count no longer treats completed planning specs
  as active blockers.
- Operation Mode: BUILDER
- Lane model: single-lane; no subagent delegation used because this is a
  tightly scoped scanner/projection metadata correction.

## Scope

Included:

- `docs/architecture/scanner-overrides.json`
- `docs/graphs/architecture-awareness.json`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-proof-register.csv`
- `docs/graphs/architecture-graph.md`
- `docs/graphs/architecture-health.json`
- `docs/status/architecture-awareness-report.md`
- `docs/status/architecture-dependency-report.md`
- `docs/status/architecture-ownership-report.md`
- `docs/status/task-synchronization-report.md`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`

Excluded:

- Product runtime code, schema, migration, tests, protected smoke, production
  mutation, credential access, push, deploy, local server, browser, Docker, or
  provider action.

## Metadata Source

The app-completion index projects `risk: blocked` from architecture-awareness
entity `status: blocked`.

The exact source of the stale status was the architecture-awareness scanner
heuristic in
`C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs`:

```text
if (/(^|\n)\s*(status|state)\s*:\s*blocked\b/i.test(text) || /(^|\n)##?\s+blocked\b/i.test(text)) status = "blocked";
```

Both specs contain a `## Blocked Actions` section. Those sections are safety
guardrails that intentionally block unsafe runtime/provider/money actions; they
are not the status of the planning spec itself.

## Curated Records

| Record | Path | Previous projected status | Curated status | Reason |
| --- | --- | --- | --- | --- |
| `document:cc-08-001-assets-resource-system-spec:9be168cc00` | `docs/planning/cc-08-001-assets-resource-system-spec.md` | `blocked` | `verified` | The spec is complete and downstream Assets read API/UI/preview evidence exists; only unsafe provider actions remain blocked by design. |
| `document:dms-07-001-finance-system-spec:2c4dc94c71` | `docs/planning/dms-07-finance-system-spec.md` | `blocked` | `verified` | The spec is complete and downstream Finance read API/web/proof evidence exists; only invoice/payment/discount/pricing writes remain blocked by design. |

## Implementation

Added two `entityOverrides` entries to
`docs/architecture/scanner-overrides.json`:

- `docs/planning/cc-08-001-assets-resource-system-spec.md` ->
  `status: verified`
- `docs/planning/dms-07-finance-system-spec.md` -> `status: verified`

The override descriptions explicitly preserve the blocked-action safety
sections and only correct the document-level completion status.

## Result Report

Status: `VERIFIED_DONE`.

Verification:

- `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  PASS: generated `2026-06-27T18:33:29.115Z` with `2478` entities,
  `5317` relations, `16029` files, `12` entity overrides applied, and `3`
  relation overrides applied.
- `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  PASS: generated `2026-06-27T18:33:36.798Z` with `866` items, `7` flows,
  `0` browser-review needs, `844` missing test links, `0` missing doc links,
  and `0` blocked records.
- Targeted JSON check PASS: no app-completion item has `risk: blocked` or
  `status: blocked`.
- Targeted architecture-awareness check PASS: both target entities now have
  `status: verified` and evidence links to their task contracts and
  classification packet.
- `npm run architecture:status` PASS: `GREEN`, graph `454/765/35`, evidence
  queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass.
- `git diff --check` PASS with existing LF-to-CRLF warnings only.

The broad `844` missing-test-link debt remains separate confidence debt and is
not changed by this curation.

No product repair child issue is warranted from these two records. Remaining
Assets and Finance risks are protected production proof and future explicit
command contracts for high-risk write actions, not stale app-completion
blocked spec records.
