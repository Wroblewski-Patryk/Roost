import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import composition from "../dist/modules/agent-runtime/procedure-composition-contract.js";
import admission from "../dist/modules/agent-runtime/task-risk-admission-contract.js";

const migration = "20261007025000_decision_procedure_composition";
const sqlSource = name => readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8");
const repair = sqlSource(migration), predecessor = sqlSource("20260908150000_material_unknown_interviews");
const changedFunctions = ["procedure_contract_shape", "procedure_composition_insert", "task_admission_view_before_composition", "task_risk_sources", "task_admission_source_before_decision"];
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const json = value => quote(JSON.stringify(value)) + "::jsonb";
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const hash = "a".repeat(64), digest = b => createHash("sha256").update(b).digest("hex");
const roles = ["requester", "accountableManager", "executor", "verifier", "releaser"];
const contract = (operation="decision_supersede", kind="base") => ({kind,taskType:"review",operation,
  applicationId:kind==="base"?null:id(4), componentId:kind==="base"?null:id(10), baseProcedureId:kind==="base"?null:id(12),
  inputs:["Exact accepted input"],outputs:["Independent findings"],evidence:["Reproducible proof"],completion:["Reviewed exact scope"],roles,tools:["repository_read"],
  steps:[{key:kind==="base"?"inspect":"extend",instruction:"Inspect the exact accepted scope",role:"executor",tools:["repository_read"],inputs:["Exact accepted input"],outputs:["Independent findings"],evidence:["Reproducible proof"],requires:kind==="base"?[]:["inspect"]}]});
const extract = (source,name) => {
  const match=source.match(new RegExp(`CREATE OR REPLACE FUNCTION ${name}\\([^\\n]*[\\s\\S]*?\\n(?:END )?\\$\\$;`));
  assert.ok(match,name);return match[0];
};

test("additive repair changes only the accepted operation lists and preserves the later decision wrapper", () => {
  assert.match(repair,/^BEGIN;/);assert.match(repair,/COMMIT;\s*$/);
  assert.equal((repair.match(/CREATE OR REPLACE FUNCTION/g)||[]).length,5);
  for(const name of changedFunctions) {
    const old=name==="task_admission_source_before_decision"?"task_admission_source":name;
    assert.equal(extract(repair,name).replaceAll(",'decision_supersede'","").replace(`FUNCTION ${name}(`,`FUNCTION ${old}(`),extract(predecessor,old));
  }
  assert.doesNotMatch(repair,/CREATE OR REPLACE FUNCTION task_admission_source\(/);
  const outsideBodies=repair.replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\n(?:END )?\$\$;/g,"").replace(/--[^\n]*/g,"");
  assert.doesNotMatch(outsideBodies,/\b(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|TRUNCATE|DROP\s+(?:TABLE|FUNCTION)|ALTER\s+FUNCTION)\b/i);
  assert.doesNotMatch(outsideBodies,/ALTER TABLE|DROP CONSTRAINT|ADD CONSTRAINT/);
});

test("TypeScript/API schema has eleven operations including valid decision contracts and selection", () => {
  assert.equal(admission.admissionOperations.length,11);
  assert.ok(admission.admissionOperations.includes("decision_supersede"));
  const source=readFileSync(new URL("../src/modules/agent-runtime/task-risk-admission-contract.ts",import.meta.url),"utf8");
  for(const operation of admission.admissionOperations){assert.ok(source.includes(`"${operation}"`));assert.ok(repair.includes(`'${operation}'`));composition.procedureContractSchema.parse(contract(operation));}
  composition.compositionSelectionSchema.parse({requestId:id(70),expectedVersion:hash,operation:"decision_supersede",baseProcedureId:id(12),extensionProcedureId:id(13),rationale:"Exact decision scope"});
  assert.equal(composition.procedureContractSchema.safeParse(contract("unknown_operation")).success,false);
});

test("disposable PostgreSQL proves RED publication/selection then GREEN without changing history or unrelated guards", () => {
  const database=`companycore_test_decision_comp_${randomUUID().replaceAll("-","")}`;
  assert.match(database,/^companycore_test_decision_comp_[a-f0-9]{32}$/);
  const docker=(args,input)=>execFileSync("docker",["compose","exec","-T","postgres",...args],{input,windowsHide:true,timeout:60000,encoding:"utf8",maxBuffer:32*1024*1024,stdio:["pipe","pipe","pipe"]});
  const sql=input=>docker(["psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","companycore","-d",database],input).trim();
  const refused=(input,expected)=>assert.throws(()=>sql(input),error=>String(error.stderr).includes(expected));
  const publish=(body,{procedure=id(12),actor=id(1),version=2,source=`procedure_contract_source('${procedure}')`}={})=>`INSERT INTO procedure_contract_versions(id,workspace_id,procedure_id,version,source_version,body,rationale,actor_user_id,request_id,request_hash) VALUES ('${randomUUID()}','${id(2)}','${procedure}',${version},${source},${json(body)},'Exact offline contract proof','${actor}','${randomUUID()}','${hash}');`;
  const selection=({operation="decision_supersede",scope=id(15),task=id(3),version=1,base=id(12),extension=id(13)}={})=>`INSERT INTO task_composition_selections(id,workspace_id,task_id,operation,version,scope_id,base_procedure_id,extension_procedure_id,rationale,actor_user_id,request_id,request_hash) VALUES ('${randomUUID()}','${id(2)}','${task}',${quote(operation)},${version},'${scope}',${base?quote(base):"NULL"},${extension?quote(extension):"NULL"},'Exact offline selection','${id(1)}','${randomUUID()}','${hash}');`;
  const functions=()=>JSON.parse(sql("SELECT jsonb_object_agg(p.proname||'('||oidvectortypes(p.proargtypes)||')',to_jsonb(p)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';"));
  const triggers=()=>sql("SELECT jsonb_agg(jsonb_build_object('id',t.oid,'table',c.relname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public';");
  const constraints=()=>JSON.parse(sql("SELECT jsonb_object_agg(c.relname||'.'||x.conname,jsonb_build_object('id',x.oid,'definition',pg_get_constraintdef(x.oid),'validated',x.convalidated)) FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public';"));
  const data=()=>{const tables=sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;").split("\n");for(const t of tables)assert.match(t,/^[a-zA-Z0-9_]+$/);return digest(sql("SELECT jsonb_object_agg(name,body) FROM ("+tables.map(t=>`SELECT '${t}' AS name,COALESCE(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),'[]'::jsonb) AS body FROM public.\"${t}\" r`).join(" UNION ALL ")+") snapshot;"));};
  docker(["createdb","-U","companycore",database]);
  try {
    console.error("decision_fixture_apply_predecessors");
    const migrations=readdirSync(new URL("../prisma/migrations/",import.meta.url)).filter(n=>/^\d/.test(n)&&n<migration).sort();
    sql(migrations.map(sqlSource).join("\n"));
    console.error("decision_fixture_seed_prerequisites");
    sql(`INSERT INTO users(id,email,password_hash,updated_at) VALUES ('${id(1)}','owner-fixture@example.test','synthetic-not-a-login',now()),('${id(5)}','member-fixture@example.test','synthetic-not-a-login',now()),('${id(6)}','admin-fixture@example.test','synthetic-not-a-login',now());
      INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES ('${id(2)}','Decision migration fixture','${id(1)}',now());
      INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at) VALUES ('${id(7)}','${id(2)}','${id(1)}','owner',now()),('${id(8)}','${id(2)}','${id(5)}','member',now()),('${id(9)}','${id(2)}','${id(6)}','admin',now());
      INSERT INTO applications(id,workspace_id,name,slug,updated_at) VALUES ('${id(4)}','${id(2)}','Decision fixture app','decision-fixture',now());
      INSERT INTO application_architecture_components(id,application_id,type,name,status,updated_at) VALUES ('${id(10)}','${id(4)}','backend','Fixture backend','active',now());
      INSERT INTO tasks(id,workspace_id,title,description,status,updated_at) VALUES ('${id(3)}','${id(2)}','Preserved task','Preserved accepted task context','in_progress',now());
      INSERT INTO api_keys(id,workspace_id,name,key_hash,key_prefix,scopes,updated_at) VALUES ('${id(11)}','${id(2)}','Preserved integration','synthetic-noncredential-digest','fixture_prefix','["tasks:read"]',now());
      INSERT INTO procedures(id,family_id,workspace_id,name,purpose,status,required_tools,required_permissions,updated_at) VALUES ('${id(12)}','${id(12)}','${id(2)}','Base fixture','Exact scope review','active','["repository_read"]','["repository_read"]',now()),('${id(13)}','${id(13)}','${id(2)}','Extension fixture','Exact app scope review','active','["repository_read"]','["repository_read"]',now());
      INSERT INTO procedure_steps(id,procedure_id,step_order,instruction,updated_at) VALUES ('${id(30)}','${id(12)}',1,'Inspect exact source',now()),('${id(31)}','${id(13)}',1,'Inspect exact component',now());
      INSERT INTO application_procedures(application_id,procedure_id) VALUES ('${id(4)}','${id(12)}'),('${id(4)}','${id(13)}');
      INSERT INTO company_records(id,workspace_id,record_type,key,title,description,status,application_id,updated_at) VALUES ('${id(16)}','${id(2)}','release_target','fixture-target','Fixture target','Existing exact target evidence','active','${id(4)}',now()),('${id(17)}','${id(2)}','release','fixture-release','Fixture release','Existing exact release evidence','active','${id(4)}',now());
      -- Seed only prerequisite fixture ledgers; all publication/selection probes
      -- below execute with their real triggers enabled.
      ALTER TABLE task_risk_scopes DISABLE TRIGGER USER;
      INSERT INTO task_risk_scopes(id,workspace_id,task_id,version,application_id,component_id,input,input_hash,actor_user_id,request_id,request_hash) VALUES ('${id(14)}','${id(2)}','${id(3)}',1,'${id(4)}','${id(10)}','{"contract":{"singleTask":{"component":{"id":"${id(10)}"}},"access":{"tools":["repository_read"]}}}','${hash}','${id(1)}','${id(32)}','${hash}');
      ALTER TABLE task_risk_scopes ENABLE TRIGGER USER;
      ALTER TABLE task_admission_scopes DISABLE TRIGGER USER;
      INSERT INTO task_admission_scopes(id,workspace_id,task_id,version,application_id,procedure_id,target_id,release_id,input,actor_user_id,request_id,request_hash) VALUES ('${id(15)}','${id(2)}','${id(3)}',1,'${id(4)}','${id(13)}','${id(16)}','${id(17)}','{"taskType":"review"}','${id(1)}','${id(33)}','${hash}');
      ALTER TABLE task_admission_scopes ENABLE TRIGGER USER;`);
    sql(publish(contract("runtime_execute"),{version:1}));
    sql(publish(contract("runtime_execute","extension"),{procedure:id(13),version:1}));
    sql(selection({operation:"runtime_execute"}));
    assert.equal(sql(`SELECT procedure_contract_shape(${json(contract())});`),"f");
    refused(publish(contract()),"procedure_composition_contract_invalid");
    refused(selection(),"procedure_composition_scope_invalid");
    console.error("decision_fixture_snapshot_before");
    const before={data:data(),functions:functions(),triggers:triggers(),constraints:constraints()};
    const priorAdmission=sql(`SELECT task_admission_source('${id(3)}');`),priorRisk=sql(`SELECT task_risk_version('${id(3)}');`);
    console.error("decision_fixture_apply_repair");
    sql(repair);
    assert.equal(data(),before.data,"every historical row, authentication value and source fence survives migration");
    assert.equal(triggers(),before.triggers,"all triggers remain exact");
    console.error("decision_fixture_compare_functions");
    const afterFunctions=functions();assert.deepEqual(Object.keys(afterFunctions),Object.keys(before.functions));
    let changes=0;
    for(const[key,value]of Object.entries(before.functions)) {
      if(changedFunctions.includes(value.proname)){changes++;assert.equal(afterFunctions[key].oid,value.oid);assert.deepEqual({...afterFunctions[key],prosrc:afterFunctions[key].prosrc.replaceAll(",'decision_supersede'","")},value);}
      else assert.deepEqual(afterFunctions[key],value,"unrelated function unchanged: "+key);
    }
    assert.equal(changes,5);
    const afterConstraints=constraints();assert.deepEqual(Object.keys(afterConstraints),Object.keys(before.constraints));
    assert.deepEqual(afterConstraints,before.constraints,"all constraint definitions and identities remain unchanged");
    assert.ok(afterConstraints["task_admission_evidence.task_admission_evidence_operation_check"].definition.includes("decision_supersede"));
    assert.equal(afterConstraints["task_admission_evidence.task_admission_evidence_operation_check"].validated,true);
    assert.equal(sql(`SELECT task_admission_source('${id(3)}');`),priorAdmission,"historical admission digest unchanged before decision selection");
    assert.equal(sql(`SELECT task_risk_version('${id(3)}');`),priorRisk,"historical risk digest unchanged before decision selection");
    for(const operation of admission.admissionOperations)assert.equal(sql(`SELECT procedure_contract_shape(${json(contract(operation))});`),"t",operation);
    for(const edit of [b=>b.operation="unknown_operation",b=>b.taskType="unknown_type",b=>b.extra="unaccepted",b=>b.applicationId=id(4),b=>b.roles=["executor"],b=>b.steps[0].requires=["future"],b=>b.steps[0].tools=["repository_write"]]){const b=contract();edit(b);assert.equal(sql(`SELECT procedure_contract_shape(${json(b)});`),"f");refused(publish(b),"procedure_composition_contract_invalid");}
    refused(publish(contract(),{actor:id(5)}),"procedure_composition_contract_invalid");
    refused(publish(contract(),{actor:id(6)}),"procedure_composition_contract_invalid");
    refused(publish(contract(),{source:quote("b".repeat(64))}),"procedure_composition_contract_invalid");
    refused(publish(contract(),{version:9}),"procedure_composition_contract_invalid");
    const badExtension=contract("decision_supersede","extension");badExtension.componentId=id(99);refused(publish(badExtension,{procedure:id(13)}),"procedure_composition_contract_invalid");
    console.error("decision_fixture_green_publications");
    sql(publish(contract()));sql(publish(contract("decision_supersede","extension"),{procedure:id(13)}));
    const publications=JSON.parse(sql(`SELECT jsonb_agg(jsonb_build_object('id',id,'procedureId',procedure_id,'valid',procedure_contract_valid(v)) ORDER BY procedure_id) FROM procedure_contract_versions v WHERE body->>'operation'='decision_supersede';`));
    assert.equal(publications.length,2);assert.ok(publications.every(r=>r.valid));
    refused(selection({operation:"unknown_operation"}),"procedure_composition_scope_invalid");
    refused(selection({scope:id(99)}),"procedure_composition_scope_invalid");
    refused(selection({task:id(99)}),"procedure_composition_scope_invalid");
    refused(selection({base:id(12),extension:id(12)}),"procedure_composition_scope_invalid");
    sql(selection());
    const refs=JSON.parse(sql(`SELECT task_composition_refs('${id(3)}','decision_supersede',false);`));
    assert.equal(refs.base,publications.find(r=>r.procedureId===id(12)).id);assert.equal(refs.extension,publications.find(r=>r.procedureId===id(13)).id);
    for(const status of ["queued","claimed","running","waiting_for_approval"]) {
      sql(`ALTER TABLE agent_executions DISABLE TRIGGER USER;INSERT INTO agent_executions(id,workspace_id,task_id,application_id,requested_by_type,status,updated_at) VALUES ('${id(40)}','${id(2)}','${id(3)}','${id(4)}','user','${status}',now());ALTER TABLE agent_executions ENABLE TRIGGER USER;`);
      refused(selection({version:2}),"procedure_composition_active");
      sql(`ALTER TABLE agent_executions DISABLE TRIGGER USER;DELETE FROM agent_executions WHERE id='${id(40)}';ALTER TABLE agent_executions ENABLE TRIGGER USER;`);
    }
    sql(`ALTER TABLE task_risk_assessments DISABLE TRIGGER USER;INSERT INTO task_risk_assessments(id,workspace_id,task_id,version,source_version,sources,entries,result,joint_rationale,algorithm,actor_user_id,request_id,request_hash) VALUES ('${id(41)}','${id(2)}','${id(3)}',1,task_risk_version('${id(3)}'),task_risk_sources('${id(3)}'),'[]','{"status":"assessed","level":"low"}','Exact fixture risk prerequisite','roost-native-risk-v1','${id(1)}','${id(42)}','${hash}');ALTER TABLE task_risk_assessments ENABLE TRIGGER USER;`);
    assert.equal(sql(`SELECT task_risk_current('${id(3)}');`),id(41));
    const composed=JSON.parse(sql(`SELECT task_composition('${id(3)}','decision_supersede',false,false);`));
    assert.equal(composed.status,"composed");assert.deepEqual(composed.missing,[]);assert.deepEqual(composed.conflicts,[]);assert.deepEqual(composed.fields.tools,["repository_read"]);
    const gate=JSON.parse(sql(`SELECT task_admission_view_before_composition('${id(3)}','decision_supersede');`));assert.equal(gate.gates.length,1);assert.equal(gate.gates[0].gate,"procedure");assert.equal(gate.status,"blocked","composition never invents evidence authority");
    const sealedRisk=sql(`SELECT task_risk_version('${id(3)}');`),sealedAdmission=sql(`SELECT task_admission_source('${id(3)}');`);
    const successor=contract();successor.evidence.push("New exact decision contract evidence");sql(publish(successor,{version:3}));
    assert.notEqual(sql(`SELECT task_risk_version('${id(3)}');`),sealedRisk,"decision contract refs participate in existing risk CAS");
    assert.notEqual(sql(`SELECT task_admission_source('${id(3)}');`),sealedAdmission,"decision refs participate in underlying source with wrapper retained");
    assert.equal(sql(`SELECT task_risk_current('${id(3)}') IS NULL;`),"t");
    const stale=JSON.parse(sql(`SELECT task_composition('${id(3)}','decision_supersede',false,false);`));assert.ok(stale.missing.includes("risk"));
    refused(`UPDATE procedure_contract_versions SET rationale='Changed history' WHERE id='${publications[0].id}';`,"procedure_composition_history_immutable");
    refused(`DELETE FROM task_composition_selections WHERE task_id='${id(3)}';`,"procedure_composition_history_immutable");
    assert.equal(sql("SELECT count(*) FROM task_capability_grants;"),"0","no grant or acceptance is synthesized");
    assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgenabled<>'O';"),"0","all fixture triggers restored");
  } finally {
    assert.match(database,/^companycore_test_decision_comp_[a-f0-9]{32}$/);
    console.error("decision_fixture_drop_owned_database");
    docker(["dropdb","-U","companycore",database]);
    assert.equal(docker(["psql","-X","-qAt","-U","companycore","-d","postgres","-c",`SELECT count(*) FROM pg_database WHERE datname=${quote(database)};`]).trim(),"0","owned disposable database dropped");
  }
});
