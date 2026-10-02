import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const name="20261002124500_application_release_scope";
const source=(n:string)=>readFileSync(`prisma/migrations/${n}/migration.sql`,"utf8");
const functionText=(text:string,fn:string)=>{
 const result=text.match(new RegExp(`CREATE(?: OR REPLACE)? FUNCTION ${fn}\\(\\)[\\s\\S]*?END \\$\\$;`))?.[0];
 assert.ok(result,`${fn} missing`);return result;
};
test("additive scope migration changes only purpose predicates in both existing full guards",()=>{
 const next=source(name),needle="app.metadata->>'releasePurpose' IS DISTINCT FROM 'temporary_certification'";
 for(const [prior,fn,argument] of [
  ["20261001010000_governed_release","governed_release_insert_guard","NEW.snapshot"],
  ["20261002103000_governed_release_renewal","governed_release_renewal_guard","r.snapshot"]
 ]){
  const original=functionText(source(prior),fn);
  const expected=original.replace(`CREATE FUNCTION ${fn}`,`CREATE OR REPLACE FUNCTION ${fn}`)
   .replace(needle,`NOT governed_release_application_scope(app.metadata,${argument}->'manifest')`);
  assert.equal(functionText(next,fn).replaceAll("\r\n","\n"),expected.replaceAll("\r\n","\n"));
 }
 assert.ok(!/\b(?:DROP|TRUNCATE|DELETE|INSERT INTO|UPDATE\s+[a-z_]+\s+SET|ALTER TABLE)\b/i.test(next));
 assert.ok(next.trim().startsWith("BEGIN;")&&next.trim().endsWith("COMMIT;"));
});

test("PostgreSQL: additive application scope preserves records and rejects changed manifest, purpose and target configuration",()=>{
 const database=`companycore_test_release_scope_${randomUUID().replaceAll("-","")}`;
 const args=["compose","exec","-T","postgres","psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","companycore","-d",database];
 const q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
 const sql=(input:string)=>execFileSync("docker",args,{input,windowsHide:true,encoding:"utf8",maxBuffer:32*1024*1024});
 let created=false;
 execFileSync("docker",["compose","exec","-T","postgres","createdb","-U","companycore",database],{windowsHide:true});created=true;
 try{
  sql(readdirSync("prisma/migrations").filter(n=>/^\d/.test(n)&&n<name).sort().map(source).join("\n"));
  const user=randomUUID(),workspace=randomUUID(),app=randomUUID();
  sql(`INSERT INTO users(id,email,password_hash,updated_at) VALUES(${q(user)},'scope-fixture@example.test','synthetic-no-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${q(workspace)},'Scope fixture',${q(user)},now());
   INSERT INTO applications(id,workspace_id,name,slug,metadata,updated_at) VALUES(${q(app)},${q(workspace)},'Preserved scope fixture','preserved-scope','{"preserve":"fixture"}',now());`);
  const preserved=()=>sql("SELECT to_jsonb(a)::text FROM applications a ORDER BY id; SELECT to_jsonb(w)::text FROM workspaces w ORDER BY id; SELECT to_jsonb(u)::text FROM users u ORDER BY id;");
  const before=preserved();sql(source(name));assert.equal(preserved(),before);
  assert.equal(sql("SELECT count(*) FROM governed_releases;SELECT count(*) FROM governed_release_renewals;").trim(),"0\n0");
  const targetIds=["fixture-api","fixture-web"],metadata:any={releasePurpose:"application_release",localDirectory:"C:\\Fixture\\Pilot",
   deploymentUrl:"https://pilot.example.test",releaseTargets:targetIds.map(targetId=>({targetId,dockerfile:`/apps/${targetId}/Dockerfile`})),
   releasePublicOrigins:["https://pilot.example.test","https://api.example.test"]};
  const manifest:any={schemaVersion:"roost-release-manifest-v2",purpose:"application_release",
   repository:{url:"https://github.com/example/pilot",canonicalDir:metadata.localDirectory},
   deployment:{provider:"coolify_git_set",targetId:targetIds[0],url:metadata.deploymentUrl,publicOrigins:metadata.releasePublicOrigins,
    targets:metadata.releaseTargets.map((t:any)=>({...t,name:t.targetId}))},
   cleanup:{archiveRepository:false,protectedResourceIds:targetIds,ownedResourceIds:["fixture-temporary-container"],
    coolifyTargetId:targetIds[0],repositoryUrl:"https://github.com/example/pilot",canonicalDir:metadata.localDirectory}};
  const allowed=(md:any,m:any)=>sql(`SELECT governed_release_application_scope(${json(md)},${m===undefined?"NULL":json(m)});`).trim()==="t";
  assert.equal(allowed(metadata,manifest),true);
  const certification={releasePurpose:"temporary_certification"};
  assert.equal(allowed(certification,undefined),true);
  assert.equal(allowed(certification,{schemaVersion:"roost-release-manifest-v1",deployment:{provider:"coolify"},cleanup:{archiveRepository:true}}),true);
  assert.equal(allowed(certification,manifest),false);
  assert.equal(allowed(metadata,undefined),false);
  assert.equal(allowed({},undefined),false);
  const cases:[string,(md:any,m:any)=>void][]=[
   ["changed purpose",md=>{md.releasePurpose="temporary_certification";}],
   ["unknown purpose",md=>{md.releasePurpose="unrecognized";}],
   ["wrong version",(_md,m)=>{m.schemaVersion="roost-release-manifest-v1";}],
   ["wrong manifest purpose",(_md,m)=>{m.purpose="temporary_certification";}],
   ["wrong provider",(_md,m)=>{m.deployment.provider="unrecognized";}],
   ["missing provider",(_md,m)=>{delete m.deployment.provider;}],
   ["archive permanent repository",(_md,m)=>{m.cleanup.archiveRepository=true;}],
   ["missing protected targets",(_md,m)=>{m.cleanup.protectedResourceIds=[];}],
   ["unprotected second target",(_md,m)=>{m.cleanup.protectedResourceIds=[targetIds[0]];}],
   ["duplicate protected resource",(_md,m)=>{m.cleanup.protectedResourceIds.push(targetIds[0]);}],
   ["owned protected resource",(_md,m)=>{m.cleanup.ownedResourceIds.push(targetIds[1]);}],
   ["duplicate owned resource",(_md,m)=>{m.cleanup.ownedResourceIds.push(m.cleanup.ownedResourceIds[0]);}],
   ["wrong cleanup target",(_md,m)=>{m.cleanup.coolifyTargetId="different";}],
   ["wrong cleanup repository",(_md,m)=>{m.cleanup.repositoryUrl="https://github.com/example/other";}],
   ["wrong cleanup directory",(_md,m)=>{m.cleanup.canonicalDir="C:\\Different";}],
   ["changed installed directory",md=>{md.localDirectory="C:\\Different";}],
   ["changed deployment URL",md=>{md.deploymentUrl="https://different.example.test";}],
   ["changed installed target",md=>{md.releaseTargets[0].targetId="different";}],
   ["changed installed Dockerfile",md=>{md.releaseTargets[0].dockerfile="/apps/other/Dockerfile";}],
   ["changed target Dockerfile",(_md,m)=>{m.deployment.targets[0].dockerfile="/apps/other/Dockerfile";}],
   ["unsafe Dockerfile",(md,m)=>{md.releaseTargets[0].dockerfile=m.deployment.targets[0].dockerfile="/apps/../Dockerfile";}],
   ["duplicate targets",(_md,m)=>{m.deployment.targets[1]={...m.deployment.targets[0]};}],
   ["missing target",(_md,m)=>{m.deployment.targets=[];}],
   ["mismatched public origins",md=>{md.releasePublicOrigins=["https://different.example.test"];}],
   ["untrusted URL origin",(md,m)=>{md.releasePublicOrigins=m.deployment.publicOrigins=["https://credential@different.example.test"];}],
   ["null origins",(_md,m)=>{m.deployment.publicOrigins=null;}],
   ["null targets",(_md,m)=>{m.deployment.targets=null;}],
   ["unbound deployment origin",(md,m)=>{md.releasePublicOrigins=m.deployment.publicOrigins=["https://api.example.test"];}],
   ["nontext target identity",(_md,m)=>{m.deployment.targetId=7;m.cleanup.coolifyTargetId=7;m.cleanup.protectedResourceIds.push("7");}]
  ];
  for(const [label,change] of cases){const md=structuredClone(metadata),m=structuredClone(manifest);change(md,m);assert.equal(allowed(md,m),false,label);}
  for(const fn of ["governed_release_insert_guard","governed_release_renewal_guard"])
   assert.match(sql(`SELECT pg_get_functiondef(${q(`${fn}()`)}::regprocedure);`),/NOT governed_release_application_scope/);
  assert.equal(preserved(),before);
 }finally{
  if(!/^companycore_test_release_scope_[a-f0-9]{32}$/.test(database))throw Error("Unsafe fixture database cleanup");
  if(created)execFileSync("docker",["compose","exec","-T","postgres","dropdb","-U","companycore",database],{windowsHide:true});
 }
});
