# Outcome 0 architecture current/history slice, 2026-10-15

This bounded slice removes archived `ApplicationArchitectureComponent` rows from the current application graph. The existing workspace-scoped owner application detail still returns each component with its ID and status. The owner Architecture view separates non-archived current components from archived history; a focused application graph links to that history through a validated exact-application deep link. This changes no stored component status, migration or production company record.

## Verification

- A native HTTP test on a disposable PostgreSQL database applied all 156 migrations and passed 1/1. The empty graph stayed empty, an active component appeared in the current graph, an archived component did not appear anywhere in its packet, and the owner detail retained both IDs and statuses. A foreign workspace received 404 for graph and detail; an unauthenticated graph request received 401. The runner cleaned up its database and role.
- Focused graph and owner-navigation unit tests passed 17/17. The navigation contract preserves only an exact UUID with `cockpit=architecture&architecture=history` through sign-in and rejects duplicate or unsupported history parameters.
- Browser fixtures mounting the real graph and owner routes with mocked API responses passed 20/20 PL/EN scenarios at 390 and 1440 CSS pixels: populated, long text, empty and error states, current/history switching, and graph-to-history navigation. These fixtures prove UI behavior against mock responses, not a signed-in production session.
- `npm run validate`, `npm run codex:check` and `git diff --check` passed. Independent Security/UX review found no remaining concrete scoped blocker after accessibility, text wrapping and error-recovery repairs. It did not accept the wider product outcome.

## Release and limits

Commit `801c1ddcca6150c2877295788137a05306fd4a3a` was fast-forward pushed to `main`. The standard Coolify rollout was read back through both public health routes: each returned `ok` with that exact build commit. The public root and login routes returned 200; an unauthenticated application graph request returned 401. The read-only browser session showed the public page but had no owner login, so signed-in production current/history navigation was not observed. No archived production component was created or changed solely for proof, and a positive archived production graph/history comparison remains unobserved.

This is the architecture archive slice of Outcome 0. It does not classify or clean other company records, complete the full owner-console journey under RF-UX-010/RF-UX-012, or authorize a following gate.

The subsequent documentation-only build `451d2577432928450a46f6ae6cc956e901c0d09b` was read back on both public health routes. It adds no signed-in history observation: the production current/history journey and a positive archived-record comparison remain unproved. A later read-only resource check found 5.2 GB free on the VPS (93% used); current backup freshness and retained-image rollback were not confirmed. No further release follows from this documentation handoff.
