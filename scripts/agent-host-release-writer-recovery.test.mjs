import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { pathToFileURL } from "node:url";
import contract from "./lib/agent-host-release-contract.cjs";
import { acquireWriterLock, writerLockFilename, writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { releaseRecoveryCandidate, clearReleaseWriterRecovery } from "./lib/agent-host-release-writer-recovery.mjs";
import { observeWindowsProcessIdentity } from "./lib/agent-host-process-identity.mjs";
import { runReleaseStep } from "./lib/agent-host-release-broker.mjs";

const native = { skip: process.platform !== "win32", timeout: 90000 };
const moduleUrl = name => pathToFileURL(path.join(process.cwd(), "scripts", "lib", name)).href;
function stateFixture(directory) {
  const hash = "d".repeat(64), commit = "a".repeat(40), base = "b".repeat(40), at = new Date().toISOString();
  const artifact = { commit: base, imageDigest: `sha256:${"1".repeat(64)}`, configDigest: hash, schemaDigest: hash };
  const manifest = { schemaVersion: "roost-release-manifest-v1",
    repository: { url: "https://github.com/example/certificate", defaultBranch: "main", canonicalDir: directory, candidateBranch: "codex/certificate" },
    deployment: { provider: "coolify", targetId: "certificate", controllerUrl: "https://controller.example.test", url: "https://certificate.example.test",
      imageDigest: `sha256:${"2".repeat(64)}`, configDigest: hash, schemaDigest: hash },
    services: [{ name: "api", healthUrl: "https://certificate.example.test/health", expectedStatus: 200 }],
    baseline: { ...artifact, healthDigest: hash, dataDigest: hash, observedAt: at }, observation: { seconds: 1, intervalSeconds: 1, maxFailures: 0 },
    backup: { digest: hash, bytes: 100, capturedAt: at, restoreVerifiedAt: at, restoreDigest: hash }, rollback: { ...artifact, compatibleSchemaDigests: [hash] },
    cleanup: { repositoryUrl: "https://github.com/example/certificate", canonicalDir: directory, coolifyTargetId: "certificate", ownedResourceIds: [], archiveRepository: true } };
  const snapshot = { requestId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), hostId: randomUUID(), releaseExecutionId: randomUUID(),
    releaserAgentId: randomUUID(), releaserCredentialId: randomUUID(), credentialVersion: 1, reviewId: randomUUID(), materialVersion: hash,
    commit, candidateTree: "c".repeat(40), baseCommit: base, baseTree: "e".repeat(40), releaserRevision: at,
    expiresAt: new Date(Date.now() + 600000).toISOString(), manifest, manifestDigest: contract.releaseDigest(manifest), readinessDigest: hash, configurationDigest: hash };
  const intent = { requestId: randomUUID(), operation: "push", manifestDigest: snapshot.manifestDigest, commit, baseCommit: base, expectedVersion: hash,
    observed: { commit, baseCommit: base, baseTree: snapshot.baseTree, manifestDigest: snapshot.manifestDigest }, parameters: { branch: manifest.repository.candidateBranch } };
  return { release: { id: randomUUID(), manifestDigest: snapshot.manifestDigest, snapshot }, status: "active", expectedVersion: hash,
    journal: [{ id: randomUUID(), operation: "push", intent, createdAt: at, outcome: null }] };
}
async function launchBroker(t, { crashDuringChild = false, rejectForgedReceipt = false, cycles = 1 } = {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "roost-release-writer-native-"));
  mkdirSync(path.join(directory, "launcher"));
  const marker = path.join(directory, "synthetic-effect.txt"), state = stateFixture(directory);
  const client = { hostId: state.release.snapshot.hostId, agentId: state.release.snapshot.releaserAgentId };
  const source = `
import {acquireWriterLock} from ${JSON.stringify(moduleUrl("agent-host-writer-lock.mjs"))};
import {beginReleaseWriterCheckpoint,checkpointReleaseOperation,reserveReleaseChild,bindReleaseChild,recordReleaseChildReceipt,sealReleaseWriterCheckpoint} from ${JSON.stringify(moduleUrl("agent-host-release-writer-recovery.mjs"))};
import {buildWindowsJobLauncher,startWindowsJob} from ${JSON.stringify(moduleUrl("agent-host-windows-job.mjs"))};
const directory=${JSON.stringify(directory)},state=${JSON.stringify(state)},client=${JSON.stringify(client)};
const artifact=await buildWindowsJobLauncher(directory+'\\\\launcher');
const writerLock=await acquireWriterLock(directory);
const context=beginReleaseWriterCheckpoint({writerLock,state,client});
checkpointReleaseOperation(context,state,state.journal[0],client);
let receipt;
for(let index=0;index<${cycles};index++){
const token=reserveReleaseChild(context,{artifact,executable:process.execPath});
const job=await startWindowsJob(artifact,{executable:process.execPath,argv:['--input-type=module','-e',${JSON.stringify(crashDuringChild
    ? "setInterval(()=>{},1000)"
    : `import {writeFileSync} from 'node:fs';if(process.argv[1]==='0')writeFileSync(${JSON.stringify(marker)},'one native effect',{flag:'wx'});`)},String(index)],cwd:directory,environment:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,TMP:process.env.TMP},input:'',durationMs:60000,attempt:token.attemptId,
confirmResume:event=>{const digest=bindReleaseChild(token,event);${crashDuringChild ? "process.send({phase:'assigned',rootPid:event.rootPid,launcherPid:event.launcherPid});" : ""}return digest;}});
receipt=await job.completion;
${rejectForgedReceipt ? "let denied=false;try{recordReleaseChildReceipt(token,JSON.parse(JSON.stringify(receipt)))}catch{denied=true};if(!denied)throw Error('forged_receipt_accepted');" : ""}
recordReleaseChildReceipt(token,receipt);
}
const barrier=sealReleaseWriterCheckpoint(context);
process.send({phase:'sealed',rootPid:receipt.rootPid,launcherPid:receipt.launcherPid,barrier});
setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", source], { windowsHide: true, stdio: ["ignore", "ignore", "pipe", "ipc"] });
  let errors = ""; child.stderr.on("data", b => { errors += b.toString(); });
  const closed = once(child, "close");
  let message;
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed; }
    for (const pid of message ? [message.rootPid, message.launcherPid] : []) {
      let absent = false;
      for (let i = 0; i < 5; i++) { if (observeWindowsProcessIdentity(pid) === null) { absent = true; break; } await new Promise(resolve => setTimeout(resolve, 100)); }
      assert(absent, "Owned native process must be gone before fixture cleanup");
    }
    assert.equal(path.dirname(directory), os.tmpdir()); assert(path.basename(directory).startsWith("roost-release-writer-native-"));
    rmSync(directory, { recursive: true });
  });
  message = await Promise.race([once(child, "message").then(([m]) => m), closed.then(([code]) => { throw Error(`native broker exited ${code}: ${errors}`); })]);
  return { directory, marker, state, client, child, closed, message };
}

test("native broker crash after closed child and before outcome reclaims only exact grant/journal then only reconciles", native, async t => {
  const f = await launchBroker(t, { rejectForgedReceipt: true, cycles: 9 }); assert.equal(f.message.phase, "sealed");
  assert.equal(readFileSync(f.marker, "utf8"), "one native effect");
  // An alive owner cannot be reclaimed, regardless of a closed child barrier.
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) }), /writer_locked/);
  f.child.kill(); await f.closed;
  const saved = readFileSync(path.join(f.directory, writerLockFilename));
  const checkpoint = JSON.parse(saved).releaseCheckpoint;
  assert.equal(checkpoint.registeredChildCount, 9); assert.equal(checkpoint.closedHistory.count, 5); assert.equal(checkpoint.children.length, 4);
  assert(saved.length < 16384, "Closed child history must stay bounded");
  const copied = JSON.parse(JSON.stringify(releaseRecoveryCandidate(f.state, f.client)));
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: copied }), /writer_locked/);
  const changed = structuredClone(f.state); changed.journal[0].intent.requestId = randomUUID();
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(changed, f.client) }), /writer_locked/);
  const forged = JSON.parse(saved); forged.releaseCheckpoint.children = [];
  writeFileSync(path.join(f.directory, writerLockFilename), JSON.stringify(forged));
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) }), /writer_locked/);
  writeFileSync(path.join(f.directory, writerLockFilename), saved);
  const keyPath = path.join(f.directory, JSON.parse(saved).releaseCheckpoint.integrityKey.name), keyBytes = readFileSync(keyPath);
  writeFileSync(keyPath, Buffer.alloc(32));
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) }), /writer_locked/);
  writeFileSync(keyPath, keyBytes); keyBytes.fill(0);
  const altered = JSON.parse(saved); altered.ownerNonce = randomUUID(); writeFileSync(path.join(f.directory, writerLockFilename), JSON.stringify(altered));
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) }), /writer_locked/);
  writeFileSync(path.join(f.directory, writerLockFilename), saved);
  const writer = await acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) });
  assert.equal(writer.releaseRecovery.reconciliationOnly, true);
  assert.throws(() => clearReleaseWriterRecovery(writer, f.state, f.client), /recovery_unproven/);
  assert.throws(() => clearReleaseWriterRecovery(writer, { ...f.state, journal: [] }, f.client), /recovery_unproven/);
  await assert.rejects(writer.release(), /reconciliation_pending/);
  let effects = 0, observations = 0;
  const result = await runReleaseStep({ state: f.state, client: f.client, assertWriter: () => writerRecoveryEvidence(writer),
    github: { push: () => { effects++; throw Error("duplicate effect"); }, reconcile: async () => { observations++;
      return { status: "succeeded", evidence: { remoteCommit: f.state.release.snapshot.commit, remoteTree: f.state.release.snapshot.candidateTree } }; } },
    api: async (route, { body }) => { assert(route.endsWith(`/operations/${f.state.journal[0].id}/outcome`)); f.state.journal[0].outcome = body; return f.state; },
    resources: {}, coolify: {} });
  assert(result.handled); assert.equal(effects, 0); assert.equal(observations, 1); assert.equal(f.state.journal[0].outcome.status, "reconciled");
  assert.equal(readFileSync(f.marker, "utf8"), "one native effect");
  clearReleaseWriterRecovery(writer, f.state, f.client); assert.equal(writer.releaseRecovery, null); await writer.release();
  assert(!existsSync(path.join(f.directory, writerLockFilename)));
});

test("native crash during assigned child retains Writer even after kernel stops child; missing terminal receipt never qualifies", native, async t => {
  const f = await launchBroker(t, { crashDuringChild: true }); assert.equal(f.message.phase, "assigned");
  f.child.kill(); await f.closed;
  for (let i = 0; i < 5 && observeWindowsProcessIdentity(f.message.launcherPid) !== null; i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(observeWindowsProcessIdentity(f.message.rootPid), null); assert.equal(observeWindowsProcessIdentity(f.message.launcherPid), null);
  const before = readFileSync(path.join(f.directory, writerLockFilename));
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) }), /writer_locked/);
  assert.deepEqual(readFileSync(path.join(f.directory, writerLockFilename)), before);
  assert(!existsSync(f.marker));
});

test("fresh active release queue acquires an empty Writer slot; a racing owner still blocks", native, async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "roost-release-writer-native-"));
  const state = stateFixture(directory), client = { hostId: state.release.snapshot.hostId, agentId: state.release.snapshot.releaserAgentId };
  let writer;
  try {
    writer = await acquireWriterLock(directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(state, client) });
    assert.equal(writer.releaseRecovery, null);
    await assert.rejects(acquireWriterLock(directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(state, client) }), /writer_locked/);
    await writer.release(); writer = null;
    assert(!existsSync(path.join(directory, writerLockFilename)));
  } finally {
    if (writer) await writer.release();
    assert.equal(path.dirname(directory), os.tmpdir()); assert(path.basename(directory).startsWith("roost-release-writer-native-")); rmSync(directory, { recursive: true });
  }
});
