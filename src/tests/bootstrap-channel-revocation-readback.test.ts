import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';
import dns from 'node:dns';import childProcess from 'node:child_process';
import {channelRevocationEvidence} from './bootstrap-channel-revocation-fixture';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {createPrismaBootstrapChannelStore,ChannelReconciliationRequired} from '../modules/api-keys/bootstrap-channel-store';
import {channelGrant,advanceChannel,type ChannelTransition} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {channelGuards,channelShapeHash} from '../modules/api-keys/bootstrap-channel-guards';
import {decisionAttestationGuards,decisionAttestationHelpers} from '../modules/api-keys/decision-attestation-adapter';
import {validateChannelRevocationEvidence} from '../modules/api-keys/bootstrap-channel-revocation-readback';

const copy=<T>(v:T):T=>structuredClone(v);
function fixture(decisions=2){
 const f=bootstrapChannelFixture(),b=f.snapshot.binding;
 const grant=channelGrant.parse({id:randomUUID(),intent:{schemaVersion:'worker-bootstrap-channel-v1',ticketId:f.ticket.id,
  ticketDigest:'5'.repeat(64),expectedRevision:0,snapshot:f.snapshot},ownerId:f.ticket.ownerId,decisionId:randomUUID(),
  decisionRevision:1,acceptanceId:randomUUID(),at:f.iso()});
 const initial=advanceChannel(grant,null,'grant',grant.id,f.now());
 const scope={workspaceId:b.workspaceId,hostId:b.hostId,generationId:f.snapshot.generation,ticketId:f.ticket.id};
 const head=(r:ChannelTransition)=>({id:r.id,revision:r.revision,highWater:1,purpose:f.snapshot.purpose,state:r.state,
  generation:scope.generationId,pin:f.snapshot.leafPin,record:copy(r),fence:'100',verified:true});
 let state={record:initial,fence:100,proof:null as ReturnType<typeof channelRevocationEvidence>|null};
 let fault='',writes=0,writeCallbacks=0,reads=0,guardFault=false;
 const calls:{sql:string;readonly:boolean}[]=[],options:any[]=[];
 let edit:((proof:NonNullable<typeof state.proof>)=>void)|undefined;
 const client:any={$transaction:async(work:any,option:any)=>{
  options.push(option);const read=option.isolationLevel==='RepeatableRead';if(read)reads++;else writeCallbacks++;
  const before=copy(state);let readonly=false;
  if(read&&fault==='omit_read_callback')return;
  const db:any={$executeRaw:async(strings:TemplateStringsArray,...v:any[])=>{
   const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push({sql,readonly});
   if(sql==='SET TRANSACTION READ ONLY'){assert.ok(read);readonly=true;return 0;}
   assert.equal(read,false);assert.equal(readonly,false);assert.ok(sql.startsWith('WITH v AS'));writes++;
   state.record=JSON.parse(v[0]);state.proof=channelRevocationEvidence(state.record,scope,state.fence,'900',decisions);
   state.fence=Number(state.proof.witness.toFence);return 1;
  },$queryRaw:async(strings:TemplateStringsArray,...v:any[])=>{
   const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push({sql,readonly});if(read)assert.ok(readonly);
   if(sql.includes('AS channel_available'))return [{channel_available:true}];
   if(sql.includes('decision_attestation_available'))return [{decision_attestation_available:!guardFault}];
   if(sql.includes('FROM pg_trigger')){
    const guards=(v[0] as string[]).includes('aa_decision_attestation_fence')?decisionAttestationGuards:channelGuards;
    return guards.map(g=>({...g,enabled:true}));
   }
   if(sql.includes('FROM pg_proc'))return sql.includes('transport_bootstrap_shape')?[{hash:channelShapeHash,enabled:true}]:decisionAttestationHelpers.map(h=>({...h,enabled:true}));
   if(sql.includes('AS channel_fence'))return [{channel_fence:String(state.fence)}];
   if(sql.includes('AS channel_grant'))return [{channel_grant:copy(grant),verified:true}];
   if(sql.includes('channel_revoke_witness'))return [{writerXid:'900',toFence:String(state.fence)}];
   if(sql.includes('AS channel_revoke_base')){
    if(!state.proof||v[0]!==state.record.id||fault==='missing_readback')return [];
    const p=copy(state.proof);p.base.currentFence=String(state.fence);edit?.(p);
    return [{channel_revoke_base:p.base}];
   }
   if(sql.includes('AS channel_revoke_lineage')){const p=copy(state.proof!);edit?.(p);return [{channel_revoke_lineage:p.lineage}];}
   if(sql.includes('FROM worker_transport_heads'))return [head(state.record)];
   if(sql.startsWith('SELECT record_digest AS digest'))return [{digest:'a'.repeat(64)}];
   assert.fail(`unexpected read: ${sql}`);
  }};
  try{
   const result=await work(db);
   if(!read){
    if(fault==='repeat_write_callback')await work(db);
    if(fault==='false_ack'){state=before;return result;}
    if(fault==='unknown_commit')throw Error('lost commit response');
    if(fault==='concurrent_source')state.fence++;
    if(fault==='replace_write_result')return {...result,id:randomUUID()};
   }else{
    if(fault==='repeat_read_callback')await work(db);
    if(fault==='lost_read_response')throw Error('lost independent read response');
    if(fault==='replace_read_result')return {...result,id:randomUUID()};
   }
   return result;
  }catch(e){if(!read&&fault!=='unknown_commit')state=before;throw e;}
 }};
 return {store:createPrismaBootstrapChannelStore(client,f.now),calls,options,scope,
  command:()=>({ticketId:f.ticket.id,operationId:randomUUID(),expectedRevision:1,action:'revoke'}),
  record:()=>copy(state.record),proof:()=>copy(state.proof!),counts:()=>({writes,writeCallbacks,reads}),
  fault:(s:string)=>fault=s,edit:(fn:typeof edit)=>edit=fn,guards:(missing:boolean)=>guardFault=missing};
}
const requiresReconciliation=(e:unknown)=>e instanceof ChannelReconciliationRequired&&e.code==='reconciliation_required'&&e.retryable===false&&e.deliveryUnknown===true;

test('source-only legacy channel revoke committed readback',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);

 await t.test('legacy exact catalog needs no migration 83; attested roots have complete causal epochs',async()=>{
  for(const n of [0,1,3]){
   const f=fixture(n);if(n===0)f.guards(true);
   const r=await f.store.transition(f.command());assert.equal(r.action,'revoke');assert.deepEqual(r,f.record());
   const p=f.proof();assert.equal(p.base.currentFence,String(104+2*n));
   assert.equal(p.base.receipts[1].fence,p.base.receipts[2].fence);
   if(n){
    assert.equal(p.lineage.receipts[0].fence,p.base.receipts[0].fence);
    assert.equal(p.lineage.receipts[n+1].fence,p.base.receipts[2].fence);
   }
   assert.deepEqual(validateChannelRevocationEvidence(r,p.base,n?p.lineage:undefined,p.witness).record,r);
   assert.equal(f.calls.some(c=>c.sql.includes('AS channel_revoke_lineage')),n>0);
   assert.deepEqual(f.counts(),{writes:1,writeCallbacks:1,reads:1});
  }
 });
 const mutations:Record<string,(p:any)=>void>={
  'missing native receipt':p=>p.base.receipts.pop(),
  'duplicate native receipt':p=>p.base.receipts[2]=copy(p.base.receipts[1]),
  'foreign native XID':p=>p.base.receipts[0].writerXid='901',
  'foreign native generation':p=>p.base.receipts[0].generationId=randomUUID(),
  'wrong native head':p=>p.base.receipts[0].rowId=randomUUID(),
  'wrong native operation row':p=>p.base.receipts[2].rowId=randomUUID(),
  'native digest verification fails':p=>p.base.receipts[2].verified=false,
  'native audit epoch differs':p=>p.base.receipts[1].fence='105',
  'missing source receipt':p=>p.lineage.receipts.pop(),
  'duplicate source receipt':p=>p.lineage.receipts.push(copy(p.lineage.receipts[0])),
  'duplicate source object identity':p=>p.lineage.receipts[1]={...p.lineage.receipts[0],id:randomUUID(),eventId:randomUUID()},
  'duplicate receipt id':p=>p.lineage.receipts[1].id=p.lineage.receipts[0].id,
  'duplicate Event id':p=>p.lineage.receipts[1].eventId=p.lineage.receipts[0].eventId,
  'foreign source writer':p=>p.lineage.receipts[1].writerXid='901',
  'foreign source workspace':p=>p.lineage.receipts[1].workspaceId=randomUUID(),
  'unrelated receipt':p=>p.lineage.receipts[1].table='api_keys',
  'unrelated own object':p=>p.lineage.objects[1].table='api_keys',
  'missing authority object':p=>p.lineage.objects.pop(),
  'duplicate authority object':p=>p.lineage.objects[2]=copy(p.lineage.objects[1]),
  'source digest mismatch':p=>p.lineage.receipts[0].digest='b'.repeat(64),
  'authority source digest mismatch':p=>p.lineage.objects[1].authority.sourceDigest='b'.repeat(64),
  'wrong source operation':p=>p.lineage.receipts[0].operation='INSERT',
  'wrong authority parent table':p=>p.lineage.objects[1].authority.sourceTable='api_keys',
  'wrong authority parent row':p=>p.lineage.objects[1].authority.sourceRow=randomUUID(),
  'foreign decision root':p=>p.lineage.objects[1].authority.decisionId=randomUUID(),
  'duplicate decision root':p=>p.lineage.decisions[1]=p.lineage.decisions[0],
  'missing decision root':p=>p.lineage.decisions.pop(),
  'unexplained concurrent epoch':p=>p.base.currentFence=String(Number(p.base.currentFence)+1),
  'regressed current fence':p=>p.base.currentFence='100',
  'stale source epoch':p=>p.lineage.receipts[0].fence='100',
  'authority receipt epoch gap':p=>p.lineage.receipts[1].fence='105',
  'same epoch is not permission to duplicate an authority child':p=>{p.lineage.objects[2].authority.fence='104';p.lineage.receipts[2].fence='104';},
  'Event/head/root/record SQL predicate fails':p=>p.base.verified=false,
  'source Event/digest/predecessor SQL predicate fails':p=>p.lineage.receipts[1].verified=false,
  'operation revision mismatch':p=>p.base.operation.revision++,
  'operation predecessor mismatch':p=>p.base.operation.previousId=randomUUID(),
  'operation grant mismatch':p=>p.base.operation.grantId=randomUUID(),
  'replayed operation writer against captured witness':p=>{p.base.writerXid='901';for(const r of [...p.base.receipts,...p.lineage.receipts])r.writerXid='901';},
  'resetting the fence does not rebase the witness':p=>{
   p.base.currentFence=String(Number(p.base.currentFence)+1);
   for(const r of [...p.base.receipts,...p.lineage.receipts])r.fence=String(Number(r.fence)+1);
   for(const o of p.lineage.objects)if(o.authority)o.authority.fence=String(Number(o.authority.fence)+1);
  }
 };
 for(const [name,mutate] of Object.entries(mutations))await t.test(name,async()=>{
  const f=fixture();f.edit(mutate);await assert.rejects(f.store.transition(f.command()),requiresReconciliation);
  assert.deepEqual(f.counts(),{writes:1,writeCallbacks:1,reads:1});
 });
 await t.test('unknown/false commit and transport faults never retry the writer',async()=>{
  for(const fault of ['false_ack','unknown_commit','missing_readback','concurrent_source','omit_read_callback','repeat_write_callback','repeat_read_callback','replace_write_result','lost_read_response']){
   const f=fixture();f.fault(fault);await assert.rejects(f.store.transition(f.command()),requiresReconciliation,fault);
   assert.equal(f.counts().writes,1,fault);assert.equal(f.counts().writeCallbacks,1,fault);
  }
 });
 await t.test('lost post-COMMIT response requires explicit exact idempotent READ ONLY reconciliation',async()=>{
  const f=fixture();f.fault('unknown_commit');await assert.rejects(f.store.transition(f.command()),requiresReconciliation);
  assert.equal(f.counts().reads,0);const record=f.record();f.fault('');const before=f.calls.length;
  for(let i=0;i<2;i++)assert.deepEqual(await f.store.reconcileRevocation(record),record);
  assert.equal(f.counts().writes,1);assert.equal(f.counts().writeCallbacks,1);
  const calls=f.calls.slice(before);assert.ok(calls.every(c=>c.sql==='SET TRANSACTION READ ONLY'||c.readonly));
  assert.ok(calls.every(c=>c.sql.startsWith('SELECT')||c.sql.startsWith('WITH target AS')||c.sql==='SET TRANSACTION READ ONLY'));
  assert.ok(f.options.slice(1).every(o=>o.isolationLevel==='RepeatableRead'));
  for(const wrong of [{...record,id:randomUUID()},{...record,grantId:randomUUID()},{...record,revision:record.revision+1},
   {...record,at:'2030-01-01T00:00:00.001Z'},{...record,action:'consume',state:'current'}])
   await assert.rejects(f.store.reconcileRevocation(wrong),requiresReconciliation);
  assert.equal(f.counts().writes,1);
 });
 await t.test('reconciliation cannot repair missing/foreign evidence or fabricate callback results',async()=>{
  for(const mutate of Object.values(mutations).slice(0,-2)){
   const f=fixture();await f.store.transition(f.command());f.edit(mutate);
   await assert.rejects(f.store.reconcileRevocation(f.record()),requiresReconciliation);assert.equal(f.counts().writes,1);
  }
  for(const fault of ['omit_read_callback','repeat_read_callback','replace_read_result','lost_read_response']){
   const f=fixture();await f.store.transition(f.command());f.fault(fault);
   await assert.rejects(f.store.reconcileRevocation(f.record()),requiresReconciliation);assert.equal(f.counts().writes,1);
  }
 });
 await t.test('attested causal tail requires full pinned catalog; inspection cannot repair it',async()=>{
  const f=fixture();f.guards(true);await assert.rejects(f.store.transition(f.command()),requiresReconciliation);
  await assert.rejects(f.store.reconcileRevocation(f.record()),requiresReconciliation);
  assert.ok((await f.store.inspect(f.scope.ticketId)).blockers.length);assert.equal(f.counts().writes,1);
 });
 assert.equal(effects,0);
});
