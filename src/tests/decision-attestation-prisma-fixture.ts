import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {attestationPersistenceFixture} from './decision-attestation-fixture';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {attestationDigest as digest,nextAttestationKeyEvent} from '../modules/api-keys/decision-attestation-key-model';
import {ticketEnvelopeDigest,ticketChannelPlanDigest} from '../modules/api-keys/bootstrap-ticket-v2-digests';
import {lifecycleRegistration,advanceTicketLifecycle} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {channelSnapshotDigest} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {decisionAttestationGuards,decisionAttestationHelpers} from '../modules/api-keys/decision-attestation-adapter';
import {createPrismaDecisionAttestationPorts,type NativeAttestationDependencies} from '../modules/api-keys/decision-attestation-prisma-ports';
import {AttestationCommitUnknown} from '../modules/api-keys/decision-attestation-persistence-model';
import {lineageOracle,type EpochProof} from './decision-attestation-lineage-oracle';
import {advanceLifecycle} from '../modules/api-keys/worker-identity-lifecycle';
import {issuerGuards} from '../modules/api-keys/bootstrap-issuer-guards';
const clone=<T>(v:T):T=>structuredClone(v);
type Row=Record<string,any>;type ObjectRow={table:string;rowId:string;row:Row;digest:string;receiptId:string;eventId:string;fence:string;writerXid:string;verified:boolean};
export function nativeAttestationFixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment',cutoverAfter?:number){
 const f=bootstrapChannelFixture(purpose),keyFixture=attestationPersistenceFixture(),b=f.snapshot.binding;
 // RFC public point only. This fixture never constructs a private key or signs.
 const bytes=Buffer.from('302a300506032b6570032100d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex');
 const issuerMaterial={keyId:b.ticketKeyId,algorithm:'Ed25519',format:'spki-der-base64',spki:bytes.toString('base64'),publicKeyDigest:createHash('sha256').update(bytes).digest('hex')};
 b.ticketPublicKeyDigest=issuerMaterial.publicKeyDigest;f.ticket.intent.binding=clone(b);
 const t=clone(f.ticket),snapshot=clone(f.snapshot);
 const issuer={id:randomUUID(),revision:1,previousId:null,decisionId:randomUUID(),decisionRevision:1,ownerId:t.ownerId,at:f.iso(-3000),
  intent:{schemaVersion:'bootstrap-issuer-v1',binding:{workspaceId:b.workspaceId,issuerId:b.workspaceId,installationId:b.installationId,purpose:'worker-bootstrap-owner-ticket-v1'},
   action:'create',expectedRevision:0,targetEpoch:1,material:issuerMaterial,activatesAt:null,cutoverAt:null,adoptionEvidenceDigest:null,expiresAt:f.iso(240000)}};
 snapshot.issuerHistoryDigest=reviewDigest(issuer);
 const lifecycle:any[]=[];
 for(const kind of ['installation','host'] as const){const intent={schemaVersion:'worker-identity-lifecycle-v1',workspaceId:b.workspaceId,kind,
  subjectId:kind==='host'?b.hostId:b.installationId,action:'adopt',expected:null,generation:kind==='host'?snapshot.hostGeneration:snapshot.installationGeneration,
  installationId:b.installationId,installationGeneration:snapshot.installationGeneration,hostFingerprint:kind==='host'?b.hostFingerprint:null,
  authorityDigest:'b'.repeat(64),adoptionEvidenceDigest:'c'.repeat(64),expiresAt:f.iso(240000)};
  lifecycle.push(advanceLifecycle(intent,[],{ownerId:t.ownerId,decisionId:randomUUID(),decisionRevision:1,intent,current:true,anchorFresh:false,hostEnabled:true,
   writerFenced:true,installation:lifecycle[0]??null},randomUUID(),f.now()));}
 let at=f.iso().replace('Z','123Z'),fence=10,xid=1,tail=Promise.resolve(),fault='',reads=0,writes=0,signatures=0,callbacks=0,verified=true,origin=true;
 const calls:{sql:string;values:unknown[];db:object;mode:string}[]=[],guards:any[]=decisionAttestationGuards.map(g=>({...g,enabled:true})),helpers:any[]=decisionAttestationHelpers.map(h=>({...h,enabled:true}));
 snapshot.expiresAt=f.iso(60000);if(cutoverAfter!==undefined)snapshot.cutoverAt=f.iso(cutoverAfter);snapshot.recordDigest=channelSnapshotDigest(snapshot);
 const identity:any={version:'bootstrap-ticket-revocation-proposal-v1',ticketId:t.id,ticketDigest:'0'.repeat(64),ownerId:t.ownerId,decisionId:t.decisionId,decisionRevision:1,
  purpose,binding:b,generation:purpose==='first_enrollment'?1:2,credentialEpoch:purpose==='first_enrollment'?1:2,issuedAt:f.iso(-1000),notBefore:f.iso(-500),expiresAt:f.iso(60000),hostGeneration:snapshot.hostGeneration,
  installationGeneration:snapshot.installationGeneration,issuerRevision:1,issuerHistoryDigest:snapshot.issuerHistoryDigest,channelGeneration:snapshot.generation,channelRevision:snapshot.revision,
  channelDigest:ticketChannelPlanDigest(snapshot),predecessor:purpose==='first_enrollment'?null:{ticketId:randomUUID(),ticketDigest:'6'.repeat(64),attemptId:t.intent.prior.attemptId,
   generation:1,credentialEpoch:1,historyDigest:'7'.repeat(64),state:'revoked',workspaceId:b.workspaceId,hostId:b.hostId}};
 const {ticketDigest,...metadata}=identity;
 t.version='worker-bootstrap-owner-ticket-v2';t.intent.schemaVersion='worker-bootstrap-admission-v2';t.intent.prior=identity.predecessor;t.intent.expiresAt=identity.expiresAt;t.issuedAt=identity.issuedAt;t.lifecycle=metadata;t.decisionIntentDigest=reviewDigest(t.intent);
 const signed={payload:t,signature:'0'.repeat(128)};identity.ticketDigest=ticketEnvelopeDigest(signed);
 const record={signed,decision:{payload:{id:t.decisionId,revision:1,ownerId:t.ownerId,authority:'owner_reserved',state:'accepted',intentDigest:t.decisionIntentDigest,acceptedAt:f.iso(-2000),expiresAt:identity.expiresAt},signature:'0'.repeat(128)}};
 lifecycleRegistration.parse({operationId:t.id,identity,record});
 const q={decisionId:t.decisionId,ticketId:t.id},acceptanceId=randomUUID(),previewId=randomUUID(),impact={version:1,scope:'synthetic-public-fixture'};
 const policy={version:'owner-decision-attestation-policy-v1',revision:7,evidenceDigest:reviewDigest(impact),validFrom:identity.notBefore,expiresAt:identity.expiresAt};
 const body={workerBootstrap:t.intent,workerBootstrapLifecycle:metadata,ownerDecisionAttestation:policy};
 let objects:ObjectRow[]=[],operations=new Map<string,any>(),epochProofs:EpochProof[]=[];let faultHits=0;
 function put(table:string,row:Row){const rowId=String(row.id??row.decision_id??row.workspace_id)+(row.host_id?':'+row.host_id:'');
  const obj={table,rowId,row:clone(row),digest:reviewDigest(row),receiptId:randomUUID(),eventId:randomUUID(),fence:String(++fence),writerXid:String(xid),verified:true};
  epochProofs.push({epoch:fence,id:obj.receiptId,ledger:'attestation',table,row:rowId,scope:q.ticketId,
   phase:table==='decision_attestation_key_history'?'key':table==='decision_owner_auth_evidence'?'auth':table==='decision_attestations'?'attest':table==='decision_authority_events'?'authority':'start',
   writer:String(xid),digest:obj.digest,actualDigest:obj.digest,event:true});
  const index=objects.findIndex(o=>o.table===table&&o.rowId===rowId);if(index>=0)objects[index]=obj;else objects.push(obj);return obj;}
 function event(action:string,source:ObjectRow,mutation:string|null=null,id=randomUUID()){
  const last=objects.filter(o=>o.table==='decision_authority_events').at(-1)?.row;
  const row:Row={id,workspace_id:b.workspaceId,decision_id:t.decisionId,revision:(last?.revision??0)+1,action,source_table:source.table,source_row:source.rowId,source_digest:source.digest,
   previous_digest:last?.record_digest??null,fence_revision:fence+1,writer_xid:String(xid),at,mutation_digest:mutation};row.record_digest=digest('owner-decision-authority-event-v1',row);
  return put('decision_authority_events',row);
 }
 const root=put('decisions',{id:t.decisionId,workspace_id:b.workspaceId,authority_revision:1,source:'roost_decision',status:'accepted'});
 event('create',root);put('decision_revisions',{decision_id:t.decisionId,workspace_id:b.workspaceId,version:1,body});
 put('decision_acceptances',{id:acceptanceId,decision_id:t.decisionId,workspace_id:b.workspaceId,actor_user_id:t.ownerId,actor_agent_id:null,actor_credential_id:null,
  authority:{status:'owner_reserved'},created_at:record.decision.payload.acceptedAt,preview_id:previewId});
 put('decision_impact_previews',{id:previewId,decision_id:t.decisionId,workspace_id:b.workspaceId,impact});
 put('workspaces',{id:b.workspaceId,owner_user_id:t.ownerId});put('workspace_memberships',{id:randomUUID(),workspace_id:b.workspaceId,user_id:t.ownerId,role:'owner'});
 put('worker_bootstrap_tickets',{id:t.id,decision_id:t.decisionId,workspace_id:b.workspaceId,host_id:b.hostId,record,lifecycle_identity:identity,ticket_digest:identity.ticketDigest});
 const grant={id:randomUUID(),intent:{schemaVersion:'worker-bootstrap-channel-v1',ticketId:t.id,ticketDigest:identity.ticketDigest,expectedRevision:snapshot.revision-1,snapshot},
  ownerId:t.ownerId,decisionId:randomUUID(),decisionRevision:1,acceptanceId:randomUUID(),at:f.iso(-1000)};
 put('worker_transport_bootstrap_grants',{id:grant.id,record:grant,record_digest:reviewDigest(grant)});
 const issue=advanceTicketLifecycle(identity,null,null,{id:randomUUID(),action:'issue',attemptId:null,historyId:null},new Date(f.iso(-1000)));
 put('worker_bootstrap_lifecycle_events',{id:issue.id,ticket_id:t.id,revision:1,record:issue,record_digest:reviewDigest(issue),writer_xid:String(xid)});
 const auth={version:'roost-owner-auth-evidence-v1',workspaceId:b.workspaceId,ownerId:t.ownerId,acceptanceId,level:'roost_session',authTime:f.iso(-2500),acceptedAt:f.iso(-2000),sessionEvidenceDigest:'a'.repeat(64),policyRevision:7};
 const material={...keyFixture.first,provenance:{...keyFixture.first.provenance,installationId:b.installationId},validFrom:f.iso(-5000),expiresAt:f.iso(240000)};
 const first=nextAttestationKeyEvent([],{workspaceId:b.workspaceId,installationId:b.installationId},{id:randomUUID(),action:'create',keyId:material.keyId,material,overlapStartsAt:null,cutoverAt:null},new Date(f.iso(-1000)));
 put('decision_attestation_key_history',{id:first.id,workspace_id:b.workspaceId,installation_id:b.installationId,key_id:first.keyId,revision:1,epoch:1,action:'create',record:first,
  record_digest:digest('owner-decision-key-event-v1',first),writer_xid:String(xid),mutation_digest:'1'.repeat(64)});
 const ar=put('decision_owner_auth_evidence',{id:randomUUID(),decision_id:t.decisionId,acceptance_id:acceptanceId,workspace_id:b.workspaceId,record:auth,
  record_digest:digest('owner-decision-auth-evidence-v1',auth),writer_xid:String(xid),mutation_digest:'2'.repeat(64)});event('source_change',ar);
 const revision=()=>String(objects.filter(o=>o.table==='decision_authority_events').length);
 const deps:NativeAttestationDependencies={transaction:async(mode,work)=>{
  // Serializes writes. Reads deliberately expose injected changes so source
  // fence checks are exercised; this is not a native MVCC concurrency proof.
  let release=()=>{};if(mode==='write'){const wait=tail;tail=new Promise<void>(r=>release=r);await wait;}
  const saved=clone(objects),oldFence=fence,oldOps=new Map(operations),oldProofs=clone(epochProofs);let returned:any;
  const transactionXid=++xid;
  const db:any={$queryRaw:async(strings:any,...args:any[])=>{
   const sql=(Array.isArray(strings)?strings.join('?'):strings.sql).replace(/\s+/g,' ').trim(),v=Array.isArray(strings)?args:strings.values;calls.push({sql,values:clone(v),db,mode});
   if(sql.includes('decision_attestation_available'))return [{decision_attestation_available:true}];
   if(sql.includes("to_regclass('public.bootstrap_issuer_history')"))return [{available:fault!=='issuer'}];
   if(sql.includes('FROM pg_trigger'))return v[0]?.[0]===issuerGuards[0].name?issuerGuards.map(g=>({...g,enabled:true})):clone(guards);if(sql.includes('FROM pg_proc'))return clone(helpers);
   if(sql.includes('worker_identity_lifecycle_guarded()'))return [{guarded:fault!=='lifecycle'}];
   if(sql.includes('FROM worker_identity_lifecycle l'))return lifecycle.filter(r=>r.intent.kind===v[1]).map(record=>({record:clone(record),verified:true}));
   if(sql.includes('FROM trusted_provider_ticket_keys'))return [{workspaceId:b.workspaceId,installationId:b.installationId,keyId:b.ticketKeyId,epoch:b.ticketKeyEpoch,publicKeyDigest:b.ticketPublicKeyDigest}];
   if(sql.includes('FROM bootstrap_issuer_history h'))return [{record:clone(issuer),fence:'2',verified:true}];
   if(sql.includes('FROM bootstrap_issuer_history WHERE'))return [{revision:1,digest:reviewDigest(issuer)}];
   if(sql.includes('lifecycle_identity AS identity'))return [{id:q.ticketId,identity:clone(identity)}];
   if(sql.includes('FROM worker_bootstrap_tickets t JOIN LATERAL')){const p=identity.predecessor;
    return p?[{digest:p.ticketDigest,history:p.historyDigest,attempt:p.attemptId,state:p.state,generation:p.generation,credential:p.credentialEpoch}]:[];}
   if(sql.includes('AS revision,current_setting'))return [{revision:String(fence),isolation:mode==='read'?'repeatable read':'serializable',readonly:mode==='read'?'on':'off'}];
   if(sql.includes('transaction_isolation')&&sql.includes('to_char(clock_timestamp()'))return [{fence:String(fence),isolation:mode==='read'?'repeatable read':'serializable',readOnly:mode==='read'?'on':'off',origin:origin?'origin':'replica',timezone:'UTC',at}];
   if(sql.endsWith('FROM ready_source_fence WHERE id=1 FOR UPDATE')){assert.equal(mode,'write');return [{fence:String(fence)}];}
   if(sql.includes('AS "sealLineage"')){
    const a=objects.find(o=>o.table==='decision_attestations'),h=objects.filter(o=>o.table==='decision_authority_events').at(-1),anchor=objects.find(o=>o.table==='worker_bootstrap_lifecycle_events');
    return [{sealLineage:!!a&&!!h&&!!anchor&&lineageOracle({anchor:Number(anchor.fence),attest:Number(a.fence),tail:Number(h.fence),through:fence,
     scope:q.ticketId,writer:String(transactionXid),optedIn:true,current:true,proofs:epochProofs})}];
   }
   if(sql.includes('operationCount')){
    if(mode==='read'){reads++;if(fault==='readback')throw Error('readback unavailable');}
    const operationId=v.find((value:any)=>operations.has(value));const op=operationId?clone(operations.get(operationId)):undefined;
    if(!op||mode==='read'&&fault==='missing')return [];
    if(mode==='read'&&fault==='mismatch')op.mutationDigest='f'.repeat(64);
    if(mode==='read'&&fault==='incomplete')op.complete=false;
    if(mode==='read'&&fault==='event')op.receipts[0].verified=false;
    return [op];
   }
   if(sql.includes('FROM objects o CROSS JOIN ready_source_fence'))return clone(objects).sort((a,b)=>(a.table+':'+a.rowId).localeCompare(b.table+':'+b.rowId)).map(o=>({...o,verified:o.verified&&verified}));
   if(sql.includes('decision_attestation_revision('))return [{revision:revision(),grant:fault!=='grant',owner:true,current:fault!=='current',history:fault!=='history',generation:fault!=='generation',
    policyCurrent:fault!=='policy',currentKeys:fault==='key'?[]:objects.filter(o=>o.table==='decision_attestation_key_history'&&o.row.record.material).map(o=>o.row.id)}];
   throw Error('unexpected SELECT '+sql.slice(0,100));
  },$executeRaw:async(strings:TemplateStringsArray,...v:any[])=>{
   const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push({sql,values:clone(v),db,mode});assert.equal(mode,'write');writes++;xid=transactionXid;
   let obj:ObjectRow|undefined,operationId:string|undefined,mutation:string|undefined;
   if(sql.startsWith('INSERT INTO decision_attestations')){const rec=JSON.parse(v[7]);operationId=v[0];mutation=v[8];
    assert.equal(objects.some(o=>o.table==='decision_attestations'),false);
    obj=put('decision_attestations',{id:v[0],decision_id:v[1],acceptance_id:v[2],auth_evidence_id:v[3],workspace_id:v[4],key_event_id:v[5],authority_revision:v[6],record:rec,
     record_digest:digest('owner-decision-attestation-envelope-v1',rec),writer_xid:String(xid),mutation_digest:mutation});event('attest',obj);
   }else if(sql.startsWith('INSERT INTO decision_owner_auth_evidence')){operationId=v[0];mutation=v[5];const rec=JSON.parse(v[4]);
    obj=put('decision_owner_auth_evidence',{id:v[0],decision_id:v[1],acceptance_id:v[2],workspace_id:v[3],record:rec,record_digest:digest('owner-decision-auth-evidence-v1',rec),writer_xid:String(xid),mutation_digest:mutation});event('source_change',obj);
   }else if(sql.startsWith('INSERT INTO decision_attestation_key_history')){operationId=v[0];mutation=v[8];const rec=JSON.parse(v[7]);
    obj=put('decision_attestation_key_history',{id:v[0],workspace_id:v[1],installation_id:v[2],key_id:v[3],revision:v[4],epoch:v[5],action:v[6],record:rec,
     record_digest:digest('owner-decision-key-event-v1',rec),writer_xid:String(xid),mutation_digest:mutation});
   }else if(sql.startsWith('INSERT INTO decision_authority_events')){operationId=v[0];mutation=v[6];obj=event(v[3],objects.find(o=>o.table==='decisions')!,mutation,v[0]);
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_attempts')){operationId=v[0];mutation=v[12];const seal=JSON.parse(v[11]);seal.sourceFence=String(fence+1);
    assert.equal(objects.some(o=>o.table==='worker_bootstrap_attempts'),false);
    obj=put('worker_bootstrap_attempts',{id:v[0],ticket_id:v[1],workspace_id:v[2],host_id:v[3],generation:v[4],credential_epoch:v[5],predecessor_id:v[6],record:JSON.parse(v[7]),
     record_digest:v[8],lifecycle_version:v[9],attestation_id:v[10],attestation_seal:seal,attestation_committed_at:at,attestation_mutation_digest:mutation});
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_history')){const rec=JSON.parse(v[2]);obj=put('worker_bootstrap_history',{id:v[0],attempt_id:v[1],revision:1,state:'consumed',record:rec,record_digest:v[3]});
    put('worker_bootstrap_audit',{id:randomUUID(),ticket_id:t.id,history_id:v[0],record_digest:v[3],event_id:randomUUID()});
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_heads')){obj=put('worker_bootstrap_heads',{workspace_id:v[0],host_id:v[1],attempt_id:v[2],history_id:v[3],generation:v[4],credential_epoch:v[5],revision:1,record_digest:v[6],state:'consumed'});
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events')){const rec=JSON.parse(v[4]);obj=put('worker_bootstrap_lifecycle_events',{id:v[0],ticket_id:v[1],revision:v[2],previous_digest:v[3],record:rec,record_digest:v[5],attempt_id:v[6],history_id:v[7],writer_xid:String(xid)});
   }else throw Error('unexpected write '+sql);
   if(operationId)operations.set(operationId,{operationTable:obj!.table,operationRow:clone(obj!.row),operationCount:1,complete:true,mutationDigest:mutation,writerXid:String(xid)});
   // Trigger-produced rows/Events/receipts and DB fence are deliberately different
   // from a predicted +1 fence. No receipt is inserted by the port.
   for(const op of operations.values())if(op.writerXid===String(xid)){
    op.receipts=objects.filter(o=>o.writerXid===String(xid)).map(o=>({table:o.table,rowId:o.rowId,digest:o.digest,fence:o.fence,receiptId:o.receiptId,eventId:o.eventId,writerXid:o.writerXid,verified:o.verified}));
    op.authorityRevision=revision();op.fence=String(fence);op.recordedAt=at;
   }
   if(fault==='write:'+writes||fault==='table:'+obj?.table||fault==='receipt'){faultHits++;throw Error('synthetic rollback');}return 1;
  }};
  try{callbacks++;returned=await work(db);
   if(mode==='write'&&fault==='retry'){await work({} as any);}
   if(mode==='write'&&fault==='false'){objects=saved;fence=oldFence;operations=oldOps;epochProofs=oldProofs;return returned;}
   if(mode==='write'&&fault==='lost')throw new AttestationCommitUnknown();
   if(mode==='write'&&fault==='precommit')throw Error('lost acknowledgement');return returned;
  }catch(e){if(mode==='write'&&!(e instanceof AttestationCommitUnknown)){objects=saved;fence=oldFence;operations=oldOps;epochProofs=oldProofs;}throw e;}finally{release();}
 },ownerAuthentication:async()=>clone(auth),authorizePublicKey:async()=>true,
 signer:{keyId:material.keyId,sign:async()=>{signatures++;return 'a'.repeat(128);}},verifier:{verify:async()=>fault!=='signature'},ticketVerifier:{verify:async()=>fault!=='ticket'}};
 const ports=createPrismaDecisionAttestationPorts(deps);
 async function projection(){return deps.transaction('read',async db=>{await ports.bind(db,'read');return ports.projectCanonical(db,q);});}
 async function command(kind:string,extra:Row={}){return {...q,operationId:randomUUID(),expected:(await projection()).version,kind,...extra};}
 return {...f,q,b,ports,deps,material,auth,lifecycle,issuer,objects:()=>objects,calls,guards,helpers,projection,command,
  execute:async(kind:string,extra:Row={})=>ports.execute(await command(kind,extra)),
  fault:(v:string)=>fault=v,origin:(v:boolean)=>origin=v,verified:(v:boolean)=>verified=v,at:(v:string)=>at=v,
  remove:(table:string)=>{objects=objects.filter(o=>o.table!==table);},
  stats:()=>({reads,writes,signatures,callbacks,faultHits}),state:()=>clone({objects,fence,epochProofs}),operations:()=>operations,
  lineageProofs:()=>epochProofs,drift:()=>{fence++;},revise:()=>{const r=clone(objects.find(o=>o.table==='decision_revisions')!.row);r.version++;
   event('source_change',put('decision_revisions',r));}};
}
