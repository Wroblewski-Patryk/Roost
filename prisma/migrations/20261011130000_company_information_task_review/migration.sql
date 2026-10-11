BEGIN;

-- Preserve the application admission path. A company task may attest the two
-- role-review operations against the same selected, current source.
DO $patch$
DECLARE body TEXT;
BEGIN
 SELECT pg_get_functiondef('company_information_admission_scope(task_admission_scopes)'::regprocedure) INTO body;
 IF position('BETWEEN 1 AND 2' IN body)=0 OR position('operation NOT IN (''decision_supersede'',''runtime_execute'')' IN body)=0
  THEN RAISE EXCEPTION 'company_review_admission_scope_anchor_missing'; END IF;
 body:=replace(body,'BETWEEN 1 AND 2','BETWEEN 1 AND 4');
 body:=replace(body,'operation NOT IN (''decision_supersede'',''runtime_execute'')',
  'operation NOT IN (''decision_supersede'',''runtime_execute'',''review_decision'',''return_to_executor'')');
 EXECUTE body;

 SELECT pg_get_functiondef('company_information_admission_view(uuid,text)'::regprocedure) INTO body;
 IF position('op NOT IN (''decision_supersede'',''runtime_execute'')' IN body)=0
  THEN RAISE EXCEPTION 'company_review_admission_view_anchor_missing'; END IF;
 body:=replace(body,'op NOT IN (''decision_supersede'',''runtime_execute'')',
  'op NOT IN (''decision_supersede'',''runtime_execute'',''review_decision'',''return_to_executor'')');
 EXECUTE body;

 SELECT pg_get_functiondef('task_admission_insert_guard()'::regprocedure) INTO body;
 IF position('NEW.operation NOT IN (''decision_supersede'',''runtime_execute'')' IN body)=0
  THEN RAISE EXCEPTION 'company_review_admission_insert_anchor_missing'; END IF;
 body:=replace(body,'NEW.operation NOT IN (''decision_supersede'',''runtime_execute'')',
  'NEW.operation NOT IN (''decision_supersede'',''runtime_execute'',''review_decision'',''return_to_executor'')');
 EXECUTE body;
END $patch$;

CREATE FUNCTION company_information_native_proven(e agent_executions)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE admitted JSONB; native JSONB:=e.verification->'informationRuntime'; owned JSONB:=e.verification->'ownedTreeReceipt';
BEGIN
 IF e.application_id IS NOT NULL OR e.metadata->'executionContract'->>'executionClass' IS DISTINCT FROM 'roost-company-information-runtime-v1'
  OR e.status<>'completed' OR e.completed_at IS NULL OR e.context_invalidated_at IS NOT NULL
  OR e.changed_files IS DISTINCT FROM '[]'::jsonb THEN RETURN false; END IF;
 SELECT payload INTO admitted FROM agent_execution_events
  WHERE workspace_id=e.workspace_id AND execution_id=e.id AND type='information_admitted'
  ORDER BY created_at ASC,id ASC LIMIT 1;
 RETURN admitted IS NOT NULL AND native->>'schemaVersion'='roost-company-information-runtime-verification-v1'
  AND COALESCE(native->>'admissionDigest','') ~ '^[a-f0-9]{64}$'
  AND COALESCE(native->>'inputSeal','') ~ '^[a-f0-9]{64}$'
  AND native->>'admissionDigest'=admitted->>'admissionDigest'
  AND native->>'inputSeal'=admitted->>'inputSeal' AND native->>'executionId'=e.id::text
  AND native->'ownedJob'='true'::jsonb AND native->'reviewRequired'='true'::jsonb
  AND native->'externalWrites'='false'::jsonb AND native->'nativeTools'='[]'::jsonb
  AND owned->>'version'='roost-windows-job-v2'
  AND owned->>'attempt'=e.id::text AND owned->'cleanup'='true'::jsonb AND owned->'jobClosed'='true'::jsonb
  AND owned->'activeProcesses'='0'::jsonb AND owned->'rootExit'='0'::jsonb;
END $$;

-- The application branch is unchanged; information has an exact native
-- material seal instead of a fictitious Git commit.
CREATE OR REPLACE FUNCTION task_review_exact_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE e agent_executions; r JSONB;
BEGIN
 IF TG_OP <> 'INSERT' OR NEW.decision <> 'approve' THEN RETURN NEW; END IF;
 SELECT * INTO e FROM agent_executions WHERE id=NEW.execution_id AND workspace_id=NEW.workspace_id AND task_id=NEW.task_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'task_review_exact_commit_required'; END IF;
 IF e.application_id IS NULL AND e.metadata->'executionContract'->>'executionClass'='roost-company-information-runtime-v1' THEN
  IF NOT company_information_native_proven(e)
   OR NEW.evidence->>'reviewedInformationSeal' IS DISTINCT FROM encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex')
   OR jsonb_exists(NEW.evidence,'reviewedCommit') OR NEW.snapshot->'result' IS DISTINCT FROM task_review_material(e)
   THEN RAISE EXCEPTION 'information_result_seal_required'; END IF;
 ELSE
  r:=e.metadata->'resultRevision';
  IF e.metadata->>'resultRevisionReviewVersion' IS DISTINCT FROM '1'
   OR e.agent_host_id IS NULL OR e.status<>'completed' OR e.context_invalidated_at IS NOT NULL
   OR r->>'schemaVersion' IS DISTINCT FROM 'roost-result-revision-v1'
   OR COALESCE(r->>'commit','') !~ '^[a-f0-9]{40}$'
   OR r->>'branch' IS DISTINCT FROM e.metadata->'executionContract'->'singleTask'->>'branch'
   OR r->>'workingTree' IS DISTINCT FROM 'clean'
   OR r->>'executionId' IS DISTINCT FROM e.id::text
   OR r->>'attempt' IS DISTINCT FROM e.attempt::text
   OR r->>'hostId' IS DISTINCT FROM e.agent_host_id::text
   OR r->>'checkpointVersion' IS DISTINCT FROM e.checkpoint_version::text
   OR NEW.evidence->>'reviewedCommit' IS DISTINCT FROM r->>'commit'
   OR NEW.snapshot->'result'->'resultRevision' IS DISTINCT FROM r
   OR NEW.snapshot->'result'->>'checkpointVersion' IS DISTINCT FROM e.checkpoint_version::text
   THEN RAISE EXCEPTION 'task_review_exact_commit_required'; END IF;
 END IF;
 IF jsonb_typeof(NEW.evidence->'evidence') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'task_review_test_evidence_required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.evidence->'evidence') item
  WHERE item->>'kind'='test' AND item->>'verdict'='pass'
  AND length(COALESCE(item->>'reference',''))>=3 AND length(COALESCE(item->>'result',''))>=3)
  THEN RAISE EXCEPTION 'task_review_test_evidence_required'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION company_information_review_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE e agent_executions; t tasks; op TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
 SELECT * INTO e FROM agent_executions WHERE workspace_id=NEW.workspace_id AND task_id=NEW.task_id
  ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF e.id IS NULL OR e.application_id IS NOT NULL OR e.metadata->'executionContract'->>'executionClass' IS DISTINCT FROM 'roost-company-information-runtime-v1'
  THEN RETURN NEW; END IF;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 op:=CASE WHEN TG_TABLE_NAME='task_review_decisions' THEN 'review_decision' ELSE 'return_to_executor' END;
 IF NOT company_information_native_proven(e) OR task_admission_view(t.id,op)->>'status' IS DISTINCT FROM 'admitted'
  OR t.execution_readiness->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId'
  OR t.execution_readiness->>'revision' IS DISTINCT FROM e.metadata->'readyContextPin'->>'revision'
  OR t.execution_role_provenance IS DISTINCT FROM t.execution_readiness->'roleProvenance'
  THEN RAISE EXCEPTION 'company_information_review_not_current'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
  IF t.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'company_information_review_not_current'; END IF;
 ELSE
  IF NEW.action IS DISTINCT FROM 'return_to_executor' OR t.execution_readiness->>'status' IS DISTINCT FROM 'needs_revalidation'
   OR t.execution_readiness->>'reason' IS DISTINCT FROM 'review_rejected'
   THEN RAISE EXCEPTION 'company_information_review_not_current'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER company_information_review_operation_guard BEFORE INSERT ON task_review_decisions
 FOR EACH ROW EXECUTE FUNCTION company_information_review_operation_guard();
CREATE TRIGGER company_information_review_operation_guard BEFORE INSERT ON task_review_actions
 FOR EACH ROW EXECUTE FUNCTION company_information_review_operation_guard();

COMMIT;
