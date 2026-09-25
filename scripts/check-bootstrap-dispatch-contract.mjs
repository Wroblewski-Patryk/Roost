import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sql=readFileSync('prisma/migrations/20260925020000_bootstrap_dispatch/migration.sql','utf8').replace(/\r/g,'');
const prior=readFileSync('prisma/migrations/20260925010000_decision_attestation/migration.sql','utf8').replace(/\r/g,'');
const functions=new Map([...(`${prior}\n${sql}`).matchAll(/CREATE FUNCTION (\w+)\(\) RETURNS TRIGGER LANGUAGE plpgsql AS \$\$([\s\S]*?)\$\$;/g)]
 .map(m=>[m[1],createHash('sha256').update(m[2]).digest('hex')]));
const guards=[...sql.matchAll(/^CREATE (CONSTRAINT )?TRIGGER (\w+) (BEFORE|AFTER) (INSERT(?: OR UPDATE OR DELETE)?|TRUNCATE) ON (\w+)(.*?)EXECUTE FUNCTION (\w+)\(\);/gm)]
 .map(m=>({table:m[5],name:m[2],function:m[7],kind:(m[3]==='BEFORE'?2:0)+(m[6].includes('FOR EACH ROW')?1:0)+(m[4]==='TRUNCATE'?32:m[4].includes('UPDATE')?28:4),hash:functions.get(m[7]),deferred:!!m[1]}));
assert.equal(guards.length,8);assert.ok(guards.every(g=>g.hash));
assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1]),['worker_bootstrap_dispatch_history','worker_bootstrap_dispatch_receipts']);
assert.doesNotMatch(sql,/\b(DROP|ALTER TABLE|CREATE OR REPLACE|DELETE FROM|UPDATE ready_source_fence|DISABLE TRIGGER)\b/i);
const output='// LF-normalized migration 84 source pins; UNAPPLIED, not native evidence.\nexport const dispatchGuards='+JSON.stringify(guards,null,1)+' as const;\n';
const target='src/modules/api-keys/bootstrap-dispatch-guards.ts';
if(process.argv.includes('--write-guards'))writeFileSync(target,output);else assert.equal(readFileSync(target,'utf8').replace(/\r/g,''),output);
console.log(JSON.stringify({sourceOnly:true,unapplied:true,triggers:guards.length,additiveChildTables:2}));
