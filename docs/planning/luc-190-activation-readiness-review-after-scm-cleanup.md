# LUC-190 Activation Readiness Review After SCM Cleanup

Date: 2026-05-26
Issue: `LUC-190` `[Roost][Prep] Activation readiness review after SCM cleanup`
Mode: preparation-only review (no runtime/deploy mutation)

## Goal

Confirm whether Roost preparation gates are satisfied after SCM cleanup so the
first protected proof lane can be opened safely.

## Inputs Reviewed

- `docs/planning/luc-186-legacy-docs-deletion-churn-triage.md`
- `docs/planning/luc-187-canonical-docs-root-and-takeover-handoff.md`
- SCM cleanup commit `c678fa9786c44ac707d7aef4fd22eb9389a47546`
- Current working tree state (`git status --short`)
- Architecture readiness snapshot (`npm run architecture:status`)

## Readiness Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Legacy docs-root churn resolved in dedicated SCM lane | pass | Commit `c678fa9` removed `Roost - docs/**` and kept canonical `docs/**`; commit scope is docs-root cleanup plus `docs/documentation-map.md` pin. |
| Canonical docs root contract is explicit and consistent | pass | `LUC-187` pins repository canonical root to `docs/` and activation handoff contract points to `docs/*` only. |
| Repository is clean after SCM cleanup checkpoint | pass | `git status --short` returned empty output. |
| Architecture evidence runtime remains green after cleanup | pass | `npm run architecture:status` -> `GREEN`, graph `452/761/34`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass `yes`. |
| Prep-only policy still respected (no broad implementation/deploy) | pass | This lane performed read-only review plus state/doc synchronization only. |

## Decision

Activation readiness after SCM cleanup is **GO** for the next gated preparation
step: protected proof replay.

This does **not** activate broad Roost implementation. It authorizes only the
next narrow proof lane already defined in the handoff sequence.

## Approved Next Lane

- Open/execute protected proof replay:
  `LUC-190` follow-up scope (Backend + QA), using approved secrets path and
  existing smoke contract:
  `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<key> npm run aog:deploy-smoke`
- Keep `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=true` disabled unless
  explicit approval is provided for production smoke-user registration.

## Risks And Controls

- Risk: missing runtime key in coordinator environment blocks protected proof.
  - Control: run the command in the approved secure environment only.
- Risk: scope creep from prep lane into implementation lane.
  - Control: keep this issue closed as review-only and hand proof execution to
    Backend/QA ownership.

## Status

- `LUC-190` readiness-review objective: complete.
- Disposition recommendation: `done`.
