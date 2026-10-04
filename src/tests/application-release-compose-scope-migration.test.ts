import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { releaseCanonicalDirectoryMatches } from "../modules/agent-runtime/governed-release-contract";

const migration="20261004223000_release_compose_scope_parity";
const source=(n:string)=>readFileSync(`prisma/migrations/${n}/migration.sql`,"utf8");
test("scope parity is a forward function-only migration; release guards stay untouched",()=>{
 const next=source(migration);
 assert.equal(next.charCodeAt(0)===0xfeff,false);
 assert.ok(next.trim().startsWith("BEGIN;")&&next.trim().endsWith("COMMIT;"));
 assert.ok(!/\b(?:DROP|TRUNCATE|DELETE|INSERT INTO|UPDATE\s+[a-z_]+\s+SET|ALTER TABLE|CREATE TRIGGER)\b/i.test(next));
 assert.deepEqual([...next.matchAll(/CREATE(?: OR REPLACE)? FUNCTION ([a-z_]+)/g)].map(m=>m[1]),[
  "governed_release_lexical_directory","governed_release_canonical_directory_matches","governed_release_application_scope"]);
 const original=source("20261002124500_application_release_scope");
 const scope=original.slice(original.indexOf("CREATE FUNCTION governed_release_application_scope"),original.indexOf("CREATE OR REPLACE FUNCTION governed_release_insert_guard"));
 const expected=scope.replace("CREATE FUNCTION governed_release_application_scope","CREATE OR REPLACE FUNCTION governed_release_application_scope")
  .replace("projected JSONB;","projected JSONB;path_key TEXT;")
  .replace("('coolify','coolify_git_set')","('coolify','coolify_git_set','coolify_compose')")
  .replace("metadata->>'localDirectory' IS DISTINCT FROM manifest->'repository'->>'canonicalDir'","NOT governed_release_canonical_directory_matches(metadata,manifest->'repository'->>'canonicalDir')")
  .replace("targets:=manifest->'deployment'->'targets';origins:=manifest->'deployment'->'publicOrigins';","targets:=manifest->'deployment'->'targets';origins:=manifest->'deployment'->'publicOrigins';\n path_key:=CASE WHEN manifest->'deployment'->>'provider'='coolify_compose' THEN 'composePath' ELSE 'dockerfile' END;")
  .replaceAll("t->'dockerfile'","t->path_key").replaceAll("t->>'dockerfile'","t->>path_key")
  .replace("'dockerfile',t->>path_key","path_key,t->>path_key");
 assert.equal(next.slice(next.indexOf("CREATE OR REPLACE FUNCTION governed_release_application_scope"),next.lastIndexOf("COMMIT;")).trim().replaceAll("\r\n","\n"),expected.trim().replaceAll("\r\n","\n"),"all other historical scope predicates stay exact");
});

test("PostgreSQL: full migration chain preserves records and admits only exact Compose scope with lexical directory parity",()=>{
 const database=`companycore_test_release_scope_${randomUUID().replaceAll("-","")}`;
 const args=["compose","exec","-T","postgres","psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","companycore","-d",database];
 const q=(s:string)=>`'${s.replaceAll("'","''")}'`,json=(v:any)=>`${q(JSON.stringify(v))}::jsonb`;
 const sql=(input:string)=>execFileSync("docker",args,{input,windowsHide:true,encoding:"utf8",maxBuffer:32*1024*1024});
 let created=false;
 try{
  execFileSync("docker",["compose","exec","-T","postgres","createdb","-U","companycore",database],{windowsHide:true});created=true;
  sql(readdirSync("prisma/migrations").filter(n=>/^\d/.test(n)&&n<migration).sort().map(source).join("\n"));
  const user=randomUUID(),workspace=randomUUID(),app=randomUUID();
  sql(`INSERT INTO users(id,email,password_hash,updated_at) VALUES(${q(user)},'scope-parity@example.test','synthetic-no-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${q(workspace)},'Scope parity fixture',${q(user)},now());
   INSERT INTO applications(id,workspace_id,name,slug,metadata,updated_at) VALUES(${q(app)},${q(workspace)},'Preserved fixture','preserved-parity','{"preserve":"fixture"}',now());`);
  const preserved=()=>sql("SELECT to_jsonb(a)::text FROM applications a ORDER BY id;SELECT to_jsonb(w)::text FROM workspaces w ORDER BY id;SELECT to_jsonb(u)::text FROM users u ORDER BY id;SELECT count(*) FROM governed_releases;SELECT count(*) FROM governed_release_renewals;");
  const definition=(fn:string)=>sql(`SELECT pg_get_functiondef(${q(fn)}::regprocedure);`);
  const guards=["governed_release_insert_guard()","governed_release_renewal_guard()","governed_release_operation_guard()","governed_release_outcome_guard()"].map(definition);
  const before=preserved(),oldDefinition=definition("governed_release_application_scope(jsonb,jsonb)");
  const metadata:any={releasePurpose:"application_release",localDirectory:"Example",localWorkspaceRoot:"C:\\Workspace\\Applications",deploymentUrl:"https://app.example.test/",releaseTargets:[{targetId:"existing-compose",composePath:"/docker-compose.coolify.yml"}],releasePublicOrigins:["https://app.example.test"]};
  const manifest:any={schemaVersion:"roost-release-manifest-v2",purpose:"application_release",repository:{url:"https://github.com/example/application.git",canonicalDir:"C:\\Workspace\\Applications\\Example"},deployment:{provider:"coolify_compose",targetId:"existing-compose",url:metadata.deploymentUrl,targets:[{...metadata.releaseTargets[0],name:"Example"}],publicOrigins:metadata.releasePublicOrigins},cleanup:{archiveRepository:false,protectedResourceIds:["existing-compose","database-volume"],ownedResourceIds:["owned-fixture"],coolifyTargetId:"existing-compose",repositoryUrl:"https://github.com/example/application.git",canonicalDir:"C:\\Workspace\\Applications\\Example"}};
  const allowed=(md:any,m:any)=>sql(`SELECT governed_release_application_scope(${json(md)},${json(m)});`).trim()==="t";
  assert.equal(allowed(metadata,manifest),false,"old SQL reproduces valid Compose refusal");
  const git=structuredClone(manifest);git.deployment.provider="coolify_git_set";git.deployment.targets=[{targetId:"existing-compose",name:"Example",dockerfile:"/Dockerfile"}];
  const gitMetadata={...metadata,releaseTargets:[{targetId:"existing-compose",dockerfile:"/Dockerfile"}]};
  assert.equal(allowed(gitMetadata,git),false,"old SQL reproduces valid relative mapping refusal");
  sql("BEGIN;\n"+source(migration).replace(/^BEGIN;\s*/,"").replace(/COMMIT;\s*$/,"")+"ROLLBACK;");
  assert.equal(definition("governed_release_application_scope(jsonb,jsonb)"),oldDefinition,"rollback probe leaves original function");
  assert.equal(preserved(),before);
  sql(source(migration));
  assert.equal(allowed(metadata,manifest),true);
  assert.equal(allowed(gitMetadata,git),true);
  const absoluteMetadata={...metadata,localDirectory:manifest.repository.canonicalDir};delete absoluteMetadata.localWorkspaceRoot;
  assert.equal(allowed(absoluteMetadata,manifest),true,"absolute installations remain supported");
  const direct=(md:any,canonical:any)=>sql(`SELECT governed_release_canonical_directory_matches(${json(md)},${canonical===null?"NULL":q(canonical)});`).trim()==="t";
  const cases:[string,any,any][]=[
   ["Windows relative",metadata,manifest.repository.canonicalDir],
   ["mixed separators and case",{localDirectory:"Nested/Example",localWorkspaceRoot:"C:\\Workspace\\Applications"},"c:/workspace/applications/nested/example/"],
   ["drive root",{localDirectory:"Example",localWorkspaceRoot:"C:\\"},"C:\\Example"],
   ["absolute mapping wins",{localDirectory:"C:\\Workspace\\Example",localWorkspaceRoot:"D:\\Other"},"c:/workspace/example"],
   ["POSIX relative",{localDirectory:"example",localWorkspaceRoot:"/srv/apps"},"/srv/apps/example/"],
   ["POSIX case",{localDirectory:"/srv/apps/Example"},"/srv/apps/example"],
   ["POSIX root",{localDirectory:"example",localWorkspaceRoot:"/"},"/example"],
   ["missing root",{localDirectory:"Example"},"C:\\Workspace\\Example"],
   ["wrong root",{localDirectory:"Example",localWorkspaceRoot:"D:\\Workspace"},"C:\\Workspace\\Example"],
   ["prefix sibling",{localDirectory:"Example-other",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
   ["parent traversal",{localDirectory:"..\\Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Example"],
   ["dot",{localDirectory:".\\Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
   ["nested traversal",{localDirectory:"Nested/../Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
   ["root traversal",{localDirectory:"Example",localWorkspaceRoot:"C:\\Other\\..\\Workspace"},"C:\\Workspace\\Example"],
   ["manifest traversal",{localDirectory:"C:\\Workspace\\Other\\..\\Example"},"C:\\Workspace\\Other\\..\\Example"],
   ["drive relative",{localDirectory:"C:Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
   ["rooted relative",{localDirectory:"\\Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Example"],
   ["UNC",{localDirectory:"\\\\server\\share\\Example"},"\\\\server\\share\\Example"],
   ["device namespace",{localDirectory:"\\\\?\\C:\\Workspace\\Example"},"\\\\?\\C:\\Workspace\\Example"],
   ["reserved device",{localDirectory:"NUL",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\NUL"],
   ["device extension",{localDirectory:"CON.txt",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\CON.txt"],
   ["console device",{localDirectory:"CONIN$",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\CONIN$"],
   ["superscript device",{localDirectory:"COM\u00b9",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\COM\u00b9"],
   ["alternate stream",{localDirectory:"Example:stream",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example:stream"],
   ["trailing dot",{localDirectory:"Example.",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example."],
   ["trailing space",{localDirectory:"Example ",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example "],
   ["cross platform",{localDirectory:"Example",localWorkspaceRoot:"/srv/apps"},"C:\\Workspace\\Example"],
   ["POSIX backslash",{localDirectory:"nested\\example",localWorkspaceRoot:"/srv/apps"},"/srv/apps/nested/example"],
   ["POSIX double root",{localDirectory:"//srv/apps/example"},"//srv/apps/example"],
   ["relative manifest",{localDirectory:"Example",localWorkspaceRoot:"C:\\Workspace"},"Example"],
   ["control character",{localDirectory:"Exam\nple",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Exam\nple"],
   ["nonstring directory",{localDirectory:42,localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
   ["nonstring root",{localDirectory:"Example",localWorkspaceRoot:42},"C:\\Workspace\\Example"],
   ["empty relative",{localDirectory:"",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace"],
   ["null manifest",metadata,null]
  ];
  for(const [label,md,canonical] of cases)assert.equal(direct(md,canonical),releaseCanonicalDirectoryMatches(md,canonical),label);
  const denials:[string,(md:any,m:any)=>void][]=[
   ["wrong purpose",md=>{md.releasePurpose="temporary_certification";}],
   ["wrong manifest purpose",(_md,m)=>{m.purpose="temporary_certification";}],
   ["wrong provider",(_md,m)=>{m.deployment.provider="unknown";}],
   ["archive",(_md,m)=>{m.cleanup.archiveRepository=true;}],
   ["unprotected target",(_md,m)=>{m.cleanup.protectedResourceIds=["database-volume"];}],
   ["owned protected",(_md,m)=>{m.cleanup.ownedResourceIds.push("database-volume");}],
   ["duplicate owned",(_md,m)=>{m.cleanup.ownedResourceIds.push("owned-fixture");}],
   ["wrong cleanup repo",(_md,m)=>{m.cleanup.repositoryUrl="https://github.com/example/other.git";}],
   ["wrong cleanup target",(_md,m)=>{m.cleanup.coolifyTargetId="other";}],
   ["wrong cleanup directory",(_md,m)=>{m.cleanup.canonicalDir="C:\\Other";}],
   ["wrong target",md=>{md.releaseTargets[0].targetId="other";}],
   ["wrong Compose path",md=>{md.releaseTargets[0].composePath="/other.yml";}],
   ["provider path substitution",(_md,m)=>{delete m.deployment.targets[0].composePath;m.deployment.targets[0].dockerfile="/Dockerfile";}],
   ["traversal Compose path",(md,m)=>{md.releaseTargets[0].composePath=m.deployment.targets[0].composePath="/nested/../compose.yml";}],
   ["double separator Compose path",(md,m)=>{md.releaseTargets[0].composePath=m.deployment.targets[0].composePath="/nested//compose.yml";}],
   ["changed origins",md=>{md.releasePublicOrigins=["https://other.example.test"];}],
   ["wrong root",md=>{md.localWorkspaceRoot="D:\\Workspace\\Applications";}],
   ["traversal mapping",md=>{md.localDirectory="Nested/../Example";}],
   ["no explicit root",md=>{delete md.localWorkspaceRoot;}],
   ["changed deployment URL",md=>{md.deploymentUrl="https://other.example.test/";}]
  ];
  for(const [label,change] of denials){const md=structuredClone(metadata),m=structuredClone(manifest);change(md,m);assert.equal(allowed(md,m),false,label);}
  assert.deepEqual(["governed_release_insert_guard()","governed_release_renewal_guard()","governed_release_operation_guard()","governed_release_outcome_guard()"].map(definition),guards);
  assert.equal(preserved(),before);
 }finally{
  if(!/^companycore_test_release_scope_[a-f0-9]{32}$/.test(database))throw Error("Unsafe fixture database cleanup");
  if(created)execFileSync("docker",["compose","exec","-T","postgres","dropdb","-U","companycore",database],{windowsHide:true});
 }
});
