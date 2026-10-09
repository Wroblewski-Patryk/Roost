// Opt-in isolated local PostgreSQL test. It never connects to deployment targets.
import test from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
import{readFileSync,readdirSync}from'node:fs';import{execFileSync}from'node:child_process';
import{compatibleConfigClosureFixture as fixture,refreshCompatibleConfigClosure as refresh}from'./fixtures/release-compatible-config-closure.mjs';
import shared from'./lib/agent-host-release-contract.cjs';
test('isolated PostgreSQL applies additive closure migration and checks fresh/current and original content parity',
 {skip:process.env.ROOST_TEST_LOCAL_POSTGRES!=='1'},()=>{
 const migration='20261009223000_compatible_config_absence_closure',database='roost_test_compatible_closure_'+randomUUID().replaceAll('-','');
 const common=['compose','exec','-T','postgres'],args=[...common,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','companycore','-d',database];
 const call=(a,input)=>execFileSync('docker',a,{input,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:32*1024*1024});
 const sql=input=>call(args,input).trim(),quote=s=>"'"+s.replaceAll("'","''")+"'",json=v=>quote(JSON.stringify(v))+'::jsonb';let created=false;
 try{
  call([...common,'createdb','-U','companycore',database]);created=true;
  const migrations=readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)&&n<migration).sort();
  sql(migrations.map(n=>readFileSync('prisma/migrations/'+n+'/migration.sql','utf8')).join('\n'));
  const old=sql("SELECT prosrc FROM pg_proc WHERE oid='governed_release_compatible_negative_contents_valid(governed_releases,governed_release_operations,jsonb,text,text,boolean)'::regprocedure;");
  const source=readFileSync('prisma/migrations/'+migration+'/migration.sql','utf8');
  sql('BEGIN;'+source.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'')+'ROLLBACK;');
  assert.equal(sql("SELECT count(*) FROM pg_proc WHERE proname='governed_release_compatible_config_closure_fresh';"),'0');
  sql(source);
  assert.equal(sql("SELECT prosrc FROM pg_proc WHERE oid='governed_release_compatible_negative_contents_valid(governed_releases,governed_release_operations,jsonb,text,text,boolean)'::regprocedure;"),old);
  const f=fixture({clock:Date.now()-600000}),workspace=randomUUID(),r={id:f.s.releaseId,workspace_id:workspace,application_id:f.s.applicationId,host_id:f.s.hostId,snapshot:f.s,manifest_digest:f.s.manifestDigest},
   o={id:f.operation.id,release_id:r.id,workspace_id:workspace,application_id:r.application_id,operation:f.operation.operation,created_at:f.operation.createdAt,request_id:f.operation.intent.requestId,intent:f.operation.intent};
  const check=(e,clock)=>sql('SELECT governed_release_compatible_negative_contents_at(jsonb_populate_record(NULL::governed_releases,'+json(r)+'),jsonb_populate_record(NULL::governed_release_operations,'+json(o)+'),'+json(e)+",'reconciled','absent',TRUE,"+quote(new Date(clock).toISOString())+'::timestamptz);');
  assert.equal(check(f.body.evidence,f.clock),'t');
  assert.equal(check(f.body.evidence,f.clock+300001),'f');
  const oldEvidence=structuredClone(f.body.evidence),currentClock=Date.now()-1;refresh(f,currentClock);
  assert.equal(check(oldEvidence,f.clock),'t');assert.equal(check(f.body.absenceRevalidation.currentEvidence,currentClock),'t');
  assert.equal(sql('SELECT governed_release_compatible_config_closure_stable('+json(oldEvidence)+')=governed_release_compatible_config_closure_stable('+json(f.body.absenceRevalidation.currentEvidence)+');'),'t');
  for(const mutate of [e=>e.dataDigest='0'.repeat(64),e=>e.sequenceDigest='0'.repeat(64),e=>e.compatibleRecoveryFailure.database.containerId='0'.repeat(64),e=>e.compatibleRecoveryFailure.ingressFence.rulePresent=false]){
   const e=structuredClone(f.body.absenceRevalidation.currentEvidence);mutate(e);assert.equal(check(e,currentClock),'f');
  }
  for(const at of [currentClock-300001,currentClock+60000]){
   const e=structuredClone(f.body.absenceRevalidation.currentEvidence),v=e.compatibleRecoveryFailure;
   v.ingressFence.observedAt=new Date(at).toISOString();
   const {evidenceDigest:_old,...fence}=v.ingressFence;v.ingressFence.evidenceDigest=shared.releaseDigest(fence);
   v.evidenceDigest=shared.compatibleFailureMarkerDigest(v);
   assert.equal(check(e,currentClock),'f','freshness rejects a resealed stale/future fence');
  }
  assert.equal(shared.compatibleConfigClosureRevalidationError(f.s,f.body,currentClock,f.operation),null);
 }finally{if(created)call([...common,'dropdb','-U','companycore',database]);}
});
