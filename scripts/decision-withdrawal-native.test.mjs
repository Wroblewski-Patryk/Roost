import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

const database=`companycore_test_withdraw_${randomUUID().replaceAll('-','')}`;
assert.match(database,/^companycore_test_withdraw_[a-f0-9]{32}$/);
const docker=(args,input)=>execFileSync('docker',['compose','exec','-T','postgres',...args],
 {input,windowsHide:true,timeout:180000,encoding:'utf8',maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=input=>docker(['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','companycore','-d',database],input).trim();
const migrationNames=readdirSync(new URL('../prisma/migrations/',import.meta.url)).filter(name=>/^\d/.test(name)).sort();
const migrationSource=name=>readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`,import.meta.url),'utf8');
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const json=value=>quote(JSON.stringify(value))+'::jsonb';
const refused=(statement,token)=>assert.throws(()=>sql(statement),error=>String(error.stderr).includes(token),token);
function concurrentPsql(input,marker){
 const child=spawn('docker',['compose','exec','-T','postgres','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','companycore','-d',database],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 let output='',errors='',marked=false,signalReady,signalFailed;
 const ready=new Promise((resolve,reject)=>{signalReady=resolve;signalFailed=reject;});
 child.stdout.on('data',chunk=>{output+=chunk.toString();if(!marked&&output.includes(marker)){marked=true;signalReady();}});
 child.stderr.on('data',chunk=>{errors+=chunk.toString();});
 const done=new Promise((resolve,reject)=>child.on('close',code=>{
  if(!marked)signalFailed(Error(`concurrent psql missed ${marker}: ${errors||output}`));
  code===0?resolve(output):reject(Error(`concurrent psql exited ${code}: ${errors||output}`));
 }));
 child.stdin.end(input);
 return {ready,done};
}

test('G24c withdrawal migration and pinned v4 bootstrap catalog qualify on a disposable database',async()=>{
 docker(['createdb','-U','companycore',database]);
 try {
  const pendingMigration='20261014010000_g24c_decision_withdrawal';
  sql(migrationNames.filter(name=>name<pendingMigration).map(migrationSource).join('\n'));
  assert.equal(sql("SELECT encode(sha256(convert_to(replace(prosrc,chr(13),''),'UTF8')),'hex') FROM pg_proc WHERE oid='bootstrap_v3_catalog()'::regprocedure;"),'eec8e201c2ba17c972b1c51ebb8ac6c0003a89c0cd776eaf0a757cfb6d6dbf98');
  sql(migrationSource(pendingMigration));
  assert.equal(sql("SELECT position('decision_successor_fence' IN prosrc)>0 FROM pg_proc WHERE proname='bootstrap_v3_catalog';"),'t','v4 catalog contains concurrency fence');
  const functionMismatches=sql(`SELECT f.value->>'name'||':'||(f.value->>'hash')||':'||COALESCE(encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex'),'missing')
   FROM bootstrap_v3_catalog_manifest_v4 m CROSS JOIN LATERAL jsonb_array_elements(m.record->'functions') f(value)
   LEFT JOIN pg_proc p ON p.proname=f.value->>'name' AND p.pronamespace='public'::regnamespace
   WHERE (f.value->>'hash') IS DISTINCT FROM encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex')
   ORDER BY f.value->>'name';`);
  assert.equal(functionMismatches,'','pinned function hashes');
  const extraTriggers=sql(`SELECT c.relname||':'||t.tgname||':'||t.tgtype::text||':'||p.proname FROM pg_trigger t
   JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN bootstrap_v3_catalog_manifest_v4 m ON m.id
   WHERE NOT t.tgisinternal AND c.relname IN (SELECT jsonb_array_elements_text(m.record->'exactTriggerTables'))
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(m.record->'triggers') x WHERE x->>'table'=c.relname AND x->>'name'=t.tgname)
   ORDER BY c.relname,t.tgname;`);
  assert.equal(extraTriggers,'','exact trigger inventory');
  assert.equal(sql("SELECT bootstrap_v3_catalog();"),'t');
  assert.equal(sql("SELECT record->>'version' FROM bootstrap_v3_catalog_manifest_v4 WHERE id;"),'bootstrap-v3-catalog-v4');
  assert.equal(sql("SELECT count(*) FROM pg_constraint WHERE conrelid='decision_revisions'::regclass AND conname='decision_revisions_supersedes_id_key';"),'0');
  for(const constraint of ['decision_withdrawals_decision_id_key','decision_withdrawals_workspace_id_request_id_key']){
   assert.equal(sql(`SELECT count(*) FROM pg_constraint WHERE conrelid='decision_withdrawals'::regclass AND conname=${quote(constraint)};`),'1');
   refused(`BEGIN;ALTER TABLE decision_withdrawals DROP CONSTRAINT ${constraint};SELECT bootstrap_v3_catalog();`,'decision_successor_fence');
   assert.equal(sql('SELECT bootstrap_v3_catalog();'),'t','catalog recovers after rolled-back constraint drift');
  }
  assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE tgrelid='decision_withdrawals'::regclass AND NOT tgisinternal;"),'5');
  const owner=randomUUID(),other=randomUUID(),workspace=randomUUID(),task=randomUUID(),downstream=randomUUID(),queued=randomUUID();
  const accepted=randomUUID(),acceptedPreview=randomUUID(),proposal=randomUUID(),proposalPreview=randomUUID();
  const proposalHash='a'.repeat(64),reason='Correct the stale company-summary proposal for the exact task.';
  const staleAuthority={status:'delegated',epoch:'stale',watchIds:[],mandate:{id:randomUUID(),workforceId:randomUUID()},path:[],scopeProof:{entities:[],operation:'accept_decision',risk:'low'}};
  const body={title:'Stale company summary',context:'Prior method proof scope',decision:'Prepare a company summary',rationale:'Stale scope',
   consequences:'Only one task affected',scopeReason:'The exact task is affected',scope:[{type:'task',id:task}],supersedesId:accepted,
   conflicts:[{kind:'replaces',oldProvision:'Run the approved task',newProvision:'Prepare a company summary',explanation:'Replace old intent'}],
   managedRuntimeApproval:{executionClass:'roost-company-information-runtime-v1',applicationId:null,taskId:task}};
  sql(`SET session_replication_role=replica;
   INSERT INTO users(id,email,password_hash,updated_at) VALUES(${quote(owner)},'withdraw-owner@example.test','synthetic-not-a-login',now()),(${quote(other)},'withdraw-other@example.test','synthetic-not-a-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${quote(workspace)},'Synthetic withdrawal test',${quote(owner)},now());
   INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at) VALUES(${quote(randomUUID())},${quote(workspace)},${quote(owner)},'owner',now());
   INSERT INTO tasks(id,workspace_id,title,updated_at) VALUES(${quote(task)},${quote(workspace)},'Synthetic method task',now());
   INSERT INTO tasks(id,workspace_id,title,updated_at) VALUES(${quote(downstream)},${quote(workspace)},'Synthetic dependent task',now());
   UPDATE tasks SET execution_readiness='{"status":"ready"}'::jsonb WHERE id IN (${quote(task)},${quote(downstream)});
   INSERT INTO agent_executions(id,workspace_id,task_id,application_id,status,requested_by_type,updated_at)
    VALUES(${quote(queued)},${quote(workspace)},${quote(downstream)},${quote(randomUUID())},'queued','user',now());
   INSERT INTO decisions(id,workspace_id,title,decision,status,source,updated_at) VALUES(${quote(accepted)},${quote(workspace)},'Accepted predecessor','Run the approved task','accepted','roost_decision',now());
   INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash) VALUES(${quote(accepted)},${quote(workspace)},1,${json({scope:[{type:'task',id:task}]})},${quote(owner)},${quote(randomUUID())},'accepted-synthetic');
   INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash) VALUES(${quote(acceptedPreview)},${quote(accepted)},${quote(workspace)},1,${json({taskIds:[task]})},${quote(owner)},${quote(randomUUID())},'accepted-synthetic');
   INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash) VALUES(${quote(randomUUID())},${quote(accepted)},${quote(workspace)},${quote(acceptedPreview)},${quote(owner)},${quote(randomUUID())},'accepted-synthetic');
   INSERT INTO decisions(id,workspace_id,title,context,decision,rationale,consequences,status,source,supersedes_id,updated_at) VALUES(${quote(proposal)},${quote(workspace)},${quote(body.title)},${quote(body.context)},${quote(body.decision)},${quote(body.rationale)},${quote(body.consequences)},'proposed','roost_decision',${quote(accepted)},now());
   INSERT INTO decision_revisions(decision_id,workspace_id,supersedes_id,version,body,predecessor,actor_user_id,request_id,request_hash) VALUES(${quote(proposal)},${quote(workspace)},${quote(accepted)},2,${json(body)},(SELECT to_jsonb(d) FROM decisions d WHERE d.id=${quote(accepted)}),${quote(owner)},${quote(randomUUID())},${quote(proposalHash)});
   INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,authority,actor_user_id,request_id,request_hash) VALUES(${quote(proposalPreview)},${quote(proposal)},${quote(workspace)},1,${json({taskIds:[task,downstream]})},${json(staleAuthority)},${quote(owner)},${quote(randomUUID())},${quote(proposalHash)});
   SET session_replication_role=origin;`);
  const withdrawalFor=(decisionId,actor,hash,requestId)=>`SELECT id,decision_id,request_id,withdrawn_at FROM decision_withdraw_pending_v1(${quote(workspace)}::uuid,${quote(decisionId)}::uuid,${quote(hash)},${quote(actor)}::uuid,${quote(requestId)}::uuid,${quote(reason)});`;
  const withdrawal=(actor,hash,requestId)=>withdrawalFor(proposal,actor,hash,requestId);
  assert.equal(sql(`SELECT decision_state(${quote(proposal)}::uuid);`),'pending');
  refused(withdrawal(other,proposalHash,randomUUID()),'decision_withdrawal_forbidden');
  refused(withdrawal(owner,'b'.repeat(64),randomUUID()),'decision_withdrawal_stale');
  assert.equal(sql('SELECT count(*) FROM decision_withdrawals;'),'0');
  const requestId=randomUUID();
  const acceptanceRace=concurrentPsql(`BEGIN;${withdrawal(owner,proposalHash,requestId)}\n\\echo WITHDRAWAL_PENDING_COMMIT\nSELECT pg_sleep(2);COMMIT;\n`,'WITHDRAWAL_PENDING_COMMIT');
  await acceptanceRace.ready;
  const acceptanceWait=Date.now();
  refused(`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash) VALUES(${quote(randomUUID())},${quote(proposal)},${quote(workspace)},${quote(proposalPreview)},${quote(owner)},${quote(randomUUID())},'synthetic');`,'decision_stale');
  assert.ok(Date.now()-acceptanceWait>=500,'acceptance waited for the withdrawal transaction');
  await acceptanceRace.done;
  const first=sql(`SELECT id,decision_id,request_id,withdrawn_at FROM decision_withdrawals WHERE decision_id=${quote(proposal)};`);
  assert.equal(first.split('|')[1],proposal);
  assert.equal(sql(withdrawal(owner,proposalHash,requestId)),first,'same exact request replays one ledger row');
  assert.equal(sql(`SELECT decision_state(${quote(proposal)}::uuid),decision_state(${quote(accepted)}::uuid);`),'withdrawn|accepted');
  assert.equal(sql(`SELECT string_agg(id::text||':'||(execution_readiness->>'status'),',' ORDER BY id) FROM tasks WHERE id IN (${quote(task)},${quote(downstream)});`),[task,downstream].sort().map(id=>`${id}:needs_revalidation`).join(','),'direct and downstream tasks invalidated');
  assert.equal(sql(`SELECT (context_invalidated_at IS NOT NULL AND cancel_requested_at IS NOT NULL)::text FROM agent_executions WHERE id=${quote(queued)};`),'true','dependent queued execution canceled');
  assert.equal(sql(`SELECT decision_pending_version(${quote(task)}::uuid);`),'[]');
  sql(`SELECT decision_authority_invalidate_before_interviews(${quote(workspace)}::uuid);`);
  assert.equal(sql('SELECT count(*) FROM decision_authority_invalidations;'),'0','withdrawn preview cannot generate a future authority invalidation');
  assert.equal(sql('SELECT count(*) FROM decision_withdrawals;'),'1');
  refused(withdrawal(owner,'b'.repeat(64),requestId),'decision_withdrawal_request_conflict');
  refused(`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash) VALUES(${quote(randomUUID())},${quote(proposal)},${quote(workspace)},2,${json({taskIds:[task]})},${quote(owner)},${quote(randomUUID())},'synthetic');`,'decision_stale');
  refused(`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash) VALUES(${quote(randomUUID())},${quote(proposal)},${quote(workspace)},${quote(proposalPreview)},${quote(owner)},${quote(randomUUID())},'synthetic');`,'decision_stale');
  refused(`UPDATE decision_withdrawals SET reason='Changed after fact' WHERE decision_id=${quote(proposal)};`,'decision_withdrawal_history_immutable');
  const corrected=randomUUID();
  const correctedBody={...body,title:'Corrected Sites evidence direction',context:'Current two Sites method proof',
   decision:'Use the two Sites evidence matrix',rationale:'The current task requires both Sites',
   consequences:'Only the exact method task continues',scopeReason:'The method task is the affected scope',
   conflicts:[{kind:'replaces',oldProvision:'Run the approved task',newProvision:'two Sites evidence matrix',explanation:'Replace the spent plan with the current accepted outcome'}]};
  const insertDecision=(id,b)=>`BEGIN;SET session_replication_role=replica;
   INSERT INTO decisions(id,workspace_id,title,context,decision,rationale,consequences,status,source,supersedes_id,updated_at)
    VALUES(${quote(id)},${quote(workspace)},${quote(b.title)},${quote(b.context)},${quote(b.decision)},${quote(b.rationale)},${quote(b.consequences)},'proposed','roost_decision',${quote(accepted)},now());
   SET session_replication_role=origin;
   INSERT INTO decision_revisions(decision_id,workspace_id,supersedes_id,version,body,predecessor,actor_user_id,request_id,request_hash)
    VALUES(${quote(id)},${quote(workspace)},${quote(accepted)},2,${json(b)},(SELECT to_jsonb(d) FROM decisions d WHERE d.id=${quote(accepted)}),${quote(owner)},${quote(randomUUID())},${quote('c'.repeat(64))});COMMIT;`;
  sql(insertDecision(corrected,correctedBody));
  assert.equal(sql(`SELECT decision_state(${quote(corrected)}::uuid);`),'pending','one corrected successor is admitted');
  refused(insertDecision(randomUUID(),{...correctedBody,title:'Competing corrected proposal'}),'decision_successor_exists');
  const final=randomUUID(),correctedWithdrawalRequest=randomUUID();
  const successorRace=concurrentPsql(`BEGIN;${withdrawalFor(corrected,owner,'c'.repeat(64),correctedWithdrawalRequest)}\n\\echo CORRECTED_WITHDRAWAL_PENDING_COMMIT\nSELECT pg_sleep(2);COMMIT;\n`,'CORRECTED_WITHDRAWAL_PENDING_COMMIT');
  await successorRace.ready;
  const successorWait=Date.now();
  sql(insertDecision(final,{...correctedBody,title:'Final corrected proposal'}));
  assert.ok(Date.now()-successorWait>=500,'new successor waited for corrected withdrawal commit');
  await successorRace.done;
  assert.equal(sql(`SELECT decision_state(${quote(corrected)}::uuid),decision_state(${quote(final)}::uuid);`),'withdrawn|pending');
  assert.equal(sql(`SELECT count(*) FROM decision_revisions WHERE supersedes_id=${quote(accepted)} AND decision_state(decision_id)<>'withdrawn';`),'1');
  assert.equal(sql('SELECT bootstrap_v3_catalog();'),'t','catalog still validates after withdrawal');
 } finally {
  docker(['dropdb','-U','companycore',database]);
  const remains=docker(['psql','-X','-qAt','-U','companycore','-d','postgres','-c',`SELECT count(*) FROM pg_database WHERE datname='${database}';`]).trim();
  assert.equal(remains,'0','owned disposable database removed');
 }
});
