import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {releaseOutcome} from '../modules/agent-runtime/governed-release';

test('reconciled compatible success rechecks live credential before inserting terminal evidence',async()=>{
 const workspace=randomUUID(),id=randomUUID(),operationId=randomUUID(),userId=randomUUID();
 let credentialReads=0,inserts=0;
 const snapshot={compatibleArtifactRecovery:{},releaserCredentialId:randomUUID(),releaserAgentId:randomUUID(),credentialVersion:1};
 const release={id,workspace_id:workspace,application_id:randomUUID(),snapshot,expires_at:new Date(Date.now()+600000)};
 const operation={id:operationId,operation:'deploy',intent:{},outcome:{status:'uncertain'}};
 const db:any={workspaceMembership:{findFirst:async()=>({userId,role:'owner'})},
  apiKey:{findFirst:async()=>{credentialReads++;return null;}},
  $queryRaw:async(parts:TemplateStringsArray)=>{
   const sql=parts.join('?');
   if(sql.includes('FROM governed_releases WHERE'))return [release];
   if(sql.includes('FROM governed_release_operations o WHERE'))return [operation];
   if(sql.includes('FROM governed_release_revocations')||sql.includes('FROM governed_release_renewals'))return [];
   if(sql.includes('pg_advisory_xact_lock'))return [{lock:null}];
   throw Error('Unexpected query '+sql);
  },$executeRaw:async()=>{inserts++;throw Error('Unqualified terminal evidence must not be inserted');}};
 const result=await releaseOutcome(db,workspace,id,operationId,{authType:'user',userId,workspaceId:workspace} as any,
  {requestId:randomUUID(),status:'reconciled',reconciledStatus:'succeeded',observationOnly:true,evidence:{observedAt:new Date().toISOString()}});
 assert.deepEqual(result,{error:'release_credential_invalid'});
 assert.equal(credentialReads,1);assert.equal(inserts,0);
});
