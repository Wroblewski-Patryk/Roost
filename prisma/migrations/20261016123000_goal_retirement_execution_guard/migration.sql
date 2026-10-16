BEGIN;

ALTER TABLE goal_mandate_versions DROP CONSTRAINT goal_mandate_versions_status_check;
ALTER TABLE goal_mandate_versions ADD CONSTRAINT goal_mandate_versions_status_check
  CHECK (status IN ('draft','adopted','superseded','retired'));

-- Retirement is distinct from adoption of a successor. All accepted content
-- remains immutable; only this one additional terminal status is permitted.
CREATE OR REPLACE FUNCTION goal_mandate_version_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' AND EXISTS (SELECT 1 FROM workspaces WHERE id=OLD.workspace_id)
    THEN RAISE EXCEPTION 'goal_mandate_history_immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
      OR (NEW.status <> OLD.status AND NOT (OLD.status='adopted' AND NEW.status IN ('superseded','retired')))
    THEN RAISE EXCEPTION 'goal_mandate_history_immutable'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- Historical task and execution links remain intact, but an archived Goal can
-- never authorize a fresh Ready pin or agent execution. The Goal row lock
-- serializes this guard with the owner retirement transaction.
CREATE FUNCTION goal_retirement_task_ready_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE retired boolean;
BEGIN
  IF NEW.goal_id IS NULL OR NEW.execution_readiness->>'status' <> 'ready' THEN RETURN NEW; END IF;
  PERFORM id FROM goals WHERE id=NEW.goal_id AND workspace_id=NEW.workspace_id FOR SHARE;
  SELECT EXISTS (SELECT 1 FROM goals g JOIN goal_mandate_versions v
    ON v.goal_id=g.id AND v.workspace_id=g.workspace_id
    WHERE g.id=NEW.goal_id AND g.workspace_id=NEW.workspace_id
      AND g.status='archived' AND v.status='retired') INTO retired;
  IF retired THEN RAISE EXCEPTION 'goal_retired'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_retirement_task_ready_guard BEFORE INSERT OR UPDATE OF goal_id,execution_readiness ON tasks
  FOR EACH ROW EXECUTE FUNCTION goal_retirement_task_ready_guard();

CREATE FUNCTION goal_retirement_task_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE link_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN link_changed := NEW.goal_id IS NOT NULL;
  ELSE
    link_changed := NEW.goal_id IS DISTINCT FROM OLD.goal_id;
    IF OLD.goal_id IS NOT NULL AND link_changed THEN
      PERFORM id FROM goals WHERE id=OLD.goal_id AND workspace_id=OLD.workspace_id FOR SHARE;
      IF EXISTS (SELECT 1 FROM goals g JOIN goal_mandate_versions v ON v.goal_id=g.id AND v.workspace_id=g.workspace_id
        WHERE g.id=OLD.goal_id AND g.workspace_id=OLD.workspace_id
          AND g.status='archived' AND v.status='retired')
      THEN RAISE EXCEPTION 'goal_retirement_task_link_immutable'; END IF;
    END IF;
  END IF;
  IF NEW.goal_id IS NOT NULL AND link_changed THEN
    PERFORM id FROM goals WHERE id=NEW.goal_id AND workspace_id=NEW.workspace_id FOR SHARE;
    IF EXISTS (SELECT 1 FROM goals g JOIN goal_mandate_versions v ON v.goal_id=g.id AND v.workspace_id=g.workspace_id
      WHERE g.id=NEW.goal_id AND g.workspace_id=NEW.workspace_id
        AND g.status='archived' AND v.status='retired')
    THEN RAISE EXCEPTION 'goal_retired'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_retirement_task_link_guard BEFORE INSERT OR UPDATE OF goal_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION goal_retirement_task_link_guard();

CREATE FUNCTION goal_retirement_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='archived' AND EXISTS (SELECT 1 FROM goal_mandate_versions
    WHERE goal_id=OLD.id AND workspace_id=OLD.workspace_id AND status='retired')
  THEN RAISE EXCEPTION 'goal_retirement_immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_retirement_history_guard BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION goal_retirement_history_guard();

CREATE FUNCTION goal_retirement_head_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE retired boolean;
BEGIN
  PERFORM id FROM goals WHERE id=NEW.goal_id AND workspace_id=NEW.workspace_id FOR SHARE;
  SELECT EXISTS (SELECT 1 FROM goals g JOIN goal_mandate_versions v
    ON v.goal_id=g.id AND v.workspace_id=g.workspace_id
    WHERE g.id=NEW.goal_id AND g.workspace_id=NEW.workspace_id
      AND g.status='archived' AND v.status='retired') INTO retired;
  IF retired THEN RAISE EXCEPTION 'goal_retired'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER goal_retirement_head_guard BEFORE INSERT OR UPDATE ON goal_mandate_heads
  FOR EACH ROW EXECUTE FUNCTION goal_retirement_head_guard();

CREATE FUNCTION goal_retirement_execution_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_goal uuid; retired boolean;
BEGIN
  SELECT g.id INTO target_goal FROM tasks t JOIN goals g ON g.id=t.goal_id
    WHERE t.id=NEW.task_id AND t.workspace_id=NEW.workspace_id FOR SHARE OF g;
  SELECT EXISTS (SELECT 1 FROM goals g JOIN goal_mandate_versions v
    ON v.goal_id=g.id AND v.workspace_id=g.workspace_id
    WHERE g.id=target_goal AND g.workspace_id=NEW.workspace_id
      AND g.status='archived' AND v.status='retired') INTO retired;
  IF retired THEN RAISE EXCEPTION 'goal_retired'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_goal_retirement_execution_guard BEFORE INSERT ON agent_executions
  FOR EACH ROW EXECUTE FUNCTION goal_retirement_execution_guard();

-- Deleting the current head retires its authority and invalidates even Ready
-- pins whose older source watch did not include Goal mandate heads.
CREATE FUNCTION goal_mandate_retirement_invalidate_ready() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed jsonb;
BEGIN
  changed := jsonb_build_array(jsonb_build_object('table','goal_mandate_heads','id',OLD.id,
    'label','Goal mandate retired','operation','delete','changedAt',
    to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  INSERT INTO events (id,workspace_id,task_id,type,source,resource_type,resource_id,payload,updated_at)
  SELECT gen_random_uuid(),workspace_id,id,'task_execution_ready_invalidated','roost','task',id::text,
    jsonb_build_object('pinId',execution_readiness->>'pinId','revision',execution_readiness->>'revision',
      'reason','goal_retired','changedSources',changed),now()
  FROM tasks WHERE workspace_id=OLD.workspace_id AND goal_id=OLD.goal_id
    AND execution_readiness->>'status'='ready';
  UPDATE tasks SET execution_readiness=execution_readiness || jsonb_build_object(
    'status','needs_revalidation','reason','goal_retired','changedSources',changed,
    'invalidatedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  WHERE workspace_id=OLD.workspace_id AND goal_id=OLD.goal_id
    AND execution_readiness->>'status'='ready';
  RETURN NULL;
END $$;
CREATE TRIGGER goal_mandate_retirement_invalidate_ready AFTER DELETE ON goal_mandate_heads
  FOR EACH ROW EXECUTE FUNCTION goal_mandate_retirement_invalidate_ready();

COMMIT;
