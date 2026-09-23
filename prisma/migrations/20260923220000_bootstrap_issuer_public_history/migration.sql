BEGIN;
-- PROPOSAL / UNAPPLIED. Append-only public lifecycle on the existing key anchor.
-- No defaults, backfill, key generation, secrets or automatic legacy adoption.
CREATE TABLE bootstrap_issuer_history (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES trusted_provider_ticket_keys(workspace_id) ON DELETE RESTRICT,
 revision INT NOT NULL CHECK(revision>0), decision_id UUID NOT NULL UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,
 record JSONB NOT NULL, record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 writer_xid TEXT NOT NULL, UNIQUE(workspace_id,revision)
);
CREATE TABLE bootstrap_issuer_audit (
 operation_id UUID PRIMARY KEY REFERENCES bootstrap_issuer_history(id) ON DELETE RESTRICT,
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'), fence_revision BIGINT NOT NULL CHECK(fence_revision>0)
);
CREATE FUNCTION bootstrap_issuer_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'bootstrap_issuer_immutable'; END $$;
CREATE TRIGGER bootstrap_issuer_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bootstrap_issuer_history
 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_issuer_immutable();
CREATE TRIGGER bootstrap_issuer_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bootstrap_issuer_audit
 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_issuer_immutable();

CREATE FUNCTION bootstrap_issuer_key_fence() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r JSONB;
BEGIN
 IF current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'bootstrap_issuer_unfenced'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'bootstrap_issuer_unfenced'; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'bootstrap_issuer_immutable'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.workspace_id<>OLD.workspace_id OR NEW.installation_id<>OLD.installation_id
  THEN RAISE EXCEPTION 'bootstrap_issuer_binding_immutable'; END IF;
  IF EXISTS(SELECT 1 FROM bootstrap_issuer_history WHERE workspace_id=OLD.workspace_id) THEN
   SELECT record INTO r FROM bootstrap_issuer_history WHERE workspace_id=OLD.workspace_id AND writer_xid=pg_current_xact_id()::text ORDER BY revision DESC LIMIT 1;
   IF pg_trigger_depth()<>2 OR r IS NULL OR r->'intent'->>'action'<>'stage'
    OR r->'intent'->'material'->>'keyId' IS DISTINCT FROM NEW.key_id
    OR r->'intent'->'material'->>'publicKeyDigest' IS DISTINCT FROM NEW.public_key_digest
    OR (r->'intent'->>'targetEpoch')::int IS DISTINCT FROM NEW.epoch
    OR current_setting('transaction_isolation')<>'serializable'
   THEN RAISE EXCEPTION 'bootstrap_issuer_history_required'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER bootstrap_issuer_key_fence BEFORE INSERT OR UPDATE OR DELETE ON trusted_provider_ticket_keys
 FOR EACH ROW EXECUTE FUNCTION bootstrap_issuer_key_fence();

CREATE FUNCTION bootstrap_issuer_append_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE i JSONB:=NEW.record->'intent'; b JSONB:=i->'binding'; m JSONB:=i->'material';
 k trusted_provider_ticket_keys; p bootstrap_issuer_history; owner UUID; body JSONB; v INT; actor UUID; ag UUID; cred UUID; auth JSONB;
BEGIN
 IF current_setting('session_replication_role')<>'origin' OR current_setting('transaction_isolation')<>'serializable'
 THEN RAISE EXCEPTION 'bootstrap_issuer_unfenced'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'bootstrap_issuer_unfenced'; END IF;
 SELECT * INTO k FROM trusted_provider_ticket_keys WHERE workspace_id=NEW.workspace_id;
 SELECT * INTO p FROM bootstrap_issuer_history WHERE workspace_id=NEW.workspace_id ORDER BY revision DESC LIMIT 1;
 -- Strict public-only wire shape, also enforced on direct SQL writes.
 IF jsonb_typeof(NEW.record)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(NEW.record))<>8
  OR NOT NEW.record ?& ARRAY['id','revision','previousId','decisionId','decisionRevision','ownerId','at','intent']
  OR jsonb_typeof(i)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(i))<>10
  OR NOT i ?& ARRAY['schemaVersion','binding','action','expectedRevision','targetEpoch','material','activatesAt','cutoverAt','adoptionEvidenceDigest','expiresAt']
  OR jsonb_typeof(b)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(b))<>4
  OR NOT b ?& ARRAY['workspaceId','issuerId','installationId','purpose']
  OR i->>'schemaVersion' IS DISTINCT FROM 'bootstrap-issuer-v1' OR b->>'purpose' IS DISTINCT FROM 'worker-bootstrap-owner-ticket-v1'
  OR b->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text OR b->>'issuerId' IS DISTINCT FROM NEW.workspace_id::text
  OR b->>'installationId' IS DISTINCT FROM k.installation_id::text
  OR (i->>'action' IN ('create','adopt','stage','cutover','revoke','retire')) IS DISTINCT FROM true
  OR NEW.record->>'id' IS DISTINCT FROM NEW.id::text OR NEW.record->>'decisionId' IS DISTINCT FROM NEW.decision_id::text
  OR NEW.record->>'revision' IS DISTINCT FROM NEW.revision::text
  OR NEW.revision IS DISTINCT FROM COALESCE(p.revision,0)+1
  OR i->>'expectedRevision' IS DISTINCT FROM COALESCE(p.revision,0)::text
  OR NEW.record->>'previousId' IS DISTINCT FROM p.id::text
  OR jsonb_typeof(i->'targetEpoch') IS DISTINCT FROM 'number' OR (i->>'targetEpoch')::int<1
  OR (i->>'expiresAt')::timestamptz<=clock_timestamp() OR (NEW.record->>'at')::timestamptz>clock_timestamp()+interval '1 second'
  OR (NEW.record->>'at')::timestamptz<(p.record->>'at')::timestamptz
 THEN RAISE EXCEPTION 'bootstrap_issuer_record_invalid'; END IF;
 IF i->>'action'='stage' THEN
  IF (i->>'activatesAt')::timestamptz<(NEW.record->>'at')::timestamptz
   OR (i->>'cutoverAt')::timestamptz<=(i->>'activatesAt')::timestamptz
   OR (i->>'cutoverAt')::timestamptz>(i->>'activatesAt')::timestamptz+interval '5 minutes'
   OR i->>'activatesAt' IS NULL OR i->>'cutoverAt' IS NULL
  THEN RAISE EXCEPTION 'bootstrap_issuer_overlap_invalid'; END IF;
 ELSE IF i->'activatesAt' IS DISTINCT FROM 'null'::jsonb OR i->'cutoverAt' IS DISTINCT FROM 'null'::jsonb
  THEN RAISE EXCEPTION 'bootstrap_issuer_overlap_invalid'; END IF; END IF;
 IF i->>'action' IN ('create','adopt','stage') THEN
  IF jsonb_typeof(m)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(m))<>5
   OR NOT m ?& ARRAY['keyId','algorithm','format','spki','publicKeyDigest']
   OR m->>'algorithm' IS DISTINCT FROM 'Ed25519' OR m->>'format' IS DISTINCT FROM 'spki-der-base64'
   OR (m->>'keyId' ~ '^[A-Za-z0-9_-]{1,64}$') IS DISTINCT FROM true
   OR length(decode(m->>'spki','base64')) IS DISTINCT FROM 44
   OR encode(substring(decode(m->>'spki','base64') FROM 1 FOR 12),'hex') IS DISTINCT FROM '302a300506032b6570032100'
   OR encode(decode(m->>'spki','base64'),'base64') IS DISTINCT FROM m->>'spki'
   OR encode(sha256(decode(m->>'spki','base64')),'hex') IS DISTINCT FROM m->>'publicKeyDigest'
  THEN RAISE EXCEPTION 'bootstrap_issuer_public_material_invalid'; END IF;
 ELSE IF m IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'bootstrap_issuer_public_material_invalid'; END IF; END IF;
 IF i->>'action'='adopt' THEN
  IF (i->>'adoptionEvidenceDigest' ~ '^[a-f0-9]{64}$') IS DISTINCT FROM true THEN RAISE EXCEPTION 'bootstrap_issuer_adoption_required'; END IF;
 ELSE IF i->'adoptionEvidenceDigest' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'bootstrap_issuer_record_invalid'; END IF; END IF;
 IF p.id IS NULL THEN
  IF i->>'action' NOT IN ('create','adopt') OR (i->>'targetEpoch')::int<>k.epoch
   OR m->>'keyId' IS DISTINCT FROM k.key_id OR m->>'publicKeyDigest' IS DISTINCT FROM k.public_key_digest
   OR i->>'action'='create' AND (k.epoch<>1 OR k.lifecycle_birth_xid IS DISTINCT FROM pg_current_xact_id()::text)
  THEN RAISE EXCEPTION 'bootstrap_issuer_legacy_blocked'; END IF;
 ELSE
  IF i->>'action' IN ('create','adopt') OR b IS DISTINCT FROM p.record->'intent'->'binding'
  THEN RAISE EXCEPTION 'bootstrap_issuer_binding_immutable'; END IF;
  IF i->>'action'='stage' AND ((i->>'targetEpoch')::int<>k.epoch+1 OR EXISTS(
   SELECT 1 FROM bootstrap_issuer_history h WHERE h.workspace_id=NEW.workspace_id AND
    (h.record->'intent'->'material'->>'keyId'=m->>'keyId' OR h.record->'intent'->'material'->>'publicKeyDigest'=m->>'publicKeyDigest')))
  THEN RAISE EXCEPTION 'bootstrap_issuer_replay'; END IF;
 END IF;
 SELECT owner_user_id INTO owner FROM workspaces WHERE id=NEW.workspace_id;
 SELECT r.version,r.body,a.actor_user_id,a.actor_agent_id,a.actor_credential_id,a.authority INTO v,body,actor,ag,cred,auth
  FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id AND r.workspace_id=d.workspace_id
  JOIN decision_acceptances a ON a.decision_id=d.id AND a.workspace_id=d.workspace_id
  WHERE d.id=NEW.decision_id AND d.workspace_id=NEW.workspace_id AND d.status='accepted' AND decision_state(d.id)='accepted'
   AND a.created_at<=clock_timestamp() AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id);
 IF v IS NULL OR NEW.record->>'decisionRevision' IS DISTINCT FROM v::text OR NEW.record->>'ownerId' IS DISTINCT FROM owner::text
  OR actor IS DISTINCT FROM owner OR ag IS NOT NULL OR cred IS NOT NULL OR auth->>'status' IS DISTINCT FROM 'owner_reserved'
  OR body->'workerBootstrapIssuer' IS DISTINCT FROM i OR body ?| ARRAY['authority','workerBootstrap','workerIdentityLifecycle','workerCredential','workerTransport']
  OR (SELECT count(*) FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND role::text='owner')<>1
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=owner AND role::text='owner')
 THEN RAISE EXCEPTION 'bootstrap_issuer_owner_invalid'; END IF;
 NEW.writer_xid:=pg_current_xact_id()::text;
 NEW.record_digest:=encode(sha256(convert_to(NEW.record::text,'UTF8')),'hex');
 RETURN NEW;
END $$;
CREATE TRIGGER bootstrap_issuer_append_guard BEFORE INSERT ON bootstrap_issuer_history
 FOR EACH ROW EXECUTE FUNCTION bootstrap_issuer_append_guard();
CREATE FUNCTION bootstrap_issuer_audit_append() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.record->'intent'->>'action'='stage' THEN
  -- The existing guard still enforces epoch+1 and revokes task-owner tickets.
  UPDATE trusted_provider_ticket_keys SET key_id=NEW.record->'intent'->'material'->>'keyId',
   public_key_digest=NEW.record->'intent'->'material'->>'publicKeyDigest',epoch=(NEW.record->'intent'->>'targetEpoch')::int
   WHERE workspace_id=NEW.workspace_id;
 END IF;
 INSERT INTO bootstrap_issuer_audit(operation_id,record_digest,fence_revision)
  SELECT NEW.id,NEW.record_digest,revision FROM ready_source_fence WHERE id=1;
 RETURN NULL;
END $$;
CREATE TRIGGER bootstrap_issuer_audit_append AFTER INSERT ON bootstrap_issuer_history
 FOR EACH ROW EXECUTE FUNCTION bootstrap_issuer_audit_append();
COMMIT;
