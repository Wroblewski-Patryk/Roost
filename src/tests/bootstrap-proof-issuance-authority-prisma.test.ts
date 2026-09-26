import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPrismaV3AuthorityPort} from '../modules/api-keys/bootstrap-proof-issuance-authority-prisma';

test('v3 authority reader refuses invalid and unqualified sources without writes',async()=>{
 const calls:string[]=[];
 const db={
  $queryRaw:async()=>{calls.push('read');return [];},
  $executeRaw:async()=>{calls.push('write');throw Error('write forbidden');}
 } as any;
 const port=createPrismaV3AuthorityPort();
 await assert.rejects(port.read(db,'not-an-id',null));
 assert.deepEqual(calls,[]);
 await assert.rejects(port.read(db,randomUUID(),null));
 assert.deepEqual(calls,['read']);
});
