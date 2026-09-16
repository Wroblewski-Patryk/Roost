import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, realpathSync } from "node:fs";
import { createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp, physicalIdentity, nativeDigest } from "./lib/agent-host-native-footprint.mjs";
import { prepareLegacyB17Exception, prepareSyntheticB17Exception, executeLegacyB17Exception } from "./lib/agent-host-b17-legacy-exception.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
const clear = () => ({ ownerAbsent: true, ownerChildren: 0, matchingExecutables: 0, jobLaunchers: 0, historicalBinding: "unavailable_owner_exception" });
function fixture(t) {
  const attempt = randomUUID(), ownership = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt), state = inspectNativeOwnedTemp(ownership, attempt).root;
  t.after(() => { assert.equal(cleanupNativeOwnedTemp(ownership, attempt).remaining, 0); assert.equal(existsSync(state), false); });
  const application = nativeDigest("synthetic-application"), writer = "agent-host-writer.lock", lease = `application-${application}.lease`;
  writeFileSync(path.join(state, writer), JSON.stringify({ ownerPid: 123456, ownerNonce: "synthetic-owner" }));
  writeFileSync(path.join(state, lease), JSON.stringify({ writer: "synthetic-owner", application }));
  const spent = ["b13", "b14", "b17"].map(n => `hermes-${n}-smoke-consumed.json`);
  for (const n of spent) writeFileSync(path.join(state, n), JSON.stringify({ scope: n, spent: true }));
  const item = name => ({ name, identity: physicalIdentity(path.join(state, name), false), digest: createHash("sha256").update(readFileSync(path.join(state, name))).digest("hex") });
  const binding = { policy: "roost-b17-legacy-exception-v1", ownerDecision: "ADR-004-v12-B20-exact-legacy-pair", stateIdentity: physicalIdentity(state),
    writer: item(writer), lease: item(lease), spent: spent.map(item), historicalJobDigest: "a".repeat(64), historicalRootDigest: "b".repeat(64) };
  const options = { stateDirectory: state, binding, ownership, attempt, assertOwnerAuthority() {}, processCheck: clear };
  return { state, writer, lease, binding, options, item,
    prepare: extra => prepareSyntheticB17Exception({ ...options, ...extra }),
    stages: () => readdirSync(path.join(state, "b20-legacy-recovery")).filter(n => /^\d/.test(n)).sort().map(n => JSON.parse(readFileSync(path.join(state, "b20-legacy-recovery", n)))),
    present: name => existsSync(path.join(state, name)) };
}
test("B20 exact synthetic pair: barrier, spent grant, lease then Writer, complete readback; no replay", async t => {
  const x = fixture(t), grant = x.prepare();
  await assert.rejects(acquireWriterLock(x.state), /writer_locked/);
  assert.throws(() => executeLegacyB17Exception(structuredClone(grant)), /unproven/);
  const result = executeLegacyB17Exception(grant);
  assert.equal(result.completed, true); assert.equal(result.barrierReleased, true);
  assert.deepEqual(x.stages().map(s => s.stage), ["barrier", "prepared", "grant_consumed", "lease_remove_intent", "lease_removed", "writer_remove_intent", "writer_removed", "complete"]);
  assert.equal(x.present(x.writer), false); assert.equal(x.present(x.lease), false);
  for (const saved of x.binding.spent) assert.deepEqual(x.item(saved.name), saved);
  assert.equal(JSON.stringify(x.stages()).includes(x.state), false);
  assert.throws(() => executeLegacyB17Exception(grant), /spent/);
  assert.throws(() => x.prepare(), /new_owner_approval_required/);
});
test("B20 production pin and genuine temp proof reject arbitrary paths/JSON", t => {
  const x = fixture(t);
  assert.throws(() => prepareLegacyB17Exception(x.options), /scope_disabled_or_mismatch/);
  assert.throws(() => x.prepare({ ownership: structuredClone(x.options.ownership) }));
  assert.equal(x.present("agent-host-recovery.lock"), false);
});
for (const mode of ["digest", "identity", "order", "spent", "additional_lease", "additional_writer"]) test(`B20 ${mode} mismatch stops before deletion`, t => {
  const x = fixture(t), grant = x.prepare();
  if (mode === "digest") writeFileSync(path.join(x.state, x.lease), "changed");
  if (mode === "identity") { const file = path.join(x.state, x.lease), copy = file + ".copy"; writeFileSync(copy, readFileSync(file)); renameSync(copy, file); }
  if (mode === "order") { const file = path.join(x.state, "b20-legacy-recovery", "02-prepared.json"); const value = JSON.parse(readFileSync(file)); value.intendedOrder = ["writer", "application_lease"]; writeFileSync(file, JSON.stringify(value)); }
  if (mode === "spent") writeFileSync(path.join(x.state, x.binding.spent[0].name), "changed");
  if (mode === "additional_lease") writeFileSync(path.join(x.state, "application-foreign.lease"), "{}");
  if (mode === "additional_writer") writeFileSync(path.join(x.state, "foreign-writer.lock"), "{}");
  assert.throws(() => executeLegacyB17Exception(grant)); assert.equal(x.present(x.writer), true); assert.equal(x.present(x.lease), true);
  assert.equal(x.present("agent-host-recovery.lock"), true); assert.throws(() => executeLegacyB17Exception(grant), /spent/);
});
for (const mode of ["owner", "descendant", "executable", "launcher", "expiry", "revoked"]) test(`B20 fresh ${mode} failure preserves exact pair`, t => {
  const x = fixture(t); let stop = false;
  const grant = x.prepare({ assertOwnerAuthority() { if (stop && mode === "revoked") throw Error("revoked"); }, processCheck() {
    const value = clear(); if (stop) { if (mode === "owner") value.ownerAbsent = false; if (mode === "descendant") value.ownerChildren = 1;
      if (mode === "executable") value.matchingExecutables = 1; if (mode === "launcher") value.jobLaunchers = 1; } return value;
  } });
  stop = true; const now = Date.now;
  try { if (mode === "expiry") Date.now = () => now() + 60001; assert.throws(() => executeLegacyB17Exception(grant)); }
  finally { Date.now = now; }
  assert.equal(x.present(x.writer), true); assert.equal(x.present(x.lease), true);
});
test("B20 journal publication fault consumes grant without deleting pair", t => {
  const x = fixture(t), grant = x.prepare();
  writeFileSync(path.join(x.state, "b20-legacy-recovery", "03-grant_consumed.json"), "synthetic collision");
  assert.throws(() => executeLegacyB17Exception(grant)); assert.equal(x.present(x.writer), true); assert.equal(x.present(x.lease), true);
  assert.equal(x.present("b20-legacy-recovery/exception-consumed.json"), true); assert.throws(() => executeLegacyB17Exception(grant), /spent/);
});
test("B20 partial deletion retains Writer/barrier and cannot resume without new explicit approval", async t => {
  const x = fixture(t), grant = x.prepare({ processCheck() { if (!x.present(x.lease)) throw Error("synthetic_process_appeared"); return clear(); } });
  assert.throws(() => executeLegacyB17Exception(grant), /synthetic_process_appeared/);
  assert.equal(x.present(x.lease), false); assert.equal(x.present(x.writer), true); assert.equal(x.stages().at(-1).stage, "lease_removed");
  await assert.rejects(acquireWriterLock(x.state), /writer_locked/);
  assert.throws(() => x.prepare(), /new_owner_approval_required/); assert.throws(() => executeLegacyB17Exception(grant), /spent/);
});
test("B20 foreign lease appearing during process observation is caught before deletion", t => {
  const x = fixture(t); let replace = false;
  const grant = x.prepare({ processCheck() { if (replace) writeFileSync(path.join(x.state, "foreign.lease"), "{}"); return clear(); } });
  replace = true; assert.throws(() => executeLegacyB17Exception(grant), /additional_or_missing/);
  assert.equal(x.present(x.writer), true); assert.equal(x.present(x.lease), true);
});
