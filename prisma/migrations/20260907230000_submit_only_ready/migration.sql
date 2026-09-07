BEGIN;

-- Durable command receipts contain hashes and bounded results, never rejected input.
CREATE TABLE task_execution_submissions (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  request_hash TEXT NOT NULL,
  transaction_id BIGINT NOT NULL DEFAULT txid_current(),
  pin_digest TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, request_id)
);

-- Earlier acceptance is historical evidence, not evidence of this command contract.
INSERT INTO events (id, workspace_id, task_id, type, source, resource_type, resource_id, payload, updated_at)
SELECT gen_random_uuid(), workspace_id, id, 'task_execution_ready_invalidated', 'roost', 'task', id::text,
  jsonb_build_object('pinId', execution_readiness->>'pinId', 'revision', execution_readiness->>'revision', 'reason', 'submission_required'), now()
FROM tasks WHERE execution_readiness->>'status' = 'ready';
UPDATE tasks SET execution_readiness = execution_readiness || jsonb_build_object(
  'status', 'needs_revalidation', 'reason', 'submission_required')
WHERE execution_readiness->>'status' = 'ready';
UPDATE tasks SET execution_readiness = '{"status":"draft"}'::jsonb WHERE execution_readiness IS NULL;
ALTER TABLE tasks ALTER COLUMN execution_readiness SET DEFAULT '{"status":"draft"}'::jsonb;
ALTER TABLE tasks ALTER COLUMN execution_readiness SET NOT NULL;

CREATE FUNCTION task_submit_only_ready() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.execution_readiness := COALESCE(NEW.execution_readiness, '{"status":"draft"}'::jsonb);
  IF NEW.execution_readiness->>'status' IS NULL OR NEW.execution_readiness->>'status' NOT IN
    ('draft', 'needs_context', 'needs_decision', 'needs_revalidation', 'ready') THEN
    RAISE EXCEPTION 'task_execution_state_invalid';
  END IF;
  IF NEW.execution_readiness->>'status' <> 'ready' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.id = OLD.id AND NEW.workspace_id = OLD.workspace_id AND NEW.execution_readiness IS NOT DISTINCT FROM OLD.execution_readiness THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM task_execution_submissions s JOIN workspace_memberships m
      ON m.user_id = s.actor_id AND m.workspace_id = NEW.workspace_id
    WHERE s.task_id = NEW.id AND s.request_id::text = NEW.execution_readiness->>'submissionId'
      AND s.transaction_id = txid_current() AND m.role IN ('owner', 'admin', 'member')
      AND s.pin_digest = encode(sha256(convert_to(NEW.execution_readiness::text, 'UTF8')), 'hex')
      AND s.result->'readiness'->>'status' = 'ready'
  ) THEN RAISE EXCEPTION 'task_submit_for_execution_required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER task_submit_only_ready BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION task_submit_only_ready();

CREATE FUNCTION preserve_task_submission_receipt() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR EXISTS (SELECT 1 FROM tasks WHERE id = OLD.task_id) THEN
    RAISE EXCEPTION 'task_submission_receipt_immutable';
  END IF;
  RETURN OLD; -- Allow only the owning task's deletion cascade.
END $$;
CREATE TRIGGER preserve_task_submission_receipt BEFORE UPDATE OR DELETE ON task_execution_submissions
FOR EACH ROW EXECUTE FUNCTION preserve_task_submission_receipt();

COMMIT;
