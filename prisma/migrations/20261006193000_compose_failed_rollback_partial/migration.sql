BEGIN;
-- A failed sole retry can retire a release honestly. It is never a recovered
-- baseline and grants no second queue, configuration mutation or source claim.
CREATE FUNCTION governed_release_compose_failed_rollback_partial_valid(s JSONB,e JSONB,op JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r JSONB:=e->'composeRecovery';p JSONB:=r->'partialRollbackFailure';q JSONB:=r->'queue';
 ae JSONB:=p->'absenceEvidence';ao JSONB:=p->'absenceOperation';projected JSONB;profile JSONB;
BEGIN
 IF jsonb_typeof(e) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(e))<>9
  OR NOT(e?&ARRAY['composeRecovery','deploymentIds','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','currentServiceSetDigest'])
  OR jsonb_typeof(r) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(r))<>19
  OR NOT(r?&ARRAY['schemaVersion','kind','releaseId','operationId','since','targetId','phase','requestedCommit','requestedTree','deploymentId','queue','configuration','baselineCommit','baselineTree','migrationSchemaVerified','controlPlaneQuiescent','baselineServices','services','partialRollbackFailure'])
  OR r->>'kind' IS DISTINCT FROM 'queue_failed_rollback_partial'
  OR jsonb_typeof(p) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p))<>16
  OR NOT(p?&ARRAY['schemaVersion','candidateOperation','candidateEvidence','candidateEvidenceDigest','images','databaseReadOnly','activeOtherSessions','ownedTransactions','projectServiceSetComplete','protectedRollbackImages','presentRollbackImageDigests','publicHealth','retryOrdinal','absenceOperation','absenceEvidence','absenceEvidenceDigest'])
  OR p->>'schemaVersion' IS DISTINCT FROM 'roost-compose-failed-rollback-partial-v1'
  OR jsonb_typeof(ao) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(ao))<>4
  OR NOT(ao?&ARRAY['id','operation','createdAt','intent']) OR ao->>'operation' IS DISTINCT FROM 'rollback'
  OR ao->>'id' IS NOT DISTINCT FROM op->>'id'
  OR p->>'absenceEvidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(ae)
  OR governed_release_compose_partial_rollback_absence_valid(s,ae,ao) IS DISTINCT FROM TRUE
  OR p->'candidateOperation' IS DISTINCT FROM ae->'composeRecovery'->'partialRollbackAbsence'->'candidateOperation'
  OR p->'candidateEvidenceDigest' IS DISTINCT FROM ae->'composeRecovery'->'partialRollbackAbsence'->'candidateEvidenceDigest'
  OR jsonb_typeof(q) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(q))<>6
  OR NOT(q?&ARRAY['targetId','deploymentId','commit','status','createdAt','finishedAt'])
  OR q->'targetId' IS DISTINCT FROM r->'targetId' OR q->'deploymentId' IS DISTINCT FROM r->'deploymentId'
  OR q->'commit' IS DISTINCT FROM s->'manifest'->'rollback'->'commit' OR q->>'status' IS DISTINCT FROM 'failed'
  OR jsonb_typeof(q->'createdAt') IS DISTINCT FROM 'string' OR jsonb_typeof(q->'finishedAt') IS DISTINCT FROM 'string'
  OR q->>'createdAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$'
  OR q->>'finishedAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$'
  OR (q->>'createdAt')::timestamptz<(r->>'since')::timestamptz
  OR (q->>'finishedAt')::timestamptz<(q->>'createdAt')::timestamptz
  OR (e->>'observedAt')::timestamptz<(q->>'finishedAt')::timestamptz
  OR (ae->>'observedAt')::timestamptz>(r->>'since')::timestamptz
  OR e->'deploymentIds' IS DISTINCT FROM jsonb_build_array(jsonb_build_object('targetId',r->'targetId','deploymentId',r->'deploymentId')) THEN RETURN FALSE; END IF;
 profile:=(p-ARRAY['absenceOperation','absenceEvidence','absenceEvidenceDigest'])||jsonb_build_object('schemaVersion','roost-compose-partial-rollback-absence-v1');
 projected:=(e-'composeRecovery')||jsonb_build_object('composeRecovery',(r-'partialRollbackFailure')||jsonb_build_object('kind','queue_absent_partial','queue','null'::jsonb,'partialRollbackAbsence',profile),'deploymentIds','[]'::jsonb,'absenceVerified',TRUE);
 RETURN governed_release_compose_partial_rollback_absence_valid(s,projected,op);
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

CREATE FUNCTION governed_release_compose_failed_rollback_partial_journal_valid(r governed_releases,o governed_release_operations,e JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE p JSONB:=e->'composeRecovery'->'partialRollbackFailure';a governed_release_operations;ax governed_release_outcomes;ox governed_release_outcomes;
BEGIN
 IF governed_release_compose_failed_rollback_partial_valid(r.snapshot||jsonb_build_object('releaseId',r.id::text),e,to_jsonb(o)) IS DISTINCT FROM TRUE THEN RETURN FALSE; END IF;
 SELECT * INTO a FROM governed_release_operations WHERE id=(p->'absenceOperation'->>'id')::uuid AND release_id=r.id AND workspace_id=r.workspace_id AND application_id=r.application_id;
 SELECT * INTO ax FROM governed_release_outcomes WHERE operation_id=a.id ORDER BY sequence DESC LIMIT 1;
 SELECT * INTO ox FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1;
 IF a.id IS NULL OR ax.id IS NULL OR ox.id IS NULL OR o.release_id<>r.id OR o.workspace_id<>r.workspace_id OR o.application_id<>r.application_id
  OR o.sequence<>a.sequence+1 OR o.operation<>'rollback' OR a.operation<>'rollback' OR o.intent->'parameters' IS DISTINCT FROM a.intent->'parameters'
  OR ax.status IS DISTINCT FROM 'reconciled' OR ax.reconciled_status IS DISTINCT FROM 'absent' OR NOT ax.observation_only
  OR ax.evidence IS DISTINCT FROM p->'absenceEvidence' OR governed_release_compose_partial_rollback_absence_journal_valid(r,a,ax.evidence) IS DISTINCT FROM TRUE
  OR a.created_at IS DISTINCT FROM (p->'absenceOperation'->>'createdAt')::timestamptz
  OR jsonb_build_object('id',a.id::text,'operation',a.operation,'createdAt',p->'absenceOperation'->'createdAt','intent',a.intent) IS DISTINCT FROM p->'absenceOperation'
  OR NOT(ox.status='uncertain' OR ox.status='reconciled' AND ox.reconciled_status='failed' AND ox.observation_only AND ox.evidence=e)
  OR EXISTS(SELECT 1 FROM governed_release_operations WHERE release_id=r.id AND sequence>o.sequence) THEN RETURN FALSE; END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

CREATE FUNCTION governed_release_compose_failed_rollback_partial_outcome_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;o governed_release_operations;
BEGIN
 IF NEW.evidence->'composeRecovery'->>'kind'='queue_failed_rollback_partial' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;SELECT * INTO o FROM governed_release_operations WHERE id=NEW.operation_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
  IF NEW.status IS DISTINCT FROM 'reconciled' OR NEW.reconciled_status IS DISTINCT FROM 'failed' OR NOT NEW.observation_only
   OR governed_release_compose_failed_rollback_partial_journal_valid(r,o,NEW.evidence) IS DISTINCT FROM TRUE THEN
   RAISE EXCEPTION 'governed_release_compose_failed_rollback_partial_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_failed_rollback_partial_outcome_guard BEFORE INSERT ON governed_release_outcomes
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_failed_rollback_partial_outcome_guard();

CREATE FUNCTION governed_release_compose_failed_rollback_partial_terminal_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
 IF EXISTS(SELECT 1 FROM governed_release_operations o JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)x ON TRUE
  WHERE o.release_id=NEW.release_id AND x.evidence->'composeRecovery'->>'kind'='queue_failed_rollback_partial') THEN
  RAISE EXCEPTION 'governed_release_compose_failed_rollback_partial_terminal'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_failed_rollback_partial_terminal_guard BEFORE INSERT ON governed_release_operations
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_failed_rollback_partial_terminal_guard();

CREATE FUNCTION governed_release_compose_partial_retry_stable_evidence(e JSONB)
 RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT (e-ARRAY['observedAt','healthDigest']) #- ARRAY['composeRecovery','partialRollbackFailure','publicHealth','healthDigest'];
$$;
CREATE FUNCTION governed_release_compose_failed_rollback_partial_closure_valid(r governed_releases,receipt JSONB,fresh BOOLEAN DEFAULT TRUE)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE a JSONB:=receipt->'absenceRevalidation';n JSONB:=receipt->'nativeClosure';e JSONB:=receipt->'evidence';ce JSONB:=a->'currentEvidence';o governed_release_operations;x governed_release_outcomes;
BEGIN
 SELECT * INTO o FROM governed_release_operations WHERE id=(receipt->>'failedOperationId')::uuid AND release_id=r.id;
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1;
 IF o.id IS NULL OR x.id IS NULL OR x.status IS DISTINCT FROM 'reconciled' OR x.reconciled_status IS DISTINCT FROM 'failed' OR NOT x.observation_only
  OR x.evidence IS DISTINCT FROM e OR governed_release_compose_failed_rollback_partial_journal_valid(r,o,e) IS DISTINCT FROM TRUE
  OR jsonb_typeof(a) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(a))<>7
  OR NOT(a?&ARRAY['schemaVersion','releaseId','failedOutcomeId','failedEvidenceDigest','currentEvidence','nativeClosureDigest','observedAt'])
  OR a->>'schemaVersion' IS DISTINCT FROM 'roost-compose-failed-rollback-partial-closure-revalidation-v1'
  OR a->>'releaseId' IS DISTINCT FROM r.id::text OR a->>'failedOutcomeId' IS DISTINCT FROM x.id::text
  OR a->>'failedEvidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(e)
  OR a->>'nativeClosureDigest' IS DISTINCT FROM governed_release_compose_queue_digest(n)
  OR a->'observedAt' IS DISTINCT FROM ce->'observedAt'
  OR governed_release_compose_partial_retry_stable_evidence(ce) IS DISTINCT FROM governed_release_compose_partial_retry_stable_evidence(e)
  OR governed_release_compose_failed_rollback_partial_valid(r.snapshot||jsonb_build_object('releaseId',r.id::text),ce,to_jsonb(o)) IS DISTINCT FROM TRUE
  OR governed_release_compose_owner_native_closure(r,o.id,ce,n) IS DISTINCT FROM TRUE
  OR fresh AND ((ce->>'observedAt')::timestamptz>now()+interval '1 minute' OR (ce->>'observedAt')::timestamptz<now()-interval '5 minutes'
   OR (n->>'observedAt')::timestamptz>now()+interval '1 minute' OR (n->>'observedAt')::timestamptz<now()-interval '5 minutes') THEN RETURN FALSE; END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

ALTER FUNCTION governed_release_failed_baseline_proven(UUID,UUID,JSONB) RENAME TO governed_release_failed_baseline_pre_partial_retry_v1;
CREATE FUNCTION governed_release_failed_baseline_proven(target_release UUID,failed_operation UUID,e JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;o governed_release_operations;
BEGIN
 IF e->'composeRecovery'->>'kind'='queue_failed_rollback_partial' THEN
  SELECT * INTO r FROM governed_releases WHERE id=target_release;SELECT * INTO o FROM governed_release_operations WHERE id=failed_operation AND release_id=r.id;
  RETURN governed_release_compose_failed_rollback_partial_journal_valid(r,o,e);
 END IF;RETURN governed_release_failed_baseline_pre_partial_retry_v1(target_release,failed_operation,e);
END $$;
ALTER FUNCTION governed_release_compose_absence_revalidation_valid(governed_releases,JSONB) RENAME TO governed_release_compose_revalidation_pre_partial_retry_v1;
CREATE FUNCTION governed_release_compose_absence_revalidation_valid(r governed_releases,receipt JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF receipt->'evidence'->'composeRecovery'->>'kind'='queue_failed_rollback_partial' THEN
  RETURN governed_release_compose_failed_rollback_partial_closure_valid(r,receipt,TRUE);
 END IF;RETURN governed_release_compose_revalidation_pre_partial_retry_v1(r,receipt);
END $$;
CREATE FUNCTION governed_release_compose_failed_rollback_partial_closure_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;
BEGIN
 IF NEW.snapshot->'evidence'->'composeRecovery'->>'kind'='queue_failed_rollback_partial' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
  IF governed_release_compose_failed_rollback_partial_closure_valid(r,NEW.snapshot,TRUE) IS DISTINCT FROM TRUE THEN
   RAISE EXCEPTION 'governed_release_compose_failed_rollback_partial_closure_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_failed_rollback_partial_closure_guard BEFORE INSERT ON governed_release_failed_closures
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_failed_rollback_partial_closure_guard();
COMMIT;
