import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildV3Backend,checkV3Backend,migration87,upgrades} from '../check-bootstrap-v3-backend';
import {v3WireSchema} from '../bootstrap-v3-wire-schema';
import {v3CatalogManifest,v3UpgradePins} from '../../src/modules/api-keys/bootstrap-v3-backend-pins';
import {recognizeV3Backend,requireV3BackendCatalog,v3Pinned} from '../../src/modules/api-keys/bootstrap-v3-catalog';
import {projectV3Sources,v3ProjectionRecipe} from '../../src/modules/api-keys/bootstrap-proof-projection';
import {projectionFixture} from '../../src/tests/bootstrap-proof-projection-fixture';
import {proofPersistenceFixture} from '../../src/tests/bootstrap-proof-persistence-fixture';
import {catalogAnswer,upgradeLegacyClient} from '../../src/tests/bootstrap-v3-catalog-fixture';
import {evaluateSqlRecipeExpression} from '../../src/tests/bootstrap-v3-sql-recipe';
import {lifecycleFlags} from '../../src/modules/api-keys/bootstrap-ticket-lifecycle-contract';

test('v3 backend source contract and catalog compatibility (no database)',async t=>{
 await t.test('pins reproduce complete migration; historical 1-86 cannot be regenerated away',()=>{
  const result=checkV3Backend();assert.equal(result.historicalMigrations,86);assert.equal(result.nativeQualified,false);
  assert.equal(result.upgrades,12);assert.ok(result.functions>100);assert.ok(result.triggers>250);
 });
 await t.test('every versioned branch preserves its exact historical body',()=>{
  const result=buildV3Backend();
  for(const [name,prefix] of Object.entries(upgrades)){
   const body=result.functions.get(name)!.body;assert.equal(body.split('\n '+prefix+'\n').length,2);
   assert.equal(createHash('sha256').update(body.replace('\n '+prefix+'\n','')).digest('hex'),result.upgradePins[name].old);
  }
 });
 for(const recovery of [false,true])for(const secondary of [false,true])await t.test(`SQL closed recipe agrees with v76: recovery=${recovery}, secondary fanout=${secondary}`,()=>{
  const f=projectionFixture(recovery,secondary),sql=readFileSync(migration87,'utf8'),body=sql.match(/base:=(jsonb_build_array\([\s\S]*?\));\s*FOR w IN/)![1];
  const p=f.plan,a=p.authority.attachment,c=p.envelope.signed.payload.context;
  const rows=evaluateSqlRecipeExpression(body,{p,a,c,hostkey:`${a.workspaceId}:${a.generation.hostId}`});assert.equal(rows.length,17);
  const recipe=rows.flatMap(w=>[{phase:w[0],slot:w[1],source:w[2],key:w[3],binding:w[4],families:w[5],parentSlot:w[6],update:w[8],authorityFor:null},
   ...w[7]?f.baseline.before.heads.filter(h=>h.fanout).map(h=>({phase:w[0],slot:`${w[1]}:authority:${h.decisionId}`,source:'decision_authority_event',key:'derived',binding:null,
    families:['attestation'],parentSlot:w[1],update:false,authorityFor:h.decisionId})):[]]);
  assert.deepEqual(recipe,v3ProjectionRecipe(p,f.baseline.before.heads));
  // Positive public contract remains satisfiable; this does not execute SQL.
  assert.equal(projectV3Sources(p,f.baseline,f.evidence(),'seal').sendPermit,false);
 });
 await t.test('structural schema is exhaustive and independent of SQL effect assertions',()=>{
  const s=v3WireSchema();assert.equal((s.nodes[s.root] as any).kind,'object');assert.ok(s.nodes.length>100);
  const sql=readFileSync(migration87,'utf8');
  for(const reason of ['issuance_owner','owner_authentication','identity_binding','issuer','proof_history','key_separation','credential_high_water','recovery','channel_binding','seal_transcript','authority_expired'])assert.ok(sql.includes(`'${reason}'`));
  assert.doesNotMatch(sql,/worker_credential_epoch|worker_credential_version|credential\.token_hash/);
 });
 await t.test('unfiltered interval, complete source roles and explicit final commit boundary',()=>{
  const result=buildV3Backend(),sql=readFileSync(migration87,'utf8');
  assert.match(sql,/DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bootstrap_v3_commit_guard/);
  const evidence=result.functions.get('bootstrap_v3_evidence')!.body;
  assert.match(evidence,/bootstrap_v3_mutations WHERE epoch>lo AND epoch<=hi/);
  assert.match(evidence,/bootstrap_v3_epochs WHERE revision>lo AND revision<=hi/);
  assert.doesNotMatch(evidence,/WHERE[^;]*(?:operation_id=op|writer_xid=)/);
  for(const name of ['worker_bootstrap_write_receipts','decision_attestation_write_receipts','worker_transport_write_audit','bootstrap_proof_write_receipts'])assert.ok(result.functions.get('bootstrap_v3_interval_receipts')!.body.includes(name));
  assert.match(result.functions.get('bootstrap_v3_inventory')!.body,/bootstrap_v3_native_digest\(r\)/);
  assert.match(result.functions.get('bootstrap_v3_read')!.body,/'unfilteredReceipts',bootstrap_v3_interval_receipts/);
  for(const flag of Object.keys(lifecycleFlags))assert.ok(result.functions.get('bootstrap_v3_read')!.body.includes(`'${flag}',false`));
 });
 function db(tamper?:(sql:string,rows:any[])=>void){const calls:string[]=[];return {calls,db:{$queryRaw:async(parts:TemplateStringsArray)=>{
  const sql=parts.join('?'),rows=catalogAnswer(sql);assert.ok(rows,sql);calls.push(sql);tamper?.(sql,rows);return rows;
 }} as any};}
 await t.test('complete source-pinned catalog is checked on supplied Db, without mutation',async()=>{
  const f=db();await requireV3BackendCatalog(f.db);assert.equal(f.calls.length,3);
  assert.equal(v3CatalogManifest.functions.find(f=>f.name==='task_composition_refs')!.defaults,'true');
 });
 for(const fault of ['missing_function','duplicate_function','hash','arguments','defaults','language','attributes','missing_manifest','manifest_trigger','manifest_fk','manifest_schema','invalid_catalog','wrong_mode'])
  await t.test(`catalog fail-closed: ${fault}`,async()=>{
   const f=db((sql,rows)=>{
    if(sql.includes('functions')){
     if(fault==='missing_function')rows.pop();if(fault==='duplicate_function')rows.push(rows[0]);
     if(fault==='hash')rows[0].hash='f'.repeat(64);if(fault==='arguments')rows[0].args='x text';if(fault==='defaults')rows[0].defaults='false';
     if(fault==='language')rows[0].language='sql';if(fault==='attributes')rows[0].enabled=false;
    }
    if(sql.includes('manifest')){if(fault==='missing_manifest')rows.pop();if(fault==='manifest_trigger')rows[0].record.triggers[0].kind=0;
     if(fault==='manifest_fk')rows[0].record.foreignKeys.pop();if(fault==='manifest_schema')rows[0].record.columns[0].columns.pop();}
    if(sql.includes('backend catalog')){if(fault==='invalid_catalog')rows[0].valid=false;if(fault==='wrong_mode')rows[0].bound=false;}
   });await assert.rejects(requireV3BackendCatalog(f.db));
  });
 await t.test('legacy hashes do not query or acquire v3 authority',async()=>{
  const f=db();const rows=Object.entries(v3UpgradePins).map(([name,p])=>({name,hash:p.old}));
  assert.equal(await recognizeV3Backend(f.db,rows),false);assert.equal(f.calls.length,0);
  assert.deepEqual(rows.map(r=>v3Pinned(r,false)),rows);
 });
 await t.test('one upgraded hash requires all dependent pins; unknown hash does not qualify',async()=>{
  const f=db(),pin=v3UpgradePins.bootstrap_lifecycle_write_guard;
  assert.equal(await recognizeV3Backend(f.db,[{function:'bootstrap_lifecycle_write_guard',hash:pin.hash}]),true);assert.equal(f.calls.length,3);
  assert.equal(await recognizeV3Backend(f.db,[{function:'bootstrap_lifecycle_write_guard',hash:'f'.repeat(64)}]),false);
  const bad=db((sql,r)=>{if(sql.includes('functions'))r.pop();});await assert.rejects(recognizeV3Backend(bad.db,[{function:'bootstrap_lifecycle_write_guard',hash:pin.hash}]));
 });
 await t.test('legacy public proof writes/readback keep working with full v3 catalog',async()=>{
  const f=proofPersistenceFixture(),checks=upgradeLegacyClient(f.client);
  const worker=await f.api.applyKey(f.command('local_worker'));assert.equal(worker.ok,true);
  const server=await f.api.applyKey(f.command('roost_server'));assert.equal(server.ok,true);
  const command=f.attachment(),result=await f.api.attach(command);assert.equal(result.ok,true);
  assert.ok(checks()>0);assert.equal(f.state().rows.length,3);for(const flag of Object.keys(lifecycleFlags))assert.equal((result as any)[flag],false);
 });
 await t.test('partial upgraded catalog denies legacy proof mutation before writes',async()=>{
  const f=proofPersistenceFixture();upgradeLegacyClient(f.client,(sql,r)=>{if(sql.includes('functions'))r.pop();});
  const result=await f.api.applyKey(f.command('local_worker'));assert.equal(result.ok,false);assert.equal(f.stats().writes,0);
 });
});
