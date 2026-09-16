// Fixed B14/B17 policies share mechanics but preserve all earlier spent records.
// Audit evidence never grants activation or authorizes restart/replay.
import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, lstatSync, writeFileSync, readdirSync } from "node:fs";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";
import { hermesB14SmokeScope, hermesB17SmokeScope, hermesB21SmokeScope } from "./agent-host-hermes-smoke-activation.mjs";
const proofs = new WeakMap();
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const deny = () => { throw new Error("hermes_smoke_spent_state_unproven"); };
const b14 = Object.freeze({ name: "b14", prior: ["b13"], scope: hermesB14SmokeScope });
const b17 = Object.freeze({ name: "b17", prior: ["b13", "b14"], scope: hermesB17SmokeScope });
const b21 = Object.freeze({ name: "b21", prior: ["b13", "b14", "b17"], scope: hermesB21SmokeScope });
const b20Events = ["01-barrier.json", "02-prepared.json", "03-grant_consumed.json", "04-lease_remove_intent.json", "05-lease_removed.json",
  "06-writer_remove_intent.json", "07-writer_removed.json", "08-complete.json", "exception-consumed.json", "final-readback.json"];
export function assertHermesB20RecoveryComplete(directory) {
  const journal = path.join(directory, "b20-legacy-recovery"); physicalIdentity(journal);
  let previous = null, first;
  for (const name of b20Events.slice(0, 8)) {
    const file = path.join(journal, name); snapshot(file);
    const bytes = readFileSync(file), record = JSON.parse(bytes);
    if (record.previousDigest !== previous || record.policy !== "roost-b17-legacy-exception-v1"
        || record.ownerDecision !== "ADR-004-v12-B20-exact-legacy-pair" || record.stage !== name.slice(3, -5)) deny();
    first ??= record; if (record.scopeDigest !== first.scopeDigest) deny(); previous = sha(bytes);
  }
  const spent = JSON.parse(readFileSync(path.join(journal, "exception-consumed.json"))), final = JSON.parse(readFileSync(path.join(journal, "final-readback.json")));
  if (spent.reusable !== false || spent.scopeDigest !== first.scopeDigest || final.journalDigest !== previous || final.scopeDigest !== first.scopeDigest
      || !["completed", "leaseAbsent", "writerAbsent", "spentUnchanged", "barrierReleased", "exceptionSpent"].every(k => final[k] === true)) deny();
  for (const item of first.before.spent) {
    const file = path.join(directory, item.name);
    if (!/^hermes-b(?:13|14|17)-smoke-consumed\.json$/.test(item.name) || physicalIdentity(file, false) !== item.identity || sha(readFileSync(file)) !== item.digest) deny();
  }
  if (first.before.spent.length !== 3 || existsSync(path.join(directory, "agent-host-writer.lock")) || existsSync(path.join(directory, "agent-host-recovery.lock"))) deny();
  // B21 never adopts the removed B17 lease or another application's lease.
  if (readdirSync(directory).some(name => name.endsWith(".lease"))) deny();
  return { status: "PASS", journalDigest: previous };
}
function snapshot(file) {
  const identity = physicalIdentity(file, false), stat = lstatSync(file, { bigint: true });
  if (stat.size > 4096n) deny();
  const digest = sha(readFileSync(file)), after = lstatSync(file, { bigint: true });
  if (physicalIdentity(file, false) !== identity || after.size !== stat.size || after.mtimeNs !== stat.mtimeNs) deny();
  return JSON.stringify([identity, digest, String(stat.size), String(stat.mtimeNs)]);
}
function prepare(directory, policy) {
  const parent = physicalIdentity(directory), prior = policy.prior.map(name => path.join(directory, `hermes-${name}-smoke-consumed.json`)),
    file = path.join(directory, `hermes-${policy.name}-smoke-consumed.json`);
  if (existsSync(path.join(directory, "agent-host-writer.lock")) || existsSync(file)) deny();
  if (policy === b21) { assertHermesB20RecoveryComplete(directory); prior.push(...b20Events.map(name => path.join(directory, "b20-legacy-recovery", name))); }
  const original = prior.map(snapshot), proof = Object.freeze({});
  proofs.set(proof, { directory, parent, prior, original, file, policy, used: false, reserved: false });
  return proof;
}
function inspect(proof, policy) {
  const saved = proofs.get(proof);
  if (!saved || saved.policy !== policy || physicalIdentity(saved.directory) !== saved.parent
      || saved.prior.some((file, index) => snapshot(file) !== saved.original[index])) deny();
  if (saved.reserved ? snapshot(saved.file) !== saved.current : existsSync(saved.file)) deny();
  return Object.freeze(policy === b14 ? { b13RecordPreserved: true, b14SpentRecordRetained: saved.reserved }
    : policy === b17 ? { b13RecordPreserved: true, b14RecordPreserved: true, b17SpentRecordRetained: saved.reserved }
      : { b13RecordPreserved: true, b14RecordPreserved: true, b17RecordPreserved: true, b20RecoveryPreserved: true, b21SpentRecordRetained: saved.reserved });
}
function record(proof, identity, state, reason, policy) {
  const saved = proofs.get(proof);
  if (!saved || saved.used || saved.policy !== policy) deny();
  saved.used = true;
  inspect(proof, policy);
  writeFileSync(saved.file, JSON.stringify({ schemaVersion: 1, scope: policy.scope, state,
    attemptDigest: sha(JSON.stringify(identity)), at: new Date().toISOString(), ...(reason ? { reason } : {}) }) + "\n", { flag: "wx", mode: 0o600 });
  saved.current = snapshot(saved.file); saved.reserved = true;
  return inspect(proof, policy);
}
function blocked(proof, identity, reason, policy) {
  if (!/^[a-z][a-z0-9_]{2,100}$/.test(reason)) deny();
  return record(proof, identity, "preflight_blocked", reason, policy);
}
export const prepareHermesB14Audit = directory => prepare(directory, b14);
export const assertHermesB14Audit = proof => inspect(proof, b14);
export const reserveHermesB14Audit = (proof, identity) => record(proof, identity, "dispatch_reserved", undefined, b14);
export const closeBlockedHermesB14Audit = (proof, identity, reason) => blocked(proof, identity, reason, b14);
export const prepareHermesB17Audit = directory => prepare(directory, b17);
export const assertHermesB17Audit = proof => inspect(proof, b17);
export const reserveHermesB17Audit = (proof, identity) => record(proof, identity, "dispatch_reserved", undefined, b17);
export const closeBlockedHermesB17Audit = (proof, identity, reason) => blocked(proof, identity, reason, b17);
export const prepareHermesB21Audit = directory => prepare(directory, b21);
export const assertHermesB21Audit = proof => inspect(proof, b21);
export const reserveHermesB21Audit = (proof, identity) => record(proof, identity, "dispatch_reserved", undefined, b21);
export const closeBlockedHermesB21Audit = (proof, identity, reason) => blocked(proof, identity, reason, b21);
