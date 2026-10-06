BEGIN;
-- An absent rollback queue while the exact failed candidate remains is not a
-- healthy baseline or completed rollback. Preserve both immutable histories.
CREATE FUNCTION governed_release_compose_partial_rollback_absence_valid(s JSONB,e JSONB,op JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;r JSONB:=e->'composeRecovery';
 p JSONB:=r->'partialRollbackAbsence';ce JSONB:=p->'candidateEvidence';co JSONB:=p->'candidateOperation';
 c JSONB:=ce->'composeRecovery';intent JSONB:=op->'intent';
BEGIN
 IF jsonb_typeof(e) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(e))<>10
  OR NOT(e?&ARRAY['composeRecovery','deploymentIds','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','currentServiceSetDigest','absenceVerified'])
  OR jsonb_typeof(r) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(r))<>19
  OR NOT(r?&ARRAY['schemaVersion','kind','releaseId','operationId','since','targetId','phase','requestedCommit','requestedTree','deploymentId','queue',
   'configuration','baselineCommit','baselineTree','migrationSchemaVerified','controlPlaneQuiescent','baselineServices','services','partialRollbackAbsence'])
  OR r->>'schemaVersion' IS DISTINCT FROM 'roost-compose-recovery-observation-v1' OR r->>'kind' IS DISTINCT FROM 'queue_absent_partial'
  OR r->>'phase' IS DISTINCT FROM 'rollback' OR r->'queue' IS DISTINCT FROM 'null'::jsonb OR op->>'operation' IS DISTINCT FROM 'rollback'
  OR r->>'releaseId' IS DISTINCT FROM s->>'releaseId' OR r->>'operationId' IS DISTINCT FROM op->>'id'
  OR r->>'targetId' IS DISTINCT FROM t->>'targetId' OR r->>'requestedCommit' IS DISTINCT FROM m->'rollback'->>'commit'
  OR r->>'requestedTree' IS DISTINCT FROM s->>'baseTree' OR r->>'baselineCommit' IS DISTINCT FROM s->>'baseCommit'
  OR r->>'baselineTree' IS DISTINCT FROM s->>'baseTree'
  OR r->>'deploymentId' IS DISTINCT FROM 'r'||left(governed_release_compose_queue_digest(jsonb_build_array(s->'releaseId',op->'id',t->'targetId','rollback')),23)
  OR r->'configuration' IS DISTINCT FROM t->'rollbackConfiguration'
  OR governed_release_compose_queue_config_digest(r->'configuration') IS DISTINCT FROM t->>'rollbackConfigDigest'
  OR r->'controlPlaneQuiescent' IS DISTINCT FROM 'true'::jsonb OR r->'migrationSchemaVerified' IS DISTINCT FROM 'true'::jsonb
  OR e->'deploymentIds' IS DISTINCT FROM '[]'::jsonb OR e->'absenceVerified' IS DISTINCT FROM 'true'::jsonb OR e->'healthy' IS DISTINCT FROM 'false'::jsonb
  OR e->>'configDigest' IS DISTINCT FROM m->'rollback'->>'configDigest' OR e->>'schemaDigest' IS DISTINCT FROM m->'baseline'->>'schemaDigest'
  OR e->>'dataDigest' IS DISTINCT FROM m->'baseline'->>'dataDigest' OR COALESCE(e->>'healthDigest','')!~'^[a-f0-9]{64}$'
  OR e->>'healthDigest' IS NOT DISTINCT FROM m->'baseline'->>'healthDigest'
  OR jsonb_typeof(intent) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(intent))<>8
  OR NOT(intent?&ARRAY['requestId','operation','manifestDigest','commit','baseCommit','expectedVersion','observed','parameters'])
  OR COALESCE(intent->>'requestId','')!~'^[a-f0-9-]{36}$' OR COALESCE(op->>'id','')!~'^[a-f0-9-]{36}$'
  OR COALESCE(intent->>'expectedVersion','')!~'^[a-f0-9]{64}$' OR intent->>'operation' IS DISTINCT FROM 'rollback'
  OR intent->>'manifestDigest' IS DISTINCT FROM s->>'manifestDigest' OR intent->>'commit' IS DISTINCT FROM s->>'commit'
  OR intent->>'baseCommit' IS DISTINCT FROM s->>'baseCommit'
  OR intent->'observed' IS DISTINCT FROM jsonb_build_object('commit',s->'commit','baseCommit',s->'commit','baseTree',s->'candidateTree','manifestDigest',s->'manifestDigest')
  OR intent->'parameters' IS DISTINCT FROM jsonb_build_object('targetId',t->'targetId','commit',m->'rollback'->'commit',
   'artifactSetDigest',m->'rollback'->'artifactSetDigest','configDigest',m->'rollback'->'configDigest','schemaDigest',m->'rollback'->'schemaDigest')
  OR jsonb_typeof(p) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p))<>13
  OR NOT(p?&ARRAY['schemaVersion','candidateOperation','candidateEvidence','candidateEvidenceDigest','images','databaseReadOnly','activeOtherSessions',
   'ownedTransactions','projectServiceSetComplete','protectedRollbackImages','presentRollbackImageDigests','publicHealth','retryOrdinal'])
  OR p->>'schemaVersion' IS DISTINCT FROM 'roost-compose-partial-rollback-absence-v1'
  OR p->'retryOrdinal' IS DISTINCT FROM '1'::jsonb OR p->'databaseReadOnly' IS DISTINCT FROM 'true'::jsonb
  OR p->'activeOtherSessions' IS DISTINCT FROM '0'::jsonb OR p->'ownedTransactions' IS DISTINCT FROM '0'::jsonb
  OR p->'projectServiceSetComplete' IS DISTINCT FROM 'true'::jsonb
  OR p->'publicHealth' IS DISTINCT FROM jsonb_build_object('healthy',FALSE,'healthDigest',e->'healthDigest')
  OR p->>'candidateEvidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(ce)
  OR c->'partial'->>'schemaVersion' IS DISTINCT FROM 'roost-compose-failed-partial-runtime-v2'
  OR jsonb_typeof(co) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(co))<>4
  OR NOT(co?&ARRAY['id','operation','createdAt','intent']) OR co->>'operation' IS DISTINCT FROM 'deploy' OR co->>'id' IS NOT DISTINCT FROM op->>'id'
  OR governed_release_compose_failed_partial_valid(s,ce,co) IS DISTINCT FROM TRUE
  OR jsonb_typeof(e->'observedAt') IS DISTINCT FROM 'string' OR e->>'observedAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$'
  OR jsonb_typeof(r->'since') IS DISTINCT FROM 'string' OR r->>'since' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$'
  OR (r->>'since')::timestamptz IS DISTINCT FROM COALESCE(op->>'createdAt',op->>'created_at')::timestamptz
  OR (e->>'observedAt')::timestamptz<(r->>'since')::timestamptz OR (ce->>'observedAt')::timestamptz>(r->>'since')::timestamptz
  OR e->>'currentServiceSetDigest' IS DISTINCT FROM ce->>'currentServiceSetDigest' THEN RETURN FALSE; END IF;
 IF (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(r->'services') v) IS DISTINCT FROM
    (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(c->'services') v)
  OR (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(r->'baselineServices') v) IS DISTINCT FROM
    (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(c->'baselineServices') v)
  OR (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(p->'images') v) IS DISTINCT FROM
    (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(c->'partial'->'images') v)
  OR (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(p->'protectedRollbackImages') v) IS DISTINCT FROM
    (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(c->'partial'->'protectedRollbackImages') v)
  OR (SELECT jsonb_agg(v ORDER BY v::text COLLATE "C") FROM jsonb_array_elements(p->'presentRollbackImageDigests') v) IS DISTINCT FROM
    (SELECT jsonb_agg(v ORDER BY v::text COLLATE "C") FROM jsonb_array_elements(c->'partial'->'presentRollbackImageDigests') v)
  THEN RETURN FALSE; END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

CREATE FUNCTION governed_release_compose_partial_rollback_absence_journal_valid(r governed_releases,o governed_release_operations,e JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE p JSONB:=e->'composeRecovery'->'partialRollbackAbsence';c governed_release_operations;cfg governed_release_operations;
 co governed_release_outcomes;cx governed_release_outcomes;ox governed_release_outcomes;
BEGIN
 IF governed_release_compose_partial_rollback_absence_valid(r.snapshot||jsonb_build_object('releaseId',r.id::text),e,to_jsonb(o)) IS DISTINCT FROM TRUE THEN RETURN FALSE; END IF;
 SELECT * INTO c FROM governed_release_operations WHERE id=(p->'candidateOperation'->>'id')::uuid AND release_id=r.id AND workspace_id=r.workspace_id AND application_id=r.application_id;
 SELECT * INTO co FROM governed_release_outcomes WHERE operation_id=c.id ORDER BY sequence DESC LIMIT 1;
 SELECT * INTO cfg FROM governed_release_operations WHERE release_id=r.id AND sequence=c.sequence+1;
 SELECT * INTO cx FROM governed_release_outcomes WHERE operation_id=cfg.id ORDER BY sequence DESC LIMIT 1;
 SELECT * INTO ox FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1;
 IF c.id IS NULL OR cfg.id IS NULL OR o.release_id<>r.id OR o.workspace_id<>r.workspace_id OR o.application_id<>r.application_id
  OR o.sequence<>c.sequence+2 OR c.operation<>'deploy' OR cfg.operation<>'rollback_config'
  OR NOT(co.status='failed' OR co.status='reconciled' AND co.reconciled_status='failed' AND co.observation_only)
  OR co.id IS NULL OR co.evidence IS DISTINCT FROM p->'candidateEvidence'
  OR jsonb_build_object('id',c.id::text,'operation',c.operation,'createdAt',p->'candidateOperation'->'createdAt','intent',c.intent) IS DISTINCT FROM p->'candidateOperation'
  OR c.created_at IS DISTINCT FROM (p->'candidateOperation'->>'createdAt')::timestamptz
  OR cx.id IS NULL OR NOT(cx.status='succeeded' OR cx.status='reconciled' AND cx.reconciled_status='succeeded')
  OR cfg.intent->'parameters' IS DISTINCT FROM jsonb_build_object('commit',r.snapshot->'manifest'->'rollback'->'commit',
   'artifactSetDigest',r.snapshot->'manifest'->'rollback'->'artifactSetDigest','configDigest',r.snapshot->'manifest'->'rollback'->'configDigest','schemaDigest',r.snapshot->'manifest'->'rollback'->'schemaDigest')
  OR cx.evidence->'deployedCommit' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->'commit'
  OR cx.evidence->'artifactSetDigest' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->'artifactSetDigest'
  OR cx.evidence->'configDigest' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->'configDigest'
  OR cx.evidence->'schemaDigest' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->'schemaDigest'
  OR jsonb_typeof(cx.evidence->'observedAt') IS DISTINCT FROM 'string'
  OR cx.evidence->>'observedAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$'
  OR cfg.created_at<(co.evidence->>'observedAt')::timestamptz OR (cx.evidence->>'observedAt')::timestamptz>o.created_at
  OR ox.id IS NULL OR NOT(ox.status='uncertain' OR ox.status='reconciled' AND ox.reconciled_status='absent' AND ox.observation_only AND ox.evidence=e)
  OR EXISTS(SELECT 1 FROM governed_release_operations a JOIN LATERAL(SELECT evidence FROM governed_release_outcomes WHERE operation_id=a.id ORDER BY sequence DESC LIMIT 1)x ON TRUE
    WHERE a.release_id=r.id AND a.sequence<o.sequence AND x.evidence->'composeRecovery'->>'kind'='queue_absent_partial') THEN RETURN FALSE; END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

CREATE FUNCTION governed_release_compose_partial_rollback_absence_outcome_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;o governed_release_operations;
BEGIN
 IF NEW.evidence->'composeRecovery'->>'kind'='queue_absent_partial' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;SELECT * INTO o FROM governed_release_operations WHERE id=NEW.operation_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
  IF NEW.status IS DISTINCT FROM 'reconciled' OR NEW.reconciled_status IS DISTINCT FROM 'absent' OR NOT NEW.observation_only
   OR governed_release_compose_partial_rollback_absence_journal_valid(r,o,NEW.evidence) IS DISTINCT FROM TRUE THEN
   RAISE EXCEPTION 'governed_release_compose_partial_rollback_absence_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_partial_rollback_absence_outcome_guard BEFORE INSERT ON governed_release_outcomes
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_partial_rollback_absence_outcome_guard();

CREATE FUNCTION governed_release_compose_partial_rollback_retry_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;a governed_release_operations;x governed_release_outcomes;retry governed_release_operations;n INTEGER;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT count(*) INTO n FROM governed_release_operations o JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)z ON TRUE
  WHERE o.release_id=r.id AND z.status='reconciled' AND z.reconciled_status='absent' AND z.evidence->'composeRecovery'->>'kind'='queue_absent_partial';
 IF n=0 THEN RETURN NEW; END IF;
 IF n<>1 THEN RAISE EXCEPTION 'governed_release_compose_partial_rollback_retry_exhausted'; END IF;
 SELECT o.* INTO a FROM governed_release_operations o JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)z ON TRUE
  WHERE o.release_id=r.id AND z.status='reconciled' AND z.reconciled_status='absent' AND z.evidence->'composeRecovery'->>'kind'='queue_absent_partial';
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=a.id ORDER BY sequence DESC LIMIT 1;
 IF governed_release_compose_partial_rollback_absence_journal_valid(r,a,x.evidence) IS DISTINCT FROM TRUE THEN
  RAISE EXCEPTION 'governed_release_compose_partial_rollback_absence_lineage_unproven'; END IF;
 SELECT count(*) INTO n FROM governed_release_operations WHERE release_id=r.id AND sequence>a.sequence;
 IF n=0 THEN
  IF NEW.operation<>'rollback' OR NEW.intent->'parameters' IS DISTINCT FROM a.intent->'parameters' OR NEW.id=a.id THEN
   RAISE EXCEPTION 'governed_release_compose_partial_rollback_retry_required'; END IF;
 ELSE
  SELECT * INTO retry FROM governed_release_operations WHERE release_id=r.id AND sequence=a.sequence+1;
  IF retry.operation IS DISTINCT FROM 'rollback' OR retry.intent->'parameters' IS DISTINCT FROM a.intent->'parameters'
   OR EXISTS(SELECT 1 FROM governed_release_operations WHERE release_id=r.id AND sequence>retry.sequence
    AND operation NOT IN ('observe','fixture_cleanup','runtime_resume','cleanup','cleanup_resource'))
   OR NEW.operation NOT IN ('observe','fixture_cleanup','runtime_resume','cleanup','cleanup_resource') THEN
   RAISE EXCEPTION 'governed_release_compose_partial_rollback_retry_exhausted'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_partial_rollback_retry_guard BEFORE INSERT ON governed_release_operations
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_partial_rollback_retry_guard();

CREATE FUNCTION governed_release_compose_partial_rollback_absence_closure_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.snapshot->'evidence'->'composeRecovery'->>'kind'='queue_absent_partial' THEN
  RAISE EXCEPTION 'governed_release_compose_partial_rollback_absence_not_completed_recovery';
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_partial_rollback_absence_closure_guard BEFORE INSERT ON governed_release_failed_closures
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_partial_rollback_absence_closure_guard();
COMMIT;
