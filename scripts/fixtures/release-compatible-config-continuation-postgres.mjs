// Fictional stored-history fixture only. Native booleans below are counterfactual
// metadata; this fixture cannot qualify admission without the real original
// source/application evidence/owner/runtime/credential rows and existing guards.
import {randomUUID} from 'node:crypto';
import shared from '../lib/agent-host-release-contract.cjs';
import ingress from '../lib/agent-host-release-compose-ingress-fence.cjs';
import {compatibleConfigClosureFixture} from './release-compatible-config-closure.mjs';
const d=shared.releaseDigest,H=c=>c.repeat(64),clone=structuredClone;
export function compatibleContinuationPostgresFixture(clock=Date.now()-10000){
 const f=compatibleConfigClosureFixture({clock}),workspace=randomUUID(),s=f.s;
 s.requestId=randomUUID();delete s.releaseId;
 const releaseId=f.state.release.id,issuer=f.state.release.issuerUserId,created=new Date(clock-60000).toISOString();
 const parent={id:releaseId,workspace_id:workspace,task_id:s.taskId,application_id:s.applicationId,host_id:s.hostId,release_execution_id:s.releaseExecutionId,
  review_id:s.reviewId,releaser_agent_id:s.releaserAgentId,releaser_credential_id:s.releaserCredentialId,credential_version:s.credentialVersion,
  issuer_user_id:issuer,expires_at:s.expiresAt,manifest_digest:s.manifestDigest,configuration_digest:H('a'),snapshot:s,request_id:s.requestId,request_hash:H('b'),created_at:created};
 const operations=f.state.journal.map((row,n)=>({...clone(row),release_id:releaseId,workspace_id:workspace,application_id:s.applicationId,sequence:n+1,
  request_id:row.intent.requestId,request_hash:H('c'),created_at:row.createdAt}));
 const outcomes=operations.map((row,n)=>({id:row.outcome.id,sequence:n+1,release_id:releaseId,operation_id:row.id,workspace_id:workspace,
  status:row.outcome.status,reconciled_status:row.outcome.reconciledStatus??null,observation_only:row.outcome.observationOnly??false,evidence:row.outcome.evidence,
  request_id:randomUUID(),request_hash:H('d'),created_at:row.outcome.evidence.observedAt}));
 for(const row of operations){delete row.outcome;delete row.createdAt;}
 const last=operations[4],lastOutcome=outcomes[4],revocationId=randomUUID(),closureAt=new Date(clock+1).toISOString();
 const receipt={...clone(f.body),releaseId,applicationId:s.applicationId,hostId:s.hostId,issuerUserId:issuer,failedOutcomeId:lastOutcome.id,failedEvidenceDigest:d(lastOutcome.evidence)};
 const closure={id:randomUUID(),release_id:releaseId,workspace_id:workspace,issuer_user_id:issuer,owner_authenticated_at:new Date(clock-1000).toISOString(),
  failed_operation_id:last.id,failed_outcome_id:lastOutcome.id,expected_version:receipt.expectedVersion,consent_digest:receipt.consentDigest,closure_digest:d(receipt),
  revocation_id:revocationId,snapshot:receipt,request_id:randomUUID(),request_hash:H('e'),created_at:closureAt};
 const revocation={id:revocationId,release_id:releaseId,workspace_id:workspace,issuer_user_id:issuer,reason:'Fictional configuration absence closure fixture',
  request_id:randomUUID(),request_hash:H('f'),created_at:closureAt};
 const input=clone(s),at=new Date(clock+2000).toISOString(),r=input.compatibleArtifactRecovery,e=r.currentEntry;
 input.requestId=randomUUID();input.releaserCredentialId=randomUUID();input.releaseExecutionId=randomUUID();input.expiresAt=new Date(clock+3600000).toISOString();
 input.manifest.backup={...input.manifest.backup,digest:H('c'),restoreDigest:H('c'),capturedAt:at,restoreVerifiedAt:at};
 e.observedAt=at;e.projectInventory.observedAt=at;e.projectInventory.digest=shared.compatibleRecoveryInventoryDigest(e.projectInventory);
 e.ingressFence.observedAt=at;e.ingressFence.evidenceDigest=ingress.composeIngressFenceDigest(e.ingressFence);
 for(const row of [...e.services,...e.cadences]){row.observedAt=at;row.inventoryDigest=e.projectInventory.digest;}
 e.evidenceDigest=shared.compatibleRecoveryEntryDigest(e);r.nativeClosure.observedAt=at;r.nativeClosure.releaseId=r.prior.releaseId;
 r.nativeClosure.operationId=r.prior.failedOperationId;r.nativeClosure.agentHostId=input.hostId;r.nativeClosure.evidenceDigest=e.evidenceDigest;
 r.replacement.compatibilityReceiptDigest=H('e');r.scopeAudit={taskId:randomUUID(),executionId:input.releaseExecutionId,reviewId:randomUUID(),materialVersion:H('f'),scopeDigest:H('0')};
 input.compatibleConfigurationContinuation={releaseId,closureId:closure.id,closureDigest:closure.closure_digest,
  gitOperationIds:Object.fromEntries(operations.slice(0,4).map(row=>[row.operation,row.id]))};
 input.manifestDigest=d(input.manifest);r.scopeAudit.scopeDigest=shared.compatibleConfigurationContinuationScopeDigest(input);
 return{parent,operations,outcomes,closure,revocation,input,workspace,issuer,clock,claimLevel:'fictional_stored_history_not_admission_authority'};
}
export function continuationSeedSql(f){
 const quote=v=>"'"+v.replaceAll("'","''")+"'",json=v=>quote(JSON.stringify(v))+'::jsonb';
 const row=(table,value)=>'INSERT INTO '+table+' SELECT (jsonb_populate_record(NULL::'+table+','+json(value)+')).*;';
 // Only the isolated named local test database may load an already-recorded
 // counterfactual history. New continuation admission still runs normal guards.
 return 'BEGIN;SET LOCAL session_replication_role=replica;'+row('governed_releases',f.parent)+f.operations.map(v=>row('governed_release_operations',v)).join('')+
  f.outcomes.map(v=>row('governed_release_outcomes',v)).join('')+row('governed_release_failed_closures',f.closure)+row('governed_release_revocations',f.revocation)+'COMMIT;';
}
