BEGIN;
-- Additive governed questions. No backfill, business seeding or historical edits.
ALTER TABLE task_admission_evidence DROP CONSTRAINT task_admission_evidence_operation_check;
ALTER TABLE task_admission_evidence ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare'));

ALTER TABLE native_capability_suspensions DROP CONSTRAINT native_capability_suspensions_operation_check;
ALTER TABLE native_capability_suspensions ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare'));

ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_operation_check;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare'));

CREATE OR REPLACE FUNCTION procedure_contract_shape(b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE f TEXT; s JSONB; seen TEXT[]:='{}'; roles TEXT[]:=ARRAY['requester','accountableManager','executor','verifier','releaser'];
BEGIN
 IF jsonb_typeof(b)<>'object' OR octet_length(b::text)>60000 OR COALESCE(b->>'kind','') NOT IN ('base','extension')
 OR COALESCE(b->>'taskType','') NOT IN ('code_change','maintenance','migration','review')
 OR COALESCE(b->>'operation','') NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare')
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
  IF NEW.operation NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare') OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id)
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
 IF s.id IS NULL OR required IS NULL OR op NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare') THEN
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
  (SELECT jsonb_object_agg(op,task_composition_refs((source->>'taskId')::uuid,op)) FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=(source->>'taskId')::uuid AND hs.operation=op))) ORDER BY source->>'taskId')
 FROM jsonb_array_elements(task_risk_sources_before_composition(target)) source
$$;

CREATE OR REPLACE FUNCTION task_admission_source(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 WITH refs AS MATERIALIZED (SELECT op,task_composition_refs(t,op) AS value FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=t AND hs.operation=op)),
 versions AS (SELECT v.* FROM procedure_contract_versions v WHERE EXISTS(SELECT 1 FROM refs WHERE v.id::text IN(value->>'base',value->>'extension')))
 SELECT encode(sha256(convert_to(task_admission_source_before_composition(t)||jsonb_build_object(
  'refs',(SELECT jsonb_agg(to_jsonb(refs) ORDER BY op) FROM refs),
  'selections',(SELECT jsonb_agg(to_jsonb(s) ORDER BY operation) FROM (SELECT DISTINCT ON(operation) * FROM task_composition_selections WHERE task_id=t ORDER BY operation,version DESC) s),
  'validity',(SELECT jsonb_agg(jsonb_build_object('id',v.id,'valid',procedure_contract_valid(v::procedure_contract_versions),'source',procedure_contract_source(v.procedure_id)) ORDER BY v.id) FROM versions v),
  'exceptions',(SELECT jsonb_agg(to_jsonb(e) ORDER BY operation,missing,version) FROM (SELECT DISTINCT ON(operation,missing) * FROM task_composition_exceptions WHERE task_id=t ORDER BY operation,missing,version DESC) e))::text,'UTF8')),'hex')
$$;



CREATE TABLE task_interview_cases (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 version INT NOT NULL CHECK(version>0),supersedes_id UUID UNIQUE REFERENCES task_interview_cases(id) ON DELETE RESTRICT,revision_reason TEXT,
 principal_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,unknown_key TEXT NOT NULL,decision_class TEXT NOT NULL,
 body JSONB NOT NULL,source_version TEXT NOT NULL,source_snapshot JSONB NOT NULL,
 actor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,actor_agent_id UUID REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 actor_credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT,capability_grant_id UUID UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,request_id),UNIQUE(workspace_id,application_id,unknown_key,version),
 CHECK(num_nonnulls(actor_user_id,actor_agent_id)=1),CHECK((actor_agent_id IS NULL)=(actor_credential_id IS NULL)),CHECK((actor_agent_id IS NULL)=(capability_grant_id IS NULL)),
 CHECK(decision_class IN ('product_direction','money','legal','critical_risk','mandate','task_scope')),
 CHECK(unknown_key ~ '^[a-z][a-z0-9_]{1,63}$'),CHECK(source_version ~ '^[a-f0-9]{64}$')
);
CREATE TABLE task_interview_entries (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,case_id UUID NOT NULL REFERENCES task_interview_cases(id) ON DELETE RESTRICT,
 version INT NOT NULL CHECK(version>0),action TEXT NOT NULL CHECK(action IN ('answer','defer','accept')),
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,body JSONB NOT NULL,
 decision_id UUID UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,request_id UUID NOT NULL,request_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(case_id,version),UNIQUE(workspace_id,request_id)
);
CREATE INDEX task_interview_case_task ON task_interview_cases(workspace_id,task_id,created_at DESC);
CREATE FUNCTION task_interview_context(t UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT jsonb_build_object('task',jsonb_build_object('id',t.id,'workspaceId',t.workspace_id,'projectId',t.project_id,'title',t.title,'description',t.description,'status',t.status,'revision',t.updated_at),
 'application',jsonb_build_object('id',a.id,'revision',a.updated_at),'projectRevision',p.updated_at)
 FROM tasks t JOIN projects p ON p.id=t.project_id AND p.workspace_id=t.workspace_id
 JOIN application_projects ap ON ap.project_id=p.id JOIN applications a ON a.id=ap.application_id AND a.workspace_id=t.workspace_id
 WHERE t.id=$1 AND (SELECT count(*) FROM application_projects WHERE project_id=p.id)=1
$$;
CREATE FUNCTION task_interview_source(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(task_interview_context(t)::text,'UTF8')),'hex')
$$;
CREATE FUNCTION task_interview_record(r UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT jsonb_build_object('id',id,'title',title,'revision',encode(sha256(convert_to(to_jsonb(c)::text,'UTF8')),'hex')) FROM company_records c WHERE id=r AND status<>'archived'
$$;
CREATE FUNCTION task_interview_status(c UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT COALESCE((SELECT CASE action WHEN 'answer' THEN 'proposed' WHEN 'defer' THEN 'deferred' ELSE 'accepted' END FROM task_interview_entries WHERE case_id=c ORDER BY version DESC LIMIT 1),'pending')
$$;
CREATE FUNCTION task_interview_pending(t UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)) AND NOT EXISTS(SELECT 1 FROM task_interview_cases successor WHERE successor.supersedes_id=c.id) AND task_interview_status(c.id)<>'accepted')
$$;
CREATE FUNCTION task_interview_version(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'head',(SELECT max(version) FROM task_interview_entries WHERE case_id=c.id)) ORDER BY c.id)::text FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t))),'[]'),'UTF8')),'hex')
$$;
CREATE FUNCTION task_interview_owner(w UUID,u UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=w AND user_id=u AND role='owner')
$$;
CREATE FUNCTION task_interview_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE c task_interview_cases; ref JSONB; dep JSONB; q JSONB; latest TEXT; source JSONB; n INT;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'interview_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;NEW.created_at:=now();
 IF TG_TABLE_NAME='task_interview_cases' THEN
  source:=task_interview_context(NEW.task_id);
  SELECT * INTO c FROM task_interview_cases WHERE workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND unknown_key=NEW.unknown_key ORDER BY version DESC LIMIT 1;
  IF NEW.version<>COALESCE(c.version,0)+1 OR NEW.supersedes_id IS DISTINCT FROM c.id OR c.id IS NOT NULL AND
   (NEW.task_id<>c.task_id OR NOT task_interview_owner(NEW.workspace_id,NEW.actor_user_id) OR length(trim(COALESCE(NEW.revision_reason,'')))<3) THEN RAISE EXCEPTION 'interview_revision_invalid'; END IF;
  IF source IS NULL OR source->'task'->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text OR source->'application'->>'id' IS DISTINCT FROM NEW.application_id::text
   OR source->'task'->>'status' NOT IN ('todo','in_progress','blocked') OR NEW.source_version IS DISTINCT FROM task_interview_source(NEW.task_id) OR NEW.source_snapshot IS DISTINCT FROM source
   OR NOT task_interview_owner(NEW.workspace_id,NEW.principal_id) OR NEW.body->>'principalId' IS DISTINCT FROM NEW.principal_id::text
   OR NEW.body->>'decisionClass' IS DISTINCT FROM NEW.decision_class OR NEW.body->>'unknownKey' IS DISTINCT FROM NEW.unknown_key
   THEN RAISE EXCEPTION 'interview_scope_invalid'; END IF;
  IF NEW.actor_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.actor_user_id AND role IN ('owner','admin','member')) THEN RAISE EXCEPTION 'interview_forbidden'; END IF;
  IF NEW.actor_agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM task_capability_grants g WHERE g.id=NEW.capability_grant_id AND g.task_id=NEW.task_id AND g.agent_id=NEW.actor_agent_id AND g.credential_id=NEW.actor_credential_id AND g.operation='interview_prepare' AND task_capability_status(g)='active' AND g.snapshot->'interview'->>'unknownKey'=NEW.unknown_key AND g.snapshot->'interview'->>'decisionClass'=NEW.decision_class AND g.snapshot->'interview'->>'principalId'=NEW.principal_id::text) THEN RAISE EXCEPTION 'interview_grant_required'; END IF;
  IF NEW.actor_agent_id IS NOT NULL AND (jsonb_array_length(NEW.body->'dependencies')<>1 OR NEW.body->'dependencies'->0->>'taskId' IS DISTINCT FROM NEW.task_id::text) THEN RAISE EXCEPTION 'interview_scope_invalid'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(NEW.body) k WHERE k NOT IN ('topic','unknownKey','missing','impact','material','decisionClass','principalId','context','recommendation','consequences','scope','deferralEffect','dependencies','gathering','questions')) THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
  IF octet_length(NEW.body::text)>50000 OR NEW.body->'material' IS DISTINCT FROM 'true'::jsonb OR NEW.body->'gathering'->>'status' IS DISTINCT FROM 'completed'
   OR jsonb_typeof(NEW.body->'questions') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.body->'questions') NOT BETWEEN 1 AND 3
   OR jsonb_typeof(NEW.body->'gathering'->'checkedSources') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.body->'gathering'->'checkedSources') NOT BETWEEN 1 AND 8
   OR jsonb_typeof(NEW.body->'dependencies') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.body->'dependencies') NOT BETWEEN 1 AND 8
   THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
  FOR ref IN SELECT to_jsonb(k) FROM unnest(ARRAY['topic','missing','impact','context','recommendation','consequences','scope','deferralEffect']) k LOOP
   IF length(trim(COALESCE(NEW.body->>(ref#>>'{}'),''))) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
  END LOOP;
  IF length(trim(COALESCE(NEW.body->'gathering'->>'remainingHumanDecision','')))<3 THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
  FOR q IN SELECT * FROM jsonb_array_elements(NEW.body->'questions') LOOP
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(q) k WHERE k NOT IN ('field','type','question','requiresHuman','options')) THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
   IF q->'requiresHuman' IS DISTINCT FROM 'true'::jsonb OR COALESCE(q->>'field','') !~ '^[a-z][a-z0-9_]{1,63}$' OR COALESCE(q->>'type','') NOT IN ('fact','choice','decision') OR jsonb_typeof(q->'question') IS DISTINCT FROM 'string' OR length(trim(COALESCE(q->>'question',''))) NOT BETWEEN 3 AND 2000 OR jsonb_typeof(q->'options') IS DISTINCT FROM 'array'
    OR jsonb_array_length(q->'options')>6 OR q->>'type'='choice' AND jsonb_array_length(q->'options')<2 THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') x WHERE jsonb_typeof(x)<>'string' OR length(trim(x#>>'{}')) NOT BETWEEN 1 AND 2000) THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT item->>'field') OR count(*)<>count(DISTINCT lower(regexp_replace(trim(item->>'question'),'[[:space:]]+',' ','g'))) FROM jsonb_array_elements(NEW.body->'questions') item) THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
  FOR ref IN SELECT * FROM jsonb_array_elements(NEW.body->'gathering'->'checkedSources') LOOP
   IF NOT EXISTS(SELECT 1 FROM company_records r WHERE r.id::text=ref->>'id' AND r.workspace_id=NEW.workspace_id AND (r.application_id IS NULL OR r.application_id=NEW.application_id) AND task_interview_record(r.id)->>'revision'=ref->>'revision') OR length(trim(COALESCE(ref->>'findings','')))<3 THEN RAISE EXCEPTION 'interview_evidence_invalid'; END IF;
  END LOOP;
  FOR dep IN SELECT * FROM jsonb_array_elements(NEW.body->'dependencies') LOOP
   IF NOT EXISTS(SELECT 1 FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id WHERE t.id::text=dep->>'taskId' AND t.workspace_id=NEW.workspace_id AND ap.application_id=NEW.application_id
    AND (t.id=NEW.task_id OR EXISTS(SELECT 1 FROM dependencies d WHERE d.workspace_id=NEW.workspace_id AND d.status='active' AND d.from_entity_type='task' AND d.to_entity_type='task' AND d.dependency_type IN ('depends_on','blocks','requires','review_correction') AND (d.from_entity_id=NEW.task_id::text AND d.to_entity_id=t.id::text OR d.to_entity_id=NEW.task_id::text AND d.from_entity_id=t.id::text))))
    OR length(trim(COALESCE(dep->>'blockedPart','')))<3 THEN RAISE EXCEPTION 'interview_scope_invalid'; END IF;
  END LOOP;
 ELSE
  SELECT * INTO c FROM task_interview_cases WHERE id=NEW.case_id;
  IF c.workspace_id IS DISTINCT FROM NEW.workspace_id OR NEW.actor_user_id<>c.principal_id OR NOT task_interview_owner(c.workspace_id,NEW.actor_user_id) THEN RAISE EXCEPTION 'interview_forbidden'; END IF;
  IF EXISTS(SELECT 1 FROM task_interview_cases WHERE supersedes_id=c.id) OR c.source_version IS DISTINCT FROM task_interview_source(c.task_id) THEN RAISE EXCEPTION 'interview_stale'; END IF;
  FOR ref IN SELECT * FROM jsonb_array_elements(c.body->'gathering'->'checkedSources') LOOP
   IF NOT EXISTS(SELECT 1 FROM company_records r WHERE r.id::text=ref->>'id' AND r.workspace_id=c.workspace_id AND (r.application_id IS NULL OR r.application_id=c.application_id) AND task_interview_record(r.id)->>'revision'=ref->>'revision') THEN RAISE EXCEPTION 'interview_evidence_invalid'; END IF;
  END LOOP;
  SELECT count(*)+1 INTO n FROM task_interview_entries WHERE case_id=c.id;
  latest:=task_interview_status(c.id);
  IF n>500 OR NEW.version<>n OR latest='accepted' OR NEW.action='accept' AND latest<>'proposed' OR NEW.action='answer' AND latest='proposed' OR NEW.action='defer' AND latest='deferred' THEN RAISE EXCEPTION 'interview_transition_invalid'; END IF;
  IF length(trim(COALESCE(NEW.body->>'reason','')))<3 THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
  IF NEW.action='answer' THEN
   IF NEW.decision_id IS NULL OR jsonb_array_length(NEW.body->'answers')<>jsonb_array_length(c.body->'questions') OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.body->'questions') item WHERE (SELECT count(*) FROM jsonb_array_elements(NEW.body->'answers') a WHERE a->>'field'=item->>'field' AND length(trim(COALESCE(a->>'value',''))) BETWEEN 1 AND 2000)<>1)
    OR NOT EXISTS(SELECT 1 FROM decisions d WHERE d.id=NEW.decision_id AND d.workspace_id=NEW.workspace_id AND d.status='proposed' AND d.source='roost_interview' AND d.external_id=c.id::text AND d.title=c.body->>'topic' AND d.context=c.body->>'context' AND d.problem=c.body->>'missing' AND d.rationale=c.body->>'recommendation' AND d.consequences=c.body->>'consequences' AND d.decision::jsonb=NEW.body->'answers' AND d.outcome::jsonb=jsonb_build_object('scope',c.body->'scope','dependencies',c.body->'dependencies','deferralEffect',c.body->'deferralEffect')) THEN RAISE EXCEPTION 'interview_proposal_required'; END IF;
  ELSIF NEW.decision_id IS NOT NULL THEN RAISE EXCEPTION 'interview_content_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_interview_guard BEFORE INSERT OR UPDATE OR DELETE ON task_interview_cases FOR EACH ROW EXECUTE FUNCTION task_interview_guard();
CREATE TRIGGER task_interview_guard BEFORE INSERT OR UPDATE OR DELETE ON task_interview_entries FOR EACH ROW EXECUTE FUNCTION task_interview_guard();
ALTER FUNCTION task_admission_view(UUID,TEXT) RENAME TO task_admission_view_before_interview;
CREATE FUNCTION task_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject') AND task_interview_pending(t) THEN RETURN jsonb_build_object('status','blocked','reason','material_unknown_pending','seal',NULL,'gates','[]'::jsonb); END IF;
 RETURN task_admission_view_before_interview(t,op);
END $$;
CREATE FUNCTION task_interview_ready_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t UUID; pin JSONB;
BEGIN
 IF TG_TABLE_NAME='tasks' THEN t:=NEW.id;pin:=NEW.execution_readiness;
  IF pin->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
 ELSE
  t:=NEW.task_id; SELECT execution_readiness INTO pin FROM tasks WHERE id=t;
  IF NEW.status::text NOT IN ('queued','claimed','running','waiting_for_approval','completed') OR NEW.cancel_requested_at IS NOT NULL OR NEW.context_invalidated_at IS NOT NULL OR TG_OP='UPDATE' AND OLD.status::text IN ('completed','cancelled','failed') THEN RETURN NEW; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t))) AND
  (task_interview_pending(t) OR pin->>'interviewVersion' IS DISTINCT FROM task_interview_version(t)) THEN RAISE EXCEPTION 'interview_ready_required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_interview_ready_guard BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION task_interview_ready_guard();
CREATE TRIGGER task_interview_ready_guard BEFORE INSERT OR UPDATE ON agent_executions FOR EACH ROW EXECUTE FUNCTION task_interview_ready_guard();
CREATE FUNCTION task_interview_effects() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='task_interview_cases' THEN
  UPDATE agent_executions SET context_invalidated_at=now(),cancel_requested_at=COALESCE(cancel_requested_at,now()),context_invalidation=jsonb_build_object('reason','material_unknown_pending','caseId',NEW.id)
   WHERE task_id IN (SELECT (d->>'taskId')::uuid FROM jsonb_array_elements(NEW.body->'dependencies') d) AND status::text IN ('queued','claimed','running','waiting_for_approval') AND context_invalidated_at IS NULL;
 ELSIF NEW.action='accept' THEN
  UPDATE decisions SET status='accepted' WHERE id=(SELECT decision_id FROM task_interview_entries WHERE case_id=NEW.case_id AND action='answer' ORDER BY version DESC LIMIT 1);
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER task_interview_effects AFTER INSERT ON task_interview_cases FOR EACH ROW EXECUTE FUNCTION task_interview_effects();
CREATE TRIGGER task_interview_effects AFTER INSERT ON task_interview_entries FOR EACH ROW EXECUTE FUNCTION task_interview_effects();
CREATE FUNCTION task_interview_decision_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.source='roost_interview' AND (NEW.status<>'proposed' OR NOT EXISTS(SELECT 1 FROM task_interview_cases WHERE id::text=NEW.external_id AND workspace_id=NEW.workspace_id)) THEN RAISE EXCEPTION 'interview_proposal_required'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.source='roost_interview' OR TG_OP='UPDATE' AND NEW.source='roost_interview' THEN
  IF TG_OP='DELETE' OR OLD.status<>'proposed' OR NEW.status<>'accepted' OR (to_jsonb(NEW)-'status')<>(to_jsonb(OLD)-'status') OR NOT EXISTS(SELECT 1 FROM task_interview_entries a JOIN task_interview_entries e ON a.case_id=e.case_id WHERE a.action='accept' AND e.decision_id=OLD.id AND a.version>e.version) THEN RAISE EXCEPTION 'interview_decision_immutable'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_interview_decision_guard BEFORE INSERT OR UPDATE OR DELETE ON decisions FOR EACH ROW EXECUTE FUNCTION task_interview_decision_guard();

ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_check1;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('clarification_send','clarification_reply','interview_prepare') OR execution_id IS NOT NULL);
ALTER TABLE task_capability_uses ADD COLUMN interview_case_id UUID UNIQUE REFERENCES task_interview_cases(id) ON DELETE RESTRICT;
ALTER TABLE task_capability_uses DROP CONSTRAINT task_capability_uses_check;
ALTER TABLE task_capability_uses ADD CHECK(num_nonnulls(decision_id,action_id,handoff_id,handoff_decision_id,clarification_entry_id,interview_case_id)=1);
CREATE FUNCTION task_interview_grant_scope(t UUID,kid UUID,u UUID,b JSONB) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE k api_keys; c JSONB; role_ref JSONB;
BEGIN
 SELECT * INTO k FROM api_keys WHERE id=kid;c:=task_interview_context(t);
 IF c IS NULL OR c->'task'->>'workspaceId' IS DISTINCT FROM k.workspace_id::text OR NOT task_interview_owner(k.workspace_id,(b->>'principalId')::uuid)
 OR NOT EXISTS(SELECT 1 FROM unnest(ARRAY['accountableManager','executor','verifier','releaser']) r WHERE task_handoff_principal(t,r)=jsonb_build_object('kind','agent','id',k.bound_agent_id)) THEN RETURN NULL; END IF;
 RETURN encode(sha256(convert_to(jsonb_build_object('context',c,'binding',b,'roleContext',task_clarification_context(t),'key',jsonb_build_object('id',k.id,'version',k.credential_version,'active',k.active,'revoked',k.revoked_at,'expiry',k.expires_at),'issuer',(SELECT to_jsonb(m) FROM workspace_memberships m WHERE workspace_id=k.workspace_id AND user_id=u))::text,'UTF8')),'hex');
END $$;
ALTER FUNCTION task_capability_base_before_suspension(task_capability_grants) RENAME TO task_capability_base_before_interview;
CREATE FUNCTION task_capability_base_before_suspension(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE k api_keys; stamp TIMESTAMP:=clock_timestamp() AT TIME ZONE 'UTC'; hash TEXT;
BEGIN
 IF g.operation<>'interview_prepare' THEN RETURN task_capability_base_before_interview(g); END IF;
 IF EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id) THEN RETURN 'revoked'; END IF;
 IF g.valid_until<=stamp THEN RETURN 'expired'; END IF;
 SELECT * INTO k FROM api_keys WHERE id=g.credential_id AND workspace_id=g.workspace_id AND bound_agent_id=g.agent_id;
 hash:=task_interview_grant_scope(g.task_id,g.credential_id,g.issuer_user_id,g.snapshot->'interview');
 IF k.id IS NULL OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at<=stamp OR k.credential_version<>g.credential_version OR NOT k.scopes @> '["agent-runtime:write"]'::jsonb
 OR hash IS NULL OR hash IS DISTINCT FROM g.scope_hash OR task_admission_seal(g.task_id,g.operation) IS NULL OR g.application_id::text IS DISTINCT FROM task_interview_context(g.task_id)->'application'->>'id'
 OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=g.workspace_id AND user_id=g.issuer_user_id AND role IN ('owner','admin')) THEN RETURN 'invalidated'; END IF;
 RETURN CASE WHEN g.valid_from>stamp THEN 'pending' ELSE 'active' END;
END $$;
ALTER FUNCTION task_capability_effect_scope(task_capability_grants) RENAME TO task_capability_effect_scope_before_interview;
CREATE FUNCTION task_capability_effect_scope(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF g.operation='interview_prepare' THEN RETURN task_interview_grant_scope(g.task_id,g.credential_id,g.issuer_user_id,g.snapshot->'interview'); END IF;
 RETURN task_capability_effect_scope_before_interview(g);
END $$;
CREATE FUNCTION task_interview_receipt() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.capability_grant_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM task_capability_uses u JOIN task_capability_grants g ON g.id=u.grant_id WHERE u.interview_case_id=NEW.id AND u.grant_id=NEW.capability_grant_id AND u.request_id=NEW.request_id AND task_capability_base(g)='active' AND u.post_scope_hash=task_capability_effect_scope(g)) THEN RAISE EXCEPTION 'interview_receipt_required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER task_interview_receipt AFTER INSERT ON task_interview_cases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_interview_receipt();
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
  IF NEW.interview_case_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.id=NEW.interview_case_id AND c.capability_grant_id=g.id AND c.request_id=NEW.request_id AND c.actor_agent_id=g.agent_id AND c.actor_credential_id=g.credential_id AND g.operation='interview_prepare') THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  ELSIF NEW.clarification_entry_id IS NOT NULL THEN
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
ALTER FUNCTION task_capability_status(task_capability_grants) RENAME TO task_capability_status_before_interview;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 IF g.operation<>'interview_prepare' THEN RETURN task_capability_status_before_interview(g); END IF;
 IF EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN RETURN 'consumed'; END IF;
 RETURN task_capability_base(g);
END $$;
CREATE FUNCTION task_interview_proposal_receipt() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.source='roost_interview' AND NOT EXISTS(SELECT 1 FROM task_interview_entries WHERE decision_id=NEW.id AND action='answer') THEN RAISE EXCEPTION 'interview_proposal_required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER task_interview_proposal_receipt AFTER INSERT ON decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_interview_proposal_receipt();
ALTER FUNCTION task_capability_scope(UUID,UUID,UUID) RENAME TO task_capability_scope_before_interview;
CREATE FUNCTION task_capability_scope(t UUID,k UUID,u UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE base TEXT;
BEGIN
 base:=task_capability_scope_before_interview(t,k,u);
 IF base IS NULL OR NOT EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t))) THEN RETURN base; END IF;
 RETURN encode(sha256(convert_to(base||task_interview_version(t),'UTF8')),'hex');
END $$;
COMMIT;
