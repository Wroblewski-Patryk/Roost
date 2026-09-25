import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {owned,prepare} from './decision-attestation-native-fixture';
import {nativeCompletionHarness,syntheticSignature,type NativeCompletionHarness} from './bootstrap-canonical-completion-native-fixture';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {createPrismaTicketLifecycleStore} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {createBootstrapV2ChannelBinding} from '../modules/api-keys/bootstrap-channel-store';

test('native canonical bootstrap completion',{skip:!process.env.WORKER_IDENTITY_NATIVE_DATABASE,timeout:850000},async t=>{
 const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);url.searchParams.set('connection_limit','1');
 const clients=Array.from({length:20},()=>new PrismaClient({datasources:{db:{url:url.toString()}}}));
 await db.$connect();await owned(db);for(const client of clients){await client.$connect();await owned(client);}
 t.after(async()=>{await Promise.allSettled(clients.map(c=>c.$disconnect()));await db.$disconnect();});
 const pids=await Promise.all(clients.map(c=>c.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`));assert.equal(new Set(pids.flat().map(r=>r.pid)).size,20);
 let effects=0;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 await db.$executeRawUnsafe("CREATE FUNCTION native_dispatch_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic completion deferred rejection'; END $$");
 const tables=['workspaces','workspace_memberships','agent_hosts','worker_identity_lifecycle','worker_identity_lifecycle_audit','bootstrap_issuer_history','bootstrap_issuer_audit',
  'decisions','decision_revisions','decision_acceptances','decision_impact_previews','decision_attestation_key_history','decision_owner_auth_evidence','decision_attestations','decision_authority_events',
  'decision_attestation_write_receipts','worker_transport_bootstrap_grants','worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_audit','worker_transport_write_audit',
  'worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events','worker_bootstrap_write_receipts',
  'worker_bootstrap_dispatch_history','worker_bootstrap_dispatch_receipts','worker_bootstrap_completions','worker_bootstrap_completion_receipts','api_keys','worker_credential_handoffs','agent_credential_operations','ready_source_fence','events'];
 async function snapshot(){return db.$queryRawUnsafe(tables.map(table=>`SELECT '${table}' AS tbl,count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${table} t`).join(' UNION ALL ')+' ORDER BY tbl');}
 const fresh=(recovery=false)=>nativeCompletionHarness(db,clients,recovery),uncertain=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.error,'reconciliation_required');assert.equal(r.retryable,false);assert.equal(r.completionRecorded,false);assert.equal(r.credentialActivated,false);};
 const diagnostics=(h:NativeCompletionHarness)=>JSON.stringify({errors:[...h.errors,...h.dispatch.errors].slice(-5),writes:h.writes});
 async function complete(h:NativeCompletionHarness,v:Awaited<ReturnType<typeof h.input>>){const result=await h.factory().complete(v);assert.ok(result.ok,diagnostics(h));
  assert.equal(result.completionRecorded,true);assert.equal(result.credentialActivated,true);for(const flag of Object.keys(lifecycleFlags))assert.equal((result as any)[flag],false);return result;}
 let happy=false,recoveryHappy=false;
 await t.test('native first enrollment uses real eleven-statement writer and exact committed facts',async()=>{
  const h=await fresh(),v=await h.input(),result=await complete(h,v),fact=await h.fact();
  assert.equal(h.writes.length,11);assert.equal(fact.completions,1);assert.equal(fact.key.active,true);assert.equal(fact.handoffState,'acknowledged');assert.ok(fact.acknowledgedAt);
  assert.equal(fact.key.id,v.binding.payload.credential.id);assert.equal(fact.key.fingerprint,v.binding.payload.credential.fingerprint);
  assert.equal(new Set([...h.verifications.map(v=>v.db),...h.providers]).size,1);
  const rows=await db.$queryRaw<any[]>`SELECT h.state,l.record->>'state' AS ticket FROM worker_bootstrap_history h JOIN worker_bootstrap_lifecycle_events l ON l.history_id=h.id WHERE h.attempt_id=${h.dispatch.scope.attemptId}::uuid ORDER BY h.revision`;
  assert.deepEqual(rows.map(r=>[r.state,r.ticket]),[['consumed','consumed'],['dispatched','dispatched'],['acknowledged','completed']]);
  const before=await snapshot();assert.equal((await h.factory().inspect(v)).completionRecorded,true);assert.deepEqual(await snapshot(),before);
  const legacy=await h.dispatch.factory().inspect(h.dispatch.scope);assert.ok(legacy.ok);assert.equal(legacy.canonical.completionRecorded,false);assert.equal(legacy.canonical.credentialActivated,false);
  console.log(JSON.stringify({firstEnrollment:true,statements:11,activated:1,receipt:result.receipt,publicFingerprintMatches:true}));happy=true;
 });assert.ok(happy,'Stop after first native completion failure');
 await t.test('owner recovery follows actual credential, handoff, channel and ticket revocation',async()=>{
  const h=await fresh(true),v=await h.input(),baseline=h.f.reg.record.signed.payload.intent.baseline.credential!;
  assert.equal(h.recoveryChannelRevocation?.action,'revoke');assert.equal(h.recoveryChannelRevocation?.state,'revoked');assert.equal(h.recoveryChannelRevocation?.revision,2);
  const prior=await db.apiKey.findUniqueOrThrow({where:{id:baseline.id},select:{active:true,revokedAt:true,credentialVersion:true}});
  assert.equal(baseline.version,2);assert.equal(prior.credentialVersion,2);assert.equal(prior.active,false);assert.ok(prior.revokedAt);
  const candidate=(await h.fact()).key;assert.equal(candidate.active,false);assert.equal(candidate.epoch,2);assert.notEqual(candidate.id,baseline.id);
  await complete(h,v);const fact=await h.fact();assert.equal(h.writes.length,11);assert.equal(fact.key.epoch,2);assert.equal(fact.key.active,true);assert.equal(fact.completions,1);
  assert.equal(fact.key.id,v.binding.payload.credential.id);assert.equal(fact.key.fingerprint,v.binding.payload.credential.fingerprint);
  assert.equal(fact.handoffState,'acknowledged');assert.ok(fact.acknowledgedAt);
  console.log(JSON.stringify({recovery:true,directChannelRevoke:true,channelRevision:h.recoveryChannelRevocation!.revision,predecessorVersion:prior.credentialVersion,
   predecessorRevoked:true,freshCandidateEpoch:candidate.epoch,statements:h.writes.length,acknowledged:true,activated:1,reconciliationFallback:false}));recoveryHappy=true;
 });assert.ok(recoveryHappy,'Stop after native recovery failure');
 await t.test('twenty distinct clients contend with exactly one final writer and activation',async()=>{
  const h=await fresh(),base=await h.input(),requests=Array.from({length:20},()=>{const v=structuredClone(base);v.binding.payload.command.operationId=randomUUID();
   v.binding.signature=syntheticSignature(v.binding.payload.version,v.binding.payload);return v;});
  const start=h.dispatch.traces.length,results=await Promise.all(requests.map((v,i)=>h.factory(i).complete(v)));
  assert.equal(results.filter(r=>r.ok).length,1,diagnostics(h));assert.equal((await h.fact()).completions,1);assert.equal((await h.fact()).key.active,true);
  assert.equal(new Set(h.dispatch.traces.slice(start).filter(r=>r.mode==='write').map(r=>r.pid)).size,20);
  const count=await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM agent_credential_operations WHERE key_id=${base.binding.payload.credential.id}::uuid`;assert.equal(count[0].n,1);
  console.log(JSON.stringify({clients:20,distinctPids:20,completionWriters:1,activations:1}));
 });
 await t.test('exact completed replay is read-only and conflicting replay denies',async()=>{
  const h=await fresh(),v=await h.input();await complete(h,v);const before=await snapshot(),start=h.dispatch.traces.length;
  const results=await Promise.all(clients.map((_,i)=>h.factory(i).complete(structuredClone(v))));assert.ok(results.every(r=>r.ok&&r.idempotent));
  const conflict=structuredClone(v);conflict.binding.signature='f'.repeat(128);assert.equal((await h.factory().complete(conflict)).ok,false);
  assert.deepEqual(await snapshot(),before);assert.ok(h.dispatch.traces.slice(start).every(r=>r.mode==='read'));
 });
 await t.test('invalid verifier or possession provider cannot write or activate',async()=>{
  const h=await fresh(),v=await h.input(),before=await snapshot();
  for(const kind of ['peer','completion','binding']){h.controls.verify=kind;assert.equal((await h.factory().complete(v)).ok,false);}
  h.controls.verify='';h.controls.provider=true;assert.equal((await h.factory().complete(v)).ok,false);assert.equal(h.writes.length,0);assert.deepEqual(await snapshot(),before);
 });
 await t.test('exact binding mutations reject even with internally consistent evidence doubles',async()=>{
  const h=await fresh(),base=await h.input(),before=await snapshot();
  const changes:Array<(v:any)=>void>=[v=>v.binding.payload.requestId=randomUUID(),v=>v.binding.payload.sealDigest='f'.repeat(64),v=>v.binding.payload.ticketEnvelopeDigest='f'.repeat(64),
   v=>v.binding.payload.hostGeneration=randomUUID(),v=>v.binding.payload.installationGeneration=randomUUID(),v=>v.binding.payload.credential.epoch++,
   v=>v.binding.payload.dispatchPredecessor.writerXid='999999',v=>v.binding.payload.command.expectedRevision++,v=>v.binding.payload.command.ownerEpoch++,
   v=>v.peer.payload.serverName='other.example.org',v=>v.peer.payload.pin='f'.repeat(64),v=>v.peer.payload.caDigest='f'.repeat(64),v=>v.peer.payload.certificateEpoch++,
   v=>v.peer.payload.peerAddress='127.0.0.1',v=>v.completion.payload.responseDigest='f'.repeat(64),v=>v.binding.payload.issuedAt=new Date(Date.now()+60000).toISOString()];
  for(const change of changes){const v=structuredClone(base);change(v);v.peer.signature=syntheticSignature('roost-worker-bootstrap-v1:peer',v.peer.payload);
   v.completion.signature=syntheticSignature('roost-worker-bootstrap-v1:completion',v.completion.payload);v.binding.payload.peerDigest=reviewDigest(v.peer);v.binding.payload.completionDigest=reviewDigest(v.completion);
   v.binding.signature=syntheticSignature(v.binding.payload.version,v.binding.payload);assert.equal((await h.factory().complete(v)).ok,false);}
  assert.equal(h.writes.length,0);assert.deepEqual(await snapshot(),before);console.log(JSON.stringify({nativeSignedBindingMutations:changes.length,denied:changes.length}));
 });
 await t.test('rollback after each of eleven actual statements leaves exact original snapshots',async()=>{
  for(let statement=1;statement<=11;statement++){
   const h=await fresh(),v=await h.input(),before=await snapshot();h.controls.atWrite=statement;uncertain(await h.factory().complete(v));
   assert.equal(h.faultHits(),1,`phase ${statement}`);assert.equal(h.writes.length,statement);assert.deepEqual(await snapshot(),before);assert.equal((await h.fact()).key.active,false);
  }console.log(JSON.stringify({rollbackStatements:11,confirmedFaults:11,activations:0}));
 });
 await t.test('real deferred rejection rolls back all completion facts',async()=>{
  const h=await fresh(),v=await h.input(),before=await snapshot();h.dispatch.controls.fault='deferred';uncertain(await h.factory().complete(v));
  assert.equal(h.writes.length,11);assert.deepEqual(await snapshot(),before);assert.equal((await h.fact()).completions,0);
 });
 await t.test('migration85 deferred receipt rejection is observed despite Prisma false resolution',async()=>{
  const h=await fresh(),v=await h.input(),before=await snapshot();h.controls.beforeCommit=async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;
   await tx.$executeRaw`DELETE FROM worker_bootstrap_completion_receipts WHERE operation_id=${v.binding.payload.command.operationId}::uuid`;await tx.$executeRaw`SET LOCAL session_replication_role=origin`;};
  uncertain(await h.factory().complete(v));assert.equal(h.writes.length,11);assert.deepEqual(await snapshot(),before);
 });
 await t.test('actual connection termination before COMMIT produces no activation and no retry',async()=>{
  const h=await fresh(),v=await h.input(),before=await snapshot();h.dispatch.controls.fault='connection';uncertain(await h.factory().complete(v));assert.deepEqual(await snapshot(),before);
 });
 await t.test('false and lost transaction ACK are independently reconciled',async()=>{
  for(const fault of ['false','lost']){const h=await fresh(),v=await h.input(),before=await snapshot();h.dispatch.controls.fault=fault;uncertain(await h.factory().complete(v));
   assert.equal((await h.fact()).completions,fault==='lost'?1:0);assert.equal((await h.fact()).key.active,fault==='lost');if(fault==='false')assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('two real relay cuts after PostgreSQL COMMIT preserve one activation each',async()=>{
  assert.equal(process.env.WORKER_IDENTITY_NATIVE_FAULT_RELAY,'1');
  for(let n=0;n<2;n++){const h=await fresh(),v=await h.input();h.dispatch.controls.fault='wire';uncertain(await h.factory().complete(v));
   assert.equal((await h.fact()).completions,1);assert.equal((await h.fact()).key.active,true);h.dispatch.clear();const replay=await h.factory().complete(v);assert.ok(replay.ok&&replay.idempotent);}
 });
 await t.test('missing mismatched unavailable independent readback never grants success',async()=>{
  for(const fault of ['missing','mismatch','readback']){const h=await fresh(),v=await h.input();h.controls.fault=fault;uncertain(await h.factory().complete(v));
   assert.ok(h.faultHits()>0);assert.equal((await h.fact()).completions,1);assert.equal((await h.fact()).key.active,true);}
 });
 await t.test('authority and credential drift during callback denies and rolls back',async()=>{
  const changes:Array<(tx:any,h:NativeCompletionHarness)=>Promise<unknown>>=[
   (tx,h)=>tx.$executeRaw`UPDATE agent_hosts SET status='disabled' WHERE id=${h.f.reg.identity.binding.hostId}::uuid`,
   (tx,h)=>tx.$executeRaw`UPDATE api_keys SET active=false,revoked_at=clock_timestamp() WHERE id=${h.f.reg.record.signed.payload.intent.target.id}::uuid`,
   (tx,h)=>tx.$executeRaw`UPDATE worker_credential_handoffs SET state='revoked' WHERE id=${h.s.handoffId}::uuid`,
   (tx)=>tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`];
  for(const change of changes){const h=await fresh(),v=await h.input(),before=await snapshot();let hit=false;
   h.controls.afterProvider=async tx=>{
    // Source corruption is an owned fault fixture, not a lifecycle writer.
    // Origin forbids direct host authority edits before the observer can see drift.
    await tx.$executeRaw`SET LOCAL session_replication_role=replica`;
    await change(tx,h);await tx.$executeRaw`SET LOCAL session_replication_role=origin`;hit=true;
   };assert.equal((await h.factory().complete(v)).ok,false);assert.ok(hit,diagnostics(h));assert.equal(h.writes.length,0);assert.deepEqual(await snapshot(),before);}
 });
 await t.test('source drift immediately before COMMIT fails the native completion guard',async()=>{
  for(const source of ['fence','decision','certificate','key','channel','credential']){
   const h=await fresh(),v=await h.input(),before=await snapshot();let hit=false;h.controls.beforeCommit=async tx=>{
    if(source==='fence')await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
    else{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;
     if(source==='decision')await tx.$executeRaw`UPDATE decision_revisions SET version=version+1 WHERE decision_id=${h.f.q.decisionId}::uuid`;
     if(source==='certificate')await tx.$executeRaw`UPDATE worker_transport_heads SET certificate_epoch=certificate_epoch+1,high_water_epoch=high_water_epoch+1 WHERE host_id=${h.f.reg.identity.binding.hostId}::uuid`;
     if(source==='key')await tx.$executeRaw`UPDATE trusted_provider_ticket_keys SET public_key_digest=${'f'.repeat(64)} WHERE workspace_id=${h.f.reg.identity.binding.workspaceId}::uuid`;
     if(source==='channel')await tx.$executeRaw`UPDATE worker_transport_heads SET state='revoked' WHERE host_id=${h.f.reg.identity.binding.hostId}::uuid`;
     if(source==='credential')await tx.$executeRaw`UPDATE api_keys SET active=false WHERE id=${v.binding.payload.credential.id}::uuid`;
     await tx.$executeRaw`SET LOCAL session_replication_role=origin`;}
    hit=true;
   };uncertain(await h.factory().complete(v));assert.ok(hit);assert.equal(h.writes.length,11);assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('malformed direct completion inserts reject receipt binding substitutions',async()=>{
  for(const field of ['input','context','plan','proof','receipt','writer','fromFence','toFence']){
   const h=await fresh(),v=await h.input(),before=await snapshot();let hit=false;
   h.controls.mutateChild=values=>{hit=true;
    if(field==='input'){const p=JSON.parse(values[6]);p.binding.payload.ticketEnvelopeDigest='f'.repeat(64);values[6]=JSON.stringify(p);}
    if(field==='context'){const p=JSON.parse(values[7]);p.sourceDigest='f'.repeat(64);values[7]=JSON.stringify(p);}
    if(field==='plan'){const p=JSON.parse(values[8]);p.dispatch.lineage.previous.eventId=randomUUID();values[8]=JSON.stringify(p);}
    if(field==='proof')values[9]='{}';if(field==='receipt'){const p=JSON.parse(values[10]);p.eventId=randomUUID();values[10]=JSON.stringify(p);}
    if(field==='writer'){const p=JSON.parse(values[10]);p.writerXid='999999';values[10]=JSON.stringify(p);}
    if(field==='fromFence')values[11]='1';if(field==='toFence')values[12]='999999';
   };uncertain(await h.factory().complete(v));assert.ok(hit);assert.deepEqual(await snapshot(),before);
  }console.log(JSON.stringify({malformedCompletionInserts:8,denied:8}));
 });
 await t.test('missing and corrupted committed receipt/Event/lineage evidence fail closed without repair',async()=>{
  const h=await fresh(),v=await h.input();await complete(h,v);const id=v.binding.payload.command.operationId;
  for(const fault of ['receipt','extra_receipt','event','digest','xid','fence','head','lineage']){
   const extraReceipt=randomUUID();
   const row=(await db.$queryRaw<any[]>`SELECT to_jsonb(r) AS row FROM worker_bootstrap_completion_receipts r WHERE operation_id=${id}::uuid`)[0].row,
    event=(await db.$queryRaw<any[]>`SELECT to_jsonb(e) AS row FROM events e WHERE id=${row.event_id}::uuid`)[0].row,
    head=(await db.$queryRaw<any[]>`SELECT to_jsonb(h) AS row FROM worker_bootstrap_heads h WHERE attempt_id=${h.dispatch.scope.attemptId}::uuid`)[0].row,
    dispatch=(await db.$queryRaw<any[]>`SELECT to_jsonb(d) AS row FROM worker_bootstrap_dispatch_history d WHERE id=${id}::uuid`)[0].row,before=await snapshot();
   await prepare(db,async tx=>{
    if(fault==='receipt')await tx.$executeRaw`DELETE FROM worker_bootstrap_completion_receipts WHERE operation_id=${id}::uuid`;
    if(fault==='extra_receipt')await tx.$executeRaw`INSERT INTO decision_attestation_write_receipts
     SELECT (jsonb_populate_record(NULL::decision_attestation_write_receipts,to_jsonb(r)||jsonb_build_object('id',${extraReceipt}::text,'event_id',${randomUUID()}::text,'row_id',${extraReceipt}::text))).*
     FROM decision_attestation_write_receipts r WHERE r.writer_xid=${row.writer_xid} LIMIT 1`;
    if(fault==='event')await tx.$executeRaw`UPDATE events SET payload='{}'::jsonb WHERE id=${row.event_id}::uuid`;
    if(fault==='digest')await tx.$executeRaw`UPDATE worker_bootstrap_completion_receipts SET record_digest=${'f'.repeat(64)} WHERE operation_id=${id}::uuid`;
    if(fault==='xid')await tx.$executeRaw`UPDATE worker_bootstrap_completion_receipts SET writer_xid='999999' WHERE operation_id=${id}::uuid`;
    if(fault==='fence')await tx.$executeRaw`UPDATE worker_bootstrap_dispatch_history SET fence_revision=fence_revision+1 WHERE id=${id}::uuid`;
    if(fault==='head')await tx.$executeRaw`UPDATE worker_bootstrap_heads SET state='delivery_unknown' WHERE attempt_id=${h.dispatch.scope.attemptId}::uuid`;
    if(fault==='lineage')await tx.$executeRaw`UPDATE worker_bootstrap_dispatch_history SET record=jsonb_set(record,'{lineage,previous,eventId}',to_jsonb(${randomUUID()}::text)) WHERE id=${id}::uuid`;
   });
   try{const changed=await snapshot();assert.equal((await h.factory().inspect(v)).ok,false,fault);assert.equal((await h.factory().complete(v)).ok,false,fault);assert.deepEqual(await snapshot(),changed);}
   finally{await prepare(db,async tx=>{
    await tx.$executeRaw`DELETE FROM decision_attestation_write_receipts WHERE id=${extraReceipt}::uuid`;
    await tx.$executeRaw`DELETE FROM worker_bootstrap_completion_receipts WHERE operation_id=${id}::uuid`;
    await tx.$executeRaw`INSERT INTO worker_bootstrap_completion_receipts SELECT * FROM jsonb_populate_record(NULL::worker_bootstrap_completion_receipts,${JSON.stringify(row)}::jsonb)`;
    await tx.$executeRaw`UPDATE events SET payload=${JSON.stringify(event.payload)}::jsonb WHERE id=${event.id}::uuid`;
    await tx.$executeRaw`UPDATE worker_bootstrap_heads SET state=${head.state} WHERE attempt_id=${h.dispatch.scope.attemptId}::uuid`;
    await tx.$executeRaw`UPDATE worker_bootstrap_dispatch_history SET record=${JSON.stringify(dispatch.record)}::jsonb,fence_revision=${String(dispatch.fence_revision)}::bigint WHERE id=${id}::uuid`;
   });}assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('canonical ticket revocation and restart never reopen completion',async()=>{
  const h=await fresh(),v=await h.input(),store=createPrismaTicketLifecycleStore(db,()=>new Date(),{channel:createBootstrapV2ChannelBinding(),verifier:{qualification:'worker_bootstrap_ticket_verifier_v2',verify:async(_tx,r)=>reviewDigest(r.signed)===reviewDigest(h.f.reg.record.signed)}});
  const status=await store.inspect({ticketId:h.f.q.ticketId});assert.ok(status.ok);await store.transition({ticketId:h.f.q.ticketId,operationId:randomUUID(),action:'revoke',expectedRevision:status.head.revision,expectedFence:status.fence});
  const before=await snapshot();assert.equal((await h.factory().complete(v)).ok,false);assert.equal((await h.fact()).key.active,false);assert.deepEqual(await snapshot(),before);
 });
 await t.test('guarded immutable rows and external-effect fences remain closed',async()=>{
  const h=await fresh(),v=await h.input();await complete(h,v);const before=await snapshot();
  for(const table of ['worker_bootstrap_completions','worker_bootstrap_completion_receipts']){
   await assert.rejects(db.$executeRawUnsafe(`DELETE FROM ${table}`));await assert.rejects(db.$executeRawUnsafe(`TRUNCATE ${table} CASCADE`));}
  assert.deepEqual(await snapshot(),before);assert.equal(effects,0);console.log(JSON.stringify({forbiddenEffects:effects,privateKeys:0,realDelivery:0,defaultActivation:false}));
 });
});
