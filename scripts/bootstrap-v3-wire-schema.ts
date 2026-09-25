import {v3Plan} from '../src/modules/api-keys/bootstrap-proof-issuance-contract';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// Structural schema only. Effects are independently enforced by the native
// authority/transcript checks; this generator never claims to translate code.
export function v3WireSchema(){
 const nodes:unknown[]=[],ids=new Map<string,number>();
 function visit(schema:any):number {
  const d=schema._def;let n:any;
  switch(d.typeName){
   case 'ZodEffects':return visit(d.schema);
   case 'ZodObject':
    assert.equal(d.unknownKeys,'strict');
    n={kind:'object',fields:Object.fromEntries(Object.entries(d.shape()).map(([k,s])=>[k,visit(s)]))};break;
   case 'ZodLiteral':n={kind:'literal',value:d.value};break;
   case 'ZodEnum':n={kind:'enum',values:d.values};break;
   case 'ZodUnion':n={kind:'union',options:d.options.map(visit)};break;
   case 'ZodNullable':n={kind:'nullable',inner:visit(d.innerType)};break;
   case 'ZodArray':n={kind:'array',inner:visit(d.type),min:d.minLength?.value??0,max:d.maxLength?.value??1024};break;
   case 'ZodString':case 'ZodNumber':
    n={kind:d.typeName==='ZodString'?'string':'number',checks:d.checks.map((c:any)=>{
     assert.ok(['uuid','regex','datetime','int','min','max','length'].includes(c.kind));
     if(c.kind==='regex'){assert.equal(c.regex.flags,'');return {...c,regex:c.regex.source};}return c;
    })};break;
   default:throw Error(`Untranslated wire type: ${d.typeName}`);
  }
  const key=JSON.stringify(n),existing=ids.get(key);if(existing!==undefined)return existing;
  const id=nodes.length;nodes.push(n);ids.set(key,id);return id;
 }
 const root=visit(v3Plan);return {root,nodes};
}
const file='prisma/migrations/20260925050000_bootstrap_proof_issuance_v3/migration.sql';
const prefix='-- BEGIN GENERATED STRUCTURAL SCHEMA\n',suffix='-- END GENERATED STRUCTURAL SCHEMA';
export const schemaSql=()=>prefix+"CREATE FUNCTION bootstrap_v3_wire_schema() RETURNS JSONB LANGUAGE sql IMMUTABLE AS $schema$\n SELECT '"+
 JSON.stringify(v3WireSchema()).replaceAll("'","''")+"'::jsonb\n$schema$;\n"+suffix;
if(process.argv.includes('--write-schema')){
 const sql=readFileSync(file,'utf8').replace(/\r/g,'');
 const start=sql.indexOf(prefix),end=sql.indexOf(suffix);
 assert.equal(start<0,end<0);
 writeFileSync(file,start<0?sql+'\n'+schemaSql()+'\n':sql.slice(0,start)+schemaSql()+sql.slice(end+suffix.length),'utf8');
}
