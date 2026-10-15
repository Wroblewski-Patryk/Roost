BEGIN;

-- A retirement must serialize with new runtime pins. Historical links are kept;
-- only a new active binding to a non-active procedure is refused.
CREATE FUNCTION procedure_archive_active_binding_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id uuid; target_status "OperatingStatus";
BEGIN
  IF TG_TABLE_NAME = 'pipeline_stages' THEN
    IF NEW.procedure_id IS NULL OR NEW.status <> 'active' THEN RETURN NEW; END IF;
    target_id := NEW.procedure_id;
  ELSIF TG_TABLE_NAME = 'stage_runs' THEN
    IF NEW.status NOT IN ('pending','running','blocked') THEN RETURN NEW; END IF;
    SELECT procedure_id INTO target_id FROM pipeline_stages WHERE id=NEW.pipeline_stage_id;
    IF target_id IS NULL THEN RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME = 'policies' THEN
    IF NEW.procedure_id IS NULL OR NEW.status <> 'active' THEN RETURN NEW; END IF;
    target_id := NEW.procedure_id;
  ELSE
    target_id := NEW.procedure_id;
  END IF;

  SELECT status INTO target_status FROM procedures
    WHERE id=target_id AND workspace_id=NEW.workspace_id FOR SHARE;
  IF target_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'procedure_archive_inactive_binding';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER procedure_archive_stage_binding BEFORE INSERT OR UPDATE OF procedure_id,status
  ON pipeline_stages FOR EACH ROW EXECUTE FUNCTION procedure_archive_active_binding_guard();
CREATE TRIGGER procedure_archive_stage_run_binding BEFORE INSERT OR UPDATE OF status
  ON stage_runs FOR EACH ROW EXECUTE FUNCTION procedure_archive_active_binding_guard();
-- The existing task_admission_insert trigger locks ready_source_fence first.
-- PostgreSQL orders same-event triggers by name, so this binding check follows it.
CREATE TRIGGER zz_procedure_archive_admission_binding BEFORE INSERT ON task_admission_scopes
  FOR EACH ROW EXECUTE FUNCTION procedure_archive_active_binding_guard();
CREATE TRIGGER procedure_archive_policy_binding BEFORE INSERT OR UPDATE OF procedure_id,status
  ON policies FOR EACH ROW EXECUTE FUNCTION procedure_archive_active_binding_guard();

CREATE FUNCTION procedure_archive_required_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_status "OperatingStatus";
BEGIN
  IF NOT NEW.required THEN RETURN NEW; END IF;
  SELECT status INTO target_status FROM procedures WHERE id=NEW.procedure_id FOR SHARE;
  IF target_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'procedure_archive_inactive_binding';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER procedure_archive_application_link BEFORE INSERT OR UPDATE OF procedure_id,required
  ON application_procedures FOR EACH ROW EXECUTE FUNCTION procedure_archive_required_link_guard();
CREATE TRIGGER procedure_archive_capability_link BEFORE INSERT OR UPDATE OF procedure_id,required
  ON capability_procedures FOR EACH ROW EXECUTE FUNCTION procedure_archive_required_link_guard();

CREATE FUNCTION procedure_archive_composition_binding_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_status "OperatingStatus";
BEGIN
  FOR row_status IN SELECT status FROM procedures
    WHERE id IN (NEW.base_procedure_id, NEW.extension_procedure_id)
      AND workspace_id=NEW.workspace_id FOR SHARE LOOP
    IF row_status <> 'active' THEN
      RAISE EXCEPTION 'procedure_archive_inactive_binding';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER procedure_archive_composition_binding BEFORE INSERT ON task_composition_selections
  FOR EACH ROW EXECUTE FUNCTION procedure_archive_composition_binding_guard();

COMMIT;
