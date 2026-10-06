BEGIN;
-- A failed candidate with recreated containers is not a deployed version or
-- retained healthy baseline. This proof authorizes only the existing rollback.
-- Historical outcome/closure/adoption qualifiers remain unchanged.
CREATE FUNCTION governed_release_compose_failed_partial_valid(s JSONB,e JSONB,op JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;
 r JSONB:=e->'composeRecovery';p JSONB:=r->'partial';q JSONB:=r->'queue';intent JSONB:=op->'intent';
 row JSONB;d JSONB;prior JSONB;img JSONB;rows JSONB;required_images JSONB;history JSONB;history_e JSONB;history_rows JSONB;
BEGIN
 IF m->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2'
  OR m->>'purpose' IS DISTINCT FROM 'application_release'
  OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose'
  OR jsonb_array_length(m->'deployment'->'targets') IS DISTINCT FROM 1
  OR op->>'operation' IS DISTINCT FROM 'deploy' OR intent->>'operation' IS DISTINCT FROM 'deploy'
  OR NOT(intent?&ARRAY['requestId','operation','manifestDigest','commit','baseCommit','expectedVersion','observed','parameters'])
  OR (SELECT count(*) FROM jsonb_object_keys(intent))<>8
  OR NOT(intent->'observed'?&ARRAY['commit','baseCommit','baseTree','manifestDigest'])
  OR (SELECT count(*) FROM jsonb_object_keys(intent->'observed'))<>4
  OR COALESCE(intent->>'requestId','')!~'^[a-f0-9-]{36}$' OR COALESCE(op->>'id','')!~'^[a-f0-9-]{36}$'
  OR COALESCE(intent->>'expectedVersion','')!~'^[a-f0-9]{64}$'
  OR NOT(intent->'parameters'?&ARRAY['targetId','commit','artifactSetDigest','configDigest','schemaDigest'])
  OR (SELECT count(*) FROM jsonb_object_keys(intent->'parameters'))<>5
  OR intent->>'manifestDigest' IS DISTINCT FROM s->>'manifestDigest'
  OR intent->>'commit' IS DISTINCT FROM s->>'commit' OR intent->>'baseCommit' IS DISTINCT FROM s->>'baseCommit'
  OR intent->'observed'->>'manifestDigest' IS DISTINCT FROM s->>'manifestDigest'
  OR intent->'observed'->>'commit' IS DISTINCT FROM s->>'commit'
  OR intent->'observed'->>'baseCommit' IS DISTINCT FROM s->>'commit'
  OR intent->'observed'->>'baseTree' IS DISTINCT FROM s->>'candidateTree'
  OR intent->'parameters'->>'targetId' IS DISTINCT FROM t->>'targetId'
  OR intent->'parameters'->>'commit' IS DISTINCT FROM s->>'commit'
  OR intent->'parameters'->>'artifactSetDigest' IS DISTINCT FROM m->'deployment'->>'artifactSetDigest'
  OR intent->'parameters'->>'configDigest' IS DISTINCT FROM m->'deployment'->>'configDigest'
  OR intent->'parameters'->>'schemaDigest' IS DISTINCT FROM m->'deployment'->>'schemaDigest'
  OR intent->'parameters'?|ARRAY['imageDigest','faultInjection']
  OR jsonb_typeof(e) IS DISTINCT FROM 'object' OR jsonb_typeof(r) IS DISTINCT FROM 'object'
  OR NOT(e?&ARRAY['composeRecovery','deploymentIds','artifactSetDigest','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','currentServiceSetDigest'])
  OR (SELECT count(*) FROM jsonb_object_keys(e))<>10
  OR NOT(r?&ARRAY['schemaVersion','kind','releaseId','operationId','since','targetId','phase','requestedCommit','requestedTree','deploymentId','queue','configuration','baselineCommit','baselineTree','migrationSchemaVerified','controlPlaneQuiescent','baselineServices','services','partial'])
  OR (SELECT count(*) FROM jsonb_object_keys(r))<>19
  OR r->>'schemaVersion' IS DISTINCT FROM 'roost-compose-recovery-observation-v1'
  OR r->>'kind' IS DISTINCT FROM 'queue_failed_partial' OR r->>'phase' IS DISTINCT FROM 'candidate'
  OR r->>'releaseId' IS DISTINCT FROM s->>'releaseId' OR r->>'operationId' IS DISTINCT FROM op->>'id'
  OR r->>'targetId' IS DISTINCT FROM t->>'targetId' OR r->>'requestedCommit' IS DISTINCT FROM s->>'commit'
  OR r->>'requestedTree' IS DISTINCT FROM s->>'candidateTree'
  OR r->>'baselineCommit' IS DISTINCT FROM s->>'baseCommit' OR r->>'baselineTree' IS DISTINCT FROM s->>'baseTree'
  OR (r->>'since')::timestamptz IS DISTINCT FROM COALESCE(op->>'createdAt',op->>'created_at')::timestamptz
  OR r->>'deploymentId' IS DISTINCT FROM 'r'||left(governed_release_compose_queue_digest(jsonb_build_array(s->'releaseId',op->'id',t->'targetId','candidate')),23)
  OR r->'configuration' IS DISTINCT FROM t->'configuration'
  OR governed_release_compose_queue_config_digest(r->'configuration') IS DISTINCT FROM t->>'configDigest'
  OR r->'controlPlaneQuiescent' IS DISTINCT FROM 'true'::jsonb OR r->'migrationSchemaVerified' IS DISTINCT FROM 'true'::jsonb
  OR e->'healthy' IS DISTINCT FROM 'false'::jsonb OR e->>'healthDigest' IS NOT DISTINCT FROM m->'baseline'->>'healthDigest'
  OR COALESCE(e->>'healthDigest','')!~'^[a-f0-9]{64}$'
  OR e->>'artifactSetDigest' IS DISTINCT FROM m->'deployment'->>'artifactSetDigest'
  OR e->>'configDigest' IS DISTINCT FROM m->'deployment'->>'configDigest'
  OR e->>'schemaDigest' IS DISTINCT FROM m->'baseline'->>'schemaDigest'
  OR e->>'schemaDigest' IS DISTINCT FROM m->'deployment'->>'schemaDigest'
  OR e->>'schemaDigest' IS DISTINCT FROM m->'rollback'->>'schemaDigest'
  OR NOT(m->'rollback'->'compatibleSchemaDigests' ? (e->>'schemaDigest'))
  OR e->>'dataDigest' IS DISTINCT FROM m->'baseline'->>'dataDigest'
  OR e->'deploymentIds' IS DISTINCT FROM jsonb_build_array(jsonb_build_object('targetId',t->'targetId','deploymentId',r->'deploymentId'))
  OR jsonb_typeof(q) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(q))<>6
  OR NOT(q?&ARRAY['targetId','deploymentId','commit','status','createdAt','finishedAt'])
  OR q->>'targetId' IS DISTINCT FROM t->>'targetId' OR q->>'deploymentId' IS DISTINCT FROM r->>'deploymentId'
  OR q->>'commit' IS DISTINCT FROM s->>'commit' OR q->>'status' IS DISTINCT FROM 'failed'
  OR jsonb_typeof(e->'observedAt') IS DISTINCT FROM 'string' OR e->>'observedAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$'
  OR jsonb_typeof(r->'since') IS DISTINCT FROM 'string' OR r->>'since' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$'
  OR jsonb_typeof(q->'createdAt') IS DISTINCT FROM 'string' OR q->>'createdAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$'
  OR jsonb_typeof(q->'finishedAt') IS DISTINCT FROM 'string' OR q->>'finishedAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$'
  OR (q->>'createdAt')::timestamptz<(r->>'since')::timestamptz
  OR (q->>'finishedAt')::timestamptz<(q->>'createdAt')::timestamptz
  OR (e->>'observedAt')::timestamptz<(q->>'finishedAt')::timestamptz THEN RETURN FALSE; END IF;
 IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p))<>10
  OR NOT(p?&ARRAY['schemaVersion','images','candidateConfigDigest','databaseReadOnly','activeOtherSessions','ownedTransactions','projectServiceSetComplete','protectedRollbackImages','presentRollbackImageDigests','publicHealth'])
  OR p->>'schemaVersion' IS DISTINCT FROM 'roost-compose-failed-partial-runtime-v1'
  OR p->>'candidateConfigDigest' IS DISTINCT FROM t->>'configDigest'
  OR p->'databaseReadOnly' IS DISTINCT FROM 'true'::jsonb OR p->'projectServiceSetComplete' IS DISTINCT FROM 'true'::jsonb
  OR p->'activeOtherSessions' IS DISTINCT FROM '0'::jsonb OR p->'ownedTransactions' IS DISTINCT FROM '0'::jsonb
  OR p->'publicHealth' IS DISTINCT FROM jsonb_build_object('healthy',FALSE,'healthDigest',e->'healthDigest')
  OR jsonb_array_length(r->'services') IS DISTINCT FROM 5 OR jsonb_array_length(r->'baselineServices') IS DISTINCT FROM 4
  OR jsonb_array_length(t->'configuration'->'services') IS DISTINCT FROM 5
  OR (SELECT count(*) FROM jsonb_array_elements(t->'configuration'->'services') v WHERE v->>'source'='built')<>4
  OR (SELECT count(*) FROM jsonb_array_elements(t->'configuration'->'services') v WHERE v->>'role'='cadence')<>2
  OR jsonb_array_length(p->'images') IS DISTINCT FROM 4
  OR (SELECT count(DISTINCT v->>'name') FROM jsonb_array_elements(p->'images') v)<>4
  OR (SELECT count(DISTINCT v->>'name') FROM jsonb_array_elements(r->'services') v)<>5
  OR (SELECT count(DISTINCT v->>'containerId') FROM jsonb_array_elements(r->'services') v)<>5
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(r->'baselineServices') v WHERE v->>'role'='migration'
   OR jsonb_typeof(v->'createdAt') IS DISTINCT FROM 'string' OR v->>'createdAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$'
   OR v?'commit' AND (jsonb_typeof(v->'commit') IS DISTINCT FROM 'string' OR COALESCE(v->>'commit','')!~'^[a-f0-9]{40}$')
   OR v?'tree' AND (jsonb_typeof(v->'tree') IS DISTINCT FROM 'string' OR COALESCE(v->>'tree','')!~'^[a-f0-9]{40}$')
   OR v?'deploymentId' AND (jsonb_typeof(v->'deploymentId') IS DISTINCT FROM 'string' OR COALESCE(v->>'deploymentId','')!~'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')) THEN RETURN FALSE; END IF;
 -- Qualify historical service facts through the unchanged baseline validator.
 -- This local projection is never persisted or described as current health.
 SELECT jsonb_agg(jsonb_build_object('name',v->'name','role',v->'role','imageDigest',v->'imageDigest','mountDigest',v->'mountDigest')
  ||CASE WHEN v?'commit' THEN jsonb_build_object('commit',v->'commit') ELSE '{}'::jsonb END
  ||CASE WHEN v?'tree' THEN jsonb_build_object('tree',v->'tree') ELSE '{}'::jsonb END ORDER BY v->>'name' COLLATE "C") INTO history_rows FROM jsonb_array_elements(r->'baselineServices') v;
 history:=(r-ARRAY['kind','phase','deploymentId','queue','partial'])||jsonb_build_object('schemaVersion','roost-compose-config-absence-v1','configuration',t->'baseline'->'configuration','noCandidateQueue',TRUE,'services',r->'baselineServices');
 history_e:=jsonb_build_object('composeConfigAbsence',history,'deploymentIds','[]'::jsonb,'deployedCommit',t->'baseline'->'commit','deployedTree',t->'baseline'->'tree',
  'artifactSetDigest',m->'baseline'->'artifactSetDigest','configDigest',m->'baseline'->'configDigest','schemaDigest',m->'baseline'->'schemaDigest','dataDigest',m->'baseline'->'dataDigest',
  'healthDigest',m->'baseline'->'healthDigest','healthy',TRUE,'absenceVerified',TRUE,'observedAt',e->'observedAt','deployedSetDigest',governed_release_compose_queue_digest(jsonb_build_array(jsonb_build_object('targetId',t->'targetId','runtimeSetDigest',governed_release_compose_queue_digest(history_rows)))));
 IF governed_release_compose_config_absence_valid(s,history_e,op||jsonb_build_object('operation','deploy_config')) IS DISTINCT FROM TRUE THEN RETURN FALSE; END IF;
 IF (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(p->'protectedRollbackImages') v) IS DISTINCT FROM
    (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(t->'baseline'->'images') v) THEN RETURN FALSE; END IF;
 SELECT jsonb_agg(x ORDER BY x COLLATE "C") INTO required_images FROM (SELECT DISTINCT v->>'imageDigest' x FROM jsonb_array_elements(t->'baseline'->'images') v
  UNION SELECT v->>'imageDigest' FROM jsonb_array_elements(t->'configuration'->'services') v WHERE v->>'source'='image') a;
 IF (SELECT jsonb_agg(v ORDER BY v::text COLLATE "C") FROM jsonb_array_elements(p->'presentRollbackImageDigests') v) IS DISTINCT FROM required_images
  OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(required_images) v WHERE NOT(m->'cleanup'->'protectedResourceIds'?v)) THEN RETURN FALSE; END IF;
 FOR row IN SELECT v FROM jsonb_array_elements(r->'services') v LOOP
  SELECT v INTO d FROM jsonb_array_elements(t->'configuration'->'services') v WHERE v->>'name'=row->>'name';
  SELECT v INTO prior FROM jsonb_array_elements(r->'baselineServices') v WHERE v->>'name'=row->>'name';
  SELECT v INTO img FROM jsonb_array_elements(p->'images') v WHERE v->>'name'=row->>'name';
  IF d IS NULL OR row->>'role' IS DISTINCT FROM d->>'role' OR row->>'mountDigest' IS DISTINCT FROM d->>'mountDigest'
   OR COALESCE(row->>'containerId','')!~'^[a-f0-9]{64}$' OR COALESCE(row->>'imageDigest','')!~'^sha256:[a-f0-9]{64}$'
   OR jsonb_typeof(row->'createdAt') IS DISTINCT FROM 'string' OR row->>'createdAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$'
   OR NOT(row?&ARRAY['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'])
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(row) k WHERE k NOT IN ('name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt','commit','tree','deploymentId'))
   OR (row->>'createdAt')::timestamptz<(q->>'createdAt')::timestamptz OR (row->>'createdAt')::timestamptz>(q->>'finishedAt')::timestamptz
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(r->'baselineServices') v WHERE v->>'containerId'=row->>'containerId') THEN RETURN FALSE; END IF;
  IF d->>'source'='image' THEN
   IF prior IS NULL OR prior->>'role' IS DISTINCT FROM 'database' OR row->>'imageDigest' IS DISTINCT FROM d->>'imageDigest'
    OR row->>'imageDigest' IS DISTINCT FROM prior->>'imageDigest' OR row->>'mountDigest' IS DISTINCT FROM prior->>'mountDigest'
    OR row->>'state' IS DISTINCT FROM 'running' OR row->>'health' IS DISTINCT FROM 'healthy' OR row->'exitCode' IS DISTINCT FROM '0'::jsonb
    OR row?|ARRAY['commit','tree','deploymentId'] THEN RETURN FALSE; END IF;
  ELSE
   IF img IS NULL OR (SELECT count(*) FROM jsonb_object_keys(img))<>5 OR NOT(img?&ARRAY['name','imageDigest','commit','tree','deploymentId'])
    OR img->>'imageDigest' IS DISTINCT FROM row->>'imageDigest' OR img->>'commit' IS DISTINCT FROM s->>'commit'
    OR img->>'tree' IS DISTINCT FROM s->>'candidateTree' OR img->>'deploymentId' IS DISTINCT FROM r->>'deploymentId'
    OR row->>'commit' IS DISTINCT FROM s->>'commit' OR row->>'tree' IS DISTINCT FROM s->>'candidateTree'
    OR row->>'deploymentId' IS DISTINCT FROM r->>'deploymentId' OR row->'health' IS DISTINCT FROM 'null'::jsonb THEN RETURN FALSE; END IF;
   IF row->>'role'='migration' THEN
    IF row->>'state' IS DISTINCT FROM 'exited' OR jsonb_typeof(row->'exitCode') IS DISTINCT FROM 'number'
     OR (row->>'exitCode')::int NOT BETWEEN 1 AND 255 THEN RETURN FALSE; END IF;
   ELSIF row->>'state' IS DISTINCT FROM 'created' OR row->'exitCode' IS DISTINCT FROM '0'::jsonb THEN RETURN FALSE; END IF;
  END IF;
 END LOOP;
 SELECT jsonb_agg(jsonb_build_object('name',v->'name','role',v->'role','imageDigest',v->'imageDigest','mountDigest',v->'mountDigest')
  ||CASE WHEN v?'commit' THEN jsonb_build_object('commit',v->'commit') ELSE '{}'::jsonb END
  ||CASE WHEN v?'tree' THEN jsonb_build_object('tree',v->'tree') ELSE '{}'::jsonb END ORDER BY v->>'name' COLLATE "C") INTO rows FROM jsonb_array_elements(r->'services') v;
 RETURN e->>'currentServiceSetDigest' IS NOT DISTINCT FROM governed_release_compose_queue_digest(rows);
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE FUNCTION governed_release_compose_failed_partial_outcome_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;o governed_release_operations;
BEGIN
 IF NEW.evidence->'composeRecovery'->>'kind'='queue_failed_partial' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
  SELECT * INTO o FROM governed_release_operations WHERE id=NEW.operation_id;
  IF NOT(NEW.status='failed' AND NEW.observation_only=FALSE OR NEW.status='reconciled' AND NEW.reconciled_status='failed' AND NEW.observation_only=TRUE)
   OR governed_release_compose_failed_partial_valid(r.snapshot||jsonb_build_object('releaseId',r.id::text),NEW.evidence,to_jsonb(o)) IS DISTINCT FROM TRUE
   THEN RAISE EXCEPTION 'governed_release_compose_failed_partial_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_failed_partial_outcome_guard BEFORE INSERT ON governed_release_outcomes FOR EACH ROW EXECUTE FUNCTION governed_release_compose_failed_partial_outcome_guard();
COMMIT;
