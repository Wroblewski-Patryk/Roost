# Code Quality Guardrails

Updated: YYYY-MM-DD

## Purpose

Define which quality exceptions are temporarily intentional and which new debt
is blocked by repository guardrails.

## Hard-Fail Guardrails

Document which CI or pre-commit checks must fail when the following appears:

- newly introduced prohibited patterns in production code
- files exceeding agreed complexity or size thresholds without approval
- missing required quality artifacts for guarded checks
- invalid or stale references in guardrail allowlists

## Temporary Allowlist Policy

Allowlist entries are permitted only when all conditions hold:

1. the issue already exists and is being actively reduced
2. the issue is explicitly inventoried in canonical docs
3. a tracked task exists to remove the exception
4. the allowlist entry is narrow and file-specific, never wildcard-based

## Forbidden Exceptions

- wildcard allowlists by directory or feature
- silent relabeling of new debt as temporary
- adding parallel debt to avoid fixing existing debt
- leaving cross-module duplicate helper seams undocumented

## Review Rule

When a guardrail requires a new allowlist entry, the same change must also:

- update the relevant inventory documentation
- update planning and task-board context
- explain why same-turn cleanup was unsafe or out of scope

## Ownership And Cadence

- Define who owns guardrail maintenance for the active execution wave.
- Define audit cadence (for example weekly, and after large structural
  refactors).
- Store latest guardrail evidence artifacts in `docs/operations/` when the
  repository generates them.
