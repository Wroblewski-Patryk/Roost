import { createHash } from "node:crypto";

const hash = /^[a-f0-9]{64}$/, commit = /^[a-f0-9]{40}$/, image = /^sha256:[a-f0-9]{64}$/;
const id = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const validId = value => typeof value === "string" && id.test(value);
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const digest = value => createHash("sha256").update(canonical(value)).digest("hex");
const deny = (reason, uncertain = false) => { throw Object.assign(Error(`release_coolify_git_set_${reason}`), { uncertain, retryable: false }); };
const assert = (value, reason) => { if (!value) deny(reason); };
const time = value => { const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  assert(Number.isFinite(parsed), "time_invalid"); return parsed; };
const sorted = rows => rows.sort((a, b) => a.targetId < b.targetId ? -1 : a.targetId > b.targetId ? 1 : 0);

/** Seals source identities; candidate image identities are established after the build. */
export function coolifyGitSetArtifactDigest(targets, binding, { rollback = false } = {}) {
  return digest(sorted(targets.map(target => ({ targetId: target.targetId, dockerfile: target.dockerfile,
    commit: rollback ? target.baseline.commit : binding.commit,
    tree: rollback ? target.baseline.tree : binding.candidateTree, configDigest: target.configDigest }))));
}
/** Kept distinct from the source artifact digest and from any individual OCI digest. */
export function coolifyGitSetDeployedDigest(rows) {
  return digest(sorted(rows.map(row => ({ targetId: row.targetId, commit: row.commit, tree: row.tree,
    imageDigest: row.imageDigest, configDigest: row.configDigest, schemaDigest: row.schemaDigest }))));
}

/**
 * Typed gateways own credentials, fixed commands, HTTPS origins and durable child
 * intents. Source tests do not constitute native deployment proof. Builds are
 * serialized, and an uncertain response is reconciled through reads only.
 */
export function createCoolifyGitSetAdapter({ gateway, now = () => Date.now(),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const capabilities = ["inspectTarget", "safety", "inspectRemote", "configure", "deployTarget", "listDeployments",
    "inspectRuntime", "checkServices", "inspectBackup"];
  assert(gateway && capabilities.every(name => typeof gateway[name] === "function"), "gateway_required");
  const checked = (manifest, binding) => {
    assert(manifest?.deployment?.provider === "coolify_git_set" && validId(manifest.deployment.targetId) && commit.test(binding?.commit)
      && commit.test(binding?.candidateTree) && commit.test(binding?.baseTree), "binding_invalid");
    const targets = manifest.deployment.targets;
    assert(Array.isArray(targets) && targets.length >= 1 && targets.length <= 6
      && new Set(targets.map(target => target.targetId)).size === targets.length, "targets_invalid");
    for (const target of targets) assert(validId(target.targetId) && typeof target.name === "string"
      && typeof target.dockerfile === "string" && target.dockerfile.length > 0 && target.dockerfile.length <= 200
      && /^\/[A-Za-z0-9._/-]+$/.test(target.dockerfile) && !target.dockerfile.includes("\\")
      && !target.dockerfile.slice(1).split("/").some(part => ["", ".", ".."].includes(part))
      && hash.test(target.configDigest) && commit.test(target.baseline?.commit) && commit.test(target.baseline?.tree)
      && image.test(target.baseline?.imageDigest) && target.baseline.configDigest === target.configDigest, "target_invalid");
    assert(hash.test(manifest.deployment.configDigest) && hash.test(manifest.deployment.schemaDigest)
      && manifest.baseline?.configDigest === manifest.deployment.configDigest
      && manifest.rollback?.configDigest === manifest.deployment.configDigest
      && manifest.baseline?.schemaDigest === manifest.deployment.schemaDigest
      && manifest.rollback?.schemaDigest === manifest.deployment.schemaDigest
      && manifest.rollback?.commit === manifest.baseline?.commit && commit.test(manifest.baseline?.commit)
      && hash.test(manifest.baseline?.dataDigest), "schema_or_config_changed");
    assert(manifest.deployment.artifactSetDigest === coolifyGitSetArtifactDigest(targets, binding)
      && manifest.baseline.artifactSetDigest === coolifyGitSetArtifactDigest(targets, binding, { rollback: true })
      && manifest.rollback.artifactSetDigest === manifest.baseline.artifactSetDigest, "artifact_set_changed");
    assert(Array.isArray(manifest.rollback.compatibleSchemaDigests)
      && manifest.rollback.compatibleSchemaDigests.includes(manifest.deployment.schemaDigest), "rollback_schema_incompatible");
    assert(manifest.backup && hash.test(manifest.backup.digest) && manifest.backup.digest === manifest.backup.restoreDigest
      && Number.isSafeInteger(manifest.backup.bytes) && manifest.backup.bytes > 0
      && time(manifest.backup.restoreVerifiedAt) >= time(manifest.backup.capturedAt), "restore_unproven");
    return targets;
  };
  const targetState = async (manifest, target) => {
    const state = await gateway.inspectTarget(target.targetId);
    assert(state?.targetId === target.targetId && state.buildPack === "dockerfile"
      && state.dockerfile === target.dockerfile && state.configDigest === target.configDigest
      && state.schemaDigest === manifest.deployment.schemaDigest && state.autoDeploy === false, "target_configuration_changed");
    return state;
  };
  const safety = async manifest => {
    const state = await gateway.safety();
    assert(state?.activeTrading === 0 && state.openOrders === 0 && state.openPositions === 0, "live_activity_unproven");
    assert(state.schemaDigest === manifest.deployment.schemaDigest && state.dataDigest === manifest.baseline.dataDigest,
      "data_or_schema_changed");
    return state;
  };
  const backup = async manifest => {
    const state = await gateway.inspectBackup();
    assert(state && ["digest", "bytes", "capturedAt", "restoreVerifiedAt", "restoreDigest"]
      .every(key => state[key] === manifest.backup[key]), "backup_changed");
  };
  const expected = (target, binding, rollback) => rollback ? target.baseline : {
    commit: binding.commit, tree: binding.candidateTree, configDigest: target.configDigest };
  const selectedTargets = (manifest,binding,targetId) => {
    const targets=checked(manifest,binding);
    if(targetId===undefined)return targets;
    assert(validId(targetId)&&targets.some(target=>target.targetId===targetId),"target_scope_invalid");
    return targets.filter(target=>target.targetId===targetId);
  };
  const runtime = async (manifest, binding, rollback, targetId) => {
    const targets = selectedTargets(manifest, binding,targetId), rows = [];
    for (const target of targets) {
      await targetState(manifest, target);
      const row = await gateway.inspectRuntime(target.targetId), version = expected(target, binding, rollback);
      assert(row?.targetId === target.targetId && row.commit === version.commit && row.tree === version.tree
        && row.configDigest === target.configDigest && row.schemaDigest === manifest.deployment.schemaDigest
        && image.test(row.imageDigest) && (!rollback || row.imageDigest === target.baseline.imageDigest), "runtime_identity_changed");
      assert(typeof row.healthy === "boolean" && validId(row.deploymentId), "runtime_health_unproven");
      rows.push({ targetId: row.targetId, commit: row.commit, tree: row.tree, imageDigest: row.imageDigest,
        configDigest: row.configDigest, schemaDigest: row.schemaDigest, healthy: row.healthy, deploymentId: row.deploymentId });
    }
    return rows;
  };
  const health = async (manifest, binding, { rollback = false,targetId } = {}) => {
    const rows = await runtime(manifest, binding, rollback,targetId), services = await gateway.checkServices(manifest,{rollback,targetId});
    assert(services && typeof services.healthy === "boolean" && hash.test(services.healthDigest)
      && services.dataDigest === manifest.baseline.dataDigest, "service_health_unproven");
    return { deployedCommit: rollback ? manifest.rollback.commit : binding.commit,
      deployedTree: rollback ? binding.baseTree : binding.candidateTree, deployedTargets: rows,
      deploymentIds: rows.map(row => ({ targetId: row.targetId, deploymentId: row.deploymentId })),
      artifactSetDigest: rollback ? manifest.rollback.artifactSetDigest : manifest.deployment.artifactSetDigest,
      deployedSetDigest: coolifyGitSetDeployedDigest(rows), configDigest: manifest.deployment.configDigest,
      schemaDigest: manifest.deployment.schemaDigest, healthDigest: services.healthDigest,
      dataDigest: services.dataDigest, healthy: services.healthy && rows.every(row => row.healthy),
      observedAt: new Date(now()).toISOString() };
  };
  const inspect = async (manifest, binding) => {
    checked(manifest, binding); await safety(manifest); await backup(manifest);
    const proof = await health(manifest, binding, { rollback: true });
    assert(proof.healthy && proof.healthDigest === manifest.baseline.healthDigest, "baseline_health_changed");
    return { targetId: manifest.deployment.targetId, configDigest: manifest.deployment.configDigest,
      baselineCommit: manifest.baseline.commit, artifactSetDigest: manifest.baseline.artifactSetDigest,
      deployedTargets: proof.deployedTargets, deployedSetDigest: proof.deployedSetDigest };
  };
  const configure = async (manifest, binding, rollback) => {
    const targets = checked(manifest, binding); await safety(manifest); await backup(manifest);
    if (!rollback) await inspect(manifest, binding);
    const configured = [];
    for (const target of targets) {
      await targetState(manifest, target);
      try {
        const result = await gateway.configure(target.targetId, target.configDigest, rollback ? "rollback" : "candidate");
        const after = await targetState(manifest, target);
        assert(result?.targetId === target.targetId && result.configDigest === target.configDigest
          && after.gitCommit === expected(target, binding, rollback).commit, "configuration_response_unproven");
        configured.push({ targetId: target.targetId, configDigest: target.configDigest, commit: after.gitCommit });
      } catch { deny("configuration_mutation_uncertain", true); }
    }
    return { targetId: manifest.deployment.targetId, commit: rollback ? manifest.rollback.commit : binding.commit,
      artifactSetDigest: rollback ? manifest.rollback.artifactSetDigest : manifest.deployment.artifactSetDigest,
      configDigest: manifest.deployment.configDigest, schemaDigest: manifest.deployment.schemaDigest, configuredTargets: configured };
  };
  const window = since => { const value = time(since);
    assert(value <= now() && now() - value <= 86400000, "deployment_window_invalid"); return value; };
  const queues = async (manifest, binding, target, { since, operationId, rollback = false }) => {
    assert(validId(operationId), "operation_identity_required");
    const sinceMs = window(since), response = await gateway.listDeployments(target.targetId, { since, operationId, rollback });
    assert(response && Array.isArray(response.deployments), "deployment_read_unproven");
    const rows = response.deployments.filter(row => time(row.createdAt) >= sinceMs && time(row.createdAt) <= now());
    if (!rows.length) return { state: response.absenceVerified === true ? "absent" : "uncertain", targetId: target.targetId };
    const row = rows[0], version = expected(target, binding, rollback);
    if (rows.length !== 1 || row.targetId !== target.targetId || !validId(row.deploymentId)
      || ![version.commit, "HEAD"].includes(row.commit)
      || !["queued", "in_progress", "finished", "failed", "cancelled-by-user"].includes(row.status))
      return { state: "uncertain", targetId: target.targetId };
    // HEAD is only a pending queue hint, never final source identity evidence.
    if (row.commit === "HEAD" && !["queued", "in_progress"].includes(row.status))
      return { state: "uncertain", targetId: target.targetId, deploymentId: row.deploymentId };
    return { targetId: target.targetId, deploymentId: row.deploymentId, commit: row.commit, status: row.status,
      state: row.status === "finished" ? "finished" : ["failed", "cancelled-by-user"].includes(row.status) ? "failed" : "pending" };
  };
  const reconcileDeployment = async (manifest, binding, options) => {
    const targets = selectedTargets(manifest, binding,options.targetId), rows = [];
    for (const target of targets) { await targetState(manifest, target); rows.push(await queues(manifest, binding, target, options)); }
    const deploymentIds = rows.filter(row => row.deploymentId).map(row => ({ targetId: row.targetId, deploymentId: row.deploymentId }));
    if (rows.some(row => row.state === "uncertain")) return { state: "uncertain", deploymentIds, reason: "exact_deployment_correlation_missing" };
    if (rows.some(row => row.state === "failed")) return { state: "failed", deploymentIds };
    if (rows.every(row => row.state === "finished")) {
      const evidence = await health(manifest, binding, options);
      for (const row of rows) assert((await gateway.inspectRuntime(row.targetId))?.deploymentId === row.deploymentId,
        "runtime_deployment_changed");
      return { state: "finished", deploymentIds, ...evidence };
    }
    return { state: rows.every(row => row.state === "absent") ? "absent" : "pending", deploymentIds };
  };
  const waitTarget = async (manifest, binding, target, options) => {
    const deadline = now() + 60000;
    do {
      if (options.stopped?.()) return { state: "uncertain", reason: "deployment_wait_stopped", targetId: target.targetId };
      const result = await queues(manifest, binding, target, options);
      if (result.state !== "pending") return result;
      if (now() >= deadline) return { ...result, state: "uncertain", reason: "deployment_wait_incomplete" };
      await sleep(Math.min(1000, deadline - now()));
    } while (true);
  };
  const start = async (manifest, binding, options, rollback) => {
    const targets = selectedTargets(manifest, binding,options?.targetId);
    const since = options?.since ?? binding.operationStartedAt ?? binding.intentCreatedAt;
    const operationId = options?.operationId ?? binding.operationId;
    assert(validId(operationId), "operation_identity_required");
    window(since); const context = { ...options, since, operationId, rollback }, deploymentIds = [];
    await safety(manifest); await backup(manifest);
    for (const target of checked(manifest,binding)) await targetState(manifest, target);
    const initial = [];
    for (const target of targets) initial.push(await queues(manifest, binding, target, context));
    const knownIds = initial.filter(row => row.deploymentId).map(row => ({ targetId: row.targetId, deploymentId: row.deploymentId }));
    if (initial.some(row => row.state === "uncertain")) return { state: "uncertain", deploymentIds: knownIds,
      reason: "exact_deployment_correlation_missing" };
    if (initial.some(row => row.state === "failed")) return { state: "failed", deploymentIds: knownIds };
    let unfinished = false;
    for (const row of initial) {
      if (unfinished && row.state !== "absent") return { state: "uncertain", deploymentIds: knownIds,
        reason: "deployment_sequence_unproven" };
      if (row.state !== "finished") unfinished = true;
    }
    for (const target of targets) {
      let row = await queues(manifest, binding, target, context);
      if (row.state === "absent") {
        await safety(manifest);
        const live = await targetState(manifest, target), version = expected(target, binding, rollback);
        assert(live.gitCommit === version.commit, "deployment_configuration_changed");
        if (!rollback) assert((await gateway.inspectRemote())?.mainCommit === binding.commit, "remote_commit_changed");
        let result;
        try { result = await gateway.deployTarget(target.targetId, version.commit, { rollback, since, operationId }); }
        catch { deny("deployment_dispatch_uncertain", true); }
        if (result?.targetId !== target.targetId || !validId(result.deploymentId)
          || ![version.commit, "HEAD"].includes(result.commit)) deny("deployment_dispatch_uncertain", true);
        row = await waitTarget(manifest, binding, target, context);
        if (row.deploymentId !== result.deploymentId) deny("deployment_dispatch_uncertain", true);
      } else if (row.state === "pending") row = await waitTarget(manifest, binding, target, context);
      if (row.deploymentId) deploymentIds.push({ targetId: target.targetId, deploymentId: row.deploymentId });
      if (row.state !== "finished") return { state: row.state === "failed" ? "failed" : "uncertain", deploymentIds,
        reason: row.reason ?? "partial_deployment_unproven" };
      // The next build cannot start until this target's exact runtime is proven.
      const live = await gateway.inspectRuntime(target.targetId), version = expected(target, binding, rollback);
      assert(live?.targetId === target.targetId && live.deploymentId === row.deploymentId
        && live.commit === version.commit && live.tree === version.tree
        && image.test(live.imageDigest) && live.configDigest === target.configDigest
        && live.schemaDigest === manifest.deployment.schemaDigest
        && (!rollback || live.imageDigest === version.imageDigest), "runtime_identity_changed");
      if (!rollback) assert((await gateway.inspectRemote())?.mainCommit === binding.commit, "remote_commit_changed");
    }
    return { state: "finished", targetId: manifest.deployment.targetId, deploymentIds,
      commit: rollback ? manifest.rollback.commit : binding.commit,
      artifactSetDigest: rollback ? manifest.rollback.artifactSetDigest : manifest.deployment.artifactSetDigest,
      ...(await health(manifest, binding, { rollback,targetId:options?.targetId })) };
  };
  const waitForDeployment = async (manifest, binding, options) => {
    const deadline = now() + 60000;
    do {
      if (options.stopped?.()) return { state: "uncertain", reason: "deployment_wait_stopped" };
      const result = await reconcileDeployment(manifest, binding, options);
      if (result.state !== "pending") return result;
      if (now() >= deadline) return { ...result, state: "uncertain", reason: "deployment_wait_incomplete" };
      await sleep(Math.min(1000, deadline - now()));
    } while (true);
  };
  const reconcileConfiguration = async (manifest, binding, { rollback = false } = {}) => {
    const targets = checked(manifest, binding); let matches = 0;
    for (const target of targets) {
      const row = await targetState(manifest, target);
      if (row.gitCommit === expected(target, binding, rollback).commit) matches += 1;
    }
    return { targetId: manifest.deployment.targetId, state: matches === targets.length ? "applied" : "uncertain",
      configDigest: manifest.deployment.configDigest, schemaDigest: manifest.deployment.schemaDigest,
      deployedCommit: rollback ? manifest.rollback.commit : binding.commit,
      artifactSetDigest: rollback ? manifest.rollback.artifactSetDigest : manifest.deployment.artifactSetDigest };
  };
  const observe = async (manifest, binding, options = {}) => {
    checked(manifest, binding); const policy = manifest.observation;
    assert(policy && Number.isSafeInteger(policy.seconds) && policy.seconds >= 1 && policy.seconds <= 3600
      && Number.isSafeInteger(policy.intervalSeconds) && policy.intervalSeconds >= 1 && policy.intervalSeconds <= 300
      && policy.intervalSeconds <= policy.seconds && Number.isSafeInteger(policy.maxFailures)
      && policy.maxFailures >= 0 && policy.maxFailures <= 10, "observation_policy_invalid");
    const startedAt = now(), end = startedAt + policy.seconds * 1000; let failures = 0, final;
    do {
      if (options.stopped?.()) deny("observation_stopped", true);
      final = await health(manifest, binding, options);
      if (!final.healthy && ++failures > policy.maxFailures) return { ...final,
        observationSeconds: Math.floor((now() - startedAt) / 1000) };
      if (now() >= end) break;
      await sleep(Math.min(policy.intervalSeconds * 1000, end - now()));
    } while (true);
    return { ...final, observationSeconds: Math.floor((now() - startedAt) / 1000) };
  };
  return Object.freeze({ inspect, configureCandidate: (manifest, binding) => configure(manifest, binding, false),
    configureRollback: (manifest, binding) => configure(manifest, binding, true),
    deploy: (manifest, binding, options) => start(manifest, binding, options, false),
    rollback: (manifest, binding, options) => start(manifest, binding, options, true),
    health, observe, reconcileDeployment, reconcileConfiguration, waitForDeployment });
}
