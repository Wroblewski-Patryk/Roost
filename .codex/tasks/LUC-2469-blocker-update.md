## Blocked — QA access is not yet least-privilege proven

I acknowledged the routing correction and used the existing Coolify binding only for read-only QA-resource evidence.

- Uploaded redacted evidence: [LUC-2469 attachment](/LUC/issues/LUC-2469).
- The requested QA resource is a real candidate on `qa/luc-2153-372955cc` at `372955cc18aff1d940754f4eb2f3ce229f3638a4`, but its current state is `exited:unhealthy`.
- No secret values, production-resource details, deploys, restarts, or configuration mutations were performed.
- The provider metadata cannot prove an expiry or single-resource scope. A bounded probe also established that the injected binding can reach a different Roost application, so it is not certifiable as resource-only least privilege.
- The API did not expose a safe redacted DB/auth/runtime binding inventory or definitive publisher-disabled flag; the QA resource has no public FQDN configured.

Unblock owner: Coolify account owner with Security Review Lead.

Required action: provide an expiring capability restricted to `xj0ch8j95devlvegx8sa2tqk` (or a redacted provider policy proving that exact scope and expiry), plus a redacted candidate-only DB/auth/runtime binding inventory and publisher-disabled proof. DRE will then run the QA-only readiness/log verification.

This continues to block [LUC-2468](/LUC/issues/LUC-2468) and [LUC-2457](/LUC/issues/LUC-2457). The full read-only fact export and rollback SHA are in the attached work product.
