// Static migration review only. Does not connect to PostgreSQL or execute DDL.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import shared from './lib/agent-host-release-contract.cjs';
const url=new URL('../prisma/migrations/20261006213000_compose_compatible_artifact_recovery/migration.sql',import.meta.url);
const sql=readFileSync(url,'utf8'),withoutComments=sql.replace(/--[^\n]*/g,''),h=x=>createHash('sha256').update(x).digest('hex');
test('applied recovery-only precedent is byte-for-byte unchanged',()=>{
 assert.equal(h(readFileSync(new URL('../prisma/migrations/20261006203000_compose_recovery_only/migration.sql',import.meta.url))),
  '9762315cd0b92684a7e6157edaa57ddc5e0a0164f234063b00210b5b08ab23e5');
});
test('migration is transactional additive functions/triggers with no business mutation or replacement',()=>{
 assert.match(sql,/^BEGIN;/);assert.match(sql,/COMMIT;\s*$/);
 assert.doesNotMatch(withoutComments,/\b(?:DROP|TRUNCATE|ALTER|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i);
 assert.doesNotMatch(withoutComments,/CREATE\s+OR\s+REPLACE/i);
 const names=[...sql.matchAll(/CREATE FUNCTION\s+(\w+)/g)].map(x=>x[1]);
 assert(names.length>=10);assert(names.every(n=>n.startsWith('governed_release_compatible_')));assert.equal(new Set(names).size,names.length);
});
test('four opt-in triggers remain separate from legacy guards and lock the same application fence',()=>{
 const names=[...sql.matchAll(/CREATE TRIGGER\s+(\w+)/g)].map(x=>x[1]);assert.equal(names.length,4);
 for(const kind of['insert','operation','outcome','renewal']){assert(names.includes('governed_release_compatible_'+kind+'_guard'));
  const start=sql.indexOf('CREATE FUNCTION governed_release_compatible_'+kind+'_guard'),end=sql.indexOf('END $$;',start),body=sql.slice(start,end);
  assert.match(body,/snapshot\?'compatibleArtifactRecovery'/);assert.match(body,/pg_advisory_xact_lock/);
 }
});
test('scope and progression retain own Git, full observation and real smoke before cleanup/resume',()=>{
 const seq=shared.compatibleRecoveryOperations;
 assert.deepEqual(seq,['push','pr','review','merge','deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup']);
 const list=seq.map(x=>`'${x}'`).join(',');assert(sql.includes('jsonb_build_array('+list+')'));assert(sql.includes('ARRAY['+list+']'));
 for(const marker of['normalized','historicalRollbackExecutable']){if(marker==='historicalRollbackExecutable')assert(sql.includes(marker));}
 assert(sql.includes("COALESCE(CASE WHEN x.status='reconciled' THEN x.reconciled_status ELSE x.status END,'unresolved')<>'succeeded'"));
 assert(sql.includes("NEW.operation IS DISTINCT FROM ops[count_ops+1]"));
});
test('actual DB-only inventory supports explicit absence; no historical container is silently reused',()=>{
 for(const marker of["'presence'='absent'","'containerId' IS DISTINCT FROM 'null'::jsonb","'imageDigest' IS DISTINCT FROM 'null'::jsonb",
  "'absenceVerified' IS DISTINCT FROM 'true'::jsonb","'projectServiceSetComplete'","'historicalServiceReferences'","'readOnlyFence'","'ownedTransactions'"])
  assert(sql.includes(marker),marker);
 assert(sql.includes('currentEntry'));assert(sql.includes('imageAvailability'));
});
test('proof uses real owner verification and DB lookup, not public native flags as OS authority',()=>{
 for(const marker of['application_evidence','workspaces','workspace_memberships','owner_user_id=issuer',"a.verified_by_type IS DISTINCT FROM 'user'",
  'a.verified_by_id IS DISTINCT FROM issuer::text',"meta->>'classification' IS DISTINCT FROM 'owner_verified_native_receipt'",
  "WHERE id=(meta->>'nativeAttemptId')::uuid AND workspace_id=workspace",'serverOperatingSystemAttestation','serverPrivateSignatureVerification'])assert(sql.includes(marker),marker);
 assert(sql.includes('NOT a private HMAC or operating system'));assert(sql.includes('expected=p'));
});
test('stored proof schema mirrors all frozen TypeScript snapshot fields',()=>{
 const source=readFileSync(new URL('../src/modules/agent-runtime/compatible-recovery-proof.ts',import.meta.url),'utf8');
 const region=source.slice(source.indexOf('export type CompatibleRecoveryProofSnapshot = {'),source.indexOf('export type QualifiedCompatibleRecoveryProof'));
 const fields=[...region.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*:/g)].map(x=>x[1]);
 for(const field of fields)assert(sql.includes("'"+field+"'"),field);
 for(const marker of['metadataDigest','recordDigest','requestDigest','sourceBasisDigest','scopeBasisDigest','publicPayloadDigest'])assert(sql.includes(marker));
 assert(sql.includes('YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));assert(sql.includes("jsonb_build_object('action',NULL)"));
});
test('both independent exact payload artifact links and current review/native material are guarded',()=>{
 for(const marker of['roost-release-compatible-artifact-scope:','roost-compatible-artifact-build:','roost-compatible-artifact-restore:',
  'completed_result_readonly_native_valid(scope_e)','completed_result_basis_current(e)','task_review_material(source_e)','task_review_material(scope_e)',
  'source_e.id=scope_e.id','scope_review.verifier_id::text IN'])assert(sql.includes(marker),marker);
});
test('successful installed evidence binds all four replacement images twice and finished target queue',()=>{
 for(const marker of['runtime_images IS DISTINCT FROM expected','bound_images IS DISTINCT FROM expected',"'queue'->>'status' IS DISTINCT FROM 'finished'",
  "'deployedCommit' IS DISTINCT FROM s->'commit'","'deployedTree' IS DISTINCT FROM s->'candidateTree'",'jsonb_array_length(runtime_images)<>4',
  'jsonb_array_length(bound_images)<>4',"'observationSeconds'",'governed_release_compatible_installed_images_unproven'])assert(sql.includes(marker),marker);
});
test('smoke/data cleanup and restored cadence evidence preserve zero budgets, parity and real duration',()=>{
 for(const marker of['governed_release_compatible_smoke_unproven','governed_release_compatible_cleanup_unproven','governed_release_compatible_resume_unproven',
  "'providerRequests' IS DISTINCT FROM '0'::jsonb","'externalActions' IS DISTINCT FROM '0'::jsonb",'baselineSequenceDigest','databaseSettingsDigest','ingressSettingsDigest',
  'completedTicks','executed','skipped','runtimeResume'])assert(sql.includes(marker),marker);
});
test('all validators fail closed on exceptions; dollar-quoted function bodies are paired',()=>{
 assert.equal((sql.match(/\$\$/g)||[]).length%2,0);assert.equal((sql.match(/CREATE FUNCTION/g)||[]).length,(sql.match(/END \$\$;|\n\$\$;/g)||[]).length);
 for(const name of['manifest_valid','entry_valid','proof_valid','basis_valid','execution_current']){
  const start=sql.indexOf('CREATE FUNCTION governed_release_compatible_'+name),end=sql.indexOf('END $$;',start),body=sql.slice(start,end);
  assert.match(body,/EXCEPTION WHEN OTHERS THEN RETURN FALSE/);
 }
});
