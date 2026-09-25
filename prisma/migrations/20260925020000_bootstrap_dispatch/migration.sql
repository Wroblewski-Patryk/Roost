-- SOURCE ONLY / UNAPPLIED. Additive children of the existing one-attempt ledger.
-- No root changes, backfill, seed, default activation or changes to migrations 1-83.
BEGIN;
CREATE TABLE worker_bootstrap_dispatch_history (
 id UUID PRIMARY KEY,
 attempt_id UUID NOT NULL REFERENCES worker_bootstrap_attempts(id) ON DELETE RESTRICT,
 revision INT NOT NULL CHECK(revision>0),
 previous_digest TEXT,
 record JSONB NOT NULL CHECK(jsonb_typeof(record)='object' AND octet_length(record::text)<=16384),
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 request_digest TEXT NOT NULL CHECK(request_digest ~ '^[a-f0-9]{64}$'),
 fence_revision BIGINT NOT NULL CHECK(fence_revision>0),
 writer_xid TEXT NOT NULL,
 UNIQUE(attempt_id,revision),UNIQUE(attempt_id,record_digest),
 FOREIGN KEY(attempt_id,previous_digest) REFERENCES worker_bootstrap_dispatch_history(attempt_id,record_digest) ON DELETE RESTRICT
);
CREATE TABLE worker_bootstrap_dispatch_receipts (
 operation_id UUID PRIMARY KEY REFERENCES worker_bootstrap_dispatch_history(id) ON DELETE RESTRICT,
 event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE RESTRICT,
 row_digest TEXT NOT NULL CHECK(row_digest ~ '^[a-f0-9]{64}$'),
 writer_xid TEXT NOT NULL,fence_revision BIGINT NOT NULL CHECK(fence_revision>0)
);

CREATE FUNCTION bootstrap_dispatch_lock() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('session_replication_role')<>'origin' OR current_setting('transaction_isolation')<>'serializable'
  OR current_setting('transaction_read_only')<>'off' THEN RAISE EXCEPTION 'dispatch_write_transaction_required'; END IF;
 -- This child does not change signed authority. Lock the SAME source fence,
 -- retain its revision, and advance only the attempt's append-only CAS revision.
 -- This preserves the seal receipt fence; any source writer still invalidates it.
 PERFORM revision FROM ready_source_fence WHERE id=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'dispatch_fence_missing'; END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION bootstrap_dispatch_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p worker_bootstrap_dispatch_history;a worker_bootstrap_attempts;t worker_bootstrap_tickets;
 att decision_attestations;r JSONB;u JSONB;old JSONB;act TEXT;s TEXT;expected TEXT;k TEXT;f BIGINT;n TIMESTAMPTZ:=clock_timestamp();
 claim BOOLEAN;terminal BOOLEAN;h worker_bootstrap_heads;l worker_bootstrap_lifecycle_events;
 ar decision_attestation_write_receipts;hr decision_attestation_write_receipts;lr decision_attestation_write_receipts;
 pr worker_bootstrap_dispatch_receipts;receipt_rows JSONB;anchor JSONB;previous_receipt JSONB;recorded TEXT;BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'dispatch_history_immutable'; END IF;
 SELECT * INTO a FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id FOR UPDATE;
 SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=a.ticket_id;
 SELECT * INTO att FROM decision_attestations WHERE id=a.attestation_id;
 SELECT revision INTO f FROM ready_source_fence WHERE id=1;
 SELECT * INTO p FROM worker_bootstrap_dispatch_history WHERE attempt_id=NEW.attempt_id ORDER BY revision DESC LIMIT 1;
 r:=NEW.record;u:=r->'authority';old:=p.record;act:=r->>'action';s:=old->>'state';
 IF a.id IS NULL OR a.attestation_id IS NULL OR att.id IS NULL OR t.id IS NULL
  OR jsonb_typeof(u) IS DISTINCT FROM 'object'
  OR NEW.id::text IS DISTINCT FROM r->>'operationId' OR NEW.attempt_id::text IS DISTINCT FROM r->>'attemptId'
  OR NEW.revision<>COALESCE(p.revision,0)+1 OR NEW.previous_digest IS DISTINCT FROM p.record_digest
  OR r->>'revision' IS DISTINCT FROM NEW.revision::text OR r->>'previousDigest' IS DISTINCT FROM NEW.previous_digest
  OR r->>'version' IS DISTINCT FROM 'bootstrap-attempt-dispatch-v1'
  OR NOT r ?& ARRAY['version','attemptId','operationId','action','revision','previousDigest','authority','lineage','state','ownerId','ownerEpoch','claimGeneration','claimedAt','leaseExpiresAt','at','responseDigest','completionOperationId','evidenceDigest']
  OR r-ARRAY['version','attemptId','operationId','action','revision','previousDigest','authority','lineage','state','ownerId','ownerEpoch','claimGeneration','claimedAt','leaseExpiresAt','at','responseDigest','completionOperationId','evidenceDigest']<>'{}'::jsonb
  OR NEW.record_digest IS DISTINCT FROM bootstrap_lifecycle_digest(r)
  OR NEW.fence_revision<>f OR (r->>'at')::timestamptz>n OR (r->>'at')::timestamptz<n-interval '5 seconds'
  OR p.id IS NOT NULL AND ((r->>'at')::timestamptz<(old->>'at')::timestamptz OR u IS DISTINCT FROM old->'authority' OR p.writer_xid=pg_current_xact_id()::text)
  THEN RAISE EXCEPTION 'dispatch_cas_or_record_invalid'; END IF;
 FOREACH k IN ARRAY ARRAY['version','attemptId','operationId','action','revision','authority','lineage','state','ownerEpoch','claimGeneration','at'] LOOP
  IF r->k='null'::jsonb THEN RAISE EXCEPTION 'dispatch_null_required_field'; END IF;
 END LOOP;
 IF NOT u ?& ARRAY['attemptId','ticketId','decisionId','ownerId','ticketDigest','purpose','binding','hostGeneration','installationGeneration','credentialEpoch','version','projectionDigest','sealDigest','validFrom','expiresAt']
  OR u-ARRAY['attemptId','ticketId','decisionId','ownerId','ticketDigest','purpose','binding','hostGeneration','installationGeneration','credentialEpoch','version','projectionDigest','sealDigest','validFrom','expiresAt']<>'{}'::jsonb
  OR jsonb_typeof(u->'version') IS DISTINCT FROM 'object'
  OR NOT (u->'version') ?& ARRAY['authorityRevision','fence','digest']
  OR (u->'version')-ARRAY['authorityRevision','fence','digest']<>'{}'::jsonb
  OR COALESCE(u->'version'->>'digest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(u->>'projectionDigest','') !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'dispatch_authority_shape_invalid'; END IF;
 FOR k IN SELECT jsonb_object_keys(u) LOOP IF u->k='null'::jsonb THEN RAISE EXCEPTION 'dispatch_null_authority'; END IF;END LOOP;
 IF u->>'attemptId' IS DISTINCT FROM a.id::text OR u->>'ticketId' IS DISTINCT FROM t.id::text
  OR u->>'decisionId' IS DISTINCT FROM t.decision_id::text OR u->>'ownerId' IS DISTINCT FROM t.owner_id::text
  -- The canonical reader's ticketDigest is the lifecycle HEAD digest. The
  -- signed envelope digest is a distinct domain, retained in the attempt seal.
  OR u->>'ticketDigest' IS DISTINCT FROM (SELECT e.record_digest FROM worker_bootstrap_lifecycle_events e WHERE e.ticket_id=t.id ORDER BY e.revision DESC LIMIT 1)
  OR a.attestation_seal->'bindings'->>'ticketEnvelopeDigest' IS DISTINCT FROM t.ticket_digest
  OR u->'binding' IS DISTINCT FROM a.record->'binding'
  OR u->>'purpose' IS DISTINCT FROM t.lifecycle_identity->>'purpose'
  OR u->>'credentialEpoch' IS DISTINCT FROM a.credential_epoch::text
  OR u->>'hostGeneration' IS DISTINCT FROM t.lifecycle_identity->>'hostGeneration'
  OR u->>'installationGeneration' IS DISTINCT FROM t.lifecycle_identity->>'installationGeneration'
  OR u->>'sealDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(a.attestation_seal)
  OR u->'version'->>'fence' IS DISTINCT FROM f::text
  OR u->'version'->>'authorityRevision' IS DISTINCT FROM att.authority_revision::text
  OR u->>'validFrom' IS DISTINCT FROM att.record->'payload'->>'validFrom'
  OR u->>'expiresAt' IS DISTINCT FROM att.record->'payload'->>'expiresAt'
  OR (u->>'validFrom')::timestamptz>n OR (u->>'expiresAt')::timestamptz<=n
  OR NOT decision_attestation_owner(att.decision_id,att.acceptance_id)
  OR NOT decision_attestation_key_current(att.key_event_id)
  OR decision_attestation_revision(att.decision_id)<>att.authority_revision
  OR NOT bootstrap_lifecycle_current(t.lifecycle_identity)
  OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events e WHERE e.ticket_id=t.id AND e.record->>'state'='consumed' AND e.attempt_id=a.id
   AND e.revision=(SELECT max(revision) FROM worker_bootstrap_lifecycle_events WHERE ticket_id=t.id))
  OR NOT EXISTS(SELECT 1 FROM decision_attestation_write_receipts x WHERE x.table_name='worker_bootstrap_attempts'
   AND x.row_id=a.id::text||':'||a.host_id::text AND x.row_digest=bootstrap_lifecycle_digest(to_jsonb(a))
   -- Sealing also writes history/head/lifecycle rows. The attempt-row receipt
   -- precedes their fence increments; compare the complete operation's tail.
   AND (SELECT max(y.fence_revision) FROM decision_attestation_write_receipts y WHERE y.writer_xid=x.writer_xid)=f
   AND x.writer_xid<>pg_current_xact_id()::text)
  THEN RAISE EXCEPTION 'dispatch_authority_stale'; END IF;
 -- Exact causal lineage is part of the immutable record and its receipt hash.
 -- No new head: both anchors are the original consumed attempt/ticket facts.
 SELECT * INTO STRICT h FROM worker_bootstrap_heads WHERE attempt_id=a.id;
 SELECT * INTO STRICT l FROM worker_bootstrap_lifecycle_events WHERE ticket_id=t.id AND attempt_id=a.id AND history_id=h.history_id AND record->>'action'='consume' AND record->>'state'='consumed';
 SELECT * INTO STRICT ar FROM decision_attestation_write_receipts WHERE table_name='worker_bootstrap_attempts'
  AND row_id=a.id::text||':'||a.host_id::text AND row_digest=bootstrap_lifecycle_digest(to_jsonb(a)) AND operation='INSERT';
 SELECT * INTO STRICT hr FROM decision_attestation_write_receipts WHERE table_name='worker_bootstrap_heads'
  AND row_id=h.workspace_id::text||':'||h.host_id::text AND row_digest=bootstrap_lifecycle_digest(to_jsonb(h)) AND writer_xid=ar.writer_xid;
 SELECT * INTO STRICT lr FROM decision_attestation_write_receipts WHERE table_name='worker_bootstrap_lifecycle_events'
  AND row_id=l.id::text AND row_digest=bootstrap_lifecycle_digest(to_jsonb(l)) AND writer_xid=ar.writer_xid;
 SELECT jsonb_agg(jsonb_build_object('table',x.table_name,'rowId',x.row_id,'digest',x.row_digest,'fence',x.fence_revision::text,
  'receiptId',x.id,'eventId',x.event_id,'writerXid',x.writer_xid,'verified',true) ORDER BY x.table_name,x.row_id,x.id),
  to_char(max(e.updated_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') INTO receipt_rows,recorded
  FROM decision_attestation_write_receipts x JOIN events e ON e.id=x.event_id WHERE x.writer_xid=ar.writer_xid;
 IF ar.id IS NULL OR hr.id IS NULL OR lr.id IS NULL OR h.state<>'consumed' OR h.revision<>1
  OR l.record->>'state'<>'consumed' OR receipt_rows IS NULL OR jsonb_array_length(receipt_rows)>4000
  OR (SELECT count(*) FROM decision_attestation_write_receipts WHERE writer_xid=ar.writer_xid)<>jsonb_array_length(receipt_rows)
  OR EXISTS(SELECT 1 FROM decision_attestation_write_receipts x LEFT JOIN events e ON e.id=x.event_id WHERE x.writer_xid=ar.writer_xid
   AND (e.id IS NULL OR e.type<>'decision.attestation.write' OR e.source<>'roost' OR e.actor_type::text<>'system'
    OR e.workspace_id IS DISTINCT FROM x.workspace_id OR e.resource_type<>x.table_name OR e.resource_id<>x.row_id
    OR e.payload IS DISTINCT FROM jsonb_build_object('table',x.table_name,'rowId',x.row_id,'operation',x.operation,'rowDigest',x.row_digest,
     'fence',x.fence_revision::text,'writerXid',x.writer_xid,'launchAuthority',false)))
  THEN RAISE EXCEPTION 'dispatch_canonical_receipts_missing'; END IF;
 anchor:=jsonb_build_object('version','bootstrap-dispatch-anchor-v1','attemptId',a.id,'ticketId',t.id,'decisionId',t.decision_id,
  'sealDigest',bootstrap_lifecycle_digest(a.attestation_seal),'ticketEnvelopeDigest',t.ticket_digest,
  'sealReceipt',jsonb_build_object('operationId',a.id,'decisionId',t.decision_id,'ticketId',t.id,'mutationDigest',a.attestation_mutation_digest,
   'rowsDigest',bootstrap_lifecycle_digest(jsonb_build_object('domain','owner-decision-sql-operation-rows-v1','receipts',receipt_rows)),
   'authorityRevision',att.authority_revision::text,'fence',f::text,'writerXid',ar.writer_xid,'recordedAt',recorded),
  'ticketHead',jsonb_build_object('id',l.id,'revision',l.revision,'digest',l.record_digest,'state','consumed','historyId',h.history_id,
   'receipt',jsonb_build_object('id',lr.id,'eventId',lr.event_id,'rowDigest',lr.row_digest,'writerXid',lr.writer_xid,'fence',lr.fence_revision::text)),
  'attemptHead',jsonb_build_object('historyId',h.history_id,'revision',h.revision,'digest',h.record_digest,'state','consumed',
   'receipt',jsonb_build_object('id',hr.id,'eventId',hr.event_id,'rowDigest',hr.row_digest,'writerXid',hr.writer_xid,'fence',hr.fence_revision::text)));
 previous_receipt:='null'::jsonb;
 IF p.id IS NOT NULL THEN
  SELECT * INTO pr FROM worker_bootstrap_dispatch_receipts WHERE operation_id=p.id;
  IF pr.operation_id IS NULL OR pr.row_digest IS DISTINCT FROM bootstrap_lifecycle_digest(to_jsonb(p))
   OR pr.writer_xid IS DISTINCT FROM p.writer_xid OR pr.fence_revision<>f OR p.fence_revision<>f
   OR NOT EXISTS(SELECT 1 FROM events e WHERE e.id=pr.event_id AND e.type='bootstrap.dispatch.write' AND e.source='roost'
    AND e.actor_type::text='system' AND e.workspace_id=a.workspace_id AND e.resource_type='worker_bootstrap_dispatch_history' AND e.resource_id=p.id::text
    AND e.payload=jsonb_build_object('operationId',p.id,'attemptId',p.attempt_id,'rowDigest',pr.row_digest,'writerXid',p.writer_xid,'fence',p.fence_revision::text,'launchAuthority',false))
   THEN RAISE EXCEPTION 'dispatch_predecessor_receipt_missing'; END IF;
  previous_receipt:=jsonb_build_object('operationId',p.id,'eventId',pr.event_id,'recordDigest',p.record_digest,'requestDigest',p.request_digest,
   'rowDigest',pr.row_digest,'writerXid',pr.writer_xid,'fence',pr.fence_revision::text);
 END IF;
 IF r->'lineage' IS DISTINCT FROM jsonb_build_object('version','bootstrap-dispatch-lineage-v1','anchor',anchor,'previous',previous_receipt)
  OR p.id IS NOT NULL AND old->'lineage'->'anchor' IS DISTINCT FROM anchor
  THEN RAISE EXCEPTION 'dispatch_causal_lineage_invalid'; END IF;
 claim:=act IN ('claim','resume');terminal:=act IN ('require_reconciliation','reconcile','recover','cancel');
 IF terminal IS DISTINCT FROM (COALESCE(r->>'evidenceDigest','') ~ '^[a-f0-9]{64}$')
  OR NOT terminal AND r->'evidenceDigest'<>'null'::jsonb
  OR COALESCE(r->>'ownerEpoch','') !~ '^(0|[1-9][0-9]*)$' OR COALESCE(r->>'claimGeneration','') !~ '^(0|[1-9][0-9]*)$'
  THEN RAISE EXCEPTION 'dispatch_command_invalid'; END IF;
 IF p.id IS NULL THEN
  expected:='sealed_ready';
  IF act<>'prepare' OR r->'ownerId'<>'null'::jsonb OR r->>'ownerEpoch'<>'0' OR r->>'claimGeneration'<>'0'
   OR r->'claimedAt'<>'null'::jsonb OR r->'leaseExpiresAt'<>'null'::jsonb
   OR r->'responseDigest'<>'null'::jsonb OR r->'completionOperationId'<>'null'::jsonb THEN RAISE EXCEPTION 'dispatch_prepare_invalid'; END IF;
 ELSIF s IN ('completed','cancelled') THEN RAISE EXCEPTION 'dispatch_terminal';
 ELSIF claim THEN
  expected:='claimed_not_sent';
  IF (act='claim' AND s<>'sealed_ready') OR (act='resume' AND (s<>'claimed_not_sent' OR (old->>'leaseExpiresAt')::timestamptz>n))
   OR r->>'ownerId' IS NULL OR (r->>'ownerId')::uuid IS NULL
   OR (r->>'ownerEpoch')::bigint<>(old->>'ownerEpoch')::bigint+1
   OR (r->>'claimGeneration')::bigint<>(old->>'claimGeneration')::bigint+1
   OR r->>'claimedAt' IS DISTINCT FROM r->>'at' OR r->>'leaseExpiresAt' IS NULL
   OR (r->>'leaseExpiresAt')::timestamptz<=n OR (r->>'leaseExpiresAt')::timestamptz>(r->>'at')::timestamptz+interval '30 seconds'
   OR (r->>'leaseExpiresAt')::timestamptz>=(u->>'expiresAt')::timestamptz
   OR r->'responseDigest' IS DISTINCT FROM old->'responseDigest' OR r->'completionOperationId' IS DISTINCT FROM old->'completionOperationId'
   THEN RAISE EXCEPTION 'dispatch_claim_invalid'; END IF;
 ELSE
  IF (r-ARRAY['operationId','action','revision','previousDigest','lineage','state','at','responseDigest','completionOperationId','evidenceDigest'])
   IS DISTINCT FROM (old-ARRAY['operationId','action','revision','previousDigest','lineage','state','at','responseDigest','completionOperationId','evidenceDigest'])
   THEN RAISE EXCEPTION 'dispatch_owner_changed'; END IF;
  IF NOT terminal AND (r->>'ownerId' IS NULL OR (old->>'leaseExpiresAt')::timestamptz<=n) THEN RAISE EXCEPTION 'dispatch_lease_expired'; END IF;
  expected:=CASE
   WHEN act='start_send' AND s='claimed_not_sent' THEN 'send_started'
   WHEN act='outcome' AND s='send_started' THEN 'delivered'
   WHEN act='unknown' AND s IN ('send_started','completion_started') THEN 'delivery_unknown'
   WHEN act='start_complete' AND s='delivered' THEN 'completion_started'
   WHEN act='complete' AND s='completion_started' THEN 'completed'
   WHEN act='require_reconciliation' AND s NOT IN ('terminal_failed','reconciliation_required') THEN 'reconciliation_required'
   WHEN act='reconcile' AND s IN ('delivery_unknown','reconciliation_required','completion_started') THEN 'terminal_failed'
   WHEN act='recover' AND s='terminal_failed' THEN 'cancelled'
   WHEN act='cancel' AND s IN ('sealed_ready','claimed_not_sent','terminal_failed') THEN 'cancelled' ELSE NULL END;
  IF act='outcome' THEN
   IF COALESCE(r->>'responseDigest','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'dispatch_response_missing'; END IF;
  ELSIF r->'responseDigest' IS DISTINCT FROM old->'responseDigest' THEN RAISE EXCEPTION 'dispatch_response_conflict'; END IF;
  IF act='start_complete' THEN
   IF r->>'completionOperationId' IS DISTINCT FROM NEW.id::text THEN RAISE EXCEPTION 'dispatch_completion_owner_invalid'; END IF;
  ELSIF r->'completionOperationId' IS DISTINCT FROM old->'completionOperationId' THEN RAISE EXCEPTION 'dispatch_completion_conflict'; END IF;
 END IF;
 IF expected IS NULL OR r->>'state' IS DISTINCT FROM expected THEN RAISE EXCEPTION 'dispatch_transition_invalid'; END IF;
 IF NEW.request_digest IS DISTINCT FROM bootstrap_lifecycle_digest(jsonb_build_object(
  'decisionId',u->'decisionId','ticketId',u->'ticketId','binding',u->'binding','purpose',u->'purpose','attemptId',NEW.attempt_id,
  'operationId',NEW.id,'action',act,'expectedRevision',NEW.revision-1,'expectedDigest',NEW.previous_digest,
  'ownerId',r->'ownerId','ownerEpoch',r->'ownerEpoch','claimGeneration',r->'claimGeneration',
  'leaseMs',CASE WHEN claim THEN (extract(epoch FROM ((r->>'leaseExpiresAt')::timestamptz-(r->>'at')::timestamptz))*1000)::bigint ELSE NULL END,
  'responseDigest',CASE WHEN act IN ('outcome','start_complete','complete') THEN r->'responseDigest' ELSE 'null'::jsonb END,
  'completionOperationId',CASE WHEN act IN ('start_complete','complete') THEN r->'completionOperationId' ELSE 'null'::jsonb END,
  'evidenceDigest',r->'evidenceDigest')) THEN RAISE EXCEPTION 'dispatch_request_digest_invalid'; END IF;
 NEW.writer_xid:=pg_current_xact_id()::text;RETURN NEW;
END $$;

CREATE FUNCTION bootstrap_dispatch_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE eid UUID:=gen_random_uuid();d TEXT:=bootstrap_lifecycle_digest(to_jsonb(NEW));w UUID;BEGIN
 SELECT workspace_id INTO w FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id;
 INSERT INTO events(id,workspace_id,type,source,actor_type,resource_type,resource_id,payload,updated_at)
 VALUES(eid,w,'bootstrap.dispatch.write','roost','system','worker_bootstrap_dispatch_history',NEW.id::text,
  jsonb_build_object('operationId',NEW.id,'attemptId',NEW.attempt_id,'rowDigest',d,'writerXid',NEW.writer_xid,'fence',NEW.fence_revision::text,'launchAuthority',false),clock_timestamp());
 INSERT INTO worker_bootstrap_dispatch_receipts(operation_id,event_id,row_digest,writer_xid,fence_revision)
 VALUES(NEW.id,eid,d,NEW.writer_xid,NEW.fence_revision);RETURN NULL;
END $$;
CREATE FUNCTION bootstrap_dispatch_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'dispatch_receipt_immutable'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_dispatch_event_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN IF NEW.type='bootstrap.dispatch.write' AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'dispatch_event_unbound'; END IF;RETURN NEW;END IF;
 IF OLD.type='bootstrap.dispatch.write' OR TG_OP='UPDATE' AND NEW.type='bootstrap.dispatch.write' THEN RAISE EXCEPTION 'dispatch_event_immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_dispatch_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r worker_bootstrap_dispatch_receipts;e events;w UUID;BEGIN
 SELECT * INTO r FROM worker_bootstrap_dispatch_receipts WHERE operation_id=NEW.id;
 SELECT * INTO e FROM events WHERE id=r.event_id;SELECT workspace_id INTO w FROM worker_bootstrap_attempts WHERE id=NEW.attempt_id;
 IF r.operation_id IS NULL OR e.id IS NULL OR r.row_digest<>bootstrap_lifecycle_digest(to_jsonb(NEW))
  OR r.writer_xid<>NEW.writer_xid OR r.fence_revision<>NEW.fence_revision OR e.workspace_id IS DISTINCT FROM w
  OR e.type<>'bootstrap.dispatch.write' OR e.source<>'roost' OR e.actor_type::text<>'system'
  OR e.resource_type<>'worker_bootstrap_dispatch_history' OR e.resource_id<>NEW.id::text
  OR e.payload IS DISTINCT FROM jsonb_build_object('operationId',NEW.id,'attemptId',NEW.attempt_id,'rowDigest',r.row_digest,'writerXid',NEW.writer_xid,'fence',NEW.fence_revision::text,'launchAuthority',false)
  THEN RAISE EXCEPTION 'dispatch_commit_receipt_missing'; END IF;RETURN NULL;
END $$;
CREATE TRIGGER bootstrap_dispatch_lock BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_dispatch_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_dispatch_lock();
CREATE TRIGGER bootstrap_dispatch_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_dispatch_history FOR EACH ROW EXECUTE FUNCTION bootstrap_dispatch_guard();
CREATE TRIGGER bootstrap_dispatch_audit AFTER INSERT ON worker_bootstrap_dispatch_history FOR EACH ROW EXECUTE FUNCTION bootstrap_dispatch_audit();
CREATE TRIGGER bootstrap_dispatch_receipt_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_dispatch_receipts FOR EACH ROW EXECUTE FUNCTION bootstrap_dispatch_receipt_guard();
CREATE TRIGGER bootstrap_dispatch_event_guard BEFORE INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION bootstrap_dispatch_event_guard();
CREATE CONSTRAINT TRIGGER bootstrap_dispatch_commit_guard AFTER INSERT ON worker_bootstrap_dispatch_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bootstrap_dispatch_commit_guard();
CREATE TRIGGER bootstrap_dispatch_no_truncate BEFORE TRUNCATE ON worker_bootstrap_dispatch_history FOR EACH STATEMENT EXECUTE FUNCTION decision_attestation_immutable();
CREATE TRIGGER bootstrap_dispatch_receipts_no_truncate BEFORE TRUNCATE ON worker_bootstrap_dispatch_receipts FOR EACH STATEMENT EXECUTE FUNCTION decision_attestation_immutable();
COMMIT;
