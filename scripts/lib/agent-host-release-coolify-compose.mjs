import contract from './agent-host-release-contract.cjs';
import {coolifyTransportDiagnostic} from './agent-host-release-coolify.mjs';
import { composeConfigurationDigest, composeRuntimeSetDigest, qualifyComposeRuntime } from './agent-host-release-compose-state.mjs';
import { coolifyGitSetDeploymentId } from './agent-host-release-coolify-git-set-gateway.mjs';

const safeTransport = error => {
  for(let depth=0;error&&depth<4;depth++,error=error.cause){
    if(/^(transport_uncertain|response_unproven|response_size_invalid|response_invalid)(_http_[1-5][0-9]{2})?$/.test(error.transportDiagnostic??''))return error.transportDiagnostic;
    const classified=typeof error.message==='string'?coolifyTransportDiagnostic(error):'transport_unclassified';
    if(classified!=='transport_unclassified')return classified;
  }
};
const deny = (reason, uncertain = false, cause) => {
  const transportDiagnostic=safeTransport(cause);
  throw Object.assign(Error(`release_coolify_compose_${reason}`,cause===undefined?undefined:{cause}),
    {uncertain,retryable:false,...(transportDiagnostic?{transportDiagnostic}:{})});
};
const check = (value, reason) => { if (!value) deny(reason); };
const hash = /^[a-f0-9]{64}$/;
const status = row => row?.status === 'finished' ? 'finished'
  : ['failed', 'cancelled-by-user'].includes(row?.status) ? 'failed'
    : ['queued', 'in_progress'].includes(row?.status) ? 'pending' : 'uncertain';

/** Installed callbacks own all transports. A packet cannot select a command,
 * health predicate, credentials, or configuration mutation. */
export function createCoolifyComposeAdapter({ gateway, now = () => Date.now(),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  check(gateway && ['inspectConfiguration', 'inspectBaseline', 'inspectRuntime', 'readQueue',
    'configure', 'deployTarget', 'safety', 'checkServices', 'inspectBackup'].every(k => typeof gateway[k] === 'function'), 'gateway_required');
  const bound = (m, s) => {
    check(contract.isComposeManifest(m) && contract.manifestSchema.safeParse(m).success
      && m.deployment.artifactSetDigest === contract.sourceArtifactDigest(m, s)
      && m.baseline.artifactSetDigest === contract.sourceArtifactDigest(m, s, 'baseline')
      && m.rollback.artifactSetDigest === contract.sourceArtifactDigest(m, s, true), 'binding_invalid');
    return m.deployment.targets[0];
  };
  const safety = async m => {
    const proof = await gateway.safety();
    check(proof?.quiescent === true && proof.schemaDigest === m.deployment.schemaDigest
      && proof.dataDigest === m.baseline.dataDigest, 'data_or_activity_changed');
    const backup = await gateway.inspectBackup();
    check(['digest', 'bytes', 'capturedAt', 'restoreVerifiedAt', 'restoreDigest'].every(k => backup?.[k] === m.backup[k]), 'backup_changed');
  };
  const phase = (t, rollback) => rollback ? { configuration: t.rollbackConfiguration, configDigest: t.rollbackConfigDigest }
    : { configuration: t.configuration, configDigest: t.configDigest };
  const configuration = async (t, rollback) => {
    const row = await gateway.inspectConfiguration(t.targetId);
    check(row && composeConfigurationDigest(row) === phase(t, rollback).configDigest, 'configuration_changed');
    return row;
  };
  const inspect = async (m, s) => {
    const t = bound(m, s); await safety(m);
    const row = await gateway.inspectBaseline(t.targetId);
    // A legacy installation can lack a retained deployment queue or completed
    // migration container. Its sealed observation is a baseline only; it is
    // never submitted as a new successful deployment receipt.
    check(row?.observed === true && row.commit === t.baseline.commit && row.tree === t.baseline.tree
      && row.configDigest === t.baseline.configDigest && row.schemaDigest === m.baseline.schemaDigest
      && row.healthDigest === m.baseline.healthDigest && row.healthy === true
      && row.dataDigest === m.baseline.dataDigest && row.migrationSchemaVerified === true
      && contract.releaseDigest(row.images) === contract.releaseDigest(t.baseline.images), 'baseline_unproven');
    return { targetId: t.targetId, baselineCommit: row.commit, configDigest: row.configDigest,
      artifactSetDigest: m.baseline.artifactSetDigest };
  };
  const configure = async (m, s, rollback) => {
    const t = bound(m, s); await safety(m);
    if (!rollback) await inspect(m, s);
    const commit = rollback ? t.baseline.commit : s.commit;
    try {
      await gateway.configure(t.targetId, rollback ? 'rollback' : 'candidate');
      check((await configuration(t, rollback)).gitCommit === commit, 'configuration_result_unproven');
    } catch(error) { deny('configuration_mutation_uncertain', true, error); }
    return { commit, deployedCommit: commit, artifactSetDigest: rollback ? m.rollback.artifactSetDigest : m.deployment.artifactSetDigest,
      configDigest: rollback ? m.rollback.configDigest : m.deployment.configDigest, schemaDigest: m.deployment.schemaDigest };
  };
  const optionsFor = (m, s, o) => {
    const t = bound(m, s);
    check(o && (o.targetId === undefined || o.targetId === t.targetId)
      && typeof o.operationId === 'string' && /^[a-f0-9-]{36}$/.test(o.operationId)
      && Number.isFinite(Date.parse(o.since)) && Date.parse(o.since) <= now()
      && now() - Date.parse(o.since) <= 86400000, 'operation_invalid');
    return { ...o, targetId: t.targetId, deploymentId: coolifyGitSetDeploymentId({ releaseId: s.releaseId,
      operationId: o.operationId, targetId: t.targetId, rollback: o.rollback === true }) };
  };
  const queue = async (m, s, o) => {
    const context = optionsFor(m, s, o), row = await gateway.readQueue(context);
    if (row === null) return { state: 'absent', absenceVerified: true, deploymentIds: [] };
    const commit = o.rollback ? m.rollback.commit : s.commit;
    check(row?.targetId === context.targetId && row.deploymentId === context.deploymentId
      && [commit, 'HEAD'].includes(row.commit) && Date.parse(row.createdAt) >= Date.parse(o.since)
      && Date.parse(row.createdAt) <= now() && (row.commit !== 'HEAD' || ['pending','failed'].includes(status(row))), 'queue_identity_changed');
    return { state: status(row), queue: row, deploymentIds: [{ targetId: row.targetId, deploymentId: row.deploymentId }] };
  };
  const health = async (m, s, o = {}) => {
    const t = bound(m, s), rollback = o.rollback === true;
    check(o.targetId === undefined || o.targetId === t.targetId, 'target_changed');
    const row = await gateway.inspectRuntime(t.targetId, { rollback });
    if (row.runtime.services.some(service => ['app', 'database'].includes(service.role) && service.health === 'starting')) {
      // Starting is a read-only wait condition, never deployment or data proof.
      // Establish every immutable source/image/mount/queue fact before waiting;
      // the installed DB fingerprint remains forbidden until health is ready.
      const expected = phase(t, rollback), runtime = { ...row.runtime, services: row.runtime.services.map(service =>
        ['app', 'database'].includes(service.role) && service.health === 'starting' ? { ...service, health: 'healthy' } : service) };
      check(row.targetId === t.targetId && row.binding.commit === (rollback ? m.rollback.commit : s.commit)
        && row.binding.tree === (rollback ? s.baseTree : s.candidateTree), 'runtime_identity_unproven');
      let proof;
      try { proof = qualifyComposeRuntime({ expected, configuration: row.configuration, runtime, binding: row.binding }); }
      catch { deny('runtime_identity_unproven'); }
      check(!rollback || t.baseline.images.every(image => proof.services.some(service =>
        service.name === image.name && service.imageDigest === image.imageDigest)), 'runtime_identity_unproven');
      return { state: 'pending', settling: true, composeTargets: [{ targetId: row.targetId,
        configuration: row.configuration, runtime: row.runtime, binding: row.binding }],
        deploymentIds: [{ targetId: t.targetId, deploymentId: row.binding.deploymentId }] };
    }
    const probes = await gateway.checkServices(m, { rollback });
    check(probes && typeof probes.healthy === 'boolean' && hash.test(probes.healthDigest)
      && probes.dataDigest === m.baseline.dataDigest, 'health_or_data_unproven');
    const evidence = { deployedCommit: rollback ? m.rollback.commit : s.commit,
      deployedTree: rollback ? s.baseTree : s.candidateTree,
      artifactSetDigest: rollback ? m.rollback.artifactSetDigest : m.deployment.artifactSetDigest,
      configDigest: rollback ? m.rollback.configDigest : m.deployment.configDigest,
      schemaDigest: m.deployment.schemaDigest, healthDigest: probes.healthDigest, dataDigest: probes.dataDigest,
      healthy: probes.healthy && row.healthy === true,
      composeTargets: [{ targetId: row.targetId, configuration: row.configuration, runtime: row.runtime, binding: row.binding }],
      deploymentIds: [{ targetId: t.targetId, deploymentId: row.binding?.deploymentId }],
      deployedSetDigest: contract.releaseDigest([{ targetId: t.targetId, runtimeSetDigest: composeRuntimeSetDigest(row.runtime.services) }]),
      observedAt: new Date(now()).toISOString() };
    // Keep every raw service fact. The shared verifier may attribute a health
    // failure, but never accepts a changed image, migration or source as success.
    check(contract.composeEvidenceError({ ...s, manifest: m }, evidence, rollback, t.targetId, evidence.healthy === false) === null,
      'runtime_identity_unproven');
    return evidence;
  };
  const reconcileOnce = async (m, s, o) => {
    const result = await queue(m, s, o);
    if (['absent','failed'].includes(result.state)) {
      check(typeof gateway.inspectRecovery==='function','recovery_reader_required');
      const context=optionsFor(m,s,o),evidence=await gateway.inspectRecovery(context);
      check(contract.composeRecoveryEvidenceError({...s,manifest:m},evidence,{id:o.operationId,createdAt:o.since,
        operation:o.rollback?'rollback':'deploy',intent:o.operationIntent??{parameters:{targetId:context.targetId}}})===null
        &&(result.state==='absent'?evidence.composeRecovery.kind==='queue_absent':['queue_failed','queue_failed_partial'].includes(evidence.composeRecovery.kind))
        &&contract.releaseDigest(evidence.composeRecovery.queue)===contract.releaseDigest(result.queue??null), 'recovery_unproven');
      return {...result,evidence,composeRecovery:evidence.composeRecovery};
    }
    if (result.state !== 'finished') return result;
    const evidence = await health(m, s, o);
    check(contract.releaseDigest(result.deploymentIds) === contract.releaseDigest(evidence.deploymentIds), 'runtime_queue_changed');
    return { ...result, ...evidence };
  };
  const isSettling = result => result.settling === true || result.state === 'finished' && result.composeTargets?.some(r => r.runtime.services.some(s =>
    ['app', 'database'].includes(s.role) && s.health === 'starting'));
  const waitForDeployment = async (m, s, o) => {
    const deadline = now() + 60000;
    do {
      if (o.stopped?.()) deny('wait_stopped', true);
      const result = await reconcileOnce(m, s, o);
      const settling = isSettling(result);
      if (result.state !== 'pending' && !settling) return result;
      if (now() >= deadline) return { ...result, state: 'uncertain' };
      await sleep(Math.min(1000, deadline - now()));
    } while (true);
  };
  const reconcileDeployment = async (m, s, o) => {
    const result = await reconcileOnce(m, s, o);
    // Reconciliation can observe the same finished queue while its new
    // containers are still starting. Only bounded reads may settle it.
    return isSettling(result) ? waitForDeployment(m, s, o) : result;
  };
  const start = async (m, s, o, rollback) => {
    const context = optionsFor(m, s, { ...o, rollback }), t = bound(m, s);
    let result = await queue(m, s, context);
    if (result.state === 'uncertain') deny('queue_unproven');
    if (result.state === 'absent') {
      await safety(m);
      check((await configuration(t, rollback)).gitCommit === (rollback ? m.rollback.commit : s.commit), 'source_pin_changed');
      try { await gateway.deployTarget(context); } catch(error) { deny('dispatch_uncertain', true, error); }
      result = await queue(m, s, context);
      if (result.state === 'absent') deny('dispatch_uncertain', true);
    }
    return ['pending', 'finished'].includes(result.state) ? waitForDeployment(m, s, context) : result;
  };
  const reconcileConfiguration = async (m, s, o = {}) => {
    const t = bound(m, s), rollback = o.rollback === true, row = await gateway.inspectConfiguration(t.targetId);
    const matches = composeConfigurationDigest(row) === phase(t, rollback).configDigest
      && row.gitCommit === (rollback ? m.rollback.commit : s.commit);
    if(!matches&&!rollback&&composeConfigurationDigest(row)===t.baseline.configDigest&&typeof gateway.inspectConfigurationAbsence==='function'){
      const options=optionsFor(m,s,o),evidence=await gateway.inspectConfigurationAbsence(options);
      check(contract.composeConfigAbsenceEvidenceError({...s,manifest:m},evidence,{id:options.operationId,createdAt:options.since,operation:'deploy_config'})===null,'configuration_absence_unproven');
      return {state:'absent',evidence};
    }
    // A changed pin alone cannot prove that an uncertain mutation did not run.
    return { state: matches ? 'applied' : 'uncertain', deployedCommit: rollback ? m.rollback.commit : s.commit,
      artifactSetDigest: rollback ? m.rollback.artifactSetDigest : m.deployment.artifactSetDigest,
      configDigest: rollback ? m.rollback.configDigest : m.deployment.configDigest, schemaDigest: m.deployment.schemaDigest };
  };
  const observe = async (m, s, o = {}) => {
    bound(m, s); const end = now() + m.observation.seconds * 1000, started = now(); let failures = 0, evidence;
    do {
      if (o.stopped?.()) deny('observation_stopped', true);
      evidence = await health(m, s, o);
      if (!evidence.healthy && ++failures > m.observation.maxFailures) break;
      if (now() >= end) break;
      await sleep(Math.min(m.observation.intervalSeconds * 1000, end - now()));
    } while (true);
    return { ...evidence, observationSeconds: Math.floor((now() - started) / 1000) };
  };
  return Object.freeze({ inspect, health, observe, reconcileDeployment, waitForDeployment, reconcileConfiguration,
    configureCandidate: (m, s) => configure(m, s, false), configureRollback: (m, s) => configure(m, s, true),
    deploy: (m, s, o) => start(m, s, o, false), rollback: (m, s, o) => start(m, s, o, true) });
}
