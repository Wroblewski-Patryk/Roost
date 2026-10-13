-- An exact, owner-confirmed qualification for one information task and its
-- accepted reference-site checklist. No workforce skill index is rewritten.
BEGIN;
CREATE TABLE task_verifier_qualifications (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK (version > 0),
 action TEXT NOT NULL CHECK (action IN ('qualify','revoke')),
 executor_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 executor_revision TIMESTAMPTZ NOT NULL,
 verifier_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 verifier_revision TIMESTAMPTZ NOT NULL,
 competency TEXT NOT NULL CHECK (competency = 'application audit'),
 checklist_decision_id UUID NOT NULL REFERENCES reference_site_checklist_decisions(id) ON DELETE RESTRICT,
 procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE RESTRICT,
 procedure_version INTEGER NOT NULL,
 review_ids UUID[] NOT NULL,
 contract_snapshot JSONB NOT NULL CHECK (jsonb_typeof(contract_snapshot)='object'),
 evidence TEXT NOT NULL CHECK (length(trim(evidence)) BETWEEN 20 AND 2000),
 rationale TEXT NOT NULL CHECK (length(trim(rationale)) BETWEEN 20 AND 2000),
 owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 valid_until TIMESTAMPTZ NOT NULL,
 request_id UUID NOT NULL,
 request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (task_id,version), UNIQUE (workspace_id,request_id)
);
CREATE INDEX task_verifier_qualifications_task ON task_verifier_qualifications(workspace_id,task_id,version DESC);

CREATE FUNCTION task_verifier_qualification_current(t UUID,v UUID) RETURNS JSONB
 LANGUAGE plpgsql STABLE AS $$
DECLARE q task_verifier_qualifications; d reference_site_checklist_decisions;
        p procedures; task_row tasks; executor workforce_entities; verifier workforce_entities;
BEGIN
 SELECT * INTO q FROM task_verifier_qualifications WHERE task_id=t ORDER BY version DESC LIMIT 1;
 IF q.id IS NULL OR q.action<>'qualify' OR q.verifier_id IS DISTINCT FROM v
   OR q.valid_until<=now() THEN RETURN NULL; END IF;
 SELECT * INTO d FROM reference_site_checklist_decisions WHERE task_id=t ORDER BY created_at DESC,id DESC LIMIT 1;
 SELECT * INTO p FROM procedures WHERE id=q.procedure_id;
 SELECT * INTO task_row FROM tasks WHERE id=t;
 SELECT * INTO executor FROM workforce_entities WHERE id=q.executor_id;
 SELECT * INTO verifier FROM workforce_entities WHERE id=q.verifier_id;
 IF d.id IS DISTINCT FROM q.checklist_decision_id OR d.procedure_id IS DISTINCT FROM q.procedure_id
   OR p.id IS NULL OR p.workspace_id IS DISTINCT FROM q.workspace_id
   OR p.scope<>'roost-reference-site-checklist-v1' OR p.status<>'active' OR p.version IS DISTINCT FROM q.procedure_version
   OR task_row.workspace_id IS DISTINCT FROM q.workspace_id OR task_row.status::text NOT IN ('todo','in_progress')
   OR task_row.assigned_workforce_entity_id IS DISTINCT FROM q.executor_id
   OR executor.workspace_id IS DISTINCT FROM q.workspace_id OR executor.status::text<>'active'
   OR executor.updated_at IS DISTINCT FROM q.executor_revision
   OR verifier.workspace_id IS DISTINCT FROM q.workspace_id OR verifier.type::text<>'agent'
   OR verifier.status::text<>'active' OR verifier.updated_at IS DISTINCT FROM q.verifier_revision
   OR NOT verifier.skill_index @> jsonb_build_array(q.competency)
   OR NOT verifier.authority_scope @> '["task_verification"]'::jsonb
   OR NOT EXISTS(SELECT 1 FROM workspaces w JOIN workspace_memberships m
      ON m.workspace_id=w.id AND m.user_id=w.owner_user_id AND m.role='owner'
      WHERE w.id=q.workspace_id AND w.owner_user_id=q.owner_user_id)
   OR q.executor_id=q.verifier_id
   OR q.contract_snapshot->>'executionClass' IS DISTINCT FROM 'roost-company-information-runtime-v1'
   OR q.contract_snapshot->'singleTask'->>'contractId' IS DISTINCT FROM 'roost-task:'||t::text
   OR q.contract_snapshot->'procedures'->'items' IS DISTINCT FROM jsonb_build_array(jsonb_build_object('id',q.procedure_id,'revision',q.procedure_version::text))
   OR (SELECT array_agg((s.validation_rule->'source'->>'reviewId')::uuid ORDER BY s.step_order)
       FROM procedure_steps s WHERE s.procedure_id=p.id) IS DISTINCT FROM q.review_ids
   OR EXISTS(SELECT 1 FROM unnest(q.review_ids) rid
       LEFT JOIN reference_site_finding_reviews r ON r.id=rid AND r.task_id=t AND r.workspace_id=q.workspace_id
       LEFT JOIN finding_versions fv ON fv.id=r.version_id
       WHERE r.id IS NULL OR r.verdict<>'confirmed' OR fv.id IS NULL OR NOT reference_site_review_current(fv))
 THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',q.id,'taskId',q.task_id,'executorId',q.executor_id,
   'executorRevision',to_char(q.executor_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'verifierId',q.verifier_id,
   'verifierRevision',to_char(q.verifier_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'competency',q.competency,'checklistDecisionId',q.checklist_decision_id,
   'procedureId',q.procedure_id,'procedureVersion',q.procedure_version,
   'contractSnapshot',q.contract_snapshot,
   'validUntil',to_char(q.valid_until AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
END $$;

CREATE FUNCTION task_verifier_qualification_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE prior task_verifier_qualifications; d reference_site_checklist_decisions;
        p procedures; task_row tasks; executor workforce_entities; verifier workforce_entities;
        expected_reviews UUID[];
BEGIN
 SELECT * INTO task_row FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 SELECT * INTO prior FROM task_verifier_qualifications WHERE task_id=NEW.task_id ORDER BY version DESC LIMIT 1;
 IF task_row.id IS NULL OR NEW.version<>COALESCE(prior.version,0)+1
   OR NOT EXISTS(SELECT 1 FROM workspaces w JOIN workspace_memberships m
      ON m.workspace_id=w.id AND m.user_id=w.owner_user_id AND m.role='owner'
      WHERE w.id=NEW.workspace_id AND w.owner_user_id=NEW.owner_user_id)
 THEN RAISE EXCEPTION 'verifier_qualification_forbidden'; END IF;
 IF NEW.action='revoke' THEN
   IF prior.id IS NULL OR prior.action<>'qualify'
     OR NEW.executor_id IS DISTINCT FROM prior.executor_id OR NEW.executor_revision IS DISTINCT FROM prior.executor_revision
     OR NEW.verifier_id IS DISTINCT FROM prior.verifier_id OR NEW.verifier_revision IS DISTINCT FROM prior.verifier_revision
     OR NEW.checklist_decision_id IS DISTINCT FROM prior.checklist_decision_id
     OR NEW.procedure_id IS DISTINCT FROM prior.procedure_id OR NEW.procedure_version IS DISTINCT FROM prior.procedure_version
     OR NEW.review_ids IS DISTINCT FROM prior.review_ids
     OR NEW.contract_snapshot IS DISTINCT FROM prior.contract_snapshot
    OR NEW.evidence IS DISTINCT FROM prior.evidence
   THEN RAISE EXCEPTION 'verifier_qualification_revoke_invalid'; END IF;
   RETURN NEW;
 END IF;
 SELECT * INTO d FROM reference_site_checklist_decisions WHERE task_id=NEW.task_id
   AND workspace_id=NEW.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1;
 SELECT * INTO p FROM procedures WHERE id=d.procedure_id AND workspace_id=NEW.workspace_id;
 SELECT * INTO executor FROM workforce_entities WHERE id=NEW.executor_id AND workspace_id=NEW.workspace_id;
 SELECT * INTO verifier FROM workforce_entities WHERE id=NEW.verifier_id AND workspace_id=NEW.workspace_id;
 SELECT array_agg((s.validation_rule->'source'->>'reviewId')::uuid ORDER BY s.step_order)
   INTO expected_reviews FROM procedure_steps s WHERE s.procedure_id=p.id;
 IF d.id IS NULL OR d.id IS DISTINCT FROM NEW.checklist_decision_id
   OR p.id IS NULL OR p.id IS DISTINCT FROM NEW.procedure_id
   OR p.scope<>'roost-reference-site-checklist-v1' OR p.status<>'active'
   OR p.version IS DISTINCT FROM NEW.procedure_version
   OR task_row.status::text NOT IN ('todo','in_progress')
   OR task_row.assigned_workforce_entity_id IS DISTINCT FROM NEW.executor_id
   OR executor.id IS NULL OR executor.type::text<>'agent' OR executor.status::text<>'active'
   OR executor.updated_at IS DISTINCT FROM NEW.executor_revision
   OR verifier.id IS NULL OR verifier.type::text<>'agent' OR verifier.status::text<>'active'
   OR verifier.updated_at IS DISTINCT FROM NEW.verifier_revision
   OR verifier.id=executor.id OR NOT verifier.skill_index @> jsonb_build_array(NEW.competency)
   OR NOT verifier.authority_scope @> '["task_verification"]'::jsonb
   OR NEW.review_ids IS DISTINCT FROM expected_reviews OR cardinality(NEW.review_ids) NOT BETWEEN 1 AND 2
   OR NEW.contract_snapshot->>'executionClass' IS DISTINCT FROM 'roost-company-information-runtime-v1'
   OR NEW.contract_snapshot->'singleTask'->>'contractId' IS DISTINCT FROM 'roost-task:'||NEW.task_id::text
   OR NEW.contract_snapshot->'assignment'->>'agentId' IS DISTINCT FROM NEW.executor_id::text
   OR NEW.contract_snapshot->'taskRoles'->'executor'->>'id' IS DISTINCT FROM NEW.executor_id::text
   OR NEW.contract_snapshot->'taskRoles'->'verifier'->>'id' IS DISTINCT FROM NEW.verifier_id::text
   OR NEW.contract_snapshot->'procedures'->'items' IS DISTINCT FROM jsonb_build_array(jsonb_build_object('id',NEW.procedure_id,'revision',NEW.procedure_version::text))
   OR EXISTS(SELECT 1 FROM unnest(NEW.review_ids) rid
       LEFT JOIN reference_site_finding_reviews r ON r.id=rid AND r.task_id=NEW.task_id AND r.workspace_id=NEW.workspace_id
       LEFT JOIN finding_versions fv ON fv.id=r.version_id
       WHERE r.id IS NULL OR r.verdict<>'confirmed' OR fv.id IS NULL OR NOT reference_site_review_current(fv))
   OR NEW.valid_until<=now() OR NEW.valid_until>now()+interval '24 hours'
 THEN RAISE EXCEPTION 'verifier_qualification_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_verifier_qualification_guard BEFORE INSERT ON task_verifier_qualifications
 FOR EACH ROW EXECUTE FUNCTION task_verifier_qualification_guard();
CREATE FUNCTION task_verifier_qualification_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'verifier_qualification_history_immutable'; END $$;
CREATE TRIGGER task_verifier_qualification_immutable BEFORE UPDATE OR DELETE ON task_verifier_qualifications
 FOR EACH ROW EXECUTE FUNCTION task_verifier_qualification_immutable();
CREATE TRIGGER task_verifier_qualification_no_truncate BEFORE TRUNCATE ON task_verifier_qualifications
 FOR EACH STATEMENT EXECUTE FUNCTION task_verifier_qualification_immutable();
CREATE FUNCTION task_verifier_qualification_invalidate() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 UPDATE tasks SET execution_readiness=execution_readiness||jsonb_build_object(
  'status','needs_revalidation','reason','verifier_qualification_changed','invalidatedAt',now())
 WHERE id=NEW.task_id AND execution_readiness->>'status'='ready';
 RETURN NULL;
END $$;
CREATE TRIGGER task_verifier_qualification_invalidate AFTER INSERT ON task_verifier_qualifications
 FOR EACH ROW EXECUTE FUNCTION task_verifier_qualification_invalidate();

-- Existing database guards continue to enforce the exact task qualification.
CREATE OR REPLACE FUNCTION company_information_review_grant_scope(tid UUID, kid UUID, uid UUID)
RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
DECLARE t tasks; e agent_executions; k api_keys; w workforce_entities; m workspace_memberships;
        roles JSONB; risk_scope JSONB; admission_scope JSONB;
BEGIN
 SELECT * INTO t FROM tasks WHERE id=tid;
 IF t.id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO e FROM agent_executions WHERE workspace_id=t.workspace_id AND task_id=t.id
   ORDER BY created_at DESC,id DESC LIMIT 1;
 IF e.id IS NULL OR e.application_id IS NOT NULL OR e.metadata->'executionContract'->>'executionClass' IS DISTINCT FROM 'roost-company-information-runtime-v1'
   OR NOT company_information_native_proven(e)
   OR t.execution_readiness->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId'
   OR t.execution_readiness->>'revision' IS DISTINCT FROM e.metadata->'readyContextPin'->>'revision'
   OR jsonb_typeof(t.execution_role_provenance->'authors') IS DISTINCT FROM 'array'
   OR t.execution_role_provenance IS DISTINCT FROM t.execution_readiness->'roleProvenance'
   THEN RETURN NULL; END IF;
 SELECT to_jsonb(s) INTO risk_scope FROM task_risk_scopes s WHERE s.task_id=t.id ORDER BY s.version DESC LIMIT 1;
 SELECT to_jsonb(s) INTO admission_scope FROM task_admission_scopes s WHERE s.task_id=t.id ORDER BY s.version DESC LIMIT 1;
 IF risk_scope->>'scope_kind' IS DISTINCT FROM 'company_information'
   OR admission_scope->>'scope_kind' IS DISTINCT FROM 'company_information' THEN RETURN NULL; END IF;
 roles:=e.metadata->'executionContract'->'taskRoles';
 IF jsonb_typeof(roles) IS DISTINCT FROM 'object' THEN RETURN NULL; END IF;
 SELECT * INTO k FROM api_keys WHERE id=kid AND workspace_id=t.workspace_id;
 IF k.id IS NULL OR k.bound_agent_id IS NULL OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at<=clock_timestamp()
   OR NOT (k.scopes @> '["agent-runtime:write"]'::jsonb) THEN RETURN NULL; END IF;
 SELECT * INTO w FROM workforce_entities WHERE id=k.bound_agent_id AND workspace_id=t.workspace_id;
 IF w.id IS NULL OR w.type<>'agent' OR w.source='user' OR w.status<>'active' OR length(COALESCE(w.role,''))=0
   OR w.id::text IS DISTINCT FROM roles->'verifier'->>'id'
   OR to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM roles->'verifier'->>'revision'
   OR NOT (w.authority_scope @> '["task_verification"]'::jsonb)
   OR (NOT (w.skill_index @> COALESCE(e.metadata->'executionContract'->'assignment'->'competencies','[]'::jsonb))
     AND NOT EXISTS(SELECT 1 FROM task_verifier_qualifications q
       WHERE q.id=(task_verifier_qualification_current(t.id,w.id)->>'id')::uuid
         AND q.contract_snapshot=e.metadata->'executionContract'))
   OR w.id IS NOT DISTINCT FROM t.assigned_workforce_entity_id
   OR t.execution_role_provenance->'authors' @> jsonb_build_array(jsonb_build_object('kind','agent','id',w.id::text))
   THEN RETURN NULL; END IF;
 SELECT * INTO m FROM workspace_memberships WHERE workspace_id=t.workspace_id AND user_id=uid
   AND role='owner' AND task_scope_id IS NULL;
 IF m.user_id IS NULL OR uid IS DISTINCT FROM (SELECT owner_user_id FROM workspaces WHERE id=t.workspace_id)
   THEN RETURN NULL; END IF;
 RETURN encode(sha256(convert_to(jsonb_build_object(
   'task',jsonb_build_object('id',t.id,'workspaceId',t.workspace_id,'assignedAgentId',t.assigned_workforce_entity_id,
     'goalId',t.goal_id,'projectId',t.project_id,'source',t.source,
     'readiness',t.execution_readiness-'status'-'reason','roleProvenance',t.execution_role_provenance),
   'execution',jsonb_build_object('id',e.id,'material',task_review_material(e),'completedAt',e.completed_at),
   'verifier',to_jsonb(w),'verifierQualification',task_verifier_qualification_current(t.id,w.id),'credential',jsonb_build_object('id',k.id,'agent',k.bound_agent_id,'version',k.credential_version,
     'active',k.active,'revoked',k.revoked_at,'expiry',k.expires_at,'scopes',k.scopes),
   'issuer',to_jsonb(m),'riskScope',risk_scope,
   'riskCurrent',task_risk_current(t.id),'riskVersion',task_risk_version(t.id),
   'riskAssessment',(SELECT to_jsonb(a) FROM task_risk_assessments a WHERE a.workspace_id=t.workspace_id
     AND a.sources @> jsonb_build_array(jsonb_build_object('taskId',t.id)) ORDER BY a.sequence DESC LIMIT 1),
   'admissionScope',admission_scope,
   'admissionSource',task_admission_source(t.id),
   'admissionHead',(SELECT revision FROM task_admission_heads WHERE task_id=t.id),
   'interviewPending',task_interview_pending(t.id),'interviewVersion',task_interview_version(t.id),
   'decisionAuthorityCurrent',decision_authority_task_current(t.id),'decisionPendingVersion',decision_pending_version(t.id),
   'admissionEvidence',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.version,a.id),'[]'::jsonb)
     FROM task_admission_evidence a WHERE a.task_id=t.id AND a.operation='review_decision'),
   'procedure',(SELECT to_jsonb(p) FROM procedures p WHERE p.id=(admission_scope->>'procedure_id')::uuid),
   'procedureSteps',(SELECT COALESCE(jsonb_agg(to_jsonb(step) ORDER BY step.id),'[]'::jsonb) FROM procedure_steps step
     WHERE step.procedure_id=(admission_scope->>'procedure_id')::uuid),
   'companyRecords',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM company_records c
     WHERE c.workspace_id=t.workspace_id AND c.id::text IN
       (SELECT ref->>'id' FROM jsonb_array_elements(COALESCE(risk_scope->'input'->'contract'->'context'->'company','[]'::jsonb)) ref)))::text,'UTF8')),'hex');
END $$;

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
    (NEW.actor_user_id IS NOT NULL AND w.type='human' AND w.source='user' AND w.external_id=NEW.actor_user_id::text AND EXISTS (SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id AND m.role IN ('owner','admin','member') AND (m.task_scope_id IS NULL OR m.task_scope_id=NEW.task_id))) OR
    (NEW.actor_user_id IS NULL AND w.type='agent' AND w.source<>'user' AND NEW.actor_agent_id=w.id AND EXISTS (
      SELECT 1 FROM api_keys k WHERE k.id=NEW.actor_credential_id AND k.workspace_id=NEW.workspace_id AND k.bound_agent_id=w.id AND k.active AND k.revoked_at IS NULL AND k.expires_at>clock_timestamp()
      AND k.key_prefix=NEW.actor_credential_prefix AND k.scopes @> '["agent-runtime:write"]'::jsonb))
   ) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF NOT (w.authority_scope @> jsonb_build_array(CASE WHEN expected_role='verifier' THEN 'task_verification' ELSE 'task_accountability' END)) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF t.execution_role_provenance IS NULL OR t.execution_role_provenance->'authors' @> jsonb_build_array(jsonb_build_object('kind',CASE WHEN NEW.actor_user_id IS NULL THEN 'agent' ELSE 'user' END,'id',COALESCE(NEW.actor_user_id,NEW.actor_agent_id)::text)) THEN RAISE EXCEPTION 'task_review_self_review'; END IF;
   IF NOT (w.skill_index @> (e.metadata->'executionContract'->'assignment'->'competencies'))
      AND NOT (e.application_id IS NULL
        AND e.metadata->'executionContract'->>'executionClass'='roost-company-information-runtime-v1'
        AND EXISTS(SELECT 1 FROM task_verifier_qualifications q
          WHERE q.id=(task_verifier_qualification_current(t.id,w.id)->>'id')::uuid
            AND q.contract_snapshot=e.metadata->'executionContract'))
   THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION task_handoff_principal(t UUID, role_name TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE task tasks; r JSONB; w workforce_entities; m workspace_memberships; mandate TEXT;
BEGIN
 SELECT * INTO task FROM tasks WHERE id=t;
 r:=task.execution_readiness->'contract'->'taskRoles'->role_name;
 IF role_name='requester' THEN
  SELECT * INTO m FROM workspace_memberships WHERE workspace_id=task.workspace_id AND user_id::text=r->>'id' AND role IN ('owner','admin','member');
  IF m.id IS NULL OR to_char(m.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM r->>'revision' THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('kind','user','id',m.user_id);
 END IF;
 IF role_name NOT IN ('accountableManager','executor','verifier','releaser') THEN RETURN NULL; END IF;
 SELECT * INTO w FROM workforce_entities WHERE id::text=r->>'id' AND workspace_id=task.workspace_id AND status='active';
 IF w.id IS NULL OR length(trim(COALESCE(w.role,'')))=0 OR to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM r->>'revision' THEN RETURN NULL; END IF;
 mandate:=CASE role_name WHEN 'accountableManager' THEN 'task_accountability' WHEN 'verifier' THEN 'task_verification' WHEN 'releaser' THEN 'release_authorization' END;
 IF mandate IS NOT NULL AND NOT w.authority_scope @> jsonb_build_array(mandate) THEN RETURN NULL; END IF;
 IF role_name IN ('executor','verifier') AND NOT w.skill_index @> (task.execution_readiness->'contract'->'assignment'->'competencies')
   AND NOT (role_name='verifier'
     AND task.execution_readiness->'contract'->>'executionClass'='roost-company-information-runtime-v1'
     AND EXISTS(SELECT 1 FROM task_verifier_qualifications q
       WHERE q.id=(task_verifier_qualification_current(t,w.id)->>'id')::uuid
         AND q.contract_snapshot=task.execution_readiness->'contract'))
   THEN RETURN NULL; END IF;
 IF w.type='agent' AND w.source<>'user' THEN RETURN jsonb_build_object('kind','agent','id',w.id); END IF;
 IF w.type='human' AND w.source='user' AND EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=task.workspace_id AND user_id::text=w.external_id AND role IN ('owner','admin','member')) THEN RETURN jsonb_build_object('kind','user','id',w.external_id); END IF;
 RETURN NULL;
END $$;
-- A qualification change, revocation, expiry or role drift changes the risk source version.
CREATE OR REPLACE FUNCTION task_risk_sources(target UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT jsonb_agg((CASE WHEN q.id IS NULL THEN source ELSE source||jsonb_build_object(
   'verifierQualificationHead',q.id,
   'verifierQualificationCurrent',task_verifier_qualification_current((source->>'taskId')::uuid,q.verifier_id)) END)
   ||jsonb_build_object('compositionRefs',
  (SELECT jsonb_object_agg(op,task_composition_refs((source->>'taskId')::uuid,op)) FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=(source->>'taskId')::uuid AND hs.operation=op))) ORDER BY source->>'taskId')
 FROM jsonb_array_elements(task_risk_sources_before_composition(target)) source
 LEFT JOIN LATERAL (SELECT id,verifier_id FROM task_verifier_qualifications
   WHERE task_id=(source->>'taskId')::uuid ORDER BY version DESC LIMIT 1) q ON true
$$;
COMMIT;
