# CompanyCore V1 Achievement And Blocker Handoff

Last updated: 2026-05-11

## Verdict

CompanyCore V1 is achieved for the approved local and deployed runtime scope.

The repository has no active executable local V1 evidence task remaining. The
remaining items are external release or target-environment blockers that require
owner consent, provider credentials, upstream repository permission, or deploy
automation administration.

## Evidence Boundary

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Approved production V1 runtime | verified | `docs/operations/v1-release-readiness.md`; `docs/operations/v1-operator-handoff.md` | Owner setup, workspace API, ClickUp, Jarvis, Paperclip, and clean sync hygiene are accepted for the approved scope. |
| Company OS lifecycle | verified | V1EVID-001 `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && npm run seed && npm run company-os:trace-smoke"` trace `v1evid-1778458446081` | Proves approval request/decision, stage start/validate/complete, automation dry-run/execute, event readback, and audit readback. |
| Operating model registry lifecycle | verified | V1EVID-002 `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && npm run seed && npm run operating-model:registry-smoke"` trace `v1evid-om-1778459014284` | Proves folder, storage location, knowledge root, automation definition lifecycle, aggregate readback, deleted-resource `404`, and cross-workspace denial. |
| MCP command guard hardening after V1 | verified | V2AGENT-004/V2AGENT-005 Docker API regression tests | Proves risky MCP tools fail closed by default and supervised mode is explicit before HTTP validation. |
| Public V1 service health refresh | verified | 2026-05-11 public no-secret smoke | `https://api.companycore.luckysparrow.ch/health`, `/v1/health`, `https://companycore.luckysparrow.ch/`, `https://paperclip.luckysparrow.ch/api/health`, and `https://jarvis.luckysparrow.ch/health` returned `200`. |
| Active local V1 queue | complete | `.codex/context/TASK_BOARD.md`; `docs/planning/mvp-next-commits.md`; `.agents/state/next-steps.md` | No active local V1 evidence task remains. |

## External Blockers

| ID | Blocker | Why it is not local V1 implementation work | Next unblock action |
| --- | --- | --- | --- |
| AGRUN-007 | Google Drive Owner Consent And First Import | Server-side Drive implementation exists, but target proof needs real OAuth credentials and owner consent. | Owner provides/authorizes Google credentials and approves a first import smoke. |
| AGRUN-010 | Upstream Agent Source Merge Execution | Paperclip/OpenJarvis changes were locally validated, but upstream branch pushes failed with GitHub `403`. | Grant upstream write access or approve a fork/PR handoff route. |
| CCV1-057B | Paperclip upstream branch push | Managed patch and local commit remain available; upstream repository denied branch push. | Retry after permission change or use approved fork/PR route. |
| CCV1-058B | OpenJarvis upstream branch push | Clean upstream replay passed targeted tests; upstream repository denied branch push. | Retry after permission change or use approved fork/PR route. |
| KI-002 | GitHub-to-Coolify Auto-Deploy Proof | Manual deploy/rollback path is proven; automated webhook proof requires deploy automation administration tooling or credentials. | Provide approved GitHub/Coolify webhook admin path or keep manual deploy as the V1 release path. |

## Operator Interpretation

- Treat V1 as achieved locally and for the approved deployed runtime slice.
- Do not reopen V1 runtime implementation unless a fresh defect is reproduced.
- Do not mark blocked external target proofs as failed local implementation.
- Resume blocked items only when the required owner action, credential, or
  upstream permission exists.
- Start new product work only through an explicit V2 task contract.

## Safe Continuation Rule

When the user asks to keep working toward V1:

1. Check `.codex/context/TASK_BOARD.md`,
   `docs/planning/mvp-next-commits.md`, and this handoff.
2. If no new defect or credential/access grant exists, report V1 achieved and
   name the remaining external blockers.
3. If an unblocker exists, create a narrow task contract for exactly that
   blocker before mutating production or external systems.
4. Keep all credentials, tokens, API keys, and provider secrets out of docs,
   terminal output, and chat.
