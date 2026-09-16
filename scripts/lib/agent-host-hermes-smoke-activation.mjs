import { createHash } from "node:crypto";
import { assertHermesLaunchAdmission, consumeHermesLaunchAdmission } from "./agent-host-hermes-launch-admission.mjs";
import { assertCodingAuthority } from "./agent-host-native-authority.mjs";
const grants = new WeakMap();
export const hermesSmokeScope = "one_real_hermes_coding_smoke_only";
const hash = v => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const deny = () => { throw Object.assign(new Error("hermes_smoke_activation_blocked"), { protocolAdmission: true, retryable: false }); };
function binding(options, receipt) {
  assertHermesLaunchAdmission(receipt, options);
  const e = options.envelope, c = e.contract;
  assertCodingAuthority(e);
  if (c.modelSelection.model !== "gpt-5.6-sol" || c.modelSelection.reasoningEffort !== "medium"
      || c.budgets.maxAttempts !== 1 || e.identity.attempt !== 1 || c.budgets.maxDurationSeconds > 300
      || c.nativeBoundary.runtime.required || c.nativeBoundary.runtime.ports.length
      || JSON.stringify(c.nativeBoundary.writePaths) !== '["add.cjs"]') deny();
  return hash([receipt.digest, e.identity, e.revisions, options.provider, options.repositoryPath, c]);
}
// Trusted local Worker call only, after explicit owner authorization. A function
// authority is never deserialized from API/config. This factory does not spawn.
export function issueHermesSmokeActivation(options, receipt, assertOwnerAuthority) {
  if (typeof assertOwnerAuthority !== "function") deny();
  assertOwnerAuthority();
  const seal = binding(options, receipt), grant = Object.freeze({});
  grants.set(grant, { envelope: options.envelope, receipt, seal, at: Date.now(), monotonic: performance.now(), used: false, assertOwnerAuthority });
  return grant;
}
export function consumeHermesSmokeActivation(grant, options, consumption) {
  const saved = grants.get(grant);
  if (!saved || saved.used) deny();
  saved.used = true; // Every consumption attempt, including mismatch, burns it.
  const age = performance.now() - saved.monotonic;
  if (age < 0 || age >= 60000 || Date.now() < saved.at || Date.now() - saved.at >= 60000
      || saved.envelope !== options.envelope || binding(options, saved.receipt) !== saved.seal) deny();
  saved.assertOwnerAuthority();
  const handoff = consumeHermesLaunchAdmission(saved.receipt, options, consumption);
  return Object.freeze({ ...handoff, activation: Object.freeze({ scope: hermesSmokeScope, policyQualified: true,
    activationAuthorized: true, spawnStarted: false, qualificationDigest: saved.receipt.digest }) });
}
export function revokeHermesSmokeActivation(grant) { grants.delete(grant); }
