import { createHash } from "node:crypto";
import fixed from "./agent-host-fixed-program.cjs";
import { inspectFixedContainment } from "./agent-host-fixed-execution.mjs";
import { writerRecoveryEvidence } from "./agent-host-writer-lock.mjs";
import { assertFreshExecutionContext } from "./agent-host-execution-context.mjs";
import ready from "./agent-host-ready-context.cjs";
import { inspectTrustedPilotDecision } from "./agent-host-trusted-pilot.mjs";

export const hostContainmentVersion = "roost-host-containment-admission-v1";
const receipts = new WeakMap(), attempts = new WeakSet();
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
function deny() {
  throw Object.assign(Error("host_containment_admission_blocked"), { protocolAdmission: true, retryable: false,
    outcome: "policy_blocked", publicMessage: "Host containment proof is missing, changed, expired or consumed.",
    details: { schemaVersion: hostContainmentVersion, reason: "host_containment_admission_blocked" } });
}

// No real-provider execution issuer exists. The sole execution source is the existing
// opaque, exact-binary fixed-program grant. Its closed semantics are NOT an OS
// sandbox and cannot attest that arbitrary code lacks host APIs. Job receipts,
// JSON, signatures supplied on wire and config booleans cannot enter this registry.
// An operator-provisioned private risk decision can qualify trusted pilot policy,
// but never substitutes for this execution source. It does not prove OS isolation.
function snapshot(grant, pilot) {
  const s = inspectFixedContainment(grant);
  const c = s.claimed;
  const writerDigest = hash(writerRecoveryEvidence(s.writerLock));
  const acceptance = pilot ? inspectTrustedPilotDecision(pilot.configurationPath, s, writerDigest, pilot.provider) : null;
  return { source: s, acceptance, binding: {
    provider: fixed.declaration, runtime: s.runtime,
    profileDigest: hash(fixed.declaration), configDigest: hash(s.configuration),
    identity: s.envelope.identity, inputSeal: s.envelope.seal, revisions: s.envelope.revisions,
    readyPinDigest: hash(c.metadata?.readyContextPin),
    claimDigest: hash({ id: c.id, workspaceId: c.workspaceId, taskId: c.taskId, applicationId: c.applicationId,
      attempt: c.attempt, lease: hash(c.leaseToken), startedAt: c.startedAt, checkpoint: c.checkpoint }),
    writerDigest,
    filesystemScope: s.filesystemScope, allowedHostControlCapabilities: [], expiresAt: s.expiresAt,
    ...(acceptance ? { trustedPilot: acceptance } : {})
  } };
}
function checkRequest(options, consumption, current) {
  const s = current.source;
  const capabilities = options.hostControlCapabilities === undefined ? [] : options.hostControlCapabilities;
  if (current.acceptance ? !options.trustedPilot || hash(options.trustedPilot.provider) !== hash(current.acceptance.provider)
      : options.trustedPilot !== undefined) deny();
  if (!fixed.configuration(options.provider) || options.fixedGrant !== s.grant
      || options.envelope !== s.envelope || consumption.claimed !== s.claimed
      || options.repositoryPath !== s.repositoryPath || options.writerLock !== s.writerLock
      || options.sandbox !== "workspace-write"
      || !Array.isArray(capabilities) || capabilities.length
      || options.filesystemScope !== undefined && hash(options.filesystemScope) !== hash(s.filesystemScope)) deny();
  consumption.assertAuthority();
  ready.assertReadyContext(consumption.fresh.taskContext, consumption.fresh.applicationContext, consumption.claimed);
  ready.assertRiskAdmission(consumption.fresh.taskContext, consumption.claimed, consumption.currentCommit);
  assertFreshExecutionContext(s.envelope.revisions.context, consumption.fresh, consumption.claimed);
}
function live(saved) {
  try {
    const now = Date.now(), elapsed = performance.now() - saved.monotonic;
    if (now < saved.issuedAt || now >= saved.expiresAt || elapsed < 0 || elapsed >= saved.lifetime) deny();
    const current = snapshot(saved.grant, saved.pilot);
    if (hash(current.binding) !== saved.bindingDigest) deny();
    return current;
  } catch (error) { saved.phase = "denied"; throw error; }
}

export function prepareFixedHostContainment(options, consumption) {
  if (options.trustedPilot !== undefined) deny();
  return prepareContainment(options, consumption);
}

// Same registry, freshness, one-attempt consumption and runner checks. Only the
// existing closed fixture can qualify this first policy slice. A real provider
// still requires its own genuine pinned installation/model/Job/budget grant;
// the decision must never turn an arbitrary executable into a fixed fixture.
export function prepareTrustedProviderPilot(options, consumption) {
  if (!options.trustedPilot || Object.keys(options.trustedPilot).sort().join() !== "configurationPath,provider"
      || typeof options.trustedPilot.configurationPath !== "string") deny();
  return prepareContainment(options, consumption, options.trustedPilot);
}
function prepareContainment(options, consumption, pilot) {
  try {
    if (attempts.has(options.fixedGrant)) deny();
    const current = snapshot(options.fixedGrant, pilot);
    checkRequest(options, consumption, current);
    const issuedAt = Date.now(), expiresAt = Math.min(Date.parse(current.binding.expiresAt),
      current.acceptance ? Date.parse(current.acceptance.expiresAt) : Infinity);
    if (!Number.isFinite(expiresAt) || expiresAt <= issuedAt || expiresAt - issuedAt > 60000) deny();
    const binding = structuredClone(current.binding), bindingDigest = hash(binding);
    const receipt = freeze({ schemaVersion: hostContainmentVersion, evidenceClass: "closed_fixture_only",
      systemIsolation: false, realProviderAdmitted: false, issuedAt, expiresAt, binding, bindingDigest,
      ...(pilot ? { mode: "trusted_provider_pilot", residualRiskAccepted: true, arbitraryProviderAdmission: false, fullAutonomy: false } : {}) });
    attempts.add(options.fixedGrant);
    receipts.set(receipt, { grant: options.fixedGrant, envelope: options.envelope, bindingDigest, issuedAt, expiresAt,
      pilot: pilot ? structuredClone(pilot) : null,
      lifetime: expiresAt - issuedAt, monotonic: performance.now(), phase: "prepared" });
    return receipt;
  } catch { deny(); }
}

// Spent before any handoff, including failed checks. A copied/tampered object
// has no registry entry. No JSON loader, renewal or alternative issuer exists.
export function consumeHostContainment(receipt, options, consumption) {
  const saved = receipts.get(receipt);
  try {
    if (!saved || saved.phase !== "prepared") deny();
    saved.phase = "denied";
    if (receipt.schemaVersion !== hostContainmentVersion || saved.grant !== options.fixedGrant
        || saved.envelope !== options.envelope
        || saved.pilot && hash(options.trustedPilot) !== hash(saved.pilot)) deny();
    checkRequest(options, consumption, live(saved));
    saved.phase = "consumed";
    return receipt;
  } catch { deny(); }
}

// Final input/grant admission can still fail after proof consumption. Such a
// partial handoff must never leave a consumed proof usable by the runner.
export function revokeHostContainment(receipt) {
  const saved = receipts.get(receipt);
  if (saved) saved.phase = "denied";
}

// The existing fixed runner rechecks the same consumed attempt immediately
// before process creation and suspended-process resume; this grants no retry.
export function assertHostContainmentAttempt(receipt, grant) {
  try {
    const saved = receipts.get(receipt);
    if (!saved || saved.phase !== "consumed" || saved.grant !== grant) deny();
    live(saved);
  } catch { deny(); }
}
