/**
 * Gate 1 migrations 87-88 qualification on one uniquely owned disposable database.
 * Run: node --import tsx scripts/qualify-bootstrap-v3-native.mjs
 * The existing Compose postgres must already be running. No container is started
 * or stopped, and no existing database is reset.
 */
import assert from 'node:assert/strict';
import {randomUUID, createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync, readdirSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import catalogModule from '../src/modules/api-keys/bootstrap-v3-catalog.ts';
import fixtureModule from '../src/tests/bootstrap-proof-authority-native-fixture.ts';
import v3FixtureModule from '../src/tests/bootstrap-proof-issuance-native-fixture.ts';
const {requireV3BackendCatalog}=catalogModule;
const {proofNativeFixture}=fixtureModule;
const {prepareV3FirstEnrollmentSources,issueV3NativeFirstEnrollment,probeV3OwnerDecisionApi}=v3FixtureModule;

const token=randomUUID().replaceAll('-','');
const name=`companycore_test_identity_${token}`;
const marker=`worker-identity-native:${token}`;
const migrationNames=readdirSync('prisma/migrations',{withFileTypes:true})
 .filter(x=>x.isDirectory()&&/^\d/.test(x.name)).map(x=>x.name).sort();
const migrationHashes=migrationNames.map(n=>createHash('sha256').update(readFileSync(`prisma/migrations/${n}/migration.sql`)).digest('hex'));
assert.equal(migrationNames.length,88,'Expected the unchanged 88-migration chain');
assert.equal(migrationNames.at(-1),'20260926010000_bootstrap_v3_catalog_correction');

function run(command,args,{env=process.env,timeout=120000}={}){
 const r=spawnSync(command,args,{env,encoding:'utf8',windowsHide:true,timeout,maxBuffer:32*1024*1024});
 if(r.error)throw r.error;
 return r;
}
function docker(args,options){const r=run('docker',args,options);if(r.status!==0)throw Error(`Docker command failed (${args[0]}): ${String(r.stderr||r.stdout).slice(0,1200)}`);return r.stdout.trim();}
function sql(container,database,query){return docker(['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','companycore','-d',database,'-c',query]);}
function databaseCatalog(container){return JSON.parse(sql(container,'postgres',"SELECT coalesce(json_agg(json_build_object('name',datname,'oid',oid::text,'owner',pg_get_userbyid(datdba),'marker',shobj_description(oid,'pg_database')) ORDER BY datname),'[]'::json) FROM pg_database;"));}
function checkedTarget(container,oid){
 const rows=databaseCatalog(container).filter(x=>x.name===name);
 assert.deepEqual(rows,[{name,oid,owner:'companycore',marker}],'Disposable database identity changed');
}
function redacted(value,password,url){return String(value).replaceAll(password,'[redacted]').replaceAll(url,'[redacted-url]').slice(0,2500);}

const container=docker(['compose','ps','-q','postgres']);
assert.match(container,/^[a-f0-9]{64}$/,'Exactly one existing Compose postgres is required');
assert.equal(docker(['inspect','--format','{{.State.Status}}',container]),'running','Postgres must already be running');
const portText=docker(['compose','port','postgres','5432']);
const port=Number(portText.match(/:(\d+)$/)?.[1]);
assert.ok(Number.isInteger(port)&&port>0&&port<=65535,'Published local PostgreSQL port required');
const configured=JSON.parse(docker(['inspect','--format','{{json .Config.Env}}',container]));
const password=configured.find(x=>x.startsWith('POSTGRES_PASSWORD='))?.slice('POSTGRES_PASSWORD='.length);
assert.ok(password,'Container PostgreSQL password unavailable');
const before=databaseCatalog(container);
assert.ok(!before.some(x=>x.name===name),'Disposable name collision');
const url=new URL(`postgresql://companycore@127.0.0.1:${port}/${name}`);
url.password=password;url.searchParams.set('schema','public');url.searchParams.set('sslmode','disable');url.searchParams.set('connection_limit','25');
const databaseUrl=url.toString();
process.env.DATABASE_URL=databaseUrl;
process.env.WORKER_IDENTITY_NATIVE_DATABASE=name;
process.env.COMPANYCORE_SKIP_DOTENV='1';
process.env.NODE_ENV='test';
const taskEnv={...process.env,DATABASE_URL:databaseUrl,NODE_ENV:'test',COMPANYCORE_SKIP_DOTENV:'1',WORKER_IDENTITY_NATIVE_DATABASE:name,CI:'1',NO_COLOR:'1',PRISMA_HIDE_UPDATE_MESSAGE:'1'};
let created=false,oid=null,client=null;
try{
 docker(['exec',container,'createdb','-U','companycore','-O','companycore',name]);created=true;
 sql(container,'postgres',`COMMENT ON DATABASE ${name} IS '${marker}';`);
 oid=databaseCatalog(container).find(x=>x.name===name)?.oid;
 assert.ok(oid);checkedTarget(container,oid);
 console.log(JSON.stringify({phase:'database_created',database:name,marker,container,port,migrations:migrationNames.length}));

 const deploy=run('node',['node_modules/prisma/build/index.js','migrate','deploy'],{env:taskEnv,timeout:600000});
 if(deploy.status!==0)throw Error(`Prisma migrate deploy failed: ${redacted(deploy.stderr||deploy.stdout,password,databaseUrl)}`);
 console.log(JSON.stringify({phase:'migrations_applied',exitCode:deploy.status,chainDigest:createHash('sha256').update(migrationHashes.join('')).digest('hex')}));
 const status=run('node',['node_modules/prisma/build/index.js','migrate','status'],{env:taskEnv,timeout:120000});
 if(status.status!==0)throw Error(`Prisma migrate status failed: ${redacted(status.stderr||status.stdout,password,databaseUrl)}`);

 client=new PrismaClient({datasources:{db:{url:databaseUrl}}});await client.$connect();
 const [inventory]=await client.$queryRawUnsafe('SELECT count(*)::int AS total,count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS finished FROM _prisma_migrations');
 assert.equal(inventory.total,88);assert.equal(inventory.finished,88);
 const installed=await client.$queryRawUnsafe('SELECT migration_name FROM _prisma_migrations ORDER BY started_at,migration_name');
 assert.deepEqual(installed.map(x=>x.migration_name).sort(),migrationNames);
 console.log(JSON.stringify({phase:'prisma_status_verified',migrationRows:inventory.finished}));
 await client.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  await tx.$executeRawUnsafe('SET LOCAL search_path = pg_catalog, public');
  const mismatches=await tx.$queryRawUnsafe(`WITH pins AS (
   SELECT value AS expected FROM bootstrap_v3_catalog_manifest_v2, jsonb_array_elements(record->'functions')
  ), live AS (
   SELECT p.proname AS name,jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),
    'result',p.prorettype::regtype::text,'language',l.lanname,'volatility',p.provolatile::text,
    'defaults',pg_get_expr(p.proargdefaults,0),'hash',encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex'),
    'enabled',n.nspname='public' AND p.prokind='f' AND NOT p.prosecdef AND p.proconfig IS NULL AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u') AS actual
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
  ) SELECT expected,live.actual FROM pins LEFT JOIN live ON live.name=pins.expected->>'name'
   WHERE live.actual IS DISTINCT FROM pins.expected||jsonb_build_object('enabled',true) ORDER BY pins.expected->>'name' LIMIT 5`);
  if(mismatches.length){const discrepancies=mismatches.map(({expected,actual})=>({name:expected.name,fields:Object.keys({...expected,enabled:true})
   .filter(k=>JSON.stringify(actual?.[k])!==JSON.stringify(k==='enabled'?true:expected[k]))
   .map(k=>({field:k,expected:k==='enabled'?true:expected[k],actual:actual?.[k]}))}));
   console.log(JSON.stringify({phase:'catalog_mismatch',discrepancies}));}
  const [native]=await tx.$queryRawUnsafe('SELECT bootstrap_v3_catalog() AS valid');
  assert.equal(native.valid,true);
  await requireV3BackendCatalog(tx);
 },{isolationLevel:'RepeatableRead',timeout:90000});
 console.log(JSON.stringify({phase:'catalog_verified',prismaStatusExitCode:status.status,migrationRows:inventory.finished,v3CatalogPinned:true}));

 // Exercise an older native writer with real PostgreSQL guards after migration 88.
 // The fixture contains only public synthetic key material and no signer.
 const fixture=await proofNativeFixture(client);
 const command=await fixture.command();
 const write=await fixture.api.applyKey(command);
 assert.equal(write.ok,true,`Legacy proof key write failed: ${JSON.stringify(fixture.errors).slice(0,500)}`);
 const readback=await fixture.api.inspectOperation('bootstrap_proof_key_history',command.operationId);
 assert.equal(readback.ok,true);assert.ok(readback.operation);
 const [facts]=await client.$queryRawUnsafe('SELECT (SELECT count(*)::int FROM bootstrap_proof_key_history) AS keys,(SELECT count(*)::int FROM bootstrap_v3_operations) AS v3_operations,(SELECT count(*)::int FROM bootstrap_v3_mutations) AS observed_mutations');
 assert.ok(facts.keys>=1);assert.equal(facts.v3_operations,0);
 console.log(JSON.stringify({phase:'legacy_write_verified',operationId:command.operationId,committedReadback:true,keys:facts.keys,v3Operations:facts.v3_operations,observedMutations:facts.observed_mutations}));
 const nativeSources=await prepareV3FirstEnrollmentSources(client);
 console.log(JSON.stringify({phase:'v3_first_enrollment_sources_prepared',attachmentId:nativeSources.attachmentId,
  decisionId:nativeSources.decisionId,acceptedAt:nativeSources.at,priorTickets:nativeSources.facts.tickets,
  authorityEvents:nativeSources.facts.authority_events,ownerAuthenticationRecorded:!!nativeSources.ownerAuth,
  authorityReadback:!!nativeSources.authority,sourceDigest:nativeSources.authority.sourceDigest,
  fence:nativeSources.authority.fence,writerXid:nativeSources.authority.writerXid}));
 const issuance=await issueV3NativeFirstEnrollment(client,nativeSources);
 if(!issuance.result.ok)throw Error(`V3 native issuance denied: ${JSON.stringify({result:issuance.result,errors:issuance.errors,counters:issuance.counters})}`);
 assert.equal(issuance.result.issuanceRecorded,true);
 assert.equal(issuance.result.sendPermit,false);
 assert.equal(issuance.readback?.ok,true,`Independent V3 readback denied: ${JSON.stringify(issuance.errors)}`);
 assert.deepEqual(issuance.readback.receipt,issuance.result.receipt);
 assert.deepEqual(issuance.facts,{operations:1,phases:6,tickets:1,attempts:1,links:1,seals:1,commitments:1});
 console.log(JSON.stringify({phase:'v3_native_issuance_verified',operationId:nativeSources.command.operationId,
  receipt:issuance.result.receipt,counters:issuance.counters,nativeRows:issuance.facts,committedReadback:true}));
 const decisionProbe=await probeV3OwnerDecisionApi(client,nativeSources);
 assert.equal(decisionProbe.proposalError,null,'Normal owner Decision proposal must commit');
 assert.equal(decisionProbe.proposalResult?.id,decisionProbe.decisionId);
 assert.equal(decisionProbe.impactReviewed,true,'Normal owner impact review must commit');
 assert.ok(decisionProbe.riskId,'Canonical task risk assessment must be current');
 assert.equal(decisionProbe.admissionStatus,'admitted');
 assert.match(decisionProbe.admissionSeal??'',/^[a-f0-9]{64}$/,'Canonical task admission seal required');
 assert.equal(decisionProbe.acceptanceError,null,'Normal owner Decision acceptance must commit');
 assert.ok(decisionProbe.acceptanceResult?.record?.id,'Normal owner Decision acceptance receipt required');
 const [decisionReadback]=await client.$queryRawUnsafe('SELECT count(*)::int AS acceptances FROM decision_acceptances WHERE decision_id=$1::uuid',decisionProbe.decisionId);
 assert.equal(decisionReadback.acceptances,1,'Committed normal owner Decision acceptance required');
 assert.match(decisionProbe.managed?.selectionDigest??'',/^[a-f0-9]{64}$/,'Exact managed selection digest required');
 assert.match(decisionProbe.managed?.admissionSeal??'',/^[a-f0-9]{64}$/,'Managed decision admission seal required');
 assert.ok(decisionProbe.managed?.acceptanceId,'Separate managed owner Decision acceptance required');
 const [managedReadback]=await client.$queryRawUnsafe(`SELECT count(*)::int AS acceptances FROM decision_acceptances a
  JOIN decision_revisions r ON r.decision_id=a.decision_id WHERE a.decision_id=$1::uuid
  AND r.body->'managedRuntimeApproval'->>'selectionDigest'=$2`,decisionProbe.managed.decisionId,decisionProbe.managed.selectionDigest);
 assert.equal(managedReadback.acceptances,1,'Committed exact managed owner approval required');
 console.log(JSON.stringify({phase:'normal_owner_decision_api_probe',result:decisionProbe}));
 assert.deepEqual(migrationNames.map(n=>createHash('sha256').update(readFileSync(`prisma/migrations/${n}/migration.sql`)).digest('hex')),migrationHashes,'Migration source changed during qualification');
}catch(error){
 console.error(JSON.stringify({phase:'qualification_failed',error:redacted(error?.message??error,password,databaseUrl)}));
 process.exitCode=1;
}finally{
 if(client)await client.$disconnect();
 if(created){
  checkedTarget(container,oid);
  assert.equal(sql(container,'postgres',`SELECT count(*) FROM pg_stat_activity WHERE datname='${name}';`),'0','Disposable database still has sessions');
  docker(['exec',container,'dropdb','-U','companycore',name]);
  assert.ok(!databaseCatalog(container).some(x=>x.name===name));
 }
 assert.deepEqual(databaseCatalog(container),before,'Unrelated database identities changed');
 assert.equal(docker(['inspect','--format','{{.State.Status}}',container]),'running','Existing postgres was stopped');
 console.log(JSON.stringify({phase:'cleanup_verified',ownedDatabaseRemoved:created,unrelatedDatabaseIdentitiesPreserved:true,postgresStillRunning:true}));
}
