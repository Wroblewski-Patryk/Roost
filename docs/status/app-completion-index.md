# App Completion Index

Generated: 2026-07-13T13:31:38.250Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.

## Counts

- Items: 1243
- User flows: 5
- Needs browser/screenshot review: 0
- Missing test link: 1149
- Missing doc link: 25
- Implemented, needs proof: 10
- Blocked: 0
- Known non-ok risk items: 1184
- Priority review items indexed: 200/1184
- Priority review truncated: true

## Flow Summary

- Unclassified user workflow: 1096 entities; risks {"missing_test_link":1068,"ok":2,"implemented_needs_proof":8,"missing_doc_link":18}; gates {"configuration":7,"auth":1}
- Account access: 70 entities; risks {"ok":57,"missing_doc_link":5,"missing_test_link":7,"implemented_needs_proof":1}; gates {"auth":70,"configuration":19,"subscription":1}
- Dashboard overview: 34 entities; risks {"missing_test_link":34}; gates {"configuration":7}
- User configuration: 33 entities; risks {"missing_test_link":31,"missing_doc_link":2}; gates {"configuration":31}
- Trading operation: 10 entities; risks {"missing_test_link":9,"implemented_needs_proof":1}; gates {}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| Account access | missing_doc_link | feature_or_capability | refreshGoogleDriveOAuth | Engineering Delivery Lead | src/integrations/google-drive/google-drive.auth.ts#refreshGoogleDriveOAuth | auth, configuration |
| Account access | missing_test_link | feature_or_capability | parseGoogleDriveOAuthSecret | Engineering Delivery Lead | src/integrations/integration-settings.service.ts#parseGoogleDriveOAuthSecret | auth, configuration |
| Account access | implemented_needs_proof | feature_or_capability | secrets.ts | Engineering Delivery Lead | src/integrations/secrets.ts | auth, subscription, configuration |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/company-os/company-os.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/company-os/workflow-definition-drafts.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | authActor | Engineering Delivery Lead | src/modules/intake/intake.routes.ts#authActor | auth |
| Account access | missing_test_link | feature_or_capability | entityAuthority | Engineering Delivery Lead | src/modules/workforce/workforce.service.ts#entityAuthority | auth |
| Account access | missing_test_link | feature_or_capability | requireUserAuth | Engineering Delivery Lead | src/modules/workspaces/workspaces.routes.ts#requireUserAuth | auth |
| Account access | missing_doc_link | feature_or_capability | clearOwnerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#clearOwnerToken | auth |
| Account access | missing_doc_link | feature_or_capability | isSignedIn | Engineering Delivery Lead | web/src/api/auth-token.ts#isSignedIn | auth |
| Account access | missing_doc_link | feature_or_capability | ownerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#ownerToken | auth |
| Account access | missing_doc_link | feature_or_capability | setOwnerToken | Engineering Delivery Lead | web/src/api/auth-token.ts#setOwnerToken | auth |
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
| Dashboard overview | missing_test_link | feature_or_capability | startOfToday | Engineering Delivery Lead | src/modules/dashboard/dashboard.routes.ts#startOfToday | - |
| Dashboard overview | missing_test_link | feature_or_capability | startOfTomorrow | Engineering Delivery Lead | src/modules/dashboard/dashboard.routes.ts#startOfTomorrow | - |
| Dashboard overview | missing_test_link | feature_or_capability | sumCounts | Engineering Delivery Lead | src/modules/dashboard/dashboard.routes.ts#sumCounts | - |
| Dashboard overview | missing_test_link | feature_or_capability | cc-button.tsx | Engineering Delivery Lead | web/src/components/cc-button.tsx | configuration |
| Dashboard overview | missing_test_link | feature_or_capability | cc-data-table.tsx | Engineering Delivery Lead | web/src/components/cc-data-table.tsx | configuration |
| Dashboard overview | missing_test_link | feature_or_capability | cc-field.tsx | Engineering Delivery Lead | web/src/components/cc-field.tsx | configuration |
| Dashboard overview | missing_test_link | feature_or_capability | cc-notice.tsx | Engineering Delivery Lead | web/src/components/cc-notice.tsx | configuration |
| Dashboard overview | missing_test_link | feature_or_capability | cc-resource-selector.tsx | Engineering Delivery Lead | web/src/components/cc-resource-selector.tsx | configuration |
| Dashboard overview | missing_test_link | feature_or_capability | cc-route-loading.tsx | Engineering Delivery Lead | web/src/components/cc-route-loading.tsx | configuration |
| Dashboard overview | missing_test_link | feature_or_capability | cc-text-input.tsx | Engineering Delivery Lead | web/src/components/cc-text-input.tsx | configuration |
| Dashboard overview | missing_test_link | feature_or_capability | AssetsOverview | Engineering Delivery Lead | web/src/features/departments/assets-route.tsx#AssetsOverview | - |
| Dashboard overview | missing_test_link | feature_or_capability | general-dashboard.tsx | Engineering Delivery Lead | web/src/features/departments/general-dashboard.tsx | - |
| Dashboard overview | missing_test_link | feature_or_capability | GeneralDashboard | Engineering Delivery Lead | web/src/features/departments/general-dashboard.tsx#GeneralDashboard | - |
| Dashboard overview | missing_test_link | feature_or_capability | healthTone | Engineering Delivery Lead | web/src/features/departments/general-dashboard.tsx#healthTone | - |
| Dashboard overview | missing_test_link | feature_or_capability | itemMeta | Engineering Delivery Lead | web/src/features/departments/general-dashboard.tsx#itemMeta | - |
| Dashboard overview | missing_test_link | feature_or_capability | public-home.tsx | Engineering Delivery Lead | web/src/features/public/public-home.tsx | - |
| Dashboard overview | missing_test_link | feature_or_capability | HeroTopology | Engineering Delivery Lead | web/src/features/public/public-home.tsx#HeroTopology | - |
| Dashboard overview | missing_test_link | feature_or_capability | PublicHomeRoute | Engineering Delivery Lead | web/src/features/public/public-home.tsx#PublicHomeRoute | - |
| Dashboard overview | missing_test_link | feature_or_capability | RoostGlyph | Engineering Delivery Lead | web/src/features/public/public-home.tsx#RoostGlyph | - |
| Dashboard overview | missing_test_link | feature_or_capability | StatusRail | Engineering Delivery Lead | web/src/features/public/public-home.tsx#StatusRail | - |
| Dashboard overview | missing_test_link | feature_or_capability | tx | Engineering Delivery Lead | web/src/features/public/public-home.tsx#tx | - |
| Trading operation | missing_test_link | api_endpoint | USE /strategy | Engineering Delivery Lead | src/app.ts#/strategy | - |
| Trading operation | implemented_needs_proof | feature_or_capability | app.ts | Engineering Delivery Lead | src/app.ts | - |
| Trading operation | missing_test_link | feature_or_capability | src/modules/strategy | Engineering Delivery Lead | src/modules/strategy | - |
| Trading operation | missing_test_link | feature_or_capability | strategy.routes.ts | Engineering Delivery Lead | src/modules/strategy/strategy.routes.ts | - |
| Trading operation | missing_test_link | feature_or_capability | asJsonArray | Engineering Delivery Lead | src/modules/strategy/strategy.routes.ts#asJsonArray | - |
| Trading operation | missing_test_link | feature_or_capability | taskLooksStrategic | Engineering Delivery Lead | src/modules/strategy/strategy.routes.ts#taskLooksStrategic | - |
| Trading operation | missing_test_link | feature_or_capability | textMatchesStrategy | Engineering Delivery Lead | src/modules/strategy/strategy.routes.ts#textMatchesStrategy | - |
| Trading operation | missing_test_link | feature_or_capability | strategy-route.tsx | Engineering Delivery Lead | web/src/features/departments/strategy-route.tsx | - |
| Trading operation | missing_test_link | feature_or_capability | formatDate | Engineering Delivery Lead | web/src/features/departments/strategy-route.tsx#formatDate | - |
| Trading operation | missing_test_link | feature_or_capability | StrategyRoute | Engineering Delivery Lead | web/src/features/departments/strategy-route.tsx#StrategyRoute | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET / | Engineering Delivery Lead | src/app.ts#/ | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /agent-events | Engineering Delivery Lead | src/app.ts#/agent-events | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /agent-logs | Engineering Delivery Lead | src/app.ts#/agent-logs | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /agents | Engineering Delivery Lead | src/app.ts#/agents | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /api-keys | Engineering Delivery Lead | src/app.ts#/api-keys | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /api/build-info | Engineering Delivery Lead | src/app.ts#/api/build-info | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /assets | Engineering Delivery Lead | src/app.ts#/assets | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /clients | Engineering Delivery Lead | src/app.ts#/clients | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /commercial-exceptions | Engineering Delivery Lead | src/app.ts#/commercial-exceptions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /company-os | Engineering Delivery Lead | src/app.ts#/company-os | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /connection | Engineering Delivery Lead | src/app.ts#/connection | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /deals | Engineering Delivery Lead | src/app.ts#/deals | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /decisions | Engineering Delivery Lead | src/app.ts#/decisions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /departments | Engineering Delivery Lead | src/app.ts#/departments | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /events | Engineering Delivery Lead | src/app.ts#/events | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /goals | Engineering Delivery Lead | src/app.ts#/goals | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /google-drive | Engineering Delivery Lead | src/app.ts#/google-drive | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /health | Engineering Delivery Lead | src/app.ts#/health | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /intake | Engineering Delivery Lead | src/app.ts#/intake | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /interactions | Engineering Delivery Lead | src/app.ts#/interactions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /mcp | Engineering Delivery Lead | src/app.ts#/mcp | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /notes | Engineering Delivery Lead | src/app.ts#/notes | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /operating-graph | Engineering Delivery Lead | src/app.ts#/operating-graph | - |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
