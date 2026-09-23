import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {bootstrapTicketRevocationGap,revocationIdentity,revocationWriters,nextRevocationEvent,inspectTicketRevocationModel,createTicketRevocationModel,RevocationModelUnknown} from '../modules/api-keys/bootstrap-ticket-revocation-contract';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
const hash=(s:string)=>s.repeat(64),copy=<T>(x:T):T=>structuredClone(x);
function fixture(recovery=false){
 const f=bootstrapChannelFixture(),b=f.snapshot.binding;let clock=f.now().getTime(),reads=0,exchanges=0,commits=0,tail=Promise.resolve(),fault='';
 const i:any={version:'bootstrap-ticket-revocation-proposal-v1',ticketId:f.ticket.id,ticketDigest:hash('5'),ownerId:f.ticket.ownerId,decisionId:f.ticket.decisionId,decisionRevision:1,
  purpose:recovery?'owner_recovery':'first_enrollment',binding:b,generation:recovery?2:1,credentialEpoch:recovery?2:1,issuedAt:f.iso(-1000),notBefore:f.iso(-500),expiresAt:f.iso(60000),
  hostGeneration:f.snapshot.hostGeneration,installationGeneration:f.snapshot.installationGeneration,issuerRevision:1,issuerHistoryDigest:hash('1'),channelGeneration:f.snapshot.generation,channelRevision:1,channelDigest:hash('2'),
  predecessor:recovery?{ticketId:randomUUID(),ticketDigest:hash('6'),attemptId:null,generation:1,credentialEpoch:1,historyDigest:hash('7'),state:'revoked',workspaceId:b.workspaceId,hostId:b.hostId}:null};
 const p:any={qualification:'synthetic_ticket_revocation_proof_v1',identity:i,history:[],audit:[],generationHighWater:i.generation,credentialHighWater:i.credentialEpoch,fence:10,
  mode:'read_only_repeatable_read',origin:true,guards:revocationWriters.map(writer=>({writer,enabled:true,binding:'exact',definition:'reviewed',configuration:'exact'})),
  current:{identityDigest:reviewDigest(i),owner:true,lifecycle:true,issuer:true,channel:true,predecessorDigest:i.predecessor?.historyDigest??null}};
 const now=()=>new Date(clock);function append(action:string){const e=nextRevocationEvent(i,p.history,{id:randomUUID(),action,expectedRevision:p.history.length},action==='issue'?new Date(i.issuedAt):now());
  p.fence++;if(fault==='fence')throw Error('synthetic');p.history.push(e);if(fault==='history')throw Error('synthetic');p.audit.push({eventId:e.id,eventDigest:reviewDigest(e),fence:p.fence});if(fault==='audit')throw Error('synthetic');commits++;}
 append('issue');const hooks:{read?:(n:number)=>Promise<void>;exchange?:()=>Promise<void>}={};
 async function commit(action:string,expectedDigest?:string){let release!:()=>void;const previous=tail;tail=new Promise<void>(r=>release=r);await previous;const before=copy(p);
  try{const selected=inspectTicketRevocationModel(p,now());if(expectedDigest&&selected.digest!==expectedDigest)throw Error('CAS changed');append(action);if(fault==='rollback')throw Error('synthetic');if(fault==='unknown')throw new RevocationModelUnknown();}
  catch(e){if(!(e instanceof RevocationModelUnknown)){Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,before);}throw e;}finally{release();}}
 const dependencies={qualification:'synthetic_ticket_revocation_model_v1' as const,read:async(id:string)=>{assert.equal(id,i.ticketId);reads++;await hooks.read?.(reads);return copy(p);},
  mutate:async(id:string,action:'consume'|'send'|'complete',digest:string)=>{assert.equal(id,i.ticketId);await commit(action,digest);},exchange:async()=>{exchanges++;await hooks.exchange?.();}};
 return {i,p,now,iso:f.iso,hooks,commit,model:createTicketRevocationModel(dependencies,now),input:()=>({ticketId:i.ticketId}),at:(ms:number)=>clock=Date.parse(f.iso(ms)),fault:(v:string)=>fault=v,counts:()=>({reads,exchanges,commits})};
}
test('source-only bootstrap ticket revocation proposal and denial model',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
 await t.test('canonical source retains explicit revocation and signed-decision blockers and default model denies',async()=>{
  const f=fixture(),source=createCanonicalBootstrapAuthoritySource(f.now),db:any={$queryRaw:async()=>[{revision:'1',isolation:'repeatable read',readonly:'on'}]};
  const release=await source.bindTransaction!(db,'read');try{await assert.rejects(source.ticketRevoked(db,f.i.ticketId),(e:any)=>e instanceof CanonicalBootstrapBlocked&&e.blockers.includes('bootstrap_ticket_revocation_unavailable'));
   await assert.rejects(source.decision(db,f.i.decisionId),(e:any)=>e instanceof CanonicalBootstrapBlocked&&e.blockers.includes('signed_current_decision_unavailable'));
   const projection=await source.inspect(db,{});assert.deepEqual(projection.ticketRevocationAuthority,bootstrapTicketRevocationGap);
  }finally{release();}assert.equal((await createTicketRevocationModel().run(f.input())).ok,false);
 });
 await t.test('immutable exact identity requires explicit notBefore and terminal recovery predecessor',()=>{
  const f=fixture(true);assert.ok(revocationIdentity.safeParse(f.i).success);assert.equal(f.i.predecessor.attemptId,null); // Pre-consume revoke cannot be expressed by current v1 prior.attemptId.
  for(const change of [(i:any)=>delete i.notBefore,(i:any)=>i.notBefore=i.expiresAt,(i:any)=>i.predecessor.state='completed',(i:any)=>i.predecessor.hostId=randomUUID(),(i:any)=>i.generation=1,(i:any)=>i.credentialEpoch=1]){const i=copy(f.i);change(i);assert.equal(revocationIdentity.safeParse(i).success,false);}
  f.p.current.predecessorDigest=hash('0');assert.throws(()=>inspectTicketRevocationModel(f.p,f.now()));
 });
 await t.test('issue, consume, dispatch and completion require paired fresh reads; all production flags remain false',async()=>{
  for(const recovery of [false,true]){const f=fixture(recovery),r=await f.model.run(f.input());assert.equal(r.ok,true);assert.equal(f.p.history.at(-1).state,'completed');assert.equal(f.counts().reads,10);assert.equal(f.counts().exchanges,1);
  for(const flag of ['implementationReady','executionSupported','pilotReady','liveAdmissionAllowed','pilotExecutionAuthorized','pilotExecutionStarted','transportQualified','launchAuthority'])assert.equal((r as any)[flag],false);
  await assert.rejects(f.commit('consume'));assert.equal((await f.model.run(f.input())).ok,false);assert.ok(Object.isFrozen(inspectTicketRevocationModel(f.p,f.now()).head));}
 });
 await t.test('revoke before consume and between consume/send prevents every exchange',async()=>{
  const first=fixture();await first.commit('revoke');assert.equal((await first.model.run(first.input())).ok,false);assert.equal(first.counts().exchanges,0);
  for(const phase of [2,3,4]){const f=fixture();f.hooks.read=async n=>{if(n===phase)await f.commit('revoke');};const r=await f.model.run(f.input());assert.equal(r.ok,false);assert.equal(f.counts().exchanges,0);assert.equal(f.p.history.at(-1).state,'revoked');}
 });
 await t.test('revoke after possible commit is terminal unknown and reconciliation never un-revokes',async()=>{
  for(const phase of ['send','exchange','completion','completed']){const f=fixture();if(phase==='send'||phase==='completion')f.hooks.read=async n=>{if(n===(phase==='send'?5:9))await f.commit('revoke');};else if(phase==='exchange')f.hooks.exchange=()=>f.commit('revoke');
   const r=await f.model.run(f.input());if(phase==='completed'){assert.equal(r.ok,true);await f.commit('revoke');}else assert.equal('error'in r&&r.error,'delivery_unknown');
   assert.equal(f.p.history.at(-1).state,'delivery_unknown');assert.equal(f.p.history.at(-1).revoked,true);await f.commit('reconcile');assert.equal(f.p.history.at(-1).revoked,true);
   for(const action of ['consume','send','complete','issue','revoke','reconcile'])await assert.rejects(f.commit(action));assert.equal(f.counts().exchanges,phase==='send'?0:1);
  }
 });
 await t.test('notBefore and expiry fail closed without opportunistic status writes',async()=>{
  const f=fixture();f.at(-750);const before=copy(f.p);assert.equal((await f.model.status(f.input()) as any).usable,false);assert.equal((await f.model.run(f.input())).ok,false);assert.deepEqual(f.p,before);
  f.at(60000);assert.equal((await f.model.status(f.input()) as any).usable,false);assert.deepEqual(f.p,before);await f.commit('expire');assert.equal(f.p.history.at(-1).state,'expired');await assert.rejects(f.commit('consume'));
  const g=fixture();await g.commit('consume');await g.commit('send');g.at(60000);await g.commit('expire');assert.equal(g.p.history.at(-1).state,'delivery_unknown');
 });
 await t.test('twenty concurrent consume attempts racing revoke serialize without revival or duplicate consume',async()=>{
  for(const revokeFirst of [true,false]){const f=fixture();const consume=()=>f.commit('consume'),revoke=()=>f.commit('revoke');
   const work=revokeFirst?[revoke(),...Array.from({length:20},consume)]:[...Array.from({length:20},consume),revoke()];await Promise.allSettled(work);
   assert.equal(f.p.history.filter((e:any)=>e.action==='consume').length,revokeFirst?0:1);assert.equal(f.p.history.at(-1).state,'revoked');assert.equal(f.p.history.filter((e:any)=>e.action==='revoke').length,1);assert.equal(f.counts().exchanges,0);
  }
 });
 await t.test('fence/high-water ABA, identity changes and fabricated history cannot restore authority',async()=>{
  for(const change of [(p:any)=>p.fence++,(p:any)=>p.generationHighWater++,(p:any)=>p.credentialHighWater++,(p:any)=>p.identity.ticketDigest=hash('0'),(p:any)=>p.identity.ownerId=randomUUID(),
   (p:any)=>p.identity.hostGeneration=randomUUID(),(p:any)=>p.identity.issuerRevision++,(p:any)=>p.identity.channelDigest=hash('0'),(p:any)=>p.history[0]={...p.history[0],state:'consumed'},
   (p:any)=>p.current.owner=false,(p:any)=>p.current.lifecycle=false,(p:any)=>p.current.issuer=false,(p:any)=>p.current.channel=false]){
   const f=fixture();change(f.p);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=fixture();await f.commit('consume');await f.commit('revoke');f.p.history.pop();f.p.audit.pop();assert.throws(()=>inspectTicketRevocationModel(f.p,f.now()));
 });
 await t.test('rollback restores history/audit/fence and possible COMMIT never retries a mutation',async()=>{
  for(const fault of ['fence','history','audit','rollback']){const f=fixture(),before=copy(f.p);f.fault(fault);await assert.rejects(f.commit('consume'));assert.deepEqual(f.p,before);}
  const f=fixture();f.fault('unknown');const r=await f.model.run(f.input());assert.equal('error'in r&&r.error,'reconciliation_required');assert.equal(f.p.history.length,2);assert.equal(f.counts().exchanges,0);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.p.history.length,2);
 });
 await t.test('every writer proof missing/disabled/rebound/changed/configured, replica and legacy fails closed',async()=>{
  for(let n=0;n<revocationWriters.length;n++)for(const mode of ['missing','disabled','rebound','changed','config']){const f=fixture();if(mode==='missing')f.p.guards.splice(n,1);else if(mode==='disabled')f.p.guards[n].enabled=false;else if(mode==='rebound')f.p.guards[n].binding='other';else if(mode==='changed')f.p.guards[n].definition='other';else f.p.guards[n].configuration='other';
   assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
  for(const change of [(p:any)=>p.origin=false,(p:any)=>p.mode='serializable',(p:any)=>p.audit=[],(p:any)=>delete p.identity.notBefore,(p:any)=>p.qualification='canonical']){const f=fixture();change(f.p);assert.equal((await f.model.run(f.input())).ok,false);}
 });
 await t.test('inspect/status is read-only and rejects all authority/network overrides',async()=>{
  const f=fixture(),before=copy(f.p);for(let n=0;n<3;n++)assert.equal((await f.model.status(f.input())).ok,true);assert.deepEqual(f.p,before);
  for(const key of ['revoked','notBefore','generation','identity','purpose','url','headers','ticketDigest','fence','guards']){assert.equal((await f.model.run({...f.input(),[key]:'override'})).ok,false);assert.equal((await f.model.status({...f.input(),[key]:'override'})).ok,false);}assert.deepEqual(f.p,before);
  await assert.rejects(f.commit('delete'));assert.deepEqual(f.p,before);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
