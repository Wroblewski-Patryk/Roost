BEGIN;

ALTER TABLE agent_executions ADD COLUMN context_invalidated_at TIMESTAMP(3),
  ADD COLUMN context_stopped_at TIMESTAMP(3), ADD COLUMN context_invalidation JSONB;

-- Include old API mutations in the same source/admission ordering during rollout.
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON agent_executions
FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();

CREATE FUNCTION active_context_stop() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE execution RECORD; signal JSONB; first_change BOOLEAN; changes JSONB;
BEGIN
  IF NEW.execution_readiness IS NULL OR NEW.execution_readiness->>'status' = 'ready' THEN RETURN NULL; END IF;
  changes := COALESCE(NEW.execution_readiness->'changedSources', '[]'::jsonb);
  FOR execution IN SELECT * FROM agent_executions
    WHERE task_id = NEW.id AND status IN ('claimed', 'running', 'waiting_for_approval')
    ORDER BY id FOR UPDATE
  LOOP
    first_change := execution.context_invalidated_at IS NULL;
    IF NOT first_change AND execution.context_invalidation->'changedSources' IS NOT DISTINCT FROM changes THEN CONTINUE; END IF;
    signal := COALESCE(execution.context_invalidation, jsonb_build_object(
      'schemaVersion', 'roost-context-stop-v1', 'pinId', execution.metadata->'readyContextPin'->>'pinId',
      'revision', execution.metadata->'readyContextPin'->>'revision', 'attempt', execution.attempt,
      'checkpointVersion', execution.checkpoint_version, 'reason', 'context_changed'))
      || jsonb_build_object('changedSources', changes);
    UPDATE agent_executions SET context_invalidated_at = COALESCE(context_invalidated_at, clock_timestamp()),
      context_invalidation = signal,
      error_state = jsonb_build_object('code', 'agent_execution_context_invalidated', 'retryable', false,
        'message', 'Accepted context changed. Work must stop and the owner must review and accept a new context.')
      WHERE id = execution.id;
    INSERT INTO agent_execution_events (id, workspace_id, execution_id, type, level, message, payload)
      VALUES (gen_random_uuid(), execution.workspace_id, execution.id,
        CASE WHEN first_change THEN 'context_stop_requested' ELSE 'context_sources_changed' END, 'warning',
        'Accepted context changed; this attempt cannot continue or resume.', signal);
  END LOOP;
  RETURN NULL;
END $$;

CREATE TRIGGER active_context_stop AFTER UPDATE OF execution_readiness ON tasks
FOR EACH ROW EXECUTE FUNCTION active_context_stop();

CREATE FUNCTION preserve_context_stop_fence() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.context_invalidated_at IS NULL THEN RETURN NEW; END IF;
  IF NEW.context_invalidated_at IS DISTINCT FROM OLD.context_invalidated_at OR
    NEW.context_invalidation IS NULL OR
    (to_jsonb(NEW) - ARRAY['context_invalidation', 'context_stopped_at', 'error_state', 'status', 'cancel_requested_at', 'completed_at', 'lease_token', 'lease_expires_at', 'updated_at'])
      IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['context_invalidation', 'context_stopped_at', 'error_state', 'status', 'cancel_requested_at', 'completed_at', 'lease_token', 'lease_expires_at', 'updated_at']) OR
    (NEW.completed_at IS DISTINCT FROM OLD.completed_at AND NOT (NEW.status = 'cancelled' AND OLD.context_stopped_at IS NOT NULL AND NEW.cancel_requested_at IS NOT NULL)) OR
    (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'waiting_for_approval' AND
      NOT (NEW.status = 'cancelled' AND OLD.context_stopped_at IS NOT NULL AND NEW.cancel_requested_at IS NOT NULL)) OR
    ((NEW.lease_token IS DISTINCT FROM OLD.lease_token OR NEW.lease_expires_at IS DISTINCT FROM OLD.lease_expires_at) AND
      NOT (NEW.status = 'cancelled' AND OLD.context_stopped_at IS NOT NULL AND NEW.cancel_requested_at IS NOT NULL AND NEW.lease_token IS NULL AND NEW.lease_expires_at IS NULL)) OR
    (OLD.context_stopped_at IS NOT NULL AND NEW.context_stopped_at IS DISTINCT FROM OLD.context_stopped_at)
  THEN RAISE EXCEPTION 'agent_execution_context_invalidated'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_context_stop_fence BEFORE UPDATE ON agent_executions
FOR EACH ROW EXECUTE FUNCTION preserve_context_stop_fence();

-- Active attempts invalidated before deployment must also stop; no backfilled admission.
UPDATE tasks SET execution_readiness = execution_readiness
WHERE execution_readiness->>'status' = 'needs_revalidation';

COMMIT;
