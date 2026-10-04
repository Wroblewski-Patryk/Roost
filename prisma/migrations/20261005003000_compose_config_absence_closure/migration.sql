BEGIN;
-- Forward-only proof extension. No release/key/grant/outcome/history row changes.
-- Preserve historical GitSet functions verbatim, and dispatch Compose separately.
CREATE FUNCTION governed_release_compose_config_absence_valid(s JSONB,e JSONB,op JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;r JSONB:=e->'composeConfigAbsence';row JSONB;prior JSONB;d JSONB;img JSONB;rows JSONB;runtime_digest TEXT;config JSONB;
BEGIN
 IF m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' OR jsonb_array_length(m->'deployment'->'targets')<>1
  OR op->>'operation' IS DISTINCT FROM 'deploy_config' OR r->>'schemaVersion' IS DISTINCT FROM 'roost-compose-config-absence-v1'
  OR r->>'releaseId' IS DISTINCT FROM s->>'releaseId' OR r->>'operationId' IS DISTINCT FROM op->>'id'
  OR (r->>'since')::timestamptz IS DISTINCT FROM COALESCE(op->>'createdAt',op->>'created_at')::timestamptz
  OR r->>'targetId' IS DISTINCT FROM t->>'targetId' OR r->>'requestedCommit' IS DISTINCT FROM s->>'commit' OR r->>'requestedTree' IS DISTINCT FROM s->>'candidateTree'
  OR r->>'baselineCommit' IS DISTINCT FROM t->'baseline'->>'commit' OR r->>'baselineTree' IS DISTINCT FROM t->'baseline'->>'tree'
  OR r->'configuration' IS DISTINCT FROM t->'baseline'->'configuration'
  OR r->'migrationSchemaVerified' IS DISTINCT FROM 'true'::jsonb OR r->'controlPlaneQuiescent' IS DISTINCT FROM 'true'::jsonb OR r->'noCandidateQueue' IS DISTINCT FROM 'true'::jsonb
  OR e->>'deployedCommit' IS DISTINCT FROM t->'baseline'->>'commit' OR e->>'deployedTree' IS DISTINCT FROM t->'baseline'->>'tree'
  OR e->>'artifactSetDigest' IS DISTINCT FROM m->'baseline'->>'artifactSetDigest' OR e->>'configDigest' IS DISTINCT FROM m->'baseline'->>'configDigest'
  OR e->>'schemaDigest' IS DISTINCT FROM m->'baseline'->>'schemaDigest' OR e->>'dataDigest' IS DISTINCT FROM m->'baseline'->>'dataDigest'
  OR e->>'healthDigest' IS DISTINCT FROM m->'baseline'->>'healthDigest' OR e->'healthy' IS DISTINCT FROM 'true'::jsonb OR e->'absenceVerified' IS DISTINCT FROM 'true'::jsonb
  OR e->'deploymentIds' IS DISTINCT FROM '[]'::jsonb OR (e->>'observedAt')::timestamptz<(r->>'since')::timestamptz
  OR jsonb_typeof(r->'services') IS DISTINCT FROM 'array' OR jsonb_array_length(r->'services') NOT BETWEEN 2 AND 12
  OR jsonb_typeof(r->'baselineServices') IS DISTINCT FROM 'array' OR jsonb_array_length(r->'services')<>jsonb_array_length(r->'baselineServices')
  OR (SELECT count(DISTINCT v->>'name') FROM jsonb_array_elements(r->'services') v)<>jsonb_array_length(r->'services')
  OR (SELECT count(DISTINCT v->>'containerId') FROM jsonb_array_elements(r->'services') v)<>jsonb_array_length(r->'services')
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(e) k WHERE k NOT IN ('composeConfigAbsence','deploymentIds','deployedCommit','deployedTree','artifactSetDigest','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','deployedSetDigest','absenceVerified'))
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(r) k WHERE k NOT IN ('schemaVersion','releaseId','operationId','since','targetId','requestedCommit','requestedTree','configuration','baselineCommit','baselineTree','migrationSchemaVerified','controlPlaneQuiescent','noCandidateQueue','baselineServices','services')) THEN RETURN FALSE; END IF;
 config:=jsonb_set((r->'configuration')-'gitCommit','{services}',(SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(r->'configuration'->'services') v));
 IF encode(sha256(convert_to(governed_release_canonical_json(config),'UTF8')),'hex') IS DISTINCT FROM t->'baseline'->>'configDigest' THEN RETURN FALSE; END IF;
 IF (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(r->'services') v) IS DISTINCT FROM
    (SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") FROM jsonb_array_elements(r->'baselineServices') v) THEN RETURN FALSE; END IF;
 FOR d IN SELECT v FROM jsonb_array_elements(r->'configuration'->'services') v LOOP
  IF d->>'role'<>'migration' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r->'services') v WHERE v->>'name'=d->>'name') THEN RETURN FALSE; END IF;
 END LOOP;
 FOR row IN SELECT v FROM jsonb_array_elements(r->'services') v LOOP
  SELECT v INTO d FROM jsonb_array_elements(r->'configuration'->'services') v WHERE v->>'name'=row->>'name';
  SELECT v INTO img FROM jsonb_array_elements(t->'baseline'->'images') v WHERE v->>'name'=row->>'name';
  IF d IS NULL OR row->>'role' IS DISTINCT FROM d->>'role' OR row->>'mountDigest' IS DISTINCT FROM d->>'mountDigest'
   OR row->>'imageDigest' IS DISTINCT FROM (CASE WHEN d->>'source'='image' THEN d->>'imageDigest' ELSE img->>'imageDigest' END)
   OR COALESCE(row->>'containerId','')!~'^[a-f0-9]{64}$' OR COALESCE(row->>'mountDigest','')!~'^[a-f0-9]{64}$' OR COALESCE(row->>'imageDigest','')!~'^sha256:[a-f0-9]{64}$'
   OR row->'exitCode' IS DISTINCT FROM '0'::jsonb OR (row->>'createdAt')::timestamptz>(r->>'since')::timestamptz
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(row) k WHERE k NOT IN ('name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt','commit','tree','deploymentId')) THEN RETURN FALSE; END IF;
  IF row->>'role'='migration' THEN IF row->>'state' IS DISTINCT FROM 'exited' OR row->'health' IS DISTINCT FROM 'null'::jsonb THEN RETURN FALSE; END IF;
  ELSIF row->>'role'='cadence' THEN IF COALESCE(row->>'state','') NOT IN ('paused','created','exited') OR row->'health' IS DISTINCT FROM 'null'::jsonb THEN RETURN FALSE; END IF;
  ELSE IF row->>'state' IS DISTINCT FROM 'running' OR row->>'health' IS DISTINCT FROM 'healthy' THEN RETURN FALSE; END IF;END IF;
 END LOOP;
 SELECT jsonb_agg(jsonb_build_object('name',v->'name','role',v->'role','imageDigest',v->'imageDigest','mountDigest',v->'mountDigest')
   ||CASE WHEN v?'commit' THEN jsonb_build_object('commit',v->'commit') ELSE '{}'::jsonb END
   ||CASE WHEN v?'tree' THEN jsonb_build_object('tree',v->'tree') ELSE '{}'::jsonb END ORDER BY v->>'name' COLLATE "C") INTO rows FROM jsonb_array_elements(r->'services') v;
 runtime_digest:=encode(sha256(convert_to(governed_release_canonical_json(rows),'UTF8')),'hex');
 RETURN e->>'deployedSetDigest'=encode(sha256(convert_to(governed_release_canonical_json(jsonb_build_array(jsonb_build_object('targetId',t->'targetId','runtimeSetDigest',runtime_digest))),'UTF8')),'hex');
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE FUNCTION governed_release_compose_config_absence_git(target_release UUID,operation_id UUID,e JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;j JSONB;ops JSONB;op JSONB;x JSONB;git JSONB;prnum TEXT;idx INT:=0;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=target_release;
 IF r.id IS NULL OR r.snapshot?'predecessor' OR r.snapshot?'successorBasis' OR r.snapshot?'baselineRestart' OR r.snapshot?'publishedGitBasis' THEN RETURN NULL; END IF;
 SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('outcome',(SELECT to_jsonb(z) FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY sequence DESC LIMIT 1)) ORDER BY o.sequence) INTO ops FROM governed_release_operations o WHERE o.release_id=r.id;
 IF jsonb_array_length(ops)<>5 OR (SELECT string_agg(v->>'operation',',' ORDER BY ord) FROM jsonb_array_elements(ops) WITH ORDINALITY rows(v,ord)) IS DISTINCT FROM 'push,pr,review,merge,deploy_config' THEN RETURN NULL; END IF;
 op:=ops->4;x:=op->'outcome';
 IF op->>'id' IS DISTINCT FROM operation_id::text OR x->>'status' IS DISTINCT FROM 'reconciled' OR x->>'reconciled_status' IS DISTINCT FROM 'absent'
  OR x->'observation_only' IS DISTINCT FROM 'true'::jsonb OR x->'evidence' IS DISTINCT FROM e
  OR governed_release_compose_config_absence_valid(r.snapshot||jsonb_build_object('releaseId',r.id::text),e,op) IS DISTINCT FROM TRUE THEN RETURN NULL; END IF;
 FOR j IN SELECT v FROM jsonb_array_elements(ops) WITH ORDINALITY rows(v,ord) WHERE ord<=4 ORDER BY ord LOOP
  x:=j->'outcome';git:=x->'evidence';
  IF COALESCE(CASE WHEN x->>'status'='reconciled' THEN x->>'reconciled_status' ELSE x->>'status' END,'')<>'succeeded'
   OR git->>'remoteCommit' IS DISTINCT FROM r.snapshot->>'commit' OR git->>'remoteTree' IS DISTINCT FROM r.snapshot->>'candidateTree' THEN RETURN NULL; END IF;
  IF idx>0 THEN
   IF git->>'prHeadCommit' IS DISTINCT FROM r.snapshot->>'commit' OR COALESCE((git->>'pullRequestNumber')::int,0)<=0 THEN RETURN NULL; END IF;
   IF idx=1 THEN prnum:=git->>'pullRequestNumber';ELSIF git->>'pullRequestNumber' IS DISTINCT FROM prnum THEN RETURN NULL;END IF;
  END IF;
  IF idx=2 AND git->'reviewApproved' IS DISTINCT FROM 'true'::jsonb OR idx=3 AND (git->'prMerged' IS DISTINCT FROM 'true'::jsonb OR git->>'mergedCommit' IS DISTINCT FROM r.snapshot->>'commit') THEN RETURN NULL; END IF;
  idx:=idx+1;
 END LOOP;
 RETURN ops;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
ALTER FUNCTION governed_release_failed_baseline_proven(UUID,UUID,JSONB) RENAME TO governed_release_failed_baseline_git_set_v1;
CREATE FUNCTION governed_release_failed_baseline_proven(target_release UUID,failed_operation UUID,e JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF e?'composeConfigAbsence' THEN RETURN governed_release_compose_config_absence_git(target_release,failed_operation,e) IS NOT NULL; END IF;
 RETURN governed_release_failed_baseline_git_set_v1(target_release,failed_operation,e);
END $$;
CREATE FUNCTION governed_release_compose_owner_native_closure(r governed_releases,op UUID,e JSONB,n JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 RETURN n->>'schemaVersion'='roost-release-owner-native-closure-v1' AND n->>'releaseId'=r.id::text AND n->>'operationId'=op::text AND n->>'agentHostId'=r.host_id::text
  AND n->>'evidenceDigest'=encode(sha256(convert_to(governed_release_canonical_json(e),'UTF8')),'hex') AND n->>'checkpointDigest'~'^[a-f0-9]{64}$'
  AND (n->>'controllerPid')::bigint>0 AND (n->>'registeredChildCount')::bigint>0 AND n->'allChildrenClosed'='true'::jsonb AND n->'nativeProcessesAbsent'='true'::jsonb AND n->'writerAbsent'='true'::jsonb
  AND (n->>'observedAt')::timestamptz>=(e->>'observedAt')::timestamptz
  AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(n) k WHERE k NOT IN ('schemaVersion','releaseId','operationId','agentHostId','evidenceDigest','checkpointDigest','controllerPid','registeredChildCount','allChildrenClosed','nativeProcessesAbsent','writerAbsent','observedAt'));
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE FUNCTION governed_release_compose_absence_closure_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;n JSONB;
BEGIN
 IF NEW.snapshot->'evidence'?'composeConfigAbsence' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;n:=NEW.snapshot->'nativeClosure';
  IF governed_release_compose_owner_native_closure(r,NEW.failed_operation_id,NEW.snapshot->'evidence',n) IS DISTINCT FROM TRUE
   OR (n->>'observedAt')::timestamptz>now()+interval '1 minute' OR (n->>'observedAt')::timestamptz<now()-interval '5 minutes'
   THEN RAISE EXCEPTION 'governed_release_compose_native_closure_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_absence_closure_guard BEFORE INSERT ON governed_release_failed_closures FOR EACH ROW EXECUTE FUNCTION governed_release_compose_absence_closure_guard();
ALTER FUNCTION governed_release_published_git_basis(UUID,JSONB) RENAME TO governed_release_published_git_set_v1;
CREATE FUNCTION governed_release_published_git_basis(target_release UUID,candidate JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;c governed_release_failed_closures;s JSONB;ops JSONB;version TEXT;key TEXT;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=target_release;s:=r.snapshot;
 IF s->'manifest'->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' THEN RETURN governed_release_published_git_set_v1(target_release,candidate); END IF;
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(candidate->'baselineRestart'->>'closureId')::uuid AND release_id=r.id;
 version:=governed_release_successor_version(r.id);
 IF c.id IS NULL OR candidate?'predecessor' OR candidate?'successorBasis'
  OR candidate->'baselineRestart'->>'releaseId' IS DISTINCT FROM r.id::text OR candidate->'baselineRestart'->>'expectedVersion' IS DISTINCT FROM version OR candidate->'baselineRestart'->>'consentDigest' IS DISTINCT FROM c.consent_digest
  OR NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=c.revocation_id AND release_id=r.id)
  OR c.closure_digest IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(c.snapshot),'UTF8')),'hex')
  OR governed_release_compose_owner_native_closure(r,c.failed_operation_id,c.snapshot->'evidence',c.snapshot->'nativeClosure') IS DISTINCT FROM TRUE
  OR (s->'manifest')#-'{baseline,observedAt}' IS DISTINCT FROM (candidate->'manifest')#-'{baseline,observedAt}' THEN RETURN NULL; END IF;
 FOREACH key IN ARRAY ARRAY['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId'] LOOP
  IF candidate->>key IS DISTINCT FROM s->>key THEN RETURN NULL; END IF;END LOOP;
 FOREACH key IN ARRAY ARRAY['reviewId','releaseExecutionId','releaserCredentialId'] LOOP
  IF candidate->>key IS NULL OR candidate->>key IS NOT DISTINCT FROM s->>key THEN RETURN NULL; END IF;END LOOP;
 ops:=governed_release_compose_config_absence_git(r.id,c.failed_operation_id,c.snapshot->'evidence');IF ops IS NULL OR c.failed_outcome_id::text IS DISTINCT FROM ops->4->'outcome'->>'id' THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('schemaVersion','roost-release-published-git-v1','basisKind','compose_config_absence','composeEvidenceDigest',encode(sha256(convert_to(governed_release_canonical_json(c.snapshot->'evidence'),'UTF8')),'hex'),
  'releaseId',r.id::text,'expectedVersion',version,'closureId',c.id::text,'closureDigest',c.closure_digest,'pushOperationId',ops->0->>'id','prOperationId',ops->1->>'id','reviewOperationId',ops->2->>'id','mergeOperationId',ops->3->>'id','baselineDeploymentIds','[]'::jsonb);
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
CREATE FUNCTION governed_release_compose_config_absence_outcome_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;op governed_release_operations;
BEGIN
 IF NEW.evidence?'composeConfigAbsence' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;SELECT * INTO op FROM governed_release_operations WHERE id=NEW.operation_id;
  IF NEW.status IS DISTINCT FROM 'reconciled' OR NEW.reconciled_status IS DISTINCT FROM 'absent' OR NOT NEW.observation_only
   OR governed_release_compose_config_absence_valid(r.snapshot||jsonb_build_object('releaseId',r.id::text),NEW.evidence,to_jsonb(op)) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'governed_release_compose_config_absence_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compose_config_absence_outcome_guard BEFORE INSERT ON governed_release_outcomes FOR EACH ROW EXECUTE FUNCTION governed_release_compose_config_absence_outcome_guard();
COMMIT;
