import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {nativeAttestationFixture} from './decision-attestation-prisma-fixture';
import {createDecisionAuthorityReader,decisionReaderEvidence} from '../modules/api-keys/bootstrap-decision-authority-reader';
import {createDurableDispatchAdapter,type DispatchDependencies,type DispatchEntry} from '../modules/api-keys/bootstrap-dispatch-prisma';
import {dispatchGuards} from '../modules/api-keys/bootstrap-dispatch-guards';
import {dispatchDigest,type DispatchCommand,type DispatchRecord} from '../modules/api-keys/bootstrap-dispatch-contract';

export async function dispatchFixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment'){
 const f=nativeAttestationFixture(purpose);assert.equal((await f.execute('attest')).ok,true);assert.equal((await f.execute('seal')).ok,true);
 const reader=createDecisionAuthorityReader({ports:f.ports,qualification:'native_qualified_decision_read_ports_v1',evidence:decisionReaderEvidence,
  trust:{qualification:'synthetic_decision_reader_trust_v1',verifyOwnerAuthentication:async()=>true,trustPublicKey:async()=>true}});
 const attemptId=f.objects().find(o=>o.table==='worker_bootstrap_attempts')!.row.id as string,scope={...f.q,binding:f.b,purpose,attemptId};
 let ledger:DispatchEntry[]=[],xid=1000,committed=false,writes=0;
 const calls:{sql:string;mode:string;db:object}[]=[],dbs:object[]=[],controls={fault:'',phase:'',guard:'',atWrite:(()=>{}) as ()=>void,
  doubleCallback:false,fabricated:false};
 const deps:DispatchDependencies={qualification:'source_only_durable_dispatch_v1',decisionAuthority:reader,
  transaction:async(mode,work)=>{
   let lost=false;
   const result=await f.deps.transaction(mode,async base=>{
    const saved=structuredClone(ledger),writerXid=String(++xid);let wrote:DispatchRecord|null=null;
    const db:any={...base,$queryRaw:async(strings:any,...args:any[])=>{
     const sql=(Array.isArray(strings)?strings.join('?'):strings.sql).replace(/\s+/g,' ').trim(),values=Array.isArray(strings)?args:strings.values;
     calls.push({sql,mode,db});
     if(sql.includes('FROM pg_trigger')&&values[0]?.[0]===dispatchGuards[0].name){
      const rows:any[]=dispatchGuards.map(g=>({...g,enabled:true}));if(controls.guard==='missing')rows.pop();
      if(controls.guard==='disabled')rows[0].enabled=false;if(controls.guard==='body')rows[0].hash='0'.repeat(64);return rows;
     }
     if(sql.includes('SELECT id::text AS id FROM worker_bootstrap_attempts')){
      controls.atWrite();return values[0]===attemptId&&values[1]===scope.ticketId?[{id:attemptId}]:[];
     }
     if(sql.includes('AS "attemptHead"')){
      const a=f.objects().find(o=>o.table==='worker_bootstrap_attempts')!.row,
       h=f.objects().find(o=>o.table==='worker_bootstrap_history'&&o.row.revision===1)!.row,
       attemptHead={workspace_id:a.workspace_id,host_id:a.host_id,attempt_id:a.id,history_id:h.id,generation:a.generation,
        credential_epoch:a.credential_epoch,revision:h.revision,record_digest:h.record_digest,state:h.state};
      return f.objects().filter(o=>o.table==='worker_bootstrap_lifecycle_events'&&o.row.attempt_id===attemptId&&
       o.row.history_id===attemptHead?.history_id&&(o.row.record as any).action==='consume'&&(o.row.record as any).state==='consumed').map(o=>({attemptHead,ticketRow:o.row}));
     }
     if(sql.includes('AS "currentAttempt"')){
      const o=f.objects().find(o=>o.table==='worker_bootstrap_heads');
      return o?[{currentAttempt:o.row,id:o.receiptId,eventId:o.eventId,rowDigest:o.digest,writerXid:o.writerXid,fence:o.fence,verified:o.verified}]:[];
     }
     if(sql.includes('AS "currentTicket"')){
      const o=f.objects().filter(o=>o.table==='worker_bootstrap_lifecycle_events').at(-1);
      return o?[{currentTicket:(o.row as any).record,digest:(o.row as any).record_digest,id:o.receiptId,eventId:o.eventId,
       rowDigest:o.digest,writerXid:o.writerXid,fence:o.fence,verified:o.verified}]:[];
     }
     if(sql.includes('FROM worker_bootstrap_dispatch_history h')){
      if(mode==='read'&&committed&&controls.fault==='readback')throw Error('unavailable readback');
      const rows:any[]=structuredClone(ledger);
      if(mode==='read'&&committed&&controls.fault==='missing')rows.pop();
      if(mode==='read'&&committed&&controls.fault==='mismatch'&&rows.length)rows.at(-1).requestDigest='f'.repeat(64);
      if(controls.fault==='receipt'&&rows.length)rows.at(-1).verified=false;
      return rows;
     }
     if(sql.includes('operationCount')){
      const rows=await base.$queryRaw(strings,...args) as any[];
      // Mirror the strict current reader's complete-child requirement. Historical
      // seal readback is explicitly scoped to that operation's own receipts.
      if(!values.includes(true))for(const row of rows)if(row.operationTable==='worker_bootstrap_attempts'){
       if(f.objects().some(o=>o.row.attempt_id===attemptId&&!row.receipts.some((r:any)=>r.table===o.table&&r.rowId===o.rowId)))row.complete=false;
      }
      return rows;
     }
     return base.$queryRaw(strings,...args);
    },$executeRaw:async(strings:TemplateStringsArray,...values:any[])=>{
     const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push({sql,mode,db});assert.equal(mode,'write');
     assert.ok(sql.startsWith('INSERT INTO worker_bootstrap_dispatch_history'));writes++;
     const record=JSON.parse(values[4]) as DispatchRecord;wrote=record;
     assert.equal(record.attemptId,attemptId);assert.equal(record.revision,ledger.length+1);
     assert.equal(values[5],dispatchDigest(record));assert.equal(record.previousDigest,ledger.at(-1)?.recordDigest??null);
     assert.ok(!ledger.some(e=>e.record.operationId===record.operationId));
     ledger.push({record,recordDigest:values[5],requestDigest:values[6],rowDigest:reviewDigest({record,writerXid}),
      writerXid,fence:values[7],eventId:randomUUID(),verified:true});
     if(controls.phase===record.action&&controls.fault==='insert')throw Error('injected insert rollback');return 1;
    }};dbs.push(db);
    try{
     const value=await work(db);if(controls.doubleCallback)await work(db);
     const phase=!!wrote&&controls.phase===(wrote as DispatchRecord).action;
     if(mode==='write'&&phase){
      if(controls.fault==='rollback')throw Error('injected precommit rollback');
      if(controls.fault==='false')ledger=saved;else committed=true;
      if(controls.fault==='lost')lost=true;
     }
     return controls.fabricated?structuredClone(value):value;
    }catch(error){if(mode==='write')ledger=saved;throw error;}
   });
   if(lost)throw Error('lost COMMIT acknowledgement');return result;
  }};
 const factory=()=>createDurableDispatchAdapter({...deps});const adapter=factory();
 function command(action:DispatchCommand['action'],overrides:Partial<DispatchCommand>={}):DispatchCommand{
  const p=ledger.at(-1)?.record,claim=action==='claim'||action==='resume',operationId=randomUUID();
  return {...scope,operationId,action,expectedRevision:p?.revision??0,expectedDigest:p?dispatchDigest(p):null,
   ownerId:claim?randomUUID():p?.ownerId??null,ownerEpoch:(p?.ownerEpoch??0)+(claim?1:0),claimGeneration:(p?.claimGeneration??0)+(claim?1:0),
   leaseMs:claim?10000:null,responseDigest:['outcome','start_complete','complete'].includes(action)?p?.responseDigest??'a'.repeat(64):null,
   completionOperationId:action==='start_complete'?operationId:action==='complete'?p?.completionOperationId??null:null,
   evidenceDigest:['require_reconciliation','reconcile','recover','cancel'].includes(action)?'c'.repeat(64):null,...overrides};
 }
 async function step(action:DispatchCommand['action'],overrides:Partial<DispatchCommand>={}){
  const c=command(action,overrides),r=await adapter.execute(c);assert.equal(r.ok,true,JSON.stringify({action,r}));return r;
 }
 async function through(state:DispatchRecord['state']){
  for(const action of ['prepare','claim','start_send','outcome','start_complete','complete'] as const){
   await step(action);if(ledger.at(-1)?.record.state===state)return;
  }throw Error('state not reachable');
 }
 return {f,scope,reader,deps,adapter,factory,controls,command,step,through,calls,dbs,ledger:()=>ledger,
  head:()=>ledger.at(-1)?.record,counts:()=>({writes,events:ledger.length}),
  at:(ms:number)=>f.at(f.iso(ms).replace('Z','123Z')),
  clear:()=>{controls.fault='';controls.phase='';committed=false;}};
}
