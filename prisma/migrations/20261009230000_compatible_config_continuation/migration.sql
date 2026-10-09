BEGIN;
-- Additive, opt-in continuation of ONE authenticated configuration-absent closure.
-- No old row, signature, native clock, operation or publication outcome is rewritten.
CREATE FUNCTION governed_release_compatible_continuation_declaration_valid(v JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE key TEXT;
BEGIN
 IF governed_release_compatible_keys(v,ARRAY['releaseId','closureId','closureDigest','gitOperationIds']) IS DISTINCT FROM TRUE
  OR governed_release_compatible_keys(v->'gitOperationIds',ARRAY['push','pr','review','merge']) IS DISTINCT FROM TRUE
  OR governed_release_compatible_negative_string(v->'closureDigest','^[a-f0-9]{64}$') IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['releaseId','closureId'] LOOP
  IF governed_release_compatible_negative_string(v->key,'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$') IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 END LOOP;
 FOREACH key IN ARRAY ARRAY['push','pr','review','merge'] LOOP
  IF governed_release_compatible_negative_string(v->'gitOperationIds'->key,'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$') IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 END LOOP;
 RETURN (SELECT count(DISTINCT value) FROM jsonb_each_text(v->'gitOperationIds'))=4;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

ALTER FUNCTION governed_release_compatible_scope_digest(JSONB) RENAME TO governed_release_compatible_scope_pre_cfg_cont_v1;
CREATE FUNCTION governed_release_compatible_scope_digest(s JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF NOT(s?'compatibleConfigurationContinuation' OR s?'compatibleContinuationBasis') THEN RETURN governed_release_compatible_scope_pre_cfg_cont_v1(s);END IF;
 IF governed_release_compatible_continuation_declaration_valid(s->'compatibleConfigurationContinuation') IS DISTINCT FROM TRUE THEN RETURN NULL;END IF;
 RETURN governed_release_compose_queue_digest(jsonb_build_object('schemaVersion','roost-compatible-configuration-continuation-scope-v1',
  'recoveryScopeDigest',governed_release_compatible_scope_pre_cfg_cont_v1(s),'continuation',s->'compatibleConfigurationContinuation',
  'operations',jsonb_build_array('deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'),
  'inheritedPublicationOperations',jsonb_build_array('push','pr','review','merge')));
EXCEPTION WHEN OTHERS THEN RETURN NULL;END $$;

CREATE FUNCTION governed_release_compatible_continuation_entry_stable(e JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_set(jsonb_set(jsonb_set(jsonb_set(e-ARRAY['observedAt','evidenceDigest'],'{publicHealth}',(e->'publicHealth')-'healthDigest'),
  '{projectInventory}',(e->'projectInventory')-ARRAY['observedAt','digest']),'{services}',
  (SELECT jsonb_agg(value-ARRAY['observedAt','inventoryDigest'] ORDER BY ord) FROM jsonb_array_elements(e->'services') WITH ORDINALITY q(value,ord))),
  '{cadences}',(SELECT jsonb_agg(value-ARRAY['observedAt','inventoryDigest'] ORDER BY ord) FROM jsonb_array_elements(e->'cadences') WITH ORDINALITY q(value,ord)))
  #-'{ingressFence,observedAt}'#-'{ingressFence,evidenceDigest}';
$$;

-- This reconstructs data from stored rows. Permission additionally requires
-- continuation_valid and the unchanged full compatible/native/proof guards.
CREATE FUNCTION governed_release_compatible_continuation_basis(parent governed_releases,s JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
#variable_conflict use_column
DECLARE dto JSONB:=s->'compatibleConfigurationContinuation';old JSONB:=parent.snapshot;c governed_release_failed_closures;
 op governed_release_operations;x governed_release_outcomes;failed governed_release_operations;fx governed_release_outcomes;
 receipt JSONB;rows JSONB:='[]'::jsonb;git JSONB:='[]'::jsonb;public_op JSONB;public_x JSONB;names TEXT[]:=ARRAY['push','pr','review','merge','deploy_config'];idx INT:=0;key TEXT;prnum JSONB;
BEGIN
 IF governed_release_compatible_continuation_declaration_valid(dto) IS DISTINCT FROM TRUE OR parent.id IS NULL
  OR parent.id::text IS DISTINCT FROM dto->>'releaseId' OR old?'compatibleConfigurationContinuation' OR old?'compatibleContinuationBasis'
  OR old->>'manifestDigest' IS DISTINCT FROM parent.manifest_digest OR parent.manifest_digest IS DISTINCT FROM governed_release_compose_queue_digest(old->'manifest')
  OR old->'compatibleArtifactRecovery'->>'schemaVersion' IS DISTINCT FROM 'roost-compose-compatible-artifact-recovery-v1'
  OR (SELECT count(*) FROM governed_release_operations WHERE release_id=parent.id)<>5 THEN RETURN NULL;END IF;
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(dto->>'closureId')::uuid AND release_id=parent.id AND workspace_id=parent.workspace_id;
 receipt:=c.snapshot;
 SELECT * INTO failed FROM governed_release_operations WHERE id=c.failed_operation_id AND release_id=parent.id;
 SELECT * INTO fx FROM governed_release_outcomes WHERE operation_id=failed.id ORDER BY sequence DESC LIMIT 1;
 IF c.id IS NULL OR c.issuer_user_id IS DISTINCT FROM parent.issuer_user_id OR c.closure_digest IS DISTINCT FROM dto->>'closureDigest'
  OR c.closure_digest IS DISTINCT FROM governed_release_compose_queue_digest(receipt) OR c.consent_digest IS DISTINCT FROM receipt->>'consentDigest'
  OR c.expected_version IS DISTINCT FROM receipt->>'expectedVersion' OR c.failed_operation_id::text IS DISTINCT FROM receipt->>'failedOperationId'
  OR c.failed_outcome_id IS DISTINCT FROM fx.id OR c.failed_outcome_id::text IS DISTINCT FROM receipt->>'failedOutcomeId'
  OR receipt->>'releaseId' IS DISTINCT FROM parent.id::text OR receipt->>'applicationId' IS DISTINCT FROM parent.application_id::text
  OR receipt->>'hostId' IS DISTINCT FROM parent.host_id::text OR receipt->>'issuerUserId' IS DISTINCT FROM parent.issuer_user_id::text
  OR receipt->>'failedEvidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(fx.evidence) OR receipt->'evidence' IS DISTINCT FROM fx.evidence
  OR failed.operation IS DISTINCT FROM 'deploy_config' OR failed.sequence IS DISTINCT FROM 5
  OR fx.status IS DISTINCT FROM 'reconciled' OR fx.reconciled_status IS DISTINCT FROM 'absent' OR fx.observation_only IS DISTINCT FROM TRUE
  OR fx.evidence->'compatibleRecoveryFailure'->>'kind' IS DISTINCT FROM 'configuration_absent'
  OR governed_release_compose_owner_native_closure(parent,failed.id,fx.evidence,receipt->'nativeClosure') IS DISTINCT FROM TRUE
  OR governed_release_compatible_negative_contents_at(parent,failed,fx.evidence,fx.status,fx.reconciled_status,fx.observation_only,(fx.evidence->>'observedAt')::timestamptz) IS DISTINCT FROM TRUE
  OR c.owner_authenticated_at>c.created_at OR c.owner_authenticated_at<c.created_at-interval '5 minutes'
  OR (c.created_at AT TIME ZONE 'UTC')<(receipt->'nativeClosure'->>'observedAt')::timestamptz
  OR (c.created_at AT TIME ZONE 'UTC')>now()
  OR NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=c.revocation_id AND release_id=parent.id AND workspace_id=parent.workspace_id AND issuer_user_id=parent.issuer_user_id) THEN RETURN NULL;END IF;
 FOREACH key IN ARRAY ARRAY['taskId','applicationId','hostId','releaserAgentId','releaserRevision','reviewId','materialVersion','commit','candidateTree','baseCommit','baseTree'] LOOP
  IF s->key IS DISTINCT FROM old->key THEN RETURN NULL;END IF;
 END LOOP;
 IF s->'manifest'->'repository' IS DISTINCT FROM old->'manifest'->'repository' THEN RETURN NULL;END IF;
 FOR op IN SELECT * FROM governed_release_operations WHERE release_id=parent.id ORDER BY sequence LOOP
  idx:=idx+1;SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;
  IF op.sequence IS DISTINCT FROM idx OR op.operation IS DISTINCT FROM names[idx] OR op.workspace_id IS DISTINCT FROM parent.workspace_id
   OR op.application_id IS DISTINCT FROM parent.application_id OR x.id IS NULL OR x.release_id IS DISTINCT FROM parent.id OR x.workspace_id IS DISTINCT FROM parent.workspace_id THEN RETURN NULL;END IF;
  public_x:=governed_release_compatible_camel_row(to_jsonb(x)-'request_hash');
  public_op:=governed_release_compatible_camel_row((to_jsonb(op)-'request_hash')||jsonb_build_object('created_at',governed_release_compatible_iso(op.created_at)));
  rows:=rows||jsonb_build_array(public_op||jsonb_build_object('outcome',public_x));
  IF idx<=4 THEN
   IF op.id::text IS DISTINCT FROM dto->'gitOperationIds'->>names[idx]
    OR COALESCE(CASE WHEN x.status='reconciled' THEN x.reconciled_status ELSE x.status END,'')<>'succeeded'
    OR op.intent->>'operation' IS DISTINCT FROM op.operation OR op.intent->'commit' IS DISTINCT FROM old->'commit'
    OR op.intent->'baseCommit' IS DISTINCT FROM old->'baseCommit' OR op.intent->>'manifestDigest' IS DISTINCT FROM parent.manifest_digest
    OR op.intent->'observed'->'commit' IS DISTINCT FROM old->'commit' OR op.intent->'observed'->>'manifestDigest' IS DISTINCT FROM parent.manifest_digest
    OR op.intent->'observed'->'baseCommit' IS DISTINCT FROM old->'compatibleArtifactRecovery'->'publication'->'baseCommit'
    OR op.intent->'observed'->'baseTree' IS DISTINCT FROM old->'compatibleArtifactRecovery'->'publication'->'baseTree'
    OR x.evidence->'remoteCommit' IS DISTINCT FROM old->'commit' OR x.evidence->'remoteTree' IS DISTINCT FROM old->'candidateTree'
    OR x.evidence->'remoteBase' IS DISTINCT FROM old->'compatibleArtifactRecovery'->'publication'->'baseCommit'
    OR x.evidence->'remoteBaseTree' IS DISTINCT FROM old->'compatibleArtifactRecovery'->'publication'->'baseTree' THEN RETURN NULL;END IF;
   IF idx>1 THEN
    IF x.evidence->'prHeadCommit' IS DISTINCT FROM old->'commit' OR jsonb_typeof(x.evidence->'pullRequestNumber') IS DISTINCT FROM 'number'
     OR COALESCE(x.evidence->>'pullRequestNumber','')!~'^[0-9]+$' OR (x.evidence->>'pullRequestNumber')::bigint<=0 THEN RETURN NULL;END IF;
    IF idx=2 THEN prnum:=x.evidence->'pullRequestNumber';ELSIF x.evidence->'pullRequestNumber' IS DISTINCT FROM prnum THEN RETURN NULL;END IF;
   END IF;
   IF idx=3 AND x.evidence->'reviewApproved' IS DISTINCT FROM 'true'::jsonb OR idx=4 AND (x.evidence->'prMerged' IS DISTINCT FROM 'true'::jsonb OR x.evidence->'mergedCommit' IS DISTINCT FROM old->'commit') THEN RETURN NULL;END IF;
   git:=git||jsonb_build_array(jsonb_build_object('operation',op.operation,'operationId',op.id,'outcomeId',x.id,'intentDigest',governed_release_compose_queue_digest(op.intent),
    'outcomeDigest',governed_release_compose_queue_digest(public_x),'evidenceDigest',governed_release_compose_queue_digest(x.evidence)));
  END IF;
 END LOOP;
 RETURN jsonb_build_object('schemaVersion','roost-compatible-configuration-continuation-basis-v1','releaseId',parent.id,'expectedVersion',governed_release_successor_version(parent.id),
  'closureId',c.id,'closureDigest',c.closure_digest,'previousManifestDigest',parent.manifest_digest,'journalDigest',governed_release_compose_queue_digest(rows),
  'failedOperationId',failed.id,'failedOutcomeId',fx.id,'failedEvidenceDigest',governed_release_compose_queue_digest(fx.evidence),
  'applicationId',old->'applicationId','hostId',old->'hostId','taskId',old->'taskId','reviewId',old->'reviewId','materialVersion',old->'materialVersion','commit',old->'commit','tree',old->'candidateTree',
  'repository',old->'manifest'->'repository','publication',jsonb_build_object('baseCommit',old->'compatibleArtifactRecovery'->'publication'->'baseCommit','baseTree',old->'compatibleArtifactRecovery'->'publication'->'baseTree','pullRequestNumber',prnum),'git',git);
EXCEPTION WHEN OTHERS THEN RETURN NULL;END $$;

CREATE FUNCTION governed_release_compatible_continuation_valid(s JSONB,workspace UUID,issuer UUID,fresh BOOLEAN DEFAULT FALSE) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE parent governed_releases;c governed_release_failed_closures;basis JSONB;r JSONB:=s->'compatibleArtifactRecovery';old JSONB;e JSONB:=r->'currentEntry';key TEXT;n JSONB:=r->'nativeClosure';
BEGIN
 IF governed_release_compatible_continuation_declaration_valid(s->'compatibleConfigurationContinuation') IS DISTINCT FROM TRUE
  OR s?|ARRAY['publishedGitBasis','successorBasis','gitPublicationBase','recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation'] THEN RETURN FALSE;END IF;
 SELECT * INTO parent FROM governed_releases WHERE id=(s->'compatibleConfigurationContinuation'->>'releaseId')::uuid AND workspace_id=workspace;
 basis:=governed_release_compatible_continuation_basis(parent,s);old:=parent.snapshot;
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(s->'compatibleConfigurationContinuation'->>'closureId')::uuid AND release_id=parent.id;
 IF basis IS NULL OR s->'compatibleContinuationBasis' IS DISTINCT FROM basis OR parent.issuer_user_id IS DISTINCT FROM issuer
  OR s->>'applicationId' IS DISTINCT FROM parent.application_id::text OR s->>'hostId' IS DISTINCT FROM parent.host_id::text
  OR governed_release_compatible_config_closure_journal(parent.id,c.failed_operation_id,c.snapshot->'evidence') IS DISTINCT FROM TRUE
  OR r->'scopeAudit'->>'scopeDigest' IS DISTINCT FROM governed_release_compatible_scope_digest(s)
  OR (s->'manifest')-'backup' IS DISTINCT FROM (old->'manifest')-'backup'
  OR r->'prior' IS DISTINCT FROM old->'compatibleArtifactRecovery'->'prior' OR r->'publication' IS DISTINCT FROM old->'compatibleArtifactRecovery'->'publication'
  OR r->'failurePolicy' IS DISTINCT FROM old->'compatibleArtifactRecovery'->'failurePolicy'
  OR (r->'replacement')-'compatibilityReceiptDigest' IS DISTINCT FROM (old->'compatibleArtifactRecovery'->'replacement')-'compatibilityReceiptDigest'
  OR r->'scopeAudit'->'taskId' IS NOT DISTINCT FROM old->'compatibleArtifactRecovery'->'scopeAudit'->'taskId'
  OR r->'scopeAudit'->'executionId' IS NOT DISTINCT FROM old->'compatibleArtifactRecovery'->'scopeAudit'->'executionId'
  OR r->'scopeAudit'->'reviewId' IS NOT DISTINCT FROM old->'compatibleArtifactRecovery'->'scopeAudit'->'reviewId'
  OR r->'scopeAudit'->'executionId' IS DISTINCT FROM s->'releaseExecutionId'
  OR s->'requestId' IS NOT DISTINCT FROM old->'requestId' OR s->'releaserCredentialId' IS NOT DISTINCT FROM old->'releaserCredentialId'
  OR governed_release_compatible_negative_string(s->'requestId','^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$') IS DISTINCT FROM TRUE
  OR governed_release_compatible_negative_string(s->'releaserCredentialId','^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$') IS DISTINCT FROM TRUE
  OR jsonb_typeof(s->'credentialVersion') IS DISTINCT FROM 'number' OR COALESCE(s->>'credentialVersion','')!~'^[0-9]+$' OR (s->>'credentialVersion')::int<=0
  OR s->'manifest'->'backup'->'digest' IS NOT DISTINCT FROM old->'manifest'->'backup'->'digest'
  OR (s->'manifest'->'backup'->>'capturedAt')::timestamptz<(c.created_at AT TIME ZONE 'UTC')
  OR (s->'manifest'->'backup'->>'capturedAt')::timestamptz>(s->'manifest'->'backup'->>'restoreVerifiedAt')::timestamptz
  OR governed_release_compatible_continuation_entry_stable(e) IS DISTINCT FROM governed_release_compatible_continuation_entry_stable(old->'compatibleArtifactRecovery'->'currentEntry')
  OR e->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(e-'evidenceDigest')
  OR n->'releaseId' IS DISTINCT FROM r->'prior'->'releaseId' OR n->'operationId' IS DISTINCT FROM r->'prior'->'failedOperationId'
  OR n->'agentHostId' IS DISTINCT FROM s->'hostId' OR n->'evidenceDigest' IS DISTINCT FROM e->'evidenceDigest'
  OR (n->>'observedAt')::timestamptz<(e->>'observedAt')::timestamptz THEN RETURN FALSE;END IF;
 IF fresh AND ((c.created_at AT TIME ZONE 'UTC')<now()-interval '24 hours' OR (e->>'observedAt')::timestamptz>now() OR (e->>'observedAt')::timestamptz<now()-interval '5 minutes'
  OR (n->>'observedAt')::timestamptz>now() OR (n->>'observedAt')::timestamptz<now()-interval '5 minutes'
  OR (s->>'expiresAt')::timestamptz<=now()) THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

-- Reuse the original full proof and failed-partial admission. Strip only the
-- server-derived data field from the original request digest, never caller DTO.
ALTER FUNCTION governed_release_compatible_proof_valid(JSONB,UUID,UUID,TIMESTAMP) RENAME TO governed_release_compatible_proof_pre_cfg_cont_v1;
CREATE FUNCTION governed_release_compatible_proof_valid(s JSONB,workspace UUID,issuer UUID,closed_at TIMESTAMP) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF s?'compatibleConfigurationContinuation' OR s?'compatibleContinuationBasis' THEN
  IF governed_release_compatible_continuation_valid(s,workspace,issuer,FALSE) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
  RETURN governed_release_compatible_proof_pre_cfg_cont_v1(s-'compatibleContinuationBasis',workspace,issuer,closed_at);
 END IF;RETURN governed_release_compatible_proof_pre_cfg_cont_v1(s,workspace,issuer,closed_at);
END $$;
ALTER FUNCTION governed_release_compatible_basis_valid(JSONB,UUID,UUID,BOOLEAN) RENAME TO governed_release_compatible_basis_pre_cfg_cont_v1;
CREATE FUNCTION governed_release_compatible_basis_valid(s JSONB,workspace UUID,issuer UUID,fresh BOOLEAN DEFAULT FALSE) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF s?'compatibleConfigurationContinuation' OR s?'compatibleContinuationBasis' THEN
  IF governed_release_compatible_continuation_valid(s,workspace,issuer,fresh) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 END IF;
 RETURN governed_release_compatible_basis_pre_cfg_cont_v1(s,workspace,issuer,fresh);
END $$;
ALTER FUNCTION governed_release_compatible_negative_lineage_valid(governed_releases) RENAME TO governed_release_compatible_negative_pre_cfg_cont_v1;
CREATE FUNCTION governed_release_compatible_negative_lineage_valid(r governed_releases) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF r.snapshot?'compatibleConfigurationContinuation' OR r.snapshot?'compatibleContinuationBasis' THEN
  IF governed_release_compatible_continuation_valid(r.snapshot,r.workspace_id,r.issuer_user_id,FALSE) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
  r.snapshot:=r.snapshot-'compatibleContinuationBasis';
 END IF;RETURN governed_release_compatible_negative_pre_cfg_cont_v1(r);
END $$;

-- A closure can issue exactly one continuation, including concurrent inserts.
CREATE UNIQUE INDEX governed_release_compatible_continuation_once ON governed_releases(workspace_id,(snapshot->'compatibleConfigurationContinuation'->>'closureId')) WHERE snapshot?'compatibleConfigurationContinuation';

-- Original normal/revoked-unstarted branches remain byte-for-byte below the new dispatch.
CREATE OR REPLACE FUNCTION governed_release_compatible_insert_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.snapshot?'compatibleConfigurationContinuation' OR NEW.snapshot?'compatibleContinuationBasis' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  IF governed_release_compatible_basis_valid(NEW.snapshot,NEW.workspace_id,NEW.issuer_user_id,TRUE) IS DISTINCT FROM TRUE
   OR NEW.application_id::text IS DISTINCT FROM NEW.snapshot->>'applicationId' OR NEW.host_id::text IS DISTINCT FROM NEW.snapshot->>'hostId'
   OR NEW.task_id::text IS DISTINCT FROM NEW.snapshot->>'taskId' OR NEW.review_id::text IS DISTINCT FROM NEW.snapshot->>'reviewId'
   OR NEW.release_execution_id::text IS DISTINCT FROM NEW.snapshot->>'releaseExecutionId' OR NEW.releaser_agent_id::text IS DISTINCT FROM NEW.snapshot->>'releaserAgentId'
   OR NEW.releaser_credential_id::text IS DISTINCT FROM NEW.snapshot->>'releaserCredentialId' OR to_jsonb(NEW.credential_version) IS DISTINCT FROM NEW.snapshot->'credentialVersion'
   OR NEW.request_id::text IS DISTINCT FROM NEW.snapshot->>'requestId' OR NEW.manifest_digest IS DISTINCT FROM NEW.snapshot->>'manifestDigest'
   OR NEW.configuration_digest IS DISTINCT FROM NEW.snapshot->>'configurationDigest'
   OR (NEW.expires_at AT TIME ZONE 'UTC') IS DISTINCT FROM (NEW.snapshot->>'expiresAt')::timestamptz
   OR NEW.request_hash IS DISTINCT FROM governed_release_compose_queue_digest(jsonb_build_object('input',NEW.snapshot-ARRAY['readinessDigest','configurationDigest','releaseId','compatibleRecoveryProof','compatibleContinuationBasis'],'userId',NEW.issuer_user_id))
   OR EXISTS(SELECT 1 FROM governed_releases WHERE workspace_id=NEW.workspace_id AND snapshot->'compatibleConfigurationContinuation'->'closureId'=NEW.snapshot->'compatibleConfigurationContinuation'->'closureId') THEN
   RAISE EXCEPTION 'governed_release_compatible_configuration_continuation_unproven';END IF;
  RETURN NEW;
 END IF;
 IF NEW.snapshot?'compatibleArtifactRecovery' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  IF governed_release_compatible_basis_valid(NEW.snapshot,NEW.workspace_id,NEW.issuer_user_id,TRUE) IS DISTINCT FROM TRUE
   OR EXISTS(SELECT 1 FROM governed_releases r WHERE r.workspace_id=NEW.workspace_id
    AND r.snapshot->'compatibleArtifactRecovery'->'prior'->'closureId'=NEW.snapshot->'compatibleArtifactRecovery'->'prior'->'closureId'
    AND (NOT EXISTS(SELECT 1 FROM governed_release_revocations v WHERE v.release_id=r.id)
     OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=r.id))) THEN
   RAISE EXCEPTION 'governed_release_compatible_recovery_unproven';END IF;
 END IF;RETURN NEW;
END $$;

-- The same progression/artifact/post-observation guard selects only the typed seven-step sequence.
CREATE OR REPLACE FUNCTION governed_release_compatible_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;ops TEXT[]:=ARRAY['push','pr','review','merge','deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'];
 count_ops INTEGER;observed JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 IF r.snapshot?'compatibleArtifactRecovery' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
  IF r.snapshot?'compatibleConfigurationContinuation' OR r.snapshot?'compatibleContinuationBasis' THEN
   ops:=ARRAY['deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'];
   IF NEW.sequence IS DISTINCT FROM (SELECT count(*)+1 FROM governed_release_operations WHERE release_id=r.id) OR NEW.workspace_id IS DISTINCT FROM r.workspace_id OR NEW.application_id IS DISTINCT FROM r.application_id THEN RAISE EXCEPTION 'governed_release_compatible_progression_frozen';END IF;
  END IF;
  SELECT count(*) INTO count_ops FROM governed_release_operations WHERE release_id=r.id;
  IF governed_release_compatible_basis_valid(r.snapshot,r.workspace_id,r.issuer_user_id,FALSE) IS DISTINCT FROM TRUE
   OR count_ops>=cardinality(ops) OR NEW.operation IS DISTINCT FROM ops[count_ops+1]
   OR NEW.intent->>'operation' IS DISTINCT FROM NEW.operation OR NEW.intent->>'commit' IS DISTINCT FROM r.snapshot->>'commit'
   OR NEW.intent->>'baseCommit' IS DISTINCT FROM r.snapshot->>'baseCommit' OR NEW.intent->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
   OR EXISTS(SELECT 1 FROM governed_release_operations o LEFT JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)x ON TRUE
    WHERE o.release_id=r.id AND COALESCE(CASE WHEN x.status='reconciled' THEN x.reconciled_status ELSE x.status END,'unresolved')<>'succeeded') THEN
   RAISE EXCEPTION 'governed_release_compatible_progression_frozen';END IF;
  observed:=NEW.intent->'observed';
  IF observed->'commit' IS DISTINCT FROM r.snapshot->'commit' OR observed->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
   OR observed->'baseCommit' IS DISTINCT FROM (CASE WHEN NOT(r.snapshot?'compatibleConfigurationContinuation' OR r.snapshot?'compatibleContinuationBasis') AND count_ops<4 THEN r.snapshot->'compatibleArtifactRecovery'->'publication'->'baseCommit' ELSE r.snapshot->'commit' END)
   OR observed->'baseTree' IS DISTINCT FROM (CASE WHEN NOT(r.snapshot?'compatibleConfigurationContinuation' OR r.snapshot?'compatibleContinuationBasis') AND count_ops<4 THEN r.snapshot->'compatibleArtifactRecovery'->'publication'->'baseTree' ELSE r.snapshot->'candidateTree' END)
   OR NEW.operation='observe' AND NEW.intent->'parameters'->>'mode' IS DISTINCT FROM 'candidate' THEN RAISE EXCEPTION 'governed_release_compatible_git_or_phase_changed';END IF;
  IF NEW.operation IN ('smoke','fixture_cleanup','runtime_resume') AND NEW.intent->'parameters'->>'postObservationDigest'
   IS DISTINCT FROM governed_release_compose_queue_digest(r.snapshot->'manifest'->'postObservation') THEN
   RAISE EXCEPTION 'governed_release_compatible_fixture_scope_changed';END IF;
  IF NEW.operation IN ('deploy_config','deploy') AND (NEW.intent->'parameters'->'commit' IS DISTINCT FROM r.snapshot->'commit'
   OR NEW.intent->'parameters'->'artifactSetDigest' IS DISTINCT FROM r.snapshot->'compatibleArtifactRecovery'->'replacement'->'artifactSetDigest'
   OR NEW.intent->'parameters'->'configDigest' IS DISTINCT FROM r.snapshot->'compatibleArtifactRecovery'->'replacement'->'configurationDigest'
   OR NEW.intent->'parameters'->'schemaDigest' IS DISTINCT FROM r.snapshot->'compatibleArtifactRecovery'->'replacement'->'schemaDigest'
   OR NEW.operation='deploy' AND NEW.intent->'parameters'->'targetId' IS DISTINCT FROM r.snapshot->'manifest'->'deployment'->'targetId') THEN
   RAISE EXCEPTION 'governed_release_compatible_artifact_changed';END IF;
 END IF;RETURN NEW;
END $$;

COMMIT;
