# LUC-5984 Auth/Subscription/Configuration Authority Risk Review

Date: 2026-06-28

## Task Contract

- Task Type: Security/privacy risk review
- Current Stage: verification
- Deliverable For This Stage: local read-only authority risk classification after [LUC-5980](/LUC/issues/LUC-5980)
- Goal: classify auth, subscription/entitlement, configuration, API-key, and integration-secret risk before further proof or release claims.
- Scope: `src/app.ts`, `src/auth/*`, `src/modules/auth/auth.routes.ts`, `src/modules/api-keys/api-keys.routes.ts`, `src/modules/integration-settings/integration-settings.routes.ts`, `src/integrations/integration-settings.service.ts`, `src/integrations/secrets.ts`, `src/integrations/google-drive/google-drive.auth.ts`, `src/modules/finance/finance.routes.ts`, `src/tests/api.test.ts`, `docs/security/security-baseline.md`, and `docs/security/secure-development-lifecycle.md`.
- Exclusions: protected account access, production smoke, deploy, restart, live provider mutation, credential access, secret disclosure, code changes, schema changes, or broad test authoring.

## Parent Context

Paperclip heartbeat context for [LUC-5984](/LUC/issues/LUC-5984) reports parent [LUC-5980](/LUC/issues/LUC-5980) as done. Parent evidence surfaced:

- Subscription and entitlement: `670` entities.
- Configuration: `18` gates.
- Auth: `4` gates.
- Account access: `89` entities with auth gate and `88` missing test links.
- User configuration: `54` entities with configuration gate and `52` missing test links.

## Risk Classification

| Area | Disposition | Classification | Evidence | Required before release/protected smoke |
|---|---|---|---|---|
| Auth/session | PASS with proof debt | QA-proof/linkage debt, not security-blocking from this read-only review | `/auth` and `/v1/auth` mount only `authRouter`; protected routes are mounted after `requireApiKey`; bearer tokens are HMAC-signed, expire, and require workspace membership. Existing tests cover `/v1/auth` alias register/login/me, wrong-password denial, and invalid bearer denial. | Keep fail-closed tests for missing auth, invalid bearer, expired token, and user removed from workspace. Add explicit expired-token regression if not already covered by current test suite. |
| API-key authority | PASS with residual legacy risk | Acceptable deferred risk for legacy plaintext key fallback; no release block if legacy rows are migrated/monitored | New keys are generated with random material, stored as HMAC hashes, return raw key only at creation, expose only `keyPrefix` afterward, and owner-only endpoints prevent service keys from minting keys. Capability middleware maps requests to manifest capabilities and denies missing scopes. Tests cover service-key denial for key/workspace management, broad-scope confirmation, scoped finance/sales/operations denial, and read-only MCP manifest filtering. | Before release, verify production/seeded keys have `keyHash` populated or record an explicit migration exception for any legacy plaintext-only rows. Keep inactive-key and missing-capability denial tests. |
| Subscription/entitlement / finance | PASS as read-only | QA-proof/linkage debt, not a security blocker | Current concrete money-facing surface is `GET /v1/finance/context`, not a writeable subscription/billing API. It returns read-only pricing/finance context, marks finance actions blocked, and tests assert unauthenticated denial, workspace isolation, no mutation on read, and `finance:read` capability enforcement. | Any future checkout, subscription activation, invoice, payment, discount, entitlement-write, or plan-change endpoint must get a new security review with owner-confirmed fail-closed tests before protected smoke. |
| User/provider configuration | DEFER non-blocking | Backend-test debt for exact service-key capability boundaries; no blocking bug found in route inspection | Integration settings are workspace-scoped. Owner-only checks protect OAuth authorize/exchange, ClickUp discovery, webhook reconcile/delete, provider event retry, and folder discovery. Capability manifest gates service-key access to provider read/import/reconcile/maintenance routes. Tests cover Google Drive OAuth secret redaction, service denial for OAuth authorize-url, ClickUp safe provider errors, and provider import/reconcile behavior. | Add or keep narrow tests that a service key with only read scopes cannot `PUT /v1/integration-settings/:provider`, cannot run OAuth exchange, and cannot mutate webhook lifecycle. |
| Integration secrets | PASS with deployment gate | Acceptable if production secret gates are honored; not security-blocking locally | Provider secrets are encrypted with AES-256-GCM using `INTEGRATION_SECRET_KEY`, decrypted only inside backend services, and safe API responses return status booleans instead of tokens. Production config fails startup when `AUTH_TOKEN_SECRET`, `INTEGRATION_SECRET_KEY`, or `API_KEY_HASH_SECRET` is missing or uses known development placeholders. | Before protected smoke, confirm production env values exist, are non-placeholder, and are stable across redeploys. Do not expose secret values in proof artifacts. |

## Abuse Cases Checked

- Unauthenticated clients reaching protected business routes: mitigated by centralized `requireApiKey` before protected route mounts.
- Service API key creating replacement credentials: mitigated by owner-only API-key routes.
- Scoped service key reading finance/sales/operations without scope: covered by tests.
- Workspace A reading Workspace B finance/configuration data: finance and integration queries use `req.auth.workspaceId`; tests cover finance foreign workspace non-leakage.
- Provider token disclosure through settings APIs: settings response uses `secretConfigured`, `oauthClientConfigured`, and `oauthTokenConfigured`; tests assert no raw token/OAuth object in response.
- Production placeholder secrets: `env.ts` fails production startup on missing or known development placeholder values.

## Residual Risk

1. Legacy plaintext API-key fallback remains a transition risk until production data is proven migrated to `keyHash`.
2. Aggregate app-completion missing-test counts remain broad proof-link debt and should not be converted into duplicate security implementation without a concrete unverified runtime row.
3. OAuth redirect URI allowlisting is delegated to provider/client configuration; route schema validates URL shape but does not enforce Roost-domain allowlist locally.
4. Future money/subscription write behavior is not approved by this review. The current pass applies only to read-only finance/subscription context.

## Validation

- Read Paperclip heartbeat context for [LUC-5984](/LUC/issues/LUC-5984).
- Reviewed local source and security docs listed in scope.
- Ran targeted `rg` and file readbacks; no server, browser, database, Docker, provider, protected smoke, deploy, restart, credential, or secret access was performed.
- No code changes were made.

## Result Report

Security disposition: PASS/DEFER, not BLOCKED.

No immediate security-owned child issue is required from this read-only review. The next owner is QA/Engineering if release planning wants the listed narrow fail-closed tests refreshed, and Ops/Release if protected smoke needs production secret/key-hash evidence.
