BEGIN;
-- Add only the already accepted decision_supersede operation to composition.
-- No business updates, seeding, history edits or authority synthesis.
-- The current admission-source decision epoch wrapper remains unchanged: its
-- renamed composition-source predecessor is the operation-list owner.
-- Existing decision migration already permits decision admission evidence.
-- Preserve all table constraints and their identities unchanged.

CREATE OR REPLACE FUNCTION procedure_contract_shape(b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE f TEXT; s JSONB; seen TEXT[]:='{}'; roles TEXT[]:=ARRAY['requester','accountableManager','executor','verifier','releaser'];
BEGIN
 IF jsonb_typeof(b)<>'object' OR octet_length(b::text)>60000 OR COALESCE(b->>'kind','') NOT IN ('base','extension')
 OR COALESCE(b->>'taskType','') NOT IN ('code_change','maintenance','migration','review')
 OR COALESCE(b->>'operation','') NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede')
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
  IF NEW.operation NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede') OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id)
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
 IF s.id IS NULL OR required IS NULL OR op NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede') THEN
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
  (SELECT jsonb_object_agg(op,task_composition_refs((source->>'taskId')::uuid,op)) FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=(source->>'taskId')::uuid AND hs.operation=op))) ORDER BY source->>'taskId')
 FROM jsonb_array_elements(task_risk_sources_before_composition(target)) source
$$;

CREATE OR REPLACE FUNCTION task_admission_source_before_decision(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 WITH refs AS MATERIALIZED (SELECT op,task_composition_refs(t,op) AS value FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede']) op WHERE op IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR EXISTS(SELECT 1 FROM task_composition_selections hs WHERE hs.task_id=t AND hs.operation=op)),
 versions AS (SELECT v.* FROM procedure_contract_versions v WHERE EXISTS(SELECT 1 FROM refs WHERE v.id::text IN(value->>'base',value->>'extension')))
 SELECT encode(sha256(convert_to(task_admission_source_before_composition(t)||jsonb_build_object(
  'refs',(SELECT jsonb_agg(to_jsonb(refs) ORDER BY op) FROM refs),
  'selections',(SELECT jsonb_agg(to_jsonb(s) ORDER BY operation) FROM (SELECT DISTINCT ON(operation) * FROM task_composition_selections WHERE task_id=t ORDER BY operation,version DESC) s),
  'validity',(SELECT jsonb_agg(jsonb_build_object('id',v.id,'valid',procedure_contract_valid(v::procedure_contract_versions),'source',procedure_contract_source(v.procedure_id)) ORDER BY v.id) FROM versions v),
  'exceptions',(SELECT jsonb_agg(to_jsonb(e) ORDER BY operation,missing,version) FROM (SELECT DISTINCT ON(operation,missing) * FROM task_composition_exceptions WHERE task_id=t ORDER BY operation,missing,version DESC) e))::text,'UTF8')),'hex')
$$;

COMMIT;
