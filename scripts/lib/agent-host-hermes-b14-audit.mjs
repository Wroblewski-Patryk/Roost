// Fixed B14/B17 policies share mechanics but preserve all earlier spent records.
// Audit evidence never grants activation or authorizes restart/replay.
import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, lstatSync, writeFileSync } from "node:fs";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";
import { hermesB14SmokeScope, hermesB17SmokeScope } from "./agent-host-hermes-smoke-activation.mjs";
const proofs = new WeakMap();
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const deny = () => { throw new Error("hermes_smoke_spent_state_unproven"); };
const b14 = Object.freeze({ name: "b14", prior: ["b13"], scope: hermesB14SmokeScope });
const b17 = Object.freeze({ name: "b17", prior: ["b13", "b14"], scope: hermesB17SmokeScope });
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
    : { b13RecordPreserved: true, b14RecordPreserved: true, b17SpentRecordRetained: saved.reserved });
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
