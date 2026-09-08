BEGIN;
-- Contracts extend the canonical Procedure identity. No business data is seeded.
CREATE TABLE procedure_contract_versions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE RESTRICT, version INT NOT NULL,
 source_version TEXT NOT NULL, body JSONB NOT NULL, rationale TEXT NOT NULL,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(procedure_id,version), UNIQUE(workspace_id,request_id)
);
CREATE TABLE procedure_contract_withdrawals (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 version_id UUID NOT NULL UNIQUE REFERENCES procedure_contract_versions(id) ON DELETE RESTRICT,
 rationale TEXT NOT NULL, actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(workspace_id,request_id)
);
CREATE TABLE procedure_contract_source_invalidations (
 version_id UUID PRIMARY KEY REFERENCES procedure_contract_versions(id) ON DELETE RESTRICT,
 invalidated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE task_composition_selections (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, operation TEXT NOT NULL,
 version INT NOT NULL, scope_id UUID NOT NULL REFERENCES task_admission_scopes(id) ON DELETE RESTRICT,
 base_procedure_id UUID REFERENCES procedures(id) ON DELETE RESTRICT,
 extension_procedure_id UUID REFERENCES procedures(id) ON DELETE RESTRICT,
 rationale TEXT NOT NULL, actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(task_id,operation,version), UNIQUE(workspace_id,request_id)
);
CREATE TABLE task_composition_exceptions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, operation TEXT NOT NULL, version INT NOT NULL,
 selection_id UUID NOT NULL REFERENCES task_composition_selections(id) ON DELETE RESTRICT,
 missing TEXT NOT NULL CHECK(missing IN ('base','extension')), anchor TEXT NOT NULL,
 rationale TEXT NOT NULL, actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(task_id,operation,missing,version), UNIQUE(workspace_id,request_id)
);
CREATE INDEX procedure_contract_lookup ON procedure_contract_versions(procedure_id,version DESC);
CREATE INDEX composition_exception_lookup ON task_composition_exceptions(task_id,operation,missing,version DESC);

CREATE FUNCTION procedure_contract_source(p UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('procedure',to_jsonb(x),'steps',
  (SELECT jsonb_agg(to_jsonb(s) ORDER BY step_order) FROM procedure_steps s WHERE procedure_id=p))::text,'UTF8')),'hex') FROM procedures x WHERE id=p
$$;
CREATE FUNCTION procedure_contract_valid(v procedure_contract_versions) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT v.id IS NOT NULL AND v.source_version=procedure_contract_source(v.procedure_id)
 AND EXISTS(SELECT 1 FROM procedures WHERE id=v.procedure_id AND workspace_id=v.workspace_id AND status='active')
 AND EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=v.workspace_id AND user_id=v.actor_user_id AND role='owner')
 AND NOT EXISTS(SELECT 1 FROM procedure_contract_withdrawals WHERE version_id=v.id)
 AND NOT EXISTS(SELECT 1 FROM procedure_contract_source_invalidations WHERE version_id=v.id)
$$;

-- Only additive requirements and tool narrowing are representable. Step dependencies
-- must refer to earlier steps: fixed two-layer depth, at most 50 steps, no recursion.
CREATE FUNCTION procedure_contract_shape(b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE f TEXT; s JSONB; seen TEXT[]:='{}'; roles TEXT[]:=ARRAY['requester','accountableManager','executor','verifier','releaser'];
BEGIN
 IF jsonb_typeof(b)<>'object' OR octet_length(b::text)>60000 OR COALESCE(b->>'kind','') NOT IN ('base','extension')
 OR COALESCE(b->>'taskType','') NOT IN ('code_change','maintenance','migration','review')
 OR COALESCE(b->>'operation','') NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task')
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

CREATE FUNCTION task_composition_refs(t UUID,op TEXT,use_pin BOOLEAN DEFAULT true) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE sel task_composition_selections; scope task_admission_scopes; risk task_risk_scopes; pinned JSONB; base_id UUID; ext_id UUID;
BEGIN
 SELECT * INTO scope FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 SELECT * INTO risk FROM task_risk_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 SELECT * INTO sel FROM task_composition_selections WHERE task_id=t AND operation=op ORDER BY version DESC LIMIT 1;
 IF use_pin THEN SELECT CASE WHEN op='runtime_execute' THEN execution_readiness->'procedureComposition' ELSE execution_readiness->'procedureCompositionSet'->op END INTO pinned FROM tasks WHERE id=t AND execution_readiness->>'status'='ready'; END IF;
 IF pinned->>'selectionId'=sel.id::text THEN RETURN pinned->'refs'; END IF;
 SELECT id INTO base_id FROM procedure_contract_versions WHERE procedure_id=sel.base_procedure_id AND body->>'operation'=op AND body->>'taskType'=scope.input->>'taskType' ORDER BY version DESC LIMIT 1;
 SELECT id INTO ext_id FROM procedure_contract_versions WHERE procedure_id=sel.extension_procedure_id AND body->>'operation'=op AND body->>'taskType'=scope.input->>'taskType'
  AND body->>'applicationId'=scope.application_id::text AND body->>'componentId'=risk.input->'contract'->'singleTask'->'component'->>'id' ORDER BY version DESC LIMIT 1;
 RETURN jsonb_build_object('base',base_id,'extension',ext_id);
END $$;

ALTER FUNCTION task_risk_sources(UUID) RENAME TO task_risk_sources_before_composition;
CREATE FUNCTION task_risk_sources(target UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT jsonb_agg(source||jsonb_build_object('compositionRefs',
  (SELECT jsonb_object_agg(op,task_composition_refs((source->>'taskId')::uuid,op)) FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task']) op)) ORDER BY source->>'taskId')
 FROM jsonb_array_elements(task_risk_sources_before_composition(target)) source
$$;

CREATE FUNCTION task_composition(t UUID,op TEXT,use_pin BOOLEAN DEFAULT true,include_exceptions BOOLEAN DEFAULT true) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE sel task_composition_selections; scope task_admission_scopes; risk task_risk_scopes; base procedure_contract_versions; ext procedure_contract_versions;
 refs JSONB; pinned JSONB; missing JSONB:='[]'; conflicts JSONB:='[]'; fields JSONB:='{}'; steps JSONB:='[]'; exceptions JSONB:='[]';
 gates TEXT[]; source JSONB; anchor TEXT; result JSONB; k TEXT; layer TEXT; b JSONB; s JSONB; seen TEXT[]:='{}'; e task_composition_exceptions; expires TIMESTAMPTZ; risk_id UUID;
BEGIN
 SELECT * INTO scope FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 SELECT * INTO risk FROM task_risk_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 SELECT * INTO sel FROM task_composition_selections WHERE task_id=t AND operation=op ORDER BY version DESC LIMIT 1;
 gates:=task_admission_required(t);
 risk_id:=task_risk_current(t);
 IF scope.id IS NULL OR risk.id IS NULL OR risk_id IS NULL OR gates IS NULL THEN missing:=missing||'"risk"'::jsonb; END IF;
 IF sel.id IS NULL OR sel.scope_id IS DISTINCT FROM scope.id THEN missing:=missing||'"selection"'::jsonb; END IF;
 refs:=task_composition_refs(t,op,use_pin);
 SELECT * INTO base FROM procedure_contract_versions WHERE id=(refs->>'base')::uuid;
 SELECT * INTO ext FROM procedure_contract_versions WHERE id=(refs->>'extension')::uuid;
 IF base.id IS NULL THEN missing:=missing||'"base"'::jsonb; END IF;
 IF ext.id IS NULL THEN missing:=missing||'"extension"'::jsonb; END IF;
 IF ext.id IS NULL AND EXISTS(SELECT 1 FROM procedure_contract_versions WHERE procedure_id=sel.extension_procedure_id) THEN conflicts:=conflicts||'"extension_binding_conflict"'::jsonb; END IF;
 IF base.id IS NULL AND EXISTS(SELECT 1 FROM procedure_contract_versions WHERE procedure_id=sel.base_procedure_id) THEN conflicts:=conflicts||'"base_binding_conflict"'::jsonb; END IF;
 FOREACH layer IN ARRAY ARRAY['base','extension'] LOOP
  b:=CASE WHEN layer='base' THEN base.body ELSE ext.body END;
  IF b IS NULL THEN CONTINUE; END IF;
  IF NOT procedure_contract_shape(b) OR NOT procedure_contract_valid(CASE WHEN layer='base' THEN base ELSE ext END) THEN conflicts:=conflicts||jsonb_build_array(layer||'_source_invalid'); END IF;
  IF b->>'kind'<>layer OR b->>'operation'<>op OR b->>'taskType' IS DISTINCT FROM scope.input->>'taskType'
   OR (CASE WHEN layer='base' THEN base.workspace_id ELSE ext.workspace_id END) IS DISTINCT FROM scope.workspace_id THEN conflicts:=conflicts||jsonb_build_array(layer||'_binding_conflict'); END IF;
  IF layer='extension' AND (ext.body->>'applicationId' IS DISTINCT FROM scope.application_id::text OR ext.body->>'componentId' IS DISTINCT FROM risk.input->'contract'->'singleTask'->'component'->>'id'
   OR ext.body->>'baseProcedureId' IS DISTINCT FROM sel.base_procedure_id::text OR sel.base_procedure_id=sel.extension_procedure_id) THEN conflicts:=conflicts||'"extension_binding_conflict"'::jsonb; END IF;
  IF layer='extension' AND base.id IS NOT NULL AND NOT (base.body->'tools') @> (ext.body->'tools') THEN conflicts:=conflicts||'"tools_widening"'::jsonb; END IF;
  FOREACH k IN ARRAY ARRAY['inputs','outputs','evidence','completion','roles'] LOOP
   fields:=jsonb_set(fields,ARRAY[k],COALESCE(fields->k,'[]')||COALESCE((SELECT jsonb_agg(jsonb_build_object('value',x,'source',layer,'versionId',CASE WHEN layer='base' THEN base.id ELSE ext.id END)) FROM jsonb_array_elements(b->k) x),'[]'));
  END LOOP;
  FOR s IN SELECT * FROM jsonb_array_elements(b->'steps') LOOP
   IF s->>'key'=ANY(seen) THEN conflicts:=conflicts||jsonb_build_array('step_conflict:'||(s->>'key')); END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(s->'requires') r WHERE NOT r=ANY(seen)) THEN conflicts:=conflicts||jsonb_build_array('dependency_conflict:'||(s->>'key')); END IF;
   seen:=array_append(seen,s->>'key'); steps:=steps||jsonb_build_array(s||jsonb_build_object('source',layer,'versionId',CASE WHEN layer='base' THEN base.id ELSE ext.id END));
  END LOOP;
 END LOOP;
 IF jsonb_array_length(steps)>50 THEN conflicts:=conflicts||'"step_limit"'::jsonb; END IF;
 -- An omitted base never supplies tools: the existing exact prepared task
 -- allowlist remains the ceiling, and packet/role admission independently checks it.
 fields:=fields||jsonb_build_object('tools',CASE WHEN base.id IS NULL THEN
  COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements(COALESCE(risk.input->'contract'->'access'->'tools','[]')) x WHERE ext.id IS NULL OR ext.body->'tools' @> jsonb_build_array(x)),'[]')
  WHEN ext.id IS NOT NULL THEN ext.body->'tools' ELSE base.body->'tools' END,
  'toolProvenance',jsonb_build_object('base',base.id,'extension',ext.id,'preparedTask',risk.id,'override','intersection_only'));
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(steps) step_value WHERE NOT (fields->'tools') @> (step_value->'tools')) THEN conflicts:=conflicts||'"step_tools_removed"'::jsonb; END IF;
 fields:=fields||jsonb_build_object('removedTools',COALESCE((SELECT jsonb_agg(tool) FROM jsonb_array_elements(COALESCE(base.body->'tools','[]')) tool WHERE NOT fields->'tools' @> jsonb_build_array(tool)),'[]'));
 source:=jsonb_build_object('algorithm','roost-procedure-composition-v1','selectionId',sel.id,'scopeId',scope.id,'riskId',risk_id,'operation',op,
  'applicationId',scope.application_id,'componentId',risk.input->'contract'->'singleTask'->'component'->>'id','taskType',scope.input->>'taskType','refs',refs,
  'baseSource',procedure_contract_source(base.procedure_id),'extensionSource',procedure_contract_source(ext.procedure_id),'gates',gates,
  'gateProvenance',(SELECT jsonb_agg(jsonb_build_object('gate',gate_name,'source','risk','riskId',risk_id,'policy','roost-native-risk-admission-v1')) FROM unnest(gates) gate_name),
  'missing',missing,'conflicts',conflicts);
 anchor:=encode(sha256(convert_to(source::text,'UTF8')),'hex');
 IF include_exceptions THEN
  FOREACH k IN ARRAY ARRAY['base','extension'] LOOP
   IF NOT missing @> jsonb_build_array(k) THEN CONTINUE; END IF;
   SELECT * INTO e FROM task_composition_exceptions exception_row WHERE exception_row.task_id=t AND exception_row.operation=op AND exception_row.missing=k ORDER BY exception_row.version DESC LIMIT 1;
   IF e.id IS NOT NULL AND e.anchor=anchor AND e.selection_id=sel.id AND e.created_at+interval '15 minutes'>now()
    AND task_admission_independent(t,e.actor_user_id) AND e.actor_user_id<>sel.actor_user_id
    AND EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=e.workspace_id AND user_id=e.actor_user_id AND role='owner') THEN
    exceptions:=exceptions||jsonb_build_array(jsonb_build_object('id',e.id,'version',e.version,'missing',e.missing,'rationale',e.rationale,'issuerId',e.actor_user_id,'expiresAt',e.created_at+interval '15 minutes'));
    missing:=missing-k; expires:=least(expires,e.created_at+interval '15 minutes');
   END IF;
  END LOOP;
 END IF;
 result:=source||jsonb_build_object('anchor',anchor,'missing',missing,'fields',fields,'steps',steps,'exceptions',exceptions,'expiresAt',expires,
  'versions',jsonb_build_object('base',base.version,'extension',ext.version),'status',CASE WHEN missing='[]'::jsonb AND conflicts='[]'::jsonb THEN 'composed' ELSE 'blocked' END);
 RETURN result||jsonb_build_object('seal',CASE WHEN result->>'status'='composed' THEN encode(sha256(convert_to(result::text,'UTF8')),'hex') ELSE NULL END);
END $$;

CREATE FUNCTION procedure_composition_insert() RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
  IF NEW.operation NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task') OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id)
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
CREATE FUNCTION procedure_composition_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'procedure_composition_history_immutable'; END $$;
CREATE TRIGGER composition_immutable BEFORE UPDATE OR DELETE ON procedure_contract_source_invalidations FOR EACH ROW EXECUTE FUNCTION procedure_composition_immutable();
DO $$ DECLARE tbl TEXT; BEGIN
 FOREACH tbl IN ARRAY ARRAY['procedure_contract_versions','procedure_contract_withdrawals','task_composition_selections','task_composition_exceptions'] LOOP
  EXECUTE format('CREATE TRIGGER composition_insert BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION procedure_composition_insert()',tbl);
  EXECUTE format('CREATE TRIGGER composition_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION procedure_composition_immutable()',tbl);
 END LOOP;
END $$;

-- Evidence binds the composition before any gate is attested; no dependency on
-- the admission seal itself, so there is no recursive authority dependency.
ALTER FUNCTION task_admission_source(UUID) RENAME TO task_admission_source_before_composition;
CREATE FUNCTION task_admission_source(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 WITH refs AS MATERIALIZED (SELECT op,task_composition_refs(t,op) AS value FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task']) op),
 versions AS (SELECT v.* FROM procedure_contract_versions v WHERE EXISTS(SELECT 1 FROM refs WHERE v.id::text IN(value->>'base',value->>'extension')))
 SELECT encode(sha256(convert_to(task_admission_source_before_composition(t)||jsonb_build_object(
  'refs',(SELECT jsonb_agg(to_jsonb(refs) ORDER BY op) FROM refs),
  'selections',(SELECT jsonb_agg(to_jsonb(s) ORDER BY operation) FROM (SELECT DISTINCT ON(operation) * FROM task_composition_selections WHERE task_id=t ORDER BY operation,version DESC) s),
  'validity',(SELECT jsonb_agg(jsonb_build_object('id',v.id,'valid',procedure_contract_valid(v::procedure_contract_versions),'source',procedure_contract_source(v.procedure_id)) ORDER BY v.id) FROM versions v),
  'exceptions',(SELECT jsonb_agg(to_jsonb(e) ORDER BY operation,missing,version) FROM (SELECT DISTINCT ON(operation,missing) * FROM task_composition_exceptions WHERE task_id=t ORDER BY operation,missing,version DESC) e))::text,'UTF8')),'hex')
$$;
ALTER FUNCTION task_admission_view(UUID,TEXT) RENAME TO task_admission_view_before_composition;
CREATE FUNCTION task_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE a JSONB; c JSONB;
BEGIN
 a:=task_admission_view_before_composition(t,op); c:=task_composition(t,op);
 IF c->>'seal' IS NULL THEN RETURN a||jsonb_build_object('status','blocked','reason','procedure_composition_required','seal',NULL); END IF;
 RETURN a||jsonb_build_object('expiresAt',least((a->>'expiresAt')::timestamptz,(c->>'expiresAt')::timestamptz));
END $$;

CREATE FUNCTION procedure_composition_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t UUID; pin JSONB; c JSONB; use_pin BOOLEAN:=true;
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF TG_TABLE_NAME='tasks' THEN
  IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
  t:=NEW.id; pin:=NEW.execution_readiness;
  use_pin:=false;
  IF TG_OP='UPDATE' THEN use_pin:=OLD.execution_readiness->>'status'='ready'; END IF;
 ELSE
  IF TG_OP='UPDATE' AND OLD.status::text IN ('completed','failed','cancelled') AND NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text NOT IN ('queued','claimed','running','waiting_for_approval','completed') OR NEW.cancel_requested_at IS NOT NULL OR NEW.context_invalidated_at IS NOT NULL OR TG_OP='UPDATE' AND OLD.context_invalidated_at IS NOT NULL THEN RETURN NEW; END IF;
  t:=NEW.task_id; SELECT execution_readiness INTO pin FROM tasks WHERE id=t;
  IF NEW.metadata->'readyContextPin'->>'compositionSeal' IS DISTINCT FROM pin->'procedureComposition'->>'seal' THEN RAISE EXCEPTION 'procedure_composition_pin_invalid'; END IF;
 END IF;
 c:=task_composition(t,'runtime_execute',use_pin);
 IF c->>'seal' IS NULL OR pin->'procedureComposition' IS DISTINCT FROM c THEN RAISE EXCEPTION 'procedure_composition_required'; END IF;
 IF EXISTS(SELECT 1 FROM task_composition_exceptions e WHERE e.task_id=t AND c->'exceptions' @> jsonb_build_array(jsonb_build_object('id',e.id)) AND e.actor_user_id::text=pin->>'requestedById') THEN RAISE EXCEPTION 'procedure_composition_self_approval'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_composition_guard BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION procedure_composition_guard();
CREATE TRIGGER zz_composition_guard BEFORE INSERT OR UPDATE ON agent_executions FOR EACH ROW EXECUTE FUNCTION procedure_composition_guard();

CREATE FUNCTION procedure_composition_invalidate() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r RECORD; a JSONB:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
 FOR r IN SELECT id,execution_readiness FROM tasks WHERE execution_readiness->>'status'='ready' AND
  (TG_TABLE_NAME IN ('task_composition_selections','task_composition_exceptions') AND id::text=a->>'task_id'
   OR TG_TABLE_NAME='procedure_contract_withdrawals' AND (execution_readiness->'procedureComposition'->'refs'->>'base'=a->>'version_id' OR execution_readiness->'procedureComposition'->'refs'->>'extension'=a->>'version_id')) LOOP
  UPDATE tasks SET execution_readiness=execution_readiness||jsonb_build_object('status','needs_revalidation','reason','procedure_composition_changed','invalidatedAt',now()) WHERE id=r.id;
 END LOOP;
 RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN FOREACH tbl IN ARRAY ARRAY['procedure_contract_withdrawals','task_composition_selections','task_composition_exceptions'] LOOP
 EXECUTE format('CREATE TRIGGER composition_invalidate AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION procedure_composition_invalidate()',tbl);
END LOOP; END $$;
CREATE FUNCTION procedure_contract_source_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE a JSONB:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END; b JSONB:=CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END;
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 INSERT INTO procedure_contract_source_invalidations(version_id)
 SELECT id FROM procedure_contract_versions WHERE procedure_id::text IN (CASE WHEN TG_TABLE_NAME='procedures' THEN a->>'id' ELSE a->>'procedure_id' END,b->>'procedure_id') ON CONFLICT DO NOTHING;
 UPDATE tasks SET execution_readiness=execution_readiness||jsonb_build_object('status','needs_revalidation','reason','procedure_composition_changed','invalidatedAt',now())
 WHERE execution_readiness->>'status'='ready' AND EXISTS(SELECT 1 FROM procedure_contract_source_invalidations i WHERE i.version_id::text IN (execution_readiness->'procedureComposition'->'refs'->>'base',execution_readiness->'procedureComposition'->'refs'->>'extension'));
 RETURN NULL;
END $$;
CREATE TRIGGER composition_source_changed AFTER UPDATE OR DELETE ON procedures FOR EACH ROW EXECUTE FUNCTION procedure_contract_source_changed();
CREATE TRIGGER composition_source_changed AFTER INSERT OR UPDATE OR DELETE ON procedure_steps FOR EACH ROW EXECUTE FUNCTION procedure_contract_source_changed();
COMMIT;
