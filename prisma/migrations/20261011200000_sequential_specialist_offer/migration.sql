BEGIN;

-- The immutable review action is the exact offer. A specialist's response is a
-- separate, append-only receipt; it never grants execution or spends budget.
CREATE TABLE task_specialist_decisions (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  action_id UUID NOT NULL UNIQUE REFERENCES task_review_actions(id) ON DELETE RESTRICT,
  parent_task_id UUID NOT NULL,
  child_task_id UUID NOT NULL UNIQUE,
  specialist_id UUID NOT NULL,
  actor_credential_id UUID NOT NULL,
  actor_credential_prefix TEXT NOT NULL,
  actor_credential_version INTEGER NOT NULL,
  request_id UUID NOT NULL,
  request_hash TEXT NOT NULL,
  expected_version TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('accept','reject')),
  reason TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id,request_id),
  CHECK ((decision='accept' AND reason IS NULL) OR
         (decision='reject' AND length(trim(reason)) BETWEEN 3 AND 1000))
);
CREATE INDEX task_specialist_decisions_workspace_parent_created_idx
  ON task_specialist_decisions(workspace_id,parent_task_id,created_at);

CREATE FUNCTION task_specialist_offer_current(a task_review_actions)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE p tasks; c tasks; e agent_executions; d task_review_decisions; w workforce_entities;
BEGIN
 IF a.id IS NULL OR a.action<>'create_specialist_task' OR a.child_task_id IS NULL THEN RETURN false; END IF;
 SELECT * INTO p FROM tasks WHERE id=a.task_id AND workspace_id=a.workspace_id;
 SELECT * INTO c FROM tasks WHERE id=a.child_task_id AND workspace_id=a.workspace_id;
 SELECT * INTO d FROM task_review_decisions WHERE id=a.review_id AND workspace_id=a.workspace_id AND decision='reject';
 SELECT * INTO e FROM agent_executions WHERE task_id=a.task_id AND workspace_id=a.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1;
 SELECT * INTO w FROM workforce_entities WHERE id=(a.snapshot->'executor'->>'id')::uuid AND workspace_id=a.workspace_id;
 RETURN COALESCE(p.id IS NOT NULL AND c.id IS NOT NULL AND d.id IS NOT NULL AND e.id=d.execution_id
   AND e.status='completed' AND e.context_invalidated_at IS NULL
   AND d.snapshot->'result'=task_review_material(e)
   AND p.execution_readiness->>'pinId'=d.snapshot->'result'->'pin'->>'pinId'
   AND p.assigned_workforce_entity_id::text=d.snapshot->'result'->'contract'->'assignment'->>'agentId'
   AND c.assigned_workforce_entity_id=w.id AND w.status='active' AND w.type='agent' AND w.source<>'user'
   AND to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=a.snapshot->'executor'->>'revision'
   AND w.skill_index @> (a.snapshot->'contract'->'assignment'->'competencies'),false);
END $$;

CREATE FUNCTION task_specialist_offer_version(a task_review_actions)
RETURNS TEXT LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object(
   'actionId',a.id,'reviewId',a.review_id,'correction',a.correction,'snapshot',a.snapshot,
   'parent',(SELECT jsonb_build_object('readiness',execution_readiness,'assignee',assigned_workforce_entity_id,'updatedAt',updated_at) FROM tasks WHERE id=a.task_id),
   'child',(SELECT jsonb_build_object('readiness',execution_readiness,'assignee',assigned_workforce_entity_id,'updatedAt',updated_at) FROM tasks WHERE id=a.child_task_id),
   'specialist',(SELECT jsonb_build_object('status',status,'skillIndex',skill_index,'updatedAt',updated_at) FROM workforce_entities WHERE id=(a.snapshot->'executor'->>'id')::uuid)
 )::text,'UTF8')),'hex')
$$;

CREATE FUNCTION task_specialist_decision_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE a task_review_actions; p tasks; c tasks; k api_keys;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'task_specialist_decision_append_only'; END IF;
 SELECT * INTO a FROM task_review_actions WHERE id=NEW.action_id AND workspace_id=NEW.workspace_id;
 IF NOT FOUND OR a.task_id<>NEW.parent_task_id OR a.child_task_id IS DISTINCT FROM NEW.child_task_id THEN RAISE EXCEPTION 'task_specialist_offer_invalid'; END IF;
 SELECT * INTO p FROM tasks WHERE id=a.task_id FOR UPDATE;
 SELECT * INTO c FROM tasks WHERE id=a.child_task_id FOR UPDATE;
 SELECT * INTO k FROM api_keys WHERE id=NEW.actor_credential_id FOR UPDATE;
 IF NOT task_specialist_offer_current(a) OR c.execution_readiness->>'status'<>'draft'
   OR c.execution_readiness->'contract' IS DISTINCT FROM a.snapshot->'contract'
   OR NEW.expected_version IS DISTINCT FROM task_specialist_offer_version(a)
   OR NEW.specialist_id::text IS DISTINCT FROM a.snapshot->'executor'->>'id'
   OR k.id IS NULL OR k.workspace_id<>NEW.workspace_id OR k.bound_agent_id<>NEW.specialist_id
   OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at IS NULL OR k.expires_at<=clock_timestamp()
   OR k.key_prefix<>NEW.actor_credential_prefix OR k.credential_version<>NEW.actor_credential_version
   OR NOT k.scopes @> '["agent-runtime:write"]'::jsonb
 THEN RAISE EXCEPTION 'task_specialist_offer_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_specialist_decision_guard BEFORE INSERT OR UPDATE OR DELETE ON task_specialist_decisions
  FOR EACH ROW EXECUTE FUNCTION task_specialist_decision_guard();

-- An accepted offer stops admitting work when its exact key is revoked.
-- The receipt remains append-only evidence of what was accepted at the time.
CREATE FUNCTION task_specialist_acceptance_current(a task_review_actions)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT task_specialist_offer_current(a) AND EXISTS (
   SELECT 1 FROM task_specialist_decisions d JOIN api_keys k ON k.id=d.actor_credential_id
   WHERE d.action_id=a.id AND d.decision='accept'
     AND d.specialist_id::text=a.snapshot->'executor'->>'id'
     AND k.workspace_id=a.workspace_id AND k.bound_agent_id=d.specialist_id
     AND k.key_prefix=d.actor_credential_prefix AND k.credential_version=d.actor_credential_version
     AND k.active AND k.revoked_at IS NULL
     AND k.expires_at IS NOT NULL AND k.expires_at>statement_timestamp()
     AND k.scopes @> '["agent-runtime:write"]'::jsonb
 )
$$;

-- Direct SQL cannot make a correction child Ready without the exact accepted
-- offer and a fresh Submit receipt from the workspace owner. The old review
-- trigger continues to check the fixed correction scope and component.
CREATE FUNCTION task_specialist_ready_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE a task_review_actions; d task_specialist_decisions; c JSONB; offered JSONB; ceiling JSONB; owner_id UUID;
BEGIN
 IF NEW.execution_readiness->>'status'<>'ready' OR
   (TG_OP='UPDATE' AND NEW.execution_readiness IS NOT DISTINCT FROM OLD.execution_readiness)
 THEN RETURN NEW; END IF;
 SELECT * INTO a FROM task_review_actions WHERE child_task_id=NEW.id AND workspace_id=NEW.workspace_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 SELECT * INTO d FROM task_specialist_decisions WHERE action_id=a.id AND decision='accept';
 SELECT owner_user_id INTO owner_id FROM workspaces WHERE id=NEW.workspace_id;
 c:=NEW.execution_readiness->'contract'; offered:=a.snapshot->'contract'; ceiling:=offered->'budgets';
 IF d.id IS NULL OR NOT task_specialist_acceptance_current(a)
   OR NEW.assigned_workforce_entity_id<>d.specialist_id
   OR NEW.execution_readiness->>'requestedByType'<>'user'
   OR NEW.execution_readiness->>'requestedById' IS DISTINCT FROM owner_id::text
   OR NOT EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=owner_id AND m.role='owner')
   OR NOT EXISTS(SELECT 1 FROM task_execution_submissions s WHERE s.task_id=NEW.id AND s.request_id::text=NEW.execution_readiness->>'submissionId'
     AND s.actor_id=owner_id AND s.transaction_id=txid_current())
   OR ((c - 'budgets'::text) #- '{singleTask,measurement}'::text[]) IS DISTINCT FROM
      ((offered - 'budgets'::text) #- '{singleTask,measurement}'::text[])
   OR jsonb_typeof(c->'budgets'->'maxAttempts')<>'number'
   OR jsonb_typeof(c->'budgets'->'maxDurationSeconds')<>'number'
   OR jsonb_typeof(c->'budgets'->'maxOutputTokens')<>'number'
   OR ((c->'budgets') - ARRAY['maxAttempts','maxDurationSeconds','maxOutputTokens']::text[]) IS DISTINCT FROM '{}'::jsonb
   OR COALESCE((c->'budgets'->>'maxAttempts')::numeric<>1,true)
   OR COALESCE((c->'budgets'->>'maxDurationSeconds')::numeric NOT BETWEEN 60 AND (ceiling->>'maxDurationSeconds')::numeric,true)
   OR COALESCE((c->'budgets'->>'maxOutputTokens')::numeric NOT BETWEEN 128 AND (ceiling->>'maxOutputTokens')::numeric,true)
 THEN RAISE EXCEPTION 'task_specialist_ready_denied'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_specialist_ready_guard BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION task_specialist_ready_guard();

CREATE FUNCTION task_specialist_return_current(parent_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT EXISTS(
   SELECT 1 FROM task_review_actions a
   JOIN task_specialist_decisions offer ON offer.action_id=a.id AND offer.decision='accept'
   JOIN agent_executions e ON e.task_id=a.child_task_id AND e.workspace_id=a.workspace_id
   JOIN task_review_decisions review ON review.execution_id=e.id AND review.decision='approve'
   JOIN task_handoffs h ON h.execution_id=e.id AND h.task_id=a.child_task_id AND h.workspace_id=a.workspace_id
   JOIN task_handoff_decisions receipt ON receipt.handoff_id=h.id AND receipt.decision='accept'
   WHERE a.task_id=parent_id AND a.action='create_specialist_task'
     AND a.review_id=(SELECT id FROM task_review_decisions WHERE task_id=parent_id ORDER BY created_at DESC,id DESC LIMIT 1)
     AND e.id=(SELECT id FROM agent_executions WHERE task_id=a.child_task_id ORDER BY created_at DESC,id DESC LIMIT 1)
     AND e.status='completed' AND e.context_invalidated_at IS NULL
     AND review.snapshot->'result'=task_review_material(e)
     AND h.sender_role='executor' AND h.recipient_role='accountableManager'
     AND h.sender=jsonb_build_object('kind','agent','id',a.snapshot->'executor'->>'id')
     AND h.recipient=a.snapshot->'manager'->'principal'
     AND h.source->'reviewDecision'->>'id'=review.id::text
     AND task_handoff_current(h)
 );
$$;

CREATE FUNCTION task_specialist_parent_ready_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.execution_readiness->>'status'<>'ready' OR
   (TG_OP='UPDATE' AND NEW.execution_readiness IS NOT DISTINCT FROM OLD.execution_readiness)
 THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM task_review_actions a WHERE a.task_id=NEW.id AND a.action='create_specialist_task'
   AND a.review_id=(SELECT id FROM task_review_decisions WHERE task_id=NEW.id ORDER BY created_at DESC,id DESC LIMIT 1))
   AND NOT task_specialist_return_current(NEW.id)
 THEN RAISE EXCEPTION 'task_specialist_return_pending'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_specialist_parent_ready_guard BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION task_specialist_parent_ready_guard();

COMMIT;
