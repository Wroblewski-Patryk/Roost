BEGIN;

-- A takeover baseline is accepted product context, never a runtime, write or
-- release grant. Keep the existing Decision history, impact and risk gates.
CREATE FUNCTION application_takeover_baseline_valid(w UUID,b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE a applications;repo TEXT;primary_count INT;repository_count INT;
 audit agent_executions;verify agent_executions;e agent_executions;c JSONB;r JSONB;v JSONB;m JSONB;
 item JSONB;field TEXT;ids UUID[]:='{}';kind TEXT;expected_digest TEXT;worker UUID;
BEGIN
 IF jsonb_typeof(b) IS DISTINCT FROM 'object' OR NOT b ?& ARRAY[
  'schemaVersion','applicationId','auditTaskId','canonicalRepository','baselineCommit','auditorExecutionId','verifierExecutionId',
  'auditorEvidenceDigest','verifierEvidenceDigest','stage','scopeDescription','intendedUser','primaryProblem','coreOutcome','assumptions','limitations','productReady','saleReady']
  OR b-ARRAY['schemaVersion','applicationId','auditTaskId','canonicalRepository','baselineCommit','auditorExecutionId','verifierExecutionId',
  'auditorEvidenceDigest','verifierEvidenceDigest','stage','scopeDescription','intendedUser','primaryProblem','coreOutcome','assumptions','limitations','productReady','saleReady']<>'{}'::jsonb
  OR b->>'schemaVersion' IS DISTINCT FROM 'roost-application-takeover-v1'
  OR b->'productReady' IS DISTINCT FROM 'false'::jsonb OR b->'saleReady' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_typeof(b->'stage') IS DISTINCT FROM 'string' OR b->>'stage' NOT IN
   ('problem_definition','accepted_requirements','solution_design','implementation','verification','operation_improvement') THEN RETURN false;END IF;
 FOREACH field IN ARRAY ARRAY['applicationId','auditTaskId','auditorExecutionId','verifierExecutionId'] LOOP
  IF jsonb_typeof(b->field) IS DISTINCT FROM 'string' OR COALESCE(b->>field,'') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' THEN RETURN false;END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['auditorEvidenceDigest','verifierEvidenceDigest'] LOOP
  IF jsonb_typeof(b->field) IS DISTINCT FROM 'string' OR COALESCE(b->>field,'') !~ '^[a-f0-9]{64}$' THEN RETURN false;END IF;
 END LOOP;
 IF jsonb_typeof(b->'baselineCommit') IS DISTINCT FROM 'string' OR COALESCE(b->>'baselineCommit','') !~ '^[a-f0-9]{40}$'
  OR b->>'auditorExecutionId'=b->>'verifierExecutionId'
  OR jsonb_typeof(b->'canonicalRepository') IS DISTINCT FROM 'string' OR length(b->>'canonicalRepository')>500
  OR COALESCE(b->>'canonicalRepository','') !~ '^https://([[:alnum:]][[:alnum:].-]*|\[[0-9a-fA-F:]+\])(:[0-9]{1,5})?/[^?#[:space:]]+$'
  OR COALESCE(substring(b->>'canonicalRepository' from ':([0-9]{1,5})/')::INT,443)>65535 THEN RETURN false;END IF;
 FOREACH field IN ARRAY ARRAY['scopeDescription','intendedUser','primaryProblem','coreOutcome'] LOOP
  IF jsonb_typeof(b->field) IS DISTINCT FROM 'string' OR length(trim(b->>field)) NOT BETWEEN 1 AND 2000 THEN RETURN false;END IF;
 END LOOP;
 IF jsonb_typeof(b->'assumptions') IS DISTINCT FROM 'array' OR jsonb_array_length(b->'assumptions')>30
  OR jsonb_typeof(b->'limitations') IS DISTINCT FROM 'array' OR jsonb_array_length(b->'limitations')>20 THEN RETURN false;END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(b->'limitations') LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' OR length(trim(item#>>'{}')) NOT BETWEEN 1 AND 2000 THEN RETURN false;END IF;
 END LOOP;
 SELECT * INTO a FROM applications WHERE id=(b->>'applicationId')::UUID AND workspace_id=w;
 IF a.id IS NULL THEN RETURN false;END IF;
 SELECT count(*),count(*) FILTER(WHERE is_primary) INTO repository_count,primary_count FROM application_repositories WHERE application_id=a.id;
 IF primary_count<>1 AND NOT(primary_count=0 AND repository_count=1) THEN RETURN false;END IF;
 SELECT url INTO repo FROM application_repositories WHERE application_id=a.id AND (is_primary OR repository_count=1) LIMIT 1;
 IF repo IS DISTINCT FROM b->>'canonicalRepository' THEN RETURN false;END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(b->'assumptions') LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT item ?& ARRAY['recordId','revision','decisionStatus','implementationState']
   OR item-ARRAY['recordId','revision','decisionStatus','implementationState']<>'{}'::jsonb
   OR jsonb_typeof(item->'recordId') IS DISTINCT FROM 'string' OR COALESCE(item->>'recordId','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
   OR jsonb_typeof(item->'revision') IS DISTINCT FROM 'string' OR COALESCE(item->>'revision','') !~ '^[a-f0-9]{64}$'
   OR jsonb_typeof(item->'decisionStatus') IS DISTINCT FROM 'string' OR item->>'decisionStatus' NOT IN ('proposed','accepted','deferred','rejected','superseded')
   OR jsonb_typeof(item->'implementationState') IS DISTINCT FROM 'string' OR item->>'implementationState' NOT IN ('not_implemented','implemented_correctly','implemented_incorrectly','unverified') THEN RETURN false;END IF;
  IF (item->>'recordId')::UUID=ANY(ids) OR NOT EXISTS(SELECT 1 FROM company_records cr WHERE cr.id=(item->>'recordId')::UUID
   AND cr.workspace_id=w AND cr.application_id=a.id AND cr.status<>'archived'
   AND task_interview_record(cr.id)->>'revision'=item->>'revision') THEN RETURN false;END IF;
  ids:=array_append(ids,(item->>'recordId')::UUID);
 END LOOP;
 SELECT * INTO audit FROM agent_executions WHERE id=(b->>'auditorExecutionId')::UUID AND workspace_id=w AND application_id=a.id;
 SELECT * INTO verify FROM agent_executions WHERE id=(b->>'verifierExecutionId')::UUID AND workspace_id=w AND application_id=a.id;
 IF audit.id IS NULL OR verify.id IS NULL OR audit.task_id::TEXT IS DISTINCT FROM b->>'auditTaskId' OR audit.task_id=verify.task_id
  OR audit.agent_host_id IS NULL OR audit.agent_host_id IS DISTINCT FROM verify.agent_host_id
  OR audit.started_at IS NULL OR audit.completed_at IS NULL OR verify.started_at IS NULL OR verify.completed_at IS NULL
  OR audit.completed_at>=verify.completed_at OR verify.completed_at>now() THEN RETURN false;END IF;
 FOREACH kind IN ARRAY ARRAY['auditor','verifier'] LOOP
  e:=CASE WHEN kind='auditor' THEN audit ELSE verify END;
  expected_digest:=CASE WHEN kind='auditor' THEN b->>'auditorEvidenceDigest' ELSE b->>'verifierEvidenceDigest' END;
  c:=e.metadata->'executionContract';r:=e.metadata->'resultRevision';v:=e.verification->'readOnlyAudit';m:=e.verification->'managedAdmission';
  IF e.status<>'completed' OR e.started_at>=e.completed_at OR e.context_invalidated_at IS NOT NULL OR e.context_stopped_at IS NOT NULL OR e.cancel_requested_at IS NOT NULL
   OR e.error_state IS NOT NULL AND e.error_state<>'null'::jsonb OR e.changed_files IS DISTINCT FROM '[]'::jsonb
   OR e.verification->>'outcome' IN ('boundary_violation','policy_blocked','acceptance_failed','verification_blocked','process_failed')
   OR COALESCE(c->'assignment'->>'agentId','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
   OR c->'singleTask'->>'applicationId' IS DISTINCT FROM a.id::TEXT
   OR c->'nativeBoundary'->>'profile' IS DISTINCT FROM 'inspect-readonly' OR c->'nativeBoundary'->'inspectReadOnly'->>'kind' IS DISTINCT FROM kind
   OR c->'access'->>'sandbox' IS DISTINCT FROM 'read-only' OR c->'access'->'tools' IS DISTINCT FROM '["repository_read"]'::jsonb
   OR c->'access'->'permissions' IS DISTINCT FROM '["repository_read"]'::jsonb
   OR c->'modelSelection'->>'schemaVersion' IS DISTINCT FROM 'roost-managed-hermes-backend-v1' OR c->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses'
   OR m->>'qualification' IS DISTINCT FROM 'signed_native_v1' OR COALESCE(m->>'evidenceDigest','') !~ '^[a-f0-9]{64}$'
   OR COALESCE(m->>'jobSourceDigest','') !~ '^[a-f0-9]{64}$' OR COALESCE(m->>'decisionId','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
   OR r->>'schemaVersion' IS DISTINCT FROM 'roost-result-revision-v1' OR r->>'commit' IS DISTINCT FROM b->>'baselineCommit'
   OR r->>'workingTree' IS DISTINCT FROM 'clean' OR r->>'executionId' IS DISTINCT FROM e.id::TEXT
   OR r->>'hostId' IS DISTINCT FROM e.agent_host_id::TEXT OR r->>'attempt' IS DISTINCT FROM e.attempt::TEXT
   OR r->>'checkpointVersion' IS DISTINCT FROM e.checkpoint_version::TEXT OR r->>'branch' IS DISTINCT FROM c->'singleTask'->>'branch'
   OR e.metadata->>'resultRevisionReviewVersion' IS DISTINCT FROM '1' OR COALESCE(r->>'id','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
   OR r->>'observedAt' IS NULL OR e.verification->'ownedTreeReceipt'->'cleanup' IS DISTINCT FROM 'true'::jsonb
   OR e.verification->'ownedTreeReceipt'->'jobClosed' IS DISTINCT FROM 'true'::jsonb OR e.verification->'ownedTreeReceipt'->'activeProcesses' IS DISTINCT FROM '0'::jsonb
   OR e.verification->'ownedTreeReceipt'->'rootExit' IS DISTINCT FROM '0'::jsonb OR e.verification->'ownedTreeReceipt'->>'attempt' IS DISTINCT FROM e.id::TEXT
   OR v->>'schemaVersion' IS DISTINCT FROM 'roost-readonly-audit-v1' OR v->>'verdict' IS DISTINCT FROM 'verified'
   OR v->>'evidenceDigest' IS DISTINCT FROM expected_digest OR COALESCE(v->>'digest','') !~ '^[a-f0-9]{64}$'
   OR COALESCE(v->>'preTree','') !~ '^[a-f0-9]{64}$' OR v->>'preTree' IS DISTINCT FROM v->>'postTree'
   OR v->>'processState' IS DISTINCT FROM 'unchanged' OR v->>'dockerState' IS DISTINCT FROM 'unchanged' OR v->>'gitState' IS DISTINCT FROM 'unchanged'
   OR v->'nativeTools' IS DISTINCT FROM '[]'::jsonb OR v->>'processCoverage' IS DISTINCT FROM 'listening_tcp_plus_owned_job_zero_processes'
   OR v->>'dockerCoverage' IS DISTINCT FROM 'running_container_list' OR length(trim(COALESCE(e.final_response,'')))=0 OR octet_length(e.final_response)>10000 THEN RETURN false;END IF;
  worker:=(c->'assignment'->>'agentId')::UUID;
  IF NOT EXISTS(SELECT 1 FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id JOIN workforce_entities wf ON wf.id=t.assigned_workforce_entity_id
   WHERE t.id=e.task_id AND t.workspace_id=w AND ap.application_id=a.id AND wf.workspace_id=w AND wf.type='agent' AND wf.id=worker) THEN RETURN false;END IF;
  IF NOT EXISTS(SELECT 1 FROM decisions d JOIN decision_revisions dr ON dr.decision_id=d.id JOIN decision_acceptances da ON da.decision_id=d.id
   WHERE d.id=(m->>'decisionId')::UUID AND d.workspace_id=w AND d.status='accepted' AND decision_state(d.id)='accepted'
   AND dr.version::TEXT=m->>'revision' AND da.actor_agent_id IS NULL AND decision_primary_owner(w,da.actor_user_id)
   AND dr.body->'managedRuntimeApproval'->>'taskId'=e.task_id::TEXT
   AND dr.body->'managedRuntimeApproval'->>'applicationId'=a.id::TEXT AND dr.body->'managedRuntimeApproval'->>'backend'='codex_responses'
   AND NOT EXISTS(SELECT 1 FROM decisions next JOIN decision_acceptances na ON na.decision_id=next.id WHERE next.supersedes_id=d.id)) THEN RETURN false;END IF;
 END LOOP;
 RETURN audit.metadata->'executionContract'->'assignment'->>'agentId' IS DISTINCT FROM verify.metadata->'executionContract'->'assignment'->>'agentId'
  AND audit.metadata->'resultRevision'->>'branch' IS NOT DISTINCT FROM verify.metadata->'resultRevision'->>'branch'
  AND audit.verification->'readOnlyAudit'->>'preTree' IS NOT DISTINCT FROM verify.verification->'readOnlyAudit'->>'preTree'
  AND verify.verification->'readOnlyAudit'->>'verifiedExecutionId'=audit.id::TEXT
  AND verify.verification->'readOnlyAudit'->>'verifiedEvidenceDigest'=b->>'auditorEvidenceDigest'
  AND verify.metadata->'executionContract'->'nativeBoundary'->'inspectReadOnly'->>'verifiedExecutionId'=audit.id::TEXT
  AND verify.metadata->'executionContract'->'nativeBoundary'->'inspectReadOnly'->>'verifiedEvidenceDigest'=b->>'auditorEvidenceDigest';
EXCEPTION WHEN invalid_text_representation OR invalid_parameter_value OR numeric_value_out_of_range THEN RETURN false;
END $$;

CREATE FUNCTION application_takeover_decision_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE body JSONB;baseline JSONB;node JSONB;owner UUID;field TEXT;
BEGIN
 IF TG_TABLE_NAME='decision_revisions' THEN body:=NEW.body;
 ELSE SELECT dr.body INTO body FROM decision_revisions dr WHERE dr.decision_id=NEW.decision_id AND dr.workspace_id=NEW.workspace_id;END IF;
 IF NOT COALESCE(body ? 'applicationBaseline',false) THEN RETURN NEW;END IF;
 baseline:=body->'applicationBaseline';
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) THEN RAISE EXCEPTION 'application_baseline_owner_required';END IF;
 IF TG_TABLE_NAME='decision_acceptances' THEN
  IF NEW.actor_agent_id IS NOT NULL OR NEW.actor_credential_id IS NOT NULL OR NEW.capability_grants IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'application_baseline_owner_required';END IF;
 END IF;
 IF jsonb_typeof(baseline) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'application_baseline_evidence_invalid';END IF;
 IF jsonb_typeof(body->'scope') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
 IF jsonb_typeof(body) IS DISTINCT FROM 'object' OR NOT body ?& ARRAY['title','context','decision','rationale','consequences','scopeReason','scope','supersedesId','conflicts','applicationBaseline']
  OR body-ARRAY['title','context','decision','rationale','consequences','scopeReason','scope','supersedesId','conflicts','applicationBaseline']<>'{}'::jsonb
  OR jsonb_typeof(body->'scope') IS DISTINCT FROM 'array' OR jsonb_array_length(body->'scope') NOT BETWEEN 2 AND 8
  OR jsonb_array_length(body->'scope')<>(SELECT count(DISTINCT (value->>'type',value->>'id')) FROM jsonb_array_elements(body->'scope'))
  OR NOT body->'scope' @> jsonb_build_array(jsonb_build_object('type','application','id',baseline->>'applicationId'),jsonb_build_object('type','task','id',baseline->>'auditTaskId'))
  THEN RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
 FOREACH field IN ARRAY ARRAY['title','context','decision','rationale','consequences','scopeReason'] LOOP
  IF jsonb_typeof(body->field) IS DISTINCT FROM 'string' OR length(trim(body->>field)) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
 END LOOP;
 FOR node IN SELECT value FROM jsonb_array_elements(body->'scope') LOOP
  IF jsonb_typeof(node) IS DISTINCT FROM 'object' OR node-ARRAY['type','id']<>'{}'::jsonb THEN RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
  IF node->>'type'='application' THEN
   IF node->>'id' IS DISTINCT FROM baseline->>'applicationId' THEN RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
  ELSIF node->>'type'='task' THEN
   IF NOT EXISTS(SELECT 1 FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id WHERE t.id::TEXT=node->>'id' AND t.workspace_id=NEW.workspace_id AND ap.application_id::TEXT=baseline->>'applicationId') THEN RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
  ELSIF node->>'type'='company_record' THEN
   IF NOT EXISTS(SELECT 1 FROM company_records cr WHERE cr.id::TEXT=node->>'id' AND cr.workspace_id=NEW.workspace_id AND cr.application_id::TEXT=baseline->>'applicationId' AND cr.status<>'archived') THEN RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
  ELSE RAISE EXCEPTION 'application_baseline_scope_invalid';END IF;
 END LOOP;
 IF application_takeover_baseline_valid(NEW.workspace_id,baseline) IS DISTINCT FROM true THEN RAISE EXCEPTION 'application_baseline_evidence_invalid';END IF;
 IF TG_TABLE_NAME='decision_acceptances' THEN
  SELECT owner_user_id INTO owner FROM workspaces WHERE id=NEW.workspace_id;
  IF NEW.authority IS DISTINCT FROM jsonb_build_object('status','owner_reserved','reason','application_takeover_baseline','principal',jsonb_build_object('kind','user','id',owner),'path','[]'::jsonb,'mandate',NULL) THEN RAISE EXCEPTION 'application_baseline_owner_required';END IF;
 END IF;
 RETURN NEW;
END $$;

-- These run before the existing authority/history guards; other Decision kinds
-- immediately pass through, and every existing admission gate still executes.
CREATE TRIGGER a0_application_takeover_revision BEFORE INSERT ON decision_revisions FOR EACH ROW EXECUTE FUNCTION application_takeover_decision_guard();
CREATE TRIGGER a0_application_takeover_acceptance BEFORE INSERT ON decision_acceptances FOR EACH ROW EXECUTE FUNCTION application_takeover_decision_guard();

COMMIT;
