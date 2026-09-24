import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash,randomUUID} from 'node:crypto';
import {lineageOracle,type EpochProof} from './decision-attestation-lineage-oracle';
import {nativeAttestationFixture} from './decision-attestation-prisma-fixture';
import {decisionAttestationLifecycleGuardHash,decisionAttestationOwnGuards,decisionAttestationOwnHelpers} from '../modules/api-keys/decision-attestation-guards';
const sql=readFileSync('prisma/migrations/20260925010000_decision_attestation/migration.sql','utf8').replace(/\r/g,'');
const oldSql=readFileSync('prisma/migrations/20260924010000_bootstrap_ticket_lifecycle/migration.sql','utf8').replace(/\r/g,'');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

test('migration 83 upgrades exactly two gap predicates while retaining every other migration 82 guard statement',()=>{
 const body=oldSql.match(/CREATE FUNCTION bootstrap_lifecycle_write_guard\(\) RETURNS TRIGGER LANGUAGE plpgsql AS \$\$([\s\S]*?)\$\$;/)![1];
 const oldTest=sql.match(/old_test TEXT:='([^']+)'/)![1],newTest=sql.match(/new_test TEXT:='([^']+)'/)![1];
 assert.equal(sha(body),'1000876fe64fa1808625f0e9b06db2a86f8b4d1aa26d7dd0f6cce07be045e048');
 assert.equal(body.split(oldTest).length-1,2);assert.equal(newTest,`(${oldTest} AND NOT decision_attestation_lineage(t.id,f-1))`);
 const upgraded=body.replaceAll(oldTest,newTest);assert.equal(sha(upgraded),decisionAttestationLifecycleGuardHash);
 assert.equal(upgraded.replaceAll(newTest,oldTest),body);
 assert.match(sql,/length\(body\)-length\(replace\(body,old_test,''\)\)/);assert.match(sql,/decision_lifecycle_upgrade_source_mismatch/);
 assert.doesNotMatch(sql,/DISABLE TRIGGER|DELETE FROM|TRUNCATE TABLE|UPDATE worker_bootstrap_write_receipts|UPDATE decisions/i);
 assert.equal(decisionAttestationOwnGuards.length,111);assert.equal(decisionAttestationOwnHelpers.length,5);
});
test('81/82 row writers own the only new row epoch; 83 locks but does not double increment them',()=>{
 const lock=sql.match(/CREATE FUNCTION decision_attestation_lock\(\)[\s\S]*?AS \$\$([\s\S]*?)\$\$;/)![1];
 const bypassIncrement=lock.match(/IF TG_TABLE_NAME IN \(([\s\S]*?)\) THEN/)![1];
 const names=[...bypassIncrement.matchAll(/'([^']+)'/g)].map(m=>m[1]);
 assert.deepEqual(names,['worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events',
  'worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_bootstrap_grants']);
 assert.match(lock,/PERFORM revision FROM ready_source_fence WHERE id=1 FOR UPDATE/);
 assert.ok(lock.indexOf('RETURN NULL;')<lock.indexOf('UPDATE ready_source_fence'));
 // No second counter, decrement, receipt append or replacement of old audits.
 assert.doesNotMatch(lock,/revision-1|INSERT INTO|CREATE/);
 assert.match(sql,/OR NOT decision_attestation_lineage\(NEW.ticket_id,f-1\)/);
});
function protocol(){const proofs:EpochProof[]=[];
 for(const [n,phase] of ['key','auth','authority','attest','authority'].entries())proofs.push({epoch:11+n,id:randomUUID(),ledger:'attestation',table:phase,row:randomUUID(),
  scope:'ticket-one',phase:phase as EpochProof['phase'],writer:'signing-tx',digest:'exact',actualDigest:'exact',event:true});
 return {anchor:10,attest:14,tail:15,through:15,scope:'ticket-one',writer:'start-tx',optedIn:true,current:true,proofs};
}
test('independent lineage oracle requires every epoch, exact source evidence and no replay',()=>{
 const p=protocol();assert.equal(lineageOracle(p),true);
 for(const change of [
  (q:ReturnType<typeof protocol>)=>{q.proofs.splice(1,1);},
  (q:ReturnType<typeof protocol>)=>{q.proofs[1].event=false;},
  (q:ReturnType<typeof protocol>)=>{q.proofs[1].digest='forged';},
  (q:ReturnType<typeof protocol>)=>{q.proofs[1].scope='another-ticket';},
  (q:ReturnType<typeof protocol>)=>{q.proofs[1].epoch=10;},
  (q:ReturnType<typeof protocol>)=>{q.proofs.push({...q.proofs[1]});},
  (q:ReturnType<typeof protocol>)=>{q.through++;},
  (q:ReturnType<typeof protocol>)=>{q.optedIn=false;},
  (q:ReturnType<typeof protocol>)=>{q.current=false;},
 ]){const q=protocol();change(q);assert.equal(lineageOracle(q),false);}
});
test('nested old audits may share an epoch with new receipts but must have exact same-start ownership',()=>{
 const p=protocol();p.through=18;
 for(const [epoch,table,ledger] of [[16,'reserve','attestation'],[17,'history','lifecycle'],[18,'audit','lifecycle'],[18,'history','attestation'],[18,'audit','attestation']] as const)
  p.proofs.push({epoch,table,ledger,id:randomUUID(),row:table,scope:p.scope,phase:'start',writer:p.writer,digest:'exact',actualDigest:'exact',event:true});
 assert.equal(lineageOracle(p),true);
 for(const writer of ['previous-start','another-transaction']){const q=structuredClone(p);q.proofs.at(-1)!.writer=writer;assert.equal(lineageOracle(q),false);}
 const foreign=structuredClone(p);foreign.proofs.at(-1)!.scope='another-ticket';assert.equal(lineageOracle(foreign),false);
 const postSignKey=structuredClone(p);postSignKey.proofs.at(-1)!.phase='key';assert.equal(lineageOracle(postSignKey),false);
});
test('legacy non-opted-in anti-ABA remains the original equality for every gap',()=>{
 for(const before of [9,10,11,100]){const p=protocol();p.optedIn=false;p.through=before;
  const original=before===10,upgraded=before===10||lineageOracle(p);assert.equal(upgraded,original);}
});
test('actual ports deny missing stale replayed foreign receipts and global drift before the first seal write',async()=>{
 for(const fault of ['missing','digest','event','foreign-key','foreign-attest','replay','stale','gap']){
  const f=nativeAttestationFixture();assert.equal((await f.execute('attest')).ok,true);
  const rows=f.lineageProofs(),a=rows.find(r=>r.phase==='attest')!,key=rows.find(r=>r.phase==='key')!;
  if(fault==='missing')rows.splice(rows.indexOf(a),1);
  if(fault==='digest')a.actualDigest='tampered';if(fault==='event')a.event=false;
  if(fault==='foreign-key')key.scope=randomUUID();if(fault==='foreign-attest')a.scope=randomUUID();
  if(fault==='replay')rows.push({...a,id:randomUUID()});if(fault==='stale')a.epoch=1;if(fault==='gap')f.drift();
  const c=await f.command('seal'),before=f.state(),writes=f.stats().writes;
  assert.equal((await f.ports.execute(c)).ok,false,fault);assert.equal(f.stats().writes,writes,fault);assert.deepEqual(f.state(),before,fault);
  assert.ok(f.calls.some(c=>c.sql.includes('AS "sealLineage"')),fault+': must reach lineage check');
 }
});
test('twenty seal writers racing terminal revoke preserve both lock orderings and cannot revive authority',async()=>{
 for(const revokeFirst of [true,false]){const f=nativeAttestationFixture();await f.execute('attest');const seal=await f.command('seal'),revoke={...seal,kind:'terminal',action:'revoke',operationId:randomUUID()};
  const commands=Array.from({length:20},()=>({...seal,operationId:randomUUID()}));const all=revokeFirst?[revoke,...commands]:[...commands,revoke];
  const results=await Promise.all(all.map(c=>f.ports.execute(c)));assert.equal(results.filter(r=>r.ok).length,1);
  assert.equal(f.objects().filter(o=>o.table==='worker_bootstrap_attempts').length,revokeFirst?0:1);
  if(!revokeFirst)assert.equal((await f.execute('terminal',{action:'revoke'})).ok,true);
  assert.equal((await f.ports.inspect(f.q)).ok,false);assert.equal((await f.execute('seal')).ok,false);
 }
});
test('start proof cannot authorize dispatch in the start transaction and cannot be reused for another start',async()=>{
 const f=nativeAttestationFixture();await f.execute('attest');assert.equal((await f.execute('seal')).ok,true);
 const before=f.state();assert.equal((await f.ports.execute({...await f.command('seal'),kind:'dispatch'})).ok,false);
 assert.equal((await f.execute('seal')).ok,false);assert.deepEqual(f.state(),before);
 const dispatch=sql.match(/CREATE FUNCTION decision_attestation_attempt_guard\(\)[\s\S]*?AS \$\$([\s\S]*?)\$\$;/)![1];
 assert.match(dispatch,/NEW.state<>'consumed'[\s\S]*writer_xid=pg_current_xact_id\(\)::text[\s\S]*decision_attestation_start_commit_required/);
 assert.ok('bootstrap_lifecycle_write_guard'<'decision_attestation_attempt_guard');
});
