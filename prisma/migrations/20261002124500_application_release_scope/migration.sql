BEGIN;
-- Additive scope admission only. Existing grants, review history and data stay
-- immutable; the original guards below differ solely in the purpose predicate.
CREATE FUNCTION governed_release_application_scope(metadata JSONB, manifest JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE cleanup JSONB;targets JSONB;origins JSONB;protected JSONB;owned JSONB;projected JSONB;
BEGIN
 IF metadata->>'releasePurpose'='temporary_certification' THEN
  -- Historical certification admission had no manifest requirement. Keep that
  -- legacy case, while a present manifest must remain certification scoped.
  IF manifest IS NULL THEN RETURN TRUE; END IF;
  RETURN COALESCE(manifest->>'schemaVersion'='roost-release-manifest-v1'
   AND manifest->'deployment'->>'provider'='coolify'
   AND manifest->'cleanup'->'archiveRepository'='true'::jsonb
   AND NOT(manifest ? 'purpose'),FALSE);
 END IF;
 IF metadata->>'releasePurpose' IS DISTINCT FROM 'application_release'
  OR jsonb_typeof(manifest) IS DISTINCT FROM 'object'
  OR jsonb_typeof(manifest->'deployment') IS DISTINCT FROM 'object'
  OR jsonb_typeof(manifest->'repository') IS DISTINCT FROM 'object'
  OR manifest->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2'
  OR manifest->>'purpose' IS DISTINCT FROM 'application_release'
  OR manifest->'deployment'->>'provider' NOT IN ('coolify','coolify_git_set')
  OR manifest->'deployment'->>'provider' IS NULL THEN RETURN FALSE; END IF;
 cleanup:=manifest->'cleanup';protected:=cleanup->'protectedResourceIds';owned:=cleanup->'ownedResourceIds';
 IF jsonb_typeof(cleanup) IS DISTINCT FROM 'object'
  OR cleanup->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_typeof(protected) IS DISTINCT FROM 'array' OR jsonb_typeof(owned) IS DISTINCT FROM 'array'
  THEN RETURN FALSE; END IF;
 IF jsonb_array_length(protected) NOT BETWEEN 1 AND 100 OR jsonb_array_length(owned)>30
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(protected || owned) item
   WHERE jsonb_typeof(item) IS DISTINCT FROM 'string' OR length(btrim(item#>>'{}')) NOT BETWEEN 1 AND 1000)
  OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(protected))<>jsonb_array_length(protected)
  OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(owned))<>jsonb_array_length(owned)
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(owned) item WHERE protected @> jsonb_build_array(item))
  OR NOT(protected @> jsonb_build_array(manifest->'deployment'->>'targetId'))
  OR cleanup->>'coolifyTargetId' IS DISTINCT FROM manifest->'deployment'->>'targetId'
  OR cleanup->>'repositoryUrl' IS DISTINCT FROM manifest->'repository'->>'url'
  OR cleanup->>'canonicalDir' IS DISTINCT FROM manifest->'repository'->>'canonicalDir'
  OR metadata->>'localDirectory' IS DISTINCT FROM manifest->'repository'->>'canonicalDir'
  OR metadata->>'deploymentUrl' IS DISTINCT FROM manifest->'deployment'->>'url'
  OR jsonb_typeof(metadata->'localDirectory') IS DISTINCT FROM 'string'
  OR jsonb_typeof(metadata->'deploymentUrl') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'repository'->'url') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'repository'->'canonicalDir') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'deployment'->'url') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'deployment'->'targetId') IS DISTINCT FROM 'string'
  OR manifest->'repository'->>'url' IS NULL OR manifest->'repository'->>'canonicalDir' IS NULL
  OR manifest->'deployment'->>'url' IS NULL OR manifest->'deployment'->>'targetId' IS NULL
  THEN RETURN FALSE; END IF;
 IF manifest->'deployment'->>'provider'='coolify' THEN RETURN TRUE; END IF;
 targets:=manifest->'deployment'->'targets';origins:=manifest->'deployment'->'publicOrigins';
 IF jsonb_typeof(targets) IS DISTINCT FROM 'array' OR jsonb_typeof(origins) IS DISTINCT FROM 'array'
  OR jsonb_typeof(metadata->'releaseTargets') IS DISTINCT FROM 'array'
  OR jsonb_typeof(metadata->'releasePublicOrigins') IS DISTINCT FROM 'array' THEN RETURN FALSE; END IF;
 IF jsonb_array_length(targets) NOT BETWEEN 1 AND 6 OR jsonb_array_length(origins) NOT BETWEEN 1 AND 8
  OR (SELECT count(DISTINCT value->>'targetId') FROM jsonb_array_elements(targets))<>jsonb_array_length(targets)
  OR (SELECT count(DISTINCT value->>'name') FROM jsonb_array_elements(targets))<>jsonb_array_length(targets)
  OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(origins))<>jsonb_array_length(origins)
  OR metadata->'releasePublicOrigins' IS DISTINCT FROM origins
  OR NOT(origins @> jsonb_build_array(substring(manifest->'deployment'->>'url' FROM '^https://[^/?#]+')))
  OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(targets) t WHERE t->>'targetId'=manifest->'deployment'->>'targetId')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(targets) t
   WHERE jsonb_typeof(t) IS DISTINCT FROM 'object' OR jsonb_typeof(t->'targetId') IS DISTINCT FROM 'string'
    OR length(btrim(t->>'targetId')) NOT BETWEEN 1 AND 1000 OR jsonb_typeof(t->'name') IS DISTINCT FROM 'string'
    OR length(btrim(t->>'name')) NOT BETWEEN 1 AND 1000 OR jsonb_typeof(t->'dockerfile') IS DISTINCT FROM 'string'
    OR t->>'dockerfile' !~ '^/[A-Za-z0-9._/-]+$' OR (t->>'dockerfile')~'(^|/)([.]|[.][.])(/|$)'
    OR (t->>'dockerfile') LIKE '%//%' OR NOT(protected @> jsonb_build_array(t->>'targetId')))
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(origins) origin
   WHERE jsonb_typeof(origin) IS DISTINCT FROM 'string' OR (origin#>>'{}')!~'^https://[^/@?#[:space:]]+(:[0-9]+)?$')
  THEN RETURN FALSE; END IF;
 SELECT jsonb_agg(jsonb_build_object('targetId',t->>'targetId','dockerfile',t->>'dockerfile') ORDER BY ordinal)
 INTO projected FROM jsonb_array_elements(targets) WITH ORDINALITY AS item(t,ordinal);
 IF metadata->'releaseTargets' IS DISTINCT FROM projected THEN RETURN FALSE; END IF;
 RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION governed_release_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE review task_review_decisions;e agent_executions; readiness agent_executions;k api_keys;app applications;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
 SELECT * INTO review FROM task_review_decisions WHERE id=NEW.review_id AND workspace_id=NEW.workspace_id AND task_id=NEW.task_id;
 SELECT * INTO e FROM agent_executions WHERE id=review.execution_id;
 SELECT * INTO readiness FROM agent_executions WHERE id=NEW.release_execution_id AND workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND agent_host_id=NEW.host_id;
 SELECT * INTO k FROM api_keys WHERE id=NEW.releaser_credential_id AND workspace_id=NEW.workspace_id AND bound_agent_id=NEW.releaser_agent_id;
 SELECT * INTO app FROM applications WHERE id=NEW.application_id AND workspace_id=NEW.workspace_id;
 IF app.id IS NULL OR review.id IS NULL OR e.id IS NULL OR readiness.id IS NULL OR k.id IS NULL
  OR review.decision<>'approve' OR e.status<>'completed' OR e.context_invalidated_at IS NOT NULL
  OR e.application_id<>NEW.application_id OR review.material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex')
  OR NEW.snapshot->>'materialVersion' IS DISTINCT FROM review.material_version
  OR NEW.snapshot->>'commit' IS DISTINCT FROM review.evidence->>'reviewedCommit'
  OR NEW.snapshot->>'commit' IS DISTINCT FROM e.metadata->'resultRevision'->>'commit'
  OR NEW.releaser_agent_id=review.verifier_id OR NEW.releaser_agent_id::text=e.metadata->'executionContract'->'assignment'->>'agentId'
  OR review.verifier_id::text=e.metadata->'executionContract'->'assignment'->>'agentId'
  OR NOT governed_release_application_scope(app.metadata,NEW.snapshot->'manifest')
  OR readiness.status<>'completed' OR readiness.context_invalidated_at IS NOT NULL
  OR readiness.metadata->'executionContract'->'assignment'->>'agentId' IS DISTINCT FROM NEW.releaser_agent_id::text
  OR readiness.metadata->'executionContract'->'nativeBoundary'->>'profile' IS DISTINCT FROM 'inspect-readonly'
  OR readiness.metadata->'resultRevision'->>'commit' IS DISTINCT FROM NEW.snapshot->>'commit'
  OR readiness.verification->'readOnlyAudit'->>'verdict' IS DISTINCT FROM 'verified'
  OR readiness.verification->'readOnlyAudit'->'nativeTools' IS DISTINCT FROM '[]'::jsonb
  OR readiness.verification->'readOnlyAudit'->>'preTree' IS DISTINCT FROM readiness.verification->'readOnlyAudit'->>'postTree'
  OR readiness.changed_files IS DISTINCT FROM '[]'::jsonb
  OR readiness.verification->'managedAdmission'->>'qualification' IS DISTINCT FROM 'signed_native_v1'
  OR readiness.verification->'ownedTreeReceipt'->>'cleanup' IS DISTINCT FROM 'true'
  OR readiness.verification->'ownedTreeReceipt'->>'activeProcesses' IS DISTINCT FROM '0'
  OR NOT k.active OR k.revoked_at IS NOT NULL OR k.credential_version<>NEW.credential_version OR k.expires_at<=now()
  OR NOT k.scopes @> '["agent-runtime:release"]'::jsonb
  OR NEW.expires_at<=now() OR NEW.expires_at>now()+interval '60 minutes' OR NEW.expires_at>k.expires_at
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.issuer_user_id AND role='owner')
  THEN RAISE EXCEPTION 'governed_release_scope_invalid'; END IF;
 IF EXISTS(SELECT 1 FROM governed_releases r WHERE r.application_id=NEW.application_id
  AND ((NOT EXISTS(SELECT 1 FROM governed_release_revocations v WHERE v.release_id=r.id)
  AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN governed_release_outcomes x ON x.operation_id=o.id WHERE o.release_id=r.id AND o.operation='cleanup' AND (x.status='succeeded' OR x.status='reconciled' AND x.reconciled_status='succeeded')))
  OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=r.id AND COALESCE((SELECT x.status FROM governed_release_outcomes x WHERE x.operation_id=o.id ORDER BY x.sequence DESC LIMIT 1),'unresolved') IN ('unresolved','uncertain'))))
  THEN RAISE EXCEPTION 'governed_release_application_busy'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION governed_release_renewal_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;k api_keys;review task_review_decisions;e agent_executions;
 readiness agent_executions;agent workforce_entities;app applications;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT * INTO k FROM api_keys WHERE id=r.releaser_credential_id;
 SELECT * INTO review FROM task_review_decisions WHERE id=r.review_id;
 SELECT * INTO e FROM agent_executions WHERE id=review.execution_id;
 SELECT * INTO readiness FROM agent_executions WHERE id=r.release_execution_id;
 SELECT * INTO agent FROM workforce_entities WHERE id=r.releaser_agent_id;
 SELECT * INTO app FROM applications WHERE id=r.application_id;
 IF r.id IS NULL OR NEW.workspace_id IS DISTINCT FROM r.workspace_id
  OR NEW.issuer_user_id IS DISTINCT FROM r.issuer_user_id
  OR NEW.owner_authenticated_at>now() OR NEW.owner_authenticated_at<now()-interval '5 minutes'
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=r.workspace_id AND user_id=NEW.issuer_user_id AND role='owner')
  OR EXISTS(SELECT 1 FROM governed_release_revocations WHERE release_id=r.id)
  OR EXISTS(SELECT 1 FROM governed_release_operations o JOIN governed_release_outcomes x ON x.operation_id=o.id
     WHERE o.release_id=r.id AND o.operation='cleanup' AND (x.status='succeeded' OR x.status='reconciled' AND x.reconciled_status='succeeded'))
  OR NEW.sequence<>(SELECT COALESCE(max(sequence),0)+1 FROM governed_release_renewals WHERE release_id=r.id)
  OR NEW.previous_expires_at IS DISTINCT FROM governed_release_effective_expiry(r.id)
  OR NEW.expires_at<=now() OR NEW.expires_at>now()+interval '60 minutes' OR NEW.expires_at>k.expires_at
  OR k.id IS NULL OR k.workspace_id IS DISTINCT FROM r.workspace_id OR k.bound_agent_id IS DISTINCT FROM r.releaser_agent_id
  OR NOT k.active OR k.revoked_at IS NOT NULL OR k.credential_version<>r.credential_version OR k.expires_at<=now()
  OR NOT k.scopes @> '["agent-runtime:release"]'::jsonb
  OR agent.id IS NULL OR agent.workspace_id IS DISTINCT FROM r.workspace_id OR agent.status<>'active' OR agent.type<>'agent' OR agent.source='user'
  OR agent.updated_at IS DISTINCT FROM (r.snapshot->>'releaserRevision')::timestamp
  OR app.id IS NULL OR app.workspace_id IS DISTINCT FROM r.workspace_id OR app.status<>'active'
  OR NOT governed_release_application_scope(app.metadata,r.snapshot->'manifest')
  OR review.id IS NULL OR review.decision<>'approve' OR review.workspace_id IS DISTINCT FROM r.workspace_id OR review.task_id IS DISTINCT FROM r.task_id
  OR e.id IS NULL OR e.status<>'completed' OR e.context_invalidated_at IS NOT NULL OR e.application_id IS DISTINCT FROM r.application_id
  OR review.material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex')
  OR r.snapshot->>'materialVersion' IS DISTINCT FROM review.material_version
  OR r.snapshot->>'commit' IS DISTINCT FROM review.evidence->>'reviewedCommit'
  OR r.releaser_agent_id=review.verifier_id OR r.releaser_agent_id::text=e.metadata->'executionContract'->'assignment'->>'agentId'
  OR review.verifier_id::text=e.metadata->'executionContract'->'assignment'->>'agentId'
  OR e.metadata->'executionContract'->'nativeBoundary'->>'profile' IS DISTINCT FROM 'coding-local'
  OR e.metadata->'executionContract'->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses'
  OR e.metadata->'executionContract'->'modelSelection'->>'schemaVersion' IS DISTINCT FROM 'roost-managed-hermes-backend-v1'
  OR e.verification->'managedAdmission'->>'qualification' IS DISTINCT FROM 'signed_native_v1'
  OR COALESCE(e.verification->'managedAdmission'->>'evidenceDigest','')!~'^[a-f0-9]{64}$'
  OR COALESCE(e.verification->'managedAdmission'->>'jobSourceDigest','')!~'^[a-f0-9]{64}$'
  OR e.verification->'ownedTreeReceipt'->>'attempt' IS DISTINCT FROM e.id::text
  OR e.verification->'ownedTreeReceipt'->>'cleanup' IS DISTINCT FROM 'true'
  OR e.verification->'ownedTreeReceipt'->>'activeProcesses' IS DISTINCT FROM '0'
  OR readiness.id IS NULL OR readiness.workspace_id IS DISTINCT FROM r.workspace_id OR readiness.application_id IS DISTINCT FROM r.application_id
  OR readiness.agent_host_id IS DISTINCT FROM r.host_id OR readiness.status<>'completed' OR readiness.context_invalidated_at IS NOT NULL
  OR readiness.metadata->'executionContract'->'assignment'->>'agentId' IS DISTINCT FROM r.releaser_agent_id::text
  OR readiness.metadata->'executionContract'->'nativeBoundary'->>'profile' IS DISTINCT FROM 'inspect-readonly'
  OR readiness.metadata->'resultRevision'->>'commit' IS DISTINCT FROM r.snapshot->>'commit'
  OR readiness.changed_files IS DISTINCT FROM '[]'::jsonb
  OR readiness.verification->'readOnlyAudit'->>'verdict' IS DISTINCT FROM 'verified'
  OR readiness.verification->'readOnlyAudit'->'nativeTools' IS DISTINCT FROM '[]'::jsonb
  OR readiness.verification->'readOnlyAudit'->>'preTree' IS DISTINCT FROM readiness.verification->'readOnlyAudit'->>'postTree'
  OR readiness.verification->'managedAdmission'->>'qualification' IS DISTINCT FROM 'signed_native_v1'
  OR COALESCE(readiness.verification->'managedAdmission'->>'evidenceDigest','')!~'^[a-f0-9]{64}$'
  OR COALESCE(readiness.verification->'managedAdmission'->>'jobSourceDigest','')!~'^[a-f0-9]{64}$'
  OR readiness.verification->'ownedTreeReceipt'->>'attempt' IS DISTINCT FROM readiness.id::text
  OR readiness.verification->'ownedTreeReceipt'->>'cleanup' IS DISTINCT FROM 'true'
  OR readiness.verification->'ownedTreeReceipt'->>'activeProcesses' IS DISTINCT FROM '0'
  OR r.snapshot->>'readinessDigest' IS DISTINCT FROM encode(sha256(convert_to(task_review_material(readiness)::text,'UTF8')),'hex')
  OR r.snapshot->'manifest'->'backup'->>'restoreVerifiedAt' IS NULL
  OR (r.snapshot->'manifest'->'backup'->>'restoreVerifiedAt')::timestamp>now()+interval '60 seconds'
  OR (r.snapshot->'manifest'->'backup'->>'restoreVerifiedAt')::timestamp<now()-interval '24 hours'
  OR native_capability_blocked(r.workspace_id,r.task_id,r.application_id,'runtime_execute',r.releaser_agent_id,r.releaser_credential_id,r.host_id)
  THEN RAISE EXCEPTION 'governed_release_renewal_invalid'; END IF;
 RETURN NEW;
END $$;
COMMIT;
