BEGIN;
-- Additive metadata on the existing credential system. No provisioning or seeds.
ALTER TABLE api_keys ADD COLUMN worker_host_id UUID REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 ADD COLUMN worker_installation_id UUID, ADD COLUMN worker_binding_epoch INT,
 ADD CONSTRAINT worker_credential_complete CHECK (
  (worker_host_id IS NULL AND worker_installation_id IS NULL AND worker_binding_epoch IS NULL) OR
  (worker_host_id IS NOT NULL AND worker_installation_id IS NOT NULL AND worker_binding_epoch IS NOT NULL AND worker_binding_epoch > 0
   AND bound_agent_id IS NULL AND key IS NULL AND key_hash IS NOT NULL AND expires_at IS NOT NULL));
CREATE UNIQUE INDEX worker_credential_active_host ON api_keys(workspace_id,worker_host_id)
 WHERE worker_host_id IS NOT NULL AND active AND revoked_at IS NULL;
CREATE FUNCTION worker_credential_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.worker_host_id IS NOT NULL THEN RAISE EXCEPTION 'worker_credential_history_retained'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.worker_host_id IS NOT NULL THEN
  IF (to_jsonb(NEW)-'active'-'revoked_at'-'last_used_at'-'updated_at'-'credential_version') IS DISTINCT FROM
     (to_jsonb(OLD)-'active'-'revoked_at'-'last_used_at'-'updated_at'-'credential_version')
   OR OLD.revoked_at IS NOT NULL AND (NEW.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
   OR NOT OLD.active AND NEW.active THEN RAISE EXCEPTION 'worker_credential_binding_immutable'; END IF;
  NEW.credential_version:=OLD.credential_version+CASE WHEN NEW.active IS DISTINCT FROM OLD.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN 1 ELSE 0 END;
 END IF;
 IF NEW.worker_host_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM agent_hosts h JOIN trusted_provider_ticket_keys k ON k.workspace_id=h.workspace_id
  WHERE h.id=NEW.worker_host_id AND h.workspace_id=NEW.workspace_id AND k.installation_id=NEW.worker_installation_id)
 THEN RAISE EXCEPTION 'worker_credential_binding_invalid'; END IF;
 IF NEW.worker_host_id IS NOT NULL THEN
  UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
  IF (NEW.scopes @> '["agent-runtime:claim"]'::jsonb) IS NOT TRUE THEN RAISE EXCEPTION 'worker_credential_binding_invalid'; END IF;
  IF TG_OP='INSERT' OR OLD.worker_host_id IS NULL THEN
   IF NEW.worker_binding_epoch <= COALESCE((SELECT max(worker_binding_epoch) FROM api_keys WHERE workspace_id=NEW.workspace_id AND worker_host_id=NEW.worker_host_id AND id<>NEW.id),0)
   THEN RAISE EXCEPTION 'worker_credential_epoch_stale'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_credential_guard BEFORE INSERT OR UPDATE OR DELETE ON api_keys FOR EACH ROW EXECUTE FUNCTION worker_credential_guard();
-- Immutable extension of the existing ticket ledger; no raw key or lease token.
CREATE TABLE trusted_provider_ticket_worker_bindings (
 ticket_id UUID PRIMARY KEY REFERENCES trusted_provider_tickets(id) ON DELETE RESTRICT,
 binding JSONB NOT NULL CHECK(jsonb_typeof(binding)='object'),
 credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
 host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT
);
CREATE FUNCTION worker_ticket_binding_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t trusted_provider_tickets;k api_keys;e agent_executions;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'owner_ticket_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 SELECT * INTO t FROM trusted_provider_tickets WHERE id=NEW.ticket_id;
 SELECT * INTO k FROM api_keys WHERE id=NEW.credential_id;
 SELECT * INTO e FROM agent_executions WHERE id=t.execution_id;
 IF t.state<>'issued' OR t.version<>1 OR k.id IS NULL OR NOT k.active OR k.revoked_at IS NOT NULL
  OR k.expires_at<=clock_timestamp() AT TIME ZONE 'UTC' OR e.id IS NULL OR e.status::text<>'claimed' OR e.attempt<>1
  OR e.lease_token IS NULL OR e.lease_expires_at IS NULL OR e.lease_expires_at<=clock_timestamp() AT TIME ZONE 'UTC'
  OR t.expires_at > least(k.expires_at,e.lease_expires_at) AT TIME ZONE 'UTC'
  OR k.bound_agent_id IS NOT NULL OR k.workspace_id IS DISTINCT FROM t.workspace_id OR k.worker_host_id IS DISTINCT FROM NEW.host_id
  OR e.agent_host_id IS DISTINCT FROM NEW.host_id OR k.worker_installation_id IS DISTINCT FROM t.installation_id
  OR NEW.binding IS DISTINCT FROM jsonb_build_object('credentialId',k.id,'workspaceId',k.workspace_id,'hostId',NEW.host_id,
    'installationId',k.worker_installation_id,'credentialVersion',k.credential_version,'bindingEpoch',k.worker_binding_epoch,
    'credentialFingerprint',encode(sha256(convert_to('roost-worker-ticket-v1:'||k.key_hash,'UTF8')),'hex'),
    'leaseTokenDigest',encode(sha256(convert_to(e.lease_token,'UTF8')),'hex'),'claimSessionId',e.checkpoint->>'sessionId',
    'expiresAt',to_char(least(k.expires_at,e.lease_expires_at),'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
 THEN RAISE EXCEPTION 'worker_ticket_binding_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_ticket_binding_guard BEFORE INSERT OR UPDATE OR DELETE ON trusted_provider_ticket_worker_bindings
 FOR EACH ROW EXECUTE FUNCTION worker_ticket_binding_guard();
COMMIT;
