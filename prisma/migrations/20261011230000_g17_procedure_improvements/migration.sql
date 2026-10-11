CREATE OR REPLACE FUNCTION procedure_contract_shape(b JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE f TEXT; s JSONB; seen TEXT[]:='{}'; roles TEXT[]:=ARRAY['requester','accountableManager','executor','verifier','releaser'];
BEGIN
 IF jsonb_typeof(b)<>'object' OR octet_length(b::text)>60000 OR COALESCE(b->>'kind','') NOT IN ('base','extension')
 OR COALESCE(b->>'taskType','') NOT IN ('code_change','maintenance','migration','review')
 OR COALESCE(b->>'operation','') NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede')
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(b) k WHERE k NOT IN ('kind','taskType','operation','applicationId','componentId','baseProcedureId','inputs','outputs','evidence','completion','roles','tools','steps','stepControlVersion')) THEN RETURN false; END IF;
 IF b ? 'stepControlVersion' AND b->'stepControlVersion'<>'1'::jsonb THEN RETURN false; END IF;
 FOREACH f IN ARRAY ARRAY['inputs','outputs','evidence','completion','roles','tools','steps'] LOOP
  IF jsonb_typeof(b->f) IS DISTINCT FROM 'array' OR jsonb_array_length(b->f)>(CASE WHEN f='steps' THEN 50 WHEN f='roles' THEN 5 ELSE 30 END) THEN RETURN false; END IF;
  IF f<>'steps' AND EXISTS(SELECT 1 FROM jsonb_array_elements(b->f) x WHERE jsonb_typeof(x)<>'string' OR length(x#>>'{}')>2000 OR length(trim(x#>>'{}'))<1) THEN RETURN false; END IF;
  IF f<>'steps' AND (SELECT count(*)<>count(DISTINCT x) FROM jsonb_array_elements(b->f) x) THEN RETURN false; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(b->'roles') r WHERE NOT r=ANY(roles)) THEN RETURN false; END IF;
 IF b->>'kind'='base' AND (b->>'applicationId' IS NOT NULL OR b->>'componentId' IS NOT NULL OR b->>'baseProcedureId' IS NOT NULL OR NOT b->'roles' @> to_jsonb(roles)
  OR EXISTS(SELECT 1 FROM unnest(ARRAY['steps','inputs','outputs','evidence','completion']) field_name WHERE jsonb_array_length(b->field_name)=0)) THEN RETURN false; END IF;
 IF b->>'kind'='extension' AND (b->>'applicationId' IS NULL OR b->>'componentId' IS NULL OR b->>'baseProcedureId' IS NULL) THEN RETURN false; END IF;
 FOR s IN SELECT * FROM jsonb_array_elements(b->'steps') LOOP
  IF jsonb_typeof(s)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(s) k WHERE k NOT IN ('key','instruction','role','tools','inputs','outputs','evidence','requires','sourceStepId','control'))
   OR COALESCE(s->>'key','') !~ '^[a-z][a-z0-9_-]{0,63}$' OR s->>'key'=ANY(seen) OR length(trim(COALESCE(s->>'instruction','')))<3
   OR NOT b->'roles' @> jsonb_build_array(s->>'role') THEN RETURN false; END IF;
  FOREACH f IN ARRAY ARRAY['tools','inputs','outputs','evidence','requires'] LOOP
   IF jsonb_typeof(s->f) IS DISTINCT FROM 'array' OR jsonb_array_length(s->f)>50
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(s->f) x WHERE jsonb_typeof(x)<>'string' OR length(x#>>'{}')>2000 OR length(trim(x#>>'{}'))<1) THEN RETURN false; END IF;
  END LOOP;
  IF NOT (b->'tools') @> (s->'tools') OR s->'requires' @> jsonb_build_array(s->>'key') OR
   b->>'kind'='base' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(s->'requires') r WHERE NOT r=ANY(seen)) THEN RETURN false; END IF;
  IF b ? 'stepControlVersion' THEN
   IF COALESCE(s->>'sourceStepId','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    OR jsonb_typeof(s->'control') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(s->'control'))<>5
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(s->'control') k WHERE k NOT IN ('executorClass','success','maxAttempts','escalation','fallback'))
    OR COALESCE(s->'control'->>'executorClass','') NOT IN ('deterministic_script','agent','human')
    OR COALESCE(s->'control'->>'maxAttempts','') !~ '^[1-5]$'
    OR EXISTS(SELECT 1 FROM unnest(ARRAY['success','escalation','fallback']) k WHERE length(trim(COALESCE(s->'control'->>k,'')))<3 OR length(s->'control'->>k)>2000)
   THEN RETURN false; END IF;
  ELSIF s ? 'sourceStepId' OR s ? 'control' THEN RETURN false;
  END IF;
  seen:=array_append(seen,s->>'key');
 END LOOP;
 RETURN true;
END $$;

CREATE FUNCTION g17_contract_source_steps() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.body->>'stepControlVersion'='1' THEN
  IF NOT procedure_contract_shape(NEW.body)
   OR (SELECT count(*) FROM jsonb_array_elements(NEW.body->'steps'))<>(SELECT count(*) FROM procedure_steps WHERE procedure_id=NEW.procedure_id)
   OR (SELECT count(DISTINCT step->>'sourceStepId') FROM jsonb_array_elements(NEW.body->'steps') step)<>(SELECT count(*) FROM procedure_steps WHERE procedure_id=NEW.procedure_id)
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.body->'steps') step
     WHERE NOT EXISTS(SELECT 1 FROM procedure_steps source_step WHERE source_step.id::text=step->>'sourceStepId'
      AND source_step.procedure_id=NEW.procedure_id AND source_step.instruction=step->>'instruction'))
  THEN RAISE EXCEPTION 'procedure_step_source_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER g17_contract_source_steps BEFORE INSERT ON procedure_contract_versions
 FOR EACH ROW EXECUTE FUNCTION g17_contract_source_steps();

ALTER TABLE native_capability_suspensions DROP CONSTRAINT native_capability_suspensions_operation_check;
ALTER TABLE native_capability_suspensions ADD CHECK(operation IN
 ('runtime_execute','review_decision','return_to_executor','create_specialist_task',
  'handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply',
  'interview_prepare','decision_supersede','finding_verify','finding_triage','procedure_improvement_propose'));

CREATE TABLE procedure_improvement_proposals (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 execution_id uuid NOT NULL REFERENCES agent_executions(id) ON DELETE RESTRICT,
 material_version text NOT NULL CHECK (material_version ~ '^[a-f0-9]{64}$'),
 composition_seal text NOT NULL CHECK (composition_seal ~ '^[a-f0-9]{64}$'),
 procedure_id uuid NOT NULL REFERENCES procedures(id) ON DELETE RESTRICT,
 contract_version_id uuid NOT NULL REFERENCES procedure_contract_versions(id) ON DELETE RESTRICT,
 source_step_id uuid NOT NULL REFERENCES procedure_steps(id) ON DELETE RESTRICT,
 step_key text NOT NULL,
 step_snapshot jsonb NOT NULL,
 observation text NOT NULL,
 proposed_instruction text NOT NULL,
 applicability text NOT NULL,
 rollback text NOT NULL,
 actor_kind text NOT NULL CHECK (actor_kind IN ('user','agent')),
 actor_id uuid NOT NULL,
 actor_credential_id uuid REFERENCES api_keys(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (workspace_id,request_id)
);
CREATE INDEX procedure_improvement_proposals_task_history ON procedure_improvement_proposals(workspace_id,task_id,created_at DESC,id DESC);

CREATE TABLE procedure_improvement_decisions (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 proposal_id uuid NOT NULL UNIQUE REFERENCES procedure_improvement_proposals(id) ON DELETE RESTRICT,
 decision text NOT NULL CHECK (decision IN ('accept','reject')),
 diagnosis text NOT NULL,
 applicability text NOT NULL,
 rollback text NOT NULL,
 reviewer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 draft_procedure_id uuid UNIQUE REFERENCES procedures(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (workspace_id,request_id),
 CHECK ((decision='accept')=(draft_procedure_id IS NOT NULL))
);

CREATE FUNCTION g17_improvement_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'procedure_improvement_immutable';
END $$;
CREATE TRIGGER g17_proposal_immutable BEFORE UPDATE OR DELETE ON procedure_improvement_proposals
 FOR EACH ROW EXECUTE FUNCTION g17_improvement_immutable();
CREATE TRIGGER g17_decision_immutable BEFORE UPDATE OR DELETE ON procedure_improvement_decisions
 FOR EACH ROW EXECUTE FUNCTION g17_improvement_immutable();

CREATE FUNCTION g17_proposal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE execution agent_executions; task_row tasks; contract_row procedure_contract_versions;
 source_row procedure_steps; snapshot jsonb; pinned jsonb; exact_step jsonb;
BEGIN
 SELECT * INTO execution FROM agent_executions WHERE id=NEW.execution_id;
 SELECT * INTO task_row FROM tasks WHERE id=NEW.task_id;
 SELECT * INTO contract_row FROM procedure_contract_versions WHERE id=NEW.contract_version_id;
 SELECT * INTO source_row FROM procedure_steps WHERE id=NEW.source_step_id;
 snapshot:=execution.metadata->'readyContextPin'->'procedureCompositionSnapshot';
 pinned:=execution.metadata->'readyContextPin';
 SELECT value INTO exact_step FROM jsonb_array_elements(COALESCE(snapshot->'steps','[]'::jsonb)) value
  WHERE value->>'key'=NEW.step_key AND value->>'versionId'=NEW.contract_version_id::text
   AND value->>'sourceStepId'=NEW.source_step_id::text LIMIT 1;
 IF native_capability_blocked(NEW.workspace_id,NEW.task_id,execution.application_id,'procedure_improvement_propose',
   CASE WHEN NEW.actor_kind='agent' THEN NEW.actor_id ELSE NULL END,NEW.actor_credential_id,NULL)
 THEN RAISE EXCEPTION 'native_capability_suspended'; END IF;
 IF execution.id IS NULL OR task_row.id IS NULL OR contract_row.id IS NULL OR source_row.id IS NULL
  OR execution.workspace_id<>NEW.workspace_id OR execution.task_id<>NEW.task_id
  OR task_row.workspace_id<>NEW.workspace_id OR execution.application_id IS NULL
  OR execution.status::text<>'completed' OR execution.context_invalidated_at IS NOT NULL
  OR contract_row.workspace_id<>NEW.workspace_id OR contract_row.procedure_id<>NEW.procedure_id
  OR source_row.procedure_id<>NEW.procedure_id OR NOT procedure_contract_valid(contract_row)
  OR contract_row.body->>'stepControlVersion'<>'1'
  OR source_row.instruction IS DISTINCT FROM exact_step->>'instruction'
  OR exact_step IS DISTINCT FROM NEW.step_snapshot OR exact_step->'control' IS NULL
  OR snapshot->>'seal' IS DISTINCT FROM NEW.composition_seal
  OR pinned->>'compositionSeal' IS DISTINCT FROM NEW.composition_seal
  OR encode(sha256(convert_to(task_review_material(execution)::text,'UTF8')),'hex') IS DISTINCT FROM NEW.material_version
  OR NOT EXISTS(SELECT 1 FROM task_review_decisions d WHERE d.execution_id=NEW.execution_id AND d.material_version=NEW.material_version)
 THEN RAISE EXCEPTION 'procedure_improvement_source_invalid'; END IF;
 IF NEW.actor_kind='agent' THEN
  IF NEW.actor_credential_id IS NULL OR task_row.assigned_workforce_entity_id IS DISTINCT FROM NEW.actor_id
   OR NOT EXISTS(SELECT 1 FROM api_keys k WHERE k.id=NEW.actor_credential_id AND k.workspace_id=NEW.workspace_id
    AND k.bound_agent_id=NEW.actor_id AND k.active AND k.revoked_at IS NULL AND k.expires_at>now())
  THEN RAISE EXCEPTION 'procedure_improvement_actor_invalid'; END IF;
 ELSIF NEW.actor_credential_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM workspace_memberships m
    WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_id AND m.role::text IN ('owner','admin','member'))
  THEN RAISE EXCEPTION 'procedure_improvement_actor_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER g17_proposal_guard BEFORE INSERT ON procedure_improvement_proposals
 FOR EACH ROW EXECUTE FUNCTION g17_proposal_guard();

CREATE FUNCTION g17_same_organizational_context(source_id uuid,draft_id uuid) RETURNS boolean LANGUAGE SQL STABLE AS $$
 SELECT NOT EXISTS(
   (SELECT workspace_id,relationship_role,department_id FROM organizational_department_relations
     WHERE entity_type='procedure' AND entity_id=source_id
    EXCEPT ALL
    SELECT workspace_id,relationship_role,department_id FROM organizational_department_relations
     WHERE entity_type='procedure' AND entity_id=draft_id)
   UNION ALL
   (SELECT workspace_id,relationship_role,department_id FROM organizational_department_relations
     WHERE entity_type='procedure' AND entity_id=draft_id
    EXCEPT ALL
    SELECT workspace_id,relationship_role,department_id FROM organizational_department_relations
     WHERE entity_type='procedure' AND entity_id=source_id)
 ) AND NOT EXISTS(
   (SELECT workspace_id,scope_type,scope_entity_id,label FROM organizational_scopes
     WHERE entity_type='procedure' AND entity_id=source_id
    EXCEPT ALL
    SELECT workspace_id,scope_type,scope_entity_id,label FROM organizational_scopes
     WHERE entity_type='procedure' AND entity_id=draft_id)
   UNION ALL
   (SELECT workspace_id,scope_type,scope_entity_id,label FROM organizational_scopes
     WHERE entity_type='procedure' AND entity_id=draft_id
    EXCEPT ALL
    SELECT workspace_id,scope_type,scope_entity_id,label FROM organizational_scopes
     WHERE entity_type='procedure' AND entity_id=source_id)
 ) AND NOT EXISTS(
   (SELECT workspace_id,owner_type,owner_id,responsibility_type FROM entity_ownerships
     WHERE entity_type='procedure' AND entity_id=source_id
    EXCEPT ALL
    SELECT workspace_id,owner_type,owner_id,responsibility_type FROM entity_ownerships
     WHERE entity_type='procedure' AND entity_id=draft_id)
   UNION ALL
   (SELECT workspace_id,owner_type,owner_id,responsibility_type FROM entity_ownerships
     WHERE entity_type='procedure' AND entity_id=draft_id
    EXCEPT ALL
    SELECT workspace_id,owner_type,owner_id,responsibility_type FROM entity_ownerships
     WHERE entity_type='procedure' AND entity_id=source_id)
 )
$$;

CREATE FUNCTION g17_decision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE proposal procedure_improvement_proposals; draft procedures; source_row procedures;
 contract_row procedure_contract_versions;
BEGIN
 PERFORM revision FROM ready_source_fence WHERE id=1 FOR UPDATE;
 SELECT * INTO proposal FROM procedure_improvement_proposals WHERE id=NEW.proposal_id;
 SELECT * INTO source_row FROM procedures WHERE id=proposal.procedure_id;
 SELECT * INTO contract_row FROM procedure_contract_versions WHERE id=proposal.contract_version_id;
 IF NEW.draft_procedure_id IS NOT NULL THEN SELECT * INTO draft FROM procedures WHERE id=NEW.draft_procedure_id; END IF;
 IF proposal.id IS NULL OR proposal.workspace_id<>NEW.workspace_id
  OR NOT EXISTS(SELECT 1 FROM workspaces w JOIN workspace_memberships m
    ON m.workspace_id=w.id AND m.user_id=NEW.reviewer_user_id AND m.role::text='owner'
    WHERE w.id=NEW.workspace_id AND w.owner_user_id=NEW.reviewer_user_id)
  OR (proposal.actor_kind='user' AND proposal.actor_id=NEW.reviewer_user_id)
  OR (NEW.decision='accept' AND (draft.id IS NULL OR draft.workspace_id<>NEW.workspace_id
    OR contract_row.id IS NULL OR NOT procedure_contract_valid(contract_row)
    OR source_row.status::text<>'active'
    OR NOT EXISTS(SELECT 1 FROM procedure_steps ss WHERE ss.id=proposal.source_step_id
      AND ss.procedure_id=source_row.id AND ss.instruction=proposal.step_snapshot->>'instruction')
    OR draft.status::text<>'draft' OR draft.family_id<>source_row.family_id OR draft.version<=source_row.version
    OR (to_jsonb(draft)-ARRAY['id','version','status','created_at','updated_at'])
       IS DISTINCT FROM (to_jsonb(source_row)-ARRAY['id','version','status','created_at','updated_at'])
    OR NOT g17_same_organizational_context(source_row.id,draft.id)
    OR (SELECT count(*) FROM procedure_steps WHERE procedure_id=draft.id)<>
       (SELECT count(*) FROM procedure_steps WHERE procedure_id=source_row.id)
    OR EXISTS(SELECT 1 FROM procedure_steps src LEFT JOIN procedure_steps next_step
      ON next_step.procedure_id=draft.id AND next_step.step_order=src.step_order
      WHERE src.procedure_id=source_row.id AND (next_step.id IS NULL
       OR next_step.instruction IS DISTINCT FROM
         CASE WHEN src.id=proposal.source_step_id THEN proposal.proposed_instruction ELSE src.instruction END
       OR (to_jsonb(next_step)-ARRAY['id','procedure_id','instruction','created_at','updated_at'])
          IS DISTINCT FROM (to_jsonb(src)-ARRAY['id','procedure_id','instruction','created_at','updated_at'])))))
 THEN RAISE EXCEPTION 'procedure_improvement_decision_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER g17_decision_guard BEFORE INSERT ON procedure_improvement_decisions
 FOR EACH ROW EXECUTE FUNCTION g17_decision_guard();

-- A reviewed one-step draft remains the exact decision artifact. Later status
-- transitions may occur through their existing separate authority, but generic
-- edits cannot rewrite the content or organizational scope behind the ledger.
CREATE FUNCTION g17_reviewed_draft_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked BOOLEAN;
BEGIN
 IF TG_TABLE_NAME='procedures' THEN
  SELECT EXISTS(SELECT 1 FROM procedure_improvement_decisions WHERE draft_procedure_id=OLD.id) INTO linked;
  IF linked THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'procedure_improvement_draft_immutable'; END IF;
   IF (to_jsonb(NEW)-ARRAY['status','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['status','updated_at'])
   THEN RAISE EXCEPTION 'procedure_improvement_draft_immutable'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='procedure_steps' THEN
  IF TG_OP IN ('UPDATE','DELETE') THEN
   IF EXISTS(SELECT 1 FROM procedure_improvement_decisions WHERE draft_procedure_id=OLD.procedure_id)
   THEN RAISE EXCEPTION 'procedure_improvement_draft_immutable'; END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
   IF EXISTS(SELECT 1 FROM procedure_improvement_decisions WHERE draft_procedure_id=NEW.procedure_id)
   THEN RAISE EXCEPTION 'procedure_improvement_draft_immutable'; END IF;
  END IF;
 ELSE
  IF TG_OP IN ('UPDATE','DELETE') THEN
   IF OLD.entity_type='procedure' AND EXISTS(SELECT 1 FROM procedure_improvement_decisions WHERE draft_procedure_id=OLD.entity_id)
   THEN RAISE EXCEPTION 'procedure_improvement_draft_immutable'; END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
   IF NEW.entity_type='procedure' AND EXISTS(SELECT 1 FROM procedure_improvement_decisions WHERE draft_procedure_id=NEW.entity_id)
   THEN RAISE EXCEPTION 'procedure_improvement_draft_immutable'; END IF;
  END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER g17_reviewed_draft_procedure BEFORE UPDATE OR DELETE ON procedures
 FOR EACH ROW EXECUTE FUNCTION g17_reviewed_draft_immutable();
CREATE TRIGGER g17_reviewed_draft_steps BEFORE INSERT OR UPDATE OR DELETE ON procedure_steps
 FOR EACH ROW EXECUTE FUNCTION g17_reviewed_draft_immutable();
CREATE TRIGGER g17_reviewed_draft_departments BEFORE INSERT OR UPDATE OR DELETE ON organizational_department_relations
 FOR EACH ROW EXECUTE FUNCTION g17_reviewed_draft_immutable();
CREATE TRIGGER g17_reviewed_draft_scopes BEFORE INSERT OR UPDATE OR DELETE ON organizational_scopes
 FOR EACH ROW EXECUTE FUNCTION g17_reviewed_draft_immutable();
CREATE TRIGGER g17_reviewed_draft_ownership BEFORE INSERT OR UPDATE OR DELETE ON entity_ownerships
 FOR EACH ROW EXECUTE FUNCTION g17_reviewed_draft_immutable();
