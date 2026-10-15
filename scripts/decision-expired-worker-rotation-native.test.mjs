import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

const migration='20261015040000_expired_worker_rotation_withdrawal';
const database=`companycore_test_ewr_${randomUUID().replaceAll('-','')}`;
assert.match(database,/^companycore_test_ewr_[a-f0-9]{32}$/);
const docker=(args,input)=>execFileSync('docker',['compose','exec','-T','postgres',...args],
 {input,windowsHide:true,timeout:180000,encoding:'utf8',maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=input=>docker(['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','companycore','-d',database],input).trim();
const names=readdirSync(new URL('../prisma/migrations/',import.meta.url)).filter(name=>/^\d/.test(name)&&name<=migration).sort();
const source=name=>readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`,import.meta.url),'utf8');
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const json=value=>quote(JSON.stringify(value))+'::jsonb';
const refused=(statement,token)=>assert.throws(()=>sql(statement),error=>String(error.stderr).includes(token),token);
function concurrentPsql(input,marker){
 const child=spawn('docker',['compose','exec','-T','postgres','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','companycore','-d',database],
  {windowsHide:true,stdio:['pipe','pipe','pipe']});
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

test('expired pending Worker rotation withdrawal is owner-bound and history-only on native PostgreSQL',async()=>{
 docker(['createdb','-U','companycore',database]);
 try {
  sql(names.map(source).join('\n'));
  assert.equal(sql("SELECT record->>'version',bootstrap_v3_catalog() FROM bootstrap_v3_catalog_manifest_v5 WHERE id;"),
   'bootstrap-v3-catalog-v5|t');
  const owner=randomUUID(),other=randomUUID(),workspace=randomUUID(),foreign=randomUUID();
  const host=randomUUID(),installation=randomUUID(),task=randomUUID(),decision=randomUUID(),handoff=randomUUID();
  const hash='a'.repeat(64),digest='b'.repeat(64),reason='The unused Worker rotation request expired without issuance.';
  const intent={schemaVersion:'worker-credential-lifecycle-v1',action:'rotate',workspaceId:workspace,
   installationId:installation,hostId:host,expectedCredentialId:randomUUID(),expectedVersion:1,
   expectedEpoch:1,expectedFingerprint:'c'.repeat(64),expiresAt:new Date(Date.now()+86400000).toISOString(),
   validUntil:new Date(Date.now()-180000).toISOString(),handoff:{requestId:handoff,requestDigest:digest,
    hostFingerprint:'d'.repeat(64),origin:'https://example.test',certificateFingerprint:'e'.repeat(64),replacesRequestId:null}};
  const body={title:'Synthetic expired Worker rotation',context:'A stale credential request',decision:'Rotate one Worker credential',
   rationale:'Bound owner request',consequences:'No issuance took place',scopeReason:'One historical task',
   scope:[{type:'task',id:task}],supersedesId:null,conflicts:[],workerCredential:intent};
  sql(`SET session_replication_role=replica;
   INSERT INTO users(id,email,password_hash,updated_at) VALUES(${quote(owner)},'ewr-owner@example.test','synthetic-not-a-login',now()),
    (${quote(other)},'ewr-other@example.test','synthetic-not-a-login',now());
   INSERT INTO workspaces(id,name,owner_user_id,updated_at) VALUES(${quote(workspace)},'Synthetic Worker rotation',${quote(owner)},now());
   INSERT INTO workspace_memberships(id,workspace_id,user_id,role,updated_at)
    VALUES(${quote(randomUUID())},${quote(workspace)},${quote(owner)},'owner',now());
   INSERT INTO tasks(id,workspace_id,title,status,updated_at) VALUES(${quote(task)},${quote(workspace)},'Synthetic retained task','todo',now());
   INSERT INTO agent_hosts(id,workspace_id,name,slug,platform,updated_at)
    VALUES(${quote(host)},${quote(workspace)},'Synthetic offline host','synthetic-offline-host','windows',now());
   INSERT INTO worker_credential_handoffs(id,workspace_id,installation_id,host_id,host_fingerprint,device_secret_hash,
    challenge_hash,request_digest,user_code_hash,origin,certificate_fingerprint,state,created_at,expires_at)
    VALUES(${quote(handoff)},${quote(workspace)},${quote(installation)},${quote(host)},${quote('d'.repeat(64))},
     ${quote('f'.repeat(64))},${quote('1'.repeat(64))},${quote(digest)},${quote('2'.repeat(64))},
     'https://example.test',${quote('e'.repeat(64))},'expired',now()-interval '5 minutes',now()-interval '4 minutes');
   INSERT INTO decisions(id,workspace_id,title,decision,status,source,updated_at)
    VALUES(${quote(decision)},${quote(workspace)},${quote(body.title)},${quote(body.decision)},'proposed','roost_decision',now());
   INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
    VALUES(${quote(decision)},${quote(workspace)},1,${json(body)},${quote(owner)},${quote(randomUUID())},${quote(hash)});
   SET session_replication_role=origin;`);
  const preview=()=>JSON.parse(sql(`SELECT decision_expired_worker_rotation_preview(${quote(workspace)}::uuid,${quote(decision)}::uuid);`));
  const command=(w,actor,request,digestValue,why=reason)=>`SELECT * FROM decision_withdraw_expired_worker_rotation_v1(
   ${quote(w)}::uuid,${quote(decision)}::uuid,${quote(hash)},${quote(actor)}::uuid,${quote(request)}::uuid,
   ${quote(why)},${quote(digestValue)});`;
  assert.equal(preview().eligible,false);
  assert.ok(preview().blockers.includes('active_task'));
  assert.deepEqual(preview().impact.taskIds,[task]);
  assert.equal(preview().taskStates[0].title,'Synthetic retained task');
  refused(command(workspace,owner,randomUUID(),preview().previewDigest),'decision_withdrawal_stale');
  assert.ok(JSON.parse(sql(`SELECT decision_expired_worker_rotation_preview(${quote(foreign)}::uuid,${quote(decision)}::uuid);`)).blockers.includes('decision_not_found'));
  refused(command(foreign,owner,randomUUID(),preview().previewDigest),'decision_withdrawal_scope_invalid');
  sql(`SET session_replication_role=replica;UPDATE tasks SET status='archived' WHERE id=${quote(task)};SET session_replication_role=origin;`);
  sql(`SET session_replication_role=replica;
   UPDATE decision_revisions SET body=jsonb_set(body,'{scope}',${json([{type:'task',id:randomUUID()}])})
    WHERE decision_id=${quote(decision)};
   SET session_replication_role=origin;`);
  const unavailableImpact=preview();
  assert.ok(unavailableImpact.blockers.includes('impact_unavailable'));
  assert.equal(unavailableImpact.impact,null,'missing downstream task is unknown impact, not an empty task set');
  assert.deepEqual(unavailableImpact.taskStates,[]);
  sql(`SET session_replication_role=replica;UPDATE decision_revisions SET body=${json(body)} WHERE decision_id=${quote(decision)};
   SET session_replication_role=origin;`);
  sql(`SET session_replication_role=replica;
   UPDATE decision_revisions SET body=jsonb_set(body,'{workerCredential,validUntil}',to_jsonb('invalid-time'::text))
    WHERE decision_id=${quote(decision)};
   SET session_replication_role=origin;`);
  assert.ok(preview().blockers.includes('wrong_intent'),'malformed expiry blocks without throwing');
  sql(`SET session_replication_role=replica;
   UPDATE decision_revisions SET body=jsonb_set(body,'{workerCredential,validUntil}',to_jsonb(${quote(new Date(Date.now()+86400000).toISOString())}::text))
    WHERE decision_id=${quote(decision)};
   SET session_replication_role=origin;`);
  assert.ok(preview().blockers.includes('decision_not_expired'));
  sql(`SET session_replication_role=replica;UPDATE decision_revisions SET body=${json(body)} WHERE decision_id=${quote(decision)};
   SET session_replication_role=origin;`);
  const acceptedPreview=randomUUID(),acceptance=randomUUID();
  sql(`SET session_replication_role=replica;
   INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
    VALUES(${quote(acceptedPreview)},${quote(decision)},${quote(workspace)},1,${json({taskIds:[task]})},${quote(owner)},${quote(randomUUID())},${quote(hash)});
   INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash)
    VALUES(${quote(acceptance)},${quote(decision)},${quote(workspace)},${quote(acceptedPreview)},${quote(owner)},${quote(randomUUID())},${quote(hash)});
   SET session_replication_role=origin;`);
  assert.ok(preview().blockers.includes('accepted'));
  refused(command(workspace,owner,randomUUID(),preview().previewDigest),'decision_withdrawal_stale');
  sql(`SET session_replication_role=replica;DELETE FROM decision_acceptances WHERE id=${quote(acceptance)};
   DELETE FROM decision_impact_previews WHERE id=${quote(acceptedPreview)};SET session_replication_role=origin;`);
  const liveKey=randomUUID();
  sql(`SET session_replication_role=replica;
   INSERT INTO api_keys(id,name,key,workspace_id,worker_host_id,worker_installation_id,worker_binding_epoch,
    key_hash,key_prefix,scopes,active,expires_at,updated_at)
    VALUES(${quote(liveKey)},'Synthetic live Worker key',NULL,${quote(workspace)},${quote(host)},
     ${quote(installation)},1,${quote('3'.repeat(64))},'synthetic',
     '["agent-runtime:claim"]'::jsonb,true,now()+interval '1 hour',now());
   SET session_replication_role=origin;`);
  assert.ok(preview().blockers.includes('credential_active'));
  refused(command(workspace,owner,randomUUID(),preview().previewDigest),'decision_withdrawal_stale');
  sql(`SET session_replication_role=replica;DELETE FROM api_keys WHERE id=${quote(liveKey)};SET session_replication_role=origin;`);
  const issuanceOperation=randomUUID();
  sql(`SET session_replication_role=replica;
   INSERT INTO agent_credential_operations(id,workspace_id,request_id,request_hash,key_id,actor_user_id,action,snapshot)
    VALUES(${quote(issuanceOperation)},${quote(workspace)},${quote(randomUUID())},${quote('4'.repeat(64))},
     ${quote(liveKey)},${quote(owner)},'rotate',${json({decisionId:decision,intent})});
   SET session_replication_role=origin;`);
  assert.ok(preview().blockers.includes('operation_exists'));
  refused(command(workspace,owner,randomUUID(),preview().previewDigest),'decision_withdrawal_stale');
  sql(`SET session_replication_role=replica;DELETE FROM agent_credential_operations WHERE id=${quote(issuanceOperation)};SET session_replication_role=origin;`);
  const execution=randomUUID();
  sql(`SET session_replication_role=replica;
   INSERT INTO agent_executions(id,workspace_id,task_id,application_id,agent_host_id,status,requested_by_type,updated_at)
    VALUES(${quote(execution)},${quote(workspace)},${quote(task)},${quote(randomUUID())},${quote(host)},'queued','user',now());
   SET session_replication_role=origin;`);
  assert.ok(preview().blockers.includes('active_execution'));
  refused(command(workspace,owner,randomUUID(),preview().previewDigest),'decision_withdrawal_stale');
  sql(`SET session_replication_role=replica;DELETE FROM agent_executions WHERE id=${quote(execution)};SET session_replication_role=origin;`);
  const eligible=preview();
  assert.equal(eligible.eligible,true,JSON.stringify(eligible.blockers));
  assert.deepEqual(eligible.blockers,[]);
  assert.match(eligible.previewDigest,/^[a-f0-9]{64}$/);
  assert.deepEqual(eligible.handoff,{id:handoff,state:'expired',expired:true});
  refused(command(workspace,other,randomUUID(),eligible.previewDigest),'decision_withdrawal_forbidden');
  refused(command(workspace,owner,randomUUID(),eligible.previewDigest).replace(quote(reason),'NULL'),
   'decision_withdrawal_scope_invalid');
  const nullRequest=randomUUID();
  refused(command(workspace,owner,nullRequest,eligible.previewDigest).replace(`${quote(nullRequest)}::uuid`,'NULL::uuid'),
   'decision_withdrawal_scope_invalid');
  sql(`SET session_replication_role=replica;UPDATE tasks SET title='Synthetic retained task, later edit' WHERE id=${quote(task)};SET session_replication_role=origin;`);
  assert.equal(preview().eligible,true);
  assert.notEqual(preview().previewDigest,eligible.previewDigest,'dependency change invalidates preview');
  refused(command(workspace,owner,randomUUID(),eligible.previewDigest),'decision_withdrawal_stale');
  const current=preview();
  const before=sql(`SELECT (SELECT count(*) FROM worker_credential_handoffs WHERE workspace_id=${quote(workspace)}::uuid),
   (SELECT count(*) FROM api_keys WHERE workspace_id=${quote(workspace)}::uuid),
   (SELECT count(*) FROM agent_credential_operations WHERE workspace_id=${quote(workspace)}::uuid),
   (SELECT state FROM worker_credential_handoffs WHERE id=${quote(handoff)}::uuid);`);
  sql(`SET session_replication_role=replica;
   INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
    VALUES(${quote(acceptedPreview)},${quote(decision)},${quote(workspace)},1,${json({taskIds:[task]})},
     ${quote(owner)},${quote(randomUUID())},${quote(hash)});
   SET session_replication_role=origin;`);
  const request=randomUUID();
  const race=concurrentPsql(`BEGIN;${command(workspace,owner,request,current.previewDigest)}\n\\echo WITHDRAWAL_PENDING_COMMIT\nSELECT pg_sleep(2);COMMIT;\n`,
   'WITHDRAWAL_PENDING_COMMIT');
  await race.ready;
  const acceptanceWait=Date.now();
  refused(`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash)
   VALUES(${quote(randomUUID())},${quote(decision)},${quote(workspace)},${quote(acceptedPreview)},
    ${quote(owner)},${quote(randomUUID())},${quote(hash)});`,'decision_stale');
  assert.ok(Date.now()-acceptanceWait>=500,'acceptance waited for new-kind withdrawal transaction');
  await race.done;
  const first=sql(`SELECT id,decision_id,request_id,withdrawn_at FROM decision_withdrawals WHERE decision_id=${quote(decision)}::uuid;`);
  assert.equal(first.split('|')[1],decision);
  assert.equal(sql(command(workspace,owner,request,current.previewDigest)),first,'exact replay retains one row');
  refused(command(workspace,owner,request,current.previewDigest,reason+' Changed'),'decision_withdrawal_request_conflict');
  assert.equal(sql(`SELECT decision_state(${quote(decision)}::uuid);`),'withdrawn');
  assert.equal(sql(`SELECT count(*),min(kind),bool_and(predecessor_id IS NULL),min(impact_digest)
   FROM decision_withdrawals WHERE decision_id=${quote(decision)}::uuid;`),`1|expired_worker_rotation|t|${current.previewDigest}`);
  assert.equal(sql(`SELECT (SELECT count(*) FROM worker_credential_handoffs WHERE workspace_id=${quote(workspace)}::uuid),
   (SELECT count(*) FROM api_keys WHERE workspace_id=${quote(workspace)}::uuid),
   (SELECT count(*) FROM agent_credential_operations WHERE workspace_id=${quote(workspace)}::uuid),
   (SELECT state FROM worker_credential_handoffs WHERE id=${quote(handoff)}::uuid);`),before,
   'withdrawal does not mutate handoff or credential state');
  assert.equal(sql(`SELECT status::text,execution_readiness->>'status' FROM tasks WHERE id=${quote(task)}::uuid;`),'archived|draft');
  assert.equal(sql('SELECT bootstrap_v3_catalog();'),'t');
 } finally {
  docker(['dropdb','-U','companycore',database]);
  const remains=docker(['psql','-X','-qAt','-U','companycore','-d','postgres','-c',
   `SELECT count(*) FROM pg_database WHERE datname=${quote(database)};`]).trim();
  assert.equal(remains,'0','owned disposable database removed');
 }
});
