# Anti-Regression System

Last updated: YYYY-MM-DD

## Purpose

This system prevents autonomous iterations from improving one area while
silently breaking another. Use it before and after every code change, and use a
concise version for docs-only changes.

## Mandatory Checks

Every meaningful change must answer:

- Impact: what user journey, runtime flow, API route, module, DB model, worker,
  UI route, or doc source-of-truth can this affect?
- Dependencies: which shared helpers, schemas, translation keys, generated
  clients, migrations, env vars, and queues depend on it?
- Flow: does the whole flow still work from UI to API to service to DB or
  worker and back?
- Backend/frontend parity: do API response shapes, web types, labels, and
  rendering semantics match?
- States: are loading, empty, error, success, disabled, and stale data states
  handled?
- UI consistency: does the change reuse shared design patterns and avoid
  developer-looking UI?
- Responsiveness: does the UI work on desktop, tablet, mobile, pointer, touch,
  and keyboard where relevant?
- Type safety: do TypeScript, validation, and schema contracts prove the shape?
- Dead code: did the change leave unused branches, stale tests, old helpers, or
  unreachable paths?
- Duplication: did it duplicate domain logic, label mappings, formatting,
  runtime decisions, or API/client contracts?

## Risk Classification

Use the highest applicable risk:

- P0: auth, secrets, payments, money movement, production health, data loss,
  safety-critical AI, or irreversible user action
- P1: backend/frontend contract, runtime state, DB schema, critical UX journey,
  permissions, or integrations
- P2: localized UI, styling, docs, tests, maintainability, low-risk refactor

P0 and P1 changes require stronger validation and explicit fail-closed review.

## Regression Hunt Procedure

1. Identify the canonical contract.
2. Search for all consumers of the changed surface.
3. Compare current implementation to the contract.
4. Add or update focused tests for any bug or future drift risk.
5. Run the strongest relevant validation pack.
6. Record unresolved risks in `.agents/state/regression-log.md`.

## Backend/API Regression Traps

- API read models must not hide truth required by operator or user surfaces.
- Money-impacting actions must use canonical ownership and permission checks.
- Auth and role checks must fail closed.
- Data writes must not rely on UI-only validation.
- Readiness must include critical dependencies required by the actual runtime.

## Frontend/UI Regression Traps

- Do not show raw backend enum strings unless the contract says so.
- Route-owned copy should stay near the route unless a shared helper is the
  approved source.
- Loading, empty, error, success, blocked, and disabled states must be explicit.
- Avoid extra badges, labels, panels, or debug text that make the UI feel like
  developer tooling.
- Do not invent fallback values where absence is meaningful.
- Do not introduce local style inventions when a shared UI pattern exists.

## Documentation Regression Traps

- Architecture truth belongs in `docs/architecture/`.
- Flow truth belongs in `docs/pipelines/` and `docs/flows/` when those folders
  are enabled.
- API/client contract truth belongs in `docs/contracts/`, architecture
  reference docs, or module docs.
- Testing strategy truth belongs in `docs/testing/` and
  `docs/engineering/testing.md`.
- Planning docs must not become permanent architecture truth.
