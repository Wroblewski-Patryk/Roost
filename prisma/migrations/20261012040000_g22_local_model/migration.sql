BEGIN;

-- Extend only the company information class. The generated contract shape,
-- owner Decision, Low risk, Ready and one-attempt checks remain unchanged.
DO $patch$
DECLARE body TEXT; anchor TEXT := 'c->''modelSelection''->>''backend'' IS DISTINCT FROM ''codex_responses''';
BEGIN
 SELECT pg_get_functiondef('company_information_risk_contract(uuid,uuid,uuid,jsonb)'::regprocedure) INTO body;
 IF body IS NULL OR (length(body)-length(replace(body,anchor,'')))/length(anchor)<>1
  THEN RAISE EXCEPTION 'g22_risk_backend_anchor_missing'; END IF;
 EXECUTE replace(body,anchor,'(c->''modelSelection''->>''backend'' IS DISTINCT FROM ''codex_responses'' AND (c->''modelSelection''->>''backend'' IS DISTINCT FROM ''ollama_loopback'' OR c->''modelSelection''->''modelSelection''->>''reasoningEffort'' IS DISTINCT FROM ''low''))');

 SELECT pg_get_functiondef('company_information_runtime_valid_before_risk(uuid,uuid,jsonb)'::regprocedure) INTO body;
 IF body IS NULL OR (length(body)-length(replace(body,anchor,'')))/length(anchor)<>1
  THEN RAISE EXCEPTION 'g22_ready_backend_anchor_missing'; END IF;
 EXECUTE replace(body,anchor,'(c->''modelSelection''->>''backend'' IS DISTINCT FROM ''codex_responses'' AND (c->''modelSelection''->>''backend'' IS DISTINCT FROM ''ollama_loopback'' OR c->''modelSelection''->''modelSelection''->>''reasoningEffort'' IS DISTINCT FROM ''low''))');
END $patch$;

-- Preserve historical Codex receipts. A local result additionally needs the
-- exact admitted selection and metadata-only one-call observer receipt before
-- any independent review may accept it.
CREATE OR REPLACE FUNCTION company_information_native_proven(e agent_executions)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE admitted JSONB; native JSONB:=e.verification->'informationRuntime'; owned JSONB:=e.verification->'ownedTreeReceipt';
        selection JSONB:=e.metadata->'executionContract'->'modelSelection'; observation JSONB:=native->'observer';
BEGIN
 IF e.application_id IS NOT NULL OR e.metadata->'executionContract'->>'executionClass' IS DISTINCT FROM 'roost-company-information-runtime-v1'
  OR e.status<>'completed' OR e.completed_at IS NULL OR e.context_invalidated_at IS NOT NULL
  OR e.changed_files IS DISTINCT FROM '[]'::jsonb THEN RETURN false; END IF;
 SELECT payload INTO admitted FROM agent_execution_events
  WHERE workspace_id=e.workspace_id AND execution_id=e.id AND type='information_admitted'
  ORDER BY created_at ASC,id ASC LIMIT 1;
 IF admitted IS NULL OR native->>'schemaVersion' IS DISTINCT FROM 'roost-company-information-runtime-verification-v1'
  OR COALESCE(native->>'admissionDigest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(native->>'inputSeal','') !~ '^[a-f0-9]{64}$'
  OR native->>'admissionDigest' IS DISTINCT FROM admitted->>'admissionDigest'
  OR native->>'inputSeal' IS DISTINCT FROM admitted->>'inputSeal'
  OR native->>'executionId' IS DISTINCT FROM e.id::text
  OR native->'ownedJob' IS DISTINCT FROM 'true'::jsonb OR native->'reviewRequired' IS DISTINCT FROM 'true'::jsonb
  OR native->'externalWrites' IS DISTINCT FROM 'false'::jsonb OR native->'nativeTools' IS DISTINCT FROM '[]'::jsonb
  OR owned->>'version' IS DISTINCT FROM 'roost-windows-job-v2'
  OR owned->>'attempt' IS DISTINCT FROM e.id::text OR owned->'cleanup' IS DISTINCT FROM 'true'::jsonb
  OR owned->'jobClosed' IS DISTINCT FROM 'true'::jsonb OR owned->'activeProcesses' IS DISTINCT FROM '0'::jsonb
  OR owned->'rootExit' IS DISTINCT FROM '0'::jsonb THEN RETURN false; END IF;
 IF selection->>'backend'='ollama_loopback' THEN
  RETURN COALESCE((selection->'modelSelection'->>'reasoningEffort'='low'
   AND admitted->>'backend'='ollama_loopback'
   AND admitted->>'modelDigest'=selection->'modelSelection'->>'modelDigest'
   AND native->>'selectionDigest'=admitted->>'selectionDigest'
   AND native->>'backend'='ollama_loopback'
   AND native->>'observedModel'=selection->'modelSelection'->>'model'
   AND native->>'observedDigest'=selection->'modelSelection'->>'modelDigest'
   AND native->'physicalModelCalls'='1'::jsonb
   AND observation->>'schemaVersion'='roost-ollama-observation-v1'
   AND observation->>'backend'='ollama_loopback'
   AND observation->>'model'=selection->'modelSelection'->>'model'
   AND observation->>'digest'=selection->'modelSelection'->>'modelDigest'
   AND observation->>'endpoint'='http://127.0.0.1:11434'
   AND observation->>'responseModel'=selection->'modelSelection'->>'model'
   AND observation->'requestCount'='1'::jsonb
   AND observation->'tagDigestVerified'='true'::jsonb
   AND observation->'runningDigestVerified'='true'::jsonb
   AND observation->'preflight'=admitted->'localPreflight'), false);
 END IF;
 IF selection->>'backend' IS DISTINCT FROM 'codex_responses' THEN RETURN false; END IF;
 RETURN true;
END $$;

COMMIT;
