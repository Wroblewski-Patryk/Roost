# Known Issues

Last updated: 2026-05-14

## Open Issues

| ID | Severity | Area | Summary | Owner | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| KI-001 | P1 | Google Drive | Production Drive OAuth and folder discovery are working, but no folder roots are selected for import. Owner discovery returned 172 folders and `selectedFolderCount=0`. | Ops/Release | BLOCKED_OWNER_FOLDER_SELECTION | Owner selects the allowed Drive folder roots in `/settings/drive`; then run first selected-folder import smoke. |
| KI-002 | P2 | Release automation | GitHub-to-Coolify auto-deploy is not proven as reliable; manual VPS backend rollover remains the approved path. | Ops/Release | MONITORING | Record a push-to-running-image smoke before claiming auto-deploy is reliable. |
| KI-003 | P2 | Source handoff | Paperclip and OpenJarvis validated source changes could not be pushed upstream because GitHub returned `403`. | Ops/Release | BLOCKED | Resume AGRUN-010 after write access or an approved fork/PR route exists. |

## Accepted Residual Risks

- 2026-05-06: Manual VPS/Coolify rollover remains an accepted v1 release path
  while GitHub-to-Coolify webhook/auto-deploy administration is unresolved.

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
