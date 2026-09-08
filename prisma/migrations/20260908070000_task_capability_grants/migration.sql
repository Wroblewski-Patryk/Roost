BEGIN;
CREATE TABLE task_capability_grants (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL, agent_id UUID NOT NULL,
 credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT, credential_version INTEGER NOT NULL,
 credential_class TEXT NOT NULL DEFAULT 'agent_review_v1' CHECK(credential_class='agent_review_v1'),
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE RESTRICT,
 operation TEXT NOT NULL CHECK(operation IN ('review_decision','return_to_executor','create_specialist_task')),
 valid_from TIMESTAMP(3) NOT NULL, valid_until TIMESTAMP(3) NOT NULL CHECK(valid_until>valid_from),
 issuer_user_id UUID NOT NULL, reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 1000),
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, scope_hash TEXT NOT NULL, snapshot JSONB NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(workspace_id,request_id)
);
CREATE INDEX task_capability_grants_workspace_id_task_id_created_at_idx ON task_capability_grants(workspace_id,task_id,created_at);
CREATE TABLE task_capability_revocations (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL, grant_id UUID NOT NULL UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, actor_user_id UUID NOT NULL,
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 1000), created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(workspace_id,request_id)
);
ALTER TABLE task_review_decisions ADD COLUMN capability_grant_id UUID UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT;
ALTER TABLE task_review_actions ADD COLUMN capability_grant_id UUID UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT;
CREATE TABLE task_capability_uses (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL, grant_id UUID NOT NULL UNIQUE REFERENCES task_capability_grants(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, decision_id UUID UNIQUE REFERENCES task_review_decisions(id) ON DELETE RESTRICT,
 action_id UUID UNIQUE REFERENCES task_review_actions(id) ON DELETE RESTRICT,
 post_scope_hash TEXT NOT NULL, snapshot JSONB NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id), CHECK((decision_id IS NOT NULL) <> (action_id IS NOT NULL))
);
-- Hash only: raw company/task/profile content is not copied into grant records.
CREATE FUNCTION task_capability_scope(task_uuid UUID, key_uuid UUID, issuer_uuid UUID) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; a applications; k api_keys; link application_projects; context JSONB;
BEGIN
 SELECT * INTO t FROM tasks WHERE id=task_uuid;
 IF NOT FOUND OR t.project_id IS NULL THEN RETURN NULL; END IF;
 IF (SELECT count(*) FROM application_projects WHERE project_id=t.project_id)<>1 THEN RETURN NULL; END IF;
 SELECT * INTO link FROM application_projects WHERE project_id=t.project_id;
 SELECT * INTO a FROM applications WHERE id=link.application_id AND workspace_id=t.workspace_id;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM projects WHERE id=t.project_id AND workspace_id=t.workspace_id) THEN RETURN NULL; END IF;
 SELECT * INTO e FROM agent_executions WHERE task_id=t.id AND workspace_id=t.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NOT FOUND OR e.application_id<>a.id OR jsonb_typeof(e.metadata->'executionContract'->'taskRoles') IS DISTINCT FROM 'object' THEN RETURN NULL; END IF;
 SELECT * INTO k FROM api_keys WHERE id=key_uuid AND workspace_id=t.workspace_id;
 IF NOT FOUND OR k.bound_agent_id IS NULL THEN RETURN NULL; END IF;
 context:=jsonb_build_object('task',to_jsonb(t),'application',jsonb_build_object('id',a.id,'revision',a.updated_at),
  'link',to_jsonb(link),'project',(SELECT jsonb_build_object('id',id,'revision',updated_at) FROM projects WHERE id=t.project_id),
  'material',task_review_material(e),'executionState',jsonb_build_object('status',e.status,'cancel',e.cancel_requested_at,'fence',e.context_invalidated_at),
  'roles',(SELECT jsonb_agg(jsonb_build_object('id',w.id,'workspace',w.workspace_id,'revision',w.updated_at,'type',w.type,'status',w.status,'source',w.source,'externalId',w.external_id,'role',w.role,'skills',w.skill_index,'mandates',w.authority_scope) ORDER BY w.id)
    FROM workforce_entities w WHERE w.id::text IN (SELECT value->>'id' FROM jsonb_each(e.metadata->'executionContract'->'taskRoles'))),
  'credential',jsonb_build_object('id',k.id,'agent',k.bound_agent_id,'version',k.credential_version,'active',k.active,'revoked',k.revoked_at,'expiry',k.expires_at),
  'issuer',(SELECT to_jsonb(m) FROM workspace_memberships m WHERE m.workspace_id=t.workspace_id AND m.user_id=issuer_uuid));
 RETURN encode(sha256(convert_to(context::text,'UTF8')),'hex');
END $$;
CREATE FUNCTION task_capability_base(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; k api_keys; w workforce_entities; role_name TEXT; utc_now TIMESTAMP:=clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
 IF EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id) THEN RETURN 'revoked'; END IF;
 IF g.valid_until<=utc_now THEN RETURN 'expired'; END IF;
 SELECT * INTO t FROM tasks WHERE id=g.task_id AND workspace_id=g.workspace_id;
 IF NOT FOUND OR t.status NOT IN ('todo','in_progress') THEN RETURN 'invalidated'; END IF;
 SELECT * INTO e FROM agent_executions WHERE task_id=t.id AND workspace_id=g.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NOT FOUND OR e.id<>g.execution_id OR e.application_id<>g.application_id OR e.status<>'completed' OR e.completed_at IS NULL OR e.cancel_requested_at IS NOT NULL OR e.context_invalidated_at IS NOT NULL THEN RETURN 'invalidated'; END IF;
 IF task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id) IS NULL THEN RETURN 'invalidated'; END IF;
 SELECT * INTO k FROM api_keys WHERE id=g.credential_id AND workspace_id=g.workspace_id AND bound_agent_id=g.agent_id;
 IF NOT FOUND OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at IS NULL OR k.expires_at<=utc_now OR k.credential_version<>g.credential_version OR NOT (k.scopes @> '["agent-runtime:write"]'::jsonb) THEN RETURN 'invalidated'; END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=g.workspace_id AND user_id=g.issuer_user_id AND role IN ('owner','admin')) THEN RETURN 'invalidated'; END IF;
 role_name:=CASE WHEN g.operation='review_decision' THEN 'verifier' ELSE 'accountableManager' END;
 SELECT * INTO w FROM workforce_entities WHERE id=g.agent_id AND workspace_id=g.workspace_id;
 IF NOT FOUND OR w.type<>'agent' OR w.status<>'active' OR w.source='user' OR w.id::text IS DISTINCT FROM e.metadata->'executionContract'->'taskRoles'->role_name->>'id' OR
  to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM e.metadata->'executionContract'->'taskRoles'->role_name->>'revision' OR
  NOT (w.authority_scope @> jsonb_build_array(CASE WHEN role_name='verifier' THEN 'task_verification' ELSE 'task_accountability' END)) THEN RETURN 'invalidated'; END IF;
 IF g.valid_from>utc_now THEN RETURN 'pending'; END IF;
 RETURN 'active';
END $$;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE state TEXT;
BEGIN
 IF EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN RETURN 'consumed'; END IF;
 state:=task_capability_base(g);
 IF state NOT IN ('active','pending') THEN RETURN state; END IF;
 IF g.scope_hash IS DISTINCT FROM task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id) THEN RETURN 'invalidated'; END IF;
 IF g.operation='review_decision' THEN
  IF EXISTS(SELECT 1 FROM task_review_decisions WHERE execution_id=g.execution_id) THEN RETURN 'invalidated'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM task_review_decisions d WHERE d.execution_id=g.execution_id AND d.decision='reject' AND NOT EXISTS(SELECT 1 FROM task_review_actions a WHERE a.review_id=d.id)) THEN RETURN 'invalidated'; END IF;
 END IF;
 RETURN state;
END $$;
CREATE FUNCTION task_capability_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE g task_capability_grants; d task_review_decisions; a task_review_actions; utc_now TIMESTAMP:=clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'capability_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF TG_TABLE_NAME='task_capability_grants' THEN
  IF task_capability_status(NEW) NOT IN ('active','pending') OR NEW.valid_from<utc_now-INTERVAL '1 minute' OR NEW.valid_until>utc_now+INTERVAL '1 hour' OR
   NEW.valid_until>(SELECT expires_at FROM api_keys WHERE id=NEW.credential_id) THEN RAISE EXCEPTION 'capability_scope_invalid'; END IF;
 ELSIF TG_TABLE_NAME='task_capability_revocations' THEN
  IF NOT EXISTS(SELECT 1 FROM task_capability_grants WHERE id=NEW.grant_id AND workspace_id=NEW.workspace_id) OR
   NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.actor_user_id AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'capability_revoke_forbidden'; END IF;
 ELSE
  SELECT * INTO g FROM task_capability_grants WHERE id=NEW.grant_id AND workspace_id=NEW.workspace_id;
  IF NOT FOUND OR task_capability_base(g)<>'active' OR NEW.post_scope_hash IS DISTINCT FROM task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id) THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  IF NEW.decision_id IS NOT NULL THEN
   SELECT * INTO d FROM task_review_decisions WHERE id=NEW.decision_id AND workspace_id=NEW.workspace_id;
   IF NOT FOUND OR d.capability_grant_id IS DISTINCT FROM g.id OR d.request_id<>NEW.request_id OR d.actor_agent_id IS DISTINCT FROM g.agent_id OR d.actor_credential_id IS DISTINCT FROM g.credential_id OR g.operation<>'review_decision' THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  ELSE
   SELECT * INTO a FROM task_review_actions WHERE id=NEW.action_id AND workspace_id=NEW.workspace_id;
   IF NOT FOUND OR a.capability_grant_id IS DISTINCT FROM g.id OR a.request_id<>NEW.request_id OR a.actor_agent_id IS DISTINCT FROM g.agent_id OR a.actor_credential_id IS DISTINCT FROM g.credential_id OR g.operation<>a.action THEN RAISE EXCEPTION 'capability_use_invalid'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_capability_guard BEFORE INSERT OR UPDATE OR DELETE ON task_capability_grants FOR EACH ROW EXECUTE FUNCTION task_capability_guard();
CREATE TRIGGER task_capability_guard BEFORE INSERT OR UPDATE OR DELETE ON task_capability_revocations FOR EACH ROW EXECUTE FUNCTION task_capability_guard();
CREATE TRIGGER task_capability_guard BEFORE INSERT OR UPDATE OR DELETE ON task_capability_uses FOR EACH ROW EXECUTE FUNCTION task_capability_guard();
CREATE FUNCTION task_review_capability_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE g task_capability_grants; operation_name TEXT;
BEGIN
 IF NEW.actor_agent_id IS NULL THEN
  IF NEW.capability_grant_id IS NOT NULL THEN RAISE EXCEPTION 'capability_agent_only'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.capability_grant_id IS NULL THEN RAISE EXCEPTION 'capability_grant_required'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN operation_name:='review_decision'; ELSE operation_name:=NEW.action; END IF;
 SELECT * INTO g FROM task_capability_grants WHERE id=NEW.capability_grant_id AND workspace_id=NEW.workspace_id AND task_id=NEW.task_id AND agent_id=NEW.actor_agent_id AND credential_id=NEW.actor_credential_id AND operation=operation_name FOR UPDATE;
 IF NOT FOUND OR task_capability_status(g)<>'active' THEN RAISE EXCEPTION 'capability_grant_denied'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_review_capability_guard BEFORE INSERT ON task_review_decisions FOR EACH ROW EXECUTE FUNCTION task_review_capability_guard();
CREATE TRIGGER task_review_capability_guard BEFORE INSERT ON task_review_actions FOR EACH ROW EXECUTE FUNCTION task_review_capability_guard();
CREATE FUNCTION task_capability_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.actor_agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM task_capability_uses u JOIN task_capability_grants g ON g.id=u.grant_id
   WHERE u.grant_id=NEW.capability_grant_id AND g.valid_until>(clock_timestamp() AT TIME ZONE 'UTC') AND
    (CASE WHEN TG_TABLE_NAME='task_review_decisions' THEN u.decision_id=NEW.id ELSE u.action_id=NEW.id END))
 THEN RAISE EXCEPTION 'capability_receipt_required'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER task_capability_receipt_guard AFTER INSERT ON task_review_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_capability_receipt_guard();
CREATE CONSTRAINT TRIGGER task_capability_receipt_guard AFTER INSERT ON task_review_actions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_capability_receipt_guard();
COMMIT;
