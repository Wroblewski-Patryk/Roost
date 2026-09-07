BEGIN;

-- Never infer missing scope or upgrade historical acceptance.
INSERT INTO events (id, workspace_id, task_id, type, source, resource_type, resource_id, payload, updated_at)
SELECT gen_random_uuid(), workspace_id, id, 'task_execution_ready_invalidated', 'roost', 'task', id::text,
  jsonb_build_object('pinId', execution_readiness->>'pinId', 'revision', execution_readiness->>'revision', 'reason', 'single_task_scope_required'), now()
FROM tasks WHERE execution_readiness->>'status' = 'ready';
UPDATE tasks SET execution_readiness = execution_readiness || jsonb_build_object('status', 'needs_revalidation', 'reason', 'single_task_scope_required')
WHERE execution_readiness->>'status' = 'ready';

-- Guard the additive contract version during mixed old/new API rollout.
-- Full validation and same-transaction receipt checks remain in the Submit command.
CREATE FUNCTION task_require_single_scope() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE s JSONB; p JSONB;
BEGIN
  IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
  s := NEW.execution_readiness->'contract'->'singleTask';
  IF s->>'schemaVersion' IS DISTINCT FROM 'roost-single-task-v1' OR
    s->>'contractId' IS DISTINCT FROM 'roost-task:' || NEW.id::text OR
    s->>'branch' IS DISTINCT FROM 'codex/task-' || NEW.id::text OR
    s->>'applicationId' IS DISTINCT FROM NEW.execution_readiness->>'applicationId' OR
    jsonb_typeof(s->'measurement'->'target') IS DISTINCT FROM 'number' OR
    jsonb_typeof(s->'problems') IS DISTINCT FROM 'array'
  THEN RAISE EXCEPTION 'task_single_scope_required'; END IF;
  IF jsonb_array_length(s->'problems') NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'task_scope_split_required'; END IF;
  FOR p IN SELECT value FROM jsonb_array_elements(s->'problems') LOOP
    IF p->>'componentId' IS DISTINCT FROM s->'component'->>'id' OR
      p->>'outcome' IS DISTINCT FROM NEW.execution_readiness->'contract'->'objective'->>'outcome'
    THEN RAISE EXCEPTION 'task_scope_split_required'; END IF;
  END LOOP;
  IF jsonb_array_length(s->'problems') > 1 AND jsonb_typeof(s->'commonCause') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'task_scope_shared_cause_required';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER task_require_single_scope BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION task_require_single_scope();

COMMIT;
