# App Completion Index

Generated: 2026-06-27T22:28:09.462Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.

## Counts

- Items: 902
- User flows: 7
- Needs browser/screenshot review: 0
- Missing test link: 873
- Missing doc link: 0
- Blocked: 0

## Flow Summary

- Subscription and entitlement: 554 entities; risks {"missing_test_link":528,"implemented_needs_proof":22,"ok":4}; gates {"subscription":554,"configuration":18,"auth":4}
- Unclassified user workflow: 195 entities; risks {"missing_test_link":194,"implemented_needs_proof":1}; gates {"auth":5,"configuration":9}
- Account access: 89 entities; risks {"missing_test_link":88,"ok":1}; gates {"auth":89,"configuration":10,"subscription":14}
- User configuration: 54 entities; risks {"missing_test_link":53,"implemented_needs_proof":1}; gates {"configuration":54}
- Dashboard overview: 6 entities; risks {"missing_test_link":6}; gates {}
- Trading operation: 3 entities; risks {"missing_test_link":3}; gates {}
- Exchange connection and configuration: 1 entities; risks {"missing_test_link":1}; gates {"configuration":1}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| Account access | missing_test_link | api_endpoint | USE /auth | Engineering Delivery Lead | src/app.ts#/auth | auth |
| Account access | missing_test_link | api_endpoint | USE /v1/auth | Engineering Delivery Lead | src/app.ts#/v1/auth | auth |
| Account access | missing_test_link | feature_or_capability | Decision Register | Engineering Delivery Lead | .agents/state/decision-register.md | auth |
| Account access | missing_test_link | feature_or_capability | Risk Register | Engineering Delivery Lead | .agents/state/risk-register.md | auth |
| Account access | missing_test_link | feature_or_capability | POST /v1/integration-settings/google_drive/oauth/authorize-url | Docs Memory Lead | docs/architecture/nodes/generated/API-AUTO-0144.md | auth, configuration |
| Account access | missing_test_link | feature_or_capability | POST /v1/integration-settings/google_drive/oauth/exchange | Docs Memory Lead | docs/architecture/nodes/generated/API-AUTO-0145.md | auth, configuration |
| Account access | missing_test_link | feature_or_capability | Authenticated Shell component | Docs Memory Lead | docs/architecture/nodes/generated/COMP-SHELL.md | auth |
| Account access | missing_test_link | feature_or_capability | Google Drive.Auth | Docs Memory Lead | docs/architecture/nodes/generated/INT-AUTO-0008.md | auth |
| Account access | missing_test_link | feature_or_capability | /auth/login | Docs Memory Lead | docs/architecture/nodes/generated/PAGE-AUTO-0003.md | auth |
| Account access | missing_test_link | feature_or_capability | /auth/register | Docs Memory Lead | docs/architecture/nodes/generated/PAGE-AUTO-0004.md | auth |
| Account access | missing_test_link | feature_or_capability | Auth, Workspace, And Integration Plan | Docs Memory Lead | docs/planning/auth-workspace-integration-plan.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | LUC-5084 Authenticated Browser Route Proof | Docs Memory Lead | docs/planning/luc-5084-authenticated-browser-route-proof.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | LUC-5132 Security And AI Authority Evidence Recheck | Docs Memory Lead | docs/planning/luc-5132-security-ai-authority-evidence-recheck.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | LUC-5315 Auth Workspace API-Key Authority Proof Ladder | Docs Memory Lead | docs/planning/luc-5315-auth-workspace-api-key-authority-proof-ladder.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | LUC-5333 Department And Workforce Authority Proof Ladder | Docs Memory Lead | docs/planning/luc-5333-department-workforce-authority-proof-ladder.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | LUC-5561 Auth And Account Access Local Smoke Proof | Docs Memory Lead | docs/planning/luc-5561-auth-account-access-local-smoke-proof.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | LUC-5570 API Auth/Config Route Coverage | Docs Memory Lead | docs/planning/luc-5570-api-auth-config-route-coverage.md | auth, subscription, configuration |
| Account access | missing_test_link | feature_or_capability | LUC-5661 /v1 Auth Alias Parity API Proof | Docs Memory Lead | docs/planning/luc-5661-v1-auth-alias-parity-api-proof.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | REACT-WEB-LAYOUT-001 Authenticated Layout Foundation | Docs Memory Lead | docs/planning/react-web-layout-foundation-task-contract.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | V1 Production Authenticated Parity Task Contract | Docs Memory Lead | docs/planning/v1-production-authenticated-parity-task-contract.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | V1AUTH-001 Owner Auth Redirect Flow | Docs Memory Lead | docs/planning/v1auth-001-owner-auth-redirect-task-contract.md | auth, subscription |
| Account access | missing_test_link | feature_or_capability | Authenticated Shell Layout Audit | Docs Memory Lead | docs/ux/authenticated-shell-layout-audit-2026-05-14.md | auth |
| Account access | missing_test_link | feature_or_capability | migration.sql | Engineering Delivery Lead | prisma/migrations/202605022_workspace_auth/migration.sql | auth |
| Account access | missing_test_link | feature_or_capability | authHeaders | Engineering Delivery Lead | scripts/company-os-lifecycle-trace-smoke.mjs#authHeaders | auth |
| Account access | missing_test_link | feature_or_capability | authHeaders | Engineering Delivery Lead | scripts/operating-model-registry-lifecycle-smoke.mjs#authHeaders | auth |
| Account access | missing_test_link | feature_or_capability | registerOwner | Engineering Delivery Lead | scripts/operating-model-registry-lifecycle-smoke.mjs#registerOwner | auth |
| Account access | missing_test_link | feature_or_capability | src/auth | Engineering Delivery Lead | src/auth | auth |
| Account access | missing_test_link | feature_or_capability | agent-key-profiles.ts | Engineering Delivery Lead | src/auth/agent-key-profiles.ts | auth |
| Account access | missing_test_link | feature_or_capability | findAgentKeyProfile | Engineering Delivery Lead | src/auth/agent-key-profiles.ts#findAgentKeyProfile | auth |
| Account access | missing_test_link | feature_or_capability | api-key.middleware.ts | Engineering Delivery Lead | src/auth/api-key.middleware.ts | auth |
| Account access | missing_test_link | feature_or_capability | bearerToken | Engineering Delivery Lead | src/auth/api-key.middleware.ts#bearerToken | auth |
| Account access | missing_test_link | feature_or_capability | requireAuthContext | Engineering Delivery Lead | src/auth/api-key.middleware.ts#requireAuthContext | auth |
| Account access | missing_test_link | feature_or_capability | api-key.ts | Engineering Delivery Lead | src/auth/api-key.ts | auth |
| Account access | missing_test_link | feature_or_capability | apiKeyPrefix | Engineering Delivery Lead | src/auth/api-key.ts#apiKeyPrefix | auth, configuration |
| Account access | missing_test_link | feature_or_capability | generateApiKey | Engineering Delivery Lead | src/auth/api-key.ts#generateApiKey | auth, configuration |
| Account access | missing_test_link | feature_or_capability | hashApiKey | Engineering Delivery Lead | src/auth/api-key.ts#hashApiKey | auth, configuration |
| Account access | missing_test_link | feature_or_capability | capabilities.ts | Engineering Delivery Lead | src/auth/capabilities.ts | auth |
| Account access | missing_test_link | feature_or_capability | capabilityForRequest | Engineering Delivery Lead | src/auth/capabilities.ts#capabilityForRequest | auth |
| Account access | missing_test_link | feature_or_capability | effectiveCapabilities | Engineering Delivery Lead | src/auth/capabilities.ts#effectiveCapabilities | auth |
| Account access | missing_test_link | feature_or_capability | hasCapability | Engineering Delivery Lead | src/auth/capabilities.ts#hasCapability | auth |
| Account access | missing_test_link | feature_or_capability | normalizedRequestPaths | Engineering Delivery Lead | src/auth/capabilities.ts#normalizedRequestPaths | auth |
| Account access | missing_test_link | feature_or_capability | routePattern | Engineering Delivery Lead | src/auth/capabilities.ts#routePattern | auth |
| Account access | missing_test_link | feature_or_capability | scopesAreBroad | Engineering Delivery Lead | src/auth/capabilities.ts#scopesAreBroad | auth |
| Account access | missing_test_link | feature_or_capability | password.ts | Engineering Delivery Lead | src/auth/password.ts | auth |
| Account access | missing_test_link | feature_or_capability | hashPassword | Engineering Delivery Lead | src/auth/password.ts#hashPassword | auth |
| Account access | missing_test_link | feature_or_capability | verifyPassword | Engineering Delivery Lead | src/auth/password.ts#verifyPassword | auth |
| Account access | missing_test_link | feature_or_capability | token.ts | Engineering Delivery Lead | src/auth/token.ts | auth |
| Account access | missing_test_link | feature_or_capability | base64UrlDecode | Engineering Delivery Lead | src/auth/token.ts#base64UrlDecode | auth |
| Account access | missing_test_link | feature_or_capability | base64UrlEncode | Engineering Delivery Lead | src/auth/token.ts#base64UrlEncode | auth |
| Account access | missing_test_link | feature_or_capability | createAuthToken | Engineering Delivery Lead | src/auth/token.ts#createAuthToken | auth |
| Account access | missing_test_link | feature_or_capability | sign | Engineering Delivery Lead | src/auth/token.ts#sign | auth |
| Account access | missing_test_link | feature_or_capability | verifyAuthToken | Engineering Delivery Lead | src/auth/token.ts#verifyAuthToken | auth |
| Account access | missing_test_link | feature_or_capability | src/features/auth | Engineering Delivery Lead | src/features/auth | auth |
| Account access | missing_test_link | feature_or_capability | google-drive.auth.ts | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts | auth |
| Account access | missing_test_link | feature_or_capability | buildGoogleDriveAuthorizationUrl | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#buildGoogleDriveAuthorizationUrl | auth |
| Account access | missing_test_link | feature_or_capability | exchangeGoogleDriveAuthorizationCode | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#exchangeGoogleDriveAuthorizationCode | auth, configuration |
| Account access | missing_test_link | feature_or_capability | getFreshGoogleDriveOAuthForWorkspace | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#getFreshGoogleDriveOAuthForWorkspace | auth |
| Account access | missing_test_link | feature_or_capability | getGoogleDriveClientForWorkspace | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#getGoogleDriveClientForWorkspace | auth |
| Account access | missing_test_link | feature_or_capability | getGoogleOAuthClient | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#getGoogleOAuthClient | auth |
| Account access | missing_test_link | feature_or_capability | getStoredGoogleDriveSecret | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#getStoredGoogleDriveSecret | auth, configuration |
| Account access | missing_test_link | feature_or_capability | hasFreshAccessToken | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#hasFreshAccessToken | auth |
| Account access | missing_test_link | feature_or_capability | mergeGoogleDriveConfig | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#mergeGoogleDriveConfig | auth, configuration |
| Account access | missing_test_link | feature_or_capability | normalizeTokenResponse | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#normalizeTokenResponse | auth |
| Account access | missing_test_link | feature_or_capability | postGoogleOAuthToken | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#postGoogleOAuthToken | auth |
| Account access | missing_test_link | feature_or_capability | refreshGoogleDriveOAuth | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#refreshGoogleDriveOAuth | auth |
| Account access | missing_test_link | feature_or_capability | parseGoogleDriveOAuthSecret | Engineering Delivery Lead | src/integrations/integration-settings.service.ts#parseGoogleDriveOAuthSecret | auth, configuration |
| Account access | missing_test_link | feature_or_capability | src/modules/auth | Engineering Delivery Lead | src/modules/auth | auth |
| Account access | missing_test_link | feature_or_capability | auth.routes.ts | Engineering Delivery Lead | src/modules/auth/auth.routes.ts | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/company-os/company-os.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/company-os/workflow-definition-drafts.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/intake/intake.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | entityAuthority | Engineering Delivery Lead | src/modules/workforce/workforce.service.ts#entityAuthority | auth |
| Account access | missing_test_link | feature_or_capability | requireUserAuth | Engineering Delivery Lead | src/modules/workspaces/workspaces.routes.ts#requireUserAuth | auth |
| Account access | missing_test_link | feature_or_capability | auth-token.ts | Engineering Delivery Lead | web/src/api/auth-token.ts | auth, subscription |
| Account access | missing_test_link | feature_or_capability | clearOwnerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#clearOwnerToken | auth |
| Account access | missing_test_link | feature_or_capability | isSignedIn | Engineering Delivery Lead | web/src/api/auth-token.ts#isSignedIn | auth |
| Account access | missing_test_link | feature_or_capability | ownerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#ownerToken | auth |
| Account access | missing_test_link | feature_or_capability | setOwnerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#setOwnerToken | auth |
| Account access | missing_test_link | feature_or_capability | client.ts | Engineering Delivery Lead | web/src/api/client.ts | auth, subscription |
| Account access | missing_test_link | feature_or_capability | errors.ts | Engineering Delivery Lead | web/src/api/errors.ts | auth, subscription |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
