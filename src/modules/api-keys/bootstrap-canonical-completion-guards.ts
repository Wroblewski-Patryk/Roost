// Migration 85 source pins only; UNAPPLIED, no native qualification.
export const completionFunctions=[
 {
  "name": "bootstrap_completion_sources",
  "args": "attempt uuid, handoff uuid",
  "result": "text",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "06ee8db29cf80935ac4eb10edad5821aa8df9c7112632e50d8d48128af66ecb0"
 },
 {
  "name": "bootstrap_completion_context",
  "args": "attempt uuid, handoff uuid",
  "result": "jsonb",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "6cb4fdb25e11d94bd927b4fdf34f54bf3999aa2c615a1a28c1e1e4a730391cf8"
 },
 {
  "name": "bootstrap_completion_proof",
  "args": "v jsonb, s jsonb, p jsonb, xid text, lo bigint, hi bigint",
  "result": "jsonb",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "66d2e3174e35e9a7e96e6047f8302534d52c36719d4f1c17e78360e73202c153"
 },
 {
  "name": "bootstrap_completion_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "d6cb659e75b5c52b422d52e07a03d9ff87f75e5ac6decb381819542ce62bd58b"
 },
 {
  "name": "bootstrap_completion_audit",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "e783b2bd62440e012358d736396cfc26724fc57ec01245eca2c2dd6d683e2367"
 },
 {
  "name": "bootstrap_completion_receipt_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "86a6bf646b2f32fc9544601920a7d943da99882c7eb276519a42d5859812007d"
 },
 {
  "name": "bootstrap_completion_commit_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "a944669bae34fe94ec0fd461fd6d76d04e574f4941455b22e2aa904023682d38"
 },
 {
  "name": "bootstrap_completion_event_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "95a2ac9db0740d6ab824d22f0b426116ec499c32b37ca3107dbbf04936b417c9"
 },
 {
  "name": "bootstrap_completion_no_mutation",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "ba32b3a8185073eb7697649d4e3136ae4a31b067983728686d02eb54b2e513bd"
 },
 {
  "name": "worker_handoff_owner_current",
  "args": "h worker_credential_handoffs",
  "result": "boolean",
  "language": "sql",
  "volatility": "s",
  "hash": "cd731c71d6f52ce95507f0ce351d7153a2867fdc82e216edeb1212f7ccd4b4f5"
 },
 {
  "name": "worker_handoff_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "601072af3e07ec0c63898ccf7c8a4825f27fc94005d73a47978c4b6decaa4321"
 },
 {
  "name": "worker_credential_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "5713d29bd29ba9235a40474d655bdaaeb4fe3249ea02134ce30e42f1ccd31f72"
 },
 {
  "name": "worker_handoff_ack_commit_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "7c35f31278976eba2c03eaf20534345546249f39b84be7dd47d7df02302b4a13"
 },
 {
  "name": "agent_credential_operation_guard",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "c80fb4bfd11d4b03055a6445d71770e46c7cc24853e4e79d051bbfb44764d422"
 },
 {
  "name": "transport_bootstrap_source_lock",
  "args": "",
  "result": "trigger",
  "language": "plpgsql",
  "volatility": "v",
  "hash": "c4115545454b641c20aa355e713f03bb3534a6506d4faef93e4a5209ad3a5510"
 }
] as const;
export const completionTriggers=[
 {
  "table": "worker_bootstrap_completions",
  "name": "bootstrap_completion_guard",
  "function": "bootstrap_completion_guard",
  "kind": 31,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_completions",
  "name": "bootstrap_completion_audit",
  "function": "bootstrap_completion_audit",
  "kind": 5,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_completions",
  "name": "bootstrap_completion_commit_guard",
  "function": "bootstrap_completion_commit_guard",
  "kind": 5,
  "deferred": true
 },
 {
  "table": "worker_bootstrap_completion_receipts",
  "name": "bootstrap_completion_receipt_guard",
  "function": "bootstrap_completion_receipt_guard",
  "kind": 31,
  "deferred": false
 },
 {
  "table": "events",
  "name": "bootstrap_completion_event_guard",
  "function": "bootstrap_completion_event_guard",
  "kind": 31,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_completions",
  "name": "bootstrap_completion_no_truncate",
  "function": "bootstrap_completion_no_mutation",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_bootstrap_completion_receipts",
  "name": "bootstrap_completion_receipts_no_truncate",
  "function": "bootstrap_completion_no_mutation",
  "kind": 34,
  "deferred": false
 },
 {
  "table": "worker_credential_handoffs",
  "name": "worker_handoff_guard",
  "function": "worker_handoff_guard",
  "kind": 31,
  "deferred": false
 },
 {
  "table": "worker_credential_handoffs",
  "name": "worker_handoff_ack_commit_guard",
  "function": "worker_handoff_ack_commit_guard",
  "kind": 21,
  "deferred": true
 },
 {
  "table": "api_keys",
  "name": "worker_credential_guard",
  "function": "worker_credential_guard",
  "kind": 31,
  "deferred": false
 },
 {
  "table": "agent_credential_operations",
  "name": "agent_credential_operation_guard",
  "function": "agent_credential_operation_guard",
  "kind": 31,
  "deferred": false
 },
 {
  "table": "api_keys",
  "name": "transport_bootstrap_source_fence",
  "function": "transport_bootstrap_source_lock",
  "kind": 30,
  "deferred": false
 }
] as const;
