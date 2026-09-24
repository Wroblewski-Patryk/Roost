import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {createPrismaTicketLifecycleStore,TicketLifecycleUnknown,type TicketV2Dependencies} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {createTicketRevocationReadProtocol,type TicketRevocationVerifier} from '../modules/api-keys/bootstrap-ticket-revocation-reader';
import {createTicketLifecycleProtocol} from '../modules/api-keys/bootstrap-ticket-lifecycle-model';
import {lifecycleRegistration,lifecycleFlags,lifecycleIdentity} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {ticketGuards,ticketOwnGuards,ticketHelpers,ticketChannelHelper} from '../modules/api-keys/bootstrap-ticket-lifecycle-guards';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {ticketEnvelopeDigest,ticketChannelPlanDigest,ticketContentDigest,ticketV2Domains} from '../modules/api-keys/bootstrap-ticket-v2-digests';
import {createBootstrapV2ChannelBinding,createPrismaBootstrapChannelStore} from '../modules/api-keys/bootstrap-channel-store';
import {channelGuards,channelShapeHash} from '../modules/api-keys/bootstrap-channel-guards';
import {issuerGuards} from '../modules/api-keys/bootstrap-issuer-guards';
import {advanceIssuer} from '../modules/api-keys/bootstrap-issuer-contract';
import {advanceLifecycle} from '../modules/api-keys/worker-identity-lifecycle';
import {channelSnapshotDigest} from '../modules/api-keys/bootstrap-channel-persistence-contract';
const copy=<T>(v:T):T=>structuredClone(v),hash=(s:string)=>s.repeat(64),migration='prisma/migrations/20260924010000_bootstrap_ticket_lifecycle/migration.sql';
function fixture(atomicBinding=false,integrated=false){
 const f=bootstrapChannelFixture();let now=f.now().getTime(),tail=Promise.resolve(),fault='',current=true,available=true,verified=true,origin=true,writes=0,transactions=0;
 let transactionId=0,activeTransaction=0,signatureValid=true;const verifications:any[]=[],plans=new Map<string,any>(),decisions=new Map<string,any>(),lifecycle:any[]=[];
 const b=f.snapshot.binding,der=Buffer.from('302a300506032b6570032100d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex');
 if(integrated)b.ticketPublicKeyDigest=createHash('sha256').update(der).digest('hex');
 const key={workspaceId:b.workspaceId,installationId:b.installationId,keyId:b.ticketKeyId,epoch:1,publicKeyDigest:b.ticketPublicKeyDigest};
 const issuerIntent={schemaVersion:'bootstrap-issuer-v1' as const,binding:{workspaceId:b.workspaceId,issuerId:b.workspaceId,installationId:b.installationId,purpose:'worker-bootstrap-owner-ticket-v1' as const},
  action:'adopt' as const,expectedRevision:0,targetEpoch:1,material:{keyId:b.ticketKeyId,algorithm:'Ed25519' as const,format:'spki-der-base64' as const,spki:der.toString('base64'),publicKeyDigest:b.ticketPublicKeyDigest},
  activatesAt:null,cutoverAt:null,adoptionEvidenceDigest:hash('a'),expiresAt:f.iso(60000)};
 const issuer=integrated?advanceIssuer(issuerIntent,[],{ownerId:f.ticket.ownerId,decisionId:randomUUID(),decisionRevision:1,intent:issuerIntent,current:true,fresh:false,head:key},randomUUID(),new Date(f.iso(-10000))):null;
 if(integrated)for(const kind of ['installation','host'] as const){const i={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId:b.workspaceId,kind,subjectId:kind==='host'?b.hostId:b.installationId,
  action:'adopt' as const,expected:null,generation:kind==='host'?f.snapshot.hostGeneration:f.snapshot.installationGeneration,installationId:b.installationId,installationGeneration:f.snapshot.installationGeneration,
  hostFingerprint:kind==='host'?b.hostFingerprint:null,authorityDigest:hash('a'),adoptionEvidenceDigest:hash('b'),expiresAt:f.iso(60000)};
  lifecycle.push(advanceLifecycle(i,[],{ownerId:f.ticket.ownerId,decisionId:randomUUID(),decisionRevision:1,intent:i,current:true,anchorFresh:false,hostEnabled:true,writerFenced:true,installation:lifecycle[0]??null},randomUUID(),f.now()));}
 f.snapshot.recordDigest=channelSnapshotDigest(f.snapshot);
 const guards:any[]=ticketGuards.map(g=>({...g,enabled:true})),helpers:any[]=[...ticketHelpers,ticketChannelHelper].map(h=>({...h,enabled:true}));
 const state:any={tickets:[],attempts:[],history:[],heads:[],audit:[],events:[],receipts:[],fence:10,channelCurrent:!atomicBinding,
  transport:{generations:[],grants:[],history:[],head:null}},calls:string[]=[],options:any[]=[];
 const clock=()=>new Date(now),last=(id:string)=>state.events.filter((e:any)=>e.ticketId===id).at(-1);
 function registration(previous?:any){
  const base=copy(f.ticket),purpose=previous?'owner_recovery':'first_enrollment';if(previous){base.id=randomUUID();base.decisionId=randomUUID();base.intent.requestId=randomUUID();base.intent.target.id=randomUUID();}
  const snapshot=copy(f.snapshot);
  if(integrated&&previous){snapshot.generation=randomUUID();snapshot.purpose=purpose;snapshot.revision=(state.transport.head?.revision??0)+1;
   snapshot.certificateEpoch=(state.transport.head?.highWater??0)+1;snapshot.highWaterEpoch=snapshot.certificateEpoch;snapshot.leafPin=hash('7');
   base.intent.channel.revision=snapshot.revision;base.intent.channel.certificateEpoch=snapshot.certificateEpoch;base.intent.channel.highWaterEpoch=snapshot.highWaterEpoch;
   base.intent.channel.profile.certificate.fingerprint=snapshot.leafPin;base.intent.channel.profile.bootstrap.fingerprint=snapshot.leafPin;}
  snapshot.expiresAt=new Date(now+60000).toISOString();snapshot.recordDigest=channelSnapshotDigest(snapshot);
  const identity:any={version:'bootstrap-ticket-revocation-proposal-v1',ticketId:base.id,ticketDigest:hash('0'),ownerId:base.ownerId,decisionId:base.decisionId,decisionRevision:1,purpose,binding:copy(f.snapshot.binding),
   generation:previous?previous.identity.generation+1:1,credentialEpoch:previous?previous.identity.credentialEpoch+1:1,issuedAt:f.iso(-1000),notBefore:f.iso(-500),expiresAt:f.iso(60000),
   hostGeneration:snapshot.hostGeneration,installationGeneration:snapshot.installationGeneration,issuerRevision:1,issuerHistoryDigest:hash('1'),channelGeneration:snapshot.generation,channelRevision:snapshot.revision,channelDigest:ticketChannelPlanDigest(snapshot),
   predecessor:previous?{ticketId:previous.identity.ticketId,ticketDigest:previous.identity.ticketDigest,attemptId:previous.head.attemptId,generation:previous.identity.generation,credentialEpoch:previous.identity.credentialEpoch,
    historyDigest:previous.digest,state:previous.head.state,workspaceId:f.snapshot.binding.workspaceId,hostId:f.snapshot.binding.hostId}:null};
  base.version='worker-bootstrap-owner-ticket-v2';base.intent.schemaVersion='worker-bootstrap-admission-v2';base.intent.purpose=purpose;base.intent.prior=copy(identity.predecessor);
  base.intent.baseline.enrollmentGeneration=identity.generation-1;base.intent.baseline.credentialHighWater=identity.credentialEpoch-1;base.intent.target.epoch=identity.credentialEpoch;
  identity.issuedAt=new Date(now-1000).toISOString();identity.notBefore=new Date(now-500).toISOString();identity.expiresAt=new Date(now+60000).toISOString();base.issuedAt=identity.issuedAt;base.intent.expiresAt=identity.expiresAt;
  const {ticketDigest,...metadata}=identity;base.lifecycle=metadata;base.decisionIntentDigest=reviewDigest(base.intent);
  const signed={payload:base,signature:'0'.repeat(128)};identity.ticketDigest=ticketEnvelopeDigest(signed);
  const decision={payload:{id:base.decisionId,revision:1,ownerId:base.ownerId,authority:'owner_reserved',state:'accepted',intentDigest:base.decisionIntentDigest,acceptedAt:f.iso(-2000),expiresAt:identity.expiresAt},signature:'0'.repeat(128)};
  plans.set(identity.ticketId,snapshot);decisions.set(identity.ticketId,{id:randomUUID(),revision:1,ownerId:base.ownerId,acceptanceId:randomUUID(),intent:{schemaVersion:'worker-bootstrap-channel-v1',ticketId:identity.ticketId,ticketDigest:identity.ticketDigest,expectedRevision:snapshot.revision-1,snapshot}});
  return lifecycleRegistration.parse({operationId:randomUUID(),identity,record:{signed,decision}});
 }
 function receipt(kind:string,id:string,ticketId:string,record:unknown){
  state.fence++;if(fault==='fence')throw Error('synthetic');
  const event={id:randomUUID(),kind,ticketId,digest:reviewDigest(record)};state.audit.push(event);if(fault==='event')throw Error('synthetic');
  state.receipts.push({kind,id,ticketId,digest:event.digest,eventId:event.id,fence:String(state.fence),xid:activeTransaction});if(fault==='audit')throw Error('synthetic');
 }
 const client:any={$transaction:async(work:any,option:any)=>{
  let release!:()=>void;const wait=tail;tail=new Promise<void>(r=>release=r);await wait;
  const saved=copy(state);let readOnly=false;options.push(option);if(option.isolationLevel==='Serializable')transactions++;
  activeTransaction=++transactionId;
  const db:any={$executeRaw:async(strings:TemplateStringsArray,...v:any[])=>{
   const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push(sql);
   if(sql==='SET TRANSACTION READ ONLY'){readOnly=true;return 0;}assert.equal(readOnly,false);assert.equal(option.isolationLevel,'Serializable');writes++;
   if(sql.startsWith('INSERT INTO worker_transport_generations')){const row={id:v[0],identity:JSON.parse(v[4]),purpose:v[6]};assert.equal(state.transport.generations.some((g:any)=>g.id===row.id),false);
    state.transport.generations.push(row);receipt('transport_generation',row.id,state.tickets.at(-1).identity.ticketId,row);if(fault==='generation')throw Error('synthetic');}
   else if(sql.startsWith('INSERT INTO worker_transport_bootstrap_grants')){const g=JSON.parse(v[6]);assert.equal(state.transport.grants.some((r:any)=>r.intent.ticketId===g.intent.ticketId),false);
    state.transport.grants.push(g);receipt('transport_grant',g.id,g.intent.ticketId,g);if(fault==='grant')throw Error('synthetic');}
   else if(sql.startsWith('WITH v AS')){const r=JSON.parse(v[0]),g=JSON.parse(v[1]),s=g.intent.snapshot;assert.equal(r.revision,(state.transport.head?.revision??0)+1);
    state.transport.history.push(r);if(fault==='channel_history')throw Error('synthetic');
    receipt('transport_history',r.id,g.intent.ticketId,r);state.transport.head={id:r.id,revision:r.revision,highWater:s.highWaterEpoch,purpose:s.purpose,state:r.state,generation:s.generation,pin:s.leafPin,record:copy(r),fence:String(state.fence)};
    if(fault==='binding')throw Error('synthetic');}
   else if(sql.includes('synthetic_channel_binding')){state.channelCurrent=true;state.fence++;}
   else if(sql.startsWith('INSERT INTO worker_bootstrap_tickets')){
    assert.equal(current,true);const i=JSON.parse(v[15]),record=JSON.parse(v[12]);lifecycleRegistration.parse({operationId:randomUUID(),identity:i,record});
    const old=state.tickets.filter((t:any)=>t.identity.binding.workspaceId===i.binding.workspaceId&&t.identity.binding.hostId===i.binding.hostId).at(-1);
    assert.equal(state.tickets.some((t:any)=>t.identity.ticketId===i.ticketId),false);assert.equal(i.generation,(old?.identity.generation??0)+1);
    if(old){assert.equal(old.identity.version,i.version);const e=last(old.identity.ticketId);assert.equal(i.predecessor.historyDigest,reviewDigest(e));assert.equal(i.predecessor.attemptId,e.attemptId);assert.ok(['revoked','expired','delivery_unknown'].includes(e.state));}
    state.tickets.push({identity:i,record});receipt('root',i.ticketId,i.ticketId,{identity:i,record});if(fault==='root')throw Error('synthetic');
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events')){
    const e=JSON.parse(v[4]),p=last(e.ticketId);assert.equal(e.revision,(p?.revision??0)+1);assert.equal(e.previousDigest,p?reviewDigest(p):null);
    assert.equal(state.events.some((r:any)=>r.id===e.id),false);state.events.push(e);if(fault==='history'||fault==='issue')throw Error('synthetic');receipt('lifecycle',e.id,e.ticketId,e);
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_attempts')){
    const a=JSON.parse(v[7]);assert.equal(state.attempts.some((a2:any)=>a2.ticketId===a.ticketId),false);state.attempts.push(a);receipt('attempt',a.id,a.ticketId,a);
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_history')){
    const h=JSON.parse(v[4]),a=state.attempts.find((a:any)=>a.id===h.attemptId),p=state.history.filter((r:any)=>r.attemptId===h.attemptId).at(-1);
    assert.ok(a);assert.equal(h.revision,(p?.revision??0)+1);if(p)assert.ok(({consumed:['dispatched','blocked','delivery_unknown'],dispatched:['acknowledged','delivery_unknown'],acknowledged:['delivery_unknown']} as any)[p.state]?.includes(h.state));
    state.history.push(h);receipt('history',h.id,a.ticketId,h);
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_heads')){
    const h=state.history.find((h:any)=>h.id===v[3]),a=state.attempts.find((a:any)=>a.id===h.attemptId);assert.ok(h);state.heads=[{id:h.id,attemptId:h.attemptId,ticketId:a.ticketId,record:copy(h)}];receipt('head',h.id,a.ticketId,h);
   }else assert.fail('Unexpected mutation');return 1;
  },$queryRaw:async(strings:TemplateStringsArray,...v:any[])=>{
   const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push(sql);
   if(sql.includes("current_setting('transaction_read_only') AS readonly"))return [{revision:String(state.fence),isolation:option.isolationLevel==='Serializable'?'serializable':'repeatable read',readonly:readOnly?'on':'off'}];
   if(sql.includes('AS revocation_anchors'))return [{revocation_anchors:current}];
   if(sql.includes("AS snapshot")){
    const g=state.transport.grants.find((g:any)=>g.intent.ticketId===v[0]),issue=state.events.find((e:any)=>e.ticketId===v[0]&&e.action==='issue');
    const gen=state.transport.generations.find((r:any)=>r.id===g?.intent.snapshot.generation),h=state.transport.history.find((r:any)=>r.grantId===g?.id&&r.action==='grant');
    const receipts=[['root',v[0]],['transport_generation',gen?.id],['transport_grant',g?.id],['transport_history',h?.id],['lifecycle',issue?.id]].map(([kind,id])=>state.receipts.find((r:any)=>r.kind===kind&&r.id===id));
    const bound=verified&&!!g&&!!issue&&!!gen&&!!h&&receipts.every(Boolean)&&new Set(receipts.map((r:any)=>r?.xid)).size===1&&receipts[2].digest===reviewDigest(g)&&receipts[3].digest===reviewDigest(h);
    return g?[{snapshot:copy(g.intent.snapshot),bound}]:[];
   }
   if(sql.startsWith('SELECT id,owner_user_id'))return [{id:b.workspaceId,ownerId:f.ticket.ownerId}];
   if(sql.startsWith('SELECT user_id'))return [{userId:f.ticket.ownerId}];
   if(sql.startsWith('SELECT id,workspace_id AS "workspaceId",status'))return [{id:b.hostId,workspaceId:b.workspaceId,status:'online'}];
   if(sql.includes('FROM worker_credential_handoffs'))return [];
   if(sql.startsWith('SELECT d.id,d.workspace_id'))return [];
   if(sql.startsWith('SELECT id,workspace_id AS "workspaceId",host_id')){const t=state.tickets.find((r:any)=>r.identity.ticketId===v[0]);return t?[{id:v[0],workspaceId:b.workspaceId,hostId:b.hostId,ownerId:t.identity.ownerId,decisionId:t.identity.decisionId,requestId:t.record.signed.payload.intent.requestId,bindingDigest:reviewDigest(b),ticketDigest:t.identity.ticketDigest,expiresAt:t.identity.expiresAt,issuedAt:t.identity.issuedAt}]:[];}
   if(sql.includes('AS ticket_lifecycle_available'))return [{ticket_lifecycle_available:available}];
   if(sql.includes('FROM pg_trigger')){
    const list=(v[0].length===issuerGuards.length?issuerGuards:v[0].length===channelGuards.length?channelGuards:guards).map((g:any)=>({...g,enabled:g.enabled!==false&&origin&&['Serializable','RepeatableRead'].includes(option.isolationLevel)}));return copy(list);}
   if(sql.includes('FROM pg_proc'))return sql.includes("p.proname='transport_bootstrap_shape'")?[{hash:channelShapeHash,enabled:true}]:copy(helpers);
   if(sql.includes('AS channel_available'))return [{channel_available:available}];
   if(sql.includes('to_regclass'))return [{available}];
   if(sql.includes('AS channel_fence'))return [{channel_fence:String(state.fence)}];
   if(sql.includes('AS v2_issue_pending'))return [{v2_issue_pending:!readOnly&&!last(v[0])&&state.receipts.some((r:any)=>r.kind==='root'&&r.ticketId===v[0]&&r.xid===activeTransaction)}];
   if(sql.startsWith('SELECT d.id,r.version AS revision')){const d=decisions.get(v[1]);return d?[{id:d.id,revision:d.revision}]:[];}
   if(sql.includes('AS channel_ticket')){const t=state.tickets.find((t:any)=>t.identity.ticketId===v[0]);return t?[{channel_ticket:copy(t.record.signed.payload),digest:t.identity.ticketDigest,channel_record:copy(t.record),channel_identity:copy(t.identity),verified}]:[];}
   if(sql.includes('AS channel_grant'))return state.transport.grants.filter((g:any)=>g.intent.ticketId===v[0]).map((g:any)=>({channel_grant:copy(g),verified}));
   if(sql.includes('AS v2_channel_bound')){
    const issue=state.events.find((e:any)=>e.ticketId===v[0]&&e.action==='issue'),g=state.transport.grants.find((g:any)=>g.intent.ticketId===v[0]);
    const rr=state.receipts.find((r:any)=>r.kind==='root'&&r.ticketId===v[0]),gr=state.receipts.find((r:any)=>r.kind==='transport_grant'&&r.id===g?.id),ir=state.receipts.find((r:any)=>r.kind==='lifecycle'&&r.id===issue?.id);
    const generation=state.transport.generations.find((r:any)=>r.id===g?.intent.snapshot.generation),history=state.transport.history.find((r:any)=>r.grantId===g?.id&&r.action==='grant');
    const genr=state.receipts.find((r:any)=>r.kind==='transport_generation'&&r.id===generation?.id),hr=state.receipts.find((r:any)=>r.kind==='transport_history'&&r.id===history?.id);
    const latest=state.receipts.find((r:any)=>r.kind==='lifecycle'&&r.id===last(v[0])?.id);
    return [{v2_channel_bound:verified&&current&&[rr,genr,gr,hr,ir].every(Boolean)&&new Set([rr,genr,gr,hr,ir].map(r=>r?.xid)).size===1&&
     [rr,genr,gr,hr,ir].every((r,k,a)=>k===0||Number(a[k-1].fence)<Number(r.fence))&&genr.digest===reviewDigest(generation)&&gr.digest===reviewDigest(g)&&hr.digest===reviewDigest(history)&&
     latest?.fence===String(state.fence)&&state.transport.head?.state==='current'}];
   }
   if(sql.includes('AS channel_confirmed')){const r=JSON.parse(v[0]);return [{channel_confirmed:verified&&state.transport.head?.id===r.id&&state.transport.head.fence===String(state.fence)}];}
   if(sql.includes('FROM worker_transport_heads'))return state.transport.head?[{...copy(state.transport.head),verified}]:[];
   if(sql.startsWith('SELECT generation_id AS generation'))return state.transport.history.map((r:any)=>{const g=state.transport.grants.find((g:any)=>g.id===r.grantId);return {generation:g.intent.snapshot.generation,pin:g.intent.snapshot.leafPin,staged:null};});
   if(sql.startsWith('SELECT record_digest AS digest'))return [{digest:reviewDigest(state.transport.history.find((r:any)=>r.id===v[0]))}];
   if(sql.includes('FROM decisions d')){const d=[...decisions.values()].find(d=>d.id===v[0]);return d?[{ownerId:d.ownerId,revision:d.revision,acceptanceId:d.acceptanceId,intent:copy(d.intent),current}]:[];}
   if(sql.includes('worker_identity_lifecycle_guarded'))return [{guarded:current}];
   if(sql.includes('FROM worker_identity_lifecycle l'))return lifecycle.filter(r=>r.intent.kind===v[1]).map(record=>({record:copy(record),verified}));
   if(sql.includes('FROM bootstrap_issuer_history h'))return [{record:copy(issuer),fence:'1',verified}];
   if(sql.startsWith('SELECT revision,record_digest AS digest'))return [{revision:1,digest:hash('1')}];
   if(sql.includes('FROM trusted_provider_ticket_keys'))return [copy(key)];
   if(sql.includes('FROM api_keys'))return sql.startsWith('SELECT count(*)')?[{total:0,active:0}]:[];
   if(sql.includes('AS ticket_fence'))return [{ticket_fence:String(state.fence)}];
   if(sql.startsWith('SELECT lifecycle_identity'))return copy(state.tickets.filter((t:any)=>t.identity.ticketId===v[0]));
   if(sql.startsWith('WITH objects')){
    const id=v[0],t=state.tickets.find((t:any)=>t.identity.ticketId===id);
    const valid=verified&&!!t&&state.receipts.some((r:any)=>r.kind==='root'&&r.id===id&&r.digest===reviewDigest(t))&&
     state.receipts.every((r:any)=>state.audit.some((a:any)=>a.id===r.eventId&&a.digest===r.digest))&&
     state.history.every((h:any)=>state.receipts.some((r:any)=>r.kind==='history'&&r.id===h.id&&r.digest===reviewDigest(h)))&&
     state.events.filter((e:any)=>e.ticketId===id).every((e:any)=>!e.attemptId||state.attempts.some((a:any)=>a.id===e.attemptId&&a.ticketId===id)&&state.history.some((h:any)=>h.id===e.historyId&&h.attemptId===e.attemptId));
    return state.events.filter((e:any)=>e.ticketId===id).map((e:any)=>{const a=state.receipts.find((r:any)=>r.kind==='lifecycle'&&r.id===e.id);return {record:copy(e),digest:reviewDigest(e),fence:a?.fence,verified:valid&&!!a&&a.digest===reviewDigest(e)};});
   }
   if(sql.startsWith('SELECT max(generation)')){const ts=state.tickets.filter((t:any)=>t.identity.binding.workspaceId===v[0]&&t.identity.binding.hostId===v[1]);return [{generation:Math.max(...ts.map((t:any)=>t.identity.generation)),credential:Math.max(...ts.map((t:any)=>t.identity.credentialEpoch)),complete:ts.every((t:any)=>!!t.identity.notBefore)}];}
   if(sql.startsWith('SELECT t.ticket_digest')){const t=state.tickets.find((t:any)=>t.identity.ticketId===v[0]),e=last(v[0]);return t&&e?[{digest:t.identity.ticketDigest,history:reviewDigest(e),attempt:e.attemptId,state:e.state,generation:t.identity.generation,credential:t.identity.credentialEpoch}]:[];}
   if(sql.includes('AS ticket_ledger_verified')){const e=last(v[0]);return [{ticket_ledger_verified:state.attempts.filter((a:any)=>a.ticketId===v[0]).length===(e.attemptId?1:0)&&
    (!e.attemptId||v[4]||state.heads.some((h:any)=>h.attemptId===e.attemptId&&h.id===e.historyId))}];}
   if(sql.includes('AS ticket_current'))return [{ticket_current:current&&state.channelCurrent&&(!integrated||!!state.transport.head&&state.transport.head.state==='current')&&!(readOnly&&fault==='post_commit_read')}];
   if(sql.startsWith('SELECT fence_revision'))return state.receipts.filter((r:any)=>r.kind==='lifecycle'&&r.id===v[0]).map((r:any)=>({receipt_fence:r.fence}));
   if(sql.startsWith('SELECT record FROM worker_bootstrap_history')){const h=state.history.filter((h:any)=>h.attemptId===v[0]).at(-1);return h?[{record:copy(h)}]:[];}
   assert.fail('Unexpected query');
  }};
  try{const value=await work(db);if(!readOnly){
    for(const ticket of state.tickets)assert.ok(last(ticket.identity.ticketId));
    for(const a of state.attempts)assert.ok(state.events.some((e:any)=>e.action==='consume'&&e.attemptId===a.id));
    if(fault==='precommit')throw Error('synthetic');if(fault==='false_ack'){Object.assign(state,saved);return value;}
    if(fault==='unknown')throw new TicketLifecycleUnknown();
   }return value;
  }catch(e){if(!(e instanceof TicketLifecycleUnknown))Object.assign(state,saved);throw e;}finally{release();}
 }};
 const deps:TicketV2Dependencies={verifier:{qualification:'worker_bootstrap_ticket_verifier_v2' as const,verify:async(_db,proof)=>{verifications.push(copy(proof));return signatureValid;}},
  channel:integrated?createBootstrapV2ChannelBinding():{qualification:'unapplied_ticket_channel_binding_v2' as const,
   bind:async(db:any)=>{if(atomicBinding)await db.$executeRaw`SELECT 1 /* synthetic_channel_binding */`;},inspect:async()=>state.channelCurrent}};
 const store=createPrismaTicketLifecycleStore(client,clock,deps);
 const inspect=async(id:string)=>{const p=await store.inspect({ticketId:id});assert.equal(p.ok,true);if(!p.ok)throw Error('denied');return p;};
 const command=async(ticketId:string,action:string,evidence?:unknown)=>{const p=await inspect(ticketId);return {ticketId,operationId:randomUUID(),expectedRevision:p.head.revision,expectedFence:p.fence,action,...(evidence?{evidence}:{})};};
 const transition=async(ticketId:string,action:string,evidence?:unknown)=>store.transition(await command(ticketId,action,evidence));
 function bootstrapPeer(p:any){return {payload:{binding:p.identity.binding,attemptId:p.head.attemptId,ticketDigest:p.identity.ticketDigest,certificateEpoch:1,
  origin:f.profile.origin,serverName:f.profile.serverName,pin:f.profile.certificate.fingerprint,caDigest:f.profile.trust.caDigest,
  certificateNotBefore:f.iso(-60000),certificateNotAfter:f.iso(120000),addresses:['8.8.8.8'],peerAddress:'8.8.8.8',resolverPolicy:'public_ipv4_only_v1',source:'issuer_signed_peer_observation_v1',
  chainValid:true,hostnameValid:true,observedAt:clock().toISOString(),expiresAt:new Date(now+30000).toISOString(),redirect:false,proxy:false,downgrade:false},signature:'0'.repeat(128)};}
 const readerProofs:any[]=[],readerDbs:any[]=[];
 const readerVerifier:TicketRevocationVerifier={qualification:'synthetic_canonical_ticket_revocation_verifier_v1',verify:async(db,p)=>{readerProofs.push(copy(p));readerDbs.push(db);return signatureValid;}};
 const source=createCanonicalBootstrapAuthoritySource(clock,readerVerifier);
 async function boundRead<T>(work:(selectedSource:typeof source,db:any)=>Promise<T>,selected=source):Promise<T>{return client.$transaction(async(db:any)=>{await db.$executeRaw`SET TRANSACTION READ ONLY`;const release=await selected.bindTransaction!(db,'read');try{return await work(selected,db);}finally{release();}},{isolationLevel:'RepeatableRead'});}
 const readerStatus=(ticketId:string)=>boundRead((source,db)=>source.inspectTicketRevocation(db,{ticketId}));
 return {readerStatus,boundRead,source,readerVerifier,readerProofs,readerDbs,f,store,client,deps,plans,decisions,lifecycle,key,issuer,verifications,signature:(v:boolean)=>signatureValid=v,registration,inspect,command,transition,clock,bootstrapPeer,guards,helpers,calls,options,state:()=>copy(state),mutate:(fn:(s:any)=>void)=>fn(state),
  at:(ms:number)=>now=Date.parse(f.iso(ms)),fault:(s:string)=>fault=s,current:(v:boolean)=>current=v,origin:(v:boolean)=>origin=v,available:(v:boolean)=>available=v,verified:(v:boolean)=>verified=v,counts:()=>({writes,transactions})};
}

test('unapplied bootstrap lifecycle schema and source-only adapter',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
 await t.test('issue reserves a generation on the existing root; consume uses the original attempt/history/head',async()=>{
  const f=fixture(),c=f.registration();await f.store.register(c);assert.equal(f.state().attempts.length,0);assert.equal(f.state().events[0].state,'issued');
  await f.transition(c.identity.ticketId,'reserve');await f.transition(c.identity.ticketId,'consume');const s=f.state();
  assert.equal(s.tickets.length,1);assert.equal(s.attempts.length,1);assert.equal(s.history.length,1);assert.equal(s.heads[0].attemptId,s.attempts[0].id);assert.equal(s.events.at(-1).historyId,s.history[0].id);
  await assert.rejects(f.transition(c.identity.ticketId,'consume'));for(const k of Object.keys(lifecycleFlags))assert.equal((await f.inspect(c.identity.ticketId) as any)[k],false);
 });
 await t.test('terminal ticket before consume is a real recovery predecessor with no fabricated attempt',async()=>{
  for(const action of ['revoke','expire']){const f=fixture(),c=f.registration();await f.store.register(c);if(action==='expire')f.at(60000);await f.transition(c.identity.ticketId,action);
   const p=await f.inspect(c.identity.ticketId),next=f.registration(p);assert.equal(next.identity.predecessor?.attemptId,null);await f.store.register(next);
   assert.equal(f.state().tickets.length,2);assert.equal(f.state().attempts.length,0);await f.transition(next.identity.ticketId,'reserve');await f.transition(next.identity.ticketId,'consume');
   assert.equal(f.state().attempts.length,1);assert.equal(f.state().attempts[0].ticketId,next.identity.ticketId);await assert.rejects(f.transition(c.identity.ticketId,'reserve'));
  }
 });
 await t.test('twenty concurrent issue/reserve/consume writers have one committed winner per CAS',async()=>{
  const f=fixture(),c=f.registration();const issued=await Promise.allSettled(Array.from({length:20},()=>f.store.register({...c,operationId:randomUUID()})));assert.equal(issued.filter(r=>r.status==='fulfilled').length,1);
  for(const action of ['reserve','consume']){const cmd=await f.command(c.identity.ticketId,action),r=await Promise.allSettled(Array.from({length:20},()=>f.store.transition({...cmd,operationId:randomUUID()})));
   assert.equal(r.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.state().events.filter((e:any)=>e.action===action).length,1);}
  assert.equal(f.state().attempts.length,1);
 });
 await t.test('revoke racing twenty reserve or consume commands prevents revival in both lock orderings',async()=>{
  for(const action of ['reserve','consume'])for(const revokeFirst of [false,true]){const f=fixture(),c=f.registration();await f.store.register(c);if(action==='consume')await f.transition(c.identity.ticketId,'reserve');
   const cmd=await f.command(c.identity.ticketId,action),revoke={...cmd,action:'revoke',operationId:randomUUID()};
   const items=Array.from({length:20},()=>({...cmd,operationId:randomUUID()}));if(revokeFirst)items.unshift(revoke);else items.push(revoke);
   await Promise.allSettled(items.map(v=>f.store.transition(v)));
   if(!revokeFirst)await f.transition(c.identity.ticketId,'revoke');assert.equal(f.state().events.at(-1).state,'revoked');
   assert.equal(f.state().events.filter((e:any)=>e.action===action).length,revokeFirst?0:1);await assert.rejects(f.transition(c.identity.ticketId,action));
  }
 });
 await t.test('status is read only; explicit validity, missing legacy, replay and stale source fence deny',async()=>{
  const f=fixture(),c=f.registration();c.identity.notBefore=f.f.iso(500);c.record.signed.payload.lifecycle.notBefore=c.identity.notBefore;c.identity.ticketDigest=ticketEnvelopeDigest(c.record.signed);
  await f.store.register(c);const baseline=f.state();for(let n=0;n<4;n++)await f.inspect(c.identity.ticketId);assert.deepEqual(f.state(),baseline);
  assert.equal((await f.inspect(c.identity.ticketId)).usable,false);await assert.rejects(f.transition(c.identity.ticketId,'reserve'));f.at(60000);assert.equal((await f.inspect(c.identity.ticketId)).usable,false);assert.deepEqual(f.state(),baseline);
  const g=fixture(),d=g.registration();await g.store.register(d);const old=await g.command(d.identity.ticketId,'reserve');g.mutate(s=>s.fence++);await assert.rejects(g.store.transition(old));assert.equal((await g.inspect(d.identity.ticketId)).usable,false);
  g.mutate(s=>delete s.tickets[0].identity.notBefore);assert.equal((await g.store.inspect({ticketId:d.identity.ticketId})).ok,false);
  const bad=copy(c);delete (bad.identity as any).notBefore;assert.equal(lifecycleRegistration.safeParse(bad).success,false);
 });
 await t.test('rollback restores root, attempt, history, Event, audit and fence; false or unknown COMMIT never retries',async()=>{
  for(const fault of ['fence','history','event','audit','precommit','false_ack','unknown']){const f=fixture(),c=f.registration(),before=f.state();f.fault(fault);
   await assert.rejects(f.store.register(c),e=>['precommit','false_ack','unknown'].includes(fault)?e instanceof TicketLifecycleUnknown:true);
   assert.equal(f.counts().transactions,1);if(fault!=='unknown')assert.deepEqual(f.state(),before);else assert.equal(f.state().tickets.length,1);
  }
  for(const fault of ['fence','history','event','audit','precommit','false_ack','unknown']){const f=fixture(),c=f.registration();await f.store.register(c);await f.transition(c.identity.ticketId,'reserve');const cmd=await f.command(c.identity.ticketId,'consume'),before=f.state(),n=f.counts().transactions;f.fault(fault);
   await assert.rejects(f.store.transition(cmd));assert.equal(f.counts().transactions,n+1);if(fault!=='unknown')assert.deepEqual(f.state(),before);else assert.equal(f.state().attempts.length,1);
  }
 });
 await t.test('every catalog writer and helper missing, disabled, rebound, changed or misconfigured denies reads and writes',async()=>{
  const f=fixture(),c=f.registration();await f.store.register(c);const cmd=await f.command(c.identity.ticketId,'reserve');
  for(const list of [f.guards,f.helpers])for(let n=0;n<list.length;n++)for(const fault of ['missing','disabled','rebound','changed','configuration']){
   const saved=copy(list);if(fault==='missing')list.splice(n,1);else if(fault==='disabled'||fault==='configuration')list[n].enabled=false;else if(fault==='changed')list[n].hash=hash('0');else list[n].name='rebound';
   assert.equal((await f.store.inspect({ticketId:c.identity.ticketId})).ok,false);await assert.rejects(f.store.transition(cmd));list.splice(0,list.length,...saved);
  }
  assert.equal(f.state().events.length,1);f.origin(false);assert.equal((await f.store.inspect({ticketId:c.identity.ticketId})).ok,false);await assert.rejects(f.store.transition(cmd));f.origin(true);
  f.available(false);assert.equal((await f.store.inspect({ticketId:c.identity.ticketId})).ok,false);
 });
 await t.test('history/audit ABA, owner/lifecycle changes and caller authority overrides fail closed',async()=>{
  for(const tamper of [(s:any)=>s.events.pop(),(s:any)=>s.audit.pop(),(s:any)=>s.receipts.pop(),(s:any)=>s.tickets[0].identity.ownerId=randomUUID(),(s:any)=>s.tickets[0].identity.generation++]){
   const f=fixture(),c=f.registration();await f.store.register(c);tamper(f.state());f.mutate(tamper);assert.equal((await f.store.inspect({ticketId:c.identity.ticketId})).ok,false);
  }
  const f=fixture(),c=f.registration();await f.store.register(c);f.current(false);assert.equal((await f.inspect(c.identity.ticketId)).usable,false);await assert.rejects(f.transition(c.identity.ticketId,'reserve'));
  for(const key of ['authority','guards','current','force','retry','action','identity'])assert.equal((await f.store.inspect({ticketId:c.identity.ticketId,[key]:true})).ok,false);
  const cmd=await f.command(c.identity.ticketId,'reserve');await assert.rejects(f.store.transition({...cmd,force:true}));await assert.rejects(f.store.transition({...cmd,action:'delete'}));
  const g=fixture(),d=g.registration();await g.store.register(d);await g.transition(d.identity.ticketId,'reserve');await g.transition(d.identity.ticketId,'consume');g.mutate(s=>s.heads=[]);
  assert.equal((await g.store.inspect({ticketId:d.identity.ticketId})).ok,false);
  assert.equal((await createTicketLifecycleProtocol().run({ticketId:c.identity.ticketId})).ok,false);
 });
 await t.test('canonical authority retains both blockers while the migration is unapplied',async()=>{
  const f=fixture(),c=f.registration(),source=createCanonicalBootstrapAuthoritySource(f.clock),db:any={$queryRaw:async()=>[{revision:'1',isolation:'repeatable read',readonly:'on'}]};
  const release=await source.bindTransaction!(db,'read');try{for(const [method,code,id] of [[source.ticketRevoked,'bootstrap_ticket_revocation_unavailable',c.identity.ticketId],[source.decision,'signed_current_decision_unavailable',c.identity.decisionId]] as const)
   await assert.rejects(method(db,id),(e:any)=>e instanceof CanonicalBootstrapBlocked&&e.blockers.includes(code));}finally{release();}
 });
 await t.test('paired fresh reads gate exchange and completion; all outcomes remain synthetic',async()=>{
  for(const phase of ['success','before2','before4','before6','after7','exchange','after11','late_authority','dispatch_unknown','complete_unknown']){
   const f=fixture(),c=f.registration();await f.store.register(c);let reads=0,exchanges=0;let peer:any;
   const store={...f.store,inspect:async(value:unknown)=>{reads++;if(phase===`before${reads}`||phase===`after${reads}`)await f.transition(c.identity.ticketId,'revoke');if(phase==='late_authority'&&reads===11)f.current(false);return f.store.inspect(value);},
    transition:async(value:unknown)=>{const action=(value as any).action;if(phase===`${action}_unknown`)f.fault('unknown');return f.store.transition(value);}};
   const protocol=createTicketLifecycleProtocol({qualification:'synthetic_ticket_lifecycle_protocol_v1',store,
    peer:async p=>(peer=f.bootstrapPeer(p)),exchange:async p=>{exchanges++;if(phase==='exchange')await f.transition(c.identity.ticketId,'revoke');
     return {payload:{version:'worker-bootstrap-completion-v1',attemptId:p.head.attemptId,ticketDigest:p.identity.ticketDigest,requestId:c.record.signed.payload.intent.requestId,state:'acknowledged',
      credential:c.record.signed.payload.intent.target,peer:peer.payload,responseDigest:hash('4'),committedAt:f.clock().toISOString()},signature:'0'.repeat(128)};}});
   const result=await protocol.run({ticketId:c.identity.ticketId});
   if(phase==='success'){assert.equal(result.ok,true);assert.equal(reads,12);assert.equal(exchanges,1);assert.equal(f.state().events.at(-1).state,'completed');
    await assert.rejects(f.transition(c.identity.ticketId,'consume'));await f.transition(c.identity.ticketId,'revoke');await f.transition(c.identity.ticketId,'reconcile');assert.equal(f.state().events.at(-1).state,'delivery_unknown');
    await assert.rejects(f.transition(c.identity.ticketId,'reserve'));
   }else{assert.equal(result.ok,false,phase);assert.equal(exchanges,phase==='exchange'||phase==='after11'||phase==='complete_unknown'||phase==='late_authority'?1:0,phase);
    if(phase.includes('unknown'))assert.equal('error'in result&&result.error,'reconciliation_required');else if(phase.startsWith('after')||phase==='exchange')assert.equal('error'in result&&result.error,'delivery_unknown');
   }
   for(const [key,value] of Object.entries(lifecycleFlags))assert.equal((result as any)[key],value);
  }
 });
 await t.test('terminal unknown is sticky; revoke/reconcile does not replay the old attempt history',async()=>{
  const f=fixture(),c=f.registration();await f.store.register(c);await f.transition(c.identity.ticketId,'reserve');await f.transition(c.identity.ticketId,'consume');
  const p=await f.inspect(c.identity.ticketId);await f.transition(c.identity.ticketId,'dispatch',{peer:f.bootstrapPeer(p)});await f.transition(c.identity.ticketId,'unknown');
  const size=f.state().history.length;await f.transition(c.identity.ticketId,'revoke');await f.transition(c.identity.ticketId,'reconcile');assert.equal(f.state().history.length,size);
  assert.equal(f.state().events.at(-1).revoked,true);assert.equal(f.state().events.at(-1).reconciled,true);await assert.rejects(f.transition(c.identity.ticketId,'dispatch',{peer:f.bootstrapPeer(p)}));
 });
 await t.test('twenty recovery issues cannot reuse a terminal ticket generation or its predecessor',async()=>{
  const f=fixture(),c=f.registration();await f.store.register(c);await f.transition(c.identity.ticketId,'revoke');const p=await f.inspect(c.identity.ticketId);
  const candidates=Array.from({length:20},()=>f.registration(p));const r=await Promise.allSettled(candidates.map(v=>f.store.register(v)));
  assert.equal(r.filter(v=>v.status==='fulfilled').length,1);assert.equal(f.state().tickets.length,2);assert.equal(f.state().attempts.length,0);
  for(const change of [(i:any)=>i.predecessor.attemptId=randomUUID(),(i:any)=>i.predecessor.historyDigest=hash('0'),(i:any)=>i.generation=1]){
   const bad=copy(candidates[0]);change(bad.identity);assert.equal(lifecycleRegistration.safeParse(bad).success,false);
  }
 });
 await t.test('issue is a reservation only; channel binding must precede its receipt in the same transaction',async()=>{
  const f=fixture(),c=f.registration();f.mutate(s=>s.channelCurrent=false);const before=f.state();await assert.rejects(f.store.register(c));assert.deepEqual(f.state(),before);
  const g=fixture(true),d=g.registration();await g.store.register(d);assert.equal((await g.inspect(d.identity.ticketId)).usable,true);
  const root=g.calls.findIndex(s=>s.startsWith('INSERT INTO worker_bootstrap_tickets')),binding=g.calls.findIndex(s=>s.includes('synthetic_channel_binding')),receipt=g.calls.findIndex(s=>s.startsWith('INSERT INTO worker_bootstrap_lifecycle_events'));
  assert.ok(root<binding&&binding<receipt);assert.equal(g.counts().transactions,1);
 });
 await t.test('v2 integrated issue uses the existing channel writer, one transaction and one immutable receipt chain',async()=>{
  const f=fixture(false,true),c=f.registration();const binder=f.deps.channel,visibility:boolean[]=[];
  f.deps.channel={...binder,bind:async(db,r,now)=>{visibility.push(await binder.inspect(db,r,now));await binder.bind(db,r,now);visibility.push(await binder.inspect(db,r,now));}};
  const result=await f.store.register(c);assert.deepEqual(visibility,[false,false]);assert.equal(result.implementationReady,false);assert.equal(f.counts().transactions,1);
  const p=await f.inspect(c.identity.ticketId);assert.equal(p.usable,true);const s=f.state();assert.equal(s.tickets.length,1);assert.equal(s.transport.generations.length,1);assert.equal(s.transport.grants.length,1);assert.equal(s.transport.history.length,1);
  const order=['INSERT INTO worker_bootstrap_tickets','INSERT INTO worker_transport_generations','INSERT INTO worker_transport_bootstrap_grants','WITH v AS','INSERT INTO worker_bootstrap_lifecycle_events'].map(prefix=>f.calls.findIndex(s=>s.startsWith(prefix)));
  assert.ok(order.every((n,k)=>n>=0&&(k===0||n>order[k-1])));assert.equal(new Set(s.receipts.map((r:any)=>r.xid)).size,1);
  assert.ok(f.options.some(o=>o.isolationLevel==='RepeatableRead'));await f.transition(c.identity.ticketId,'reserve');await f.transition(c.identity.ticketId,'consume');
  assert.equal(f.state().attempts.length,1);assert.equal(f.state().transport.grants.length,1);assert.equal(f.state().transport.history.length,1);
 });
 await t.test('v2 integrated recovery binds the next canonical channel generation without a dummy predecessor attempt',async()=>{
  const f=fixture(false,true),c=f.registration();await f.store.register(c);
  await createPrismaBootstrapChannelStore(f.client,f.clock).transition({ticketId:c.identity.ticketId,operationId:randomUUID(),expectedRevision:1,action:'revoke'});
  await f.transition(c.identity.ticketId,'revoke');const next=f.registration(await f.inspect(c.identity.ticketId));assert.equal(next.identity.predecessor?.attemptId,null);
  await f.store.register(next);assert.equal((await f.inspect(next.identity.ticketId)).usable,true);const s=f.state();assert.equal(s.tickets.length,2);assert.equal(s.transport.generations.length,2);
  assert.equal(s.transport.head.revision,3);assert.equal(s.transport.head.highWater,2);assert.equal(s.attempts.length,0);
 });
 await t.test('v2 digest domains are acyclic and the injected verifier sees the exact signed content and issuer identity',async()=>{
  const f=fixture(false,true),c=f.registration(),s=f.plans.get(c.identity.ticketId),before=copy(c.record.signed);
  assert.equal(c.identity.channelDigest,ticketChannelPlanDigest(s));assert.equal(c.identity.ticketDigest,ticketEnvelopeDigest(c.record.signed));
  assert.notEqual(c.identity.channelDigest,s.recordDigest);assert.notEqual(c.identity.ticketDigest,reviewDigest(c.record.signed));assert.notEqual(ticketContentDigest(c.record.signed.payload),c.identity.ticketDigest);
  assert.ok(!('ticketDigest'in c.record.signed.payload.lifecycle));assert.ok(!('ticketDigest'in s));assert.throws(()=>ticketChannelPlanDigest({...s,ticketDigest:hash('0')}));
  const grantDigest=reviewDigest(f.decisions.get(c.identity.ticketId).intent);assert.notEqual(grantDigest,c.identity.ticketDigest);assert.deepEqual(c.record.signed,before);
  await f.store.register(c);assert.ok(f.verifications.length>=3);for(const p of f.verifications){assert.equal(p.domain,ticketV2Domains.content);assert.equal(p.contentDigest,ticketContentDigest(c.record.signed.payload));
   assert.equal(p.envelopeDigest,c.identity.ticketDigest);assert.deepEqual(p.identity,c.identity);assert.deepEqual(p.signed,c.record.signed);}
 });
 await t.test('v2 integration rolls back every issue/binding phase and treats false/unknown COMMIT as reconciliation',async()=>{
  for(const fault of ['root','generation','grant','channel_history','binding','issue','fence','event','audit','verify_after_bind','precommit','false_ack','unknown','post_commit_read']){
   const f=fixture(false,true),c=f.registration(),before=f.state();if(fault==='verify_after_bind'){const binder=f.deps.channel;f.deps.channel={...binder,bind:async(db,r,at)=>{await binder.bind(db,r,at);f.signature(false);}};}
   f.fault(fault);await assert.rejects(f.store.register(c),e=>['precommit','false_ack','unknown','post_commit_read'].includes(fault)?e instanceof TicketLifecycleUnknown:true);
   assert.equal(f.counts().transactions,1,fault);if(!['unknown','post_commit_read'].includes(fault))assert.deepEqual(f.state(),before,fault);
   else{assert.equal(f.state().tickets.length,1);assert.equal(f.state().transport.grants.length,1);assert.equal(f.state().events.length,1);}
  }
 });
 await t.test('v2 twenty concurrent issue+bind commands commit exactly one root, generation, grant and issue',async()=>{
  const f=fixture(false,true),c=f.registration();const results=await Promise.allSettled(Array.from({length:20},()=>f.store.register({...c,operationId:randomUUID()})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.counts().transactions,20);const s=f.state();
  for(const rows of [s.tickets,s.transport.generations,s.transport.grants,s.transport.history,s.events])assert.equal(rows.length,1);
  assert.equal(new Set(s.receipts.map((r:any)=>r.xid)).size,1);
 });
 await t.test('v2 missing verifier/binder, rejected signature and standalone/late binding fail closed',async()=>{
  for(const missing of ['all','verifier','channel']){const f=fixture(false,true),c=f.registration(),deps:any={...f.deps};if(missing!=='all')delete deps[missing];
   const store=createPrismaTicketLifecycleStore(f.client,f.clock,missing==='all'?undefined:deps);await assert.rejects(store.register(c));assert.equal((await store.inspect({ticketId:c.identity.ticketId})).ok,false);assert.equal(f.counts().transactions,0);}
  const rejected=fixture(false,true),invalid=rejected.registration();rejected.signature(false);await assert.rejects(rejected.store.register(invalid));assert.equal(rejected.counts().writes,0);
  const f=fixture(false,true),c=f.registration();await f.store.register(c);const before=f.state();
  await assert.rejects(f.client.$transaction((db:any)=>f.deps.channel.bind(db,c,f.clock()),{isolationLevel:'Serializable'}));assert.deepEqual(f.state(),before);
  await assert.rejects(createPrismaBootstrapChannelStore(f.client,f.clock).grant({ticketId:c.identity.ticketId,operationId:randomUUID(),decisionId:f.decisions.get(c.identity.ticketId).id,decisionRevision:1}));assert.deepEqual(f.state(),before);
  const broken=fixture(false,true),d=broken.registration();broken.deps.channel={...broken.deps.channel,bind:async()=>{}};
  await assert.rejects(broken.store.register(d));assert.equal(broken.state().tickets.length,0);assert.equal(broken.state().transport.grants.length,0);
 });
 await t.test('v2 signed shape rejects legacy and caller overrides; status cannot repair a partial or separately rebound issue',async()=>{
  const f=fixture(false,true),c=f.registration();for(const change of [(x:any)=>x.record.signed.payload.version='worker-bootstrap-owner-ticket-v1',(x:any)=>delete x.record.signed.signature,
   (x:any)=>x.identity.channelDigest=hash('0'),(x:any)=>x.force=true,(x:any)=>x.verifier=true,(x:any)=>x.channel={verified:true}]){const bad=copy(c);change(bad);await assert.rejects(f.store.register(bad));}
  assert.equal(f.state().tickets.length,0);await f.store.register(c);const before=f.state();await f.inspect(c.identity.ticketId);await f.inspect(c.identity.ticketId);assert.deepEqual(f.state(),before);
  f.mutate(s=>s.receipts.find((r:any)=>r.kind==='transport_grant').xid++);const p=await f.inspect(c.identity.ticketId);assert.equal(p.usable,false);await assert.rejects(f.transition(c.identity.ticketId,'reserve'));
  assert.equal(f.state().attempts.length,0);f.mutate(s=>s.events=[]);assert.equal((await f.store.inspect({ticketId:c.identity.ticketId})).ok,false);
 });
 await t.test('v2 owner/lifecycle/issuer/channel drift and validity mismatches roll back atomically',async()=>{
  for(const change of [(f:any,c:any)=>f.decisions.get(c.identity.ticketId).ownerId=randomUUID(),(f:any)=>f.lifecycle[1].intent.generation=randomUUID(),
   (f:any)=>f.key.epoch++,(f:any,c:any)=>f.plans.get(c.identity.ticketId).purpose='owner_recovery',(f:any,c:any)=>f.plans.get(c.identity.ticketId).certificateEpoch++,
   (f:any,c:any)=>f.plans.get(c.identity.ticketId).expiresAt=f.f.iso(500),(f:any)=>f.at(60000),(f:any)=>f.current(false)]){
   const f=fixture(false,true),c=f.registration(),before=f.state();change(f,c);await assert.rejects(f.store.register(c));assert.deepEqual(f.state(),before);
  }
 });
 await t.test('canonical revocation reader verifies exact public issuer and digests in its bound READ ONLY transaction',async()=>{
  const f=fixture(false,true),c=f.registration();await f.store.register(c);const before=f.state(),n=f.counts();
  await f.boundRead(async(source,db)=>{const p=await source.inspectTicketRevocation(db,{ticketId:c.identity.ticketId});assert.ok(p.ok);if(!p.ok)return;
   assert.equal(p.state,'valid_not_revoked');assert.equal(p.admissible,true);assert.equal(p.contentDigest,ticketContentDigest(c.record.signed.payload));assert.equal(p.envelopeDigest,c.identity.ticketDigest);
   assert.equal(f.readerDbs.at(-1),db);assert.equal(await source.ticketRevoked(db,c.identity.ticketId),false);
   const proof=f.readerProofs.at(-1);assert.deepEqual(proof.signed,c.record.signed);assert.equal(proof.issuerRevision,c.identity.issuerRevision);assert.equal(proof.issuerHistoryDigest,c.identity.issuerHistoryDigest);
   assert.equal(proof.issuer.material.publicKeyDigest,c.identity.binding.ticketPublicKeyDigest);assert.equal(proof.issuer.epoch,c.identity.binding.ticketKeyEpoch);
  });assert.deepEqual(f.state(),before);assert.deepEqual(f.counts(),n);
  await f.client.$transaction(async(db:any)=>{const release=await f.source.bindTransaction!(db,'write');try{const p=await f.source.inspectTicketRevocation(db,{ticketId:c.identity.ticketId});assert.ok(p.ok);assert.equal(f.readerDbs.at(-1),db);}finally{release();}},{isolationLevel:'Serializable'});
  assert.deepEqual(f.state(),before);assert.equal(f.counts().writes,n.writes);
 });
 await t.test('reader distinguishes revoked expired consumed completed and terminal unknown without reopening admission',async()=>{
  for(const state of ['revoked','expired','consumed','completed','delivery_unknown']){const f=fixture(false,true),c=f.registration();await f.store.register(c);
   if(state==='revoked')await f.transition(c.identity.ticketId,'revoke');else if(state==='expired')f.at(60000);else{
    await f.transition(c.identity.ticketId,'reserve');await f.transition(c.identity.ticketId,'consume');
    if(state==='completed'||state==='delivery_unknown'){const p=await f.inspect(c.identity.ticketId),peer=f.bootstrapPeer(p);await f.transition(c.identity.ticketId,'dispatch',{peer});
     if(state==='delivery_unknown')await f.transition(c.identity.ticketId,'unknown');else await f.transition(c.identity.ticketId,'complete',{completion:{payload:{version:'worker-bootstrap-completion-v1',attemptId:p.head.attemptId,ticketDigest:p.identity.ticketDigest,requestId:c.record.signed.payload.intent.requestId,state:'acknowledged',credential:c.record.signed.payload.intent.target,peer:peer.payload,responseDigest:hash('4'),committedAt:f.clock().toISOString()},signature:'0'.repeat(128)}});
    }
   }
   const p=await f.readerStatus(c.identity.ticketId);assert.ok(p.ok,state);if(p.ok){assert.equal(p.state,({revoked:'terminal_revoked',delivery_unknown:'terminal_unknown'} as any)[state]??state);assert.equal(p.admissible,state==='consumed');assert.equal(p.reconciliationRequired,state==='delivery_unknown');}
  }
 });
 await t.test('reader refuses missing root event receipt audit attempt history head and binding',async()=>{
  const failures=[(s:any)=>s.tickets.splice(0),(s:any)=>s.events.pop(),(s:any)=>s.receipts.pop(),(s:any)=>s.audit.pop(),(s:any)=>s.attempts.splice(0),(s:any)=>s.history.splice(0),(s:any)=>s.heads.splice(0),(s:any)=>s.transport.grants.splice(0),(s:any)=>s.transport.head=null];
  for(const damage of failures){const f=fixture(false,true),c=f.registration();await f.store.register(c);await f.transition(c.identity.ticketId,'reserve');await f.transition(c.identity.ticketId,'consume');f.mutate(damage);const before=f.state();
   assert.equal((await f.readerStatus(c.identity.ticketId)).state,'invalid_incomplete');await assert.rejects(f.boundRead((source,db)=>source.ticketRevoked(db,c.identity.ticketId)),CanonicalBootstrapBlocked);assert.deepEqual(f.state(),before);
  }
 });
 await t.test('reader denies stale generation issuer key epoch channel lifecycle owner and not-before boundaries',async()=>{
  for(const fault of ['generation','key','epoch','channel','lifecycle','owner','not_before']){const f=fixture(false,true),c=f.registration();await f.store.register(c);
   if(fault==='generation')f.mutate(s=>{s.tickets.push({...copy(s.tickets[0]),identity:{...copy(s.tickets[0].identity),ticketId:randomUUID(),generation:2,credentialEpoch:2}});});
   if(fault==='key')f.key.publicKeyDigest=hash('0');if(fault==='epoch')f.key.epoch++;
   if(fault==='channel')f.mutate(s=>s.transport.grants[0].intent.snapshot.caDigest=hash('0'));
   if(fault==='lifecycle')f.lifecycle[0].intent.generation=randomUUID();if(fault==='owner')f.current(false);if(fault==='not_before')f.at(-2000);
   assert.equal((await f.readerStatus(c.identity.ticketId)).ok,false,fault);
  }
 });
 await t.test('missing rejecting or drifting verifier is fail closed and no default signature authority exists',async()=>{
  const f=fixture(false,true),c=f.registration();await f.store.register(c);const absent=createCanonicalBootstrapAuthoritySource(f.clock);
  assert.equal((await f.boundRead((source,db)=>source.inspectTicketRevocation(db,{ticketId:c.identity.ticketId}),absent)).ok,false);
  f.signature(false);assert.equal((await f.readerStatus(c.identity.ticketId)).ok,false);f.signature(true);
  const drift=createCanonicalBootstrapAuthoritySource(f.clock,{...f.readerVerifier,verify:async()=>{f.mutate(s=>s.fence++);return true;}});
  await assert.rejects(f.boundRead((source,db)=>source.inspectTicketRevocation(db,{ticketId:c.identity.ticketId}),drift),CanonicalBootstrapBlocked);
 });
 await t.test('preconsume and consumed terminal predecessors keep exact nullable attempt bindings through recovery',async()=>{
  for(const consumed of [false,true]){const f=fixture(false,true),c=f.registration();await f.store.register(c);if(consumed){await f.transition(c.identity.ticketId,'reserve');await f.transition(c.identity.ticketId,'consume');}
   await createPrismaBootstrapChannelStore(f.client,f.clock).transition({ticketId:c.identity.ticketId,operationId:randomUUID(),expectedRevision:1,action:'revoke'});await f.transition(c.identity.ticketId,'revoke');
   const previous=await f.inspect(c.identity.ticketId),next=f.registration(previous);await f.store.register(next);
   const old=await f.readerStatus(c.identity.ticketId),fresh=await f.readerStatus(next.identity.ticketId);assert.ok(old.ok&&fresh.ok);if(old.ok&&fresh.ok){assert.equal(old.state,'terminal_revoked');assert.equal(fresh.state,'valid_not_revoked');assert.equal(fresh.identity.predecessor?.attemptId,previous.head.attemptId);assert.equal(!!previous.head.attemptId,consumed);}
   assert.equal(f.state().attempts.length,consumed?1:0);
  }
 });
 await t.test('twenty revoke/read interleavings cannot observe an unrevoked ticket after the serialized revocation',async()=>{
  for(let cut=0;cut<20;cut++){const f=fixture(false,true),c=f.registration();await f.store.register(c);const revoke=await f.command(c.identity.ticketId,'revoke'),jobs:Promise<unknown>[]=[];
   for(let n=0;n<20;n++){if(n===cut)jobs.push(f.store.transition(revoke));jobs.push(f.readerStatus(c.identity.ticketId).then(p=>{assert.ok(p.ok);if(p.ok)assert.equal(p.state,n<cut?'valid_not_revoked':'terminal_revoked');}));}await Promise.all(jobs);assert.equal(f.state().events.filter((e:any)=>e.action==='revoke').length,1);
  }
 });
 await t.test('paired fresh canonical reads deny before exchange and report unknown after a possible commit without retry',async()=>{
  for(const phase of ['success','before2','before4','exchange_revoke','exchange_drift','reply_loss','completion_loss']){const f=fixture(false,true),c=f.registration();await f.store.register(c);await f.transition(c.identity.ticketId,'reserve');await f.transition(c.identity.ticketId,'consume');let reads=0,sends=0,completes=0;
   const protocol=createTicketRevocationReadProtocol({qualification:'synthetic_ticket_revocation_reader_protocol_v1',read:async value=>{reads++;if(phase===`before${reads}`)await f.transition(c.identity.ticketId,'revoke');return f.boundRead((source,db)=>source.inspectTicketRevocation(db,value));},
    exchange:async()=>{sends++;if(phase==='exchange_revoke')await f.transition(c.identity.ticketId,'revoke');if(phase==='exchange_drift')f.mutate(s=>s.fence++);if(phase==='reply_loss')throw new TicketLifecycleUnknown();return 'synthetic_public_reply';},complete:async()=>{completes++;if(phase==='completion_loss')throw new TicketLifecycleUnknown();}});
   const p=await protocol.run({ticketId:c.identity.ticketId});assert.equal(p.ok,phase==='success');assert.equal(sends,phase==='before2'?0:1);assert.equal(completes,['success','completion_loss'].includes(phase)?1:0);
   if(!p.ok){assert.equal(p.error,phase==='before2'?'denied':'delivery_unknown');assert.equal(p.retryable,false);assert.equal(p.reconciliationRequired,phase!=='before2');}if(phase==='success')assert.equal(reads,4);
  }
 });
 await t.test('bound source inspect conditionally resolves only revocation and context still denies signed decision authority',async()=>{
  const f=fixture(false,true),c=f.registration();await f.store.register(c);
  await f.boundRead(async(source,db)=>{const p=await source.inspect(db,{binding:c.identity.binding,decisionId:c.identity.decisionId,purpose:c.identity.purpose,ticketId:c.identity.ticketId});
   assert.ok(!p.blockers.includes('bootstrap_ticket_revocation_unavailable'));assert.ok(p.blockers.includes('signed_current_decision_unavailable'));assert.equal(p.ok,false);
   await assert.rejects(source.context(db,c.identity.binding,c.identity.issuedAt,c.identity.ticketId),(e:any)=>e instanceof CanonicalBootstrapBlocked&&e.blockers.length===1&&e.blockers[0]==='signed_current_decision_unavailable');
  });
 });
 await t.test('reader rejects unbound released transactions and every caller authority override without writes',async()=>{
  const f=fixture(false,true),c=f.registration();await f.store.register(c);const before=f.state();let leaked:any;
  await f.boundRead(async(source,db)=>{leaked=db;for(const k of ['identity','revoked','current','force','retry','fence','signature','verifier'])assert.equal((await source.inspectTicketRevocation(db,{ticketId:c.identity.ticketId,[k]:true})).ok,false);});
  await assert.rejects(f.source.inspectTicketRevocation(leaked,{ticketId:c.identity.ticketId}),CanonicalBootstrapBlocked);assert.deepEqual(f.state(),before);
  assert.equal((await createTicketRevocationReadProtocol().run({ticketId:c.identity.ticketId})).ok,false);
 });
 await t.test('unapplied DDL keeps a single root/head and fingerprints every native guard/helper',()=>{
  const sql=readFileSync(migration,'utf8').replace(/\r/g,'');assert.match(sql,/SOURCE PROPOSAL \/ UNAPPLIED/);assert.match(sql,/ALTER TABLE worker_bootstrap_tickets ADD COLUMN lifecycle_identity JSONB/);
  assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1]),['worker_bootstrap_lifecycle_events','worker_bootstrap_write_receipts']);
  assert.doesNotMatch(sql,/DELETE FROM|TRUNCATE TABLE|UPDATE worker_bootstrap_tickets|DEFAULT /i);assert.match(sql,/CHECK\(%I IS NOT NULL OR \(%s\)\)/);
  const all=sql+readFileSync('prisma/migrations/20260923210000_worker_identity_lifecycle/migration.sql','utf8').replace(/\r/g,'');
  for(const spec of [...ticketOwnGuards.map(g=>({name:g.function,hash:g.hash})),...ticketHelpers]){
   const body=new RegExp('CREATE FUNCTION '+spec.name+'\\([^;]*?AS \\$\\$([\\s\\S]*?)\\$\\$;').exec(all)?.[1];assert.ok(body,spec.name);assert.equal(createHash('sha256').update(body!).digest('hex'),spec.hash,spec.name);
  }
  // Later additive migrations do not change this contract's position in the chain.
  assert.equal(readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)).sort().indexOf('20260924010000_bootstrap_ticket_lifecycle'),81);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
