# Integration Checklist

Use this checklist before marking any integrated feature complete.

## Required Checks

- [ ] Frontend or client uses the real API, SDK, storage layer, or service path.
- [ ] No mocks, fixture-only paths, placeholders, or hardcoded production-like
  data remain in the delivered behavior.
- [ ] Endpoints exist and match the client usage exactly.
- [ ] Request and response shapes match documented contracts.
- [ ] Database schema matches the code that reads and writes it.
- [ ] Required migrations exist, run cleanly, and are applied in the target
  environment.
- [ ] Validation exists at the boundary that owns the data.
- [ ] Loading states are handled.
- [ ] Empty states are handled.
- [ ] Error states are handled.
- [ ] Retry, idempotency, or fail-closed behavior is covered where relevant.
- [ ] Feature works after refresh, restart, or reload.
- [ ] No regression is introduced in adjacent flows.
- [ ] Logs and errors do not leak secrets or private data.
- [ ] Architecture evidence registry and proofs are refreshed and pass the
  evidence gate with zero actionable items.
- [ ] Function-chain coverage passes for all features with API routes.

## Vertical Slice Rule

Feature work must be delivered as a vertical slice:

`UI -> logic -> API -> DB -> validation -> error handling -> test`

Partial implementations are forbidden unless the task is explicitly scoped as
analysis, design, or an approved non-runtime documentation change.

## Continuation and Stop Conditions

A missing endpoint, schema, adapter, reproducible check or reversible
architecture choice is implementation work. Add or repair the proper production
path, validate it and continue within the current outcome. Never add a mock or
placeholder merely to make the feature appear complete.

Stop for owner input only for a true owner dependency defined in
`docs/implementation.md`: an unavailable login/2FA/secret, an unapproved
irreversible action against real data or an external account, a genuine
contradiction in accepted business intent, or an unavailable external service
without a safe technical alternative. Complete all independent preparation
before asking one concrete question.
