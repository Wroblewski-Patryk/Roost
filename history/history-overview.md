# History Overview

Last updated: YYYY-MM-DD

## Purpose

`history/` stores what happened before.

It preserves task records, audits, evidence, old plans, release packets, and raw
artifacts without polluting current source-of-truth docs.

## Folders

| Folder | Use |
| --- | --- |
| `history/tasks/` | Completed task contracts and handoffs. |
| `history/plans/` | Old plans, closure notes, and superseded sequencing. |
| `history/audits/` | Audits, scans, review packets, and findings. |
| `history/evidence/` | Human-readable validation proof. |
| `history/releases/` | Release gates, deploy notes, and sign-offs. |
| `history/artifacts/` | Raw generated output, JSON, screenshots indexes, machine reports. |

## Promotion Rule

Historical files can support a current claim, but they do not own current
truth. If old evidence still matters:

1. summarize the current truth in the owning `docs/` file;
2. link to the historical evidence;
3. update graph, pipeline, module, or ledger rows with the evidence path.

## Naming

Use searchable names with ISO dates:

```text
<topic>-<YYYY-MM-DD>-task.md
<topic>-<YYYY-MM-DD>-audit.md
<topic>-<YYYY-MM-DD>-evidence.md
<release>-<YYYY-MM-DD>.md
```
