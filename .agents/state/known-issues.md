# Known Issues

Last updated: 2026-05-15

## Open Issues

| ID | Severity | Area | Summary | Owner | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| KI-008 | P0 | Google Drive production OAuth | Production Google Drive OAuth ciphertext cannot be decrypted with the current `INTEGRATION_SECRET_KEY`; Google Drive content refresh and Docs/Sheets writes return `401 integration_invalid_token` after commit `05e13e4` instead of the previous raw 500. | Ops/Release + Owner | BLOCKED | Restore the matching integration secret or complete owner Google Drive OAuth re-consent from `/settings/drive`, then rerun CompanyCore and Jarvis Docs/Sheets write/read smoke. |
| KI-007 | P1 | Product data completeness | Production `/v1/operating-model` has 13 areas and 26 external mappings but `0` storage locations, `0` knowledge roots, `0` automation definitions, and `/v1/projects` returns `0` while tasks exist. | Product + Backend | OPEN | Execute ACF-PROD-001 to decide, seed, import, or explicitly defer these owner-facing operating model records. |
| KI-002 | P2 | Release automation | GitHub-to-Coolify auto-deploy is not proven as reliable; manual VPS/Coolify backend rollover remains the accepted and approved path. | Ops/Release | ACCEPTED | After the next deploy, compare public `/health` `build.commit` with the pushed commit before claiming push-to-running-image proof. |
| KI-003 | P2 | Source handoff | Paperclip and OpenJarvis validated source changes could not be pushed upstream because GitHub returned `403`. | Ops/Release | BLOCKED | Resume AGRUN-010 after write access or an approved fork/PR route exists. |

## Accepted Residual Risks

- 2026-05-06: Manual VPS/Coolify rollover remains an accepted v1 release path
  while GitHub-to-Coolify webhook/auto-deploy administration is unresolved.
- 2026-05-15: ACF-OPS-001 refreshed public web/API health evidence. Both
  domains are healthy, but `/health` reports `commit: unknown` and
  `image: unknown`, so automatic deployment cannot be proven from public
  metadata. Manual VPS/Coolify rollover remains the accepted path.
- 2026-05-15: ACF-OPS-002 restored source-level build metadata wiring and
  regression coverage. The release-automation proof gap remains accepted until
  the next deployed runtime is checked through public `/health`.
- 2026-05-15: Post-push public smoke after `ec82a1a` returned `200` for
  `https://api.companycore.luckysparrow.ch/health`,
  `https://api.companycore.luckysparrow.ch/v1/health`, and
  `https://companycore.luckysparrow.ch/`, but both API health endpoints still
  reported `build.commit="unknown"` and `build.image="unknown"`. Treat this as
  uptime evidence only, not push-to-running-image proof.

## Recently Closed Issues

- V1 runtime readiness: closed by `docs/operations/v1-operator-handoff.md` and
  `docs/operations/v1-release-readiness.md`.
- KI-004 authenticated private-route screenshot gap: closed by UXA-002 on
  2026-05-08 with `owner-console:ux-smoke`, covering seven private routes at
  desktop/tablet/mobile and reporting zero console issues.
- Deploy automation evidence drift: closed by AGRUN-009 on 2026-05-08; the
  historical `63348d6` note is not accepted as superseding operations evidence.
- KI-004 Company OS cockpit generic collection 404s: closed by
  V2WEB-AGENT-022 on 2026-05-14. Shared table-record path resolution now sends
  Company OS collection slugs to `/v1/company-os/:collection`; mock render
  proof reported `badGeneric=[]`, `notFound=[]`, and `consoleErrors=[]`.
- KI-005 mobile overflow and focus accessibility: closed by ACF-UX-001 on
  2026-05-14. Desktop/mobile Playwright fallback checks for `/settings/api` and
  `/react-company-os` reported `horizontalOverflow=false`,
  `unnamedFocusableCount=0`, no console warnings/errors, and no relevant failed
  requests.
- KI-006 production secret and CORS hardening: closed by ACF-SEC-001 on
  2026-05-14. `npm test` against disposable PostgreSQL on `localhost:55452`
  verified missing-secret failure, development-placeholder rejection,
  production CORS allow/deny behavior, and the existing protected API flow.
