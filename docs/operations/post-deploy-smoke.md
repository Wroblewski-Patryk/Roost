# Post-deploy smoke

Run these checks after every approved production deployment. Record transient
evidence outside the repository and never include credentials or production
data in logs committed to Git.

## Public checks

1. `GET /health` returns `200` and the expected build commit.
2. The public web route loads without a server error.
3. Registration and login routes expose the expected safe UI state.

## Authenticated checks

1. Sign in with an approved smoke account.
2. Confirm workspace settings and the `00` dashboard load.
3. Open the Company Atlas and one department workbench.
4. Verify a representative protected API read is workspace-scoped.
5. Confirm integration settings redact all secret values.

## Integration checks

- ClickUp: inspect configuration and freshness without mutating provider data.
- Google Drive: inspect OAuth/configuration state without starting an import
  unless the owner explicitly approved it.
- MCP/agent keys: run read-only discovery with a scoped temporary key when the
  release changed API or capability contracts.

## Failure and rollback

Stop the rollout when health, authentication, workspace isolation, migrations
or secret redaction fails. Follow `rollback-and-recovery.md`, preserve the
PostgreSQL volume, redeploy the previous known-good commit and repeat this
smoke checklist.
