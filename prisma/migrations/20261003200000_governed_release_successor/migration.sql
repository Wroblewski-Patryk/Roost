BEGIN;
-- Additive proof for one same-commit redeployment after a completed retained
-- rollback. Existing grants, outcomes and guards are neither edited nor removed.
CREATE FUNCTION governed_release_canonical_json(value JSONB) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE result TEXT;
BEGIN
 CASE jsonb_typeof(value)
  WHEN 'object' THEN SELECT '{'||COALESCE(string_agg(to_jsonb(key)::text||':'||governed_release_canonical_json(v),',' ORDER BY key COLLATE "C"),'')||'}'
   INTO result FROM jsonb_each(value) AS entries(key,v);
  WHEN 'array' THEN SELECT '['||COALESCE(string_agg(governed_release_canonical_json(v),',' ORDER BY ordinal),'')||']'
   INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS entries(v,ordinal);
  ELSE result:=value::text;
 END CASE;
 RETURN result;
END $$;
CREATE FUNCTION governed_release_successor_version(target_release UUID) RETURNS TEXT
LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases; grant_record JSONB;journal JSONB;revocations JSONB;renewals JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=target_release;
 IF r.id IS NULL THEN RETURN NULL; END IF;
 grant_record:=to_jsonb(r)||jsonb_build_object('expires_at',to_char(r.expires_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'created_at',to_char(r.created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
 SELECT COALESCE(jsonb_agg(to_jsonb(o)||jsonb_build_object('created_at',to_char(o.created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'outcome',(SELECT to_jsonb(x) FROM governed_release_outcomes x WHERE x.operation_id=o.id ORDER BY x.sequence DESC LIMIT 1)) ORDER BY o.sequence),'[]'::jsonb)
  INTO journal FROM governed_release_operations o WHERE o.release_id=target_release;
 SELECT COALESCE(jsonb_agg(to_jsonb(v)||jsonb_build_object('created_at',to_char(v.created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ORDER BY v.created_at,v.id),'[]'::jsonb)
  INTO revocations FROM governed_release_revocations v WHERE v.release_id=target_release;
 SELECT COALESCE(jsonb_agg(to_jsonb(v)||jsonb_build_object('created_at',to_char(v.created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'owner_authenticated_at',to_char(v.owner_authenticated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'previous_expires_at',to_char(v.previous_expires_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'expires_at',to_char(v.expires_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ORDER BY v.sequence),'[]'::jsonb)
  INTO renewals FROM governed_release_renewals v WHERE v.release_id=target_release;
 RETURN encode(sha256(convert_to(governed_release_canonical_json(jsonb_build_object('release',grant_record,'journal',journal,'revocations',revocations,'renewals',renewals)),'UTF8')),'hex');
END $$;
CREATE FUNCTION governed_release_successor_runtime(s JSONB,e JSONB,rollback BOOLEAN,target TEXT DEFAULT NULL,allow_image_mismatch BOOLEAN DEFAULT FALSE) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE m JSONB:=s->'manifest';artifact JSONB;targets JSONB;rows JSONB;queues JSONB;t JSONB;v JSONB;row JSONB;runtime JSONB;
BEGIN
 artifact:=CASE WHEN rollback THEN m->'rollback' ELSE m->'deployment' END;
 SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) INTO targets FROM jsonb_array_elements(m->'deployment'->'targets') x WHERE target IS NULL OR x->>'targetId'=target;
 rows:=e->'deployedTargets';queues:=e->'deploymentIds';
 IF allow_image_mismatch AND (NOT rollback OR target IS NULL OR e->>'failureKind' IS DISTINCT FROM 'rollback_image_mismatch' OR e->'healthy' IS DISTINCT FROM 'false'::jsonb)
  OR NOT allow_image_mismatch AND e?'failureKind' THEN RETURN FALSE; END IF;
 IF e?'imageDigest' OR e?'deploymentId' OR e->'repositoryArchived'='true'::jsonb OR e->'localAbsent'='true'::jsonb
  OR jsonb_typeof(rows) IS DISTINCT FROM 'array' OR jsonb_typeof(queues) IS DISTINCT FROM 'array'
  OR jsonb_array_length(targets)=0 OR jsonb_array_length(rows)<>jsonb_array_length(targets) OR jsonb_array_length(queues)<>jsonb_array_length(targets)
  OR e->>'deployedCommit' IS DISTINCT FROM (CASE WHEN rollback THEN m->'rollback'->>'commit' ELSE s->>'commit' END)
  OR e->>'deployedTree' IS DISTINCT FROM (CASE WHEN rollback THEN s->>'baseTree' ELSE s->>'candidateTree' END)
  OR e->>'artifactSetDigest' IS DISTINCT FROM artifact->>'artifactSetDigest' OR e->>'configDigest' IS DISTINCT FROM artifact->>'configDigest'
  OR e->>'schemaDigest' IS DISTINCT FROM artifact->>'schemaDigest' OR e->>'dataDigest' IS DISTINCT FROM m->'baseline'->>'dataDigest'
  OR COALESCE(e->'healthy','null'::jsonb) NOT IN ('true'::jsonb,'false'::jsonb) OR COALESCE(e->>'healthDigest','')!~'^[a-f0-9]{64}$'
  OR (SELECT count(DISTINCT x->>'targetId') FROM jsonb_array_elements(rows) x)<>jsonb_array_length(rows)
  OR (SELECT count(DISTINCT x->>'targetId') FROM jsonb_array_elements(queues) x)<>jsonb_array_length(queues)
  OR (SELECT count(DISTINCT x->>'deploymentId') FROM jsonb_array_elements(queues) x)<>jsonb_array_length(queues) THEN RETURN FALSE; END IF;
 FOR t IN SELECT x FROM jsonb_array_elements(targets) x LOOP
  v:=CASE WHEN rollback THEN t->'baseline' ELSE jsonb_build_object('commit',s->>'commit','tree',s->>'candidateTree','configDigest',t->>'configDigest') END;
  SELECT x INTO row FROM jsonb_array_elements(rows) x WHERE x->>'targetId'=t->>'targetId';
  IF row IS NULL OR row->>'commit' IS DISTINCT FROM v->>'commit' OR row->>'tree' IS DISTINCT FROM v->>'tree'
   OR row->>'configDigest' IS DISTINCT FROM v->>'configDigest' OR row->>'schemaDigest' IS DISTINCT FROM artifact->>'schemaDigest'
   OR COALESCE(row->>'imageDigest','')!~'^sha256:[a-f0-9]{64}$'
   OR rollback AND NOT allow_image_mismatch AND row->>'imageDigest' IS DISTINCT FROM t->'baseline'->>'imageDigest'
   OR allow_image_mismatch AND row->>'imageDigest' IS NOT DISTINCT FROM t->'baseline'->>'imageDigest'
   OR COALESCE(row->'healthy','null'::jsonb) NOT IN ('true'::jsonb,'false'::jsonb) OR e->'healthy'='true'::jsonb AND row->'healthy' IS DISTINCT FROM 'true'::jsonb
   OR COALESCE(row->>'deploymentId','')='' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(queues) q WHERE q->>'targetId'=row->>'targetId' AND q->>'deploymentId'=row->>'deploymentId') THEN RETURN FALSE; END IF;
 END LOOP;
 SELECT jsonb_agg(jsonb_build_object('targetId',x->>'targetId','commit',x->>'commit','tree',x->>'tree','imageDigest',x->>'imageDigest',
  'configDigest',x->>'configDigest','schemaDigest',x->>'schemaDigest') ORDER BY (x->>'targetId') COLLATE "C") INTO runtime FROM jsonb_array_elements(rows) x;
 RETURN COALESCE(e->>'deployedSetDigest'=encode(sha256(convert_to(governed_release_canonical_json(runtime),'UTF8')),'hex'),FALSE);
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE FUNCTION governed_release_successor_basis(target_release UUID,candidate JSONB) RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE p governed_releases;s JSONB;m JSONB;next_manifest JSONB;ops JSONB;o JSONB;e JSONB;result TEXT;
 push JSONB;pr JSONB;review JSONB;merge_op JSONB;candidate_config JSONB;failure JSONB;rollback_config JSONB;observation JSONB;cleanup JSONB;
 target JSONB;rollback_op JSONB;resource JSONB;expected_queues JSONB;actual_queues JSONB;version TEXT;key TEXT;
BEGIN
 SELECT * INTO p FROM governed_releases WHERE id=target_release;
 IF p.id IS NULL THEN RETURN NULL; END IF;
 s:=p.snapshot;m:=s->'manifest';next_manifest:=candidate->'manifest';version:=governed_release_successor_version(target_release);
 IF candidate->'predecessor'->>'releaseId' IS DISTINCT FROM p.id::text OR candidate->'predecessor'->>'expectedVersion' IS DISTINCT FROM version
  OR m->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2' OR m->>'purpose' IS DISTINCT FROM 'application_release'
  OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_git_set' OR m->'cleanup'->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR s?'predecessor' OR s?'successorBasis' OR EXISTS(SELECT 1 FROM governed_release_revocations WHERE release_id=p.id)
  OR p.task_id::text IS DISTINCT FROM candidate->>'taskId' OR p.application_id::text IS DISTINCT FROM candidate->>'applicationId'
  OR p.host_id::text IS DISTINCT FROM candidate->>'hostId' OR p.review_id::text IS DISTINCT FROM candidate->>'reviewId'
  OR (m-'backup'-'baseline') IS DISTINCT FROM (next_manifest-'backup'-'baseline')
  OR ((m->'baseline')-'observedAt'-'healthDigest') IS DISTINCT FROM ((next_manifest->'baseline')-'observedAt'-'healthDigest') THEN RETURN NULL; END IF;
 FOREACH key IN ARRAY ARRAY['taskId','applicationId','hostId','reviewId','materialVersion','commit','candidateTree','baseCommit','baseTree','releaserAgentId'] LOOP
  IF s->>key IS DISTINCT FROM candidate->>key THEN RETURN NULL; END IF;
 END LOOP;
 SELECT COALESCE(jsonb_agg(to_jsonb(raw_op)||jsonb_build_object('outcome',(SELECT to_jsonb(x) FROM governed_release_outcomes x WHERE x.operation_id=raw_op.id ORDER BY x.sequence DESC LIMIT 1)) ORDER BY raw_op.sequence),'[]'::jsonb)
  INTO ops FROM governed_release_operations raw_op WHERE raw_op.release_id=p.id;
 FOR o IN SELECT x FROM jsonb_array_elements(ops) x LOOP
  result:=CASE WHEN o->'outcome'->>'status'='reconciled' THEN o->'outcome'->>'reconciled_status' ELSE o->'outcome'->>'status' END;e:=o->'outcome'->'evidence';
  IF result IS NULL OR result='uncertain' OR o->>'operation' IN ('archive_repository','cleanup_local')
   OR e?'failureKind' AND NOT(result='failed' AND o->>'operation'='rollback') THEN RETURN NULL; END IF;
  IF result='failed' AND o->>'operation'='rollback' AND NOT governed_release_successor_runtime(s,e,TRUE,o->'intent'->'parameters'->>'targetId',TRUE) THEN RETURN NULL; END IF;
  IF result='failed' AND o->>'operation'='observe' AND o->'intent'->'parameters'->>'mode'='rollback'
   AND (e->'healthy' IS DISTINCT FROM 'false'::jsonb OR NOT governed_release_successor_runtime(s,e,TRUE)) THEN RETURN NULL; END IF;
  IF result='succeeded' AND o->>'operation' IN ('push','pr','review','merge') AND e->>'remoteCommit'=s->>'commit' AND e->>'remoteTree'=s->>'candidateTree' THEN
   CASE o->>'operation'
    WHEN 'push' THEN IF push IS NULL THEN push:=o; END IF;
    WHEN 'pr' THEN IF pr IS NULL AND (e->>'pullRequestNumber')::int>0 AND e->>'prHeadCommit'=s->>'commit' THEN pr:=o; END IF;
    WHEN 'review' THEN IF review IS NULL AND (e->>'pullRequestNumber')::int>0 AND e->>'prHeadCommit'=s->>'commit' AND e->'reviewApproved'='true'::jsonb THEN review:=o; END IF;
    WHEN 'merge' THEN IF merge_op IS NULL AND (e->>'pullRequestNumber')::int>0 AND e->>'prHeadCommit'=s->>'commit' AND e->'prMerged'='true'::jsonb AND e->>'mergedCommit'=s->>'commit' THEN merge_op:=o; END IF;
   END CASE;
  END IF;
  IF result='succeeded' AND o->>'operation'='deploy_config' AND e->>'deployedCommit'=s->>'commit'
   AND e->>'artifactSetDigest'=m->'deployment'->>'artifactSetDigest' AND e->>'configDigest'=m->'deployment'->>'configDigest'
   AND e->>'schemaDigest'=m->'deployment'->>'schemaDigest' AND NOT(e?'imageDigest' OR e?'deploymentId' OR e?'deployedTargets') AND candidate_config IS NULL THEN candidate_config:=o; END IF;
  IF result='failed' AND o->>'operation' IN ('deploy','observe') AND COALESCE(o->'intent'->'parameters'->>'mode','candidate')<>'rollback'
   AND e->'healthy'='false'::jsonb AND governed_release_successor_runtime(s,e,FALSE,CASE WHEN o->>'operation'='deploy' THEN o->'intent'->'parameters'->>'targetId' END) THEN
   IF o->>'operation'='deploy' AND o->'intent'->'parameters'->>'targetId' IS NULL THEN RETURN NULL; END IF;
   IF o->>'operation'='observe' THEN
    SELECT COALESCE(jsonb_agg(q ORDER BY (q->>'targetId') COLLATE "C"),'[]'::jsonb) INTO expected_queues FROM jsonb_array_elements(ops) j,
     LATERAL jsonb_array_elements(j->'outcome'->'evidence'->'deploymentIds') q WHERE j->>'operation'='deploy'
     AND CASE WHEN j->'outcome'->>'status'='reconciled' THEN j->'outcome'->>'reconciled_status' ELSE j->'outcome'->>'status' END='succeeded';
    SELECT jsonb_agg(q ORDER BY (q->>'targetId') COLLATE "C") INTO actual_queues FROM jsonb_array_elements(e->'deploymentIds') q;
    IF actual_queues IS DISTINCT FROM expected_queues THEN RETURN NULL; END IF;
   END IF;
   IF failure IS NULL THEN failure:=o; END IF;
  END IF;
  IF result='succeeded' AND o->>'operation'='rollback_config' AND e->>'deployedCommit'=m->'rollback'->>'commit'
   AND e->>'artifactSetDigest'=m->'rollback'->>'artifactSetDigest' AND e->>'configDigest'=m->'rollback'->>'configDigest'
   AND e->>'schemaDigest'=m->'rollback'->>'schemaDigest' AND NOT(e?'imageDigest' OR e?'deploymentId' OR e?'deployedTargets') AND rollback_config IS NULL THEN rollback_config:=o; END IF;
  IF result='succeeded' AND o->>'operation'='observe' AND o->'intent'->'parameters'->>'mode'='rollback' AND e->'healthy'='true'::jsonb
   AND (e->>'observationSeconds')::int>=(m->'observation'->>'seconds')::int AND governed_release_successor_runtime(s,e,TRUE) THEN observation:=o; END IF;
  IF result='succeeded' AND o->>'operation'='cleanup' AND o->'outcome'->'observation_only'='true'::jsonb
   AND e->'retentionVerified'='true'::jsonb AND e->'repositoryArchived'='false'::jsonb AND e->'localAbsent'='false'::jsonb
   AND e->>'repositoryUrl'=m->'repository'->>'url' AND e->>'canonicalDir'=m->'repository'->>'canonicalDir' AND e->>'targetId'=m->'deployment'->>'targetId'
   AND e->'applicationActive'='true'::jsonb AND e->>'localCommit'=s->>'commit' AND e->>'localTree'=s->>'candidateTree'
   AND e->>'remoteCommit'=s->>'commit' AND e->>'remoteTree'=s->>'candidateTree' AND e->'absenceVerified'='true'::jsonb
   AND e->'resourceIds'=m->'cleanup'->'ownedResourceIds'
   AND e->>'protectedResourcesDigest'=encode(sha256(convert_to(governed_release_canonical_json(m->'cleanup'->'protectedResourceIds'),'UTF8')),'hex') AND cleanup IS NULL THEN cleanup:=o; END IF;
 END LOOP;
 IF push IS NULL OR pr IS NULL OR review IS NULL OR merge_op IS NULL OR candidate_config IS NULL OR failure IS NULL OR rollback_config IS NULL OR observation IS NULL OR cleanup IS NULL
  OR (push->>'sequence')::int>=(pr->>'sequence')::int OR (pr->>'sequence')::int>=(review->>'sequence')::int
  OR (review->>'sequence')::int>=(merge_op->>'sequence')::int OR (merge_op->>'sequence')::int>=(failure->>'sequence')::int
  OR (merge_op->>'sequence')::int>=(candidate_config->>'sequence')::int OR (candidate_config->>'sequence')::int>=(failure->>'sequence')::int
  OR (failure->>'sequence')::int>=(rollback_config->>'sequence')::int OR (observation->>'sequence')::int>=(cleanup->>'sequence')::int
  OR pr->'outcome'->'evidence'->>'pullRequestNumber' IS DISTINCT FROM review->'outcome'->'evidence'->>'pullRequestNumber'
  OR pr->'outcome'->'evidence'->>'pullRequestNumber' IS DISTINCT FROM merge_op->'outcome'->'evidence'->>'pullRequestNumber' THEN RETURN NULL; END IF;
 FOR target IN SELECT x FROM jsonb_array_elements(m->'deployment'->'targets') x LOOP
  SELECT j INTO rollback_op FROM jsonb_array_elements(ops) j WHERE j->>'operation'='rollback' AND j->'intent'->'parameters'->>'targetId'=target->>'targetId'
   AND CASE WHEN j->'outcome'->>'status'='reconciled' THEN j->'outcome'->>'reconciled_status' ELSE j->'outcome'->>'status' END='succeeded'
   AND j->'outcome'->'evidence'->'healthy'='true'::jsonb AND governed_release_successor_runtime(s,j->'outcome'->'evidence',TRUE,target->>'targetId')
   AND (j->>'sequence')::int>(rollback_config->>'sequence')::int AND (j->>'sequence')::int<(observation->>'sequence')::int ORDER BY (j->>'sequence')::int DESC LIMIT 1;
  IF rollback_op IS NULL THEN RETURN NULL; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(ops) j WHERE j->>'operation'='rollback' AND j->'intent'->'parameters'->>'targetId'=target->>'targetId'
   AND CASE WHEN j->'outcome'->>'status'='reconciled' THEN j->'outcome'->>'reconciled_status' ELSE j->'outcome'->>'status' END='failed'
   AND (j->>'sequence')::int>=(rollback_op->>'sequence')::int) THEN RETURN NULL; END IF;
 END LOOP;
 FOR resource IN SELECT x FROM jsonb_array_elements(m->'cleanup'->'ownedResourceIds') x LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(ops) j WHERE j->>'operation'='cleanup_resource'
   AND j->'intent'->'parameters'->'resourceId'=resource
   AND CASE WHEN j->'outcome'->>'status'='reconciled' THEN j->'outcome'->>'reconciled_status' ELSE j->'outcome'->>'status' END='succeeded'
   AND j->'outcome'->'evidence'->'absenceVerified'='true'::jsonb AND j->'outcome'->'evidence'->'resourceIds'=jsonb_build_array(resource)
   AND (j->>'sequence')::int>(observation->>'sequence')::int AND (j->>'sequence')::int<(cleanup->>'sequence')::int) THEN RETURN NULL; END IF;
 END LOOP;
 SELECT COALESCE(jsonb_agg(q ORDER BY (q->>'targetId') COLLATE "C"),'[]'::jsonb) INTO expected_queues FROM jsonb_array_elements(ops) j,
  LATERAL jsonb_array_elements(j->'outcome'->'evidence'->'deploymentIds') q WHERE j->>'operation'='rollback'
  AND CASE WHEN j->'outcome'->>'status'='reconciled' THEN j->'outcome'->>'reconciled_status' ELSE j->'outcome'->>'status' END='succeeded';
 SELECT jsonb_agg(q ORDER BY (q->>'targetId') COLLATE "C") INTO actual_queues FROM jsonb_array_elements(observation->'outcome'->'evidence'->'deploymentIds') q;
 IF actual_queues IS DISTINCT FROM expected_queues THEN RETURN NULL; END IF;
 FOR o IN SELECT x FROM jsonb_array_elements(ops) x WHERE x->>'operation'='observe' AND x->'intent'->'parameters'->>'mode'='rollback'
  AND CASE WHEN x->'outcome'->>'status'='reconciled' THEN x->'outcome'->>'reconciled_status' ELSE x->'outcome'->>'status' END='failed' LOOP
  IF (o->>'sequence')::int>=(observation->>'sequence')::int THEN RETURN NULL; END IF;
  SELECT jsonb_agg(q ORDER BY (q->>'targetId') COLLATE "C") INTO actual_queues FROM jsonb_array_elements(o->'outcome'->'evidence'->'deploymentIds') q;
  IF actual_queues IS DISTINCT FROM expected_queues THEN RETURN NULL; END IF;
 END LOOP;
 RETURN jsonb_build_object('schemaVersion','roost-release-successor-v1','releaseId',p.id::text,'expectedVersion',version,
  'mergeOperationId',merge_op->>'id','rollbackObservationOperationId',observation->>'id','cleanupOperationId',cleanup->>'id',
  'rollbackDeploymentIds',observation->'outcome'->'evidence'->'deploymentIds');
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
CREATE FUNCTION governed_release_successor_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE expected JSONB;p governed_releases;
BEGIN
 IF NEW.snapshot?'predecessor' OR NEW.snapshot?'successorBasis' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  SELECT * INTO p FROM governed_releases WHERE id=(NEW.snapshot->'predecessor'->>'releaseId')::uuid AND workspace_id=NEW.workspace_id;
  expected:=governed_release_successor_basis(p.id,NEW.snapshot);
  IF p.id IS NULL OR NEW.issuer_user_id IS DISTINCT FROM p.issuer_user_id OR expected IS NULL OR NEW.snapshot->'successorBasis' IS DISTINCT FROM expected
   THEN RAISE EXCEPTION 'governed_release_successor_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER governed_release_successor_insert_guard BEFORE INSERT ON governed_releases
 FOR EACH ROW EXECUTE FUNCTION governed_release_successor_insert_guard();
CREATE FUNCTION governed_release_successor_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;expected JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 IF EXISTS(SELECT 1 FROM governed_release_operations o JOIN LATERAL (SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1) x ON TRUE
  WHERE o.release_id=r.id AND o.operation='cleanup' AND (x.status='succeeded' OR x.status='reconciled' AND x.reconciled_status='succeeded'))
  THEN RAISE EXCEPTION 'governed_release_already_completed'; END IF;
 IF r.snapshot?'predecessor' OR r.snapshot?'successorBasis' THEN
  expected:=governed_release_successor_basis((r.snapshot->'predecessor'->>'releaseId')::uuid,r.snapshot);
  IF expected IS NULL OR r.snapshot->'successorBasis' IS DISTINCT FROM expected OR NEW.operation IN ('push','pr','review','merge')
   OR NEW.intent->'observed'->>'baseCommit' IS DISTINCT FROM r.snapshot->>'commit'
   OR NEW.intent->'observed'->>'baseTree' IS DISTINCT FROM r.snapshot->>'candidateTree'
   THEN RAISE EXCEPTION 'governed_release_successor_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER governed_release_successor_operation_guard BEFORE INSERT ON governed_release_operations
 FOR EACH ROW EXECUTE FUNCTION governed_release_successor_operation_guard();
COMMIT;
