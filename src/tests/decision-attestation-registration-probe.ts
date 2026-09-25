import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {attestationNativeFixture,owned} from './decision-attestation-native-fixture';

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
