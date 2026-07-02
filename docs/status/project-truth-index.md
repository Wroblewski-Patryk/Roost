# Project Truth Index

Generated: 2026-07-02T16:50:21.334Z
Project: Roost
Status: gaps_require_routing

This is the routing surface agents should use before guessing whether an app works.

| Metric | Count |
| --- | ---: |
| appCompletionItems | 1237 |
| eventChains | 7 |
| incompleteEventChains | 0 |
| runtimeFindings | 0 |
| criticalRuntimeFindings | 0 |
| appCompletionGaps | 1232 |
| indexedAppCompletionGaps | 200 |
| knownAppCompletionRiskItems | 1232 |
| appCompletionPriorityReviewItems | 200 |
| appCompletionPriorityReviewTruncated | true |
| operationalGateGaps | 0 |
| indexedGaps | 200 |
| totalGaps | 1232 |

## First Gap

- medium: Account access: authHeaders has app-completion risk missing_test_link.
- Owner: Test Automation Engineer + QA Regression Lead
- Next action: Add or link the smallest relevant automated/manual verification for this flow before claiming it works.

## Gaps

| Severity | Kind | Flow | Summary | Next owner |
| --- | --- | --- | --- | --- |
| medium | app_completion_gap | Account access | Account access: authHeaders has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: authHeaders has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerOwner has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: src/auth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: agent-key-profiles.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: findAgentKeyProfile has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: api-key.middleware.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: bearerToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: requireAuthContext has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: api-key.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: apiKeyPrefix has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: generateApiKey has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: hashApiKey has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: capabilities.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: capabilityForRequest has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: effectiveCapabilities has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: hasCapability has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: normalizedRequestPaths has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: routePattern has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: scopesAreBroad has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: password.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: hashPassword has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: verifyPassword has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: token.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: base64UrlDecode has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: base64UrlEncode has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: createAuthToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: sign has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: verifyAuthToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: src/features/auth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: google-drive.auth.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: buildGoogleDriveAuthorizationUrl has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: exchangeGoogleDriveAuthorizationCode has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: getFreshGoogleDriveOAuthForWorkspace has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: getGoogleDriveClientForWorkspace has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: getGoogleOAuthClient has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: getStoredGoogleDriveSecret has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: hasFreshAccessToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: mergeGoogleDriveConfig has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: normalizeTokenResponse has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: postGoogleOAuthToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: refreshGoogleDriveOAuth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: integration-settings.service.ts has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: parseGoogleDriveOAuthSecret has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: secrets.ts has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: src/modules/auth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: auth.routes.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: authActor has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: authActor has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: authActor has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: entityAuthority has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: requireUserAuth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: auth-token.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: clearOwnerToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: isSignedIn has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: ownerToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: setOwnerToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: client.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: errors.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: canonicalPostAuthPath has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: auth-pages.tsx has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: AuthRoute has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: onSubmit has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: auth-validation.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: hasAuthErrors has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: validateAuthForm has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: AuthenticatedImage has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: USE /dashboard has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: build-architecture-health-dashboard.mjs has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: main has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: readJson has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: toBoolIcon has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: check-architecture-health-dashboard-gate.mjs has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: fail has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: readJson has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: src/modules/dashboard has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: dashboard.routes.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: coerceCount has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: pickHealth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: riskRank has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
