# App Completion Index

Generated: 2026-07-02T16:50:11.927Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.

## Counts

- Items: 1237
- User flows: 5
- Needs browser/screenshot review: 0
- Missing test link: 1201
- Missing doc link: 20
- Implemented, needs proof: 11
- Blocked: 0
- Known non-ok risk items: 1232
- Priority review items indexed: 200/1232
- Priority review truncated: true

## Flow Summary

- Unclassified user workflow: 1090 entities; risks {"missing_test_link":1062,"ok":2,"implemented_needs_proof":8,"missing_doc_link":18}; gates {"configuration":7,"auth":1}
- Account access: 70 entities; risks {"ok":3,"missing_test_link":65,"implemented_needs_proof":2}; gates {"auth":70,"configuration":9,"subscription":2}
- Dashboard overview: 34 entities; risks {"missing_test_link":34}; gates {"configuration":7}
- User configuration: 33 entities; risks {"missing_test_link":31,"missing_doc_link":2}; gates {"configuration":31}
- Trading operation: 10 entities; risks {"missing_test_link":9,"implemented_needs_proof":1}; gates {}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
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
| Account access | implemented_needs_proof | feature_or_capability | integration-settings.service.ts | Engineering Delivery Lead | src/integrations/integration-settings.service.ts | auth, subscription, configuration |
| Account access | missing_test_link | feature_or_capability | parseGoogleDriveOAuthSecret | Engineering Delivery Lead | src/integrations/integration-settings.service.ts#parseGoogleDriveOAuthSecret | auth, configuration |
| Account access | implemented_needs_proof | feature_or_capability | secrets.ts | Engineering Delivery Lead | src/integrations/secrets.ts | auth, subscription, configuration |
| Account access | missing_test_link | feature_or_capability | src/modules/auth | Engineering Delivery Lead | src/modules/auth | auth |
| Account access | missing_test_link | feature_or_capability | auth.routes.ts | Engineering Delivery Lead | src/modules/auth/auth.routes.ts | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/company-os/company-os.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/company-os/workflow-definition-drafts.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/intake/intake.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | entityAuthority | Engineering Delivery Lead | src/modules/workforce/workforce.service.ts#entityAuthority | auth |
| Account access | missing_test_link | feature_or_capability | requireUserAuth | Engineering Delivery Lead | src/modules/workspaces/workspaces.routes.ts#requireUserAuth | auth |
| Account access | missing_test_link | feature_or_capability | auth-token.ts | Engineering Delivery Lead | web/src/api/auth-token.ts | auth |
| Account access | missing_test_link | feature_or_capability | clearOwnerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#clearOwnerToken | auth |
| Account access | missing_test_link | feature_or_capability | isSignedIn | Engineering Delivery Lead | web/src/api/auth-token.ts#isSignedIn | auth |
| Account access | missing_test_link | feature_or_capability | ownerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#ownerToken | auth |
| Account access | missing_test_link | feature_or_capability | setOwnerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#setOwnerToken | auth |
| Account access | missing_test_link | feature_or_capability | client.ts | Engineering Delivery Lead | web/src/api/client.ts | auth |
| Account access | missing_test_link | feature_or_capability | errors.ts | Engineering Delivery Lead | web/src/api/errors.ts | auth |
| Account access | missing_test_link | feature_or_capability | canonicalPostAuthPath | Engineering Delivery Lead | web/src/app-route-registry.ts#canonicalPostAuthPath | auth |
| Account access | missing_test_link | feature_or_capability | auth-pages.tsx | Engineering Delivery Lead | web/src/features/auth/auth-pages.tsx | auth |
| Account access | missing_test_link | feature_or_capability | AuthRoute | Engineering Delivery Lead | web/src/features/auth/auth-pages.tsx#AuthRoute | auth |
| Account access | missing_test_link | feature_or_capability | onSubmit | Engineering Delivery Lead | web/src/features/auth/auth-pages.tsx#onSubmit | auth |
| Account access | missing_test_link | feature_or_capability | auth-validation.ts | Engineering Delivery Lead | web/src/features/auth/auth-validation.ts | auth |
| Account access | missing_test_link | feature_or_capability | hasAuthErrors | Engineering Delivery Lead | web/src/features/auth/auth-validation.ts#hasAuthErrors | auth |
| Account access | missing_test_link | feature_or_capability | validateAuthForm | Engineering Delivery Lead | web/src/features/auth/auth-validation.ts#validateAuthForm | auth |
| Account access | missing_test_link | feature_or_capability | AuthenticatedImage | Engineering Delivery Lead | web/src/features/departments/assets-route.tsx#AuthenticatedImage | auth |
| Dashboard overview | missing_test_link | api_endpoint | USE /dashboard | Engineering Delivery Lead | src/app.ts#/dashboard | - |
| Dashboard overview | missing_test_link | feature_or_capability | build-architecture-health-dashboard.mjs | Engineering Delivery Lead | scripts/build-architecture-health-dashboard.mjs | - |
| Dashboard overview | missing_test_link | feature_or_capability | main | Engineering Delivery Lead | scripts/build-architecture-health-dashboard.mjs#main | - |
| Dashboard overview | missing_test_link | feature_or_capability | readJson | Engineering Delivery Lead | scripts/build-architecture-health-dashboard.mjs#readJson | - |
| Dashboard overview | missing_test_link | feature_or_capability | toBoolIcon | Engineering Delivery Lead | scripts/build-architecture-health-dashboard.mjs#toBoolIcon | - |
| Dashboard overview | missing_test_link | feature_or_capability | check-architecture-health-dashboard-gate.mjs | Engineering Delivery Lead | scripts/check-architecture-health-dashboard-gate.mjs | - |
| Dashboard overview | missing_test_link | feature_or_capability | fail | Engineering Delivery Lead | scripts/check-architecture-health-dashboard-gate.mjs#fail | - |
| Dashboard overview | missing_test_link | feature_or_capability | readJson | Engineering Delivery Lead | scripts/check-architecture-health-dashboard-gate.mjs#readJson | - |
| Dashboard overview | missing_test_link | feature_or_capability | src/modules/dashboard | Engineering Delivery Lead | src/modules/dashboard | - |
| Dashboard overview | missing_test_link | feature_or_capability | dashboard.routes.ts | Engineering Delivery Lead | src/modules/dashboard/dashboard.routes.ts | - |
| Dashboard overview | missing_test_link | feature_or_capability | coerceCount | Engineering Delivery Lead | src/modules/dashboard/dashboard.routes.ts#coerceCount | - |
| Dashboard overview | missing_test_link | feature_or_capability | pickHealth | Engineering Delivery Lead | src/modules/dashboard/dashboard.routes.ts#pickHealth | - |
| Dashboard overview | missing_test_link | feature_or_capability | riskRank | Engineering Delivery Lead | src/modules/dashboard/dashboard.routes.ts#riskRank | - |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
