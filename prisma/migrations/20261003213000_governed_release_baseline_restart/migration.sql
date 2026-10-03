BEGIN;
-- Separate failure disposition and owner adopted baseline. Historical release
-- grants, outcomes and strict successful rollback successors remain immutable.
CREATE TABLE governed_release_failed_closures (
 id UUID PRIMARY KEY,release_id UUID NOT NULL UNIQUE REFERENCES governed_releases(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 owner_authenticated_at TIMESTAMP(3) NOT NULL,failed_operation_id UUID NOT NULL REFERENCES governed_release_operations(id) ON DELETE RESTRICT,
 failed_outcome_id UUID NOT NULL REFERENCES governed_release_outcomes(id) ON DELETE RESTRICT,
 expected_version TEXT NOT NULL CHECK(expected_version~'^[a-f0-9]{64}$'),consent_digest TEXT NOT NULL CHECK(consent_digest~'^[a-f0-9]{64}$'),
 closure_digest TEXT NOT NULL CHECK(closure_digest~'^[a-f0-9]{64}$'),
 revocation_id UUID NOT NULL UNIQUE REFERENCES governed_release_revocations(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 snapshot JSONB NOT NULL,request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id)
);
CREATE TABLE governed_release_reconciliation_authorizations (
 id UUID PRIMARY KEY,release_id UUID NOT NULL REFERENCES governed_releases(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,agent_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,credential_version INTEGER NOT NULL CHECK(credential_version>0),
 issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,owner_authenticated_at TIMESTAMP(3) NOT NULL,
 expected_version TEXT NOT NULL CHECK(expected_version~'^[a-f0-9]{64}$'),operation_ids JSONB NOT NULL CHECK(jsonb_typeof(operation_ids)='array'),
 expires_at TIMESTAMP(3) NOT NULL,snapshot JSONB NOT NULL,request_id UUID NOT NULL,request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(workspace_id,request_id)
);
CREATE INDEX governed_release_reconciliation_credential_idx ON governed_release_reconciliation_authorizations(credential_id,release_id,expires_at);
CREATE TRIGGER governed_release_failed_closure_immutable BEFORE UPDATE OR DELETE ON governed_release_failed_closures FOR EACH ROW EXECUTE FUNCTION governed_release_immutable();
CREATE TRIGGER governed_release_reconciliation_immutable BEFORE UPDATE OR DELETE ON governed_release_reconciliation_authorizations FOR EACH ROW EXECUTE FUNCTION governed_release_immutable();
CREATE FUNCTION governed_release_failed_baseline_proven(target_release UUID,failed_operation UUID,e JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;s JSONB;m JSONB;op governed_release_operations;x governed_release_outcomes;target TEXT;t JSONB;row JSONB;targets JSONB;changed JSONB;prior JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=target_release;s:=r.snapshot;m:=s->'manifest';
 SELECT * INTO op FROM governed_release_operations WHERE id=failed_operation AND release_id=r.id;
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;target:=op.intent->'parameters'->>'targetId';
 IF r.id IS NULL OR op.operation IS DISTINCT FROM 'rollback' OR COALESCE(CASE WHEN x.status='reconciled' THEN x.reconciled_status ELSE x.status END,'')<>'failed'
  OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_git_set' OR m->'cleanup'->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR s?'predecessor' OR s?'successorBasis' OR s?'baselineRestart' OR s?'publishedGitBasis'
  OR NOT governed_release_successor_runtime(s,x.evidence,TRUE,target,TRUE)
  OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=r.id AND
   (COALESCE((SELECT CASE WHEN z.status='reconciled' THEN z.reconciled_status ELSE z.status END FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY z.sequence DESC LIMIT 1),'uncertain')='uncertain'
    OR o.operation='rollback' AND o.intent->'parameters'->>'targetId'=target AND o.sequence>op.sequence
    OR o.operation='cleanup' AND (SELECT CASE WHEN z.status='reconciled' THEN z.reconciled_status ELSE z.status END FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY z.sequence DESC LIMIT 1)='succeeded'))
  OR e?'failureKind' OR e->'healthy' IS DISTINCT FROM 'true'::jsonb OR (e->>'observationSeconds')::int<(m->'observation'->>'seconds')::int
  OR e->>'observationSeconds' IS NULL THEN RETURN FALSE; END IF;
 SELECT jsonb_agg(CASE WHEN v->>'targetId'=target THEN jsonb_set(v,'{baseline,imageDigest}',x.evidence->'deployedTargets'->0->'imageDigest') ELSE v END ORDER BY ordinal)
  INTO targets FROM jsonb_array_elements(m->'deployment'->'targets') WITH ORDINALITY rows(v,ordinal);
 changed:=jsonb_set(s,'{manifest,deployment,targets}',targets);
 IF NOT governed_release_successor_runtime(changed,e,TRUE) THEN RETURN FALSE; END IF;
 FOR t IN SELECT v FROM jsonb_array_elements(targets) v LOOP
  SELECT v INTO row FROM jsonb_array_elements(e->'deployedTargets') v WHERE v->>'targetId'=t->>'targetId';
  IF t->>'targetId'=target THEN prior:=x.evidence;
  ELSE SELECT z.evidence INTO prior FROM governed_release_operations o JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1) z ON TRUE
   WHERE o.release_id=r.id AND o.operation='rollback' AND o.intent->'parameters'->>'targetId'=t->>'targetId'
   AND CASE WHEN z.status='reconciled' THEN z.reconciled_status ELSE z.status END='succeeded' ORDER BY o.sequence DESC LIMIT 1; END IF;
  IF prior IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(prior->'deploymentIds') q WHERE q->>'targetId'=t->>'targetId' AND q->>'deploymentId'=row->>'deploymentId') THEN RETURN FALSE; END IF;
 END LOOP;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
CREATE FUNCTION governed_release_failed_closure_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
  OR (NEW.snapshot->'evidence'->>'observedAt')::timestamp>now()+interval '1 minute' OR (NEW.snapshot->'evidence'->>'observedAt')::timestamp<now()-interval '5 minutes'
  OR NOT governed_release_failed_baseline_proven(r.id,NEW.failed_operation_id,NEW.snapshot->'evidence') THEN RAISE EXCEPTION 'governed_release_failed_closure_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER governed_release_failed_closure_guard BEFORE INSERT ON governed_release_failed_closures FOR EACH ROW EXECUTE FUNCTION governed_release_failed_closure_guard();
CREATE FUNCTION governed_release_failed_closure_revocation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=NEW.revocation_id AND release_id=NEW.release_id AND workspace_id=NEW.workspace_id AND issuer_user_id=NEW.issuer_user_id AND reason='Closed FAILED; owner baseline receipt '||NEW.id::text)
 THEN RAISE EXCEPTION 'governed_release_failed_closure_revocation_invalid'; END IF;RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER governed_release_failed_closure_revocation_guard AFTER INSERT ON governed_release_failed_closures DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION governed_release_failed_closure_revocation_guard();
CREATE FUNCTION governed_release_restart_manifest_identity(m JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_set((m-'backup')||jsonb_build_object('baseline',(m->'baseline')-'observedAt'-'healthDigest','cleanup',(m->'cleanup')-'protectedResourceIds'),'{deployment,targets}',
  (SELECT jsonb_agg(jsonb_set(t,'{baseline}',(t->'baseline')-'imageDigest') ORDER BY ordinal) FROM jsonb_array_elements(m->'deployment'->'targets') WITH ORDINALITY rows(t,ordinal)))
$$;
CREATE FUNCTION governed_release_restart_protected_ids(m JSONB,e JSONB) RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result JSONB:=m->'cleanup'->'protectedResourceIds';t JSONB;row JSONB;
BEGIN
 IF jsonb_typeof(result) IS DISTINCT FROM 'array' OR jsonb_typeof(e->'deployedTargets') IS DISTINCT FROM 'array'
  OR jsonb_array_length(e->'deployedTargets') IS DISTINCT FROM jsonb_array_length(m->'deployment'->'targets')
  OR (SELECT count(DISTINCT v->>'targetId') FROM jsonb_array_elements(e->'deployedTargets') v)<>jsonb_array_length(e->'deployedTargets') THEN RETURN NULL; END IF;
 FOR t IN SELECT v FROM jsonb_array_elements(m->'deployment'->'targets') WITH ORDINALITY rows(v,ordinal) ORDER BY ordinal LOOP
  SELECT v INTO row FROM jsonb_array_elements(e->'deployedTargets') v WHERE v->>'targetId'=t->>'targetId';
  IF row IS NULL OR (row->>'imageDigest') IS NULL OR (row->>'imageDigest')!~'^sha256:[a-f0-9]{64}$' THEN RETURN NULL; END IF;
  IF NOT result @> jsonb_build_array(row->>'imageDigest') THEN result:=result||jsonb_build_array(row->>'imageDigest'); END IF;
 END LOOP;
 RETURN result;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
CREATE FUNCTION governed_release_published_git_basis(target_release UUID,candidate JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;c governed_release_failed_closures;s JSONB;j JSONB;o JSONB;e JSONB;push JSONB;pr JSONB;review JSONB;merge_op JSONB;t JSONB;row JSONB;version TEXT;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=target_release;s:=r.snapshot;version:=governed_release_successor_version(r.id);
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(candidate->'baselineRestart'->>'closureId')::uuid AND release_id=r.id;
 IF r.id IS NULL OR c.id IS NULL OR candidate?'predecessor' OR candidate?'successorBasis'
  OR candidate->>'reviewId' IS NOT DISTINCT FROM s->>'reviewId' OR candidate->>'releaseExecutionId' IS NOT DISTINCT FROM s->>'releaseExecutionId'
  OR candidate->'baselineRestart'->>'releaseId' IS DISTINCT FROM r.id::text OR candidate->'baselineRestart'->>'expectedVersion' IS DISTINCT FROM version
  OR candidate->'baselineRestart'->>'consentDigest' IS DISTINCT FROM c.consent_digest
  OR NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=c.revocation_id AND release_id=r.id)
  OR c.closure_digest IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(c.snapshot),'UTF8')),'hex')
  OR NOT governed_release_failed_baseline_proven(r.id,c.failed_operation_id,c.snapshot->'evidence')
  OR governed_release_restart_protected_ids(s->'manifest',c.snapshot->'evidence') IS NULL
  OR governed_release_restart_protected_ids(s->'manifest',c.snapshot->'evidence') IS DISTINCT FROM candidate->'manifest'->'cleanup'->'protectedResourceIds'
  OR governed_release_restart_manifest_identity(s->'manifest') IS DISTINCT FROM governed_release_restart_manifest_identity(candidate->'manifest') THEN RETURN NULL; END IF;
 FOREACH version IN ARRAY ARRAY['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId'] LOOP
  IF s->>version IS DISTINCT FROM candidate->>version THEN RETURN NULL; END IF;END LOOP;
 FOR t IN SELECT v FROM jsonb_array_elements(candidate->'manifest'->'deployment'->'targets') v LOOP
  SELECT v INTO row FROM jsonb_array_elements(c.snapshot->'evidence'->'deployedTargets') v WHERE v->>'targetId'=t->>'targetId';
  IF row IS NULL OR t->'baseline' IS DISTINCT FROM jsonb_build_object('commit',row->'commit','tree',row->'tree','imageDigest',row->'imageDigest','configDigest',row->'configDigest') THEN RETURN NULL; END IF;
 END LOOP;
 FOR o IN SELECT to_jsonb(raw)||jsonb_build_object('outcome',(SELECT to_jsonb(x) FROM governed_release_outcomes x WHERE x.operation_id=raw.id ORDER BY sequence DESC LIMIT 1)) FROM governed_release_operations raw WHERE raw.release_id=r.id ORDER BY raw.sequence LOOP
  e:=o->'outcome'->'evidence';
  IF (CASE WHEN o->'outcome'->>'status'='reconciled' THEN o->'outcome'->>'reconciled_status' ELSE o->'outcome'->>'status' END)='succeeded'
   AND e->>'remoteCommit'=s->>'commit' AND e->>'remoteTree'=s->>'candidateTree' THEN
   CASE o->>'operation'
    WHEN 'push' THEN IF push IS NULL THEN push:=o; END IF;
    WHEN 'pr' THEN IF pr IS NULL AND (e->>'pullRequestNumber')::int>0 AND e->>'prHeadCommit'=s->>'commit' THEN pr:=o; END IF;
    WHEN 'review' THEN IF review IS NULL AND (e->>'pullRequestNumber')::int>0 AND e->>'prHeadCommit'=s->>'commit' AND e->'reviewApproved'='true'::jsonb THEN review:=o; END IF;
    WHEN 'merge' THEN IF merge_op IS NULL AND (e->>'pullRequestNumber')::int>0 AND e->>'prHeadCommit'=s->>'commit' AND e->'prMerged'='true'::jsonb AND e->>'mergedCommit'=s->>'commit' THEN merge_op:=o; END IF;
    ELSE NULL;END CASE;
  END IF;
 END LOOP;
 IF push IS NULL OR pr IS NULL OR review IS NULL OR merge_op IS NULL OR (push->>'sequence')::int>=(pr->>'sequence')::int OR (pr->>'sequence')::int>=(review->>'sequence')::int OR (review->>'sequence')::int>=(merge_op->>'sequence')::int
  OR pr->'outcome'->'evidence'->>'pullRequestNumber' IS DISTINCT FROM review->'outcome'->'evidence'->>'pullRequestNumber' OR pr->'outcome'->'evidence'->>'pullRequestNumber' IS DISTINCT FROM merge_op->'outcome'->'evidence'->>'pullRequestNumber' THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('schemaVersion','roost-release-published-git-v1','releaseId',r.id::text,'expectedVersion',governed_release_successor_version(r.id),
  'closureId',c.id::text,'closureDigest',c.closure_digest,'pushOperationId',push->>'id','prOperationId',pr->>'id','reviewOperationId',review->>'id','mergeOperationId',merge_op->>'id','baselineDeploymentIds',c.snapshot->'evidence'->'deploymentIds');
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
CREATE FUNCTION governed_release_restart_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE expected JSONB;old governed_releases;
BEGIN
 IF NEW.snapshot?'baselineRestart' OR NEW.snapshot?'publishedGitBasis' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  SELECT * INTO old FROM governed_releases WHERE id=(NEW.snapshot->'baselineRestart'->>'releaseId')::uuid AND workspace_id=NEW.workspace_id;
  expected:=governed_release_published_git_basis(old.id,NEW.snapshot);
  IF old.id IS NULL OR old.issuer_user_id IS DISTINCT FROM NEW.issuer_user_id OR expected IS NULL OR expected IS DISTINCT FROM NEW.snapshot->'publishedGitBasis' THEN RAISE EXCEPTION 'governed_release_restart_invalid'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_restart_insert_guard BEFORE INSERT ON governed_releases FOR EACH ROW EXECUTE FUNCTION governed_release_restart_insert_guard();
CREATE FUNCTION governed_release_restart_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;expected JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 IF r.snapshot?'baselineRestart' OR r.snapshot?'publishedGitBasis' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));expected:=governed_release_published_git_basis((r.snapshot->'baselineRestart'->>'releaseId')::uuid,r.snapshot);
  IF expected IS NULL OR expected IS DISTINCT FROM r.snapshot->'publishedGitBasis' OR NEW.operation IN ('push','pr','review','merge')
   OR NEW.intent->'observed'->>'baseCommit' IS DISTINCT FROM r.snapshot->>'commit' OR NEW.intent->'observed'->>'baseTree' IS DISTINCT FROM r.snapshot->>'candidateTree' THEN RAISE EXCEPTION 'governed_release_restart_invalid'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_restart_operation_guard BEFORE INSERT ON governed_release_operations FOR EACH ROW EXECUTE FUNCTION governed_release_restart_operation_guard();
CREATE FUNCTION governed_release_reconciliation_authorization_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;k api_keys;a workforce_entities;j JSONB;b JSONB;op governed_release_operations;outcome JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT * INTO k FROM api_keys WHERE id=NEW.credential_id;SELECT * INTO a FROM workforce_entities WHERE id=k.bound_agent_id;
 IF r.id IS NULL OR NEW.workspace_id IS DISTINCT FROM r.workspace_id OR NEW.host_id IS DISTINCT FROM r.host_id OR NEW.application_id IS DISTINCT FROM r.application_id OR NEW.agent_id IS DISTINCT FROM r.releaser_agent_id
  OR NEW.owner_authenticated_at>now() OR NEW.owner_authenticated_at<now()-interval '5 minutes'
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=r.workspace_id AND user_id=NEW.issuer_user_id AND role='owner')
  OR EXISTS(SELECT 1 FROM governed_release_revocations WHERE release_id=r.id) OR NEW.expected_version IS DISTINCT FROM governed_release_successor_version(r.id)
  OR k.id IS NULL OR k.id=r.releaser_credential_id OR k.workspace_id IS DISTINCT FROM r.workspace_id OR k.bound_agent_id IS DISTINCT FROM r.releaser_agent_id OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at<=now() OR k.credential_version<>NEW.credential_version
  OR NOT k.scopes @> '["agent-runtime:write","agent-runtime:release"]'::jsonb OR a.type<>'agent' OR a.source='user' OR a.status<>'active' OR a.workspace_id IS DISTINCT FROM r.workspace_id
  OR NEW.expires_at<=now() OR NEW.expires_at>now()+interval '1 hour' OR NEW.expires_at>k.expires_at
  OR jsonb_array_length(NEW.operation_ids)<1 OR jsonb_array_length(NEW.operation_ids)>30 OR (SELECT count(DISTINCT v) FROM jsonb_array_elements(NEW.operation_ids) v)<>jsonb_array_length(NEW.operation_ids)
  OR NEW.snapshot->>'releaseId' IS DISTINCT FROM r.id::text OR NEW.snapshot->>'hostId' IS DISTINCT FROM r.host_id::text OR NEW.snapshot->>'applicationId' IS DISTINCT FROM r.application_id::text OR NEW.snapshot->>'agentId' IS DISTINCT FROM r.releaser_agent_id::text
  OR NEW.snapshot->>'releaseSnapshotDigest' IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(r.snapshot),'UTF8')),'hex') THEN RAISE EXCEPTION 'governed_release_reconciliation_invalid'; END IF;
 FOR j IN SELECT v FROM jsonb_array_elements(NEW.operation_ids) v LOOP
  SELECT * INTO op FROM governed_release_operations WHERE id=(j#>>'{}')::uuid AND release_id=r.id;
  SELECT to_jsonb(x) INTO outcome FROM governed_release_outcomes x WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;
  IF op.id IS NULL OR outcome IS NOT NULL AND outcome->>'status'<>'uncertain' THEN RAISE EXCEPTION 'governed_release_reconciliation_invalid'; END IF;
 END LOOP;
 IF jsonb_array_length(NEW.snapshot->'journalBasis')<>(SELECT count(*) FROM governed_release_operations WHERE release_id=r.id) THEN RAISE EXCEPTION 'governed_release_reconciliation_invalid'; END IF;
 FOR op IN SELECT * FROM governed_release_operations WHERE release_id=r.id LOOP
  SELECT v INTO b FROM jsonb_array_elements(NEW.snapshot->'journalBasis') v WHERE v->>'id'=op.id::text;
  SELECT to_jsonb(x) INTO outcome FROM governed_release_outcomes x WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;
  IF b IS NULL OR b->>'requestHash' IS DISTINCT FROM op.request_hash OR b->>'intentDigest' IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(op.intent),'UTF8')),'hex')
   OR b->>'outcomeDigest' IS DISTINCT FROM encode(sha256(convert_to(governed_release_canonical_json(COALESCE(outcome,'null'::jsonb)),'UTF8')),'hex') THEN RAISE EXCEPTION 'governed_release_reconciliation_invalid'; END IF;
 END LOOP;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_reconciliation_authorization_guard BEFORE INSERT ON governed_release_reconciliation_authorizations FOR EACH ROW EXECUTE FUNCTION governed_release_reconciliation_authorization_guard();
COMMIT;
