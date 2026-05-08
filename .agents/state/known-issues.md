# Known Issues

Last updated: 2026-05-08

## Open Issues

| ID | Severity | Area | Summary | Owner | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| KI-001 | P1 | Google Drive | First real Drive owner consent and selected-folder import cannot be proven until OAuth credentials and owner action are available. | Ops/Release | BLOCKED | Resume AGRUN-007 when credentials and consent are available. |
| KI-002 | P2 | Release automation | GitHub-to-Coolify auto-deploy is not proven as reliable; manual VPS backend rollover remains the approved path. | Ops/Release | MONITORING | Record a push-to-running-image smoke before claiming auto-deploy is reliable. |
| KI-003 | P2 | Source handoff | Paperclip and OpenJarvis validated source changes could not be pushed upstream because GitHub returned `403`. | Ops/Release | BLOCKED | Resume AGRUN-010 after write access or an approved fork/PR route exists. |
| KI-004 | P1 | UX evidence | Authenticated private-route screenshots are not yet captured for the current UX polish wave because Browser automation failed on `input[type=email]` and blocked session injection. | QA/Test | READY | Start UXA-002 with an approved local authenticated screenshot path. |

## Accepted Residual Risks

- 2026-05-06: Manual VPS/Coolify rollover remains an accepted v1 release path
  while GitHub-to-Coolify webhook/auto-deploy administration is unresolved.

## Recently Closed Issues

- V1 runtime readiness: closed by `docs/operations/v1-operator-handoff.md` and
  `docs/operations/v1-release-readiness.md`.
- Deploy automation evidence drift: closed by AGRUN-009 on 2026-05-08; the
  historical `63348d6` note is not accepted as superseding operations evidence.
