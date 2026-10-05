BEGIN;
-- Forward-only contract parity. No business data, historical proofs, applied
-- migrations, key lifecycle or existing authorization rules are rewritten.
CREATE FUNCTION governed_release_compose_queue_digest(value JSONB) RETURNS TEXT
 LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT encode(sha256(convert_to(governed_release_canonical_json(value),'UTF8')),'hex')
$$;

CREATE FUNCTION governed_release_compose_queue_config_digest(value JSONB) RETURNS TEXT
 LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT governed_release_compose_queue_digest(jsonb_set(value-'gitCommit','{services}',
  (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(value->'services') v)))
$$;

CREATE FUNCTION governed_release_compose_queue_absence_valid(s JSONB,e JSONB,op JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;r JSONB:=e->'composeRecovery';
 rollback BOOLEAN:=op->>'operation'='rollback';config JSONB;projected JSONB;projected_e JSONB;
BEGIN
 IF m->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2' OR m->>'purpose' IS DISTINCT FROM 'application_release'
  OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' OR m->'cleanup'->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_array_length(m->'deployment'->'targets') IS DISTINCT FROM 1 OR COALESCE(op->>'operation','') NOT IN ('deploy','rollback')
  OR jsonb_typeof(e) IS DISTINCT FROM 'object' OR jsonb_typeof(r) IS DISTINCT FROM 'object'
  OR NOT(r?&ARRAY['schemaVersion','kind','releaseId','operationId','since','targetId','phase','requestedCommit','requestedTree','deploymentId','queue','configuration','baselineCommit','baselineTree','migrationSchemaVerified','controlPlaneQuiescent','baselineServices','services'])
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(r) k WHERE k NOT IN ('schemaVersion','kind','releaseId','operationId','since','targetId','phase','requestedCommit','requestedTree','deploymentId','queue','configuration','baselineCommit','baselineTree','migrationSchemaVerified','controlPlaneQuiescent','baselineServices','services'))
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(e) k WHERE k NOT IN ('composeRecovery','deploymentIds','deployedCommit','deployedTree','artifactSetDigest','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','deployedSetDigest','absenceVerified'))
  OR r->>'schemaVersion' IS DISTINCT FROM 'roost-compose-recovery-observation-v1' OR r->>'kind' IS DISTINCT FROM 'queue_absent'
  OR r->>'releaseId' IS DISTINCT FROM s->>'releaseId' OR r->>'operationId' IS DISTINCT FROM op->>'id'
  OR r->>'targetId' IS DISTINCT FROM t->>'targetId' OR op->'intent'->'parameters'->>'targetId' IS DISTINCT FROM t->>'targetId'
  OR r->>'phase' IS DISTINCT FROM (CASE WHEN rollback THEN 'rollback' ELSE 'candidate' END)
  OR r->>'requestedCommit' IS DISTINCT FROM (CASE WHEN rollback THEN m->'rollback'->>'commit' ELSE s->>'commit' END)
  OR r->>'requestedTree' IS DISTINCT FROM (CASE WHEN rollback THEN s->>'baseTree' ELSE s->>'candidateTree' END)
  OR r->'queue' IS DISTINCT FROM 'null'::jsonb OR e->'absenceVerified' IS DISTINCT FROM 'true'::jsonb OR e->'deploymentIds' IS DISTINCT FROM '[]'::jsonb
  OR (r->>'since')::timestamptz IS DISTINCT FROM COALESCE(op->>'createdAt',op->>'created_at')::timestamptz
  OR r->>'deploymentId' IS DISTINCT FROM 'r'||left(governed_release_compose_queue_digest(jsonb_build_array(s->'releaseId',op->'id',t->'targetId',CASE WHEN rollback THEN 'rollback' ELSE 'candidate' END)),23)
  OR r->>'baselineCommit' IS DISTINCT FROM t->'baseline'->>'commit' OR r->>'baselineTree' IS DISTINCT FROM t->'baseline'->>'tree'
  OR r->'migrationSchemaVerified' IS DISTINCT FROM 'true'::jsonb OR r->'controlPlaneQuiescent' IS DISTINCT FROM 'true'::jsonb
  OR e->>'configDigest' IS DISTINCT FROM (CASE WHEN rollback THEN m->'rollback'->>'configDigest' ELSE m->'deployment'->>'configDigest' END)
  THEN RETURN FALSE; END IF;
 config:=CASE WHEN rollback THEN t->'rollbackConfiguration' ELSE t->'configuration' END;
 IF r->'configuration' IS DISTINCT FROM config OR config->>'gitCommit' IS DISTINCT FROM r->>'requestedCommit'
  OR governed_release_compose_queue_config_digest(config) IS DISTINCT FROM (CASE WHEN rollback THEN t->>'rollbackConfigDigest' ELSE t->>'configDigest' END)
  THEN RETURN FALSE; END IF;
 -- Reuse the unchanged retained-runtime qualifier only after proving the real
 -- current controller and both no-dispatch identities. This pure projection is
 -- never written back and never claims that configuration stayed unchanged.
 projected:=(r-ARRAY['kind','phase','deploymentId','queue'])||jsonb_build_object('schemaVersion','roost-compose-config-absence-v1',
  'configuration',t->'baseline'->'configuration','requestedCommit',s->'commit','requestedTree',s->'candidateTree','noCandidateQueue',TRUE);
 projected_e:=(e-'composeRecovery')||jsonb_build_object('composeConfigAbsence',projected,'configDigest',m->'baseline'->'configDigest');
 RETURN governed_release_compose_config_absence_valid(s,projected_e,op||jsonb_build_object('operation','deploy_config')) IS NOT DISTINCT FROM TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

CREATE FUNCTION governed_release_compose_queue_absence_git(target_release UUID,operation_id UUID,e JSONB,visited UUID[] DEFAULT ARRAY[]::UUID[])
 RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;parent governed_releases;c governed_release_failed_closures;s JSONB;m JSONB;ops JSONB;suffix JSONB;git JSONB;prior JSONB;basis JSONB;
 op JSONB;x JSONB;p JSONB;expected JSONB;offset_count INT;i INT;prnum TEXT;k TEXT;
BEGIN
 IF target_release=ANY(visited) OR cardinality(visited)>=16 THEN RETURN NULL; END IF;
 SELECT * INTO r FROM governed_releases WHERE id=target_release;s:=r.snapshot;m:=s->'manifest';
 IF r.id IS NULL OR s?'predecessor' OR s?'successorBasis' OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' THEN RETURN NULL; END IF;
 SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('outcome',(SELECT to_jsonb(z) FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY sequence DESC LIMIT 1)) ORDER BY o.sequence)
  INTO ops FROM governed_release_operations o WHERE o.release_id=r.id;
 IF s?'baselineRestart' OR s?'publishedGitBasis' THEN
  IF NOT(s?'baselineRestart') OR NOT(s?'publishedGitBasis') OR jsonb_array_length(ops) IS DISTINCT FROM 4 THEN RETURN NULL; END IF;
  offset_count:=0;
  SELECT * INTO parent FROM governed_releases WHERE id=(s->'baselineRestart'->>'releaseId')::uuid;
  SELECT * INTO c FROM governed_release_failed_closures WHERE id=(s->'baselineRestart'->>'closureId')::uuid AND release_id=parent.id;
  IF parent.id IS NULL OR c.id IS NULL OR parent.workspace_id IS DISTINCT FROM r.workspace_id OR parent.application_id IS DISTINCT FROM r.application_id
   OR parent.host_id IS DISTINCT FROM r.host_id OR parent.id=ANY(visited||r.id) THEN RETURN NULL; END IF;
  IF c.snapshot->'evidence'?'composeConfigAbsence' THEN
   prior:=governed_release_compose_absence_lineage(parent.id,c.failed_operation_id,c.snapshot->'evidence',visited||r.id);
  ELSIF c.snapshot->'absenceRevalidation'->>'schemaVersion'='roost-compose-queue-absence-closure-revalidation-v1' THEN
   prior:=governed_release_compose_queue_absence_git(parent.id,c.failed_operation_id,c.snapshot->'evidence',visited||r.id);
  ELSE RETURN NULL; END IF;
  IF prior IS NULL THEN RETURN NULL; END IF;
  basis:=governed_release_published_git_basis(parent.id,s-'publishedGitBasis'-'readinessDigest'-'configurationDigest');
  IF basis IS NULL OR basis IS DISTINCT FROM s->'publishedGitBasis' THEN RETURN NULL; END IF;
  git:=jsonb_build_array(prior->0,prior->1,prior->2,prior->3);
 ELSE
  offset_count:=4;
  IF jsonb_array_length(ops) IS DISTINCT FROM 8 THEN RETURN NULL; END IF;
  git:=jsonb_build_array(ops->0,ops->1,ops->2,ops->3);
  IF (SELECT string_agg(v->>'operation',',' ORDER BY ord) FROM jsonb_array_elements(git) WITH ORDINALITY rows(v,ord)) IS DISTINCT FROM 'push,pr,review,merge' THEN RETURN NULL; END IF;
  FOR i IN 0..3 LOOP
   op:=git->i;x:=op->'outcome';p:=x->'evidence';
   IF COALESCE(CASE WHEN x->>'status'='reconciled' THEN x->>'reconciled_status' ELSE x->>'status' END,'')<>'succeeded'
    OR p->>'remoteCommit' IS DISTINCT FROM s->>'commit' OR p->>'remoteTree' IS DISTINCT FROM s->>'candidateTree' THEN RETURN NULL; END IF;
   IF i>0 THEN
    IF p->>'prHeadCommit' IS DISTINCT FROM s->>'commit' OR COALESCE((p->>'pullRequestNumber')::int,0)<=0 THEN RETURN NULL; END IF;
    IF i=1 THEN prnum:=p->>'pullRequestNumber';ELSIF p->>'pullRequestNumber' IS DISTINCT FROM prnum THEN RETURN NULL; END IF;
   END IF;
   IF i=2 AND p->'reviewApproved' IS DISTINCT FROM 'true'::jsonb OR i=3 AND (p->'prMerged' IS DISTINCT FROM 'true'::jsonb OR p->>'mergedCommit' IS DISTINCT FROM s->>'commit') THEN RETURN NULL; END IF;
  END LOOP;
 END IF;
 suffix:=jsonb_build_array(ops->offset_count,ops->(offset_count+1),ops->(offset_count+2),ops->(offset_count+3));
 IF (SELECT string_agg(v->>'operation',',' ORDER BY ord) FROM jsonb_array_elements(suffix) WITH ORDINALITY rows(v,ord)) IS DISTINCT FROM 'deploy_config,deploy,rollback_config,rollback'
  OR suffix->3->>'id' IS DISTINCT FROM operation_id::text OR suffix->3->'outcome'->'evidence' IS DISTINCT FROM e THEN RETURN NULL; END IF;
 FOR i IN 0..3 LOOP
  op:=suffix->i;x:=op->'outcome';p:=op->'intent'->'parameters';expected:=CASE WHEN i<2 THEN m->'deployment' ELSE m->'rollback' END;
  IF (op->>'sequence')::int IS DISTINCT FROM offset_count+i+1 OR op->'intent'->>'operation' IS DISTINCT FROM op->>'operation'
   OR op->'intent'->>'manifestDigest' IS DISTINCT FROM s->>'manifestDigest' OR op->'intent'->>'commit' IS DISTINCT FROM s->>'commit'
   OR op->'intent'->>'baseCommit' IS DISTINCT FROM s->>'baseCommit'
   OR op->'intent'->'observed'->>'commit' IS DISTINCT FROM s->>'commit'
   OR op->'intent'->'observed'->>'manifestDigest' IS DISTINCT FROM s->>'manifestDigest'
   OR op->'intent'->'observed'->>'baseCommit' IS DISTINCT FROM s->>'commit' OR op->'intent'->'observed'->>'baseTree' IS DISTINCT FROM s->>'candidateTree'
   OR p->>'commit' IS DISTINCT FROM (CASE WHEN i<2 THEN s->>'commit' ELSE m->'rollback'->>'commit' END)
   OR p->>'configDigest' IS DISTINCT FROM expected->>'configDigest' OR p->>'artifactSetDigest' IS DISTINCT FROM expected->>'artifactSetDigest'
   OR p->>'schemaDigest' IS DISTINCT FROM expected->>'schemaDigest' THEN RETURN NULL; END IF;
  IF i IN (0,2) THEN
   IF x->>'status' IS DISTINCT FROM 'succeeded' OR x->'observation_only' IS DISTINCT FROM 'false'::jsonb
    OR x->'evidence'->>'deployedCommit' IS DISTINCT FROM p->>'commit' OR x->'evidence'->>'configDigest' IS DISTINCT FROM expected->>'configDigest'
    OR x->'evidence'->>'artifactSetDigest' IS DISTINCT FROM expected->>'artifactSetDigest' OR x->'evidence'->>'schemaDigest' IS DISTINCT FROM expected->>'schemaDigest' THEN RETURN NULL; END IF;
  ELSE
   IF x->>'status' IS DISTINCT FROM 'reconciled' OR x->>'reconciled_status' IS DISTINCT FROM 'failed' OR x->'observation_only' IS DISTINCT FROM 'true'::jsonb
    OR governed_release_compose_queue_absence_valid(s||jsonb_build_object('releaseId',r.id::text),x->'evidence',op) IS DISTINCT FROM TRUE THEN RETURN NULL; END IF;
  END IF;
 END LOOP;
 RETURN git||suffix;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

ALTER FUNCTION governed_release_failed_baseline_proven(UUID,UUID,JSONB) RENAME TO governed_release_failed_baseline_pre_queue_absence_v1;
CREATE FUNCTION governed_release_failed_baseline_proven(target_release UUID,failed_operation UUID,e JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF e->'composeRecovery'->>'kind'='queue_absent' THEN RETURN governed_release_compose_queue_absence_git(target_release,failed_operation,e) IS NOT NULL; END IF;
 RETURN governed_release_failed_baseline_pre_queue_absence_v1(target_release,failed_operation,e);
END $$;

CREATE FUNCTION governed_release_compose_queue_reads_valid(s JSONB,v JSONB,active_count INT,fresh BOOLEAN DEFAULT TRUE)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;expected JSONB;k TEXT;
 keys TEXT[]:=ARRAY['legacy','health','inventory','fingerprint','capacity','maintenance','queue','protectedImages','backup'];
 parity TEXT[]:=ARRAY['configurationParity','serviceIdentityParity','schemaDataSequenceCatalogParity','protectedImagesPresent','fixtureAbsent','noUnownedChanges','controlPlaneQuiescent','noCandidateQueue','normalCatalogComplete','priorReleaseClosed','databaseReadOnly','cadencesHeld','ingressOpen','workerStopped','writerLockAbsent','capacityQualified','backupPhysicalCopyVerified'];
 zeroes TEXT[]:=ARRAY['candidateQueueCount','activeQueueCount','activeOtherSessions','ownedTransactions','apiWrites','modelCalls','businessWrites','providerCalls'];
BEGIN
 IF jsonb_typeof(v) IS DISTINCT FROM 'object' OR v->>'schemaVersion' IS DISTINCT FROM 'roost-release-baseline-revalidation-v1'
  OR v->>'source' IS DISTINCT FROM 'root_actual_readonly_baseline_parity' OR v->'activeApplicationReleaseCount' IS DISTINCT FROM to_jsonb(active_count)
  OR v->'baseline' IS DISTINCT FROM (m->'baseline')-'observedAt' OR s->>'baseCommit' IS DISTINCT FROM m->'baseline'->>'commit'
  OR s->>'baseTree' IS DISTINCT FROM t->'baseline'->>'tree' OR s->>'manifestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(m)
  OR v->>'revalidationDigest' IS DISTINCT FROM governed_release_compose_queue_digest(v-'revalidationDigest')
  OR COALESCE(v->>'receiptDigest','')!~'^[a-f0-9]{64}$' OR jsonb_typeof(v->'actualReadTimes') IS DISTINCT FROM 'object'
  OR jsonb_typeof(v->'actualReadDigests') IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(v->'actualReadTimes'))<>9
  OR (SELECT count(*) FROM jsonb_object_keys(v->'actualReadDigests'))<>9 OR (v->>'observedAt')::timestamptz IS NULL THEN RETURN FALSE; END IF;
 expected:=jsonb_build_object('applicationId',s->'applicationId','hostId',s->'hostId','targetId',t->'targetId','commit',s->'commit','candidateTree',s->'candidateTree','baseCommit',s->'baseCommit','baseTree',s->'baseTree',
  'manifestDigest',governed_release_compose_queue_digest(m),'baselineDigest',governed_release_compose_queue_digest((m->'baseline')-'observedAt'),
  'targetBaselineDigest',governed_release_compose_queue_digest(t->'baseline'),'protectedResourcesDigest',governed_release_compose_queue_digest(m->'cleanup'->'protectedResourceIds'),
  'rollbackDigest',governed_release_compose_queue_digest(m->'rollback'),'backupDigest',governed_release_compose_queue_digest(m->'backup'),
  'baselineRestartDigest',governed_release_compose_queue_digest(COALESCE(s->'baselineRestart','null'::jsonb)));
 FOR k IN SELECT jsonb_object_keys(expected) LOOP IF v->k IS DISTINCT FROM expected->k THEN RETURN FALSE; END IF; END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) AS entries(entry_key) WHERE NOT(entry_key=ANY(parity||zeroes||ARRAY['schemaVersion','source','baseline','receiptDigest','revalidationDigest','observedAt','actualReadTimes','actualReadDigests','activeApplicationReleaseCount']) OR expected?entry_key)) THEN RETURN FALSE; END IF;
 IF fresh AND ((v->>'observedAt')::timestamptz>now() OR (v->>'observedAt')::timestamptz<now()-interval '5 minutes') THEN RETURN FALSE; END IF;
 FOREACH k IN ARRAY keys LOOP
  IF jsonb_typeof(v->'actualReadTimes'->k) IS DISTINCT FROM 'string' OR (v->'actualReadTimes'->>k)::timestamptz IS NULL
   OR (v->'actualReadTimes'->>k)::timestamptz>(v->>'observedAt')::timestamptz OR COALESCE(v->'actualReadDigests'->>k,'')!~'^[a-f0-9]{64}$'
   OR fresh AND ((v->'actualReadTimes'->>k)::timestamptz>now() OR (v->'actualReadTimes'->>k)::timestamptz<now()-interval '5 minutes') THEN RETURN FALSE; END IF;
 END LOOP;
 FOREACH k IN ARRAY parity LOOP IF v->k IS DISTINCT FROM 'true'::jsonb THEN RETURN FALSE; END IF; END LOOP;
 FOREACH k IN ARRAY zeroes LOOP IF v->k IS DISTINCT FROM '0'::jsonb THEN RETURN FALSE; END IF; END LOOP;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

CREATE FUNCTION governed_release_compose_queue_revalidation_valid(r governed_releases,receipt JSONB,fresh BOOLEAN DEFAULT TRUE)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE a JSONB:=receipt->'absenceRevalidation';v JSONB:=a->'baseline';n JSONB:=receipt->'nativeClosure';s JSONB:=r.snapshot;
 t JSONB:=s->'manifest'->'deployment'->'targets'->0;ops JSONB;candidate JSONB;rollback JSONB;queues JSONB;active UUID[];
BEGIN
 IF jsonb_typeof(a) IS DISTINCT FROM 'object' OR a->>'schemaVersion' IS DISTINCT FROM 'roost-compose-queue-absence-closure-revalidation-v1'
  OR NOT(a?&ARRAY['schemaVersion','releaseId','candidateOutcomeId','candidateEvidence','rollbackOutcomeId','rollbackEvidenceDigest','nativeClosureDigest','configuration','services','queues','baseline','revalidationDigest'])
  OR (SELECT count(*) FROM jsonb_object_keys(a))<>12 OR a->>'releaseId' IS DISTINCT FROM r.id::text
  OR a->>'revalidationDigest' IS DISTINCT FROM governed_release_compose_queue_digest(a-'revalidationDigest')
  OR a->>'nativeClosureDigest' IS DISTINCT FROM governed_release_compose_queue_digest(n)
  OR a->>'rollbackEvidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(receipt->'evidence')
  OR governed_release_compose_queue_reads_valid(s,v,1,fresh) IS DISTINCT FROM TRUE THEN RETURN FALSE; END IF;
 ops:=governed_release_compose_queue_absence_git(r.id,(receipt->>'failedOperationId')::uuid,receipt->'evidence');
 IF ops IS NULL THEN RETURN FALSE; END IF;candidate:=ops->5;rollback:=ops->7;
 IF a->>'candidateOutcomeId' IS DISTINCT FROM candidate->'outcome'->>'id' OR a->'candidateEvidence' IS DISTINCT FROM candidate->'outcome'->'evidence'
  OR a->>'rollbackOutcomeId' IS DISTINCT FROM rollback->'outcome'->>'id' OR receipt->>'failedOutcomeId' IS DISTINCT FROM rollback->'outcome'->>'id'
  OR a->'configuration' IS DISTINCT FROM t->'rollbackConfiguration'
  OR a->'configuration' IS DISTINCT FROM receipt->'evidence'->'composeRecovery'->'configuration'
  OR governed_release_compose_queue_config_digest(a->'configuration') IS DISTINCT FROM t->>'rollbackConfigDigest'
  OR (SELECT jsonb_agg(row_value ORDER BY row_value->>'name' COLLATE "C") FROM jsonb_array_elements(a->'services') AS rows(row_value)) IS DISTINCT FROM
     (SELECT jsonb_agg(row_value ORDER BY row_value->>'name' COLLATE "C") FROM jsonb_array_elements(receipt->'evidence'->'composeRecovery'->'services') AS rows(row_value))
  OR (SELECT jsonb_agg(row_value ORDER BY row_value->>'name' COLLATE "C") FROM jsonb_array_elements(a->'candidateEvidence'->'composeRecovery'->'services') AS rows(row_value)) IS DISTINCT FROM
     (SELECT jsonb_agg(row_value ORDER BY row_value->>'name' COLLATE "C") FROM jsonb_array_elements(receipt->'evidence'->'composeRecovery'->'services') AS rows(row_value))
  OR (SELECT jsonb_agg(row_value ORDER BY row_value->>'name' COLLATE "C") FROM jsonb_array_elements(a->'candidateEvidence'->'composeRecovery'->'baselineServices') AS rows(row_value)) IS DISTINCT FROM
     (SELECT jsonb_agg(row_value ORDER BY row_value->>'name' COLLATE "C") FROM jsonb_array_elements(receipt->'evidence'->'composeRecovery'->'baselineServices') AS rows(row_value))
  OR (v->>'observedAt')::timestamptz<GREATEST((a->'candidateEvidence'->>'observedAt')::timestamptz,(receipt->'evidence'->>'observedAt')::timestamptz)
  OR governed_release_compose_owner_native_closure(r,(receipt->>'failedOperationId')::uuid,receipt->'evidence',n) IS DISTINCT FROM TRUE
  OR jsonb_typeof(n->'controllerPid') IS DISTINCT FROM 'number' OR jsonb_typeof(n->'registeredChildCount') IS DISTINCT FROM 'number'
  OR COALESCE(n->>'controllerPid','')!~'^[1-9][0-9]*$' OR COALESCE(n->>'registeredChildCount','')!~'^[1-9][0-9]*$'
  OR (n->>'observedAt')::timestamptz<(v->>'observedAt')::timestamptz
  OR fresh AND ((n->>'observedAt')::timestamptz>now()+interval '1 minute' OR (n->>'observedAt')::timestamptz<now()-interval '5 minutes') THEN RETURN FALSE; END IF;
 queues:=jsonb_build_array(jsonb_build_object('operationId',candidate->'id','targetId',t->'targetId','deploymentId',candidate->'outcome'->'evidence'->'composeRecovery'->'deploymentId','queue','null'::jsonb),
  jsonb_build_object('operationId',rollback->'id','targetId',t->'targetId','deploymentId',rollback->'outcome'->'evidence'->'composeRecovery'->'deploymentId','queue','null'::jsonb));
 IF a->'queues' IS DISTINCT FROM queues THEN RETURN FALSE; END IF;
 IF fresh THEN
  SELECT array_agg(x.id ORDER BY x.id) INTO active FROM governed_releases x WHERE x.application_id=r.application_id
   AND ((NOT EXISTS(SELECT 1 FROM governed_release_revocations z WHERE z.release_id=x.id)
    AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN governed_release_outcomes z ON z.operation_id=o.id WHERE o.release_id=x.id AND o.operation='cleanup' AND (z.status='succeeded' OR z.status='reconciled' AND z.reconciled_status='succeeded')))
    OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=x.id AND COALESCE((SELECT z.status FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY z.sequence DESC LIMIT 1),'unresolved') IN ('unresolved','uncertain')));
  IF active IS DISTINCT FROM ARRAY[r.id] THEN RETURN FALSE; END IF;
 END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

ALTER FUNCTION governed_release_compose_absence_revalidation_valid(governed_releases,JSONB) RENAME TO governed_release_compose_absence_revalidation_pre_queue_v1;
CREATE FUNCTION governed_release_compose_absence_revalidation_valid(r governed_releases,receipt JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF receipt->'absenceRevalidation'->>'schemaVersion'='roost-compose-queue-absence-closure-revalidation-v1' THEN
  RETURN governed_release_compose_queue_revalidation_valid(r,receipt,TRUE);
 END IF;
 RETURN governed_release_compose_absence_revalidation_pre_queue_v1(r,receipt);
END $$;

CREATE FUNCTION governed_release_compose_queue_absence_closure_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;
BEGIN
 IF NEW.snapshot->'evidence'->'composeRecovery'->>'kind'='queue_absent' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
  IF governed_release_compose_queue_revalidation_valid(r,NEW.snapshot,TRUE) IS DISTINCT FROM TRUE THEN
   RAISE EXCEPTION 'governed_release_compose_queue_closure_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_queue_absence_closure_guard BEFORE INSERT ON governed_release_failed_closures
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_queue_absence_closure_guard();

CREATE FUNCTION governed_release_compose_queue_artifact_digest(s JSONB,m JSONB,phase TEXT) RETURNS TEXT
 LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE t JSONB:=m->'deployment'->'targets'->0;config JSONB;result JSONB;
BEGIN
 config:=CASE phase WHEN 'candidate' THEN t->'configuration' WHEN 'rollback' THEN t->'rollbackConfiguration' WHEN 'baseline' THEN t->'baseline'->'configuration' ELSE NULL END;
 IF config IS NULL THEN RETURN NULL; END IF;
 result:=jsonb_build_object('targetId',t->'targetId','composePath',t->'composePath',
  'commit',CASE WHEN phase='candidate' THEN s->'commit' ELSE t->'baseline'->'commit' END,
  'tree',CASE WHEN phase='candidate' THEN s->'candidateTree' ELSE t->'baseline'->'tree' END,
  'sourceDigest',CASE phase WHEN 'candidate' THEN t->'sourceDigest' WHEN 'rollback' THEN config->'sourceDigest' ELSE t->'baseline'->'sourceDigest' END,
  'configDigest',CASE phase WHEN 'candidate' THEN t->'configDigest' WHEN 'rollback' THEN t->'rollbackConfigDigest' ELSE t->'baseline'->'configDigest' END,
  'services',(SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(config->'services') v));
 IF phase<>'candidate' THEN result:=result||jsonb_build_object('images',(SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(t->'baseline'->'images') v)); END IF;
 RETURN governed_release_compose_queue_digest(jsonb_build_array(result));
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE FUNCTION governed_release_compose_queue_adoption_manifest_matches(s JSONB,candidate JSONB,a JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE previous JSONB:=s->'manifest';t JSONB:=previous->'deployment'->'targets'->0;expected JSONB:=previous;target JSONB:=t;
 config JSONB;renderer TEXT:=a->>'newRendererDigest';key TEXT;baseline_config JSONB;
BEGIN
 IF jsonb_typeof(a) IS DISTINCT FROM 'object' OR a->>'schemaVersion' IS DISTINCT FROM 'roost-compose-queue-absence-baseline-adoption-v1'
  OR NOT(a?&ARRAY['schemaVersion','releaseId','closureId','closureDigest','failedOperationId','failedOutcomeId','failedEvidenceDigest','targetId','previousManifestDigest','previousRendererDigest','newRendererDigest','previousRollbackConfigurationDigest','retainedServicesDigest'])
  OR (SELECT count(*) FROM jsonb_object_keys(a))<>13 OR previous->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose'
  OR jsonb_array_length(previous->'deployment'->'targets') IS DISTINCT FROM 1 OR COALESCE(renderer,'')!~'^[a-f0-9]{64}$'
  OR renderer IS NOT DISTINCT FROM t->'baseline'->'controllerInvariants'->>'rendererDigest'
  OR a->>'previousRendererDigest' IS DISTINCT FROM t->'baseline'->'controllerInvariants'->>'rendererDigest'
  OR a->>'previousManifestDigest' IS DISTINCT FROM s->>'manifestDigest' OR a->>'previousManifestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(previous)
  OR a->>'previousRollbackConfigurationDigest' IS DISTINCT FROM t->>'rollbackConfigDigest' OR a->>'targetId' IS DISTINCT FROM t->>'targetId'
  OR (candidate->'baseline'->>'observedAt')::timestamptz<(previous->'baseline'->>'observedAt')::timestamptz
  OR governed_release_compose_restart_manifest_matches(previous,jsonb_set(previous,'{backup}',candidate->'backup')) IS DISTINCT FROM TRUE THEN RETURN FALSE; END IF;
 FOREACH key IN ARRAY ARRAY['configuration','rollbackConfiguration'] LOOP
  config:=jsonb_set(jsonb_set(t->key,'{sourcePins,controllerRenderer}',to_jsonb(renderer)),'{controllerPolicy,rendererDigest}',to_jsonb(renderer));
  target:=jsonb_set(target,ARRAY[key],config);
 END LOOP;
 baseline_config:=jsonb_set(target->'rollbackConfiguration','{controllerPolicy,phase}','"baseline"'::jsonb);
 target:=jsonb_set(target,'{baseline,configuration}',baseline_config);
 target:=jsonb_set(target,'{baseline,sourceDigest}',baseline_config->'sourceDigest');
 target:=jsonb_set(target,'{baseline,controllerInvariants,rendererDigest}',to_jsonb(renderer));
 target:=jsonb_set(target,'{configDigest}',to_jsonb(governed_release_compose_queue_config_digest(target->'configuration')));
 target:=jsonb_set(target,'{rollbackConfigDigest}',to_jsonb(governed_release_compose_queue_config_digest(target->'rollbackConfiguration')));
 target:=jsonb_set(target,'{baseline,configDigest}',to_jsonb(governed_release_compose_queue_config_digest(baseline_config)));
 expected:=jsonb_set(expected,'{deployment,targets}',jsonb_build_array(target));
 expected:=jsonb_set(expected,'{deployment,configDigest}',to_jsonb(governed_release_compose_queue_digest(jsonb_build_array(jsonb_build_object('targetId',target->'targetId','configDigest',target->'configDigest')))));
 expected:=jsonb_set(expected,'{rollback,configDigest}',to_jsonb(governed_release_compose_queue_digest(jsonb_build_array(jsonb_build_object('targetId',target->'targetId','configDigest',target->'rollbackConfigDigest')))));
 expected:=jsonb_set(expected,'{baseline,configDigest}',to_jsonb(governed_release_compose_queue_digest(jsonb_build_array(jsonb_build_object('targetId',target->'targetId','configDigest',target->'baseline'->'configDigest')))));
 expected:=jsonb_set(expected,'{deployment,artifactSetDigest}',to_jsonb(governed_release_compose_queue_artifact_digest(s,expected,'candidate')));
 expected:=jsonb_set(expected,'{rollback,artifactSetDigest}',to_jsonb(governed_release_compose_queue_artifact_digest(s,expected,'rollback')));
 expected:=jsonb_set(expected,'{baseline,artifactSetDigest}',to_jsonb(governed_release_compose_queue_artifact_digest(s,expected,'baseline')));
 expected:=jsonb_set(expected,'{baseline,observedAt}',candidate->'baseline'->'observedAt');expected:=jsonb_set(expected,'{backup}',candidate->'backup');
 RETURN expected IS NOT DISTINCT FROM candidate;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;

ALTER FUNCTION governed_release_published_git_basis(UUID,JSONB) RENAME TO governed_release_published_git_pre_queue_absence_v1;
CREATE FUNCTION governed_release_published_git_basis(target_release UUID,candidate JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;c governed_release_failed_closures;s JSONB;a JSONB:=candidate->'baselineAdoption';ops JSONB;version TEXT;k TEXT;
BEGIN
 IF NOT(candidate?'baselineAdoption') THEN RETURN governed_release_published_git_pre_queue_absence_v1(target_release,candidate); END IF;
 SELECT * INTO r FROM governed_releases WHERE id=target_release;s:=r.snapshot;
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(candidate->'baselineRestart'->>'closureId')::uuid AND release_id=r.id;
 version:=governed_release_successor_version(r.id);
 IF r.id IS NULL OR c.id IS NULL OR candidate?'predecessor' OR candidate?'successorBasis'
  OR candidate->'baselineRestart'->>'releaseId' IS DISTINCT FROM r.id::text OR candidate->'baselineRestart'->>'expectedVersion' IS DISTINCT FROM version
  OR candidate->'baselineRestart'->>'consentDigest' IS DISTINCT FROM c.consent_digest OR c.snapshot->>'consentDigest' IS DISTINCT FROM c.consent_digest
  OR c.snapshot->>'releaseId' IS DISTINCT FROM r.id::text OR c.snapshot->>'applicationId' IS DISTINCT FROM r.application_id::text
  OR c.snapshot->>'hostId' IS DISTINCT FROM r.host_id::text OR c.snapshot->>'issuerUserId' IS DISTINCT FROM r.issuer_user_id::text
  OR NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=c.revocation_id AND release_id=r.id)
  OR c.closure_digest IS DISTINCT FROM governed_release_compose_queue_digest(c.snapshot)
  OR governed_release_compose_queue_revalidation_valid(r,c.snapshot,FALSE) IS DISTINCT FROM TRUE
  OR governed_release_compose_queue_reads_valid(candidate,candidate->'baselineRevalidation',0,FALSE) IS DISTINCT FROM TRUE
  OR governed_release_compose_queue_adoption_manifest_matches(s,candidate->'manifest',a) IS DISTINCT FROM TRUE
  OR candidate->>'manifestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(candidate->'manifest')
  OR a->>'releaseId' IS DISTINCT FROM r.id::text OR a->>'closureId' IS DISTINCT FROM c.id::text OR a->>'closureDigest' IS DISTINCT FROM c.closure_digest
  OR a->>'failedOperationId' IS DISTINCT FROM c.failed_operation_id::text OR a->>'failedOutcomeId' IS DISTINCT FROM c.failed_outcome_id::text
  OR a->>'failedEvidenceDigest' IS DISTINCT FROM c.snapshot->>'failedEvidenceDigest'
  OR a->>'failedEvidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(c.snapshot->'evidence')
  OR a->>'retainedServicesDigest' IS DISTINCT FROM governed_release_compose_queue_digest(c.snapshot->'evidence'->'composeRecovery'->'services') THEN RETURN NULL; END IF;
 FOREACH k IN ARRAY ARRAY['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId'] LOOP
  IF candidate->>k IS DISTINCT FROM s->>k THEN RETURN NULL; END IF;END LOOP;
 FOREACH k IN ARRAY ARRAY['releaseExecutionId','releaserCredentialId'] LOOP
  IF candidate->>k IS NULL OR candidate->>k IS NOT DISTINCT FROM s->>k THEN RETURN NULL; END IF;END LOOP;
 IF candidate->>'reviewId'=s->>'reviewId' AND candidate->>'materialVersion' IS DISTINCT FROM s->>'materialVersion' THEN RETURN NULL; END IF;
 ops:=governed_release_compose_queue_absence_git(r.id,c.failed_operation_id,c.snapshot->'evidence');
 IF ops IS NULL OR c.failed_outcome_id::text IS DISTINCT FROM ops->7->'outcome'->>'id' THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('schemaVersion','roost-release-published-git-v1','basisKind','compose_queue_absence',
  'composeEvidenceDigest',governed_release_compose_queue_digest(c.snapshot->'evidence'),'baselineAdoptionDigest',governed_release_compose_queue_digest(a),
  'releaseId',r.id::text,'expectedVersion',version,'closureId',c.id::text,'closureDigest',c.closure_digest,
  'pushOperationId',ops->0->>'id','prOperationId',ops->1->>'id','reviewOperationId',ops->2->>'id','mergeOperationId',ops->3->>'id','baselineDeploymentIds','[]'::jsonb);
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE FUNCTION governed_release_compose_queue_adoption_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.snapshot?'baselineAdoption' OR NEW.snapshot->'publishedGitBasis'->>'basisKind'='compose_queue_absence' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  IF governed_release_compose_queue_reads_valid(NEW.snapshot,NEW.snapshot->'baselineRevalidation',0,TRUE) IS DISTINCT FROM TRUE
   OR EXISTS(SELECT 1 FROM governed_releases x WHERE x.application_id=NEW.application_id
    AND ((NOT EXISTS(SELECT 1 FROM governed_release_revocations z WHERE z.release_id=x.id)
     AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN governed_release_outcomes z ON z.operation_id=o.id WHERE o.release_id=x.id AND o.operation='cleanup' AND (z.status='succeeded' OR z.status='reconciled' AND z.reconciled_status='succeeded')))
     OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=x.id AND COALESCE((SELECT z.status FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY z.sequence DESC LIMIT 1),'unresolved') IN ('unresolved','uncertain'))))
   THEN RAISE EXCEPTION 'governed_release_compose_queue_adoption_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_queue_adoption_insert_guard BEFORE INSERT ON governed_releases
 FOR EACH ROW EXECUTE FUNCTION governed_release_compose_queue_adoption_insert_guard();

COMMIT;
