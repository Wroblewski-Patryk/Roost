BEGIN;
-- Empty additive evidence ledger. No historical authority is synthesized.
CREATE TABLE task_admission_scopes (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, version INT NOT NULL,
 application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE RESTRICT,
 target_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
 release_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
 input JSONB NOT NULL, actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(task_id,version), UNIQUE(workspace_id,request_id)
);
CREATE TABLE task_admission_heads (
 task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE RESTRICT, revision BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE task_admission_evidence (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, scope_id UUID NOT NULL REFERENCES task_admission_scopes(id) ON DELETE RESTRICT,
 operation TEXT NOT NULL CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task')),
 gate TEXT NOT NULL CHECK(gate IN ('procedure','extended_review','mandate','backup','restore_plan','owner_approval')),
 version INT NOT NULL, source_version TEXT NOT NULL, dependency_version TEXT NOT NULL,
 evidence_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT, evidence_revision TIMESTAMPTZ NOT NULL,
 verdict TEXT NOT NULL CHECK(verdict IN ('passed','failed')), detail JSONB NOT NULL,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(task_id,operation,gate,version), UNIQUE(workspace_id,request_id)
);
CREATE INDEX task_admission_scope_workspace ON task_admission_scopes(workspace_id,task_id);
CREATE INDEX task_admission_evidence_scope ON task_admission_evidence(scope_id,operation,gate,version DESC);

CREATE FUNCTION task_admission_source(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('risk',task_risk_current(t),'riskVersion',task_risk_version(t),
 'scope',s.id,'epoch',COALESCE(h.revision,0),'procedure',to_jsonb(p),'steps',(SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM procedure_steps x WHERE procedure_id=s.procedure_id),
 'links',(SELECT jsonb_agg(to_jsonb(x) ORDER BY application_id,procedure_id) FROM application_procedures x WHERE procedure_id=s.procedure_id),
 'target',to_jsonb(target),'release',to_jsonb(release))::text,'UTF8')),'hex')
 FROM task_admission_scopes s JOIN procedures p ON p.id=s.procedure_id
 JOIN company_records target ON target.id=s.target_id JOIN company_records release ON release.id=s.release_id
 LEFT JOIN task_admission_heads h ON h.task_id=s.task_id WHERE s.task_id=t ORDER BY s.version DESC LIMIT 1
$$;
CREATE FUNCTION task_admission_required(t UUID) RETURNS TEXT[] LANGUAGE plpgsql STABLE AS $$
DECLARE level TEXT; s task_admission_scopes;
BEGIN
 SELECT result->>'level' INTO level FROM task_risk_assessments WHERE sources @> jsonb_build_array(jsonb_build_object('taskId',t)) ORDER BY sequence DESC LIMIT 1;
 SELECT * INTO s FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 IF level IS NULL OR s.id IS NULL THEN RETURN NULL; END IF;
 IF level='critical' OR s.input->>'taskType'='migration' AND s.input->>'environment'='production' AND s.input->>'destructive'='true' THEN
  RETURN ARRAY['procedure','extended_review','mandate','backup','restore_plan','owner_approval'];
 ELSIF level='high' THEN RETURN ARRAY['procedure','extended_review','mandate'];
 ELSIF level IN ('low','medium') THEN RETURN ARRAY['procedure']; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION task_admission_dependencies(t UUID,op TEXT,g TEXT) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(jsonb_build_object('gate',x.gate,'id',x.id) ORDER BY x.gate)::text,'[]'),'UTF8')),'hex')
 FROM (SELECT DISTINCT ON(gate) gate,id FROM task_admission_evidence WHERE task_id=t AND operation=op
  AND array_position(ARRAY['procedure','extended_review','mandate','backup','restore_plan','owner_approval'],gate)<array_position(ARRAY['procedure','extended_review','mandate','backup','restore_plan','owner_approval'],g)
  ORDER BY gate,version DESC) x
$$;
CREATE FUNCTION task_admission_independent(t UUID,u UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM task_risk_scopes WHERE task_id=t AND actor_user_id=u)
 AND NOT EXISTS(SELECT 1 FROM task_admission_scopes WHERE task_id=t AND actor_user_id=u)
 AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=t AND (execution_role_provenance->'authors' @> jsonb_build_array(jsonb_build_object('kind','user','id',u::text))
  OR execution_readiness->>'requestedById'=u::text))
 AND NOT EXISTS(SELECT 1 FROM tasks x JOIN workforce_entities w ON w.id=x.assigned_workforce_entity_id WHERE x.id=t AND w.source='user' AND w.external_id=u::text)
$$;
CREATE FUNCTION task_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE s task_admission_scopes; e task_admission_evidence; p procedures; g TEXT; required TEXT[]; state TEXT; gates JSONB:='[]'; expires TIMESTAMPTZ:=now()+interval '24 hours'; expiry TIMESTAMPTZ; ok BOOLEAN:=true; ids JSONB:='[]'; member_role TEXT; risk_id UUID; source_version TEXT;
BEGIN
 SELECT * INTO s FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 required:=task_admission_required(t);
 IF s.id IS NULL OR required IS NULL OR op NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') THEN
  RETURN jsonb_build_object('policy','roost-native-risk-admission-v1','status','blocked','reason','risk_or_scope_required','gates','[]'::jsonb,'seal',NULL);
 END IF;
 SELECT * INTO p FROM procedures WHERE id=s.procedure_id AND workspace_id=s.workspace_id AND status='active';
 risk_id:=task_risk_current(t); source_version:=task_admission_source(t);
 IF risk_id IS NULL THEN ok:=false; END IF;
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM procedure_steps WHERE procedure_id=s.procedure_id AND length(trim(instruction))>=3)
  OR NOT EXISTS(SELECT 1 FROM application_procedures WHERE application_id=s.application_id AND procedure_id=s.procedure_id)
  OR EXISTS(SELECT 1 FROM company_records WHERE id IN (s.target_id,s.release_id) AND (workspace_id<>s.workspace_id OR application_id IS DISTINCT FROM s.application_id OR status='archived')) THEN ok:=false; END IF;
 SELECT least(expires,created_at+interval '24 hours') INTO expires FROM task_risk_assessments WHERE id=risk_id;
 FOREACH g IN ARRAY required LOOP
  expiry:=NULL;
  SELECT * INTO e FROM task_admission_evidence WHERE task_id=t AND operation=op AND gate=g ORDER BY version DESC LIMIT 1;
  state:='required';
  IF e.id IS NOT NULL THEN
   expiry:=e.created_at+CASE WHEN g='owner_approval' THEN interval '15 minutes' WHEN g IN ('backup','restore_plan') THEN interval '1 hour' ELSE interval '24 hours' END;
   IF g='backup' THEN expiry:=least(expiry,(e.detail->'artifact'->>'capturedAt')::timestamptz+interval '1 hour'); END IF;
   SELECT role::text INTO member_role FROM workspace_memberships WHERE workspace_id=s.workspace_id AND user_id=e.actor_user_id;
   state:=CASE WHEN e.scope_id<>s.id OR e.source_version IS DISTINCT FROM source_version
    OR e.dependency_version IS DISTINCT FROM task_admission_dependencies(t,op,g) OR expiry<=now()
    OR member_role IS NULL OR member_role NOT IN ('owner','admin','member')
    OR g IN ('mandate','owner_approval') AND member_role<>'owner'
    OR g IN ('extended_review','backup') AND NOT task_admission_independent(t,e.actor_user_id)
    OR NOT EXISTS(SELECT 1 FROM company_records c WHERE c.id=e.evidence_id AND c.workspace_id=s.workspace_id AND (c.application_id IS NULL OR c.application_id=s.application_id) AND c.status<>'archived' AND c.updated_at=e.evidence_revision)
    THEN 'stale' WHEN e.verdict='failed' THEN 'failed' ELSE 'present' END;
   expires:=least(expires,expiry); ids:=ids||jsonb_build_array(e.id);
  END IF;
  IF state<>'present' THEN ok:=false; END IF;
  gates:=gates||jsonb_build_array(jsonb_build_object('gate',g,'status',state,'evidenceId',e.id,'referenceId',e.evidence_id,'issuerId',e.actor_user_id,'version',e.version,'createdAt',e.created_at,'expiresAt',expiry,'detail',e.detail));
 END LOOP;
 RETURN jsonb_build_object('policy','roost-native-risk-admission-v1','status',CASE WHEN ok THEN 'admitted' ELSE 'blocked' END,
  'reason',CASE WHEN risk_id IS NULL THEN 'current_risk_required' WHEN p.id IS NULL THEN 'active_procedure_required' ELSE 'required_evidence' END,'scopeId',s.id,'commit',s.input->>'commit','gates',gates,'expiresAt',expires,
  'seal',CASE WHEN ok THEN encode(sha256(convert_to(source_version||op||ids::text,'UTF8')),'hex') ELSE NULL END);
END $$;
CREATE FUNCTION task_admission_seal(t UUID,op TEXT) RETURNS TEXT LANGUAGE SQL STABLE AS $$ SELECT task_admission_view(t,op)->>'seal' $$;

CREATE FUNCTION task_admission_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE s task_admission_scopes; t tasks; role TEXT; risk_scope task_risk_scopes; field TEXT;
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 NEW.created_at:=now();
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 SELECT m.role::text INTO role FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id;
 IF t.id IS NULL OR role IS NULL OR role NOT IN ('owner','admin','member') THEN RAISE EXCEPTION 'risk_admission_forbidden'; END IF;
 IF TG_TABLE_NAME='task_admission_scopes' THEN
  SELECT * INTO risk_scope FROM task_risk_scopes WHERE task_id=NEW.task_id ORDER BY version DESC LIMIT 1;
  IF task_risk_current(t.id) IS NULL OR risk_scope.application_id IS DISTINCT FROM NEW.application_id
   OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_admission_scopes WHERE task_id=t.id)
   OR COALESCE(NEW.input->>'taskType','') NOT IN ('code_change','maintenance','migration','review')
   OR COALESCE(NEW.input->>'environment','') NOT IN ('development','staging','production')
   OR COALESCE(NEW.input->>'commit','') !~ '^[a-f0-9]{40}$' OR jsonb_typeof(NEW.input->'destructive') IS DISTINCT FROM 'boolean'
   OR NOT EXISTS(SELECT 1 FROM procedures WHERE id=NEW.procedure_id AND workspace_id=NEW.workspace_id AND status='active')
   OR NOT EXISTS(SELECT 1 FROM procedure_steps WHERE procedure_id=NEW.procedure_id AND length(trim(instruction))>=3)
   OR NOT EXISTS(SELECT 1 FROM procedures p WHERE p.id=NEW.procedure_id AND risk_scope.input->'contract'->'procedures'->'items' @> jsonb_build_array(jsonb_build_object('id',p.id::text,'revision',p.version::text)))
   OR NOT EXISTS(SELECT 1 FROM application_procedures WHERE application_id=NEW.application_id AND procedure_id=NEW.procedure_id)
   OR (SELECT count(*) FROM company_records WHERE id IN (NEW.target_id,NEW.release_id) AND workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND status<>'archived')<>(CASE WHEN NEW.target_id=NEW.release_id THEN 1 ELSE 2 END)
   THEN RAISE EXCEPTION 'risk_admission_scope_invalid'; END IF;
 ELSE
  SELECT * INTO s FROM task_admission_scopes WHERE task_id=t.id ORDER BY version DESC LIMIT 1;
  IF s.id IS NULL OR NEW.scope_id<>s.id OR task_risk_current(t.id) IS NULL OR NEW.source_version IS DISTINCT FROM task_admission_source(t.id)
   OR NEW.dependency_version IS DISTINCT FROM task_admission_dependencies(t.id,NEW.operation,NEW.gate)
   OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_admission_evidence WHERE task_id=t.id AND operation=NEW.operation AND gate=NEW.gate)
   OR NOT NEW.gate=ANY(task_admission_required(t.id)) THEN RAISE EXCEPTION 'risk_admission_stale'; END IF;
  IF NEW.gate IN ('mandate','owner_approval') AND role<>'owner' OR NEW.gate IN ('extended_review','backup') AND NOT task_admission_independent(t.id,NEW.actor_user_id) THEN RAISE EXCEPTION 'risk_admission_independent_authority_required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM company_records c WHERE c.id=NEW.evidence_id AND c.workspace_id=NEW.workspace_id AND (c.application_id IS NULL OR c.application_id=s.application_id) AND c.status<>'archived' AND c.updated_at=NEW.evidence_revision AND length(trim(COALESCE(c.description,c.business_purpose,c.desired_state,c.expected_behavior,'')))>=3) THEN RAISE EXCEPTION 'risk_admission_evidence_stale'; END IF;
  FOREACH field IN ARRAY (CASE NEW.gate
   WHEN 'procedure' THEN ARRAY['rationale','validation','observedResult'] WHEN 'extended_review' THEN ARRAY['rationale','security','data','reversibility','tests']
   WHEN 'mandate' THEN ARRAY['rationale','decision','allowedScope','exclusions'] WHEN 'backup' THEN ARRAY['rationale','validation','observedResult']
   WHEN 'restore_plan' THEN ARRAY['rationale','restoreProcedure','validation','expectedResult','prerequisites'] ELSE ARRAY['rationale','residualRisk'] END) LOOP
   IF length(trim(COALESCE(NEW.detail->>field,'')))<3 THEN RAISE EXCEPTION 'risk_admission_evidence_invalid'; END IF;
  END LOOP;
  IF NEW.gate='extended_review' AND (jsonb_typeof(NEW.detail->'unresolvedFindings') IS DISTINCT FROM 'array' OR NEW.verdict='passed' AND jsonb_array_length(NEW.detail->'unresolvedFindings')<>0) THEN RAISE EXCEPTION 'risk_admission_review_failed'; END IF;
  IF NEW.gate='backup' AND (COALESCE(NEW.detail->'artifact'->>'digest','') !~ '^[a-f0-9]{64}$' OR COALESCE((NEW.detail->'artifact'->>'bytes')::numeric,0)<=0 OR length(COALESCE(NEW.detail->'artifact'->>'reference',''))<3
   OR (NEW.detail->'artifact'->>'capturedAt') IS NULL OR (NEW.detail->'artifact'->>'capturedAt')::timestamptz NOT BETWEEN now()-interval '1 hour' AND now()) THEN RAISE EXCEPTION 'risk_admission_backup_invalid'; END IF;
  IF NEW.gate='owner_approval' AND (NEW.detail->>'decision' IS DISTINCT FROM 'approve_exact_operation' OR EXISTS(SELECT 1 FROM jsonb_array_elements(task_admission_view(t.id,NEW.operation)->'gates') x WHERE x->>'gate'<>'owner_approval' AND x->>'status'<>'present')) THEN RAISE EXCEPTION 'risk_admission_prerequisites_required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION task_admission_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'risk_admission_history_immutable'; END $$;
CREATE TRIGGER task_admission_insert BEFORE INSERT ON task_admission_scopes FOR EACH ROW EXECUTE FUNCTION task_admission_insert_guard();
CREATE TRIGGER task_admission_insert BEFORE INSERT ON task_admission_evidence FOR EACH ROW EXECUTE FUNCTION task_admission_insert_guard();
CREATE TRIGGER task_admission_immutable BEFORE UPDATE OR DELETE ON task_admission_scopes FOR EACH ROW EXECUTE FUNCTION task_admission_immutable();
CREATE TRIGGER task_admission_immutable BEFORE UPDATE OR DELETE ON task_admission_evidence FOR EACH ROW EXECUTE FUNCTION task_admission_immutable();

CREATE FUNCTION task_admission_invalidate() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE b JSONB; a JSONB; s task_admission_scopes; candidate UUID;
BEGIN
 IF TG_OP<>'INSERT' THEN b:=to_jsonb(OLD); END IF; IF TG_OP<>'DELETE' THEN a:=to_jsonb(NEW); END IF;
 IF b IS NOT DISTINCT FROM a THEN RETURN NULL; END IF;
 -- Exact-reference watches retain a monotonic epoch even after source reverts.
 FOR s IN SELECT DISTINCT ON(task_id) x.* FROM task_admission_scopes x WHERE
  TG_TABLE_NAME IN ('task_admission_scopes','task_admission_evidence','task_risk_scopes') AND x.task_id::text=COALESCE(a->>'task_id',b->>'task_id')
  OR TG_TABLE_NAME='task_risk_assessments' AND (a->'sources' @> jsonb_build_array(jsonb_build_object('taskId',x.task_id)))
  OR TG_TABLE_NAME='procedures' AND x.procedure_id::text=COALESCE(a->>'id',b->>'id')
  OR TG_TABLE_NAME IN ('procedure_steps','application_procedures') AND x.procedure_id::text IN(a->>'procedure_id',b->>'procedure_id')
  OR TG_TABLE_NAME='workspace_memberships' AND x.workspace_id::text IN(a->>'workspace_id',b->>'workspace_id')
  OR TG_TABLE_NAME='company_records' AND (COALESCE(a->>'id',b->>'id') IN(x.target_id::text,x.release_id::text)
    OR EXISTS(SELECT 1 FROM task_admission_evidence e WHERE e.task_id=x.task_id AND e.evidence_id::text=COALESCE(a->>'id',b->>'id')))
  ORDER BY task_id,version DESC LOOP
  IF TG_TABLE_NAME='procedures' AND COALESCE(a->>'id',b->>'id')=s.procedure_id::text
   OR TG_TABLE_NAME IN ('procedure_steps','application_procedures') AND s.procedure_id::text IN (a->>'procedure_id',b->>'procedure_id')
   OR TG_TABLE_NAME='company_records' AND (COALESCE(a->>'id',b->>'id') IN (s.target_id::text,s.release_id::text) OR EXISTS(SELECT 1 FROM task_admission_evidence e WHERE e.task_id=s.task_id AND e.evidence_id::text=COALESCE(a->>'id',b->>'id')))
   OR TG_TABLE_NAME='workspace_memberships' AND s.workspace_id::text IN(a->>'workspace_id',b->>'workspace_id') THEN
   INSERT INTO task_admission_heads(task_id,revision) VALUES(s.task_id,1) ON CONFLICT(task_id) DO UPDATE SET revision=task_admission_heads.revision+1;
  END IF;
  IF EXISTS(SELECT 1 FROM tasks WHERE id=s.task_id AND execution_readiness->>'status'='ready' AND execution_readiness->>'riskAdmissionSeal' IS DISTINCT FROM task_admission_seal(s.task_id,'runtime_execute')) THEN
   UPDATE tasks SET execution_readiness=execution_readiness||jsonb_build_object('status','needs_revalidation','reason','risk_admission_changed','invalidatedAt',now()) WHERE id=s.task_id AND execution_readiness->>'status'='ready';
  END IF;
 END LOOP;
 RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN
 FOREACH tbl IN ARRAY ARRAY['procedures','procedure_steps','application_procedures','company_records','workspace_memberships','task_admission_scopes','task_admission_evidence','task_risk_scopes','task_risk_assessments'] LOOP
  EXECUTE format('CREATE TRIGGER task_admission_invalidate AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION task_admission_invalidate()',tbl);
 END LOOP;
END $$;

CREATE FUNCTION task_admission_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seal TEXT; pin JSONB; t UUID; op TEXT;
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF TG_TABLE_NAME='tasks' THEN
  IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
  t:=NEW.id; op:='runtime_execute'; pin:=NEW.execution_readiness;
  IF EXISTS(SELECT 1 FROM task_admission_evidence e WHERE e.task_id=t AND e.operation=op AND e.gate IN ('extended_review','backup') AND e.actor_user_id::text=pin->>'requestedById') THEN RAISE EXCEPTION 'risk_admission_self_review'; END IF;
 ELSIF TG_TABLE_NAME='agent_executions' THEN
  IF TG_OP='UPDATE' AND OLD.status::text IN ('completed','failed','cancelled') AND NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text NOT IN ('queued','claimed','running','waiting_for_approval','completed') OR NEW.cancel_requested_at IS NOT NULL OR NEW.context_invalidated_at IS NOT NULL OR TG_OP='UPDATE' AND OLD.context_invalidated_at IS NOT NULL THEN RETURN NEW; END IF;
  t:=NEW.task_id; op:='runtime_execute'; SELECT execution_readiness INTO pin FROM tasks WHERE id=t;
 ELSE
  t:=NEW.task_id;
  IF TG_TABLE_NAME='task_capability_grants' THEN op:=NEW.operation;
  ELSIF TG_TABLE_NAME='task_review_decisions' THEN op:='review_decision'; ELSE op:=NEW.action; END IF;
 END IF;
 seal:=task_admission_seal(t,op);
 IF seal IS NULL OR pin IS NOT NULL AND pin->>'riskAdmissionSeal' IS DISTINCT FROM seal THEN RAISE EXCEPTION 'risk_admission_required'; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN
 FOREACH tbl IN ARRAY ARRAY['tasks','agent_executions'] LOOP
  EXECUTE format('CREATE TRIGGER task_admission_guard BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION task_admission_guard()',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['task_capability_grants','task_review_decisions','task_review_actions'] LOOP
  EXECUTE format('CREATE TRIGGER task_admission_guard BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION task_admission_guard()',tbl);
 END LOOP;
END $$;
ALTER FUNCTION task_capability_scope(UUID,UUID,UUID) RENAME TO task_capability_scope_before_admission;
CREATE FUNCTION task_capability_scope(t UUID,k UUID,u UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(task_capability_scope_before_admission(t,k,u)||COALESCE(task_admission_source(t),'missing')||
  COALESCE((SELECT jsonb_agg(id ORDER BY operation,gate,version)::text FROM task_admission_evidence WHERE task_id=t),'[]'),'UTF8')),'hex')
$$;
ALTER FUNCTION task_capability_status(task_capability_grants) RENAME TO task_capability_status_before_admission;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN 'consumed'
 WHEN task_admission_seal(g.task_id,g.operation) IS NULL THEN 'invalidated' ELSE task_capability_status_before_admission(g) END
$$;
COMMIT;
