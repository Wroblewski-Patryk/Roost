import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const path='prisma/migrations/20260925030000_bootstrap_canonical_completion/migration.sql';
const sql=readFileSync(path,'utf8').replace(/\r/g,'');
const functionPattern=/CREATE (?:OR REPLACE )?FUNCTION (\w+)\(([^)]*)\) RETURNS (\w+) LANGUAGE (\w+)(?: (VOLATILE|STABLE|IMMUTABLE))? AS \$\$([^]*?)\$\$;/g;
const parseFunctions=text=>[...text.matchAll(functionPattern)].map(m=>({name:m[1],args:m[2].toLowerCase().split(',').map(a=>a.trim()).join(', '),
 result:m[3].toLowerCase(),language:m[4],volatility:(m[5]??'VOLATILE')[0].toLowerCase(),hash:createHash('sha256').update(m[6]).digest('hex')}));
const functions=parseFunctions(sql);
const triggers=[...sql.matchAll(/^CREATE (CONSTRAINT )?TRIGGER (\w+) (BEFORE|AFTER) (INSERT(?: OR UPDATE OR DELETE)?|TRUNCATE) ON (\w+)(.*?)EXECUTE FUNCTION (\w+)\(\);/gm)]
 .map(m=>({table:m[5],name:m[2],function:m[7],kind:(m[3]==='BEFORE'?2:0)+(m[6].includes('FOR EACH ROW')?1:0)+(m[4]==='TRUNCATE'?32:m[4].includes('UPDATE')?28:4),deferred:!!m[1]}));
assert.equal(functions.length,9);assert.equal(triggers.length,7);
const legacy=[...parseFunctions(readFileSync('prisma/migrations/20260923130000_worker_credential_lifecycle/migration.sql','utf8').replace(/\r/g,'')),
 ...parseFunctions(readFileSync('prisma/migrations/20260923230000_bootstrap_transport_authority/migration.sql','utf8').replace(/\r/g,'')),
 ...parseFunctions(readFileSync('prisma/migrations/20260923150000_worker_credential_handoff/migration.sql','utf8').replace(/\r/g,''))];
for(const name of ['worker_handoff_owner_current','worker_handoff_guard','worker_credential_guard','worker_handoff_ack_commit_guard','agent_credential_operation_guard','transport_bootstrap_source_lock']){
 const f=legacy.filter(f=>f.name===name).at(-1);assert.ok(f);functions.push(f);
}
triggers.push({table:'worker_credential_handoffs',name:'worker_handoff_guard',function:'worker_handoff_guard',kind:31,deferred:false},
 {table:'worker_credential_handoffs',name:'worker_handoff_ack_commit_guard',function:'worker_handoff_ack_commit_guard',kind:21,deferred:true},
 {table:'api_keys',name:'worker_credential_guard',function:'worker_credential_guard',kind:31,deferred:false},
 {table:'agent_credential_operations',name:'agent_credential_operation_guard',function:'agent_credential_operation_guard',kind:31,deferred:false});
// This trigger name occurs on several existing tables; the catalog query below
// is scoped to exact table/name pairs to pin only this atom's additional entry.
triggers.push({table:'api_keys',name:'transport_bootstrap_source_fence',function:'transport_bootstrap_source_lock',kind:30,deferred:false});
assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1]),['worker_bootstrap_completions','worker_bootstrap_completion_receipts']);
assert.doesNotMatch(sql,/\b(DROP|ALTER TABLE|CREATE OR REPLACE|DELETE FROM|DISABLE TRIGGER|INSERT INTO api_keys)\b/i);
assert.ok(triggers.every(t=>functions.some(f=>f.name===t.function)));
const output='// Migration 85 source pins only; UNAPPLIED, no native qualification.\nexport const completionFunctions='+JSON.stringify(functions,null,1)+' as const;\nexport const completionTriggers='+JSON.stringify(triggers,null,1)+' as const;\n';
const target='src/modules/api-keys/bootstrap-canonical-completion-guards.ts';
if(process.argv.includes('--write-guards'))writeFileSync(target,output);else assert.equal(readFileSync(target,'utf8').replace(/\r/g,''),output);
console.log(JSON.stringify({sourceOnly:true,unapplied:true,functions:functions.length,triggers:triggers.length,additiveChildTables:2}));
