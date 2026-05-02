# World-Class Delivery Workflow

## Objective

Keep every meaningful change tied to customer value, reliability, security,
operability, and measurable learning.

This workflow is intentionally lightweight. Use it as a lens, not as a
ceremony.

## Delivery Loop

1. Problem validation
   - Who is affected?
   - What user or operator pain is being solved?
   - What evidence supports doing this now?
2. Solution validation
   - What is the smallest useful slice?
   - What existing architecture, pattern, or contract should be reused?
   - What could make this unsafe, confusing, unreliable, or hard to operate?
3. Build
   - Keep changes small, reversible, and behind approved boundaries.
   - Prefer real vertical slices over mock-only scaffolding.
   - Add tests and observability with the implementation when risk warrants it.
4. Verify
   - Prove acceptance criteria.
   - Prove negative paths and recovery for risky flows.
   - Prove UI quality with browser evidence when UX is affected.
5. Launch
   - Record deploy target, smoke checks, rollback path, and runtime health.
   - Use feature flags or staged rollout when blast radius is meaningful.
6. Improve
   - Compare actual behavior against success signals.
   - Capture follow-up work from user feedback, incidents, metrics, and review.

## Quality Signals

Use these signals when the task scope is large enough:

- Product: user problem, success metric, adoption or workflow outcome.
- Delivery: lead time, deployment frequency, change failure rate, failed
  deployment recovery time, rework rate.
- Reliability: SLI, SLO, error budget posture, alert route, rollback path.
- Security: threat model, abuse cases, secret handling, data ownership,
  permission boundaries.
- UX: primary action clarity, accessibility, responsive evidence, canonical
  visual parity when applicable.
- Operability: logs, health checks, dashboards, runbook, smoke path.

## Agent Rule

Do not add all of these fields to every tiny task. Add the fields that match
the risk and blast radius, then explain why omitted gates are not applicable.
