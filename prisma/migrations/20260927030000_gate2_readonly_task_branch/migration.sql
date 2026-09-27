BEGIN;

-- An inspection on the canonical checkout must not create a Git branch.
-- Preserve the task-owned branch invariant for every write-capable contract.
CREATE OR REPLACE FUNCTION task_require_single_scope() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE s JSONB; p JSONB; c JSONB; readonly_inspection BOOLEAN;
BEGIN
  IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
  c := NEW.execution_readiness->'contract';
  s := c->'singleTask';
  readonly_inspection := c->'nativeBoundary'->>'profile' = 'inspect-readonly'
    AND c->'access'->>'sandbox' = 'read-only'
    AND c->'access'->'tools' = '["repository_read"]'::jsonb
    AND c->'access'->'permissions' = '["repository_read"]'::jsonb
    AND c->'access'->>'externalWrites' = 'false'
    AND COALESCE(s->>'branch','') ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,119}$'
    AND s->>'branch' NOT LIKE '%..%'
    AND s->>'branch' NOT LIKE '%/';
  IF s->>'schemaVersion' IS DISTINCT FROM 'roost-single-task-v1' OR
    s->>'contractId' IS DISTINCT FROM 'roost-task:' || NEW.id::text OR
    (CASE WHEN c->'nativeBoundary'->>'profile' = 'inspect-readonly'
      THEN NOT COALESCE(readonly_inspection,false)
      ELSE s->>'branch' IS DISTINCT FROM 'codex/task-' || NEW.id::text END) OR
    s->>'applicationId' IS DISTINCT FROM NEW.execution_readiness->>'applicationId' OR
    jsonb_typeof(s->'measurement'->'target') IS DISTINCT FROM 'number' OR
    jsonb_typeof(s->'problems') IS DISTINCT FROM 'array'
  THEN RAISE EXCEPTION 'task_single_scope_required'; END IF;
  IF jsonb_array_length(s->'problems') NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'task_scope_split_required'; END IF;
  FOR p IN SELECT value FROM jsonb_array_elements(s->'problems') LOOP
    IF p->>'componentId' IS DISTINCT FROM s->'component'->>'id' OR
      p->>'outcome' IS DISTINCT FROM c->'objective'->>'outcome'
    THEN RAISE EXCEPTION 'task_scope_split_required'; END IF;
  END LOOP;
  IF jsonb_array_length(s->'problems') > 1 AND jsonb_typeof(s->'commonCause') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'task_scope_shared_cause_required';
  END IF;
  RETURN NEW;
END $$;

COMMIT;
