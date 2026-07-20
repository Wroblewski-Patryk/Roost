# Project Truth Index

Generated: 2026-07-20T21:43:34.581Z
Project: Roost
Status: gaps_require_routing

This is the routing surface agents should use before guessing whether an app works.

| Metric | Count |
| --- | ---: |
| appCompletionItems | 46 |
| eventChains | 7 |
| incompleteEventChains | 0 |
| runtimeFindings | 0 |
| criticalRuntimeFindings | 0 |
| appCompletionGaps | 4 |
| indexedAppCompletionGaps | 4 |
| knownAppCompletionRiskItems | 4 |
| appCompletionPriorityReviewItems | 4 |
| appCompletionPriorityReviewTruncated | false |
| operationalGateGaps | 0 |
| indexedGaps | 4 |
| totalGaps | 4 |

## First Gap

- medium: Unclassified user workflow: USE /v1/webhooks/clickup has app-completion risk missing_test_link.
- Owner: Test Automation Engineer + QA Regression Lead
- Next action: Add or link the smallest relevant automated/manual verification for this flow before claiming it works.

## Gaps

| Severity | Kind | Flow | Summary | Next owner |
| --- | --- | --- | --- | --- |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: USE /v1/webhooks/clickup has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: USE /workforce has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: USE /workspaces has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | User configuration | User configuration: USE /integration-settings has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
