BEGIN;
-- Additive, empty history. Existing context seals retain their representation
-- until a task explicitly selects one of the new exact handoff operations.
ALTER TABLE task_admission_evidence DROP CONSTRAINT task_admission_evidence_operation_check;
ALTER TABLE task_admission_evidence ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject'));
ALTER TABLE native_capability_suspensions DROP CONSTRAINT native_capability_suspensions_operation_check;
ALTER TABLE native_capability_suspensions ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject'));
ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_operation_check;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject'));
CREATE OR REPLACE FUNCTION procedure_contract_shape(b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE f TEXT; s JSONB; seen TEXT[]:='{}'; roles TEXT[]:=ARRAY['requester','accountableManager','executor','verifier','releaser'];
BEGIN
 IF jsonb_typeof(b)<>'object' OR octet_length(b::text)>60000 OR COALESCE(b->>'kind','') NOT IN ('base','extension')
 OR COALESCE(b->>'taskType','') NOT IN ('code_change','maintenance','migration','review')
 OR COALESCE(b->>'operation','') NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject')
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(b) k WHERE k NOT IN ('kind','taskType','operation','applicationId','componentId','baseProcedureId','inputs','outputs','evidence','completion','roles','tools','steps')) THEN RETURN false; END IF;
 FOREACH f IN ARRAY ARRAY['inputs','outputs','evidence','completion','roles','tools','steps'] LOOP
  IF jsonb_typeof(b->f) IS DISTINCT FROM 'array' OR jsonb_array_length(b->f)>(CASE WHEN f='steps' THEN 50 WHEN f='roles' THEN 5 ELSE 30 END) THEN RETURN false; END IF;
  IF f<>'steps' AND EXISTS(SELECT 1 FROM jsonb_array_elements(b->f) x WHERE jsonb_typeof(x)<>'string' OR length(x#>>'{}')>2000 OR length(trim(x#>>'{}'))<1) THEN RETURN false; END IF;
  IF f<>'steps' AND (SELECT count(*)<>count(DISTINCT x) FROM jsonb_array_elements(b->f) x) THEN RETURN false; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(b->'roles') r WHERE NOT r=ANY(roles)) THEN RETURN false; END IF;
 IF b->>'kind'='base' AND (b->>'applicationId' IS NOT NULL OR b->>'componentId' IS NOT NULL OR b->>'baseProcedureId' IS NOT NULL OR NOT b->'roles' @> to_jsonb(roles)
  OR EXISTS(SELECT 1 FROM unnest(ARRAY['steps','inputs','outputs','evidence','completion']) field_name WHERE jsonb_array_length(b->field_name)=0)) THEN RETURN false; END IF;
 IF b->>'kind'='extension' AND (b->>'applicationId' IS NULL OR b->>'componentId' IS NULL OR b->>'baseProcedureId' IS NULL) THEN RETURN false; END IF;
 FOR s IN SELECT * FROM jsonb_array_elements(b->'steps') LOOP
  IF jsonb_typeof(s)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(s) k WHERE k NOT IN ('key','instruction','role','tools','inputs','outputs','evidence','requires'))
   OR COALESCE(s->>'key','') !~ '^[a-z][a-z0-9_-]{0,63}$' OR s->>'key'=ANY(seen) OR length(trim(COALESCE(s->>'instruction','')))<3
   OR NOT b->'roles' @> jsonb_build_array(s->>'role') THEN RETURN false; END IF;
  FOREACH f IN ARRAY ARRAY['tools','inputs','outputs','evidence','requires'] LOOP
   IF jsonb_typeof(s->f) IS DISTINCT FROM 'array' OR jsonb_array_length(s->f)>50
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(s->f) x WHERE jsonb_typeof(x)<>'string' OR length(x#>>'{}')>2000 OR length(trim(x#>>'{}'))<1) THEN RETURN false; END IF;
  END LOOP;
  IF NOT (b->'tools') @> (s->'tools') OR s->'requires' @> jsonb_build_array(s->>'key') OR
   b->>'kind'='base' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(s->'requires') r WHERE NOT r=ANY(seen)) THEN RETURN false; END IF;
  seen:=array_append(seen,s->>'key');
 END LOOP;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION procedure_composition_insert() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE role TEXT; scope task_admission_scopes; view JSONB; v procedure_contract_versions; n INT;
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1; NEW.created_at:=now();
 SELECT m.role::text INTO role FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id;
 IF role IS NULL OR role NOT IN ('owner','admin','member') OR length(trim(NEW.rationale))<3 OR length(NEW.rationale)>2000 THEN RAISE EXCEPTION 'procedure_composition_forbidden'; END IF;
 IF TG_TABLE_NAME='procedure_contract_versions' THEN
  IF role<>'owner' OR NOT procedure_contract_shape(NEW.body) OR NOT EXISTS(SELECT 1 FROM procedures WHERE id=NEW.procedure_id AND workspace_id=NEW.workspace_id AND status='active')
   OR NEW.source_version IS DISTINCT FROM procedure_contract_source(NEW.procedure_id)
   OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM procedure_contract_versions WHERE procedure_id=NEW.procedure_id)
   OR NEW.body->>'kind'='extension' AND (NEW.body->>'baseProcedureId'=NEW.procedure_id::text
    OR NOT EXISTS(SELECT 1 FROM procedures WHERE id::text=NEW.body->>'baseProcedureId' AND workspace_id=NEW.workspace_id)
    OR NOT EXISTS(SELECT 1 FROM application_architecture_components c JOIN applications a ON a.id=c.application_id WHERE c.id::text=NEW.body->>'componentId' AND c.application_id::text=NEW.body->>'applicationId' AND a.workspace_id=NEW.workspace_id AND c.status='active'))
   THEN RAISE EXCEPTION 'procedure_composition_contract_invalid'; END IF;
 ELSIF TG_TABLE_NAME='procedure_contract_withdrawals' THEN
  SELECT * INTO v FROM procedure_contract_versions WHERE id=NEW.version_id;
  IF role<>'owner' OR v.workspace_id IS DISTINCT FROM NEW.workspace_id THEN RAISE EXCEPTION 'procedure_composition_forbidden'; END IF;
 ELSE
  IF NEW.operation NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject') OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id)
   THEN RAISE EXCEPTION 'procedure_composition_scope_invalid'; END IF;
  IF EXISTS(SELECT 1 FROM agent_executions WHERE task_id=NEW.task_id AND status::text IN ('queued','claimed','running','waiting_for_approval')) THEN RAISE EXCEPTION 'procedure_composition_active'; END IF;
  SELECT * INTO scope FROM task_admission_scopes WHERE task_id=NEW.task_id ORDER BY version DESC LIMIT 1;
  IF TG_TABLE_NAME='task_composition_selections' THEN
   IF NEW.scope_id IS DISTINCT FROM scope.id OR scope.id IS NULL
    OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_composition_selections WHERE task_id=NEW.task_id AND operation=NEW.operation)
    OR EXISTS(SELECT 1 FROM unnest(ARRAY[NEW.base_procedure_id,NEW.extension_procedure_id]) p WHERE p IS NOT NULL AND NOT EXISTS(SELECT 1 FROM procedures WHERE id=p AND workspace_id=NEW.workspace_id))
    OR NEW.base_procedure_id=NEW.extension_procedure_id THEN RAISE EXCEPTION 'procedure_composition_scope_invalid'; END IF;
  ELSE
   view:=task_composition(NEW.task_id,NEW.operation,false,false);
   IF role<>'owner' OR NOT task_admission_independent(NEW.task_id,NEW.actor_user_id)
    OR EXISTS(SELECT 1 FROM task_composition_selections WHERE id=NEW.selection_id AND actor_user_id=NEW.actor_user_id)
    OR NEW.selection_id::text IS DISTINCT FROM view->>'selectionId' OR NEW.anchor IS DISTINCT FROM view->>'anchor'
    OR NOT view->'missing' @> jsonb_build_array(NEW.missing) OR view->'missing' @> '"risk"'::jsonb OR view->'missing' @> '"selection"'::jsonb OR view->'conflicts'<>'[]'::jsonb
    OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_composition_exceptions WHERE task_id=NEW.task_id AND operation=NEW.operation AND missing=NEW.missing)
    THEN RAISE EXCEPTION 'procedure_composition_exception_invalid'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION task_admission_view_before_composition(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE s task_admission_scopes; e task_admission_evidence; p procedures; g TEXT; required TEXT[]; state TEXT; gates JSONB:='[]'; expires TIMESTAMPTZ:=now()+interval '24 hours'; expiry TIMESTAMPTZ; ok BOOLEAN:=true; ids JSONB:='[]'; member_role TEXT; risk_id UUID; source_version TEXT;
BEGIN
 SELECT * INTO s FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 required:=task_admission_required(t);
 IF s.id IS NULL OR required IS NULL OR op NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject') THEN
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
CREATE OR REPLACE FUNCTION task_risk_sources(target UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT jsonb_agg(source||jsonb_build_object('compositionRefs',
  (SELECT jsonb_object_agg(op,task_composition_refs((source->>'taskId')::uuid,op)) FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=(source->>'taskId')::uuid AND hs.operation=op))) ORDER BY source->>'taskId')
 FROM jsonb_array_elements(task_risk_sources_before_composition(target)) source
$$;
CREATE OR REPLACE FUNCTION task_admission_source(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 WITH refs AS MATERIALIZED (SELECT op,task_composition_refs(t,op) AS value FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=t AND hs.operation=op)),
 versions AS (SELECT v.* FROM procedure_contract_versions v WHERE EXISTS(SELECT 1 FROM refs WHERE v.id::text IN(value->>'base',value->>'extension')))
 SELECT encode(sha256(convert_to(task_admission_source_before_composition(t)||jsonb_build_object(
  'refs',(SELECT jsonb_agg(to_jsonb(refs) ORDER BY op) FROM refs),
  'selections',(SELECT jsonb_agg(to_jsonb(s) ORDER BY operation) FROM (SELECT DISTINCT ON(operation) * FROM task_composition_selections WHERE task_id=t ORDER BY operation,version DESC) s),
  'validity',(SELECT jsonb_agg(jsonb_build_object('id',v.id,'valid',procedure_contract_valid(v::procedure_contract_versions),'source',procedure_contract_source(v.procedure_id)) ORDER BY v.id) FROM versions v),
  'exceptions',(SELECT jsonb_agg(to_jsonb(e) ORDER BY operation,missing,version) FROM (SELECT DISTINCT ON(operation,missing) * FROM task_composition_exceptions WHERE task_id=t ORDER BY operation,missing,version DESC) e))::text,'UTF8')),'hex')
$$;

CREATE TABLE task_handoffs (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE RESTRICT,
 version INT NOT NULL CHECK(version>0), supersedes UUID UNIQUE REFERENCES task_handoffs(id) ON DELETE RESTRICT,
 source_version TEXT NOT NULL, source JSONB NOT NULL, content JSONB NOT NULL,
 sender_role TEXT NOT NULL, recipient_role TEXT NOT NULL, sender JSONB NOT NULL, recipient JSONB NOT NULL,
 actor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT, actor_agent_id UUID REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 actor_credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT, actor_credential_prefix TEXT,
 capability_grant_id UUID UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(task_id,version), UNIQUE(workspace_id,request_id), CHECK(sender<>recipient),
 CHECK((actor_user_id IS NULL)<>(actor_agent_id IS NULL)), CHECK((actor_agent_id IS NULL)=(actor_credential_id IS NULL))
);
CREATE TABLE task_handoff_decisions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, handoff_id UUID NOT NULL UNIQUE REFERENCES task_handoffs(id) ON DELETE RESTRICT,
 version INT NOT NULL DEFAULT 1 CHECK(version=1), handoff_version INT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('accept','reject')), detail JSONB NOT NULL,
 actor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT, actor_agent_id UUID REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 actor_credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT, actor_credential_prefix TEXT,
 capability_grant_id UUID UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,request_id), CHECK((actor_user_id IS NULL)<>(actor_agent_id IS NULL)),
 CHECK((actor_agent_id IS NULL)=(actor_credential_id IS NULL))
);
CREATE INDEX task_handoff_history ON task_handoffs(workspace_id,task_id,version DESC);
ALTER TABLE task_capability_uses ADD COLUMN handoff_id UUID UNIQUE REFERENCES task_handoffs(id) ON DELETE RESTRICT;
ALTER TABLE task_capability_uses ADD COLUMN handoff_decision_id UUID UNIQUE REFERENCES task_handoff_decisions(id) ON DELETE RESTRICT;
ALTER TABLE task_capability_uses DROP CONSTRAINT task_capability_uses_check;
ALTER TABLE task_capability_uses ADD CHECK(num_nonnulls(decision_id,action_id,handoff_id,handoff_decision_id)=1);

CREATE FUNCTION task_handoff_principal(t UUID, role_name TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
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
 IF role_name IN ('executor','verifier') AND NOT w.skill_index @> (task.execution_readiness->'contract'->'assignment'->'competencies') THEN RETURN NULL; END IF;
 IF w.type='agent' AND w.source<>'user' THEN RETURN jsonb_build_object('kind','agent','id',w.id); END IF;
 IF w.type='human' AND w.source='user' AND EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=task.workspace_id AND user_id::text=w.external_id AND role IN ('owner','admin','member')) THEN RETURN jsonb_build_object('kind','user','id',w.external_id); END IF;
 RETURN NULL;
END $$;
-- A server-resolved receipt of existing reports and evidence. It never asserts
-- that a Git object or test was independently observed by this API.
CREATE TABLE task_handoff_result_revisions (
 task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE RESTRICT, revision BIGINT NOT NULL DEFAULT 0
);
CREATE FUNCTION task_handoff_result_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF task_review_material(OLD) IS DISTINCT FROM task_review_material(NEW) OR OLD.metadata->'resultRevision' IS DISTINCT FROM NEW.metadata->'resultRevision' OR OLD.checkpoint IS DISTINCT FROM NEW.checkpoint OR OLD.status IS DISTINCT FROM NEW.status OR OLD.context_invalidated_at IS DISTINCT FROM NEW.context_invalidated_at THEN
  INSERT INTO task_handoff_result_revisions(task_id,revision) VALUES(NEW.task_id,1) ON CONFLICT(task_id) DO UPDATE SET revision=task_handoff_result_revisions.revision+1;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER task_handoff_result_changed AFTER UPDATE ON agent_executions FOR EACH ROW EXECUTE FUNCTION task_handoff_result_changed();
CREATE FUNCTION task_handoff_tests(e agent_executions) RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE commands JSONB:='[]'; item JSONB; position INT:=0;
BEGIN
 IF length(e.verification::text)>60000 THEN RETURN NULL; END IF;
 IF jsonb_typeof(e.verification->'commands')='array' THEN
  IF jsonb_array_length(e.verification->'commands')>200 THEN RETURN NULL; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(e.verification->'commands') LOOP
   IF jsonb_typeof(item->'command') IS DISTINCT FROM 'string' OR length(trim(item->>'command')) NOT BETWEEN 1 AND 2000 OR COALESCE(item->>'status','') NOT IN ('completed','failed')
    OR item->'exitCode' IS NOT NULL AND item->'exitCode'<>'null'::jsonb AND (jsonb_typeof(item->'exitCode')<>'number' OR (item->>'exitCode')!~ '^-?[0-9]+$') THEN RETURN NULL; END IF;
   commands:=commands||jsonb_build_array(jsonb_build_object('index',position,'command',item->>'command','reportedStatus',item->>'status','exitCode',item->'exitCode'));
   position:=position+1;
  END LOOP;
 ELSIF jsonb_typeof(e.verification->'command')='string' AND jsonb_typeof(e.verification->'result')='string' AND length(trim(e.verification->>'command')) BETWEEN 1 AND 2000 AND length(trim(e.verification->>'result')) BETWEEN 1 AND 2000 THEN
  commands:=jsonb_build_array(jsonb_build_object('index',0,'command',e.verification->>'command','reportedStatus','reported','reportedResult',e.verification->>'result'));
 ELSE RETURN NULL; END IF;
 RETURN jsonb_build_object('kind','execution_verification','executionId',e.id,'revision',encode(sha256(convert_to(e.verification::text,'UTF8')),'hex'),
  'state',CASE WHEN jsonb_array_length(commands)=0 THEN 'not_recorded' ELSE 'reported' END,'commands',commands);
END $$;
CREATE FUNCTION task_handoff_paths_valid(paths JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF jsonb_typeof(paths) IS DISTINCT FROM 'array' OR length(paths::text)>60000 THEN RETURN false; END IF;
 IF jsonb_array_length(paths)>2000 OR EXISTS(SELECT 1 FROM jsonb_array_elements(paths) p WHERE jsonb_typeof(p)<>'string' OR length(trim(p#>>'{}')) NOT BETWEEN 1 AND 1000) THEN RETURN false; END IF;
 RETURN true;
END $$;
CREATE FUNCTION task_handoff_source(t UUID) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE task tasks; e agent_executions; pin JSONB; admission JSONB; roles JSONB; result_ref JSONB; op TEXT;
BEGIN
 SELECT * INTO task FROM tasks WHERE id=t;
 SELECT * INTO e FROM agent_executions WHERE task_id=t AND workspace_id=task.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1;
 pin:=task.execution_readiness; admission:=task_admission_view(t,'runtime_execute'); result_ref:=e.metadata->'resultRevision';
 IF task.status NOT IN ('todo','in_progress') OR e.id IS NULL OR e.status<>'completed' OR e.completed_at IS NULL OR e.cancel_requested_at IS NOT NULL OR e.context_invalidated_at IS NOT NULL
  OR pin->>'status' IS DISTINCT FROM 'ready' OR pin->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId'
  OR pin->>'revision' IS DISTINCT FROM e.metadata->'readyContextPin'->>'revision'
  OR pin->>'riskAdmissionSeal' IS DISTINCT FROM admission->>'seal' OR admission->>'seal' IS NULL
  OR pin->>'riskAdmissionCommit' IS DISTINCT FROM e.metadata->'readyContextPin'->>'riskAdmissionCommit'
  OR pin->'procedureComposition'->>'seal' IS DISTINCT FROM e.metadata->'readyContextPin'->>'compositionSeal'
  OR pin->'contract' IS DISTINCT FROM e.metadata->'executionContract'
  OR e.checkpoint->>'schemaVersion' IS DISTINCT FROM 'roost-recovery-v1' OR COALESCE(e.checkpoint->>'stage','') NOT IN ('prepared','spawn_intent','running','effect_possible')
  OR COALESCE(e.checkpoint->>'workspaceDigest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(e.checkpoint->>'packetRevision','') !~ '^[a-f0-9]{64}$'
  OR e.checkpoint->>'contextRevision' IS DISTINCT FROM pin->>'revision'
  OR COALESCE(admission->>'commit','') !~ '^[a-f0-9]{40}$' OR pin->'contract'->'singleTask'->>'branch' IS DISTINCT FROM 'codex/task-'||t::text
  OR result_ref->>'schemaVersion' IS DISTINCT FROM 'roost-result-revision-v1'
  OR COALESCE(result_ref->>'id','') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  OR result_ref->>'executionId' IS DISTINCT FROM e.id::text OR result_ref->'attempt' IS DISTINCT FROM to_jsonb(e.attempt)
  OR result_ref->>'hostId' IS DISTINCT FROM e.agent_host_id::text OR result_ref->'checkpointVersion' IS DISTINCT FROM to_jsonb(e.checkpoint_version)
  OR COALESCE(result_ref->>'observedAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
  OR COALESCE(result_ref->>'commit','') !~ '^[a-f0-9]{40}$' OR result_ref->>'branch' IS DISTINCT FROM pin->'contract'->'singleTask'->>'branch'
  OR COALESCE(result_ref->>'workingTree','') NOT IN ('clean','dirty')
  OR e.checkpoint_version<2 OR e.attempt<1 OR NOT task_handoff_paths_valid(e.changed_files) OR task_handoff_tests(e) IS NULL
  OR task_risk_current(t) IS NULL THEN RETURN NULL; END IF;
 SELECT jsonb_object_agg(name,task_handoff_principal(t,name)) INTO roles FROM unnest(ARRAY['requester','accountableManager','executor','verifier','releaser']) name;
 IF EXISTS(SELECT 1 FROM jsonb_each(roles) WHERE value='null'::jsonb) THEN RETURN NULL; END IF;
 IF roles->'verifier'=roles->'executor' OR roles->'releaser'=roles->'executor'
  OR task.execution_role_provenance->'authors' @> jsonb_build_array(roles->'verifier')
  OR task.execution_role_provenance->'authors' @> jsonb_build_array(roles->'releaser') THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('schemaVersion','roost-task-handoff-source-v1','workspaceId',task.workspace_id,'taskId',t,'applicationId',e.application_id,
  'resultEpoch',COALESCE((SELECT revision FROM task_handoff_result_revisions WHERE task_id=t),0),'executionId',e.id,'executionRevision',e.updated_at,'attempt',e.attempt,'materialVersion',encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex'),
  'packetRevision',e.checkpoint->>'packetRevision','checkpointVersion',e.checkpoint_version,'contextRevision',pin->>'revision','pinId',pin->>'pinId',
  'compositionSeal',pin->'procedureComposition'->>'seal','riskAssessmentId',task_risk_current(t),'riskAdmissionSeal',admission->>'seal',
  'admissionSource',task_admission_source(t),'baseCommit',admission->>'commit','commit',result_ref->>'commit','branch',result_ref->>'branch','workingTree',result_ref->>'workingTree','resultRevision',result_ref,
  'changedPaths',e.changed_files,'tests',task_handoff_tests(e),'evidence',admission->'gates','roles',roles,'roleReferences',pin->'contract'->'taskRoles',
  'mandates',(SELECT jsonb_agg(jsonb_build_object('id',id,'revision',updated_at,'authorityScope',authority_scope) ORDER BY id) FROM workforce_entities WHERE id::text IN (SELECT value->>'id' FROM jsonb_each(pin->'contract'->'taskRoles'))),
  'reviewDecision',(SELECT jsonb_build_object('id',id,'decision',decision,'materialVersion',material_version) FROM task_review_decisions WHERE execution_id=e.id),
  'taskRevision',task.updated_at);
END $$;
CREATE FUNCTION task_handoff_source_version(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(task_handoff_source(t)::text,'UTF8')),'hex')
$$;
CREATE FUNCTION task_handoff_current(h task_handoffs) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT COALESCE(h.source_version=task_handoff_source_version(h.task_id)
  AND h.sender=task_handoff_principal(h.task_id,h.sender_role) AND h.recipient=task_handoff_principal(h.task_id,h.recipient_role),false)
$$;
CREATE FUNCTION task_handoff_content_valid(c JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE field TEXT; item JSONB;
BEGIN
 IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR length(c::text)>32000 OR (SELECT count(*) FROM jsonb_object_keys(c))<>7
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(c) k WHERE k NOT IN ('outcome','decisions','changes','tests','limits','continuation','expectedAction')) THEN RETURN false; END IF;
 FOR field,item IN SELECT key,value FROM jsonb_each('{"outcome":["summary","currentState"],"decisions":["explanation"],"changes":["areas"],"tests":["assessment"],"limits":["knownLimitations","residualRisks"],"continuation":["reproduce","continue","rollback"],"expectedAction":["kind","instruction"]}'::jsonb) LOOP
  IF jsonb_typeof(c->field) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(c->field))<>jsonb_array_length(item) OR EXISTS(SELECT 1 FROM jsonb_object_keys(c->field) k WHERE NOT item ? k) THEN RETURN false; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['outcome.summary','outcome.currentState','decisions.explanation','tests.assessment','limits.knownLimitations','limits.residualRisks','continuation.reproduce','continuation.continue','continuation.rollback','expectedAction.instruction'] LOOP
  IF jsonb_typeof(c#>string_to_array(field,'.')) IS DISTINCT FROM 'string' OR length(trim(c#>>string_to_array(field,'.'))) NOT BETWEEN 3 AND 2000 THEN RETURN false; END IF;
 END LOOP;
 IF COALESCE(c->'expectedAction'->>'kind','') NOT IN ('inspect','review','continue','decide') OR jsonb_typeof(c->'changes'->'areas') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'changes'->'areas') NOT BETWEEN 1 AND 30 THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(c->'changes'->'areas') LOOP IF jsonb_typeof(item)<>'string' OR length(trim(item#>>'{}')) NOT BETWEEN 3 AND 2000 THEN RETURN false; END IF; END LOOP;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION task_capability_base_before_suspension(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; k api_keys; w workforce_entities; role_name TEXT; utc_now TIMESTAMP:=clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
 IF EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id) THEN RETURN 'revoked'; END IF;
 IF g.valid_until<=utc_now THEN RETURN 'expired'; END IF;
 SELECT * INTO t FROM tasks WHERE id=g.task_id AND workspace_id=g.workspace_id;
 IF NOT FOUND OR t.status NOT IN ('todo','in_progress') THEN RETURN 'invalidated'; END IF;
 SELECT * INTO e FROM agent_executions WHERE task_id=t.id AND workspace_id=g.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NOT FOUND OR e.id<>g.execution_id OR e.application_id<>g.application_id OR e.status<>'completed' OR e.completed_at IS NULL OR e.cancel_requested_at IS NOT NULL OR e.context_invalidated_at IS NOT NULL THEN RETURN 'invalidated'; END IF;
 IF task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id) IS NULL THEN RETURN 'invalidated'; END IF;
 SELECT * INTO k FROM api_keys WHERE id=g.credential_id AND workspace_id=g.workspace_id AND bound_agent_id=g.agent_id;
 IF NOT FOUND OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at IS NULL OR k.expires_at<=utc_now OR k.credential_version<>g.credential_version OR NOT (k.scopes @> '["agent-runtime:write"]'::jsonb) THEN RETURN 'invalidated'; END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=g.workspace_id AND user_id=g.issuer_user_id AND role IN ('owner','admin')) THEN RETURN 'invalidated'; END IF;
 role_name:=CASE WHEN g.operation LIKE 'handoff_%' THEN g.snapshot->'handoff'->>'role' WHEN g.operation='review_decision' THEN 'verifier' ELSE 'accountableManager' END;
 IF role_name IS NULL OR g.operation LIKE 'handoff_%' AND (task_admission_seal(g.task_id,g.operation) IS NULL OR g.snapshot->>'handoffSourceVersion' IS DISTINCT FROM task_handoff_source_version(g.task_id) OR task_handoff_principal(g.task_id,role_name) IS DISTINCT FROM jsonb_build_object('kind','agent','id',g.agent_id)) THEN RETURN 'invalidated'; END IF;
 SELECT * INTO w FROM workforce_entities WHERE id=g.agent_id AND workspace_id=g.workspace_id;
 IF NOT FOUND OR w.type<>'agent' OR w.status<>'active' OR w.source='user' OR w.id::text IS DISTINCT FROM e.metadata->'executionContract'->'taskRoles'->role_name->>'id' OR
  to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM e.metadata->'executionContract'->'taskRoles'->role_name->>'revision' OR
  (g.operation NOT LIKE 'handoff_%' AND NOT (w.authority_scope @> jsonb_build_array(CASE WHEN role_name='verifier' THEN 'task_verification' ELSE 'task_accountability' END))) THEN RETURN 'invalidated'; END IF;
 IF g.valid_from>utc_now THEN RETURN 'pending'; END IF;
 RETURN 'active';
END $$;

ALTER FUNCTION task_capability_status(task_capability_grants) RENAME TO task_capability_status_before_handoff;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE state TEXT; h task_handoffs; binding JSONB:=g.snapshot->'handoff';
BEGIN
 IF g.operation NOT IN ('handoff_create','handoff_accept','handoff_reject') THEN RETURN task_capability_status_before_handoff(g); END IF;
 IF EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN RETURN 'consumed'; END IF;
 state:=task_capability_base(g);
 IF state NOT IN ('active','pending') THEN RETURN state; END IF;
 IF g.scope_hash IS DISTINCT FROM task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id) OR task_admission_seal(g.task_id,g.operation) IS NULL OR task_handoff_source_version(g.task_id) IS NULL THEN RETURN 'invalidated'; END IF;
 IF g.operation='handoff_create' THEN
  IF binding->'recipient' IS DISTINCT FROM task_handoff_principal(g.task_id,binding->>'recipientRole') OR binding->'recipient'=task_handoff_principal(g.task_id,binding->>'role') OR binding->'recipient' IS NULL THEN RETURN 'invalidated'; END IF;
 ELSE
  SELECT * INTO h FROM task_handoffs WHERE id::text=binding->>'handoffId' AND workspace_id=g.workspace_id AND task_id=g.task_id;
  IF h.id IS NULL OR NOT task_handoff_current(h) OR h.recipient_role IS DISTINCT FROM binding->>'role' OR h.recipient IS DISTINCT FROM jsonb_build_object('kind','agent','id',g.agent_id)
   OR EXISTS(SELECT 1 FROM task_handoff_decisions WHERE handoff_id=h.id) THEN RETURN 'invalidated'; END IF;
 END IF;
 RETURN state;
END $$;
CREATE FUNCTION task_handoff_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE h task_handoffs; op TEXT; principal JSONB; g task_capability_grants;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'task_handoff_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 PERFORM id FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'task_handoff_scope_invalid'; END IF;
 principal:=jsonb_build_object('kind',CASE WHEN NEW.actor_user_id IS NULL THEN 'agent' ELSE 'user' END,'id',COALESCE(NEW.actor_user_id,NEW.actor_agent_id));
 IF TG_TABLE_NAME='task_handoffs' THEN
  op:='handoff_create';
  IF NEW.source IS DISTINCT FROM task_handoff_source(NEW.task_id) OR NEW.source_version IS DISTINCT FROM task_handoff_source_version(NEW.task_id) OR NEW.source IS NULL
   OR NEW.source->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text OR NEW.source->>'applicationId' IS DISTINCT FROM NEW.application_id::text OR NEW.source->>'executionId' IS DISTINCT FROM NEW.execution_id::text
   OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_handoffs WHERE task_id=NEW.task_id)
   OR NOT task_handoff_content_valid(NEW.content) OR NEW.sender IS DISTINCT FROM principal
   OR NEW.sender IS DISTINCT FROM task_handoff_principal(NEW.task_id,NEW.sender_role)
   OR NEW.recipient IS DISTINCT FROM task_handoff_principal(NEW.task_id,NEW.recipient_role) THEN RAISE EXCEPTION 'task_handoff_scope_invalid'; END IF;
  IF NEW.supersedes IS NOT NULL THEN
   SELECT * INTO h FROM task_handoffs WHERE id=NEW.supersedes AND workspace_id=NEW.workspace_id AND task_id=NEW.task_id;
   IF h.id IS NULL OR h.sender IS DISTINCT FROM NEW.sender OR h.recipient IS DISTINCT FROM NEW.recipient OR h.sender_role<>NEW.sender_role OR h.recipient_role<>NEW.recipient_role
    OR NOT EXISTS(SELECT 1 FROM task_handoff_decisions WHERE handoff_id=h.id AND decision='reject') THEN RAISE EXCEPTION 'task_handoff_supersedes_invalid'; END IF;
  END IF;
 ELSE
  op:='handoff_'||NEW.decision;
  SELECT * INTO h FROM task_handoffs WHERE id=NEW.handoff_id AND task_id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
  IF h.id IS NULL OR h.version<>NEW.handoff_version OR NOT task_handoff_current(h) OR h.recipient IS DISTINCT FROM principal THEN RAISE EXCEPTION 'task_handoff_stale'; END IF;
  IF NEW.decision='reject' AND (COALESCE(NEW.detail->>'code','') NOT IN ('missing_section','conflicting_section','insufficient_evidence','unclear_action') OR length(trim(COALESCE(NEW.detail->>'reason','')))<3
   OR jsonb_typeof(NEW.detail->'sections') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.detail->'sections') NOT BETWEEN 1 AND 8
   OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(NEW.detail->'sections') s WHERE s NOT IN ('outcome','context','decisions','changes','tests','limits','continuation','expectedAction'))) THEN RAISE EXCEPTION 'task_handoff_rejection_invalid'; END IF;
 END IF;
 IF task_admission_seal(NEW.task_id,op) IS NULL THEN RAISE EXCEPTION 'risk_admission_required'; END IF;
 IF native_capability_blocked(NEW.workspace_id,NEW.task_id,COALESCE(h.application_id,(task_handoff_source(NEW.task_id)->>'applicationId')::uuid),op,NEW.actor_agent_id,NEW.actor_credential_id,NULL) THEN RAISE EXCEPTION 'native_capability_suspended'; END IF;
 IF NEW.actor_agent_id IS NULL THEN
  IF NEW.capability_grant_id IS NOT NULL THEN RAISE EXCEPTION 'capability_agent_only'; END IF;
 ELSE
  SELECT * INTO g FROM task_capability_grants WHERE id=NEW.capability_grant_id AND workspace_id=NEW.workspace_id AND task_id=NEW.task_id AND agent_id=NEW.actor_agent_id AND credential_id=NEW.actor_credential_id AND operation=op FOR UPDATE;
  IF g.id IS NULL OR task_capability_status(g)<>'active'
   OR NOT EXISTS(SELECT 1 FROM api_keys WHERE id=g.credential_id AND key_prefix=NEW.actor_credential_prefix)
   THEN RAISE EXCEPTION 'capability_grant_denied'; END IF;
  IF TG_TABLE_NAME='task_handoffs' THEN
   IF g.snapshot->'handoff'->>'role' IS DISTINCT FROM NEW.sender_role OR g.snapshot->'handoff'->>'recipientRole' IS DISTINCT FROM NEW.recipient_role OR g.snapshot->'handoff'->'recipient' IS DISTINCT FROM NEW.recipient THEN RAISE EXCEPTION 'capability_grant_denied'; END IF;
  ELSIF g.snapshot->'handoff'->>'handoffId' IS DISTINCT FROM h.id::text THEN RAISE EXCEPTION 'capability_grant_denied'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_handoff_guard BEFORE INSERT OR UPDATE OR DELETE ON task_handoffs FOR EACH ROW EXECUTE FUNCTION task_handoff_guard();
CREATE TRIGGER task_handoff_guard BEFORE INSERT OR UPDATE OR DELETE ON task_handoff_decisions FOR EACH ROW EXECUTE FUNCTION task_handoff_guard();
CREATE OR REPLACE FUNCTION task_capability_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE g task_capability_grants; d task_review_decisions; a task_review_actions; utc_now TIMESTAMP:=clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'capability_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF TG_TABLE_NAME='task_capability_grants' THEN
  IF task_capability_status(NEW) NOT IN ('active','pending') OR NEW.valid_from<utc_now-INTERVAL '1 minute' OR NEW.valid_until>utc_now+INTERVAL '1 hour' OR
   NEW.valid_until>(SELECT expires_at FROM api_keys WHERE id=NEW.credential_id) THEN RAISE EXCEPTION 'capability_scope_invalid'; END IF;
 ELSIF TG_TABLE_NAME='task_capability_revocations' THEN
  IF NOT EXISTS(SELECT 1 FROM task_capability_grants WHERE id=NEW.grant_id AND workspace_id=NEW.workspace_id) OR
   NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.actor_user_id AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'capability_revoke_forbidden'; END IF;
 ELSE
  SELECT * INTO g FROM task_capability_grants WHERE id=NEW.grant_id AND workspace_id=NEW.workspace_id;
  IF NOT FOUND OR task_capability_base(g)<>'active' OR NEW.post_scope_hash IS DISTINCT FROM task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id) THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  IF NEW.decision_id IS NOT NULL THEN
   SELECT * INTO d FROM task_review_decisions WHERE id=NEW.decision_id AND workspace_id=NEW.workspace_id;
   IF NOT FOUND OR d.capability_grant_id IS DISTINCT FROM g.id OR d.request_id<>NEW.request_id OR d.actor_agent_id IS DISTINCT FROM g.agent_id OR d.actor_credential_id IS DISTINCT FROM g.credential_id OR g.operation<>'review_decision' THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  ELSIF NEW.handoff_id IS NOT NULL OR NEW.handoff_decision_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM task_handoffs h WHERE h.id=NEW.handoff_id AND h.workspace_id=NEW.workspace_id AND h.capability_grant_id=g.id AND h.request_id=NEW.request_id AND h.actor_agent_id=g.agent_id AND h.actor_credential_id=g.credential_id AND g.operation='handoff_create')
    AND NOT EXISTS(SELECT 1 FROM task_handoff_decisions hd WHERE hd.id=NEW.handoff_decision_id AND hd.workspace_id=NEW.workspace_id AND hd.capability_grant_id=g.id AND hd.request_id=NEW.request_id AND hd.actor_agent_id=g.agent_id AND hd.actor_credential_id=g.credential_id AND g.operation='handoff_'||hd.decision) THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  ELSE
   SELECT * INTO a FROM task_review_actions WHERE id=NEW.action_id AND workspace_id=NEW.workspace_id;
   IF NOT FOUND OR a.capability_grant_id IS DISTINCT FROM g.id OR a.request_id<>NEW.request_id OR a.actor_agent_id IS DISTINCT FROM g.agent_id OR a.actor_credential_id IS DISTINCT FROM g.credential_id OR g.operation<>a.action THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION task_handoff_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE h task_handoffs; op TEXT;
BEGIN
 IF TG_TABLE_NAME='task_handoffs' THEN SELECT * INTO h FROM task_handoffs WHERE id=NEW.id; ELSE SELECT * INTO h FROM task_handoffs WHERE id=NEW.handoff_id; END IF;
 IF TG_TABLE_NAME='task_handoffs' THEN op:='handoff_create'; ELSE op:='handoff_'||NEW.decision; END IF;
 IF NOT task_handoff_current(h) OR task_admission_seal(h.task_id,op) IS NULL OR native_capability_blocked(h.workspace_id,h.task_id,h.application_id,op,NEW.actor_agent_id,NEW.actor_credential_id,NULL) THEN RAISE EXCEPTION 'task_handoff_stale'; END IF;
 IF NEW.actor_agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM task_capability_uses u JOIN task_capability_grants g ON g.id=u.grant_id
  WHERE g.id=NEW.capability_grant_id AND task_capability_base(g)='active' AND u.post_scope_hash=task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id)
   AND (CASE WHEN TG_TABLE_NAME='task_handoffs' THEN u.handoff_id=NEW.id ELSE u.handoff_decision_id=NEW.id END)) THEN RAISE EXCEPTION 'capability_receipt_required'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER task_handoff_receipt_guard AFTER INSERT ON task_handoffs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_handoff_receipt_guard();
CREATE CONSTRAINT TRIGGER task_handoff_receipt_guard AFTER INSERT ON task_handoff_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_handoff_receipt_guard();
COMMIT;
