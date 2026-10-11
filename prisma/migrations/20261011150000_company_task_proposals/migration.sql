-- G13: company task proposals retain the agent's observation separately from
-- the owner's decision and the ordinary Task/Ready lifecycle. All additions are
-- prospective; existing business records are untouched.
CREATE TABLE task_proposal_mandates (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 source_record_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
 source_review_id UUID NOT NULL REFERENCES company_source_reviews(id) ON DELETE RESTRICT,
 source_revision TIMESTAMP(3) NOT NULL, source_digest TEXT NOT NULL,
 agent_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
 credential_version INTEGER NOT NULL CHECK(credential_version > 0),
 issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reason TEXT NOT NULL, valid_until TIMESTAMP(3) NOT NULL,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id), CHECK(valid_until > created_at)
);
CREATE INDEX task_proposal_mandates_task ON task_proposal_mandates(workspace_id,source_task_id,created_at DESC);

CREATE TABLE task_proposal_mandate_revocations (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 mandate_id UUID NOT NULL UNIQUE REFERENCES task_proposal_mandates(id) ON DELETE RESTRICT,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reason TEXT NOT NULL, request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id)
);

CREATE TABLE task_proposals (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 origin_mandate_id UUID NOT NULL REFERENCES task_proposal_mandates(id) ON DELETE RESTRICT,
 source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 source_record_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
 source_review_id UUID NOT NULL REFERENCES company_source_reviews(id) ON DELETE RESTRICT,
 source_revision TIMESTAMP(3) NOT NULL, source_digest TEXT NOT NULL,
 author_agent_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 author_credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
 author_credential_version INTEGER NOT NULL CHECK(author_credential_version > 0),
 title TEXT NOT NULL, outcome TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN
   ('defect','unfinished_function','stale_documentation','missing_assumption','improvement')),
 priority_band TEXT NOT NULL CHECK(priority_band IN
   ('security_data_incident_outage','blocked_core_flow','wrong_result_action',
    'incomplete_flow_regression','stability_debt','approved_missing_feature','cosmetic_optimization')),
 priority_rationale TEXT NOT NULL, fingerprint TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,fingerprint), CHECK(length(fingerprint)=64)
);
CREATE INDEX task_proposals_workspace_created ON task_proposals(workspace_id,created_at DESC,id DESC);

-- One mandate may identify one canonical fingerprint. Several separately
-- authorized agents may report the same fingerprint without a second Task.
CREATE TABLE task_proposal_mandate_uses (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 mandate_id UUID NOT NULL UNIQUE REFERENCES task_proposal_mandates(id) ON DELETE RESTRICT,
 proposal_id UUID NOT NULL REFERENCES task_proposals(id) ON DELETE RESTRICT,
 fingerprint TEXT NOT NULL CHECK(length(fingerprint)=64),
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX task_proposal_mandate_uses_proposal ON task_proposal_mandate_uses(workspace_id,proposal_id);

CREATE TABLE task_proposal_occurrences (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 proposal_id UUID NOT NULL REFERENCES task_proposals(id) ON DELETE RESTRICT,
 mandate_id UUID NOT NULL REFERENCES task_proposal_mandates(id) ON DELETE RESTRICT,
 source_review_id UUID NOT NULL REFERENCES company_source_reviews(id) ON DELETE RESTRICT,
 source_revision TIMESTAMP(3) NOT NULL,
 actor_agent_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 actor_credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, body JSONB NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id)
);
CREATE INDEX task_proposal_occurrences_proposal ON task_proposal_occurrences(workspace_id,proposal_id,created_at DESC);

CREATE TABLE task_proposal_decisions (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 proposal_id UUID NOT NULL UNIQUE REFERENCES task_proposals(id) ON DELETE RESTRICT,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('accept','reject')),
 reason TEXT NOT NULL, task_id UUID UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
 snapshot JSONB NOT NULL, request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(workspace_id,request_id),
 CHECK((action='accept' AND task_id IS NOT NULL) OR (action='reject' AND task_id IS NULL))
);

CREATE FUNCTION task_proposal_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'task_proposal_history_immutable';
END $$;
CREATE TRIGGER task_proposal_mandates_immutable BEFORE UPDATE OR DELETE ON task_proposal_mandates FOR EACH ROW EXECUTE FUNCTION task_proposal_history_immutable();
CREATE TRIGGER task_proposal_mandate_revocations_immutable BEFORE UPDATE OR DELETE ON task_proposal_mandate_revocations FOR EACH ROW EXECUTE FUNCTION task_proposal_history_immutable();
CREATE TRIGGER task_proposals_immutable BEFORE UPDATE OR DELETE ON task_proposals FOR EACH ROW EXECUTE FUNCTION task_proposal_history_immutable();
CREATE TRIGGER task_proposal_mandate_uses_immutable BEFORE UPDATE OR DELETE ON task_proposal_mandate_uses FOR EACH ROW EXECUTE FUNCTION task_proposal_history_immutable();
CREATE TRIGGER task_proposal_occurrences_immutable BEFORE UPDATE OR DELETE ON task_proposal_occurrences FOR EACH ROW EXECUTE FUNCTION task_proposal_history_immutable();
CREATE TRIGGER task_proposal_decisions_immutable BEFORE UPDATE OR DELETE ON task_proposal_decisions FOR EACH ROW EXECUTE FUNCTION task_proposal_history_immutable();

CREATE FUNCTION task_proposal_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='task_proposal_mandates' THEN
  IF NOT EXISTS(SELECT 1 FROM workspaces w JOIN tasks t ON t.workspace_id=w.id
    JOIN workforce_entities a ON a.id=NEW.agent_id
    JOIN api_keys k ON k.id=NEW.credential_id JOIN company_records r ON r.id=NEW.source_record_id
    JOIN company_source_reviews v ON v.id=NEW.source_review_id
    WHERE w.id=NEW.workspace_id AND w.owner_user_id=NEW.issuer_user_id
      AND t.id=NEW.source_task_id
      AND t.assigned_workforce_entity_id=a.id AND t.status IN ('todo','in_progress')
      AND NOT EXISTS(SELECT 1 FROM application_projects ap
        JOIN applications app ON app.id=ap.application_id
        WHERE ap.project_id=t.project_id AND app.workspace_id=NEW.workspace_id)
      AND a.workspace_id=NEW.workspace_id AND a.type='agent' AND a.status='active'
      AND a.source<>'user'
      AND k.workspace_id=NEW.workspace_id AND k.active AND k.revoked_at IS NULL
      AND k.expires_at>clock_timestamp() AND k.credential_version=NEW.credential_version
      AND k.scopes @> '["agent-runtime:write"]'::jsonb
      AND k.bound_agent_id=a.id AND r.workspace_id=NEW.workspace_id AND r.application_id IS NULL
      AND r.updated_at=NEW.source_revision
      AND v.workspace_id=NEW.workspace_id AND v.task_id=t.id AND v.record_id=r.id
      AND v.action='approve' AND v.record_revision=NEW.source_revision AND v.content_digest=NEW.source_digest
      AND v.valid_from<=clock_timestamp() AND v.valid_until>=NEW.valid_until)
  THEN RAISE EXCEPTION 'task_proposal_scope_invalid'; END IF;
 ELSIF TG_TABLE_NAME='task_proposal_mandate_revocations' THEN
  IF NOT EXISTS(SELECT 1 FROM task_proposal_mandates m JOIN workspaces w ON w.id=m.workspace_id
    WHERE m.id=NEW.mandate_id AND m.workspace_id=NEW.workspace_id AND w.owner_user_id=NEW.actor_user_id)
  THEN RAISE EXCEPTION 'task_proposal_scope_invalid'; END IF;
 ELSIF TG_TABLE_NAME='task_proposals' THEN
  IF NOT EXISTS(SELECT 1 FROM tasks t JOIN company_records r ON r.id=NEW.source_record_id
    JOIN company_source_reviews v ON v.id=NEW.source_review_id
    JOIN task_proposal_mandates m ON m.id=NEW.origin_mandate_id
    WHERE t.id=NEW.source_task_id AND t.workspace_id=NEW.workspace_id
      AND NOT EXISTS(SELECT 1 FROM application_projects ap
        JOIN applications app ON app.id=ap.application_id
        WHERE ap.project_id=t.project_id AND app.workspace_id=NEW.workspace_id)
      AND r.workspace_id=NEW.workspace_id AND r.application_id IS NULL
      AND r.updated_at=NEW.source_revision
      AND v.workspace_id=NEW.workspace_id AND v.task_id=t.id AND v.record_id=r.id
      AND v.record_revision=NEW.source_revision AND v.content_digest=NEW.source_digest
      AND m.workspace_id=NEW.workspace_id AND m.source_task_id=t.id AND m.source_record_id=r.id
      AND m.source_review_id=v.id AND m.source_revision=NEW.source_revision
      AND m.source_digest=NEW.source_digest AND m.agent_id=NEW.author_agent_id
      AND m.credential_id=NEW.author_credential_id
      AND m.credential_version=NEW.author_credential_version
      AND m.valid_until>clock_timestamp()
      AND NOT EXISTS(SELECT 1 FROM task_proposal_mandate_revocations x WHERE x.mandate_id=m.id))
  THEN RAISE EXCEPTION 'task_proposal_scope_invalid'; END IF;
 ELSIF TG_TABLE_NAME='task_proposal_mandate_uses' THEN
  IF NOT EXISTS(SELECT 1 FROM task_proposal_mandates m JOIN task_proposals p ON p.id=NEW.proposal_id
    WHERE m.id=NEW.mandate_id AND m.workspace_id=NEW.workspace_id
      AND p.workspace_id=NEW.workspace_id AND p.fingerprint=NEW.fingerprint
      AND p.source_record_id=m.source_record_id AND p.source_review_id=m.source_review_id)
  THEN RAISE EXCEPTION 'task_proposal_scope_invalid'; END IF;
 ELSIF TG_TABLE_NAME='task_proposal_occurrences' THEN
  IF NOT EXISTS(SELECT 1 FROM task_proposal_mandates m JOIN task_proposal_mandate_uses u ON u.mandate_id=m.id
    JOIN task_proposals p ON p.id=u.proposal_id
    WHERE m.id=NEW.mandate_id AND m.workspace_id=NEW.workspace_id
      AND p.id=NEW.proposal_id AND p.workspace_id=NEW.workspace_id
      AND p.source_review_id=m.source_review_id
      AND m.source_review_id=NEW.source_review_id AND m.source_revision=NEW.source_revision
      AND m.agent_id=NEW.actor_agent_id AND m.credential_id=NEW.actor_credential_id)
  THEN RAISE EXCEPTION 'task_proposal_scope_invalid'; END IF;
 ELSIF TG_TABLE_NAME='task_proposal_decisions' THEN
  IF NOT EXISTS(SELECT 1 FROM task_proposals p JOIN workspaces w ON w.id=p.workspace_id
      WHERE p.id=NEW.proposal_id AND p.workspace_id=NEW.workspace_id AND w.owner_user_id=NEW.actor_user_id)
    OR (NEW.task_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tasks t WHERE t.id=NEW.task_id
      AND t.workspace_id=NEW.workspace_id AND t.owner_user_id=NEW.actor_user_id
      AND t.assigned_workforce_entity_id IS NULL AND t.project_id IS NULL AND t.task_list_id IS NULL
      AND t.source='roost' AND t.status='todo'
      AND t.execution_readiness->>'status'='draft'
      AND NOT EXISTS(SELECT 1 FROM agent_executions e WHERE e.task_id=t.id)))
  THEN RAISE EXCEPTION 'task_proposal_scope_invalid'; END IF;
  IF NEW.action='accept' AND NOT EXISTS(SELECT 1 FROM task_proposals p
    JOIN task_proposal_occurrences o ON o.proposal_id=p.id
    JOIN task_proposal_mandates m ON m.id=o.mandate_id
    JOIN api_keys k ON k.id=o.actor_credential_id
    JOIN workforce_entities a ON a.id=o.actor_agent_id
    JOIN tasks source_task ON source_task.id=m.source_task_id
    WHERE p.id=NEW.proposal_id AND p.workspace_id=NEW.workspace_id
      AND o.id::text=NEW.snapshot->'acceptanceBasis'->>'occurrenceId'
      AND m.id::text=NEW.snapshot->'acceptanceBasis'->>'mandateId'
      AND a.id::text=NEW.snapshot->'acceptanceBasis'->>'agentId'
      AND k.id::text=NEW.snapshot->'acceptanceBasis'->>'credentialId'
      AND o.workspace_id=p.workspace_id AND o.source_review_id=p.source_review_id
      AND o.source_revision=p.source_revision
      AND m.workspace_id=p.workspace_id AND m.source_task_id=p.source_task_id
      AND m.source_record_id=p.source_record_id AND m.source_review_id=p.source_review_id
      AND m.source_revision=p.source_revision AND m.source_digest=p.source_digest
      AND m.agent_id=o.actor_agent_id AND m.credential_id=o.actor_credential_id
      AND k.workspace_id=p.workspace_id AND k.bound_agent_id=o.actor_agent_id
      AND k.active AND k.revoked_at IS NULL
      AND k.credential_version=m.credential_version
      AND k.scopes @> '["agent-runtime:write"]'::jsonb
      AND a.workspace_id=p.workspace_id AND a.status='active' AND a.type='agent'
      AND a.source<>'user'
      AND source_task.workspace_id=p.workspace_id
      AND source_task.assigned_workforce_entity_id=o.actor_agent_id
      AND source_task.status IN ('todo','in_progress')
      AND NOT EXISTS(SELECT 1 FROM task_proposal_mandate_revocations x WHERE x.mandate_id=m.id))
  THEN RAISE EXCEPTION 'task_proposal_scope_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_proposal_mandates_scope BEFORE INSERT ON task_proposal_mandates FOR EACH ROW EXECUTE FUNCTION task_proposal_scope_guard();
CREATE TRIGGER task_proposal_mandate_revocations_scope BEFORE INSERT ON task_proposal_mandate_revocations FOR EACH ROW EXECUTE FUNCTION task_proposal_scope_guard();
CREATE TRIGGER task_proposals_scope BEFORE INSERT ON task_proposals FOR EACH ROW EXECUTE FUNCTION task_proposal_scope_guard();
CREATE TRIGGER task_proposal_mandate_uses_scope BEFORE INSERT ON task_proposal_mandate_uses FOR EACH ROW EXECUTE FUNCTION task_proposal_scope_guard();
CREATE TRIGGER task_proposal_occurrences_scope BEFORE INSERT ON task_proposal_occurrences FOR EACH ROW EXECUTE FUNCTION task_proposal_scope_guard();
CREATE TRIGGER task_proposal_decisions_scope BEFORE INSERT ON task_proposal_decisions FOR EACH ROW EXECUTE FUNCTION task_proposal_scope_guard();

-- An unmandated standalone proposal cannot become visible as pending work,
-- even when a privileged direct writer bypasses the HTTP service.
CREATE FUNCTION task_proposal_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM task_proposal_occurrences o
   JOIN task_proposal_mandate_uses u ON u.mandate_id=o.mandate_id AND u.proposal_id=o.proposal_id
   JOIN task_proposal_mandates m ON m.id=o.mandate_id
   WHERE o.proposal_id=NEW.id AND o.workspace_id=NEW.workspace_id
     AND o.actor_agent_id=NEW.author_agent_id AND o.actor_credential_id=NEW.author_credential_id
     AND o.source_review_id=NEW.source_review_id AND o.source_revision=NEW.source_revision
     AND m.id=NEW.origin_mandate_id
     AND m.source_task_id=NEW.source_task_id AND m.source_record_id=NEW.source_record_id)
 THEN RAISE EXCEPTION 'task_proposal_receipt_required'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER task_proposals_receipt AFTER INSERT ON task_proposals
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION task_proposal_receipt_guard();
