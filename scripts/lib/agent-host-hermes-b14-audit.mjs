// Spent records are audit evidence, never activation authority. B14 cannot
// overwrite, delete, deserialize or otherwise reuse the B13 authorization.
import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, lstatSync, writeFileSync } from "node:fs";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";
import { hermesB14SmokeScope } from "./agent-host-hermes-smoke-activation.mjs";
const proofs = new WeakMap();
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const deny = () => { throw new Error("hermes_b14_spent_state_unproven"); };
function snapshot(file) {
  const identity = physicalIdentity(file, false), stat = lstatSync(file, { bigint: true });
  if (stat.size > 4096n) deny();
  const digest = sha(readFileSync(file)), after = lstatSync(file, { bigint: true });
  if (physicalIdentity(file, false) !== identity || after.size !== stat.size || after.mtimeNs !== stat.mtimeNs) deny();
  return JSON.stringify([identity, digest, String(stat.size), String(stat.mtimeNs)]);
}
export function prepareHermesB14Audit(directory) {
  const parent = physicalIdentity(directory), prior = path.join(directory, "hermes-b13-smoke-consumed.json"),
    file = path.join(directory, "hermes-b14-smoke-consumed.json");
  if (existsSync(path.join(directory, "agent-host-writer.lock")) || existsSync(file)) deny();
  const original = snapshot(prior), proof = Object.freeze({});
  proofs.set(proof, { directory, parent, prior, original, file, used: false, reserved: false });
  return proof;
}
export function assertHermesB14Audit(proof) {
  const saved = proofs.get(proof);
  if (!saved || physicalIdentity(saved.directory) !== saved.parent || snapshot(saved.prior) !== saved.original) deny();
  if (saved.reserved ? snapshot(saved.file) !== saved.current : existsSync(saved.file)) deny();
  return Object.freeze({ b13RecordPreserved: true, b14SpentRecordRetained: saved.reserved });
}
function record(proof, identity, state, reason) {
  const saved = proofs.get(proof);
  if (!saved || saved.used) deny();
  saved.used = true;
  assertHermesB14Audit(proof);
  writeFileSync(saved.file, JSON.stringify({ schemaVersion: 1, scope: hermesB14SmokeScope, state,
    attemptDigest: sha(JSON.stringify(identity)), at: new Date().toISOString(), ...(reason ? { reason } : {}) }) + "\n", { flag: "wx", mode: 0o600 });
  saved.current = snapshot(saved.file); saved.reserved = true;
  return assertHermesB14Audit(proof);
}
export const reserveHermesB14Audit = (proof, identity) => record(proof, identity, "dispatch_reserved");
export function closeBlockedHermesB14Audit(proof, identity, reason) {
  if (!/^[a-z][a-z0-9_]{2,100}$/.test(reason)) deny();
  return record(proof, identity, "preflight_blocked", reason);
}
