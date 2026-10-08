import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const root=path.resolve(__dirname,'../..');
const migration=readFileSync(path.join(root,'prisma/migrations/20261008210000_compatible_unstarted_revocation/migration.sql'),'utf8');

test('additive revocation recovery preserves the existing basis guard and historical ledger',()=>{
 assert.match(migration,/CREATE OR REPLACE FUNCTION governed_release_compatible_insert_guard/);
 assert.match(migration,/governed_release_compatible_basis_valid\(NEW.snapshot,NEW.workspace_id,NEW.issuer_user_id,TRUE\) IS DISTINCT FROM TRUE/);
 assert.match(migration,/pg_advisory_xact_lock\(hashtextextended\(NEW.application_id::text,0\)\)/);
 assert.doesNotMatch(migration,/\b(?:DELETE|UPDATE|DROP|TRUNCATE|ALTER TABLE)\b/i);
 const source=readFileSync(path.join(root,'src/modules/agent-runtime/governed-release.ts'),'utf8');
 assert.match(source,/NOT EXISTS\(SELECT 1 FROM governed_release_revocations v WHERE v.release_id=r.id\)\s+OR EXISTS\(SELECT 1 FROM governed_release_operations o WHERE o.release_id=r.id\)/);
});

test('actual PostgreSQL admission permits only a revoked grant with no operation',
 {skip:!process.env.ROOST_RELEASE_REVOCATION_SQL_CONTAINER},()=>{
 const container=process.env.ROOST_RELEASE_REVOCATION_SQL_CONTAINER!;
 assert.match(container,/^roost-unstarted-revoke-proof-[a-f0-9]{32}$/);
 const label=spawnSync('docker',['inspect','--format','{{index .Config.Labels "roost.test.kind"}}',container],{encoding:'utf8',timeout:10000});
 assert.equal(label.status,0);assert.equal(label.stdout.trim(),'unstarted-revocation-isolated');
 const schema='proof_'+randomUUID().replaceAll('-','');
 // The full existing basis validator is outside this narrow SQL fixture.
 // The real changed trigger runs against real tables with both basis outcomes.
 const sql=`BEGIN; CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema};
 CREATE TABLE governed_releases(id UUID PRIMARY KEY,workspace_id UUID,application_id UUID,issuer_user_id UUID,snapshot JSONB);
 CREATE TABLE governed_release_revocations(release_id UUID);
 CREATE TABLE governed_release_operations(release_id UUID);
 CREATE FUNCTION governed_release_compatible_basis_valid(JSONB,UUID,UUID,BOOLEAN) RETURNS BOOLEAN LANGUAGE SQL AS $$SELECT COALESCE(($1->>'basis')::boolean,FALSE)$$;
 ${migration}
 CREATE TRIGGER actual_guard BEFORE INSERT ON governed_releases FOR EACH ROW EXECUTE FUNCTION governed_release_compatible_insert_guard();
 DO $test$ DECLARE prior UUID; candidate UUID; n INTEGER; blocked BOOLEAN; w UUID:='11111111-1111-4111-8111-111111111111'; a UUID:='22222222-2222-4222-8222-222222222222';
 BEGIN
 FOR n IN 1..6 LOOP
  prior:=gen_random_uuid();candidate:=gen_random_uuid();
  INSERT INTO governed_releases VALUES(prior,w,a,w,jsonb_build_object('compatibleArtifactRecovery',jsonb_build_object('prior',jsonb_build_object('closureId',n::text)),'basis',TRUE));
  IF n<>1 THEN INSERT INTO governed_release_revocations VALUES(prior);END IF;
  IF n IN(3,4,5) THEN INSERT INTO governed_release_operations VALUES(prior);END IF;
  blocked:=FALSE;
  BEGIN
   INSERT INTO governed_releases VALUES(candidate,w,a,w,jsonb_build_object('compatibleArtifactRecovery',jsonb_build_object('prior',jsonb_build_object('closureId',n::text)),'basis',n<>6));
  EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'governed_release_compatible_recovery_unproven' THEN RAISE;END IF;blocked:=TRUE;
  END;
  IF (n=2 AND blocked) OR (n<>2 AND NOT blocked) THEN RAISE EXCEPTION 'unexpected admission for case %',n;END IF;
  IF n=2 THEN
   blocked:=FALSE;
   BEGIN INSERT INTO governed_releases VALUES(gen_random_uuid(),w,a,w,jsonb_build_object('compatibleArtifactRecovery',jsonb_build_object('prior',jsonb_build_object('closureId',n::text)),'basis',TRUE));
   EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'governed_release_compatible_recovery_unproven' THEN RAISE;END IF;blocked:=TRUE;END;
   IF NOT blocked THEN RAISE EXCEPTION 'second active successor admitted';END IF;
  END IF;
 END LOOP;
 END $test$;
 ROLLBACK;`;
 const run=spawnSync('docker',['exec','-i',container,'psql','-U','companycore','-d','postgres','-v','ON_ERROR_STOP=1','-q'],{input:sql,encoding:'utf8',timeout:30000});
 assert.equal(run.status,0,run.stderr);
});
