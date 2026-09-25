// Migration 86 source pins only. UNAPPLIED; native qualification absent.
export const proofPersistenceFunctions=[
 {
  "name": "bootstrap_proof_bytes",
  "args": "v jsonb, depth integer",
  "result": "bytea",
  "language": "plpgsql",
  "volatility": "i",
  "hash": "9d57f9e2a06f3cb2d48e1f6d6ac3f72bc2f3c24e8569445c5a882cacaf468343"
 },
 {
  "name": "bootstrap_proof_digest",
  "args": "v jsonb",
  "result": "text",
  "language": "plpgsql",
  "volatility": "i",
  "hash": "f0a7ae78abfde878c83e99e65cc615d81fc944d7d420cf45b542ffd230d30866"
 },
 {
  "name": "bootstrap_proof_shape",
  "args": "v jsonb, keys text[]",
  "result": "boolean",
  "language": "plpgsql",
  "volatility": "i",
  "hash": "b9750de78235c9e8abe30e34457bd80cf8a545114e20e79d41f9f0b5df816b42"
 },
 {
  "name": "bootstrap_proof_time",
  "args": "v jsonb",
  "result": "boolean",
  "language": "plpgsql",
  "volatility": "i",
  "hash": "ab2f4b26162552cce8e453bf9b542a1092c25af69b0d4e590d6197c56c455341"
 },
 {
  "name": "bootstrap_proof_public_material",
  "args": "m jsonb",
  "result": "boolean",
  "language": "plpgsql",
  "volatility": "i",
  "hash": "96e881ca09dd15ad6d24f55c1c4033ded8d40bc07d05b20570bf435abe92923c"
 },
 {
  "name": "bootstrap_proof_owner",
  "args": "w uuid, d uuid, revision integer, field text, value jsonb",
  "result": "uuid",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "8cede83d10437ea905d290cf37a048999d4311d1d66f4e8da9b524bb806a02d3"
 },
 {
  "name": "bootstrap_proof_sources",
  "args": "w uuid",
  "result": "text",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "399447a9dd178a04c00181eb68d35968c4c19302bf2f3a18f6303e351779892a"
 },
 {
  "name": "bootstrap_proof_source_lock",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "3d596cfd463f32b7579d336b1ec481653e22f0920a2359cc140e9e0e1b9d6cf0"
 },
 {
  "name": "bootstrap_proof_immutable",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "f93cd343c364e4867ed2cca8d118c3f30e0cc663079e4212424103bedc1c5f5f"
 },
 {
  "name": "bootstrap_proof_replay",
  "args": "records jsonb",
  "result": "jsonb",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "2673771c205299856d2ccc65e13ecbecfd7149764195822cc24b475c2a7dcf2e"
 },
 {
  "name": "bootstrap_proof_reference",
  "args": "w uuid, ref jsonb, at_time timestamp with time zone, generation jsonb",
  "result": "jsonb",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "50781a187c4040db74b43774fc20ec05b29deec28ef931437e5fc79568fc50ee"
 },
 {
  "name": "bootstrap_proof_lifecycle",
  "args": "w uuid, installation uuid, host uuid, ig uuid, hg uuid, ir uuid, hr uuid",
  "result": "boolean",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "a28416543359f621f9b8fe7a2f0b18c815e61d7d016e7137b739fe4949452b12"
 },
 {
  "name": "bootstrap_proof_child_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "add2057543ac4f3c2fb800c77250f567356559a75346ba8619d4f9ed9be8634a"
 },
 {
  "name": "bootstrap_proof_operation",
  "args": "table_name text, operation uuid",
  "result": "jsonb",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "f8df120cf8d8e362f955f31e48271317e1eba74a531c1810453cf43928b0db29"
 },
 {
  "name": "bootstrap_proof_receipt_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "821299f74e2e7529f96d5ef7dfb283061adb3caa207432e26433876489b878e6"
 },
 {
  "name": "bootstrap_proof_audit",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "0769f3cf3f90d4b4e50cf7f1fd3ce298fc9ff081c12d530267aab6e83c71e158"
 },
 {
  "name": "bootstrap_proof_commit_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "4d0866b5650627ae57edbbda71c41ebab1fbcaa3da76e1ccad59c70b44541e48"
 },
 {
  "name": "bootstrap_proof_event_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "3b83a29d0cb4563a545dee3634d1ff665db429bc430f51842a7feb69b6342365"
 },
 {
  "name": "bootstrap_proof_reserved_key_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "3b977190d14217f6a34f5d2e591c82a88aa5a079442b5c887b2f937ae31ea51b"
 }
] as const;
export const proofPersistenceTriggers=[
 {
  "table": "trusted_provider_ticket_keys",
  "name": "proof_reserved_key",
  "function": "bootstrap_proof_reserved_key_guard",
  "kind": 23,
  "deferred": false
 },
 {
  "table": "bootstrap_issuer_history",
  "name": "proof_reserved_key",
  "function": "bootstrap_proof_reserved_key_guard",
  "kind": 23,
  "deferred": false
 },
 {
  "table": "decision_attestation_key_history",
  "name": "proof_reserved_key",
  "function": "bootstrap_proof_reserved_key_guard",
  "kind": 23,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_key_history",
  "name": "proof_child_guard",
  "function": "bootstrap_proof_child_guard",
  "kind": 7,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_key_history",
  "name": "proof_child_audit",
  "function": "bootstrap_proof_audit",
  "kind": 5,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_key_history",
  "name": "proof_child_immutable",
  "function": "bootstrap_proof_immutable",
  "kind": 58,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_key_history",
  "name": "proof_child_commit",
  "function": "bootstrap_proof_commit_guard",
  "kind": 5,
  "deferred": true
 },
 {
  "table": "bootstrap_proof_attachments",
  "name": "proof_child_guard",
  "function": "bootstrap_proof_child_guard",
  "kind": 7,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_attachments",
  "name": "proof_child_audit",
  "function": "bootstrap_proof_audit",
  "kind": 5,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_attachments",
  "name": "proof_child_immutable",
  "function": "bootstrap_proof_immutable",
  "kind": 58,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_attachments",
  "name": "proof_child_commit",
  "function": "bootstrap_proof_commit_guard",
  "kind": 5,
  "deferred": true
 },
 {
  "table": "bootstrap_proof_ticket_links",
  "name": "proof_child_guard",
  "function": "bootstrap_proof_child_guard",
  "kind": 7,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_ticket_links",
  "name": "proof_child_audit",
  "function": "bootstrap_proof_audit",
  "kind": 5,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_ticket_links",
  "name": "proof_child_immutable",
  "function": "bootstrap_proof_immutable",
  "kind": 58,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_ticket_links",
  "name": "proof_child_commit",
  "function": "bootstrap_proof_commit_guard",
  "kind": 5,
  "deferred": true
 },
 {
  "table": "bootstrap_proof_write_receipts",
  "name": "proof_receipt_guard",
  "function": "bootstrap_proof_receipt_guard",
  "kind": 7,
  "deferred": false
 },
 {
  "table": "bootstrap_proof_write_receipts",
  "name": "proof_receipt_immutable",
  "function": "bootstrap_proof_immutable",
  "kind": 58,
  "deferred": false
 },
 {
  "table": "events",
  "name": "proof_event_guard",
  "function": "bootstrap_proof_event_guard",
  "kind": 31,
  "deferred": false
 },
 {
  "table": "events",
  "name": "proof_events_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "workspaces",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "workspaces",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "workspace_memberships",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "workspace_memberships",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "decisions",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "decisions",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "decision_revisions",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "decision_revisions",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "decision_acceptances",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "decision_acceptances",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "decision_impact_previews",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "decision_impact_previews",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_identity_lifecycle",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_identity_lifecycle",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "agent_hosts",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "agent_hosts",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "trusted_provider_ticket_keys",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "trusted_provider_ticket_keys",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "bootstrap_issuer_history",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "bootstrap_issuer_history",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "decision_attestation_key_history",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "decision_attestation_key_history",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_tickets",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_tickets",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_attempts",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_attempts",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_history",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_history",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_heads",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_heads",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_lifecycle_events",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_lifecycle_events",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_dispatch_history",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_dispatch_history",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_completions",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_completions",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "api_keys",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "api_keys",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_credential_handoffs",
  "name": "aaa_proof_source_fence",
  "function": "bootstrap_proof_source_lock",
  "kind": 30,
  "deferred": false
 },
 {
  "table": "worker_credential_handoffs",
  "name": "proof_source_no_truncate",
  "function": "bootstrap_proof_immutable",
  "kind": 34,
  "deferred": false
 }
] as const;
export const proofPersistenceForeignKeys=[
 {
  "table": "bootstrap_proof_key_history",
  "columns": [
   "workspace_id",
   "installation_id"
  ],
  "target": "trusted_provider_ticket_keys",
  "targetColumns": [
   "workspace_id",
   "installation_id"
  ]
 },
 {
  "table": "bootstrap_proof_key_history",
  "columns": [
   "decision_id",
   "workspace_id",
   "decision_revision"
  ],
  "target": "decision_revisions",
  "targetColumns": [
   "decision_id",
   "workspace_id",
   "version"
  ]
 },
 {
  "table": "bootstrap_proof_key_history",
  "columns": [
   "installation_lifecycle_id",
   "workspace_id",
   "installation_id",
   "installation_generation"
  ],
  "target": "worker_identity_lifecycle",
  "targetColumns": [
   "id",
   "workspace_id",
   "subject_id",
   "generation"
  ]
 },
 {
  "table": "bootstrap_proof_key_history",
  "columns": [
   "host_lifecycle_id",
   "workspace_id",
   "host_id",
   "host_generation"
  ],
  "target": "worker_identity_lifecycle",
  "targetColumns": [
   "id",
   "workspace_id",
   "subject_id",
   "generation"
  ]
 },
 {
  "table": "bootstrap_proof_key_history",
  "columns": [
   "workspace_id"
  ],
  "target": "workspaces",
  "targetColumns": [
   "id"
  ]
 },
 {
  "table": "bootstrap_proof_attachments",
  "columns": [
   "workspace_id",
   "installation_id"
  ],
  "target": "trusted_provider_ticket_keys",
  "targetColumns": [
   "workspace_id",
   "installation_id"
  ]
 },
 {
  "table": "bootstrap_proof_attachments",
  "columns": [
   "decision_id",
   "workspace_id",
   "decision_revision"
  ],
  "target": "decision_revisions",
  "targetColumns": [
   "decision_id",
   "workspace_id",
   "version"
  ]
 },
 {
  "table": "bootstrap_proof_attachments",
  "columns": [
   "installation_lifecycle_id",
   "workspace_id",
   "installation_id",
   "installation_generation"
  ],
  "target": "worker_identity_lifecycle",
  "targetColumns": [
   "id",
   "workspace_id",
   "subject_id",
   "generation"
  ]
 },
 {
  "table": "bootstrap_proof_attachments",
  "columns": [
   "host_lifecycle_id",
   "workspace_id",
   "host_id",
   "host_generation"
  ],
  "target": "worker_identity_lifecycle",
  "targetColumns": [
   "id",
   "workspace_id",
   "subject_id",
   "generation"
  ]
 },
 {
  "table": "bootstrap_proof_attachments",
  "columns": [
   "worker_key_event_id",
   "workspace_id",
   "worker_principal",
   "worker_revision",
   "worker_history_digest"
  ],
  "target": "bootstrap_proof_key_history",
  "targetColumns": [
   "id",
   "workspace_id",
   "principal",
   "revision",
   "record_digest"
  ]
 },
 {
  "table": "bootstrap_proof_attachments",
  "columns": [
   "server_key_event_id",
   "workspace_id",
   "server_principal",
   "server_revision",
   "server_history_digest"
  ],
  "target": "bootstrap_proof_key_history",
  "targetColumns": [
   "id",
   "workspace_id",
   "principal",
   "revision",
   "record_digest"
  ]
 },
 {
  "table": "bootstrap_proof_ticket_links",
  "columns": [
   "attachment_id",
   "ticket_id",
   "workspace_id",
   "host_id",
   "enrollment_generation"
  ],
  "target": "bootstrap_proof_attachments",
  "targetColumns": [
   "id",
   "ticket_id",
   "workspace_id",
   "host_id",
   "enrollment_generation"
  ]
 },
 {
  "table": "bootstrap_proof_ticket_links",
  "columns": [
   "ticket_id",
   "workspace_id",
   "host_id",
   "enrollment_generation"
  ],
  "target": "worker_bootstrap_tickets",
  "targetColumns": [
   "id",
   "workspace_id",
   "host_id",
   "generation"
  ]
 },
 {
  "table": "bootstrap_proof_ticket_links",
  "columns": [
   "attempt_id",
   "ticket_id",
   "workspace_id",
   "host_id",
   "enrollment_generation"
  ],
  "target": "worker_bootstrap_attempts",
  "targetColumns": [
   "id",
   "ticket_id",
   "workspace_id",
   "host_id",
   "generation"
  ]
 },
 {
  "table": "bootstrap_proof_write_receipts",
  "columns": [
   "key_operation"
  ],
  "target": "bootstrap_proof_key_history",
  "targetColumns": [
   "id"
  ]
 },
 {
  "table": "bootstrap_proof_write_receipts",
  "columns": [
   "attachment_operation"
  ],
  "target": "bootstrap_proof_attachments",
  "targetColumns": [
   "id"
  ]
 },
 {
  "table": "bootstrap_proof_write_receipts",
  "columns": [
   "link_operation"
  ],
  "target": "bootstrap_proof_ticket_links",
  "targetColumns": [
   "id"
  ]
 },
 {
  "table": "bootstrap_proof_write_receipts",
  "columns": [
   "event_id"
  ],
  "target": "events",
  "targetColumns": [
   "id"
  ]
 }
] as const;
