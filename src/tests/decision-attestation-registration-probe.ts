import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {attestationNativeFixture,NativeRegistrationDenied,owned,type RegistrationProbe} from './decision-attestation-native-fixture';

// Bounded, serial, fresh-fixture experiment. No operation is retried; the first
// denial stops this experiment with its exact in-memory diagnostic.
export async function registrationProbe(){
 const db=new PrismaClient(),started=Date.now();let registered=0,sealed=0;
 try{await db.$connect();await owned(db);
  for(let n=0;n<48;n++){
   assert.ok(Date.now()-started<180000,'registration experiment time budget');
   const f=await attestationNativeFixture(db,{registrationProbe:{}});registered++;
   if(n%8===0){await f.ready();assert.equal((await f.ports.execute(await f.command('attest'))).ok,true,JSON.stringify(f.errors));
    assert.equal((await f.ports.execute(await f.command('seal'))).ok,true,JSON.stringify(f.errors));sealed++;}
  }
 }finally{await db.$disconnect();console.log(JSON.stringify({registrationExperiment:{registered,sealed,elapsedMs:Date.now()-started,retries:0}}));}
}

// Pairwise schedule matrix, not a stress test. Every row gets a fresh identity;
// controls deliberately violate one invariant and never replay their operation.
export async function registrationMatrix(){
 const db=new PrismaClient(),other=new PrismaClient(),started=Date.now();
 const variants=[
  {id:'tx_before_after_no_preread',offset:-1,measurement:'after',pre:false},
  {id:'tx_after_after_no_preread',offset:1,measurement:'after',pre:false},
  {id:'tx_before_before_preread',offset:-1,measurement:'before',pre:true},
  {id:'tx_after_before_preread',offset:1,measurement:'before',pre:true},
  {id:'separate_transaction',offset:1,measurement:'after',pre:true,sample:'separate'},
  {id:'separate_client',offset:1,measurement:'after',pre:false,sample:'other'},
  {id:'reader_during_registration',offset:1,measurement:'after',pre:false,ordering:'reader'},
  {id:'writer_before_snapshot',offset:1,measurement:'after',pre:false,ordering:'writer_first'},
  {id:'writer_after_snapshot',offset:1,measurement:'after',pre:true,ordering:'writer_after_snapshot',expected:'serialization'},
  {id:'writer_before_readback',offset:1,measurement:'after',pre:false,ordering:'writer_readback',expected:'reconciliation'},
  {id:'future_clock_control',offset:60000,measurement:'after',pre:false,expected:'future_clock'},
 ] as const;
 let admitted=0,expectedDenials=0,sealed=0;
 try{await db.$connect();await other.$connect();await owned(db);await owned(other);
  for(const v of variants){
   assert.ok(Date.now()-started<180000,'matrix time budget');
   let clock=new Date(0),identity:any,timing:any,reader=false;
   const ordering='ordering' in v?v.ordering:undefined,expected='expected' in v?v.expected:undefined;
   const sample='sample' in v?v.sample:undefined;
   const harmlessWrite=()=>other.$executeRaw`UPDATE workspaces SET name=name WHERE id=${identity.binding.workspaceId}::uuid`;
   const probe:RegistrationProbe={measurement:v.measurement,fencePreRead:v.pre,client:sample==='other'?other:db,clock:()=>clock,
    beforeTransaction:async(tx,mode,i)=>{identity=i;
     if(mode==='read'){if(ordering==='writer_readback')await harmlessWrite();return;}
     // Writer-first has committed before this transaction takes its snapshot.
     if(ordering==='writer_first')await harmlessWrite();
     const local=(await tx.$queryRaw<any[]>`SELECT to_char(transaction_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at,pg_current_xact_id()::text AS xid,pg_backend_pid() AS pid`)[0];
     const sampled=sample?await db.$transaction(async sampling=>{
      await sampling.$executeRaw`SET TRANSACTION READ ONLY`;
      return (await sampling.$queryRaw<any[]>`SELECT to_char(transaction_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at,pg_current_xact_id_if_assigned()::text AS xid,pg_backend_pid() AS pid`)[0];
     },{isolationLevel:'RepeatableRead'}):local;
     clock=new Date(Date.parse(sampled.at)+v.offset);
     if(sample)assert.notEqual(sampled.pid,local.pid,'separate transaction uses a separate backend');
     assert.ok(clock.getTime()>=Date.parse(i.issuedAt),'matrix event cannot precede ticket issue');
     timing={transactionStart:local.at,sampledAt:sampled.at,eventAt:clock.toISOString(),xid:local.xid,registrationPid:local.pid,samplingPid:sampled.pid};
     if(ordering==='writer_after_snapshot'){
      await tx.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1`;
      await harmlessWrite();
     }
    },
    beforeStatement:async(_tx,phase)=>{if(ordering==='reader'&&!reader&&phase==='worker_bootstrap_tickets'){
     await other.$transaction(async reading=>{await reading.$executeRaw`SET TRANSACTION READ ONLY`;
      await reading.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1`;},{isolationLevel:'RepeatableRead'});reader=true;
    }}
   };
   let failure:unknown,f:Awaited<ReturnType<typeof attestationNativeFixture>>|undefined;
   try{f=await attestationNativeFixture(db,{registrationProbe:probe});}catch(e){failure=e;}
   if(!expected){if(failure){console.error(JSON.stringify({alert:'unexpected_registration_denial',variant:v.id,reopen:true,retryable:false}));throw failure;}
    assert.ok(f);admitted++;if(ordering==='reader')assert.equal(reader,true);
    await f.ready();assert.equal((await f.ports.execute(await f.command('attest'))).ok,true,JSON.stringify(f.errors));
    assert.equal((await f.ports.execute(await f.command('seal'))).ok,true,JSON.stringify(f.errors));sealed++;
   }else{
    assert.ok(failure instanceof NativeRegistrationDenied,`${v.id}: expected refusal`);
    const d=failure.diagnostics;
    if(expected==='serialization')assert.ok(d.some(x=>x.sqlstate==='40001'),JSON.stringify(d));
    if(expected==='future_clock')assert.ok(d.some(x=>x.sqlstate==='P0001'&&x.message.includes('bootstrap_lifecycle_cas')),JSON.stringify(d));
    if(expected==='reconciliation')assert.equal((failure.cause as any)?.code,'reconciliation_required');
    const rows=(await db.$queryRaw<any[]>`SELECT
     (SELECT count(*)::int FROM worker_bootstrap_tickets WHERE id=${identity.ticketId}::uuid) AS tickets,
     (SELECT count(*)::int FROM worker_bootstrap_lifecycle_events WHERE ticket_id=${identity.ticketId}::uuid) AS events`)[0];
    assert.deepEqual(rows,expected==='reconciliation'?{tickets:1,events:1}:{tickets:0,events:0});expectedDenials++;
   }
   console.log(JSON.stringify({registrationMatrixRow:{...v,timing,result:expected?'expected_denial':'admitted_and_sealed',retries:0}}));
  }
  assert.equal(admitted,8);assert.equal(expectedDenials,3);assert.equal(sealed,8);
  console.log(JSON.stringify({registrationMatrix:{variants:variants.length,admitted,expectedDenials,sealed,unexpectedDenials:0,retries:0,elapsedMs:Date.now()-started}}));
 }finally{await Promise.all([db.$disconnect(),other.$disconnect()]);}
}
