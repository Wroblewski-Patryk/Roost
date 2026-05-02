# Deployment Agent Checklist Template

## Scope
- Environment:
- Hosting target: Coolify on VPS | direct Docker Compose | other
- Change summary:
- Deployment risk:
- Runtime services affected:

## Pre-Deploy
- [ ] Release notes reviewed
- [ ] Required checks passed
- [ ] `DEPLOYMENT_GATE.md` has no hard blocks
- [ ] Config or secret changes reviewed
- [ ] Health endpoints confirmed
- [ ] Build passes without errors
- [ ] Runtime startup logs have no blocking errors
- [ ] API contracts match deployed clients
- [ ] Backup / restore preconditions reviewed
- [ ] Rollback path prepared
- [ ] Smoke checklist path confirmed

## Coolify / VPS Readiness
- [ ] Service definitions match the current architecture
- [ ] Dockerfile paths are correct
- [ ] Required persistent volumes are defined
- [ ] Public URLs / domains are confirmed
- [ ] Worker or cron services are covered

## Deploy Steps
- [ ] Build artifacts prepared
- [ ] Migration plan reviewed and applied when required
- [ ] Deployment executed
- [ ] Smoke checks executed

## Post-Deploy Evidence
- Health:
- Smoke:
- Logs:
- Metrics:
- Manual journey verification:

## Rollback
- Trigger:
- Procedure:
- Verification after rollback:
