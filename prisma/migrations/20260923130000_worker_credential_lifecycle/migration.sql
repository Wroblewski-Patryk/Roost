BEGIN;
-- Forward-only extension of ApiKey and its existing append-only operation ledger.
-- No rows, credentials, business data or installation state are populated.
CREATE UNIQUE INDEX worker_credential_decision_once ON agent_credential_operations
 (workspace_id,(snapshot->>'decisionId')) WHERE snapshot->>'credentialClass'='worker_host_v1';

CREATE FUNCTION worker_credential_invalidate(kid UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE k api_keys;
BEGIN
 SELECT * INTO k FROM api_keys WHERE id=kid;
 IF k.worker_host_id IS NULL OR k.active AND k.revoked_at IS NULL THEN RETURN; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 UPDATE trusted_provider_tickets t SET state='revoked',version=t.version+1,revoked_at=clock_timestamp()
 WHERE t.state='issued' AND EXISTS(SELECT 1 FROM trusted_provider_ticket_worker_bindings b WHERE b.ticket_id=t.id AND b.credential_id=kid);
 -- Preserve attempts/checkpoints/lease identity for explicit reconciliation.
 -- An old process is not presumed stopped; no restart/lease transfer is allowed.
 UPDATE agent_executions SET context_invalidated_at=COALESCE(context_invalidated_at,clock_timestamp()),
  cancel_requested_at=COALESCE(cancel_requested_at,clock_timestamp()),
  context_invalidation=COALESCE(context_invalidation,jsonb_build_object('reason','worker_credential_revoked','credentialId',kid)),
  error_state=jsonb_build_object('code','worker_credential_revoked','retryable',false),updated_at=clock_timestamp()
 WHERE workspace_id=k.workspace_id AND agent_host_id=k.worker_host_id AND status IN ('claimed','running','waiting_for_approval')
  AND context_invalidated_at IS NULL;
END $$;
CREATE FUNCTION worker_credential_revoked_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.worker_host_id IS NOT NULL AND (NEW.active IS DISTINCT FROM OLD.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
 THEN PERFORM worker_credential_invalidate(NEW.id); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_credential_revoked_guard AFTER UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION worker_credential_revoked_guard();

CREATE FUNCTION worker_credential_scope_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.worker_host_id IS NOT NULL AND NEW.scopes IS DISTINCT FROM '["agent-runtime:claim"]'::jsonb
 THEN RAISE EXCEPTION 'worker_credential_scope_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_credential_scope_guard BEFORE INSERT ON api_keys FOR EACH ROW EXECUTE FUNCTION worker_credential_scope_guard();
CREATE FUNCTION worker_host_credentials_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.status='disabled' THEN
  UPDATE api_keys SET active=false,revoked_at=clock_timestamp(),updated_at=clock_timestamp()
   WHERE worker_host_id=OLD.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_host_credentials_guard BEFORE UPDATE ON agent_hosts FOR EACH ROW EXECUTE FUNCTION worker_host_credentials_guard();

CREATE FUNCTION worker_credential_decision_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.body ? 'workerCredential' AND (NEW.body ? 'authority' OR NEW.body->'workerCredential'->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text
  OR NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id)) THEN RAISE EXCEPTION 'worker_credential_decision_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_credential_decision_guard BEFORE INSERT ON decision_revisions FOR EACH ROW EXECUTE FUNCTION worker_credential_decision_guard();

CREATE OR REPLACE FUNCTION agent_credential_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE k api_keys; old_key api_keys; declaration JSONB; rev INT; accepted_by UUID; accepted_agent UUID; authority JSONB; expected JSONB;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'credential_audit_append_only'; END IF;
 SELECT * INTO k FROM api_keys WHERE id=NEW.key_id AND workspace_id=NEW.workspace_id;
 IF k.worker_host_id IS NULL THEN
  -- Preserve the original agent-principal ledger authority/identity guard.
  IF k.bound_agent_id IS NULL OR k.bound_agent_id::text IS DISTINCT FROM NEW.snapshot->>'agentId' OR
   NOT EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id AND m.role IN ('owner','admin'))
   THEN RAISE EXCEPTION 'credential_audit_identity'; END IF;
  RETURN NEW;
 END IF;
 SELECT r.body->'workerCredential',r.version,a.actor_user_id,a.actor_agent_id,a.authority INTO declaration,rev,accepted_by,accepted_agent,authority
 FROM decision_revisions r JOIN decision_acceptances a ON a.decision_id=r.decision_id JOIN decisions d ON d.id=r.decision_id
 WHERE r.decision_id=(NEW.snapshot->>'decisionId')::uuid AND r.workspace_id=NEW.workspace_id AND d.status='accepted' AND decision_state(d.id)='accepted'
 AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id);
 IF declaration IS NULL OR NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) OR accepted_by IS DISTINCT FROM NEW.actor_user_id
  OR accepted_agent IS NOT NULL OR authority->>'status' IS DISTINCT FROM 'owner_reserved' OR rev IS DISTINCT FROM (NEW.snapshot->>'decisionRevision')::int
  OR declaration IS DISTINCT FROM NEW.snapshot->'intent' OR (declaration->>'validUntil')::timestamptz<=clock_timestamp()
  OR declaration->>'action' IS DISTINCT FROM CASE WHEN NEW.action='create' THEN 'enroll' ELSE NEW.action END
  OR declaration->>'installationId' IS DISTINCT FROM k.worker_installation_id::text OR declaration->>'hostId' IS DISTINCT FROM k.worker_host_id::text
  OR declaration->>'workspaceId' IS DISTINCT FROM k.workspace_id::text
  OR k.scopes IS DISTINCT FROM '["agent-runtime:claim"]'::jsonb
 THEN RAISE EXCEPTION 'worker_credential_audit_authority'; END IF;
 SELECT * INTO old_key FROM api_keys WHERE id=(declaration->>'expectedCredentialId')::uuid;
 IF NEW.action='revoke' THEN
  IF k.id IS DISTINCT FROM old_key.id OR k.active OR k.revoked_at IS NULL OR k.credential_version IS DISTINCT FROM (declaration->>'expectedVersion')::int+1
   OR k.worker_binding_epoch IS DISTINCT FROM (declaration->>'expectedEpoch')::int
   OR encode(sha256(convert_to('roost-worker-ticket-v1:'||k.key_hash,'UTF8')),'hex') IS DISTINCT FROM declaration->>'expectedFingerprint'
   THEN RAISE EXCEPTION 'worker_credential_audit_transition'; END IF;
 ELSE
  IF NOT k.active OR k.revoked_at IS NOT NULL OR k.credential_version<>1 OR k.worker_binding_epoch IS DISTINCT FROM (declaration->>'expectedEpoch')::int+1
   OR to_char(k.expires_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM declaration->>'expiresAt'
   THEN RAISE EXCEPTION 'worker_credential_audit_transition'; END IF;
  IF old_key.id IS NULL THEN
   IF NEW.action<>'create' OR declaration->>'expectedCredentialId' IS NOT NULL OR (declaration->>'expectedEpoch')::int<>0
    OR EXISTS(SELECT 1 FROM api_keys prior WHERE prior.worker_host_id=k.worker_host_id AND prior.workspace_id=k.workspace_id AND prior.id<>k.id)
    THEN RAISE EXCEPTION 'worker_credential_audit_transition'; END IF;
  ELSIF old_key.active OR old_key.revoked_at IS NULL OR old_key.workspace_id IS DISTINCT FROM k.workspace_id OR old_key.worker_host_id IS DISTINCT FROM k.worker_host_id
   OR old_key.worker_installation_id IS DISTINCT FROM k.worker_installation_id OR old_key.worker_binding_epoch IS DISTINCT FROM (declaration->>'expectedEpoch')::int
   OR old_key.credential_version IS DISTINCT FROM (declaration->>'expectedVersion')::int+CASE WHEN NEW.action='rotate' THEN 1 ELSE 0 END
   OR encode(sha256(convert_to('roost-worker-ticket-v1:'||old_key.key_hash,'UTF8')),'hex') IS DISTINCT FROM declaration->>'expectedFingerprint'
   THEN RAISE EXCEPTION 'worker_credential_audit_transition'; END IF;
 END IF;
 expected:=jsonb_build_object('id',k.id,'workspaceId',k.workspace_id,'installationId',k.worker_installation_id,'hostId',k.worker_host_id,
  'version',k.credential_version,'epoch',k.worker_binding_epoch,'fingerprint',encode(sha256(convert_to('roost-worker-ticket-v1:'||k.key_hash,'UTF8')),'hex'),
  'active',k.active,'revokedAt',CASE WHEN k.revoked_at IS NULL THEN NULL ELSE to_char(k.revoked_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
  'expiresAt',to_char(k.expires_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'scopes',k.scopes,'credentialClass','worker_host_v1',
  'decisionId',NEW.snapshot->>'decisionId','decisionRevision',rev,'intent',declaration);
 IF NEW.snapshot IS DISTINCT FROM expected THEN RAISE EXCEPTION 'worker_credential_audit_snapshot'; END IF;
 RETURN NEW;
END $$;
COMMIT;
