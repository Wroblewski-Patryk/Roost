# Coolify VPS Deployment Contract

This template assumes VPS hosting with Coolify as the default deployment path.
If the project uses another target, keep the same contract and document the
difference explicitly.

## Deployment Target

- VPS provider:
- Coolify project or environment:
- Public domains:
- Private services:

## Runtime Inventory

- Main app services:
- Worker or cron services:
- Databases:
- Cache or queue:
- Persistent volumes:

## Required Artifacts

- Dockerfile paths:
- Compose or service-definition paths:
- Env example files:
- Health or readiness endpoints:
- Migration entrypoint:

## Env And Secrets Contract

- Which env files exist:
- Which values must come from Coolify secrets:
- Which values are safe to keep in examples:
- Who owns secret rotation:

## Release Requirements

- Required checks before deploy:
- Required smoke checks after deploy:
- Rollback trigger:
- Rollback method:

## Data Safety

- Backup strategy:
- Restore verification expectation:
- Risky migration policy:
