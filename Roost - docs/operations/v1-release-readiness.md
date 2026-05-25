# CompanyCore v1 Release Readiness

Last updated: 2026-05-11

## Verdict

CompanyCore v1 is achieved for the approved operating slice: owner setup,
workspace-scoped API, ClickUp import/live sync/write-back, Jarvis read
integration, Paperclip event consumption, and clean sync data hygiene are
deployed and smoke tested.

The local architecture-derived V1 evidence set is also complete. V1EVID-001
proved the Company OS lifecycle trace in Docker, and V1EVID-002 proved the
operating-model registry lifecycle trace in Docker. The consolidated handoff is
`docs/operations/v1-achievement-and-blocker-handoff.md`.

The only tracked residual blocker is not a runtime v1 feature blocker:
GitHub-to-Coolify auto-deploy webhook administration remains blocked by missing
callable webhook-management tooling in this session. Repository visibility
shows admin permission, but the available GitHub connector surface does not
expose webhook create/list/update actions and the local `gh` CLI is not
installed. Manual deploy and rollback paths are proven.

## Smoke Evidence

| Surface | Evidence | Result |
| --- | --- | --- |
| CompanyCore public health | `GET https://api.companycore.luckysparrow.ch/health` | `200` |
| CompanyCore v1 health | `GET https://api.companycore.luckysparrow.ch/v1/health` | `200` |
| Service API connection | Jarvis key against `/v1/connection` | `200`, workspace `LuckySparrow`, ClickUp configured |
| ClickUp maintenance | `POST /v1/integration-settings/clickup/maintenance/run` with `inspect_only` | `21` webhooks, `219` ClickUp tasks, `0` failed inbox rows |
| ClickUp scheduler | Backend logs | `clickup maintenance scheduler enabled every 15 minutes` |
| Paperclip health | `GET https://paperclip.luckysparrow.ch/api/health` | `200` |
| Paperclip adapter | Production logs and DB | `received=1`, `created=1`, `acked=1`; issue `LUC-37` created |
| Paperclip event ack | CompanyCore pending events for `targetAgent=paperclip` | `0` |
| Jarvis env bridge | Production container env | `COMPANYCORE_BASE_URL` and service key configured |
| Jarvis authenticated connector | Bearer-authenticated production connector smoke | `200`, `connected=true`, `auth_type=bridge` |
| Jarvis CompanyCore sync | Bearer-authenticated production sync trigger | `200`, `status=started`, CompanyCore chunks indexed |
| Clean sync hygiene | Production maintenance after cleanup | `219` unchanged tasks skipped, `0` duplicate ClickUp tasks, no new duplicate sync events |
| Final v1 runtime rollover | Backend image `rnqqkhl3o3dut4qv56mlxly2_backend:9116026` | public/protected smoke passed; maintenance skipped 219 unchanged tasks |
| Full v1 live-system smoke | CompanyCore + ClickUp + Jarvis + Paperclip after rollover | CompanyCore/Paperclip/Jarvis health green; Jarvis CompanyCore connected with 259 chunks; 0 pending Paperclip events |

Jarvis's public connector endpoint returned `401` without an Authorization
header. This is expected for a protected user-facing endpoint. A follow-up
authenticated smoke with Jarvis's production bearer auth returned `200`,
reported `companycore.connected=true`, triggered a CompanyCore sync, and
confirmed chat answers are using CompanyCore records. The remaining Jarvis
follow-up was answer precision: when smoke records and durable business records
both matched a broad Paperclip prompt, Jarvis could choose a smoke agent as the
example agent even though the CompanyCore connection and chat context were
live. The precision follow-up was completed by filtering smoke records out of
normal CompanyCore chat context unless the prompt explicitly asks for smoke or
test records.

## Definition Of Done Review

- Build evidence exists for all recent runtime slices:
  - CompanyCore: `npm run build` and `npm test`.
  - Paperclip adapter: adapter unit test and server typecheck in source
    checkout; production image build from current production source.
- Real service path is used: no mock ClickUp, Jarvis, or Paperclip bridge is in
  the production smoke path.
- End-to-end data flow is proven:
  - ClickUp event reaches CompanyCore.
  - CompanyCore emits a provider-neutral agent event.
  - Paperclip consumes it, creates a local issue, and acknowledges it through
    CompanyCore.
- Restart/redeploy evidence exists:
  - CompanyCore backend manual rollover preserved DB and enabled the scheduler.
  - Final v1 runtime rollover runs backend container
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9116026`.
  - Paperclip service recreate preserved DB/volume and enabled the adapter.
- Error and secret handling:
  - Provider errors are mapped safely in CompanyCore.
  - Paperclip adapter logs configuration without API key material.

## Integration Checklist Review

- API contracts match deployed clients for `/v1/connection`,
  `/v1/agent-events`, `/v1/agent-events/:id/ack`, ClickUp maintenance, and task
  sync/write-back paths.
- Database schema and code align for CompanyCore workspace-scoped records,
  ClickUp webhook/inbox/outbox records, and Paperclip issue origin tracking.
- Migrations are applied in production; latest CompanyCore smoke reported no
  pending migrations before startup.
- Retry and idempotency are covered:
  - ClickUp provider inbox can retry failed rows.
  - ClickUp maintenance is non-destructive and scheduled.
  - Paperclip issue creation is idempotent by `origin_kind` and `origin_id`.
- Logs observed during smoke did not expose service API keys.

## Residual Risks

- GitHub auto-deploy webhook remains blocked by missing callable webhook
  administration tooling. The GitHub app can see the CompanyCore repository
  with admin permission, but available connector tools cannot administer
  webhooks and local `gh` is unavailable. Manual deploy is the approved
  fallback until tooling or credentials are available.
- OpenJarvis connector hygiene is deployed in production and committed locally
  as `5a426370`, but that commit has not been pushed to the upstream
  OpenJarvis repository because the checkout contains unrelated local changes
  and upstream ownership needs a deliberate handoff. The connector change has
  been replayed on a clean current upstream base and passed 6 targeted tests,
  but a safe branch push to `open-jarvis/OpenJarvis` failed with GitHub `403`,
  so the remaining blocker is upstream write access or an approved fork/PR
  route.
- Paperclip adapter is deployed as a production image patch from the current
  production source to avoid upgrading unrelated upstream Paperclip changes.
  The patch is now carried in `integrations/paperclip/companycore-adapter.patch`
  and documented in `docs/operations/paperclip-companycore-adapter-runbook.md`;
  the local Paperclip source commit is `4cfa476f` and should still be merged
  into the managed Paperclip application repository before the next Paperclip
  upgrade. The commit has passed Paperclip typecheck and adapter tests, but a
  safe branch push to `paperclipai/paperclip` failed with GitHub `403`, so the
  remaining blocker is upstream write access or an approved fork/PR route.

## Rollback

- CompanyCore rollback: redeploy the previous backend image while preserving
  the production Postgres volume.
- Paperclip rollback: tag the previous `paperclip-prod-paperclip:latest` image
  digest or rebuild from the previous production source, then run
  `docker compose up -d --no-build --force-recreate paperclip` in
  `/home/codex/apps/paperclip-prod`.

## Next Work

No active P0/P1 v1 runtime hardening task remains ready. The next choices are
v2 scope selection, OpenJarvis/Paperclip source handoff, or GitHub-to-Coolify
auto-deploy administration when the required tooling is available.
