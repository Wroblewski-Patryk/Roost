BEGIN;
-- Add only the three explicitly governed post-observation operations. Existing
-- append-only records, identity/credential guards and business data are retained.
ALTER TABLE governed_release_operations
 DROP CONSTRAINT governed_release_operations_operation_check;
ALTER TABLE governed_release_operations
 ADD CONSTRAINT governed_release_operations_operation_check CHECK (
  operation IN ('push','pr','review','merge','deploy_config','deploy','observe',
   'rollback_config','rollback','smoke','fixture_cleanup','runtime_resume',
   'cleanup_resource','archive_repository','cleanup_local','cleanup')
 );
COMMIT;
