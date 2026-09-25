BEGIN;
-- Source-only, UNAPPLIED. Children of existing roots; no credential registry,
-- key generation, backfill, seed, trigger replacement or default activation.
CREATE TABLE worker_bootstrap_completions (
 id UUID PRIMARY KEY REFERENCES worker_bootstrap_dispatch_history(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 attempt_id UUID NOT NULL UNIQUE REFERENCES worker_bootstrap_attempts(id) ON DELETE RESTRICT,
 ticket_id UUID NOT NULL UNIQUE REFERENCES worker_bootstrap_tickets(id) ON DELETE RESTRICT,
 handoff_id UUID NOT NULL UNIQUE REFERENCES worker_credential_handoffs(id) ON DELETE RESTRICT,
 credential_id UUID NOT NULL UNIQUE REFERENCES api_keys(id) ON DELETE RESTRICT,
 input JSONB NOT NULL, context JSONB NOT NULL, plan JSONB NOT NULL, proof JSONB NOT NULL, receipt JSONB NOT NULL,
 from_fence BIGINT NOT NULL CHECK(from_fence>0),to_fence BIGINT NOT NULL CHECK(to_fence>from_fence),
 writer_xid TEXT NOT NULL CHECK(writer_xid ~ '^[1-9][0-9]*$'),event_id UUID NOT NULL UNIQUE
);
CREATE TABLE worker_bootstrap_completion_receipts (
 operation_id UUID PRIMARY KEY REFERENCES worker_bootstrap_completions(id) ON DELETE RESTRICT,
 event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE RESTRICT,
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),writer_xid TEXT NOT NULL
);

-- Hashes remain inside SQL. In particular, no key_hash, device secret, ACK
-- secret or credential material is returned to the verifier or stored here.
-- Only the exact activation's mutable fields are projected out; all other
-- workspace authority and public-generation sources must remain identical.
CREATE FUNCTION bootstrap_completion_sources(attempt UUID,handoff UUID) RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
DECLARE w UUID;k UUID;result TEXT; BEGIN
 SELECT a.workspace_id INTO w FROM worker_bootstrap_attempts a WHERE a.id=attempt;
 SELECT h.credential_id INTO k FROM worker_credential_handoffs h WHERE h.id=handoff AND h.workspace_id=w;
 IF w IS NULL OR k IS NULL THEN RETURN NULL; END IF;
 WITH sources(tbl,row) AS (
  SELECT 'workspaces',to_jsonb(x) FROM workspaces x WHERE x.id=w
  UNION ALL SELECT 'workspace_memberships',to_jsonb(x) FROM workspace_memberships x WHERE x.workspace_id=w
  UNION ALL SELECT 'decisions',to_jsonb(x) FROM decisions x WHERE x.workspace_id=w
  UNION ALL SELECT 'decision_revisions',to_jsonb(x) FROM decision_revisions x WHERE x.workspace_id=w
  UNION ALL SELECT 'decision_acceptances',to_jsonb(x) FROM decision_acceptances x WHERE x.workspace_id=w
  UNION ALL SELECT 'decision_impact_previews',to_jsonb(x) FROM decision_impact_previews x WHERE x.workspace_id=w
  UNION ALL SELECT 'decision_owner_auth_evidence',to_jsonb(x) FROM decision_owner_auth_evidence x WHERE x.workspace_id=w
  UNION ALL SELECT 'decision_attestation_key_history',to_jsonb(x) FROM decision_attestation_key_history x WHERE x.workspace_id=w
  UNION ALL SELECT 'decision_attestations',to_jsonb(x) FROM decision_attestations x WHERE x.workspace_id=w
  UNION ALL SELECT 'worker_identity_lifecycle',to_jsonb(x) FROM worker_identity_lifecycle x WHERE x.workspace_id=w
  UNION ALL SELECT 'agent_hosts',to_jsonb(x) FROM agent_hosts x WHERE x.workspace_id=w
  UNION ALL SELECT 'bootstrap_issuer_history',to_jsonb(x) FROM bootstrap_issuer_history x WHERE x.workspace_id=w
  UNION ALL SELECT 'trusted_provider_ticket_keys',to_jsonb(x) FROM trusted_provider_ticket_keys x WHERE x.workspace_id=w
  UNION ALL SELECT 'worker_transport_generations',to_jsonb(x) FROM worker_transport_generations x WHERE x.workspace_id=w
  UNION ALL SELECT 'worker_transport_heads',to_jsonb(x) FROM worker_transport_heads x WHERE x.workspace_id=w
  UNION ALL SELECT 'worker_transport_history',to_jsonb(x) FROM worker_transport_history x JOIN worker_transport_generations g ON g.id=x.generation_id WHERE g.workspace_id=w
  UNION ALL SELECT 'worker_transport_bootstrap_grants',to_jsonb(x) FROM worker_transport_bootstrap_grants x JOIN worker_transport_generations g ON g.id=x.generation_id WHERE g.workspace_id=w
  UNION ALL SELECT 'worker_bootstrap_tickets',to_jsonb(x) FROM worker_bootstrap_tickets x WHERE x.workspace_id=w
  UNION ALL SELECT 'worker_bootstrap_attempts',to_jsonb(x) FROM worker_bootstrap_attempts x WHERE x.workspace_id=w
  UNION ALL SELECT 'api_keys',CASE WHEN x.id=k THEN to_jsonb(x)-'active' ELSE to_jsonb(x) END FROM api_keys x WHERE x.workspace_id=w
  UNION ALL SELECT 'worker_credential_handoffs',CASE WHEN x.id=handoff THEN to_jsonb(x)-ARRAY['state','acknowledged_at'] ELSE to_jsonb(x) END
   FROM worker_credential_handoffs x WHERE x.workspace_id=w
 ) SELECT bootstrap_lifecycle_digest(jsonb_agg(jsonb_build_object('table',tbl,'digest',bootstrap_lifecycle_digest(row)) ORDER BY tbl,row::text)) INTO result FROM sources;
 RETURN result;
END $$;

CREATE FUNCTION bootstrap_completion_context(attempt UUID,handoff UUID) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE a worker_bootstrap_attempts;t worker_bootstrap_tickets;h worker_credential_handoffs;k api_keys;result JSONB; BEGIN
 SELECT * INTO a FROM worker_bootstrap_attempts WHERE id=attempt;
 SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=a.ticket_id;
 SELECT * INTO h FROM worker_credential_handoffs WHERE id=handoff;
 SELECT * INTO k FROM api_keys WHERE id=h.credential_id;
 IF a.id IS NULL OR t.id IS NULL OR h.id IS NULL OR k.id IS NULL OR NOT worker_handoff_owner_current(h)
  OR h.owner_auth_time>extract(epoch FROM clock_timestamp()) OR h.owner_auth_time<extract(epoch FROM clock_timestamp())-300
  OR k.bound_agent_id IS NOT NULL OR k.key IS NOT NULL OR k.key_hash IS NULL
  OR k.worker_host_id IS NULL OR k.worker_installation_id IS NULL THEN RETURN NULL; END IF;
 result:=jsonb_build_object('registration',jsonb_build_object('operationId',t.id,'identity',t.lifecycle_identity,'record',t.record),
  'attempt',(SELECT record FROM worker_bootstrap_history WHERE attempt_id=a.id ORDER BY revision DESC LIMIT 1),
  'ticket',(SELECT record FROM worker_bootstrap_lifecycle_events WHERE ticket_id=t.id ORDER BY revision DESC LIMIT 1),
  'credential',jsonb_build_object('credential',jsonb_build_object('id',k.id,'version',k.credential_version,'epoch',k.worker_binding_epoch,
   'fingerprint',encode(sha256(convert_to('roost-worker-ticket-v1:'||k.key_hash,'UTF8')),'hex')),'workspaceId',k.workspace_id,
   'installationId',k.worker_installation_id,'hostId',k.worker_host_id,'active',k.active,'revokedAt',CASE WHEN k.revoked_at IS NULL THEN NULL ELSE to_char(k.revoked_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
   'expiresAt',to_char(k.expires_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'scopes',k.scopes),
  'handoff',jsonb_build_object('id',h.id,'workspaceId',h.workspace_id,'installationId',h.installation_id,'hostId',h.host_id,
   'hostFingerprint',h.host_fingerprint,'state',h.state,'credentialId',h.credential_id,'responseDigest',h.response_digest,
   'approval',h.approval_command,'ownerId',h.owner_user_id,'ackDeadline',to_char(h.ack_deadline,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'origin',h.origin,'certificateFingerprint',h.certificate_fingerprint),
  'sourceDigest',bootstrap_completion_sources(attempt,handoff),'writerXid',pg_current_xact_id()::text);
 RETURN result;
END $$;

-- Exact receipt-set proof. Both immutable histories remain, with one final
-- head CAS so migration 82's unique per-row/per-transaction receipt is retained.
-- Any foreign/source/no-op receipt in this interval invalidates the set.
CREATE FUNCTION bootstrap_completion_proof(v JSONB,s JSONB,p JSONB,xid TEXT,lo BIGINT,hi BIGINT) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE b JSONB:=v->'binding'->'payload';c JSONB:=b->'command';a worker_bootstrap_attempts;t worker_bootstrap_tickets;
 h worker_credential_handoffs;k api_keys;d worker_bootstrap_dispatch_history;op agent_credential_operations;e events;
 receipts JSONB;legacy_receipts JSONB;valid BOOLEAN;legacy_valid BOOLEAN;counted INT;expected INT;legacy_count INT; BEGIN
 SELECT * INTO a FROM worker_bootstrap_attempts WHERE id=(c->>'attemptId')::uuid;
 SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=a.ticket_id;
 SELECT * INTO h FROM worker_credential_handoffs WHERE id=(b->>'handoffId')::uuid;
 SELECT * INTO k FROM api_keys WHERE id=h.credential_id;
 SELECT * INTO d FROM worker_bootstrap_dispatch_history WHERE id=(c->>'operationId')::uuid;
 SELECT * INTO op FROM agent_credential_operations WHERE id=(p->>'credentialOperationId')::uuid;
 SELECT * INTO e FROM events WHERE id=(p->>'credentialEventId')::uuid;
 IF a.id IS NULL OR t.id IS NULL OR h.id IS NULL OR k.id IS NULL OR d.id IS NULL OR op.id IS NULL OR e.id IS NULL OR hi<=lo
  OR a.ticket_id IS DISTINCT FROM (c->>'ticketId')::uuid OR a.workspace_id<>h.workspace_id OR a.host_id<>h.host_id
  OR s->>'sourceDigest' IS DISTINCT FROM bootstrap_completion_sources(a.id,h.id) OR s->>'fence' IS DISTINCT FROM lo::text
  OR s->>'writerXid' IS DISTINCT FROM xid OR d.writer_xid<>xid OR d.fence_revision<>lo OR d.record IS DISTINCT FROM p->'dispatch'
  OR d.record->>'state'<>'completed' OR d.request_digest<>bootstrap_lifecycle_digest(c)
  OR d.record->'lineage'->'previous' IS DISTINCT FROM b->'dispatchPredecessor'
  OR d.record->'lineage'->'anchor'->>'ticketEnvelopeDigest' IS DISTINCT FROM b->>'ticketEnvelopeDigest'
  OR a.record->'target' IS DISTINCT FROM b->'credential' OR t.ticket_digest IS DISTINCT FROM b->>'ticketEnvelopeDigest'
  OR a.record->>'requestId' IS DISTINCT FROM b->>'requestId' OR a.record->'binding' IS DISTINCT FROM c->'binding'
  OR b->>'peerDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(v->'peer') OR b->>'completionDigest' IS DISTINCT FROM bootstrap_lifecycle_digest(v->'completion')
  OR h.state<>'acknowledged' OR h.acknowledged_at IS NULL OR h.response_digest IS DISTINCT FROM b->>'handoffResponseDigest'
  OR h.credential_id IS DISTINCT FROM (b->'credential'->>'id')::uuid OR h.approval_command IS DISTINCT FROM s->'handoff'->'approval'
  OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at<=clock_timestamp() OR NOT worker_handoff_owner_current(h)
  OR k.credential_version IS DISTINCT FROM (b->'credential'->>'version')::int
  OR k.worker_binding_epoch IS DISTINCT FROM (b->'credential'->>'epoch')::int
  OR encode(sha256(convert_to('roost-worker-ticket-v1:'||k.key_hash,'UTF8')),'hex') IS DISTINCT FROM b->'credential'->>'fingerprint'
  OR op.key_id<>k.id OR op.workspace_id<>a.workspace_id OR op.snapshot IS DISTINCT FROM p->'snapshot'
  OR op.request_id IS DISTINCT FROM (h.approval_command->>'requestId')::uuid OR op.request_hash<>bootstrap_lifecycle_digest(h.approval_command)
  OR e.workspace_id<>a.workspace_id OR e.type IS DISTINCT FROM 'api_key.worker_'||(h.approval_command->'intent'->>'action')
  OR e.source<>'roost_api' OR e.actor_type::text<>'user' OR e.actor_id IS DISTINCT FROM t.owner_id::text
  OR e.resource_type<>'api_key' OR e.resource_id<>k.id::text OR e.payload IS DISTINCT FROM op.snapshot
  OR jsonb_array_length(p->'histories')<>2 OR jsonb_array_length(p->'tickets')<>2
  OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_heads bh WHERE bh.attempt_id=a.id AND bh.state='acknowledged' AND bh.history_id=(p->'histories'->1->>'id')::uuid)
  OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events l WHERE l.ticket_id=t.id AND l.record=p->'tickets'->1 AND l.record->>'state'='completed'
   AND NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events later WHERE later.ticket_id=t.id AND later.revision>l.revision))
  THEN RETURN NULL; END IF;
 FOR counted IN 0..1 LOOP
  IF NOT EXISTS(SELECT 1 FROM worker_bootstrap_history bh WHERE bh.id=(p->'histories'->counted->>'id')::uuid AND bh.attempt_id=a.id AND bh.record=p->'histories'->counted
   AND bh.record->'peer'=v->'peer' AND bh.record->'completion'=CASE WHEN counted=0 THEN 'null'::jsonb ELSE v->'completion' END)
   OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events l WHERE l.id=(p->'tickets'->counted->>'id')::uuid AND l.ticket_id=t.id
    AND l.record=p->'tickets'->counted AND l.history_id=(p->'histories'->counted->>'id')::uuid AND l.writer_xid=xid)
   THEN RETURN NULL; END IF;
 END LOOP;
 WITH objects(tbl,rid,row) AS (
  SELECT 'worker_bootstrap_history',bh.id::text,to_jsonb(bh) FROM worker_bootstrap_history bh WHERE bh.id IN ((p->'histories'->0->>'id')::uuid,(p->'histories'->1->>'id')::uuid)
  UNION ALL SELECT 'worker_bootstrap_heads',bh.workspace_id::text||':'||bh.host_id::text,to_jsonb(bh)
   FROM worker_bootstrap_heads bh WHERE bh.attempt_id=a.id AND bh.history_id=(p->'histories'->1->>'id')::uuid
  UNION ALL SELECT 'worker_bootstrap_audit',u.id::text,to_jsonb(u) FROM worker_bootstrap_audit u WHERE u.history_id IN ((p->'histories'->0->>'id')::uuid,(p->'histories'->1->>'id')::uuid)
  UNION ALL SELECT 'worker_bootstrap_lifecycle_events',l.id::text,to_jsonb(l) FROM worker_bootstrap_lifecycle_events l WHERE l.id IN ((p->'tickets'->0->>'id')::uuid,(p->'tickets'->1->>'id')::uuid)
  UNION ALL SELECT 'api_keys',k.id::text,to_jsonb(k)
  UNION ALL SELECT 'worker_credential_handoffs',h.id::text||':'||h.host_id::text,to_jsonb(h)
  UNION ALL SELECT 'decision_authority_events',ev.id::text,to_jsonb(ev) FROM decision_authority_events ev WHERE ev.writer_xid=xid AND ev.workspace_id=a.workspace_id
   AND ev.action='source_change' AND ((ev.source_table='api_keys' AND ev.source_row=k.id::text AND ev.source_digest=bootstrap_lifecycle_digest(to_jsonb(k)))
    OR (ev.source_table='worker_credential_handoffs' AND ev.source_row=h.id::text||':'||h.host_id::text AND ev.source_digest=bootstrap_lifecycle_digest(to_jsonb(h))))
 ), legacy_checks AS (
  SELECT r.*,COALESCE(o.tbl IS NOT NULL AND r.ticket_id=t.id AND r.writer_xid=xid
   AND ev.type='worker.bootstrap_lifecycle' AND ev.source='roost' AND ev.actor_type::text='user' AND ev.actor_id=t.owner_id::text
   AND ev.workspace_id=a.workspace_id AND ev.resource_type=r.table_name AND ev.resource_id=r.row_id
   AND ev.payload=jsonb_build_object('ticketId',t.id,'rowDigest',r.row_digest,'fence',r.fence_revision::text,'writerXid',xid,'launchAuthority',false),false) AS verified
  FROM worker_bootstrap_write_receipts r LEFT JOIN objects o ON o.tbl=r.table_name AND o.rid=r.row_id
   AND encode(sha256(convert_to(o.row::text,'UTF8')),'hex')=r.row_digest
  LEFT JOIN events ev ON ev.id=r.event_id WHERE r.fence_revision>lo AND r.fence_revision<=hi
 ), checks AS (
  SELECT r.*,COALESCE(o.tbl IS NOT NULL AND r.writer_xid=xid AND r.workspace_id=a.workspace_id
   AND r.operation=CASE WHEN r.table_name IN ('worker_bootstrap_heads','api_keys','worker_credential_handoffs') THEN 'UPDATE' ELSE 'INSERT' END
   AND ev.type='decision.attestation.write' AND ev.source='roost' AND ev.actor_type::text='system' AND ev.workspace_id=r.workspace_id
   AND ev.resource_type=r.table_name AND ev.resource_id=r.row_id
   AND ev.payload=jsonb_build_object('table',r.table_name,'rowId',r.row_id,'operation',r.operation,'rowDigest',r.row_digest,'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false),false) AS verified
  FROM decision_attestation_write_receipts r LEFT JOIN objects o ON o.tbl=r.table_name AND o.rid=r.row_id AND bootstrap_lifecycle_digest(o.row)=r.row_digest
  LEFT JOIN events ev ON ev.id=r.event_id WHERE r.fence_revision>lo AND r.fence_revision<=hi
 ) SELECT bool_and(verified),count(*),(SELECT count(*) FROM objects),jsonb_agg(to_jsonb(checks) ORDER BY fence_revision,id),
  (SELECT bool_and(verified) FROM legacy_checks),(SELECT count(*) FROM legacy_checks),
  (SELECT jsonb_agg(to_jsonb(legacy_checks) ORDER BY fence_revision,event_id) FROM legacy_checks)
 INTO valid,counted,expected,receipts,legacy_valid,legacy_count,legacy_receipts FROM checks;
 -- Three additional epochs belong to the pinned statement fences: attestation
 -- on handoff and ApiKey, plus transport-bootstrap on ApiKey. Their row fences
 -- and all bootstrap row fences are already represented by the exact receipts.
 -- No other epoch gap, including an unreceipted no-op, is accepted.
 IF valid IS DISTINCT FROM true OR counted<>expected OR expected<9 OR hi-lo<>expected+3
  OR legacy_valid IS DISTINCT FROM true OR legacy_count<>7 THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM worker_bootstrap_dispatch_receipts r JOIN events ev ON ev.id=r.event_id WHERE r.operation_id=d.id
  AND r.row_digest=bootstrap_lifecycle_digest(to_jsonb(d)) AND r.writer_xid=xid AND r.fence_revision=lo
  AND ev.payload=jsonb_build_object('operationId',d.id,'attemptId',a.id,'rowDigest',r.row_digest,'writerXid',xid,'fence',lo::text,'launchAuthority',false)) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('receipts',receipts,'legacyReceipts',legacy_receipts,'dispatchRowDigest',bootstrap_lifecycle_digest(to_jsonb(d)),
  'credentialOperationDigest',bootstrap_lifecycle_digest(to_jsonb(op)),'credentialEventDigest',bootstrap_lifecycle_digest(to_jsonb(e)));
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE FUNCTION bootstrap_completion_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE c JSONB;expected JSONB; BEGIN
 IF TG_OP<>'INSERT' OR current_setting('transaction_isolation')<>'serializable' OR current_setting('session_replication_role')<>'origin'
  OR NEW.writer_xid<>pg_current_xact_id()::text THEN RAISE EXCEPTION 'bootstrap_completion_immutable'; END IF;
 PERFORM revision FROM ready_source_fence WHERE id=1 FOR UPDATE;
 c:=NEW.input->'binding'->'payload'->'command';
 IF NEW.id IS DISTINCT FROM (c->>'operationId')::uuid OR NEW.attempt_id IS DISTINCT FROM (c->>'attemptId')::uuid
  OR NEW.ticket_id IS DISTINCT FROM (c->>'ticketId')::uuid OR NEW.workspace_id IS DISTINCT FROM (c->'binding'->>'workspaceId')::uuid
  OR NEW.handoff_id IS DISTINCT FROM (NEW.input->'binding'->'payload'->>'handoffId')::uuid
  OR NEW.credential_id IS DISTINCT FROM (NEW.input->'binding'->'payload'->'credential'->>'id')::uuid
  OR NEW.to_fence IS DISTINCT FROM (SELECT revision FROM ready_source_fence WHERE id=1)
  OR NEW.proof IS DISTINCT FROM bootstrap_completion_proof(NEW.input,NEW.context,NEW.plan,NEW.writer_xid,NEW.from_fence,NEW.to_fence)
 THEN RAISE EXCEPTION 'bootstrap_completion_proof_invalid'; END IF;
 expected:=jsonb_build_object('operationId',NEW.id,'attemptId',NEW.attempt_id,'ticketId',NEW.ticket_id,'credentialId',NEW.credential_id,
  'inputDigest',bootstrap_lifecycle_digest(NEW.input),'sourceDigest',NEW.context->>'sourceDigest','writerXid',NEW.writer_xid,
  'fromFence',NEW.from_fence::text,'toFence',NEW.to_fence::text,'dispatchDigest',bootstrap_lifecycle_digest(NEW.plan->'dispatch'),
  'attemptDigest',bootstrap_lifecycle_digest(NEW.plan->'histories'->1),'ticketDigest',bootstrap_lifecycle_digest(NEW.plan->'tickets'->1),
  'credentialDigest',bootstrap_lifecycle_digest(NEW.plan->'snapshot'),'receiptSetDigest',bootstrap_lifecycle_digest(NEW.proof),'eventId',NEW.event_id,
  'recordDigest',bootstrap_lifecycle_digest(jsonb_build_object('input',NEW.input,'context',NEW.context,'plan',NEW.plan,'proof',NEW.proof)));
 IF NEW.receipt IS DISTINCT FROM expected THEN RAISE EXCEPTION 'bootstrap_completion_receipt_invalid'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_completion_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE digest TEXT:=bootstrap_lifecycle_digest(to_jsonb(NEW)); BEGIN
 INSERT INTO events(id,workspace_id,type,source,actor_type,resource_type,resource_id,payload,updated_at)
 VALUES(NEW.event_id,NEW.workspace_id,'bootstrap.canonical_completion','roost','system','worker_bootstrap_completions',NEW.id::text,
  jsonb_build_object('operationId',NEW.id,'attemptId',NEW.attempt_id,'digest',digest,'launchAuthority',false),clock_timestamp());
 INSERT INTO worker_bootstrap_completion_receipts(operation_id,event_id,record_digest,writer_xid) VALUES(NEW.id,NEW.event_id,digest,NEW.writer_xid);RETURN NULL;
END $$;
CREATE FUNCTION bootstrap_completion_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'bootstrap_completion_receipt_immutable'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_completion_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r worker_bootstrap_completion_receipts;e events;h worker_credential_handoffs;k api_keys;att decision_attestations; BEGIN
 SELECT * INTO r FROM worker_bootstrap_completion_receipts WHERE operation_id=NEW.id;
 SELECT * INTO e FROM events WHERE id=r.event_id;SELECT * INTO h FROM worker_credential_handoffs WHERE id=NEW.handoff_id;
 SELECT * INTO k FROM api_keys WHERE id=NEW.credential_id;
 SELECT x.* INTO att FROM decision_attestations x JOIN worker_bootstrap_attempts a ON a.attestation_id=x.id WHERE a.id=NEW.attempt_id;
 IF r.operation_id IS NULL OR e.id IS NULL OR r.record_digest<>bootstrap_lifecycle_digest(to_jsonb(NEW)) OR r.writer_xid<>NEW.writer_xid
  OR e.payload IS DISTINCT FROM jsonb_build_object('operationId',NEW.id,'attemptId',NEW.attempt_id,'digest',r.record_digest,'launchAuthority',false)
  OR NEW.to_fence IS DISTINCT FROM (SELECT revision FROM ready_source_fence WHERE id=1)
  OR NEW.proof IS DISTINCT FROM bootstrap_completion_proof(NEW.input,NEW.context,NEW.plan,NEW.writer_xid,NEW.from_fence,NEW.to_fence)
  OR NOT worker_handoff_owner_current(h) OR h.ack_deadline<=clock_timestamp() OR k.expires_at<=clock_timestamp()
  OR h.owner_auth_time<extract(epoch FROM clock_timestamp())-300
  OR att.id IS NULL OR NOT decision_attestation_owner(att.decision_id,att.acceptance_id) OR NOT decision_attestation_key_current(att.key_event_id)
  OR (att.record->'payload'->>'expiresAt')::timestamptz<=clock_timestamp()
  OR (NEW.context->'registration'->'identity'->>'expiresAt')::timestamptz<=clock_timestamp()
  OR (NEW.context->'dispatch'->>'leaseExpiresAt')::timestamptz<=clock_timestamp()
  OR (NEW.input->'peer'->'payload'->>'expiresAt')::timestamptz<=clock_timestamp()
  OR (NEW.input->'peer'->'payload'->>'certificateNotAfter')::timestamptz<=clock_timestamp()
  OR NOT EXISTS(SELECT 1 FROM worker_transport_bootstrap_grants g WHERE g.ticket_id=NEW.ticket_id
   AND (g.record->'intent'->'snapshot'->>'validFrom')::timestamptz<=clock_timestamp()
   AND (g.record->'intent'->'snapshot'->>'expiresAt')::timestamptz>clock_timestamp()
   AND (g.record->'intent'->'snapshot'->>'cutoverAt' IS NULL OR (g.record->'intent'->'snapshot'->>'cutoverAt')::timestamptz>clock_timestamp()))
 THEN RAISE EXCEPTION 'bootstrap_completion_commit_unproven'; END IF;RETURN NULL;
END $$;
CREATE FUNCTION bootstrap_completion_event_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN IF NEW.type='bootstrap.canonical_completion' AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'bootstrap_completion_event_unbound'; END IF;RETURN NEW;END IF;
 IF OLD.type='bootstrap.canonical_completion' OR TG_OP='UPDATE' AND NEW.type='bootstrap.canonical_completion'
  OR EXISTS(SELECT 1 FROM worker_bootstrap_completions c WHERE c.plan->>'credentialEventId'=OLD.id::text)
  THEN RAISE EXCEPTION 'bootstrap_completion_event_immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_completion_no_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'bootstrap_completion_immutable'; END $$;
CREATE TRIGGER bootstrap_completion_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_completions FOR EACH ROW EXECUTE FUNCTION bootstrap_completion_guard();
CREATE TRIGGER bootstrap_completion_audit AFTER INSERT ON worker_bootstrap_completions FOR EACH ROW EXECUTE FUNCTION bootstrap_completion_audit();
CREATE CONSTRAINT TRIGGER bootstrap_completion_commit_guard AFTER INSERT ON worker_bootstrap_completions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bootstrap_completion_commit_guard();
CREATE TRIGGER bootstrap_completion_receipt_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_completion_receipts FOR EACH ROW EXECUTE FUNCTION bootstrap_completion_receipt_guard();
CREATE TRIGGER bootstrap_completion_event_guard BEFORE INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION bootstrap_completion_event_guard();
CREATE TRIGGER bootstrap_completion_no_truncate BEFORE TRUNCATE ON worker_bootstrap_completions FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_completion_no_mutation();
CREATE TRIGGER bootstrap_completion_receipts_no_truncate BEFORE TRUNCATE ON worker_bootstrap_completion_receipts FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_completion_no_mutation();
COMMIT;
