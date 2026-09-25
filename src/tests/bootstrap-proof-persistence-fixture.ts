import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {proofBytes,proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {proofEqual,replayProofKeys,proofReference,proofKeyEvent,type ProofKeyIntent} from '../modules/api-keys/bootstrap-proof-key-contract';
import {proofAuthorityAttachment} from '../modules/api-keys/bootstrap-proof-authority-contract';
import {createPrismaProofAuthorityStore} from '../modules/api-keys/bootstrap-proof-persistence';
import {proofPersistenceFunctions,proofPersistenceTriggers,proofPersistenceForeignKeys} from '../modules/api-keys/bootstrap-proof-persistence-guards';
import {decisionAttestationGuards,decisionAttestationHelpers} from '../modules/api-keys/decision-attestation-adapter';
import {dispatchGuards} from '../modules/api-keys/bootstrap-dispatch-guards';
import {completionFunctions,completionTriggers} from '../modules/api-keys/bootstrap-canonical-completion-guards';

let serial=1;export const proofId=()=>`00000000-0000-4000-8000-${String(serial++).padStart(12,'0')}`;
export const publicMaterials=['d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c','fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025']
 .map((p,i)=>{const b=Buffer.from('302a300506032b6570032100'+p,'hex');return {keyId:`proof-public-${i}`,algorithm:'Ed25519' as const,format:'spki-der-base64' as const,spki:b.toString('base64'),publicKeyDigest:createHash('sha256').update(b).digest('hex')};});
const copy=<T>(v:T):T=>structuredClone(v),hash='a'.repeat(64);
type State={fence:number;rows:any[];receipts:any[];events:any[]};
export function proofPersistenceFixture(){
 const workspaceId=proofId(),installationId=proofId(),hostId=proofId(),ownerId=proofId(),generation={installationGeneration:proofId(),hostGeneration:proofId(),hostId},
  identities={installationLifecycleId:proofId(),hostLifecycleId:proofId()},decisions=new Map<string,{field:string;body:unknown;owner:string;revision:number}>();
 let committed:State={fence:1,rows:[],receipts:[],events:[]},now='2026-09-25T12:00:00.000Z',fault='',tail=Promise.resolve(),txNo=0,writeCount=0,sourceVersion=0;
 const calls:{db:number;mode:string;sql:string}[]=[],options:any[]=[];
 const sourceDigest=()=>proofDigest({ownerId,workspaceId,installationId,generation,sourceVersion});
 const state=()=>copy(committed);
 function currentHistory(s:State,principal:string){return s.rows.filter(r=>r.principal===principal).sort((a,b)=>a.revision-b.revision).map(r=>r.record);}
 function operation(s:State,table:string,id:string){
  const row=s.rows.find(r=>r.table===table&&r.id===id);if(!row)return null;
  const receipt=s.receipts.find(r=>r.operationId===id),event=s.events.find(e=>e.operationId===id);
  if(!receipt||!event||!proofEqual(event,receipt))throw Error('missing committed receipt/Event');
  const {table:_,...r}=row;return {row:copy(r),receipt:copy(receipt)};
 }
 function authority(d:string,field:string,body:unknown,revision:number){const a=decisions.get(d);if(!a||a.field!==field||a.revision!==revision||a.owner!==ownerId||!proofEqual(a.body,body))throw Error('owner unavailable');return a.owner;}
 function trigger(s:State,row:any,db:number){
  if(fault==='insert')throw Error('insert failure');
  assert.equal(row.source_digest,sourceDigest());assert.equal(row.writer_xid,String(db));assert.equal(row.record_digest,proofDigest(row.record));assert.equal(row.bytes,proofBytes(row.record).toString('hex'));
  if(row.principal){
   const event=proofKeyEvent.parse(row.record),i=event.intent;
   assert.equal(event.fromFence,s.fence);assert.equal(event.toFence,s.fence+1);assert.equal(row.revision,event.revision);
   authority(event.decisionId,'workerBootstrapProofKey',i,event.decisionRevision);replayProofKeys([...currentHistory(s,row.principal),event]);
   if(i.material&&s.rows.some(r=>r.principal&&r.principal!==row.principal&&r.record.intent.material?.publicKeyDigest===i.material!.publicKeyDigest))throw Error('cross purpose key reuse');
  }else{
   const a=proofAuthorityAttachment.parse(row.record);authority(a.decisionId,'workerBootstrapProofAuthority',a,a.decisionRevision);
   for(const role of ['worker','server'] as const){const refs=proofReference(replayProofKeys(currentHistory(s,a[role].scope.principal)),a[role].epoch);assert.deepEqual(refs,a[role]);}
   if(s.rows.some(r=>!r.principal&&r.record.ticketId===a.ticketId))throw Error('duplicate ticket');
   if(a.purpose==='owner_recovery'){
    const prior=s.rows.find(r=>!r.principal&&r.record.ticketId===a.prior?.ticketId)?.record;if(!prior)throw Error('canonical prior missing');
    assert.deepEqual(a.prior,{worker:prior.worker,decisionId:prior.decisionId,ticketId:prior.ticketId,requestId:prior.requestId,enrollmentGeneration:prior.enrollmentGeneration});
    const old=replayProofKeys(currentHistory(s,'local_worker')).generations.find(g=>g.epoch===prior.worker.epoch);assert.equal(old?.state,'revoked');assert.ok(a.worker.epoch>prior.worker.epoch);assert.equal(a.enrollmentGeneration,prior.enrollmentGeneration+1);
   }
  }
  s.rows.push(row);s.fence++;
  if(fault==='audit')throw Error('audit failure');
  const receipt={operationId:row.id,table:row.table,eventId:row.principal?row.record.auditId:row.id,recordDigest:row.record_digest,sourceDigest:row.source_digest,writerXid:row.writer_xid,fromFence:String(s.fence-1),toFence:String(s.fence)};
  s.events.push(copy(receipt));if(fault==='event')throw Error('event failure');s.receipts.push(receipt);if(fault==='receipt')throw Error('receipt failure');
 }
 const client:any={$transaction:async(work:any,opt:any)=>{
  let release!:()=>void;const wait=tail;tail=new Promise<void>(r=>release=r);await wait;
  const mode=opt.isolationLevel==='Serializable'?'write':'read',dbNo=++txNo,s=copy(committed);options.push(copy(opt));let readOnly=false;
  const db:any={$queryRaw:async(parts:TemplateStringsArray,...args:any[])=>{
   const sql=parts.join('?');calls.push({db:dbNo,mode,sql});
   if(sql.includes('proof foreign keys')){const rows:any[]=proofPersistenceForeignKeys.map(r=>({...r,enabled:true}));if(fault==='foreign_key')rows[0].target='wrong_root';if(fault==='unvalidated_fk')rows[0].enabled=false;return rows;}
   if(sql.includes('proof clock'))return [{fence:String(s.fence),xid:String(dbNo),at:now,isolation:mode==='write'?'serializable':'repeatable read',readOnly:readOnly?'on':'off',origin:fault==='replica'?'replica':'origin',schemaSafe:fault!=='search_path'}];
   if(sql.includes('proof sources'))return [{digest:sourceDigest()}];
   if(sql.includes('proof owner'))return [{owner:authority(args[1],args[3],JSON.parse(args[4]),args[2])}];
   if(sql.includes('proof lifecycle')){if(args[0]!==workspaceId||args[1]!==installationId||args[2]!==generation.installationGeneration||args[3]!==hostId||args[4]!==generation.hostGeneration||fault==='lifecycle')return [];return [copy(identities)];}
   if(sql.includes('proof lock'))return [{revision:s.fence}];
   if(sql.includes('proof attachment lookup'))return s.rows.filter(r=>r.table==='bootstrap_proof_attachments'&&r.decision_id===args[0]&&r.ticket_id===args[1]).map(r=>({value:operation(s,r.table,r.id)}));
   if(sql.includes('proof history'))return s.rows.filter(r=>r.principal===args[1]&&r.workspace_id===args[0]).sort((a,b)=>a.revision-b.revision).map(r=>({value:operation(s,r.table,r.id)}));
   if(sql.includes('proof operation')){
    if(mode==='read'&&s.rows.length&&fault==='readback')throw Error('readback unavailable');
    const value=operation(s,args[0],args[1]);if(mode==='read'&&value&&fault==='missing')return [{value:null}];
    if(mode==='read'&&value&&fault==='mismatch')value.receipt.recordDigest='f'.repeat(64);
    return [{value}];
   }
   if(sql.includes('decision_attestation_available'))return [{decision_attestation_available:fault!=='legacy'}];
   if(sql.includes('FROM pg_proc')){
    const expected=sql.includes('proof functions')?proofPersistenceFunctions:sql.includes('p.proargtypes')?decisionAttestationHelpers:completionFunctions;
    const rows:any[]=expected.map(r=>({...r,enabled:true}));if(sql.includes('proof functions')&&fault==='body')rows[0].hash='f'.repeat(64);return rows;
   }
   if(sql.includes('FROM pg_trigger')){
    const expected=sql.includes('proof triggers')?proofPersistenceTriggers:sql.includes('c.relname||')?completionTriggers:args[0].length===dispatchGuards.length?dispatchGuards:decisionAttestationGuards;
    const rows:any[]=expected.map(r=>({...r,enabled:true}));if(sql.includes('proof triggers')){
     if(fault==='missing_guard')rows.pop();if(fault==='disabled')rows[0].enabled=false;if(fault==='rebound')rows[0].table='wrong_root';if(fault==='predicate')rows[0].enabled=false;if(fault==='deferred')rows[0].deferred=!rows[0].deferred;
    }return rows;
   }
   throw Error('unhandled SELECT');
  },$executeRaw:async(parts:TemplateStringsArray,...args:any[])=>{
   const sql=parts.join('?');calls.push({db:dbNo,mode,sql});
   if(sql==='SET TRANSACTION READ ONLY'){readOnly=true;return 0;}
   if(sql==='SET LOCAL search_path = pg_catalog, public')return 0;
   assert.equal(mode,'write');assert.equal(readOnly,false);
   if(sql==='SET CONSTRAINTS ALL IMMEDIATE'){if(fault==='deferred_commit')throw Error('deferred constraint');if(fault==='source_drift')sourceVersion++;if(s.rows.some(r=>r.writer_xid===String(dbNo)&&r.source_digest!==sourceDigest()))throw Error('source drift');return 0;}
   writeCount++;
   if(sql.includes('proof insert key')){
    const [id,w,principal,installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id,decision_id,decision_revision,revision,record,bytes,record_digest,source_digest,writer_xid]=args;
    trigger(s,{id,workspace_id:w,principal,installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id,decision_id,decision_revision,revision,record:JSON.parse(record),bytes:bytes.toString('hex'),record_digest,source_digest,writer_xid,table:'bootstrap_proof_key_history'},dbNo);return 1;
   }
   if(sql.includes('proof insert attachment')){
    const [id,w,installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id,decision_id,decision_revision,ticket_id,request_id,enrollment_generation,worker_key_event_id,worker_revision,worker_history_digest,server_key_event_id,server_revision,server_history_digest,record,bytes,record_digest,source_digest,writer_xid]=args;
    trigger(s,{id,workspace_id:w,installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id,decision_id,decision_revision,ticket_id,request_id,enrollment_generation,worker_key_event_id,worker_principal:'local_worker',worker_revision,worker_history_digest,server_key_event_id,server_principal:'roost_server',server_revision,server_history_digest,record:JSON.parse(record),bytes:bytes.toString('hex'),record_digest,source_digest,writer_xid,table:'bootstrap_proof_attachments'},dbNo);return 1;
   }throw Error('unhandled mutation');
  }};
  try{const result=await work(db);if(mode==='write'){
    if(fault==='false_commit')return result;if(fault==='false_callback')return undefined;committed=s;if(fault==='lost_commit')throw Error('lost COMMIT ACK');
   }return result;
  }finally{release();}
 }};
 const api=createPrismaProofAuthorityStore(client);
 function approve(field:string,body:unknown,decisionId=proofId()){decisions.set(decisionId,{field,body:copy(body),owner:ownerId,revision:1});return decisionId;}
 function command(principal:'local_worker'|'roost_server',action:ProofKeyIntent['action']='create',overrides:Partial<ProofKeyIntent>={}){
  const h=currentHistory(committed,principal),old=h.length?replayProofKeys(h):null;
  const scope=principal==='local_worker'?{principal,purpose:'worker-bootstrap-proof-v1' as const,workspaceId,installationId}:{principal,purpose:'bootstrap-completion-binding-attestation-v1' as const,workspaceId};
  const add=['create','adopt','stage'].includes(action),intent:ProofKeyIntent={version:'bootstrap-proof-key-history-v1',scope,action,expectedRevision:old?.revision??0,targetEpoch:old?.highWater??1,
   material:add?publicMaterials[principal==='local_worker'?0:2]:null,generation:add&&principal==='local_worker'?generation:null,
   provenance:add?{source:principal==='local_worker'?'local_worker_os_protected':'roost_server_secret_store',evidenceDigest:hash}:null,
   adoptionEvidenceDigest:action==='adopt'?hash:null,activatesAt:null,cutoverAt:null,expiresAt:'2026-09-25T13:00:00.000Z',...overrides};
  return {operationId:proofId(),decisionId:approve('workerBootstrapProofKey',intent),decisionRevision:1,intent};
 }
 function attachment(prior:any=null){
  const a={version:'bootstrap-proof-authority-v1' as const,workspaceId,installationId,generation,ownerId,decisionId:proofId(),decisionRevision:1,ticketId:proofId(),requestId:proofId(),
   enrollmentGeneration:prior?prior.enrollmentGeneration+1:1,purpose:prior?'owner_recovery' as const:'first_enrollment' as const,
   worker:proofReference(replayProofKeys(currentHistory(committed,'local_worker')),replayProofKeys(currentHistory(committed,'local_worker')).highWater),
   server:proofReference(replayProofKeys(currentHistory(committed,'roost_server')),replayProofKeys(currentHistory(committed,'roost_server')).highWater),
   prior:prior?{worker:prior.worker,decisionId:prior.decisionId,ticketId:prior.ticketId,requestId:prior.requestId,enrollmentGeneration:prior.enrollmentGeneration}:null};
  approve('workerBootstrapProofAuthority',a,a.decisionId);return {operationId:proofId(),attachment:a};
 }
 return {api,client,state,command,attachment,approve,workspaceId,installationId,generation,ownerId,calls,options,
  faults:(v:string)=>{fault=v;},setNow:(v:string)=>{now=v;},stats:()=>({writes:writeCount,transactions:txNo}),
  tamper:(fn:(s:State)=>void)=>fn(committed),history:(principal:string)=>copy(currentHistory(committed,principal)),
  decisions};
}
