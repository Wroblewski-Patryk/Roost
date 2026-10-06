BEGIN;
-- Preserve the applied v1 validator and all its service/data/schema/rollback
-- guards. Unknown image build revision identifies only a FAILED attempt,
-- never candidate source provenance or successful installed health.
ALTER FUNCTION governed_release_compose_failed_partial_valid(JSONB,JSONB,JSONB)
 RENAME TO governed_release_compose_failed_partial_v1_valid;
CREATE FUNCTION governed_release_compose_failed_partial_valid(s JSONB,e JSONB,op JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r JSONB:=e->'composeRecovery';p JSONB:=r->'partial';q JSONB:=r->'queue';
 t JSONB:=s->'manifest'->'deployment'->'targets'->0;img JSONB;service JSONB;legacy_images JSONB;legacy_e JSONB;
BEGIN
 IF p->>'schemaVersion'='roost-compose-failed-partial-runtime-v1' THEN
  RETURN governed_release_compose_failed_partial_v1_valid(s,e,op);
 END IF;
 IF jsonb_typeof(p) IS DISTINCT FROM 'object'
  OR p->>'schemaVersion' IS DISTINCT FROM 'roost-compose-failed-partial-runtime-v2'
  OR r->>'kind' IS DISTINCT FROM 'queue_failed_partial' OR r->>'phase' IS DISTINCT FROM 'candidate'
  OR op->>'operation' IS DISTINCT FROM 'deploy' OR e->'healthy' IS DISTINCT FROM 'false'::jsonb
  OR NOT(p?&ARRAY['schemaVersion','images','candidateConfigDigest','databaseReadOnly','activeOtherSessions','ownedTransactions',
   'projectServiceSetComplete','protectedRollbackImages','presentRollbackImageDigests','publicHealth','sourceAttribution','candidateCodeProvenanceVerified'])
  OR (SELECT count(*) FROM jsonb_object_keys(p))<>12
  OR p->>'sourceAttribution' IS DISTINCT FROM 'failed_queue_exact_reference_and_runtime_environment'
  OR p->'candidateCodeProvenanceVerified' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_typeof(p->'images') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'images') IS DISTINCT FROM 4
  OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p->'images') v WHERE v->'buildRevision'='"unknown"'::jsonb)
  OR jsonb_typeof(q->'createdAt') IS DISTINCT FROM 'string' OR jsonb_typeof(q->'finishedAt') IS DISTINCT FROM 'string'
  THEN RETURN FALSE; END IF;
 FOR img IN SELECT v FROM jsonb_array_elements(p->'images') v LOOP
  IF jsonb_typeof(img) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(img))<>10
   OR NOT(img?&ARRAY['name','imageDigest','commit','tree','deploymentId','imageRef','createdAt','buildRevision','revisionLabel','treeLabel'])
   OR jsonb_typeof(img->'imageRef') IS DISTINCT FROM 'string'
   OR img->>'imageRef' IS DISTINCT FROM (t->>'targetId')||'_'||(img->>'name')||':'||(s->>'commit')
   OR jsonb_typeof(img->'buildRevision') IS DISTINCT FROM 'string'
   OR img->'buildRevision' IS DISTINCT FROM '"unknown"'::jsonb AND img->'buildRevision' IS DISTINCT FROM s->'commit'
   OR img->'revisionLabel' IS DISTINCT FROM 'null'::jsonb AND img->'revisionLabel' IS DISTINCT FROM s->'commit'
   OR img->'treeLabel' IS DISTINCT FROM 'null'::jsonb AND img->'treeLabel' IS DISTINCT FROM s->'candidateTree'
   OR jsonb_typeof(img->'createdAt') IS DISTINCT FROM 'string'
   OR img->>'createdAt' !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$'
   THEN RETURN FALSE; END IF;
  SELECT v INTO service FROM jsonb_array_elements(r->'services') v WHERE v->>'name'=img->>'name';
  IF service IS NULL OR service->>'role'='database' OR jsonb_typeof(service->'createdAt') IS DISTINCT FROM 'string'
   OR (img->>'createdAt')::timestamptz<(q->>'createdAt')::timestamptz
   OR (img->>'createdAt')::timestamptz>(q->>'finishedAt')::timestamptz
   OR (img->>'createdAt')::timestamptz>(service->>'createdAt')::timestamptz THEN RETURN FALSE; END IF;
 END LOOP;
 -- Internal pure structural projection only AFTER truthful image observations
 -- have qualified. It invokes the complete historical failure profile; stored
 -- v2 evidence retains actual unknown revision and false provenance flags.
 SELECT jsonb_agg(v-ARRAY['imageRef','createdAt','buildRevision','revisionLabel','treeLabel'] ORDER BY ord)
  INTO legacy_images FROM jsonb_array_elements(p->'images') WITH ORDINALITY a(v,ord);
 legacy_e:=jsonb_set(e,'{composeRecovery,partial}',
  (p-ARRAY['sourceAttribution','candidateCodeProvenanceVerified'])||jsonb_build_object(
   'schemaVersion','roost-compose-failed-partial-runtime-v1','images',legacy_images));
 RETURN governed_release_compose_failed_partial_v1_valid(s,legacy_e,op);
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
-- Refresh the guard's function dependency to the new qualified dispatcher.
CREATE OR REPLACE FUNCTION governed_release_compose_failed_partial_outcome_guard()
 RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;o governed_release_operations;
BEGIN
 IF NEW.evidence->'composeRecovery'->>'kind'='queue_failed_partial' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
  SELECT * INTO o FROM governed_release_operations WHERE id=NEW.operation_id;
  IF NOT(NEW.status='failed' AND NEW.observation_only=FALSE OR NEW.status='reconciled' AND NEW.reconciled_status='failed' AND NEW.observation_only=TRUE)
   OR governed_release_compose_failed_partial_valid(r.snapshot||jsonb_build_object('releaseId',r.id::text),NEW.evidence,to_jsonb(o)) IS DISTINCT FROM TRUE
   THEN RAISE EXCEPTION 'governed_release_compose_failed_partial_unproven'; END IF;
 END IF;RETURN NEW;
END $$;
COMMIT;
