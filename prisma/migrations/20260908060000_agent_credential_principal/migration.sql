BEGIN;
ALTER TABLE api_keys ADD COLUMN bound_agent_id UUID REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 ADD COLUMN expires_at TIMESTAMP(3), ADD COLUMN revoked_at TIMESTAMP(3), ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX api_keys_active_agent ON api_keys(bound_agent_id) WHERE bound_agent_id IS NOT NULL AND active AND revoked_at IS NULL;
CREATE TABLE agent_credential_operations (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL, request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT, actor_user_id UUID NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('create','rotate','revoke')), snapshot JSONB NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id)
);
CREATE FUNCTION agent_credential_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE w workforce_entities;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.bound_agent_id IS NOT NULL THEN RAISE EXCEPTION 'credential_history_retained'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND (OLD.bound_agent_id IS NOT NULL OR NEW.bound_agent_id IS NOT NULL) AND
  (NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.bound_agent_id IS DISTINCT FROM OLD.bound_agent_id OR
   NEW.key_hash IS DISTINCT FROM OLD.key_hash OR NEW.key IS DISTINCT FROM OLD.key OR NEW.key_prefix IS DISTINCT FROM OLD.key_prefix OR NEW.scopes IS DISTINCT FROM OLD.scopes OR NEW.expires_at IS DISTINCT FROM OLD.expires_at)
 THEN RAISE EXCEPTION 'credential_binding_immutable'; END IF;
 IF NEW.bound_agent_id IS NULL THEN RETURN NEW; END IF;
 IF NEW.key IS NOT NULL OR NEW.key_hash IS NULL OR NEW.key_prefix IS NULL OR NEW.expires_at IS NULL OR NEW.credential_version<1
  THEN RAISE EXCEPTION 'credential_invalid'; END IF;
 IF NEW.scopes IS DISTINCT FROM '["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write"]'::jsonb THEN RAISE EXCEPTION 'credential_scope_invalid'; END IF;
 SELECT * INTO w FROM workforce_entities WHERE id=NEW.bound_agent_id;
 IF w.workspace_id IS DISTINCT FROM NEW.workspace_id THEN RAISE EXCEPTION 'credential_workspace_mismatch'; END IF;
 IF NEW.active AND (w.type<>'agent' OR w.source='user' OR w.status<>'active' OR NEW.revoked_at IS NOT NULL) THEN RAISE EXCEPTION 'credential_agent_inactive'; END IF;
 IF TG_OP='UPDATE' AND OLD.revoked_at IS NOT NULL AND (NEW.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN RAISE EXCEPTION 'credential_revoked'; END IF;
 IF TG_OP='INSERT' OR NEW.active IS DISTINCT FROM OLD.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
  UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.active IS DISTINCT FROM OLD.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN NEW.credential_version:=OLD.credential_version+1; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agent_credential_guard BEFORE INSERT OR UPDATE OR DELETE ON api_keys FOR EACH ROW EXECUTE FUNCTION agent_credential_guard();
CREATE FUNCTION agent_identity_credentials_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.type IS DISTINCT FROM OLD.type OR NEW.source IS DISTINCT FROM OLD.source OR NEW.external_id IS DISTINCT FROM OLD.external_id OR NEW.runtime_external_id IS DISTINCT FROM OLD.runtime_external_id OR NEW.status<>'active' THEN
  INSERT INTO events(id,workspace_id,type,source,actor_type,actor_id,resource_type,resource_id,payload,updated_at)
   SELECT gen_random_uuid(),workspace_id,'api_key.agent_invalidated','agent_identity_guard','system',NULL,'api_key',id::text,
    jsonb_build_object('agentId',bound_agent_id,'credentialId',id,'credentialPrefix',key_prefix,'reason','agent_identity_changed'),CURRENT_TIMESTAMP
   FROM api_keys WHERE bound_agent_id=OLD.id AND revoked_at IS NULL;
  UPDATE api_keys SET active=false,revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE bound_agent_id=OLD.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agent_identity_credentials_guard BEFORE UPDATE ON workforce_entities FOR EACH ROW EXECUTE FUNCTION agent_identity_credentials_guard();
CREATE FUNCTION agent_credential_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'credential_audit_append_only'; END IF;
 IF NOT EXISTS(SELECT 1 FROM api_keys k WHERE k.id=NEW.key_id AND k.workspace_id=NEW.workspace_id AND k.bound_agent_id IS NOT NULL AND k.bound_agent_id::text=NEW.snapshot->>'agentId') OR
  NOT EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id AND m.role IN ('owner','admin')) THEN RAISE EXCEPTION 'credential_audit_identity'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agent_credential_operation_guard BEFORE INSERT OR UPDATE OR DELETE ON agent_credential_operations FOR EACH ROW EXECUTE FUNCTION agent_credential_operation_guard();
ALTER TABLE task_review_decisions ALTER COLUMN actor_user_id DROP NOT NULL,
 ADD COLUMN actor_agent_id UUID, ADD COLUMN actor_credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT,
 ADD COLUMN actor_credential_prefix TEXT,
 ADD CONSTRAINT task_review_decisions_actor CHECK (
 (actor_user_id IS NOT NULL AND actor_agent_id IS NULL AND actor_credential_id IS NULL AND actor_credential_prefix IS NULL) OR
 (actor_user_id IS NULL AND actor_agent_id IS NOT NULL AND actor_credential_id IS NOT NULL AND actor_credential_prefix IS NOT NULL));
ALTER TABLE task_review_actions ALTER COLUMN actor_user_id DROP NOT NULL,
 ADD COLUMN actor_agent_id UUID, ADD COLUMN actor_credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT,
 ADD COLUMN actor_credential_prefix TEXT,
 ADD CONSTRAINT task_review_actions_actor CHECK (
 (actor_user_id IS NOT NULL AND actor_agent_id IS NULL AND actor_credential_id IS NULL AND actor_credential_prefix IS NULL) OR
 (actor_user_id IS NULL AND actor_agent_id IS NOT NULL AND actor_credential_id IS NOT NULL AND actor_credential_prefix IS NOT NULL));
CREATE OR REPLACE FUNCTION task_review_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; d task_review_decisions; w workforce_entities; r JSONB; expected_role TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'task_review_append_only'; END IF;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'task_review_workspace_mismatch'; END IF;
 SELECT * INTO e FROM agent_executions WHERE task_id=t.id AND workspace_id=NEW.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR e.status <> 'completed' OR e.context_invalidated_at IS NOT NULL OR e.completed_at IS NULL THEN RAISE EXCEPTION 'task_review_result_required'; END IF;
 r := e.metadata->'executionContract'->'taskRoles';
 IF t.execution_readiness->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId' THEN RAISE EXCEPTION 'task_review_stale'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF NEW.execution_id<>e.id OR NEW.snapshot->'result' IS DISTINCT FROM task_review_material(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;
   IF NEW.verifier_id::text IS DISTINCT FROM r->'verifier'->>'id' OR NEW.manager_id::text IS DISTINCT FROM r->'accountableManager'->>'id' THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
   IF jsonb_typeof(NEW.evidence->'evidence') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'evidence')=0 OR length(COALESCE(NEW.evidence->>'summary',''))<3 THEN RAISE EXCEPTION 'task_review_evidence_required'; END IF;
   IF NEW.decision='reject' AND (jsonb_typeof(NEW.evidence->'reproduction') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'reproduction')=0 OR length(COALESCE(NEW.evidence->>'expected',''))<3 OR length(COALESCE(NEW.evidence->>'observed',''))<3 OR jsonb_typeof(NEW.evidence->'correction'->'scope') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'correction'->'scope')=0) THEN RAISE EXCEPTION 'task_review_evidence_required'; END IF;
   SELECT * INTO w FROM workforce_entities WHERE id=NEW.verifier_id AND workspace_id=NEW.workspace_id;
   expected_role := 'verifier';
 ELSE
   SELECT * INTO d FROM task_review_decisions WHERE id=NEW.review_id AND task_id=t.id AND workspace_id=NEW.workspace_id;
   IF NOT FOUND OR d.decision<>'reject' OR d.execution_id<>e.id OR d.snapshot->'result' IS DISTINCT FROM task_review_material(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;
   IF NEW.manager_id<>d.manager_id THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
   IF NOT ((d.evidence->'correction'->'scope') @> (NEW.correction->'scope')) OR
    (NEW.correction - 'scope') IS DISTINCT FROM ((d.evidence->'correction') - 'scope') THEN RAISE EXCEPTION 'task_review_scope_expanded'; END IF;
   IF NEW.child_task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tasks c WHERE c.id=NEW.child_task_id AND c.workspace_id=NEW.workspace_id AND c.execution_readiness->>'status'='draft') THEN RAISE EXCEPTION 'task_review_child_invalid'; END IF;
   SELECT * INTO w FROM workforce_entities WHERE id=NEW.manager_id AND workspace_id=NEW.workspace_id;
   expected_role := 'accountableManager';
 END IF;
 IF w.id IS NULL OR w.status<>'active' OR length(COALESCE(w.role,''))=0 OR
   w.id::text IS DISTINCT FROM r->expected_role->>'id' OR
   to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM r->expected_role->>'revision' OR
   NOT (
    (NEW.actor_user_id IS NOT NULL AND w.type='human' AND w.source='user' AND w.external_id=NEW.actor_user_id::text AND EXISTS (SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id AND m.role IN ('owner','admin','member'))) OR
    (NEW.actor_user_id IS NULL AND w.type='agent' AND w.source<>'user' AND NEW.actor_agent_id=w.id AND EXISTS (
      SELECT 1 FROM api_keys k WHERE k.id=NEW.actor_credential_id AND k.workspace_id=NEW.workspace_id AND k.bound_agent_id=w.id AND k.active AND k.revoked_at IS NULL AND k.expires_at>clock_timestamp()
      AND k.key_prefix=NEW.actor_credential_prefix AND k.scopes @> '["agent-runtime:write"]'::jsonb))
   ) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF NOT (w.authority_scope @> jsonb_build_array(CASE WHEN expected_role='verifier' THEN 'task_verification' ELSE 'task_accountability' END)) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF t.execution_role_provenance IS NULL OR t.execution_role_provenance->'authors' @> jsonb_build_array(jsonb_build_object('kind',CASE WHEN NEW.actor_user_id IS NULL THEN 'agent' ELSE 'user' END,'id',COALESCE(NEW.actor_user_id,NEW.actor_agent_id)::text)) THEN RAISE EXCEPTION 'task_review_self_review'; END IF;
   IF NOT (w.skill_index @> (e.metadata->'executionContract'->'assignment'->'competencies')) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 END IF;
 RETURN NEW;
END $$;

COMMIT;
