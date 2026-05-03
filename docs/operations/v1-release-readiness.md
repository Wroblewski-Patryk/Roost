# CompanyCore v1 Release Readiness

Last updated: 2026-05-03

## Verdict

CompanyCore v1 is a production release candidate for the approved operating
slice: owner setup, workspace-scoped API, ClickUp import/live sync/write-back,
Jarvis read integration, and Paperclip event consumption are deployed and smoke
tested.

The only tracked residual blocker is not a runtime v1 feature blocker:
GitHub-to-Coolify auto-deploy webhook administration remains blocked by missing
GitHub repository settings access. Manual deploy and rollback paths are proven.

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

Jarvis's public connector endpoint returned `401` without an Authorization
header. This is expected for a protected user-facing endpoint and is not a
CompanyCore service-key failure; the same Jarvis CompanyCore service key passed
the CompanyCore `/v1/connection` smoke.

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

- GitHub auto-deploy webhook remains blocked by repository settings access.
  Manual deploy is the approved fallback until credentials are available.
- Jarvis public connector smoke requires a valid user Authorization header.
  CompanyCore-side Jarvis service authentication is verified, but a future
  closure pass should include an authenticated Jarvis UI/API smoke.
- Paperclip adapter is deployed as a production image patch from the current
  production source to avoid upgrading unrelated upstream Paperclip changes.
  The patch should be upstreamed or carried in the managed deployment source
  before the next Paperclip upgrade.

## Rollback

- CompanyCore rollback: redeploy the previous backend image while preserving
  the production Postgres volume.
- Paperclip rollback: tag the previous `paperclip-prod-paperclip:latest` image
  digest or rebuild from the previous production source, then run
  `docker compose up -d --no-build --force-recreate paperclip` in
  `/home/codex/apps/paperclip-prod`.

## Next Work

The next valuable v1-hardening slice is an authenticated Jarvis connector smoke
and a managed source path for the Paperclip CompanyCore adapter patch.
