BEGIN;
-- A new, bounded recovery grant preserves the terminal failed release. No
-- candidate, Git replay, historical mutation, baseline adoption or data reset.
CREATE FUNCTION governed_release_recovery_only_stable_manifest(m JSONB)
 RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result JSONB:=m-'backup';t JSONB:=m->'deployment'->'targets'->0;key TEXT;cfg JSONB;
BEGIN
 FOR key IN SELECT unnest(ARRAY['baseline','deployment','rollback']) LOOP
  result:=jsonb_set(result,ARRAY[key],(result->key)-ARRAY['configDigest','artifactSetDigest']);
 END LOOP;
 FOR key IN SELECT unnest(ARRAY['configuration','rollbackConfiguration','baseline']) LOOP
  cfg:=CASE WHEN key='baseline' THEN t->'baseline'->'configuration' ELSE t->key END;
  cfg:=cfg#-ARRAY['sourcePins','controllerRenderer'];
  IF key='baseline' THEN cfg:=cfg#-ARRAY['controllerPolicy','rendererDigest'];
  ELSE cfg:=cfg-ARRAY['controllerPolicy','settingsDigest','runtimePolicyDigest'];END IF;
  IF key='baseline' THEN t:=jsonb_set(t,'{baseline,configuration}',cfg);ELSE t:=jsonb_set(t,ARRAY[key],cfg);END IF;
 END LOOP;
 t:=t-ARRAY['configDigest','rollbackConfigDigest'];t:=t#-ARRAY['baseline','configDigest'];t:=t#-ARRAY['baseline','controllerInvariants','rendererDigest'];
 RETURN jsonb_set(result,'{deployment,targets}',jsonb_build_array(t));
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
CREATE FUNCTION governed_release_recovery_only_manifest_valid(old JSONB,s JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE previous JSONB:=old->'manifest';m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;
 pt JSONB:=previous->'deployment'->'targets'->0;renderer TEXT:=t->'baseline'->'controllerInvariants'->>'rendererDigest';cfg JSONB;policy JSONB;key TEXT;phase TEXT;d TEXT;
BEGIN
 IF m->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2' OR m->>'purpose' IS DISTINCT FROM 'application_release'
  OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' OR m->'cleanup'->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_array_length(m->'deployment'->'targets') IS DISTINCT FROM 1
  OR governed_release_recovery_only_stable_manifest(previous) IS DISTINCT FROM governed_release_recovery_only_stable_manifest(m)
  OR renderer IS NULL OR renderer!~'^[a-f0-9]{64}$' OR renderer IS NOT DISTINCT FROM pt->'baseline'->'controllerInvariants'->>'rendererDigest'
  OR t->'rollbackConfigDigest' IS NOT DISTINCT FROM pt->'rollbackConfigDigest'
  OR s->>'manifestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(m) THEN RETURN FALSE;END IF;
 FOR key IN SELECT unnest(ARRAY['configuration','rollbackConfiguration','baseline']) LOOP
  cfg:=CASE WHEN key='baseline' THEN t->'baseline'->'configuration' ELSE t->key END;
  phase:=CASE key WHEN 'configuration' THEN 'candidate' WHEN 'rollbackConfiguration' THEN 'rollback' ELSE 'baseline' END;
  IF cfg->'sourcePins'->>'controllerRenderer' IS DISTINCT FROM renderer THEN RETURN FALSE;END IF;
  IF key<>'baseline' THEN
   policy:=cfg->'controllerPolicy';
   IF jsonb_typeof(policy) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(policy))<>8
    OR NOT(policy?&ARRAY['schemaVersion','phase','rendererDigest','artifactDigest','buildCommandDigest','startCommandDigest','settingsInvariantDigest','runtimeInvariantDigest'])
    OR policy->>'schemaVersion' IS DISTINCT FROM 'roost-compose-controller-policy-v1' OR policy->>'phase' IS DISTINCT FROM phase
    OR policy->>'rendererDigest' IS DISTINCT FROM renderer
    OR policy->'settingsInvariantDigest' IS DISTINCT FROM pt->'baseline'->'controllerInvariants'->'settingsInvariantDigest'
    OR policy->'runtimeInvariantDigest' IS DISTINCT FROM pt->'baseline'->'controllerInvariants'->'runtimeInvariantDigest'
    OR EXISTS(SELECT 1 FROM jsonb_each_text(policy) kv WHERE kv.key IN ('rendererDigest','artifactDigest','buildCommandDigest','startCommandDigest','settingsInvariantDigest','runtimeInvariantDigest') AND COALESCE(kv.value,'')!~'^[a-f0-9]{64}$')
    OR COALESCE(cfg->>'settingsDigest','')!~'^[a-f0-9]{64}$' OR COALESCE(cfg->>'runtimePolicyDigest','')!~'^[a-f0-9]{64}$' THEN RETURN FALSE;END IF;
  END IF;
  d:=governed_release_compose_queue_config_digest(cfg);
  IF d IS DISTINCT FROM (CASE key WHEN 'configuration' THEN t->>'configDigest' WHEN 'rollbackConfiguration' THEN t->>'rollbackConfigDigest' ELSE t->'baseline'->>'configDigest' END)
   OR m->(CASE phase WHEN 'candidate' THEN 'deployment' ELSE phase END)->>'artifactSetDigest' IS DISTINCT FROM governed_release_compose_queue_artifact_digest(s,m,phase) THEN RETURN FALSE;END IF;
  IF m->(CASE phase WHEN 'candidate' THEN 'deployment' ELSE phase END)->>'configDigest'
   IS DISTINCT FROM governed_release_compose_queue_digest(jsonb_build_array(jsonb_build_object('targetId',t->'targetId','configDigest',d))) THEN RETURN FALSE;END IF;
 END LOOP;
 IF previous->'backup' IS DISTINCT FROM m->'backup' AND (m->'backup'->'digest' IS NOT DISTINCT FROM previous->'backup'->'digest'
  OR (m->'backup'->>'capturedAt')::timestamptz<=(previous->'backup'->>'restoreVerifiedAt')::timestamptz
  OR (m->'backup'->>'restoreVerifiedAt')::timestamptz<(m->'backup'->>'capturedAt')::timestamptz) THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE FUNCTION governed_release_recovery_only_scope_digest(s JSONB)
 RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r JSONB:=s->'recoveryOnly';binding JSONB;prior JSONB;
BEGIN
 SELECT jsonb_object_agg(k,s->k) INTO binding FROM unnest(ARRAY['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId']) k;
 SELECT jsonb_object_agg(k,r->k) INTO prior FROM unnest(ARRAY['releaseId','expectedVersion','closureId','closureDigest','failedOperationId','failedOutcomeId','failedEvidenceDigest','previousManifestDigest']) k;
 RETURN governed_release_compose_queue_digest(jsonb_build_object('schemaVersion','roost-compose-recovery-only-scope-v1','binding',binding,'manifestDigest',s->'manifestDigest','prior',prior,
  'currentEntryDigest',governed_release_compose_queue_digest(governed_release_compose_partial_retry_stable_evidence(r->'currentEvidence')),
  'operations',jsonb_build_array('rollback_config','rollback','observe','fixture_cleanup','runtime_resume','cleanup_resource','cleanup'),'observationMode','rollback'));
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
CREATE FUNCTION governed_release_recovery_only_basis_valid(s JSONB,workspace UUID,issuer UUID,fresh BOOLEAN DEFAULT FALSE)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE v JSONB:=s->'recoveryOnly';a JSONB:=v->'scopeAudit';old governed_releases;c governed_release_failed_closures;o governed_release_operations;x governed_release_outcomes;
 audit task_review_decisions;ae agent_executions;source_review task_review_decisions;source_execution agent_executions;key TEXT;entry JSONB:=v->'currentEvidence';n JSONB:=v->'nativeClosure';
BEGIN
 IF jsonb_typeof(v) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(v))<>12
  OR NOT(v?&ARRAY['schemaVersion','releaseId','expectedVersion','closureId','closureDigest','failedOperationId','failedOutcomeId','failedEvidenceDigest','previousManifestDigest','currentEvidence','nativeClosure','scopeAudit'])
  OR v->>'schemaVersion' IS DISTINCT FROM 'roost-compose-recovery-only-v1'
  OR s?|ARRAY['predecessor','baselineRestart','baselineAdoption','baselineRevalidation','gitPublicationBase','publishedGitBasis','successorBasis']
  OR jsonb_typeof(a) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(a))<>5
  OR NOT(a?&ARRAY['taskId','executionId','reviewId','materialVersion','scopeDigest']) THEN RETURN FALSE;END IF;
 SELECT * INTO old FROM governed_releases WHERE id=(v->>'releaseId')::uuid AND workspace_id=workspace;
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(v->>'closureId')::uuid AND release_id=old.id;
 SELECT * INTO o FROM governed_release_operations WHERE id=(v->>'failedOperationId')::uuid AND release_id=old.id;
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1;
 IF old.id IS NULL OR c.id IS NULL OR o.id IS NULL OR x.id IS NULL OR old.issuer_user_id IS DISTINCT FROM issuer
  OR v->>'expectedVersion' IS DISTINCT FROM governed_release_successor_version(old.id)
  OR c.closure_digest IS DISTINCT FROM v->>'closureDigest' OR c.closure_digest IS DISTINCT FROM governed_release_compose_queue_digest(c.snapshot)
  OR c.failed_operation_id IS DISTINCT FROM o.id OR c.failed_outcome_id IS DISTINCT FROM x.id OR x.id::text IS DISTINCT FROM v->>'failedOutcomeId'
  OR c.snapshot->>'failedEvidenceDigest' IS DISTINCT FROM v->>'failedEvidenceDigest' OR governed_release_compose_queue_digest(x.evidence) IS DISTINCT FROM v->>'failedEvidenceDigest'
  OR c.snapshot->'evidence' IS DISTINCT FROM x.evidence OR c.consent_digest IS DISTINCT FROM c.snapshot->>'consentDigest'
  OR c.snapshot->>'releaseId' IS DISTINCT FROM old.id::text OR c.snapshot->>'applicationId' IS DISTINCT FROM old.application_id::text
  OR c.snapshot->>'hostId' IS DISTINCT FROM old.host_id::text OR c.snapshot->>'issuerUserId' IS DISTINCT FROM issuer::text
  OR NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=c.revocation_id AND release_id=old.id)
  OR governed_release_compose_failed_rollback_partial_closure_valid(old,c.snapshot,FALSE) IS DISTINCT FROM TRUE
  OR governed_release_compose_partial_retry_stable_evidence(entry) IS DISTINCT FROM governed_release_compose_partial_retry_stable_evidence(x.evidence)
  OR governed_release_compose_failed_rollback_partial_valid(old.snapshot||jsonb_build_object('releaseId',old.id::text),entry,to_jsonb(o)) IS DISTINCT FROM TRUE
  OR governed_release_compose_owner_native_closure(old,o.id,entry,n) IS DISTINCT FROM TRUE
  OR v->>'previousManifestDigest' IS DISTINCT FROM old.manifest_digest OR v->>'previousManifestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(old.snapshot->'manifest')
  OR s->>'releaseExecutionId' IS NOT DISTINCT FROM old.snapshot->>'releaseExecutionId'
  OR governed_release_recovery_only_manifest_valid(old.snapshot,s) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId'] LOOP
  IF s->key IS DISTINCT FROM old.snapshot->key THEN RETURN FALSE;END IF;
 END LOOP;
 IF fresh AND ((entry->>'observedAt')::timestamptz>now()+interval '1 minute' OR (entry->>'observedAt')::timestamptz<now()-interval '5 minutes'
  OR (n->>'observedAt')::timestamptz>now()+interval '1 minute' OR (n->>'observedAt')::timestamptz<now()-interval '5 minutes') THEN RETURN FALSE;END IF;
 SELECT * INTO audit FROM task_review_decisions WHERE id=(a->>'reviewId')::uuid AND workspace_id=workspace AND task_id=(a->>'taskId')::uuid;
 SELECT * INTO ae FROM agent_executions WHERE id=audit.execution_id;
 SELECT * INTO source_review FROM task_review_decisions WHERE id=(s->>'reviewId')::uuid AND workspace_id=workspace;
 SELECT * INTO source_execution FROM agent_executions WHERE id=source_review.execution_id;
 IF audit.id IS NULL OR ae.id IS NULL OR source_review.id IS NULL OR source_execution.id IS NULL OR audit.decision<>'approve'
  OR audit.id=source_review.id OR ae.id=source_execution.id OR ae.id::text IS DISTINCT FROM a->>'executionId' OR ae.id::text IS DISTINCT FROM s->>'releaseExecutionId'
  OR ae.application_id::text IS DISTINCT FROM s->>'applicationId' OR ae.agent_host_id::text IS DISTINCT FROM s->>'hostId'
  OR ae.status IS DISTINCT FROM 'completed' OR ae.context_invalidated_at IS NOT NULL OR ae.task_id IS DISTINCT FROM audit.task_id
  OR ae.completed_at IS NULL OR ae.completed_at<c.created_at OR audit.created_at<c.created_at
  OR audit.material_version IS DISTINCT FROM a->>'materialVersion' OR audit.material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material(ae)::text,'UTF8')),'hex')
  OR audit.evidence->>'reviewedCommit' IS DISTINCT FROM s->>'commit'
  OR audit.verifier_id::text IS NOT DISTINCT FROM s->>'releaserAgentId' OR audit.verifier_id::text IS NOT DISTINCT FROM source_execution.metadata->'executionContract'->'assignment'->>'agentId'
  OR ae.metadata->'executionContract'->'assignment'->>'agentId' IS DISTINCT FROM s->>'releaserAgentId'
  OR ae.metadata->'executionContract'->'nativeBoundary'->>'profile' IS DISTINCT FROM 'inspect-readonly'
  OR ae.metadata->'executionContract'->'modelSelection'->>'schemaVersion' IS DISTINCT FROM 'roost-managed-hermes-backend-v1'
  OR ae.metadata->'executionContract'->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses'
  OR ae.verification->'readOnlyAudit'->>'schemaVersion' IS DISTINCT FROM 'roost-readonly-audit-v1'
  OR ae.verification->'readOnlyAudit'->>'verdict' IS DISTINCT FROM 'verified'
  OR COALESCE(ae.verification->'readOnlyAudit'->>'evidenceDigest','')!~'^[a-f0-9]{64}$'
  OR COALESCE(ae.verification->'readOnlyAudit'->>'preTree','')!~'^[a-f0-9]{64}$'
  OR ae.verification->'readOnlyAudit'->'preTree' IS DISTINCT FROM ae.verification->'readOnlyAudit'->'postTree'
  OR ae.verification->'readOnlyAudit'->>'processState' IS DISTINCT FROM 'unchanged'
  OR ae.verification->'readOnlyAudit'->>'dockerState' IS DISTINCT FROM 'unchanged'
  OR ae.verification->'readOnlyAudit'->>'gitState' IS DISTINCT FROM 'unchanged'
  OR ae.verification->'readOnlyAudit'->'nativeTools' IS DISTINCT FROM '[]'::jsonb
  OR COALESCE(ae.verification->>'outcome','') IN ('boundary_violation','policy_blocked','acceptance_failed','verification_blocked','process_failed')
  OR ae.changed_files IS DISTINCT FROM '[]'::jsonb OR ae.verification->'managedAdmission'->>'qualification' IS DISTINCT FROM 'signed_native_v1'
  OR COALESCE(ae.verification->'managedAdmission'->>'evidenceDigest','')!~'^[a-f0-9]{64}$' OR COALESCE(ae.verification->'managedAdmission'->>'jobSourceDigest','')!~'^[a-f0-9]{64}$'
  OR ae.verification->'ownedTreeReceipt'->>'cleanup' IS DISTINCT FROM 'true' OR ae.verification->'ownedTreeReceipt'->>'activeProcesses' IS DISTINCT FROM '0'
  OR ae.verification->'ownedTreeReceipt'->>'attempt' IS DISTINCT FROM ae.id::text
  OR a->>'scopeDigest' IS DISTINCT FROM governed_release_recovery_only_scope_digest(s)
  OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(audit.evidence->'evidence') e WHERE e->>'kind'='artifact' AND e->>'verdict'='pass'
   AND e->>'reference'='roost-release-recovery-scope:'||(a->>'scopeDigest'))
  OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(audit.evidence->'evidence') e WHERE e->>'kind'='test' AND e->>'verdict'='pass') THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE FUNCTION governed_release_recovery_only_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.snapshot?'recoveryOnly' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  IF governed_release_recovery_only_basis_valid(NEW.snapshot,NEW.workspace_id,NEW.issuer_user_id,TRUE) IS DISTINCT FROM TRUE
   OR EXISTS(SELECT 1 FROM governed_releases WHERE workspace_id=NEW.workspace_id AND snapshot->'recoveryOnly'->>'closureId'=NEW.snapshot->'recoveryOnly'->>'closureId') THEN
   RAISE EXCEPTION 'governed_release_recovery_only_unproven';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_recovery_only_insert_guard BEFORE INSERT ON governed_releases FOR EACH ROW EXECUTE FUNCTION governed_release_recovery_only_insert_guard();
CREATE FUNCTION governed_release_recovery_only_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;previous governed_release_operations;priorOutcome governed_release_outcomes;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 IF r.snapshot?'recoveryOnly' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
  IF governed_release_recovery_only_basis_valid(r.snapshot,r.workspace_id,r.issuer_user_id,FALSE) IS DISTINCT FROM TRUE
   OR NEW.operation NOT IN ('rollback_config','rollback','observe','fixture_cleanup','runtime_resume','cleanup_resource','cleanup')
   OR NEW.operation='observe' AND NEW.intent->'parameters'->>'mode' IS DISTINCT FROM 'rollback'
   OR NEW.intent->'observed'->>'baseCommit' IS DISTINCT FROM r.snapshot->>'commit'
   OR NEW.intent->'observed'->>'baseTree' IS DISTINCT FROM r.snapshot->>'candidateTree'
   OR NEW.operation IN ('rollback_config','rollback') AND EXISTS(SELECT 1 FROM governed_release_operations WHERE release_id=r.id AND operation=NEW.operation)
   THEN RAISE EXCEPTION 'governed_release_recovery_only_forward_forbidden';END IF;
  IF NEW.operation='rollback_config' AND EXISTS(SELECT 1 FROM governed_release_operations WHERE release_id=r.id)
   OR NEW.operation='rollback' AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)x ON TRUE
    WHERE o.release_id=r.id AND o.operation='rollback_config' AND (x.status='succeeded' OR x.status='reconciled' AND x.reconciled_status='succeeded'))
   OR NEW.operation='observe' AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)x ON TRUE
    WHERE o.release_id=r.id AND o.operation='rollback' AND (x.status='succeeded' OR x.status='reconciled' AND x.reconciled_status='succeeded')) THEN
   RAISE EXCEPTION 'governed_release_recovery_only_progression_invalid';END IF;
  IF NEW.operation IN ('rollback_config','rollback') AND (NEW.intent->'parameters'->>'commit' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->>'commit'
   OR NEW.intent->'parameters'->>'configDigest' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->>'configDigest'
   OR NEW.intent->'parameters'->>'artifactSetDigest' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->>'artifactSetDigest'
   OR NEW.intent->'parameters'->>'schemaDigest' IS DISTINCT FROM r.snapshot->'manifest'->'rollback'->>'schemaDigest') THEN RAISE EXCEPTION 'governed_release_recovery_only_artifact_invalid';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_recovery_only_operation_guard BEFORE INSERT ON governed_release_operations FOR EACH ROW EXECUTE FUNCTION governed_release_recovery_only_operation_guard();
COMMIT;
