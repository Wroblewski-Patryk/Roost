import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { generateKeyPairSync, sign, randomUUID, randomBytes } from "node:crypto";
import { createOwnerTicketFixture as setup } from "./fixtures/owner-ticket.mjs";
import { verifyServerOwnerTicket, assertOwnerTicketIssuer } from "./lib/agent-host-owner-ticket.mjs";
import { trustedPilotBytes } from "./lib/agent-host-trusted-pilot.mjs";
import { prepareTrustedProviderPilot } from "./lib/agent-host-containment.mjs";
import { prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { runFixedExecution } from "./lib/agent-host-fixed-execution.mjs";
import providers from "./lib/agent-host-provider-contract.cjs";
const windows = { skip: process.platform !== "win32", timeout: 60000 };
function noProcesses(fn) {
  const methods = ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"], originals = new Map(); let starts = 0;
  for (const m of methods) { originals.set(m, cp[m]); cp[m] = () => { starts++; throw Error("unexpected_process"); }; }
  syncBuiltinESMExports(); try { fn(); assert.equal(starts, 0); }
  finally { for (const [m,f] of originals) cp[m] = f; syncBuiltinESMExports(); }
}
function noEffects(x) {
  assert.equal(fs.statSync(path.join(x.location.root, "repository", "synthetic-effect.bin")).size, 0);
  assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
}
for (const backend of ["codex_responses", "ollama_loopback"]) test(`${backend} synthetic owner ticket validates the exact existing fixed boundary`, windows, async t => {
  const x = await setup(t, backend); let result;
  noProcesses(() => { result = verifyServerOwnerTicket(x.request); });
  assert.equal(result.launchAuthority, false); assert.equal(result.realIssuerQualified, false); assert.equal(result.transportQualified, false);
  // A validation result is not a containment receipt and cannot authorize launch.
  assert.notEqual(result.qualification, "closed_fixture_only");
  x.options.containmentReceipt = prepareTrustedProviderPilot(x.options, x.authority);
  const receipt = x.options.containmentReceipt;
  for (const k of ["systemIsolation", "realProviderAdmitted", "arbitraryProviderAdmission", "fullAutonomy"]) assert.equal(receipt[k], false);
  const launch = prepareProviderLaunch(x.options, x.authority);
  const executed = await runFixedExecution(launch.grant, { remainingMs: () => 30000 });
  assert.equal(executed.verification.effectBytes, 22); assert.equal(executed.verification.job.activeProcesses, 0);
  assert.equal(executed.verification.cleanup.fixtureAbsent, true);
  assert.equal(providers.projectProvider({ kind: "hermes_codex", executionSupported: true }).executionSupported, false);
});
const cases = {
  wrongIssuer: x => { x.request.ticket.payload.issuer = "https://other.example.invalid"; },
  wrongKeyId: x => { x.request.ticket.payload.keyId = "unknown"; },
  signature: x => { x.request.ticket.signature = "0".repeat(128); },
  localPublicSubstitution: x => { x.request.localPublicKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }); },
  expired: x => { x.request.ticket.payload.expiresAt = x.request.ticket.payload.issuedAt; },
  notYetValid: x => { x.request.ticket.payload.notBefore = new Date(x.request.expected.clock.wall + 10000).toISOString(); },
  excessiveLifetime: x => { x.request.ticket.payload.expiresAt = new Date(x.request.expected.clock.wall + 61000).toISOString(); },
  clockRollback: x => { x.request.expected.clock.wall--; },
  monotonicRollback: x => { x.request.expected.clock.monotonic--; },
  clockDiscontinuity: x => { x.request.expected.clock.wall += 2000; },
  replay: x => { x.request.consumeAck = x.consume(); },
  reissuedSpentAttempt: x => {
    x.request.ticket.payload.ticketId = randomUUID(); x.request.ticket.payload.nonce = randomBytes(32).toString("hex");
    x.signObject(x.request.ticket); x.request.consumeAck = x.consume();
  },
  ackReplayToNewChallenge: x => { x.request.expected.challenge = "f".repeat(64); },
  ackSignature: x => { x.request.consumeAck.signature = "0".repeat(128); },
  revokedKey: x => { x.request.server.key.state = "revoked"; },
  retiredKey: x => { x.request.server.key.state = "retired"; },
  rotation: x => { x.request.server.key.epoch++; },
  revokedDecision: x => { x.request.server.decisionState = "revoked"; },
  revisedDecision: x => { x.request.server.decisionRevision++; },
  offline: x => { x.request.server = undefined; },
  noConsume: x => { x.request.consumeAck = undefined; },
  staleOnlineState: x => { x.request.server.checkedAt = new Date(x.request.expected.clock.wall - 6000).toISOString(); },
  changedClaim: x => { x.request.expected.claimDigest = "f".repeat(64); },
  workerSelfSigned: x => {
    const keys = generateKeyPairSync("ed25519");
    x.request.ticket.signature = sign(null, trustedPilotBytes(x.request.ticket.payload), keys.privateKey).toString("hex");
    x.request.localPublicKey = keys.publicKey.export({ type: "spki", format: "pem" });
  },
  installation: x => { x.request.expected.installationId = "00000000-0000-4000-8000-000000000099"; },
  workspace: x => { x.request.expected.workspaceId = "00000000-0000-4000-8000-000000000099"; }
};
const bindings = {
  task: a => { a.scope.taskId = "00000000-0000-4000-8000-000000000099"; },
  attempt: a => { a.provider.managedBackend.context.identityDigest = "f".repeat(64); },
  ready: a => { a.provider.managedBackend.context.revisionsDigest = "f".repeat(64); },
  writer: a => { a.scope.writerDigest = "f".repeat(64); },
  input: a => { a.scope.inputSeal = "f".repeat(64); },
  runtime: a => { a.provider.runtimeDigest = "f".repeat(64); },
  profile: a => { a.provider.profile.identity = "f".repeat(64); },
  config: a => { a.provider.configurationDigest = "f".repeat(64); },
  backend: a => { a.provider.modelSelection.backend = "ollama_loopback"; },
  model: a => { a.provider.modelSelection.modelSelection.model = "gpt-6-astra"; },
  reasoning: a => { a.provider.modelSelection.modelSelection.reasoningEffort = "high"; },
  scope: a => { a.scope.filesystemDigest = "f".repeat(64); },
  budget: a => { a.provider.managedBackend.context.budgetDigest = "f".repeat(64); },
  release: a => { a.provider.managedBackend.context.reviewRecoveryDigest = "f".repeat(64); },
  risk: a => { a.provider.managedBackend.context.riskDigest = "f".repeat(64); },
  noRiskAcknowledgement: a => { a.residualRiskAccepted = false; }
};
for (const [name, change] of Object.entries(bindings)) cases[name] = x => change(x.request.expected.acceptance);
for (const [name, mutate] of Object.entries(cases)) test(`owner ticket denies ${name} before target/effect`, windows, async t => {
  const x = await setup(t); mutate(x);
  noProcesses(() => assert.throws(() => verifyServerOwnerTicket(x.request), /server_owner_ticket_blocked/)); noEffects(x);
});
test("signed forged Worker acceptance is not an issuer decision", () => {
  for (const change of [{ authType: "api_key" }, { authType: "agent" }, { userId: "worker" }, { workspaceRole: "admin" }]) {
    const auth = { authType: "user", workspaceRole: "owner", workspaceId: "workspace", userId: "owner", ...change };
    noProcesses(() => assert.throws(() => assertOwnerTicketIssuer(auth, {
      workspaceId: "workspace", primaryOwnerId: "owner", actorUserId: auth.userId, explicitAcceptance: true, state: "accepted"
    })));
  }
});
test("validator result cannot substitute existing one-attempt receipt", windows, async t => {
  const x = await setup(t), result = verifyServerOwnerTicket(x.request);
  x.options.containmentReceipt = result;
  noProcesses(() => assert.throws(() => prepareProviderLaunch(x.options, x.authority))); noEffects(x);
});
