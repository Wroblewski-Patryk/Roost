-- A revoked grant without any operation has no governed external effect.
-- Preserve every grant/revocation and reject any prior intent, even unresolved.
-- The existing application transaction lock serializes competing admissions.
CREATE OR REPLACE FUNCTION governed_release_compatible_insert_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.snapshot?'compatibleArtifactRecovery' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  IF governed_release_compatible_basis_valid(NEW.snapshot,NEW.workspace_id,NEW.issuer_user_id,TRUE) IS DISTINCT FROM TRUE
   OR EXISTS(SELECT 1 FROM governed_releases r WHERE r.workspace_id=NEW.workspace_id
    AND r.snapshot->'compatibleArtifactRecovery'->'prior'->'closureId'=NEW.snapshot->'compatibleArtifactRecovery'->'prior'->'closureId'
    AND (NOT EXISTS(SELECT 1 FROM governed_release_revocations v WHERE v.release_id=r.id)
     OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=r.id))) THEN
   RAISE EXCEPTION 'governed_release_compatible_recovery_unproven';END IF;
 END IF;RETURN NEW;
END $$;
