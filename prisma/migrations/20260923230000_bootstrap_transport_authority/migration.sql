-- PROPOSAL / UNAPPLIED. No backfill, defaults, seeds or data deletion.
-- Owner-authorized widening: NULL purpose retains EVERY old ordinary CHECK;
-- only explicit bootstrap purpose admits NULL credential/signature/command ID.
BEGIN;
DO $$ DECLARE c RECORD; bad BOOLEAN; BEGIN
 IF EXISTS(SELECT 1 FROM worker_transport_generations WHERE credential_id IS NULL)
 OR EXISTS(SELECT 1 FROM worker_transport_history WHERE signature IS NULL OR decision_id IS NULL)
 THEN RAISE EXCEPTION 'ordinary_rows_not_preserved'; END IF;
 -- Prove the old rows satisfy each retained CHECK before replacing its wrapper.
 FOR c IN SELECT conrelid::regclass AS tbl,pg_get_expr(conbin,conrelid) AS expr
   FROM pg_constraint WHERE contype='c' AND conrelid IN ('worker_transport_generations'::regclass,'worker_transport_history'::regclass)
 LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE (%s) IS FALSE)',c.tbl,c.expr) INTO bad;
  IF bad THEN RAISE EXCEPTION 'ordinary_rows_not_preserved'; END IF;
 END LOOP;
END $$;
ALTER TABLE worker_transport_generations ADD COLUMN purpose TEXT CHECK(purpose IN ('first_enrollment','owner_recovery'));
ALTER TABLE worker_transport_history ADD COLUMN purpose TEXT CHECK(purpose IN ('first_enrollment','owner_recovery'));
ALTER TABLE worker_transport_history ADD COLUMN writer_xid TEXT;
ALTER TABLE worker_transport_heads ADD COLUMN purpose TEXT CHECK(purpose IN ('first_enrollment','owner_recovery'));
-- Preserve each ordinary expression verbatim. Only JSON shape checks differ;
-- shared FK/unique/revision/state/high-water constraints remain in force.
DO $$ DECLARE c RECORD; bad BOOLEAN; BEGIN
 FOR c IN SELECT conrelid::regclass AS tbl,conname,pg_get_expr(conbin,conrelid) AS expr
  FROM pg_constraint WHERE contype='c' AND
   (conrelid='worker_transport_generations'::regclass AND pg_get_expr(conbin,conrelid) ~ '\midentity\M'
    OR conrelid='worker_transport_history'::regclass AND pg_get_expr(conbin,conrelid) ~ '\mrecord\M')
 LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE (%s) IS FALSE)',c.tbl,c.expr) INTO bad;
  IF bad THEN RAISE EXCEPTION 'ordinary_check_not_preserved'; END IF;
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.tbl,c.conname);
  EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I CHECK(purpose IS NOT NULL OR (%s))',c.tbl,c.conname,c.expr);
 END LOOP;
END $$;
ALTER TABLE worker_transport_generations ALTER COLUMN credential_id DROP NOT NULL;
ALTER TABLE worker_transport_generations ADD CONSTRAINT transport_credential_partition CHECK(
 (purpose IS NULL AND credential_id IS NOT NULL) OR (purpose IS NOT NULL AND credential_id IS NULL));
ALTER TABLE worker_transport_history ALTER COLUMN signature DROP NOT NULL;
ALTER TABLE worker_transport_history ALTER COLUMN decision_id DROP NOT NULL;
ALTER TABLE worker_transport_history ADD CONSTRAINT transport_signature_partition CHECK(
 (purpose IS NULL AND signature IS NOT NULL AND decision_id IS NOT NULL) OR (purpose IS NOT NULL AND signature IS NULL));
ALTER TABLE worker_transport_generations ADD UNIQUE(id,purpose);
ALTER TABLE worker_transport_history ADD UNIQUE(id,purpose);
ALTER TABLE worker_transport_history ADD FOREIGN KEY(generation_id,purpose) REFERENCES worker_transport_generations(id,purpose) ON DELETE RESTRICT;
ALTER TABLE worker_transport_heads ADD FOREIGN KEY(history_id,purpose) REFERENCES worker_transport_history(id,purpose) ON DELETE RESTRICT;

CREATE TABLE worker_transport_bootstrap_grants (
 id UUID PRIMARY KEY, generation_id UUID NOT NULL UNIQUE, purpose TEXT NOT NULL,
 ticket_id UUID NOT NULL UNIQUE REFERENCES worker_bootstrap_tickets(id) ON DELETE RESTRICT,
 decision_id UUID NOT NULL UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,
 acceptance_id UUID NOT NULL UNIQUE REFERENCES decision_acceptances(id) ON DELETE RESTRICT,
 record JSONB NOT NULL CHECK(octet_length(record::text)<=16384), record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 FOREIGN KEY(generation_id,purpose) REFERENCES worker_transport_generations(id,purpose) ON DELETE RESTRICT
);
CREATE TABLE worker_transport_write_audit (
 generation_id UUID NOT NULL REFERENCES worker_transport_generations(id) ON DELETE RESTRICT,
 table_name TEXT NOT NULL, row_id TEXT NOT NULL, writer_xid TEXT NOT NULL,
 row_digest TEXT NOT NULL CHECK(row_digest ~ '^[a-f0-9]{64}$'), fence_revision BIGINT NOT NULL CHECK(fence_revision>0),
 PRIMARY KEY(table_name,row_id,writer_xid)
);
CREATE FUNCTION transport_bootstrap_shape(s JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE ips JSONB; ip TEXT; field TEXT;
BEGIN
 IF jsonb_typeof(s) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(s))<>29
 OR NOT s ?& ARRAY['version','purpose','binding','hostGeneration','installationGeneration','generation','revision','recordDigest','state','issuerRevision','issuerHistoryDigest','origin','serverName','caDigest','leafPin','certificateEpoch','highWaterEpoch','certificateNotBefore','certificateNotAfter','certificateEvidenceDigest','resolverPolicy','publicAddresses','redirect','proxy','downgrade','sessionReuse','validFrom','cutoverAt','expiresAt']
 THEN RETURN false; END IF;
 -- Reject JSON nulls and type coercion before any nullable SQL comparison.
 FOR field IN SELECT jsonb_object_keys(s) LOOP
  IF field<>'cutoverAt' AND s->field='null'::jsonb THEN RETURN false; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['version','purpose','hostGeneration','installationGeneration','generation','recordDigest','state','issuerHistoryDigest','origin','serverName','caDigest','leafPin','certificateNotBefore','certificateNotAfter','certificateEvidenceDigest','resolverPolicy','validFrom','expiresAt'] LOOP
  IF jsonb_typeof(s->field) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['revision','issuerRevision','certificateEpoch','highWaterEpoch'] LOOP
  IF jsonb_typeof(s->field) IS DISTINCT FROM 'number' OR (s->>field) !~ '^[1-9][0-9]*$' OR (s->>field)::bigint>2147483647 THEN RETURN false; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['recordDigest','issuerHistoryDigest','caDigest','leafPin','certificateEvidenceDigest'] LOOP
  IF (s->>field) !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['hostGeneration','installationGeneration','generation'] LOOP
  IF (s->>field) !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN false; END IF;
 END LOOP;
 IF s->'cutoverAt'<>'null'::jsonb AND (jsonb_typeof(s->'cutoverAt')<>'string' OR (s->>'cutoverAt')::timestamptz<=(s->>'validFrom')::timestamptz) THEN RETURN false; END IF;
 IF s->>'version'<>'bootstrap-channel-snapshot-proposal-v1' OR s->>'purpose' NOT IN ('first_enrollment','owner_recovery') OR s->>'state'<>'current'
 OR s->>'resolverPolicy'<>'public_ipv4_only_v1' OR s->'proxy'<>'false'::jsonb OR s->'redirect'<>'false'::jsonb OR s->'downgrade'<>'false'::jsonb OR s->'sessionReuse'<>'false'::jsonb
 OR s->>'origin' !~ '^https://[a-z0-9.-]+:[1-9][0-9]{0,4}$' OR split_part(substring(s->>'origin' FROM 9),':',1)<>s->>'serverName'
 OR (s->>'certificateEpoch')::int<1 OR s->>'highWaterEpoch'<>s->>'certificateEpoch'
 OR (s->>'validFrom')::timestamptz>=(s->>'expiresAt')::timestamptz OR (s->>'certificateNotAfter')::timestamptz<(s->>'expiresAt')::timestamptz
 OR jsonb_typeof(s->'binding')<>'object' OR (SELECT count(*) FROM jsonb_object_keys(s->'binding'))<>9
 OR NOT (s->'binding') ?& ARRAY['workspaceId','installationId','installationEpoch','hostId','hostEpoch','hostFingerprint','ticketKeyId','ticketKeyEpoch','ticketPublicKeyDigest']
 THEN RETURN false; END IF;
 FOR field IN SELECT jsonb_object_keys(s->'binding') LOOP
  IF s->'binding'->field='null'::jsonb THEN RETURN false; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['workspaceId','installationId','hostId'] LOOP
  IF jsonb_typeof(s->'binding'->field)<>'string' OR (s->'binding'->>field) !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN false; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['hostEpoch','installationEpoch','ticketKeyEpoch'] LOOP
  IF jsonb_typeof(s->'binding'->field)<>'number' OR (s->'binding'->>field) !~ '^[1-9][0-9]*$' OR (s->'binding'->>field)::bigint>2147483647 THEN RETURN false; END IF;
 END LOOP;
 IF (s->'binding'->>'hostFingerprint') !~ '^[a-f0-9]{64}$' OR (s->'binding'->>'ticketPublicKeyDigest') !~ '^[a-f0-9]{64}$'
 OR (s->'binding'->>'ticketKeyId') !~ '^[A-Za-z0-9_-]{1,64}$' THEN RETURN false; END IF;
 IF jsonb_typeof(s->'publicAddresses')<>'array' OR jsonb_array_length(s->'publicAddresses') NOT BETWEEN 1 AND 16 THEN RETURN false; END IF;
 SELECT jsonb_agg(v ORDER BY v COLLATE "C") INTO ips FROM (SELECT DISTINCT jsonb_array_elements_text(s->'publicAddresses') v) p;
 IF ips IS DISTINCT FROM s->'publicAddresses' THEN RETURN false; END IF;
 FOR ip IN SELECT jsonb_array_elements_text(ips) LOOP
  IF family(ip::inet)<>4 OR host(ip::inet)<>ip OR ip::inet <<= ANY(ARRAY['0.0.0.0/8','10.0.0.0/8','100.64.0.0/10','127.0.0.0/8','169.254.0.0/16','172.16.0.0/12','192.0.0.0/24','192.0.2.0/24','192.88.99.0/24','192.168.0.0/16','198.18.0.0/15','198.51.100.0/24','203.0.113.0/24','224.0.0.0/4','240.0.0.0/4']::inet[])
  THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE FUNCTION transport_authority_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'transport_authority_immutable'; END $$;
CREATE FUNCTION transport_authority_write_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE h worker_transport_heads; previous worker_transport_history; g worker_transport_generations; grantrow worker_transport_bootstrap_grants;
 s JSONB; i JSONB; t JSONB; authority RECORD; f BIGINT; action TEXT; ident JSONB;
BEGIN
 IF current_setting('session_replication_role')<>'origin' OR current_setting('transaction_isolation')<>'serializable' THEN RAISE EXCEPTION 'transport_writer_unfenced'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1 RETURNING revision INTO f;
 IF f IS NULL OR TG_OP='DELETE' OR (TG_OP='UPDATE' AND TG_TABLE_NAME<>'worker_transport_heads') THEN RAISE EXCEPTION 'transport_writer_denied'; END IF;
 IF TG_TABLE_NAME='worker_transport_generations' THEN
  IF NEW.purpose IS NOT NULL THEN
   IF NEW.credential_id IS NOT NULL OR jsonb_typeof(NEW.identity)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(NEW.identity))<>3
    OR NOT NEW.identity ?& ARRAY['binding','hostGeneration','installationGeneration']
    OR NEW.identity->'binding'->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text OR NEW.identity->'binding'->>'hostId' IS DISTINCT FROM NEW.host_id::text
    OR NEW.identity->'binding'->>'installationId' IS DISTINCT FROM NEW.installation_id::text THEN RAISE EXCEPTION 'bootstrap_generation_invalid'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='worker_transport_bootstrap_grants' THEN
  i:=NEW.record->'intent';s:=i->'snapshot';
  IF (SELECT count(*) FROM jsonb_object_keys(NEW.record))<>7 OR NOT NEW.record ?& ARRAY['id','intent','ownerId','decisionId','decisionRevision','acceptanceId','at']
   OR (SELECT count(*) FROM jsonb_object_keys(i))<>5 OR NOT i ?& ARRAY['schemaVersion','ticketId','ticketDigest','expectedRevision','snapshot']
   OR i->>'schemaVersion' IS DISTINCT FROM 'worker-bootstrap-channel-v1' OR transport_bootstrap_shape(s) IS DISTINCT FROM true
   OR NEW.id::text IS DISTINCT FROM NEW.record->>'id' OR NEW.decision_id::text IS DISTINCT FROM NEW.record->>'decisionId' OR NEW.acceptance_id::text IS DISTINCT FROM NEW.record->>'acceptanceId'
   OR NEW.ticket_id::text IS DISTINCT FROM i->>'ticketId' OR NEW.generation_id::text IS DISTINCT FROM s->>'generation' OR NEW.purpose IS DISTINCT FROM s->>'purpose'
   OR (s->>'validFrom')::timestamptz>clock_timestamp() OR (s->>'expiresAt')::timestamptz<=clock_timestamp()
   OR (s->>'cutoverAt')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'bootstrap_grant_invalid'; END IF;
  SELECT * INTO g FROM worker_transport_generations WHERE id=NEW.generation_id;
  IF g.purpose IS DISTINCT FROM NEW.purpose OR g.credential_id IS NOT NULL OR g.identity IS DISTINCT FROM jsonb_build_object('binding',s->'binding','hostGeneration',s->'hostGeneration','installationGeneration',s->'installationGeneration')
  THEN RAISE EXCEPTION 'bootstrap_generation_changed'; END IF;
  SELECT w.owner_user_id,r.version,r.body,a.id,a.actor_user_id,a.actor_agent_id,a.actor_credential_id,a.authority INTO authority
   FROM workspaces w JOIN decisions d ON d.workspace_id=w.id JOIN decision_revisions r ON r.decision_id=d.id
   JOIN decision_acceptances a ON a.decision_id=d.id WHERE d.id=NEW.decision_id AND a.id=NEW.acceptance_id AND d.workspace_id=g.workspace_id
   AND d.status='accepted' AND decision_state(d.id)='accepted' AND a.created_at<=clock_timestamp()
   AND NOT EXISTS(SELECT 1 FROM decisions sd JOIN decision_acceptances sa ON sa.decision_id=sd.id WHERE sd.supersedes_id=d.id);
  IF authority.owner_user_id IS NULL OR authority.actor_user_id IS DISTINCT FROM authority.owner_user_id OR authority.actor_agent_id IS NOT NULL OR authority.actor_credential_id IS NOT NULL
   OR authority.authority->>'status' IS DISTINCT FROM 'owner_reserved' OR authority.owner_user_id::text IS DISTINCT FROM NEW.record->>'ownerId' OR authority.version::text IS DISTINCT FROM NEW.record->>'decisionRevision'
   OR authority.body->'workerBootstrapChannel' IS DISTINCT FROM i OR authority.body ?| ARRAY['authority','workerTransport','workerBootstrap','workerBootstrapIssuer','workerIdentityLifecycle','workerCredential']
   OR (SELECT count(*) FROM workspace_memberships WHERE workspace_id=g.workspace_id AND role::text='owner')<>1
   OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=g.workspace_id AND user_id=authority.owner_user_id AND role::text='owner')
  THEN RAISE EXCEPTION 'bootstrap_owner_invalid'; END IF;
  SELECT record->'signed'->'payload' INTO t FROM worker_bootstrap_tickets WHERE id=NEW.ticket_id AND ticket_digest=i->>'ticketDigest' AND workspace_id=g.workspace_id AND host_id=g.host_id;
  IF t IS NULL OR t->>'ownerId' IS DISTINCT FROM NEW.record->>'ownerId' OR t->'intent'->'binding' IS DISTINCT FROM s->'binding' OR t->'intent'->>'purpose' IS DISTINCT FROM NEW.purpose
   OR (t->'intent'->>'expiresAt')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'bootstrap_ticket_mismatch'; END IF;
  NEW.record_digest:=encode(sha256(convert_to(NEW.record::text,'UTF8')),'hex');
 ELSIF TG_TABLE_NAME='worker_transport_history' THEN
  SELECT * INTO g FROM worker_transport_generations WHERE id=NEW.generation_id;
  SELECT * INTO h FROM worker_transport_heads WHERE workspace_id=NEW.workspace_id AND host_id=NEW.host_id;
  IF NEW.purpose IS DISTINCT FROM g.purpose OR NEW.revision<>COALESCE(h.revision,0)+1 OR NEW.previous_revision IS DISTINCT FROM h.revision OR NEW.previous_digest IS DISTINCT FROM h.record_digest
   OR NEW.previous_high_water IS DISTINCT FROM h.high_water_epoch OR NEW.previous_state IS DISTINCT FROM h.state OR NEW.previous_generation_id IS DISTINCT FROM (SELECT generation_id FROM worker_transport_history WHERE id=h.history_id)
  THEN RAISE EXCEPTION 'transport_head_changed'; END IF;
  IF NEW.purpose IS NOT NULL THEN
   SELECT * INTO grantrow FROM worker_transport_bootstrap_grants WHERE id=(NEW.record->>'grantId')::uuid AND generation_id=NEW.generation_id;
   s:=grantrow.record->'intent'->'snapshot';action:=NEW.record->>'action';
   SELECT * INTO previous FROM worker_transport_history WHERE id=h.history_id;
   IF grantrow.id IS NULL OR action IS NULL OR action NOT IN ('grant','consume','revoke','unknown','close')
    OR (SELECT count(*) FROM jsonb_object_keys(NEW.record))<>7 OR NOT NEW.record ?& ARRAY['id','grantId','revision','previousId','action','state','at']
    OR NEW.record->>'id' IS DISTINCT FROM NEW.id::text OR NEW.record->>'revision' IS DISTINCT FROM NEW.revision::text OR NEW.record->>'previousId' IS DISTINCT FROM h.history_id::text
    OR NEW.record->>'state' IS DISTINCT FROM NEW.state OR NEW.signature IS NOT NULL OR NEW.current_pin IS DISTINCT FROM s->>'leafPin' OR NEW.staged_pin IS NOT NULL
    OR NEW.certificate_epoch IS DISTINCT FROM (s->>'certificateEpoch')::int OR NEW.high_water_epoch IS DISTINCT FROM NEW.certificate_epoch
    OR NEW.owner_id::text IS DISTINCT FROM grantrow.record->>'ownerId'
   THEN RAISE EXCEPTION 'bootstrap_transition_invalid'; END IF;
   IF action='grant' THEN
    IF NEW.decision_id IS DISTINCT FROM grantrow.decision_id OR (grantrow.record->'intent'->>'expectedRevision')::int<>COALESCE(h.revision,0)
     OR NEW.state<>'current' OR NEW.certificate_epoch<>COALESCE(h.high_water_epoch,0)+1 OR h.state IS NOT NULL AND h.state<>'revoked'
     OR EXISTS(SELECT 1 FROM worker_transport_history WHERE workspace_id=NEW.workspace_id AND host_id=NEW.host_id AND (current_pin=NEW.current_pin OR staged_pin=NEW.current_pin OR generation_id=NEW.generation_id))
    THEN RAISE EXCEPTION 'bootstrap_grant_replay'; END IF;
   ELSE
    IF NEW.decision_id IS NOT NULL OR previous.purpose IS DISTINCT FROM NEW.purpose OR previous.generation_id<>NEW.generation_id OR previous.record->>'grantId' IS DISTINCT FROM grantrow.id::text OR h.state<>'current'
     OR action NOT IN ('consume','revoke','unknown','close') OR (action='consume')<>(NEW.state='current')
     OR action='consume' AND (previous.record->>'action'<>'grant' OR (s->>'expiresAt')::timestamptz<=clock_timestamp() OR (s->>'cutoverAt')::timestamptz<=clock_timestamp()
       OR NOT EXISTS(SELECT 1 FROM worker_transport_write_audit WHERE table_name='worker_transport_history' AND row_id=previous.id::text AND fence_revision=f-1))
     OR action IN ('unknown','close') AND previous.record->>'action'<>'consume'
    THEN RAISE EXCEPTION 'bootstrap_transition_replay'; END IF;
   END IF;
   NEW.record_digest:=encode(sha256(convert_to(NEW.record::text,'UTF8')),'hex');
  ELSIF h.purpose IS NOT NULL THEN RAISE EXCEPTION 'ordinary_bootstrap_isolation'; END IF;
  NEW.writer_xid:=pg_current_xact_id()::text;
 ELSIF TG_TABLE_NAME='worker_transport_heads' THEN
  SELECT * INTO previous FROM worker_transport_history WHERE id=NEW.history_id;
  IF previous.purpose IS DISTINCT FROM NEW.purpose OR previous.writer_xid IS DISTINCT FROM pg_current_xact_id()::text
   OR NEW.purpose IS NOT NULL AND pg_trigger_depth()<>2 OR TG_OP='UPDATE' AND (NEW.workspace_id<>OLD.workspace_id OR NEW.host_id<>OLD.host_id OR NEW.revision<>OLD.revision+1)
  THEN RAISE EXCEPTION 'transport_head_requires_history'; END IF;
 ELSIF TG_TABLE_NAME='worker_transport_audit' THEN
  SELECT * INTO previous FROM worker_transport_history WHERE id=NEW.history_id;
  IF previous.record_digest IS DISTINCT FROM NEW.record_digest OR previous.writer_xid IS DISTINCT FROM pg_current_xact_id()::text THEN RAISE EXCEPTION 'transport_audit_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION transport_authority_audit_append() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE generation UUID; ident TEXT;
BEGIN
 IF TG_TABLE_NAME='worker_transport_generations' THEN generation:=NEW.id;ident:=NEW.id::text;
 ELSIF TG_TABLE_NAME IN ('worker_transport_history','worker_transport_bootstrap_grants') THEN generation:=NEW.generation_id;ident:=NEW.id::text;
 ELSE SELECT generation_id INTO generation FROM worker_transport_history WHERE id=NEW.history_id;
  IF TG_TABLE_NAME='worker_transport_heads' THEN ident:=NEW.workspace_id::text||':'||NEW.host_id::text; ELSE ident:=NEW.history_id::text; END IF;
 END IF;
 INSERT INTO worker_transport_write_audit(generation_id,table_name,row_id,writer_xid,row_digest,fence_revision)
 SELECT generation,TG_TABLE_NAME,ident,pg_current_xact_id()::text,encode(sha256(convert_to(to_jsonb(NEW)::text,'UTF8')),'hex'),revision FROM ready_source_fence WHERE id=1;
 RETURN NULL;
END $$;
CREATE FUNCTION transport_bootstrap_advance() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE event_id UUID:=gen_random_uuid();
BEGIN
 IF NEW.purpose IS NULL THEN RETURN NULL; END IF;
 INSERT INTO worker_transport_heads(workspace_id,host_id,history_id,revision,record_digest,certificate_epoch,high_water_epoch,state,purpose)
 VALUES(NEW.workspace_id,NEW.host_id,NEW.id,NEW.revision,NEW.record_digest,NEW.certificate_epoch,NEW.high_water_epoch,NEW.state,NEW.purpose)
 ON CONFLICT(workspace_id,host_id) DO UPDATE SET history_id=EXCLUDED.history_id,revision=EXCLUDED.revision,record_digest=EXCLUDED.record_digest,
 certificate_epoch=EXCLUDED.certificate_epoch,high_water_epoch=EXCLUDED.high_water_epoch,state=EXCLUDED.state,purpose=EXCLUDED.purpose;
 INSERT INTO events(id,workspace_id,type,source,actor_type,actor_id,resource_type,resource_id,payload,updated_at)
 VALUES(event_id,NEW.workspace_id,'worker.bootstrap_channel','roost','user',NEW.owner_id::text,'worker_transport',NEW.id::text,jsonb_build_object('revision',NEW.revision,'state',NEW.state,'launchAuthority',false),CURRENT_TIMESTAMP);
 INSERT INTO worker_transport_audit(history_id,event_id,record_digest) VALUES(NEW.id,event_id,NEW.record_digest);
 RETURN NULL;
END $$;
CREATE FUNCTION transport_authority_audit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 OR NEW.writer_xid<>pg_current_xact_id()::text OR current_setting('session_replication_role')<>'origin'
 THEN RAISE EXCEPTION 'transport_audit_immutable'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION transport_authority_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE generation UUID;
BEGIN
 IF TG_TABLE_NAME='worker_transport_generations' THEN generation:=NEW.id; ELSE generation:=NEW.generation_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM worker_transport_history h JOIN worker_transport_audit a ON a.history_id=h.id AND a.record_digest=h.record_digest
   JOIN worker_transport_heads head ON head.history_id=h.id WHERE h.generation_id=generation AND h.writer_xid=pg_current_xact_id()::text)
 THEN RAISE EXCEPTION 'transport_atomic_history_required'; END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN
 FOREACH tbl IN ARRAY ARRAY['worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_audit','worker_transport_bootstrap_grants'] LOOP
  EXECUTE format('CREATE TRIGGER transport_authority_write_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION transport_authority_write_guard()',tbl);
  EXECUTE format('CREATE TRIGGER z_transport_authority_audit AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION transport_authority_audit_append()',tbl);
  EXECUTE format('CREATE TRIGGER transport_authority_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION transport_authority_immutable()',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['worker_transport_generations','worker_transport_history','worker_transport_bootstrap_grants'] LOOP
  EXECUTE format('CREATE CONSTRAINT TRIGGER transport_authority_commit_guard AFTER INSERT ON %I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION transport_authority_commit_guard()',tbl);
 END LOOP;
END $$;
CREATE TRIGGER a_transport_bootstrap_advance AFTER INSERT ON worker_transport_history FOR EACH ROW EXECUTE FUNCTION transport_bootstrap_advance();
CREATE TRIGGER transport_write_audit_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_transport_write_audit FOR EACH ROW EXECUTE FUNCTION transport_authority_audit_guard();
CREATE TRIGGER transport_write_audit_no_truncate BEFORE TRUNCATE ON worker_transport_write_audit FOR EACH STATEMENT EXECUTE FUNCTION transport_authority_immutable();
-- Conservative source epoch: any covered mutation invalidates an unconsumed
-- grant. No read writes/repairs it; even an ABA of source values cannot restore it.
CREATE FUNCTION transport_bootstrap_source_lock() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'bootstrap_source_unfenced'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'bootstrap_source_unfenced'; END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN
 FOREACH tbl IN ARRAY ARRAY['workspaces','workspace_memberships','decisions','decision_revisions','decision_acceptances','worker_bootstrap_tickets','agent_hosts','worker_identity_lifecycle','worker_identity_lifecycle_audit','bootstrap_issuer_history','bootstrap_issuer_audit','trusted_provider_ticket_keys','api_keys'] LOOP
  EXECUTE format('CREATE TRIGGER transport_bootstrap_source_fence BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION transport_bootstrap_source_lock()',tbl);
  EXECUTE format('CREATE TRIGGER transport_bootstrap_source_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION transport_authority_immutable()',tbl);
 END LOOP;
END $$;
COMMIT;
