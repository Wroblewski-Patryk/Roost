BEGIN;
-- Add a typed company-only scope. Historical application scopes and all
-- immutable ledgers remain unchanged. No authority is seeded or synthesized.
ALTER TABLE task_risk_scopes ADD COLUMN scope_kind TEXT NOT NULL DEFAULT 'application';
ALTER TABLE task_risk_scopes ALTER COLUMN application_id DROP NOT NULL, ALTER COLUMN component_id DROP NOT NULL;
ALTER TABLE task_risk_scopes ADD CONSTRAINT task_risk_scope_kind CHECK (
 (scope_kind='application' AND application_id IS NOT NULL AND component_id IS NOT NULL)
 OR (scope_kind='company_information' AND application_id IS NULL AND component_id IS NULL AND release_set_id IS NULL));
ALTER TABLE task_admission_scopes ADD COLUMN scope_kind TEXT NOT NULL DEFAULT 'application';
ALTER TABLE task_admission_scopes ALTER COLUMN application_id DROP NOT NULL, ALTER COLUMN target_id DROP NOT NULL, ALTER COLUMN release_id DROP NOT NULL;
ALTER TABLE task_admission_scopes ADD CONSTRAINT task_admission_scope_kind CHECK (
 (scope_kind='application' AND application_id IS NOT NULL AND target_id IS NOT NULL AND release_id IS NOT NULL)
 OR (scope_kind='company_information' AND application_id IS NULL AND target_id IS NULL AND release_id IS NULL));

CREATE FUNCTION company_information_risk_contract(t UUID,w UUID,u UUID,b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE c JSONB:=b->'contract'; task tasks; ref JSONB; role_name TEXT;
BEGIN
 IF b->'applicationId' IS DISTINCT FROM 'null'::jsonb OR b->'baseBranch' IS DISTINCT FROM 'null'::jsonb
  OR b->'prompt' IS DISTINCT FROM 'null'::jsonb OR b->'releaseSet' IS DISTINCT FROM 'null'::jsonb
  OR task_risk_contract_shape(c,company_information_runtime_schema()) IS NOT TRUE
  OR c->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses'
  OR c->'modelSelection'->>'riskClass' IS DISTINCT FROM 'low'
  OR c->'modelSelection'->'attemptPolicy'->>'maxTurns' IS DISTINCT FROM '1'
  OR c->'modelSelection'->'attemptPolicy'->>'apiMaxRetries' IS DISTINCT FROM '0'
  OR c->'budgets'->>'maxAttempts' IS DISTINCT FROM '1'
  OR NOT EXISTS(SELECT 1 FROM workspaces ws JOIN workspace_memberships m ON m.workspace_id=ws.id
   AND m.user_id=ws.owner_user_id WHERE ws.id=w AND ws.owner_user_id=u AND m.role::text='owner') THEN RETURN false; END IF;
 SELECT * INTO task FROM tasks WHERE id=t AND workspace_id=w;
 IF NOT FOUND OR task.project_id IS NOT NULL OR task.status::text NOT IN ('todo','in_progress') OR task.goal_id::text IS DISTINCT FROM c->'objective'->>'goalId'
  OR task.assigned_workforce_entity_id::text IS DISTINCT FROM c->'assignment'->>'agentId'
  OR c->'singleTask'->>'contractId' IS DISTINCT FROM 'roost-task:'||t::text
  OR c->'singleTask'->'problems'->0->>'outcome' IS DISTINCT FROM c->'objective'->>'outcome'
  OR c->'taskRoles'->'accountableManager' IS DISTINCT FROM c->'singleTask'->'accountableManager'
  OR NOT EXISTS(SELECT 1 FROM goals WHERE id=task.goal_id AND workspace_id=w)
  OR c->'taskRoles'->'requester'->>'id' IS DISTINCT FROM u::text
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=w AND m.user_id=u
   AND to_char(m.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=c->'taskRoles'->'requester'->>'revision')
  THEN RETURN false; END IF;
 FOREACH role_name IN ARRAY ARRAY['accountableManager','executor','verifier','releaser'] LOOP
  ref:=c->'taskRoles'->role_name;
  IF NOT EXISTS(SELECT 1 FROM workforce_entities e WHERE e.id::text=ref->>'id' AND e.workspace_id=w AND e.status='active'
   AND to_char(e.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=ref->>'revision') THEN RETURN false; END IF;
 END LOOP;
 IF c->'taskRoles'->'executor'->>'id' IS DISTINCT FROM task.assigned_workforce_entity_id::text
  OR (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'context'->'company'))<>jsonb_array_length(c->'context'->'company') THEN RETURN false; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(c->'context'->'company') LOOP
  IF NOT EXISTS(SELECT 1 FROM company_records r WHERE r.id::text=ref->>'id' AND r.workspace_id=w AND r.application_id IS NULL
   AND r.status IN ('active','approved','accepted') AND to_char(r.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=ref->>'revision'
   AND length(trim(COALESCE(r.description,'')||COALESCE(r.business_purpose,'')||COALESCE(r.desired_state,'')||COALESCE(r.expected_behavior,'')))>0) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- Classification remains the existing seven-dimensional cumulative algorithm.
-- The strict zero-tool company schema is genuinely non-mutating.
ALTER FUNCTION task_risk_readonly_contract(JSONB) RENAME TO task_risk_readonly_contract_before_company;
CREATE FUNCTION task_risk_readonly_contract(c JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF c->>'executionClass'='roost-company-information-runtime-v1' THEN
  RETURN task_risk_contract_shape(c,company_information_runtime_schema());
 END IF;
 RETURN task_risk_readonly_contract_before_company(c);
END $$;

DO $patch$
DECLARE d TEXT; anchor TEXT; branch TEXT;
BEGIN
 SELECT pg_get_functiondef('task_risk_group(uuid)'::regprocedure) INTO d;
 anchor:='COALESCE(s.application_id,(SELECT ap.application_id FROM application_projects ap WHERE ap.project_id=t.project_id ORDER BY ap.application_id LIMIT 1))';
 IF position(anchor IN d)=0 THEN RAISE EXCEPTION 'company_risk_group_anchor_missing'; END IF;
 EXECUTE replace(d,anchor,'CASE WHEN s.scope_kind=''company_information'' THEN NULL ELSE '||anchor||' END');
 SELECT pg_get_functiondef('task_risk_history_guard()'::regprocedure) INTO d;
 anchor:=E' IF TG_TABLE_NAME=''task_risk_scopes'' THEN';
 IF position(anchor IN d)=0 THEN RAISE EXCEPTION 'company_risk_guard_anchor_missing'; END IF;
 branch:=E' IF TG_TABLE_NAME=''task_risk_scopes'' THEN\n'
  || E'  IF NEW.scope_kind=''application'' AND NEW.input->''contract''->>''executionClass'' IN (''roost-company-information-v1'',''roost-company-information-runtime-v1'') THEN RAISE EXCEPTION ''company_risk_scope_kind_mismatch''; END IF;\n'
  || E'  IF NEW.scope_kind=''company_information'' THEN\n'
  || E'  IF NEW.application_id IS NOT NULL OR NEW.component_id IS NOT NULL OR NEW.release_set_id IS NOT NULL\n'
  || E'   OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_risk_scopes WHERE task_id=NEW.task_id)\n'
  || E'   OR company_information_risk_contract(NEW.task_id,NEW.workspace_id,NEW.actor_user_id,NEW.input) IS NOT TRUE THEN RAISE EXCEPTION ''company_risk_scope_invalid''; END IF; RETURN NEW;\n  END IF;\n END IF;\n'
  || E' IF TG_TABLE_NAME=''task_risk_assessments'' AND EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.sources) x JOIN task_risk_scopes s ON s.id::text=x->>''scopeId'' WHERE s.scope_kind=''company_information'') THEN\n'
  || E'  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.sources) x JOIN task_risk_scopes s ON s.id::text=x->>''scopeId'' WHERE s.scope_kind<>''company_information'') THEN RAISE EXCEPTION ''company_risk_mixed_scope_invalid''; END IF;\n'
  || E'  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.sources) x JOIN task_risk_scopes s ON s.id::text=x->>''scopeId'' WHERE s.scope_kind=''company_information'' AND (s.actor_user_id IS DISTINCT FROM NEW.actor_user_id OR company_information_risk_contract(s.task_id,s.workspace_id,NEW.actor_user_id,s.input) IS NOT TRUE)) THEN RAISE EXCEPTION ''company_risk_actor_or_source_invalid''; END IF;\n'
  || E'  FOR item IN SELECT value FROM jsonb_array_elements(NEW.entries) LOOP\n'
  || E'   IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.sources) x JOIN task_risk_scopes s ON s.id::text=x->>''scopeId'' WHERE x->>''taskId''=item->>''taskId'' AND s.scope_kind=''company_information'') THEN\n'
  || E'    FOR ref IN SELECT jsonb_path_query(item,''$.dimensions.*.evidence[*]'') UNION ALL SELECT jsonb_path_query(item,''$.uncertainty.evidence[*]'') LOOP\n'
  || E'     IF NOT EXISTS(SELECT 1 FROM company_records r JOIN task_risk_scopes s ON s.task_id::text=item->>''taskId'' AND s.id::text=(SELECT x->>''scopeId'' FROM jsonb_array_elements(NEW.sources) x WHERE x->>''taskId''=item->>''taskId'') WHERE r.id::text=ref->>''id'' AND r.workspace_id=NEW.workspace_id AND r.application_id IS NULL AND r.status IN (''active'',''approved'',''accepted'') AND s.input->''contract''->''context''->''company'' @> jsonb_build_array(ref)) THEN RAISE EXCEPTION ''company_risk_evidence_invalid''; END IF;\n'
  || E'    END LOOP;\n   END IF;\n  END LOOP;\n END IF;\n';
 EXECUTE replace(d,anchor,branch||anchor);
END $patch$;

CREATE FUNCTION company_information_admission_scope(s task_admission_scopes) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE r task_risk_scopes; risk UUID; op TEXT;
BEGIN
 SELECT * INTO r FROM task_risk_scopes WHERE task_id=s.task_id ORDER BY version DESC LIMIT 1;
 risk:=task_risk_current(s.task_id);
 IF s.scope_kind<>'company_information' OR s.application_id IS NOT NULL OR s.target_id IS NOT NULL OR s.release_id IS NOT NULL
  OR r.scope_kind IS DISTINCT FROM 'company_information' OR r.actor_user_id IS DISTINCT FROM s.actor_user_id
  OR risk IS NULL OR NOT EXISTS(SELECT 1 FROM task_risk_assessments WHERE id=risk AND result->>'level'='low' AND actor_user_id=s.actor_user_id)
  OR company_information_risk_contract(s.task_id,s.workspace_id,s.actor_user_id,r.input) IS NOT TRUE
  OR s.input->>'scopeKind' IS DISTINCT FROM 'company_information' OR s.input->>'taskType' IS DISTINCT FROM 'information'
  OR s.input->>'environment' IS DISTINCT FROM 'local' OR s.input->'commit' IS DISTINCT FROM 'null'::jsonb
  OR s.input->'targetId' IS DISTINCT FROM 'null'::jsonb OR s.input->'releaseId' IS DISTINCT FROM 'null'::jsonb
  OR s.input->'destructive' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_typeof(s.input->'operations') IS DISTINCT FROM 'array' OR jsonb_array_length(s.input->'operations') NOT BETWEEN 1 AND 2
  OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(s.input->'operations'))<>jsonb_array_length(s.input->'operations')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.input->'operations') operation WHERE operation NOT IN ('decision_supersede','runtime_execute'))
  OR NOT EXISTS(SELECT 1 FROM procedures p WHERE p.id=s.procedure_id AND p.workspace_id=s.workspace_id AND p.status='active'
   AND r.input->'contract'->'procedures'->'items' @> jsonb_build_array(jsonb_build_object('id',p.id::text,'revision',p.version::text)))
  OR NOT EXISTS(SELECT 1 FROM procedure_steps WHERE procedure_id=s.procedure_id AND length(trim(instruction))>=3)
  THEN RETURN false; END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

ALTER FUNCTION task_admission_source(UUID) RENAME TO task_admission_source_before_company;
CREATE FUNCTION task_admission_source(t UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE s task_admission_scopes;
BEGIN
 SELECT * INTO s FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 IF s.scope_kind IS DISTINCT FROM 'company_information' THEN RETURN task_admission_source_before_company(t); END IF;
 RETURN encode(sha256(convert_to(jsonb_build_object('kind',s.scope_kind,'risk',task_risk_current(t),'riskVersion',task_risk_version(t),
  'scope',to_jsonb(s),'epoch',(SELECT COALESCE(revision,0) FROM task_admission_heads WHERE task_id=t),
  'procedure',(SELECT to_jsonb(p) FROM procedures p WHERE p.id=s.procedure_id),
  'steps',(SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM procedure_steps x WHERE procedure_id=s.procedure_id))::text,'UTF8')),'hex');
END $$;

CREATE FUNCTION company_information_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE s task_admission_scopes; e task_admission_evidence; state TEXT:='required'; risk UUID; source TEXT; ok BOOLEAN:=false; expiry TIMESTAMPTZ; gate_body JSONB; owner_id UUID;
BEGIN
 SELECT * INTO s FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 IF s.id IS NULL OR company_information_admission_scope(s) IS NOT TRUE OR op NOT IN ('decision_supersede','runtime_execute')
  OR NOT s.input->'operations' @> jsonb_build_array(op) OR task_interview_pending(t)
  OR op='decision_supersede' AND decision_pending_version(t)='[]'
  OR op<>'decision_supersede' AND NOT decision_authority_task_current(t) THEN
  RETURN jsonb_build_object('policy','roost-native-risk-admission-v1','status','blocked','reason','company_scope_or_authority_required','gates','[]'::jsonb,'seal',NULL);
 END IF;
 risk:=task_risk_current(t); source:=task_admission_source(t);
 SELECT owner_user_id INTO owner_id FROM workspaces WHERE id=s.workspace_id;
 SELECT * INTO e FROM task_admission_evidence ae WHERE ae.task_id=t AND ae.operation=op AND ae.gate='procedure' ORDER BY ae.version DESC LIMIT 1;
 IF e.id IS NOT NULL THEN
  SELECT least(a.created_at+interval '24 hours',e.created_at+interval '24 hours') INTO expiry FROM task_risk_assessments a WHERE a.id=risk;
  state:=CASE WHEN e.scope_id IS DISTINCT FROM s.id OR e.source_version IS DISTINCT FROM source OR e.actor_user_id IS DISTINCT FROM owner_id
   OR e.dependency_version IS DISTINCT FROM task_admission_dependencies(t,op,'procedure') OR expiry<=now()
   OR NOT EXISTS(SELECT 1 FROM company_records c WHERE c.id=e.evidence_id AND c.workspace_id=s.workspace_id AND c.application_id IS NULL
    AND c.status IN ('active','approved','accepted') AND c.updated_at=e.evidence_revision)
   THEN 'stale' WHEN e.verdict='failed' THEN 'failed' ELSE 'present' END;
 END IF;
 ok:=state='present';
 gate_body:=jsonb_build_array(jsonb_build_object('gate','procedure','status',state,'evidenceId',e.id,'referenceId',e.evidence_id,'issuerId',e.actor_user_id,
  'version',e.version,'createdAt',e.created_at,'expiresAt',expiry,'detail',e.detail));
 RETURN jsonb_build_object('policy','roost-native-risk-admission-v1','scopeKind',s.scope_kind,'status',CASE WHEN ok THEN 'admitted' ELSE 'blocked' END,
  'reason','required_evidence','scopeId',s.id,'commit',NULL,'gates',gate_body,'expiresAt',expiry,
  'seal',CASE WHEN ok THEN encode(sha256(convert_to(source||op||jsonb_build_array(e.id)::text,'UTF8')),'hex') ELSE NULL END);
END $$;

-- Retain the existing view wrappers for application rows. The company path
-- explicitly retains interview, current authority, pending decision and expiry.
ALTER FUNCTION task_admission_view(UUID,TEXT) RENAME TO task_admission_view_before_company;
CREATE FUNCTION task_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF (SELECT scope_kind FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1)='company_information' THEN
  RETURN company_information_admission_view(t,op);
 END IF;
 RETURN task_admission_view_before_company(t,op);
END $$;

-- Scope insertion branches before inapplicable application-link checks. The
-- evidence path keeps the original detail, freshness, version and history body.
DO $patch$
DECLARE d TEXT; branch TEXT;
BEGIN
 SELECT pg_get_functiondef('task_admission_insert_guard()'::regprocedure) INTO d;
 branch:=E'\n IF TG_TABLE_NAME=''task_admission_scopes'' THEN\n'
  || E'  IF NEW.scope_kind=''company_information'' THEN\n'
  || E'  UPDATE ready_source_fence SET revision=revision+1 WHERE id=1; NEW.created_at:=now();\n'
  || E'  PERFORM 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;\n'
  || E'  IF NOT FOUND OR company_information_admission_scope(NEW) IS NOT TRUE OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_admission_scopes WHERE task_id=NEW.task_id) THEN RAISE EXCEPTION ''company_admission_scope_invalid''; END IF; RETURN NEW;\n  END IF;\n END IF;\n'
  || E' IF TG_TABLE_NAME=''task_admission_evidence'' THEN\n'
  || E'  SELECT * INTO s FROM task_admission_scopes WHERE task_id=NEW.task_id ORDER BY version DESC LIMIT 1;\n'
  || E'  IF s.scope_kind=''company_information'' AND (company_information_admission_scope(s) IS NOT TRUE OR NEW.operation NOT IN (''decision_supersede'',''runtime_execute'') OR NOT s.input->''operations'' @> jsonb_build_array(NEW.operation) OR NEW.gate<>''procedure'' OR NEW.actor_user_id IS DISTINCT FROM s.actor_user_id OR NOT EXISTS(SELECT 1 FROM company_records c WHERE c.id=NEW.evidence_id AND c.workspace_id=NEW.workspace_id AND c.application_id IS NULL AND c.status IN (''active'',''approved'',''accepted'')) OR NOT EXISTS(SELECT 1 FROM task_risk_scopes rs WHERE rs.id=(SELECT id FROM task_risk_scopes WHERE task_id=NEW.task_id ORDER BY version DESC LIMIT 1) AND rs.input->''contract''->''context''->''company'' @> jsonb_build_array(jsonb_build_object(''id'',NEW.evidence_id::text,''revision'',to_char(NEW.evidence_revision AT TIME ZONE ''UTC'',''YYYY-MM-DD"T"HH24:MI:SS.MS"Z"''))))) THEN RAISE EXCEPTION ''company_admission_evidence_forbidden''; END IF;\n END IF;\n';
 IF position('BEGIN' IN d)=0 THEN RAISE EXCEPTION 'company_admission_guard_anchor_missing'; END IF;
 EXECUTE overlay(d placing 'BEGIN'||branch from position('BEGIN' IN d) for length('BEGIN'));
END $patch$;

ALTER FUNCTION company_information_runtime_valid(UUID,UUID,JSONB) RENAME TO company_information_runtime_valid_before_risk;
CREATE FUNCTION company_information_runtime_valid(t UUID,w UUID,pin JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE r task_risk_scopes; s task_admission_scopes; seal TEXT;
BEGIN
 IF company_information_runtime_valid_before_risk(t,w,pin) IS NOT TRUE THEN RETURN false; END IF;
 SELECT * INTO r FROM task_risk_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 SELECT * INTO s FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 seal:=task_admission_seal(t,'runtime_execute');
 RETURN r.scope_kind='company_information' AND s.scope_kind='company_information'
  AND r.input->'contract'=pin->'contract' AND s.actor_user_id::text=pin->>'requestedById'
  AND seal IS NOT NULL AND seal=pin->>'riskAdmissionSeal'
  AND EXISTS(SELECT 1 FROM task_risk_assessments a WHERE a.id=task_risk_current(t) AND a.result->>'level'='low');
END $$;
COMMIT;
