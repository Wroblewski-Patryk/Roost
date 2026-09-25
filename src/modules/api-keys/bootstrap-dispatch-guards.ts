// LF-normalized migration 84 source pins; UNAPPLIED, not native evidence.
export const dispatchGuards=[
 {
  "table": "worker_bootstrap_dispatch_history",
  "name": "bootstrap_dispatch_lock",
  "function": "bootstrap_dispatch_lock",
  "kind": 30,
  "hash": "b502d1d59fc6228b652a88dead01e92c001ce7f1bc8e8d6b97d89051ce17fc41",
  "deferred": false
 },
 {
  "table": "worker_bootstrap_dispatch_history",
  "name": "bootstrap_dispatch_guard",
  "function": "bootstrap_dispatch_guard",
  "kind": 31,
  "hash": "33f67b091019ce5ccbcd95f6dfccb86f0809c4f8fb96027d2f54ba51653f69b5",
  "deferred": false
 },
 {
  "table": "worker_bootstrap_dispatch_history",
  "name": "bootstrap_dispatch_audit",
  "function": "bootstrap_dispatch_audit",
  "kind": 5,
  "hash": "049913aa90cb3be7091b3b57c3260f2293d68e37ad80f451ab9042816e7081d0",
  "deferred": false
 },
 {
  "table": "worker_bootstrap_dispatch_receipts",
  "name": "bootstrap_dispatch_receipt_guard",
  "function": "bootstrap_dispatch_receipt_guard",
  "kind": 31,
  "hash": "d42c878a5a33a41d182e242e97011d400939926087ca9ad1f0c01bc3c51c0e2a",
  "deferred": false
 },
 {
  "table": "events",
  "name": "bootstrap_dispatch_event_guard",
  "function": "bootstrap_dispatch_event_guard",
  "kind": 31,
  "hash": "29b4134dbdf0168c0b76ab49d347db967f86076f0d1611bce24680a03f1e0e41",
  "deferred": false
 },
 {
  "table": "worker_bootstrap_dispatch_history",
  "name": "bootstrap_dispatch_commit_guard",
  "function": "bootstrap_dispatch_commit_guard",
  "kind": 5,
  "hash": "6fe7a62063a74ab7affb6909834d38876d098f98b99dbe76437078afcad17a0c",
  "deferred": true
 },
 {
  "table": "worker_bootstrap_dispatch_history",
  "name": "bootstrap_dispatch_no_truncate",
  "function": "decision_attestation_immutable",
  "kind": 34,
  "hash": "ea3d53a259a1681551c2b4ba99bb473117e98b1e1ceab5116225a9384155d9d9",
  "deferred": false
 },
 {
  "table": "worker_bootstrap_dispatch_receipts",
  "name": "bootstrap_dispatch_receipts_no_truncate",
  "function": "decision_attestation_immutable",
  "kind": 34,
  "hash": "ea3d53a259a1681551c2b4ba99bb473117e98b1e1ceab5116225a9384155d9d9",
  "deferred": false
 }
] as const;
