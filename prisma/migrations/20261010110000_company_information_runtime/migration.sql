BEGIN;
-- Preserve G6a as preparation only. A different class requires an exact normal
-- owner Decision and the existing installed Worker identity before launch.
ALTER TABLE agent_executions DROP CONSTRAINT company_information_application_scope;
ALTER TABLE agent_executions ADD CONSTRAINT company_information_application_scope CHECK (COALESCE(
 (application_id IS NOT NULL AND metadata->'executionContract'->>'executionClass' NOT IN ('roost-company-information-v1','roost-company-information-runtime-v1'))
 OR (application_id IS NOT NULL AND metadata->'executionContract'->>'executionClass' IS NULL)
 OR (application_id IS NULL AND base_branch IS NULL AND (
  (metadata->'executionContract'->>'executionClass'='roost-company-information-v1' AND metadata->'readyContextPin'->>'preparationOnly'='true' AND metadata->'readyContextPin'->>'modelExecutionQualified'='false')
  OR (metadata->'executionContract'->>'executionClass'='roost-company-information-runtime-v1' AND metadata->'readyContextPin'->>'preparationOnly'='false' AND metadata->'readyContextPin'->>'modelExecutionQualified'='true')
 )),false));

CREATE FUNCTION company_information_runtime_schema() RETURNS JSONB LANGUAGE SQL IMMUTABLE AS $shape$
 SELECT '{"k":"object","shape":{"executionClass":{"k":"literal","value":"roost-company-information-runtime-v1"},"version":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"singleTask":{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-single-task-v1"},"contractId":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"applicationId":{"k":"literal","value":null},"component":{"k":"literal","value":null},"accountableManager":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"branch":{"k":"literal","value":null},"measurement":{"k":"object","shape":{"metric":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"comparison":{"k":"enum","values":["eq","lte","gte"]},"target":{"k":"number","checks":[{"kind":"finite"}]},"unit":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"method":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"problems":{"k":"array","inner":{"k":"object","shape":{"statement":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"componentId":{"k":"literal","value":null},"outcome":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"causalLink":{"k":"literal","value":null}}},"min":1,"max":1},"commonCause":{"k":"literal","value":null}}},"taskRoles":{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-task-roles-v1"},"requester":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"accountableManager":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"executor":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"verifier":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"releaser":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"objective":{"k":"object","shape":{"outcome":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"goalId":{"k":"string","checks":[{"kind":"uuid"}]}}},"scope":{"k":"object","shape":{"allowed":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30},"forbidden":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"assignment":{"k":"object","shape":{"agentId":{"k":"string","checks":[{"kind":"uuid"}]},"role":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"competencies":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"modelSelection":{"k":"union","options":[{"k":"refinement","rule":"codexModel","inner":{"k":"object","shape":{"model":{"k":"enum","values":["gpt-5.6-sol","gpt-5.6-terra","gpt-5.6-luna","gpt-6-astra"]},"reasoningEffort":{"k":"enum","values":["low","medium","high","xhigh","max","ultra"]}}}},{"k":"refinement","rule":"localModel","inner":{"k":"object","shape":{"provider":{"k":"literal","value":"hermes_local"},"model":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-z0-9][a-z0-9._/-]{0,95}:[a-z0-9][a-z0-9._-]{0,63}$"}]},"modelFamily":{"k":"enum","values":["gpt-oss","devstral"]},"modelDigest":{"k":"string","checks":[{"kind":"regex","pattern":"^sha256:[a-f0-9]{64}$"}]},"reasoningEffort":{"k":"enum","values":["low","medium","high"]}}}},{"k":"refinement","rule":"managedBackendBudget","inner":{"k":"union","options":[{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-managed-hermes-backend-v1"},"agent":{"k":"literal","value":"managed_hermes"},"riskClass":{"k":"enum","values":["low","medium","high","critical"]},"fallback":{"k":"literal","value":"none"},"attemptPolicy":{"k":"refinement","rule":"managedTurnBudget","inner":{"k":"object","shape":{"maxTurns":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":1,"inclusive":true},{"kind":"max","value":48,"inclusive":true}]},"apiMaxRetries":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":0,"inclusive":true},{"kind":"max","value":2,"inclusive":true}]},"budgetPolicy":{"k":"optional","inner":{"k":"enum","values":["coding-small-v1","coding-extended-v1"]}},"unavailable":{"k":"literal","value":"stop_attempt"},"restart":{"k":"literal","value":"never"}}}},"backend":{"k":"literal","value":"codex_responses"},"provider":{"k":"literal","value":"openai-codex"},"modelSelection":{"k":"refinement","rule":"codexModel","inner":{"k":"object","shape":{"model":{"k":"enum","values":["gpt-5.6-sol","gpt-5.6-terra","gpt-5.6-luna","gpt-6-astra"]},"reasoningEffort":{"k":"enum","values":["low","medium","high","xhigh","max","ultra"]}}}},"auth":{"k":"literal","value":"same_owner_subscription"}}},{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-managed-hermes-backend-v1"},"agent":{"k":"literal","value":"managed_hermes"},"riskClass":{"k":"enum","values":["low","medium","high","critical"]},"fallback":{"k":"literal","value":"none"},"attemptPolicy":{"k":"refinement","rule":"managedTurnBudget","inner":{"k":"object","shape":{"maxTurns":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":1,"inclusive":true},{"kind":"max","value":48,"inclusive":true}]},"apiMaxRetries":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":0,"inclusive":true},{"kind":"max","value":2,"inclusive":true}]},"budgetPolicy":{"k":"optional","inner":{"k":"enum","values":["coding-small-v1","coding-extended-v1"]}},"unavailable":{"k":"literal","value":"stop_attempt"},"restart":{"k":"literal","value":"never"}}}},"backend":{"k":"literal","value":"ollama_loopback"},"provider":{"k":"literal","value":"ollama"},"endpoint":{"k":"literal","value":"http://127.0.0.1:11434"},"modelSelection":{"k":"refinement","rule":"localModel","inner":{"k":"object","shape":{"provider":{"k":"literal","value":"hermes_local"},"model":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-z0-9][a-z0-9._/-]{0,95}:[a-z0-9][a-z0-9._-]{0,63}$"}]},"modelFamily":{"k":"enum","values":["gpt-oss","devstral"]},"modelDigest":{"k":"string","checks":[{"kind":"regex","pattern":"^sha256:[a-f0-9]{64}$"}]},"reasoningEffort":{"k":"enum","values":["low","medium","high"]}}}},"config":{"k":"object","shape":{"reasoning":{"k":"literal","value":"explicit_model_effort"},"remote":{"k":"literal","value":false}}}}}]}}]},"context":{"k":"object","shape":{"company":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"min":1,"max":10},"product":{"k":"tuple","items":[]},"technical":{"k":"tuple","items":[]}}},"procedures":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"skills":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"name":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"version":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"access":{"k":"object","shape":{"tools":{"k":"tuple","items":[]},"permissions":{"k":"tuple","items":[]},"sandbox":{"k":"literal","value":"read-only"},"externalWrites":{"k":"literal","value":false},"restrictions":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"dependencies":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"resolution":{"k":"literal","value":"satisfied"},"evidence":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"decisions":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"budgets":{"k":"object","shape":{"maxAttempts":{"k":"literal","value":1},"maxDurationSeconds":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":60,"inclusive":true},{"kind":"max","value":1800,"inclusive":true}]},"maxOutputTokens":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":128,"inclusive":true},{"kind":"max","value":100000,"inclusive":true}]}}},"acceptance":{"k":"object","shape":{"criteria":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30},"tests":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30},"evidence":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"recovery":{"k":"object","shape":{"handoff":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"failure":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"escalation":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"rollback":{"k":"object","shape":{"mode":{"k":"literal","value":"not_applicable"},"instructions":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}}}}'::jsonb;
$shape$;
CREATE FUNCTION company_information_runtime_valid(t UUID,w UUID,pin JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE c JSONB:=pin->'contract'; normalized JSONB; a JSONB:=pin->'runtimeApproval';
BEGIN
 IF pin->>'status' IS DISTINCT FROM 'ready' OR pin->>'preparationOnly' IS DISTINCT FROM 'false'
  OR pin->>'modelExecutionQualified' IS DISTINCT FROM 'true' OR task_risk_contract_shape(c,company_information_runtime_schema()) IS NOT TRUE
  OR c->'modelSelection'->>'schemaVersion' IS DISTINCT FROM 'roost-managed-hermes-backend-v1'
  OR c->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses' OR c->'modelSelection'->>'riskClass' IS DISTINCT FROM 'low'
  OR c->'modelSelection'->'attemptPolicy'->>'maxTurns' IS DISTINCT FROM '1' OR c->'modelSelection'->'attemptPolicy'->>'apiMaxRetries' IS DISTINCT FROM '0'
  OR c->'budgets'->>'maxAttempts' IS DISTINCT FROM '1' THEN RETURN false; END IF;
 normalized:=pin||jsonb_build_object('preparationOnly',true,'modelExecutionQualified',false,
  'contract',c||jsonb_build_object('executionClass','roost-company-information-v1'));
 IF company_information_preparation_valid(t,w,normalized) IS NOT TRUE THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
  JOIN decision_acceptances accepted ON accepted.decision_id=d.id JOIN workspaces ws ON ws.id=d.workspace_id
  JOIN workspace_memberships member ON member.workspace_id=ws.id AND member.user_id=ws.owner_user_id
  JOIN trusted_provider_ticket_keys k ON k.workspace_id=ws.id
  WHERE d.id::text=a->>'decisionId' AND d.workspace_id=w AND r.version::text=a->>'decisionVersion'
  AND d.status='accepted' AND decision_state(d.id)='accepted' AND member.role::text='owner'
  AND accepted.actor_user_id=ws.owner_user_id AND accepted.actor_agent_id IS NULL
  AND pin->>'requestedById'=ws.owner_user_id::text AND a->>'ownerUserId'=ws.owner_user_id::text
  AND r.body->'scope' @> jsonb_build_array(jsonb_build_object('type','task','id',t::text))
  AND r.body->'managedRuntimeApproval'->>'taskId'=t::text
  AND r.body->'managedRuntimeApproval'->'applicationId'='null'::jsonb
  AND r.body->'managedRuntimeApproval'->>'executionClass'='roost-company-information-runtime-v1'
  AND r.body->'managedRuntimeApproval'->>'installationId'=k.installation_id::text
  AND r.body->'managedRuntimeApproval'->>'selectionDigest'=a->>'selectionDigest'
  AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id));
END $$;

CREATE FUNCTION company_information_execution_valid(n agent_executions, prior agent_executions, command TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE pin JSONB;
BEGIN
 IF n.application_id IS NOT NULL OR n.base_branch IS NOT NULL OR n.codex_thread_id IS NOT NULL
  OR n.metadata->'readyContextPin'->>'preparationOnly' IS DISTINCT FROM 'false'
  OR n.metadata->'readyContextPin'->>'modelExecutionQualified' IS DISTINCT FROM 'true'
  OR n.attempt NOT IN (0,1) OR n.requested_by_type IS DISTINCT FROM 'user'
  THEN RAISE EXCEPTION 'company_information_runtime_scope_invalid'; END IF;
 IF command='UPDATE' AND (n.metadata->'executionContract' IS DISTINCT FROM prior.metadata->'executionContract'
  OR n.metadata->'readyContextPin' IS DISTINCT FROM prior.metadata->'readyContextPin'
  OR prior.status::text IN ('completed','failed','cancelled') AND n.status IS DISTINCT FROM prior.status)
  THEN RAISE EXCEPTION 'company_information_runtime_history_immutable'; END IF;
 IF n.attempt=0 AND (n.status::text NOT IN ('queued','failed','cancelled') OR n.agent_host_id IS NOT NULL OR n.lease_token IS NOT NULL OR n.started_at IS NOT NULL)
  OR n.attempt=1 AND (n.agent_host_id IS NULL OR n.started_at IS NULL OR n.status::text NOT IN ('claimed','running','completed','failed','cancelled'))
  THEN RAISE EXCEPTION 'company_information_runtime_transition_invalid'; END IF;
 SELECT execution_readiness INTO pin FROM tasks WHERE id=n.task_id AND workspace_id=n.workspace_id;
 IF n.status::text IN ('queued','claimed','running') AND n.context_invalidated_at IS NULL AND n.cancel_requested_at IS NULL AND (
  company_information_runtime_valid(n.task_id,n.workspace_id,pin) IS NOT TRUE
  OR pin->'contract' IS DISTINCT FROM n.metadata->'executionContract'
  OR pin->>'pinId' IS DISTINCT FROM n.metadata->'readyContextPin'->>'pinId'
  OR pin->>'revision' IS DISTINCT FROM n.metadata->'readyContextPin'->>'revision'
  OR pin->'runtimeApproval'->>'decisionId' IS DISTINCT FROM n.metadata->'readyContextPin'->>'runtimeDecisionId'
  OR pin->'runtimeApproval'->>'decisionVersion' IS DISTINCT FROM n.metadata->'readyContextPin'->>'runtimeDecisionVersion')
  THEN RAISE EXCEPTION 'company_information_runtime_authority_required'; END IF;
 IF command='INSERT' AND EXISTS(SELECT 1 FROM agent_executions e WHERE e.task_id=n.task_id AND e.workspace_id=n.workspace_id
   AND e.metadata->'readyContextPin'->>'runtimeDecisionId'=n.metadata->'readyContextPin'->>'runtimeDecisionId')
   THEN RAISE EXCEPTION 'information_budget_spent_new_plan_required'; END IF;
 IF n.status::text='completed' AND (
  n.attempt<>1 OR n.lease_token IS NOT NULL OR n.lease_expires_at IS NOT NULL OR n.completed_at IS NULL
  OR n.changed_files IS DISTINCT FROM '[]'::jsonb OR COALESCE(length(trim(n.final_response)),0)=0
  OR n.verification->'informationRuntime'->>'schemaVersion' IS DISTINCT FROM 'roost-company-information-runtime-verification-v1'
  OR n.verification->'informationRuntime'->>'executionId' IS DISTINCT FROM n.id::text
  OR n.verification->'informationRuntime'->'nativeTools' IS DISTINCT FROM '[]'::jsonb
  OR n.verification->'ownedTreeReceipt'->>'cleanup' IS DISTINCT FROM 'true'
  OR n.verification->'ownedTreeReceipt'->>'rootExit' IS DISTINCT FROM '0'
  OR n.verification->'ownedTreeReceipt'->>'activeProcesses' IS DISTINCT FROM '0')
  THEN RAISE EXCEPTION 'company_information_native_result_unproven'; END IF;
 RETURN true;
END $$;

-- Forward extension of the existing admission guards, leaving the G6a and
-- application paths intact. No trigger is disabled and no record is reset.
DO $migration$
DECLARE name TEXT; definition TEXT; branch TEXT;
BEGIN
 FOREACH name IN ARRAY ARRAY['task_require_single_scope','task_risk_admission_guard','task_admission_guard','procedure_composition_guard'] LOOP
  SELECT pg_get_functiondef((name||'()')::regprocedure) INTO definition;
  IF position('BEGIN' IN definition)=0 THEN RAISE EXCEPTION 'company_runtime_guard_anchor_missing'; END IF;
  branch:=E'\n IF TG_TABLE_NAME=''tasks'' THEN\n'
   || E'  IF NEW.execution_readiness->''contract''->>''executionClass''=''roost-company-information-runtime-v1'' AND NEW.execution_readiness->>''status''=''ready'' THEN\n'
   || E'   IF company_information_runtime_valid(NEW.id,NEW.workspace_id,NEW.execution_readiness) IS NOT TRUE THEN RAISE EXCEPTION ''company_information_runtime_authority_required''; END IF; RETURN NEW;\n END IF;\n'
   || E' ELSIF TG_TABLE_NAME=''agent_executions'' THEN\n'
   || E'  IF NEW.metadata->''executionContract''->>''executionClass''=''roost-company-information-runtime-v1'' THEN PERFORM company_information_execution_valid(NEW,OLD,TG_OP); RETURN NEW; END IF;\n END IF;\n';
  EXECUTE overlay(definition placing 'BEGIN'||branch from position('BEGIN' IN definition) for length('BEGIN'));
 END LOOP;
END $migration$;
COMMIT;
