BEGIN;
-- Compose no-effect restart retains an unchanged current exact code approval.
-- Normal governed_release_guard/createRelease still revalidate role, material and exact commit.
-- Git-set recovery and append-only history remain unchanged.
CREATE OR REPLACE FUNCTION governed_release_published_git_basis(target_release UUID,candidate JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
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
 FOREACH key IN ARRAY ARRAY['releaseExecutionId','releaserCredentialId'] LOOP
  IF candidate->>key IS NULL OR candidate->>key IS NOT DISTINCT FROM s->>key THEN RETURN NULL; END IF;END LOOP;
 IF candidate->>'reviewId'=s->>'reviewId' AND candidate->>'materialVersion' IS DISTINCT FROM s->>'materialVersion' THEN RETURN NULL; END IF;
 ops:=governed_release_compose_config_absence_git(r.id,c.failed_operation_id,c.snapshot->'evidence');IF ops IS NULL OR c.failed_outcome_id::text IS DISTINCT FROM ops->4->'outcome'->>'id' THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('schemaVersion','roost-release-published-git-v1','basisKind','compose_config_absence','composeEvidenceDigest',encode(sha256(convert_to(governed_release_canonical_json(c.snapshot->'evidence'),'UTF8')),'hex'),
  'releaseId',r.id::text,'expectedVersion',version,'closureId',c.id::text,'closureDigest',c.closure_digest,'pushOperationId',ops->0->>'id','prOperationId',ops->1->>'id','reviewOperationId',ops->2->>'id','mergeOperationId',ops->3->>'id','baselineDeploymentIds','[]'::jsonb);
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
COMMIT;
