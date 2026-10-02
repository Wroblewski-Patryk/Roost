BEGIN;
-- Additive owner-authorized admission windows. Original grants and all existing
-- operation, outcome, revocation and review evidence remain immutable.
CREATE TABLE governed_release_renewals (
 id UUID PRIMARY KEY,release_id UUID NOT NULL REFERENCES governed_releases(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 sequence INTEGER NOT NULL CHECK(sequence>0),issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 owner_authenticated_at TIMESTAMP(3) NOT NULL,
 previous_expires_at TIMESTAMP(3) NOT NULL,expires_at TIMESTAMP(3) NOT NULL,
 expected_version TEXT NOT NULL CHECK(expected_version~'^[a-f0-9]{64}$'),
 request_id UUID NOT NULL,request_hash TEXT NOT NULL CHECK(request_hash~'^[a-f0-9]{64}$'),
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(expires_at>previous_expires_at),UNIQUE(release_id,sequence),UNIQUE(workspace_id,request_id)
);
CREATE TRIGGER governed_release_renewal_immutable BEFORE UPDATE OR DELETE ON governed_release_renewals
 FOR EACH ROW EXECUTE FUNCTION governed_release_immutable();
CREATE FUNCTION governed_release_effective_expiry(target_release UUID) RETURNS TIMESTAMP(3) LANGUAGE sql STABLE AS $$
 SELECT COALESCE((SELECT expires_at FROM governed_release_renewals WHERE release_id=target_release ORDER BY sequence DESC LIMIT 1),
                (SELECT expires_at FROM governed_releases WHERE id=target_release))
$$;
CREATE FUNCTION governed_release_renewal_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
  OR app.metadata->>'releasePurpose' IS DISTINCT FROM 'temporary_certification'
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
CREATE TRIGGER governed_release_renewal_guard BEFORE INSERT ON governed_release_renewals
 FOR EACH ROW EXECUTE FUNCTION governed_release_renewal_guard();
CREATE OR REPLACE FUNCTION governed_release_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;review task_review_decisions;e agent_executions;k api_keys;readiness agent_executions;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT * INTO review FROM task_review_decisions WHERE id=r.review_id;
 SELECT * INTO e FROM agent_executions WHERE id=review.execution_id;
 SELECT * INTO k FROM api_keys WHERE id=r.releaser_credential_id;
 SELECT * INTO readiness FROM agent_executions WHERE id=r.release_execution_id;
 IF r.id IS NULL OR NEW.workspace_id<>r.workspace_id OR NEW.application_id<>r.application_id OR governed_release_effective_expiry(r.id)<=now()
  OR EXISTS(SELECT 1 FROM governed_release_revocations WHERE release_id=r.id)
  OR NEW.intent->>'commit' IS DISTINCT FROM r.snapshot->>'commit' OR NEW.intent->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
  OR e.status<>'completed' OR e.context_invalidated_at IS NOT NULL OR review.material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex')
  OR review.evidence->>'reviewedCommit' IS DISTINCT FROM NEW.intent->>'commit'
  OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at<=now() OR k.credential_version<>r.credential_version
  OR readiness.status<>'completed' OR readiness.context_invalidated_at IS NOT NULL
  OR native_capability_blocked(r.workspace_id,r.task_id,r.application_id,'runtime_execute',r.releaser_agent_id,r.releaser_credential_id,r.host_id)
  THEN RAISE EXCEPTION 'governed_release_operation_invalid'; END IF;
 IF EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.application_id=r.application_id
  AND COALESCE((SELECT x.status FROM governed_release_outcomes x WHERE x.operation_id=o.id ORDER BY x.sequence DESC LIMIT 1),'unresolved') IN ('unresolved','uncertain'))
  THEN RAISE EXCEPTION 'governed_release_operation_unresolved'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION governed_release_outcome_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE o governed_release_operations;r governed_releases; prior governed_release_outcomes;
BEGIN
 SELECT * INTO o FROM governed_release_operations WHERE id=NEW.operation_id;
 SELECT * INTO r FROM governed_releases WHERE id=o.release_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT * INTO prior FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1;
 IF o.id IS NULL OR NEW.workspace_id<>o.workspace_id OR NEW.release_id<>o.release_id
  OR prior.id IS NOT NULL AND NOT(prior.status='uncertain' AND NEW.status='reconciled')
  OR (governed_release_effective_expiry(r.id)<=now() OR EXISTS(SELECT 1 FROM governed_release_revocations WHERE release_id=r.id)) AND NEW.status<>'reconciled'
  THEN RAISE EXCEPTION 'governed_release_outcome_invalid'; END IF;
 RETURN NEW;
END $$;
COMMIT;
