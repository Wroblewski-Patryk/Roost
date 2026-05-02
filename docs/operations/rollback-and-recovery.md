# Rollback And Recovery

Document the first safe rollback path before the first production deploy.

## Rollback Triggers

- What symptoms justify rollback:
- Who can trigger rollback:
- What evidence should be captured first:

## Rollback Method

- App rollback:
- Migration rollback or forward-fix rule:
- Worker rollback:
- Cache or queue considerations:

## Recovery Verification

- Health checks:
- User journey smoke:
- Log review:
- Data integrity review:

## Notes

- Prefer deterministic rollback or forward-fix rules over improvisation.
- If rollback is unsafe for a given change type, record the required mitigation
  before deployment.
