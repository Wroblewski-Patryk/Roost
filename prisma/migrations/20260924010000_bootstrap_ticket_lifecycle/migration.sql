-- SOURCE PROPOSAL / UNAPPLIED. No backfill, seed, reset or historical DDL edit.
-- One ticket root, existing attempt ledger, two append-only child relations.
BEGIN;
ALTER TABLE worker_bootstrap_tickets ADD COLUMN lifecycle_identity JSONB;
ALTER TABLE worker_bootstrap_attempts ADD COLUMN lifecycle_version TEXT CHECK(lifecycle_version='bootstrap-ticket-revocation-proposal-v1');
-- Preserve each old generation/predecessor CHECK verbatim for the NULL partition.
-- Only a versioned root can represent a terminal predecessor without an attempt.
DO $$ DECLARE c RECORD; bad BOOLEAN; BEGIN
 FOR c IN SELECT conrelid::regclass AS tbl,conname,pg_get_expr(conbin,conrelid) AS expr
  FROM pg_constraint WHERE contype='c' AND conrelid IN ('worker_bootstrap_tickets'::regclass,'worker_bootstrap_attempts'::regclass)
   AND pg_get_expr(conbin,conrelid) ~ '\mpredecessor_id\M'
 LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE (%s) IS FALSE)',c.tbl,c.expr) INTO bad;
  IF bad THEN RAISE EXCEPTION 'bootstrap_legacy_not_preserved'; END IF;
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.tbl,c.conname);
  EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I CHECK(%I IS NOT NULL OR (%s))',c.tbl,c.conname,
   CASE WHEN c.tbl='worker_bootstrap_tickets'::regclass THEN 'lifecycle_identity' ELSE 'lifecycle_version' END,c.expr);
 END LOOP;
END $$;
-- Legacy generations are not retroactively qualified or deduplicated.
CREATE UNIQUE INDEX bootstrap_issue_generation ON worker_bootstrap_tickets(workspace_id,host_id,generation) WHERE lifecycle_identity IS NOT NULL;
CREATE UNIQUE INDEX bootstrap_issue_credential_epoch ON worker_bootstrap_tickets(workspace_id,host_id,credential_epoch) WHERE lifecycle_identity IS NOT NULL;
CREATE TABLE worker_bootstrap_lifecycle_events (
 id UUID PRIMARY KEY,ticket_id UUID NOT NULL REFERENCES worker_bootstrap_tickets(id) ON DELETE RESTRICT,
 revision INT NOT NULL CHECK(revision>0),previous_digest TEXT,record JSONB NOT NULL CHECK(octet_length(record::text)<=8192),
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 attempt_id UUID REFERENCES worker_bootstrap_attempts(id) ON DELETE RESTRICT,
 history_id UUID REFERENCES worker_bootstrap_history(id) ON DELETE RESTRICT,
 writer_xid TEXT NOT NULL,UNIQUE(ticket_id,revision),UNIQUE(ticket_id,record_digest)
);
CREATE TABLE worker_bootstrap_write_receipts (
 ticket_id UUID NOT NULL REFERENCES worker_bootstrap_tickets(id) ON DELETE RESTRICT,
 table_name TEXT NOT NULL,row_id TEXT NOT NULL,writer_xid TEXT NOT NULL,
 row_digest TEXT NOT NULL CHECK(row_digest ~ '^[a-f0-9]{64}$'),fence_revision BIGINT NOT NULL CHECK(fence_revision>0),
 event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE RESTRICT,
 PRIMARY KEY(table_name,row_id,writer_xid)
);
CREATE FUNCTION bootstrap_lifecycle_json(v JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result TEXT; BEGIN
 CASE jsonb_typeof(v)
 WHEN 'object' THEN SELECT '{'||coalesce(string_agg(to_jsonb(key)::text||':'||bootstrap_lifecycle_json(value),',' ORDER BY key COLLATE "C"),'')||'}' INTO result FROM jsonb_each(v);
 WHEN 'array' THEN SELECT '['||coalesce(string_agg(bootstrap_lifecycle_json(value),',' ORDER BY ordinal),'')||']' INTO result FROM jsonb_array_elements(v) WITH ORDINALITY a(value,ordinal);
 ELSE result:=v::text; END CASE; RETURN result;
END $$;
CREATE FUNCTION bootstrap_lifecycle_digest(v JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN encode(sha256(convert_to(bootstrap_lifecycle_json(v),'UTF8')),'hex'); END $$;
CREATE FUNCTION bootstrap_lifecycle_shape(i JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k TEXT;p JSONB; BEGIN
 IF jsonb_typeof(i) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(i))<>21
 OR NOT i ?& ARRAY['version','ticketId','ticketDigest','ownerId','decisionId','decisionRevision','purpose','binding','generation','credentialEpoch','issuedAt','notBefore','expiresAt','hostGeneration','installationGeneration','issuerRevision','issuerHistoryDigest','channelGeneration','channelRevision','channelDigest','predecessor']
 OR i->>'version' IS DISTINCT FROM 'bootstrap-ticket-revocation-proposal-v1' OR i->>'purpose' NOT IN ('first_enrollment','owner_recovery') THEN RETURN false; END IF;
 FOR k IN SELECT jsonb_object_keys(i) LOOP IF k<>'predecessor' AND i->k='null'::jsonb THEN RETURN false; END IF; END LOOP;
 FOREACH k IN ARRAY ARRAY['ticketId','ownerId','decisionId','hostGeneration','installationGeneration','channelGeneration'] LOOP
  IF jsonb_typeof(i->k)<>'string' OR (i->>k) !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['ticketDigest','issuerHistoryDigest','channelDigest'] LOOP
  IF jsonb_typeof(i->k)<>'string' OR (i->>k) !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['decisionRevision','generation','credentialEpoch','issuerRevision','channelRevision'] LOOP
  IF jsonb_typeof(i->k)<>'number' OR (i->>k) !~ '^[1-9][0-9]*$' OR (i->>k)::bigint>2147483647 THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['issuedAt','notBefore','expiresAt'] LOOP
  IF jsonb_typeof(i->k)<>'string' OR (i->>k) !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,3})?Z$' THEN RETURN false; END IF;
 END LOOP;
 IF (i->>'issuedAt')::timestamptz>(i->>'notBefore')::timestamptz OR (i->>'notBefore')::timestamptz>=(i->>'expiresAt')::timestamptz
 OR (i->>'expiresAt')::timestamptz>(i->>'issuedAt')::timestamptz+interval '120 seconds'
 OR jsonb_typeof(i->'binding')<>'object' OR (SELECT count(*) FROM jsonb_object_keys(i->'binding'))<>9
 OR NOT (i->'binding') ?& ARRAY['workspaceId','installationId','installationEpoch','hostId','hostEpoch','hostFingerprint','ticketKeyId','ticketKeyEpoch','ticketPublicKeyDigest'] THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['workspaceId','installationId','hostId'] LOOP
  IF jsonb_typeof(i->'binding'->k) IS DISTINCT FROM 'string' OR (i->'binding'->>k) !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['installationEpoch','hostEpoch','ticketKeyEpoch'] LOOP
  IF jsonb_typeof(i->'binding'->k) IS DISTINCT FROM 'number' OR (i->'binding'->>k) !~ '^[1-9][0-9]*$' OR (i->'binding'->>k)::bigint>2147483647 THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['hostFingerprint','ticketPublicKeyDigest'] LOOP
  IF jsonb_typeof(i->'binding'->k) IS DISTINCT FROM 'string' OR (i->'binding'->>k) !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
 END LOOP;
 IF jsonb_typeof(i->'binding'->'ticketKeyId') IS DISTINCT FROM 'string' OR (i->'binding'->>'ticketKeyId') !~ '^[A-Za-z0-9_-]{1,64}$' THEN RETURN false; END IF;
 p:=i->'predecessor';
 IF i->>'purpose'='first_enrollment' THEN RETURN p='null'::jsonb AND i->>'generation'='1' AND i->>'credentialEpoch'='1'; END IF;
 IF jsonb_typeof(p)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p))<>9
 OR NOT p ?& ARRAY['ticketId','ticketDigest','attemptId','generation','credentialEpoch','historyDigest','state','workspaceId','hostId']
 OR p->>'state' NOT IN ('revoked','expired','delivery_unknown') OR p->>'workspaceId' IS DISTINCT FROM i->'binding'->>'workspaceId'
 OR p->>'hostId' IS DISTINCT FROM i->'binding'->>'hostId' OR p->>'ticketId'=i->>'ticketId' OR p->>'ticketDigest'=i->>'ticketDigest'
 OR (p->>'generation')::int+1<>(i->>'generation')::int OR (p->>'credentialEpoch')::int+1<>(i->>'credentialEpoch')::int THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['ticketId','workspaceId','hostId'] LOOP
  IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' OR (p->>k) !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN false; END IF;
 END LOOP;
 IF p->'attemptId'<>'null'::jsonb AND (jsonb_typeof(p->'attemptId')<>'string' OR (p->>'attemptId') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['ticketDigest','historyDigest'] LOOP IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' OR (p->>k) !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF; END LOOP;
 FOREACH k IN ARRAY ARRAY['generation','credentialEpoch'] LOOP IF jsonb_typeof(p->k) IS DISTINCT FROM 'number' OR (p->>k) !~ '^[1-9][0-9]*$' THEN RETURN false; END IF; END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE FUNCTION bootstrap_lifecycle_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'bootstrap_lifecycle_immutable'; END $$;
-- Issue reserves immutable channel bindings prospectively. Channel admission
-- necessarily follows root registration; it cannot be required to create root.
CREATE FUNCTION bootstrap_lifecycle_anchors_current(i JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE b JSONB:=i->'binding';host worker_identity_lifecycle;installation worker_identity_lifecycle;issuer bootstrap_issuer_history;
BEGIN
 SELECT * INTO host FROM worker_identity_lifecycle WHERE workspace_id=(b->>'workspaceId')::uuid AND kind='host' AND subject_id=(b->>'hostId')::uuid ORDER BY epoch DESC LIMIT 1;
 SELECT * INTO installation FROM worker_identity_lifecycle WHERE workspace_id=(b->>'workspaceId')::uuid AND kind='installation' AND subject_id=(b->>'installationId')::uuid ORDER BY epoch DESC LIMIT 1;
 SELECT * INTO issuer FROM bootstrap_issuer_history WHERE workspace_id=(b->>'workspaceId')::uuid ORDER BY revision DESC LIMIT 1;
 RETURN coalesce(host.state='active' AND installation.state='active' AND host.generation::text=i->>'hostGeneration' AND installation.generation::text=i->>'installationGeneration'
  AND host.epoch::text=b->>'hostEpoch' AND installation.epoch::text=b->>'installationEpoch' AND host.record->'intent'->>'hostFingerprint'=b->>'hostFingerprint'
  AND host.record->'intent'->>'installationGeneration'=i->>'installationGeneration'
  AND issuer.revision::text=i->>'issuerRevision' AND issuer.record_digest=i->>'issuerHistoryDigest' AND issuer.record->'intent'->>'action' NOT IN ('revoke','stage')
  AND EXISTS(SELECT 1 FROM agent_hosts WHERE id=host.subject_id AND workspace_id=host.workspace_id AND status::text<>'disabled')
  AND EXISTS(SELECT 1 FROM trusted_provider_ticket_keys k WHERE k.workspace_id=host.workspace_id AND k.installation_id=installation.subject_id
   AND k.key_id=b->>'ticketKeyId' AND k.epoch::text=b->>'ticketKeyEpoch' AND k.public_key_digest=b->>'ticketPublicKeyDigest')
  AND EXISTS(SELECT 1 FROM worker_identity_lifecycle_audit WHERE operation_id=host.id AND record_digest=host.record_digest)
  AND EXISTS(SELECT 1 FROM worker_identity_lifecycle_audit WHERE operation_id=installation.id AND record_digest=installation.record_digest)
  AND EXISTS(SELECT 1 FROM bootstrap_issuer_audit WHERE operation_id=issuer.id AND record_digest=issuer.record_digest)
  AND EXISTS(SELECT 1 FROM decisions d JOIN workspaces w ON w.id=d.workspace_id JOIN decision_revisions r ON r.decision_id=d.id JOIN decision_acceptances a ON a.decision_id=d.id
   WHERE d.id=(i->>'decisionId')::uuid AND d.workspace_id=host.workspace_id AND d.status='accepted' AND decision_state(d.id)='accepted'
    AND w.owner_user_id::text=i->>'ownerId' AND a.actor_user_id=w.owner_user_id AND a.actor_agent_id IS NULL AND a.actor_credential_id IS NULL
    AND a.authority->>'status'='owner_reserved' AND r.version::text=i->>'decisionRevision' AND r.body->'workerBootstrapLifecycle'=i-'ticketDigest'
    AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id))
  AND NOT EXISTS(SELECT 1 FROM api_keys WHERE workspace_id=host.workspace_id AND worker_host_id=host.subject_id AND active AND revoked_at IS NULL),false);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE FUNCTION bootstrap_lifecycle_current(i JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN RETURN bootstrap_lifecycle_anchors_current(i) AND EXISTS(
 SELECT 1 FROM worker_transport_history r JOIN worker_transport_heads h ON h.history_id=r.id
 JOIN worker_transport_bootstrap_grants g ON g.generation_id=r.generation_id JOIN worker_transport_audit a ON a.history_id=r.id
 WHERE h.workspace_id=(i->'binding'->>'workspaceId')::uuid AND h.host_id=(i->'binding'->>'hostId')::uuid
  AND r.generation_id::text=i->>'channelGeneration' AND r.revision::text=i->>'channelRevision' AND r.record_digest=i->>'channelDigest'
  AND r.state='current' AND r.purpose=i->>'purpose' AND a.record_digest=r.record_digest
  AND g.ticket_id::text=i->>'ticketId' AND g.record->'intent'->>'ticketDigest'=i->>'ticketDigest'
  AND g.record->'intent'->'snapshot'->'binding'=i->'binding'
  AND g.record->'intent'->'snapshot'->>'hostGeneration'=i->>'hostGeneration'
  AND g.record->'intent'->'snapshot'->>'installationGeneration'=i->>'installationGeneration'
  AND (g.record->'intent'->'snapshot'->>'validFrom')::timestamptz<=clock_timestamp()
  AND (g.record->'intent'->'snapshot'->>'expiresAt')::timestamptz>clock_timestamp());
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE FUNCTION bootstrap_lifecycle_write_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t worker_bootstrap_tickets;oldticket worker_bootstrap_tickets;p worker_bootstrap_lifecycle_events;
 h worker_bootstrap_history;a worker_bootstrap_attempts;i JSONB;r JSONB;b JSONB;f BIGINT;action TEXT;state TEXT;key TEXT;revoked BOOLEAN;expired BOOLEAN;reconciled BOOLEAN;authority RECORD;
BEGIN
 IF current_setting('session_replication_role')<>'origin' OR current_setting('transaction_isolation')<>'serializable'
 OR TG_OP='DELETE' OR (TG_OP='UPDATE' AND TG_TABLE_NAME<>'worker_bootstrap_heads') THEN RAISE EXCEPTION 'bootstrap_writer_denied'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1 RETURNING revision INTO f;
 IF f IS NULL THEN RAISE EXCEPTION 'bootstrap_writer_unfenced'; END IF;
 IF TG_TABLE_NAME='worker_bootstrap_tickets' THEN
  i:=NEW.lifecycle_identity;r:=NEW.record->'signed'->'payload';b:=i->'binding';
  IF jsonb_typeof(r) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(r))<>10
   OR NOT r ?& ARRAY['version','id','ownerId','ownerAuthAt','issuedAt','decisionId','decisionRevision','decisionIntentDigest','intent','lifecycle']
   OR jsonb_typeof(r->'intent') IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(r->'intent'))<>10
   OR NOT (r->'intent') ?& ARRAY['schemaVersion','purpose','binding','requestId','deviceProofDigest','channel','baseline','target','prior','expiresAt']
   OR jsonb_typeof(NEW.record->'decision'->'payload') IS DISTINCT FROM 'object'
   OR (SELECT count(*) FROM jsonb_object_keys(NEW.record->'decision'->'payload'))<>8
   OR NOT (NEW.record->'decision'->'payload') ?& ARRAY['id','revision','ownerId','authority','state','intentDigest','acceptedAt','expiresAt']
   OR jsonb_typeof(NEW.record->'signed'->'signature') IS DISTINCT FROM 'string' OR jsonb_typeof(NEW.record->'decision'->'signature') IS DISTINCT FROM 'string'
  THEN RAISE EXCEPTION 'bootstrap_v2_shape'; END IF;
  FOR key IN SELECT jsonb_object_keys(r) LOOP IF r->key='null'::jsonb THEN RAISE EXCEPTION 'bootstrap_v2_shape'; END IF; END LOOP;
  FOR key IN SELECT jsonb_object_keys(NEW.record->'decision'->'payload') LOOP
   IF NEW.record->'decision'->'payload'->key='null'::jsonb THEN RAISE EXCEPTION 'bootstrap_v2_shape'; END IF;
  END LOOP;
  IF bootstrap_lifecycle_shape(i) IS DISTINCT FROM true OR r->>'version' IS DISTINCT FROM 'worker-bootstrap-owner-ticket-v2'
  OR r->'lifecycle' IS DISTINCT FROM i-'ticketDigest' OR r->'intent'->>'schemaVersion' IS DISTINCT FROM 'worker-bootstrap-admission-v2'
  OR i->>'ticketId' IS DISTINCT FROM NEW.id::text OR i->>'ticketDigest' IS DISTINCT FROM NEW.ticket_digest
  OR i->>'ownerId' IS DISTINCT FROM NEW.owner_id::text OR i->>'decisionId' IS DISTINCT FROM NEW.decision_id::text
  OR i->>'decisionRevision' IS DISTINCT FROM r->>'decisionRevision' OR i->>'purpose' IS DISTINCT FROM r->'intent'->>'purpose'
  OR i->>'issuedAt' IS DISTINCT FROM r->>'issuedAt' OR i->>'expiresAt' IS DISTINCT FROM r->'intent'->>'expiresAt'
  OR (i->>'expiresAt')::timestamptz IS DISTINCT FROM NEW.expires_at OR r->'intent'->'binding' IS DISTINCT FROM b
  OR NEW.binding_digest IS DISTINCT FROM bootstrap_lifecycle_digest(b) OR NEW.ticket_digest IS DISTINCT FROM bootstrap_lifecycle_digest(NEW.record->'signed')
  OR NEW.record_digest IS DISTINCT FROM bootstrap_lifecycle_digest(NEW.record) OR i->>'generation' IS DISTINCT FROM NEW.generation::text
  OR NEW.record->'decision'->'payload'->>'id' IS DISTINCT FROM NEW.decision_id::text OR NEW.record->'decision'->'payload'->>'ownerId' IS DISTINCT FROM NEW.owner_id::text
  OR NEW.record->'decision'->'payload'->>'revision' IS DISTINCT FROM i->>'decisionRevision' OR NEW.record->'decision'->'payload'->>'state' IS DISTINCT FROM 'accepted'
  OR NEW.record->'decision'->'payload'->>'intentDigest' IS DISTINCT FROM r->>'decisionIntentDigest' OR r->>'decisionIntentDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(r->'intent')
  OR (NEW.record->'decision'->'payload'->>'expiresAt')::timestamptz<(i->>'expiresAt')::timestamptz
  OR (NEW.record->'decision'->'payload'->>'acceptedAt')::timestamptz>(i->>'issuedAt')::timestamptz
  OR (r->>'ownerAuthAt')::timestamptz>(i->>'issuedAt')::timestamptz
  OR i->>'credentialEpoch' IS DISTINCT FROM NEW.credential_epoch::text OR (i->'predecessor'->>'attemptId')::uuid IS DISTINCT FROM NEW.predecessor_id
  OR r->'intent'->'prior' IS DISTINCT FROM i->'predecessor'
  OR EXISTS(SELECT 1 FROM worker_bootstrap_tickets x WHERE x.workspace_id=NEW.workspace_id AND x.host_id=NEW.host_id AND x.lifecycle_identity IS NULL)
  THEN RAISE EXCEPTION 'bootstrap_metadata_invalid_or_legacy'; END IF;
  SELECT * INTO oldticket FROM worker_bootstrap_tickets WHERE workspace_id=NEW.workspace_id AND host_id=NEW.host_id ORDER BY generation DESC LIMIT 1;
  IF NEW.generation<>coalesce(oldticket.generation,0)+1 OR NEW.credential_epoch<>coalesce(oldticket.credential_epoch,0)+1 THEN RAISE EXCEPTION 'bootstrap_issue_high_water'; END IF;
  IF oldticket.id IS NOT NULL THEN
   SELECT * INTO p FROM worker_bootstrap_lifecycle_events WHERE ticket_id=oldticket.id ORDER BY revision DESC LIMIT 1;
   IF p.id IS NULL OR i->'predecessor'->>'ticketId' IS DISTINCT FROM oldticket.id::text OR i->'predecessor'->>'ticketDigest' IS DISTINCT FROM oldticket.ticket_digest
   OR i->'predecessor'->>'historyDigest' IS DISTINCT FROM p.record_digest OR i->'predecessor'->>'state' IS DISTINCT FROM p.record->>'state'
   OR (i->'predecessor'->>'attemptId')::uuid IS DISTINCT FROM p.attempt_id OR p.record->>'state' NOT IN ('revoked','expired','delivery_unknown')
   THEN RAISE EXCEPTION 'bootstrap_predecessor_invalid'; END IF;
  END IF;
  SELECT w.owner_user_id,r.version,r.body,ac.actor_user_id,ac.authority INTO authority
   FROM decisions d JOIN workspaces w ON w.id=d.workspace_id JOIN decision_revisions r ON r.decision_id=d.id JOIN decision_acceptances ac ON ac.decision_id=d.id
   WHERE d.id=NEW.decision_id AND w.id=NEW.workspace_id AND d.status='accepted' AND decision_state(d.id)='accepted'
    AND ac.actor_agent_id IS NULL AND ac.actor_credential_id IS NULL AND ac.created_at<=CURRENT_TIMESTAMP
    AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id);
  IF NOT FOUND OR authority.owner_user_id IS DISTINCT FROM NEW.owner_id OR authority.actor_user_id IS DISTINCT FROM NEW.owner_id
   OR authority.version IS DISTINCT FROM (i->>'decisionRevision')::int OR authority.authority->>'status' IS DISTINCT FROM 'owner_reserved'
   OR authority.body->'workerBootstrapLifecycle' IS DISTINCT FROM i-'ticketDigest'
   OR (SELECT count(*) FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND role::text='owner')<>1
   OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.owner_id AND role::text='owner')
  THEN RAISE EXCEPTION 'bootstrap_owner_binding_invalid'; END IF;
  IF bootstrap_lifecycle_anchors_current(i) IS DISTINCT FROM true THEN RAISE EXCEPTION 'bootstrap_source_binding_invalid'; END IF;
 ELSIF TG_TABLE_NAME='worker_bootstrap_lifecycle_events' THEN
  SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=NEW.ticket_id;i:=t.lifecycle_identity;r:=NEW.record;action:=r->>'action';
  SELECT * INTO p FROM worker_bootstrap_lifecycle_events WHERE ticket_id=NEW.ticket_id ORDER BY revision DESC LIMIT 1;
  IF bootstrap_lifecycle_shape(i) IS DISTINCT FROM true OR jsonb_typeof(r)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(r))<>12
   OR NOT r ?& ARRAY['id','ticketId','revision','previousDigest','action','state','attemptId','historyId','revoked','expired','reconciled','at']
   OR r->>'id' IS DISTINCT FROM NEW.id::text OR r->>'ticketId' IS DISTINCT FROM NEW.ticket_id::text OR r->>'revision' IS DISTINCT FROM NEW.revision::text
   OR NEW.revision<>coalesce(p.revision,0)+1 OR NEW.previous_digest IS DISTINCT FROM p.record_digest OR r->>'previousDigest' IS DISTINCT FROM NEW.previous_digest
   OR (r->>'attemptId')::uuid IS DISTINCT FROM NEW.attempt_id OR (r->>'historyId')::uuid IS DISTINCT FROM NEW.history_id
   OR action NOT IN ('issue','reserve','consume','revoke','expire','dispatch','complete','reconcile','unknown') OR action IS NULL
   OR jsonb_typeof(r->'revoked') IS DISTINCT FROM 'boolean' OR jsonb_typeof(r->'expired') IS DISTINCT FROM 'boolean' OR jsonb_typeof(r->'reconciled') IS DISTINCT FROM 'boolean'
   OR jsonb_typeof(r->'at') IS DISTINCT FROM 'string' OR (r->>'at') !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,3})?Z$'
   OR (r->>'at')::timestamptz>CURRENT_TIMESTAMP OR (r->>'at')::timestamptz<(i->>'issuedAt')::timestamptz
   OR (p.id IS NOT NULL AND (r->>'at')::timestamptz<(p.record->>'at')::timestamptz)
   THEN RAISE EXCEPTION 'bootstrap_lifecycle_cas'; END IF;
  revoked:=coalesce((p.record->>'revoked')::boolean,false);expired:=coalesce((p.record->>'expired')::boolean,false);reconciled:=coalesce((p.record->>'reconciled')::boolean,false);
  IF action IN ('issue','reserve','consume','dispatch','complete') AND
   ((CASE WHEN action='issue' THEN bootstrap_lifecycle_anchors_current(i) ELSE bootstrap_lifecycle_current(i) END) IS DISTINCT FROM true OR EXISTS(SELECT 1 FROM worker_bootstrap_tickets x WHERE x.workspace_id=t.workspace_id AND x.host_id=t.host_id AND x.generation>t.generation)
    OR (action<>'issue' AND f-1 IS DISTINCT FROM (SELECT max(fence_revision) FROM worker_bootstrap_write_receipts WHERE ticket_id=t.id)))
  THEN RAISE EXCEPTION 'bootstrap_source_aba_or_stale'; END IF;
  IF p.id IS NULL THEN
   IF action<>'issue' OR NEW.attempt_id IS NOT NULL OR NEW.history_id IS NOT NULL OR (r->>'at')::timestamptz>=(i->>'expiresAt')::timestamptz
    OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_write_receipts WHERE ticket_id=t.id AND table_name='worker_bootstrap_tickets' AND writer_xid=pg_current_xact_id()::text)
   THEN RAISE EXCEPTION 'bootstrap_issue_required'; END IF;state:='issued';
  ELSE
   IF action='issue' OR p.record->>'state' IN ('revoked','expired') OR reconciled THEN RAISE EXCEPTION 'bootstrap_terminal'; END IF;
   IF action IN ('reserve','consume','dispatch','complete') AND (revoked OR expired OR CURRENT_TIMESTAMP<(i->>'notBefore')::timestamptz OR CURRENT_TIMESTAMP>=(i->>'expiresAt')::timestamptz)
    THEN RAISE EXCEPTION 'bootstrap_validity'; END IF;
   CASE action
    WHEN 'reserve' THEN IF p.record->>'state'<>'issued' THEN RAISE EXCEPTION 'bootstrap_state'; END IF;state:='reserved';
    WHEN 'consume' THEN IF p.record->>'state'<>'reserved' THEN RAISE EXCEPTION 'bootstrap_state'; END IF;state:='consumed';
    WHEN 'dispatch' THEN IF p.record->>'state'<>'consumed' THEN RAISE EXCEPTION 'bootstrap_state'; END IF;state:='dispatched';
    WHEN 'complete' THEN IF p.record->>'state'<>'dispatched' THEN RAISE EXCEPTION 'bootstrap_state'; END IF;state:='completed';
    WHEN 'revoke' THEN IF revoked THEN RAISE EXCEPTION 'bootstrap_terminal'; END IF;revoked:=true;state:=CASE WHEN p.record->>'state' IN ('dispatched','completed','delivery_unknown') THEN 'delivery_unknown' ELSE 'revoked' END;
    WHEN 'expire' THEN IF expired OR CURRENT_TIMESTAMP<(i->>'expiresAt')::timestamptz THEN RAISE EXCEPTION 'bootstrap_expiry'; END IF;expired:=true;state:=CASE WHEN p.record->>'state' IN ('dispatched','completed','delivery_unknown') THEN 'delivery_unknown' ELSE 'expired' END;
    WHEN 'unknown' THEN IF p.record->>'state' NOT IN ('dispatched','completed') THEN RAISE EXCEPTION 'bootstrap_state'; END IF;state:='delivery_unknown';
    WHEN 'reconcile' THEN IF p.record->>'state'<>'delivery_unknown' THEN RAISE EXCEPTION 'bootstrap_state'; END IF;state:='delivery_unknown';reconciled:=true;
   END CASE;
  END IF;
  IF r->>'state' IS DISTINCT FROM state OR (r->>'revoked')::boolean IS DISTINCT FROM revoked OR (r->>'expired')::boolean IS DISTINCT FROM expired
   OR (r->>'reconciled')::boolean IS DISTINCT FROM reconciled OR (action<>'consume' AND NEW.attempt_id IS DISTINCT FROM p.attempt_id)
   OR (state IN ('consumed','dispatched','completed') AND (NEW.attempt_id IS NULL OR NEW.history_id IS NULL))
   OR (NEW.attempt_id IS NULL AND NEW.history_id IS NOT NULL) THEN RAISE EXCEPTION 'bootstrap_lifecycle_binding'; END IF;
  NEW.record_digest:=bootstrap_lifecycle_digest(r);NEW.writer_xid:=pg_current_xact_id()::text;
 ELSE
  IF TG_TABLE_NAME='worker_bootstrap_attempts' THEN SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=NEW.ticket_id;
   IF NEW.lifecycle_version IS DISTINCT FROM t.lifecycle_identity->>'version' OR NEW.predecessor_id IS DISTINCT FROM (t.lifecycle_identity->'predecessor'->>'attemptId')::uuid
    OR NEW.record->>'ticketDigest' IS DISTINCT FROM t.ticket_digest OR NEW.record->'binding' IS DISTINCT FROM t.lifecycle_identity->'binding'
    OR NEW.record->>'decisionId' IS DISTINCT FROM t.decision_id::text OR NEW.record->>'requestId' IS DISTINCT FROM t.request_id::text
    OR NEW.record->>'expiresAt' IS DISTINCT FROM t.lifecycle_identity->>'expiresAt'
    OR NEW.record->'target' IS DISTINCT FROM t.record->'signed'->'payload'->'intent'->'target' OR NEW.record_digest IS DISTINCT FROM bootstrap_lifecycle_digest(NEW.record)
    THEN RAISE EXCEPTION 'bootstrap_attempt_binding'; END IF;
  ELSIF TG_TABLE_NAME='worker_bootstrap_history' THEN SELECT * INTO a FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id;SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=a.ticket_id;
   IF NEW.record_digest IS DISTINCT FROM bootstrap_lifecycle_digest(NEW.record) OR NEW.record->>'previousDigest' IS DISTINCT FROM NEW.previous_digest
    OR NEW.record->>'previousState' IS DISTINCT FROM NEW.previous_state OR (NEW.record->>'createdAt')::timestamptz>clock_timestamp()
    OR (NEW.record->>'createdAt')::timestamptz<(t.lifecycle_identity->>'issuedAt')::timestamptz THEN RAISE EXCEPTION 'bootstrap_history_digest'; END IF;
   IF NEW.state IN ('dispatched','acknowledged') THEN
    b:=NEW.record->'peer'->'payload';
    IF b->'binding' IS DISTINCT FROM t.lifecycle_identity->'binding' OR b->>'attemptId' IS DISTINCT FROM NEW.attempt_id::text OR b->>'ticketDigest' IS DISTINCT FROM t.ticket_digest
     OR b->>'origin' IS DISTINCT FROM t.record->'signed'->'payload'->'intent'->'channel'->'profile'->>'origin'
     OR b->>'pin' IS DISTINCT FROM t.record->'signed'->'payload'->'intent'->'channel'->'profile'->'certificate'->>'fingerprint'
     OR b->>'certificateEpoch' IS DISTINCT FROM t.record->'signed'->'payload'->'intent'->'channel'->>'certificateEpoch'
    THEN RAISE EXCEPTION 'bootstrap_peer_binding'; END IF;
   END IF;
   IF NEW.state='acknowledged' THEN
    b:=NEW.record->'completion'->'payload';
    IF b->>'attemptId' IS DISTINCT FROM NEW.attempt_id::text OR b->>'ticketDigest' IS DISTINCT FROM t.ticket_digest OR b->>'requestId' IS DISTINCT FROM t.request_id::text
     OR b->'peer' IS DISTINCT FROM NEW.record->'peer'->'payload' OR b->'credential' IS DISTINCT FROM t.record->'signed'->'payload'->'intent'->'target'
    THEN RAISE EXCEPTION 'bootstrap_completion_binding'; END IF;
   END IF;
  ELSIF TG_TABLE_NAME='worker_bootstrap_heads' THEN SELECT * INTO a FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id;SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=a.ticket_id;
   SELECT * INTO h FROM worker_bootstrap_history WHERE attempt_id=NEW.attempt_id ORDER BY revision DESC LIMIT 1;
   IF h.id IS DISTINCT FROM NEW.history_id OR (TG_OP='UPDATE' AND (OLD.generation>NEW.generation OR OLD.generation=NEW.generation AND OLD.revision>=NEW.revision)) THEN RAISE EXCEPTION 'bootstrap_head_aba'; END IF;
  ELSE SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=NEW.ticket_id;
   IF pg_trigger_depth()<2 THEN RAISE EXCEPTION 'bootstrap_audit_automatic_only'; END IF;
  END IF;
  IF t.lifecycle_identity IS NULL THEN RAISE EXCEPTION 'bootstrap_legacy_denied'; END IF;
  IF TG_TABLE_NAME='worker_bootstrap_attempts' OR TG_TABLE_NAME='worker_bootstrap_history' AND to_jsonb(NEW)->>'state' IN ('consumed','dispatched','acknowledged') THEN
   IF bootstrap_lifecycle_current(t.lifecycle_identity) IS DISTINCT FROM true
    OR f-1 IS DISTINCT FROM (SELECT max(fence_revision) FROM worker_bootstrap_write_receipts WHERE ticket_id=t.id)
    OR EXISTS(SELECT 1 FROM worker_bootstrap_tickets x WHERE x.workspace_id=t.workspace_id AND x.host_id=t.host_id AND x.generation>t.generation)
   THEN RAISE EXCEPTION 'bootstrap_attempt_source_stale'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_lifecycle_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 OR NEW.writer_xid<>pg_current_xact_id()::text OR current_setting('session_replication_role')<>'origin'
 THEN RAISE EXCEPTION 'bootstrap_receipt_immutable'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_lifecycle_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE ticket UUID;ident TEXT;eid UUID:=gen_random_uuid();t worker_bootstrap_tickets;d TEXT;f BIGINT;
BEGIN
 IF TG_TABLE_NAME='worker_bootstrap_tickets' THEN ticket:=NEW.id;
 ELSIF TG_TABLE_NAME IN ('worker_bootstrap_attempts','worker_bootstrap_audit','worker_bootstrap_lifecycle_events') THEN ticket:=NEW.ticket_id;
 ELSE SELECT ticket_id INTO ticket FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id; END IF;
 SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=ticket;SELECT revision INTO f FROM ready_source_fence WHERE id=1;
 IF TG_TABLE_NAME='worker_bootstrap_heads' THEN ident:=NEW.workspace_id::text||':'||NEW.host_id::text;ELSE ident:=NEW.id::text; END IF;
 d:=encode(sha256(convert_to(to_jsonb(NEW)::text,'UTF8')),'hex');
 INSERT INTO events(id,workspace_id,type,source,actor_type,actor_id,resource_type,resource_id,payload,updated_at)
 VALUES(eid,t.workspace_id,'worker.bootstrap_lifecycle','roost','user',t.owner_id::text,TG_TABLE_NAME,ident,
  jsonb_build_object('ticketId',ticket,'rowDigest',d,'fence',f::text,'writerXid',pg_current_xact_id()::text,'launchAuthority',false),CURRENT_TIMESTAMP);
 INSERT INTO worker_bootstrap_write_receipts(ticket_id,table_name,row_id,writer_xid,row_digest,fence_revision,event_id)
 VALUES(ticket,TG_TABLE_NAME,ident,pg_current_xact_id()::text,d,f,eid);
 IF TG_TABLE_NAME IN ('worker_bootstrap_tickets','worker_bootstrap_history') THEN
  INSERT INTO worker_bootstrap_audit(id,ticket_id,history_id,event_id,record_digest)
  VALUES(gen_random_uuid(),ticket,CASE WHEN TG_TABLE_NAME='worker_bootstrap_history' THEN NEW.id ELSE NULL END,eid,NEW.record_digest);
 END IF;RETURN NULL;
END $$;
CREATE FUNCTION bootstrap_lifecycle_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE ticket UUID;op worker_bootstrap_lifecycle_events;h worker_bootstrap_history;a worker_bootstrap_attempts;
BEGIN
 IF TG_TABLE_NAME='worker_bootstrap_tickets' THEN ticket:=NEW.id;
 ELSIF TG_TABLE_NAME IN ('worker_bootstrap_attempts','worker_bootstrap_lifecycle_events') THEN ticket:=NEW.ticket_id;
 ELSE SELECT ticket_id INTO ticket FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id; END IF;
 SELECT * INTO op FROM worker_bootstrap_lifecycle_events WHERE ticket_id=ticket AND writer_xid=pg_current_xact_id()::text ORDER BY revision DESC LIMIT 1;
 IF op.id IS NULL THEN RAISE EXCEPTION 'bootstrap_atomic_lifecycle_required'; END IF;
 IF TG_TABLE_NAME='worker_bootstrap_tickets' AND NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events WHERE ticket_id=ticket AND revision=1 AND writer_xid=pg_current_xact_id()::text)
 THEN RAISE EXCEPTION 'bootstrap_atomic_issue_required'; END IF;
 IF TG_TABLE_NAME='worker_bootstrap_attempts' AND NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events WHERE ticket_id=ticket AND attempt_id=NEW.id AND record->>'action'='consume' AND writer_xid=pg_current_xact_id()::text)
 THEN RAISE EXCEPTION 'bootstrap_atomic_consume_required'; END IF;
 IF TG_TABLE_NAME='worker_bootstrap_history' AND NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events WHERE ticket_id=ticket AND history_id=NEW.id AND writer_xid=pg_current_xact_id()::text)
 THEN RAISE EXCEPTION 'bootstrap_atomic_attempt_history_required'; END IF;
 IF op.attempt_id IS NOT NULL THEN
  SELECT * INTO a FROM worker_bootstrap_attempts WHERE id=op.attempt_id;SELECT * INTO h FROM worker_bootstrap_history WHERE id=op.history_id;
  IF a.ticket_id IS DISTINCT FROM ticket OR h.attempt_id IS DISTINCT FROM a.id OR h.state IS DISTINCT FROM
    CASE op.record->>'state' WHEN 'completed' THEN 'acknowledged' WHEN 'revoked' THEN 'blocked' WHEN 'expired' THEN 'blocked' ELSE op.record->>'state' END
   OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_heads WHERE history_id=h.id AND attempt_id=a.id)
   OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_audit WHERE history_id=h.id AND record_digest=h.record_digest)
  THEN RAISE EXCEPTION 'bootstrap_attempt_ledger_required'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM worker_bootstrap_write_receipts r JOIN events e ON e.id=r.event_id
  WHERE r.table_name='worker_bootstrap_lifecycle_events' AND r.row_id=op.id::text AND r.writer_xid=pg_current_xact_id()::text
   AND r.row_digest=encode(sha256(convert_to(to_jsonb(op)::text,'UTF8')),'hex') AND e.payload->>'rowDigest'=r.row_digest)
 THEN RAISE EXCEPTION 'bootstrap_atomic_receipt_required'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION bootstrap_lifecycle_event_protect() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM worker_bootstrap_write_receipts WHERE event_id=OLD.id) THEN RAISE EXCEPTION 'bootstrap_event_immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN
 FOREACH tbl IN ARRAY ARRAY['worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events'] LOOP
  EXECUTE format('CREATE TRIGGER bootstrap_lifecycle_write_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION bootstrap_lifecycle_write_guard()',tbl);
  EXECUTE format('CREATE TRIGGER z_bootstrap_lifecycle_audit AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION bootstrap_lifecycle_audit()',tbl);
  EXECUTE format('CREATE TRIGGER bootstrap_lifecycle_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_lifecycle_immutable()',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_lifecycle_events'] LOOP
  EXECUTE format('CREATE CONSTRAINT TRIGGER bootstrap_lifecycle_commit_guard AFTER INSERT OR UPDATE ON %I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bootstrap_lifecycle_commit_guard()',tbl);
 END LOOP;
END $$;
CREATE TRIGGER bootstrap_lifecycle_receipt_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_write_receipts FOR EACH ROW EXECUTE FUNCTION bootstrap_lifecycle_receipt_guard();
CREATE TRIGGER bootstrap_lifecycle_no_truncate BEFORE TRUNCATE ON worker_bootstrap_write_receipts FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_lifecycle_immutable();
CREATE TRIGGER bootstrap_lifecycle_event_protect BEFORE UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION bootstrap_lifecycle_event_protect();
CREATE TRIGGER bootstrap_lifecycle_no_truncate BEFORE TRUNCATE ON events FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_lifecycle_immutable();
COMMIT;
