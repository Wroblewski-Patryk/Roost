import { randomUUID } from 'node:crypto';
import contract from './agent-host-release-contract.cjs';
import { inspectReleaseCheckout } from './agent-host-release-github.mjs';

const fail=code=>{throw Object.assign(Error(code),{retryable:false,releaseBlocked:true});};
export const releaseOutcomeStatus=o=>!o?null:o.status==='reconciled'?o.reconciledStatus:o.status;
export function nextReleaseOperation(state){
 const j=state.journal??[],done=op=>j.some(x=>x.operation===op&&releaseOutcomeStatus(x.outcome)==='succeeded');
 if(j.some(x=>!releaseOutcomeStatus(x.outcome)||releaseOutcomeStatus(x.outcome)==='uncertain'))return 'reconcile';
 if(state.status!=='active')return null;
 if(j.some(x=>x.operation==='rollback'&&releaseOutcomeStatus(x.outcome)==='failed'
  ||x.operation==='observe'&&x.intent.parameters.mode==='rollback'&&releaseOutcomeStatus(x.outcome)==='failed'))fail('release_recovery_diagnosis_required');
 if(j.some(x=>['deploy','observe'].includes(x.operation)&&releaseOutcomeStatus(x.outcome)==='failed')){
  if(!done('rollback_config'))return 'rollback_config';if(!done('rollback'))return 'rollback';
  if(!j.some(x=>x.operation==='observe'&&x.intent.parameters.mode==='rollback'&&releaseOutcomeStatus(x.outcome)==='succeeded'))return 'observe';
  return nextCleanup(state);
 }
 return ['push','pr','review','merge','deploy_config','deploy','observe'].find(op=>!done(op))??nextCleanup(state);
}
function nextCleanup(state){
 const j=state.journal,done=(op,resource)=>j.some(x=>x.operation===op&&releaseOutcomeStatus(x.outcome)==='succeeded'&&(!resource||x.intent.parameters.resourceId===resource));
 if(state.release.snapshot.manifest.cleanup.ownedResourceIds.some(id=>!done('cleanup_resource',id)))return 'cleanup_resource';
 return ['archive_repository','cleanup_local','cleanup'].find(op=>!done(op))??null;
}
function validateState(state,client){
 if(!state?.release?.id||!Array.isArray(state.journal))fail('release_view_invalid');
 const {readinessDigest:_readiness,configurationDigest:_configuration,...snapshot}=state.release.snapshot;
 const s=contract.createReleaseSchema.parse(snapshot);
 if(s.hostId!==client.hostId||s.releaserAgentId!==client.agentId||state.release.manifestDigest!==s.manifestDigest
  ||contract.releaseDigest(s.manifest)!==s.manifestDigest)fail('release_binding_changed');
 return {...s,releaseId:state.release.id};
}
function parameters(operation,s,state){
 const m=s.manifest;
 if(operation==='push')return{branch:m.repository.candidateBranch};
 if(['review','merge'].includes(operation))return{pullRequestNumber:state.journal.find(j=>j.operation==='pr'&&releaseOutcomeStatus(j.outcome)==='succeeded')?.outcome?.evidence?.pullRequestNumber};
 if(['deploy_config','deploy'].includes(operation))return{commit:s.commit,imageDigest:m.deployment.imageDigest,configDigest:m.deployment.configDigest,schemaDigest:m.deployment.schemaDigest};
 if(['rollback_config','rollback'].includes(operation))return{commit:m.rollback.commit,imageDigest:m.rollback.imageDigest,configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest};
 if(operation==='observe')return{mode:state.journal.some(j=>j.operation==='rollback'&&releaseOutcomeStatus(j.outcome)==='succeeded')?'rollback':'candidate'};
 if(operation==='cleanup_resource')return{resourceId:m.cleanup.ownedResourceIds.find(id=>!state.journal.some(j=>j.operation==='cleanup_resource'&&j.intent.parameters.resourceId===id&&releaseOutcomeStatus(j.outcome)==='succeeded'))};
 if(operation==='cleanup')return{resourceIds:m.cleanup.ownedResourceIds};
 return{};
}
const dated=e=>({...e,observedAt:new Date().toISOString()});
function effectiveExpiry(state,snapshot){
 const expiry=contract.createReleaseSchema.shape.expiresAt.safeParse(state.effectiveExpiresAt??snapshot.expiresAt);
 if(!expiry.success)fail('release_expiry_unproven');
 return Date.parse(expiry.data);
}
// The production caller supplies fixed adapters, a sealed HTTPS API and its live
// Writer capability. Neither Hermes input nor a release packet can select code,
// shell commands, credentials, callbacks, URLs or a different repository.
export async function runReleaseStep({state,client,api,github,coolify,assertWriter,resources,
 inspectCheckout=inspectReleaseCheckout,stopped=()=>false,onOperation=async()=>{},onChildrenClosed=async()=>{}}){
 const s=validateState(state,client),m=s.manifest,operation=nextReleaseOperation(state);
 if(!operation)return{handled:false,state};
 const route=`/v1/agent-runtime/releases/${state.release.id}`;
 await assertWriter();
 if(operation==='reconcile'){
  const pending=state.journal.find(j=>!releaseOutcomeStatus(j.outcome)||releaseOutcomeStatus(j.outcome)==='uncertain');
  let result;
  if(['push','pr','review','merge'].includes(pending.operation))result=await github.reconcile(m,s,pending.operation,pending.intent.parameters.pullRequestNumber);
  else if(['deploy_config','rollback_config'].includes(pending.operation))result=await coolify.reconcileConfiguration(m,s,{rollback:pending.operation==='rollback_config'});
  else if(['deploy','rollback'].includes(pending.operation))result=await coolify.reconcileDeployment(m,s,{rollback:pending.operation==='rollback',since:pending.createdAt,deploymentId:pending.intent.parameters.deploymentId});
  else if(pending.operation==='observe'){
   const evidence=await coolify.observe(m,s,{rollback:pending.intent.parameters.mode==='rollback'});
   const prior=state.journal.findLast(j=>j.operation===(pending.intent.parameters.mode==='rollback'?'rollback':'deploy')&&releaseOutcomeStatus(j.outcome)==='succeeded');
   evidence.deploymentId=prior?.outcome?.evidence?.deploymentId;
   result={status:evidence.healthy?'succeeded':'failed',evidence};
  }else if(pending.operation==='cleanup_resource')result=await resources.reconcileResource(m,s,pending.intent.parameters.resourceId);
  else if(pending.operation==='archive_repository')result=await github.reconcileArchive(m);
  else if(pending.operation==='cleanup_local')result=await resources.reconcileLocal(m,s);
  else if(pending.operation==='cleanup')result={status:'succeeded',evidence:{...await resources.verifyCleanup(m,s),...await github.verifyArchive(m)}};
  else fail('release_reconciliation_unproven');
  if(!['succeeded','failed','absent'].includes(result?.status))fail('release_reconciliation_unproven');
  await onChildrenClosed();
  const body=contract.outcomeSchema.parse({requestId:randomUUID(),status:'reconciled',reconciledStatus:result.status,observationOnly:true,evidence:dated(result.evidence)});
  return{handled:true,state:await api(`${route}/operations/${pending.id}/outcome`,{method:'POST',body})};
 }
 if(stopped())return{handled:false,state};
 // Validate actual checkout and remote base before requesting a capability.
 const cleanupStage=['cleanup','cleanup_local','cleanup_resource','archive_repository'].includes(operation);
 if(operation!=='cleanup')await inspectCheckout(m,s.commit,s.baseCommit,s.candidateTree);
 const remote=await github.inspect(m,{allowArchived:cleanupStage}),merged=state.journal.some(j=>j.operation==='merge'&&releaseOutcomeStatus(j.outcome)==='succeeded');
 if(remote.remoteBase!==(merged?s.commit:s.baseCommit)
  ||remote.remoteTree!==(merged?s.candidateTree:s.baseTree))fail('release_base_changed');
 if(!state.journal.length)await coolify.inspect(m,s);
 if(['deploy_config','deploy','rollback_config','rollback'].includes(operation))await resources.inspectCapacity(m);
 const intent=contract.intentSchema.parse({requestId:randomUUID(),operation,manifestDigest:s.manifestDigest,commit:s.commit,baseCommit:s.baseCommit,
  expectedVersion:state.expectedVersion,observed:{commit:s.commit,baseCommit:remote.remoteBase,baseTree:remote.remoteTree,manifestDigest:s.manifestDigest},parameters:parameters(operation,s,state)});
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
  else if(operation==='deploy_config')evidence=await coolify.configureCandidate(m,s);
  else if(operation==='rollback_config')evidence=await coolify.configureRollback(m,s);
  else if(operation==='deploy'||operation==='rollback'){
   const result=await coolify[operation](m,s);
   const deployment=await coolify.waitForDeployment(m,s,{rollback:operation==='rollback',since:authorized.operation.createdAt,
    deploymentId:result.deploymentId,stopped});
   if(!['finished','failed'].includes(deployment.state))fail('release_deployment_identity_unproven');
   evidence=await coolify.health(m,s,{rollback:operation==='rollback'});
   evidence={...evidence,deploymentId:result.deploymentId};if(!evidence.healthy)status='failed';
  }else if(operation==='observe'){
   evidence=await coolify.observe(m,s,{rollback:intent.parameters.mode==='rollback'});
   evidence.deploymentId=state.journal.findLast(j=>j.operation===(intent.parameters.mode==='rollback'?'rollback':'deploy')&&releaseOutcomeStatus(j.outcome)==='succeeded')?.outcome?.evidence?.deploymentId;
   if(!evidence.healthy)status='failed';
  }else if(operation==='cleanup_resource')evidence=await resources.removeResource(m,s,intent.parameters.resourceId);
  else if(operation==='archive_repository')evidence=await github.archive(m);
  else if(operation==='cleanup_local')evidence=await resources.cleanupLocal(m,s);
  else if(operation==='cleanup')evidence={...await resources.verifyCleanup(m,s),...await github.verifyArchive(m)};
  else fail('release_operation_unsupported');
 }catch{
  // A transport can lose a reply after committing the effect. Preserve this
  // fact without retaining credential-bearing errors or replaying the action.
  await onChildrenClosed();
  const body=contract.outcomeSchema.parse({requestId:randomUUID(),status:'uncertain',observationOnly:false,evidence:dated({})});
  const updated=await api(`${route}/operations/${authorized.operation.id}/outcome`,{method:'POST',body});
  return{handled:true,state:updated,reconciliationRequired:true};
 }
 await onChildrenClosed();
 const body=contract.outcomeSchema.parse({requestId:randomUUID(),status,observationOnly:['observe','cleanup'].includes(operation),evidence:dated(evidence)});
 return{handled:true,state:await api(`${route}/operations/${authorized.operation.id}/outcome`,{method:'POST',body})};
}
