import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {channelGuards} from '../src/modules/api-keys/bootstrap-channel-guards';
import {ticketGuards} from '../src/modules/api-keys/bootstrap-ticket-lifecycle-guards';
import {decisionAttestationOwnGuards} from '../src/modules/api-keys/decision-attestation-guards';
import {proofPersistenceTriggers} from '../src/modules/api-keys/bootstrap-proof-persistence-guards';
import {schemaSql} from './bootstrap-v3-wire-schema';

export const migration87='prisma/migrations/20260925050000_bootstrap_proof_issuance_v3/migration.sql';
export const guardTarget='src/modules/api-keys/bootstrap-v3-backend-pins.ts';
const marker='-- BEGIN GENERATED CATALOG UPGRADE';
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const read=(p:string)=>readFileSync(p,'utf8').replace(/\r/g,'');
const q=(s:string)=>"'"+s.replaceAll("'","''")+"'";
type Fn={name:string;args:string;defaults:string|null;result:string;language:string;volatility:string;hash:string;body:string};
type Trigger={table:string;name:string;function:string;kind:number;deferred:boolean};
const normalizedType=(s:string)=>s.toLowerCase().replace(/\bint\b/g,'integer').replace(/\btimestamptz\b/g,'timestamp with time zone').replace(/\bbool\b/g,'boolean');
function functions(sql:string){
 return [...sql.matchAll(/CREATE (?:OR REPLACE )?FUNCTION (\w+)\((.*?)\) RETURNS ([\w ]+?) LANGUAGE (\w+)(?: (VOLATILE|STABLE|IMMUTABLE))? AS (\$\w*\$)([\s\S]*?)\6;/g)].map(m=>{
  const parameters=m[2].split(',');
  const args=parameters.map(a=>normalizedType(a.trim().replace(/\s+DEFAULT\s+.+$/i,''))).join(', ');
  const defaults=parameters.flatMap(a=>{const d=a.match(/\s+DEFAULT\s+(.+)$/i);return d?[d[1].toLowerCase()]:[];}).join(', ')||null;
  return {name:m[1],args,defaults,result:normalizedType(m[3]),language:m[4].toLowerCase(),volatility:({IMMUTABLE:'i',STABLE:'s',VOLATILE:'v'} as any)[m[5]]??'v',body:m[7],hash:sha(m[7])};
 });
}
function directTriggers(sql:string):Trigger[]{
 return [...sql.matchAll(/^CREATE (CONSTRAINT )?TRIGGER (\w+) (BEFORE|AFTER) ([A-Z ]+?) ON (\w+)\s+(.*?)EXECUTE FUNCTION (\w+)\(\);/gms)].map(m=>{
  const events=m[4].split(' OR ');assert.ok(events.every(e=>['INSERT','UPDATE','DELETE','TRUNCATE'].includes(e)),m[0]);
  return {table:m[5],name:m[2],function:m[7],kind:(m[3]==='BEFORE'?2:0)+(m[6].includes('FOR EACH ROW')?1:0)+events.reduce((n,e)=>n+({INSERT:4,UPDATE:16,DELETE:8,TRUNCATE:32} as any)[e],0),deferred:!!m[1]};
 });
}
function parts(body:string){
 const out:string[]=[];let start=0,depth=0,quote=false;
 for(let n=0;n<body.length;n++){
  const c=body[n];if(c==="'"){if(quote&&body[n+1]==="'"){n++;continue;}quote=!quote;}
  if(quote)continue;if(c==='('||c==='[')depth++;if(c===')'||c===']')depth--;
  if(c===','&&depth===0){out.push(body.slice(start,n).trim());start=n+1;}
 }out.push(body.slice(start).trim());return out;
}
function tables(sql:string){
 return [...sql.matchAll(/CREATE TABLE (\w+)\s*\(([\s\S]*?)\n\);/g)].map(m=>({table:m[1],parts:parts(m[2].replace(/--[^\n]*/g,''))}));
}
const sourceTables=['workspaces','workspace_memberships','decisions','decision_revisions','decision_acceptances','decision_owner_auth_evidence','worker_identity_lifecycle','agent_hosts',
 'bootstrap_issuer_history','decision_attestation_key_history','trusted_provider_ticket_keys','worker_bootstrap_tickets','worker_bootstrap_attempts','api_keys','worker_credential_handoffs',
 'worker_bootstrap_lifecycle_events','worker_bootstrap_history','worker_bootstrap_dispatch_history','worker_bootstrap_completions','bootstrap_proof_key_history','bootstrap_proof_attachments',
 'bootstrap_proof_ticket_links','worker_transport_generations','worker_transport_bootstrap_grants','worker_transport_history','worker_transport_heads','worker_transport_audit','worker_bootstrap_heads','worker_bootstrap_audit','decision_authority_events'];
const ownTables=['worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events',
 'worker_transport_generations','worker_transport_bootstrap_grants','worker_transport_history','worker_transport_heads','worker_transport_audit','decision_authority_events','bootstrap_proof_ticket_links'];
const before='IF bootstrap_v3_active() IS NOT NULL THEN NEW:=jsonb_populate_record(NEW,bootstrap_v3_guard(TG_TABLE_NAME,TG_OP,to_jsonb(NEW),to_jsonb(OLD)));RETURN NEW;END IF;';
const capture='IF bootstrap_v3_active() IS NOT NULL THEN PERFORM bootstrap_v3_capture(TG_TABLE_NAME,TG_OP,to_jsonb(NEW),to_jsonb(OLD));RETURN NULL;END IF;';
export const upgrades:Record<string,string>={
 bootstrap_lifecycle_write_guard:before,
 transport_authority_write_guard:before,
 decision_attestation_child_guard:before.replace('IS NOT NULL','IS NOT NULL AND TG_TABLE_NAME=\'decision_authority_events\''),
 bootstrap_proof_child_guard:before.replace('IS NOT NULL','IS NOT NULL AND TG_TABLE_NAME=\'bootstrap_proof_ticket_links\''),
 decision_attestation_seal_guard:'IF bootstrap_v3_active() IS NOT NULL THEN RETURN NEW;END IF;',
 bootstrap_lifecycle_audit:capture,
 transport_authority_audit_append:capture,
 bootstrap_proof_audit:capture.replace('IS NOT NULL','IS NOT NULL AND TG_TABLE_NAME=\'bootstrap_proof_ticket_links\''),
 transport_bootstrap_advance:'IF bootstrap_v3_active() IS NOT NULL THEN RETURN NULL;END IF;',
 decision_attestation_audit:`IF bootstrap_v3_active() IS NOT NULL AND TG_TABLE_NAME IN (${ownTables.filter(t=>!['worker_transport_audit','bootstrap_proof_ticket_links'].includes(t)).map(q).join(',')}) THEN
 IF TG_TABLE_NAME='decision_authority_events' THEN PERFORM bootstrap_v3_capture(TG_TABLE_NAME,TG_OP,to_jsonb(NEW),to_jsonb(OLD));END IF;
 PERFORM bootstrap_v3_after(TG_TABLE_NAME,to_jsonb(NEW));RETURN NULL;END IF;`,
 transport_bootstrap_source_lock:"IF bootstrap_v3_active() IS NOT NULL AND TG_TABLE_NAME='worker_bootstrap_tickets' THEN PERFORM bootstrap_v3_advance(bootstrap_v3_active(),bootstrap_v3_next(bootstrap_v3_active())->>'slot','statement_guard');RETURN NULL;END IF;",
 decision_attestation_lock:"IF bootstrap_v3_active() IS NOT NULL AND TG_TABLE_NAME='decision_authority_events' THEN PERFORM bootstrap_v3_mode(true);RETURN NULL;END IF;",
};

export function buildV3Backend(){
 const folders=readdirSync('prisma/migrations',{withFileTypes:true}).filter(x=>x.isDirectory()&&x.name<'20260925050000_bootstrap_proof_issuance_v3').map(x=>x.name).sort();
 assert.equal(folders.length,86,'Historical migration inventory changed');
 const historical=folders.map(n=>({path:`prisma/migrations/${n}/migration.sql`,sql:read(`prisma/migrations/${n}/migration.sql`)}));
 const historyDigest=sha(historical.map(x=>`${x.path}\0${sha(x.sql)}\n`).join(''));
 assert.equal(historyDigest,'1d74b2ebd6baf4f5ca46e00ede1a0be78ba1489eece4e709feca709ba2f4114f','Migration 1-86 source changed; regeneration cannot authorize a historical edit');
 const base=new Map<string,Fn>();for(const f of historical.flatMap(x=>functions(x.sql)))base.set(f.name,f);
 const sql83=historical.find(x=>x.path.includes('20260925010000_'))!.sql;
 const oldTest=sql83.match(/old_test TEXT:='([^']+)'/)![1],newTest=sql83.match(/new_test TEXT:='([^']+)'/)![1];
 const lifecycle=base.get('bootstrap_lifecycle_write_guard')!;
 assert.equal(lifecycle.hash,'1000876fe64fa1808625f0e9b06db2a86f8b4d1aa26d7dd0f6cce07be045e048');
 assert.equal(lifecycle.body.split(oldTest).length-1,2);lifecycle.body=lifecycle.body.replaceAll(oldTest,newTest);lifecycle.hash=sha(lifecycle.body);
 assert.equal(lifecycle.hash,'5a20ef2f1215d86cbaec27f129d83eb608b16e92afb074e1e18b0490fc328cf1');
 const input=read(migration87),head=input.split(marker)[0].trimEnd()+'\n';assert.ok(head.includes(schemaSql()),'Regenerate and review structural schema');
 assert.doesNotMatch(head,/\b(?:DROP|DELETE FROM|TRUNCATE TABLE|DISABLE TRIGGER|ALTER TABLE)\b/i);
 const own=functions(head);assert.equal(own.length,(head.match(/CREATE FUNCTION /g)??[]).length,'Unparsed function');
 const all=new Map(base);for(const f of own)all.set(f.name,f);
 let footer=marker+'\n-- Legacy bodies remain byte-for-byte suffixes after a version-specific branch.\n';
 const upgradePins:Record<string,{old:string;hash:string}>={};
 for(const [name,prefix] of Object.entries(upgrades)){
  const old=base.get(name)!;assert.ok(old,name);assert.equal(old.result,'trigger');
  const at=old.body.indexOf('BEGIN');assert.ok(at>=0);
  const body=old.body.slice(0,at+5)+'\n '+prefix+'\n'+old.body.slice(at+5),hash=sha(body);
  upgradePins[name]={old:old.hash,hash};all.set(name,{...old,body,hash});
  footer+=`DO $upgrade$ DECLARE body TEXT;prefix TEXT:=${q(prefix)};BEGIN
 SELECT replace(p.prosrc,chr(13),'') INTO body FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=${q(name)} AND p.pronargs=0 AND p.prorettype='trigger'::regtype
 AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND NOT p.prosecdef AND p.proconfig IS NULL;
 IF body IS NULL OR encode(sha256(convert_to(body,'UTF8')),'hex')<>${q(old.hash)} THEN RAISE EXCEPTION 'bootstrap_v3_old_guard_drift';END IF;
 body:=substring(body FROM 1 FOR position('BEGIN' IN body)+4)||chr(10)||' '||prefix||chr(10)||substring(body FROM position('BEGIN' IN body)+5);
 EXECUTE 'CREATE OR REPLACE FUNCTION ${name}() RETURNS TRIGGER LANGUAGE plpgsql AS '||quote_literal(body);
END $upgrade$;
`;
 }
 const generatedTriggers:Trigger[]=[];
 function trigger(table:string,name:string,fn:string,events:string,when='BEFORE',row=true,deferred=false){
  footer+=`CREATE ${deferred?'CONSTRAINT ':''}TRIGGER ${name} ${when} ${events} ON ${table} ${deferred?'DEFERRABLE INITIALLY DEFERRED ':''}FOR EACH ${row?'ROW':'STATEMENT'} EXECUTE FUNCTION ${fn}();\n`;
  generatedTriggers.push({table,name,function:fn,kind:(when==='BEFORE'?2:0)+(row?1:0)+events.split(' OR ').reduce((n,e)=>n+({INSERT:4,UPDATE:16,DELETE:8,TRUNCATE:32} as any)[e],0),deferred});
 }
 trigger('bootstrap_v3_operations','bootstrap_v3_operation_guard','bootstrap_v3_operation_guard','INSERT');
 trigger('bootstrap_v3_operations','bootstrap_v3_operation_audit','bootstrap_v3_own_audit','INSERT','AFTER');
 trigger('bootstrap_v3_operations','bootstrap_v3_commit_guard','bootstrap_v3_commit_guard','INSERT','AFTER',true,true);
 trigger('bootstrap_v3_phases','bootstrap_v3_phase_guard','bootstrap_v3_phase_guard','INSERT');
 for(const t of ['bootstrap_v3_seals','bootstrap_v3_seal_audit']){
  trigger(t,'bootstrap_v3_own_guard','bootstrap_v3_own_guard','INSERT');trigger(t,'bootstrap_v3_own_audit','bootstrap_v3_own_audit','INSERT','AFTER');
 }
 const newTables=tables(head).map(t=>t.table);
 for(const table of newTables.filter(t=>t!=='bootstrap_v3_catalog_manifest')){
  trigger(table,'bootstrap_v3_no_mutation','bootstrap_v3_immutable','UPDATE OR DELETE OR TRUNCATE','BEFORE',false);
  if(!['bootstrap_v3_operations','bootstrap_v3_phases','bootstrap_v3_seals','bootstrap_v3_seal_audit'].includes(table))trigger(table,'bootstrap_v3_automatic_only','bootstrap_v3_immutable','INSERT');
 }
 trigger('ready_source_fence','bootstrap_v3_epoch_observe','bootstrap_v3_epoch_observe','UPDATE','AFTER');
 trigger('events','bootstrap_v3_event_guard','bootstrap_v3_event_guard','INSERT OR UPDATE OR DELETE');
 for(const table of sourceTables)trigger(table,'zzzz_bootstrap_v3_source','bootstrap_v3_foreign_observe','INSERT OR UPDATE OR DELETE','AFTER');
 const retained=new Map<string,Trigger>();
 const register=(v:any)=>retained.set(`${v.table}:${v.name}`,{table:v.table,name:v.name,function:v.function,kind:v.kind,deferred:v.deferred});
 for(const h of historical){
  directTriggers(h.sql).forEach(register);
  for(const loop of h.sql.matchAll(/FOREACH (\w+) IN ARRAY ARRAY\[([^]*?)\] LOOP([^]*?)END LOOP/g)){
   const names=[...loop[2].matchAll(/'([^']+)'/g)].map(m=>m[1]);
   for(const template of loop[3].matchAll(/EXECUTE format\('(CREATE (?:CONSTRAINT )?TRIGGER [^']+)'\s*,\s*\w+\)/g)){
    assert.equal((template[1].match(/%I/g)??[]).length,1);
    for(const table of names)directTriggers(template[1].replace('%I',table)+';').forEach(register);
   }
  }
  // This historical loop derives exactly the already-installed ready sources.
  if(h.sql.includes("WHERE t.tgname='ready_source_changed' LOOP"))for(const t of [...retained.values()].filter(t=>t.name==='ready_source_changed'))
   register({table:t.table,name:'task_risk_source_changed',function:'task_risk_source_changed',kind:29,deferred:false});
 }
 [...channelGuards,...ticketGuards,...decisionAttestationOwnGuards,...proofPersistenceTriggers].forEach(register);
 generatedTriggers.forEach(register);
 // The manifest trigger is installed after its one migration-time metadata row.
 const manifestTrigger={table:'bootstrap_v3_catalog_manifest',name:'bootstrap_v3_manifest_immutable',function:'bootstrap_v3_immutable',kind:62,deferred:false};
 register(manifestTrigger);
 const receiptTables=['worker_bootstrap_write_receipts','decision_attestation_write_receipts','worker_transport_write_audit','bootstrap_proof_write_receipts'];
 const exactTriggerTables=[...new Set([...newTables,...ownTables,...sourceTables,...receiptTables,'events','ready_source_fence'])];
 const triggers=[...retained.values()].filter(t=>exactTriggerTables.includes(t.table)||generatedTriggers.some(g=>g.table===t.table&&g.name===t.name)).sort((a,b)=>`${a.table}:${a.name}`.localeCompare(`${b.table}:${b.name}`));
 const required=new Set([...own.map(f=>f.name),...Object.keys(upgrades),...triggers.map(t=>t.function)]);
 for(const name of required){
  const fn=all.get(name);assert.ok(fn,`Unparsed dependency ${name}`);
  for(const m of fn.body.matchAll(/\b(\w+)\s*\(/g))if(all.has(m[1]))required.add(m[1]);
 }
 const pinnedFunctions=[...required].sort().map(name=>{const {body,...f}=all.get(name)!;return f;});
 const tableDefs=new Map(historical.flatMap(x=>tables(x.sql)).map(t=>[t.table,t.parts]));for(const t of tables(head))tableDefs.set(t.table,t.parts);
 const writerTables=[...newTables,...ownTables,...receiptTables];
 const columns=writerTables.map(table=>{
  const definitions=[...(tableDefs.get(table)??[])];assert.ok(definitions.length,table);
  for(const h of historical)for(const m of h.sql.matchAll(new RegExp(`ALTER TABLE ${table} ADD COLUMN (\\w+) ([^;]+);`,'g')))definitions.push(`${m[1]} ${m[2]}`);
  const cols=definitions.filter(d=>!/^\s*(?:CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/.test(d)).map(d=>{
   const m=d.match(/^(\w+)\s+(UUID|TEXT|JSONB|BYTEA|BIGINT|BOOLEAN|INT|TIMESTAMPTZ)\b/);assert.ok(m,`${table}: ${d}`);
   return {name:m[1],type:normalizedType(m[2]),generated:/GENERATED ALWAYS AS \(/.test(d)?'s':''};
  });assert.equal(new Set(cols.map(c=>c.name)).size,cols.length,table);return {table,columns:cols};
 });
 const foreignKeys=tables(head).flatMap(t=>t.parts.flatMap(d=>{
  const m=d.match(/^(\w+)\s+\w+.*?REFERENCES (\w+)\(([^)]+)\) ON DELETE RESTRICT/);
  return m?[{table:t.table,target:m[2],columns:[m[1]],targetColumns:m[3].split(',').map(x=>x.trim())}]:[];
 }));
 const manifest={version:'bootstrap-v3-catalog-v1',functions:pinnedFunctions,triggers,columns,foreignKeys,exactTriggerTables};
 footer+=`INSERT INTO bootstrap_v3_catalog_manifest(id,record) VALUES(true,${q(JSON.stringify(manifest))}::jsonb);\n`;
 footer+='CREATE TRIGGER bootstrap_v3_manifest_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON bootstrap_v3_catalog_manifest FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_v3_immutable();\n';
 footer+='COMMIT;\n';
 const pins='// Migration 87 source pins. UNAPPLIED / NATIVE UNQUALIFIED.\n'+
  `export const v3HistoricalMigrationsDigest=${JSON.stringify(historyDigest)};\n`+
  `export const v3UpgradePins=${JSON.stringify(upgradePins,null,2)} as const;\n`+
  `export const v3CatalogManifest=${JSON.stringify(manifest,null,2)} as const;\n`;
 return {sql:head+'\n'+footer,pins,manifest,upgradePins,historyDigest,functions:all};
}
export function checkV3Backend(write=false){
 const r=buildV3Backend();
 if(write){writeFileSync(migration87,r.sql,'utf8');writeFileSync(guardTarget,r.pins,'utf8');}
 else {assert.equal(read(migration87),r.sql,'SQL upgrade/catalog changed');assert.equal(read(guardTarget),r.pins,'Review then regenerate source pins');}
 return {sourceOnly:true,unapplied:true,nativeQualified:false,historicalMigrations:86,functions:r.manifest.functions.length,triggers:r.manifest.triggers.length,upgrades:Object.keys(r.upgradePins).length};
}
if(process.argv[1]?.replace(/\\/g,'/').endsWith('/check-bootstrap-v3-backend.ts'))console.log(JSON.stringify(checkV3Backend(process.argv.includes('--write-guards'))));
