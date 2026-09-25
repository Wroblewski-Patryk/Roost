import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const path='prisma/migrations/20260925040000_bootstrap_proof_authority/migration.sql',sql=readFileSync(path,'utf8').replace(/\r/g,'');
const functions=[...sql.matchAll(/CREATE FUNCTION (\w+)\(([^)]*)\) RETURNS (\w+) LANGUAGE (\w+)(?: (VOLATILE|STABLE|IMMUTABLE))? AS \$\$([^]*?)\$\$;/g)]
 .map(m=>({name:m[1],args:m[2].toLowerCase().replace(/\bint\b/g,'integer').replace(/\btimestamptz\b/g,'timestamp with time zone').split(',').map(a=>a.trim()).join(', '),result:m[3].toLowerCase(),language:m[4],volatility:(m[5]??'VOLATILE')[0].toLowerCase(),hash:createHash('sha256').update(m[6]).digest('hex')}));
const triggers=[...sql.matchAll(/^CREATE (CONSTRAINT )?TRIGGER (\w+) (BEFORE|AFTER) ([A-Z ]+?) ON (\w+) (.*?)EXECUTE FUNCTION (\w+)\(\);/gm)]
 .map(m=>({table:m[5],name:m[2],function:m[7],kind:(m[3]==='BEFORE'?2:0)+(m[6].includes('FOR EACH ROW')?1:0)+m[4].split(' OR ').reduce((n,event)=>n+({INSERT:4,UPDATE:16,DELETE:8,TRUNCATE:32}[event]??0),0),deferred:!!m[1]}));
assert.ok(functions.length>=17);assert.equal(triggers.length,59);
assert.ok(triggers.every(t=>functions.some(f=>f.name===t.function)));
assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1]),['bootstrap_proof_key_history','bootstrap_proof_attachments','bootstrap_proof_ticket_links','bootstrap_proof_write_receipts']);
assert.doesNotMatch(sql,/\b(DROP|ALTER TABLE|CREATE OR REPLACE|DELETE FROM|DISABLE TRIGGER|TRUNCATE TABLE|INSERT INTO api_keys)\b/i);
assert.match(sql,/UNAPPLIED/);assert.match(sql,/bootstrap_proof_v3_seal_unavailable/);
assert.equal((sql.match(/CREATE CONSTRAINT TRIGGER/g)??[]).length,3);
const foreignKeys=[];
for(const table of sql.matchAll(/CREATE TABLE (\w+) \(([^]*?)\n\);/g)){
 for(const m of table[2].matchAll(/FOREIGN KEY\(([^)]+)\) REFERENCES (\w+)\(([^)]+)\) ON DELETE RESTRICT/g))foreignKeys.push({table:table[1],columns:m[1].split(','),target:m[2],targetColumns:m[3].split(',')});
 for(const m of table[2].matchAll(/(\w+) UUID(?: NOT NULL| UNIQUE| PRIMARY KEY)* REFERENCES (\w+)\(([^)]+)\) ON DELETE RESTRICT/g))foreignKeys.push({table:table[1],columns:[m[1]],target:m[2],targetColumns:m[3].split(',')});
}
assert.ok(foreignKeys.length>=17);
const output='// Migration 86 source pins only. UNAPPLIED; native qualification absent.\nexport const proofPersistenceFunctions='+JSON.stringify(functions,null,1)+' as const;\nexport const proofPersistenceTriggers='+JSON.stringify(triggers,null,1)+' as const;\nexport const proofPersistenceForeignKeys='+JSON.stringify(foreignKeys,null,1)+' as const;\n';
const target='src/modules/api-keys/bootstrap-proof-persistence-guards.ts';
if(process.argv.includes('--write-guards'))writeFileSync(target,output);else assert.equal(readFileSync(target,'utf8').replace(/\r/g,''),output);
console.log(JSON.stringify({sourceOnly:true,unapplied:true,functions:functions.length,triggers:triggers.length,foreignKeys:foreignKeys.length,additiveChildren:4}));
