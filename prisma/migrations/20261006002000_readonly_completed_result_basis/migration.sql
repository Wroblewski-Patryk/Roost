BEGIN;

-- An unchanged completed auditor result may acquire a new context basis. This
-- does not change its response, native evidence, original pin or release rights.
CREATE FUNCTION completed_result_readonly_native_valid(e agent_executions)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE c JSONB:=e.metadata->'executionContract'; b JSONB:=c->'nativeBoundary';
 v JSONB:=e.verification; j JSONB:=v->'ownedTreeReceipt'; m JSONB:=v->'managedAdmission';
 a JSONB:=v->'readOnlyAudit'; r JSONB:=e.metadata->'resultRevision';
BEGIN
 IF e.status IS DISTINCT FROM 'completed' OR e.completed_at IS NULL
  OR e.agent_host_id IS NULL OR e.context_invalidated_at IS NOT NULL
  OR e.lease_token IS NOT NULL OR e.lease_expires_at IS NOT NULL OR e.error_state IS NOT NULL
  OR e.changed_files IS DISTINCT FROM '[]'::jsonb
  OR COALESCE(v->>'outcome','') IN ('boundary_violation','policy_blocked','acceptance_failed','verification_blocked','process_failed')
  OR b->>'profile' IS DISTINCT FROM 'inspect-readonly' OR b->'inspectReadOnly'->>'kind' IS DISTINCT FROM 'auditor'
  OR b->'runtime'->>'required' IS DISTINCT FROM 'false' OR b->'runtime'->'ports' IS DISTINCT FROM '[]'::jsonb
  OR COALESCE(c->'assignment'->>'agentId','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
  OR c->'assignment'->>'agentId' IS DISTINCT FROM c->'taskRoles'->'executor'->>'id'
  OR c->'access'->>'sandbox' IS DISTINCT FROM 'read-only' OR c->'access'->>'externalWrites' IS DISTINCT FROM 'false'
  OR c->'access'->'tools' IS DISTINCT FROM '["repository_read"]'::jsonb
  OR c->'access'->'permissions' IS DISTINCT FROM '["repository_read"]'::jsonb
  OR c->'modelSelection'->>'schemaVersion' IS DISTINCT FROM 'roost-managed-hermes-backend-v1'
  OR c->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses'
  OR m->>'qualification' IS DISTINCT FROM 'signed_native_v1'
  OR COALESCE(m->>'evidenceDigest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(m->>'jobSourceDigest','') !~ '^[a-f0-9]{64}$'
  OR j->>'sourceSha256' IS DISTINCT FROM m->>'jobSourceDigest'
  OR j->>'version' IS DISTINCT FROM 'roost-windows-job-v2' OR j->>'attempt' IS DISTINCT FROM e.id::text
  OR j->>'cleanup' IS DISTINCT FROM 'true' OR j->>'jobClosed' IS DISTINCT FROM 'true'
  OR j->>'activeProcesses' IS DISTINCT FROM '0' OR j->>'rootExit' IS DISTINCT FROM '0'
  OR j->>'assignedBeforeResume' IS DISTINCT FROM 'true' OR j->>'resumed' IS DISTINCT FROM 'true'
  OR j->>'killOnClose' IS DISTINCT FROM 'true' OR j->>'breakaway' IS DISTINCT FROM 'false'
  OR a->>'schemaVersion' IS DISTINCT FROM 'roost-readonly-audit-v1' OR a->>'verdict' IS DISTINCT FROM 'verified'
  OR COALESCE(a->>'evidenceDigest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(a->>'preTree','') !~ '^[a-f0-9]{64}$' OR a->>'preTree' IS DISTINCT FROM a->>'postTree'
  OR a->>'gitState' IS DISTINCT FROM 'unchanged' OR a->>'processState' IS DISTINCT FROM 'unchanged'
  OR a->>'dockerState' IS DISTINCT FROM 'unchanged' OR a->'nativeTools' IS DISTINCT FROM '[]'::jsonb
  OR e.metadata->>'resultRevisionReviewVersion' IS DISTINCT FROM '1'
  OR r->>'schemaVersion' IS DISTINCT FROM 'roost-result-revision-v1'
  OR COALESCE(r->>'id','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
  OR COALESCE(r->>'commit','') !~ '^[a-f0-9]{40}$' OR r->>'workingTree' IS DISTINCT FROM 'clean'
  OR r->>'branch' IS NULL OR c->'singleTask'->>'branch' IS NULL
  OR r->>'branch' IS DISTINCT FROM c->'singleTask'->>'branch'
  OR r->>'executionId' IS DISTINCT FROM e.id::text OR r->>'attempt' IS DISTINCT FROM e.attempt::text
  OR r->>'hostId' IS DISTINCT FROM e.agent_host_id::text
  OR r->>'checkpointVersion' IS DISTINCT FROM e.checkpoint_version::text
  OR COALESCE(r->>'observedAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
  THEN RETURN FALSE; END IF;
 -- Invalid dates fail closed; no new timestamp is written into the execution.
 RETURN isfinite((r->>'observedAt')::timestamptz);
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN FALSE;
END $$;

-- Preserve the existing trigger OID and its complete coding guard. Only the
-- native eligibility block gains a separate auditor branch. All owner/latest,
-- review/rejection, immutable original material, Ready, admission, composition,
-- finding, interview and suspension checks remain in the original function.
DO $patch$
DECLARE definition TEXT; first_marker TEXT; last_marker TEXT; start_at INTEGER;
 end_at INTEGER; original_native TEXT; replacement TEXT;
BEGIN
 definition:=pg_get_functiondef('completed_result_basis_guard()'::regprocedure);
 first_marker:=' IF e.metadata->>''resultRevisionReviewVersion'' IS DISTINCT FROM ''1''';
 last_marker:='THEN RAISE EXCEPTION ''completed_result_native_unproven''; END IF;';
 start_at:=position(first_marker IN definition);
 IF start_at=0 THEN RAISE EXCEPTION 'completed_readonly_basis_predecessor_unrecognized'; END IF;
 end_at:=position(last_marker IN substring(definition FROM start_at));
 IF end_at=0 THEN RAISE EXCEPTION 'completed_readonly_basis_predecessor_unrecognized'; END IF;
 original_native:=substring(definition FROM start_at FOR end_at-1+length(last_marker));
 IF position('codingTests' IN original_native)=0 OR position('coding-local' IN original_native)=0
  OR position('nativeReviewReceipt' IN original_native)=0
  OR position('completed_result_review_blocks_revalidation(e)' IN definition)=0
  OR position('completed_result_current_context_required' IN definition)=0
  THEN RAISE EXCEPTION 'completed_readonly_basis_predecessor_unrecognized'; END IF;
 replacement:=' IF e.metadata->''executionContract''->''nativeBoundary''->>''profile''=''inspect-readonly'' THEN
  IF completed_result_readonly_native_valid(e) IS DISTINCT FROM TRUE
   OR e.metadata->''resultRevision''->>''commit'' IS DISTINCT FROM NEW.commit
   THEN RAISE EXCEPTION ''completed_result_native_unproven''; END IF;
 ELSE
 '||original_native||'
 END IF;';
 -- A second or unexpectedly modified baseline cannot be patched silently.
 IF position('completed_result_readonly_native_valid(e)' IN definition)>0
  OR position(original_native IN substring(definition FROM start_at+length(original_native)))>0
  THEN RAISE EXCEPTION 'completed_readonly_basis_predecessor_unrecognized'; END IF;
 EXECUTE substring(definition FROM 1 FOR start_at-1)||replacement
  ||substring(definition FROM start_at+length(original_native));
END $patch$;

COMMIT;
