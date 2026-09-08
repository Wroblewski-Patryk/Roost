BEGIN;

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
    'label', left(COALESCE(after_row->>'title', after_row->>'name', before_row->>'title', before_row->>'name', TG_TABLE_NAME), 200),
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
    changes := COALESCE(pin->'changedSources', '[]'::jsonb);
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
        jsonb_build_object('pinId', pin->>'pinId', 'revision', pin->>'revision', 'reason', 'context_changed', 'changedSources', jsonb_build_array(changed)), now());
    END IF;
  END LOOP;
  RETURN NULL;
END $$;

COMMIT;
