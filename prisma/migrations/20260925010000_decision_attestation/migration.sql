-- SOURCE ONLY / UNAPPLIED. Additive DDL; no seed, backfill or legacy admission.
-- Existing immutable Decision guards remain unchanged. authority_revision is
-- an immutable opt-in seed; the current revision is derived from child events.
BEGIN;
ALTER TABLE decisions ADD COLUMN authority_revision BIGINT CHECK(authority_revision=1);
CREATE TABLE decision_owner_auth_evidence (
 id UUID PRIMARY KEY,decision_id UUID NOT NULL REFERENCES decision_revisions(decision_id) ON DELETE RESTRICT,
 acceptance_id UUID NOT NULL UNIQUE REFERENCES decision_acceptances(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 record JSONB NOT NULL CHECK(octet_length(record::text)<=4096),record_digest TEXT NOT NULL,writer_xid TEXT NOT NULL,
 mutation_digest TEXT NOT NULL CHECK(mutation_digest ~ '^[a-f0-9]{64}$')
);
CREATE TABLE decision_attestation_key_history (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 installation_id UUID NOT NULL,key_id UUID NOT NULL,revision BIGINT NOT NULL CHECK(revision>0),epoch BIGINT NOT NULL CHECK(epoch>0),
 action TEXT NOT NULL CHECK(action IN ('create','adopt','stage','cutover','retire','revoke')),
 record JSONB NOT NULL CHECK(octet_length(record::text)<=8192),record_digest TEXT NOT NULL,writer_xid TEXT NOT NULL,mutation_digest TEXT NOT NULL CHECK(mutation_digest ~ '^[a-f0-9]{64}$'),
 UNIQUE(workspace_id,installation_id,revision)
);
CREATE TABLE decision_attestations (
 id UUID PRIMARY KEY,decision_id UUID NOT NULL REFERENCES decision_revisions(decision_id) ON DELETE RESTRICT,
 acceptance_id UUID NOT NULL UNIQUE REFERENCES decision_acceptances(id) ON DELETE RESTRICT,
 auth_evidence_id UUID NOT NULL REFERENCES decision_owner_auth_evidence(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 key_event_id UUID NOT NULL REFERENCES decision_attestation_key_history(id) ON DELETE RESTRICT,
 authority_revision BIGINT NOT NULL CHECK(authority_revision>0),record JSONB NOT NULL CHECK(octet_length(record::text)<=16384),
 record_digest TEXT NOT NULL,writer_xid TEXT NOT NULL,mutation_digest TEXT NOT NULL CHECK(mutation_digest ~ '^[a-f0-9]{64}$'),UNIQUE(decision_id,authority_revision)
);
CREATE TABLE decision_authority_events (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,revision BIGINT NOT NULL CHECK(revision>0),
 action TEXT NOT NULL CHECK(action IN ('create','source_change','attest','supersede','revoke','expire','reject')),
 source_table TEXT NOT NULL,source_row TEXT NOT NULL,source_digest TEXT NOT NULL CHECK(source_digest ~ '^[a-f0-9]{64}$'),
 previous_digest TEXT,record_digest TEXT NOT NULL,fence_revision BIGINT NOT NULL,writer_xid TEXT NOT NULL,
 at TIMESTAMPTZ NOT NULL,mutation_digest TEXT CHECK(mutation_digest ~ '^[a-f0-9]{64}$'),UNIQUE(decision_id,revision)
);
CREATE TABLE decision_attestation_write_receipts (
 id UUID PRIMARY KEY,workspace_id UUID REFERENCES workspaces(id) ON DELETE RESTRICT,
 table_name TEXT NOT NULL,row_id TEXT NOT NULL,operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
 row_digest TEXT NOT NULL CHECK(row_digest ~ '^[a-f0-9]{64}$'),fence_revision BIGINT NOT NULL CHECK(fence_revision>0),writer_xid TEXT NOT NULL,
 event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE RESTRICT
);
ALTER TABLE worker_bootstrap_attempts ADD COLUMN attestation_id UUID REFERENCES decision_attestations(id) ON DELETE RESTRICT;
ALTER TABLE worker_bootstrap_attempts ADD COLUMN attestation_seal JSONB CHECK(attestation_seal IS NULL OR octet_length(attestation_seal::text)<=16384);
ALTER TABLE worker_bootstrap_attempts ADD COLUMN attestation_committed_at TIMESTAMPTZ;
ALTER TABLE worker_bootstrap_attempts ADD COLUMN attestation_mutation_digest TEXT CHECK(attestation_mutation_digest ~ '^[a-f0-9]{64}$');
ALTER TABLE worker_bootstrap_attempts ADD CONSTRAINT attestation_seal_complete CHECK(
 (attestation_id IS NULL AND attestation_seal IS NULL AND attestation_committed_at IS NULL AND attestation_mutation_digest IS NULL) OR
 (attestation_id IS NOT NULL AND attestation_seal IS NOT NULL AND attestation_committed_at IS NOT NULL AND attestation_mutation_digest IS NOT NULL));

CREATE FUNCTION decision_attestation_digest(digest_domain TEXT,v JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN bootstrap_lifecycle_digest(jsonb_build_object('domain',digest_domain,'value',v)); END $$;
CREATE FUNCTION decision_attestation_revision(d UUID) RETURNS BIGINT LANGUAGE plpgsql STABLE AS $$
BEGIN RETURN (SELECT COALESCE((SELECT max(revision) FROM decision_authority_events WHERE decision_id=d),0)
 FROM decisions WHERE id=d AND authority_revision=1); END $$;
CREATE FUNCTION decision_attestation_owner(d UUID,a UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN RETURN COALESCE((SELECT x.authority_revision=1 AND x.status='accepted' AND decision_state(x.id)='accepted'
 AND ac.actor_user_id=w.owner_user_id AND ac.actor_agent_id IS NULL AND ac.actor_credential_id IS NULL AND ac.authority->>'status'='owner_reserved'
 AND ac.workspace_id=w.id AND r.workspace_id=w.id AND ac.created_at<=CURRENT_TIMESTAMP
 AND EXISTS(SELECT 1 FROM decision_authority_events WHERE decision_id=x.id AND revision=1 AND action='create')
 AND (SELECT count(*) FROM workspace_memberships WHERE workspace_id=w.id AND role::text='owner')=1
 AND EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=w.id AND user_id=w.owner_user_id AND role::text='owner')
 AND NOT EXISTS(SELECT 1 FROM decisions successor JOIN decision_acceptances accepted ON accepted.decision_id=successor.id WHERE successor.supersedes_id=x.id)
 AND NOT EXISTS(SELECT 1 FROM decision_authority_events WHERE decision_id=x.id AND action IN ('supersede','revoke','expire','reject'))
 FROM decisions x JOIN workspaces w ON w.id=x.workspace_id JOIN decision_revisions r ON r.decision_id=x.id
 JOIN decision_acceptances ac ON ac.decision_id=x.id WHERE x.id=d AND ac.id=a),false); END $$;
CREATE FUNCTION decision_attestation_key_current(k UUID) RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $$
DECLARE h decision_attestation_key_history;n TIMESTAMPTZ:=clock_timestamp(); BEGIN
 SELECT * INTO h FROM decision_attestation_key_history WHERE id=k AND action IN ('create','adopt','stage');
 IF h.id IS NULL OR h.record->'material'->>'purpose' IS DISTINCT FROM 'owner-decision-attestation-v1'
 OR (h.record->'material'->>'validFrom')::timestamptz>n OR (h.record->'material'->>'expiresAt')::timestamptz<=n
 OR EXISTS(SELECT 1 FROM decision_attestation_key_history WHERE workspace_id=h.workspace_id AND installation_id=h.installation_id AND key_id=h.key_id AND action IN ('retire','revoke')) THEN RETURN false; END IF;
 IF h.action='stage' AND NOT EXISTS(SELECT 1 FROM decision_attestation_key_history WHERE workspace_id=h.workspace_id AND installation_id=h.installation_id AND key_id=h.key_id AND action='cutover')
 AND NOT(n>=(h.record->>'overlapStartsAt')::timestamptz AND n<(h.record->>'cutoverAt')::timestamptz) THEN RETURN false; END IF;
 RETURN NOT EXISTS(SELECT 1 FROM decision_attestation_key_history s WHERE s.workspace_id=h.workspace_id AND s.installation_id=h.installation_id
 AND s.action='stage' AND s.epoch>h.epoch AND n>=(s.record->>'cutoverAt')::timestamptz);
END $$;
CREATE FUNCTION decision_attestation_lock() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'decision_attestation_unfenced'; END IF;
 -- These rows already advance the SAME fence in their pinned 81/82 writer.
 -- Lock at statement entry but do not add a second epoch before that writer.
 IF TG_TABLE_NAME IN ('worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events',
  'worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_bootstrap_grants') THEN
  PERFORM revision FROM ready_source_fence WHERE id=1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'decision_attestation_unfenced'; END IF;RETURN NULL;
 END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'decision_attestation_unfenced'; END IF;RETURN NULL;
END $$;
CREATE FUNCTION decision_attestation_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'decision_attestation_immutable'; END $$;
CREATE FUNCTION decision_attestation_root_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.authority_revision IS NOT NULL AND (NEW.authority_revision<>1 OR NEW.source<>'roost_decision' OR NEW.status<>'proposed') THEN RAISE EXCEPTION 'decision_attestation_root_invalid'; END IF;
 ELSIF TG_OP='UPDATE' THEN
  IF NEW.authority_revision IS DISTINCT FROM OLD.authority_revision THEN RAISE EXCEPTION 'decision_attestation_no_legacy_upgrade'; END IF;
 ELSIF OLD.authority_revision IS NOT NULL THEN RAISE EXCEPTION 'decision_attestation_root_immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE FUNCTION decision_attestation_child_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p JSONB;m JSONB;old decision_attestation_key_history;staged decision_attestation_key_history;active decision_attestation_key_history;
 auth decision_owner_auth_evidence;ac decision_acceptances;d decisions;r decision_revisions;t worker_bootstrap_tickets;g worker_transport_bootstrap_grants;
 maxrev BIGINT;highwater BIGINT;atime TIMESTAMPTZ;n TIMESTAMPTZ:=clock_timestamp(); BEGIN
 IF TG_OP<>'INSERT' OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'decision_attestation_immutable'; END IF;
 NEW.writer_xid:=pg_current_xact_id()::text;
 IF TG_TABLE_NAME='decision_authority_events' THEN
  SELECT * INTO d FROM decisions WHERE id=NEW.decision_id AND workspace_id=NEW.workspace_id AND authority_revision=1;
  IF d.id IS NULL THEN RAISE EXCEPTION 'decision_attestation_legacy_blocked'; END IF;
  SELECT revision,record_digest INTO maxrev,NEW.previous_digest FROM decision_authority_events WHERE decision_id=d.id ORDER BY revision DESC LIMIT 1;
  NEW.revision:=COALESCE(maxrev,0)+1;NEW.at:=n;SELECT revision INTO NEW.fence_revision FROM ready_source_fence WHERE id=1;
  IF NEW.action IN ('create','source_change','attest') AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'decision_attestation_source_event_required'; END IF;
  IF NEW.action='create' AND NEW.revision<>1 THEN RAISE EXCEPTION 'decision_attestation_create_replay'; END IF;
  IF NEW.action IN ('supersede','revoke','expire','reject') AND (NEW.mutation_digest IS NULL OR EXISTS(SELECT 1 FROM decision_authority_events WHERE decision_id=d.id AND action IN ('supersede','revoke','expire','reject'))) THEN RAISE EXCEPTION 'decision_attestation_terminal'; END IF;
  IF NEW.action='expire' AND NOT EXISTS(SELECT 1 FROM decision_attestations WHERE decision_id=d.id AND (record->'payload'->>'expiresAt')::timestamptz<=n) THEN RAISE EXCEPTION 'decision_attestation_not_expired'; END IF;
  NEW.record_digest:=decision_attestation_digest('owner-decision-authority-event-v1',to_jsonb(NEW)-'record_digest');RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='decision_attestation_key_history' THEN
  p:=NEW.record;m:=p->'material';
  IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_each(p) WHERE value='null'::jsonb AND key NOT IN ('previousDigest','material','overlapStartsAt','cutoverAt'))
   OR p-ARRAY['id','workspaceId','revision','previousDigest','at','action','keyId','material','overlapStartsAt','cutoverAt']<>'{}'::jsonb
   OR NOT p ?& ARRAY['id','workspaceId','revision','previousDigest','at','action','keyId','material','overlapStartsAt','cutoverAt']
   OR p->>'id' IS DISTINCT FROM NEW.id::text OR p->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text OR p->>'keyId' IS DISTINCT FROM NEW.key_id::text OR p->>'action' IS DISTINCT FROM NEW.action THEN RAISE EXCEPTION 'decision_key_shape'; END IF;
  SELECT * INTO old FROM decision_attestation_key_history WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id ORDER BY revision DESC LIMIT 1;
  SELECT COALESCE(max(epoch),0) INTO highwater FROM decision_attestation_key_history WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id;
  IF NEW.revision<>COALESCE(old.revision,0)+1 OR (p->>'revision')::bigint<>NEW.revision OR p->>'previousDigest' IS DISTINCT FROM old.record_digest
   OR (p->>'at')::timestamptz>n OR old.id IS NOT NULL AND (p->>'at')::timestamptz<(old.record->>'at')::timestamptz THEN RAISE EXCEPTION 'decision_key_history'; END IF;
  IF NEW.action IN ('create','adopt','stage') THEN
   IF (jsonb_typeof(m) IS DISTINCT FROM 'object' OR m-ARRAY['keyId','epoch','purpose','algorithm','format','publicKey','publicKeyDigest','provenance','validFrom','expiresAt']<>'{}'::jsonb
    OR NOT m ?& ARRAY['keyId','epoch','purpose','algorithm','format','publicKey','publicKeyDigest','provenance','validFrom','expiresAt']
    OR m->>'purpose' IS DISTINCT FROM 'owner-decision-attestation-v1' OR m->>'algorithm' IS DISTINCT FROM 'Ed25519' OR m->>'format' IS DISTINCT FROM 'raw-public-hex'
    OR m->>'publicKey' !~ '^[a-f0-9]{64}$' OR m->>'keyId' IS DISTINCT FROM NEW.key_id::text OR (m->>'epoch')::bigint<>NEW.epoch OR NEW.epoch<>highwater+1
    OR m->>'publicKeyDigest' IS DISTINCT FROM decision_attestation_digest('owner-decision-public-key-v1',jsonb_build_object('algorithm',m->'algorithm','format',m->'format','publicKey',m->'publicKey'))
    OR m->'provenance'->>'kind' IS DISTINCT FROM 'installation_secret_store' OR m->'provenance'->>'installationId' IS DISTINCT FROM NEW.installation_id::text
    OR NOT EXISTS(SELECT 1 FROM trusted_provider_ticket_keys WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id)
    OR jsonb_typeof(m->'provenance') IS DISTINCT FROM 'object' OR (m->'provenance')-ARRAY['kind','installationId','authorizationDigest','publicMaterialEvidenceDigest']<>'{}'::jsonb OR m->'provenance'->>'authorizationDigest' !~ '^[a-f0-9]{64}$' OR m->'provenance'->>'publicMaterialEvidenceDigest' !~ '^[a-f0-9]{64}$'
    OR (m->>'validFrom')::timestamptz>(p->>'at')::timestamptz OR (m->>'expiresAt')::timestamptz<=n
    OR EXISTS(SELECT 1 FROM decision_attestation_key_history WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id AND (key_id=NEW.key_id OR record->'material'->>'publicKeyDigest'=m->>'publicKeyDigest')) ) IS DISTINCT FROM false THEN RAISE EXCEPTION 'decision_key_material'; END IF;
   IF NEW.action IN ('create','adopt') THEN
    IF old.id IS NOT NULL OR p->'overlapStartsAt'<>'null'::jsonb OR p->'cutoverAt'<>'null'::jsonb THEN RAISE EXCEPTION 'decision_key_initial_history'; END IF;
   ELSE
    SELECT * INTO active FROM decision_attestation_key_history h WHERE h.workspace_id=NEW.workspace_id AND h.installation_id=NEW.installation_id AND h.action IN ('create','adopt','stage') AND decision_attestation_key_current(h.id) ORDER BY h.epoch DESC LIMIT 1;
    IF active.id IS NULL OR EXISTS(SELECT 1 FROM decision_attestation_key_history s WHERE s.workspace_id=NEW.workspace_id AND s.installation_id=NEW.installation_id AND s.action='stage' AND NOT EXISTS(SELECT 1 FROM decision_attestation_key_history c WHERE c.key_id=s.key_id AND c.workspace_id=s.workspace_id AND c.installation_id=s.installation_id AND c.action='cutover'))
     OR p->'overlapStartsAt'='null'::jsonb OR p->'cutoverAt'='null'::jsonb OR (p->>'overlapStartsAt')::timestamptz<(p->>'at')::timestamptz
     OR (p->>'cutoverAt')::timestamptz<=(p->>'overlapStartsAt')::timestamptz OR (p->>'cutoverAt')::timestamptz>(p->>'overlapStartsAt')::timestamptz+interval '120 seconds'
     OR (p->>'cutoverAt')::timestamptz>LEAST((m->>'expiresAt')::timestamptz,(active.record->'material'->>'expiresAt')::timestamptz) THEN RAISE EXCEPTION 'decision_key_overlap'; END IF;
   END IF;
  ELSE
   SELECT * INTO active FROM decision_attestation_key_history WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id AND key_id=NEW.key_id AND action IN ('create','adopt','stage');
   IF active.id IS NULL OR NEW.epoch<>active.epoch OR m<>'null'::jsonb OR p->'overlapStartsAt'<>'null'::jsonb OR p->'cutoverAt'<>'null'::jsonb
    OR EXISTS(SELECT 1 FROM decision_attestation_key_history WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id AND key_id=NEW.key_id AND action IN ('retire','revoke')) THEN RAISE EXCEPTION 'decision_key_terminal'; END IF;
   IF NEW.action='cutover' AND (active.action<>'stage' OR n<(active.record->>'cutoverAt')::timestamptz OR EXISTS(SELECT 1 FROM decision_attestation_key_history WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id AND key_id=NEW.key_id AND action='cutover')) THEN RAISE EXCEPTION 'decision_key_cutover'; END IF;
   IF NEW.action='retire' AND NOT EXISTS(SELECT 1 FROM decision_attestation_key_history WHERE workspace_id=NEW.workspace_id AND installation_id=NEW.installation_id AND epoch>active.epoch AND action='cutover') THEN RAISE EXCEPTION 'decision_key_retire'; END IF;
  END IF;
  NEW.record_digest:=decision_attestation_digest('owner-decision-key-event-v1',p);RETURN NEW;
 END IF;
 SELECT * INTO ac FROM decision_acceptances WHERE id=NEW.acceptance_id AND decision_id=NEW.decision_id AND workspace_id=NEW.workspace_id;
 IF ac.id IS NULL OR NOT decision_attestation_owner(NEW.decision_id,ac.id) THEN RAISE EXCEPTION 'decision_attestation_owner'; END IF;
 SELECT * INTO d FROM decisions WHERE id=NEW.decision_id;SELECT * INTO r FROM decision_revisions WHERE decision_id=d.id;
 IF TG_TABLE_NAME='decision_owner_auth_evidence' THEN
  p:=NEW.record;
  IF (p-ARRAY['version','workspaceId','ownerId','acceptanceId','level','authTime','acceptedAt','sessionEvidenceDigest','policyRevision']<>'{}'::jsonb
   OR NOT p ?& ARRAY['version','workspaceId','ownerId','acceptanceId','level','authTime','acceptedAt','sessionEvidenceDigest','policyRevision']
   OR p->>'version' IS DISTINCT FROM 'roost-owner-auth-evidence-v1' OR p->>'workspaceId' IS DISTINCT FROM d.workspace_id::text OR p->>'ownerId' IS DISTINCT FROM ac.actor_user_id::text OR p->>'acceptanceId' IS DISTINCT FROM ac.id::text
   OR p->>'level' NOT IN ('roost_session','roost_session_2fa','webauthn') OR p->>'sessionEvidenceDigest' !~ '^[a-f0-9]{64}$' OR (p->>'policyRevision')::bigint<1
   OR (p->>'acceptedAt')::timestamptz<>ac.created_at OR (p->>'authTime')::timestamptz>ac.created_at OR (p->>'authTime')::timestamptz<n-interval '5 minutes' ) IS DISTINCT FROM false THEN RAISE EXCEPTION 'decision_owner_evidence'; END IF;
  NEW.record_digest:=decision_attestation_digest('owner-decision-auth-evidence-v1',p);RETURN NEW;
 END IF;
 p:=NEW.record->'payload';
 IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR NOT p ?& ARRAY['version','decisionId','decisionRevision','revisionDigest','acceptanceId','ownerId','binding','purpose','intentDigest','evidenceDigest','ticketId','ticketContentDigest','ticketEnvelopeDigest','hostGeneration','installationGeneration','issuerRevision','issuerHistoryDigest','channelGrantId','channelGrantRevision','channelGrantDigest','policyRevision','validFrom','expiresAt','authorityRevision','ownerAuthEvidenceDigest','ownerAuthLevel','signingKeyId','signingKeyRevision','signingKeyEpoch','signingPublicKeyDigest','signingKeyHistoryDigest']
 OR (SELECT count(*) FROM jsonb_object_keys(p))<>31 OR EXISTS(SELECT 1 FROM jsonb_each(p) WHERE value='null'::jsonb) THEN RAISE EXCEPTION 'decision_attestation_payload_shape'; END IF;
 SELECT * INTO auth FROM decision_owner_auth_evidence WHERE id=NEW.auth_evidence_id AND acceptance_id=ac.id AND decision_id=d.id AND workspace_id=d.workspace_id;
 SELECT * INTO old FROM decision_attestation_key_history WHERE id=NEW.key_event_id AND workspace_id=d.workspace_id;
 SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=(p->>'ticketId')::uuid AND decision_id=d.id AND workspace_id=d.workspace_id;
 SELECT * INTO g FROM worker_transport_bootstrap_grants WHERE id=(p->>'channelGrantId')::uuid AND ticket_id=t.id;
 IF (NEW.record-ARRAY['id','payload','signature','at']<>'{}'::jsonb OR NOT NEW.record ?& ARRAY['id','payload','signature','at'] OR NEW.record->>'id' IS DISTINCT FROM NEW.id::text OR NEW.record->>'signature' !~ '^[a-f0-9]{128}$'
  OR (NEW.record->>'at')::timestamptz>n OR auth.id IS NULL OR old.id IS NULL OR t.id IS NULL OR g.id IS NULL OR t.lifecycle_identity IS NULL
  OR NOT decision_attestation_key_current(old.id) OR NEW.authority_revision<>decision_attestation_revision(d.id)+1
  OR p->>'version' IS DISTINCT FROM 'owner-decision-attestation-v1' OR p->>'decisionId' IS DISTINCT FROM d.id::text OR p->>'acceptanceId' IS DISTINCT FROM ac.id::text
  OR (p->>'decisionRevision')::bigint<>r.version OR p->>'revisionDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(r.body)
  OR p->>'ownerId' IS DISTINCT FROM ac.actor_user_id::text OR (p->>'authorityRevision')::bigint<>NEW.authority_revision
  OR p->>'ownerAuthEvidenceDigest' IS DISTINCT FROM auth.record_digest OR p->>'ownerAuthLevel' IS DISTINCT FROM auth.record->>'level' OR p->>'policyRevision' IS DISTINCT FROM auth.record->>'policyRevision'
  OR (auth.record->>'authTime')::timestamptz<n-interval '5 minutes' OR p->'binding' IS DISTINCT FROM t.lifecycle_identity->'binding'
  OR p->>'purpose' IS DISTINCT FROM t.lifecycle_identity->>'purpose' OR p->>'hostGeneration' IS DISTINCT FROM t.lifecycle_identity->>'hostGeneration'
  OR p->>'installationGeneration' IS DISTINCT FROM t.lifecycle_identity->>'installationGeneration' OR p->>'issuerRevision' IS DISTINCT FROM t.lifecycle_identity->>'issuerRevision' OR p->>'issuerHistoryDigest' IS DISTINCT FROM t.lifecycle_identity->>'issuerHistoryDigest'
  OR p->>'ticketContentDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(jsonb_build_object('domain','worker-bootstrap-ticket-content-v2','payload',t.record->'signed'->'payload'))
  OR p->>'ticketEnvelopeDigest' IS DISTINCT FROM t.ticket_digest OR p->>'intentDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(t.record->'signed'->'payload'->'intent')
  OR p->>'channelGrantDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(g.record) OR p->>'channelGrantRevision' IS DISTINCT FROM g.record->'intent'->'snapshot'->>'revision'
  OR p->>'signingKeyId' IS DISTINCT FROM old.key_id::text OR (p->>'signingKeyRevision')::bigint<>old.revision OR (p->>'signingKeyEpoch')::bigint<>old.epoch
  OR p->>'signingPublicKeyDigest' IS DISTINCT FROM old.record->'material'->>'publicKeyDigest' OR p->>'signingKeyHistoryDigest' IS DISTINCT FROM old.record_digest
  OR (p->>'validFrom')::timestamptz>n OR (p->>'validFrom')::timestamptz<GREATEST(ac.created_at,(old.record->'material'->>'validFrom')::timestamptz) OR (p->>'expiresAt')::timestamptz<=n
  OR (p->>'expiresAt')::timestamptz>LEAST(t.expires_at,(old.record->'material'->>'expiresAt')::timestamptz)
  OR NOT bootstrap_lifecycle_current(t.lifecycle_identity)) IS DISTINCT FROM false THEN RAISE EXCEPTION 'decision_attestation_binding'; END IF;
 NEW.record_digest:=decision_attestation_digest('owner-decision-attestation-envelope-v1',NEW.record);RETURN NEW;
END $$;

-- A bridge is evidence of every actual epoch, never a synthetic ticket receipt.
-- Only prospective opted-in tickets can bridge their immutable issue/reserve
-- receipt through their own public key/auth/attestation rows, then this start's
-- automatic lifecycle receipts. Unrelated, missing or replayed epochs deny.
CREATE FUNCTION decision_attestation_lineage(ticket UUID,through_fence BIGINT) RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $$
DECLARE t worker_bootstrap_tickets;a decision_attestations;anchor worker_bootstrap_write_receipts;
 head worker_bootstrap_lifecycle_events;ae decision_authority_events;af BIGINT;valid BOOLEAN; BEGIN
 SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=ticket;
 SELECT att.* INTO a FROM decision_attestations att JOIN decisions d ON d.id=att.decision_id
  WHERE d.id=t.decision_id AND d.authority_revision=1 AND att.authority_revision=decision_attestation_revision(d.id);
 IF a.id IS NULL OR a.record->'payload'->>'ticketId' IS DISTINCT FROM ticket::text
  OR NOT decision_attestation_owner(a.decision_id,a.acceptance_id) OR NOT decision_attestation_key_current(a.key_event_id)
  OR NOT bootstrap_lifecycle_current(t.lifecycle_identity) OR (a.record->'payload'->>'expiresAt')::timestamptz<=clock_timestamp()
  OR current_setting('session_replication_role')<>'origin' OR through_fence IS NULL THEN RETURN false; END IF;
 SELECT fence_revision INTO af FROM decision_attestation_write_receipts WHERE table_name='decision_attestations' AND row_id=a.id::text AND operation='INSERT';
 SELECT * INTO ae FROM decision_authority_events WHERE decision_id=a.decision_id AND revision=a.authority_revision AND action='attest' AND source_row=a.id::text;
 SELECT * INTO anchor FROM worker_bootstrap_write_receipts WHERE ticket_id=ticket AND fence_revision<af ORDER BY fence_revision DESC LIMIT 1;
 SELECT * INTO head FROM worker_bootstrap_lifecycle_events WHERE id::text=anchor.row_id AND ticket_id=ticket;
 IF af IS NULL OR ae.id IS NULL OR anchor.event_id IS NULL OR head.id IS NULL OR anchor.table_name<>'worker_bootstrap_lifecycle_events'
  OR head.record->>'state' NOT IN ('issued','reserved') OR head.attempt_id IS NOT NULL
  OR anchor.row_digest IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(head)::text,'UTF8')),'hex')
  OR anchor.writer_xid IS DISTINCT FROM head.writer_xid OR through_fence<ae.fence_revision
  OR through_fence-anchor.fence_revision NOT BETWEEN 1 AND 4096
  OR NOT EXISTS(SELECT 1 FROM events e WHERE e.id=anchor.event_id AND e.type='worker.bootstrap_lifecycle'
   AND e.source='roost' AND e.actor_type::text='user' AND e.actor_id=t.owner_id::text
   AND e.workspace_id=t.workspace_id AND e.resource_type=anchor.table_name AND e.resource_id=anchor.row_id
   AND e.payload=jsonb_build_object('ticketId',ticket,'rowDigest',anchor.row_digest,'fence',anchor.fence_revision::text,'writerXid',anchor.writer_xid,'launchAuthority',false))
  THEN RETURN false; END IF;
 WITH eligible(tbl,rid,rid82,row,early) AS (
  SELECT 'decision_attestation_key_history',k.id::text,k.id::text,to_jsonb(k),true FROM decision_attestation_key_history k
   WHERE k.workspace_id=t.workspace_id AND k.installation_id=(t.lifecycle_identity->'binding'->>'installationId')::uuid
  UNION ALL SELECT 'decision_owner_auth_evidence',x.id::text,x.id::text,to_jsonb(x),true FROM decision_owner_auth_evidence x WHERE x.id=a.auth_evidence_id
  UNION ALL SELECT 'decision_attestations',a.id::text,a.id::text,to_jsonb(a),true
  UNION ALL SELECT 'decision_authority_events',x.id::text,x.id::text,to_jsonb(x),true FROM decision_authority_events x WHERE x.decision_id=a.decision_id
   AND ((x.action='source_change' AND x.source_table='decision_owner_auth_evidence' AND x.source_row=a.auth_evidence_id::text)
    OR (x.id=ae.id AND x.source_table='decision_attestations'))
  UNION ALL SELECT 'worker_bootstrap_lifecycle_events',x.id::text,x.id::text,to_jsonb(x),false FROM worker_bootstrap_lifecycle_events x WHERE x.ticket_id=ticket
   AND x.writer_xid=pg_current_xact_id()::text AND ((x.record->>'action'='reserve' AND x.attempt_id IS NULL)
    OR (x.record->>'action'='consume' AND EXISTS(SELECT 1 FROM worker_bootstrap_attempts b WHERE b.id=x.attempt_id AND b.attestation_id=a.id)))
  UNION ALL SELECT 'worker_bootstrap_attempts',b.id::text||':'||b.host_id::text,b.id::text,to_jsonb(b),false FROM worker_bootstrap_attempts b WHERE b.ticket_id=ticket AND b.attestation_id=a.id
  UNION ALL SELECT 'worker_bootstrap_history',h.id::text,h.id::text,to_jsonb(h),false FROM worker_bootstrap_history h JOIN worker_bootstrap_attempts b ON b.id=h.attempt_id
   WHERE b.ticket_id=ticket AND b.attestation_id=a.id AND h.state='consumed' AND h.revision=1
  UNION ALL SELECT 'worker_bootstrap_heads',h.workspace_id::text||':'||h.host_id::text,h.workspace_id::text||':'||h.host_id::text,to_jsonb(h),false
   FROM worker_bootstrap_heads h JOIN worker_bootstrap_attempts b ON b.id=h.attempt_id WHERE b.ticket_id=ticket AND b.attestation_id=a.id AND h.state='consumed' AND h.revision=1
  UNION ALL SELECT 'worker_bootstrap_audit',u.id::text,u.id::text,to_jsonb(u),false FROM worker_bootstrap_audit u JOIN worker_bootstrap_history h ON h.id=u.history_id
   JOIN worker_bootstrap_attempts b ON b.id=h.attempt_id WHERE b.ticket_id=ticket AND b.attestation_id=a.id AND h.state='consumed' AND h.revision=1
 ), proofs AS (
  SELECT r.id,r.fence_revision,r.table_name,r.row_id,false AS legacy,
   COALESCE(o.tbl IS NOT NULL AND r.workspace_id=t.workspace_id AND (r.operation='INSERT' OR r.operation='UPDATE' AND o.tbl='worker_bootstrap_heads')
   AND r.row_digest=bootstrap_lifecycle_digest(o.row)
    AND (NOT (o.row ? 'writer_xid') OR r.writer_xid=o.row->>'writer_xid')
    AND (CASE WHEN o.early THEN r.fence_revision<=CASE WHEN o.tbl='decision_authority_events' THEN ae.fence_revision ELSE af END
      ELSE r.fence_revision>ae.fence_revision AND r.writer_xid=pg_current_xact_id()::text END)
    AND e.type='decision.attestation.write' AND e.source='roost' AND e.actor_type::text='system'
    AND e.workspace_id=r.workspace_id AND e.resource_type=r.table_name AND e.resource_id=r.row_id
    AND e.payload=jsonb_build_object('table',r.table_name,'rowId',r.row_id,'operation',r.operation,'rowDigest',r.row_digest,'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false),false) AS valid
  FROM decision_attestation_write_receipts r LEFT JOIN eligible o ON o.tbl=r.table_name AND o.rid=r.row_id LEFT JOIN events e ON e.id=r.event_id
   WHERE r.fence_revision>anchor.fence_revision AND r.fence_revision<=through_fence
  UNION ALL SELECT r.event_id,r.fence_revision,r.table_name,r.row_id,true,
   COALESCE(o.tbl IS NOT NULL AND NOT o.early AND r.ticket_id=ticket AND r.writer_xid=pg_current_xact_id()::text AND r.fence_revision>ae.fence_revision
    AND r.row_digest=encode(sha256(convert_to(o.row::text,'UTF8')),'hex') AND e.type='worker.bootstrap_lifecycle'
    AND e.source='roost' AND e.actor_type::text='user' AND e.actor_id=t.owner_id::text
    AND e.workspace_id=t.workspace_id AND e.resource_type=r.table_name AND e.resource_id=r.row_id
    AND e.payload=jsonb_build_object('ticketId',ticket,'rowDigest',r.row_digest,'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false),false)
  FROM worker_bootstrap_write_receipts r LEFT JOIN eligible o ON o.tbl=r.table_name AND o.rid82=r.row_id LEFT JOIN events e ON e.id=r.event_id
   WHERE r.fence_revision>anchor.fence_revision AND r.fence_revision<=through_fence
 ) SELECT COALESCE(bool_and(proofs.valid),false) AND count(DISTINCT fence_revision)=through_fence-anchor.fence_revision
   AND count(*)=count(DISTINCT (legacy,table_name,row_id)) INTO valid FROM proofs;
 RETURN COALESCE(valid,false);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

-- Upgrade ONLY the two exact gap predicates of the reviewed 82 function.
-- Its original strict comparison is retained as the first branch; every other
-- statement, trigger, receipt and deferred guard stays byte-for-byte identical.
DO $compat$ DECLARE body TEXT;old_test TEXT:='f-1 IS DISTINCT FROM (SELECT max(fence_revision) FROM worker_bootstrap_write_receipts WHERE ticket_id=t.id)';
 new_test TEXT:='(f-1 IS DISTINCT FROM (SELECT max(fence_revision) FROM worker_bootstrap_write_receipts WHERE ticket_id=t.id) AND NOT decision_attestation_lineage(t.id,f-1))'; BEGIN
 SELECT replace(prosrc,chr(13),'') INTO body FROM pg_proc WHERE oid='bootstrap_lifecycle_write_guard()'::regprocedure;
 IF encode(sha256(convert_to(body,'UTF8')),'hex')<>'1000876fe64fa1808625f0e9b06db2a86f8b4d1aa26d7dd0f6cce07be045e048'
  OR (length(body)-length(replace(body,old_test,'')))/length(old_test)<>2 THEN RAISE EXCEPTION 'decision_lifecycle_upgrade_source_mismatch'; END IF;
 EXECUTE 'CREATE OR REPLACE FUNCTION bootstrap_lifecycle_write_guard() RETURNS TRIGGER LANGUAGE plpgsql AS '||quote_literal(replace(body,old_test,new_test));
END $compat$;

CREATE FUNCTION decision_attestation_seal_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE a decision_attestations;p JSONB;f BIGINT; BEGIN
 IF TG_OP<>'INSERT' THEN
  IF OLD.attestation_id IS NOT NULL OR TG_OP='UPDATE' AND (NEW.attestation_id IS DISTINCT FROM OLD.attestation_id OR NEW.attestation_seal IS DISTINCT FROM OLD.attestation_seal OR NEW.attestation_committed_at IS DISTINCT FROM OLD.attestation_committed_at) THEN RAISE EXCEPTION 'decision_attempt_seal_immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
 END IF;
 IF NEW.attestation_id IS NULL THEN
  IF EXISTS(SELECT 1 FROM worker_bootstrap_tickets t JOIN decisions d ON d.id=t.decision_id WHERE t.id=NEW.ticket_id AND d.authority_revision IS NOT NULL) THEN RAISE EXCEPTION 'decision_attempt_seal_required'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO a FROM decision_attestations WHERE id=NEW.attestation_id;SELECT revision INTO f FROM ready_source_fence WHERE id=1;
 p:=a.record->'payload';
 -- The adapter compares the pre-write fence under lock. Existing statement
 -- triggers may advance it; capture the actual insert fence, never predict it.
 NEW.attestation_seal:=jsonb_set(NEW.attestation_seal,'{sourceFence}',to_jsonb(f::text));
 IF a.id IS NULL OR a.workspace_id<>NEW.workspace_id OR (p->>'ticketId')::uuid<>NEW.ticket_id OR NOT decision_attestation_owner(a.decision_id,a.acceptance_id)
  OR NOT decision_attestation_lineage(NEW.ticket_id,f-1)
  OR decision_attestation_revision(a.decision_id)<>a.authority_revision OR NOT decision_attestation_key_current(a.key_event_id)
  OR NEW.attestation_seal IS DISTINCT FROM jsonb_build_object('version','owner-decision-attempt-seal-v1','attemptId',NEW.id,'ticketId',NEW.ticket_id,
   'attestationId',a.id,'attestationDigest',a.record_digest,'authorityRevision',a.authority_revision,'sourceFence',f::text,'sourceDigest',NEW.attestation_seal->>'sourceDigest',
   'bindings',p,'state','started') OR COALESCE(NEW.attestation_seal->>'sourceDigest','') !~ '^[a-f0-9]{64}$'
  OR (p->>'expiresAt')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'decision_attempt_seal_invalid'; END IF;
 -- This is a row timestamp, NOT proof of COMMIT. A separate readback is required.
 NEW.attestation_committed_at:=clock_timestamp();RETURN NEW;
END $$;
CREATE FUNCTION decision_attestation_attempt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE a worker_bootstrap_attempts;att decision_attestations; BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'decision_attestation_attempt_immutable'; END IF;
 SELECT * INTO a FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id;
 IF a.attestation_id IS NULL THEN RETURN NEW; END IF;
 IF NEW.state IN ('consumed','dispatched','acknowledged') THEN
  SELECT * INTO att FROM decision_attestations WHERE id=a.attestation_id;
  IF att.id IS NULL OR NOT decision_attestation_owner(att.decision_id,att.acceptance_id) OR NOT decision_attestation_key_current(att.key_event_id)
   OR decision_attestation_revision(att.decision_id)<>att.authority_revision OR (att.record->'payload'->>'expiresAt')::timestamptz<=clock_timestamp()
   THEN RAISE EXCEPTION 'decision_attestation_attempt_stale'; END IF;
  IF NEW.state<>'consumed' AND EXISTS(SELECT 1 FROM decision_attestation_write_receipts WHERE table_name='worker_bootstrap_attempts'
   AND row_id=a.id::text||':'||a.host_id::text AND writer_xid=pg_current_xact_id()::text) THEN RAISE EXCEPTION 'decision_attestation_start_commit_required'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE FUNCTION decision_attestation_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'decision_attestation_receipt_immutable'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION decision_attestation_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE public_row JSONB:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;w UUID;ident TEXT;rd TEXT;f BIGINT;eid UUID:=gen_random_uuid();d RECORD; BEGIN
 w:=(public_row->>'workspace_id')::uuid;
 IF TG_TABLE_NAME='workspaces' THEN w:=(public_row->>'id')::uuid;END IF;
 IF w IS NULL AND public_row ? 'ticket_id' THEN SELECT workspace_id INTO w FROM worker_bootstrap_tickets WHERE id=(public_row->>'ticket_id')::uuid;END IF;
 IF w IS NULL AND public_row ? 'generation_id' THEN SELECT workspace_id INTO w FROM worker_transport_generations WHERE id=(public_row->>'generation_id')::uuid;END IF;
 IF w IS NULL AND public_row ? 'decision_id' THEN SELECT workspace_id INTO w FROM decisions WHERE id=(public_row->>'decision_id')::uuid;END IF;
 ident:=COALESCE(public_row->>'id',public_row->>'decision_id',public_row->>'workspace_id')||COALESCE(':'||(public_row->>'host_id'),'');
 IF ident IS NULL THEN ident:=bootstrap_lifecycle_digest(public_row);END IF;
 rd:=bootstrap_lifecycle_digest(public_row);SELECT revision INTO f FROM ready_source_fence WHERE id=1;
 INSERT INTO events(id,workspace_id,type,source,actor_type,resource_type,resource_id,payload,updated_at)
 VALUES(eid,w,'decision.attestation.write','roost','system',TG_TABLE_NAME,ident,jsonb_build_object('table',TG_TABLE_NAME,'rowId',ident,'operation',TG_OP,'rowDigest',rd,'fence',f::text,'writerXid',pg_current_xact_id()::text,'launchAuthority',false),clock_timestamp());
 INSERT INTO decision_attestation_write_receipts(id,workspace_id,table_name,row_id,operation,row_digest,fence_revision,writer_xid,event_id)
 VALUES(gen_random_uuid(),w,TG_TABLE_NAME,ident,TG_OP,rd,f,pg_current_xact_id()::text,eid);
 IF TG_TABLE_NAME='decision_attestations' THEN
  INSERT INTO decision_authority_events(id,workspace_id,decision_id,revision,action,source_table,source_row,source_digest,record_digest,fence_revision,writer_xid,at)
  VALUES(gen_random_uuid(),w,(public_row->>'decision_id')::uuid,1,'attest',TG_TABLE_NAME,ident,rd,'',f,'',clock_timestamp());
 ELSIF TG_TABLE_NAME='decision_owner_auth_evidence' THEN
  -- Authentication evidence belongs to exactly one acceptance/decision. Its
  -- automatic authority event must not be an unrelated decision's mutation.
  INSERT INTO decision_authority_events(id,workspace_id,decision_id,revision,action,source_table,source_row,source_digest,record_digest,fence_revision,writer_xid,at)
  VALUES(gen_random_uuid(),w,(public_row->>'decision_id')::uuid,1,'source_change',TG_TABLE_NAME,ident,rd,'',f,'',clock_timestamp());
 ELSIF TG_TABLE_NAME NOT IN ('decision_attestation_key_history','decision_authority_events','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events') THEN
  -- Conservative workspace-wide invalidation; no decision roots are rewritten.
  FOR d IN SELECT id FROM decisions WHERE workspace_id=w AND authority_revision=1 LOOP
   INSERT INTO decision_authority_events(id,workspace_id,decision_id,revision,action,source_table,source_row,source_digest,record_digest,fence_revision,writer_xid,at)
   VALUES(gen_random_uuid(),w,d.id,1,CASE WHEN TG_TABLE_NAME='decisions' AND TG_OP='INSERT' AND d.id=(public_row->>'id')::uuid THEN 'create' ELSE 'source_change' END,TG_TABLE_NAME,ident,rd,'',f,'',clock_timestamp());
  END LOOP;
 END IF;RETURN NULL;
END $$;
CREATE FUNCTION decision_attestation_event_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN IF NEW.type='decision.attestation.write' AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'decision_attestation_event_unbound'; END IF;RETURN NEW;END IF;
 IF OLD.type='decision.attestation.write' OR TG_OP='UPDATE' AND NEW.type='decision.attestation.write' THEN RAISE EXCEPTION 'decision_attestation_event_immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE FUNCTION decision_attestation_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r decision_attestation_write_receipts;e events; BEGIN
 SELECT * INTO r FROM decision_attestation_write_receipts WHERE id=NEW.id;SELECT * INTO e FROM events WHERE id=r.event_id;
 IF r.id IS NULL OR e.id IS NULL OR e.type<>'decision.attestation.write' OR e.workspace_id IS DISTINCT FROM r.workspace_id
 OR e.source<>'roost' OR e.actor_type::text<>'system' OR e.resource_type<>r.table_name OR e.resource_id<>r.row_id
 OR e.payload IS DISTINCT FROM jsonb_build_object('table',r.table_name,'rowId',r.row_id,'operation',r.operation,'rowDigest',r.row_digest,'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false)
 THEN RAISE EXCEPTION 'decision_attestation_commit_receipt_missing'; END IF;RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN
 FOREACH tbl IN ARRAY ARRAY['workspaces','workspace_memberships','decisions','decision_revisions','decision_acceptances','decision_impact_previews','decision_deferrals','decision_reopening_events','task_interview_cases','task_interview_entries','company_records','worker_bootstrap_tickets','agent_hosts','worker_identity_lifecycle','worker_identity_lifecycle_audit','bootstrap_issuer_history','bootstrap_issuer_audit','trusted_provider_ticket_keys','api_keys','worker_credential_handoffs','worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_bootstrap_grants','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events','decision_owner_auth_evidence','decision_attestation_key_history','decision_attestations','decision_authority_events'] LOOP
  EXECUTE format('CREATE TRIGGER aa_decision_attestation_fence BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION decision_attestation_lock()',tbl);
  EXECUTE format('CREATE TRIGGER zz_decision_attestation_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION decision_attestation_audit()',tbl);
  EXECUTE format('CREATE TRIGGER decision_attestation_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION decision_attestation_immutable()',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['decision_owner_auth_evidence','decision_attestation_key_history','decision_attestations','decision_authority_events'] LOOP
  EXECUTE format('CREATE TRIGGER decision_attestation_child_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION decision_attestation_child_guard()',tbl);
 END LOOP;
END $$;
CREATE TRIGGER decision_attestation_root_guard BEFORE INSERT OR UPDATE OR DELETE ON decisions FOR EACH ROW EXECUTE FUNCTION decision_attestation_root_guard();
CREATE TRIGGER decision_attestation_seal_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_attempts FOR EACH ROW EXECUTE FUNCTION decision_attestation_seal_guard();
CREATE TRIGGER decision_attestation_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_history FOR EACH ROW EXECUTE FUNCTION decision_attestation_attempt_guard();
CREATE TRIGGER decision_attestation_receipt_guard BEFORE INSERT OR UPDATE OR DELETE ON decision_attestation_write_receipts FOR EACH ROW EXECUTE FUNCTION decision_attestation_receipt_guard();
CREATE CONSTRAINT TRIGGER decision_attestation_commit_guard AFTER INSERT ON decision_attestation_write_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION decision_attestation_commit_guard();
CREATE TRIGGER decision_attestation_receipts_no_truncate BEFORE TRUNCATE ON decision_attestation_write_receipts FOR EACH STATEMENT EXECUTE FUNCTION decision_attestation_immutable();
CREATE TRIGGER decision_attestation_event_guard BEFORE INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION decision_attestation_event_guard();
CREATE TRIGGER decision_attestation_events_no_truncate BEFORE TRUNCATE ON events FOR EACH STATEMENT EXECUTE FUNCTION decision_attestation_immutable();
COMMIT;
