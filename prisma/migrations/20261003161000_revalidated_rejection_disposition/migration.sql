BEGIN;

-- Rejection closes execution admission. Only its exact manager return may use
-- the immutable mapped basis; approval and owner revalidation stay closed.
CREATE FUNCTION completed_result_rejection_disposition_current(e agent_executions)
 RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT COALESCE((SELECT e.status='completed' AND e.completed_at IS NOT NULL AND e.context_invalidated_at IS NULL
  AND r.workspace_id=e.workspace_id AND r.task_id=e.task_id AND t.workspace_id=e.workspace_id
  AND r.original_pin_id::text=e.metadata->'readyContextPin'->>'pinId'
  AND r.original_revision=e.metadata->'readyContextPin'->>'revision'
  AND r.original_material_version=encode(sha256(convert_to(task_review_material_original(e)::text,'UTF8')),'hex')
  AND r.commit=e.metadata->'resultRevision'->>'commit'
  AND r.ready_pin->>'status'='ready'
  AND r.ready_pin_digest=encode(sha256(convert_to(r.ready_pin::text,'UTF8')),'hex')
  AND r.ready_pin_id::text=r.ready_pin->>'pinId' AND r.ready_revision=r.ready_pin->>'revision'
  AND t.execution_readiness = r.ready_pin || jsonb_build_object('status','needs_revalidation','reason','review_rejected')
  AND t.assigned_workforce_entity_id::text=e.metadata->'executionContract'->'assignment'->>'agentId'
  AND t.execution_role_provenance=r.ready_pin->'roleProvenance'
  AND e.id=(SELECT latest.id FROM agent_executions latest WHERE latest.task_id=e.task_id AND latest.workspace_id=e.workspace_id ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1)
  AND d.decision='reject' AND d.execution_id=e.id AND d.workspace_id=e.workspace_id AND d.task_id=e.task_id
  AND d.material_version=encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex')
  AND d.snapshot->'result'=task_review_material(e)
  AND NOT EXISTS(SELECT 1 FROM task_review_actions a WHERE a.review_id=d.id)
  FROM completed_result_basis_revalidations r JOIN tasks t ON t.id=r.task_id
  JOIN task_review_decisions d ON d.id=(SELECT latest.id FROM task_review_decisions latest
   WHERE latest.workspace_id=e.workspace_id AND latest.task_id=e.task_id ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1)
  WHERE r.execution_id=e.id ORDER BY r.sequence DESC LIMIT 1),false);
$$;

CREATE OR REPLACE FUNCTION task_review_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; d task_review_decisions; w workforce_entities; r JSONB; expected_role TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'task_review_append_only'; END IF;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'task_review_workspace_mismatch'; END IF;
 SELECT * INTO e FROM agent_executions WHERE task_id=t.id AND workspace_id=NEW.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR e.status <> 'completed' OR e.context_invalidated_at IS NOT NULL OR e.completed_at IS NULL THEN RAISE EXCEPTION 'task_review_result_required'; END IF;
 r := e.metadata->'executionContract'->'taskRoles';
 IF (t.execution_readiness->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId'
  OR t.execution_readiness->>'revision' IS DISTINCT FROM e.metadata->'readyContextPin'->>'revision')
  AND NOT completed_result_basis_current(e) THEN
   IF TG_TABLE_NAME<>'task_review_actions' THEN RAISE EXCEPTION 'task_review_stale'; END IF;
   IF NEW.action<>'return_to_executor' OR NOT completed_result_rejection_disposition_current(e)
    THEN RAISE EXCEPTION 'task_review_stale'; END IF;
 END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF NEW.execution_id<>e.id OR NEW.snapshot->'result' IS DISTINCT FROM task_review_material(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;
   IF NEW.verifier_id::text IS DISTINCT FROM r->'verifier'->>'id' OR NEW.manager_id::text IS DISTINCT FROM r->'accountableManager'->>'id' THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
   IF jsonb_typeof(NEW.evidence->'evidence') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'evidence')=0 OR length(COALESCE(NEW.evidence->>'summary',''))<3 THEN RAISE EXCEPTION 'task_review_evidence_required'; END IF;
   IF NEW.decision='reject' AND (jsonb_typeof(NEW.evidence->'reproduction') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'reproduction')=0 OR length(COALESCE(NEW.evidence->>'expected',''))<3 OR length(COALESCE(NEW.evidence->>'observed',''))<3 OR jsonb_typeof(NEW.evidence->'correction'->'scope') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'correction'->'scope')=0) THEN RAISE EXCEPTION 'task_review_evidence_required'; END IF;
   SELECT * INTO w FROM workforce_entities WHERE id=NEW.verifier_id AND workspace_id=NEW.workspace_id;
   expected_role := 'verifier';
 ELSE
   SELECT * INTO d FROM task_review_decisions WHERE id=NEW.review_id AND task_id=t.id AND workspace_id=NEW.workspace_id;
   IF NOT FOUND OR d.decision<>'reject' OR d.execution_id<>e.id OR d.snapshot->'result' IS DISTINCT FROM task_review_material(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;
   IF NEW.manager_id<>d.manager_id THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
   IF NOT ((d.evidence->'correction'->'scope') @> (NEW.correction->'scope')) OR
    (NEW.correction - 'scope' - 'competencies' - 'managerCompetencyRationale') IS DISTINCT FROM ((d.evidence->'correction') - 'scope' - 'competencies')
    THEN RAISE EXCEPTION 'task_review_scope_expanded'; END IF;
   IF jsonb_typeof(NEW.correction->'competencies') IS DISTINCT FROM 'array'
    THEN RAISE EXCEPTION 'task_review_competencies_expanded'; END IF;
   IF NEW.action='return_to_executor' THEN
     IF jsonb_array_length(NEW.correction->'competencies')=0 OR
      NOT ((COALESCE(d.evidence->'correction'->'competencies','[]'::jsonb) ||
       COALESCE(e.metadata->'executionContract'->'assignment'->'competencies','[]'::jsonb)) @> (NEW.correction->'competencies')) OR
      (NOT ((d.evidence->'correction'->'competencies') @> (NEW.correction->'competencies')) AND
       length(trim(COALESCE(NEW.correction->>'managerCompetencyRationale','')))<3)
      THEN RAISE EXCEPTION 'task_review_competencies_expanded'; END IF;
   ELSIF NEW.correction->'competencies' IS DISTINCT FROM d.evidence->'correction'->'competencies'
    THEN RAISE EXCEPTION 'task_review_competencies_expanded'; END IF;
   SELECT * INTO w FROM workforce_entities WHERE id=NEW.manager_id AND workspace_id=NEW.workspace_id;
   expected_role := 'accountableManager';
 END IF;
 IF w.id IS NULL OR w.status<>'active' OR length(COALESCE(w.role,''))=0 OR
   w.id::text IS DISTINCT FROM r->expected_role->>'id' OR
   to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM r->expected_role->>'revision' OR
   NOT (
    (NEW.actor_user_id IS NOT NULL AND w.type='human' AND w.source='user' AND w.external_id=NEW.actor_user_id::text AND EXISTS (SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id AND m.role IN ('owner','admin','member'))) OR
    (NEW.actor_user_id IS NULL AND w.type='agent' AND w.source<>'user' AND NEW.actor_agent_id=w.id AND EXISTS (
      SELECT 1 FROM api_keys k WHERE k.id=NEW.actor_credential_id AND k.workspace_id=NEW.workspace_id AND k.bound_agent_id=w.id AND k.active AND k.revoked_at IS NULL AND k.expires_at>clock_timestamp()
      AND k.key_prefix=NEW.actor_credential_prefix AND k.scopes @> '["agent-runtime:write"]'::jsonb))
   ) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF NOT (w.authority_scope @> jsonb_build_array(CASE WHEN expected_role='verifier' THEN 'task_verification' ELSE 'task_accountability' END)) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF t.execution_role_provenance IS NULL OR t.execution_role_provenance->'authors' @> jsonb_build_array(jsonb_build_object('kind',CASE WHEN NEW.actor_user_id IS NULL THEN 'agent' ELSE 'user' END,'id',COALESCE(NEW.actor_user_id,NEW.actor_agent_id)::text)) THEN RAISE EXCEPTION 'task_review_self_review'; END IF;
   IF NOT (w.skill_index @> (e.metadata->'executionContract'->'assignment'->'competencies')) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 END IF;
 RETURN NEW;
END $$;

COMMIT;
