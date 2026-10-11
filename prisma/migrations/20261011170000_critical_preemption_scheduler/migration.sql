-- G14 scheduler: preserve exact owner confirmation and native stop evidence.
-- No existing records are changed or deleted.
CREATE TABLE critical_preemptions (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  incident_record_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
  incident_revision TIMESTAMP(3) NOT NULL,
  incident_digest TEXT NOT NULL,
  critical_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  incoming_execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE RESTRICT,
  incumbent_execution_id UUID NOT NULL UNIQUE REFERENCES agent_executions(id) ON DELETE RESTRICT,
  host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expected_version INTEGER NOT NULL CHECK (expected_version > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','stopped')),
  stop_receipt JSONB,
  stopped_checkpoint JSONB,
  stopped_version INTEGER,
  requested_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  stopped_at TIMESTAMP(3),
  CHECK ((status='requested' AND stop_receipt IS NULL AND stopped_checkpoint IS NULL AND stopped_version IS NULL AND stopped_at IS NULL)
      OR (status='stopped' AND stop_receipt IS NOT NULL AND stopped_checkpoint IS NOT NULL AND stopped_version IS NOT NULL AND stopped_at IS NOT NULL))
);
CREATE INDEX critical_preemptions_incoming ON critical_preemptions(workspace_id,incoming_execution_id);
CREATE INDEX critical_preemptions_status ON critical_preemptions(workspace_id,status,requested_at);

-- A retained/expired lease still owns its host until an acknowledged stop.
CREATE UNIQUE INDEX agent_executions_one_active_host
  ON agent_executions(agent_host_id)
  WHERE agent_host_id IS NOT NULL AND status IN ('claimed','running','waiting_for_approval');

CREATE FUNCTION critical_preemption_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'requested' OR NEW.status <> 'stopped'
     OR ROW(NEW.id,NEW.workspace_id,NEW.incident_record_id,NEW.incident_revision,
       NEW.incident_digest,NEW.critical_task_id,NEW.incoming_execution_id,
       NEW.incumbent_execution_id,NEW.host_id,NEW.owner_user_id,NEW.expected_version,
       NEW.reason,NEW.requested_at) IS DISTINCT FROM
       ROW(OLD.id,OLD.workspace_id,OLD.incident_record_id,OLD.incident_revision,
       OLD.incident_digest,OLD.critical_task_id,OLD.incoming_execution_id,
       OLD.incumbent_execution_id,OLD.host_id,OLD.owner_user_id,OLD.expected_version,
       OLD.reason,OLD.requested_at)
  THEN RAISE EXCEPTION 'critical_preemption_history_immutable'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER critical_preemption_history_update BEFORE UPDATE ON critical_preemptions
  FOR EACH ROW EXECUTE FUNCTION critical_preemption_history_guard();
CREATE TRIGGER critical_preemption_history_delete BEFORE DELETE ON critical_preemptions
  FOR EACH ROW EXECUTE FUNCTION critical_preemption_history_guard();
