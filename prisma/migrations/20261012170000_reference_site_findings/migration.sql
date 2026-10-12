BEGIN;

-- G24a uses the existing Finding ledger. A reference site is a reviewed
-- CompanyRecord, never a fabricated Application or a second Finding store.
ALTER TABLE capability_observations ADD COLUMN reference_site_id UUID REFERENCES company_records(id) ON DELETE RESTRICT;
ALTER TABLE capability_observations ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE capability_observations ADD CONSTRAINT capability_observation_subject_xor
  CHECK (num_nonnulls(application_id, reference_site_id) = 1 AND
    (reference_site_id IS NULL OR num_nonnulls(application_capability_id, application_feature_id, application_capability_dimension_id) = 0));
CREATE INDEX capability_observations_reference_site ON capability_observations(reference_site_id, observed_at DESC);

ALTER TABLE finding_versions ADD COLUMN reference_site_id UUID REFERENCES company_records(id) ON DELETE RESTRICT;
ALTER TABLE finding_versions ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE finding_versions ADD CONSTRAINT finding_version_subject_xor CHECK (num_nonnulls(application_id, reference_site_id) = 1);
CREATE INDEX finding_versions_reference_site ON finding_versions(workspace_id, reference_site_id, created_at DESC);
CREATE UNIQUE INDEX finding_versions_reference_site_fingerprint
  ON finding_versions(workspace_id, reference_site_id, fingerprint) WHERE reference_site_id IS NOT NULL;

CREATE FUNCTION reference_site_fingerprint(s UUID, b JSONB) RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
 SELECT encode(sha256(convert_to(
   'roost-reference-site-finding-v1:' || s::text || ':' ||
   COALESCE(b->>'taskId','') || ':' || COALESCE(b->'source'->>'contentDigest','') || ':' ||
   COALESCE(b->>'category','') || ':' || COALESCE(b->>'observed',''), 'UTF8')), 'hex')
$$;

CREATE FUNCTION reference_site_version_check(v finding_versions) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE site company_records; task_row tasks; review company_source_reviews; item TEXT;
BEGIN
 IF v.version <> 1 OR (finding_latest(v.observation_id)).id IS NOT NULL OR
    v.actor_kind <> 'agent' OR NOT finding_principal(v.workspace_id,v.actor_kind,v.actor_id,v.credential_id) OR
    jsonb_typeof(v.body) IS DISTINCT FROM 'object' OR
    v.body->>'schemaVersion' IS DISTINCT FROM 'roost-reference-site-finding-v1' OR
    v.body->>'siteId' IS DISTINCT FROM v.reference_site_id::text OR
    COALESCE(v.body->>'category','') NOT IN ('content','function','journey','failure') OR
    COALESCE(v.body->'source'->>'contentDigest','') !~ '^[a-f0-9]{64}$' OR
    COALESCE(v.body->'source'->>'capturedAt','') = '' OR
    COALESCE(v.body->>'language','') NOT IN ('pl','en') OR
    v.fingerprint IS DISTINCT FROM reference_site_fingerprint(v.reference_site_id,v.body) THEN
    RAISE EXCEPTION 'reference_site_finding_invalid';
 END IF;
 FOREACH item IN ARRAY ARRAY['title','observed','interpretation','uncertainty','applicability'] LOOP
   IF jsonb_typeof(v.body->item) IS DISTINCT FROM 'string' OR length(trim(v.body->>item)) NOT BETWEEN 3 AND 2000 THEN
     RAISE EXCEPTION 'reference_site_finding_invalid';
   END IF;
 END LOOP;
 SELECT * INTO site FROM company_records WHERE id=v.reference_site_id AND workspace_id=v.workspace_id
   AND record_type='reference_site' AND application_id IS NULL AND status IN ('active','approved');
 SELECT * INTO task_row FROM tasks WHERE id=(v.body->>'taskId')::uuid AND workspace_id=v.workspace_id
   AND assigned_workforce_entity_id=v.actor_id AND status<>'archived';
 SELECT * INTO review FROM company_source_reviews WHERE id=(v.body->>'sourceReviewId')::uuid
   AND workspace_id=v.workspace_id AND task_id=task_row.id AND record_id=site.id
   AND action='approve' AND valid_from<=clock_timestamp() AND valid_until>clock_timestamp()
   AND record_revision=site.updated_at
   AND ordinal=(SELECT max(ordinal) FROM company_source_reviews WHERE workspace_id=v.workspace_id AND task_id=task_row.id AND record_id=site.id);
 IF site.id IS NULL OR task_row.id IS NULL OR review.id IS NULL OR
    v.body->'source'->>'url' IS DISTINCT FROM site.metadata->>'referenceUrl' OR
    v.body->'source'->>'providerVersion' IS DISTINCT FROM COALESCE(site.metadata->>'providerVersion','unknown') OR
    (v.body->'source'->>'recordRevision')::timestamp(3) IS DISTINCT FROM site.updated_at OR
    NOT EXISTS (SELECT 1 FROM capability_observations o WHERE o.id=v.observation_id
      AND o.application_id IS NULL AND o.reference_site_id=site.id AND o.observed_by_type='agent'
      AND o.observed_by_id=v.actor_id::text) THEN
   RAISE EXCEPTION 'reference_site_scope_invalid';
 END IF;
END $$;

-- Preserve the full application guard unchanged and branch only for the new
-- subject. These function definitions are captured from the applied schema.
DO $$ DECLARE definition TEXT; BEGIN
 definition:=pg_get_functiondef('finding_version_guard()'::regprocedure);
 IF definition IS NULL OR position('BEGIN' IN definition)=0 THEN RAISE EXCEPTION 'reference_site_migration_baseline_invalid'; END IF;
 definition:=regexp_replace(definition, '\mBEGIN\M', E'BEGIN\n IF NEW.reference_site_id IS NOT NULL THEN\n  PERFORM reference_site_version_check(NEW);\n  RETURN NEW;\n END IF;', 'i');
 EXECUTE definition;

 definition:=pg_get_functiondef('finding_journal_guard()'::regprocedure);
 IF definition IS NULL OR position('BEGIN' IN definition)=0 THEN RAISE EXCEPTION 'reference_site_migration_baseline_invalid'; END IF;
 definition:=regexp_replace(definition, '\mBEGIN\M', E'BEGIN\n IF EXISTS(SELECT 1 FROM finding_versions v WHERE v.id=NEW.version_id AND v.reference_site_id IS NOT NULL) THEN\n  IF NEW.action <> ''revision'' OR NEW.state <> ''observed'' OR NEW.sequence <> 1 OR NEW.grant_id IS NOT NULL OR NEW.proof <> ''{}''::jsonb OR\n    EXISTS(SELECT 1 FROM finding_journal j WHERE j.observation_id=NEW.observation_id) OR\n    NOT EXISTS(SELECT 1 FROM finding_versions v WHERE v.id=NEW.version_id AND v.observation_id=NEW.observation_id AND v.workspace_id=NEW.workspace_id AND v.actor_kind=NEW.actor_kind AND v.actor_id=NEW.actor_id AND v.credential_id=NEW.credential_id AND v.version=1) OR\n    NOT finding_principal(NEW.workspace_id,NEW.actor_kind,NEW.actor_id,NEW.credential_id) THEN RAISE EXCEPTION ''reference_site_action_denied''; END IF;\n  RETURN NEW;\n END IF;', 'i');
 EXECUTE definition;

 definition:=pg_get_functiondef('finding_occurrence_guard()'::regprocedure);
 IF definition IS NULL OR position('BEGIN' IN definition)=0 THEN RAISE EXCEPTION 'reference_site_migration_baseline_invalid'; END IF;
 definition:=regexp_replace(definition, '\mBEGIN\M', E'BEGIN\n IF EXISTS(SELECT 1 FROM finding_versions v WHERE v.observation_id=NEW.observation_id AND v.reference_site_id IS NOT NULL) THEN RAISE EXCEPTION ''reference_site_action_denied''; END IF;', 'i');
 EXECUTE definition;
END $$;

COMMIT;
