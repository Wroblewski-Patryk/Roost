# System Health

Last updated: 2026-05-08

## Latest Validation Snapshot

| Check | Command or method | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| lint | Not configured | NOT APPLICABLE | `.codex/context/PROJECT_STATE.md` validation commands | Project has no lint script. |
| typecheck | `npm run build` | PASS (latest recorded) | `docs/operations/v1-operator-handoff.md`; recent V2WEB task evidence in `.codex/context/PROJECT_STATE.md` | Build is the project typecheck gate. |
| tests | `npm test` | PASS (latest recorded) | recent V2WEB task evidence in `.codex/context/PROJECT_STATE.md` | Requires disposable PostgreSQL for fresh reruns. |
| build | `npm run build` | PASS (latest recorded) | recent V2WEB task evidence in `.codex/context/PROJECT_STATE.md` | No runtime code changed in this state-sync pass. |
| smoke | Production public health smoke | PASS | 2026-05-08 AGRUN-009 public checks | `/health`, `/v1/health`, and web root returned `200`; `/health` reported build `71f3eb3b063ea68226a1736c727c52882b33f27a`. |
| ux/browser | Production public/auth Browser audit | PARTIAL PASS | 2026-05-08 UXA-001 | Public entry, login, register, and mobile auth rendered with no relevant console warnings/errors; authenticated Browser entry was blocked by an automation issue on `input[type=email]`. |
| local runtime | Docker local runtime for UX audit | PASS | 2026-05-08 UXA-001 | Local backend ran on `http://localhost:3001`; `/health` returned `ok`; migrations and seed completed. |
| web editor markers | Production `app.js` marker check | PASS | 2026-05-08 AGRUN-008 public `app.js` check | Typed editor markers for Notes, Projects, Clients, Task Lists, and Tasks are present. |
| operator handoff parity | Docs review | PASS | 2026-05-08 CCV1-062 | `v1-operator-handoff.md` and rollback docs now reference the current public health build and note the SSH inventory limitation. |

## Runtime Health

- Production CompanyCore, Jarvis, and Paperclip health were green in the latest
  v1 handoff evidence.
- CompanyCore public health currently reports image
  `rnqqkhl3o3dut4qv56mlxly2_backend:71f3eb3b063ea68226a1736c727c52882b33f27a`.
- Known blockers are external: Google Drive owner consent/import,
  Paperclip/OpenJarvis upstream write access, and deploy-automation evidence
  reconciliation.
- UX blocker for the next polish wave: authenticated private-route screenshot
  evidence needs an approved local path because the Browser runtime could not
  type into `input[type=email]` during UXA-001.

## Quality Gate Notes

- Latest v1 handoff: `docs/operations/v1-operator-handoff.md`.
- Latest release readiness: `docs/operations/v1-release-readiness.md`.
- Required pre-commit contract remains the validation commands in
  `.codex/context/PROJECT_STATE.md`.
