import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const migration='prisma/migrations/20260925010000_decision_attestation/migration.sql';
const target='src/modules/api-keys/decision-attestation-guards.ts';
const sql=readFileSync(migration,'utf8').replace(/\r/g,'');
const functions=new Map([...sql.matchAll(/CREATE FUNCTION (\w+)\((.*?)\) RETURNS (\w+) LANGUAGE plpgsql (IMMUTABLE|STABLE|VOLATILE|) ?AS \$\$([\s\S]*?)\$\$;/g)].map(m=>[m[1],
 {name:m[1],args:m[2],result:m[3].toLowerCase(),volatility:({IMMUTABLE:'i',STABLE:'s',VOLATILE:'v','':'v'})[m[4]],hash:createHash('sha256').update(m[5]).digest('hex')}]));
assert.equal(functions.size,14);
const arrays=[...sql.matchAll(/FOREACH tbl IN ARRAY ARRAY\[(.*?)\] LOOP/g)].map(m=>[...m[1].matchAll(/'([^']+)'/g)].map(r=>r[1]));
const rows=[],add=(table,name,fn,kind,deferred=false)=>rows.push({table,name,function:fn,kind,hash:functions.get(fn).hash,deferred});
for(const table of arrays[0]){
 add(table,'aa_decision_attestation_fence','decision_attestation_lock',30);
 add(table,'zz_decision_attestation_audit','decision_attestation_audit',29);
 add(table,'decision_attestation_no_truncate','decision_attestation_immutable',34);
}
for(const table of arrays[1])add(table,'decision_attestation_child_guard','decision_attestation_child_guard',31);
for(const m of sql.matchAll(/^CREATE (CONSTRAINT )?TRIGGER (\w+) (BEFORE|AFTER) (INSERT(?: OR UPDATE OR DELETE)?|TRUNCATE) ON (\w+)(.*?)EXECUTE FUNCTION (\w+)\(\);/gm)){
 const kind=(m[3]==='BEFORE'?2:0)+(m[6].includes('FOR EACH ROW')?1:0)+(m[4]==='TRUNCATE'?32:m[4].includes('UPDATE')?28:4);
 add(m[5],m[2],m[7],kind,!!m[1]);
}
assert.equal(rows.length,111);
const helpers=[...functions.values()].filter(f=>f.result!=='trigger').map(({name,hash,volatility,result,args})=>({name,hash,volatility,result,
 args:args.split(',').map(a=>({TEXT:'25',JSONB:'3802',UUID:'2950'})[a.trim().split(' ').at(-1)]).join(' ')}));
const output='// Reviewed LF-normalized migration 83 bodies; UNAPPLIED.\n'+
 'export const decisionAttestationSources='+JSON.stringify(arrays[0])+' as const;\n'+
 'export const decisionAttestationOwnGuards=[\n'+rows.map(r=>' '+JSON.stringify(r)).join(',\n')+'\n] as const;\n'+
 'export const decisionAttestationOwnHelpers=[\n'+helpers.map(r=>' '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
if(process.argv.includes('--write-guards'))writeFileSync(target,output);
else assert.equal(readFileSync(target,'utf8').replace(/\r/g,''),output,'Migration bodies/catalog bindings changed: review then regenerate pins');
assert.doesNotMatch(sql,/\b(?:DROP|TRUNCATE TABLE|DELETE FROM|CREATE OR REPLACE|DISABLE TRIGGER)\b/i);
assert.doesNotMatch(sql,/UPDATE\s+(?:decisions|decision_revisions|decision_acceptances)\s/i);
assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1]),['decision_owner_auth_evidence','decision_attestation_key_history','decision_attestations','decision_authority_events','decision_attestation_write_receipts']);
console.log(JSON.stringify({sourceOnly:true,unapplied:true,functions:functions.size,triggers:rows.length,helpers:helpers.length,additive:true}));
