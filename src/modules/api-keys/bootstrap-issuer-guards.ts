// Public migration-body fingerprints, normalized to LF. No runtime filesystem reads.
// Changing a guard requires explicit source review; catalog names alone are insufficient.
export const issuerGuards=[
  {
    "table": "bootstrap_issuer_history",
    "name": "bootstrap_issuer_append_guard",
    "function": "bootstrap_issuer_append_guard",
    "kind": 7,
    "hash": "aa4bcd1ec0f820e963f469f11796f90b1e34ae93455bd39aa329d87ee1a93d02"
  },
  {
    "table": "bootstrap_issuer_history",
    "name": "bootstrap_issuer_audit_append",
    "function": "bootstrap_issuer_audit_append",
    "kind": 5,
    "hash": "edff80b8a8b110b214effb303ca02f4bf82ec747546e8c646196bf75d2087d9b"
  },
  {
    "table": "bootstrap_issuer_history",
    "name": "bootstrap_issuer_history_immutable",
    "function": "bootstrap_issuer_immutable",
    "kind": 58,
    "hash": "f15d850128f5dcf4d2940e66b8a003ea5b3755180947d65380880343a073b9b8"
  },
  {
    "table": "bootstrap_issuer_audit",
    "name": "bootstrap_issuer_audit_immutable",
    "function": "bootstrap_issuer_immutable",
    "kind": 58,
    "hash": "f15d850128f5dcf4d2940e66b8a003ea5b3755180947d65380880343a073b9b8"
  },
  {
    "table": "trusted_provider_ticket_keys",
    "name": "bootstrap_issuer_key_fence",
    "function": "bootstrap_issuer_key_fence",
    "kind": 31,
    "hash": "a9d88bdb4e104758a211a33c4e44141be7b9c91abd5c68f78154d7c0cacf4334"
  },
  {
    "table": "trusted_provider_ticket_keys",
    "name": "trusted_provider_ticket_key_guard",
    "function": "trusted_provider_ticket_key_guard",
    "kind": 27,
    "hash": "db5ac76c0bb160e5de7394bf10839002f4aa23ac4d9527115a814cf481c429ef"
  },
  {
    "table": "trusted_provider_ticket_keys",
    "name": "lifecycle_installation_anchor_guard",
    "function": "worker_identity_installation_anchor_guard",
    "kind": 31,
    "hash": "db6249db0a763747b03010eb4a877f9b69bd117967c93728f751d98b9d180db8"
  },
  {
    "table": "trusted_provider_ticket_keys",
    "name": "lifecycle_installation_no_truncate",
    "function": "worker_identity_lifecycle_immutable",
    "kind": 34,
    "hash": "83e3f30afd20675752d27dd459d093abe21672e76ca8460ca629df82e1e44d11"
  }
] as const;
