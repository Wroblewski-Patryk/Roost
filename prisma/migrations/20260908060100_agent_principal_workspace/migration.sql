BEGIN;
CREATE OR REPLACE FUNCTION agent_identity_credentials_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id) AND EXISTS(SELECT 1 FROM api_keys WHERE bound_agent_id=OLD.id)
 THEN RAISE EXCEPTION 'credential_agent_identity_immutable'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.type IS DISTINCT FROM OLD.type OR NEW.source IS DISTINCT FROM OLD.source OR NEW.external_id IS DISTINCT FROM OLD.external_id OR NEW.runtime_external_id IS DISTINCT FROM OLD.runtime_external_id OR NEW.status<>'active' THEN
  INSERT INTO events(id,workspace_id,type,source,actor_type,actor_id,resource_type,resource_id,payload,updated_at)
   SELECT gen_random_uuid(),workspace_id,'api_key.agent_invalidated','agent_identity_guard','system',NULL,'api_key',id::text,
    jsonb_build_object('agentId',bound_agent_id,'credentialId',id,'credentialPrefix',key_prefix,'reason','agent_identity_changed'),CURRENT_TIMESTAMP
   FROM api_keys WHERE bound_agent_id=OLD.id AND revoked_at IS NULL;
  UPDATE api_keys SET active=false,revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE bound_agent_id=OLD.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
