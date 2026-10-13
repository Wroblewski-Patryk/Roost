BEGIN;
-- The existing SQL risk fence required prose in every CompanyRecord. A reference
-- Site's accepted content is instead its task-bound checklist and reviewed package.
-- Keep all other company records under the original prose condition.
CREATE FUNCTION company_information_risk_site_current(t UUID,w UUID,c JSONB,ref JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE p procedures; d reference_site_checklist_decisions; s procedure_steps;
        site company_records; r reference_site_finding_reviews; v finding_versions;
        link JSONB; step_count INTEGER:=0; matched BOOLEAN:=false;
BEGIN
 IF jsonb_array_length(c->'procedures'->'items')<>1
   OR jsonb_array_length(c->'context'->'company') NOT BETWEEN 1 AND 2
   OR ref->>'id' IS NULL THEN RETURN false; END IF;
 SELECT * INTO p FROM procedures WHERE id=(c->'procedures'->'items'->0->>'id')::uuid
   AND workspace_id=w AND scope='roost-reference-site-checklist-v1' AND status='active';
 SELECT * INTO d FROM reference_site_checklist_decisions
   WHERE workspace_id=w AND task_id=t ORDER BY created_at DESC,id DESC LIMIT 1;
 IF p.id IS NULL OR p.version::text IS DISTINCT FROM c->'procedures'->'items'->0->>'revision'
   OR d.id IS NULL OR d.procedure_id IS DISTINCT FROM p.id THEN RETURN false; END IF;
 FOR s IN SELECT * FROM procedure_steps WHERE procedure_id=p.id ORDER BY step_order LOOP
   step_count:=step_count+1;
   link:=s.validation_rule->'source';
   IF s.validation_rule->>'schemaVersion' IS DISTINCT FROM 'roost-reference-site-checklist-item-v1'
     OR s.validation_rule->>'status' IS DISTINCT FROM 'approved'
     OR link->>'taskId' IS DISTINCT FROM t::text
     OR NOT (c->'context'->'company' @> jsonb_build_array(jsonb_build_object(
       'id',link->>'siteId','revision',link->>'recordRevision')))
   THEN RETURN false; END IF;
   SELECT * INTO site FROM company_records WHERE id=(link->>'siteId')::uuid AND workspace_id=w;
   SELECT * INTO r FROM reference_site_finding_reviews WHERE id=(link->>'reviewId')::uuid
     AND workspace_id=w AND task_id=t AND site_id=site.id AND verdict='confirmed';
   SELECT * INTO v FROM finding_versions WHERE id=(link->>'findingVersionId')::uuid
     AND workspace_id=w AND reference_site_id=site.id
     AND observation_id=(link->>'findingId')::uuid;
   IF site.id IS NULL OR site.record_type<>'reference_site'
     OR site.status NOT IN ('active','approved') OR site.application_id IS NOT NULL
     OR site.project_id IS NOT NULL OR site.client_id IS NOT NULL
     OR site.updated_at::timestamp(3) IS DISTINCT FROM (link->>'recordRevision')::timestamp(3)
     OR r.id IS NULL OR r.finding_id::text IS DISTINCT FROM link->>'findingId'
     OR r.version_id IS DISTINCT FROM v.id OR r.source_review_id::text IS DISTINCT FROM link->>'sourceReviewId'
     OR r.record_revision IS DISTINCT FROM site.updated_at
     OR r.site_metadata_digest IS DISTINCT FROM encode(sha256(convert_to(site.metadata::text,'UTF8')),'hex')
     OR r.site_metadata_digest IS DISTINCT FROM link->>'metadataDigest'
     OR r.package_digest IS DISTINCT FROM link->>'packageDigest'
     OR v.id IS NULL OR v.id IS DISTINCT FROM (
       SELECT id FROM finding_versions WHERE observation_id=v.observation_id ORDER BY version DESC LIMIT 1)
     OR r.finding_digest IS DISTINCT FROM encode(sha256(convert_to(v.body::text,'UTF8')),'hex')
     OR r.finding_digest IS DISTINCT FROM link->>'findingDigest'
     OR v.body->>'taskId' IS DISTINCT FROM t::text
     OR v.body->>'siteId' IS DISTINCT FROM site.id::text
     OR v.body->>'sourceReviewId' IS DISTINCT FROM link->>'sourceReviewId'
     OR v.body->>'observationId' IS DISTINCT FROM link->>'observationId'
     OR v.body->'source'->>'contentDigest' IS DISTINCT FROM link->>'packageDigest'
     OR NOT reference_site_review_current(v)
   THEN RETURN false; END IF;
   IF site.id::text=ref->>'id' THEN matched:=true; END IF;
 END LOOP;
 RETURN matched AND step_count BETWEEN 1 AND 2;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION company_information_preparation_valid(t UUID,w UUID,pin JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE c JSONB:=pin->'contract'; selected_source JSONB; record company_records; task tasks;
BEGIN
 IF pin->>'status' IS DISTINCT FROM 'ready' OR pin->>'preparationOnly' IS DISTINCT FROM 'true'
   OR pin->>'modelExecutionQualified' IS DISTINCT FROM 'false' OR pin->'applicationId' IS DISTINCT FROM 'null'::jsonb
   OR pin->'baseBranch' IS DISTINCT FROM 'null'::jsonb OR pin->>'requestedByType' IS DISTINCT FROM 'user'
   OR pin->'validation'->>'validator' IS DISTINCT FROM 'company-information-packet-v1'
   OR pin->'validation'->>'revision' IS DISTINCT FROM pin->>'revision'
   OR COALESCE(pin->>'revision','') !~ '^[a-f0-9]{64}$'
   OR task_risk_contract_shape(c,company_information_contract_schema()) IS NOT TRUE THEN RETURN false; END IF;
 SELECT * INTO task FROM tasks WHERE id=t AND workspace_id=w;
 IF NOT FOUND OR task.status::text NOT IN ('todo','in_progress')
   OR c->'objective'->>'goalId' IS DISTINCT FROM task.goal_id::text
   OR c->'assignment'->>'agentId' IS DISTINCT FROM task.assigned_workforce_entity_id::text
   OR c->'singleTask'->>'contractId' IS DISTINCT FROM 'roost-task:'||t::text
   OR c->'singleTask'->'problems'->0->>'outcome' IS DISTINCT FROM c->'objective'->>'outcome'
   OR c->'taskRoles'->'accountableManager' IS DISTINCT FROM c->'singleTask'->'accountableManager'
   OR task_interview_pending(t) THEN RETURN false; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'context'->'company')) <> jsonb_array_length(c->'context'->'company') THEN RETURN false; END IF;
 FOR selected_source IN SELECT value FROM jsonb_array_elements(c->'context'->'company') LOOP
   SELECT * INTO record FROM company_records WHERE id::text=selected_source->>'id' AND workspace_id=w AND application_id IS NULL AND status IN ('active','approved','accepted');
   IF NOT FOUND OR to_char(record.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM selected_source->>'revision'
     OR (record.record_type<>'reference_site' AND
       COALESCE(NULLIF(trim(record.description),''),NULLIF(trim(record.business_purpose),''),NULLIF(trim(record.desired_state),''),NULLIF(trim(record.expected_behavior),'')) IS NULL)
     OR (record.record_type='reference_site' AND NOT company_information_risk_site_current(t,w,c,selected_source))
   THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION company_information_risk_contract(t UUID,w UUID,u UUID,b JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
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
   AND (r.record_type<>'reference_site' AND length(trim(COALESCE(r.description,'')||COALESCE(r.business_purpose,'')||COALESCE(r.desired_state,'')||COALESCE(r.expected_behavior,'')))>0
     OR r.record_type='reference_site' AND company_information_risk_site_current(t,w,c,ref)))
  THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
COMMIT;
