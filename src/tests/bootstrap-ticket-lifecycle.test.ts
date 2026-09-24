import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {createPrismaTicketLifecycleStore,TicketLifecycleUnknown} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {createTicketLifecycleProtocol} from '../modules/api-keys/bootstrap-ticket-lifecycle-model';
import {lifecycleRegistration,lifecycleFlags,lifecycleIdentity} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {ticketGuards,ticketOwnGuards,ticketHelpers,ticketChannelHelper} from '../modules/api-keys/bootstrap-ticket-lifecycle-guards';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
const copy=<T>(v:T):T=>structuredClone(v),hash=(s:string)=>s.repeat(64),migration='prisma/migrations/20260924010000_bootstrap_ticket_lifecycle/migration.sql';
function fixture(atomicBinding=false){
 const f=bootstrapChannelFixture();let now=f.now().getTime(),tail=Promise.resolve(),fault='',current=true,available=true,verified=true,origin=true,writes=0,transactions=0;
 const guards:any[]=ticketGuards.map(g=>({...g,enabled:true})),helpers:any[]=[...ticketHelpers,ticketChannelHelper].map(h=>({...h,enabled:true}));
 const state:any={tickets:[],attempts:[],history:[],heads:[],audit:[],events:[],receipts:[],fence:10,channelCurrent:!atomicBinding},calls:string[]=[],options:any[]=[];
 const clock=()=>new Date(now),last=(id:string)=>state.events.filter((e:any)=>e.ticketId===id).at(-1);
 function registration(previous?:any){
  const base=copy(f.ticket),purpose=previous?'owner_recovery':'first_enrollment';if(previous){base.id=randomUUID();base.decisionId=randomUUID();base.intent.requestId=randomUUID();base.intent.target.id=randomUUID();}
  const identity:any={version:'bootstrap-ticket-revocation-proposal-v1',ticketId:base.id,ticketDigest:hash('0'),ownerId:base.ownerId,decisionId:base.decisionId,decisionRevision:1,purpose,binding:copy(f.snapshot.binding),
   generation:previous?previous.identity.generation+1:1,credentialEpoch:previous?previous.identity.credentialEpoch+1:1,issuedAt:f.iso(-1000),notBefore:f.iso(-500),expiresAt:f.iso(60000),
   hostGeneration:f.snapshot.hostGeneration,installationGeneration:f.snapshot.installationGeneration,issuerRevision:1,issuerHistoryDigest:hash('1'),channelGeneration:f.snapshot.generation,channelRevision:1,channelDigest:hash('2'),
   predecessor:previous?{ticketId:previous.identity.ticketId,ticketDigest:previous.identity.ticketDigest,attemptId:previous.head.attemptId,generation:previous.identity.generation,credentialEpoch:previous.identity.credentialEpoch,
    historyDigest:previous.digest,state:previous.head.state,workspaceId:f.snapshot.binding.workspaceId,hostId:f.snapshot.binding.hostId}:null};
  base.version='worker-bootstrap-owner-ticket-v2';base.intent.schemaVersion='worker-bootstrap-admission-v2';base.intent.purpose=purpose;base.intent.prior=copy(identity.predecessor);
  base.intent.baseline.enrollmentGeneration=identity.generation-1;base.intent.baseline.credentialHighWater=identity.credentialEpoch-1;base.intent.target.epoch=identity.credentialEpoch;
  identity.issuedAt=new Date(now-1000).toISOString();identity.notBefore=new Date(now-500).toISOString();identity.expiresAt=new Date(now+60000).toISOString();base.issuedAt=identity.issuedAt;base.intent.expiresAt=identity.expiresAt;
  const {ticketDigest,...metadata}=identity;base.lifecycle=metadata;base.decisionIntentDigest=reviewDigest(base.intent);
  const signed={payload:base,signature:'0'.repeat(128)};identity.ticketDigest=reviewDigest(signed);
  const decision={payload:{id:base.decisionId,revision:1,ownerId:base.ownerId,authority:'owner_reserved',state:'accepted',intentDigest:base.decisionIntentDigest,acceptedAt:f.iso(-2000),expiresAt:identity.expiresAt},signature:'0'.repeat(128)};
  return lifecycleRegistration.parse({operationId:randomUUID(),identity,record:{signed,decision}});
 }
 function receipt(kind:string,id:string,ticketId:string,record:unknown){
  state.fence++;if(fault==='fence')throw Error('synthetic');
  const event={id:randomUUID(),kind,ticketId,digest:reviewDigest(record)};state.audit.push(event);if(fault==='event')throw Error('synthetic');
  state.receipts.push({kind,id,ticketId,digest:event.digest,eventId:event.id,fence:String(state.fence)});if(fault==='audit')throw Error('synthetic');
 }
 const client:any={$transaction:async(work:any,option:any)=>{
  let release!:()=>void;const wait=tail;tail=new Promise<void>(r=>release=r);await wait;
  const saved=copy(state);let readOnly=false;options.push(option);if(option.isolationLevel==='Serializable')transactions++;
  const db:any={$executeRaw:async(strings:TemplateStringsArray,...v:any[])=>{
   const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push(sql);
   if(sql==='SET TRANSACTION READ ONLY'){readOnly=true;return 0;}assert.equal(readOnly,false);assert.equal(option.isolationLevel,'Serializable');writes++;
   if(sql.includes('synthetic_channel_binding')){state.channelCurrent=true;state.fence++;}
   else if(sql.startsWith('INSERT INTO worker_bootstrap_tickets')){
    assert.equal(current,true);const i=JSON.parse(v[15]),record=JSON.parse(v[12]);lifecycleRegistration.parse({operationId:randomUUID(),identity:i,record});
    const old=state.tickets.filter((t:any)=>t.identity.binding.workspaceId===i.binding.workspaceId&&t.identity.binding.hostId===i.binding.hostId).at(-1);
    assert.equal(state.tickets.some((t:any)=>t.identity.ticketId===i.ticketId),false);assert.equal(i.generation,(old?.identity.generation??0)+1);
    if(old){assert.equal(old.identity.version,i.version);const e=last(old.identity.ticketId);assert.equal(i.predecessor.historyDigest,reviewDigest(e));assert.equal(i.predecessor.attemptId,e.attemptId);assert.ok(['revoked','expired','delivery_unknown'].includes(e.state));}
    state.tickets.push({identity:i,record});receipt('root',i.ticketId,i.ticketId,{identity:i,record});
   }else if(sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events')){
    const e=JSON.parse(v[4]),p=last(e.ticketId);assert.equal(e.revision,(p?.revision??0)+1);assert.equal(e.previousDigest,p?reviewDigest(p):null);
    assert.equal(state.events.some((r:any)=>r.id===e.id),false);state.events.push(e);if(fault==='history')throw Error('synthetic');receipt('lifecycle',e.id,e.ticketId,e);
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
   if(sql.includes('AS ticket_lifecycle_available'))return [{ticket_lifecycle_available:available}];
   if(sql.includes('FROM pg_trigger'))return copy(guards).map(g=>({...g,enabled:g.enabled&&origin&&['Serializable','RepeatableRead'].includes(option.isolationLevel)}));
   if(sql.includes('FROM pg_proc'))return copy(helpers);
   if(sql.includes('AS ticket_fence'))return [{ticket_fence:String(state.fence)}];
   if(sql.startsWith('SELECT lifecycle_identity'))return copy(state.tickets.filter((t:any)=>t.identity.ticketId===v[0]));
   if(sql.startsWith('WITH objects')){
    const id=v[0],t=state.tickets.find((t:any)=>t.identity.ticketId===id);
    const valid=verified&&!!t&&state.receipts.some((r:any)=>r.kind==='root'&&r.id===id&&r.digest===reviewDigest(t))&&
     state.receipts.every((r:any)=>state.audit.some((a:any)=>a.id===r.eventId&&a.digest===r.digest))&&
     state.history.every((h:any)=>state.receipts.some((r:any)=>r.kind==='history'&&r.id===h.id&&r.digest===reviewDigest(h)));
    return state.events.filter((e:any)=>e.ticketId===id).map((e:any)=>{const a=state.receipts.find((r:any)=>r.kind==='lifecycle'&&r.id===e.id);return {record:copy(e),digest:reviewDigest(e),fence:a?.fence,verified:valid&&!!a&&a.digest===reviewDigest(e)};});
   }
   if(sql.startsWith('SELECT max(generation)')){const ts=state.tickets.filter((t:any)=>t.identity.binding.workspaceId===v[0]&&t.identity.binding.hostId===v[1]);return [{generation:Math.max(...ts.map((t:any)=>t.identity.generation)),credential:Math.max(...ts.map((t:any)=>t.identity.credentialEpoch)),complete:ts.every((t:any)=>!!t.identity.notBefore)}];}
   if(sql.startsWith('SELECT t.ticket_digest')){const t=state.tickets.find((t:any)=>t.identity.ticketId===v[0]),e=last(v[0]);return t&&e?[{digest:t.identity.ticketDigest,history:reviewDigest(e),attempt:e.attemptId,state:e.state,generation:t.identity.generation,credential:t.identity.credentialEpoch}]:[];}
   if(sql.includes('AS ticket_ledger_verified')){const e=last(v[0]);return [{ticket_ledger_verified:state.attempts.filter((a:any)=>a.ticketId===v[0]).length===(e.attemptId?1:0)&&
    (!e.attemptId||v[4]||state.heads.some((h:any)=>h.attemptId===e.attemptId&&h.id===e.historyId))}];}
   if(sql.includes('AS ticket_current'))return [{ticket_current:current&&(sql.includes('anchors_current')||state.channelCurrent)}];
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
 const store=createPrismaTicketLifecycleStore(client,clock,atomicBinding?{qualification:'unapplied_ticket_channel_binding_v1',
  bind:async db=>{await db.$executeRaw`SELECT 1 /* synthetic_channel_binding */`;}}:undefined);
 const inspect=async(id:string)=>{const p=await store.inspect({ticketId:id});assert.equal(p.ok,true);if(!p.ok)throw Error('denied');return p;};
 const command=async(ticketId:string,action:string,evidence?:unknown)=>{const p=await inspect(ticketId);return {ticketId,operationId:randomUUID(),expectedRevision:p.head.revision,expectedFence:p.fence,action,...(evidence?{evidence}:{})};};
 const transition=async(ticketId:string,action:string,evidence?:unknown)=>store.transition(await command(ticketId,action,evidence));
 function bootstrapPeer(p:any){return {payload:{binding:p.identity.binding,attemptId:p.head.attemptId,ticketDigest:p.identity.ticketDigest,certificateEpoch:1,
  origin:f.profile.origin,serverName:f.profile.serverName,pin:f.profile.certificate.fingerprint,caDigest:f.profile.trust.caDigest,
  certificateNotBefore:f.iso(-60000),certificateNotAfter:f.iso(120000),addresses:['8.8.8.8'],peerAddress:'8.8.8.8',resolverPolicy:'public_ipv4_only_v1',source:'issuer_signed_peer_observation_v1',
  chainValid:true,hostnameValid:true,observedAt:clock().toISOString(),expiresAt:new Date(now+30000).toISOString(),redirect:false,proxy:false,downgrade:false},signature:'0'.repeat(128)};}
 return {f,store,registration,inspect,command,transition,clock,bootstrapPeer,guards,helpers,calls,options,state:()=>copy(state),mutate:(fn:(s:any)=>void)=>fn(state),
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
  const f=fixture(),c=f.registration();c.identity.notBefore=f.f.iso(500);c.record.signed.payload.lifecycle.notBefore=c.identity.notBefore;c.identity.ticketDigest=reviewDigest(c.record.signed);
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
  const f=fixture(),c=f.registration();f.mutate(s=>s.channelCurrent=false);await f.store.register(c);assert.equal((await f.inspect(c.identity.ticketId)).usable,false);
  await assert.rejects(f.transition(c.identity.ticketId,'reserve'));f.mutate(s=>{s.channelCurrent=true;s.fence++;});assert.equal((await f.inspect(c.identity.ticketId)).usable,false);
  const g=fixture(true),d=g.registration();await g.store.register(d);assert.equal((await g.inspect(d.identity.ticketId)).usable,true);
  const root=g.calls.findIndex(s=>s.startsWith('INSERT INTO worker_bootstrap_tickets')),binding=g.calls.findIndex(s=>s.includes('synthetic_channel_binding')),receipt=g.calls.findIndex(s=>s.startsWith('INSERT INTO worker_bootstrap_lifecycle_events'));
  assert.ok(root<binding&&binding<receipt);assert.equal(g.counts().transactions,1);
 });
 await t.test('unapplied DDL keeps a single root/head and fingerprints every native guard/helper',()=>{
  const sql=readFileSync(migration,'utf8').replace(/\r/g,'');assert.match(sql,/SOURCE PROPOSAL \/ UNAPPLIED/);assert.match(sql,/ALTER TABLE worker_bootstrap_tickets ADD COLUMN lifecycle_identity JSONB/);
  assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1]),['worker_bootstrap_lifecycle_events','worker_bootstrap_write_receipts']);
  assert.doesNotMatch(sql,/DELETE FROM|TRUNCATE TABLE|UPDATE worker_bootstrap_tickets|DEFAULT /i);assert.match(sql,/CHECK\(%I IS NOT NULL OR \(%s\)\)/);
  const all=sql+readFileSync('prisma/migrations/20260923210000_worker_identity_lifecycle/migration.sql','utf8').replace(/\r/g,'');
  for(const spec of [...ticketOwnGuards.map(g=>({name:g.function,hash:g.hash})),...ticketHelpers]){
   const body=new RegExp('CREATE FUNCTION '+spec.name+'\\([^;]*?AS \\$\\$([\\s\\S]*?)\\$\\$;').exec(all)?.[1];assert.ok(body,spec.name);assert.equal(createHash('sha256').update(body!).digest('hex'),spec.hash,spec.name);
  }
  assert.equal(readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)).length,82);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
