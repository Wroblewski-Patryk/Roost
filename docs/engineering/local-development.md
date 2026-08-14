# Local Development

## Fill This File Early

Document the real local development flow with concrete commands and expected
results.

Recommended minimum sections:
- prerequisites
- environment baseline (`.env` files, required variables, local endpoints)
- local services startup
- DEV startup (watch mode or equivalent fast-iteration mode)
- local PROD-like startup (build plus start mode)
- verification checks for each mode
- shutdown and cleanup
- common troubleshooting notes

## Why It Matters

- reduces repeated setup questions
- keeps AI agents aligned with the actual local workflow
- makes validation commands more trustworthy
- improves confidence when validating behavior close to deployment runtime

## Verification Contract

- Define at least one health or readiness check command.
- Define at least one manual flow check for core runtime paths.
- Clarify which local shortcuts are debugging-only and not deployment parity
  proof.

## Pair With

- `docs/engineering/testing.md`
- the package scripts in the repository root

These three should agree on real commands and local runtime expectations.

## Ignored local evidence retention

Local evidence producers must use the exact ignored `.tmp` or `tmp` roots and
follow the bundle metadata contract in the
[ignored evidence retention guardrail](../operations/ignored-evidence-retention-guardrail.md).
Run `npm run evidence:retention:check` for the bounded metadata-only inventory;
run `npm run test:evidence-retention` for its isolated fixture suite. Neither
command authorizes evidence cleanup.
