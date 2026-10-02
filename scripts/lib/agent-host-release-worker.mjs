import { z } from 'zod';
import { readReleaseCredential,releaseApi,releaseClientSchema } from './agent-host-release-client.mjs';
import { createGithubReleaseAdapter,inspectReleaseCheckout } from './agent-host-release-github.mjs';
import { createCoolifyReleaseAdapter } from './agent-host-release-coolify.mjs';
import { createReleaseResourceGateway } from './agent-host-release-resources.mjs';
import { runReleaseStep } from './agent-host-release-broker.mjs';
import { writerRecoveryEvidence } from './agent-host-writer-lock.mjs';
import { createReleaseCleanupGateway } from './agent-host-release-cleanup.mjs';
import { prepareReleaseProcessScope, withReleaseProcessScope } from './agent-host-release-process.mjs';
import { beginReleaseWriterCheckpoint, checkpointReleaseOperation, sealReleaseWriterCheckpoint,
 releaseRecoveryCandidate, clearReleaseWriterRecovery } from './agent-host-release-writer-recovery.mjs';
import { nextReleaseOperation } from './agent-host-release-broker.mjs';
import { createReleaseImageCleanup, createFixedDockerImageCleanupTransport, releaseImageOwnershipSchema } from './agent-host-release-image-cleanup.mjs';
import { coolifyHttpsJson } from './agent-host-release-coolify.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { physicalIdentity } from './agent-host-native-footprint.mjs';
import { createHash } from 'node:crypto';
import { createReleaseBackupGateway } from './agent-host-release-backup.mjs';
import { createReleaseRegistryProof } from './agent-host-release-registry-proof.mjs';

const target=z.string().regex(/^Roost\/Gate3\/[A-Za-z0-9._-]{1,80}$/),hash=z.string().regex(/^[a-f0-9]{64}$/);
const url=z.string().url().refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/';});
const releaseDiagnosticReasons=new Set(['agent_runtime_content_blocked','release_api_uncertain','release_api_response_invalid','release_api_rejected','release_api_input_invalid','release_principal_invalid','release_authority_inactive','release_credential_invalid','release_review_stale','release_source_basis_changed','release_native_candidate_unproven','release_configuration_changed','release_readiness_changed','release_version_stale','release_candidate_changed','release_base_changed','release_operation_unresolved']);
export const releaseWorkerDiagnostic=error=>releaseDiagnosticReasons.has(error?.message)?error.message:'release_preflight_unproven';
export function persistReleaseWorkerDiagnostic(configPath,phase,reason){
 if(!['blocked','uncertainty'].includes(phase))throw Error('release_diagnostic_phase_invalid');
 const safe=phase==='blocked'?releaseWorkerDiagnostic({message:reason}):
  /^(transport_uncertain|response_unproven|response_size_invalid|response_invalid)(_http_[1-5][0-9]{2})?$/.test(reason??'')?reason:'release_effect_unproven';
 // Hidden Windows launchers do not always inherit stderr. Persist only the
 // fixed classification beside the private installation config, never errors.
 try{writeFileSync(path.join(path.dirname(configPath),'release-worker-diagnostic.json'),JSON.stringify({phase,reason:safe,observedAt:new Date().toISOString()}),{mode:0o600});return true;}catch{return false;}
}
export const governedReleaseWorkerSchema=z.object({client:releaseClientSchema,githubCredentialTarget:target,coolifyCredentialTarget:target,
 coolify:z.object({origin:url,targetId:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),candidateConfig:z.record(z.unknown()),rollbackConfig:z.record(z.unknown()),certificateSha256:hash.optional(),healthCertificateSha256:hash.optional()}).strict(),
 resources:z.object({sshHost:z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),workspaceRoot:z.string().min(3),ownershipFile:z.string().min(3)}).strict(),
 imageCleanup:z.object({ownershipFile:z.string().min(3),credentialTarget:target,provenanceCacheDirectory:z.string().min(3),allowTemporaryPackageRemoval:z.boolean().optional()}).strict().optional(),
 prerequisites:z.object({configurationFile:z.string().min(3),evidenceFile:z.string().min(3)}).strict()}).strict();
function verifiedBackup(settings){
 const read=filename=>{physicalIdentity(filename,false);const bytes=readFileSync(filename);if(bytes.length>32768)throw Error('release_prerequisites_invalid');return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));};
 return createReleaseBackupGateway(read(settings.prerequisites.configurationFile)).verifyPrerequisites(read(settings.prerequisites.evidenceFile));
}
const wireConfiguration=e=>({deployedCommit:e.commit,imageDigest:e.imageDigest,configDigest:e.configDigest,schemaDigest:e.schemaDigest});
function wireHealth(e){
 const {deployedCommit,deployedTree,imageDigest,configDigest,schemaDigest,healthDigest,dataDigest,healthy,observationSeconds}=e;
 return{deployedCommit,...(deployedTree?{deployedTree}:{}),imageDigest,configDigest,schemaDigest,healthDigest,dataDigest,healthy,...(observationSeconds===undefined?{}:{observationSeconds})};
}
function coolifyWire(raw){return{
 inspect:(m,b)=>raw.inspect(m,b),
 configureCandidate:async(m,b)=>wireConfiguration(await raw.configureCandidate(m,b)),
 configureRollback:async(m,b)=>wireConfiguration(await raw.configureRollback(m,b)),
 deploy:(m,b)=>raw.deploy(m,b),rollback:(m,b)=>raw.rollback(m,b),
 health:async(m,b,o)=>wireHealth(await raw.health(m,b,o)),observe:async(m,b,o)=>wireHealth(await raw.observe(m,b,o)),
 waitForDeployment:(m,b,o)=>raw.waitForDeployment(m,b,o),
 reconcileConfiguration:async(m,b,o)=>{
  const result=await raw.reconcileConfiguration(m,b,o);
  if(result.state==='absent')return{status:'absent',evidence:{...wireHealth(result.evidence),absenceVerified:true}};
  if(result.state!=='applied')throw Error('release_configuration_reconciliation_unproven');
  const expected=o.rollback?m.rollback:{...m.deployment,commit:b.commit};
  return{status:'succeeded',evidence:wireConfiguration(expected)};
 },
 reconcileDeployment:async(m,b,o)=>{
  const result=await raw.waitForDeployment(m,b,o);
  if(!['finished','failed'].includes(result.state))throw Error('release_deployment_reconciliation_unproven');
  const evidence=wireHealth(await raw.health(m,b,{rollback:o.rollback}));
  return{status:evidence.healthy?'succeeded':'failed',evidence:{...evidence,deploymentId:result.deploymentId}};
 }
};}
// Called only in a dedicated supervised release Worker. All managed model
// processes have exited before this broker receives keys.
export async function getGovernedReleaseRecoveryCandidate({config,baseUrl,hostId}){
 if(!config.governedRelease)return undefined;
 const settings=governedReleaseWorkerSchema.parse(config.governedRelease);
 verifiedBackup(settings);
 if(settings.client.hostId!==hostId)throw Error('release_host_changed');
 const key=await readReleaseCredential(settings.client.credentialTarget);
 const queue=await releaseApi({baseUrl,config:settings.client,key,route:`/v1/agent-runtime/releases?hostId=${hostId}`});
 if(queue.truncated||!Array.isArray(queue.releases)||queue.releases.length>1)throw Error('release_queue_ambiguous');
 return queue.releases[0]?releaseRecoveryCandidate(queue.releases[0],settings.client):undefined;
}
export async function runGovernedReleaseQueueStep({config,baseUrl,hostId,writerLock,stopped}){
 if(!config.governedRelease)return{handled:false};
 let prepared,context;
 try{
  const settings=governedReleaseWorkerSchema.parse(config.governedRelease);
  const backup=verifiedBackup(settings);
  if(settings.client.hostId!==hostId||settings.resources.workspaceRoot!==config.workspaceRoot)throw Error('release_installation_binding_changed');
  const key=await readReleaseCredential(settings.client.credentialTarget);
  const api=(route,options={})=>releaseApi({baseUrl,config:settings.client,key,route,...options});
  const queue=await api(`/v1/agent-runtime/releases?hostId=${hostId}`);
  if(queue.truncated||!Array.isArray(queue.releases)||queue.releases.length>1)throw Error('release_queue_ambiguous');
  const state=queue.releases[0];if(!state)return{handled:false};
  if(writerLock.releaseRecovery&&nextReleaseOperation(state)!=='reconcile')clearReleaseWriterRecovery(writerLock,state,settings.client);
  const s=state.release.snapshot,m=s.manifest;
  if(m.backup.digest!==backup.digest||m.backup.restoreDigest!==backup.restoreDigest||m.backup.bytes!==backup.bytes
    ||m.backup.restoreVerifiedAt!==backup.restoreVerifiedAt)throw Error('release_backup_basis_changed');
  const mappings=Object.values(config.repositories).filter(r=>r.path?.toLowerCase()===m.repository.canonicalDir.toLowerCase()
   &&r.originUrl?.replace(/\.git$/,'')===m.repository.url.replace(/\.git$/,''));
  if(mappings.length!==1)throw Error('release_repository_not_installed');
  const gateway=createReleaseResourceGateway(settings.resources);
  // Credential readers and native launcher construction precede the checkpoint.
  // This dedicated process never claims or launches a model execution.
  const githubKey=await readReleaseCredential(settings.githubCredentialTarget),coolifyKey=await readReleaseCredential(settings.coolifyCredentialTarget);
  const registeredImages=m.cleanup.ownedResourceIds.map(id=>gateway.ownedResource(m,{...s,releaseId:state.release.id},id))
   .filter(row=>['docker_image','ghcr_version'].includes(row.kind));
  if(registeredImages.length&&!settings.imageCleanup)throw Error('release_image_cleanup_not_installed');
  let images;
  if(settings.imageCleanup){
   const filename=settings.imageCleanup.ownershipFile,identity=physicalIdentity(filename,false),bytes=readFileSync(filename);
   if(bytes.length>32768)throw Error('release_image_ownership_invalid');
   const digest=createHash('sha256').update(bytes).digest('hex'),owned=releaseImageOwnershipSchema.parse(JSON.parse(bytes));
   if(owned.releaseId!==state.release.id||owned.applicationId!==s.applicationId||owned.targetId!==m.deployment.targetId||owned.repositoryUrl!==m.repository.url)throw Error('release_image_binding_changed');
   if(registeredImages.length!==owned.resources.length||registeredImages.some(row=>!owned.resources.some(image=>image.resourceId===row.resourceId)))throw Error('release_image_coverage_changed');
   for(const row of owned.resources){
    const registered=gateway.ownedResource(m,{...s,releaseId:state.release.id},row.resourceId);
    if(registered.kind!==row.kind||registered.id!==(row.kind==='docker_image'?row.imageId:String(row.versionId))||registered.createdAt!==row.createdAt
      ||row.kind==='docker_image'&&registered.engine!==row.engine)throw Error('release_image_resource_changed');
   }
   const registryKey=await readReleaseCredential(settings.imageCleanup.credentialTarget);
   images=createReleaseImageCleanup({ownership:owned,allowTemporaryPackageRemoval:settings.imageCleanup.allowTemporaryPackageRemoval??false,readOwnership:()=>{
    const current=readFileSync(filename);
    if(physicalIdentity(filename,false)!==identity||createHash('sha256').update(current).digest('hex')!==digest)throw Error('release_image_ownership_changed');
    return JSON.parse(current);
   },applicationAbsent:async()=>{
    await coolifyHttpsJson({url:`${new URL(settings.coolify.origin).origin}/api/v1/applications/${settings.coolify.targetId}`,method:'GET',expectedStatus:404,token:coolifyKey,certificateSha256:settings.coolify.certificateSha256});return true;
   },dockerTransport:createFixedDockerImageCleanupTransport({sshHost:settings.resources.sshHost,sudo:false}),githubCredential:async()=>registryKey,
   registryProof:createReleaseRegistryProof({cacheDirectory:settings.imageCleanup.provenanceCacheDirectory})});
  }
  prepared=await prepareReleaseProcessScope();
  context=beginReleaseWriterCheckpoint({writerLock,state,client:settings.client});
  const resources=createReleaseCleanupGateway({resources:gateway,coolify:settings.coolify,credential:async()=>coolifyKey,images});
  const github=createGithubReleaseAdapter({credential:async()=>githubKey});
  const raw=createCoolifyReleaseAdapter({...settings.coolify,credential:async()=>coolifyKey,
   imageInspector:resources.imageInspector,configurationInspector:resources.configurationInspector,deploymentInspector:resources.deploymentInspector,runtimeInspector:resources.runtimeInspector});
  const coolify=coolifyWire(raw);
  const result=await withReleaseProcessScope(prepared,context,()=>runReleaseStep({state,client:settings.client,api,github,coolify,resources,stopped,
   inspectCheckout:async(m,commit,base,tree)=>{await gateway.assertClone(m,{...s,releaseId:state.release.id});return inspectReleaseCheckout(m,commit,base,tree);},
   assertWriter:()=>{writerRecoveryEvidence(writerLock);if(writerLock.releaseRecovery&&nextReleaseOperation(state)!=='reconcile')throw Error('release_reconciliation_only');},
   onOperation:(fresh,operation)=>checkpointReleaseOperation(context,fresh,operation,settings.client),
   onChildrenClosed:()=>sealReleaseWriterCheckpoint(context)}));
  sealReleaseWriterCheckpoint(context);
  if(writerLock.releaseRecovery&&result.state?.journal?.every(j=>j.outcome&&j.outcome.status!=='uncertain'))clearReleaseWriterRecovery(writerLock,result.state,settings.client);
  return result;
 }catch(error){
  if(context){try{sealReleaseWriterCheckpoint(context);}catch{}}
  throw Object.assign(Error('release_worker_reconciliation_required'),{releaseBlocked:true,retryable:false,releaseDiagnostic:releaseWorkerDiagnostic(error)});
 }finally{await prepared?.dispose();}
}
