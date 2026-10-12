BEGIN;

-- G24b keeps the existing Finding and Procedure registries. These two small
-- append-only receipts bind independent site review to an exact owner adoption.
CREATE TABLE reference_site_finding_reviews (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 site_id UUID NOT NULL REFERENCES company_records(id) ON DELETE RESTRICT,
 finding_id UUID NOT NULL UNIQUE REFERENCES capability_observations(id) ON DELETE RESTRICT,
 version_id UUID NOT NULL UNIQUE REFERENCES finding_versions(id) ON DELETE RESTRICT,
 reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 verdict TEXT NOT NULL CHECK (verdict IN ('confirmed','rejected','inconclusive')),
 rationale TEXT NOT NULL CHECK (length(trim(rationale)) BETWEEN 3 AND 2000),
 evidence TEXT NOT NULL CHECK (length(trim(evidence)) BETWEEN 3 AND 2000),
 finding_digest TEXT NOT NULL CHECK (finding_digest ~ '^[a-f0-9]{64}$'),
 source_review_id UUID NOT NULL REFERENCES company_source_reviews(id) ON DELETE RESTRICT,
 record_revision TIMESTAMP(3) NOT NULL,
 site_metadata_digest TEXT NOT NULL CHECK (site_metadata_digest ~ '^[a-f0-9]{64}$'),
 package_digest TEXT NOT NULL CHECK (package_digest ~ '^[a-f0-9]{64}$'),
 request_id UUID NOT NULL,
 request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (workspace_id,request_id)
);
CREATE INDEX reference_site_finding_reviews_task ON reference_site_finding_reviews(workspace_id,task_id,created_at DESC);

CREATE TABLE reference_site_checklist_decisions (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 procedure_id UUID NOT NULL UNIQUE REFERENCES procedures(id) ON DELETE RESTRICT,
 owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 source_digest TEXT NOT NULL CHECK (source_digest ~ '^[a-f0-9]{64}$'),
 preview_digest TEXT NOT NULL CHECK (preview_digest ~ '^[a-f0-9]{64}$'),
 request_id UUID NOT NULL,
 request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (workspace_id,request_id)
);
CREATE INDEX reference_site_checklist_decisions_task ON reference_site_checklist_decisions(workspace_id,task_id,created_at DESC);
CREATE UNIQUE INDEX reference_site_one_active_checklist ON procedures(workspace_id)
 WHERE scope='roost-reference-site-checklist-v1' AND status='active';

CREATE FUNCTION reference_site_review_current(v finding_versions) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS (
  SELECT 1 FROM company_records site JOIN company_source_reviews source_review
   ON source_review.id=(v.body->>'sourceReviewId')::uuid
  WHERE site.id=v.reference_site_id AND site.workspace_id=v.workspace_id
   AND site.record_type='reference_site' AND site.status IN ('active','approved')
   AND site.application_id IS NULL AND site.project_id IS NULL AND site.client_id IS NULL
   AND source_review.workspace_id=v.workspace_id AND source_review.record_id=site.id
   AND source_review.task_id=(v.body->>'taskId')::uuid AND source_review.action='approve'
   AND source_review.record_revision=site.updated_at
   AND source_review.valid_from<=clock_timestamp() AND source_review.valid_until>clock_timestamp()
   AND source_review.ordinal=(SELECT max(ordinal) FROM company_source_reviews
      WHERE workspace_id=v.workspace_id AND record_id=site.id AND task_id=source_review.task_id)
   AND (v.body->'source'->>'recordRevision')::timestamp(3)=site.updated_at
   AND v.body->'source'->>'contentDigest' ~ '^[a-f0-9]{64}$'
   AND v.body->'source'->>'sourceReviewId'=source_review.id::text
   AND v.body->'source'->>'url'=site.metadata->>'referenceUrl'
   AND v.body->'source'->>'providerVersion'=site.metadata->>'providerVersion'
   AND v.body->'source'->'version'=site.metadata->'package'->'source'
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(site.metadata->'package'->'observations') item
     WHERE item->>'id'=v.body->>'observationId'
       AND item->>'category'=v.body->>'category'
       AND item->'evidence'=v.body->'evidence')
 )
$$;

CREATE FUNCTION reference_site_finding_review_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v finding_versions; site company_records;
BEGIN
 PERFORM revision FROM ready_source_fence WHERE id=1 FOR UPDATE;
 SELECT * INTO v FROM finding_versions WHERE id=NEW.version_id AND observation_id=NEW.finding_id
  AND workspace_id=NEW.workspace_id AND reference_site_id=NEW.site_id;
 SELECT * INTO site FROM company_records WHERE id=NEW.site_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF v.id IS NULL OR site.id IS NULL OR v.actor_kind<>'agent'
  OR v.body->>'taskId' IS DISTINCT FROM NEW.task_id::text
  OR v.actor_id=NEW.reviewer_user_id
  OR NOT EXISTS(SELECT 1 FROM workspaces w JOIN workspace_memberships m
     ON m.workspace_id=w.id AND m.user_id=NEW.reviewer_user_id AND m.role='owner'
     WHERE w.id=NEW.workspace_id AND w.owner_user_id=NEW.reviewer_user_id)
  OR NOT reference_site_review_current(v)
  OR NEW.finding_digest IS DISTINCT FROM encode(sha256(convert_to(v.body::text,'UTF8')),'hex')
  OR NEW.source_review_id::text IS DISTINCT FROM v.body->>'sourceReviewId'
  OR NEW.record_revision IS DISTINCT FROM site.updated_at
  OR NEW.site_metadata_digest IS DISTINCT FROM encode(sha256(convert_to(site.metadata::text,'UTF8')),'hex')
  OR NEW.package_digest IS DISTINCT FROM v.body->'source'->>'contentDigest'
  OR NOT EXISTS(SELECT 1 FROM tasks t WHERE t.id=NEW.task_id AND t.workspace_id=NEW.workspace_id
     AND t.assigned_workforce_entity_id=v.actor_id AND t.status<>'archived')
 THEN RAISE EXCEPTION 'reference_site_review_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reference_site_finding_review_guard BEFORE INSERT ON reference_site_finding_reviews
 FOR EACH ROW EXECUTE FUNCTION reference_site_finding_review_guard();

CREATE FUNCTION reference_site_checklist_decision_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p procedures; s procedure_steps; r reference_site_finding_reviews; v finding_versions;
BEGIN
 PERFORM revision FROM ready_source_fence WHERE id=1 FOR UPDATE;
 SELECT * INTO p FROM procedures WHERE id=NEW.procedure_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF p.id IS NULL OR p.scope<>'roost-reference-site-checklist-v1' OR p.status<>'draft'
  OR p.name<>'Website evidence checklist' OR p.expected_result IS NULL
  OR NEW.source_digest IS DISTINCT FROM procedure_contract_source(p.id)
  OR NOT EXISTS(SELECT 1 FROM workspaces w JOIN workspace_memberships m
      ON m.workspace_id=w.id AND m.user_id=NEW.owner_user_id AND m.role='owner'
      WHERE w.id=NEW.workspace_id AND w.owner_user_id=NEW.owner_user_id)
  OR (SELECT count(*) FROM procedure_steps WHERE procedure_id=p.id) NOT BETWEEN 1 AND 2
  OR EXISTS(SELECT 1 FROM procedures earlier WHERE earlier.workspace_id=p.workspace_id
      AND earlier.scope=p.scope AND earlier.family_id<>p.family_id)
  OR p.version IS DISTINCT FROM (SELECT COALESCE(max(version),0) FROM procedures
      WHERE workspace_id=p.workspace_id AND family_id=p.family_id)
 THEN RAISE EXCEPTION 'reference_site_checklist_decision_invalid'; END IF;
 FOR s IN SELECT * FROM procedure_steps WHERE procedure_id=p.id ORDER BY step_order LOOP
  SELECT * INTO r FROM reference_site_finding_reviews
   WHERE id=(s.validation_rule->'source'->>'reviewId')::uuid AND workspace_id=NEW.workspace_id
     AND task_id=NEW.task_id AND finding_id=(s.validation_rule->'source'->>'findingId')::uuid
     AND verdict='confirmed';
  SELECT * INTO v FROM finding_versions WHERE id=r.version_id;
  PERFORM id FROM company_records WHERE id=r.site_id FOR UPDATE;
  IF r.id IS NULL OR v.id IS NULL OR NOT reference_site_review_current(v)
   OR encode(sha256(convert_to(v.body::text,'UTF8')),'hex') IS DISTINCT FROM r.finding_digest
   OR s.validation_rule->>'schemaVersion' IS DISTINCT FROM 'roost-reference-site-checklist-item-v1'
   OR s.validation_rule->>'status' IS DISTINCT FROM 'approved'
   OR s.validation_rule->>'ownerUserId' IS DISTINCT FROM NEW.owner_user_id::text
   OR COALESCE(s.validation_rule->>'itemId','') !~ '^[a-z][a-z0-9-]{2,79}$'
   OR length(trim(COALESCE(s.validation_rule->>'applicability',''))) NOT BETWEEN 3 AND 2000
   OR length(trim(COALESCE(s.validation_rule->>'acceptanceCriterion',''))) NOT BETWEEN 3 AND 2000
   OR length(trim(COALESCE(s.instruction,''))) NOT BETWEEN 3 AND 2000
   OR length(trim(COALESCE(s.rollback_instruction,''))) NOT BETWEEN 3 AND 2000
   OR length(trim(COALESCE(s.expected_input->>'description',''))) NOT BETWEEN 3 AND 2000
   OR length(trim(COALESCE(s.expected_output->>'description',''))) NOT BETWEEN 3 AND 2000
   OR s.validation_rule->'source'->>'findingDigest' IS DISTINCT FROM r.finding_digest
   OR s.validation_rule->'source'->>'siteId' IS DISTINCT FROM r.site_id::text
   OR s.validation_rule->'source'->>'taskId' IS DISTINCT FROM NEW.task_id::text
   OR s.validation_rule->'source'->>'sourceReviewId' IS DISTINCT FROM r.source_review_id::text
   OR s.validation_rule->'source'->>'packageDigest' IS DISTINCT FROM r.package_digest
   OR s.validation_rule->'source'->>'metadataDigest' IS DISTINCT FROM r.site_metadata_digest
   OR r.site_metadata_digest IS DISTINCT FROM (SELECT encode(sha256(convert_to(metadata::text,'UTF8')),'hex')
      FROM company_records WHERE id=r.site_id)
   OR (s.validation_rule->'source'->>'recordRevision')::timestamp(3) IS DISTINCT FROM r.record_revision
   OR s.validation_rule->'source'->>'observationId' IS DISTINCT FROM v.body->>'observationId'
  THEN RAISE EXCEPTION 'reference_site_checklist_item_invalid'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT ps.validation_rule->>'itemId') FROM procedure_steps ps WHERE ps.procedure_id=p.id)
    <> (SELECT count(*) FROM procedure_steps WHERE procedure_id=p.id)
 THEN RAISE EXCEPTION 'reference_site_checklist_item_duplicate'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reference_site_checklist_decision_guard BEFORE INSERT ON reference_site_checklist_decisions
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_decision_guard();

CREATE FUNCTION reference_site_checklist_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE linked BOOLEAN; target_id UUID;
BEGIN
 IF TG_TABLE_NAME='procedures' THEN
  target_id:=CASE WHEN TG_OP='INSERT' THEN NEW.id ELSE OLD.id END;
 ELSE
  target_id:=CASE WHEN TG_OP='INSERT' THEN NEW.procedure_id ELSE OLD.procedure_id END;
 END IF;
 SELECT EXISTS(SELECT 1 FROM reference_site_checklist_decisions WHERE procedure_id=target_id) INTO linked;
 IF TG_TABLE_NAME='procedures' THEN
  IF TG_OP='INSERT' AND NEW.scope='roost-reference-site-checklist-v1' AND NEW.status<>'draft'
   THEN RAISE EXCEPTION 'reference_site_checklist_activation_denied'; END IF;
  IF TG_OP='UPDATE' AND NEW.scope='roost-reference-site-checklist-v1' AND NEW.status='active'
   AND NOT linked THEN RAISE EXCEPTION 'reference_site_checklist_activation_denied'; END IF;
  IF linked THEN
   IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['status','updated_at']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','updated_at']) OR
     (OLD.status='draft' AND NEW.status<>'active') OR
     (OLD.status='active' AND (NEW.status<>'retired' OR NOT EXISTS(
       SELECT 1 FROM reference_site_checklist_decisions replacement
       JOIN procedures successor ON successor.id=replacement.procedure_id
       WHERE successor.workspace_id=OLD.workspace_id AND successor.family_id=OLD.family_id
         AND successor.version>OLD.version AND successor.status='draft'))) OR
     (OLD.status='retired' AND NEW.status<>'retired')
   THEN RAISE EXCEPTION 'reference_site_checklist_immutable'; END IF;
  END IF;
 ELSIF linked THEN
  RAISE EXCEPTION 'reference_site_checklist_immutable';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER reference_site_checklist_history_procedure BEFORE INSERT OR UPDATE OR DELETE ON procedures
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_history_guard();
CREATE TRIGGER reference_site_checklist_history_steps BEFORE INSERT OR UPDATE OR DELETE ON procedure_steps
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_history_guard();

CREATE FUNCTION reference_site_checklist_context_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE old_id UUID; new_id UUID;
BEGIN
 IF TG_OP<>'INSERT' AND OLD.entity_type='procedure' THEN old_id:=OLD.entity_id; END IF;
 IF TG_OP<>'DELETE' AND NEW.entity_type='procedure' THEN new_id:=NEW.entity_id; END IF;
 IF EXISTS(SELECT 1 FROM reference_site_checklist_decisions
   WHERE procedure_id=old_id OR procedure_id=new_id)
 THEN RAISE EXCEPTION 'reference_site_checklist_immutable'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER reference_site_checklist_context_departments BEFORE INSERT OR UPDATE OR DELETE ON organizational_department_relations
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_context_guard();
CREATE TRIGGER reference_site_checklist_context_scopes BEFORE INSERT OR UPDATE OR DELETE ON organizational_scopes
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_context_guard();
CREATE TRIGGER reference_site_checklist_context_ownership BEFORE INSERT OR UPDATE OR DELETE ON entity_ownerships
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_context_guard();

CREATE FUNCTION reference_site_checklist_receipt_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'reference_site_checklist_receipt_immutable'; END $$;
CREATE TRIGGER reference_site_review_immutable BEFORE UPDATE OR DELETE ON reference_site_finding_reviews
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_receipt_immutable();
CREATE TRIGGER reference_site_decision_immutable BEFORE UPDATE OR DELETE ON reference_site_checklist_decisions
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_receipt_immutable();
CREATE TRIGGER reference_site_review_no_truncate BEFORE TRUNCATE ON reference_site_finding_reviews
 FOR EACH STATEMENT EXECUTE FUNCTION reference_site_checklist_receipt_immutable();
CREATE TRIGGER reference_site_decision_no_truncate BEFORE TRUNCATE ON reference_site_checklist_decisions
 FOR EACH STATEMENT EXECUTE FUNCTION reference_site_checklist_receipt_immutable();

-- Generic Procedure composition cannot admit this task-bound checklist.
CREATE FUNCTION reference_site_checklist_composition_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='procedure_contract_versions' THEN
  IF EXISTS(SELECT 1 FROM procedures WHERE id=NEW.procedure_id
    AND scope='roost-reference-site-checklist-v1') THEN
   RAISE EXCEPTION 'reference_site_checklist_composition_denied';
  END IF;
 ELSIF EXISTS(SELECT 1 FROM procedures WHERE id IN (NEW.base_procedure_id,NEW.extension_procedure_id)
    AND scope='roost-reference-site-checklist-v1') THEN
  RAISE EXCEPTION 'reference_site_checklist_composition_denied';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reference_site_checklist_contract_denied BEFORE INSERT ON procedure_contract_versions
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_composition_guard();
CREATE TRIGGER reference_site_checklist_selection_denied BEFORE INSERT ON task_composition_selections
 FOR EACH ROW EXECUTE FUNCTION reference_site_checklist_composition_guard();

COMMIT;
