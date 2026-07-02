# LUC-6120 App-Completion Subscription Classifier Planning-Path Fix

## Header
- ID: LUC-6120
- Title: Correct app-completion subscription classifier planning-path noise
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: Technical Solution Architect
- Priority: P1
- Mission ID: LUC-6120-APP-COMPLETION-SUBSCRIPTION-CLASSIFIER-FIX
- Mission Status: VERIFIED

## Goal
Stop the shared app-completion classifier from treating generic `docs/planning/`
paths and generic `*-plan.md` filenames as `Subscription and entitlement`
signals while preserving real billing, subscription, checkout, payment, and
subscription-plan language.

## Scope
- Shared classifier:
  `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs`
- Regenerated Roost status artifacts:
  `docs/status/app-completion-index.json`
  `docs/status/app-completion-index.md`
- Local source-of-truth notes for this evidence packet.

## Implementation
- Replaced the broad substring match for `plan` with `hasSubscriptionIntent`.
- Kept direct subscription terms: `subscription`, `billing`, `stripe`,
  `checkout`, and `payment`.
- Allowed `plan` only in subscription-like phrases such as `subscription plan`,
  `billing plan`, `payment plan`, `pricing plan`, `Pro plan`, and `plan tier`.
- Did not change product runtime code, API behavior, data models, production
  state, secrets, deploys, or protected smoke paths.

## Verification Evidence
- Before readback from `docs/status/app-completion-index.json` generated
  `2026-06-28T22:39:05.991Z`:
  - total items: `1057`
  - missing test links: `1016`
  - `Subscription and entitlement`: `713` total, `677` missing test links,
    gates `{subscription:713, configuration:18, auth:4}`
  - sampled false positives included `docs/planning/acf-doc-001-task-contract.md`
    and other generic planning paths.
- Fixture check after classifier change:
  - `docs/planning/luc-6120.md` -> `false`
  - `docs/planning/agent-crud-api-rollout-plan.md` -> `false`
  - `operations planning and control` -> `false`
  - `subscription plan checkout` -> `true`
  - `Pro plan` -> `true`
  - `plan tier` -> `true`
  - `billing portal` -> `true`
  - `payment state` -> `true`
- Regeneration command:
  `node C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\scripts\build-app-completion-index.mjs --project Roost --root C:\Personal\Projekty\Aplikacje\Roost`
- After readback from `docs/status/app-completion-index.json` generated
  `2026-06-28T22:53:34.721Z`:
  - total items: `371`
  - missing test links: `360`
  - `Subscription and entitlement`: `3` total, `2` missing test links,
    gates `{subscription:3}`
  - remaining subscription-priority planning rows explicitly contain
    subscription/entitlement language:
    `luc-5392-subscription-entitlement-finance-proof-ladder.md`,
    `luc-5647-subscription-entitlement-missing-test-proof-ladder.md`,
    `luc-5658-subscription-entitlement-app-completion-inference-curation.md`.
- Hygiene:
  - `git diff --check -- docs/status/app-completion-index.md docs/status/app-completion-index.json`
    PASS with LF-to-CRLF warnings only.
  - `git diff --check -- scripts/build-app-completion-index.mjs` PASS in
    `Paperclip_Softwarehouse` with LF-to-CRLF warning only.

## Source-Control Closure
- Shared script repo: `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse`
- Shared script commit:
  `6dba968b0f0e190c413b8cbd805c46d036c5af9a`
- Push status: not pushed; no issue or release gate requested a remote push.
- Roost repo: `C:/Personal/Projekty/Aplikacje/Roost`
- Roost generated artifacts: not committed because the Roost workspace is
  already mixed-dirty, `main` is ahead of `origin/main`, and unrelated
  generated/status/test/planning evidence is present.
- Deploy impact: none.
- Runtime/process impact: no server, browser, Docker, protected smoke,
  production mutation, provider action, credential access, or secret access.

## Result Report
- The classifier no longer treats the planning path segment or generic plan
  filenames as subscription evidence.
- Real subscription/billing/payment/checkout and subscription-plan language
  still classifies as subscription intent.
- The Roost app-completion index was regenerated and now records the corrected
  subscription flow counts.
- Residual risk: the generated app-completion index is still heuristic and may
  need future curation for other broad terms, but this issue's planning-path
  subscription noise is corrected and verified.
