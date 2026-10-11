CREATE TABLE company_direction_heads (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  current_version_id uuid NOT NULL,
  next_version integer NOT NULL DEFAULT 1 CHECK (next_version > 0),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_direction_versions (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version integer,
  text text NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 4000),
  provenance text NOT NULL CHECK (length(btrim(provenance)) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'adopted', 'superseded')),
  previous_version_id uuid,
  impact_digest text,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  adopted_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  adopted_at TIMESTAMP(3),
  CONSTRAINT company_direction_version_state CHECK (
    (status = 'draft' AND version IS NULL AND adopted_at IS NULL AND adopted_by_user_id IS NULL)
    OR (status <> 'draft' AND version > 0 AND adopted_at IS NOT NULL AND adopted_by_user_id IS NOT NULL)
  ),
  CONSTRAINT company_direction_version_digest CHECK (impact_digest IS NULL OR impact_digest ~ '^[a-f0-9]{64}$'),
  UNIQUE (workspace_id, version),
  UNIQUE (id, workspace_id)
);
CREATE INDEX company_direction_versions_workspace_status_created_idx ON company_direction_versions(workspace_id, status, created_at);
CREATE UNIQUE INDEX company_direction_single_adopted_idx ON company_direction_versions(workspace_id) WHERE status = 'adopted';
ALTER TABLE company_direction_heads ADD CONSTRAINT company_direction_head_current_fk
  FOREIGN KEY (current_version_id, workspace_id) REFERENCES company_direction_versions(id, workspace_id)
  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE company_direction_versions ADD CONSTRAINT company_direction_previous_fk
  FOREIGN KEY (previous_version_id, workspace_id) REFERENCES company_direction_versions(id, workspace_id)
  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION company_direction_version_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' AND EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id)
    THEN RAISE EXCEPTION 'company_direction_history_immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
      OR (NEW.status <> OLD.status AND NOT (OLD.status = 'adopted' AND NEW.status = 'superseded'))
    THEN RAISE EXCEPTION 'company_direction_history_immutable'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER company_direction_version_history_guard BEFORE UPDATE OR DELETE ON company_direction_versions
  FOR EACH ROW EXECUTE FUNCTION company_direction_version_history_guard();

CREATE FUNCTION company_direction_head_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM company_direction_versions v WHERE v.id = NEW.current_version_id
    AND v.workspace_id = NEW.workspace_id AND v.status = 'adopted')
  THEN RAISE EXCEPTION 'company_direction_current_not_adopted'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER company_direction_head_guard BEFORE INSERT OR UPDATE ON company_direction_heads
  FOR EACH ROW EXECUTE FUNCTION company_direction_head_guard();
CREATE FUNCTION company_direction_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE tenant uuid; current_id uuid; adopted_id uuid; adopted_count integer;
BEGIN
  tenant := CASE WHEN TG_OP = 'DELETE' THEN OLD.workspace_id ELSE NEW.workspace_id END;
  -- An explicitly deleted workspace is the only supported purge boundary.
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = tenant) THEN RETURN NULL; END IF;
  SELECT current_version_id INTO current_id FROM company_direction_heads WHERE workspace_id = tenant;
  SELECT count(*) INTO adopted_count FROM company_direction_versions WHERE workspace_id = tenant AND status = 'adopted';
  SELECT id INTO adopted_id FROM company_direction_versions WHERE workspace_id = tenant AND status = 'adopted' LIMIT 1;
  IF adopted_count = 0 AND current_id IS NULL THEN RETURN NULL; END IF;
  IF adopted_count <> 1 OR current_id IS DISTINCT FROM adopted_id
  THEN RAISE EXCEPTION 'company_direction_head_version_mismatch'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER company_direction_commit_guard AFTER INSERT OR UPDATE OR DELETE ON company_direction_versions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION company_direction_commit_guard();
CREATE TABLE company_direction_impact_previews (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  draft_id uuid NOT NULL,
  expected_current_id uuid,
  impact_digest text NOT NULL CHECK (impact_digest ~ '^[a-f0-9]{64}$'),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP(3) NOT NULL,
  consumed_at TIMESTAMP(3),
  CONSTRAINT company_direction_preview_draft_fk FOREIGN KEY (draft_id, workspace_id)
    REFERENCES company_direction_versions(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX company_direction_impact_previews_workspace_draft_created_idx
  ON company_direction_impact_previews(workspace_id, draft_id, created_at);

CREATE TABLE company_direction_comparisons (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  direction_version_id uuid NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('task', 'decision')),
  subject_id uuid NOT NULL,
  subject_revision TIMESTAMP(3) NOT NULL,
  subject_governance_preview_id uuid,
  subject_title text NOT NULL,
  outcome text NOT NULL CHECK (length(btrim(outcome)) BETWEEN 1 AND 2000),
  evidence text NOT NULL CHECK (length(btrim(evidence)) BETWEEN 1 AND 4000),
  assessment text NOT NULL CHECK (assessment IN ('aligned', 'conflict')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'aligned', 'exception_accepted', 'exception_rejected')),
  exception_rationale text,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decided_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP(3),
  CONSTRAINT company_direction_comparison_resolution CHECK (
    (status = 'proposed' AND decided_by_user_id IS NULL AND decided_at IS NULL)
    OR (status <> 'proposed' AND decided_by_user_id IS NOT NULL AND decided_at IS NOT NULL)
  ),
  CONSTRAINT company_direction_comparison_version_fk FOREIGN KEY (direction_version_id, workspace_id)
    REFERENCES company_direction_versions(id, workspace_id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX company_direction_comparisons_subject_idx ON company_direction_comparisons(workspace_id, subject_type, subject_id, created_at);
CREATE INDEX company_direction_comparisons_version_idx ON company_direction_comparisons(workspace_id, direction_version_id);

-- Both tables are part of the sealed Ready context. An adoption must invalidate
-- every affected Ready pin and signal a native stop for an active execution.
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON company_direction_heads
  FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON company_direction_heads
  FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON company_direction_versions
  FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON company_direction_versions
  FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();

-- Pre-G19 Ready pins do not watch these new source tables. Preserve them on
-- deployment while no direction exists, then invalidate every Ready pin in
-- this workspace on actual adoption. The task trigger signals active stop.
CREATE FUNCTION company_direction_adoption_invalidate_ready() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE changed jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.current_version_id IS NOT DISTINCT FROM OLD.current_version_id THEN RETURN NULL; END IF;
  changed := jsonb_build_array(jsonb_build_object('table', 'company_direction_heads', 'id', NEW.id,
    'label', 'Company direction adopted', 'operation', lower(TG_OP), 'changedAt',
    to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  INSERT INTO events (id, workspace_id, task_id, type, source, resource_type, resource_id, payload, updated_at)
  SELECT gen_random_uuid(), workspace_id, id, 'task_execution_ready_invalidated', 'roost', 'task', id::text,
    jsonb_build_object('pinId', execution_readiness->>'pinId', 'revision', execution_readiness->>'revision',
      'reason', 'context_changed', 'changedSources', changed), now()
  FROM tasks WHERE workspace_id = NEW.workspace_id AND execution_readiness->>'status' = 'ready';
  UPDATE tasks SET execution_readiness = execution_readiness || jsonb_build_object(
    'status', 'needs_revalidation', 'reason', 'context_changed', 'changedSources', changed,
    'invalidatedAt', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  WHERE workspace_id = NEW.workspace_id AND execution_readiness->>'status' = 'ready';
  RETURN NULL;
END $$;
CREATE TRIGGER company_direction_adoption_invalidate_ready AFTER INSERT OR UPDATE ON company_direction_heads
  FOR EACH ROW EXECUTE FUNCTION company_direction_adoption_invalidate_ready();
