import {randomUUID} from 'node:crypto';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {advanceDispatch,dispatchDigest} from './bootstrap-dispatch-contract';
import {advanceTicketLifecycle} from './bootstrap-ticket-lifecycle-contract';
import {persistedBootstrapHistory} from './worker-bootstrap-persistence-contract';
import {one,exact,type AttestationDb as Db} from './decision-attestation-sql';
import {completionReceipt,denyCompletion as deny,type CanonicalCompletionInput,type CompletionContext} from './bootstrap-canonical-completion-contract';
import {completionFunctions,completionTriggers} from './bootstrap-canonical-completion-guards';

export async function requireCompletionGuards(db:Db){
 const f=await db.$queryRaw<any[]>`SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,
  p.prorettype::regtype::text AS result,l.lanname AS language,p.provolatile::text AS volatility,
  encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
  (n.nspname='public' AND p.prokind='f' AND NOT p.prosecdef AND p.proconfig IS NULL AND NOT p.proisstrict
   AND NOT p.proleakproof AND p.proparallel='u') AS enabled
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.proname=ANY(${completionFunctions.map(f=>f.name)}::text[])`;
 if(f.length!==completionFunctions.length||!completionFunctions.every(e=>f.filter(({enabled,...v})=>enabled===true&&exact(e,v)).length===1))deny();
 const t=await db.$queryRaw<any[]>`SELECT c.relname AS "table",t.tgname AS name,p.proname AS function,t.tgtype::int AS kind,
  t.tgdeferrable AS deferred,(t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal
   AND (t.tgconstraint<>0)=t.tgdeferrable AND t.tginitdeferred=t.tgdeferrable AND n.nspname='public' AND pn.nspname='public'
   AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype AND current_setting('session_replication_role')='origin') AS enabled
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
 WHERE c.relname||':'||t.tgname=ANY(${completionTriggers.map(t=>`${t.table}:${t.name}`)}::text[])`;
 if(t.length!==completionTriggers.length||!completionTriggers.every(e=>t.filter(({enabled,...v})=>enabled===true&&exact(e,v)).length===1))deny();
}
export async function readCompletionContext(db:Db,v:CanonicalCompletionInput){
 const rows=await db.$queryRaw<any[]>`SELECT bootstrap_completion_context(${v.binding.payload.command.attemptId}::uuid,${v.binding.payload.handoffId}::uuid) AS context`;
 return one(rows).context;
}
export async function readCompletion(db:Db,attemptId:string){
 const rows=await db.$queryRaw<any[]>`SELECT c.receipt,
  (r.record_digest=bootstrap_lifecycle_digest(to_jsonb(c)) AND r.writer_xid=c.writer_xid
   AND e.workspace_id=c.workspace_id AND e.type='bootstrap.canonical_completion' AND e.source='roost' AND e.actor_type::text='system'
   AND e.resource_type='worker_bootstrap_completions' AND e.resource_id=c.id::text
   AND e.payload=jsonb_build_object('operationId',c.id,'attemptId',c.attempt_id,'digest',r.record_digest,'launchAuthority',false)
   AND bootstrap_completion_proof(c.input,c.context,c.plan,c.writer_xid,c.from_fence,c.to_fence)=c.proof
   AND c.receipt->>'inputDigest'=bootstrap_lifecycle_digest(c.input)) AS verified
 FROM worker_bootstrap_completions c LEFT JOIN worker_bootstrap_completion_receipts r ON r.operation_id=c.id
 LEFT JOIN events e ON e.id=r.event_id WHERE c.attempt_id=${attemptId}::uuid LIMIT 2`;
 if(!rows.length)return null;
 const row=one(rows);return {receipt:completionReceipt.parse(row.receipt),verified:row.verified===true};
}
export async function writeCompletion(db:Db,v:CanonicalCompletionInput,s:CompletionContext){
 const c=v.binding.payload.command,i=s.registration.identity,at=s.at;
 const dispatch=advanceDispatch(s.dispatch,s.dispatch.authority,c,at,{version:'bootstrap-dispatch-lineage-v1',anchor:s.dispatch.lineage.anchor,previous:s.dispatchReceipt});
 if(await db.$executeRaw`INSERT INTO worker_bootstrap_dispatch_history(id,attempt_id,revision,previous_digest,record,record_digest,request_digest,fence_revision,writer_xid)
  VALUES(${c.operationId}::uuid,${c.attemptId}::uuid,${dispatch.revision},${dispatch.previousDigest},${JSON.stringify(dispatch)}::jsonb,
   ${dispatchDigest(dispatch)},${reviewDigest(c)},${s.fence}::bigint,pg_current_xact_id()::text)`!==1)deny();
 let previous=s.attempt,ticket=s.ticket;
 const histories=[],tickets=[];
 for(const action of ['dispatch','complete'] as const){
  const h=persistedBootstrapHistory.parse({id:randomUUID(),attemptId:c.attemptId,revision:previous.revision+1,
   previousDigest:reviewDigest(previous),previousState:previous.state,state:action==='dispatch'?'dispatched':'acknowledged',createdAt:at,
   peer:v.peer,completion:action==='complete'?v.completion:null});
  const e=advanceTicketLifecycle(i,ticket,reviewDigest(ticket),{id:randomUUID(),action,attemptId:c.attemptId,historyId:h.id},new Date(at));
  if(await db.$executeRaw`INSERT INTO worker_bootstrap_history(id,attempt_id,revision,state,record,record_digest,previous_revision,previous_digest,previous_state)
   VALUES(${h.id}::uuid,${c.attemptId}::uuid,${h.revision},${h.state},${JSON.stringify(h)}::jsonb,${reviewDigest(h)},${previous.revision},${h.previousDigest},${h.previousState})`!==1)deny();
  // Receipt 82 is unique per head/transaction. Both immutable histories and
  // ticket events survive, while the mutable head is CASed exactly once.
  if(action==='complete'&&await db.$executeRaw`UPDATE worker_bootstrap_heads SET history_id=${h.id}::uuid,revision=${h.revision},record_digest=${reviewDigest(h)},state=${h.state}
   WHERE workspace_id=${i.binding.workspaceId}::uuid AND host_id=${i.binding.hostId}::uuid AND attempt_id=${c.attemptId}::uuid
    AND history_id=${s.attempt.id}::uuid AND revision=${s.attempt.revision} AND record_digest=${reviewDigest(s.attempt)}`!==1)deny();
  if(await db.$executeRaw`INSERT INTO worker_bootstrap_lifecycle_events(id,ticket_id,revision,previous_digest,record,record_digest,attempt_id,history_id,writer_xid)
   VALUES(${e.id}::uuid,${c.ticketId}::uuid,${e.revision},${e.previousDigest},${JSON.stringify(e)}::jsonb,${reviewDigest(e)},${c.attemptId}::uuid,${h.id}::uuid,pg_current_xact_id()::text)`!==1)deny();
  histories.push(h);tickets.push(e);previous=h;ticket=e;
 }
 if(await db.$executeRaw`UPDATE worker_credential_handoffs SET state='acknowledged',acknowledged_at=${new Date(at)}
  WHERE id=${s.handoff.id}::uuid AND state='awaiting_ack' AND credential_id=${s.credential.credential.id}::uuid
   AND response_digest=${s.handoff.responseDigest} AND worker_handoff_owner_current(worker_credential_handoffs)
   AND ack_deadline>clock_timestamp()`!==1)deny();
 if(await db.$executeRaw`UPDATE api_keys SET active=true WHERE id=${s.credential.credential.id}::uuid AND active=false AND revoked_at IS NULL
  AND credential_version=${s.credential.credential.version} AND worker_binding_epoch=${s.credential.credential.epoch}
  AND workspace_id=${i.binding.workspaceId}::uuid AND worker_installation_id=${i.binding.installationId}::uuid AND worker_host_id=${i.binding.hostId}::uuid
  AND encode(sha256(convert_to('roost-worker-ticket-v1:'||key_hash,'UTF8')),'hex')=${s.credential.credential.fingerprint}
  AND expires_at>clock_timestamp()`!==1)deny();
 const approval=s.handoff.approval,{credential,...publicKey}=s.credential,operationId=randomUUID(),credentialEventId=randomUUID();
 const snapshot={...credential,...publicKey,active:true,credentialClass:'worker_host_v1',decisionId:approval.decisionId,decisionRevision:approval.decisionRevision,intent:approval.intent};
 if(await db.$executeRaw`INSERT INTO agent_credential_operations(id,workspace_id,request_id,request_hash,key_id,actor_user_id,action,snapshot)
  VALUES(${operationId}::uuid,${i.binding.workspaceId}::uuid,${approval.requestId}::uuid,${reviewDigest(approval)},${credential.id}::uuid,
   ${i.ownerId}::uuid,${approval.intent.action==='enroll'?'create':'rotate'},${JSON.stringify(snapshot)}::jsonb)`!==1)deny();
 if(await db.$executeRaw`INSERT INTO events(id,workspace_id,type,source,actor_type,actor_id,resource_type,resource_id,payload,updated_at)
  VALUES(${credentialEventId}::uuid,${i.binding.workspaceId}::uuid,${'api_key.worker_'+approval.intent.action},'roost_api','user',${i.ownerId},'api_key',${credential.id},${JSON.stringify(snapshot)}::jsonb,clock_timestamp())`!==1)deny();
 const plan={dispatch,histories,tickets,credentialOperationId:operationId,credentialEventId,snapshot},eventId=randomUUID();
 const row=one(await db.$queryRaw<any[]>`SELECT revision::text AS fence,pg_current_xact_id()::text AS xid,
  bootstrap_completion_proof(${JSON.stringify(v)}::jsonb,${JSON.stringify(s)}::jsonb,${JSON.stringify(plan)}::jsonb,
   pg_current_xact_id()::text,${s.fence}::bigint,revision) AS proof FROM ready_source_fence WHERE id=1`);
 if(!row.proof)deny();
 const receipt=completionReceipt.parse({operationId:c.operationId,attemptId:c.attemptId,ticketId:c.ticketId,credentialId:credential.id,
  inputDigest:reviewDigest(v),sourceDigest:s.sourceDigest,writerXid:row.xid,fromFence:s.fence,toFence:row.fence,
  dispatchDigest:reviewDigest(dispatch),attemptDigest:reviewDigest(previous),ticketDigest:reviewDigest(ticket),credentialDigest:reviewDigest(snapshot),
  receiptSetDigest:reviewDigest(row.proof),eventId,recordDigest:reviewDigest({input:v,context:s,plan,proof:row.proof})});
 if(await db.$executeRaw`INSERT INTO worker_bootstrap_completions(id,workspace_id,attempt_id,ticket_id,handoff_id,credential_id,input,context,plan,proof,receipt,from_fence,to_fence,writer_xid,event_id)
  VALUES(${c.operationId}::uuid,${i.binding.workspaceId}::uuid,${c.attemptId}::uuid,${c.ticketId}::uuid,${s.handoff.id}::uuid,${credential.id}::uuid,
   ${JSON.stringify(v)}::jsonb,${JSON.stringify(s)}::jsonb,${JSON.stringify(plan)}::jsonb,${JSON.stringify(row.proof)}::jsonb,${JSON.stringify(receipt)}::jsonb,
   ${s.fence}::bigint,${row.fence}::bigint,pg_current_xact_id()::text,${eventId}::uuid)`!==1)deny();
 return receipt;
}
