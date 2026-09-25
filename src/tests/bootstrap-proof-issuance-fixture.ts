import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {proofId,publicMaterials} from './bootstrap-proof-persistence-fixture';
import {proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {proofEventReceipt,proofReference,replayProofKeys,type ProofKeyEvent,type ProofKeyIntent} from '../modules/api-keys/bootstrap-proof-key-contract';
import {channelSnapshotDigest} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {v3Authority,v3AuthorityVersion,v3Domains,v3EnvelopeDigest,v3SealDigest,validateV3Authority,type V3Authority,type V3Command,type V3Plan,type V3Receipt} from '../modules/api-keys/bootstrap-proof-issuance-contract';
import {createBootstrapProofV3Issuance,v3WritePhases,type V3IssuanceDependencies,type V3Phase} from '../modules/api-keys/bootstrap-proof-issuance';
import type {AttestationDb as Db} from '../modules/api-keys/decision-attestation-sql';

export const copy=<T>(v:T):T=>structuredClone(v);
export const hash=(s='a')=>s.repeat(64);
const offset=(time:string,ms:number)=>new Date(Date.parse(time)+ms).toISOString();
const issuerBytes=Buffer.from('302a300506032b6570032100ec172b93ad5e563bf4932c70e1245034c35467ef2efd4d64ebf819683467e2bf','hex');
const issuerMaterial={keyId:'v3-public-issuer',algorithm:'Ed25519' as const,format:'spki-der-base64' as const,
 spki:issuerBytes.toString('base64'),publicKeyDigest:createHash('sha256').update(issuerBytes).digest('hex')};

export function appendProofEvent(history:ProofKeyEvent[],intent:ProofKeyIntent,time:string){
 const previous=history.length?replayProofKeys(history):null;
 const body={id:proofId(),previousDigest:previous?.historyDigest??null,revision:intent.expectedRevision+1,at:time,intent,
  ownerId:proofId(),decisionId:proofId(),decisionRevision:1,decisionIntentDigest:proofDigest(intent),fromFence:history.length,toFence:history.length+1,auditId:proofId()};
 const event={...body,receiptDigest:proofEventReceipt(body)};replayProofKeys([...history,event]);history.push(event);return event;
}
export function changeProof(history:ProofKeyEvent[],action:ProofKeyIntent['action'],time:string,changes:Partial<ProofKeyIntent>={}){
 const p=replayProofKeys(history);
 return appendProofEvent(history,{version:'bootstrap-proof-key-history-v1',scope:p.scope,action,expectedRevision:p.revision,targetEpoch:p.highWater,
  material:null,generation:null,provenance:null,adoptionEvidenceDigest:null,activatesAt:null,cutoverAt:null,expiresAt:offset(time,600000),...changes},time);
}

export function v3AuthorityFixture(recovery=false){
 const f=bootstrapChannelFixture(),{binding}=f.intent,at=f.iso(),generation={installationGeneration:f.snapshot.installationGeneration,hostGeneration:f.snapshot.hostGeneration,hostId:binding.hostId};
 binding.ticketKeyId=issuerMaterial.keyId;binding.ticketPublicKeyDigest=issuerMaterial.publicKeyDigest;
 const worker:ProofKeyEvent[]=[],server:ProofKeyEvent[]=[];
 for(const [history,scope,material,gen,source] of [
  [worker,{principal:'local_worker',purpose:'worker-bootstrap-proof-v1',workspaceId:binding.workspaceId,installationId:binding.installationId},publicMaterials[0],generation,'local_worker_os_protected'],
  [server,{principal:'roost_server',purpose:'bootstrap-completion-binding-attestation-v1',workspaceId:binding.workspaceId},publicMaterials[2],null,'roost_server_secret_store']
 ] as const)appendProofEvent(history,{version:'bootstrap-proof-key-history-v1',scope,action:'create',expectedRevision:0,targetEpoch:1,material,generation:gen,
  provenance:{source,evidenceDigest:hash()},adoptionEvidenceDigest:null,activatesAt:null,cutoverAt:null,expiresAt:f.iso(600000)},f.iso(-60000));
 const attachment={version:'bootstrap-proof-authority-v1',workspaceId:binding.workspaceId,installationId:binding.installationId,generation,
  ownerId:f.ticket.ownerId,decisionId:f.ticket.decisionId,decisionRevision:1,ticketId:f.ticket.id,requestId:f.intent.requestId,enrollmentGeneration:1,purpose:'first_enrollment',
  worker:proofReference(replayProofKeys(worker),1),server:proofReference(replayProofKeys(server),1),prior:null} as any;
 let prior:any=null;
 if(recovery){
  attachment.prior={worker:copy(attachment.worker),decisionId:proofId(),ticketId:proofId(),requestId:proofId(),enrollmentGeneration:1};
  changeProof(worker,'revoke',f.iso(-30000));
  changeProof(worker,'stage',f.iso(-20000),{targetEpoch:2,material:publicMaterials[1],generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash('b')},activatesAt:f.iso(-19000),cutoverAt:f.iso(-10000)});
  changeProof(worker,'cutover',f.iso(-10000));attachment.worker=proofReference(replayProofKeys(worker),2);
  attachment.purpose=f.intent.purpose=f.snapshot.purpose='owner_recovery';attachment.enrollmentGeneration=2;
  f.intent.baseline={enrollmentGeneration:1,credentialHighWater:1,credential:{id:proofId(),epoch:1,version:1,fingerprint:hash('5')}};f.intent.target.epoch=2;
  f.intent.prior={ticketId:attachment.prior.ticketId,ticketDigest:hash('6'),attemptId:proofId(),generation:1,credentialEpoch:1,historyDigest:hash('7'),state:'revoked',workspaceId:binding.workspaceId,hostId:binding.hostId};
  prior={...attachment.prior,credentialId:f.intent.baseline.credential.id,credentialEpoch:1,credentialRevoked:true,terminal:true,predecessor:copy(f.intent.prior)};delete prior.worker;
 }
 f.intent.schemaVersion='worker-bootstrap-admission-v3';f.intent.proofAuthority=copy(attachment);
 f.snapshot.recordDigest=channelSnapshotDigest(f.snapshot);
 const authority=v3Authority.parse({version:'bootstrap-proof-issuance-authority-v3',at,fence:'50',writerXid:'1',authorityRevision:'8',authorityDigest:hash('8'),sourceDigest:hash('9'),
  attachmentId:proofId(),attachmentDigest:proofDigest(attachment),attachment,workerHistory:worker,serverHistory:server,reservedPublicKeyDigests:[issuerMaterial.publicKeyDigest],
  owner:{id:attachment.ownerId,decisionId:attachment.decisionId,decisionRevision:1,acceptedAt:f.iso(-2000),authenticatedAt:f.iso(-3000),expiresAt:f.intent.expiresAt,intentDigest:proofDigest(f.intent)},
  lifecycle:{installationLifecycleId:proofId(),hostLifecycleId:proofId(),...generation,hostEnabled:true,installationEnabled:true},
  issuer:{protocol:'worker-bootstrap-owner-ticket-v3',workspaceId:binding.workspaceId,installationId:binding.installationId,material:issuerMaterial,epoch:1,
   revision:1,historyDigest:f.snapshot.issuerHistoryDigest,authorizationDigest:hash('b'),validFrom:f.iso(-60000),expiresAt:f.iso(120000)},
  intent:f.intent,channel:{acceptanceId:proofId(),snapshot:f.snapshot,previousRevision:0,previousDigest:null,previousHighWater:0,previousRevoked:true,unusedGeneration:true,unusedPin:true},prior});
 const command:V3Command={version:'bootstrap-proof-issue-command-v3',operationId:proofId(),attachmentId:authority.attachmentId,expected:v3AuthorityVersion(authority)};
 validateV3Authority(command,authority);return {authority,command};
}

type Row={operationId:string;phase:V3Phase;name:string;data:unknown;writerXid:string;fence:number};
type Operation={plan:V3Plan;receipt:V3Receipt};
type State={fence:number;rows:Row[];operations:Operation[]};
type Tx={id:number;mode:'read'|'write';state:State;fromFence:number;phases:V3Phase[];locked:boolean};
// A transactional PUBLIC-graph model, not a SQL oracle or native persistence
// adapter. Its ideal own-delta projection is an obligation for the next atom.
function phaseGraph(p:V3Plan,phase:V3Phase){
 const e=p.envelope,c=e.signed.payload.context;
 switch(phase){
  case 'reservation':return [['reservation',{attachmentId:p.command.attachmentId,planDigest:proofDigest(p)}]];
  case 'ticket':return [['ticket',e],['issue',{id:c.issueEventId,ticketId:p.link.ticketId,state:'issued'}]];
  case 'channel':return [['channel-generation',c.channel.snapshot],['channel-grant',{id:c.channelGrantId,ticketDigest:p.link.ticketEnvelopeDigest,channel:c.channel}],['channel-history',{id:c.channelHistoryId,grantId:c.channelGrantId}]];
  case 'attempt':return [['attempt',{id:c.attemptId,ticketId:p.link.ticketId,requestId:e.signed.payload.intent.requestId}],['attempt-history',{id:c.attemptHistoryId,attemptId:c.attemptId}],['head',{attemptId:c.attemptId,historyId:c.attemptHistoryId}],['consume',{id:c.consumeEventId,attemptId:c.attemptId,ticketId:p.link.ticketId}]];
  case 'link':return [['link',{id:c.linkId,...p.link}]];
  case 'seal':return [['seal',p.seal],['audit',{planDigest:proofDigest(p),linkId:c.linkId}],['event',{id:c.receiptEventId,sealDigest:v3SealDigest(p.seal)}]];
 }
}

export function v3IssuanceFixture(recovery=false){
 const f=v3AuthorityFixture(recovery),source=copy(f.authority);
 let committed:State={fence:Number(source.fence),rows:[],operations:[]},tail=Promise.resolve(),serial=0,sourceEpoch=0;
 const transactions=new Map<Db,Tx>(),calls:{db:number;mode:string;kind:string}[]=[],stats={issuer:0,sealer:0,writes:0,readbacks:0};
 const hooks:{fault?:string;phase?:(phase:V3Phase,state:State)=>void;issuer?:()=>void;sealer?:()=>void;authority?:(value:V3Authority,tx:Tx)=>void;receipt?:(value:Operation)=>void}={};
 const tx=(db:Db)=>{const t=transactions.get(db);assert.ok(t);return t;};
 const call=(db:Db,kind:string)=>{const t=tx(db);calls.push({db:t.id,mode:t.mode,kind});return t;};
 function graph(t:Tx,p:V3Plan){
  const rows=t.state.rows.filter(r=>r.operationId===p.command.operationId);
  const expected=v3WritePhases.flatMap(phase=>phaseGraph(p,phase).map(([name,data])=>({phase,name,data})));
  assert.deepEqual(rows.map(({phase,name,data})=>({phase,name,data})),expected);
  rows.forEach((r,n)=>{assert.equal(r.writerXid,p.authority.writerXid);assert.equal(r.fence,Number(p.authority.fence)+n+1);});return proofDigest(rows);
 }
 const deps:V3IssuanceDependencies={
  ports:{qualification:'source_only_proof_issuance_ports_v3',
   async transaction(mode,work){
    let release=()=>{};
    if(mode==='write'){const previous=tail;tail=new Promise<void>(r=>{release=r;});await previous;}
    const db={} as Db,t:Tx={id:++serial,mode,state:copy(committed),fromFence:committed.fence,phases:[],locked:false};transactions.set(db,t);
    try{
     const result=await work(db);
     if(mode==='write'){
      for(const p of t.state.operations)graph(t,p.plan);
      if(hooks.fault==='commit')throw Error('deferred COMMIT failed');
      if(hooks.fault!=='false-commit')committed=copy(t.state);
      if(hooks.fault==='lost-ack')throw Error('COMMIT acknowledgement lost');
     }
     if(mode==='read'&&t.state.operations.length){stats.readbacks++;if(hooks.fault==='readback')throw Error('readback unavailable');}
     return hooks.fault==='false-return'?copy(result):result;
    }finally{transactions.delete(db);release();}
   },
   async bound(db,lock){const t=call(db,'bound');if(lock){assert.equal(t.mode,'write');t.locked=true;}
    return {mode:t.mode,isolation:t.mode==='write'?'serializable':'repeatable read',readOnly:t.mode==='read',origin:true,schemaSafe:true,
     fence:String(t.state.fence),writerXid:String(t.id),locked:t.locked};},
   async guards(db){call(db,'guards');if(hooks.fault==='guards')throw Error('guard unavailable');},
   async readOperation(db,command){const t=call(db,'operation'),matches=t.state.operations.filter(p=>p.plan.command.operationId===command.operationId);
    if(matches.length>1)throw Error('ambiguous');if(!matches.length)return null;
    assert.equal(matches[0].receipt.rowsDigest,graph(t,matches[0].plan));
    assert.equal(matches[0].receipt.toFence,String(t.state.rows.filter(r=>r.operationId===command.operationId).at(-1)!.fence));
    const value=copy(matches[0]);hooks.receipt?.(value);return value;},
   async appendPhase(db,phase,plan){const t=call(db,phase);assert.equal(t.mode,'write');assert.equal(t.locked,true);assert.equal(phase,v3WritePhases[t.phases.length]);
    if(phase==='reservation'&&t.state.operations.some(p=>p.plan.command.attachmentId===plan.command.attachmentId))throw Error('attachment already used');
    for(const [name,data] of phaseGraph(plan,phase)){t.state.fence++;t.state.rows.push({operationId:plan.command.operationId,phase,name:name as string,data:copy(data),writerXid:String(t.id),fence:t.state.fence});stats.writes++;}
    t.phases.push(phase);hooks.phase?.(phase,t.state);if(hooks.fault===phase)throw Error('phase failure');
    if(phase==='seal'){
     const receipt:V3Receipt={version:'bootstrap-proof-issuance-receipt-v3',domain:v3Domains.receipt,operationId:plan.command.operationId,attachmentId:plan.command.attachmentId,
      ticketId:plan.link.ticketId,attemptId:plan.link.attemptId,planDigest:proofDigest(plan),envelopeDigest:v3EnvelopeDigest(plan.envelope),sealDigest:v3SealDigest(plan.seal),
      sourceDigest:plan.authority.sourceDigest,authorityRevision:plan.authority.authorityRevision,authorityDigest:plan.authority.authorityDigest,writerXid:String(t.id),fromFence:plan.authority.fence,
      toFence:String(t.state.fence),rowsDigest:graph(t,plan),eventId:plan.envelope.signed.payload.context.receiptEventId};
     t.state.operations.push({plan:copy(plan),receipt});
    }
   },
   async checkImmediate(db){const t=call(db,'immediate');assert.deepEqual(t.phases,v3WritePhases);if(hooks.fault==='immediate')throw Error('constraint failure');}
  },
  authority:{qualification:'injected_canonical_proof_issuance_authority_v3',async read(db,attachmentId,operationId){
   const t=call(db,'authority');assert.equal(attachmentId,source.attachmentId);
   const own=t.state.rows.filter(r=>r.operationId===operationId);
   // Ideal model rule: only native same-writer exact contiguous own deltas can
   // be projected out. A real canonical implementation does not exist yet.
   if(t.mode==='write'&&operationId){assert.equal(t.state.fence,t.fromFence+own.length);own.forEach((r,n)=>{assert.equal(r.writerXid,String(t.id));assert.equal(r.fence,t.fromFence+n+1);});}
   const value=copy(source);value.fence=String(t.state.fence);value.writerXid=String(t.id);
   if(sourceEpoch){value.authorityRevision=String(Number(value.authorityRevision)+sourceEpoch);value.sourceDigest=proofDigest({sourceEpoch});}
   hooks.authority?.(value,t);return value;
  }},
  issuer:{qualification:'injected_owner_ticket_issuer_v3',async issue(db,request){call(db,'issue');stats.issuer++;assert.ok(Object.isFrozen(request.payload.context));hooks.issuer?.();
   return {version:'worker-bootstrap-owner-envelope-v3',domain:v3Domains.envelope,signed:{payload:copy(request.payload),signature:'0'.repeat(128)},decision:{payload:copy(request.decision),signature:'1'.repeat(128)}};},
   async verify(db){call(db,'issuer-verify');return hooks.fault!=='issuer';}},
  sealer:{qualification:'injected_roost_binding_sealer_v3',async seal(db,request){call(db,'seal-prepare');stats.sealer++;assert.ok(Object.isFrozen(request.payload.linkBinding));hooks.sealer?.();return {payload:copy(request.payload),signature:'2'.repeat(128)};},
   async verify(db){call(db,'sealer-verify');return hooks.fault!=='sealer';}}
 };
 return {...f,source,deps,api:createBootstrapProofV3Issuance(deps),hooks,calls,stats,state:()=>copy(committed),tamper:(fn:(s:State)=>void)=>fn(committed),
  changeSource:()=>{sourceEpoch++;committed.fence++;}};
}
