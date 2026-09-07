BEGIN;

-- Source writes and Ready admission acquire this fence before any source row
-- locks. Updating (rather than only locking) also fences stale SSI snapshots.
CREATE TABLE ready_source_fence (id INTEGER PRIMARY KEY CHECK (id = 1), revision BIGINT NOT NULL DEFAULT 0);
INSERT INTO ready_source_fence (id) VALUES (1);
CREATE TABLE task_ready_source_watches (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  predicate JSONB NOT NULL,
  PRIMARY KEY (task_id, source_table)
);
CREATE INDEX task_ready_source_watches_source_table_idx ON task_ready_source_watches(source_table);

CREATE FUNCTION ready_source_matches(row_data JSONB, filter JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE child JSONB;
BEGIN
  IF row_data IS NULL THEN RETURN FALSE; END IF;
  CASE filter->>'op'
    WHEN 'and' THEN
      FOR child IN SELECT value FROM jsonb_array_elements(filter->'args') LOOP
        IF NOT ready_source_matches(row_data, child) THEN RETURN FALSE; END IF;
      END LOOP;
      RETURN TRUE;
    WHEN 'or' THEN
      FOR child IN SELECT value FROM jsonb_array_elements(filter->'args') LOOP
        IF ready_source_matches(row_data, child) THEN RETURN TRUE; END IF;
      END LOOP;
      RETURN FALSE;
    WHEN 'not' THEN
      FOR child IN SELECT value FROM jsonb_array_elements(filter->'args') LOOP
        IF ready_source_matches(row_data, child) THEN RETURN FALSE; END IF;
      END LOOP;
      RETURN TRUE;
    WHEN 'eq' THEN RETURN (row_data->(filter->>'column')) IS NOT DISTINCT FROM filter->'value';
    WHEN 'in' THEN RETURN COALESCE((filter->'values') @> jsonb_build_array(row_data->(filter->>'column')), FALSE);
    ELSE RAISE EXCEPTION 'ready_source_predicate_unsupported';
  END CASE;
END $$;

CREATE FUNCTION ready_source_require_watch() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.execution_readiness->>'status' = 'ready' AND
    (NEW.execution_readiness->>'sourceWatchVersion' IS DISTINCT FROM '1' OR
     NOT EXISTS (SELECT 1 FROM task_ready_source_watches WHERE task_id = NEW.id)) THEN
    RAISE EXCEPTION 'ready_source_watch_required';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION ready_source_lock() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ready_source_fence SET revision = revision + 1 WHERE id = 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'ready_source_fence_missing'; END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION ready_source_invalidate() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  before_row JSONB; after_row JSONB; prior JSONB; current_row JSONB;
  watched RECORD; pin JSONB; changed JSONB; changes JSONB; stamp TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN before_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN after_row := to_jsonb(NEW); END IF;
  -- Ready bookkeeping is not an accepted source, including in linked projects.
  IF TG_TABLE_NAME = 'tasks' THEN
    before_row := before_row - 'execution_readiness';
    after_row := after_row - 'execution_readiness';
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

-- Existing acceptance has no persisted read scope; never silently backfill it.
INSERT INTO events (id, workspace_id, task_id, type, source, resource_type, resource_id, payload, updated_at)
SELECT gen_random_uuid(), workspace_id, id, 'task_execution_ready_invalidated', 'roost', 'task', id::text,
  jsonb_build_object('pinId', execution_readiness->>'pinId', 'revision', execution_readiness->>'revision', 'reason', 'source_watch_required'), now()
FROM tasks WHERE execution_readiness->>'status' = 'ready';
UPDATE tasks SET execution_readiness = execution_readiness || jsonb_build_object('status', 'needs_revalidation',
  'reason', 'source_watch_required', 'invalidatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
WHERE execution_readiness->>'status' = 'ready';

CREATE TRIGGER ready_source_require_watch BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION ready_source_require_watch();

DO $$ DECLARE source_table TEXT; BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'tasks', 'company_records', 'goals', 'targets', 'task_lists', 'projects', 'workforce_entities', 'users',
    'organizational_department_relations', 'organizational_scopes', 'entity_ownerships', 'workspace_departments',
    'dependencies', 'policies', 'procedures', 'procedure_steps', 'application_features', 'feature_definitions',
    'applications', 'resources', 'decisions', 'risks', 'controls', 'evidence_records', 'application_repositories',
    'application_technologies', 'technology_definitions', 'application_architecture_components', 'application_interfaces',
    'product_offerings', 'application_procedures', 'application_projects', 'processes', 'standards',
    'application_capabilities', 'capability_definitions', 'capability_domains', 'readiness_dimension_definitions',
    'capability_procedures', 'application_capability_dimensions', 'application_evidence', 'application_capability_dependencies'
  ] LOOP
    EXECUTE format('CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock()', source_table);
    EXECUTE format('CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate()', source_table);
  END LOOP;
END $$;

COMMIT;
