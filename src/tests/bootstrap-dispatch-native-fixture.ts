import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {attestationNativeFixture,type Db} from './decision-attestation-native-fixture';
import {createPrismaDecisionAttestationPorts} from '../modules/api-keys/decision-attestation-prisma-ports';
import {createDecisionAuthorityReader,decisionReaderEvidence} from '../modules/api-keys/bootstrap-decision-authority-reader';
import {createDurableDispatchAdapter,type DispatchDependencies} from '../modules/api-keys/bootstrap-dispatch-prisma';
import {dispatchDigest,type DispatchCommand,type DispatchRecord} from '../modules/api-keys/bootstrap-dispatch-contract';

export function nativeDispatchHarness(admin:PrismaClient,clients:PrismaClient[],f:Awaited<ReturnType<typeof attestationNativeFixture>>,attemptId:string){
 const scope={...f.q,binding:f.reg.identity.binding,purpose:f.reg.identity.purpose,attemptId};
 const active=new WeakSet<object>(),traces:{mode:string;pid:number;client:number;at:string;phase:string|null;sql:string[]}[]=[],errors:string[]=[];
 let next=0,committed=false,writes=0;
 const controls={fault:'',beforeWrite:undefined as ((tx:Db)=>Promise<void>)|undefined,afterWrite:undefined as ((tx:Db)=>Promise<void>)|undefined};
 const ports=createPrismaDecisionAttestationPorts({transaction:async()=>{throw Error('Nested projection transaction forbidden');},
  verifier:{verify:async(tx,e)=>{assert.ok(active.has(tx));return f.deps.verifier!.verify(tx,e);}},
  ticketVerifier:{verify:async(tx,r)=>{assert.ok(active.has(tx));return f.deps.ticketVerifier!.verify(tx,r);}}});
 const reader=createDecisionAuthorityReader({ports,qualification:'native_qualified_decision_read_ports_v1',evidence:decisionReaderEvidence,
  trust:{qualification:'synthetic_decision_reader_trust_v1',verifyOwnerAuthentication:async(tx,e)=>{
   assert.ok(active.has(tx));return reviewDigest(e.auth)===reviewDigest(f.auth);},
  trustPublicKey:async(tx,e)=>{assert.ok(active.has(tx));return reviewDigest(e.key.material)===reviewDigest(f.material)&&e.highWater===f.material.epoch;}}});
 function transactionFor(start?:number):DispatchDependencies['transaction']{let local=start;return async(mode,work)=>{
   const index=(local===undefined?next++:local++)%clients.length,client=clients[index],falseAck=Error('false ACK');let observed:any,didWrite=false;
   try{
    const result=await client.$transaction(async tx=>{
     await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;if(mode==='read')await tx.$executeRaw`SET TRANSACTION READ ONLY`;
     const clock=(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid,transaction_timestamp()::text AS at,
      current_setting('transaction_read_only') AS ro,current_setting('transaction_isolation') AS isolation`)[0];
     assert.equal(clock.ro,mode==='read'?'on':'off');assert.equal(clock.isolation,mode==='read'?'repeatable read':'serializable');
     const trace={mode,pid:clock.pid,client:index,at:clock.at,phase:null as string|null,sql:[] as string[]};traces.push(trace);
     if(mode==='write'){
      await controls.beforeWrite?.(tx);
      if(controls.fault==='deferred')await tx.$executeRawUnsafe('CREATE CONSTRAINT TRIGGER native_dispatch_reject AFTER INSERT ON worker_bootstrap_dispatch_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION native_dispatch_fail()');
      if(controls.fault==='wire')await tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'");
     }
     const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);
      if(key==='$executeRaw'||key==='$executeRawUnsafe'||key==='$queryRaw'||key==='$queryRawUnsafe')return async(...args:any[])=>{
       const sql=(typeof args[0]==='string'?args[0]:Array.isArray(args[0])?args[0].join('?'):args[0].sql).replace(/\s+/g,' ').trim();trace.sql.push(sql);
       if(mode==='read'){assert.ok(key==='$queryRaw'||key==='$queryRawUnsafe');assert.match(sql,/^(SELECT|WITH)\b/);assert.doesNotMatch(sql,/FOR UPDATE|^(INSERT|UPDATE|DELETE)\b/);}
       const result=await (value as any).apply(target,args);
       if(sql.startsWith('INSERT INTO worker_bootstrap_dispatch_history')){
        writes++;didWrite=true;trace.phase=JSON.parse(args[5]).action;
        if(controls.fault==='insert')throw Error('injected after insert rollback');
       }
       if(mode==='read'&&committed&&sql.includes('FROM worker_bootstrap_dispatch_history h')){
        if(controls.fault==='readback')throw Error('independent readback unavailable');
        if(controls.fault==='missing')return result.slice(0,-1);
        if(controls.fault==='mismatch'&&result.length)result.at(-1).requestDigest='f'.repeat(64);
       }
       return result;
      };return typeof value==='function'?value.bind(target):value;}});
     active.add(proxy);try{observed=await work(proxy);}finally{active.delete(proxy);}
     if(mode==='write'){
      await controls.afterWrite?.(tx);
      if(controls.fault==='deferred_receipt'){
       // Corrupt only this uncommitted owned fixture operation; the actual
       // migration-84 deferred guard must reject it and roll everything back.
       await tx.$executeRaw`SET LOCAL session_replication_role=replica`;
       await tx.$executeRaw`DELETE FROM worker_bootstrap_dispatch_receipts WHERE operation_id=${observed.record.operationId}::uuid`;
       await tx.$executeRaw`SET LOCAL session_replication_role=origin`;
      }
      if(controls.fault==='rollback')throw Error('injected precommit rollback');
      if(controls.fault==='false')throw falseAck;
      if(controls.fault==='connection')await admin.$queryRaw`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=current_database() AND pid=${clock.pid}`;
     }
     return observed;
    },{isolationLevel:mode==='read'?'RepeatableRead':'Serializable',maxWait:60000,timeout:30000});
    if(mode==='write'&&didWrite){committed=true;if(controls.fault==='lost')throw Error('lost COMMIT ACK');}return result;
   }catch(e:any){if(e===falseAck)return observed;
    errors.push(String(e.meta?.code??e.code??'error')+':'+String(e.meta?.message??e.message).slice(0,400));throw e;}
  };}
 const deps:DispatchDependencies={qualification:'source_only_durable_dispatch_v1',decisionAuthority:reader,transaction:transactionFor()};
 const factory=(clientIndex?:number)=>createDurableDispatchAdapter({...deps,transaction:clientIndex===undefined?deps.transaction:transactionFor(clientIndex)}),adapter=factory();
 async function rows(){return admin.$queryRaw<any[]>`SELECT * FROM worker_bootstrap_dispatch_history WHERE attempt_id=${attemptId}::uuid ORDER BY revision`;}
 async function head():Promise<DispatchRecord|null>{return (await rows()).at(-1)?.record??null;}
 async function command(action:DispatchCommand['action'],extras:Partial<DispatchCommand>={}):Promise<DispatchCommand>{
  const p=await head(),claim=action==='claim'||action==='resume',operationId=randomUUID();
  return {...scope,operationId,action,expectedRevision:p?.revision??0,expectedDigest:p?dispatchDigest(p):null,ownerId:claim?randomUUID():p?.ownerId??null,
   ownerEpoch:(p?.ownerEpoch??0)+(claim?1:0),claimGeneration:(p?.claimGeneration??0)+(claim?1:0),leaseMs:claim?30000:null,
   responseDigest:['outcome','start_complete','complete'].includes(action)?p?.responseDigest??reviewDigest('synthetic response'):null,
   completionOperationId:action==='start_complete'?operationId:action==='complete'?p?.completionOperationId??null:null,
   evidenceDigest:['require_reconciliation','reconcile','recover','cancel'].includes(action)?reviewDigest('explicit synthetic owner disposition'):null,...extras};
 }
 async function step(action:DispatchCommand['action'],extras:Partial<DispatchCommand>={}){
  const r=await adapter.execute(await command(action,extras));assert.equal(r.ok,true,JSON.stringify({action,result:r,errors:errors.slice(-3)}));return r;
 }
 async function through(state:DispatchRecord['state'],leaseMs=30000){
  for(const action of ['prepare','claim','start_send','outcome','start_complete','complete'] as const){await step(action,action==='claim'?{leaseMs}:{});
   if((await head())?.state===state)return;}throw Error('invalid fixture target');
 }
 return {f,scope,reader,deps,adapter,factory,controls,traces,errors,rows,head,command,step,through,active,transactionFor,counts:()=>({writes}),
  clear:()=>{controls.fault='';controls.beforeWrite=undefined;controls.afterWrite=undefined;committed=false;}};
}
export type NativeDispatchHarness=ReturnType<typeof nativeDispatchHarness>;
