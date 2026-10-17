-- Owner inventory-purpose assertions are independent of task source reviews.
-- Existing company records and approval paths are not rewritten or seeded.
CREATE TABLE company_record_inventory_assessments (
  id UUID PRIMARY KEY,
  ordinal SERIAL NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  record_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
  record_revision TIMESTAMP(3) NOT NULL,
  record_digest TEXT NOT NULL CHECK (record_digest ~ '^[0-9a-f]{64}$'),
  category TEXT NOT NULL CHECK (category IN ('business', 'test', 'audit', 'unknown')),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  source_reference JSONB NOT NULL,
  previous_assessment_id UUID UNIQUE REFERENCES company_record_inventory_assessments(id) ON DELETE RESTRICT,
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX company_record_inventory_assessments_workspace_record_ordinal_idx
  ON company_record_inventory_assessments(workspace_id, record_id, ordinal);
CREATE UNIQUE INDEX company_record_inventory_assessments_first_unique
  ON company_record_inventory_assessments(workspace_id, record_id)
  WHERE previous_assessment_id IS NULL;

CREATE FUNCTION company_record_inventory_assessment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_workspace UUID; previous_record UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'company_inventory_assessment_immutable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM company_records
      WHERE id = NEW.record_id AND workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'company_inventory_assessment_record_scope_invalid';
  END IF;
  IF NEW.previous_assessment_id IS NOT NULL THEN
    SELECT workspace_id, record_id INTO previous_workspace, previous_record
      FROM company_record_inventory_assessments WHERE id = NEW.previous_assessment_id;
    IF previous_workspace IS DISTINCT FROM NEW.workspace_id
      OR previous_record IS DISTINCT FROM NEW.record_id THEN
      RAISE EXCEPTION 'company_inventory_assessment_chain_invalid';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER company_record_inventory_assessment_guard
  BEFORE INSERT OR UPDATE OR DELETE ON company_record_inventory_assessments
  FOR EACH ROW EXECUTE FUNCTION company_record_inventory_assessment_guard();
