BEGIN;

CREATE OR REPLACE FUNCTION preserve_context_stop_fence() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.context_invalidated_at IS NULL THEN RETURN NEW; END IF;
  -- BEGIN invalidated unclaimed cancellation exception
  -- A queue that never claimed a process has no native stop to acknowledge.
  -- Preserve every observation and context fence, including future columns.
  IF OLD.status = 'queued' AND OLD.attempt = 0 AND
    OLD.agent_host_id IS NULL AND OLD.started_at IS NULL AND
    OLD.lease_token IS NULL AND OLD.lease_expires_at IS NULL AND
    OLD.last_heartbeat_at IS NULL AND OLD.codex_thread_id IS NULL AND
    OLD.completed_at IS NULL AND OLD.context_stopped_at IS NULL AND
    NEW.status = 'cancelled' AND NEW.cancel_requested_at IS NOT NULL AND
    NEW.completed_at IS NOT NULL AND NEW.lease_token IS NULL AND
    NEW.lease_expires_at IS NULL AND NEW.context_invalidation IS NOT NULL AND
    (to_jsonb(NEW) - ARRAY['status', 'cancel_requested_at', 'completed_at', 'updated_at'])
      IS NOT DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status', 'cancel_requested_at', 'completed_at', 'updated_at'])
  THEN RETURN NEW; END IF;
  -- END invalidated unclaimed cancellation exception
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

COMMIT;
