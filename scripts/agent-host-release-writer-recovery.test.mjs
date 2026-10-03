import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { pathToFileURL } from "node:url";
import contract from "./lib/agent-host-release-contract.cjs";
import { acquireWriterLock, writerLockFilename, writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { releaseRecoveryCandidate, clearReleaseWriterRecovery, qualifyReleaseWriterReclaim } from "./lib/agent-host-release-writer-recovery.mjs";
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
function gitSetStateFixture(directory,{publication=false}={}){
 const state=stateFixture(directory),s=state.release.snapshot,m=s.manifest,targetId=m.deployment.targetId;
 const target={targetId,name:'web',dockerfile:'/apps/web/Dockerfile',configDigest:m.deployment.configDigest,
  baseline:{commit:s.baseCommit,tree:s.baseTree,imageDigest:m.baseline.imageDigest,configDigest:m.baseline.configDigest}};
 m.schemaVersion='roost-release-manifest-v2';m.purpose='application_release';m.deployment.provider='coolify_git_set';delete m.deployment.imageDigest;
 m.deployment.targets=[target];m.deployment.publicOrigins=[m.deployment.url];m.deployment.configDigest=contract.releaseDigest([{targetId,configDigest:target.configDigest}]);
 m.baseline.configDigest=m.rollback.configDigest=m.deployment.configDigest;delete m.baseline.imageDigest;delete m.rollback.imageDigest;
 m.deployment.artifactSetDigest=contract.gitSetArtifactDigest(m,s);m.baseline.artifactSetDigest=m.rollback.artifactSetDigest=contract.gitSetArtifactDigest(m,s,true);
 m.cleanup.archiveRepository=false;m.cleanup.protectedResourceIds=[targetId,target.baseline.imageDigest];s.manifestDigest=state.release.manifestDigest=contract.releaseDigest(m);
 state.journal[0].operation=state.journal[0].intent.operation='rollback';state.journal[0].intent.manifestDigest=s.manifestDigest;
 state.journal[0].intent.parameters={targetId,commit:m.rollback.commit,artifactSetDigest:m.rollback.artifactSetDigest,configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest};
 if(publication){const releaseId=randomUUID(),expectedVersion='1'.repeat(64),closureId=randomUUID();
  s.baselineRestart={releaseId,expectedVersion,closureId,consentDigest:'2'.repeat(64)};
  s.publishedGitBasis={schemaVersion:'roost-release-published-git-v1',releaseId,expectedVersion,closureId,closureDigest:'3'.repeat(64),
   pushOperationId:randomUUID(),prOperationId:randomUUID(),reviewOperationId:randomUUID(),mergeOperationId:randomUUID(),baselineDeploymentIds:[{targetId,deploymentId:'accepted-baseline'}]};}
 return state;
}
test('published Git basis remains inside the native grant digest and unpaired or self lineage is refused',()=>{
 const state=gitSetStateFixture(os.tmpdir(),{publication:true}),client={hostId:state.release.snapshot.hostId,agentId:state.release.snapshot.releaserAgentId};
 const candidate=releaseRecoveryCandidate(state,client),snapshot=state.release.snapshot;
 assert.equal(candidate.grantDigest,contract.releaseDigest({releaseId:state.release.id,snapshot}));
 for(const key of ['closureDigest','mergeOperationId','baselineDeploymentIds']){
  const changed=structuredClone(state),basis=changed.release.snapshot.publishedGitBasis;
  if(key==='closureDigest')basis[key]='4'.repeat(64);
  if(key==='mergeOperationId')basis[key]=randomUUID();
  if(key==='baselineDeploymentIds')basis[key][0].deploymentId='different-accepted-queue';
  assert.notEqual(releaseRecoveryCandidate(changed,client).grantDigest,candidate.grantDigest);
 }
 const changed=structuredClone(state);delete changed.release.snapshot.publishedGitBasis;
 assert.throws(()=>releaseRecoveryCandidate(changed,client),/recovery_unproven/);
 snapshot.baselineRestart.releaseId=snapshot.publishedGitBasis.releaseId=state.release.id;
 assert.throws(()=>releaseRecoveryCandidate(state,client),/recovery_unproven/);
});
async function launchBroker(t, { crashDuringChild = false, rejectForgedReceipt = false, cycles = 1, stateFactory=stateFixture } = {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "roost-release-writer-native-"));
  mkdirSync(path.join(directory, "launcher"));
  const marker = path.join(directory, "synthetic-effect.txt"), state = stateFactory(directory);
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

test('native publication lineage cannot be substituted while reclaiming an expired rollback; actual FAILED read-back clears Writer',native,async t=>{
 const f=await launchBroker(t,{stateFactory:directory=>{
  const state=gitSetStateFixture(directory,{publication:true});state.status='expired';state.release.snapshot.expiresAt=new Date(Date.now()-60000).toISOString();return state;
 }});
 f.child.kill();await f.closed;const saved=readFileSync(path.join(f.directory,writerLockFilename));
 const forged=structuredClone(f.state);forged.release.snapshot.publishedGitBasis.closureDigest='5'.repeat(64);
 await assert.rejects(acquireWriterLock(f.directory,{releaseRecoveryCandidate:releaseRecoveryCandidate(forged,f.client)}),/writer_locked/);
 assert.deepEqual(readFileSync(path.join(f.directory,writerLockFilename)),saved);
 const writer=await acquireWriterLock(f.directory,{releaseRecoveryCandidate:releaseRecoveryCandidate(f.state,f.client)});
 assert.equal(writer.releaseRecovery.reconciliationOnly,true);await assert.rejects(writer.release(),/reconciliation_pending/);
 const s=f.state.release.snapshot,m=s.manifest,target=m.deployment.targets[0],deploymentId='actual-rebuilt-queue';
 const row={targetId:target.targetId,...target.baseline,imageDigest:`sha256:${'9'.repeat(64)}`,schemaDigest:m.rollback.schemaDigest,healthy:true,deploymentId};
 const {healthy,deploymentId:_,...sealed}=row;
 const evidence={deployedCommit:m.rollback.commit,deployedTree:s.baseTree,artifactSetDigest:m.rollback.artifactSetDigest,
  configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest,dataDigest:m.baseline.dataDigest,healthDigest:'6'.repeat(64),healthy:false,
  failureKind:'rollback_image_mismatch',deployedTargets:[row],deploymentIds:[{targetId:target.targetId,deploymentId}],deployedSetDigest:contract.releaseDigest([sealed])};
 let observations=0,effects=0;
 const result=await runReleaseStep({state:f.state,client:f.client,assertWriter:()=>writerRecoveryEvidence(writer),resources:{},
  github:{push:async()=>{effects++;throw Error('forbidden effect');}},
  coolify:{rollback:async()=>{effects++;throw Error('forbidden effect');},reconcileDeployment:async()=>{observations++;return{state:'failed',...evidence};}},
  api:async(route,{body})=>{assert(route.endsWith(`/operations/${f.state.journal[0].id}/outcome`));assert.equal(body.observationOnly,true);f.state.journal[0].outcome=body;return f.state;}});
 assert.equal(result.handled,true);assert.equal(observations,1);assert.equal(effects,0);
 const outcome=f.state.journal[0].outcome;assert.equal(outcome.status,'reconciled');assert.equal(outcome.reconciledStatus,'failed');
 assert.equal(contract.releaseRollbackImageFailureValid(s,outcome.evidence,target.targetId),true);
 clearReleaseWriterRecovery(writer,f.state,f.client);assert.equal(writer.releaseRecovery,null);await writer.release();
 assert.equal(existsSync(path.join(f.directory,writerLockFilename)),false);assert.equal(readFileSync(f.marker,'utf8'),'one native effect');
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

test("legacy reserved SSH preflight recovers resources only; live SSH and admitted intents still block", native, async t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "roost-release-reserved-native-"));
  mkdirSync(path.join(directory, "launcher"));
  const state = stateFixture(directory); state.journal = [];
  const client = { hostId: state.release.snapshot.hostId, agentId: state.release.snapshot.releaserAgentId };
  const source = `
import {acquireWriterLock} from ${JSON.stringify(moduleUrl("agent-host-writer-lock.mjs"))};
import {beginReleaseWriterCheckpoint,reserveReleaseChild} from ${JSON.stringify(moduleUrl("agent-host-release-writer-recovery.mjs"))};
import {buildWindowsJobLauncher} from ${JSON.stringify(moduleUrl("agent-host-windows-job.mjs"))};
import path from 'node:path';
const artifact=await buildWindowsJobLauncher(${JSON.stringify(path.join(directory, "launcher"))});
const lock=await acquireWriterLock(${JSON.stringify(directory)});
const context=beginReleaseWriterCheckpoint({writerLock:lock,state:${JSON.stringify(state)},client:${JSON.stringify(client)}});
reserveReleaseChild(context,{artifact,executable:path.join(process.env.SystemRoot,'System32','OpenSSH','ssh.exe')});
process.send({reserved:true});setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", source], { windowsHide: true, stdio: ["ignore", "ignore", "pipe", "ipc"] });
  const closed = once(child, "close");
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed; }
    assert.equal(path.dirname(directory), os.tmpdir()); rmSync(directory, { recursive: true });
  });
  await once(child, "message");
  await assert.rejects(acquireWriterLock(directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(state, client) }), /writer_locked/);
  child.kill(); await closed;
  const bytes = readFileSync(path.join(directory, writerLockFilename));
  const fixture = path.join(directory, "ssh.exe"); copyFileSync(process.execPath, fixture);
  const foreign = spawn(fixture, ["-e", "setInterval(()=>{},1000)"], { windowsHide: true, stdio: "ignore" });
  const foreignClosed = once(foreign, "close");
  try {
    await assert.rejects(acquireWriterLock(directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(state, client) }), /writer_locked/);
    assert.deepEqual(readFileSync(path.join(directory, writerLockFilename)), bytes);
  } finally { foreign.kill(); await foreignClosed; }
  const nonempty = structuredClone(state); nonempty.journal = stateFixture(directory).journal;
  await assert.rejects(acquireWriterLock(directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(nonempty, client) }), /writer_locked/);
  assert.deepEqual(readFileSync(path.join(directory, writerLockFilename)), bytes);
  // A crash after archival but before unlink must remain safely recoverable.
  const originalWriter = JSON.parse(bytes);
  const recovery = qualifyReleaseWriterReclaim(originalWriter, releaseRecoveryCandidate(state, client), directory);
  const archivePath = path.join(directory, `release-writer-reclaimed-${recovery.priorContextNonce}.json`);
  const archiveBytes = JSON.stringify({ originalWriter, recovery }) + "\n";
  const altered = structuredClone(recovery); altered.preflightQuiescence.originalCheckpointDigest = "0".repeat(64);
  writeFileSync(archivePath, JSON.stringify({ originalWriter, recovery: altered }));
  await assert.rejects(acquireWriterLock(directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(state, client) }), /writer_locked/);
  assert.deepEqual(readFileSync(path.join(directory, writerLockFilename)), bytes);
  writeFileSync(archivePath, archiveBytes);
  const writer = await acquireWriterLock(directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(state, client) });
  const proof = writer.releaseRecovery.preflightQuiescence;
  assert.equal(proof.kind, "legacy_reserved_resources_absent");
  assert.equal(proof.terminalReceipt, false); assert.equal(proof.executionProven, false);
  const archive = JSON.parse(readFileSync(path.join(directory, `release-writer-reclaimed-${writer.releaseRecovery.priorContextNonce}.json`)));
  assert.deepEqual(archive.originalWriter, JSON.parse(bytes));
  assert.equal(readFileSync(archivePath, "utf8"), archiveBytes);
  await assert.rejects(writer.release(), /reconciliation_pending/);
  clearReleaseWriterRecovery(writer, state, client); await writer.release();
});
