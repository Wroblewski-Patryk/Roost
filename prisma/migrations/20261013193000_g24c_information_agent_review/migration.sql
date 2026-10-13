BEGIN;

-- Information tasks have no application. Keep every existing application
-- grant unchanged; the NULL branch is limited to one completed information
-- result and its review_decision operation.
ALTER TABLE task_capability_grants ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE task_capability_grants ADD CONSTRAINT task_capability_information_review_only
  CHECK (application_id IS NOT NULL OR (operation='review_decision' AND execution_id IS NOT NULL));

CREATE FUNCTION company_information_review_grant_scope(tid UUID, kid UUID, uid UUID)
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
   OR NOT (w.skill_index @> COALESCE(e.metadata->'executionContract'->'assignment'->'competencies','[]'::jsonb))
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
   'verifier',to_jsonb(w),'credential',jsonb_build_object('id',k.id,'agent',k.bound_agent_id,'version',k.credential_version,
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

ALTER FUNCTION task_capability_scope(UUID,UUID,UUID) RENAME TO task_capability_scope_before_information_review;
CREATE FUNCTION task_capability_scope(t UUID,k UUID,u UUID) RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
BEGIN
 IF (SELECT e.application_id IS NULL
       AND e.metadata->'executionContract'->>'executionClass'='roost-company-information-runtime-v1'
     FROM agent_executions e WHERE e.task_id=t ORDER BY e.created_at DESC,e.id DESC LIMIT 1)
 THEN RETURN company_information_review_grant_scope(t,k,u); END IF;
 RETURN task_capability_scope_before_information_review(t,k,u);
END $$;

ALTER FUNCTION task_capability_base(task_capability_grants) RENAME TO task_capability_base_before_information_review;
CREATE FUNCTION task_capability_base(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE e agent_executions; t tasks; k api_keys; scope TEXT; stamp TIMESTAMP:=clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
 IF g.application_id IS NOT NULL THEN RETURN task_capability_base_before_information_review(g); END IF;
 IF g.operation<>'review_decision' OR g.execution_id IS NULL OR g.agent_id IS NULL OR g.credential_id IS NULL THEN RETURN 'invalidated'; END IF;
 IF EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id) THEN RETURN 'revoked'; END IF;
 IF g.valid_until<=stamp THEN RETURN 'expired'; END IF;
 SELECT * INTO e FROM agent_executions WHERE workspace_id=g.workspace_id AND task_id=g.task_id ORDER BY created_at DESC,id DESC LIMIT 1;
 SELECT * INTO t FROM tasks WHERE workspace_id=g.workspace_id AND id=g.task_id;
 SELECT * INTO k FROM api_keys WHERE id=g.credential_id AND workspace_id=g.workspace_id AND bound_agent_id=g.agent_id;
 scope:=company_information_review_grant_scope(g.task_id,g.credential_id,g.issuer_user_id);
 IF e.id IS NULL OR e.id<>g.execution_id OR k.id IS NULL OR k.credential_version<>g.credential_version
   OR g.valid_until>k.expires_at OR scope IS NULL OR scope IS DISTINCT FROM g.scope_hash
   THEN RETURN 'invalidated'; END IF;
 -- now() is fixed at transaction start. A review that crosses the 24-hour
 -- evidence boundary must fail at its deferred receipt check.
 IF NOT EXISTS(SELECT 1 FROM task_risk_assessments a
   JOIN task_admission_evidence v ON v.task_id=t.id AND v.operation='review_decision'
   WHERE a.id=task_risk_current(t.id) AND a.created_at+INTERVAL '24 hours'>stamp
     AND v.id=(SELECT id FROM task_admission_evidence WHERE task_id=t.id AND operation='review_decision'
       AND gate='procedure' ORDER BY version DESC LIMIT 1)
     AND v.created_at+INTERVAL '24 hours'>clock_timestamp())
 THEN RETURN 'invalidated'; END IF;
 IF EXISTS(SELECT 1 FROM task_capability_uses u JOIN task_review_decisions d ON d.id=u.decision_id
   WHERE u.grant_id=g.id AND d.capability_grant_id=g.id AND d.execution_id=g.execution_id
   AND d.actor_agent_id=g.agent_id AND d.actor_credential_id=g.credential_id)
 THEN RETURN 'active'; END IF;
 IF t.status NOT IN ('todo','in_progress') OR t.execution_readiness->>'status' IS DISTINCT FROM 'ready'
   OR task_admission_view(t.id,'review_decision')->>'status' IS DISTINCT FROM 'admitted'
   OR task_admission_seal(t.id,'review_decision') IS NULL
   OR EXISTS(SELECT 1 FROM task_review_decisions d WHERE d.execution_id=e.id AND d.snapshot->'result'=task_review_material(e)
     AND (d.workspace_id IS DISTINCT FROM g.workspace_id OR d.task_id IS DISTINCT FROM g.task_id
       OR d.capability_grant_id IS DISTINCT FROM g.id OR d.actor_agent_id IS DISTINCT FROM g.agent_id
       OR d.actor_credential_id IS DISTINCT FROM g.credential_id))
   THEN RETURN 'invalidated'; END IF;
 RETURN CASE WHEN g.valid_from>stamp THEN 'pending' ELSE 'active' END;
END $$;

-- The verifier's approval is evidence. A separate, append-only owner record
-- makes the final accept/return decision for this exact native result.
CREATE TABLE information_owner_decisions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 execution_id UUID NOT NULL UNIQUE REFERENCES agent_executions(id) ON DELETE RESTRICT,
 review_id UUID NOT NULL UNIQUE REFERENCES task_review_decisions(id) ON DELETE RESTRICT,
 owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 material_version TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('accept','return')),
 summary TEXT NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id), CHECK(length(trim(summary)) BETWEEN 3 AND 2000),
 CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 CHECK(material_version ~ '^[a-f0-9]{64}$')
);
CREATE INDEX information_owner_decisions_task_idx ON information_owner_decisions(workspace_id,task_id,created_at);

CREATE FUNCTION information_owner_decision_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; r task_review_decisions; owner_id UUID;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'information_owner_decision_append_only'; END IF;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 SELECT * INTO e FROM agent_executions WHERE workspace_id=NEW.workspace_id AND task_id=NEW.task_id
   ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 SELECT * INTO r FROM task_review_decisions WHERE id=NEW.review_id AND workspace_id=NEW.workspace_id
   AND task_id=NEW.task_id AND execution_id=NEW.execution_id;
 SELECT owner_user_id INTO owner_id FROM workspaces WHERE id=NEW.workspace_id;
 IF t.id IS NULL OR e.id IS NULL OR e.id<>NEW.execution_id OR r.id IS NULL OR r.decision<>'approve'
   OR r.actor_user_id IS NOT NULL OR r.actor_agent_id IS NULL OR r.capability_grant_id IS NULL
   OR NEW.owner_user_id IS DISTINCT FROM owner_id
   OR NOT EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id
      AND m.user_id=NEW.owner_user_id AND m.role='owner' AND m.task_scope_id IS NULL)
   OR NOT EXISTS(SELECT 1 FROM task_capability_uses u WHERE u.grant_id=r.capability_grant_id
      AND u.decision_id=r.id)
   OR EXISTS(SELECT 1 FROM task_review_actions a WHERE a.review_id=r.id)
   OR NOT company_information_native_proven(e)
   OR e.application_id IS NOT NULL OR e.metadata->'executionContract'->>'executionClass'<>'roost-company-information-runtime-v1'
   OR r.snapshot->'result' IS DISTINCT FROM task_review_material(e)
   OR NEW.material_version IS DISTINCT FROM r.material_version
   OR NEW.material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex')
   OR t.status NOT IN ('todo','in_progress')
   OR t.assigned_workforce_entity_id::text IS DISTINCT FROM e.metadata->'executionContract'->'assignment'->>'agentId'
   OR t.execution_readiness->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId'
   OR t.execution_readiness->>'revision' IS DISTINCT FROM e.metadata->'readyContextPin'->>'revision'
   OR t.execution_role_provenance IS DISTINCT FROM t.execution_readiness->'roleProvenance'
   OR t.execution_readiness->>'status' IS DISTINCT FROM 'ready'
   OR task_admission_view(t.id,'review_decision')->>'status' IS DISTINCT FROM 'admitted'
   OR NOT EXISTS(SELECT 1 FROM task_risk_assessments a
      JOIN task_admission_evidence v ON v.task_id=t.id AND v.operation='review_decision'
      WHERE a.id=task_risk_current(t.id)
        AND a.created_at+INTERVAL '24 hours'>(clock_timestamp() AT TIME ZONE 'UTC')
        AND v.id=(SELECT id FROM task_admission_evidence WHERE task_id=t.id AND operation='review_decision'
          AND gate='procedure' ORDER BY version DESC LIMIT 1)
        AND v.created_at+INTERVAL '24 hours'>clock_timestamp())
 THEN RAISE EXCEPTION 'information_owner_decision_not_current'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER information_owner_decision_guard BEFORE INSERT OR UPDATE OR DELETE ON information_owner_decisions
 FOR EACH ROW EXECUTE FUNCTION information_owner_decision_guard();

CREATE FUNCTION information_agent_review_completion_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE e agent_executions;
BEGIN
 IF NEW.status='done' AND OLD.status IS DISTINCT FROM 'done' THEN
   SELECT * INTO e FROM agent_executions WHERE workspace_id=NEW.workspace_id AND task_id=NEW.id
     ORDER BY created_at DESC,id DESC LIMIT 1;
    IF e.id IS NOT NULL AND e.application_id IS NULL
      AND e.metadata->'executionContract'->>'executionClass'='roost-company-information-runtime-v1'
      AND NOT EXISTS(SELECT 1 FROM information_owner_decisions d WHERE d.execution_id=e.id AND d.decision='accept')
      AND NOT EXISTS(SELECT 1 FROM task_review_decisions r WHERE r.execution_id=e.id AND r.decision='approve'
        AND r.actor_user_id IS NOT NULL AND r.actor_agent_id IS NULL
        AND r.snapshot->'result'=task_review_material(e))
   THEN RAISE EXCEPTION 'information_owner_decision_required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER information_agent_review_completion_guard BEFORE UPDATE OF status ON tasks
 FOR EACH ROW EXECUTE FUNCTION information_agent_review_completion_guard();

COMMIT;
