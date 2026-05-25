# Paperclip CompanyCore Adapter Runbook

Last updated: 2026-05-03

## Purpose

Paperclip should consume CompanyCore as the company source of truth for
agent-directed operational events. CompanyCore emits provider-neutral agent
events. Paperclip polls pending events for `targetAgent=paperclip`, creates or
finds an idempotent Paperclip issue, and acknowledges the CompanyCore event
only after local persistence succeeds.

This runbook keeps the Paperclip adapter source path durable until the patch is
merged into the managed Paperclip application repository.

## Managed Patch

CompanyCore carries the current Paperclip adapter patch at:

- `integrations/paperclip/companycore-adapter.patch`

The patch is generated from the local Paperclip source commit:

- `4cfa476f feat: add companycore adapter poller`

The patch adds:

- `server/src/services/companycore-adapter.ts`
- `server/src/__tests__/companycore-adapter.test.ts`
- `startCompanyCoreAdapterPoller(db as any)` in `server/src/index.ts`

Do not edit production Paperclip source by hand without updating this managed
patch or replacing it with an upstream Paperclip commit reference.

## Required Runtime Environment

Paperclip must have these runtime variables:

- `COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch`
- `COMPANYCORE_API_KEY=<Paperclip workspace service API key>`
- `COMPANYCORE_ADAPTER_SOURCE=paperclip`

Optional tuning variables:

- `COMPANYCORE_AGENT_EVENT_TARGET=paperclip`
- `COMPANYCORE_EVENT_POLL_INTERVAL_MS=30000`
- `COMPANYCORE_EVENT_BATCH_LIMIT=25`
- `COMPANYCORE_PAPERCLIP_COMPANY_ID=<Paperclip company ID>`

Never commit or document raw service API keys.

## Apply To Managed Paperclip Source

From a clean Paperclip checkout:

```bash
git am /path/to/companycore/integrations/paperclip/companycore-adapter.patch
```

If the managed Paperclip source is already ahead of the patch base, apply with
three-way merge:

```bash
git am -3 /path/to/companycore/integrations/paperclip/companycore-adapter.patch
```

Resolve conflicts by preserving these adapter rules:

- Poll CompanyCore with `X-API-Key`, not bearer auth.
- Ack CompanyCore events only after the Paperclip issue exists.
- Keep idempotency by `originKind=companycore_agent_event` and the CompanyCore
  agent event ID as `originId`.
- Do not log the CompanyCore API key.

## Validation

Run in the Paperclip source checkout:

```bash
npx --yes pnpm@9.15.4 --filter @paperclipai/server typecheck
npm exec --yes pnpm@9.15.4 -- vitest run server/src/__tests__/companycore-adapter.test.ts
```

Expected result:

- Paperclip server typecheck passes.
- CompanyCore adapter tests pass.

## Production Smoke

After deployment, verify:

- `GET https://paperclip.luckysparrow.ch/api/health` returns `200`.
- Paperclip logs include `CompanyCore adapter enabled` without API key
  material.
- CompanyCore pending events for `targetAgent=paperclip` can be consumed.
- Paperclip creates or finds exactly one issue per CompanyCore agent event.
- CompanyCore pending events for `targetAgent=paperclip` return `0` after ack.

Current production evidence from the v1 closure audit:

- Paperclip health returned `200`.
- Paperclip created issue `LUC-37` from a CompanyCore event.
- Paperclip acknowledged the event through CompanyCore.

## Rollback

Rollback Paperclip by redeploying the previous Paperclip image/source while
preserving the Paperclip database volume. CompanyCore event delivery is
at-least-once: unacknowledged events remain pending and can be consumed again
after the adapter is restored.
