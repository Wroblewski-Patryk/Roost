BEGIN;

-- No existing source or task is approved or rewritten by this migration.
CREATE TABLE task_source_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordinal SERIAL NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_revision TIMESTAMP(3) NOT NULL,
  content_digest TEXT NOT NULL CHECK (content_digest ~ '^[a-f0-9]{64}$'),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  action TEXT NOT NULL CHECK (action IN ('approve', 'withdraw')),
  classification TEXT NOT NULL CHECK (classification IN ('fact', 'observation', 'proposal', 'inference')),
  provenance TEXT NOT NULL CHECK (length(btrim(provenance)) BETWEEN 1 AND 500),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'isolated_test')),
  verification_method TEXT NOT NULL CHECK (length(btrim(verification_method)) BETWEEN 1 AND 500),
  verification_ref TEXT NOT NULL CHECK (length(btrim(verification_ref)) BETWEEN 1 AND 1000),
  inclusion_reason TEXT NOT NULL CHECK (length(btrim(inclusion_reason)) BETWEEN 1 AND 1000),
  valid_from TIMESTAMP(3) NOT NULL,
  valid_until TIMESTAMP(3) NOT NULL CHECK (valid_until > valid_from),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX task_source_reviews_scope_idx ON task_source_reviews(workspace_id, task_id, source_type, source_id, ordinal);

CREATE TABLE source_body_history (
  ordinal BIGSERIAL PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  workspace_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'before_update', 'after_update', 'delete')),
  body JSONB NOT NULL,
  recorded_at TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX source_body_history_scope_idx ON source_body_history(workspace_id, source_table, source_id, ordinal);

-- Preserve the tenant of child rows even if their parent is already gone when
-- a cascading DELETE reaches the child history trigger.
CREATE TABLE source_tenant_index (
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  PRIMARY KEY(source_table, source_id)
);
INSERT INTO source_tenant_index(source_table, source_id, workspace_id)
SELECT 'procedure_steps', s.id, p.workspace_id FROM procedure_steps s JOIN procedures p ON p.id = s.procedure_id;
INSERT INTO source_tenant_index(source_table, source_id, workspace_id)
SELECT 'application_architecture_components', c.id, a.workspace_id FROM application_architecture_components c JOIN applications a ON a.id = c.application_id;
INSERT INTO source_tenant_index(source_table, source_id, workspace_id)
SELECT 'application_interfaces', c.id, a.workspace_id FROM application_interfaces c JOIN applications a ON a.id = c.application_id;
INSERT INTO source_tenant_index(source_table, source_id, workspace_id)
SELECT 'application_capabilities', c.id, a.workspace_id FROM application_capabilities c JOIN applications a ON a.id = c.application_id;

CREATE FUNCTION g9_append_only() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'g9_append_only';
END $$;
CREATE TRIGGER task_source_reviews_immutable BEFORE UPDATE OR DELETE ON task_source_reviews
FOR EACH ROW EXECUTE FUNCTION g9_append_only();
CREATE TRIGGER task_source_reviews_no_truncate BEFORE TRUNCATE ON task_source_reviews
FOR EACH STATEMENT EXECUTE FUNCTION g9_append_only();
CREATE TRIGGER source_body_history_immutable BEFORE UPDATE OR DELETE ON source_body_history
FOR EACH ROW EXECUTE FUNCTION g9_append_only();
CREATE TRIGGER source_body_history_no_truncate BEFORE TRUNCATE ON source_body_history
FOR EACH STATEMENT EXECUTE FUNCTION g9_append_only();

-- Database triggers capture imports and other writers, not only HTTP routes.
-- The first post-migration update captures the surviving pre-update body; no
-- attempt is made to reconstruct bodies overwritten before this migration.
CREATE FUNCTION g9_source_tenant(p_source_table TEXT, row_body JSONB) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  tenant UUID;
  linked_application UUID;
  linked_procedure UUID;
BEGIN
  tenant := NULLIF(row_body->>'workspace_id', '')::uuid;
  IF tenant IS NULL THEN
    linked_application := NULLIF(row_body->>'application_id', '')::uuid;
    IF linked_application IS NOT NULL THEN
      SELECT workspace_id INTO tenant FROM applications WHERE id = linked_application;
    END IF;
  END IF;
  IF tenant IS NULL THEN
    linked_procedure := NULLIF(row_body->>'procedure_id', '')::uuid;
    IF linked_procedure IS NOT NULL THEN
      SELECT workspace_id INTO tenant FROM procedures WHERE id = linked_procedure;
    END IF;
  END IF;
  IF tenant IS NULL THEN
    SELECT workspace_id INTO tenant FROM source_tenant_index WHERE source_tenant_index.source_table = p_source_table
      AND source_id = (row_body->>'id')::uuid;
  END IF;
  RETURN tenant;
END $$;
CREATE FUNCTION g9_capture_source_body() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  row_body JSONB;
  old_tenant UUID;
  new_tenant UUID;
BEGIN
  row_body := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  IF TG_OP <> 'INSERT' THEN old_tenant := g9_source_tenant(TG_TABLE_NAME, to_jsonb(OLD)); END IF;
  IF TG_OP <> 'DELETE' THEN new_tenant := g9_source_tenant(TG_TABLE_NAME, to_jsonb(NEW)); END IF;
  -- Provider rescans only refresh telemetry. Preserve body history for content,
  -- revision, status and provenance changes without copying large extracts on
  -- every identical read.
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'google_drive_content_snapshots' AND
    (to_jsonb(OLD) - 'updated_at' - 'metadata') IS NOT DISTINCT FROM (to_jsonb(NEW) - 'updated_at' - 'metadata') AND
    ((to_jsonb(OLD)->'metadata') - 'readAt') IS NOT DISTINCT FROM ((to_jsonb(NEW)->'metadata') - 'readAt') THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'google_drive_files' AND
    (to_jsonb(OLD) - 'updated_at' - 'last_scanned_at') IS NOT DISTINCT FROM
    (to_jsonb(NEW) - 'updated_at' - 'last_scanned_at') THEN
    RETURN NULL;
  END IF;
  IF new_tenant IS NOT NULL THEN
    INSERT INTO source_tenant_index(source_table, source_id, workspace_id)
    VALUES (TG_TABLE_NAME, (row_body->>'id')::uuid, new_tenant)
    ON CONFLICT(source_table, source_id) DO UPDATE SET workspace_id = EXCLUDED.workspace_id;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      INSERT INTO source_body_history(source_table, source_id, workspace_id, operation, body)
      VALUES (TG_TABLE_NAME, OLD.id, old_tenant, 'before_update', to_jsonb(OLD));
      INSERT INTO source_body_history(source_table, source_id, workspace_id, operation, body)
      VALUES (TG_TABLE_NAME, NEW.id, new_tenant, 'after_update', to_jsonb(NEW));
    END IF;
  ELSE
    INSERT INTO source_body_history(source_table, source_id, workspace_id, operation, body)
    VALUES (TG_TABLE_NAME, (row_body->>'id')::uuid, COALESCE(old_tenant, new_tenant), lower(TG_OP), row_body);
  END IF;
  RETURN NULL;
END $$;

DO $$
DECLARE source_table TEXT;
BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'company_records', 'evidence_records', 'decisions', 'notes',
    'procedures', 'procedure_steps', 'policies',
    'application_evidence', 'application_architecture_components',
    'application_interfaces', 'application_capabilities', 'capability_definitions',
    'google_drive_content_snapshots', 'google_drive_files',
    'knowledge_items', 'knowledge_links'
  ] LOOP
    EXECUTE format('CREATE TRIGGER g9_source_body_history AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION g9_capture_source_body()', source_table);
  END LOOP;
END $$;

CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON task_source_reviews
FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON task_source_reviews
FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();

-- These families became part of the sealed Ready context in G9. Drive read
-- telemetry is excluded from source digests and must not invalidate Ready.
DO $$ DECLARE source_table TEXT; BEGIN
  FOREACH source_table IN ARRAY ARRAY['notes', 'knowledge_items'] LOOP
    EXECUTE format('CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock()', source_table);
    EXECUTE format('CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate()', source_table);
  END LOOP;
END $$;
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON google_drive_content_snapshots
FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER UPDATE ON google_drive_content_snapshots FOR EACH ROW
WHEN ((to_jsonb(OLD) - 'updated_at' - 'metadata') IS DISTINCT FROM (to_jsonb(NEW) - 'updated_at' - 'metadata')
  OR ((to_jsonb(OLD)->'metadata') - 'readAt') IS DISTINCT FROM ((to_jsonb(NEW)->'metadata') - 'readAt'))
EXECUTE FUNCTION ready_source_invalidate();
CREATE TRIGGER ready_source_lifecycle AFTER INSERT OR DELETE ON google_drive_content_snapshots
FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON google_drive_files
FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER UPDATE ON google_drive_files FOR EACH ROW
WHEN ((to_jsonb(OLD) - 'updated_at' - 'last_scanned_at') IS DISTINCT FROM (to_jsonb(NEW) - 'updated_at' - 'last_scanned_at'))
EXECUTE FUNCTION ready_source_invalidate();
CREATE TRIGGER ready_source_lifecycle AFTER INSERT OR DELETE ON google_drive_files
FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();

-- The previously installed company-information branch of this guard used an
-- AND expression with NEW.sources. PostgreSQL may evaluate that expression on
-- task_risk_scopes, which has no sources column. Separate the table check so
-- ordinary application risk scopes can be recorded again.
DO $guard$
DECLARE definition TEXT; start_at INT; next_at INT; branch TEXT; rewritten TEXT;
BEGIN
  SELECT pg_get_functiondef('task_risk_history_guard()'::regprocedure) INTO definition;
  start_at := strpos(definition, 'IF TG_TABLE_NAME=''task_risk_assessments'' AND EXISTS(');
  IF start_at = 0 THEN RAISE EXCEPTION 'g9_risk_guard_anchor_missing'; END IF;
  next_at := strpos(substr(definition, start_at), 'IF TG_TABLE_NAME=''task_risk_scopes'' THEN');
  IF next_at = 0 THEN RAISE EXCEPTION 'g9_risk_guard_end_missing'; END IF;
  next_at := start_at + next_at - 1;
  branch := substr(definition, start_at, next_at - start_at);
  rewritten := replace(branch, 'IF TG_TABLE_NAME=''task_risk_assessments'' AND EXISTS(',
    'IF TG_TABLE_NAME=''task_risk_assessments'' THEN IF EXISTS(');
  rewritten := regexp_replace(rewritten, 'END IF;([[:space:]]*)$', 'END IF; END IF;\1');
  IF rewritten = branch OR rewritten !~ 'END IF; END IF;' THEN RAISE EXCEPTION 'g9_risk_guard_rewrite_failed'; END IF;
  EXECUTE substr(definition, 1, start_at - 1) || rewritten || substr(definition, next_at);
END $guard$;

COMMIT;
