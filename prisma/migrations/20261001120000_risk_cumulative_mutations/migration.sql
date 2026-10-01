BEGIN;
-- RF-SEC-001 counts cumulative changes. All related tasks remain in the joint
-- assessment; only a complete non-mutating execution contract is exempt from
-- the count. Historical v1 assessments remain immutable and conservative.
ALTER TABLE task_risk_assessments DROP CONSTRAINT task_risk_assessments_algorithm_check;
ALTER TABLE task_risk_assessments ADD CONSTRAINT task_risk_assessments_algorithm_check
 CHECK(algorithm IN ('roost-native-risk-v1','roost-native-risk-v2'));

-- Structural mirror generated from the real executionContractSchema. The
-- focused test pins this descriptor to that schema; unsupported new validators
-- or refinements fail the pin rather than silently exempting malformed tasks.
CREATE FUNCTION task_risk_contract_shape(value JSONB, shape JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE kind TEXT:=shape->>'k'; pair RECORD; item JSONB; check_item JSONB; s TEXT; n NUMERIC;
BEGIN
 IF kind IN ('optional','default') THEN
  RETURN value IS NULL OR task_risk_contract_shape(value,shape->'inner');
 ELSIF kind='nullable' THEN
  RETURN value='null'::jsonb OR task_risk_contract_shape(value,shape->'inner');
 ELSIF value IS NULL THEN RETURN false;
 ELSIF kind='literal' THEN RETURN value=shape->'value';
 ELSIF kind='enum' THEN RETURN jsonb_typeof(value)='string' AND shape->'values' @> jsonb_build_array(value);
 ELSIF kind='boolean' THEN RETURN jsonb_typeof(value)='boolean';
 ELSIF kind='object' THEN
  IF jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(value) name WHERE NOT (shape->'shape' ? name)) THEN RETURN false; END IF;
  FOR pair IN SELECT key,val FROM jsonb_each(shape->'shape') AS e(key,val) LOOP
   IF task_risk_contract_shape(value->pair.key,pair.val) IS NOT TRUE THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
 ELSIF kind='array' THEN
  IF jsonb_typeof(value)<>'array' OR jsonb_array_length(value)<COALESCE((shape->>'min')::int,0)
   OR jsonb_array_length(value)>COALESCE((shape->>'max')::int,2147483647) THEN RETURN false; END IF;
  FOR item IN SELECT val FROM jsonb_array_elements(value) AS e(val) LOOP
   IF task_risk_contract_shape(item,shape->'inner') IS NOT TRUE THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
 ELSIF kind='tuple' THEN
  -- The readonly runtime's ports tuple is empty; a new tuple shape fails closed.
  RETURN jsonb_typeof(value)='array' AND jsonb_array_length(value)=0 AND jsonb_array_length(shape->'items')=0;
 ELSIF kind='union' THEN
  FOR item IN SELECT val FROM jsonb_array_elements(shape->'options') AS e(val) LOOP
   IF task_risk_contract_shape(value,item) THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
 ELSIF kind='string' THEN
  IF jsonb_typeof(value)<>'string' THEN RETURN false; END IF;
  s:=value#>>'{}';
  FOR check_item IN SELECT val FROM jsonb_array_elements(shape->'checks') AS e(val) LOOP
   CASE check_item->>'kind'
    WHEN 'trim' THEN s:=regexp_replace(s,'^[[:space:]]+|[[:space:]]+$','','g');
    WHEN 'min' THEN IF length(s)<(check_item->>'value')::int THEN RETURN false; END IF;
    WHEN 'max' THEN IF length(s)>(check_item->>'value')::int THEN RETURN false; END IF;
    WHEN 'uuid' THEN IF s !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN false; END IF;
    WHEN 'regex' THEN IF s !~ (check_item->>'pattern') THEN RETURN false; END IF;
    ELSE RETURN false;
   END CASE;
  END LOOP;
  RETURN true;
 ELSIF kind='number' THEN
  IF jsonb_typeof(value)<>'number' THEN RETURN false; END IF;
  n:=(value#>>'{}')::numeric;
  FOR check_item IN SELECT val FROM jsonb_array_elements(shape->'checks') AS e(val) LOOP
   CASE check_item->>'kind'
    WHEN 'int' THEN IF trunc(n)<>n THEN RETURN false; END IF;
    WHEN 'min' THEN IF n<(check_item->>'value')::numeric THEN RETURN false; END IF;
    WHEN 'max' THEN IF n>(check_item->>'value')::numeric THEN RETURN false; END IF;
    WHEN 'finite' THEN IF abs(n)>1.7976931348623157e308 THEN RETURN false; END IF;
    ELSE RETURN false;
   END CASE;
  END LOOP;
  RETURN true;
 ELSIF kind='refinement' THEN
  IF task_risk_contract_shape(value,shape->'inner') IS NOT TRUE THEN RETURN false; END IF;
  CASE shape->>'rule'
   WHEN 'optionalSet' THEN RETURN CASE WHEN jsonb_array_length(value->'items')>0
    THEN value->'noneReason'='null'::jsonb ELSE COALESCE(length(value->>'noneReason')>0,false) END;
   WHEN 'codexModel' THEN RETURN NOT (value->>'model'='gpt-5.6-luna' AND value->>'reasoningEffort'='ultra');
   WHEN 'localModel' THEN RETURN split_part(value->>'model',':',1)=value->>'modelFamily';
   ELSE RETURN false;
  END CASE;
 END IF;
 RETURN false;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION task_risk_readonly_schema() RETURNS JSONB LANGUAGE SQL IMMUTABLE AS $fn$
 SELECT $schema${"k":"object","shape":{"executionClass":{"k":"optional","inner":{"k":"literal","value":"roost-fixed-effect-v1"}},"version":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"nativeBoundary":{"k":"object","shape":{"profile":{"k":"literal","value":"inspect-readonly"},"readPaths":{"k":"array","inner":{"k":"string","checks":[{"kind":"min","value":1},{"kind":"max","value":512}]},"min":1,"max":32},"runtime":{"k":"object","shape":{"required":{"k":"literal","value":false},"ports":{"k":"tuple","items":[]}}},"inspectReadOnly":{"k":"union","options":[{"k":"object","shape":{"kind":{"k":"literal","value":"auditor"}}},{"k":"object","shape":{"kind":{"k":"literal","value":"verifier"},"verifiedExecutionId":{"k":"string","checks":[{"kind":"uuid"}]},"verifiedEvidenceDigest":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-f0-9]{64}$"}]}}},{"k":"object","shape":{"kind":{"k":"literal","value":"code-reviewer"},"verifiedTaskId":{"k":"string","checks":[{"kind":"uuid"}]},"verifiedExecutionId":{"k":"string","checks":[{"kind":"uuid"}]},"verifiedEvidenceDigest":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-f0-9]{64}$"}]},"baselineCommit":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-f0-9]{40}$"}]},"reviewedCommit":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-f0-9]{40}$"}]}}}]}}},"singleTask":{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-single-task-v1"},"contractId":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"applicationId":{"k":"string","checks":[{"kind":"uuid"}]},"component":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"accountableManager":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"branch":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"measurement":{"k":"object","shape":{"metric":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"comparison":{"k":"enum","values":["eq","lte","gte"]},"target":{"k":"number","checks":[{"kind":"finite"}]},"unit":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"method":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"problems":{"k":"array","inner":{"k":"object","shape":{"statement":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"componentId":{"k":"string","checks":[{"kind":"uuid"}]},"outcome":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"causalLink":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}},"min":1,"max":3},"commonCause":{"k":"nullable","inner":{"k":"object","shape":{"mechanism":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"inseparability":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"evidence":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}}}}},"taskRoles":{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-task-roles-v1"},"requester":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"accountableManager":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"executor":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"verifier":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"releaser":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"objective":{"k":"object","shape":{"outcome":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"goalId":{"k":"string","checks":[{"kind":"uuid"}]}}},"scope":{"k":"object","shape":{"allowed":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30},"forbidden":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"assignment":{"k":"object","shape":{"agentId":{"k":"string","checks":[{"kind":"uuid"}]},"role":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"competencies":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"modelSelection":{"k":"union","options":[{"k":"refinement","rule":"codexModel","inner":{"k":"object","shape":{"model":{"k":"enum","values":["gpt-5.6-sol","gpt-5.6-terra","gpt-5.6-luna","gpt-6-astra"]},"reasoningEffort":{"k":"enum","values":["low","medium","high","xhigh","max","ultra"]}}}},{"k":"refinement","rule":"localModel","inner":{"k":"object","shape":{"provider":{"k":"literal","value":"hermes_local"},"model":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-z0-9][a-z0-9._/-]{0,95}:[a-z0-9][a-z0-9._-]{0,63}$"}]},"modelFamily":{"k":"enum","values":["gpt-oss","devstral"]},"modelDigest":{"k":"string","checks":[{"kind":"regex","pattern":"^sha256:[a-f0-9]{64}$"}]},"reasoningEffort":{"k":"enum","values":["low","medium","high"]}}}},{"k":"union","options":[{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-managed-hermes-backend-v1"},"agent":{"k":"literal","value":"managed_hermes"},"riskClass":{"k":"enum","values":["low","medium","high","critical"]},"fallback":{"k":"literal","value":"none"},"attemptPolicy":{"k":"object","shape":{"maxTurns":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":1,"inclusive":true},{"kind":"max","value":24,"inclusive":true}]},"apiMaxRetries":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":0,"inclusive":true},{"kind":"max","value":2,"inclusive":true}]},"unavailable":{"k":"literal","value":"stop_attempt"},"restart":{"k":"literal","value":"never"}}},"backend":{"k":"literal","value":"codex_responses"},"provider":{"k":"literal","value":"openai-codex"},"modelSelection":{"k":"refinement","rule":"codexModel","inner":{"k":"object","shape":{"model":{"k":"enum","values":["gpt-5.6-sol","gpt-5.6-terra","gpt-5.6-luna","gpt-6-astra"]},"reasoningEffort":{"k":"enum","values":["low","medium","high","xhigh","max","ultra"]}}}},"auth":{"k":"literal","value":"same_owner_subscription"}}},{"k":"object","shape":{"schemaVersion":{"k":"literal","value":"roost-managed-hermes-backend-v1"},"agent":{"k":"literal","value":"managed_hermes"},"riskClass":{"k":"enum","values":["low","medium","high","critical"]},"fallback":{"k":"literal","value":"none"},"attemptPolicy":{"k":"object","shape":{"maxTurns":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":1,"inclusive":true},{"kind":"max","value":24,"inclusive":true}]},"apiMaxRetries":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":0,"inclusive":true},{"kind":"max","value":2,"inclusive":true}]},"unavailable":{"k":"literal","value":"stop_attempt"},"restart":{"k":"literal","value":"never"}}},"backend":{"k":"literal","value":"ollama_loopback"},"provider":{"k":"literal","value":"ollama"},"endpoint":{"k":"literal","value":"http://127.0.0.1:11434"},"modelSelection":{"k":"refinement","rule":"localModel","inner":{"k":"object","shape":{"provider":{"k":"literal","value":"hermes_local"},"model":{"k":"string","checks":[{"kind":"regex","pattern":"^[a-z0-9][a-z0-9._/-]{0,95}:[a-z0-9][a-z0-9._-]{0,63}$"}]},"modelFamily":{"k":"enum","values":["gpt-oss","devstral"]},"modelDigest":{"k":"string","checks":[{"kind":"regex","pattern":"^sha256:[a-f0-9]{64}$"}]},"reasoningEffort":{"k":"enum","values":["low","medium","high"]}}}},"config":{"k":"object","shape":{"reasoning":{"k":"literal","value":"explicit_model_effort"},"remote":{"k":"literal","value":false}}}}}]}]},"context":{"k":"object","shape":{"company":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"min":1,"max":10},"product":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"min":1,"max":10},"technical":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"min":1,"max":10}}},"procedures":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"skills":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"name":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"version":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"access":{"k":"object","shape":{"tools":{"k":"array","inner":{"k":"enum","values":["repository_read","repository_write","local_test","local_commit","remote_push","deployment"]},"min":1,"max":6},"permissions":{"k":"array","inner":{"k":"enum","values":["repository_read","repository_write","local_test","local_commit","remote_push","deployment"]},"min":1,"max":6},"sandbox":{"k":"enum","values":["workspace-write","read-only"]},"externalWrites":{"k":"literal","value":false},"restrictions":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"dependencies":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"resolution":{"k":"literal","value":"satisfied"},"evidence":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"decisions":{"k":"refinement","rule":"optionalSet","inner":{"k":"object","shape":{"items":{"k":"array","inner":{"k":"object","shape":{"id":{"k":"string","checks":[{"kind":"uuid"}]},"revision":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}},"max":30},"noneReason":{"k":"nullable","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}},"budgets":{"k":"object","shape":{"maxAttempts":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":1,"inclusive":true},{"kind":"max","value":5,"inclusive":true}]},"maxDurationSeconds":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":60,"inclusive":true},{"kind":"max","value":3600,"inclusive":true}]},"maxOutputTokens":{"k":"number","checks":[{"kind":"int"},{"kind":"min","value":128,"inclusive":true},{"kind":"max","value":100000,"inclusive":true}]}}},"acceptance":{"k":"object","shape":{"criteria":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30},"tests":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30},"evidence":{"k":"array","inner":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"min":1,"max":30}}},"recovery":{"k":"object","shape":{"handoff":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"failure":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"escalation":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]},"rollback":{"k":"object","shape":{"mode":{"k":"enum","values":["restore_task_changes","not_applicable"]},"instructions":{"k":"string","checks":[{"kind":"trim"},{"kind":"min","value":1},{"kind":"max","value":2000}]}}}}}}}$schema$::jsonb
$fn$;

CREATE FUNCTION task_risk_readonly_contract(contract JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item TEXT; segment TEXT;
BEGIN
 IF task_risk_contract_shape(contract,task_risk_readonly_schema()) IS NOT TRUE
  OR contract->'nativeBoundary'->>'profile' IS DISTINCT FROM 'inspect-readonly'
  OR contract->'access'->>'sandbox' IS DISTINCT FROM 'read-only'
  OR contract->'access'->'externalWrites' IS DISTINCT FROM 'false'::jsonb
  OR contract->'access'->'tools' IS DISTINCT FROM '["repository_read"]'::jsonb
  OR contract->'access'->'permissions' IS DISTINCT FROM '["repository_read"]'::jsonb
 THEN RETURN false; END IF;
 -- Mirror nativeRelative, including Windows reserved names and secret paths.
 FOR item IN SELECT jsonb_array_elements_text(contract->'nativeBoundary'->'readPaths') LOOP
  IF item='' OR length(item)>512 OR item LIKE '/%' OR item ~ '[\\:[:cntrl:]]' THEN RETURN false; END IF;
  FOREACH segment IN ARRAY string_to_array(item,'/') LOOP
   IF segment IN ('','.','..') OR segment ~ '[. ]$' OR lower(segment)='.git'
    OR segment ~* '^(con|prn|aux|nul|com[1-9]|lpt[1-9])([.]|$)'
    OR (segment !~* '[.](example|sample|template)$'
      AND segment ~* '^([.]env([.].*)?|[.]op[.]env|[.]codex|[.]ssh|[.]aws|auth[.]json|credentials?([.](json|yaml|yml))?|cookies?([.](json|sqlite|txt))?|id_(rsa|ed25519)|.*[.](key|pem|pfx))$')
   THEN RETURN false; END IF;
  END LOOP;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- Assessment guard: retain the canonical group and every evidence check.
CREATE OR REPLACE FUNCTION task_risk_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE item JSONB; ref JSONB; dim TEXT; n INTEGER; mx INTEGER; bump INTEGER; uncertain BOOLEAN; blocked BOOLEAN:=false; computed JSONB:='{}'; max_level INTEGER:=0; changes INTEGER; readonly_ids JSONB;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'task_risk_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id) OR
  NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.actor_user_id AND role IN ('owner','admin','member'))
 THEN RAISE EXCEPTION 'task_risk_forbidden'; END IF;
 IF TG_TABLE_NAME='task_risk_scopes' THEN
  IF NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_risk_scopes WHERE task_id=NEW.task_id) OR
   (SELECT count(*) FROM application_projects ap JOIN tasks t ON t.project_id=ap.project_id WHERE t.id=NEW.task_id)<>1 OR
   NOT EXISTS(SELECT 1 FROM application_architecture_components c JOIN applications a ON a.id=c.application_id
    JOIN application_projects ap ON ap.application_id=a.id JOIN tasks t ON t.project_id=ap.project_id
    WHERE c.id=NEW.component_id AND c.status='active' AND a.slug<>'roost' AND a.id=NEW.application_id AND a.workspace_id=NEW.workspace_id AND t.id=NEW.task_id) OR
   (NEW.release_set_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM company_records WHERE id=NEW.release_set_id AND workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND status<>'archived'))
  THEN RAISE EXCEPTION 'task_risk_scope_invalid'; END IF;
 ELSE
  IF NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_risk_assessments WHERE task_id=NEW.task_id) OR
   NEW.source_version IS DISTINCT FROM task_risk_version(NEW.task_id) OR NEW.sources IS DISTINCT FROM task_risk_sources(NEW.task_id)
  THEN RAISE EXCEPTION 'task_risk_stale'; END IF;
  n:=jsonb_array_length(NEW.sources);
  IF n<1 OR n>50 OR n<>jsonb_array_length(NEW.entries) OR
   EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.sources)s WHERE s->>'scopeId' IS NULL OR
     (SELECT count(*) FROM jsonb_array_elements(NEW.entries)e WHERE e->>'taskId'=s->>'taskId')<>1)
  THEN RAISE EXCEPTION 'task_risk_group_incomplete'; END IF;
  IF NEW.algorithm IS DISTINCT FROM 'roost-native-risk-v2' OR NEW.result->>'algorithm' IS DISTINCT FROM NEW.algorithm THEN RAISE EXCEPTION 'task_risk_result_invalid'; END IF;
  SELECT count(*) FILTER (WHERE NOT task_risk_readonly_contract(sc.input->'contract')),
   COALESCE(jsonb_agg(s->>'taskId' ORDER BY s->>'taskId') FILTER (WHERE task_risk_readonly_contract(sc.input->'contract')),'[]'::jsonb)
   INTO changes,readonly_ids FROM jsonb_array_elements(NEW.sources)s
   LEFT JOIN task_risk_scopes sc ON sc.id::text=s->>'scopeId' AND sc.task_id::text=s->>'taskId' AND sc.workspace_id=NEW.workspace_id;
  bump:=CASE WHEN changes>=4 THEN 2 WHEN changes>=2 THEN 1 ELSE 0 END;
  IF NEW.result->'mutationCount' IS DISTINCT FROM to_jsonb(changes) OR NEW.result->'readonlyTaskIds' IS DISTINCT FROM readonly_ids
   OR NEW.result->'cumulativeEscalation' IS DISTINCT FROM to_jsonb(bump) THEN RAISE EXCEPTION 'task_risk_result_invalid'; END IF;
  uncertain:=EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.entries)e WHERE e->'uncertainty'->>'level'='bounded');
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.entries) LOOP
   IF item->'uncertainty'->>'level' NOT IN ('none','bounded','unverifiable') OR item->'uncertainty'->>'level' IS NULL OR
    jsonb_typeof(item->'contradictions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'task_risk_entry_invalid'; END IF;
   IF item->'uncertainty'->>'level'='unverifiable' OR jsonb_array_length(item->'contradictions')>0 THEN blocked:=true; END IF;
   IF length(COALESCE(item->'uncertainty'->>'reasons',''))<3 OR jsonb_typeof(item->'uncertainty'->'evidence') IS DISTINCT FROM 'array' OR jsonb_array_length(item->'uncertainty'->'evidence')<1 THEN RAISE EXCEPTION 'task_risk_entry_invalid'; END IF;
   FOR ref IN SELECT value FROM jsonb_array_elements(item->'uncertainty'->'evidence')
     UNION ALL SELECT jsonb_path_query(item,'$.dimensions.*.evidence[*]') LOOP
    IF NOT EXISTS(SELECT 1 FROM company_records r WHERE r.id::text=ref->>'id' AND r.workspace_id=NEW.workspace_id AND r.status<>'archived'
      AND (r.application_id IS NULL OR r.application_id::text=(SELECT s->>'applicationId' FROM jsonb_array_elements(NEW.sources)s WHERE s->>'taskId'=item->>'taskId'))
      AND length(trim(COALESCE(r.description,'')||COALESCE(r.business_purpose,'')||COALESCE(r.desired_state,'')||COALESCE(r.expected_behavior,'')))>0
      AND to_char(r.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=ref->>'revision') THEN RAISE EXCEPTION 'task_risk_evidence_stale'; END IF;
   END LOOP;
  END LOOP;
  IF NEW.result->'uncertaintyEscalation' IS DISTINCT FROM to_jsonb(CASE WHEN uncertain THEN 1 ELSE 0 END) THEN RAISE EXCEPTION 'task_risk_result_invalid'; END IF;
  FOREACH dim IN ARRAY ARRAY['money','data','security','availability','legal','reversibility','users'] LOOP
   mx:=0;
   FOR item IN SELECT value FROM jsonb_array_elements(NEW.entries) LOOP
    IF item->'dimensions'->dim->>'level' IS NULL OR item->'dimensions'->dim->>'level' NOT IN ('low','medium','high','critical') OR
     length(COALESCE(item->'dimensions'->dim->>'rationale',''))<3 OR jsonb_typeof(item->'dimensions'->dim->'evidence') IS DISTINCT FROM 'array' OR
     jsonb_array_length(item->'dimensions'->dim->'evidence')<1 THEN RAISE EXCEPTION 'task_risk_entry_invalid'; END IF;
    mx:=greatest(mx,array_position(ARRAY['low','medium','high','critical'],item->'dimensions'->dim->>'level')-1);
   END LOOP;
   mx:=least(3,mx+bump+CASE WHEN uncertain THEN 1 ELSE 0 END); max_level:=greatest(max_level,mx);
   computed:=computed||jsonb_build_object(dim,(ARRAY['low','medium','high','critical'])[mx+1]);
  END LOOP;
  IF NEW.result->'dimensions' IS DISTINCT FROM computed OR
   NEW.result->>'status' IS DISTINCT FROM (CASE WHEN blocked THEN 'needs_decision' ELSE 'assessed' END) OR
   NEW.result->>'level' IS DISTINCT FROM (CASE WHEN blocked THEN NULL ELSE (ARRAY['low','medium','high','critical'])[max_level+1] END)
  THEN RAISE EXCEPTION 'task_risk_result_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
