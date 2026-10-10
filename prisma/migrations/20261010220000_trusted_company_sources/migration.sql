BEGIN;

-- Additive, task-scoped owner reviews. Existing records receive no implicit approval.
CREATE TABLE company_source_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordinal SERIAL NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  record_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  record_revision TIMESTAMP(3) NOT NULL,
  content_digest TEXT NOT NULL CHECK (content_digest ~ '^[a-f0-9]{64}$'),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  action TEXT NOT NULL CHECK (action IN ('approve', 'withdraw')),
  classification TEXT NOT NULL CHECK (classification IN ('fact', 'observation', 'proposal', 'inference')),
  provenance TEXT NOT NULL CHECK (length(btrim(provenance)) > 0),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'isolated_test')),
  verification_method TEXT NOT NULL CHECK (length(btrim(verification_method)) > 0),
  verification_ref TEXT NOT NULL CHECK (length(btrim(verification_ref)) > 0),
  inclusion_reason TEXT NOT NULL CHECK (length(btrim(inclusion_reason)) > 0),
  valid_from TIMESTAMP(3) NOT NULL,
  valid_until TIMESTAMP(3) NOT NULL CHECK (valid_until > valid_from),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT now(),
  CHECK (length(provenance) <= 500 AND length(verification_method) <= 500 AND length(verification_ref) <= 1000 AND length(inclusion_reason) <= 1000)
);
CREATE INDEX company_source_reviews_scope_idx ON company_source_reviews(workspace_id, task_id, record_id, created_at);

CREATE FUNCTION company_source_review_append_only() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'company_source_review_append_only';
END $$;
CREATE TRIGGER company_source_review_immutable BEFORE UPDATE OR DELETE ON company_source_reviews
FOR EACH ROW EXECUTE FUNCTION company_source_review_append_only();
CREATE TRIGGER company_source_review_no_truncate BEFORE TRUNCATE ON company_source_reviews
FOR EACH STATEMENT EXECUTE FUNCTION company_source_review_append_only();
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON company_source_reviews
FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON company_source_reviews
FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();

-- Existing Ready pins are not rewritten during migration. On inspection or
-- claim, the current packet validator requires a review and rejects stale
-- pins before Worker admission. A new Ready submission captures this table
-- in its source watch; subsequent reviews invalidate that pin immediately.

COMMIT;
