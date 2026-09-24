// Reviewed LF-normalized migration bodies. Names alone never authorize a writer.
import {channelGuards,channelShapeHash} from './bootstrap-channel-guards';
import {issuerGuards} from './bootstrap-issuer-guards';
export const ticketOwnGuards=[
 {"table":"worker_bootstrap_tickets","name":"bootstrap_lifecycle_write_guard","function":"bootstrap_lifecycle_write_guard","kind":31,"hash":"fbf4fca18969f172c42241fc160d44ff232b7b8105836c2961fed709cbccd984","deferred":false},
 {"table":"worker_bootstrap_tickets","name":"z_bootstrap_lifecycle_audit","function":"bootstrap_lifecycle_audit","kind":21,"hash":"777af3c2456ed0cd2bf7383ee0d96f138465b0ba8c5d21c0cdb0a60964bc3a94","deferred":false},
 {"table":"worker_bootstrap_tickets","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"worker_bootstrap_tickets","name":"bootstrap_lifecycle_commit_guard","function":"bootstrap_lifecycle_commit_guard","kind":21,"hash":"85340a90fe402e2150adaae31cffc1800500d09b286596e7a9674dcb17ef400a","deferred":true},
 {"table":"worker_bootstrap_attempts","name":"bootstrap_lifecycle_write_guard","function":"bootstrap_lifecycle_write_guard","kind":31,"hash":"fbf4fca18969f172c42241fc160d44ff232b7b8105836c2961fed709cbccd984","deferred":false},
 {"table":"worker_bootstrap_attempts","name":"z_bootstrap_lifecycle_audit","function":"bootstrap_lifecycle_audit","kind":21,"hash":"777af3c2456ed0cd2bf7383ee0d96f138465b0ba8c5d21c0cdb0a60964bc3a94","deferred":false},
 {"table":"worker_bootstrap_attempts","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"worker_bootstrap_attempts","name":"bootstrap_lifecycle_commit_guard","function":"bootstrap_lifecycle_commit_guard","kind":21,"hash":"85340a90fe402e2150adaae31cffc1800500d09b286596e7a9674dcb17ef400a","deferred":true},
 {"table":"worker_bootstrap_history","name":"bootstrap_lifecycle_write_guard","function":"bootstrap_lifecycle_write_guard","kind":31,"hash":"fbf4fca18969f172c42241fc160d44ff232b7b8105836c2961fed709cbccd984","deferred":false},
 {"table":"worker_bootstrap_history","name":"z_bootstrap_lifecycle_audit","function":"bootstrap_lifecycle_audit","kind":21,"hash":"777af3c2456ed0cd2bf7383ee0d96f138465b0ba8c5d21c0cdb0a60964bc3a94","deferred":false},
 {"table":"worker_bootstrap_history","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"worker_bootstrap_history","name":"bootstrap_lifecycle_commit_guard","function":"bootstrap_lifecycle_commit_guard","kind":21,"hash":"85340a90fe402e2150adaae31cffc1800500d09b286596e7a9674dcb17ef400a","deferred":true},
 {"table":"worker_bootstrap_heads","name":"bootstrap_lifecycle_write_guard","function":"bootstrap_lifecycle_write_guard","kind":31,"hash":"fbf4fca18969f172c42241fc160d44ff232b7b8105836c2961fed709cbccd984","deferred":false},
 {"table":"worker_bootstrap_heads","name":"z_bootstrap_lifecycle_audit","function":"bootstrap_lifecycle_audit","kind":21,"hash":"777af3c2456ed0cd2bf7383ee0d96f138465b0ba8c5d21c0cdb0a60964bc3a94","deferred":false},
 {"table":"worker_bootstrap_heads","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"worker_bootstrap_heads","name":"bootstrap_lifecycle_commit_guard","function":"bootstrap_lifecycle_commit_guard","kind":21,"hash":"85340a90fe402e2150adaae31cffc1800500d09b286596e7a9674dcb17ef400a","deferred":true},
 {"table":"worker_bootstrap_audit","name":"bootstrap_lifecycle_write_guard","function":"bootstrap_lifecycle_write_guard","kind":31,"hash":"fbf4fca18969f172c42241fc160d44ff232b7b8105836c2961fed709cbccd984","deferred":false},
 {"table":"worker_bootstrap_audit","name":"z_bootstrap_lifecycle_audit","function":"bootstrap_lifecycle_audit","kind":21,"hash":"777af3c2456ed0cd2bf7383ee0d96f138465b0ba8c5d21c0cdb0a60964bc3a94","deferred":false},
 {"table":"worker_bootstrap_audit","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"worker_bootstrap_lifecycle_events","name":"bootstrap_lifecycle_write_guard","function":"bootstrap_lifecycle_write_guard","kind":31,"hash":"fbf4fca18969f172c42241fc160d44ff232b7b8105836c2961fed709cbccd984","deferred":false},
 {"table":"worker_bootstrap_lifecycle_events","name":"z_bootstrap_lifecycle_audit","function":"bootstrap_lifecycle_audit","kind":21,"hash":"777af3c2456ed0cd2bf7383ee0d96f138465b0ba8c5d21c0cdb0a60964bc3a94","deferred":false},
 {"table":"worker_bootstrap_lifecycle_events","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"worker_bootstrap_lifecycle_events","name":"bootstrap_lifecycle_commit_guard","function":"bootstrap_lifecycle_commit_guard","kind":21,"hash":"85340a90fe402e2150adaae31cffc1800500d09b286596e7a9674dcb17ef400a","deferred":true},
 {"table":"worker_bootstrap_write_receipts","name":"bootstrap_lifecycle_receipt_guard","function":"bootstrap_lifecycle_receipt_guard","kind":31,"hash":"9233c0f06c0d373e3ebfaabda6ce87cdf935f4b4af3153eaf6e928492584cfa6","deferred":false},
 {"table":"worker_bootstrap_write_receipts","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"events","name":"bootstrap_lifecycle_event_protect","function":"bootstrap_lifecycle_event_protect","kind":27,"hash":"0e33f487311284b679436ef5f9c1abcdc3e448a038c9013039618ac9c948eeed","deferred":false},
 {"table":"events","name":"bootstrap_lifecycle_no_truncate","function":"bootstrap_lifecycle_immutable","kind":34,"hash":"2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a","deferred":false},
 {"table":"worker_identity_lifecycle","name":"lifecycle_history_immutable","function":"worker_identity_lifecycle_immutable","kind":27,"hash":"83e3f30afd20675752d27dd459d093abe21672e76ca8460ca629df82e1e44d11","deferred":false},
 {"table":"worker_identity_lifecycle","name":"lifecycle_history_no_truncate","function":"worker_identity_lifecycle_immutable","kind":34,"hash":"83e3f30afd20675752d27dd459d093abe21672e76ca8460ca629df82e1e44d11","deferred":false},
 {"table":"worker_identity_lifecycle_audit","name":"lifecycle_audit_immutable","function":"worker_identity_lifecycle_immutable","kind":58,"hash":"83e3f30afd20675752d27dd459d093abe21672e76ca8460ca629df82e1e44d11","deferred":false},
 {"table":"worker_identity_lifecycle","name":"lifecycle_append_guard","function":"worker_identity_lifecycle_guard","kind":7,"hash":"feb0f558c45cd7a6365d65bc0fe4a02e2201a7cc47ba05b479e92378ab5cc186","deferred":false},
 {"table":"worker_identity_lifecycle","name":"lifecycle_audit_append","function":"worker_identity_lifecycle_audit_append","kind":5,"hash":"1fa98c744a879f3235f33fd05c9cc52c8d3a5baf8e4f5650515296387de5533f","deferred":false},
 {"table":"agent_hosts","name":"lifecycle_host_anchor_guard","function":"worker_identity_host_anchor_guard","kind":31,"hash":"f2923857223a80e2d8a4445f24f689096c59e872941db5c858fd312b8b2675a7","deferred":false},
 {"table":"agent_hosts","name":"lifecycle_host_no_truncate","function":"worker_identity_lifecycle_immutable","kind":34,"hash":"83e3f30afd20675752d27dd459d093abe21672e76ca8460ca629df82e1e44d11","deferred":false},
 {"table":"trusted_provider_ticket_keys","name":"lifecycle_installation_anchor_guard","function":"worker_identity_installation_anchor_guard","kind":31,"hash":"db6249db0a763747b03010eb4a877f9b69bd117967c93728f751d98b9d180db8","deferred":false},
 {"table":"trusted_provider_ticket_keys","name":"lifecycle_installation_no_truncate","function":"worker_identity_lifecycle_immutable","kind":34,"hash":"83e3f30afd20675752d27dd459d093abe21672e76ca8460ca629df82e1e44d11","deferred":false}
] as const;
export const ticketGuards=[...channelGuards,...issuerGuards.map(g=>({...g,deferred:false})),
 ...ticketOwnGuards.filter(g=>!issuerGuards.some(i=>i.table===g.table&&i.name===g.name))];
export const ticketHelpers=[
 {"name":"bootstrap_lifecycle_json","hash":"d8a4bd53221d5a9a76b53ec4804f9ac4ae424ea4ab260171415feffcc2799be7","volatility":"i","result":"text"},
 {"name":"bootstrap_lifecycle_digest","hash":"b49ce8711054c2359505cb7881a586ab22ba04d48a08529fdcf43138e83e97d8","volatility":"i","result":"text"},
 {"name":"bootstrap_lifecycle_shape","hash":"90aa1488e4a7df5ae90411af06732f56cd647146bbdd653a12919a19ee118269","volatility":"i","result":"boolean"},
 {"name":"bootstrap_lifecycle_current","hash":"6e24bfe2e178afeffb900559424545eca539c1747a73345600897511c9ac87fd","volatility":"s","result":"boolean"},
 {"name":"bootstrap_lifecycle_anchors_current","volatility":"s","result":"boolean","hash":"be37bc5fd821c6f07956629c32d79404b08bf36ec532b0547697f63d917be2ee"}
] as const;
export const ticketChannelHelper={name:'transport_bootstrap_shape',hash:channelShapeHash,volatility:'i',result:'boolean'};
