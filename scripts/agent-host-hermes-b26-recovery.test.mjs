import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, renameSync, unlinkSync, symlinkSync, linkSync, realpathSync } from "node:fs";
import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { nativeDigest, createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { nativeArtifactSnapshot } from "./lib/agent-host-native-review.mjs";
import { syntheticRecoveryFixture } from "./fixtures/hermes-recovery-evidence.mjs";
import { createB21RecoverySupplement } from "./lib/agent-host-hermes-b24-supplement.mjs";
import { observeB21LegacyAdoption, approveB21LegacyAdoption, publishB21LegacyAdoption, b21AdoptionDirectory, b21AdoptionScope, b21AdoptionMaxAgeMs } from "./lib/agent-host-hermes-b25-adoption.mjs";
import { approveB26Recovery, executeB26Recovery, inspectB26Postflight, b26RecoveryDirectory } from "./lib/agent-host-hermes-b26-recovery.mjs";
import { b26Inventory, assertB26Remaining } from "./lib/agent-host-b26-inventory.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
const windows = { skip: process.platform !== "win32", timeout: 600000 };
function fixture(t) {
  const x = syntheticRecoveryFixture(t, false, { allowRemovedFixture: true }), b24 = createB21RecoverySupplement(x.options);
  const { assertOwnerAuthority, ...base } = x.options;
  const options = { ...base, supplementDirectory: x.directory, expected: { originalReviewDigest: b24.projection.originalReviewDigest, supplementDigest: b24.projection.supplementDigest } };
  const observed = observeB21LegacyAdoption(options), approval = { scope: b21AdoptionScope, ...options.expected,
    frozenEvidenceDigest: observed.review.frozenEvidenceDigest, ownerDecisionDigest: nativeDigest("synthetic B25 owner"), missingOriginalOwnershipAccepted: true };
  const b25 = publishB21LegacyAdoption(approveB21LegacyAdoption({ observation: observed.observation, approval, assertOwnerAuthority() {} }));
  Object.assign(options, { adoptionDirectory: b21AdoptionDirectory(x.state, options.expected.originalReviewDigest),
    adoptionDigest: b25.adoptionDigest, frozenEvidenceDigest: b25.frozenEvidenceDigest, ownerDecisionDigest: nativeDigest("synthetic B26 exact recovery owner") });
  return { ...x, options, recoveryDirectory: b26RecoveryDirectory(x.state, b25.adoptionDigest) };
}
function evidence(x) {
  const files = [x.spentPath, x.reportPath, x.reviewPath, ...[x.directory, x.options.adoptionDirectory].flatMap(d => readdirSync(d).filter(n => n.endsWith(".json")).map(n => path.join(d, n)))];
  return files.map(nativeArtifactSnapshot);
}
test("B26 bounded inventory refuses foreign, missing, byte-identical replacement, links and escaping paths", windows, t => {
  const id = randomUUID(), proof = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), id), root = inspectNativeOwnedTemp(proof, id).root;
  t.after(() => cleanupNativeOwnedTemp(proof, id));
  const file = path.join(root, "one.txt"); writeFileSync(file, "synthetic"); const snapshot = b26Inventory(root);
  assert.equal(assertB26Remaining(root, snapshot.plan, 0).rows.length, snapshot.rows.length);
  writeFileSync(path.join(root, "foreign.txt"), "foreign"); assert.throws(() => assertB26Remaining(root, snapshot.plan, 0), /foreign_entry/); unlinkSync(path.join(root, "foreign.txt"));
  renameSync(file, file + ".old"); writeFileSync(file, "synthetic");
  assert.throws(() => assertB26Remaining(root, snapshot.plan, 0), /inventory_drift/); unlinkSync(file); renameSync(file + ".old", file);
  const link = path.join(root, "hardlink"); linkSync(file, link);
  try { assert.throws(() => b26Inventory(root), /link_or_object_denied/); } finally { unlinkSync(link); }
  const junction = path.join(root, "junction"); symlinkSync(path.dirname(root), junction, "junction");
  try { assert.throws(() => b26Inventory(root), /link_or_object_denied/); } finally { unlinkSync(junction); }
  assert.throws(() => b26Inventory(root + path.sep + ".."), /scope_invalid/);
});
test("B26 crash checkpoints resume deterministically in order; exact evidence stays; duplicate is no-op", windows, async t => {
  const x = fixture(t), before = evidence(x), stops = [
    ["consumed", "durable", null], ["barrier_ready", "durable", null], ["remove_intent", "durable", 0], ["removed", "effect", 0],
    ["removed", "durable", 1], ["fixture_removed", "durable", null], ["lease_remove_intent", "durable", null],
    ["lease_removed", "effect", null], ["writer_remove_intent", "durable", null], ["writer_removed", "effect", null],
    ["barrier_remove_intent", "durable", null], ["barrier_removed", "effect", null], ["complete", "durable", null]
  ];
  const initialPlan = b26Inventory(x.f.root).plan;
  for (const [phase, kind, target] of stops) {
    const grant = approveB26Recovery(x.options, () => {}, p => { if (p.phase === phase && p.kind === kind && p.target === target) {
      if (phase === "barrier_ready") assert.throws(() => executeB26Recovery(approveB26Recovery(x.options, () => {})), /controller_active/);
      throw Error("synthetic interruption");
    } });
    assert.throws(() => executeB26Recovery(structuredClone(grant)), /approval_unproven/);
    assert.throws(() => executeB26Recovery(grant), /synthetic interruption/);
    assert.throws(() => executeB26Recovery(grant), /grant_consumed/);
    assert.deepEqual(evidence(x), before);
    if (phase === "remove_intent") {
      const now = Date.now(); t.mock.method(Date, "now", () => now + b21AdoptionMaxAgeMs + 1);
      try { assert.throws(() => approveB26Recovery(x.options, () => {}), /authority_expired/); }
      finally { t.mock.restoreAll(); }
      assert.ok(existsSync(x.f.root)); assert.ok(existsSync(x.leasePath)); assert.ok(existsSync(x.writerPath));
    }
    if (existsSync(path.join(x.state, "agent-host-recovery.lock"))) await assert.rejects(acquireWriterLock(x.state), /writer_locked/);
    if (["consumed", "barrier_ready", "remove_intent"].includes(phase)) { assert.ok(existsSync(x.writerPath)); assert.ok(existsSync(x.leasePath)); }
    if (phase === "fixture_removed") { assert.equal(existsSync(x.f.root), false); assert.ok(existsSync(x.leasePath)); assert.ok(existsSync(x.writerPath)); }
    if (phase === "lease_removed") { assert.equal(existsSync(x.leasePath), false); assert.ok(existsSync(x.writerPath)); }
    if (phase === "writer_removed") { assert.equal(existsSync(x.writerPath), false); assert.ok(existsSync(path.join(x.state, "agent-host-recovery.lock"))); }
  }
  const final = executeB26Recovery(approveB26Recovery(x.options, () => {}));
  assert.equal(final.status, "DONE"); assert.equal(final.replay, true); assert.equal(final.removedFixtureEntries, initialPlan.length);
  assert.equal(inspectB26Postflight(x.options).status, "DONE"); assert.deepEqual(evidence(x), before);
  assert.equal(existsSync(path.join(x.recoveryDirectory, ".controller.lock")), false);
  assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), false);
  assert.equal(final.executionAuthorized, false);
  const records = readdirSync(x.recoveryDirectory).map(n => readFileSync(path.join(x.recoveryDirectory, n), "utf8")).join("\n");
  for (const secret of [x.f.root, x.state, x.f.attempt, "return a", "add.cjs"]) assert.ok(!records.includes(secret));
});
test("B26 actual controller exit leaves a signed lease; dead-controller resume completes once", windows, t => {
  const x = fixture(t), module = new URL("./lib/agent-host-hermes-b26-recovery.mjs", import.meta.url).href;
  const source = `import {approveB26Recovery,executeB26Recovery} from ${JSON.stringify(module)}; const options=${JSON.stringify(x.options)};executeB26Recovery(approveB26Recovery(options,()=>{},p=>{if(p.phase==='barrier_ready')process.exit(41)}));`;
  const child = childProcess.spawnSync(process.execPath, ["--input-type=module"], { input: source, encoding: "utf8", windowsHide: true, timeout: 60000 });
  assert.equal(child.status, 41, child.stderr);
  assert.ok(existsSync(path.join(x.recoveryDirectory, ".controller.lock"))); assert.ok(existsSync(x.f.root));
  const result = executeB26Recovery(approveB26Recovery(x.options, () => {}));
  assert.equal(result.status, "DONE"); assert.equal(inspectB26Postflight(x.options).status, "DONE");
});
test("B26 rejects expired, cross-attempt, withdrawn and live/reused/unobservable process authority before writes", windows, t => {
  const x = fixture(t);
  assert.throws(() => approveB26Recovery({ ...x.options, adoptionDigest: "b".repeat(64) }, () => {}), /adoption_mismatch/);
  assert.throws(() => approveB26Recovery({ ...x.options, frozenEvidenceDigest: "b".repeat(64) }, () => {}), /adoption_mismatch/);
  assert.throws(() => approveB26Recovery(x.options), /owner_authority_required/);
  let authorized = true;
  const grant = approveB26Recovery(x.options, () => { if (!authorized) throw Error("synthetic owner withdrawn"); });
  authorized = false; assert.throws(() => executeB26Recovery(grant), /owner withdrawn/);
  assert.equal(existsSync(x.recoveryDirectory), false);
  for (const situation of ["alive", "reused", "unobservable"]) {
    const original = childProcess.execFileSync;
    childProcess.execFileSync = (exe, args, options) => {
      if (exe !== "powershell.exe") return original(exe, args, options);
      if (situation === "unobservable") throw Error("synthetic unavailable");
      const source = Buffer.from(args.at(-1), "base64").toString("utf16le"), pid = Number(/Get-Process -Id (\d+)/.exec(source)[1]);
      return JSON.stringify({ pid, creationTime: situation === "alive" ? "133000000000000000" : "134000000000000000", executable: process.execPath });
    };
    syncBuiltinESMExports();
    try { assert.throws(() => approveB26Recovery(x.options, () => {}), situation === "alive" ? /process_alive/ : situation === "reused" ? /pid_reused/ : /observation_unavailable/); }
    finally { childProcess.execFileSync = original; syncBuiltinESMExports(); }
  }
  const now = Date.now(); t.mock.method(Date, "now", () => now + b21AdoptionMaxAgeMs + 1);
  assert.throws(() => approveB26Recovery(x.options, () => {}), /expired/);
  assert.equal(existsSync(x.recoveryDirectory), false); assert.ok(existsSync(x.f.root));
});
test("B26 partial cleanup refuses new entries and artifact replacement; preserves barrier and remaining pair", windows, t => {
  const x = fixture(t), foreign = path.join(x.f.root, "foreign-after-first-delete.txt");
  const grant = approveB26Recovery(x.options, () => {}, p => { if (p.phase === "removed" && p.kind === "effect" && p.target === 0) writeFileSync(foreign, "foreign synthetic content"); });
  assert.throws(() => executeB26Recovery(grant), /foreign_entry/);
  assert.ok(existsSync(foreign)); assert.ok(existsSync(x.writerPath)); assert.ok(existsSync(x.leasePath));
  assert.ok(existsSync(path.join(x.state, "agent-host-recovery.lock")));
  unlinkSync(foreign);
  for (const file of [x.writerPath, x.leasePath, x.spentPath, x.reviewPath, path.join(x.directory, "03-finalized.json"), path.join(x.f.root, ".roost-smoke-scope")]) {
    const held = path.join(x.f.root, "held-original"); renameSync(file, held); writeFileSync(file, readFileSync(held));
    try { assert.throws(() => approveB26Recovery(x.options, () => {})); }
    finally { unlinkSync(file); renameSync(held, file); }
  }
  const first = path.join(x.recoveryDirectory, "event-00000.json"), raw = readFileSync(first), mutated = JSON.parse(raw);
  mutated.payload.context.frozenEvidenceDigest = "b".repeat(64); writeFileSync(first, JSON.stringify(mutated));
  assert.throws(() => approveB26Recovery(x.options, () => {}), /integrity_unproven/); writeFileSync(first, raw);
  const last = readdirSync(x.recoveryDirectory).filter(n => n.startsWith("event-")).sort().at(-1), held = path.join(x.f.root, "held-event");
  renameSync(path.join(x.recoveryDirectory, last), held);
  try { assert.throws(() => approveB26Recovery(x.options, () => {})); }
  finally { renameSync(held, path.join(x.recoveryDirectory, last)); }
  assert.ok(existsSync(x.writerPath)); assert.ok(existsSync(x.leasePath));
});
test("B26 barrier publication failure is an explicit blocked checkpoint before any original deletion", windows, t => {
  const x = fixture(t), before = b26Inventory(x.f.root), grant = approveB26Recovery(x.options, () => {}), original = fs.openSync;
  fs.openSync = (file, ...args) => {
    if (file === path.join(x.recoveryDirectory, "event-00001.json")) throw Error("synthetic journal unavailable");
    return original(file, ...args);
  }; syncBuiltinESMExports();
  try { assert.throws(() => executeB26Recovery(grant), /journal unavailable/); }
  finally { fs.openSync = original; syncBuiltinESMExports(); }
  assert.deepEqual(b26Inventory(x.f.root).rows, before.rows);
  assert.throws(() => approveB26Recovery(x.options, () => {}), /barrier_publication_incomplete/);
  assert.ok(existsSync(x.writerPath)); assert.ok(existsSync(x.leasePath)); assert.ok(existsSync(path.join(x.state, "agent-host-recovery.lock")));
});
