BEGIN;
-- Forward-only, UNAPPLIED. No defaults/backfill/adoption of business records.
-- This is the sole new lifecycle authority; existing identity anchors stay canonical.
-- NULL on every legacy row. These are transaction birth markers, never epochs.
ALTER TABLE agent_hosts ADD COLUMN lifecycle_birth_xid TEXT;
ALTER TABLE trusted_provider_ticket_keys ADD COLUMN lifecycle_birth_xid TEXT;
CREATE TABLE worker_identity_lifecycle (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('host','installation')),
 subject_id UUID NOT NULL,
 epoch INT NOT NULL CHECK(epoch>0), generation UUID NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('active','revoked')),
 previous_id UUID UNIQUE REFERENCES worker_identity_lifecycle(id) ON DELETE RESTRICT,
 decision_id UUID NOT NULL UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,
 record JSONB NOT NULL, record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 UNIQUE(workspace_id,kind,subject_id,epoch)
);
CREATE TABLE worker_identity_lifecycle_audit (
 operation_id UUID PRIMARY KEY REFERENCES worker_identity_lifecycle(id) ON DELETE RESTRICT,
 fence_revision BIGINT NOT NULL CHECK(fence_revision>0),
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$')
);
CREATE FUNCTION worker_identity_lifecycle_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'worker_identity_lifecycle_immutable'; END $$;
CREATE TRIGGER lifecycle_history_immutable BEFORE UPDATE OR DELETE ON worker_identity_lifecycle
 FOR EACH ROW EXECUTE FUNCTION worker_identity_lifecycle_immutable();
CREATE TRIGGER lifecycle_history_no_truncate BEFORE TRUNCATE ON worker_identity_lifecycle
 FOR EACH STATEMENT EXECUTE FUNCTION worker_identity_lifecycle_immutable();
CREATE TRIGGER lifecycle_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON worker_identity_lifecycle_audit
 FOR EACH STATEMENT EXECUTE FUNCTION worker_identity_lifecycle_immutable();

CREATE FUNCTION worker_identity_lifecycle_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE i JSONB:=NEW.record->'intent'; p worker_identity_lifecycle; ins worker_identity_lifecycle;
 w UUID; h agent_hosts; k trusted_provider_ticket_keys; rev INT; body JSONB; accepted_by UUID;
 accepted_agent UUID; accepted_credential UUID; auth JSONB; fresh BOOLEAN; action TEXT:=i->>'action';
BEGIN
 IF current_setting('transaction_isolation')<>'serializable' OR current_setting('session_replication_role')<>'origin'
 THEN RAISE EXCEPTION 'worker_identity_writer_unfenced'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'worker_identity_writer_unfenced'; END IF;
 -- Exact public JSON shape. No extensible metadata, secrets or unbounded prose.
 IF jsonb_typeof(NEW.record)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(NEW.record))<>8
 OR NOT NEW.record ?& ARRAY['id','intent','epoch','state','ownerId','decisionId','decisionRevision','previousId']
 OR jsonb_typeof(i)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(i))<>13
 OR NOT i ?& ARRAY['schemaVersion','workspaceId','kind','subjectId','action','expected','generation','installationId','installationGeneration','hostFingerprint','authorityDigest','adoptionEvidenceDigest','expiresAt']
 OR i->>'schemaVersion' IS DISTINCT FROM 'worker-identity-lifecycle-v1'
 OR (action IN ('create','adopt','update','revoke','replace')) IS DISTINCT FROM true
 OR jsonb_typeof(NEW.record->'epoch') IS DISTINCT FROM 'number'
 OR jsonb_typeof(NEW.record->'decisionRevision') IS DISTINCT FROM 'number'
 OR (i->>'expiresAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$') IS DISTINCT FROM true
 OR (i->>'authorityDigest' ~ '^[a-f0-9]{64}$') IS DISTINCT FROM true
 OR ((i->>'expiresAt')::timestamptz>clock_timestamp()) IS DISTINCT FROM true
 OR NEW.id::text IS DISTINCT FROM NEW.record->>'id' OR NEW.workspace_id::text IS DISTINCT FROM i->>'workspaceId'
 OR NEW.kind IS DISTINCT FROM i->>'kind' OR NEW.subject_id::text IS DISTINCT FROM i->>'subjectId'
 OR NEW.generation::text IS DISTINCT FROM i->>'generation' OR NEW.epoch::text IS DISTINCT FROM NEW.record->>'epoch'
 OR NEW.state IS DISTINCT FROM NEW.record->>'state' OR NEW.state IS DISTINCT FROM (CASE WHEN action='revoke' THEN 'revoked' ELSE 'active' END)
 OR NEW.decision_id::text IS DISTINCT FROM NEW.record->>'decisionId' OR NEW.previous_id::text IS DISTINCT FROM NEW.record->>'previousId'
 OR (action='adopt') IS DISTINCT FROM (i->>'adoptionEvidenceDigest' IS NOT NULL)
 OR i->>'adoptionEvidenceDigest' IS NOT NULL AND i->>'adoptionEvidenceDigest' !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'worker_identity_record_invalid'; END IF;
 SELECT owner_user_id INTO w FROM workspaces WHERE id=NEW.workspace_id;
 IF w::text IS DISTINCT FROM NEW.record->>'ownerId' OR
 (SELECT count(*) FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND role::text='owner')<>1 OR
 NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=w AND role::text='owner')
 THEN RAISE EXCEPTION 'worker_identity_owner_invalid'; END IF;
 SELECT r.version,r.body,a.actor_user_id,a.actor_agent_id,a.actor_credential_id,a.authority INTO rev,body,accepted_by,accepted_agent,accepted_credential,auth
 FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id AND r.workspace_id=d.workspace_id
 JOIN decision_acceptances a ON a.decision_id=d.id AND a.workspace_id=d.workspace_id
 WHERE d.id=NEW.decision_id AND d.workspace_id=NEW.workspace_id AND d.status='accepted' AND decision_state(d.id)='accepted'
 AND a.created_at<=clock_timestamp() AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id);
 IF rev IS NULL OR rev::text IS DISTINCT FROM NEW.record->>'decisionRevision' OR accepted_by IS DISTINCT FROM w
 OR accepted_agent IS NOT NULL OR accepted_credential IS NOT NULL OR auth->>'status' IS DISTINCT FROM 'owner_reserved'
 OR body->'workerIdentityLifecycle' IS DISTINCT FROM i OR body ?| ARRAY['authority','workerBootstrap','workerCredential','workerTransport']
 THEN RAISE EXCEPTION 'worker_identity_decision_invalid'; END IF;
 SELECT * INTO k FROM trusted_provider_ticket_keys WHERE workspace_id=NEW.workspace_id;
 IF k.installation_id::text IS DISTINCT FROM i->>'installationId' THEN RAISE EXCEPTION 'worker_identity_installation_mismatch'; END IF;
 IF NEW.kind='host' THEN
  SELECT * INTO h FROM agent_hosts WHERE id=NEW.subject_id AND workspace_id=NEW.workspace_id;
  IF h.id IS NULL OR i->>'hostFingerprint' IS NULL OR i->>'hostFingerprint' !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'worker_identity_host_mismatch'; END IF;
  fresh:=h.lifecycle_birth_xid=pg_current_xact_id()::text;
  SELECT * INTO ins FROM worker_identity_lifecycle WHERE workspace_id=NEW.workspace_id AND kind='installation'
   AND subject_id=k.installation_id ORDER BY epoch DESC LIMIT 1;
  IF action<>'revoke' AND (h.status::text='disabled' OR ins.id IS NULL OR ins.state<>'active' OR ins.generation::text IS DISTINCT FROM i->>'installationGeneration')
  THEN RAISE EXCEPTION 'worker_identity_installation_inactive'; END IF;
 ELSE
  fresh:=k.lifecycle_birth_xid=pg_current_xact_id()::text;
  IF NEW.subject_id<>k.installation_id OR i->>'installationGeneration' IS DISTINCT FROM NEW.generation::text OR i->>'hostFingerprint' IS NOT NULL
  THEN RAISE EXCEPTION 'worker_identity_installation_mismatch'; END IF;
 END IF;
 SELECT * INTO p FROM worker_identity_lifecycle WHERE workspace_id=NEW.workspace_id AND kind=NEW.kind AND subject_id=NEW.subject_id ORDER BY epoch DESC LIMIT 1;
 IF p.id IS NULL THEN
  IF action NOT IN ('create','adopt') OR i->'expected' IS DISTINCT FROM 'null'::jsonb OR NEW.previous_id IS NOT NULL OR NEW.epoch<>1
    OR action='create' AND fresh IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'worker_identity_legacy_blocked'; END IF;
 ELSE
  IF i->'expected' IS DISTINCT FROM jsonb_build_object('id',p.id,'epoch',p.epoch,'generation',p.generation)
    OR NEW.previous_id IS DISTINCT FROM p.id OR NEW.epoch::bigint<>p.epoch::bigint+1
  THEN RAISE EXCEPTION 'worker_identity_stale'; END IF;
  IF action='replace' THEN
   IF p.state<>'revoked' OR NEW.generation=p.generation OR EXISTS(SELECT 1 FROM worker_identity_lifecycle l
    WHERE l.workspace_id=NEW.workspace_id AND l.kind=NEW.kind AND l.subject_id=NEW.subject_id
    AND (l.generation=NEW.generation OR NEW.kind='host' AND l.record->'intent'->>'hostFingerprint'=i->>'hostFingerprint'))
   THEN RAISE EXCEPTION 'worker_identity_generation_reused'; END IF;
  ELSE
   IF action NOT IN ('update','revoke') OR p.state<>'active' OR NEW.generation<>p.generation
    OR (p.record->'intent'->'installationId') IS DISTINCT FROM i->'installationId'
    OR (p.record->'intent'->'installationGeneration') IS DISTINCT FROM i->'installationGeneration'
    OR (p.record->'intent'->'hostFingerprint') IS DISTINCT FROM i->'hostFingerprint'
    OR (action='update')=((p.record->'intent'->'authorityDigest') IS NOT DISTINCT FROM i->'authorityDigest')
   THEN RAISE EXCEPTION 'worker_identity_terminal'; END IF;
  END IF;
 END IF;
 NEW.record_digest:=encode(sha256(convert_to(NEW.record::text,'UTF8')),'hex');
 RETURN NEW;
END $$;
CREATE TRIGGER lifecycle_append_guard BEFORE INSERT ON worker_identity_lifecycle
 FOR EACH ROW EXECUTE FUNCTION worker_identity_lifecycle_guard();

CREATE FUNCTION worker_identity_lifecycle_audit_append() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO worker_identity_lifecycle_audit(operation_id,fence_revision,record_digest)
 SELECT NEW.id,revision,NEW.record_digest FROM ready_source_fence WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'worker_identity_audit_missing'; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER lifecycle_audit_append AFTER INSERT ON worker_identity_lifecycle
 FOR EACH ROW EXECUTE FUNCTION worker_identity_lifecycle_audit_append();

-- All existing host writers acquire the shared fence, including direct SQL.
-- Adopted authority cannot be mutated through register/heartbeat or maintenance.
CREATE FUNCTION worker_identity_host_anchor_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'worker_identity_writer_unfenced'; END IF;
 -- Preserve even unadopted anchors; delete/reinsert must not turn legacy into
 -- a falsely new birth under the same canonical host ID.
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'worker_identity_anchor_immutable'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id)
 THEN RAISE EXCEPTION 'worker_identity_anchor_immutable'; END IF;
 IF TG_OP='INSERT' THEN NEW.lifecycle_birth_xid:=pg_current_xact_id()::text; END IF;
 IF TG_OP='UPDATE' AND NEW.lifecycle_birth_xid IS DISTINCT FROM OLD.lifecycle_birth_xid
 THEN RAISE EXCEPTION 'worker_identity_birth_immutable'; END IF;
 IF TG_OP<>'INSERT' AND EXISTS(SELECT 1 FROM worker_identity_lifecycle WHERE kind='host' AND subject_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'worker_identity_anchor_immutable'; END IF;
  IF (to_jsonb(OLD)-'last_seen_at'-'updated_at'-'status') IS DISTINCT FROM (to_jsonb(NEW)-'last_seen_at'-'updated_at'-'status')
   OR (OLD.status::text='disabled') IS DISTINCT FROM (NEW.status::text='disabled')
  THEN RAISE EXCEPTION 'worker_identity_authority_requires_lifecycle'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER lifecycle_host_anchor_guard BEFORE INSERT OR UPDATE OR DELETE ON agent_hosts
 FOR EACH ROW EXECUTE FUNCTION worker_identity_host_anchor_guard();
CREATE TRIGGER lifecycle_host_no_truncate BEFORE TRUNCATE ON agent_hosts
 FOR EACH STATEMENT EXECUTE FUNCTION worker_identity_lifecycle_immutable();

-- This guard covers installation identity only. Issuer key rotation and its
-- authority/fence qualification deliberately remain outside this atom.
CREATE FUNCTION worker_identity_installation_anchor_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.lifecycle_birth_xid:=pg_current_xact_id()::text; END IF;
 IF TG_OP='UPDATE' AND NEW.lifecycle_birth_xid IS DISTINCT FROM OLD.lifecycle_birth_xid
 THEN RAISE EXCEPTION 'worker_identity_birth_immutable'; END IF;
 IF TG_OP='UPDATE' AND NEW.workspace_id=OLD.workspace_id AND NEW.installation_id=OLD.installation_id THEN RETURN NEW; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'worker_identity_writer_unfenced'; END IF;
 IF TG_OP<>'INSERT' AND EXISTS(SELECT 1 FROM worker_identity_lifecycle WHERE workspace_id=OLD.workspace_id)
 THEN RAISE EXCEPTION 'worker_identity_anchor_immutable'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER lifecycle_installation_anchor_guard BEFORE INSERT OR UPDATE OR DELETE ON trusted_provider_ticket_keys
 FOR EACH ROW EXECUTE FUNCTION worker_identity_installation_anchor_guard();
CREATE TRIGGER lifecycle_installation_no_truncate BEFORE TRUNCATE ON trusted_provider_ticket_keys
 FOR EACH STATEMENT EXECUTE FUNCTION worker_identity_lifecycle_immutable();

-- A reader must fail closed when any required guard is missing or disabled.
CREATE FUNCTION worker_identity_lifecycle_guarded() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT current_setting('session_replication_role')='origin'
 AND current_setting('transaction_isolation') IN ('repeatable read','serializable')
 AND EXISTS(SELECT 1 FROM ready_source_fence WHERE id=1)
 AND NOT EXISTS(SELECT 1 FROM (VALUES
 ('worker_identity_lifecycle','lifecycle_append_guard','worker_identity_lifecycle_guard'),
 ('worker_identity_lifecycle','lifecycle_history_immutable','worker_identity_lifecycle_immutable'),
 ('worker_identity_lifecycle','lifecycle_history_no_truncate','worker_identity_lifecycle_immutable'),
 ('worker_identity_lifecycle','lifecycle_audit_append','worker_identity_lifecycle_audit_append'),
 ('worker_identity_lifecycle_audit','lifecycle_audit_immutable','worker_identity_lifecycle_immutable'),
 ('agent_hosts','lifecycle_host_anchor_guard','worker_identity_host_anchor_guard'),
 ('agent_hosts','lifecycle_host_no_truncate','worker_identity_lifecycle_immutable'),
 ('trusted_provider_ticket_keys','lifecycle_installation_anchor_guard','worker_identity_installation_anchor_guard'),
 ('trusted_provider_ticket_keys','lifecycle_installation_no_truncate','worker_identity_lifecycle_immutable')
 ) AS required(tbl,trg,fn) WHERE NOT EXISTS(SELECT 1 FROM pg_trigger t
 WHERE t.tgrelid=to_regclass(required.tbl) AND t.tgname=required.trg AND t.tgenabled='O'
 AND t.tgfoid=to_regprocedure(required.fn||'()')));
$$;
COMMIT;
