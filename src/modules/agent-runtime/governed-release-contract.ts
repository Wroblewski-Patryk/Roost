import path from "node:path";
import { z } from "zod";
import { nativeBoundaryResultBlocked, object } from "./task-review-contract";
// One wire validator is used by both the server and Windows broker.
const shared = require(path.resolve(__dirname, "../../../scripts/lib/agent-host-release-contract.cjs"));
export const createReleaseSchema = shared.createReleaseSchema as z.ZodType<any>;
export const releaseManifestSchema = shared.manifestSchema as z.ZodType<any>;
export const releaseIntentSchema = shared.intentSchema as z.ZodType<any>;
export const releaseOutcomeSchema = shared.outcomeSchema as z.ZodType<any>;
export const releaseDigest: (value: unknown) => string = shared.releaseDigest;
export const releaseOperations: readonly string[] = shared.operations;
export const releaseRetainsApplication: (manifest: any) => boolean = shared.retainsApplication;
export const releaseIsGitSet: (manifest: any) => boolean = shared.isGitSetManifest;
export const releaseGitSetArtifactDigest: (manifest: any, binding: any, rollback?: boolean) => string = shared.gitSetArtifactDigest;
export const releaseSuccessorBasisSchema = shared.releaseSuccessorBasisSchema as z.ZodType<any>;
export const releaseHasSuccessor: (snapshot: any) => boolean = shared.releaseHasSuccessor;
export const releaseRollbackImageFailureValid: (snapshot:any,evidence:any,targetId:string) => boolean = shared.releaseRollbackImageFailureValid;
export const closeFailedReleaseSchema=shared.closeFailedReleaseSchema as z.ZodType<any>;
export const authorizeReconciliationSchema=shared.authorizeReconciliationSchema as z.ZodType<any>;
export const releaseHasPublishedGitBasis: (snapshot:any)=>boolean=shared.releaseHasPublishedGitBasis;
export const releaseRestartProtectedResourceIds: (manifest:any,evidence:any)=>string[]|null=shared.releaseRestartProtectedResourceIds;
// Fresh health/time and backup observations may change; the protected source,
// data, configuration, rollback and observation policy remain the accepted ones.
export function releaseSuccessorManifestBasis(manifest:any) {
 const {backup:_backup,baseline,...rest}=manifest;
 const {observedAt:_observed,healthDigest:_health,...stableBaseline}=baseline;
 return {...rest,baseline:stableBaseline};
}
function gitSetQueuesAccepted(journal:any[],e:any,rollback:boolean) {
 const accepted=journal.filter(j=>j.operation===(rollback?"rollback":"deploy")&&effectiveOutcome(j.outcome)==="succeeded")
  .flatMap(j=>j.outcome.evidence?.deploymentIds??[]);
 const ordered=(rows:any[])=>rows.slice().sort((a,b)=>a.targetId<b.targetId?-1:a.targetId>b.targetId?1:0);
 return Array.isArray(e.deploymentIds)&&releaseDigest(ordered(accepted))===releaseDigest(ordered(e.deploymentIds));
}
export function releaseGitSetEvidenceError(snapshot:any,e:any,rollback=false,queuesRequired=true,targetId?:string) {
 const m=snapshot.manifest,expected=rollback?m.rollback:m.deployment;
 const targets=targetId===undefined?m.deployment.targets:m.deployment.targets.filter((t:any)=>t.targetId===targetId);
 if(!targets.length)return "release_deployment_unproven";
 if(e.imageDigest!==undefined||e.deploymentId!==undefined||e.deployedCommit!==(rollback?m.rollback.commit:snapshot.commit)
  ||e.deployedTree!==(rollback?snapshot.baseTree:snapshot.candidateTree)||e.artifactSetDigest!==expected.artifactSetDigest
  ||e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||e.dataDigest!==m.baseline.dataDigest
  ||typeof e.healthy!=="boolean"||!/^[a-f0-9]{64}$/.test(e.healthDigest??"")
  ||expected.artifactSetDigest!==releaseGitSetArtifactDigest(m,snapshot,rollback)
  ||!Array.isArray(e.deployedTargets)||e.deployedTargets.length!==targets.length)return "release_deployment_unproven";
 const rows=e.deployedTargets,ids=rows.map((r:any)=>r.targetId);
 if(new Set(ids).size!==rows.length)return "release_deployment_unproven";
 for(const t of targets) {
  const r=rows.find((row:any)=>row.targetId===t.targetId),v=rollback?t.baseline:{commit:snapshot.commit,tree:snapshot.candidateTree,configDigest:t.configDigest};
  if(!r||r.commit!==v.commit||r.tree!==v.tree||r.configDigest!==v.configDigest||r.schemaDigest!==expected.schemaDigest
   ||!/^sha256:[a-f0-9]{64}$/.test(r.imageDigest??"")||rollback&&r.imageDigest!==t.baseline.imageDigest
   ||typeof r.healthy!=="boolean"||e.healthy===true&&r.healthy!==true)return "release_deployment_unproven";
 }
 const runtime=rows.map((r:any)=>({targetId:r.targetId,commit:r.commit,tree:r.tree,imageDigest:r.imageDigest,configDigest:r.configDigest,schemaDigest:r.schemaDigest}))
  .sort((a:any,b:any)=>a.targetId<b.targetId?-1:a.targetId>b.targetId?1:0);
 if(e.deployedSetDigest!==releaseDigest(runtime))return "release_deployment_unproven";
 if(queuesRequired) {
  if(!Array.isArray(e.deploymentIds)||e.deploymentIds.length!==rows.length
   ||new Set(e.deploymentIds.map((r:any)=>r.targetId)).size!==rows.length
   ||new Set(e.deploymentIds.map((r:any)=>r.deploymentId)).size!==rows.length)return "release_deployment_unproven";
  for(const row of rows)if(typeof row.deploymentId!=="string"||!row.deploymentId
   ||e.deploymentIds.find((q:any)=>q.targetId===row.targetId)?.deploymentId!==row.deploymentId)return "release_deployment_unproven";
 }
 return null;
}
export function releasePurposeMatches(metadata: any, manifest: any) {
 return manifest?.schemaVersion==="roost-release-manifest-v1" ? metadata?.releasePurpose==="temporary_certification"
  : releaseRetainsApplication(manifest)&&metadata?.releasePurpose==="application_release";
}
export const renewReleaseSchema=z.object({requestId:z.string().uuid(),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/),expiresAt:z.string().datetime()}).strict();

// Renewal changes only the admission window. Baseline identity stays sealed;
// its age is not reset, and the actual current target is checked by the broker.
export function releaseRenewalWindowError(input:any,previousExpiry:Date,credentialExpiry:Date,manifest:any,now=new Date()) {
 const expiry=new Date(input.expiresAt);
 if(expiry<=now||expiry<=previousExpiry||expiry.getTime()>now.getTime()+3600000||expiry>credentialExpiry)return "release_window_invalid";
 const verified=Date.parse(manifest.backup.restoreVerifiedAt);
 if(!Number.isFinite(verified)||verified>now.getTime()+60000||now.getTime()-verified>86400000)return "release_prerequisite_stale";
 return null;
}
export function releaseRenewalStateError(state:any,userId:string|undefined) {
 if(state.release.issuer_user_id!==userId)return "release_issuer_required";
 if(state.revocations.length)return "release_authority_inactive";
 if(state.journal.some((j:any)=>j.operation==="cleanup"&&effectiveOutcome(j.outcome)==="succeeded"))return "release_already_completed";
 return null;
}

export function releaseCandidateNativeError(execution: any, contract: any) {
  const v = object(execution?.verification), managed = object(v.managedAdmission), receipt = object(v.ownedTreeReceipt);
  if (contract?.nativeBoundary?.profile !== "coding-local"
    || contract.modelSelection?.schemaVersion !== "roost-managed-hermes-backend-v1"
    || contract.modelSelection?.backend !== "codex_responses"
    || managed.qualification !== "signed_native_v1"
    || !/^[a-f0-9]{64}$/.test(managed.evidenceDigest ?? "") || !/^[a-f0-9]{64}$/.test(managed.jobSourceDigest ?? "")
    || receipt.cleanup !== true || receipt.activeProcesses !== 0 || receipt.attempt !== execution?.id
    || nativeBoundaryResultBlocked(v, contract)) return "release_native_candidate_unproven";
  return null;
}

export function releaseApprovalError(s: any, input: any) {
  if (!s.current || s.roleIssues?.length || !s.decision || s.decision.decision !== "approve"
    || s.decision.id !== input.reviewId || s.materialVersion !== input.materialVersion
    || s.decision.materialVersion !== s.materialVersion || s.approvalCommit !== input.commit
    || s.decision.evidence?.reviewedCommit !== input.commit || s.execution?.applicationId !== input.applicationId)
    return "release_review_stale";
  const role=s.authorities?.releaser, executor=s.contract?.assignment?.agentId, verifier=s.decision.verifierId;
  if (role?.principal?.kind !== "agent" || role.principal.id !== input.releaserAgentId
    || input.releaserAgentId === executor || input.releaserAgentId === verifier || verifier === executor
    || s.contract?.taskRoles?.releaser?.revision !== input.releaserRevision)
    return "release_role_invalid";
  return null;
}
export function releaseWindowError(input: any, credentialExpiry: Date, now = new Date()) {
  const expiry=new Date(input.expiresAt), m=input.manifest;
  if (expiry <= now || expiry.getTime() > now.getTime()+3600000 || expiry > credentialExpiry) return "release_window_invalid";
  if (Date.parse(m.baseline.observedAt) > now.getTime()+60000 || now.getTime()-Date.parse(m.baseline.observedAt)>3600000
    || now.getTime()-Date.parse(m.backup.restoreVerifiedAt)>86400000 || Date.parse(m.backup.restoreVerifiedAt)>now.getTime()+60000)
    return "release_prerequisite_stale";
  return null;
}
export function effectiveOutcome(outcome: any): string | null {
  return !outcome ? null : outcome.status === "reconciled" ? outcome.reconciled_status ?? outcome.reconciledStatus : outcome.status;
}
// A failed release is retired truthfully. Acceptance of the observed image is a
// new owner baseline, never evidence that the old exact image was recovered.
export function releaseFailedClosureError(state:any,input:any,checkVersion=true) {
 if(!state)return "release_not_found";
 const s=state.release.snapshot,m=s.manifest,j=state.journal,e=input.evidence;
 if(checkVersion&&state.expectedVersion!==input.expectedVersion)return "release_version_stale";
 if(!releaseIsGitSet(m)||s.predecessor||s.successorBasis||s.baselineRestart||s.publishedGitBasis
  ||checkVersion&&state.revocations.length||j.some((x:any)=>!effectiveOutcome(x.outcome)||effectiveOutcome(x.outcome)==="uncertain")
  ||j.some((x:any)=>x.operation==="cleanup"&&effectiveOutcome(x.outcome)==="succeeded"))return "release_failed_closure_unproven";
 const failed=j.find((x:any)=>x.id===input.failedOperationId),targetId=failed?.intent?.parameters?.targetId;
 if(!failed||failed.operation!=="rollback"||effectiveOutcome(failed.outcome)!=="failed"
  ||!releaseRollbackImageFailureValid(s,failed.outcome.evidence,targetId)
  ||j.slice(j.indexOf(failed)+1).some((x:any)=>x.operation==="rollback"&&x.intent?.parameters?.targetId===targetId))return "release_failed_closure_unproven";
 const targets=m.deployment.targets.map((t:any)=>({...t,baseline:{...t.baseline,imageDigest:t.targetId===targetId?failed.outcome.evidence.deployedTargets[0].imageDigest:t.baseline.imageDigest}}));
 const observedSnapshot={...s,manifest:{...m,deployment:{...m.deployment,targets}}};
 if(e.failureKind!==undefined||e.repositoryArchived===true||e.localAbsent===true||e.healthy!==true
  ||releaseGitSetEvidenceError(observedSnapshot,e,true,true)||!Number.isInteger(e.observationSeconds)||e.observationSeconds<m.observation.seconds)return "release_failed_baseline_unproven";
 for(const t of targets) {
  const row=e.deployedTargets.find((x:any)=>x.targetId===t.targetId);
  const prior=t.targetId===targetId?failed:j.filter((x:any)=>x.operation==="rollback"&&x.intent?.parameters?.targetId===t.targetId&&effectiveOutcome(x.outcome)==="succeeded").at(-1);
  if(prior&&row.deploymentId!==prior.outcome.evidence.deploymentIds?.find((x:any)=>x.targetId===t.targetId)?.deploymentId)return "release_failed_baseline_unproven";
 }
 return null;
}
export function releasePublishedGitBasis(state:any,input:any):any {
 const r=state?.release,s=r?.snapshot,restart=input.baselineRestart;
 if(!state||!restart||r.id!==restart.releaseId||state.expectedVersion!==restart.expectedVersion)return {error:"release_restart_version_stale"};
 const closure=state.failedClosures?.find((c:any)=>c.id===restart.closureId),receipt=closure?.snapshot;
 if(!closure||closure.consent_digest!==restart.consentDigest||closure.closure_digest!==releaseDigest(receipt)
  ||!state.revocations.some((v:any)=>v.id===closure.revocation_id)||receipt.failedOutcomeId!==state.journal.find((j:any)=>j.id===receipt.failedOperationId)?.outcome?.id
  ||releaseFailedClosureError(state,receipt,false))return {error:"release_restart_closure_unproven"};
 if(!releaseIsGitSet(input.manifest)||input.predecessor||input.successorBasis
  ||input.reviewId===s.reviewId||input.releaseExecutionId===s.releaseExecutionId
  ||["taskId","applicationId","hostId","commit","candidateTree","baseCommit","baseTree","releaserAgentId"].some(k=>s[k]!==input[k]))return {error:"release_restart_binding_changed"};
 const protectedIds=releaseRestartProtectedResourceIds(s.manifest,receipt.evidence);
 if(!protectedIds||releaseDigest(protectedIds)!==releaseDigest(input.manifest.cleanup.protectedResourceIds))return {error:"release_restart_binding_changed"};
 // Source/configuration/data and all cleanup policy remain unchanged. Only
 // attested baseline images are appended to the original protected footprint.
 const stable=(m:any)=>{const {backup:_b,baseline,rollback,deployment,cleanup,...rest}=m;return {...rest,cleanup:{...cleanup,protectedResourceIds:s.manifest.cleanup.protectedResourceIds},baseline:{commit:baseline.commit,configDigest:baseline.configDigest,schemaDigest:baseline.schemaDigest,dataDigest:baseline.dataDigest},
  rollback:{commit:rollback.commit,configDigest:rollback.configDigest,schemaDigest:rollback.schemaDigest,compatibleSchemaDigests:rollback.compatibleSchemaDigests},deployment:{...deployment,targets:deployment.targets.map((t:any)=>({...t,baseline:{...t.baseline,imageDigest:undefined}}))}};};
 if(releaseDigest(stable(s.manifest))!==releaseDigest(stable(input.manifest)))return {error:"release_restart_binding_changed"};
 for(const t of input.manifest.deployment.targets) {
  const row=receipt.evidence.deployedTargets.find((x:any)=>x.targetId===t.targetId);
  if(!row||["commit","tree","imageDigest","configDigest"].some(k=>t.baseline[k]!==row[k]))return {error:"release_restart_baseline_changed"};
 }
 const valid=(j:any)=>effectiveOutcome(j.outcome)==="succeeded"&&releaseOutcomeError(r,j,{status:j.outcome.status,reconciledStatus:j.outcome.reconciled_status??j.outcome.reconciledStatus,observationOnly:j.outcome.observation_only??j.outcome.observationOnly,evidence:j.outcome.evidence},state.journal)===null;
 const ops=["push","pr","review","merge"].map(op=>state.journal.find((j:any)=>j.operation===op&&valid(j)));
 if(ops.some(j=>!j)||ops.some((j,i)=>i>0&&state.journal.indexOf(j)<=state.journal.indexOf(ops[i-1]))
  ||ops.slice(1).some(j=>j.outcome.evidence.pullRequestNumber!==ops[1].outcome.evidence.pullRequestNumber))return {error:"release_restart_git_unproven"};
 const publishedGitBasis={schemaVersion:"roost-release-published-git-v1",releaseId:r.id,expectedVersion:state.expectedVersion,closureId:closure.id,closureDigest:closure.closure_digest,
  pushOperationId:ops[0].id,prOperationId:ops[1].id,reviewOperationId:ops[2].id,mergeOperationId:ops[3].id,baselineDeploymentIds:receipt.evidence.deploymentIds};
 return releaseHasPublishedGitBasis({...input,publishedGitBasis})?{publishedGitBasis}:{error:"release_restart_baseline_changed"};
}
export function releaseSuccessorBasis(state:any,input:any):any {
 if(!state)return {error:"release_predecessor_not_found"};
 if(state.expectedVersion!==input.predecessor?.expectedVersion)return {error:"release_predecessor_version_stale"};
 const r=state.release,s=r.snapshot,journal=state.journal;
 if(r.id!==input.predecessor?.releaseId||!releaseIsGitSet(s.manifest)||!releaseIsGitSet(input.manifest)
  ||state.revocations.length||s.predecessor||s.successorBasis
  ||["taskId","applicationId","hostId","reviewId","materialVersion","commit","candidateTree","baseCommit","baseTree","releaserAgentId"].some(k=>s[k]!==input[k])
  ||releaseDigest(releaseSuccessorManifestBasis(s.manifest))!==releaseDigest(releaseSuccessorManifestBasis(input.manifest)))return {error:"release_predecessor_binding_changed"};
 if(journal.some((j:any)=>!effectiveOutcome(j.outcome)||effectiveOutcome(j.outcome)==="uncertain"))return {error:"release_predecessor_unresolved"};
 const valid=(j:any)=>releaseOutcomeError(r,j,{status:j.outcome.status,reconciledStatus:j.outcome.reconciled_status??j.outcome.reconciledStatus,
  observationOnly:j.outcome.observation_only??j.outcome.observationOnly,evidence:j.outcome.evidence},journal)===null;
 const successful=(op:string,predicate=(j:any)=>true)=>journal.filter((j:any)=>j.operation===op&&effectiveOutcome(j.outcome)==="succeeded"&&predicate(j)&&valid(j)).at(-1);
 const push=successful("push"),pr=successful("pr"),review=successful("review"),merge=successful("merge"),candidateConfig=successful("deploy_config");
 const failure=journal.find((j:any)=>["deploy","observe"].includes(j.operation)&&j.intent?.parameters?.mode!=="rollback"
  &&effectiveOutcome(j.outcome)==="failed"&&valid(j));
 const rollbackConfig=successful("rollback_config"),observation=successful("observe",j=>j.intent?.parameters?.mode==="rollback"),cleanup=successful("cleanup");
 const rollbacks=s.manifest.deployment.targets.map((t:any)=>successful("rollback",j=>j.intent?.parameters?.targetId===t.targetId));
 const resources=s.manifest.cleanup.ownedResourceIds.map((id:string)=>successful("cleanup_resource",j=>j.intent?.parameters?.resourceId===id));
 const position=(j:any)=>journal.indexOf(j);
 if(!push||!pr||!review||!merge||!candidateConfig||!failure||!rollbackConfig||!observation||!cleanup||rollbacks.some((j:any)=>!j)||resources.some((j:any)=>!j)
  ||position(push)>=position(pr)||position(pr)>=position(review)||position(review)>=position(merge)||position(merge)>=position(failure)
  ||position(failure)>=position(rollbackConfig)||rollbacks.some((j:any)=>position(j)<=position(rollbackConfig)||position(j)>=position(observation))
  ||position(observation)>=position(cleanup)
  ||position(merge)>=position(candidateConfig)||position(candidateConfig)>=position(failure)
  ||resources.some((j:any)=>position(j)<=position(observation)||position(j)>=position(cleanup))
  ||[pr,review,merge].some(j=>j.outcome.evidence.pullRequestNumber!==pr.outcome.evidence.pullRequestNumber)
  ||journal.some((j:any)=>["archive_repository","cleanup_local"].includes(j.operation)
   ||effectiveOutcome(j.outcome)==="failed"&&(j.operation==="rollback"||j.operation==="observe"&&j.intent?.parameters?.mode==="rollback")
    &&(!valid(j)||position(j)>=position(observation)||j.operation==="rollback"&&(!releaseRollbackImageFailureValid(s,j.outcome.evidence,j.intent?.parameters?.targetId)
      ||!rollbacks.some((later:any)=>later.intent?.parameters?.targetId===j.intent?.parameters?.targetId&&position(later)>position(j))))))return {error:"release_predecessor_recovery_unproven"};
 const successorBasis={schemaVersion:"roost-release-successor-v1",releaseId:r.id,expectedVersion:state.expectedVersion,
  mergeOperationId:merge.id,rollbackObservationOperationId:observation.id,cleanupOperationId:cleanup.id,
  rollbackDeploymentIds:observation.outcome.evidence.deploymentIds};
 if(!releaseHasSuccessor({...input,successorBasis}))return {error:"release_predecessor_recovery_unproven"};
 return {successorBasis};
}
export function releaseIntentError(release: any, input: any, journal: any[]) {
  const s=release.snapshot, m=s.manifest;
  const retained=releaseRetainsApplication(m);
  if(retained&&["archive_repository","cleanup_local"].includes(input.operation))return "release_retention_policy_violation";
  if (input.manifestDigest!==release.manifest_digest || input.commit!==s.commit || input.baseCommit!==s.baseCommit
    || input.observed.commit!==s.commit || input.observed.manifestDigest!==release.manifest_digest)
    return "release_candidate_changed";
  if(journal.some(j=>!effectiveOutcome(j.outcome)||effectiveOutcome(j.outcome)==="uncertain"))return "release_operation_unresolved";
  const successful=(op:string)=>journal.some(j=>j.operation===op&&effectiveOutcome(j.outcome)==="succeeded");
  const setComplete=(op:string)=>m.deployment.targets.every((t:any)=>journal.some(j=>j.operation===op&&j.intent?.parameters?.targetId===t.targetId&&effectiveOutcome(j.outcome)==="succeeded"));
  const restarted=releaseHasPublishedGitBasis(s),successor=releaseHasSuccessor(s)||restarted;
  if((s.baselineRestart||s.publishedGitBasis)&&!restarted)return "release_restart_basis_invalid";
  if((s.predecessor||s.successorBasis)&&!successor)return "release_successor_basis_invalid";
  if(successor&&["push","pr","review","merge"].includes(input.operation))return "release_successor_git_effect_forbidden";
  const merged=successor||successful("merge");
  if(input.observed.baseCommit!==(merged?s.commit:s.baseCommit)||input.observed.baseTree!==(merged?s.candidateTree:s.baseTree))return "release_base_changed";
  const p=input.parameters;
  const dependencies:Record<string,string[]>={push:[],pr:["push"],review:["pr"],merge:["review"],deploy_config:["merge"],deploy:["deploy_config"],observe:["deploy"],rollback_config:[],rollback:["rollback_config"],cleanup_resource:[],archive_repository:[],cleanup_local:["archive_repository"],cleanup:["cleanup_local"]};
  if(retained)dependencies.cleanup=[];
  if(successor)dependencies.deploy_config=[];
  if(input.operation==="observe"&&p.mode==="rollback")dependencies.observe=["rollback"];
  if(input.operation==="observe"&&!p.mode)return "release_observation_mode_required";
  if(dependencies[input.operation].some(op=>!successful(op)))return "release_progression_invalid";
  if(releaseIsGitSet(m)&&input.operation==="observe"&&!setComplete(p.mode==="rollback"?"rollback":"deploy"))return "release_progression_invalid";
  if(releaseIsGitSet(m)&&["deploy","rollback"].includes(input.operation)) {
   if(!m.deployment.targets.some((t:any)=>t.targetId===p.targetId))return "release_parameter_scope_invalid";
   if(journal.some(j=>j.operation===input.operation&&j.intent?.parameters?.targetId===p.targetId&&effectiveOutcome(j.outcome)==="succeeded"))return "release_operation_already_succeeded";
   const next=m.deployment.targets.find((t:any)=>!journal.some(j=>j.operation===input.operation&&j.intent?.parameters?.targetId===t.targetId&&effectiveOutcome(j.outcome)==="succeeded"));
   if(next?.targetId!==p.targetId)return "release_progression_invalid";
  }else if(successful(input.operation)&&!["observe","cleanup_resource"].includes(input.operation))return "release_operation_already_succeeded";
  if(["cleanup_resource","archive_repository","cleanup_local","cleanup"].includes(input.operation)&&!journal.some(j=>j.operation==="observe"&&effectiveOutcome(j.outcome)==="succeeded"&&j.intent.parameters.mode===(successful("rollback")?"rollback":"candidate")))return "release_cleanup_before_verification";
  if(input.operation==="cleanup_resource"&&(!m.cleanup.ownedResourceIds.includes(p.resourceId)||retained&&m.cleanup.protectedResourceIds.includes(p.resourceId)||journal.some(j=>j.operation==="cleanup_resource"&&j.intent.parameters.resourceId===p.resourceId&&effectiveOutcome(j.outcome)==="succeeded")))return "release_cleanup_scope_invalid";
  if(["archive_repository","cleanup"].includes(input.operation)&&m.cleanup.ownedResourceIds.some((r:string)=>!journal.some(j=>j.operation==="cleanup_resource"&&j.intent.parameters.resourceId===r&&effectiveOutcome(j.outcome)==="succeeded")))return "release_cleanup_resources_pending";
  if(input.operation.startsWith("rollback")&&!journal.some(j=>["deploy","observe"].includes(j.operation)&&effectiveOutcome(j.outcome)==="failed"))return "release_rollback_without_attributed_failure";
  if(input.operation==="push"&&p.branch!==m.repository.candidateBranch)return "release_parameter_scope_invalid";
  if(["review","merge"].includes(input.operation)&&p.pullRequestNumber!==journal.find(j=>j.operation==="pr"&&effectiveOutcome(j.outcome)==="succeeded")?.outcome?.evidence?.pullRequestNumber)return "release_parameter_scope_invalid";
  const artifactInvalid=(expected:any)=>releaseIsGitSet(m)?p.artifactSetDigest!==expected.artifactSetDigest||p.imageDigest!==undefined:p.imageDigest!==expected.imageDigest||p.artifactSetDigest!==undefined;
  if(["deploy_config","deploy"].includes(input.operation)&&(p.commit!==s.commit||artifactInvalid(m.deployment)||p.configDigest!==m.deployment.configDigest||p.schemaDigest!==m.deployment.schemaDigest))return "release_parameter_scope_invalid";
  if(["rollback_config","rollback"].includes(input.operation)&&(p.commit!==m.rollback.commit||artifactInvalid(m.rollback)||p.configDigest!==m.rollback.configDigest||p.schemaDigest!==m.rollback.schemaDigest))return "release_rollback_artifact_invalid";
  if(input.operation==="cleanup"&&releaseDigest(p.resourceIds??[])!==releaseDigest(m.cleanup.ownedResourceIds))return "release_cleanup_scope_invalid";
  return null;
}
export function releaseOutcomeError(release: any, operation: any, input: any,journal:any[]=[]) {
  const s=release.snapshot,m=s.manifest,e=input.evidence,result=effectiveOutcome({status:input.status,reconciledStatus:input.reconciledStatus});
  const retained=releaseRetainsApplication(m);
  if(retained&&(["archive_repository","cleanup_local"].includes(operation.operation)||e.repositoryArchived===true||e.localAbsent===true))return "release_retention_policy_violation";
  if(e.failureKind!==undefined&&(result!=="failed"||operation.operation!=="rollback"||!releaseIsGitSet(m)))return "release_failure_marker_invalid";
  if(result==="failed"&&operation.operation==="rollback"&&releaseIsGitSet(m))return releaseRollbackImageFailureValid(s,e,operation.intent?.parameters?.targetId)?null:"release_failure_not_attributed";
  if(retained&&operation.operation==="cleanup_resource"&&(!m.cleanup.ownedResourceIds.includes(operation.intent?.parameters?.resourceId)||m.cleanup.protectedResourceIds.includes(operation.intent?.parameters?.resourceId)))return "release_cleanup_scope_invalid";
  if(input.status==="reconciled"&&result==="absent") {
    if(!e.absenceVerified)return "release_absence_unproven";
    if(["push","pr","review","merge"].includes(operation.operation))return e.remoteCommit===s.baseCommit&&e.remoteTree===s.baseTree?null:"release_absence_unproven";
    if(operation.operation==="archive_repository")return e.repositoryArchived===false?null:"release_absence_unproven";
    if(operation.operation==="cleanup_local")return e.localAbsent===false?null:"release_absence_unproven";
    if(operation.operation==="cleanup_resource")return e.resourcePresent===true&&releaseDigest(e.resourceIds??[])===releaseDigest([operation.intent.parameters.resourceId])?null:"release_absence_unproven";
    if(["deploy_config","deploy","rollback_config","rollback"].includes(operation.operation)) {
      if(releaseIsGitSet(m))return releaseGitSetEvidenceError(s,e,!operation.operation.startsWith("rollback"),false,operation.intent?.parameters?.targetId)?"release_absence_unproven":null;
      const expected=operation.operation.startsWith("rollback")?{...m.deployment,commit:s.commit}:m.baseline;
      return e.deployedCommit===expected.commit&&e.imageDigest===expected.imageDigest&&e.configDigest===expected.configDigest&&e.schemaDigest===expected.schemaDigest&&e.dataDigest===m.baseline.dataDigest?null:"release_absence_unproven";
    }
    return "release_absence_unproven";
  }
  if(result==="failed"&&["deploy","observe"].includes(operation.operation)) {
    const expected=operation.intent?.parameters?.mode==="rollback"?m.rollback:{...m.deployment,commit:s.commit};
    if(releaseIsGitSet(m)) {
      if(operation.operation==="deploy"&&typeof operation.intent?.parameters?.targetId!=="string")return "release_failure_not_attributed";
      if(releaseGitSetEvidenceError(s,e,operation.intent?.parameters?.mode==="rollback",true,operation.operation==="deploy"?operation.intent?.parameters?.targetId:undefined)
       ||e.healthy!==false||!e.healthDigest||operation.operation==="observe"&&!gitSetQueuesAccepted(journal,e,operation.intent?.parameters?.mode==="rollback"))return "release_failure_not_attributed";
    }else
    if(e.deployedCommit!==expected.commit||e.imageDigest!==expected.imageDigest||e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||e.healthy!==false||!e.healthDigest||e.dataDigest!==m.baseline.dataDigest)return "release_failure_not_attributed";
  }
  if(result!=="succeeded")return null;
  if(["push","pr","review","merge"].includes(operation.operation)&&(e.remoteCommit!==s.commit||e.remoteTree!==s.candidateTree))return "release_remote_identity_mismatch";
  if(["pr","review","merge"].includes(operation.operation)&&(!e.pullRequestNumber||e.prHeadCommit!==s.commit))return "release_pr_identity_mismatch";
  if(operation.operation==="review"&&e.reviewApproved!==true)return "release_pr_review_missing";
  if(operation.operation==="merge"&&(e.prMerged!==true||e.mergedCommit!==s.commit))return "release_merge_commit_changed";
  if(["deploy_config","rollback_config"].includes(operation.operation)) {
    const expected=operation.operation==="deploy_config"?m.deployment:m.rollback;
    const artifactInvalid=releaseIsGitSet(m)?e.artifactSetDigest!==expected.artifactSetDigest||e.imageDigest!==undefined||e.deploymentId!==undefined||e.deployedTargets!==undefined
      :e.imageDigest!==expected.imageDigest||e.artifactSetDigest!==undefined;
    if(e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||artifactInvalid||e.deployedCommit!==(operation.operation==="deploy_config"?s.commit:m.rollback.commit))return "release_config_identity_mismatch";
  }
  if(["deploy","observe","rollback"].includes(operation.operation)) {
    const rollback=operation.operation==="rollback"||operation.intent?.parameters?.mode==="rollback",expected=rollback?m.rollback:m.deployment;
    if(releaseIsGitSet(m)) {
      const targetId=operation.operation==="observe"?undefined:operation.intent?.parameters?.targetId;
      if(operation.operation!=="observe"&&typeof targetId!=="string")return "release_deployment_unproven";
      if(releaseGitSetEvidenceError(s,e,rollback,true,targetId)||e.healthy!==true||!e.healthDigest)return "release_deployment_unproven";
      if(operation.operation==="observe") {
       if(!gitSetQueuesAccepted(journal,e,rollback))return "release_deployment_unproven";
      }
    }else if(!e.deploymentId||e.deployedCommit!==(rollback?m.rollback.commit:s.commit)||e.imageDigest!==expected.imageDigest
      ||e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||e.healthy!==true||!e.healthDigest||e.dataDigest!==m.baseline.dataDigest
      || e.deployedTree!==(rollback?s.baseTree:s.candidateTree))return "release_deployment_unproven";
    if(operation.operation==="observe"&&(!Number.isInteger(e.observationSeconds)||e.observationSeconds<m.observation.seconds))return "release_observation_incomplete";
  }
  if(operation.operation==="cleanup_resource"&&(e.absenceVerified!==true||releaseDigest(e.resourceIds??[])!==releaseDigest([operation.intent.parameters.resourceId])))return "release_cleanup_unproven";
  if(operation.operation==="archive_repository"&&e.repositoryArchived!==true)return "release_cleanup_unproven";
  if(operation.operation==="cleanup_local"&&e.localAbsent!==true)return "release_cleanup_unproven";
  if(operation.operation==="cleanup") {
    if(retained) {
      if(input.observationOnly!==true||e.retentionVerified!==true||e.repositoryArchived!==false||e.localAbsent!==false
        ||e.repositoryUrl!==m.repository.url||e.canonicalDir!==m.repository.canonicalDir||e.targetId!==m.deployment.targetId
        ||e.applicationActive!==true||e.localCommit!==s.commit||e.localTree!==s.candidateTree||e.remoteCommit!==s.commit||e.remoteTree!==s.candidateTree
        ||e.protectedResourcesDigest!==releaseDigest(m.cleanup.protectedResourceIds)||e.absenceVerified!==true
        ||releaseDigest(e.resourceIds??[])!==releaseDigest(m.cleanup.ownedResourceIds))return "release_retention_unproven";
    }else if(e.repositoryArchived!==true||e.localAbsent!==true||e.absenceVerified!==true||releaseDigest(e.resourceIds??[])!==releaseDigest(m.cleanup.ownedResourceIds))return "release_cleanup_unproven";
  }
  return null;
}
