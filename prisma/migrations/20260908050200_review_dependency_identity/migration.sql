BEGIN;
ALTER TABLE task_review_actions ADD CONSTRAINT task_review_actions_dependency_id_fkey FOREIGN KEY(dependency_id) REFERENCES dependencies(id) ON DELETE RESTRICT;
CREATE FUNCTION task_review_dependency_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM task_review_actions WHERE dependency_id=OLD.id) AND
  (NEW.id<>OLD.id OR NEW.workspace_id<>OLD.workspace_id OR NEW.dependency_type IS DISTINCT FROM OLD.dependency_type OR
   NEW.from_entity_type IS DISTINCT FROM OLD.from_entity_type OR NEW.from_entity_id IS DISTINCT FROM OLD.from_entity_id OR
   NEW.to_entity_type IS DISTINCT FROM OLD.to_entity_type OR NEW.to_entity_id IS DISTINCT FROM OLD.to_entity_id)
 THEN RAISE EXCEPTION 'task_review_dependency_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_review_dependency_guard BEFORE UPDATE ON dependencies FOR EACH ROW EXECUTE FUNCTION task_review_dependency_guard();
COMMIT;
