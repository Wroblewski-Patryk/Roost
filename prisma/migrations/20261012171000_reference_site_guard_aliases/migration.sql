BEGIN;

-- The site branch introduced in the preceding additive migration used `v`
-- as a table alias inside guards that already declare a PL/pgSQL variable `v`.
-- PostgreSQL rejects those site inserts as ambiguous. Keep the applied
-- migration immutable and correct only the new branch here.
DO $$ DECLARE definition TEXT; baseline TEXT; BEGIN
  baseline := pg_get_functiondef('finding_journal_guard()'::regprocedure);
  definition := replace(baseline,
    'IF EXISTS(SELECT 1 FROM finding_versions v WHERE v.id=NEW.version_id AND v.reference_site_id IS NOT NULL)',
    'IF EXISTS(SELECT 1 FROM finding_versions site_version WHERE site_version.id=NEW.version_id AND site_version.reference_site_id IS NOT NULL)');
  definition := replace(definition,
    'NOT EXISTS(SELECT 1 FROM finding_versions v WHERE v.id=NEW.version_id AND v.observation_id=NEW.observation_id AND v.workspace_id=NEW.workspace_id AND v.actor_kind=NEW.actor_kind AND v.actor_id=NEW.actor_id AND v.credential_id=NEW.credential_id AND v.version=1)',
    'NOT EXISTS(SELECT 1 FROM finding_versions site_version WHERE site_version.id=NEW.version_id AND site_version.observation_id=NEW.observation_id AND site_version.workspace_id=NEW.workspace_id AND site_version.actor_kind=NEW.actor_kind AND site_version.actor_id=NEW.actor_id AND site_version.credential_id=NEW.credential_id AND site_version.version=1)');
  IF definition = baseline OR position('finding_versions v WHERE v.id=NEW.version_id AND v.reference_site_id' IN definition) > 0
    THEN RAISE EXCEPTION 'reference_site_guard_fix_baseline_invalid'; END IF;
  EXECUTE definition;

  baseline := pg_get_functiondef('finding_occurrence_guard()'::regprocedure);
  definition := replace(baseline,
    'IF EXISTS(SELECT 1 FROM finding_versions v WHERE v.observation_id=NEW.observation_id AND v.reference_site_id IS NOT NULL)',
    'IF EXISTS(SELECT 1 FROM finding_versions site_version WHERE site_version.observation_id=NEW.observation_id AND site_version.reference_site_id IS NOT NULL)');
  IF definition = baseline THEN RAISE EXCEPTION 'reference_site_guard_fix_baseline_invalid'; END IF;
  EXECUTE definition;
END $$;

COMMIT;
