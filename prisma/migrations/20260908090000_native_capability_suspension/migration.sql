-- Additive, empty-on-upgrade security history. No existing incidents are classified.
BEGIN;
CREATE TABLE native_capability_suspensions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 incident_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 operation TEXT NOT NULL CHECK(operation IN ('review_decision','return_to_executor','create_specialist_task','runtime_execute')),
 agent_id UUID REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT,
 host_id UUID REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 2000),
 scope_proof TEXT NOT NULL CHECK(length(scope_proof) BETWEEN 3 AND 2000),
 broader_reason TEXT CHECK(length(broader_reason) BETWEEN 3 AND 2000),
 request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id),
 CHECK(operation='runtime_execute' OR host_id IS NULL),
 CHECK(operation<>'runtime_execute' OR credential_id IS NULL),
 CHECK(agent_id IS NOT NULL OR credential_id IS NOT NULL OR host_id IS NOT NULL OR broader_reason IS NOT NULL)
);
CREATE INDEX native_suspension_scope ON native_capability_suspensions(workspace_id,task_id,operation);
CREATE TABLE native_suspension_journal (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 suspension_id UUID NOT NULL REFERENCES native_capability_suspensions(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>1),
 action TEXT NOT NULL CHECK(action IN ('evidence','verify','restore','reject','reopen','manual_intervention')),
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 evidence_id UUID REFERENCES native_suspension_journal(id) ON DELETE RESTRICT,
 payload JSONB NOT NULL CHECK(jsonb_typeof(payload)='object'),
 request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(suspension_id,version), UNIQUE(workspace_id,request_id)
);
CREATE FUNCTION native_suspension_active(s UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT COALESCE((SELECT action<>'restore' FROM native_suspension_journal WHERE suspension_id=s
  AND action IN ('restore','reopen','reject','manual_intervention') ORDER BY version DESC LIMIT 1),true)
$$;
CREATE FUNCTION native_capability_blocked(w UUID,t UUID,a UUID,op TEXT,principal UUID,credential UUID,host UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM native_capability_suspensions s WHERE s.workspace_id=w AND s.task_id=t AND s.application_id=a AND s.operation=op
  AND (s.agent_id IS NULL OR s.agent_id=principal) AND (s.credential_id IS NULL OR s.credential_id=credential)
  AND (s.host_id IS NULL OR s.host_id=host) AND native_suspension_active(s.id))
$$;
-- Preserve all existing grant guards and add a durable deny. Restoration never
-- revives a grant issued before the latest suspension/reopen of its exact scope.
ALTER FUNCTION task_capability_base(task_capability_grants) RENAME TO task_capability_base_before_suspension;
CREATE FUNCTION task_capability_base(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 IF native_capability_blocked(g.workspace_id,g.task_id,g.application_id,g.operation,g.agent_id,g.credential_id,NULL) THEN RETURN 'suspended'; END IF;
 IF EXISTS(SELECT 1 FROM native_capability_suspensions s WHERE s.workspace_id=g.workspace_id AND s.task_id=g.task_id AND s.application_id=g.application_id
  AND s.operation=g.operation AND (s.agent_id IS NULL OR s.agent_id=g.agent_id) AND (s.credential_id IS NULL OR s.credential_id=g.credential_id)
  AND GREATEST(s.created_at,COALESCE((SELECT max(created_at) FROM native_suspension_journal WHERE suspension_id=s.id AND action IN ('reopen','reject','manual_intervention')),s.created_at))>=g.created_at)
 THEN RETURN 'invalidated'; END IF;
 RETURN task_capability_base_before_suspension(g);
END $$;
CREATE FUNCTION native_suspension_fence(s native_capability_suspensions, manual BOOLEAN DEFAULT false) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
 -- Manual intervention invalidates the named task, without changing business
 -- content or attempting undo. A host-only stop does not invalidate other hosts.
 IF manual OR (s.operation='runtime_execute' AND s.host_id IS NULL AND
  (s.agent_id IS NULL OR s.agent_id=(SELECT assigned_workforce_entity_id FROM tasks WHERE id=s.task_id))) THEN
  UPDATE tasks SET execution_readiness=COALESCE(execution_readiness,'{}'::jsonb)||jsonb_build_object('status','needs_revalidation','reason','context_changed',
   'invalidatedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'suspensionId',s.id,'manualIntervention',manual)
   WHERE id=s.task_id AND workspace_id=s.workspace_id;
 END IF;
 IF manual OR s.operation='runtime_execute' THEN
  UPDATE agent_executions e SET context_invalidated_at=COALESCE(e.context_invalidated_at,clock_timestamp()),
   status=CASE WHEN e.status='queued' AND e.attempt=0 AND e.lease_token IS NULL THEN 'cancelled'::"AgentExecutionStatus" ELSE e.status END,
   cancel_requested_at=CASE WHEN e.status='queued' AND e.attempt=0 AND e.lease_token IS NULL THEN clock_timestamp() ELSE e.cancel_requested_at END,
   completed_at=CASE WHEN e.status='queued' AND e.attempt=0 AND e.lease_token IS NULL THEN clock_timestamp() ELSE e.completed_at END,
   context_invalidation=jsonb_build_object('schemaVersion','roost-context-stop-v1','reason','context_changed','suspensionId',s.id,'manualIntervention',manual,'changedSources','[]'::jsonb),
   error_state=jsonb_build_object('code','agent_execution_context_invalidated','retryable',false,'message','Capability suspended or owner intervention recorded. Stop and reread context before replanning.')
   WHERE e.workspace_id=s.workspace_id AND e.task_id=s.task_id AND e.application_id=s.application_id
    AND e.status IN ('queued','claimed','running','waiting_for_approval')
    AND (manual OR ((s.host_id IS NULL OR s.host_id=e.agent_host_id) AND (s.agent_id IS NULL OR s.agent_id::text=e.metadata->'executionContract'->'assignment'->>'agentId')));
 END IF;
END $$;
CREATE FUNCTION native_suspension_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE s native_capability_suspensions; evidence native_suspension_journal; verification native_suspension_journal; current_version INTEGER; role_name TEXT; item TEXT;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'native_suspension_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF TG_TABLE_NAME='native_capability_suspensions' THEN
  SELECT role INTO role_name FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.issuer_user_id;
  IF role_name IS NULL OR role_name NOT IN ('owner','admin') OR (NEW.broader_reason IS NOT NULL AND role_name<>'owner') THEN RAISE EXCEPTION 'native_suspension_forbidden'; END IF;
  IF NOT EXISTS(SELECT 1 FROM company_records WHERE id=NEW.incident_id AND workspace_id=NEW.workspace_id AND record_type='technical_incident') OR
   NOT EXISTS(SELECT 1 FROM tasks t JOIN application_projects l ON l.project_id=t.project_id JOIN applications a ON a.id=l.application_id
    WHERE t.id=NEW.task_id AND t.workspace_id=NEW.workspace_id AND a.id=NEW.application_id AND a.workspace_id=NEW.workspace_id) OR
   (NEW.agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workforce_entities WHERE id=NEW.agent_id AND workspace_id=NEW.workspace_id AND type='agent')) OR
   (NEW.credential_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM api_keys WHERE id=NEW.credential_id AND workspace_id=NEW.workspace_id AND bound_agent_id=NEW.agent_id)) OR
   (NEW.host_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM agent_hosts WHERE id=NEW.host_id AND workspace_id=NEW.workspace_id))
  THEN RAISE EXCEPTION 'native_suspension_scope_invalid'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO s FROM native_capability_suspensions WHERE id=NEW.suspension_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'native_suspension_scope_invalid'; END IF;
 SELECT COALESCE(max(version),1) INTO current_version FROM native_suspension_journal WHERE suspension_id=s.id;
 IF NEW.version<>current_version+1 THEN RAISE EXCEPTION 'native_suspension_stale'; END IF;
 SELECT role INTO role_name FROM workspace_memberships WHERE workspace_id=s.workspace_id AND user_id=NEW.actor_user_id;
 IF role_name IS NULL OR role_name NOT IN ('owner','admin','member') OR (NEW.action IN ('restore','reopen','reject','manual_intervention') AND role_name<>'owner') THEN RAISE EXCEPTION 'native_suspension_forbidden'; END IF;
 IF NEW.action='evidence' THEN
  IF NOT native_suspension_active(s.id) THEN RAISE EXCEPTION 'native_suspension_stale'; END IF;
  FOREACH item IN ARRAY ARRAY['cause','impact','remediation','regressionProof','limitations'] LOOP
   IF jsonb_typeof(NEW.payload->item) IS DISTINCT FROM 'string' OR length(trim(NEW.payload->>item)) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'native_suspension_evidence_incomplete'; END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=s.workspace_id AND user_id::text=NEW.payload->>'repairAuthorUserId' AND role IN ('owner','admin','member')) THEN RAISE EXCEPTION 'native_suspension_evidence_incomplete'; END IF;
 ELSIF NEW.action IN ('verify','restore') THEN
  SELECT * INTO evidence FROM native_suspension_journal WHERE suspension_id=s.id AND action='evidence' ORDER BY version DESC LIMIT 1;
  IF NOT FOUND OR NEW.evidence_id IS DISTINCT FROM evidence.id OR NOT native_suspension_active(s.id) OR EXISTS(SELECT 1 FROM native_suspension_journal WHERE suspension_id=s.id AND version>evidence.version AND action IN ('reject','reopen','manual_intervention')) THEN RAISE EXCEPTION 'native_suspension_evidence_stale'; END IF;
  IF NEW.action='verify' THEN
   IF NEW.actor_user_id=evidence.actor_user_id OR NEW.actor_user_id::text=evidence.payload->>'repairAuthorUserId' OR length(trim(COALESCE(NEW.payload->>'assessment',''))) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'native_suspension_independent_verifier_required'; END IF;
  ELSE
   SELECT * INTO verification FROM native_suspension_journal WHERE suspension_id=s.id AND action='verify' AND evidence_id=evidence.id ORDER BY version DESC LIMIT 1;
   IF NOT FOUND OR verification.actor_user_id=evidence.actor_user_id OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=s.workspace_id AND user_id=verification.actor_user_id AND role IN ('owner','admin','member')) THEN RAISE EXCEPTION 'native_suspension_verification_required'; END IF;
  END IF;
 END IF;
 IF NEW.action IN ('restore','reject','reopen','manual_intervention') AND length(trim(COALESCE(NEW.payload->>'reason',''))) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'native_suspension_reason_required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER native_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON native_capability_suspensions FOR EACH ROW EXECUTE FUNCTION native_suspension_guard();
CREATE TRIGGER native_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON native_suspension_journal FOR EACH ROW EXECUTE FUNCTION native_suspension_guard();
CREATE FUNCTION native_suspension_effect() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE s native_capability_suspensions; manual BOOLEAN:=false;
BEGIN
 IF TG_TABLE_NAME='native_capability_suspensions' THEN s:=NEW;
 ELSE
  IF NEW.action NOT IN ('reopen','reject','manual_intervention') THEN RETURN NULL; END IF;
  SELECT * INTO s FROM native_capability_suspensions WHERE id=NEW.suspension_id;
  manual:=NEW.action='manual_intervention';
 END IF;
 PERFORM native_suspension_fence(s,manual);
 RETURN NULL;
END $$;
CREATE TRIGGER native_suspension_effect AFTER INSERT ON native_capability_suspensions FOR EACH ROW EXECUTE FUNCTION native_suspension_effect();
CREATE TRIGGER native_suspension_effect AFTER INSERT ON native_suspension_journal FOR EACH ROW EXECUTE FUNCTION native_suspension_effect();
CREATE FUNCTION native_runtime_suspension_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE principal UUID;
BEGIN
 -- Safe stop/cancel/failure reports remain possible; no authority is renewed.
 IF TG_OP='UPDATE' AND (NEW.context_invalidated_at IS NOT NULL OR NEW.status IN ('failed','cancelled')) THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.lease_expires_at IS NOT DISTINCT FROM OLD.lease_expires_at AND NEW.checkpoint_version=OLD.checkpoint_version AND NEW.status=OLD.status THEN RETURN NEW; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 SELECT assigned_workforce_entity_id INTO principal FROM tasks WHERE id=NEW.task_id;
 IF native_capability_blocked(NEW.workspace_id,NEW.task_id,NEW.application_id,'runtime_execute',principal,NULL,NEW.agent_host_id) THEN RAISE EXCEPTION 'native_capability_suspended'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER native_runtime_suspension_guard BEFORE INSERT OR UPDATE ON agent_executions FOR EACH ROW EXECUTE FUNCTION native_runtime_suspension_guard();
CREATE FUNCTION native_review_suspension_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE app UUID; op TEXT;
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF TG_TABLE_NAME='task_review_decisions' THEN
  SELECT application_id INTO app FROM agent_executions WHERE id=NEW.execution_id; op:='review_decision';
 ELSE
  SELECT e.application_id INTO app FROM task_review_decisions d JOIN agent_executions e ON e.id=d.execution_id WHERE d.id=NEW.review_id; op:=NEW.action;
 END IF;
 IF native_capability_blocked(NEW.workspace_id,NEW.task_id,app,op,NEW.actor_agent_id,NEW.actor_credential_id,NULL) THEN RAISE EXCEPTION 'native_capability_suspended'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER native_review_suspension_guard BEFORE INSERT ON task_review_decisions FOR EACH ROW EXECUTE FUNCTION native_review_suspension_guard();
CREATE TRIGGER native_review_suspension_guard BEFORE INSERT ON task_review_actions FOR EACH ROW EXECUTE FUNCTION native_review_suspension_guard();
COMMIT;
