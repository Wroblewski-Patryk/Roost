BEGIN;
-- A company information Ready packet may carry an owner-authored instruction.
-- Keep the existing scope and authority checks, and bind that instruction to
-- the immutable risk input instead of requiring a null prompt.
CREATE OR REPLACE FUNCTION company_information_risk_contract(t UUID,w UUID,u UUID,b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE c JSONB:=b->'contract'; task tasks; ref JSONB; role_name TEXT;
BEGIN
 IF b->'applicationId' IS DISTINCT FROM 'null'::jsonb OR b->'baseBranch' IS DISTINCT FROM 'null'::jsonb
  OR (b ? 'prompt' AND (jsonb_typeof(b->'prompt') NOT IN ('null','string') OR length(COALESCE(b->>'prompt',''))>20000))
  OR b->'releaseSet' IS DISTINCT FROM 'null'::jsonb
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
COMMIT;
