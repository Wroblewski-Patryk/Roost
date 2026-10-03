import test from "node:test";
import assert from "node:assert/strict";
import { createCoolifyGitSetAdapter, coolifyGitSetArtifactDigest, coolifyGitSetDeployedDigest }
  from "./lib/agent-host-release-coolify-git-set.mjs";

// Source-only gateway simulations; these tests do not prove native Coolify deployment.
const sha = char => char.repeat(64), git = char => char.repeat(40), image = char => `sha256:${sha(char)}`;
function fixture() {
  const binding = { commit: git("a"), candidateTree: git("b"), baseTree: git("c") };
  const targets = ["api", "web"].map((targetId, index) => ({ targetId, name: targetId,
    dockerfile: `/apps/${targetId}/Dockerfile`, configDigest: sha(String(index + 1)),
    baseline: { commit: git(index ? "d" : "e"), tree: git(index ? "f" : "0"),
      imageDigest: image(index ? "1" : "2"), configDigest: sha(String(index + 1)) } }));
  const artifactSetDigest = coolifyGitSetArtifactDigest(targets, binding);
  const oldArtifactSetDigest = coolifyGitSetArtifactDigest(targets, binding, { rollback: true });
  const backup = { digest: sha("3"), restoreDigest: sha("3"), bytes: 100,
    capturedAt: "2026-10-02T10:00:00Z", restoreVerifiedAt: "2026-10-02T10:01:00Z" };
  const manifest = { deployment: { provider: "coolify_git_set", targetId: "pilot", targets, artifactSetDigest,
    configDigest: sha("4"), schemaDigest: sha("5") },
    baseline: { commit: git("e"), artifactSetDigest: oldArtifactSetDigest, configDigest: sha("4"),
      schemaDigest: sha("5"), dataDigest: sha("6"), healthDigest: sha("7") },
    rollback: { commit: git("e"), artifactSetDigest: oldArtifactSetDigest, configDigest: sha("4"),
      schemaDigest: sha("5"), compatibleSchemaDigests: [sha("5")] }, backup,
    observation: { seconds: 2, intervalSeconds: 1, maxFailures: 0 } };
  let clock = Date.parse("2026-10-02T11:00:00Z");
  const options = { since: new Date(clock).toISOString(), operationId: "operation-one" };
  const states = new Map(targets.map(target => [target.targetId, { targetId: target.targetId, buildPack: "dockerfile",
    dockerfile: target.dockerfile, configDigest: target.configDigest, schemaDigest: sha("5"),
    autoDeploy: false, gitCommit: target.baseline.commit }]));
  const runtimes = new Map(targets.map(target => [target.targetId, { targetId: target.targetId, ...target.baseline,
    schemaDigest: sha("5"), healthy: true, deploymentId: `old-${target.targetId}` }]));
  const queues = new Map(targets.map(target => [target.targetId, []])), calls = [];
  const controls = { remoteCommit: binding.commit, safety: { activeTrading: 0, openOrders: 0, openPositions: 0,
    schemaDigest: sha("5"), dataDigest: sha("6") }, absenceVerified: true, health: true,
    dispatchFailure: undefined, pendingTarget: undefined, afterFirstDispatch: undefined };
  const gateway = {
    inspectTarget: async targetId => structuredClone(states.get(targetId)),
    safety: async () => structuredClone(controls.safety),
    inspectRemote: async () => ({ mainCommit: controls.remoteCommit }),
    inspectBackup: async () => structuredClone(backup),
    checkServices: async () => ({ healthy: controls.health, healthDigest: sha("7"), dataDigest: sha("6") }),
    configure: async (targetId, configDigest, mode) => {
      calls.push({ action: "configure", targetId, mode });
      states.get(targetId).gitCommit = mode === "rollback" ? targets.find(target => target.targetId === targetId).baseline.commit : binding.commit;
      return { targetId, configDigest };
    },
    listDeployments: async (targetId, opts) => {
      calls.push({ action: "list", targetId, options: opts });
      return { deployments: structuredClone(queues.get(targetId)), absenceVerified: controls.absenceVerified };
    },
    inspectRuntime: async targetId => structuredClone(runtimes.get(targetId)),
    deployTarget: async (targetId, commit, opts) => {
      calls.push({ action: "deploy", targetId, commit, options: opts });
      const deploymentId = `${opts.rollback ? "rollback" : "candidate"}-${targetId}`;
      queues.get(targetId).push({ targetId, deploymentId, commit, createdAt: new Date(clock).toISOString(),
        status: controls.pendingTarget === targetId ? "in_progress" : "finished" });
      const baseline = targets.find(target => target.targetId === targetId).baseline;
      runtimes.set(targetId, { targetId, deploymentId, commit, tree: opts.rollback ? baseline.tree : binding.candidateTree,
        imageDigest: opts.rollback ? baseline.imageDigest : image(targetId === "api" ? "8" : "9"),
        configDigest: states.get(targetId).configDigest, schemaDigest: sha("5"), healthy: true });
      controls.afterFirstDispatch?.(targetId);
      if (controls.dispatchFailure === targetId) throw Error("private transport detail");
      return { targetId, deploymentId, commit };
    }
  };
  const adapter = createCoolifyGitSetAdapter({ gateway, now: () => clock, sleep: async ms => { clock += ms; } });
  return { manifest, binding, options, adapter, gateway, targets, states, runtimes, queues, calls, controls,
    tick: ms => { clock += ms; } };
}
const configured = async () => { const f = fixture(); await f.adapter.configureCandidate(f.manifest, f.binding); return f; };
function preimageFixture() {
  const f = fixture(), rows = f.targets.map(target => ({ targetId: target.targetId, gitCommit: git('9'), configDigest: target.configDigest }));
  for (const row of rows) f.states.get(row.targetId).gitCommit = row.gitCommit;
  f.gateway.inspectConfigurationPreimage = async () => ({ absenceVerified: true, preimageDigest: sha('8'), configuredTargets: structuredClone(rows) });
  return f;
}
test('configuration absence proves original configured pins separately from mixed runtime baseline with reads only', async () => {
  const f = preimageFixture(), result = await f.adapter.reconcileConfiguration(f.manifest, f.binding, f.options);
  assert.equal(result.state, 'absent'); assert.equal(result.evidence.absenceVerified, true);
  assert.deepEqual(result.evidence.deployedTargets.map(row => row.commit), f.targets.map(row => row.baseline.commit));
  assert.equal(result.evidence.artifactSetDigest, f.manifest.baseline.artifactSetDigest);
  assert.equal(result.evidence.dataDigest, f.manifest.baseline.dataDigest);
  assert.equal(f.calls.filter(row => ['configure', 'deploy'].includes(row.action)).length, 0);
});
test('missing preimage, partial candidate pins and unrecorded original pins never prove absence', async () => {
  for (const mode of ['missing', 'partial', 'unknown', 'duplicate']) {
    const f = preimageFixture();
    if (mode === 'missing') delete f.gateway.inspectConfigurationPreimage;
    if (mode === 'partial') f.states.get('api').gitCommit = f.binding.commit;
    if (mode === 'unknown') f.states.get('api').gitCommit = git('8');
    if (mode === 'duplicate') f.gateway.inspectConfigurationPreimage = async () => ({ absenceVerified: true, preimageDigest: sha('8'),
      configuredTargets: [1, 2].map(() => ({ targetId: 'api', gitCommit: git('9'), configDigest: sha('1') })) });
    assert.equal((await f.adapter.reconcileConfiguration(f.manifest, f.binding, f.options)).state, 'uncertain');
    assert.equal(f.calls.filter(row => ['configure', 'deploy'].includes(row.action)).length, 0);
  }
});
test('absence refuses changed runtime, data, health, backup and preimage after inspection', async () => {
  for (const mode of ['runtime', 'data', 'health', 'backup', 'preimage', 'pin']) {
    const f = preimageFixture();
    if (mode === 'runtime') f.runtimes.get('api').imageDigest = image('9');
    if (mode === 'data') f.controls.safety.dataDigest = sha('9');
    if (mode === 'health') f.controls.health = false;
    if (mode === 'backup') f.gateway.inspectBackup = async () => ({ ...f.manifest.backup, bytes: 999 });
    if (['preimage', 'pin'].includes(mode)) { let reads = 0; const read = f.gateway.inspectConfigurationPreimage;
      f.gateway.inspectConfigurationPreimage = async () => { const row = await read(); if (++reads === 2) {
        if (mode === 'preimage') row.preimageDigest = sha('9'); else f.states.get('api').gitCommit = git('8');
      } return row; }; }
    await assert.rejects(f.adapter.reconcileConfiguration(f.manifest, f.binding, f.options), /release_coolify_git_set_/);
    assert.equal(f.calls.filter(row => ['configure', 'deploy'].includes(row.action)).length, 0);
  }
});
test('already applied configuration does not consume optional preimage or require absence proof', async () => {
  const f = await configured(); f.gateway.inspectConfigurationPreimage = async () => { throw Error('must not read'); };
  assert.equal((await f.adapter.reconcileConfiguration(f.manifest, f.binding, f.options)).state, 'applied');
});
test('historical reconciliation without operation metadata retains uncertainty', async () => {
  const f = preimageFixture(); f.gateway.inspectConfigurationPreimage = async () => { throw Error('must not read'); };
  assert.equal((await f.adapter.reconcileConfiguration(f.manifest, f.binding)).state, 'uncertain');
});
test("source test: seals independent artifact and deployed sets without fictional OCI digest", async () => {
  const f = await configured(), result = await f.adapter.deploy(f.manifest, f.binding, f.options);
  assert.equal(result.state, "finished"); assert.equal(result.deploymentIds.length, 2);
  assert.equal(result.deployedTargets.length, 2); assert.equal(result.imageDigest, undefined);
  assert.equal(result.deployedSetDigest, coolifyGitSetDeployedDigest(result.deployedTargets));
  assert.notEqual(result.deployedSetDigest, result.artifactSetDigest);
  assert.deepEqual(f.calls.filter(call => call.action === "deploy").map(call => call.targetId), ["api", "web"]);
  assert.ok(f.calls.filter(call => call.action === "deploy").every(call => call.options.operationId === f.options.operationId));
});
test("source test: deployment replay reconciles existing batch without duplicate effects", async () => {
  const f = await configured(); await f.adapter.deploy(f.manifest, f.binding, f.options);
  const result = await f.adapter.deploy(f.manifest, f.binding, f.options);
  assert.equal(result.state, "finished"); assert.equal(f.calls.filter(call => call.action === "deploy").length, 2);
});
test("source test: mixed baseline SHA and immutable image rollback each target independently", async () => {
  const f = await configured(); await f.adapter.deploy(f.manifest, f.binding, f.options);
  await f.adapter.configureRollback(f.manifest, f.binding);
  // The fixed gateway scopes the exact deterministic queue identity to the new operation.
  for (const target of f.targets) f.queues.set(target.targetId, []);
  const result = await f.adapter.rollback(f.manifest, f.binding, { ...f.options, operationId: "rollback-operation" });
  assert.equal(result.state, "finished");
  assert.deepEqual(result.deployedTargets.map(row => row.commit), f.targets.map(target => target.baseline.commit));
  assert.deepEqual(result.deployedTargets.map(row => row.imageDigest), f.targets.map(target => target.baseline.imageDigest));
  assert.ok(f.calls.filter(call => call.action === "deploy" && call.options.rollback).every(call => call.commit !== f.binding.commit));
});
for (const [name, modify, reason] of [
  ["target", f => { f.states.get("api").targetId = "different"; }, /target_configuration_changed/],
  ["Dockerfile", f => { f.states.get("api").dockerfile = "Otherfile"; }, /target_configuration_changed/],
  ["config", f => { f.states.get("api").configDigest = sha("a"); }, /target_configuration_changed/],
  ["schema", f => { f.controls.safety.schemaDigest = sha("a"); }, /data_or_schema_changed/],
  ["trading", f => { f.controls.safety.activeTrading = 1; }, /live_activity_unproven/],
  ["orders", f => { f.controls.safety.openOrders = 1; }, /live_activity_unproven/],
  ["positions", f => { f.controls.safety.openPositions = 1; }, /live_activity_unproven/],
  ["unknown safety", f => { delete f.controls.safety.openPositions; }, /live_activity_unproven/],
  ["auto deploy", f => { f.states.get("api").autoDeploy = true; }, /target_configuration_changed/],
  ["remote commit", f => { f.controls.remoteCommit = git("f"); }, /remote_commit_changed/]
]) test(`source test: fails closed for changed ${name} before dispatch`, async () => {
  const f = await configured(); modify(f);
  await assert.rejects(f.adapter.deploy(f.manifest, f.binding, f.options), reason);
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 0);
});
test("source test: lost response stops batch and later reads reconcile without duplicate first dispatch", async () => {
  const f = await configured(); f.controls.dispatchFailure = "api";
  await assert.rejects(f.adapter.deploy(f.manifest, f.binding, f.options), error => error.uncertain === true && !error.message.includes("private"));
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 1);
  f.controls.dispatchFailure = undefined;
  const result = await f.adapter.deploy(f.manifest, f.binding, f.options);
  assert.equal(result.state, "finished"); assert.equal(f.calls.filter(call => call.action === "deploy").length, 2);
});
test("source test: partial unknown queue stops next effect without blind retry", async () => {
  const f = await configured(); f.controls.dispatchFailure = "api";
  await assert.rejects(f.adapter.deploy(f.manifest, f.binding, f.options));
  f.queues.get("api").push({ ...f.queues.get("api")[0], deploymentId: "second-queue" });
  const result = await f.adapter.deploy(f.manifest, f.binding, f.options);
  assert.equal(result.state, "uncertain"); assert.equal(f.calls.filter(call => call.action === "deploy").length, 1);
});
test("source test: time-only absence and missing durable operation cannot authorize start", async () => {
  const f = await configured(); f.controls.absenceVerified = false;
  assert.equal((await f.adapter.deploy(f.manifest, f.binding, f.options)).state, "uncertain");
  await assert.rejects(f.adapter.deploy(f.manifest, f.binding, { since: f.options.since }), /operation_identity_required/);
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 0);
});
test("source test: pending timeout is unknown and never triggers rollback or next build", async () => {
  const f = await configured(); f.controls.pendingTarget = "api";
  const result = await f.adapter.deploy(f.manifest, f.binding, f.options);
  assert.equal(result.state, "uncertain"); assert.equal(result.reason, "deployment_wait_incomplete");
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 1);
  assert.ok(f.calls.filter(call => call.action === "deploy").every(call => !call.options.rollback));
  const wait = await f.adapter.waitForDeployment(f.manifest, f.binding, f.options);
  assert.equal(wait.state, "uncertain"); assert.equal(wait.reason, "deployment_wait_incomplete");
});
test("source test: remote serialization is rechecked between sequential targets", async () => {
  const f = await configured(); f.controls.afterFirstDispatch = () => { f.controls.remoteCommit = git("f"); };
  await assert.rejects(f.adapter.deploy(f.manifest, f.binding, f.options), /remote_commit_changed/);
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 1);
});
test("source test: runtime must belong to the exact queue, not an old same-SHA deployment", async () => {
  const f = await configured(); await f.adapter.deploy(f.manifest, f.binding, f.options);
  f.runtimes.get("api").deploymentId = "old-api";
  await assert.rejects(f.adapter.reconcileDeployment(f.manifest, f.binding, f.options), /runtime_deployment_changed/);
});
test("source test: changed source artifact set and incompatible schema fail before any mutation", async () => {
  const f = fixture(); f.manifest.deployment.artifactSetDigest = sha("f");
  await assert.rejects(f.adapter.configureCandidate(f.manifest, f.binding), /artifact_set_changed/);
  assert.equal(f.calls.length, 0);
});
test("source test: observation measures actual elapsed interval and false health remains failure", async () => {
  const f = await configured(); await f.adapter.deploy(f.manifest, f.binding, f.options);
  const result = await f.adapter.observe(f.manifest, f.binding);
  assert.equal(result.observationSeconds, 2); assert.equal(result.healthy, true);
  f.controls.health = false;
  assert.equal((await f.adapter.observe(f.manifest, f.binding)).healthy, false);
});
test("source test: an uncertain later target blocks every new batch effect", async () => {
  const f = await configured();
  f.queues.get("web").push({ targetId: "web", deploymentId: "unrelated", commit: git("f"),
    createdAt: f.options.since, status: "finished" });
  assert.equal((await f.adapter.deploy(f.manifest, f.binding, f.options)).state, "uncertain");
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 0);
});
test("source test: nonsequential completed suffix cannot authorize missing earlier dispatch", async () => {
  const f = await configured();
  f.queues.get("web").push({ targetId: "web", deploymentId: "candidate-web", commit: f.binding.commit,
    createdAt: f.options.since, status: "finished" });
  const result = await f.adapter.deploy(f.manifest, f.binding, f.options);
  assert.equal(result.state, "uncertain"); assert.equal(result.reason, "deployment_sequence_unproven");
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 0);
});
test("source test: preservation of every target configuration is checked before first dispatch", async () => {
  const f = await configured(); f.states.get("web").configDigest = sha("e");
  await assert.rejects(f.adapter.deploy(f.manifest, f.binding, f.options), /target_configuration_changed/);
  assert.equal(f.calls.filter(call => call.action === "deploy").length, 0);
});
test("source test: unhealthy baseline and changed backup block configuration mutation", async () => {
  const f = fixture(); f.controls.health = false;
  await assert.rejects(f.adapter.configureCandidate(f.manifest, f.binding), /baseline_health_changed/);
  assert.equal(f.calls.filter(call => call.action === "configure").length, 0);
  f.controls.health = true; f.gateway.inspectBackup = async () => ({ ...f.manifest.backup, digest: sha("f") });
  await assert.rejects(f.adapter.configureCandidate(f.manifest, f.binding), /backup_changed/);
  assert.equal(f.calls.filter(call => call.action === "configure").length, 0);
});
test("source test: lost configure response is uncertain and emits no credential or transport detail", async () => {
  const f = fixture(); f.gateway.configure = async () => { throw Error("private credential detail"); };
  await assert.rejects(f.adapter.configureCandidate(f.manifest, f.binding), error =>
    error.uncertain === true && error.retryable === false && error.message === "release_coolify_git_set_configuration_mutation_uncertain");
});
test("source test: missing final version or changed baseline image cannot count as successful rollback", async () => {
  const f = await configured(); await f.adapter.deploy(f.manifest, f.binding, f.options);
  f.runtimes.get("web").commit = "HEAD";
  await assert.rejects(f.adapter.health(f.manifest, f.binding), /runtime_identity_changed/);
  const g = fixture(); g.runtimes.get("web").imageDigest = image("e");
  await assert.rejects(g.adapter.inspect(g.manifest, g.binding), /runtime_identity_changed/);
});
for(const path of ["apps/api/Dockerfile","/apps/../Dockerfile","/apps\\api\\Dockerfile","/apps/*/Dockerfile","/apps//Dockerfile"])
 test(`source test: rejects unsafe Dockerfile ${path}`,async()=>{
  const f=fixture();f.manifest.deployment.targets[0].dockerfile=path;
  await assert.rejects(f.adapter.inspect(f.manifest,f.binding),/target_invalid/);
 });
test("source test: one durable target effect reports only its proven runtime subset",async()=>{
 const f=await configured(),options={...f.options,targetId:"api"};
 const result=await f.adapter.deploy(f.manifest,f.binding,options);
 assert.equal(result.state,"finished");assert.equal(result.deployedTargets.length,1);
 assert.equal(result.deployedTargets[0].targetId,"api");assert.equal(result.deploymentIds.length,1);
 assert.equal(result.artifactSetDigest,f.manifest.deployment.artifactSetDigest);
 assert.equal(f.runtimes.get("web").commit,f.targets[1].baseline.commit);
 assert.equal((await f.adapter.reconcileDeployment(f.manifest,f.binding,options)).state,"finished");
});
test("source test: readonly target reconciliation cannot dispatch a later target after lost reply",async()=>{
 const f=await configured(),options={...f.options,targetId:"api"};f.controls.dispatchFailure="api";
 await assert.rejects(f.adapter.deploy(f.manifest,f.binding,options));
 assert.equal((await f.adapter.reconcileDeployment(f.manifest,f.binding,options)).state,"finished");
 assert.equal(f.calls.filter(call=>call.action==="deploy").length,1);
 f.controls.dispatchFailure=undefined;
 await f.adapter.deploy(f.manifest,f.binding,{...f.options,operationId:"second-authorized-intent",targetId:"web"});
 assert.equal(f.calls.filter(call=>call.action==="deploy").length,2);
 assert.equal(f.calls.filter(call=>call.action==="deploy")[1].options.operationId,"second-authorized-intent");
});
