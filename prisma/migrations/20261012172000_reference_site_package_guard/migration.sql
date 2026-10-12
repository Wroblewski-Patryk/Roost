BEGIN;

-- The live-browser payload in the earlier additive migration was superseded
-- by a versioned package. Preserve applied migrations and update only the
-- reference-site branch; the application Finding guard remains unchanged.
CREATE UNIQUE INDEX reference_site_active_url_unique
  ON company_records(workspace_id, (metadata->>'referenceUrl'))
  WHERE record_type='reference_site' AND status<>'archived';
CREATE UNIQUE INDEX reference_site_active_project_unique
  ON company_records(workspace_id, (metadata->>'sourceId'))
  WHERE record_type='reference_site' AND status<>'archived';

CREATE FUNCTION reference_site_slot_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.record_type='reference_site' AND NEW.status<>'archived' THEN
   PERFORM pg_advisory_xact_lock(hashtext(NEW.workspace_id::text), 24024);
   IF (SELECT count(*) FROM company_records site
       WHERE site.workspace_id=NEW.workspace_id AND site.record_type='reference_site'
         AND site.status<>'archived' AND site.id<>NEW.id) >= 2 THEN
     RAISE EXCEPTION 'reference_site_limit' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reference_site_slot_guard_before
  BEFORE INSERT OR UPDATE OF record_type,status,workspace_id ON company_records
  FOR EACH ROW EXECUTE FUNCTION reference_site_slot_guard();

CREATE OR REPLACE FUNCTION reference_site_fingerprint(s UUID, b JSONB) RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
 SELECT encode(sha256(convert_to(
   'roost-reference-site-finding-v1:' || s::text || ':' ||
   COALESCE(b->>'taskId','') || ':' || COALESCE(b->'source'->>'contentDigest','') || ':' ||
   COALESCE(b->>'observationId','') || ':' || COALESCE(b->>'observed',''), 'UTF8')), 'hex')
$$;

CREATE OR REPLACE FUNCTION reference_site_version_check(v finding_versions) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE site company_records; task_row tasks; review company_source_reviews; item TEXT; source_observation JSONB;
BEGIN
 IF v.version <> 1 OR (finding_latest(v.observation_id)).id IS NOT NULL OR
    v.actor_kind <> 'agent' OR NOT finding_principal(v.workspace_id,v.actor_kind,v.actor_id,v.credential_id) OR
    jsonb_typeof(v.body) IS DISTINCT FROM 'object' OR
    v.body->>'schemaVersion' IS DISTINCT FROM 'roost-reference-site-finding-v1' OR
    v.body->>'siteId' IS DISTINCT FROM v.reference_site_id::text OR
    COALESCE(v.body->>'category','') NOT IN ('content','function','journey','failure') OR
    COALESCE(v.body->'source'->>'contentDigest','') !~ '^[a-f0-9]{64}$' OR
    COALESCE(v.body->'source'->>'preparedAt','') = '' OR
    COALESCE(v.body->>'language','') NOT IN ('pl','en') OR
    COALESCE(v.body->>'observationId','') !~ '^[a-z0-9][a-z0-9-]{2,79}$' OR
    v.fingerprint IS DISTINCT FROM reference_site_fingerprint(v.reference_site_id,v.body) THEN
    RAISE EXCEPTION 'reference_site_finding_invalid';
 END IF;
 FOREACH item IN ARRAY ARRAY['title','observed','sourceExcerpt','interpretation','uncertainty','applicability'] LOOP
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
 SELECT source_entry.value INTO source_observation
   FROM jsonb_array_elements(site.metadata->'package'->'observations') AS source_entry(value)
   WHERE source_entry.value->>'id'=v.body->>'observationId' LIMIT 1;
 IF site.id IS NULL OR task_row.id IS NULL OR review.id IS NULL OR source_observation IS NULL OR
    v.body->>'category' IS DISTINCT FROM source_observation->>'category' OR
    v.body->>'sourceLanguage' IS DISTINCT FROM source_observation->>'language' OR
    v.body->'evidence' IS DISTINCT FROM source_observation->'evidence' OR
    position(v.body->>'sourceExcerpt' in source_observation->>'text') = 0 OR
    v.body->'source'->>'url' IS DISTINCT FROM site.metadata->>'referenceUrl' OR
    v.body->'source'->>'providerVersion' IS DISTINCT FROM site.metadata->>'providerVersion' OR
    v.body->'source'->>'preparedAt' IS DISTINCT FROM site.metadata->'package'->>'preparedAt' OR
    v.body->'source'->'version' IS DISTINCT FROM site.metadata->'package'->'source' OR
    (v.body->'source'->>'recordRevision')::timestamp(3) IS DISTINCT FROM site.updated_at OR
    NOT EXISTS (SELECT 1 FROM capability_observations o WHERE o.id=v.observation_id
      AND o.application_id IS NULL AND o.reference_site_id=site.id AND o.observed_by_type='agent'
      AND o.observed_by_id=v.actor_id::text) THEN
   RAISE EXCEPTION 'reference_site_scope_invalid';
 END IF;
END $$;

COMMIT;
