BEGIN;
-- Preserve the existing review credential profile; a release credential adds one
-- explicit scope and still retains an immutable identity and expiry.
CREATE OR REPLACE FUNCTION agent_credential_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE w workforce_entities;
BEGIN
 IF TG_OP='DELETE' THEN IF OLD.bound_agent_id IS NOT NULL THEN RAISE EXCEPTION 'credential_history_retained'; END IF; RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND (OLD.bound_agent_id IS NOT NULL OR NEW.bound_agent_id IS NOT NULL) AND
  (NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.bound_agent_id IS DISTINCT FROM OLD.bound_agent_id OR
   NEW.key_hash IS DISTINCT FROM OLD.key_hash OR NEW.key IS DISTINCT FROM OLD.key OR NEW.key_prefix IS DISTINCT FROM OLD.key_prefix OR NEW.scopes IS DISTINCT FROM OLD.scopes OR NEW.expires_at IS DISTINCT FROM OLD.expires_at)
  THEN RAISE EXCEPTION 'credential_binding_immutable'; END IF;
 IF NEW.bound_agent_id IS NULL THEN RETURN NEW; END IF;
 IF NEW.key IS NOT NULL OR NEW.key_hash IS NULL OR NEW.key_prefix IS NULL OR NEW.expires_at IS NULL OR NEW.credential_version<1 THEN RAISE EXCEPTION 'credential_invalid'; END IF;
 IF NEW.scopes IS DISTINCT FROM '["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write"]'::jsonb
  AND NEW.scopes IS DISTINCT FROM '["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write","agent-runtime:release"]'::jsonb THEN RAISE EXCEPTION 'credential_scope_invalid'; END IF;
 SELECT * INTO w FROM workforce_entities WHERE id=NEW.bound_agent_id;
 IF w.workspace_id IS DISTINCT FROM NEW.workspace_id THEN RAISE EXCEPTION 'credential_workspace_mismatch'; END IF;
 IF NEW.active AND (w.type<>'agent' OR w.source='user' OR w.status<>'active' OR NEW.revoked_at IS NOT NULL) THEN RAISE EXCEPTION 'credential_agent_inactive'; END IF;
 IF TG_OP='UPDATE' AND OLD.revoked_at IS NOT NULL AND (NEW.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN RAISE EXCEPTION 'credential_revoked'; END IF;
 IF TG_OP='INSERT' OR NEW.active IS DISTINCT FROM OLD.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN UPDATE ready_source_fence SET revision=revision+1 WHERE id=1; END IF;
 IF TG_OP='UPDATE' AND (NEW.active IS DISTINCT FROM OLD.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN NEW.credential_version:=OLD.credential_version+1; END IF;
 RETURN NEW;
END $$;
-- Additive empty operational records; no application data or earlier evidence is modified.
CREATE TABLE governed_releases (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 release_execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE RESTRICT,
 review_id UUID NOT NULL REFERENCES task_review_decisions(id) ON DELETE RESTRICT,
 releaser_agent_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 releaser_credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
 credential_version INTEGER NOT NULL CHECK(credential_version>0),issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 expires_at TIMESTAMP(3) NOT NULL,manifest_digest TEXT NOT NULL CHECK(manifest_digest~'^[a-f0-9]{64}$'),
 configuration_digest TEXT NOT NULL CHECK(configuration_digest~'^[a-f0-9]{64}$'),snapshot JSONB NOT NULL,
 request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id)
);
CREATE INDEX governed_releases_application_idx ON governed_releases(application_id,created_at);
CREATE TABLE governed_release_operations (
 id UUID PRIMARY KEY,release_id UUID NOT NULL REFERENCES governed_releases(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 sequence INTEGER NOT NULL CHECK(sequence>0),operation TEXT NOT NULL CHECK(operation IN ('push','pr','review','merge','deploy_config','deploy','observe','rollback_config','rollback','cleanup_resource','archive_repository','cleanup_local','cleanup')),
 intent JSONB NOT NULL,request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(release_id,sequence),UNIQUE(workspace_id,request_id)
);
CREATE TABLE governed_release_outcomes (
 id UUID PRIMARY KEY,sequence SERIAL NOT NULL UNIQUE,release_id UUID NOT NULL REFERENCES governed_releases(id) ON DELETE RESTRICT,
 operation_id UUID NOT NULL REFERENCES governed_release_operations(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 status TEXT NOT NULL CHECK(status IN ('succeeded','failed','uncertain','reconciled')),
 reconciled_status TEXT CHECK(reconciled_status IN ('succeeded','absent','failed')),observation_only BOOLEAN NOT NULL,
 evidence JSONB NOT NULL,request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK((status='reconciled' AND reconciled_status IS NOT NULL AND observation_only) OR (status<>'reconciled' AND reconciled_status IS NULL)),
 UNIQUE(workspace_id,request_id)
);
CREATE INDEX governed_release_outcomes_operation_idx ON governed_release_outcomes(operation_id,sequence);
CREATE TABLE governed_release_revocations (
 id UUID PRIMARY KEY,release_id UUID NOT NULL REFERENCES governed_releases(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 1000),request_id UUID NOT NULL,request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(workspace_id,request_id),UNIQUE(release_id)
);
CREATE FUNCTION governed_release_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'governed_release_append_only'; END $$;
CREATE TRIGGER governed_release_immutable BEFORE UPDATE OR DELETE ON governed_releases FOR EACH ROW EXECUTE FUNCTION governed_release_immutable();
CREATE TRIGGER governed_release_operation_immutable BEFORE UPDATE OR DELETE ON governed_release_operations FOR EACH ROW EXECUTE FUNCTION governed_release_immutable();
CREATE TRIGGER governed_release_outcome_immutable BEFORE UPDATE OR DELETE ON governed_release_outcomes FOR EACH ROW EXECUTE FUNCTION governed_release_immutable();
CREATE TRIGGER governed_release_revocation_immutable BEFORE UPDATE OR DELETE ON governed_release_revocations FOR EACH ROW EXECUTE FUNCTION governed_release_immutable();
CREATE FUNCTION governed_release_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
  OR app.metadata->>'releasePurpose' IS DISTINCT FROM 'temporary_certification'
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
CREATE TRIGGER governed_release_insert_guard BEFORE INSERT ON governed_releases FOR EACH ROW EXECUTE FUNCTION governed_release_insert_guard();
CREATE FUNCTION governed_release_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;review task_review_decisions;e agent_executions;k api_keys;readiness agent_executions;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT * INTO review FROM task_review_decisions WHERE id=r.review_id;
 SELECT * INTO e FROM agent_executions WHERE id=review.execution_id;
 SELECT * INTO k FROM api_keys WHERE id=r.releaser_credential_id;
 SELECT * INTO readiness FROM agent_executions WHERE id=r.release_execution_id;
 IF r.id IS NULL OR NEW.workspace_id<>r.workspace_id OR NEW.application_id<>r.application_id OR r.expires_at<=now()
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
CREATE TRIGGER governed_release_operation_guard BEFORE INSERT ON governed_release_operations FOR EACH ROW EXECUTE FUNCTION governed_release_operation_guard();
CREATE FUNCTION governed_release_outcome_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE o governed_release_operations;r governed_releases; prior governed_release_outcomes;
BEGIN
 SELECT * INTO o FROM governed_release_operations WHERE id=NEW.operation_id;
 SELECT * INTO r FROM governed_releases WHERE id=o.release_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
 SELECT * INTO prior FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1;
 IF o.id IS NULL OR NEW.workspace_id<>o.workspace_id OR NEW.release_id<>o.release_id
  OR prior.id IS NOT NULL AND NOT(prior.status='uncertain' AND NEW.status='reconciled')
  OR (r.expires_at<=now() OR EXISTS(SELECT 1 FROM governed_release_revocations WHERE release_id=r.id)) AND NEW.status<>'reconciled'
  THEN RAISE EXCEPTION 'governed_release_outcome_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER governed_release_outcome_guard BEFORE INSERT ON governed_release_outcomes FOR EACH ROW EXECUTE FUNCTION governed_release_outcome_guard();
COMMIT;
