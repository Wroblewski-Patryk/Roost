# Release And Operations Map

Last updated: YYYY-MM-DD

## Purpose

Use this map for deploy, smoke, rollback, production proof, incidents, and
operator-facing runtime status.

## Sources

| Need | Start With |
| --- | --- |
| Local development and commands | `docs/engineering/local-development.md` |
| Testing strategy | `docs/engineering/testing.md` |
| Local/stage/prod promotion | `docs/operations/deployment-template-local-stage-production.md` |
| VPS/Coolify contract | `docs/operations/coolify-vps-deployment-contract.md` |
| Post-deploy smoke | `docs/operations/post-deploy-smoke.md` |
| Rollback | `docs/operations/rollback-and-recovery.md` |
| Reliability and observability | `docs/operations/service-reliability-and-observability.md` |
| Project control and truth categories | `docs/operations/project-control-system.md` |
| Current health | `.agents/state/system-health.md` |
| Historical release proof | `history/releases/` |

## Rule

Do not call a release healthy from build success alone. Release confidence
requires environment, migration, health, smoke, rollback, and evidence notes
appropriate to the risk of the change.
