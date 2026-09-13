# Decisions

Last updated: 2026-09-13

## Purpose

Keep durable product, architecture, UX, security, and operations decisions in
one place.

Planning notes may propose decisions, but accepted decisions belong here or in
an owning canonical doc linked from here.

## Files

| File | Purpose |
| --- | --- |
| `decision-register.csv` | Index of decisions and current status. |
| `ADR-000-template.md` | Template for architecture decision records. |
| [ADR-001](ADR-001-direct-codex-app-server-pilot.md) | Accepted v1: direct Worker–Codex App Server pilot target; Hermes optional, execution remains blocked. |
| [ADR-002](ADR-002-codex-qualification-owner-decisions.md) | Accepted I01 owner decisions: technical task sizing, official local Codex account policy and later bounded evidence work; technical gates stay closed. |

## Status Vocabulary

- `proposed`
- `accepted`
- `rejected`
- `superseded`
- `needs_review`

## Rule

If a change would alter architecture, data ownership, deployment topology,
security posture, release scope, or product promise, create or update a
decision record before implementation.
