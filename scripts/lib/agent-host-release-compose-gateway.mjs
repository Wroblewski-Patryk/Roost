import { createHash } from 'node:crypto';
import { z } from 'zod';
import { composeConfigurationSchema, composeConfigurationDigest, qualifyComposeRuntime }
  from './agent-host-release-compose-state.mjs';
import { coolifyGitSetDeploymentId } from './agent-host-release-coolify-git-set-gateway.mjs';
import { composePhaseCapabilitySchema, composePhasePolicySchema, composePhasePolicyDigest, composePhaseArtifactFile,
  renderComposePhaseCommands, composePhaseValidationPhp, composeControllerPolicyRecord } from './agent-host-release-compose-controller.mjs';
import { composeControllerInvariantPhp,composeConfigurationTemplateSchema } from './agent-host-release-compose-inspector.mjs';

const hash = z.string().regex(/^[a-f0-9]{64}$/), sha = z.string().regex(/^[a-f0-9]{40}$/);
const image = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const date = z.string().datetime({ offset: true });
const canonicalPath = z.string().max(200).regex(/^\/[A-Za-z0-9._/-]+$/)
  .refine(value => !value.slice(1).split('/').some(part => ['', '.', '..'].includes(part)));
const sourcePinsSchema = z.object({ queueHelper: hash, deploymentJob: hash, applicationModel: hash, composeParser: hash }).strict();
const payloadSchema = z.object({ targetId: id, composePath: canonicalPath, repositoryPath: z.string().max(200)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/), branch: z.string().max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/)
  .refine(value => !value.includes('..') && !value.includes('//')),
  deploymentId: z.string().regex(/^r[a-f0-9]{23}$/), commit: sha, rollback: z.boolean(), sourcePins: sourcePinsSchema,
  phaseCapability: composePhaseCapabilitySchema.optional(),configurationTemplate:composeConfigurationTemplateSchema.optional() }).strict();
const queueSchema = z.object({ targetId: id, deploymentId: id, commit: z.union([sha, z.literal('HEAD')]),
  status: z.enum(['queued', 'in_progress', 'finished', 'failed', 'cancelled-by-user']), createdAt: date,
  finishedAt: date.nullable() }).strict();
const deny = (reason, uncertain = false, cause) => {
  throw Object.assign(Error(`release_compose_gateway_${reason}`, cause === undefined ? undefined : {cause}), { retryable: false, uncertain });
};
const check = (value, reason, uncertain = false) => { if (!value) deny(reason, uncertain); };
const parse = (schema, value, reason) => { const result = schema.safeParse(value); if (!result.success) deny(reason); return result.data; };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

/** This same function is executed by production PHP and local stubbed PHP tests. */
export const composeQueueOperationPhp = String.raw`
function roost_compose_queue($a,$p,$readSource,$readQueue,$dispatch,$hasActive,$validatePhase=null){
 if($a->uuid!==$p['targetId']||$a->build_pack!=='dockercompose'||$a->docker_compose_location!==$p['composePath']
  ||$a->git_repository!==$p['repositoryPath']||$a->git_branch!==$p['branch'])throw new Exception('scope');
 $paths=['queueHelper'=>'/var/www/html/bootstrap/helpers/applications.php',
 'deploymentJob'=>'/var/www/html/app/Jobs/ApplicationDeploymentJob.php',
 'applicationModel'=>'/var/www/html/app/Models/Application.php','composeParser'=>'/var/www/html/bootstrap/helpers/parsers.php'];
 foreach($paths as $key=>$path)if($readSource($path)!==$p['sourcePins'][$key])throw new Exception('source');
 $q=$readQueue($p['deploymentId']);
 if($q!==null&&($q['targetId']!==$a->uuid||$q['deploymentId']!==$p['deploymentId']
  ||!in_array($q['commit'],[$p['commit'],'HEAD'],true)))throw new Exception('queue');
 if($p['operation']==='read')return $q;
 if($p['operation']!=='dispatch')throw new Exception('operation');
 if($q!==null)return $q;
 if($a->git_commit_sha!==$p['commit']||$a->settings->is_auto_deploy_enabled!==false||$hasActive())throw new Exception('configuration');
 // Normal Compose builds --pull. Only the installed fixed image-only phase
 // controller can authorize a different, fully rechecked rollback path.
 if(!isset($p['phaseCapability'])||$validatePhase===null||$validatePhase($a,$p['phaseCapability'])!==true)
  throw new Exception('exact_rollback_transport_unavailable');
 $dispatch($a,$p);$q=$readQueue($p['deploymentId']);
 if($q===null||$q['targetId']!==$a->uuid||$q['deploymentId']!==$p['deploymentId']
  ||!in_array($q['commit'],[$p['commit'],'HEAD'],true))throw new Exception('dispatch');
 return $q;
}
`;

const queueMainPhp = String.raw`
error_reporting(0);ini_set('display_errors','0');
try{
require '/var/www/html/vendor/autoload.php';$app=require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
${composeQueueOperationPhp}
${composePhaseValidationPhp}
${composeControllerInvariantPhp}
$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();
$read=function($uuid)use($a){$q=App\Models\ApplicationDeploymentQueue::where('deployment_uuid',$uuid)->first();
 if(!$q)return null;if((string)$q->application_id!==(string)$a->id)throw new Exception('identity');
 return ['targetId'=>$a->uuid,'deploymentId'=>$q->deployment_uuid,'commit'=>$q->commit,'status'=>$q->status,
 'createdAt'=>$q->created_at->toISOString(),'finishedAt'=>$q->finished_at?->toISOString()];};
$call=fn()=>roost_compose_queue($a,$p,fn($path)=>hash_file('sha256',$path),$read,
 fn($application,$value)=>queue_application_deployment(application:$application,deployment_uuid:$value['deploymentId'],
 commit:$value['commit'],force_rebuild:false,is_api:true,rollback:$value['rollback']),
 fn()=>App\Models\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->exists(),
 fn($application,$cap)=>roost_validate_compose_phase($application,$cap,fn($file)=>file_get_contents($file),
  fn($file)=>hash_file('sha256',$file),fn($command)=>instant_remote_process([$command],$application->destination->server,true),
  fn($application)=>roost_compose_controller_invariants($application,$p['configurationTemplate']??null)));
$queue=$p['operation']==='dispatch'?Illuminate\Support\Facades\Cache::lock('roost-release-'.$p['deploymentId'],30)->block(3,$call):$call();
echo json_encode(['ok'=>true,'queue'=>$queue],JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo '{"ok":false}';exit(1);}
`;

/** Fixed code and bounded typed data only. No caller-selected PHP/shell program. */
export function createFixedComposeQueueTransport({ runOwned, sshBinary, sshHost, containerName = 'coolify', timeoutMs = 25000 }) {
  check(typeof runOwned === 'function' && typeof sshBinary === 'string'
    && /^(?:[A-Za-z]:[\\/][^\x00\r\n]+|\/[^\x00\r\n]+)$/.test(sshBinary)
    && /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(sshHost) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(containerName)
    && Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 25000, 'transport_configuration_invalid');
  return Object.freeze({ async run(operation, input) {
    check(['read', 'dispatch'].includes(operation), 'operation_invalid');
    const payload = parse(payloadSchema, input, 'transport_input_invalid');
    if (operation === 'dispatch' && !payload.phaseCapability) deny('exact_rollback_transport_unavailable');
    check(payload.phaseCapability === undefined || operation === 'dispatch'
      && payload.phaseCapability.phase === (payload.rollback ? 'rollback' : 'candidate') && payload.phaseCapability.targetId === payload.targetId
      && payload.phaseCapability.commit === payload.commit
      && Object.keys(payload.sourcePins).every(key => payload.phaseCapability.sourcePins[key] === payload.sourcePins[key]), 'phase_capability_invalid');
    const data = Buffer.from(JSON.stringify({ ...payload, operation })).toString('base64');
    let result;
    try { result = await runOwned({ file: sshBinary, args: ['-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
      '-o', 'ConnectTimeout=8', sshHost, `docker exec -i ${containerName} php`],
      stdin: `<?php\n$p=json_decode(base64_decode('${data}',true),true,32,JSON_THROW_ON_ERROR);\n${queueMainPhp}`,
      timeoutMs, maxOutputBytes: 8192, write: operation === 'dispatch' }); }
    catch (error) { deny('transport_unproven', operation === 'dispatch', error); }
    check(typeof result?.stdout === 'string' && Buffer.byteLength(result.stdout) <= 8192, 'response_invalid', operation === 'dispatch');
    let response; try { response = JSON.parse(result.stdout); } catch { deny('response_invalid', operation === 'dispatch'); }
    const parsed = z.object({ ok: z.literal(true), queue: queueSchema.nullable() }).strict().safeParse(response);
    check(result.exitCode === 0 && parsed.success, 'response_unproven', operation === 'dispatch');
    return { queue: parsed.data.queue };
  } });
}

/**
 * Transform ONLY a hash-sealed trusted parsed Compose document. This generates
 * an exact no-build rollback document, not a claim that the current Coolify
 * Application API/job accepts it. Its current PATCH excludes docker_compose_raw
 * and loadComposeFile overwrites raw content from Git on every deployment.
 */
export function composeRollbackDocumentDigest(document) {
  check(document && Object.getPrototypeOf(document) === Object.prototype
    && typeof document.services === 'object' && document.services !== null && !Array.isArray(document.services), 'rollback_document_invalid');
  check(Object.keys(document.services).length >= 3 && Object.keys(document.services).length <= 12
    && Object.entries(document.services).every(([name, service]) => id.safeParse(name).success
      && service && Object.getPrototypeOf(service) === Object.prototype), 'rollback_document_invalid');
  let encoded; try { encoded = JSON.stringify(document, (_key, value) => {
    check(value === null || ['string', 'number', 'boolean', 'object'].includes(typeof value), 'rollback_document_invalid');
    if (typeof value === 'number') check(Number.isFinite(value), 'rollback_document_invalid');
    if (value && typeof value === 'object') check(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype, 'rollback_document_invalid');
    return value;
  }); } catch { deny('rollback_document_invalid'); }
  check(Buffer.byteLength(encoded) <= 131072, 'rollback_document_invalid');
  return digest(document);
}

export function createImmutableComposeRollback({ document, sourceDocumentDigest, images }) {
  check(hash.safeParse(sourceDocumentDigest).success && composeRollbackDocumentDigest(document) === sourceDocumentDigest,
    'rollback_source_changed');
  const sealed = parse(z.array(z.object({ name: id, imageDigest: image }).strict()).min(1).max(11), images, 'rollback_images_invalid');
  const built = Object.entries(document.services).filter(([, service]) => service && Object.hasOwn(service, 'build')).map(([name]) => name);
  check(new Set(sealed.map(row => row.name)).size === sealed.length && sealed.length === built.length
    && built.every(name => sealed.some(row => row.name === name)), 'rollback_service_set_changed');
  const output = structuredClone(document);
  for (const row of sealed) { delete output.services[row.name].build; output.services[row.name].image = row.imageDigest; }
  const recovered = structuredClone(output);
  for (const name of built) {
    recovered.services[name].build = structuredClone(document.services[name].build);
    if (Object.hasOwn(document.services[name], 'image')) recovered.services[name].image = document.services[name].image;
    else delete recovered.services[name].image;
  }
  check(composeRollbackDocumentDigest(recovered) === sourceDocumentDigest
    && !Object.values(output.services).some(service => Object.hasOwn(service, 'build')), 'rollback_other_configuration_changed');
  return { sourceDocumentDigest, rollbackDocumentDigest: composeRollbackDocumentDigest(output), document: output,
    images: sealed.slice().sort((a, b) => a.name.localeCompare(b.name)), dispatchQualified: false };
}

/** Installed callbacks are trusted code; neither packets nor settings select them. */
export function createComposeReleaseGateway({ releaseId, expected, rollbackExpected, rollbackPolicy, candidatePolicy, binding, sourcePins, repositoryPath, transport,
  readConfiguration, readRuntime, readBuildImages, configureTarget, inspectRemote, assertSafety, prepareRollbackPhase, prepareCandidatePhase, configurationTemplate }) {
  const template=configurationTemplate===undefined?undefined:parse(composeConfigurationTemplateSchema,configurationTemplate,'template_invalid');
  const declared = parse(z.object({ configuration: composeConfigurationSchema, configDigest: hash }).strict(), expected, 'configuration_invalid');
  const source = parse(z.object({ commit: sha, tree: sha, baselineCommit: sha, baselineTree: sha }).strict(), binding, 'binding_invalid');
  const pins = parse(sourcePinsSchema, sourcePins, 'source_pins_invalid');
  check(z.string().uuid().safeParse(releaseId).success && typeof transport?.run === 'function'
    && [readConfiguration, readRuntime, readBuildImages, configureTarget, inspectRemote, assertSafety].every(fn => typeof fn === 'function')
    && declared.configDigest === composeConfigurationDigest(declared.configuration)
    && pins.queueHelper === declared.configuration.sourcePins.queueHelper
    && pins.deploymentJob === declared.configuration.sourcePins.deploymentJob, 'configuration_invalid');
  const expectedCopy = structuredClone(declared);
  const rollbackCopy = rollbackExpected === undefined ? expectedCopy
    : parse(z.object({ configuration: composeConfigurationSchema, configDigest: hash }).strict(), rollbackExpected, 'configuration_invalid');
  check(rollbackCopy.configDigest === composeConfigurationDigest(rollbackCopy.configuration)
    && rollbackCopy.configuration.targetId === declared.configuration.targetId, 'configuration_invalid');
  const installedRollbackPolicy = rollbackPolicy === undefined ? undefined : parse(composePhasePolicySchema, rollbackPolicy, 'phase_policy_invalid');
  const installedCandidatePolicy = candidatePolicy === undefined ? undefined : parse(composePhasePolicySchema, candidatePolicy, 'phase_policy_invalid');
  for (const [policy, phaseExpected, phase, commit, tree] of [[installedRollbackPolicy, rollbackCopy, 'rollback', source.baselineCommit, source.baselineTree],
    [installedCandidatePolicy, declared, 'candidate', source.commit, source.tree]]) {
    if (policy) check(policy.releaseId === releaseId && policy.phase === phase && policy.targetId === declared.configuration.targetId
      && policy.commit === commit && policy.tree === tree && policy.phaseConfigDigest === phaseExpected.configDigest
      && policy.composePath === phaseExpected.configuration.composePath && phaseExpected.configuration.sourcePins.controllerRenderer === policy.rendererDigest
      && digest(phaseExpected.configuration.controllerPolicy) === digest(composeControllerPolicyRecord(policy))
      && Object.keys(pins).every(key => policy.sourcePins[key] === pins[key]), 'phase_policy_invalid');
  }
  const state = async (rollback = false) => {
    let value; try { value = await readConfiguration(); } catch (error) { deny('configuration_unproven', false, error); }
    const current = parse(composeConfigurationSchema, value, 'configuration_unproven');
    check(composeConfigurationDigest(current) === (rollback ? rollbackCopy : expectedCopy).configDigest, 'configuration_changed');
    return current;
  };
  const payload = (options = {}) => parse(payloadSchema, { targetId: declared.configuration.targetId,
    composePath: declared.configuration.composePath, repositoryPath, branch: declared.configuration.branch,
    deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId: options.operationId,
      targetId: declared.configuration.targetId, rollback: options.rollback === true }),
    commit: options.rollback === true ? source.baselineCommit : source.commit, rollback: options.rollback === true, sourcePins: pins }, 'operation_invalid');
  const read = async options => {
    check(date.safeParse(options?.since).success, 'operation_invalid');
    const p = payload(options); let response;
    try { response = await transport.run('read', p); } catch (error) { deny('queue_unproven', false, error); }
    const row = parse(z.object({ queue: queueSchema.nullable() }).strict(), response, 'queue_unproven').queue;
    check(row === null || row.targetId === p.targetId && row.deploymentId === p.deploymentId
      && [p.commit, 'HEAD'].includes(row.commit) && Date.parse(row.createdAt) >= Date.parse(options.since), 'queue_identity_changed');
    return row;
  };
  const runtime = async options => {
    const before = await state(options.rollback === true), queue = await read(options);
    check(queue?.status === 'finished' && queue.finishedAt !== null && queue.commit !== 'HEAD', 'runtime_queue_unproven');
    let live, images; try { live = await readRuntime(queue); images = await readBuildImages(queue); } catch (error) { deny('runtime_unproven', false, error); }
    const proof = qualifyComposeRuntime({ expected: options.rollback ? rollbackCopy : expectedCopy, configuration: before, runtime: live,
      binding: { commit: options.rollback ? source.baselineCommit : source.commit,
        tree: options.rollback ? source.baselineTree : source.tree, deploymentId: queue.deploymentId, queue, images } });
    const after = await state(options.rollback === true); check(digest(before) === digest(after), 'configuration_changed_during_inspection');
    return proof;
  };
  return Object.freeze({ inspectTarget: options => state(options?.rollback === true), inspectRuntime: runtime, readQueue: read,
    async configure(mode) {
      check(['candidate', 'rollback'].includes(mode), 'mode_invalid');
      await state(); await assertSafety();
      const commit = mode === 'rollback' ? source.baselineCommit : source.commit;
      if (mode === 'candidate') check((await inspectRemote())?.mainCommit === commit, 'remote_changed');
      try { await configureTarget(Object.freeze({ targetId: declared.configuration.targetId,
        expectedConfigDigest: declared.configDigest, desiredConfigDigest: (mode === 'rollback' ? rollbackCopy : declared).configDigest,
        commit, mode })); } catch (error) { deny('configuration_result_uncertain', true, error); }
      const after = await state(mode === 'rollback'); check(after.gitCommit === commit, 'configuration_result_uncertain', true);
      return { targetId: after.targetId, commit, configDigest: (mode === 'rollback' ? rollbackCopy : declared).configDigest };
    },
    async deploy(options) {
      const existing = await read(options); if (existing) return existing;
      await assertSafety(); const before = await state(options?.rollback === true), p = payload(options);
      check(before.gitCommit === p.commit && (options?.rollback || (await inspectRemote())?.mainCommit === source.commit), 'source_pin_changed');
      if (options?.rollback || installedCandidatePolicy) {
        const policy = options?.rollback ? installedRollbackPolicy : installedCandidatePolicy;
        const prepare = options?.rollback ? prepareRollbackPhase : prepareCandidatePhase;
        check(typeof prepare === 'function' && policy, 'exact_rollback_transport_unavailable');
        const cap = parse(composePhaseCapabilitySchema, await prepare(Object.freeze({ operationId: options.operationId,
          since: options.since, targetId: before.targetId, commit: p.commit, tree: policy.tree })), 'phase_capability_invalid');
        check(cap.releaseId === releaseId && cap.targetId === before.targetId && cap.phase === policy.phase
          && cap.commit === policy.commit && cap.tree === policy.tree && cap.phaseConfigDigest === policy.phaseConfigDigest
          && cap.policyDigest === composePhasePolicyDigest(policy)
          && cap.policyId === policy.policyId && cap.rendererDigest === policy.rendererDigest
          && cap.settingsInvariantDigest === policy.settingsInvariantDigest && cap.runtimeInvariantDigest === policy.runtimeInvariantDigest
          && cap.artifactDigest === policy.artifactDigest && cap.artifactFile === composePhaseArtifactFile(policy)
          && cap.buildCommandDigest === createHash('sha256').update(renderComposePhaseCommands(policy).build).digest('hex')
          && cap.startCommandDigest === createHash('sha256').update(renderComposePhaseCommands(policy).start).digest('hex')
          && digest(cap.services) === digest(policy.services) && digest(cap.sourcePins) === digest(policy.sourcePins), 'phase_capability_invalid');
        p.phaseCapability = cap;
        if(template)p.configurationTemplate=template;
      }
      try { await transport.run('dispatch', p); } catch (error) { deny('dispatch_result_uncertain', true, error); }
      const row = await read(options); check(row !== null, 'dispatch_result_uncertain', true);
      if (!options?.rollback) check((await inspectRemote())?.mainCommit === source.commit, 'remote_changed_after_dispatch', true);
      return row;
    },
    async reconcileDeployment(options) {
      const row = await read(options);
      if (!row) return { state: 'absent', absenceVerified: true };
      if (['queued', 'in_progress'].includes(row.status)) return { state: 'pending', queue: row };
      if (['failed', 'cancelled-by-user'].includes(row.status)) return { state: 'failed', queue: row };
      return { state: 'finished', queue: row, proof: await runtime(options) };
    },
    async reconcileConfiguration(mode) {
      check(['candidate', 'rollback'].includes(mode), 'mode_invalid');
      const current = await state(mode === 'rollback'), commit = mode === 'rollback' ? source.baselineCommit : source.commit;
      // A different pin is not absence proof without an original sealed preimage.
      return { state: current.gitCommit === commit ? 'applied' : 'uncertain', targetId: current.targetId,
        commit: current.gitCommit, configDigest: (mode === 'rollback' ? rollbackCopy : declared).configDigest };
    }
  });
}
