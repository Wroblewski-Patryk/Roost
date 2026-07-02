# LUC-5692 Next Non-Duplicated QA Proof Selection

## Task Contract

- Task Type: QA proof selection.
- Current Stage: verification.
- Deliverable For This Stage: Test Automation disposition for the
  post-[LUC-5691](/LUC/issues/LUC-5691) curated app-completion queue.
- Goal: select the next non-duplicated QA proof from the curated
  app-completion queue, or close the lane when the current queue has no
  concrete unverified runtime candidate.
- Scope:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - `docs/planning/luc-5691-current-app-completion-missing-test-evidence-link-debt.md`
  - existing Account access and Dashboard overview proof packets cited by
    [LUC-5691](/LUC/issues/LUC-5691)
- Exclusions: no product code, schema, migration, scanner implementation,
  test authoring, runtime server, browser, database, Docker, push, deploy,
  restart, protected smoke, production mutation, provider action, credential
  access, or secret disclosure.

## Source Snapshot

Current app-completion source:

- File: `docs/status/app-completion-index.json`
- Generated: `2026-06-27T22:11:48.179Z`
- Counts: `902` items, `7` flows, `873` missing test links,
  `0` missing doc links, `0` blocked records.
- Priority sample: `200` rows.

Machine readback during this QA heartbeat:

| Classification | Count | QA interpretation |
| --- | ---: | --- |
| Docs/agent/state rows | 126 | Evidence-link or scanner-classification debt; not a runtime QA target. |
| Runtime rows | 74 | Concrete rows, but all map to already-covered Account access or Dashboard overview proof. |
| Account access runtime rows | 68 | Covered by existing `/auth`, `/v1/auth`, and browser account proof packets. |
| Dashboard overview runtime rows | 6 | Covered by existing dashboard command API proof and [LUC-5669](/LUC/issues/LUC-5669). |

Route-shaped rows visible in the current priority queue include:

- `USE /auth`
- `USE /v1/auth`
- `POST /v1/integration-settings/google_drive/oauth/authorize-url`
- `POST /v1/integration-settings/google_drive/oauth/exchange`
- `/auth/login`
- `/auth/register`
- `USE /dashboard`

The Google Drive OAuth rows are generated architecture document rows in the
Account access bucket, not fresh runtime failures in this queue sample.

## Selected QA Proof

Selected next proof: none from this snapshot.

Reason:

- `USE /auth`, `/auth/login`, and `/auth/register` are covered by existing
  auth API proof and [LUC-5561](/LUC/issues/LUC-5561) browser account-access
  proof.
- `USE /v1/auth` is covered by [LUC-5661](/LUC/issues/LUC-5661), which added
  explicit API alias-parity assertions for `/v1/auth/register`,
  `/v1/auth/login`, authenticated `/v1/auth/me`, wrong-password denial, and
  invalid bearer denial.
- `USE /dashboard` is covered by [LUC-5669](/LUC/issues/LUC-5669), which
  mapped the signal to existing `/v1/dashboard/command` assertions in
  `src/tests/api.test.ts`.
- The remaining priority rows are docs/agent/generated-node evidence-link
  debt or scanner classification noise.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| [LUC-5691](/LUC/issues/LUC-5691) dependency readback | PASS | Curation packet states no non-duplicated QA proof candidate remains in the current snapshot. |
| App-completion JSON readback | PASS | Node readback parsed `docs/status/app-completion-index.json`, confirmed `generatedAt=2026-06-27T22:11:48.179Z`, `200` priority rows, `126` docs/agent rows, and `74` runtime rows split as Account access `68` and Dashboard overview `6`. |
| Duplicate-proof rejection | PASS | Candidate runtime rows map to already-cited proof packets: [LUC-5561](/LUC/issues/LUC-5561), [LUC-5661](/LUC/issues/LUC-5661), and [LUC-5669](/LUC/issues/LUC-5669). |
| Product/runtime mutation boundary | PASS | No product code, runtime server, browser, database, Docker, push, deploy, protected smoke, credentials, provider action, or production mutation was used. |

## Result Report

Status: verified QA proof selection closure.

Files changed by this lane:

- `docs/planning/luc-5692-next-nonduplicated-qa-proof-selection.md`
- source-of-truth state/context entries for this QA disposition

Disposition: no new QA test or proof lane is selected from the current curated
queue. [LUC-5692](/LUC/issues/LUC-5692) can close as `done`; future QA work
should start only from a future app-completion refresh that exposes a concrete
unverified runtime route/API/page row, or from a reproduced fresh regression.

Deployment impact: none.

Residual risk: aggregate app-completion still reports broad missing-test-link
debt, but the current top-200 queue does not contain a non-duplicated runtime
proof target for Test Automation.
