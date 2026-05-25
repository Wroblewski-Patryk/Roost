# Architecture Map Status

Last updated: YYYY-MM-DD

## Purpose

Track whether architecture maps, graph registries, chains, modules, and
pipeline docs are current enough to guide implementation.

## Status

| Area | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Architecture docs | seed | Template files exist. | Replace sample content with project truth. |
| Graph registry | seed | CSV headers and sample rows exist. | Backfill real nodes and chains. |
| Pipelines | seed | Pipeline registry exists. | Add real flows. |
| History separation | seed | `history/` folders exist. | Move old work records out of current docs. |

## Rule

If an agent cannot find the affected function chain or module owner within a
few minutes, treat that as a documentation/graph gap and create a repair task.
