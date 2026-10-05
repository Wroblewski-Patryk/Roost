import { randomUUID } from 'node:crypto';
import contract from './agent-host-release-contract.cjs';
import { inspectReleaseCheckout } from './agent-host-release-github.mjs';

const fail=code=>{throw Object.assign(Error(code),{retryable:false,releaseBlocked:true});};
const effectReasons=new Set(['release_git_push_uncertain','release_git_merge_uncertain','release_git_remote_uncertain',
 'release_git_set_installation_ssh_unavailable','release_git_set_installation_fingerprint_unavailable',
 'release_git_set_gateway_safety_unproven','release_git_set_gateway_configuration_result_uncertain',
 'release_coolify_git_set_configuration_mutation_uncertain','release_coolify_git_set_service_health_unproven',
 'release_compose_identity_invalid','release_compose_queue_identity_invalid','release_compose_deployment_unproven',
 'release_compose_configuration_identity_invalid','release_compose_controller_result_uncertain',
 // Keep fixed configuration guard causes after artifact staging; never retain
 // arbitrary exception text or treat a diagnostic prefix as an approved code.
 'release_coolify_compose_configuration_mutation_uncertain',
 ...['phase_intent_unproven','phase_intent_changed','phase_binding_changed','configuration_preimage_changed',
 'clone_changed','private_file_changed','controller_renderer_changed','live_source_pin_changed',
 'git_scope_invalid','tree_unproven','ssh_unavailable','response_size_invalid'].map(v=>'release_compose_installation_'+v),
 ...['configuration_changed_during_inspection','configuration_unproven','configuration_invalid',
 'controller_unproven','controller_changed','response_invalid','transport_unproven','source_unproven',
 'release_configuration_unprepared','runtime_unproven','service_conflict','mount_declaration_unproven'].map(v=>'release_compose_inspector_'+v),
 'release_api_uncertain','release_api_response_invalid','release_api_rejected','release_api_input_invalid',
 ...['native_assignment_unobserved','native_resume_or_cleanup_unproven','native_exit_failed',
 'native_access_denied','git_ownership_unproven','git_config_unreadable','git_repository_unavailable',
 'ssh_timeout','ssh_connection_closed','ssh_host_identity_unproven'].map(v=>'release_child_'+v)]);
export function releaseEffectDiagnostic(error){
 if(/^(transport_uncertain|response_unproven|response_size_invalid|response_invalid)(_http_[1-5][0-9]{2})?$/.test(error?.transportDiagnostic??''))return error.transportDiagnostic;
 let reason='release_effect_unproven';
 for(let depth=0;error&&depth<5;depth++,error=error.cause)if(effectReasons.has(error.message))reason=error.message;
 return reason;
}
export const releaseOutcomeStatus=o=>!o?null:o.status==='reconciled'?(o.reconciledStatus??o.reconciled_status):o.status;
const completedSet=(state,operation)=>state.release.snapshot.manifest.deployment.targets.every(target=>state.journal.some(j=>j.operation===operation
 &&j.intent?.parameters?.targetId===target.targetId&&releaseOutcomeStatus(j.outcome)==='succeeded'));
export function nextReleaseOperation(state){
 const j=state.journal??[],done=op=>j.some(x=>x.operation===op&&releaseOutcomeStatus(x.outcome)==='succeeded');
 if(contract.retainsApplication(state.release?.snapshot?.manifest)&&j.some(x=>['archive_repository','cleanup_local'].includes(x.operation)))fail('release_retention_policy_violation');
 if(j.some(x=>!releaseOutcomeStatus(x.outcome)||releaseOutcomeStatus(x.outcome)==='uncertain'))return 'reconcile';
 if(contract.isComposeManifest(state.release?.snapshot?.manifest)&&j.some(x=>releaseOutcomeStatus(x.outcome)==='absent'&&(x.outcome?.evidence?.composeRecovery||x.outcome?.evidence?.composeConfigAbsence)))
  fail('release_compose_no_effect_diagnosis_required');
 if(state.status!=='active')return null;
 const post=state.release.snapshot.manifest.postObservation;
 if(post){
  if(!contract.isComposeManifest(state.release.snapshot.manifest))fail('release_post_observation_scope_required');
  for(const operation of j.filter(x=>contract.postObservationOperations.includes(x.operation))){
   const o=operation.outcome,body={requestId:o.requestId??o.request_id,status:o.status,
    ...(o.status==='reconciled'?{reconciledStatus:o.reconciledStatus??o.reconciled_status}:{}),
    observationOnly:o.observationOnly??o.observation_only,evidence:o.evidence};
   const error=contract.postObservationOutcomeError(state.release.snapshot,operation,body,j);
   if(error)fail(error);
  }
  if(j.some(x=>['fixture_cleanup','runtime_resume'].includes(x.operation)&&releaseOutcomeStatus(x.outcome)==='failed'))
   fail('release_post_observation_diagnosis_required');
 }
 if(j.some(x=>x.operation==='rollback'&&releaseOutcomeStatus(x.outcome)==='failed'
  &&!contract.releaseRollbackImageFailureValid(state.release.snapshot,x.outcome.evidence,x.intent.parameters.targetId)
  ||x.operation==='observe'&&x.intent.parameters.mode==='rollback'&&releaseOutcomeStatus(x.outcome)==='failed'))fail('release_recovery_diagnosis_required');
 const failedSmoke=post&&j.some(x=>x.operation==='smoke'&&releaseOutcomeStatus(x.outcome)==='failed');
 if(failedSmoke&&!done('fixture_cleanup'))return nextPostOperation(state,'fixture_cleanup');
 if(failedSmoke||j.some(x=>['deploy','observe'].includes(x.operation)&&releaseOutcomeStatus(x.outcome)==='failed')){
  if(!done('rollback_config'))return 'rollback_config';if(contract.isReleaseSetManifest(state.release.snapshot.manifest)?!completedSet(state,'rollback'):!done('rollback'))return 'rollback';
  if(!j.some(x=>x.operation==='observe'&&x.intent.parameters.mode==='rollback'&&releaseOutcomeStatus(x.outcome)==='succeeded'))return 'observe';
  return nextPostObservation(state,true);
 }
 const sequence=contract.releaseHasSuccessor(state.release.snapshot)||contract.releaseHasPublishedGitBasis(state.release.snapshot)?['deploy_config','deploy','observe']:['push','pr','review','merge','deploy_config','deploy','observe'];
 return sequence.find(op=>op==='deploy'&&contract.isReleaseSetManifest(state.release.snapshot.manifest)?!completedSet(state,'deploy'):!done(op))??nextPostObservation(state,false);
}
function nextPostOperation(state,operation){
 const p=state.release.snapshot.manifest.postObservation;
 const error=contract.postObservationIntentError(state.release.snapshot,{operation,parameters:{postObservationDigest:contract.releaseDigest(p)}},state.journal);
 if(error)fail(error);return operation;
}
function nextPostObservation(state,rollback){
 const p=state.release.snapshot.manifest.postObservation;
 if(!p)return nextCleanup(state);
 const done=operation=>state.journal.some(j=>j.operation===operation&&releaseOutcomeStatus(j.outcome)==='succeeded');
 if(!rollback&&!done('smoke'))return nextPostOperation(state,'smoke');
 if(state.journal.some(j=>j.operation==='smoke')&&!done('fixture_cleanup'))return nextPostOperation(state,'fixture_cleanup');
 if(!done('runtime_resume'))return nextPostOperation(state,'runtime_resume');
 const operation=nextCleanup(state);
 return operation?nextPostOperation(state,operation):null;
}
function nextCleanup(state){
 const j=state.journal,done=(op,resource)=>j.some(x=>x.operation===op&&releaseOutcomeStatus(x.outcome)==='succeeded'&&(!resource||x.intent.parameters.resourceId===resource));
 if(state.release.snapshot.manifest.cleanup.ownedResourceIds.some(id=>!done('cleanup_resource',id)))return 'cleanup_resource';
 return (contract.retainsApplication(state.release.snapshot.manifest)?['cleanup']:['archive_repository','cleanup_local','cleanup']).find(op=>!done(op))??null;
}
// Declaration is not ownership proof. The fixed gateway must resolve the ID
// from its sealed ledger; permanent targets and release/rollback artifacts are
// never disposable, even if somebody lists them among owned resources.
async function assertDisposable(manifest,binding,resources,id){
 if(!contract.retainsApplication(manifest))return;
 const p=manifest.cleanup.protectedResourceIds;
 if(!manifest.cleanup.ownedResourceIds.includes(id)||p.includes(id)||typeof resources?.ownedResource!=='function')fail('release_cleanup_scope_invalid');
 const row=await resources.ownedResource(manifest,binding,id);
 if(!row||row.resourceId!==id||row.temporary!==true||!['container','network','volume','docker_image','ghcr_version'].includes(row.kind)
  ||p.some(value=>[row.id,row.imageId,row.imageDigest,row.publicationDigest].includes(value))
  ||[manifest.deployment.imageDigest,manifest.baseline.imageDigest,...(manifest.deployment.targets??[]).flatMap(t=>[t.baseline.imageDigest,...(t.baseline.images??[]).map(r=>r.imageDigest),...(t.baseline.configuration?.services??[]).map(r=>r.imageDigest)])]
   .filter(Boolean).some(value=>[row.id,row.imageId,row.imageDigest,row.publicationDigest].includes(value)))fail('release_cleanup_protected_resource');
}
async function verifyRetention(manifest,binding,{resources,github,inspectCheckout}){
 if(typeof resources?.verifyRetention!=='function')fail('release_retention_gateway_required');
 const local=await inspectCheckout(manifest,binding.commit,binding.baseCommit,binding.candidateTree);
 const remote=await github.inspect(manifest,{allowArchived:false});
 const retained=await resources.verifyRetention(manifest,binding);
 if(local?.commit!==binding.commit||local?.tree!==binding.candidateTree||remote?.remoteBase!==binding.commit||remote?.remoteTree!==binding.candidateTree
  ||retained?.applicationActive!==true||retained.targetId!==manifest.deployment.targetId
  ||retained.protectedResourcesDigest!==contract.releaseDigest(manifest.cleanup.protectedResourceIds)
  ||retained.absenceVerified!==true||contract.releaseDigest(retained.resourceIds??[])!==contract.releaseDigest(manifest.cleanup.ownedResourceIds))fail('release_retention_unproven');
 return {retentionVerified:true,repositoryUrl:manifest.repository.url,canonicalDir:manifest.repository.canonicalDir,targetId:retained.targetId,
  applicationActive:true,protectedResourcesDigest:retained.protectedResourcesDigest,localCommit:local.commit,localTree:local.tree,
  remoteCommit:remote.remoteBase,remoteTree:remote.remoteTree,repositoryArchived:false,localAbsent:false,absenceVerified:true,resourceIds:retained.resourceIds};
}
function validateState(state,client){
 if(!state?.release?.id||!Array.isArray(state.journal))fail('release_view_invalid');
 const {readinessDigest:_readiness,configurationDigest:_configuration,successorBasis,publishedGitBasis,...snapshot}=state.release.snapshot;
 const s=contract.createReleaseSchema.parse(snapshot);
 if(s.predecessor||successorBasis){if(s.predecessor?.releaseId===state.release.id||!contract.releaseHasSuccessor({...s,successorBasis}))fail('release_successor_binding_changed');s.successorBasis=successorBasis;}
 if(s.baselineRestart||publishedGitBasis){if(s.baselineRestart?.releaseId===state.release.id||!contract.releaseHasPublishedGitBasis({...s,successorBasis,publishedGitBasis}))fail('release_publication_binding_changed');s.publishedGitBasis=publishedGitBasis;}
 if(s.hostId!==client.hostId||s.releaserAgentId!==client.agentId||state.release.manifestDigest!==s.manifestDigest
  ||contract.releaseDigest(s.manifest)!==s.manifestDigest)fail('release_binding_changed');
 return {...s,releaseId:state.release.id};
}
function parameters(operation,s,state){
 const m=s.manifest;
 if(contract.postObservationOperations.includes(operation))return {postObservationDigest:contract.releaseDigest(m.postObservation)};
 if(operation==='push')return{branch:m.repository.candidateBranch};
 if(['review','merge'].includes(operation))return{pullRequestNumber:state.journal.find(j=>j.operation==='pr'&&releaseOutcomeStatus(j.outcome)==='succeeded')?.outcome?.evidence?.pullRequestNumber};
 const artifact=value=>contract.isReleaseSetManifest(m)?{artifactSetDigest:value.artifactSetDigest}:{imageDigest:value.imageDigest};
 const target=op=>contract.isReleaseSetManifest(m)?{targetId:m.deployment.targets.find(t=>!state.journal.some(j=>j.operation===op&&j.intent?.parameters?.targetId===t.targetId&&releaseOutcomeStatus(j.outcome)==='succeeded'))?.targetId}:{};
 if(['deploy_config','deploy'].includes(operation))return{commit:s.commit,...artifact(m.deployment),configDigest:m.deployment.configDigest,schemaDigest:m.deployment.schemaDigest,...(operation==='deploy'?target(operation):{})};
 if(['rollback_config','rollback'].includes(operation))return{commit:m.rollback.commit,...artifact(m.rollback),configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest,...(operation==='rollback'?target(operation):{})};
 if(operation==='observe')return{mode:state.journal.some(j=>j.operation==='rollback'&&releaseOutcomeStatus(j.outcome)==='succeeded')?'rollback':'candidate'};
 if(operation==='cleanup_resource')return{resourceId:m.cleanup.ownedResourceIds.find(id=>!state.journal.some(j=>j.operation==='cleanup_resource'&&j.intent.parameters.resourceId===id&&releaseOutcomeStatus(j.outcome)==='succeeded'))};
 if(operation==='cleanup')return{resourceIds:m.cleanup.ownedResourceIds};
 return{};
}
const dated=e=>({...e,observedAt:new Date().toISOString()});
// Trusted fixed adapters return phase evidence, never executable packet input.
// An invalid reply after an effect becomes uncertainty; it is not silently
// projected into success or retried. Reconciliation invokes only the reader.
function postObservationResult(result,s,operation,state,reconciled=false){
 if(!result||Object.keys(result).some(k=>!['status','evidence'].includes(k))||!['succeeded','failed'].includes(result.status)
  ||!result.evidence||Object.keys(result.evidence).some(k=>k!=='postObservation'))fail('release_post_observation_result_unproven');
 const body=contract.outcomeSchema.parse({requestId:randomUUID(),status:reconciled?'reconciled':result.status,
  ...(reconciled?{reconciledStatus:result.status}:{}),observationOnly:reconciled,evidence:dated(result.evidence)});
 const error=contract.postObservationOutcomeError(s,operation,body,state.journal);
 if(error)fail(error);return result;
}
function effectiveExpiry(state,snapshot){
 const expiry=contract.releaseExpirySchema.safeParse(state.effectiveExpiresAt??snapshot.expiresAt);
 if(!expiry.success)fail('release_expiry_unproven');
 return Date.parse(expiry.data);
}
function releaseSetEvidence(e,manifest,binding,{configuration=false,rollback=false,deploymentIds}={}){
 if(!contract.isReleaseSetManifest(manifest))return e;
 if(contract.isComposeManifest(manifest))return composeEvidence(e,manifest,binding,{configuration,rollback,deploymentIds});
 if(e.imageDigest!==undefined||e.deploymentId!==undefined)fail('release_git_set_identity_invalid');
 const result={deployedCommit:e.deployedCommit??e.commit,artifactSetDigest:e.artifactSetDigest,
  configDigest:e.configDigest,schemaDigest:e.schemaDigest};
 if(configuration)return result;
 for(const key of ['deployedTree','deployedSetDigest','deployedTargets','healthDigest','dataDigest','healthy','observationSeconds','absenceVerified','failureKind'])
  if(e[key]!==undefined)result[key]=e[key];
 result.deploymentIds=deploymentIds??e.deploymentIds;
 return result;
}
function composeEvidence(e,manifest,binding,{configuration=false,rollback=false,deploymentIds}={}){
 if(!e||e.imageDigest!==undefined||e.deploymentId!==undefined||e.deployedTargets!==undefined)fail('release_compose_identity_invalid');
 const expected=rollback==='baseline'?manifest.baseline:rollback?manifest.rollback:manifest.deployment;
 const result={deployedCommit:e.deployedCommit??e.commit,artifactSetDigest:e.artifactSetDigest,
  configDigest:e.configDigest,schemaDigest:e.schemaDigest};
 if(configuration){
  if(e.composeTargets!==undefined||e.deploymentIds!==undefined||result.deployedCommit!==(rollback?manifest.rollback.commit:binding.commit)
   ||result.artifactSetDigest!==expected.artifactSetDigest||result.configDigest!==expected.configDigest||result.schemaDigest!==expected.schemaDigest)
   fail('release_compose_configuration_identity_invalid');
  return result;
 }
 for(const key of ['deployedTree','deployedSetDigest','composeTargets','healthDigest','dataDigest','healthy','observationSeconds','absenceVerified'])
  if(e[key]!==undefined)result[key]=e[key];
 // Do not relabel a health result using another queue's return value. Both the
 // fixed reader facts and the journal/transport queue must identify one effect.
 if(deploymentIds!==undefined&&e.deploymentIds!==undefined&&contract.releaseDigest(deploymentIds)!==contract.releaseDigest(e.deploymentIds))
  fail('release_compose_queue_identity_invalid');
 result.deploymentIds=deploymentIds??e.deploymentIds;
 if(contract.composeEvidenceError({...binding,manifest},dated(result),rollback,undefined,result.healthy===false))fail('release_compose_deployment_unproven');
 return result;
}
function assertComposeQueueIds(manifest,rows,targetId){
 if(!contract.isComposeManifest(manifest))return;
 if(!Array.isArray(rows)||rows.length!==1||rows[0].targetId!==(targetId??manifest.deployment.targetId)
  ||typeof rows[0].deploymentId!=='string'||!rows[0].deploymentId)fail('release_compose_queue_identity_invalid');
}
function priorDeployment(state,rollback){
 const op=rollback?'rollback':'deploy',rows=state.journal.filter(j=>j.operation===op&&releaseOutcomeStatus(j.outcome)==='succeeded');
 if(contract.isReleaseSetManifest(state.release.snapshot.manifest))return {outcome:{evidence:{deploymentIds:rows.flatMap(j=>j.outcome.evidence.deploymentIds??[])}}};
 return rows.at(-1);
}
// The production caller supplies fixed adapters, a sealed HTTPS API and its live
// Writer capability. Neither Hermes input nor a release packet can select code,
// shell commands, credentials, callbacks, URLs or a different repository.
export async function runReleaseStep({state,client,api,github,coolify,assertWriter,resources,reconciliationOnly=false,
 inspectCheckout=inspectReleaseCheckout,stopped=()=>false,onOperation=async()=>{},onChildrenClosed=async()=>{}}){
 const s=validateState(state,client),m=s.manifest,operation=nextReleaseOperation(state);
 if(reconciliationOnly&&operation!=='reconcile')return{handled:true,state,reconciliationOnlyComplete:true};
 if(!operation)return{handled:false,state};
 const route=`/v1/agent-runtime/releases/${state.release.id}`;
 await assertWriter();
 if(operation==='reconcile'){
  const pending=state.journal.find(j=>!releaseOutcomeStatus(j.outcome)||releaseOutcomeStatus(j.outcome)==='uncertain');
  if(pending.operation==='cleanup_resource')await assertDisposable(m,s,resources,pending.intent.parameters.resourceId);
  let result;
  if(['push','pr','review','merge'].includes(pending.operation))result=await github.reconcile(m,s,pending.operation,pending.intent.parameters.pullRequestNumber);
  else if(['deploy_config','rollback_config'].includes(pending.operation)){
   result=await coolify.reconcileConfiguration(m,s,{rollback:pending.operation==='rollback_config',operationId:pending.id,since:pending.createdAt});
   if(contract.isComposeManifest(m)&&result?.evidence?.composeConfigAbsence){
    if(result.state!=='absent'||contract.composeConfigAbsenceEvidenceError(s,result.evidence,pending))fail('release_compose_configuration_absence_unproven');
    result={status:'absent',evidence:result.evidence};
   }else if(contract.isReleaseSetManifest(m)&&result?.state==='applied')result={status:'succeeded',evidence:releaseSetEvidence(result,m,s,{configuration:true,rollback:pending.operation==='rollback_config'})};
   else if(contract.isReleaseSetManifest(m)&&result?.state==='absent'&&result.evidence?.absenceVerified===true)
    result={status:'absent',evidence:releaseSetEvidence(result.evidence,m,s,{rollback:contract.isComposeManifest(m)?pending.operation==='rollback_config'?false:'baseline':false})};
  }else if(['deploy','rollback'].includes(pending.operation)){
   result=await coolify.reconcileDeployment(m,s,{rollback:pending.operation==='rollback',since:pending.createdAt,operationId:pending.id,targetId:pending.intent.parameters.targetId,deploymentId:pending.intent.parameters.deploymentId});
   if(contract.isComposeManifest(m)&&result?.evidence?.composeRecovery){
    const evidence=result.evidence;
    if(contract.composeRecoveryEvidenceError(s,evidence,pending)||!['failed','absent'].includes(result.state)
     ||evidence.composeRecovery.kind!==(result.state==='absent'?'queue_absent':'queue_failed'))fail('release_compose_recovery_unproven');
    // Proven absence closes the attempted release as failed, rather than
    // enabling a new candidate intent/queue ID. Only sealed recovery follows.
    result={status:'failed',evidence};
   }else if(contract.isReleaseSetManifest(m)&&['finished','failed'].includes(result?.state)){
    assertComposeQueueIds(m,result.deploymentIds,pending.intent.parameters.targetId);
    const health=result.healthy===undefined?await coolify.health(m,s,{rollback:pending.operation==='rollback',targetId:pending.intent.parameters.targetId}):result;
    if(result.state==='failed'&&health.healthy!==false)fail('release_reconciliation_unproven');
    result={status:health.healthy===true&&result.state==='finished'?'succeeded':'failed',evidence:releaseSetEvidence(health,m,s,{rollback:pending.operation==='rollback',deploymentIds:result.deploymentIds})};
   }else if(contract.isComposeManifest(m)&&result?.state==='absent'&&result.evidence?.absenceVerified===true){
    result={status:'absent',evidence:releaseSetEvidence(result.evidence,m,s,{rollback:pending.operation==='rollback'?false:'baseline'})};
   }
  }
  else if(pending.operation==='observe'){
   const evidence=await coolify.observe(m,s,{rollback:pending.intent.parameters.mode==='rollback'});
   const prior=priorDeployment(state,pending.intent.parameters.mode==='rollback');
   if(!contract.isReleaseSetManifest(m))evidence.deploymentId=prior?.outcome?.evidence?.deploymentId;
   result={status:evidence.healthy?'succeeded':'failed',evidence:releaseSetEvidence(evidence,m,s,{rollback:pending.intent.parameters.mode==='rollback',deploymentIds:prior?.outcome?.evidence?.deploymentIds})};
  }else if(contract.postObservationOperations.includes(pending.operation)){
   if(typeof resources?.reconcilePostObservation!=='function')fail('release_post_observation_reconciliation_gateway_required');
   result=postObservationResult(await resources.reconcilePostObservation(m,s,{operation:pending.operation,state,operationId:pending.id}),s,pending,state,true);
  }else if(pending.operation==='cleanup_resource')result=await resources.reconcileResource(m,s,pending.intent.parameters.resourceId);
  else if(pending.operation==='archive_repository')result=await github.reconcileArchive(m);
  else if(pending.operation==='cleanup_local')result=await resources.reconcileLocal(m,s);
  else if(pending.operation==='cleanup')result={status:'succeeded',evidence:contract.retainsApplication(m)?await verifyRetention(m,s,{resources,github,inspectCheckout}):{...await resources.verifyCleanup(m,s),...await github.verifyArchive(m)}};
  else fail('release_reconciliation_unproven');
  if(!['succeeded','failed','absent'].includes(result?.status))fail('release_reconciliation_unproven');
  await onChildrenClosed();
  const body=contract.outcomeSchema.parse({requestId:randomUUID(),status:'reconciled',reconciledStatus:result.status,observationOnly:true,evidence:dated(result.evidence)});
  const updated=await api(`${route}/operations/${pending.id}/outcome`,{method:'POST',body});
  return{handled:true,state:updated,...(reconciliationOnly?{reconciliationOnlyComplete:true}:{}),...(result.evidence?.composeConfigAbsence?{nextOperationBlocked:true,configurationDiagnosisRequired:true,diagnosisReason:'release_compose_no_effect_diagnosis_required'}:{})};
 }
 if(stopped())return{handled:false,state};
 // Validate actual checkout and remote base before requesting a capability.
 const cleanupStage=['cleanup','cleanup_local','cleanup_resource','archive_repository'].includes(operation);
 if(operation!=='cleanup')await inspectCheckout(m,s.commit,s.baseCommit,s.candidateTree);
 const remote=await github.inspect(m,{allowArchived:cleanupStage&&!contract.retainsApplication(m)}),merged=contract.releaseHasSuccessor(state.release.snapshot)||contract.releaseHasPublishedGitBasis(state.release.snapshot)||state.journal.some(j=>j.operation==='merge'&&releaseOutcomeStatus(j.outcome)==='succeeded');
 if(remote.remoteBase!==(merged?s.commit:s.baseCommit)
  ||remote.remoteTree!==(merged?s.candidateTree:s.baseTree))fail('release_base_changed');
 if(!state.journal.length)await coolify.inspect(m,s);
 if(['deploy_config','deploy','rollback_config','rollback'].includes(operation))await resources.inspectCapacity(m);
 const intent=contract.intentSchema.parse({requestId:randomUUID(),operation,manifestDigest:s.manifestDigest,commit:s.commit,baseCommit:s.baseCommit,
  expectedVersion:state.expectedVersion,observed:{commit:s.commit,baseCommit:remote.remoteBase,baseTree:remote.remoteTree,manifestDigest:s.manifestDigest},parameters:parameters(operation,s,state)});
 if(contract.postObservationOperations.includes(operation)){
  if(typeof resources?.postObservation!=='function')fail('release_post_observation_gateway_required');
  const error=contract.postObservationIntentError(s,intent,state.journal);if(error)fail(error);
 }
 if(operation==='cleanup_resource')await assertDisposable(m,s,resources,intent.parameters.resourceId);
 await onChildrenClosed();
 const authorized=await api(`${route}/operations`,{method:'POST',body:intent});
 if(!authorized.operation?.id||authorized.replayed||authorized.operation.operation!==operation)fail('release_intent_unproven');
 await onOperation(authorized,authorized.operation);
 // No effect after a shutdown or elapsed authority. The durable intent then
 // forces read-only reconciliation on the next invocation.
 if(stopped()||effectiveExpiry(authorized.effectiveExpiresAt===undefined?state:authorized,s)<=Date.now())fail('release_effect_not_started');
 await assertWriter();
 let evidence,status='succeeded';
 try{
  const number=intent.parameters.pullRequestNumber;
  if(operation==='push')evidence=await github.push(m,s);
  else if(operation==='pr')evidence={...await github.createPullRequest(m,s),remoteCommit:s.commit,remoteTree:s.candidateTree};
  else if(operation==='review')evidence={...await github.recordIndependentReview(m,s,number),remoteCommit:s.commit,remoteTree:s.candidateTree};
  else if(operation==='merge')evidence=await github.merge(m,s,number);
  else if(operation==='deploy_config')evidence=releaseSetEvidence(await coolify.configureCandidate(m,s),m,s,{configuration:true});
  else if(operation==='rollback_config')evidence=releaseSetEvidence(await coolify.configureRollback(m,s),m,s,{configuration:true,rollback:true});
  else if(operation==='deploy'||operation==='rollback'){
   const operationOptions={operationId:authorized.operation.id,since:authorized.operation.createdAt,rollback:operation==='rollback',targetId:intent.parameters.targetId,stopped};
   const result=await coolify[operation](m,s,operationOptions);
   if(contract.isReleaseSetManifest(m)&&!['finished','failed'].includes(result?.state))fail('release_deployment_identity_unproven');
   assertComposeQueueIds(m,result.deploymentIds,intent.parameters.targetId);
   const deployment=await coolify.waitForDeployment(m,s,{rollback:operation==='rollback',since:authorized.operation.createdAt,
    operationId:authorized.operation.id,targetId:intent.parameters.targetId,deploymentId:result.deploymentId,deploymentIds:result.deploymentIds,stopped});
   if(!['finished','failed'].includes(deployment.state))fail('release_deployment_identity_unproven');
   assertComposeQueueIds(m,deployment.deploymentIds,intent.parameters.targetId);
   if(contract.isComposeManifest(m)&&contract.releaseDigest(result.deploymentIds)!==contract.releaseDigest(deployment.deploymentIds))fail('release_compose_queue_identity_invalid');
   if(contract.isComposeManifest(m)&&deployment.evidence?.composeRecovery){
    evidence=deployment.evidence;
    if(deployment.state!=='failed'||evidence.composeRecovery.kind!=='queue_failed'
     ||contract.composeRecoveryEvidenceError(s,evidence,authorized.operation))fail('release_compose_recovery_unproven');
    status='failed';
   }else{
   evidence=await coolify.health(m,s,{rollback:operation==='rollback',targetId:intent.parameters.targetId});
   if(deployment.state==='failed'&&evidence.healthy!==false)fail('release_deployment_failure_unattributed');
   evidence=contract.isReleaseSetManifest(m)?releaseSetEvidence(evidence,m,s,{rollback:operation==='rollback',deploymentIds:deployment.deploymentIds??result.deploymentIds})
    :{...evidence,deploymentId:result.deploymentId};if(!evidence.healthy||deployment.state==='failed')status='failed';
   }
  }else if(operation==='observe'){
   evidence=await coolify.observe(m,s,{rollback:intent.parameters.mode==='rollback'});
   const prior=priorDeployment(state,intent.parameters.mode==='rollback');
   if(!contract.isReleaseSetManifest(m))evidence.deploymentId=prior?.outcome?.evidence?.deploymentId;
   else evidence=releaseSetEvidence(evidence,m,s,{rollback:intent.parameters.mode==='rollback',deploymentIds:prior?.outcome?.evidence?.deploymentIds});
   if(!evidence.healthy)status='failed';
  }else if(contract.postObservationOperations.includes(operation)){
   const result=postObservationResult(await resources.postObservation(m,s,{operation,state:authorized,operationId:authorized.operation.id}),s,{...authorized.operation,intent},authorized);
   evidence=result.evidence;status=result.status;
  }else if(operation==='cleanup_resource'){await assertDisposable(m,s,resources,intent.parameters.resourceId);evidence=await resources.removeResource(m,s,intent.parameters.resourceId);}
  else if(operation==='archive_repository')evidence=await github.archive(m);
  else if(operation==='cleanup_local')evidence=await resources.cleanupLocal(m,s);
  else if(operation==='cleanup')evidence=contract.retainsApplication(m)?await verifyRetention(m,s,{resources,github,inspectCheckout}):{...await resources.verifyCleanup(m,s),...await github.verifyArchive(m)};
  else fail('release_operation_unsupported');
 }catch(error){
  // A transport can lose a reply after committing the effect. Preserve this
  // fact without retaining credential-bearing errors or replaying the action.
  await onChildrenClosed();
  const body=contract.outcomeSchema.parse({requestId:randomUUID(),status:'uncertain',observationOnly:false,evidence:dated({})});
  const updated=await api(`${route}/operations/${authorized.operation.id}/outcome`,{method:'POST',body});
  const diagnostic=releaseEffectDiagnostic(error);
  return{handled:true,state:updated,reconciliationRequired:true,uncertaintyDiagnostic:diagnostic};
 }
 await onChildrenClosed();
 const body=contract.outcomeSchema.parse({requestId:randomUUID(),status,observationOnly:['observe','cleanup'].includes(operation),evidence:dated(evidence)});
 return{handled:true,state:await api(`${route}/operations/${authorized.operation.id}/outcome`,{method:'POST',body})};
}
