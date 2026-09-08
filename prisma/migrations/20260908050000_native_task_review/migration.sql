BEGIN;
CREATE TABLE task_review_decisions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL, task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 execution_id UUID NOT NULL UNIQUE REFERENCES agent_executions(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, material_version TEXT NOT NULL,
 actor_user_id UUID NOT NULL, verifier_id UUID NOT NULL, manager_id UUID NOT NULL,
 decision TEXT NOT NULL CHECK (decision IN ('approve','reject')), evidence JSONB NOT NULL, snapshot JSONB NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(workspace_id,request_id)
);
CREATE INDEX task_review_decisions_workspace_id_task_id_created_at_idx ON task_review_decisions(workspace_id,task_id,created_at);
CREATE TABLE task_review_actions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL, task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 review_id UUID NOT NULL UNIQUE REFERENCES task_review_decisions(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, actor_user_id UUID NOT NULL, manager_id UUID NOT NULL,
 action TEXT NOT NULL CHECK (action IN ('return_to_executor','create_specialist_task')),
 child_task_id UUID UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT, dependency_id UUID,
 correction JSONB NOT NULL, snapshot JSONB NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id), CHECK ((action='create_specialist_task') = (child_task_id IS NOT NULL)), CHECK (child_task_id IS DISTINCT FROM task_id)
);
CREATE INDEX task_review_actions_workspace_id_task_id_created_at_idx ON task_review_actions(workspace_id,task_id,created_at);

CREATE FUNCTION task_review_material(e agent_executions) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('executionId',e.id,'taskId',e.task_id,'applicationId',e.application_id,'attempt',e.attempt,
 'completedAt',e.completed_at,'summary',e.summary,'finalResponse',e.final_response,'changedFiles',e.changed_files,
 'verification',e.verification,'contract',e.metadata->'executionContract','pin',e.metadata->'readyContextPin');
$$;
CREATE FUNCTION task_review_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; d task_review_decisions; w workforce_entities; r JSONB; expected_role TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'task_review_append_only'; END IF;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'task_review_workspace_mismatch'; END IF;
 SELECT * INTO e FROM agent_executions WHERE task_id=t.id AND workspace_id=NEW.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR e.status <> 'completed' OR e.context_invalidated_at IS NOT NULL OR e.completed_at IS NULL THEN RAISE EXCEPTION 'task_review_result_required'; END IF;
 r := e.metadata->'executionContract'->'taskRoles';
 IF t.execution_readiness->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId' THEN RAISE EXCEPTION 'task_review_stale'; END IF;
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
    (NEW.correction - 'scope') IS DISTINCT FROM (d.evidence->'correction' - 'scope') THEN RAISE EXCEPTION 'task_review_scope_expanded'; END IF;
   IF NEW.child_task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tasks c WHERE c.id=NEW.child_task_id AND c.workspace_id=NEW.workspace_id AND c.execution_readiness->>'status'='draft') THEN RAISE EXCEPTION 'task_review_child_invalid'; END IF;
   SELECT * INTO w FROM workforce_entities WHERE id=NEW.manager_id AND workspace_id=NEW.workspace_id;
   expected_role := 'accountableManager';
 END IF;
 IF w.id IS NULL OR w.type<>'human' OR w.source IS DISTINCT FROM 'user' OR w.external_id IS DISTINCT FROM NEW.actor_user_id::text OR w.status<>'active' OR length(COALESCE(w.role,''))=0 OR
   w.id::text IS DISTINCT FROM r->expected_role->>'id' OR
   to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM r->expected_role->>'revision' OR
   NOT EXISTS (SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id AND m.role IN ('owner','admin','member')) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF NOT (w.authority_scope @> jsonb_build_array(CASE WHEN expected_role='verifier' THEN 'task_verification' ELSE 'task_accountability' END)) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF t.execution_role_provenance IS NULL OR t.execution_role_provenance->'authors' @> jsonb_build_array(jsonb_build_object('kind','user','id',NEW.actor_user_id::text)) THEN RAISE EXCEPTION 'task_review_self_review'; END IF;
   IF NOT (w.skill_index @> (e.metadata->'executionContract'->'assignment'->'competencies')) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_review_guard BEFORE INSERT OR UPDATE OR DELETE ON task_review_decisions FOR EACH ROW EXECUTE FUNCTION task_review_guard();
CREATE TRIGGER task_review_guard BEFORE INSERT OR UPDATE OR DELETE ON task_review_actions FOR EACH ROW EXECUTE FUNCTION task_review_guard();
CREATE FUNCTION task_review_result_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM task_review_decisions WHERE execution_id=OLD.id) AND (task_review_material(NEW) IS DISTINCT FROM task_review_material(OLD) OR NEW.status IS DISTINCT FROM OLD.status OR NEW.task_id<>OLD.task_id OR NEW.workspace_id<>OLD.workspace_id) THEN RAISE EXCEPTION 'task_review_result_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_review_result_guard BEFORE UPDATE ON agent_executions FOR EACH ROW EXECUTE FUNCTION task_review_result_guard();

CREATE FUNCTION task_review_ready_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE d task_review_decisions; a task_review_actions; c JSONB; expected JSONB;
BEGIN
 IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.execution_readiness IS NOT DISTINCT FROM OLD.execution_readiness THEN RETURN NEW; END IF;
 SELECT * INTO d FROM task_review_decisions WHERE task_id=NEW.id ORDER BY created_at DESC,id DESC LIMIT 1;
 IF d.decision='reject' THEN
   SELECT * INTO a FROM task_review_actions WHERE review_id=d.id;
   IF NOT FOUND THEN RAISE EXCEPTION 'task_review_manager_action_required'; END IF;
   IF a.child_task_id IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM agent_executions e JOIN task_review_decisions rd ON rd.execution_id=e.id
     WHERE e.id=(SELECT id FROM agent_executions WHERE task_id=a.child_task_id ORDER BY created_at DESC,id DESC LIMIT 1) AND e.status='completed' AND rd.decision='approve'
   ) THEN RAISE EXCEPTION 'task_review_specialist_pending'; END IF;
 ELSE
   IF d.id IS NULL THEN SELECT * INTO a FROM task_review_actions WHERE child_task_id=NEW.id; END IF;
 END IF;
 IF a.id IS NOT NULL AND (a.action='return_to_executor' OR a.child_task_id=NEW.id) THEN
   c:=NEW.execution_readiness->'contract'; expected:=a.snapshot->'contract';
   IF c->'scope' IS DISTINCT FROM expected->'scope' OR c->'objective'->>'outcome' IS DISTINCT FROM expected->'objective'->>'outcome' OR
     c->'assignment'->>'agentId' IS DISTINCT FROM expected->'assignment'->>'agentId' OR c->'assignment'->'competencies' IS DISTINCT FROM expected->'assignment'->'competencies' OR
     c->'singleTask'->'component'->>'id' IS DISTINCT FROM expected->'singleTask'->'component'->>'id' THEN RAISE EXCEPTION 'task_review_correction_mismatch'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_review_ready_guard BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION task_review_ready_guard();
COMMIT;
