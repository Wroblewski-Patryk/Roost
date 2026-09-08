BEGIN;

CREATE OR REPLACE FUNCTION task_require_roles() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p JSONB; r JSONB; previous JSONB; a JSONB; role_name TEXT; person RECORD;
BEGIN
  p := NEW.execution_role_provenance;
  IF TG_OP = 'UPDATE' THEN previous := OLD.execution_role_provenance; END IF;
  IF p IS DISTINCT FROM previous THEN
    IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' OR p IS DISTINCT FROM NEW.execution_readiness->'roleProvenance' OR NOT EXISTS (
      SELECT 1 FROM task_execution_submissions s WHERE s.task_id = NEW.id
      AND s.request_id::text = NEW.execution_readiness->>'submissionId' AND s.transaction_id = txid_current()
      AND s.pin_digest = encode(sha256(convert_to(NEW.execution_readiness::text, 'UTF8')), 'hex')
      AND s.actor_id::text = NEW.execution_readiness->>'requestedById' AND s.result->'readiness'->>'status' = 'ready'
    ) THEN RAISE EXCEPTION 'task_role_provenance_immutable'; END IF;
    IF previous IS NOT NULL THEN
      IF p->>'requesterUserId' IS DISTINCT FROM previous->>'requesterUserId' OR
        p->>'originatingSubmissionId' IS DISTINCT FROM previous->>'originatingSubmissionId' OR
        NOT ((p->'authors') @> (previous->'authors')) THEN RAISE EXCEPTION 'task_role_provenance_immutable'; END IF;
    ELSIF p->>'requesterUserId' IS DISTINCT FROM NEW.execution_readiness->>'requestedById' OR
      p->>'originatingSubmissionId' IS DISTINCT FROM NEW.execution_readiness->>'submissionId' THEN
      RAISE EXCEPTION 'task_role_provenance_required';
    END IF;
  END IF;
  -- Ordinary source edits are invalidated by the existing AFTER source trigger.
  -- An unchanged pin/provenance cannot grant or replace role authority.
  IF TG_OP = 'UPDATE' AND NEW.id = OLD.id AND NEW.workspace_id = OLD.workspace_id AND
    NEW.execution_readiness IS NOT DISTINCT FROM OLD.execution_readiness AND p IS NOT DISTINCT FROM previous THEN RETURN NEW; END IF;
  IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
  r := NEW.execution_readiness->'contract'->'taskRoles';
  IF r->>'schemaVersion' IS DISTINCT FROM 'roost-task-roles-v1' OR p->>'schemaVersion' IS DISTINCT FROM 'roost-role-provenance-v1' OR
    jsonb_typeof(p->'authors') IS DISTINCT FROM 'array' OR p IS DISTINCT FROM NEW.execution_readiness->'roleProvenance' OR
    r->'requester'->>'id' IS DISTINCT FROM p->>'requesterUserId' OR
    r->'executor'->>'id' IS DISTINCT FROM NEW.assigned_workforce_entity_id::text OR
    r->'executor'->>'id' IS DISTINCT FROM NEW.execution_readiness->'contract'->'assignment'->>'agentId' OR
    r->'accountableManager' IS DISTINCT FROM NEW.execution_readiness->'contract'->'singleTask'->'accountableManager'
  THEN RAISE EXCEPTION 'task_roles_required'; END IF;
  FOREACH role_name IN ARRAY ARRAY['requester','accountableManager','executor','verifier','releaser'] LOOP
    IF jsonb_typeof(r->role_name) IS DISTINCT FROM 'object' OR COALESCE(r->role_name->>'id','') !~ '^[a-f0-9-]{36}$' OR
      COALESCE(r->role_name->>'revision','') = '' THEN RAISE EXCEPTION 'task_roles_required'; END IF;
  END LOOP;
  IF NOT (p->'authors' @> jsonb_build_array(jsonb_build_object('kind','user','id',NEW.execution_readiness->>'requestedById'))) OR
    NOT (p->'authors' @> jsonb_build_array(jsonb_build_object('kind','agent','id',r->'executor'->>'id'))) THEN
    RAISE EXCEPTION 'task_role_provenance_required'; END IF;
  FOREACH role_name IN ARRAY ARRAY['verifier','releaser'] LOOP
    SELECT type, source, external_id, id INTO person FROM workforce_entities
      WHERE id::text = r->role_name->>'id' AND workspace_id = NEW.workspace_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'task_roles_required'; END IF;
    FOR a IN SELECT value FROM jsonb_array_elements(p->'authors') LOOP
      IF (person.type = 'agent' AND a->>'kind' = 'agent' AND a->>'id' = person.id::text) OR
        (person.type = 'human' AND person.source = 'user' AND a->>'kind' = 'user' AND a->>'id' = person.external_id) THEN
        RAISE EXCEPTION 'task_role_independence_required';
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
COMMIT;
