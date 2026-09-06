-- Owner decision: Roost operates the portfolio; it is not a development target.
-- Applied through the normal deployment migration boundary, never remote SQL.
BEGIN;
LOCK TABLE applications, application_projects, projects, agent_executions IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE removed_roost_apps ON COMMIT DROP AS
  SELECT id, workspace_id FROM applications WHERE slug = 'roost';
CREATE TEMP TABLE removed_roost_projects ON COMMIT DROP AS
  SELECT DISTINCT p.id, p.workspace_id FROM projects p
  WHERE EXISTS (SELECT 1 FROM removed_roost_apps a WHERE a.workspace_id = p.workspace_id AND
    (p.external_id = 'application-delivery:roost' OR EXISTS
      (SELECT 1 FROM application_projects ap WHERE ap.project_id = p.id AND ap.application_id = a.id)));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM application_projects ap JOIN removed_roost_projects p ON p.id = ap.project_id
    WHERE ap.application_id NOT IN (SELECT id FROM removed_roost_apps)) THEN
    RAISE EXCEPTION 'Roost shares a project with another application; separate ownership before removal';
  END IF;
  IF EXISTS (SELECT 1 FROM agent_executions e WHERE e.application_id IN (SELECT id FROM removed_roost_apps)
    AND e.status IN ('claimed', 'running', 'waiting_for_approval')) THEN
    RAISE EXCEPTION 'Stop and reconcile active Roost executions before removal';
  END IF;
END $$;
CREATE TEMP TABLE removed_roost_records ON COMMIT DROP AS
  WITH RECURSIVE owned AS (
    SELECT r.id, r.workspace_id FROM company_records r WHERE
      EXISTS (SELECT 1 FROM removed_roost_apps a WHERE a.id = r.application_id AND a.workspace_id = r.workspace_id)
      OR EXISTS (SELECT 1 FROM removed_roost_projects p WHERE p.id = r.project_id AND p.workspace_id = r.workspace_id)
    UNION
    SELECT r.id, r.workspace_id FROM company_records r JOIN owned o ON r.parent_id = o.id AND r.workspace_id = o.workspace_id
    WHERE r.application_id IS NULL OR r.application_id IN (SELECT id FROM removed_roost_apps)
  ) SELECT * FROM owned;
CREATE TEMP TABLE removed_roost_tasks ON COMMIT DROP AS
  SELECT t.id, t.workspace_id FROM tasks t WHERE EXISTS (SELECT 1 FROM removed_roost_projects p
    WHERE p.workspace_id=t.workspace_id AND (p.id=t.project_id OR EXISTS
      (SELECT 1 FROM task_lists l WHERE l.id=t.task_list_id AND l.project_id=p.id)));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM agent_executions e JOIN removed_roost_tasks t ON t.id=e.task_id
    WHERE e.application_id NOT IN (SELECT id FROM removed_roost_apps) OR e.status IN ('claimed','running','waiting_for_approval')) THEN
    RAISE EXCEPTION 'Roost task has active or other-application execution; reconcile before removal';
  END IF;
  IF EXISTS (SELECT 1 FROM company_records r JOIN removed_roost_records x ON x.id=r.id
    WHERE r.application_id IS NOT NULL AND r.application_id NOT IN (SELECT id FROM removed_roost_apps)) THEN
    RAISE EXCEPTION 'Roost project contains another application context; separate before removal';
  END IF;
END $$;
-- Polymorphic links have no FK cascades. Capture identities before deleting owners.
CREATE TEMP TABLE removed_roost_entities (id uuid, workspace_id uuid, entity_type text) ON COMMIT DROP;
INSERT INTO removed_roost_entities SELECT id, workspace_id, 'application' FROM removed_roost_apps;
INSERT INTO removed_roost_entities SELECT id, workspace_id, 'project' FROM removed_roost_projects;
INSERT INTO removed_roost_entities SELECT id, workspace_id, 'company_record' FROM removed_roost_records;
INSERT INTO removed_roost_entities SELECT id, workspace_id, 'task' FROM removed_roost_tasks;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['task_lists','goals','notes','decisions','knowledge_items','decision_logs'] LOOP
    EXECUTE format('INSERT INTO removed_roost_entities SELECT x.id, x.workspace_id, $1 FROM %I x JOIN removed_roost_projects p ON p.id=x.project_id AND p.workspace_id=x.workspace_id', t)
      USING CASE t WHEN 'task_lists' THEN 'task_list' WHEN 'knowledge_items' THEN 'knowledge_item' WHEN 'decision_logs' THEN 'decision_log' ELSE left(t, length(t)-1) END;
  END LOOP;
END $$;
INSERT INTO removed_roost_entities SELECT t.id, t.workspace_id, 'target' FROM targets t JOIN removed_roost_entities g ON g.id=t.goal_id AND g.workspace_id=t.workspace_id AND g.entity_type='goal';
INSERT INTO removed_roost_entities SELECT n.id, n.workspace_id, 'note' FROM notes n JOIN removed_roost_tasks t ON t.id=n.task_id AND t.workspace_id=n.workspace_id;
INSERT INTO removed_roost_entities SELECT o.id, o.workspace_id, 'product_offering' FROM product_offerings o JOIN removed_roost_apps a ON a.id=o.application_id AND a.workspace_id=o.workspace_id;
-- Application-owned definitions cascade; reusable capability/procedure catalogs stay.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['application_capabilities','application_features','application_architecture_components','application_interfaces','application_repositories'] LOOP
    EXECUTE format('INSERT INTO removed_roost_entities SELECT x.id, a.workspace_id, $1 FROM %I x JOIN removed_roost_apps a ON a.id=x.application_id', t)
      USING CASE t WHEN 'application_capabilities' THEN 'application_capability' ELSE left(t, length(t)-1) END;
  END LOOP;
END $$;
DELETE FROM dependencies d USING removed_roost_entities e WHERE d.workspace_id=e.workspace_id AND
  ((d.from_entity_id=e.id::text AND d.from_entity_type=e.entity_type) OR (d.to_entity_id=e.id::text AND d.to_entity_type=e.entity_type));
DELETE FROM knowledge_links l USING removed_roost_entities e WHERE l.workspace_id=e.workspace_id AND l.target_id=e.id::text AND l.target_type=e.entity_type;
DELETE FROM evidence_records r USING removed_roost_entities e WHERE r.workspace_id=e.workspace_id AND r.entity_id=e.id AND r.entity_type=e.entity_type;
DELETE FROM organizational_department_relations r USING removed_roost_entities e WHERE r.workspace_id=e.workspace_id AND r.entity_id=e.id AND r.entity_type=e.entity_type;
DELETE FROM organizational_scopes r USING removed_roost_entities e WHERE r.workspace_id=e.workspace_id AND
  ((r.entity_id=e.id AND r.entity_type=e.entity_type) OR (r.scope_entity_id=e.id::text AND r.scope_type::text=e.entity_type));
DELETE FROM entity_ownerships r USING removed_roost_entities e WHERE r.workspace_id=e.workspace_id AND r.entity_id=e.id AND r.entity_type=e.entity_type;
DELETE FROM company_records WHERE id IN (SELECT id FROM removed_roost_records);
DELETE FROM agent_executions WHERE application_id IN (SELECT id FROM removed_roost_apps);
DELETE FROM targets WHERE id IN (SELECT id FROM removed_roost_entities WHERE entity_type='target');
DELETE FROM notes WHERE id IN (SELECT id FROM removed_roost_entities WHERE entity_type='note');
DELETE FROM tasks WHERE id IN (SELECT id FROM removed_roost_tasks);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['task_lists','goals','decisions','knowledge_items','decision_logs'] LOOP
    EXECUTE format('DELETE FROM %I x USING removed_roost_projects p WHERE x.project_id=p.id AND x.workspace_id=p.workspace_id', t);
  END LOOP;
END $$;
DELETE FROM product_offerings WHERE id IN (SELECT id FROM removed_roost_entities WHERE entity_type='product_offering');
DELETE FROM projects WHERE id IN (SELECT id FROM removed_roost_projects);
DELETE FROM applications WHERE id IN (SELECT id FROM removed_roost_apps);
-- Hosts must stop advertising the excluded target. Their other mappings survive.
UPDATE agent_hosts SET application_slugs = application_slugs - 'roost', updated_at = CURRENT_TIMESTAMP
  WHERE application_slugs ? 'roost';
COMMIT;
