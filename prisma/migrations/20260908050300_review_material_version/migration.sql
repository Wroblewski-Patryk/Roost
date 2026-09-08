BEGIN;
CREATE FUNCTION task_review_version_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE material JSONB;
BEGIN
 SELECT task_review_material(e) INTO material FROM agent_executions e WHERE e.id=NEW.execution_id AND e.workspace_id=NEW.workspace_id;
 IF NEW.material_version IS DISTINCT FROM encode(sha256(convert_to(material::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'task_review_material_version_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_review_version_guard BEFORE INSERT ON task_review_decisions FOR EACH ROW EXECUTE FUNCTION task_review_version_guard();
COMMIT;
