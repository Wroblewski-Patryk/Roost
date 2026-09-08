-- Forward-only: change future derived notifications; no historical row scan or rewrite.
BEGIN;

-- Structural projection only: secret detection remains in the shared JS policy.
-- Never copy arbitrary historical labels or malformed technical references.
CREATE FUNCTION runtime_source_references(input JSONB) RETURNS JSONB LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('table', item->>'table', 'id', item->>'id',
    'label', 'Source changed', 'operation', item->>'operation', 'changedAt',
    CASE WHEN item->>'changedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$' THEN item->>'changedAt' ELSE NULL END)), '[]'::jsonb)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(input) = 'array' THEN input ELSE '[]'::jsonb END) item
  WHERE item->>'id' ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
    AND item->>'operation' IN ('insert', 'update', 'delete')
    AND EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname=item->>'table' AND t.tgname='ready_source_changed');
$$;

-- Admission-owned provenance is fingerprinted through roleAuthorities, not a mutable source.
-- Its writes still require an exact same-transaction Submit receipt.
CREATE OR REPLACE FUNCTION ready_source_invalidate() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  before_row JSONB; after_row JSONB; prior JSONB; current_row JSONB;
  watched RECORD; pin JSONB; changed JSONB; changes JSONB; stamp TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN before_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN after_row := to_jsonb(NEW); END IF;
  -- Ready bookkeeping is not an accepted source, including in linked projects.
  IF TG_TABLE_NAME = 'tasks' THEN
    before_row := before_row - 'execution_readiness' - 'execution_role_provenance';
    after_row := after_row - 'execution_readiness' - 'execution_role_provenance';
    IF (before_row - 'updated_at') IS NOT DISTINCT FROM (after_row - 'updated_at') THEN RETURN NULL; END IF;
  END IF;
  IF before_row IS NOT DISTINCT FROM after_row THEN RETURN NULL; END IF;
  stamp := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  changed := jsonb_build_object('table', TG_TABLE_NAME, 'id', COALESCE(after_row->>'id', before_row->>'id'),
    'label', 'Source changed',
    'operation', lower(TG_OP), 'changedAt', stamp);
  FOR watched IN
    SELECT t.id, t.workspace_id, t.execution_readiness, w.predicate
    FROM task_ready_source_watches w JOIN tasks t ON t.id = w.task_id
    WHERE w.source_table = TG_TABLE_NAME
      AND t.execution_readiness->>'sourceWatchVersion' = '1'
      AND t.execution_readiness->>'status' IN ('ready', 'needs_revalidation')
      AND (ready_source_matches(before_row, w.predicate) OR ready_source_matches(after_row, w.predicate))
    ORDER BY t.id FOR UPDATE OF t
  LOOP
    IF TG_TABLE_NAME = 'tasks' AND COALESCE(after_row->>'id', before_row->>'id') = watched.id::text THEN
      prior := before_row - 'updated_at'; current_row := after_row - 'updated_at';
      IF prior->>'status' IN ('todo', 'in_progress') THEN prior := jsonb_set(prior, '{status}', '"todo"'); END IF;
      IF current_row->>'status' IN ('todo', 'in_progress') THEN current_row := jsonb_set(current_row, '{status}', '"todo"'); END IF;
      IF prior IS NOT DISTINCT FROM current_row THEN CONTINUE; END IF;
    END IF;
    pin := watched.execution_readiness;
    changes := runtime_source_references(pin->'changedSources');
    -- One entry per source and one transition event per acceptance. Preserve
    -- the first change even when a writer repeats or reverts it before a read.
    IF NOT changes @> jsonb_build_array(jsonb_build_object('table', changed->>'table', 'id', changed->>'id')) THEN
      changes := changes || jsonb_build_array(changed);
    END IF;
    UPDATE tasks SET execution_readiness = pin || jsonb_build_object('status', 'needs_revalidation',
      'reason', 'context_changed', 'invalidatedAt', COALESCE(pin->>'invalidatedAt', stamp), 'changedSources', changes)
      WHERE id = watched.id;
    IF pin->>'status' = 'ready' THEN
      INSERT INTO events (id, workspace_id, task_id, type, source, resource_type, resource_id, payload, updated_at)
      VALUES (gen_random_uuid(), watched.workspace_id, watched.id, 'task_execution_ready_invalidated', 'roost', 'task', watched.id::text,
        jsonb_build_object('pinId', CASE WHEN pin->>'pinId' ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' THEN pin->>'pinId' ELSE NULL END, 'revision', CASE WHEN pin->>'revision' ~ '^[a-f0-9]{64}$' THEN pin->>'revision' ELSE NULL END, 'reason', 'context_changed', 'changedSources', jsonb_build_array(changed)), now());
    END IF;
  END LOOP;
  RETURN NULL;
END $$;


CREATE OR REPLACE FUNCTION active_context_stop() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE execution RECORD; signal JSONB; first_change BOOLEAN; changes JSONB;
BEGIN
  IF NEW.execution_readiness IS NULL OR NEW.execution_readiness->>'status' = 'ready' THEN RETURN NULL; END IF;
  changes := runtime_source_references(NEW.execution_readiness->'changedSources');
  FOR execution IN SELECT * FROM agent_executions
    WHERE task_id = NEW.id AND status IN ('claimed', 'running', 'waiting_for_approval')
    ORDER BY id FOR UPDATE
  LOOP
    first_change := execution.context_invalidated_at IS NULL;
    IF NOT first_change AND execution.context_invalidation->'changedSources' IS NOT DISTINCT FROM changes THEN CONTINUE; END IF;
    signal := jsonb_build_object(
      'schemaVersion', 'roost-context-stop-v1', 'pinId', CASE WHEN execution.metadata->'readyContextPin'->>'pinId' ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' THEN execution.metadata->'readyContextPin'->>'pinId' ELSE NULL END,
      'revision', CASE WHEN execution.metadata->'readyContextPin'->>'revision' ~ '^[a-f0-9]{64}$' THEN execution.metadata->'readyContextPin'->>'revision' ELSE NULL END, 'attempt', execution.attempt,
      'checkpointVersion', execution.checkpoint_version, 'reason', 'context_changed')
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


COMMIT;
