-- G20 is additive. Existing Goal, Target, Metric and execution rows are retained.
-- A legacy Target.current_value is never an accepted measurement by itself.
ALTER TABLE targets ALTER COLUMN current_value DROP DEFAULT;
ALTER TABLE goals ADD CONSTRAINT goals_id_workspace_unique UNIQUE (id, workspace_id);
ALTER TABLE evidence_records ADD CONSTRAINT evidence_records_id_workspace_unique UNIQUE (id, workspace_id);
ALTER TABLE agent_executions ADD COLUMN goal_id_at_queue uuid;
ALTER TABLE agent_executions ADD COLUMN mandate_version_id_at_queue uuid;
ALTER TABLE agent_executions ADD COLUMN parent_goal_id_at_queue uuid;

CREATE TABLE goal_mandate_versions (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL,
  version integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'adopted', 'superseded')),
  result text NOT NULL CHECK (length(btrim(result)) BETWEEN 1 AND 2000),
  metric text NOT NULL CHECK (length(btrim(metric)) BETWEEN 1 AND 240),
  unit text NOT NULL CHECK (length(btrim(unit)) BETWEEN 1 AND 80),
  target_value double precision NOT NULL CHECK (target_value > '-Infinity'::float8 AND target_value < 'Infinity'::float8),
  evidence_source text NOT NULL CHECK (length(btrim(evidence_source)) BETWEEN 1 AND 1000),
  accountable_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  binding_deadline TIMESTAMP(3),
  forecast_date TIMESTAMP(3),
  forecast_basis text,
  execution_schedule text,
  provenance text NOT NULL CHECK (length(btrim(provenance)) BETWEEN 1 AND 1000),
  previous_version_id uuid,
  impact_digest text,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  adopted_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  adopted_at TIMESTAMP(3),
  CONSTRAINT goal_mandate_version_goal_fk FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT goal_mandate_version_state CHECK (
    (status = 'draft' AND version IS NULL AND adopted_at IS NULL AND adopted_by_user_id IS NULL)
    OR (status <> 'draft' AND version > 0 AND adopted_at IS NOT NULL AND adopted_by_user_id IS NOT NULL)
  ),
  CONSTRAINT goal_mandate_version_digest CHECK (impact_digest IS NULL OR impact_digest ~ '^[a-f0-9]{64}$'),
  UNIQUE (id, workspace_id),
  UNIQUE (id, workspace_id, goal_id),
  UNIQUE (goal_id, version)
);
CREATE INDEX goal_mandate_versions_lookup_idx ON goal_mandate_versions(workspace_id, goal_id, status, created_at);
CREATE UNIQUE INDEX goal_mandate_one_adopted_idx ON goal_mandate_versions(goal_id) WHERE status = 'adopted';
ALTER TABLE goal_mandate_versions ADD CONSTRAINT goal_mandate_previous_fk
  FOREIGN KEY (previous_version_id, workspace_id) REFERENCES goal_mandate_versions(id, workspace_id)
  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE goal_mandate_heads (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL UNIQUE,
  current_version_id uuid NOT NULL,
  next_version integer NOT NULL DEFAULT 1 CHECK (next_version > 0),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goal_mandate_head_goal_fk FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT goal_mandate_head_current_fk FOREIGN KEY (current_version_id, workspace_id, goal_id)
    REFERENCES goal_mandate_versions(id, workspace_id, goal_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX goal_mandate_heads_workspace_goal_idx ON goal_mandate_heads(workspace_id, goal_id);

CREATE TABLE goal_mandate_previews (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL,
  draft_id uuid NOT NULL,
  expected_current_id uuid,
  impact_digest text NOT NULL CHECK (impact_digest ~ '^[a-f0-9]{64}$'),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP(3) NOT NULL,
  consumed_at TIMESTAMP(3),
  CONSTRAINT goal_mandate_preview_goal_fk FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT goal_mandate_preview_draft_fk FOREIGN KEY (draft_id, workspace_id, goal_id)
    REFERENCES goal_mandate_versions(id, workspace_id, goal_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX goal_mandate_previews_lookup_idx ON goal_mandate_previews(workspace_id, goal_id, draft_id, created_at);

CREATE TABLE goal_measurements (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL,
  version_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  evidence_digest text NOT NULL CHECK (evidence_digest ~ '^[a-f0-9]{64}$'),
  evidence_revision TIMESTAMP(3) NOT NULL,
  task_id uuid,
  value double precision NOT NULL CHECK (value > '-Infinity'::float8 AND value < 'Infinity'::float8),
  note text NOT NULL CHECK (length(btrim(note)) BETWEEN 1 AND 2000),
  observed_at TIMESTAMP(3) NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected')),
  proposed_by_type text NOT NULL CHECK (proposed_by_type IN ('user', 'agent')),
  proposed_by_id uuid NOT NULL,
  decided_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  decided_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goal_measurement_goal_fk FOREIGN KEY (goal_id, workspace_id)
    REFERENCES goals(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT goal_measurement_version_fk FOREIGN KEY (version_id, workspace_id, goal_id)
    REFERENCES goal_mandate_versions(id, workspace_id, goal_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT goal_measurement_evidence_fk FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence_records(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT goal_measurement_task_fk FOREIGN KEY (task_id, workspace_id)
    REFERENCES tasks(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT goal_measurement_decision_state CHECK (
    (status = 'proposed' AND decided_by_user_id IS NULL AND decided_at IS NULL)
    OR (status <> 'proposed' AND decided_by_user_id IS NOT NULL AND decided_at IS NOT NULL)
  )
);
CREATE INDEX goal_measurements_lookup_idx ON goal_measurements(workspace_id, goal_id, version_id, observed_at);
CREATE INDEX goal_measurements_evidence_idx ON goal_measurements(workspace_id, evidence_id);

CREATE FUNCTION goal_mandate_version_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' AND EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id)
    THEN RAISE EXCEPTION 'goal_mandate_history_immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
      OR (NEW.status <> OLD.status AND NOT (OLD.status = 'adopted' AND NEW.status = 'superseded'))
    THEN RAISE EXCEPTION 'goal_mandate_history_immutable'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_mandate_version_history_guard BEFORE UPDATE OR DELETE ON goal_mandate_versions
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_version_history_guard();

CREATE FUNCTION goal_mandate_head_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM goal_mandate_versions v WHERE v.id = NEW.current_version_id
    AND v.workspace_id = NEW.workspace_id AND v.goal_id = NEW.goal_id AND v.status = 'adopted')
  THEN RAISE EXCEPTION 'goal_mandate_current_not_adopted'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_mandate_head_guard BEFORE INSERT OR UPDATE ON goal_mandate_heads
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_head_guard();

CREATE FUNCTION goal_mandate_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE record_goal uuid; tenant uuid; current_id uuid; adopted_id uuid; adopted_count integer;
BEGIN
  record_goal := CASE WHEN TG_OP = 'DELETE' THEN OLD.goal_id ELSE NEW.goal_id END;
  tenant := CASE WHEN TG_OP = 'DELETE' THEN OLD.workspace_id ELSE NEW.workspace_id END;
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = tenant) THEN RETURN NULL; END IF;
  SELECT current_version_id INTO current_id FROM goal_mandate_heads WHERE goal_id = record_goal AND workspace_id = tenant;
  SELECT count(*) INTO adopted_count FROM goal_mandate_versions
    WHERE goal_id = record_goal AND workspace_id = tenant AND status = 'adopted';
  SELECT id INTO adopted_id FROM goal_mandate_versions
    WHERE goal_id = record_goal AND workspace_id = tenant AND status = 'adopted' LIMIT 1;
  IF adopted_count = 0 AND current_id IS NULL THEN RETURN NULL; END IF;
  IF adopted_count <> 1 OR current_id IS DISTINCT FROM adopted_id
  THEN RAISE EXCEPTION 'goal_mandate_head_version_mismatch'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER goal_mandate_commit_guard AFTER INSERT OR UPDATE OR DELETE ON goal_mandate_versions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION goal_mandate_commit_guard();

CREATE FUNCTION goal_measurement_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id)
  THEN RAISE EXCEPTION 'goal_measurement_history_immutable'; END IF;
  IF TG_OP = 'UPDATE' AND ((to_jsonb(NEW) - 'status' - 'decided_by_user_id' - 'decided_at')
      IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'decided_by_user_id' - 'decided_at')
      OR OLD.status <> 'proposed' OR NEW.status NOT IN ('accepted', 'rejected'))
  THEN RAISE EXCEPTION 'goal_measurement_history_immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_measurement_history_guard BEFORE UPDATE OR DELETE ON goal_measurements
  FOR EACH ROW EXECUTE FUNCTION goal_measurement_history_guard();

-- Legacy CRUD must not bypass owner adoption by changing the accepted Goal,
-- an attached Target or a Metric reached through that Target. Deletion during
-- an explicitly deleted workspace is the only purge boundary.
CREATE FUNCTION goal_mandate_legacy_goal_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM goal_mandate_heads h WHERE h.goal_id = OLD.id)
     AND EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id)
  THEN RAISE EXCEPTION 'goal_mandate_change_requires_adoption'; END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER goal_mandate_legacy_goal_guard BEFORE UPDATE OR DELETE ON goals
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_legacy_goal_guard();

CREATE FUNCTION goal_mandate_legacy_target_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND (
    (OLD.workspace_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id))
    OR (OLD.workspace_id IS NULL AND OLD.goal_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM goals g JOIN workspaces w ON w.id = g.workspace_id WHERE g.id = OLD.goal_id))
  )
  THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.goal_id IS NOT NULL AND EXISTS (SELECT 1 FROM goal_mandate_heads h WHERE h.goal_id = NEW.goal_id)
    THEN RAISE EXCEPTION 'goal_target_change_requires_adoption'; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.goal_id IS NOT NULL AND EXISTS (SELECT 1 FROM goal_mandate_heads h WHERE h.goal_id = OLD.goal_id)
    THEN RAISE EXCEPTION 'goal_target_change_requires_adoption'; END IF;
  ELSIF (OLD.goal_id IS NOT NULL AND EXISTS (SELECT 1 FROM goal_mandate_heads h WHERE h.goal_id = OLD.goal_id)) OR
        (NEW.goal_id IS NOT NULL AND EXISTS (SELECT 1 FROM goal_mandate_heads h WHERE h.goal_id = NEW.goal_id))
  THEN RAISE EXCEPTION 'goal_target_change_requires_adoption'; END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER goal_mandate_legacy_target_guard BEFORE INSERT OR UPDATE OR DELETE ON targets
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_legacy_target_guard();

CREATE FUNCTION goal_mandate_legacy_metric_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id)
  THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
  IF EXISTS (SELECT 1 FROM targets t JOIN goal_mandate_heads h ON h.goal_id = t.goal_id WHERE t.metric_id = OLD.id)
  THEN RAISE EXCEPTION 'goal_metric_change_requires_adoption'; END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER goal_mandate_legacy_metric_guard BEFORE UPDATE OR DELETE ON metrics
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_legacy_metric_guard();

CREATE FUNCTION goal_mandate_task_target_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_goal uuid;
BEGIN
  IF NEW.target_id IS NULL THEN RETURN NEW; END IF;
  SELECT goal_id INTO target_goal FROM targets WHERE id = NEW.target_id AND workspace_id = NEW.workspace_id;
  IF target_goal IS NOT NULL AND EXISTS (SELECT 1 FROM goal_mandate_heads WHERE goal_id = target_goal)
     AND NEW.goal_id IS DISTINCT FROM target_goal
  THEN RAISE EXCEPTION 'goal_target_task_mismatch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_mandate_task_target_guard BEFORE INSERT OR UPDATE OF goal_id, target_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_task_target_guard();

CREATE FUNCTION goal_measurement_source_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE source_row evidence_records%ROWTYPE; task_goal uuid; current_id uuid;
BEGIN
  SELECT * INTO source_row FROM evidence_records WHERE id = NEW.evidence_id AND workspace_id = NEW.workspace_id;
  IF source_row.id IS NULL OR source_row.verification_status <> 'verified'
  THEN RAISE EXCEPTION 'goal_evidence_unverified'; END IF;
  IF NEW.task_id IS NULL THEN
    IF source_row.entity_type <> 'goal' OR source_row.entity_id <> NEW.goal_id
    THEN RAISE EXCEPTION 'goal_evidence_scope_invalid'; END IF;
  ELSE
    SELECT goal_id INTO task_goal FROM tasks WHERE id = NEW.task_id AND workspace_id = NEW.workspace_id;
    IF task_goal IS DISTINCT FROM NEW.goal_id OR source_row.entity_type <> 'task' OR source_row.entity_id <> NEW.task_id
    THEN RAISE EXCEPTION 'goal_evidence_scope_invalid'; END IF;
  END IF;
  SELECT current_version_id INTO current_id FROM goal_mandate_heads WHERE goal_id = NEW.goal_id AND workspace_id = NEW.workspace_id;
  IF current_id IS DISTINCT FROM NEW.version_id
  THEN RAISE EXCEPTION 'goal_version_changed'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_measurement_source_guard BEFORE INSERT OR UPDATE ON goal_measurements
  FOR EACH ROW EXECUTE FUNCTION goal_measurement_source_guard();

-- A first adoption changes task context even for Ready pins created before G20.
CREATE FUNCTION goal_mandate_adoption_invalidate_ready() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE changed jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.current_version_id IS NOT DISTINCT FROM OLD.current_version_id THEN RETURN NULL; END IF;
  changed := jsonb_build_array(jsonb_build_object('table', 'goal_mandate_heads', 'id', NEW.id,
    'label', 'Goal mandate adopted', 'operation', lower(TG_OP), 'changedAt',
    to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  INSERT INTO events (id, workspace_id, task_id, type, source, resource_type, resource_id, payload, updated_at)
  SELECT gen_random_uuid(), workspace_id, id, 'task_execution_ready_invalidated', 'roost', 'task', id::text,
    jsonb_build_object('pinId', execution_readiness->>'pinId', 'revision', execution_readiness->>'revision',
      'reason', 'context_changed', 'changedSources', changed), now()
  FROM tasks WHERE workspace_id = NEW.workspace_id AND goal_id = NEW.goal_id AND execution_readiness->>'status' = 'ready';
  UPDATE tasks SET execution_readiness = execution_readiness || jsonb_build_object(
    'status', 'needs_revalidation', 'reason', 'context_changed', 'changedSources', changed,
    'invalidatedAt', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  WHERE workspace_id = NEW.workspace_id AND goal_id = NEW.goal_id AND execution_readiness->>'status' = 'ready';
  RETURN NULL;
END $$;
CREATE TRIGGER goal_mandate_adoption_invalidate_ready AFTER INSERT OR UPDATE ON goal_mandate_heads
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_adoption_invalidate_ready();
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON goal_mandate_heads
  FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON goal_mandate_heads
  FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON goal_mandate_versions
  FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON goal_mandate_versions
  FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();

-- Historical execution attribution is captured at queue time. Old rows remain
-- unknown; a current task link must never retroactively rewrite their goal.
CREATE FUNCTION goal_execution_attribution() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT t.goal_id, h.current_version_id INTO NEW.goal_id_at_queue, NEW.mandate_version_id_at_queue
  FROM tasks t LEFT JOIN goal_mandate_heads h ON h.goal_id = t.goal_id AND h.workspace_id = t.workspace_id
  WHERE t.id = NEW.task_id AND t.workspace_id = NEW.workspace_id;
  SELECT parent.goal_id INTO NEW.parent_goal_id_at_queue
  FROM task_review_actions action JOIN tasks parent ON parent.id = action.task_id
  WHERE action.child_task_id = NEW.task_id AND action.workspace_id = NEW.workspace_id
    AND parent.workspace_id = NEW.workspace_id LIMIT 1;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_execution_attribution BEFORE INSERT ON agent_executions
  FOR EACH ROW EXECUTE FUNCTION goal_execution_attribution();
CREATE FUNCTION goal_execution_attribution_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.goal_id_at_queue IS DISTINCT FROM OLD.goal_id_at_queue OR
     NEW.mandate_version_id_at_queue IS DISTINCT FROM OLD.mandate_version_id_at_queue OR
     NEW.parent_goal_id_at_queue IS DISTINCT FROM OLD.parent_goal_id_at_queue
  THEN RAISE EXCEPTION 'goal_execution_attribution_immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_execution_attribution_immutable BEFORE UPDATE ON agent_executions
  FOR EACH ROW EXECUTE FUNCTION goal_execution_attribution_immutable();
