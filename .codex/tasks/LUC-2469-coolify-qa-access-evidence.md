# LUC-2469 — Redacted Coolify QA Access Evidence

## Goal

Establish whether the existing Coolify capability can be certified as a time-bounded, least-privilege access path for the Roost QA resource only.

## Scope

- Read-only Coolify API checks for resource `xj0ch8j95devlvegx8sa2tqk`.
- No configuration, deploy, restart, secret, production-resource, or repository mutation.

## Read-only verification

Observed 2026-08-04 (Europe/Berlin) through the injected Coolify API binding:

| Fact | Redacted result |
| --- | --- |
| Requested resource | `xj0ch8j95devlvegx8sa2tqk` |
| Returned resource UUID | Matches requested resource |
| Resource name | Roost QA LUC-2153 |
| Environment identifier | 16 (provider API did not expose a readable environment detail route) |
| Destination | Standalone Docker destination, identifier redacted/not relied upon |
| Source | GitHub App source; configured repository confirmed without exposing its URL |
| Candidate source ref | `qa/luc-2153-372955cc` |
| Candidate source SHA / rollback target | `372955cc18aff1d940754f4eb2f3ce229f3638a4` |
| QA URL | No public FQDN configured; no URL published in this evidence |
| Runtime state | `exited:unhealthy` |
| Server reachability flag | true |
| Health check | Disabled; no custom health check found |
| Last online | 2026-08-03 21:48:16 (provider timestamp) |
| Restart count | 0 |
| Logs endpoint | Read-only request returned HTTP 400 without required provider-specific parameters; no logs or secrets were retrieved |
| DB/auth/runtime values | Intentionally not retrieved: the application detail response did not contain a redacted binding inventory, and reading environment variables could expose secrets |
| Publisher disabled | Cannot be certified from the provider response: no FQDN is configured, but the provider did not expose a definitive publisher-disabled field |

## Least-privilege conclusion

The existing binding can read the requested QA resource, but it cannot be certified as resource-scoped or time-bounded from the available API metadata. A bounded read-only probe also reached a different configured Roost application identifier before this was detected, demonstrating that the injected token's authorization envelope is broader than a single explicit resource ID. No production resource was queried or mutated.

This means the requested least-privilege grant is **not yet provisioned/proven**. Do not use this binding for deploy, restart, publisher, database, authentication, or runtime mutation.

## Required unblock action

The Coolify account owner or security reviewer must provide one of the following:

1. A documented, expiring capability restricted to `xj0ch8j95devlvegx8sa2tqk`, with operations limited to the approved QA task; or
2. A redacted provider-side access-policy export that proves the existing credential has the same resource and expiry restrictions.

They must also provide a redacted inventory of candidate-only DB/auth/runtime bindings and a definitive publisher-disabled state. After that, DRE can perform the narrowly scoped QA readiness/log proof without touching production.

## Result report

- No secrets were read or recorded.
- No production resource was accessed.
- No deploy, restart, or configuration mutation occurred.
- Current QA candidate is unhealthy, so deployment work remains gated even after access proof is supplied.
