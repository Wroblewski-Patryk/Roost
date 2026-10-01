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
export function releaseIntentError(release: any, input: any, journal: any[]) {
  const s=release.snapshot, m=s.manifest;
  if (input.manifestDigest!==release.manifest_digest || input.commit!==s.commit || input.baseCommit!==s.baseCommit
    || input.observed.commit!==s.commit || input.observed.manifestDigest!==release.manifest_digest)
    return "release_candidate_changed";
  if(journal.some(j=>!effectiveOutcome(j.outcome)||effectiveOutcome(j.outcome)==="uncertain"))return "release_operation_unresolved";
  const successful=(op:string)=>journal.some(j=>j.operation===op&&effectiveOutcome(j.outcome)==="succeeded");
  const merged=successful("merge");
  if(input.observed.baseCommit!==(merged?s.commit:s.baseCommit)||input.observed.baseTree!==(merged?s.candidateTree:s.baseTree))return "release_base_changed";
  const p=input.parameters;
  const dependencies:Record<string,string[]>={push:[],pr:["push"],review:["pr"],merge:["review"],deploy_config:["merge"],deploy:["deploy_config"],observe:["deploy"],rollback_config:[],rollback:["rollback_config"],cleanup_resource:[],archive_repository:[],cleanup_local:["archive_repository"],cleanup:["cleanup_local"]};
  if(input.operation==="observe"&&p.mode==="rollback")dependencies.observe=["rollback"];
  if(input.operation==="observe"&&!p.mode)return "release_observation_mode_required";
  if(dependencies[input.operation].some(op=>!successful(op)))return "release_progression_invalid";
  if(successful(input.operation)&&!["observe","cleanup_resource"].includes(input.operation))return "release_operation_already_succeeded";
  if(["cleanup_resource","archive_repository","cleanup_local","cleanup"].includes(input.operation)&&!journal.some(j=>j.operation==="observe"&&effectiveOutcome(j.outcome)==="succeeded"&&j.intent.parameters.mode===(successful("rollback")?"rollback":"candidate")))return "release_cleanup_before_verification";
  if(input.operation==="cleanup_resource"&&(!m.cleanup.ownedResourceIds.includes(p.resourceId)||journal.some(j=>j.operation==="cleanup_resource"&&j.intent.parameters.resourceId===p.resourceId&&effectiveOutcome(j.outcome)==="succeeded")))return "release_cleanup_scope_invalid";
  if(["archive_repository","cleanup"].includes(input.operation)&&m.cleanup.ownedResourceIds.some((r:string)=>!journal.some(j=>j.operation==="cleanup_resource"&&j.intent.parameters.resourceId===r&&effectiveOutcome(j.outcome)==="succeeded")))return "release_cleanup_resources_pending";
  if(input.operation.startsWith("rollback")&&!journal.some(j=>["deploy","observe"].includes(j.operation)&&effectiveOutcome(j.outcome)==="failed"))return "release_rollback_without_attributed_failure";
  if(input.operation==="push"&&p.branch!==m.repository.candidateBranch)return "release_parameter_scope_invalid";
  if(["review","merge"].includes(input.operation)&&p.pullRequestNumber!==journal.find(j=>j.operation==="pr"&&effectiveOutcome(j.outcome)==="succeeded")?.outcome?.evidence?.pullRequestNumber)return "release_parameter_scope_invalid";
  if(["deploy_config","deploy"].includes(input.operation)&&(p.commit!==s.commit||p.imageDigest!==m.deployment.imageDigest||p.configDigest!==m.deployment.configDigest||p.schemaDigest!==m.deployment.schemaDigest))return "release_parameter_scope_invalid";
  if(["rollback_config","rollback"].includes(input.operation)&&(p.commit!==m.rollback.commit||p.imageDigest!==m.rollback.imageDigest||p.configDigest!==m.rollback.configDigest||p.schemaDigest!==m.rollback.schemaDigest))return "release_rollback_artifact_invalid";
  if(input.operation==="cleanup"&&releaseDigest(p.resourceIds??[])!==releaseDigest(m.cleanup.ownedResourceIds))return "release_cleanup_scope_invalid";
  return null;
}
export function releaseOutcomeError(release: any, operation: any, input: any) {
  const s=release.snapshot,m=s.manifest,e=input.evidence,result=effectiveOutcome({status:input.status,reconciledStatus:input.reconciledStatus});
  if(input.status==="reconciled"&&result==="absent") {
    if(!e.absenceVerified)return "release_absence_unproven";
    if(["push","pr","review","merge"].includes(operation.operation))return e.remoteCommit===s.baseCommit&&e.remoteTree===s.baseTree?null:"release_absence_unproven";
    if(operation.operation==="archive_repository")return e.repositoryArchived===false?null:"release_absence_unproven";
    if(operation.operation==="cleanup_local")return e.localAbsent===false?null:"release_absence_unproven";
    if(operation.operation==="cleanup_resource")return e.resourcePresent===true&&releaseDigest(e.resourceIds??[])===releaseDigest([operation.intent.parameters.resourceId])?null:"release_absence_unproven";
    if(["deploy_config","deploy","rollback_config","rollback"].includes(operation.operation)) {
      const expected=operation.operation.startsWith("rollback")?{...m.deployment,commit:s.commit}:m.baseline;
      return e.deployedCommit===expected.commit&&e.imageDigest===expected.imageDigest&&e.configDigest===expected.configDigest&&e.schemaDigest===expected.schemaDigest&&e.dataDigest===m.baseline.dataDigest?null:"release_absence_unproven";
    }
    return "release_absence_unproven";
  }
  if(result==="failed"&&["deploy","observe"].includes(operation.operation)) {
    const expected=operation.intent?.parameters?.mode==="rollback"?m.rollback:{...m.deployment,commit:s.commit};
    if(e.deployedCommit!==expected.commit||e.imageDigest!==expected.imageDigest||e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||e.healthy!==false||!e.healthDigest||e.dataDigest!==m.baseline.dataDigest)return "release_failure_not_attributed";
  }
  if(result!=="succeeded")return null;
  if(["push","pr","review","merge"].includes(operation.operation)&&(e.remoteCommit!==s.commit||e.remoteTree!==s.candidateTree))return "release_remote_identity_mismatch";
  if(["pr","review","merge"].includes(operation.operation)&&(!e.pullRequestNumber||e.prHeadCommit!==s.commit))return "release_pr_identity_mismatch";
  if(operation.operation==="review"&&e.reviewApproved!==true)return "release_pr_review_missing";
  if(operation.operation==="merge"&&(e.prMerged!==true||e.mergedCommit!==s.commit))return "release_merge_commit_changed";
  if(["deploy_config","rollback_config"].includes(operation.operation)) {
    const expected=operation.operation==="deploy_config"?m.deployment:m.rollback;
    if(e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||e.imageDigest!==expected.imageDigest||e.deployedCommit!==(operation.operation==="deploy_config"?s.commit:m.rollback.commit))return "release_config_identity_mismatch";
  }
  if(["deploy","observe","rollback"].includes(operation.operation)) {
    const rollback=operation.operation==="rollback"||operation.intent?.parameters?.mode==="rollback",expected=rollback?m.rollback:m.deployment;
    if(!e.deploymentId||e.deployedCommit!==(rollback?m.rollback.commit:s.commit)||e.imageDigest!==expected.imageDigest
      ||e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||e.healthy!==true||!e.healthDigest||e.dataDigest!==m.baseline.dataDigest
      || e.deployedTree!==(rollback?s.baseTree:s.candidateTree))return "release_deployment_unproven";
    if(operation.operation==="observe"&&(!Number.isInteger(e.observationSeconds)||e.observationSeconds<m.observation.seconds))return "release_observation_incomplete";
  }
  if(operation.operation==="cleanup_resource"&&(e.absenceVerified!==true||releaseDigest(e.resourceIds??[])!==releaseDigest([operation.intent.parameters.resourceId])))return "release_cleanup_unproven";
  if(operation.operation==="archive_repository"&&e.repositoryArchived!==true)return "release_cleanup_unproven";
  if(operation.operation==="cleanup_local"&&e.localAbsent!==true)return "release_cleanup_unproven";
  if(operation.operation==="cleanup"&&(e.repositoryArchived!==true||e.localAbsent!==true||e.absenceVerified!==true||releaseDigest(e.resourceIds??[])!==releaseDigest(m.cleanup.ownedResourceIds)))return "release_cleanup_unproven";
  return null;
}
