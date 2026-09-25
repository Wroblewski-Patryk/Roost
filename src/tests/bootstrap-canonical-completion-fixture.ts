import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {dispatchFixture} from './bootstrap-dispatch-fixture';
import {linkDispatchReceipt} from '../modules/api-keys/bootstrap-dispatch-lineage';
import {createCanonicalBootstrapCompletion,type CanonicalCompletionDependencies} from '../modules/api-keys/bootstrap-canonical-completion';
import {completionFunctions,completionTriggers} from '../modules/api-keys/bootstrap-canonical-completion-guards';
import type {CanonicalCompletionInput} from '../modules/api-keys/bootstrap-canonical-completion-contract';

// Transactional SQL double, NOT PostgreSQL/MVCC/crypto qualification. Uses the
// real source reader, dispatch lineage, state machines and concrete SQL writer.
export async function canonicalCompletionFixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment'){
 const d=await dispatchFixture(purpose);await d.through('completion_started');
 const root=d.f.objects().find(o=>o.table==='worker_bootstrap_tickets')!.row,
  attempt=d.f.objects().find(o=>o.table==='worker_bootstrap_history')!.row.record,
  ticket=d.f.objects().filter(o=>o.table==='worker_bootstrap_lifecycle_events').at(-1)!.row.record,
  t=root.record.signed.payload,i=root.lifecycle_identity,head=d.head()!,b=d.f.b,profile=t.intent.channel.profile,at=d.f.iso();
 const handoffId=randomUUID(),approval={requestId:randomUUID(),decisionId:randomUUID(),decisionRevision:1,explicitAcceptance:true,
  intent:{schemaVersion:'worker-credential-lifecycle-v1',action:'enroll',workspaceId:b.workspaceId,installationId:b.installationId,
   hostId:b.hostId,expectedCredentialId:t.intent.baseline.credential?.id??null,expectedVersion:t.intent.baseline.credential?.version??0,
   expectedEpoch:t.intent.baseline.credentialHighWater,expectedFingerprint:t.intent.baseline.credential?.fingerprint??null,expiresAt:d.f.iso(60000),validUntil:d.f.iso(60000),
   handoff:{requestId:handoffId,requestDigest:'c'.repeat(64),hostFingerprint:b.hostFingerprint,origin:profile.origin,certificateFingerprint:profile.certificate.fingerprint,replacesRequestId:null}}};
 let context:any={registration:{operationId:t.id,identity:i,record:root.record},attempt,ticket,
  credential:{credential:t.intent.target,workspaceId:b.workspaceId,installationId:b.installationId,hostId:b.hostId,active:false,revokedAt:null,expiresAt:d.f.iso(60000),scopes:['agent-runtime:claim']},
  handoff:{id:handoffId,workspaceId:b.workspaceId,installationId:b.installationId,hostId:b.hostId,hostFingerprint:b.hostFingerprint,state:'awaiting_ack',credentialId:t.intent.target.id,
   responseDigest:'d'.repeat(64),approval,ownerId:i.ownerId,ackDeadline:d.f.iso(30000),origin:profile.origin,certificateFingerprint:profile.certificate.fingerprint},sourceDigest:'b'.repeat(64)};
 const peer={payload:{binding:b,attemptId:head.attemptId,ticketDigest:i.ticketDigest,certificateEpoch:t.intent.channel.certificateEpoch,origin:profile.origin,
  serverName:profile.serverName,pin:profile.certificate.fingerprint,caDigest:profile.trust.caDigest,certificateNotBefore:profile.certificate.notBefore,
  certificateNotAfter:profile.certificate.notAfter,addresses:['8.8.8.8'],peerAddress:'8.8.8.8',observedAt:at,expiresAt:d.f.iso(20000),resolverPolicy:'public_ipv4_only_v1',
  source:'issuer_signed_peer_observation_v1',chainValid:true,hostnameValid:true,proxy:false,redirect:false,downgrade:false},signature:'a'.repeat(128)};
 const completion={payload:{version:'worker-bootstrap-completion-v1',attemptId:head.attemptId,ticketDigest:i.ticketDigest,requestId:t.intent.requestId,
  state:'acknowledged',credential:t.intent.target,peer:peer.payload,responseDigest:head.responseDigest,committedAt:at},signature:'b'.repeat(128)};
 const input:any={peer,completion,binding:{signature:'c'.repeat(128),payload:{version:'roost-bootstrap-canonical-completion-v1',command:d.command('complete'),
  dispatchPredecessor:linkDispatchReceipt(d.ledger().at(-1)!),sealDigest:head.authority.sealDigest,ticketEnvelopeDigest:i.ticketDigest,requestId:t.intent.requestId,
  hostGeneration:i.hostGeneration,installationGeneration:i.installationGeneration,credential:t.intent.target,handoffId,handoffResponseDigest:context.handoff.responseDigest,
  credentialApprovalDigest:reviewDigest(approval),peerDigest:reviewDigest(peer),completionDigest:reviewDigest(completion),issuedAt:at,completedAt:at}}};
 type State={histories:any[];tickets:any[];head:any;active:boolean;ack:boolean;operation:any;event:any;stored:any};
 let state:State={histories:[],tickets:[],head:attempt,active:false,ack:false,operation:null,event:null,stored:null},writes=0,activations=0,xid=9000;
 const calls:{sql:string;mode:string;db:object}[]=[],verifications:{kind:string;db:object}[]=[],providerDbs:object[]=[],controls={fault:'',write:0,verify:'',provider:'',guard:'',
  afterVerify:(()=>{}) as ()=>void,afterProvider:(()=>{}) as ()=>void,beforeCommit:(()=>{}) as ()=>void};
 const deps:CanonicalCompletionDependencies={qualification:'source_only_canonical_completion_v1',decisionAuthority:d.reader,
  transaction:async(mode,work)=>d.deps.transaction(mode,async base=>{
   const saved=structuredClone(state),savedActivations=activations,writerXid=String(++xid);let localWrites=0,headWritten=false;
   const db:any={...base,$queryRaw:async(strings:any,...args:any[])=>{
    const sql=(Array.isArray(strings)?strings.join('?'):strings.sql).replace(/\s+/g,' ').trim(),values=Array.isArray(strings)?args:strings.values;
    calls.push({sql,mode,db});
    if(sql.includes('FROM pg_proc')&&values[0]?.[0]===completionFunctions[0].name){
     const rows:any[]=completionFunctions.map(f=>({...f,enabled:true}));if(controls.guard==='body')rows[0].hash='0'.repeat(64);return rows;
    }
    if(sql.includes('FROM pg_trigger')&&values[0]?.[0]===`${completionTriggers[0].table}:${completionTriggers[0].name}`){
     const rows:any[]=completionTriggers.map(t=>({...t,enabled:true}));if(controls.guard==='disabled')rows[0].enabled=false;return rows;
    }
    if(sql.includes('SELECT bootstrap_completion_context'))return [{context:structuredClone({...context,writerXid})}];
    if(sql.includes('FROM worker_bootstrap_completions c')){
     if(mode==='read'&&state.stored&&controls.fault==='readback')throw Error('readback unavailable');
     if(mode==='read'&&controls.fault==='missing')return [];
     if(!state.stored)return [];
     const receipt=structuredClone(state.stored.receipt);if(mode==='read'&&controls.fault==='mismatch')receipt.inputDigest='0'.repeat(64);
     return [{receipt,verified:controls.fault!=='receipt'&&state.active&&state.ack&&state.histories.length===2&&state.tickets.at(-1)?.state==='completed'}];
    }
    if(sql.includes('bootstrap_completion_proof(')){
     assert.equal(mode,'write');assert.equal(state.histories.length,2);assert.equal(state.histories[0].state,'dispatched');assert.equal(state.histories[1].state,'acknowledged');
     assert.equal(state.tickets.length,2);assert.equal(state.tickets.at(-1).state,'completed');assert.equal(state.head.id,state.histories[1].id);
     assert.ok(state.active&&state.ack&&state.operation&&state.event);
     return [{fence:String(d.f.state().fence),xid:writerXid,proof:controls.fault==='proof'?null:{receipts:state.histories.map(h=>({id:h.id,digest:reviewDigest(h),writerXid})),
      credentialOperationDigest:reviewDigest(state.operation),credentialEventDigest:reviewDigest(state.event)}}];
    }
    return base.$queryRaw(strings,...args);
   },$executeRaw:async(strings:TemplateStringsArray,...values:any[])=>{
    const sql=strings.join('?').replace(/\s+/g,' ').trim();assert.equal(mode,'write');calls.push({sql,mode,db});writes++;localWrites++;
    if(sql.startsWith('INSERT INTO worker_bootstrap_dispatch_history'))await base.$executeRaw(strings,...values);
    else if(sql.startsWith('INSERT INTO worker_bootstrap_history')){const h=JSON.parse(values[4]);assert.equal(h.previousDigest,reviewDigest(state.histories.at(-1)??state.head));state.histories.push(h);d.f.drift();}
    else if(sql.startsWith('UPDATE worker_bootstrap_heads')){assert.equal(headWritten,false,'migration 82 head receipt key is unique per transaction');headWritten=true;
     assert.equal(values[7],state.head.id);state.head=state.histories.at(-1);d.f.drift();}
    else if(sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events')){state.tickets.push(JSON.parse(values[4]));d.f.drift();}
    else if(sql.startsWith('UPDATE worker_credential_handoffs')){assert.equal(state.active,false);state.ack=true;d.f.drift();}
    else if(sql.startsWith('UPDATE api_keys')){assert.equal(state.ack,true);assert.equal(state.active,false);state.active=true;activations++;d.f.drift();}
    else if(sql.startsWith('INSERT INTO agent_credential_operations'))state.operation={id:values[0],snapshot:JSON.parse(values[7])};
    else if(sql.startsWith('INSERT INTO events'))state.event={id:values[0],payload:JSON.parse(values[5])};
    else if(sql.startsWith('INSERT INTO worker_bootstrap_completions'))state.stored={input:JSON.parse(values[6]),context:JSON.parse(values[7]),plan:JSON.parse(values[8]),proof:JSON.parse(values[9]),receipt:JSON.parse(values[10])};
    else assert.fail(sql);
    if(controls.write===localWrites)throw Error('injected write rollback');return 1;
   }};
   try{const result=await work(db);
    if(mode==='write'&&state.stored){controls.beforeCommit();
     assert.equal(state.stored.receipt.toFence,String(d.f.state().fence),'deferred exact fence');
     assert.equal(state.stored.receipt.sourceDigest,context.sourceDigest,'deferred sources');}
    if(mode==='write'&&controls.fault==='precommit')throw Error('deferred rejection');
    if(mode==='write'&&controls.fault==='false'){state=saved;activations=savedActivations;}
    return result;
   }catch(error){if(mode==='write'){state=saved;activations=savedActivations;}throw error;}
  }),
  verifier:{qualification:'injected_bootstrap_completion_verifier_v1',verify:async(db,r)=>{verifications.push({kind:r.kind,db});controls.afterVerify();return controls.verify!==r.kind;}},
  credentialFacts:{qualification:'injected_canonical_credential_possession_v1',inspect:async(db,r)=>{providerDbs.push(db);controls.afterProvider();return controls.provider==='missing'?null:
   {credential:r.context.credential,handoffId:r.context.handoff.id,inputDigest:reviewDigest(r.input),fence:r.context.fence,possessionVerified:controls.provider!=='possession'};}}};
 const factory=()=>createCanonicalBootstrapCompletion({...deps});
 return {d,input:input as CanonicalCompletionInput,deps,factory,adapter:factory(),controls,calls,verifications,providerDbs,
  context:()=>context,changeContext:(fn:(s:any)=>void)=>fn(context),state:()=>structuredClone(state),stats:()=>({writes,activations}),
  lost:()=>{d.controls.phase='complete';d.controls.fault='lost';},falseAck:()=>{controls.fault='false';d.controls.phase='complete';d.controls.fault='false';d.f.fault('false');}};
}
