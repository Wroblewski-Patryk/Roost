BEGIN;
-- Forward-only recovery for an actual restarted Compose configuration absence.
-- No historical rows, application data, applied migrations or credentials change.
ALTER FUNCTION governed_release_compose_config_absence_git(UUID,UUID,JSONB)
 RENAME TO governed_release_compose_config_absence_initial_v1;

CREATE FUNCTION governed_release_compose_absence_lineage(target_release UUID,operation_id UUID,e JSONB,visited UUID[])
 RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;parent governed_releases;c governed_release_failed_closures;s JSONB;ops JSONB;op JSONB;x JSONB;prior JSONB;basis JSONB;
BEGIN
 IF target_release=ANY(visited) OR cardinality(visited)>=16 THEN RETURN NULL; END IF;
 SELECT * INTO r FROM governed_releases WHERE id=target_release;s:=r.snapshot;
 IF r.id IS NULL OR s?'predecessor' OR s?'successorBasis' THEN RETURN NULL; END IF;
 IF NOT(s?'baselineRestart') AND NOT(s?'publishedGitBasis') THEN
  RETURN governed_release_compose_config_absence_initial_v1(target_release,operation_id,e);
 END IF;
 IF NOT(s?'baselineRestart') OR NOT(s?'publishedGitBasis') OR s->'manifest'->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' THEN RETURN NULL; END IF;
 SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('outcome',(SELECT to_jsonb(z) FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY sequence DESC LIMIT 1)) ORDER BY o.sequence)
  INTO ops FROM governed_release_operations o WHERE o.release_id=r.id;
 IF jsonb_array_length(ops) IS DISTINCT FROM 1 THEN RETURN NULL; END IF;
 op:=ops->0;x:=op->'outcome';
 IF op->>'operation' IS DISTINCT FROM 'deploy_config' OR op->>'id' IS DISTINCT FROM operation_id::text
  OR x->>'status' IS DISTINCT FROM 'reconciled' OR x->>'reconciled_status' IS DISTINCT FROM 'absent'
  OR x->'observation_only' IS DISTINCT FROM 'true'::jsonb OR x->'evidence' IS DISTINCT FROM e
  OR governed_release_compose_config_absence_valid(s||jsonb_build_object('releaseId',r.id::text),e,op) IS DISTINCT FROM TRUE THEN RETURN NULL; END IF;
 SELECT * INTO parent FROM governed_releases WHERE id=(s->'baselineRestart'->>'releaseId')::uuid;
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(s->'baselineRestart'->>'closureId')::uuid AND release_id=parent.id;
 IF parent.id IS NULL OR c.id IS NULL OR parent.workspace_id IS DISTINCT FROM r.workspace_id OR parent.application_id IS DISTINCT FROM r.application_id
  OR parent.host_id IS DISTINCT FROM r.host_id OR parent.id=ANY(visited||r.id) THEN RETURN NULL; END IF;
 prior:=governed_release_compose_absence_lineage(parent.id,c.failed_operation_id,c.snapshot->'evidence',visited||r.id);
 IF prior IS NULL THEN RETURN NULL; END IF;
 -- Rebuild the admitted basis from durable parent closure/history, rather than
 -- trusting plausible UUIDs inside the child snapshot.
 basis:=governed_release_published_git_basis(parent.id,s-'publishedGitBasis'-'readinessDigest'-'configurationDigest');
 IF basis IS NULL OR basis IS DISTINCT FROM s->'publishedGitBasis' THEN RETURN NULL; END IF;
 RETURN jsonb_build_array(prior->0,prior->1,prior->2,prior->3,op);
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
CREATE FUNCTION governed_release_compose_config_absence_git(target_release UUID,operation_id UUID,e JSONB)
 RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN RETURN governed_release_compose_absence_lineage(target_release,operation_id,e,ARRAY[]::UUID[]); END $$;

CREATE FUNCTION governed_release_compose_absence_revalidation_valid(r governed_releases,receipt JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE a JSONB:=receipt->'absenceRevalidation';v JSONB:=a->'baseline';s JSONB:=r.snapshot;m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;k TEXT;expected JSONB;active UUID[];
 keys TEXT[]:=ARRAY['legacy','health','inventory','fingerprint','capacity','maintenance','queue','protectedImages','backup'];
 parity TEXT[]:=ARRAY['configurationParity','serviceIdentityParity','schemaDataSequenceCatalogParity','protectedImagesPresent','fixtureAbsent','noUnownedChanges','controlPlaneQuiescent','noCandidateQueue','normalCatalogComplete','priorReleaseClosed','databaseReadOnly','cadencesHeld','ingressOpen','workerStopped','writerLockAbsent','capacityQualified','backupPhysicalCopyVerified'];
 zeroes TEXT[]:=ARRAY['candidateQueueCount','activeQueueCount','activeOtherSessions','ownedTransactions','apiWrites','modelCalls','businessWrites','providerCalls'];
BEGIN
 IF jsonb_typeof(a) IS DISTINCT FROM 'object' OR a->>'releaseId' IS DISTINCT FROM r.id::text
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(a) x WHERE x NOT IN ('releaseId','evidenceDigest','baseline'))
  OR a->>'evidenceDigest' IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(receipt->'evidence'),'UTF8')),'hex')
  OR NOT(s?'baselineRestart') OR NOT(s?'publishedGitBasis') OR s?'predecessor' OR s?'successorBasis'
  OR m->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2' OR m->>'purpose' IS DISTINCT FROM 'application_release'
  OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' OR m->'cleanup'->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_array_length(m->'deployment'->'targets') IS DISTINCT FROM 1
  OR v->>'schemaVersion' IS DISTINCT FROM 'roost-release-baseline-revalidation-v1' OR v->>'source' IS DISTINCT FROM 'root_actual_readonly_baseline_parity'
  OR v->'activeApplicationReleaseCount' IS DISTINCT FROM '1'::jsonb
  OR v->'baseline' IS DISTINCT FROM (m->'baseline')-'observedAt'
  OR s->>'baseCommit' IS DISTINCT FROM m->'baseline'->>'commit' OR s->>'baseTree' IS DISTINCT FROM t->'baseline'->>'tree'
  OR v->>'revalidationDigest' IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(v-'revalidationDigest'),'UTF8')),'hex')
  OR (v->>'observedAt')::timestamptz>now() OR (v->>'observedAt')::timestamptz<now()-interval '5 minutes'
  OR (receipt->'nativeClosure'->>'observedAt')::timestamptz<(v->>'observedAt')::timestamptz THEN RETURN FALSE; END IF;
 expected:=jsonb_build_object('applicationId',s->'applicationId','hostId',s->'hostId','targetId',t->'targetId','commit',s->'commit','candidateTree',s->'candidateTree','baseCommit',s->'baseCommit','baseTree',s->'baseTree',
  'manifestDigest',encode(sha256(convert_to(governed_release_canonical_json(m),'UTF8')),'hex'),
  'baselineDigest',encode(sha256(convert_to(governed_release_canonical_json((m->'baseline')-'observedAt'),'UTF8')),'hex'),
  'targetBaselineDigest',encode(sha256(convert_to(governed_release_canonical_json(t->'baseline'),'UTF8')),'hex'),
  'protectedResourcesDigest',encode(sha256(convert_to(governed_release_canonical_json(m->'cleanup'->'protectedResourceIds'),'UTF8')),'hex'),
  'rollbackDigest',encode(sha256(convert_to(governed_release_canonical_json(m->'rollback'),'UTF8')),'hex'),
  'backupDigest',encode(sha256(convert_to(governed_release_canonical_json(m->'backup'),'UTF8')),'hex'),
  'baselineRestartDigest',encode(sha256(convert_to(governed_release_canonical_json(s->'baselineRestart'),'UTF8')),'hex'));
 FOR k IN SELECT jsonb_object_keys(expected) LOOP IF v->k IS DISTINCT FROM expected->k THEN RETURN FALSE; END IF; END LOOP;
 IF COALESCE(v->>'receiptDigest','')!~'^[a-f0-9]{64}$' OR jsonb_typeof(v->'actualReadTimes') IS DISTINCT FROM 'object'
  OR jsonb_typeof(v->'actualReadDigests') IS DISTINCT FROM 'object'
  OR (SELECT count(*) FROM jsonb_object_keys(v->'actualReadTimes'))<>9 OR (SELECT count(*) FROM jsonb_object_keys(v->'actualReadDigests'))<>9 THEN RETURN FALSE; END IF;
 FOREACH k IN ARRAY keys LOOP
  IF (v->'actualReadTimes'->>k)::timestamptz IS NULL OR (v->'actualReadTimes'->>k)::timestamptz>now()
   OR (v->'actualReadTimes'->>k)::timestamptz<now()-interval '5 minutes' OR COALESCE(v->'actualReadDigests'->>k,'')!~'^[a-f0-9]{64}$' THEN RETURN FALSE; END IF;
  IF (v->'actualReadTimes'->>k)::timestamptz>(v->>'observedAt')::timestamptz THEN RETURN FALSE; END IF;
 END LOOP;
 FOREACH k IN ARRAY parity LOOP IF v->k IS DISTINCT FROM 'true'::jsonb THEN RETURN FALSE; END IF; END LOOP;
 FOREACH k IN ARRAY zeroes LOOP IF v->k IS DISTINCT FROM '0'::jsonb THEN RETURN FALSE; END IF; END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) x WHERE NOT(x=ANY(parity||zeroes||ARRAY['schemaVersion','source','baseline','receiptDigest','revalidationDigest','observedAt','actualReadTimes','actualReadDigests','activeApplicationReleaseCount']) OR expected?x)) THEN RETURN FALSE; END IF;
 SELECT array_agg(x.id ORDER BY x.id) INTO active FROM governed_releases x WHERE x.application_id=r.application_id
  AND ((NOT EXISTS(SELECT 1 FROM governed_release_revocations z WHERE z.release_id=x.id)
   AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN governed_release_outcomes z ON z.operation_id=o.id WHERE o.release_id=x.id AND o.operation='cleanup' AND (z.status='succeeded' OR z.status='reconciled' AND z.reconciled_status='succeeded')))
   OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=x.id AND COALESCE((SELECT z.status FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY z.sequence DESC LIMIT 1),'unresolved') IN ('unresolved','uncertain')));
 RETURN active=ARRAY[r.id];
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE OR REPLACE FUNCTION governed_release_failed_closure_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;x governed_release_outcomes;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=NEW.failed_operation_id ORDER BY sequence DESC LIMIT 1;
 IF r.id IS NULL OR NEW.workspace_id IS DISTINCT FROM r.workspace_id OR NEW.issuer_user_id IS DISTINCT FROM r.issuer_user_id
  OR NEW.owner_authenticated_at>now() OR NEW.owner_authenticated_at<now()-interval '5 minutes'
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=r.workspace_id AND user_id=NEW.issuer_user_id AND role='owner')
  OR EXISTS(SELECT 1 FROM governed_release_revocations WHERE release_id=r.id)
  OR NEW.expected_version IS DISTINCT FROM governed_release_successor_version(r.id) OR NEW.failed_outcome_id IS DISTINCT FROM x.id
  OR NEW.snapshot->>'releaseId' IS DISTINCT FROM r.id::text OR NEW.snapshot->>'applicationId' IS DISTINCT FROM r.application_id::text
  OR NEW.snapshot->>'hostId' IS DISTINCT FROM r.host_id::text OR NEW.snapshot->>'issuerUserId' IS DISTINCT FROM NEW.issuer_user_id::text
  OR NEW.snapshot->>'expectedVersion' IS DISTINCT FROM NEW.expected_version OR NEW.snapshot->>'failedOperationId' IS DISTINCT FROM NEW.failed_operation_id::text
  OR NEW.snapshot->>'failedOutcomeId' IS DISTINCT FROM NEW.failed_outcome_id::text OR NEW.snapshot->>'consentDigest' IS DISTINCT FROM NEW.consent_digest
  OR (NEW.snapshot->>'ownerAuthenticatedAt')::timestamp IS DISTINCT FROM NEW.owner_authenticated_at
  OR NEW.snapshot->>'failedEvidenceDigest' IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(x.evidence),'UTF8')),'hex')
  OR NEW.closure_digest IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(NEW.snapshot),'UTF8')),'hex')
  OR (NEW.snapshot->'evidence'->>'observedAt')::timestamp>now()+interval '1 minute'
  OR NEW.snapshot?'absenceRevalidation' AND governed_release_compose_absence_revalidation_valid(r,NEW.snapshot) IS DISTINCT FROM TRUE
  OR (NEW.snapshot->'evidence'->>'observedAt')::timestamp<now()-interval '5 minutes' AND governed_release_compose_absence_revalidation_valid(r,NEW.snapshot) IS DISTINCT FROM TRUE
  OR NOT governed_release_failed_baseline_proven(r.id,NEW.failed_operation_id,NEW.snapshot->'evidence') THEN RAISE EXCEPTION 'governed_release_failed_closure_invalid'; END IF;
 RETURN NEW;
END $$;
COMMIT;
