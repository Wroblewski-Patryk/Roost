BEGIN;
-- Additive clarification history. Existing operations keep their source hashes.

ALTER TABLE task_admission_evidence DROP CONSTRAINT task_admission_evidence_operation_check;
ALTER TABLE task_admission_evidence ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply'));

ALTER TABLE native_capability_suspensions DROP CONSTRAINT native_capability_suspensions_operation_check;
ALTER TABLE native_capability_suspensions ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply'));

ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_operation_check;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply'));

CREATE OR REPLACE FUNCTION procedure_contract_shape(b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE f TEXT; s JSONB; seen TEXT[]:='{}'; roles TEXT[]:=ARRAY['requester','accountableManager','executor','verifier','releaser'];
BEGIN
 IF jsonb_typeof(b)<>'object' OR octet_length(b::text)>60000 OR COALESCE(b->>'kind','') NOT IN ('base','extension')
 OR COALESCE(b->>'taskType','') NOT IN ('code_change','maintenance','migration','review')
 OR COALESCE(b->>'operation','') NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply')
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
  IF NEW.operation NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply') OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id)
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
 IF s.id IS NULL OR required IS NULL OR op NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply') THEN
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
  (SELECT jsonb_object_agg(op,task_composition_refs((source->>'taskId')::uuid,op)) FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=(source->>'taskId')::uuid AND hs.operation=op))) ORDER BY source->>'taskId')
 FROM jsonb_array_elements(task_risk_sources_before_composition(target)) source
$$;

CREATE OR REPLACE FUNCTION task_admission_source(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 WITH refs AS MATERIALIZED (SELECT op,task_composition_refs(t,op) AS value FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=t AND hs.operation=op)),
 versions AS (SELECT v.* FROM procedure_contract_versions v WHERE EXISTS(SELECT 1 FROM refs WHERE v.id::text IN(value->>'base',value->>'extension')))
 SELECT encode(sha256(convert_to(task_admission_source_before_composition(t)||jsonb_build_object(
  'refs',(SELECT jsonb_agg(to_jsonb(refs) ORDER BY op) FROM refs),
  'selections',(SELECT jsonb_agg(to_jsonb(s) ORDER BY operation) FROM (SELECT DISTINCT ON(operation) * FROM task_composition_selections WHERE task_id=t ORDER BY operation,version DESC) s),
  'validity',(SELECT jsonb_agg(jsonb_build_object('id',v.id,'valid',procedure_contract_valid(v::procedure_contract_versions),'source',procedure_contract_source(v.procedure_id)) ORDER BY v.id) FROM versions v),
  'exceptions',(SELECT jsonb_agg(to_jsonb(e) ORDER BY operation,missing,version) FROM (SELECT DISTINCT ON(operation,missing) * FROM task_composition_exceptions WHERE task_id=t ORDER BY operation,missing,version DESC) e))::text,'UTF8')),'hex')
$$;


CREATE TABLE task_clarification_threads (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, related_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 version INT NOT NULL DEFAULT 1 CHECK(version=1), sender JSONB NOT NULL, recipient JSONB NOT NULL,
 context_version TEXT NOT NULL, context JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(sender->'principal'<>recipient->'principal')
);
CREATE TABLE task_clarification_entries (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, thread_id UUID NOT NULL REFERENCES task_clarification_threads(id) ON DELETE RESTRICT,
 version INT NOT NULL CHECK(version>0), kind TEXT NOT NULL CHECK(kind IN ('message','read')),
 reply_to UUID REFERENCES task_clarification_entries(id) ON DELETE RESTRICT,
 supersedes UUID UNIQUE REFERENCES task_clarification_entries(id) ON DELETE RESTRICT,
 author JSONB NOT NULL, recipient JSONB NOT NULL, context_version TEXT NOT NULL,
 content JSONB NOT NULL, verified_refs JSONB NOT NULL DEFAULT '[]',
 actor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT, actor_agent_id UUID REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 actor_credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT, actor_credential_prefix TEXT,
 capability_grant_id UUID UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(thread_id,version),UNIQUE(workspace_id,request_id),
 CHECK((actor_user_id IS NULL)<>(actor_agent_id IS NULL)),CHECK((actor_agent_id IS NULL)=(actor_credential_id IS NULL))
);
CREATE UNIQUE INDEX task_clarification_read_once ON task_clarification_entries(thread_id,reply_to,(author->'principal')) WHERE kind='read';
CREATE INDEX task_clarification_history ON task_clarification_threads(workspace_id,task_id,created_at DESC,id DESC);
ALTER TABLE task_capability_grants ALTER COLUMN execution_id DROP NOT NULL;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('clarification_send','clarification_reply') OR execution_id IS NOT NULL);
ALTER TABLE task_capability_uses ADD COLUMN clarification_entry_id UUID UNIQUE REFERENCES task_clarification_entries(id) ON DELETE RESTRICT;
ALTER TABLE task_capability_uses DROP CONSTRAINT task_capability_uses_check;
ALTER TABLE task_capability_uses ADD CHECK(num_nonnulls(decision_id,action_id,handoff_id,handoff_decision_id,clarification_entry_id)=1);

CREATE FUNCTION task_clarification_context(t UUID) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE task tasks; roles JSONB; app UUID;
BEGIN
 SELECT * INTO task FROM tasks WHERE id=t;
 IF task.id IS NULL OR task.execution_role_provenance->>'requesterUserId' IS DISTINCT FROM task.execution_readiness->'contract'->'taskRoles'->'requester'->>'id'
  OR task.execution_readiness->'contract'->'assignment'->>'agentId' IS DISTINCT FROM task.assigned_workforce_entity_id::text
  OR task.execution_readiness->>'pinId' IS NULL THEN RETURN NULL; END IF;
 IF (SELECT count(*) FROM application_projects WHERE project_id=task.project_id)<>1 THEN RETURN NULL; END IF;
 SELECT ap.application_id INTO app FROM application_projects ap JOIN applications a ON a.id=ap.application_id AND a.workspace_id=task.workspace_id JOIN projects p ON p.id=ap.project_id AND p.workspace_id=task.workspace_id WHERE ap.project_id=task.project_id;
 IF app IS NULL THEN RETURN NULL; END IF;
 SELECT jsonb_object_agg(role_name,task_handoff_principal(t,role_name)) INTO roles FROM unnest(ARRAY['requester','accountableManager','executor','verifier','releaser']) role_name;
 IF EXISTS(SELECT 1 FROM jsonb_each(roles) WHERE value='null'::jsonb) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('taskId',t,'workspaceId',task.workspace_id,'applicationId',app,'writable',task.status IN ('todo','in_progress','blocked'),'taskRevision',task.updated_at,'readiness',task.execution_readiness,
  'roles',roles,'roleReferences',task.execution_readiness->'contract'->'taskRoles','provenance',task.execution_role_provenance,'admissionSource',task_admission_source(t));
END $$;
CREATE FUNCTION task_clarification_link(t UUID,other UUID) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE a JSONB; b JSONB; relation JSONB;
BEGIN
 a:=task_clarification_context(t);b:=task_clarification_context(other);
 IF a IS NULL OR b IS NULL OR a->>'workspaceId' IS DISTINCT FROM b->>'workspaceId' OR a->>'applicationId' IS DISTINCT FROM b->>'applicationId' THEN RETURN NULL; END IF;
 IF t=other THEN relation:=jsonb_build_object('kind','same_task'); ELSE
  SELECT jsonb_build_object('kind','dependency','id',id,'type',dependency_type,'revision',updated_at) INTO relation FROM dependencies
   WHERE workspace_id::text=a->>'workspaceId' AND status='active' AND from_entity_type='task' AND to_entity_type='task'
   AND dependency_type IN ('depends_on','blocks','requires','review_correction')
   AND (from_entity_id=t::text AND to_entity_id=other::text OR from_entity_id=other::text AND to_entity_id=t::text) ORDER BY id LIMIT 1;
  IF relation IS NULL THEN RETURN NULL; END IF;
 END IF;
 RETURN jsonb_build_object('schemaVersion','roost-clarification-context-v1','task',a,'relatedTask',b,'relation',relation);
END $$;
CREATE FUNCTION task_clarification_version(t UUID,other UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(task_clarification_link(t,other)::text,'UTF8')),'hex')
$$;
CREATE FUNCTION task_clarification_participant(p JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE c JSONB;
BEGIN
 IF COALESCE(p->>'taskId','') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN NULL; END IF;
 c:=task_clarification_context((p->>'taskId')::uuid);
 IF c IS NULL OR c->'roles'->(p->>'role') IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('taskId',p->>'taskId','role',p->>'role','principal',c->'roles'->(p->>'role'));
END $$;
CREATE FUNCTION task_clarification_scope(t UUID,key_id UUID,issuer UUID,binding JSONB) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE k api_keys; c JSONB; other UUID; sender_ref JSONB; receiver JSONB; thread task_clarification_threads;
BEGIN
 IF binding->>'action' NOT IN ('send','reply','read') THEN RETURN NULL; END IF;
 sender_ref:=task_clarification_participant(binding->'sender');receiver:=task_clarification_participant(binding->'recipient');
 IF sender_ref IS NULL OR receiver IS NULL OR sender_ref->'principal'=receiver->'principal' OR t::text NOT IN(sender_ref->>'taskId',receiver->>'taskId') THEN RETURN NULL; END IF;
 other:=CASE WHEN sender_ref->>'taskId'=t::text THEN (receiver->>'taskId')::uuid ELSE (sender_ref->>'taskId')::uuid END;
 c:=task_clarification_link(t,other);IF c IS NULL OR c->'task'->'writable'<>'true'::jsonb OR c->'relatedTask'->'writable'<>'true'::jsonb THEN RETURN NULL; END IF;
 SELECT * INTO k FROM api_keys WHERE id=key_id AND workspace_id::text=c->'task'->>'workspaceId';
 IF k.id IS NULL OR sender_ref->'principal' IS DISTINCT FROM jsonb_build_object('kind','agent','id',k.bound_agent_id) THEN RETURN NULL; END IF;
 IF binding->>'action'<>'send' THEN
  SELECT * INTO thread FROM task_clarification_threads WHERE id::text=binding->>'threadId' AND task_id=t;
  IF thread.id IS NULL OR thread.context_version IS DISTINCT FROM task_clarification_version(t,thread.related_task_id)
   OR NOT (sender_ref=thread.sender AND receiver=thread.recipient OR sender_ref=thread.recipient AND receiver=thread.sender)
   OR NOT EXISTS(SELECT 1 FROM task_clarification_entries WHERE id::text=binding->>'entryId' AND thread_id=thread.id AND kind='message' AND (recipient=sender_ref OR binding->>'action'='reply' AND task_clarification_entries.author=sender_ref)) THEN RETURN NULL; END IF;
 END IF;
 RETURN encode(sha256(convert_to(jsonb_build_object('context',c,'binding',binding,
  'key',jsonb_build_object('id',k.id,'agent',k.bound_agent_id,'version',k.credential_version,'active',k.active,'revoked',k.revoked_at,'expiry',k.expires_at),
  'issuer',(SELECT to_jsonb(m) FROM workspace_memberships m WHERE m.workspace_id=k.workspace_id AND user_id=issuer))::text,'UTF8')),'hex');
END $$;
CREATE FUNCTION task_clarification_capability_base(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE k api_keys; binding JSONB:=g.snapshot->'clarification'; other UUID; utc_now TIMESTAMP:=clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
 IF EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id) THEN RETURN 'revoked'; END IF;
 IF g.valid_until<=utc_now THEN RETURN 'expired'; END IF;
 SELECT * INTO k FROM api_keys WHERE id=g.credential_id AND workspace_id=g.workspace_id AND bound_agent_id=g.agent_id;
 IF k.id IS NULL OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at IS NULL OR k.expires_at<=utc_now OR k.credential_version<>g.credential_version OR NOT k.scopes @> '["agent-runtime:write"]'::jsonb THEN RETURN 'invalidated'; END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=g.workspace_id AND user_id=g.issuer_user_id AND role IN ('owner','admin')) THEN RETURN 'invalidated'; END IF;
 IF g.scope_hash IS DISTINCT FROM task_clarification_scope(g.task_id,g.credential_id,g.issuer_user_id,binding) OR task_clarification_scope(g.task_id,g.credential_id,g.issuer_user_id,binding) IS NULL
  OR g.application_id::text IS DISTINCT FROM task_clarification_context(g.task_id)->>'applicationId'
  OR g.operation IS DISTINCT FROM (CASE WHEN binding->>'action'='send' THEN 'clarification_send' ELSE 'clarification_reply' END) THEN RETURN 'invalidated'; END IF;
 other:=CASE WHEN binding->'sender'->>'taskId'=g.task_id::text THEN (binding->'recipient'->>'taskId')::uuid ELSE (binding->'sender'->>'taskId')::uuid END;
 IF task_admission_seal(g.task_id,g.operation) IS NULL OR task_admission_seal(other,g.operation) IS NULL THEN RETURN 'invalidated'; END IF;
 IF native_capability_blocked(g.workspace_id,other,g.application_id,g.operation,g.agent_id,g.credential_id,NULL) THEN RETURN 'suspended'; END IF;
 IF EXISTS(SELECT 1 FROM native_capability_suspensions s WHERE s.workspace_id=g.workspace_id AND s.task_id=other AND s.application_id=g.application_id
  AND s.operation=g.operation AND (s.agent_id IS NULL OR s.agent_id=g.agent_id) AND (s.credential_id IS NULL OR s.credential_id=g.credential_id)
  AND GREATEST(s.created_at,COALESCE((SELECT max(created_at) FROM native_suspension_journal WHERE suspension_id=s.id AND action IN ('reopen','reject','manual_intervention')),s.created_at))>=g.created_at)
 THEN RETURN 'invalidated'; END IF;
 IF g.valid_from>utc_now THEN RETURN 'pending'; END IF;
 RETURN 'active';
END $$;
ALTER FUNCTION task_capability_base_before_suspension(task_capability_grants) RENAME TO task_capability_base_before_clarification;
CREATE FUNCTION task_capability_base_before_suspension(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 IF g.operation IN ('clarification_send','clarification_reply') THEN RETURN task_clarification_capability_base(g); END IF;
 RETURN task_capability_base_before_clarification(g);
END $$;
ALTER FUNCTION task_capability_status(task_capability_grants) RENAME TO task_capability_status_before_clarification;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 IF g.operation NOT IN ('clarification_send','clarification_reply') THEN RETURN task_capability_status_before_clarification(g); END IF;
 IF EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN RETURN 'consumed'; END IF;
 RETURN task_capability_base(g);
END $$;
CREATE FUNCTION task_capability_effect_scope(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF g.operation IN ('clarification_send','clarification_reply') THEN RETURN task_clarification_scope(g.task_id,g.credential_id,g.issuer_user_id,g.snapshot->'clarification'); END IF;
 RETURN task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id);
END $$;
CREATE FUNCTION task_clarification_ref(kind TEXT,t UUID,ref_id UUID,body JSONB) RETURNS JSONB LANGUAGE SQL IMMUTABLE AS $$
 SELECT jsonb_build_object('kind',kind,'taskId',t,'id',ref_id,'revision',encode(sha256(convert_to(body::text,'UTF8')),'hex'),'data',body)
$$;
CREATE FUNCTION task_clarification_refs(t UUID) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE e agent_executions; result_ref JSONB; refs JSONB:='[]'; r RECORD;
BEGIN
 SELECT * INTO e FROM agent_executions WHERE task_id=t ORDER BY created_at DESC,id DESC LIMIT 1;
 result_ref:=e.metadata->'resultRevision';
 IF e.status='completed' AND e.completed_at IS NOT NULL AND result_ref->>'schemaVersion'='roost-result-revision-v1'
  AND result_ref->>'executionId'=e.id::text AND result_ref->'attempt'=to_jsonb(e.attempt) AND result_ref->'checkpointVersion'=to_jsonb(e.checkpoint_version)
  AND result_ref->>'hostId' IS NOT DISTINCT FROM e.agent_host_id::text AND COALESCE(result_ref->>'id','') ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  AND COALESCE(result_ref->>'commit','') ~ '^[a-f0-9]{40}$' AND result_ref->>'branch'=e.metadata->'executionContract'->'singleTask'->>'branch'
  AND result_ref->>'workingTree' IN ('clean','dirty') AND task_handoff_tests(e) IS NOT NULL AND task_handoff_paths_valid(e.changed_files) THEN
  refs:=refs||jsonb_build_array(task_clarification_ref('execution',t,e.id,jsonb_build_object('status',e.status,'attempt',e.attempt,'completedAt',e.completed_at,'contextInvalidated',e.context_invalidated_at IS NOT NULL)),
   task_clarification_ref('result',t,(result_ref->>'id')::uuid,result_ref||jsonb_build_object('changedPaths',e.changed_files)),task_clarification_ref('test',t,e.id,task_handoff_tests(e)));
 END IF;
 FOR r IN SELECT h.*,to_jsonb(d)-'request_hash' AS receipt,task_handoff_current(h) AS current FROM task_handoffs h LEFT JOIN task_handoff_decisions d ON d.handoff_id=h.id WHERE h.task_id=t ORDER BY h.version DESC LIMIT 20 LOOP
  refs:=refs||jsonb_build_array(task_clarification_ref('handoff',t,r.id,jsonb_build_object('version',r.version,'sourceVersion',r.source_version,'executionId',r.execution_id,'current',r.current,'receipt',r.receipt)));
 END LOOP;
 FOR r IN SELECT * FROM task_review_decisions WHERE task_id=t ORDER BY created_at DESC,id DESC LIMIT 20 LOOP
  refs:=refs||jsonb_build_array(task_clarification_ref('review',t,r.id,jsonb_build_object('executionId',r.execution_id,'materialVersion',r.material_version,'decision',r.decision,'createdAt',r.created_at)));
 END LOOP;
 FOR r IN SELECT a.*,c.updated_at AS current_revision FROM task_admission_evidence a JOIN company_records c ON c.id=a.evidence_id AND c.workspace_id=a.workspace_id WHERE a.task_id=t ORDER BY a.created_at DESC,a.id DESC LIMIT 20 LOOP
  refs:=refs||jsonb_build_array(task_clarification_ref('evidence',t,r.id,jsonb_build_object('operation',r.operation,'gate',r.gate,'version',r.version,'verdict',r.verdict,'sourceVersion',r.source_version,'evidenceId',r.evidence_id,'evidenceRevision',r.evidence_revision,'current',r.current_revision=r.evidence_revision AND task_admission_source(t)=r.source_version)));
 END LOOP;
 RETURN refs;
END $$;
CREATE FUNCTION task_clarification_resolve_refs(t UUID,other UUID,requested JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE available JSONB; item JSONB; found JSONB; resolved JSONB:='[]';
BEGIN
 IF jsonb_typeof(requested) IS DISTINCT FROM 'array' OR jsonb_array_length(requested)>8 THEN RETURN NULL; END IF;
 available:=task_clarification_refs(t);IF other<>t THEN available:=available||task_clarification_refs(other); END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(requested) LOOP
  SELECT value INTO found FROM jsonb_array_elements(available) WHERE value-'data'=item;
  IF found IS NULL THEN RETURN NULL; END IF;resolved:=resolved||jsonb_build_array(found);
 END LOOP;
 RETURN resolved;
END $$;
CREATE FUNCTION task_clarification_content_valid(c JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE full_text TEXT;
BEGIN
 IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR c-ARRAY['type','text','references','expectedResponse','material']<>'{}'::jsonb OR (SELECT count(*) FROM jsonb_object_keys(c))<>5
  OR COALESCE(c->>'type','') NOT IN ('question','answer','evidence_request','evidence_response','constraint_notice','status_update')
  OR jsonb_typeof(c->'text') IS DISTINCT FROM 'string' OR length(trim(c->>'text')) NOT BETWEEN 3 AND 2000
  OR jsonb_typeof(c->'references') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'references')>8
  OR c->>'type'='evidence_response' AND jsonb_array_length(c->'references')=0 THEN RETURN false; END IF;
 IF c->'expectedResponse'<>'null'::jsonb AND (jsonb_typeof(c->'expectedResponse')<>'object' OR (c->'expectedResponse')-ARRAY['kind','instruction','dueAt']<>'{}'::jsonb OR (SELECT count(*) FROM jsonb_object_keys(c->'expectedResponse'))<>3 OR jsonb_typeof(c->'expectedResponse'->'kind') IS DISTINCT FROM 'string' OR jsonb_typeof(c->'expectedResponse'->'instruction') IS DISTINCT FROM 'string' OR COALESCE(c->'expectedResponse'->>'kind','') NOT IN ('answer','evidence_response','read') OR length(trim(COALESCE(c->'expectedResponse'->>'instruction',''))) NOT BETWEEN 3 AND 2000) THEN RETURN false; END IF;
 IF c->'material'<>'null'::jsonb AND (jsonb_typeof(c->'material')<>'object' OR (c->'material')-ARRAY['category','reason']<>'{}'::jsonb OR (SELECT count(*) FROM jsonb_object_keys(c->'material'))<>2 OR jsonb_typeof(c->'material'->'category') IS DISTINCT FROM 'string' OR jsonb_typeof(c->'material'->'reason') IS DISTINCT FROM 'string' OR COALESCE(c->'material'->>'category','') NOT IN ('assumption','constraint','evidence') OR length(trim(COALESCE(c->'material'->>'reason',''))) NOT BETWEEN 3 AND 2000) THEN RETURN false; END IF;
 IF c->'expectedResponse'<>'null'::jsonb AND c->'expectedResponse'->'dueAt'<>'null'::jsonb THEN
  IF jsonb_typeof(c->'expectedResponse'->'dueAt') IS DISTINCT FROM 'string' OR c->'expectedResponse'->>'dueAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$' THEN RETURN false; END IF;
  BEGIN PERFORM (c->'expectedResponse'->>'dueAt')::timestamptz; EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false; END;
 END IF;
 IF c->>'type'='constraint_notice' AND c->'material'='null'::jsonb THEN RETURN false; END IF;
 full_text:=translate(lower(normalize(concat_ws(' ',c->>'text',c->'expectedResponse'->>'instruction',c->'material'->>'reason'),NFKC)),U&'\200B\200C\200D\200E\200F\FEFF','');
 IF full_text ~ '(^|[[:space:]"''])(set|change|update|assign|reassign|override|grant|revoke|approve|release|deploy|mark|switch|raise|lower|ustaw|zmien|zmień|przypisz|nadaj|cofnij|zatwierdz|zatwierdź|wdroz|wdróż|oznacz|podnieś|obniż)[[:space:]]+[^.!?]{0,90}(assignment|assignee|scope|priority|status|ready|procedure|risk|mandate|capability|authority|role|release|zakres|priorytet|status|gotowo|procedur|ryzyk|mandat|uprawnie|rolę|role|przypisani|wydani)' THEN RETURN false; END IF;
 IF full_text ~ '(assignment|assignee|scope|priority|status|ready|procedure|risk|mandate|capability|authority|role|release|zakres|priorytet|gotowo|procedur|ryzyk|mandat|uprawnie|rolę|role|przypisani|wydani)[[:space:]]*(=|:=|->|→|:)' OR full_text ~ '(ignore|bypass|override|zignoruj|pomiń|obejdź)[^.!?]{0,60}(contract|policy|approval|kontrakt|zgod|zasad)' THEN RETURN false; END IF;
 RETURN true;
END $$;
CREATE FUNCTION task_clarification_thread_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'clarification_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NEW.context IS DISTINCT FROM task_clarification_link(NEW.task_id,NEW.related_task_id) OR NEW.context_version IS DISTINCT FROM task_clarification_version(NEW.task_id,NEW.related_task_id)
  OR NEW.context->'task'->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text OR NEW.context IS NULL OR NEW.context->'task'->'writable'<>'true'::jsonb OR NEW.context->'relatedTask'->'writable'<>'true'::jsonb
  OR NEW.sender IS DISTINCT FROM task_clarification_participant(NEW.sender) OR NEW.recipient IS DISTINCT FROM task_clarification_participant(NEW.recipient)
  OR NEW.task_id::text NOT IN (NEW.sender->>'taskId',NEW.recipient->>'taskId')
  OR NEW.sender->>'taskId' NOT IN (NEW.task_id::text,NEW.related_task_id::text) OR NEW.recipient->>'taskId' NOT IN (NEW.task_id::text,NEW.related_task_id::text)
  OR (SELECT count(*) FROM task_clarification_threads WHERE task_id=NEW.task_id)>=100 THEN RAISE EXCEPTION 'clarification_scope_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_clarification_thread_guard BEFORE INSERT OR UPDATE OR DELETE ON task_clarification_threads FOR EACH ROW EXECUTE FUNCTION task_clarification_thread_guard();
CREATE FUNCTION task_clarification_entry_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE thread task_clarification_threads; prior task_clarification_entries; g task_capability_grants; principal JSONB; op TEXT; action TEXT;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'clarification_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 SELECT * INTO thread FROM task_clarification_threads WHERE id=NEW.thread_id AND workspace_id=NEW.workspace_id AND task_id=NEW.task_id FOR UPDATE;
 principal:=jsonb_build_object('kind',CASE WHEN NEW.actor_user_id IS NULL THEN 'agent' ELSE 'user' END,'id',COALESCE(NEW.actor_user_id,NEW.actor_agent_id));
 IF thread.id IS NULL OR NEW.author->'principal' IS DISTINCT FROM principal OR NOT (NEW.author=thread.sender AND NEW.recipient=thread.recipient OR NEW.author=thread.recipient AND NEW.recipient=thread.sender)
  OR NEW.context_version IS DISTINCT FROM thread.context_version OR NEW.context_version IS DISTINCT FROM task_clarification_version(thread.task_id,thread.related_task_id)
  OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_clarification_entries WHERE thread_id=thread.id) OR NEW.version>500 THEN RAISE EXCEPTION 'clarification_scope_invalid'; END IF;
 IF NEW.reply_to IS NULL THEN
  IF NEW.kind<>'message' OR NEW.version<>1 OR NEW.author<>thread.sender OR NEW.supersedes IS NOT NULL THEN RAISE EXCEPTION 'clarification_scope_invalid'; END IF;action:='send';op:='clarification_send';
 ELSE
  SELECT * INTO prior FROM task_clarification_entries WHERE id=NEW.reply_to AND thread_id=thread.id AND kind='message';
  IF prior.id IS NULL OR (prior.recipient<>NEW.author AND NOT (NEW.kind='message' AND NEW.supersedes=prior.id AND prior.author=NEW.author)) OR prior.context_version<>NEW.context_version THEN RAISE EXCEPTION 'clarification_scope_invalid'; END IF;
  action:=CASE WHEN NEW.kind='read' THEN 'read' ELSE 'reply' END;op:='clarification_reply';
 END IF;
 IF NEW.supersedes IS NOT NULL THEN
  SELECT * INTO prior FROM task_clarification_entries WHERE id=NEW.supersedes AND thread_id=thread.id AND kind='message' AND author=NEW.author;
  IF prior.id IS NULL OR NEW.kind<>'message' THEN RAISE EXCEPTION 'clarification_scope_invalid'; END IF;
 END IF;
 IF NEW.kind='message' THEN
  IF NOT task_clarification_content_valid(NEW.content) OR task_clarification_resolve_refs(thread.task_id,thread.related_task_id,NEW.content->'references') IS NULL
   OR NEW.verified_refs IS DISTINCT FROM task_clarification_resolve_refs(thread.task_id,thread.related_task_id,NEW.content->'references') THEN RAISE EXCEPTION 'clarification_content_invalid'; END IF;
 ELSIF NEW.content<>'{}'::jsonb OR NEW.verified_refs<>'[]'::jsonb OR NEW.supersedes IS NOT NULL THEN RAISE EXCEPTION 'clarification_content_invalid'; END IF;
 IF task_admission_seal(thread.task_id,op) IS NULL OR task_admission_seal(thread.related_task_id,op) IS NULL
  OR native_capability_blocked(NEW.workspace_id,thread.task_id,(thread.context->'task'->>'applicationId')::uuid,op,NEW.actor_agent_id,NEW.actor_credential_id,NULL)
  OR native_capability_blocked(NEW.workspace_id,thread.related_task_id,(thread.context->'relatedTask'->>'applicationId')::uuid,op,NEW.actor_agent_id,NEW.actor_credential_id,NULL) THEN RAISE EXCEPTION 'clarification_authority_invalid'; END IF;
 IF NEW.actor_agent_id IS NOT NULL THEN
  SELECT * INTO g FROM task_capability_grants WHERE id=NEW.capability_grant_id AND task_id=NEW.task_id AND workspace_id=NEW.workspace_id AND agent_id=NEW.actor_agent_id AND credential_id=NEW.actor_credential_id AND operation=op;
  IF g.id IS NULL OR task_capability_status(g)<>'active' OR task_clarification_participant(g.snapshot->'clarification'->'sender')<>NEW.author OR task_clarification_participant(g.snapshot->'clarification'->'recipient')<>NEW.recipient
   OR g.snapshot->'clarification'->>'action' IS DISTINCT FROM action
   OR action<>'send' AND (g.snapshot->'clarification'->>'threadId' IS DISTINCT FROM thread.id::text OR g.snapshot->'clarification'->>'entryId' IS DISTINCT FROM NEW.reply_to::text)
   OR NOT EXISTS(SELECT 1 FROM api_keys WHERE id=g.credential_id AND key_prefix=NEW.actor_credential_prefix) THEN RAISE EXCEPTION 'capability_grant_denied'; END IF;
 ELSIF NEW.capability_grant_id IS NOT NULL THEN RAISE EXCEPTION 'capability_agent_only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_clarification_entry_guard BEFORE INSERT OR UPDATE OR DELETE ON task_clarification_entries FOR EACH ROW EXECUTE FUNCTION task_clarification_entry_guard();
CREATE FUNCTION task_clarification_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE thread task_clarification_threads; op TEXT;
BEGIN
 IF TG_TABLE_NAME='task_clarification_threads' THEN
  IF NOT EXISTS(SELECT 1 FROM task_clarification_entries WHERE thread_id=NEW.id AND version=1) THEN RAISE EXCEPTION 'clarification_receipt_required'; END IF;RETURN NEW;
 END IF;
 SELECT * INTO thread FROM task_clarification_threads WHERE id=NEW.thread_id;op:=CASE WHEN NEW.reply_to IS NULL THEN 'clarification_send' ELSE 'clarification_reply' END;
 IF NEW.context_version IS DISTINCT FROM task_clarification_version(thread.task_id,thread.related_task_id) OR task_admission_seal(thread.task_id,op) IS NULL OR task_admission_seal(thread.related_task_id,op) IS NULL THEN RAISE EXCEPTION 'clarification_scope_invalid'; END IF;
 IF native_capability_blocked(NEW.workspace_id,thread.task_id,(thread.context->'task'->>'applicationId')::uuid,op,NEW.actor_agent_id,NEW.actor_credential_id,NULL)
  OR native_capability_blocked(NEW.workspace_id,thread.related_task_id,(thread.context->'relatedTask'->>'applicationId')::uuid,op,NEW.actor_agent_id,NEW.actor_credential_id,NULL) THEN RAISE EXCEPTION 'clarification_authority_invalid'; END IF;
 IF NEW.actor_agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM task_capability_uses u JOIN task_capability_grants g ON g.id=u.grant_id WHERE u.clarification_entry_id=NEW.id AND g.id=NEW.capability_grant_id AND task_capability_base(g)='active' AND u.post_scope_hash=task_capability_effect_scope(g)) THEN RAISE EXCEPTION 'capability_receipt_required'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER task_clarification_receipt_guard AFTER INSERT ON task_clarification_threads DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_clarification_receipt_guard();
CREATE CONSTRAINT TRIGGER task_clarification_receipt_guard AFTER INSERT ON task_clarification_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_clarification_receipt_guard();

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
  IF NOT FOUND OR task_capability_base(g)<>'active' OR NEW.post_scope_hash IS DISTINCT FROM task_capability_effect_scope(g) THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  IF NEW.clarification_entry_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM task_clarification_entries ce WHERE ce.id=NEW.clarification_entry_id AND ce.workspace_id=NEW.workspace_id AND ce.capability_grant_id=g.id AND ce.request_id=NEW.request_id AND ce.actor_agent_id=g.agent_id AND ce.actor_credential_id=g.credential_id AND g.operation=CASE WHEN ce.reply_to IS NULL THEN 'clarification_send' ELSE 'clarification_reply' END) THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  ELSIF NEW.decision_id IS NOT NULL THEN
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
COMMIT;
