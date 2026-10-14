// Forward-only G24c catalog. Applied v1-v3 manifests remain immutable.
import {v3CatalogV3Manifest} from './bootstrap-v3-catalog-v3-pins';
export const v3CatalogV4Hashes={
  "decision_state": "a939980c3170ce835429a01620244b49cdbcaaa967c5238728f4227bf63a5a05",
  "decision_authority_task_current": "a2a64450d992a5757fee1022e5590a2ee2373d227deb2a53cc83623840449c9f",
  "agent_credential_guard": "7cdf90276ace2932c5b9800fe3727cbfcca9b8bf5278d15d02dafbca9837e4b9",
  "task_capability_base": "9b56594176e9c68bd0904b70b38306788c90b89a64794d87e4c08439adabcbb0",
  "task_risk_sources": "bc0375ede3207414036e134ec8850dd912360059273db073630af6e8ef427225",
  "bootstrap_v3_catalog": "ba005d7c47d3d68c1336a0f5e6f9b872289942b83318dcd70fed4b54abc41bd4"
} as const;
export const v3CatalogV4AddedFunctions=[
  {
    "name": "decision_withdrawal_immutable",
    "args": "",
    "defaults": null,
    "result": "trigger",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "9b4ceeda9aaaf7cff6b8111294fc5f472f396ec3c2f9662aa60fa934e35a770b"
  },
  {
    "name": "decision_withdrawal_insert_guard",
    "args": "",
    "defaults": null,
    "result": "trigger",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "a11662e69c497af5da382ed523d2c43ea5bd45038af702b7ec0ab1e3dfedfc4c"
  },
  {
    "name": "decision_withdrawal_serial_guard",
    "args": "",
    "defaults": null,
    "result": "trigger",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "91cc032f07b34eb23d8ae3b061ffd3cceb0abf2d7f53b264f5f9c82bc16a9ea0"
  },
  {
    "name": "decision_withdrawal_effects",
    "args": "",
    "defaults": null,
    "result": "trigger",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "260b9cff2931ef7cbde128b9df341641dfb71edc1c8d2be0e9000229fab0192f"
  },
  {
    "name": "decision_withdraw_pending_v1",
    "args": "w uuid, d uuid, expected_request_hash text, owner uuid, request uuid, reason text",
    "defaults": null,
    "result": "record",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "62c782f31b98e48a7a4230f4d582f2afed68827779823d35765606c59f339ad0"
  },
  {
    "name": "decision_pending_version_before_authority_interviews",
    "args": "t uuid",
    "defaults": null,
    "result": "text",
    "language": "sql",
    "volatility": "s",
    "hash": "695e4abf971b4ddfe20abf06650d164d9d319ebdd9f1da15a6573cac234d4269"
  },
  {
    "name": "decision_admission_required",
    "args": "t uuid, op text",
    "defaults": null,
    "result": "text[]",
    "language": "plpgsql",
    "volatility": "s",
    "hash": "c64fcd4742a32768672df6e62680109dd2c8a36846e258d4f33fccae06448c4c"
  },
  {
    "name": "task_admission_independent",
    "args": "t uuid, u uuid",
    "defaults": null,
    "result": "boolean",
    "language": "sql",
    "volatility": "s",
    "hash": "c3ae8ed94afe215811a1a316337776a692ec4adcff9bc311441f74c961aa0151"
  },
  {
    "name": "task_admission_view",
    "args": "t uuid, op text",
    "defaults": null,
    "result": "jsonb",
    "language": "plpgsql",
    "volatility": "s",
    "hash": "949ec2bf2298f8a3ba9066f8cd9614936fa5b3ccf486133fb4edf6e7ff885a7b"
  },
  {
    "name": "decision_authority_invalidate_before_interviews",
    "args": "w uuid",
    "defaults": null,
    "result": "void",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "66c39bf94638c0e54ea0e434215c60c862556ea9b1c32066fe6ad88b07800b3d"
  },
  {
    "name": "application_takeover_decision_guard",
    "args": "",
    "defaults": null,
    "result": "trigger",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "94cf49a9883f3827640738448c05b6f42b3fbc6e715fcab756ca3d3685f6ecdd"
  },
  {
    "name": "g9_capture_source_body",
    "args": "",
    "defaults": null,
    "result": "trigger",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "10eb600c8655616ac3bfc576dce5253483cfc8a8afec7aeb89152c04f3bb91c6"
  },
  {
    "name": "immutable_human_task_scope",
    "args": "",
    "defaults": null,
    "result": "trigger",
    "language": "plpgsql",
    "volatility": "v",
    "hash": "04a8ce42e24c13d4ea042d584134faca033ac52d7de1090342b37387f0695ba0"
  }
] as const;
export const v3CatalogV4Manifest={...v3CatalogV3Manifest,version:'bootstrap-v3-catalog-v4',
 functions:[...v3CatalogV3Manifest.functions.map(f=>({...f,hash:v3CatalogV4Hashes[f.name as keyof typeof v3CatalogV4Hashes]??f.hash})),...v3CatalogV4AddedFunctions],
 triggers:[...v3CatalogV3Manifest.triggers,...[{"table":"decision_revisions","name":"a_decision_withdrawal_revision_fence","function":"decision_withdrawal_serial_guard","kind":7,"deferred":false},{"table":"decision_impact_previews","name":"a_decision_withdrawal_preview_fence","function":"decision_withdrawal_serial_guard","kind":7,"deferred":false},{"table":"decision_acceptances","name":"a_decision_withdrawal_acceptance_fence","function":"decision_withdrawal_serial_guard","kind":7,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_insert_guard","function":"decision_withdrawal_insert_guard","kind":7,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_immutable","function":"decision_withdrawal_immutable","kind":27,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_no_truncate","function":"decision_withdrawal_immutable","kind":34,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_ready_fence","function":"ready_source_lock","kind":6,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_effects","function":"decision_withdrawal_effects","kind":5,"deferred":false},{"table":"decision_impact_previews","name":"aaa_proof_source_fence","function":"bootstrap_proof_source_lock","kind":30,"deferred":false},{"table":"decision_impact_previews","name":"decision_history_guard","function":"decision_history_guard","kind":31,"deferred":false},{"table":"decision_impact_previews","name":"proof_source_no_truncate","function":"bootstrap_proof_immutable","kind":34,"deferred":false},{"table":"decision_impact_previews","name":"aa_decision_attestation_fence","function":"decision_attestation_lock","kind":30,"deferred":false},{"table":"decision_impact_previews","name":"decision_attestation_no_truncate","function":"decision_attestation_immutable","kind":34,"deferred":false},{"table":"decision_impact_previews","name":"zz_decision_attestation_audit","function":"decision_attestation_audit","kind":29,"deferred":false},{"table":"decision_revisions","name":"a0_application_takeover_revision","function":"application_takeover_decision_guard","kind":7,"deferred":false},{"table":"decision_acceptances","name":"a0_application_takeover_acceptance","function":"application_takeover_decision_guard","kind":7,"deferred":false},{"table":"decisions","name":"g9_source_body_history","function":"g9_capture_source_body","kind":29,"deferred":false},{"table":"workspace_memberships","name":"workspace_membership_scope_immutable","function":"immutable_human_task_scope","kind":19,"deferred":false},{"table":"bootstrap_v3_catalog_manifest_v4","name":"bootstrap_v3_manifest_v4_immutable","function":"bootstrap_v3_immutable","kind":62,"deferred":false}]],
 columns:[...v3CatalogV3Manifest.columns,...[{"table":"decision_withdrawals","columns":[{"name":"id","type":"uuid","generated":""},{"name":"workspace_id","type":"uuid","generated":""},{"name":"decision_id","type":"uuid","generated":""},{"name":"predecessor_id","type":"uuid","generated":""},{"name":"proposal_request_hash","type":"text","generated":""},{"name":"owner_user_id","type":"uuid","generated":""},{"name":"request_id","type":"uuid","generated":""},{"name":"reason","type":"text","generated":""},{"name":"withdrawn_at","type":"timestamp with time zone","generated":""}]},{"table":"bootstrap_v3_catalog_manifest_v4","columns":[{"name":"id","type":"boolean","generated":""},{"name":"record","type":"jsonb","generated":""}]}]],
 foreignKeys:[...v3CatalogV3Manifest.foreignKeys,...[{"table":"decision_withdrawals","target":"workspaces","columns":["workspace_id"],"targetColumns":["id"]},{"table":"decision_withdrawals","target":"decision_revisions","columns":["decision_id"],"targetColumns":["decision_id"]},{"table":"decision_withdrawals","target":"decisions","columns":["predecessor_id"],"targetColumns":["id"]},{"table":"decision_withdrawals","target":"users","columns":["owner_user_id"],"targetColumns":["id"]}]],
 exactTriggerTables:[...v3CatalogV3Manifest.exactTriggerTables,...["decision_withdrawals","decision_impact_previews","bootstrap_v3_catalog_manifest_v4"]]} as const;
