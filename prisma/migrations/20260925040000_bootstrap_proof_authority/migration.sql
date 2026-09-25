BEGIN;
-- SOURCE ONLY / UNAPPLIED. Public children only; no defaults, seed, backfill,
-- private material, replacement functions, or alternate identity/key heads.
CREATE UNIQUE INDEX proof_installation_identity ON trusted_provider_ticket_keys(workspace_id,installation_id);
CREATE UNIQUE INDEX proof_lifecycle_identity ON worker_identity_lifecycle(id,workspace_id,subject_id,generation);
CREATE UNIQUE INDEX proof_decision_revision_identity ON decision_revisions(decision_id,workspace_id,version);
CREATE UNIQUE INDEX proof_ticket_identity ON worker_bootstrap_tickets(id,workspace_id,host_id,generation);
CREATE UNIQUE INDEX proof_attempt_identity ON worker_bootstrap_attempts(id,ticket_id,workspace_id,host_id,generation);

CREATE TABLE bootstrap_proof_key_history (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 principal TEXT NOT NULL CHECK(principal IN ('local_worker','roost_server')),installation_id UUID,
 host_id UUID,installation_generation UUID,host_generation UUID,installation_lifecycle_id UUID,host_lifecycle_id UUID,
 decision_id UUID NOT NULL UNIQUE,decision_revision INT NOT NULL CHECK(decision_revision>0),revision INT NOT NULL CHECK(revision>0),
 record JSONB NOT NULL,record_bytes BYTEA NOT NULL,record_digest TEXT NOT NULL CHECK(record_digest~'^[a-f0-9]{64}$'),
 source_digest TEXT NOT NULL CHECK(source_digest~'^[a-f0-9]{64}$'),writer_xid TEXT NOT NULL CHECK(writer_xid~'^[1-9][0-9]*$'),
 UNIQUE(workspace_id,principal,revision),UNIQUE(id,workspace_id,principal,revision,record_digest),
 FOREIGN KEY(workspace_id,installation_id) REFERENCES trusted_provider_ticket_keys(workspace_id,installation_id) ON DELETE RESTRICT,
 FOREIGN KEY(decision_id,workspace_id,decision_revision) REFERENCES decision_revisions(decision_id,workspace_id,version) ON DELETE RESTRICT,
 FOREIGN KEY(installation_lifecycle_id,workspace_id,installation_id,installation_generation) REFERENCES worker_identity_lifecycle(id,workspace_id,subject_id,generation) ON DELETE RESTRICT,
 FOREIGN KEY(host_lifecycle_id,workspace_id,host_id,host_generation) REFERENCES worker_identity_lifecycle(id,workspace_id,subject_id,generation) ON DELETE RESTRICT,
 CHECK((principal='local_worker' AND num_nonnulls(installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id)=6) OR
       (principal='roost_server' AND num_nonnulls(installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id)=0))
);
-- A reservation under the accepted decision exists BEFORE ticket issuance.
-- A separate FK-only link attaches the later existing ticket/attempt; no new root.
CREATE TABLE bootstrap_proof_attachments (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL,installation_id UUID NOT NULL,host_id UUID NOT NULL,
 installation_generation UUID NOT NULL,host_generation UUID NOT NULL,installation_lifecycle_id UUID NOT NULL,host_lifecycle_id UUID NOT NULL,
 decision_id UUID NOT NULL UNIQUE,decision_revision INT NOT NULL,ticket_id UUID NOT NULL UNIQUE,request_id UUID NOT NULL UNIQUE,enrollment_generation INT NOT NULL CHECK(enrollment_generation>0),
 worker_key_event_id UUID NOT NULL,worker_principal TEXT NOT NULL CHECK(worker_principal='local_worker'),worker_revision INT NOT NULL,worker_history_digest TEXT NOT NULL,
 server_key_event_id UUID NOT NULL,server_principal TEXT NOT NULL CHECK(server_principal='roost_server'),server_revision INT NOT NULL,server_history_digest TEXT NOT NULL,
 record JSONB NOT NULL,record_bytes BYTEA NOT NULL,record_digest TEXT NOT NULL CHECK(record_digest~'^[a-f0-9]{64}$'),
 source_digest TEXT NOT NULL CHECK(source_digest~'^[a-f0-9]{64}$'),writer_xid TEXT NOT NULL CHECK(writer_xid~'^[1-9][0-9]*$'),
 UNIQUE(id,ticket_id,workspace_id,host_id,enrollment_generation),
 FOREIGN KEY(workspace_id,installation_id) REFERENCES trusted_provider_ticket_keys(workspace_id,installation_id) ON DELETE RESTRICT,
 FOREIGN KEY(decision_id,workspace_id,decision_revision) REFERENCES decision_revisions(decision_id,workspace_id,version) ON DELETE RESTRICT,
 FOREIGN KEY(installation_lifecycle_id,workspace_id,installation_id,installation_generation) REFERENCES worker_identity_lifecycle(id,workspace_id,subject_id,generation) ON DELETE RESTRICT,
 FOREIGN KEY(host_lifecycle_id,workspace_id,host_id,host_generation) REFERENCES worker_identity_lifecycle(id,workspace_id,subject_id,generation) ON DELETE RESTRICT,
 FOREIGN KEY(worker_key_event_id,workspace_id,worker_principal,worker_revision,worker_history_digest) REFERENCES bootstrap_proof_key_history(id,workspace_id,principal,revision,record_digest) ON DELETE RESTRICT,
 FOREIGN KEY(server_key_event_id,workspace_id,server_principal,server_revision,server_history_digest) REFERENCES bootstrap_proof_key_history(id,workspace_id,principal,revision,record_digest) ON DELETE RESTRICT
);
CREATE TABLE bootstrap_proof_ticket_links (
 id UUID PRIMARY KEY,attachment_id UUID NOT NULL UNIQUE,ticket_id UUID NOT NULL UNIQUE,attempt_id UUID NOT NULL UNIQUE,
 workspace_id UUID NOT NULL,host_id UUID NOT NULL,enrollment_generation INT NOT NULL,
 record JSONB NOT NULL,record_bytes BYTEA NOT NULL,record_digest TEXT NOT NULL CHECK(record_digest~'^[a-f0-9]{64}$'),
 source_digest TEXT NOT NULL CHECK(source_digest~'^[a-f0-9]{64}$'),writer_xid TEXT NOT NULL CHECK(writer_xid~'^[1-9][0-9]*$'),
 FOREIGN KEY(attachment_id,ticket_id,workspace_id,host_id,enrollment_generation) REFERENCES bootstrap_proof_attachments(id,ticket_id,workspace_id,host_id,enrollment_generation) ON DELETE RESTRICT,
 FOREIGN KEY(ticket_id,workspace_id,host_id,enrollment_generation) REFERENCES worker_bootstrap_tickets(id,workspace_id,host_id,generation) ON DELETE RESTRICT,
 FOREIGN KEY(attempt_id,ticket_id,workspace_id,host_id,enrollment_generation) REFERENCES worker_bootstrap_attempts(id,ticket_id,workspace_id,host_id,generation) ON DELETE RESTRICT
);
CREATE TABLE bootstrap_proof_write_receipts (
 operation_id UUID PRIMARY KEY,key_operation UUID UNIQUE REFERENCES bootstrap_proof_key_history(id) ON DELETE RESTRICT,
 attachment_operation UUID UNIQUE REFERENCES bootstrap_proof_attachments(id) ON DELETE RESTRICT,
 link_operation UUID UNIQUE REFERENCES bootstrap_proof_ticket_links(id) ON DELETE RESTRICT,
 event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE RESTRICT,table_name TEXT NOT NULL,
 record_digest TEXT NOT NULL,source_digest TEXT NOT NULL,writer_xid TEXT NOT NULL,from_fence BIGINT NOT NULL,to_fence BIGINT NOT NULL,
 CHECK(num_nonnulls(key_operation,attachment_operation,link_operation)=1),
 CHECK(operation_id=coalesce(key_operation,attachment_operation,link_operation)),CHECK(from_fence>0 AND to_fence>from_fence)
);

CREATE FUNCTION bootstrap_proof_bytes(v JSONB,depth INT) RETURNS BYTEA LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result BYTEA;item RECORD;s TEXT;t TEXT:=jsonb_typeof(v);n INT; BEGIN
 IF depth>32 OR v IS NULL THEN RAISE EXCEPTION 'bootstrap_proof_encoding_denied'; END IF;
 IF t='null' THEN result:=convert_to('n','UTF8');
 ELSIF t='boolean' THEN result:=convert_to(CASE WHEN v='true'::jsonb THEN 't' ELSE 'f' END,'UTF8');
 ELSIF t='number' THEN
  s:=v::text;IF s!~'^-?(0|[1-9][0-9]*)$' OR s='-0' OR abs(s::numeric)>9007199254740991 THEN RAISE EXCEPTION 'bootstrap_proof_encoding_denied'; END IF;
  result:=convert_to('i'||octet_length(s)::text||':'||s,'UTF8');
 ELSIF t='string' THEN
  s:=v#>>'{}';IF s<>normalize(s,NFC) OR s~'[\x01-\x1f\x7f]' THEN RAISE EXCEPTION 'bootstrap_proof_encoding_denied'; END IF;
  result:=convert_to('s'||octet_length(s)::text||':'||s,'UTF8');
 ELSIF t='array' THEN
  n:=jsonb_array_length(v);IF n>4096 THEN RAISE EXCEPTION 'bootstrap_proof_encoding_denied'; END IF;
  result:=convert_to('a'||n::text||':','UTF8');FOR item IN SELECT value FROM jsonb_array_elements(v) WITH ORDINALITY x(value,ord) ORDER BY ord LOOP result:=result||bootstrap_proof_bytes(item.value,depth+1); END LOOP;
 ELSIF t='object' THEN
  SELECT count(*) INTO n FROM jsonb_object_keys(v);IF n>4096 THEN RAISE EXCEPTION 'bootstrap_proof_encoding_denied'; END IF;
  result:=convert_to('o'||n::text||':','UTF8');
  FOR item IN SELECT key,value FROM jsonb_each(v) ORDER BY convert_to(key,'UTF8') LOOP
   result:=result||bootstrap_proof_bytes(to_jsonb(item.key),depth+1)||bootstrap_proof_bytes(item.value,depth+1);
  END LOOP;
 ELSE RAISE EXCEPTION 'bootstrap_proof_encoding_denied'; END IF;
 IF octet_length(result)>131072 THEN RAISE EXCEPTION 'bootstrap_proof_encoding_denied'; END IF;RETURN result;
END $$;
CREATE FUNCTION bootstrap_proof_digest(v JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN encode(sha256(bootstrap_proof_bytes(v,0)),'hex'); END $$;
CREATE FUNCTION bootstrap_proof_shape(v JSONB,keys TEXT[]) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN coalesce(jsonb_typeof(v)='object' AND v ?& keys AND v-keys='{}'::jsonb,false); END $$;
CREATE FUNCTION bootstrap_proof_time(v JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s TEXT:=v#>>'{}';BEGIN
 RETURN coalesce(jsonb_typeof(v)='string' AND s~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
 AND to_char(s::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=s,false);
 EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE FUNCTION bootstrap_proof_public_material(m JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE b BYTEA; BEGIN
 IF NOT bootstrap_proof_shape(m,ARRAY['keyId','algorithm','format','spki','publicKeyDigest']) THEN RETURN false; END IF;
 b:=decode(m->>'spki','base64');
 RETURN coalesce(m->>'algorithm'='Ed25519' AND m->>'format'='spki-der-base64' AND m->>'keyId'~'^[A-Za-z0-9_-]{1,64}$'
  AND octet_length(b)=44 AND encode(substring(b FROM 1 FOR 12),'hex')='302a300506032b6570032100'
  AND encode(b,'base64')=m->>'spki' AND encode(sha256(b),'hex')=m->>'publicKeyDigest',false);
END $$;

CREATE FUNCTION bootstrap_proof_owner(w UUID,d UUID,revision BIGINT,field TEXT,value JSONB) RETURNS UUID LANGUAGE plpgsql VOLATILE AS $$
DECLARE owner UUID;BEGIN
 SELECT x.owner_user_id INTO owner FROM workspaces x JOIN decisions q ON q.workspace_id=x.id
 JOIN decision_revisions r ON r.decision_id=q.id AND r.workspace_id=x.id JOIN decision_acceptances a ON a.decision_id=q.id AND a.workspace_id=x.id
 WHERE x.id=w AND q.id=d AND r.version=revision AND q.status='accepted' AND decision_state(q.id)='accepted'
 AND a.actor_user_id=x.owner_user_id AND a.actor_agent_id IS NULL AND a.actor_credential_id IS NULL AND a.authority->>'status'='owner_reserved'
 AND a.created_at<=clock_timestamp() AND r.body->field=value AND NOT r.body ? 'authority'
 AND (SELECT count(*) FROM workspace_memberships m WHERE m.workspace_id=w AND m.role::text='owner')=1
 AND EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=w AND m.user_id=x.owner_user_id AND m.role::text='owner')
 AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=q.id);
 IF owner IS NULL THEN RAISE EXCEPTION 'bootstrap_proof_owner_denied'; END IF;RETURN owner;
END $$;

CREATE FUNCTION bootstrap_proof_sources(w UUID) RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
DECLARE result TEXT;BEGIN
 WITH source(name,row) AS (
 SELECT 'workspace',to_jsonb(x) FROM workspaces x WHERE x.id=w
 UNION ALL SELECT 'membership',to_jsonb(x) FROM workspace_memberships x WHERE x.workspace_id=w
 UNION ALL SELECT 'decision',to_jsonb(x) FROM decisions x WHERE x.workspace_id=w
 UNION ALL SELECT 'revision',to_jsonb(x) FROM decision_revisions x WHERE x.workspace_id=w
 UNION ALL SELECT 'acceptance',to_jsonb(x) FROM decision_acceptances x WHERE x.workspace_id=w
 UNION ALL SELECT 'identity',to_jsonb(x) FROM worker_identity_lifecycle x WHERE x.workspace_id=w
 UNION ALL SELECT 'host',to_jsonb(x) FROM agent_hosts x WHERE x.workspace_id=w
 UNION ALL SELECT 'issuer',to_jsonb(x) FROM bootstrap_issuer_history x WHERE x.workspace_id=w
 UNION ALL SELECT 'attestation_key',to_jsonb(x) FROM decision_attestation_key_history x WHERE x.workspace_id=w
 UNION ALL SELECT 'anchor',to_jsonb(x) FROM trusted_provider_ticket_keys x WHERE x.workspace_id=w
 UNION ALL SELECT 'ticket',to_jsonb(x) FROM worker_bootstrap_tickets x WHERE x.workspace_id=w
 UNION ALL SELECT 'attempt',to_jsonb(x) FROM worker_bootstrap_attempts x WHERE x.workspace_id=w
 UNION ALL SELECT 'credential',to_jsonb(x) FROM api_keys x WHERE x.workspace_id=w
 UNION ALL SELECT 'handoff',to_jsonb(x) FROM worker_credential_handoffs x WHERE x.workspace_id=w
 UNION ALL SELECT 'ticket_lifecycle',to_jsonb(x) FROM worker_bootstrap_lifecycle_events x JOIN worker_bootstrap_tickets t ON t.id=x.ticket_id WHERE t.workspace_id=w
 UNION ALL SELECT 'bootstrap_history',to_jsonb(x) FROM worker_bootstrap_history x JOIN worker_bootstrap_attempts a ON a.id=x.attempt_id WHERE a.workspace_id=w
 UNION ALL SELECT 'dispatch',to_jsonb(x) FROM worker_bootstrap_dispatch_history x JOIN worker_bootstrap_attempts a ON a.id=x.attempt_id WHERE a.workspace_id=w
 UNION ALL SELECT 'completion',to_jsonb(x) FROM worker_bootstrap_completions x WHERE x.workspace_id=w
 ) SELECT bootstrap_lifecycle_digest(jsonb_agg(jsonb_build_object('source',name,'digest',bootstrap_lifecycle_digest(row)) ORDER BY name,row::text)) INTO result FROM source;
 RETURN result;
END $$;

CREATE FUNCTION bootstrap_proof_source_lock() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('session_replication_role')<>'origin' OR current_schemas(true)<>ARRAY['pg_catalog','public']::name[] THEN RAISE EXCEPTION 'bootstrap_proof_unfenced'; END IF;
 -- MVCC conflict without changing existing audited numeric fence ranges.
 UPDATE ready_source_fence SET revision=revision WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'bootstrap_proof_unfenced'; END IF;RETURN NULL;
END $$;
CREATE FUNCTION bootstrap_proof_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'bootstrap_proof_immutable'; END $$;
CREATE FUNCTION bootstrap_proof_replay(records JSONB) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE r JSONB;i JSONB;s JSONB:=NULL;g JSONB;gs JSONB:='[]';b JSONB;action TEXT;target INT;highwater INT:=0;rev INT:=0;previous TEXT:=NULL;
 last_at TEXT:='';last_fence BIGINT:=0;ids TEXT[]:='{}';decisions_seen TEXT[]:='{}';audits TEXT[]:='{}';found_target BOOLEAN; BEGIN
 PERFORM bootstrap_proof_bytes(records,0);
 IF jsonb_typeof(records)<>'array' OR jsonb_array_length(records) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'bootstrap_proof_history_missing'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(records) WITH ORDINALITY x(value,ord) ORDER BY ord LOOP
  i:=r->'intent';b:=i->'scope';action:=i->>'action';target:=(i->>'targetEpoch')::int;
  IF NOT bootstrap_proof_shape(r,ARRAY['id','previousDigest','revision','at','intent','ownerId','decisionId','decisionRevision','decisionIntentDigest','fromFence','toFence','auditId','receiptDigest'])
   OR NOT bootstrap_proof_shape(i,ARRAY['version','scope','action','expectedRevision','targetEpoch','material','generation','provenance','adoptionEvidenceDigest','activatesAt','cutoverAt','expiresAt'])
   OR i->>'version' IS DISTINCT FROM 'bootstrap-proof-key-history-v1'
   OR NOT ((b->>'principal'='local_worker' AND b->>'purpose'='worker-bootstrap-proof-v1' AND bootstrap_proof_shape(b,ARRAY['principal','purpose','workspaceId','installationId'])) OR
           (b->>'principal'='roost_server' AND b->>'purpose'='bootstrap-completion-binding-attestation-v1' AND bootstrap_proof_shape(b,ARRAY['principal','purpose','workspaceId'])))
   OR r->>'id'=ANY(ids) OR r->>'decisionId'=ANY(decisions_seen) OR r->>'auditId'=ANY(audits)
   OR (r->>'revision')::int<>rev+1 OR (i->>'expectedRevision')::int<>rev OR (r->>'previousDigest') IS DISTINCT FROM previous
   OR (r->>'fromFence')::bigint<last_fence OR (r->>'toFence')::bigint<>(r->>'fromFence')::bigint+1
   OR r->>'at'<last_at OR r->>'at'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
   OR NOT bootstrap_proof_time(r->'at') OR NOT bootstrap_proof_time(i->'expiresAt')
   OR (i->>'expiresAt')::timestamptz<=(r->>'at')::timestamptz OR target IS NULL OR target<1
   OR jsonb_typeof(i->'targetEpoch') IS DISTINCT FROM 'number' OR jsonb_typeof(i->'expectedRevision') IS DISTINCT FROM 'number'
   OR jsonb_typeof(r->'revision') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'decisionRevision') IS DISTINCT FROM 'number'
   OR jsonb_typeof(r->'fromFence') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'toFence') IS DISTINCT FROM 'number'
   OR (r->>'auditId'~'^[a-fA-F0-9-]{36}$') IS DISTINCT FROM true
   OR r->>'decisionIntentDigest' IS DISTINCT FROM bootstrap_proof_digest(i)
   OR r->>'receiptDigest' IS DISTINCT FROM bootstrap_proof_digest(jsonb_build_object('domain','roost-bootstrap-proof-key-receipt-v1','record',r-'receiptDigest'))
   OR s IS NOT NULL AND b IS DISTINCT FROM s
  THEN RAISE EXCEPTION 'bootstrap_proof_history_invalid'; END IF;
  IF action IN ('create','adopt','stage') THEN
   IF NOT bootstrap_proof_public_material(i->'material') OR NOT bootstrap_proof_shape(i->'provenance',ARRAY['source','evidenceDigest'])
    OR (i->'provenance'->>'evidenceDigest'~'^[a-f0-9]{64}$') IS DISTINCT FROM true
    OR i->'provenance'->>'source' IS DISTINCT FROM (CASE WHEN b->>'principal'='local_worker' THEN 'local_worker_os_protected' ELSE 'roost_server_secret_store' END)
    OR b->>'principal'='local_worker' AND NOT bootstrap_proof_shape(i->'generation',ARRAY['installationGeneration','hostId','hostGeneration'])
    OR b->>'principal'='roost_server' AND i->'generation'<>'null'::jsonb
   THEN RAISE EXCEPTION 'bootstrap_proof_public_material_invalid'; END IF;
  ELSIF i->'material'<>'null'::jsonb OR i->'provenance'<>'null'::jsonb OR i->'generation'<>'null'::jsonb THEN RAISE EXCEPTION 'bootstrap_proof_public_material_invalid'; END IF;
  IF (action='adopt' AND (i->>'adoptionEvidenceDigest'~'^[a-f0-9]{64}$') IS DISTINCT FROM true) OR
   (action<>'adopt' AND i->'adoptionEvidenceDigest'<>'null'::jsonb) OR
   (action<>'stage' AND (i->'activatesAt'<>'null'::jsonb OR i->'cutoverAt'<>'null'::jsonb)) THEN RAISE EXCEPTION 'bootstrap_proof_shape_invalid'; END IF;
  IF s IS NULL THEN
   IF action NOT IN ('create','adopt') OR action='create' AND target<>1 THEN RAISE EXCEPTION 'bootstrap_proof_legacy_blocked'; END IF;
   s:=b;highwater:=target;
   gs:=jsonb_build_array(jsonb_build_object('epoch',target,'material',i->'material','generation',i->'generation','state','active','validFrom',r->>'at','validUntil',NULL,'cutoverAt',NULL));
  ELSIF action='stage' THEN
   IF target<>highwater+1 OR NOT bootstrap_proof_time(i->'activatesAt') OR NOT bootstrap_proof_time(i->'cutoverAt') OR i->>'activatesAt'<r->>'at'
    OR (i->>'cutoverAt')::timestamptz<=(i->>'activatesAt')::timestamptz OR (i->>'cutoverAt')::timestamptz>(i->>'activatesAt')::timestamptz+interval '5 minutes'
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(gs) x WHERE x->>'state'='staged' OR x->'material'->>'keyId'=i->'material'->>'keyId' OR x->'material'->>'publicKeyDigest'=i->'material'->>'publicKeyDigest')
   THEN RAISE EXCEPTION 'bootstrap_proof_stage_invalid'; END IF;
   SELECT jsonb_agg(CASE WHEN x->>'state'='active' THEN jsonb_set(x,'{validUntil}',to_jsonb(least(coalesce(x->>'validUntil',i->>'cutoverAt'),i->>'cutoverAt'))) ELSE x END ORDER BY ord)
    INTO gs FROM jsonb_array_elements(gs) WITH ORDINALITY e(x,ord);
   gs:=gs||jsonb_build_array(jsonb_build_object('epoch',target,'material',i->'material','generation',i->'generation','state','staged','validFrom',i->>'activatesAt','validUntil',NULL,'cutoverAt',i->>'cutoverAt'));highwater:=target;
  ELSE
   found_target:=false;b:='[]';
   FOR g IN SELECT value FROM jsonb_array_elements(gs) LOOP
    IF (g->>'epoch')::int=target THEN
     found_target:=true;
     IF action='cutover' AND g->>'state'='staged' AND r->>'at'>=g->>'cutoverAt' THEN g:=jsonb_set(g,'{state}','"active"');
     ELSIF action='revoke' AND g->>'state'<>'revoked' THEN g:=jsonb_set(g,'{state}','"revoked"');
     ELSIF action='retire' AND g->>'state' IN ('active','staged') AND r->>'at'>=coalesce(g->>'validUntil',g->>'cutoverAt') THEN g:=jsonb_set(g,'{state}','"retired"');
     ELSE RAISE EXCEPTION 'bootstrap_proof_transition_invalid'; END IF;
    ELSIF action='cutover' AND g->>'state'='active' THEN g:=jsonb_set(g,'{state}','"retired"'); END IF;
    b:=b||jsonb_build_array(g);
   END LOOP;
   IF NOT found_target THEN RAISE EXCEPTION 'bootstrap_proof_epoch_missing'; END IF;gs:=b;
  END IF;
  rev:=rev+1;previous:=bootstrap_proof_digest(r);last_at:=r->>'at';last_fence:=(r->>'toFence')::bigint;
  ids:=array_append(ids,r->>'id');decisions_seen:=array_append(decisions_seen,r->>'decisionId');audits:=array_append(audits,r->>'auditId');
 END LOOP;
 RETURN jsonb_build_object('scope',s,'revision',rev,'highWater',highwater,'historyDigest',previous,'generations',gs);
END $$;

CREATE FUNCTION bootstrap_proof_reference(w UUID,ref JSONB,at_time TIMESTAMPTZ,generation JSONB) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE records JSONB;s JSONB;g JSONB;expected JSONB;BEGIN
 IF NOT bootstrap_proof_shape(ref,ARRAY['scope','keyId','algorithm','format','publicKeyDigest','epoch','highWater','revision','historyDigest']) THEN RAISE EXCEPTION 'bootstrap_proof_reference_invalid'; END IF;
 SELECT jsonb_agg(record ORDER BY revision) INTO records FROM bootstrap_proof_key_history WHERE workspace_id=w AND principal=ref->'scope'->>'principal';
 s:=bootstrap_proof_replay(records);
 SELECT value INTO g FROM jsonb_array_elements(s->'generations') WHERE value->>'epoch'=ref->>'epoch';
 expected:=jsonb_build_object('scope',s->'scope','keyId',g->'material'->>'keyId','algorithm','Ed25519','format','spki-der-base64','publicKeyDigest',g->'material'->>'publicKeyDigest',
  'epoch',g->'epoch','highWater',s->'highWater','revision',s->'revision','historyDigest',s->>'historyDigest');
 IF g IS NULL OR ref<>expected OR g->'generation' IS DISTINCT FROM generation OR g->>'state' NOT IN ('active','staged')
  OR at_time<(g->>'validFrom')::timestamptz OR at_time>=coalesce((g->>'validUntil')::timestamptz,'infinity')
  OR g->>'state'='staged' AND at_time>=(g->>'cutoverAt')::timestamptz THEN RAISE EXCEPTION 'bootstrap_proof_reference_unavailable'; END IF;RETURN g;
END $$;

CREATE FUNCTION bootstrap_proof_lifecycle(w UUID,installation UUID,host UUID,ig UUID,hg UUID,ir UUID,hr UUID) RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $$
BEGIN RETURN EXISTS(SELECT 1 FROM worker_identity_lifecycle i JOIN worker_identity_lifecycle h ON h.workspace_id=i.workspace_id
 JOIN agent_hosts a ON a.id=h.subject_id AND a.workspace_id=w JOIN trusted_provider_ticket_keys k ON k.workspace_id=w AND k.installation_id=installation
 WHERE i.id=ir AND h.id=hr AND i.workspace_id=w AND i.kind='installation' AND i.subject_id=installation AND i.generation=ig AND i.state='active'
 AND h.kind='host' AND h.subject_id=host AND h.generation=hg AND h.state='active' AND a.status::text<>'disabled'
 AND h.record->'intent'->>'installationId'=installation::text AND h.record->'intent'->>'installationGeneration'=ig::text
 AND NOT EXISTS(SELECT 1 FROM worker_identity_lifecycle n WHERE n.workspace_id=w AND ((n.kind='host' AND n.subject_id=host AND n.epoch>h.epoch) OR (n.kind='installation' AND n.subject_id=installation AND n.epoch>i.epoch)))); END $$;

CREATE FUNCTION bootstrap_proof_child_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r JSONB:=NEW.record;i JSONB;scope JSONB;history JSONB;state JSONB;g JSONB;owner UUID;f BIGINT;a bootstrap_proof_attachments;t worker_bootstrap_tickets;prior bootstrap_proof_attachments;old_state JSONB;created TIMESTAMPTZ; BEGIN
 IF current_setting('session_replication_role')<>'origin' OR current_setting('transaction_isolation')<>'serializable'
  OR current_schemas(true)<>ARRAY['pg_catalog','public']::name[] THEN RAISE EXCEPTION 'bootstrap_proof_unfenced'; END IF;
 SELECT revision INTO f FROM ready_source_fence WHERE id=1 FOR UPDATE;IF f IS NULL THEN RAISE EXCEPTION 'bootstrap_proof_unfenced'; END IF;
 IF NEW.record_bytes IS DISTINCT FROM bootstrap_proof_bytes(r,0) OR NEW.record_digest IS DISTINCT FROM bootstrap_proof_digest(r)
  OR NEW.source_digest IS DISTINCT FROM bootstrap_proof_sources(NEW.workspace_id) OR NEW.writer_xid IS DISTINCT FROM pg_current_xact_id()::text THEN RAISE EXCEPTION 'bootstrap_proof_binding_invalid'; END IF;
 IF TG_TABLE_NAME='bootstrap_proof_key_history' THEN
  i:=r->'intent';scope:=i->'scope';
  owner:=bootstrap_proof_owner(NEW.workspace_id,NEW.decision_id,NEW.decision_revision,'workerBootstrapProofKey',i);
  SELECT coalesce(jsonb_agg(record ORDER BY revision),'[]'::jsonb) INTO history FROM bootstrap_proof_key_history WHERE workspace_id=NEW.workspace_id AND principal=NEW.principal;
  state:=bootstrap_proof_replay(history||jsonb_build_array(r));
  IF r->>'id' IS DISTINCT FROM NEW.id::text OR r->>'ownerId' IS DISTINCT FROM owner::text OR r->>'decisionId' IS DISTINCT FROM NEW.decision_id::text
   OR r->>'decisionRevision' IS DISTINCT FROM NEW.decision_revision::text OR r->>'revision' IS DISTINCT FROM NEW.revision::text
   OR r->>'fromFence' IS DISTINCT FROM f::text OR r->>'toFence' IS DISTINCT FROM (f+1)::text
   OR scope->>'principal' IS DISTINCT FROM NEW.principal OR scope->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text
   OR scope->>'installationId' IS DISTINCT FROM NEW.installation_id::text OR (r->>'at')::timestamptz>clock_timestamp() OR (i->>'expiresAt')::timestamptz<=clock_timestamp()
   OR EXISTS(SELECT 1 FROM decision_acceptances da WHERE da.decision_id=NEW.decision_id AND da.created_at>(r->>'at')::timestamptz)
  THEN RAISE EXCEPTION 'bootstrap_proof_key_invalid'; END IF;
  SELECT value INTO g FROM jsonb_array_elements(state->'generations') WHERE value->>'epoch'=i->>'targetEpoch';
  IF NEW.principal='local_worker' AND (g->'generation' IS DISTINCT FROM jsonb_build_object('installationGeneration',NEW.installation_generation,'hostId',NEW.host_id,'hostGeneration',NEW.host_generation)
   OR NOT bootstrap_proof_lifecycle(NEW.workspace_id,NEW.installation_id,NEW.host_id,NEW.installation_generation,NEW.host_generation,NEW.installation_lifecycle_id,NEW.host_lifecycle_id)) THEN RAISE EXCEPTION 'bootstrap_proof_lifecycle_invalid'; END IF;
  IF i->>'action' IN ('create','adopt','stage') AND (
   EXISTS(SELECT 1 FROM bootstrap_proof_key_history x WHERE x.workspace_id=NEW.workspace_id AND x.principal<>NEW.principal AND
    (x.record->'intent'->'material'->>'keyId'=i->'material'->>'keyId' OR x.record->'intent'->'material'->>'publicKeyDigest'=i->'material'->>'publicKeyDigest'))
   OR EXISTS(SELECT 1 FROM bootstrap_issuer_history x WHERE x.workspace_id=NEW.workspace_id AND x.record->'intent'->'material'->>'publicKeyDigest'=i->'material'->>'publicKeyDigest')
   OR EXISTS(SELECT 1 FROM trusted_provider_ticket_keys x WHERE x.workspace_id=NEW.workspace_id AND x.public_key_digest=i->'material'->>'publicKeyDigest')
   OR EXISTS(SELECT 1 FROM decision_attestation_key_history x WHERE x.workspace_id=NEW.workspace_id AND x.record->'material'->>'publicKey'=encode(substring(decode(i->'material'->>'spki','base64') FROM 13),'hex'))
  ) THEN RAISE EXCEPTION 'bootstrap_proof_wrong_purpose_reuse'; END IF;
 ELSIF TG_TABLE_NAME='bootstrap_proof_attachments' THEN
  IF NOT bootstrap_proof_shape(r,ARRAY['version','workspaceId','installationId','generation','ownerId','decisionId','decisionRevision','ticketId','requestId','enrollmentGeneration','purpose','worker','server','prior'])
   OR r->>'version' IS DISTINCT FROM 'bootstrap-proof-authority-v1' OR r->>'workspaceId' IS DISTINCT FROM NEW.workspace_id::text OR r->>'installationId' IS DISTINCT FROM NEW.installation_id::text
   OR r->>'decisionId' IS DISTINCT FROM NEW.decision_id::text OR r->>'decisionRevision' IS DISTINCT FROM NEW.decision_revision::text
   OR r->>'ticketId' IS DISTINCT FROM NEW.ticket_id::text OR r->>'requestId' IS DISTINCT FROM NEW.request_id::text OR r->>'enrollmentGeneration' IS DISTINCT FROM NEW.enrollment_generation::text
   OR r->'generation' IS DISTINCT FROM jsonb_build_object('installationGeneration',NEW.installation_generation,'hostId',NEW.host_id,'hostGeneration',NEW.host_generation)
   OR r->'worker'->'scope'->>'principal'<>'local_worker' OR r->'server'->'scope'->>'principal'<>'roost_server'
   OR r->'worker'->'scope'->>'installationId' IS DISTINCT FROM NEW.installation_id::text
   OR r->'worker'->>'historyDigest' IS DISTINCT FROM NEW.worker_history_digest OR r->'server'->>'historyDigest' IS DISTINCT FROM NEW.server_history_digest
   OR r->'worker'->>'revision' IS DISTINCT FROM NEW.worker_revision::text OR r->'server'->>'revision' IS DISTINCT FROM NEW.server_revision::text
   OR NOT bootstrap_proof_lifecycle(NEW.workspace_id,NEW.installation_id,NEW.host_id,NEW.installation_generation,NEW.host_generation,NEW.installation_lifecycle_id,NEW.host_lifecycle_id)
   OR EXISTS(SELECT 1 FROM worker_bootstrap_tickets WHERE id=NEW.ticket_id)
   OR EXISTS(SELECT 1 FROM bootstrap_proof_attachments WHERE decision_id=NEW.decision_id OR ticket_id=NEW.ticket_id OR request_id=NEW.request_id)
   THEN RAISE EXCEPTION 'bootstrap_proof_attachment_invalid'; END IF;
  owner:=bootstrap_proof_owner(NEW.workspace_id,NEW.decision_id,NEW.decision_revision,'workerBootstrapProofAuthority',r);
  IF r->>'ownerId' IS DISTINCT FROM owner::text THEN RAISE EXCEPTION 'bootstrap_proof_owner_denied'; END IF;
  SELECT created_at INTO created FROM decision_acceptances WHERE decision_id=NEW.decision_id;
  PERFORM bootstrap_proof_reference(NEW.workspace_id,r->'worker',created,r->'generation');PERFORM bootstrap_proof_reference(NEW.workspace_id,r->'server',created,'null');
  PERFORM bootstrap_proof_reference(NEW.workspace_id,r->'worker',clock_timestamp(),r->'generation');PERFORM bootstrap_proof_reference(NEW.workspace_id,r->'server',clock_timestamp(),'null');
  IF EXISTS(SELECT 1 FROM bootstrap_proof_key_history WHERE workspace_id=NEW.workspace_id AND (record->>'at')::timestamptz>created) THEN RAISE EXCEPTION 'bootstrap_proof_history_after_decision'; END IF;
  IF r->>'purpose'='first_enrollment' THEN
   IF NEW.enrollment_generation<>1 OR r->'prior'<>'null' OR EXISTS(SELECT 1 FROM worker_bootstrap_tickets WHERE workspace_id=NEW.workspace_id AND host_id=NEW.host_id)
    OR EXISTS(SELECT 1 FROM api_keys WHERE workspace_id=NEW.workspace_id AND worker_host_id=NEW.host_id) THEN RAISE EXCEPTION 'bootstrap_proof_first_denied'; END IF;
  ELSIF r->>'purpose'='owner_recovery' THEN
   IF NOT bootstrap_proof_shape(r->'prior',ARRAY['worker','decisionId','ticketId','requestId','enrollmentGeneration']) THEN RAISE EXCEPTION 'bootstrap_proof_prior_invalid'; END IF;
   SELECT * INTO prior FROM bootstrap_proof_attachments WHERE ticket_id=(r->'prior'->>'ticketId')::uuid AND workspace_id=NEW.workspace_id;
   SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=prior.ticket_id;
   SELECT bootstrap_proof_replay(jsonb_agg(record ORDER BY revision)) INTO old_state FROM bootstrap_proof_key_history WHERE workspace_id=NEW.workspace_id AND principal='local_worker';
   IF prior.id IS NULL OR t.id IS NULL OR r->'prior' IS DISTINCT FROM jsonb_build_object('worker',prior.record->'worker','decisionId',prior.decision_id,'ticketId',prior.ticket_id,'requestId',prior.request_id,'enrollmentGeneration',prior.enrollment_generation)
    OR prior.enrollment_generation+1<>NEW.enrollment_generation OR prior.installation_id<>NEW.installation_id OR prior.host_id<>NEW.host_id
    OR (r->'worker'->>'epoch')::int<=(prior.record->'worker'->>'epoch')::int
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(old_state->'generations') x WHERE x->>'epoch'=prior.record->'worker'->>'epoch' AND x->>'state'='revoked')
    OR NOT EXISTS(SELECT 1 FROM api_keys k WHERE k.id=t.target_id AND k.workspace_id=NEW.workspace_id AND NOT k.active AND k.revoked_at IS NOT NULL)
    OR NOT EXISTS(SELECT 1 FROM worker_bootstrap_lifecycle_events e WHERE e.ticket_id=t.id AND e.record->>'state' IN ('revoked','delivery_unknown','expired'))
   THEN RAISE EXCEPTION 'bootstrap_proof_recovery_denied'; END IF;
  ELSE RAISE EXCEPTION 'bootstrap_proof_purpose_invalid'; END IF;
 ELSE
  SELECT * INTO a FROM bootstrap_proof_attachments WHERE id=NEW.attachment_id;
  SELECT * INTO t FROM worker_bootstrap_tickets WHERE id=NEW.ticket_id;
  IF a.id IS NULL OR t.id IS NULL OR NOT bootstrap_proof_shape(r,ARRAY['version','attachmentId','attachmentDigest','ticketId','ticketEnvelopeDigest','attemptId','sealDigest'])
   OR r->>'version' IS DISTINCT FROM 'bootstrap-proof-ticket-link-v1' OR r->>'attachmentId' IS DISTINCT FROM a.id::text OR r->>'attachmentDigest' IS DISTINCT FROM a.record_digest
   OR r->>'ticketId' IS DISTINCT FROM t.id::text OR r->>'ticketEnvelopeDigest' IS DISTINCT FROM t.ticket_digest OR r->>'attemptId' IS DISTINCT FROM NEW.attempt_id::text
   OR t.record->'signed'->'payload'->>'version' IS DISTINCT FROM 'worker-bootstrap-owner-ticket-v3'
   OR t.record->'signed'->'payload'->'intent'->'proofAuthority' IS DISTINCT FROM a.record
   OR (r->>'sealDigest'~'^[a-f0-9]{64}$') IS DISTINCT FROM true THEN RAISE EXCEPTION 'bootstrap_proof_legacy_ticket_blocked'; END IF;
  -- v3 issuer/sealer is intentionally unavailable: do not manufacture authority
  -- from a child link while the existing ticket/seal wire is still v2.
  RAISE EXCEPTION 'bootstrap_proof_v3_seal_unavailable';
 END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_proof_operation(table_name TEXT,operation UUID) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE row_value JSONB;receipt bootstrap_proof_write_receipts;e events;w UUID;n BIGINT;BEGIN
 IF table_name NOT IN ('bootstrap_proof_key_history','bootstrap_proof_attachments','bootstrap_proof_ticket_links') THEN RAISE EXCEPTION 'bootstrap_proof_table_denied'; END IF;
 EXECUTE format('SELECT count(*) FROM %I WHERE id=$1',table_name) INTO n USING operation;
 IF n=0 THEN RETURN NULL; END IF;IF n<>1 OR (SELECT count(*) FROM bootstrap_proof_write_receipts WHERE operation_id=operation)<>1 THEN RAISE EXCEPTION 'bootstrap_proof_operation_ambiguous'; END IF;
 EXECUTE format('SELECT to_jsonb(x)-''record_bytes''||jsonb_build_object(''bytes'',encode(record_bytes,''hex'')) FROM %I x WHERE id=$1',table_name) INTO row_value USING operation;
 IF row_value IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO receipt FROM bootstrap_proof_write_receipts WHERE operation_id=operation;
 SELECT * INTO e FROM events WHERE id=receipt.event_id;w:=(row_value->>'workspace_id')::uuid;
 IF receipt.operation_id IS NULL OR e.id IS NULL OR receipt.table_name<>table_name OR receipt.record_digest IS DISTINCT FROM row_value->>'record_digest'
  OR receipt.source_digest IS DISTINCT FROM row_value->>'source_digest' OR receipt.writer_xid IS DISTINCT FROM row_value->>'writer_xid'
  OR row_value->>'record_digest' IS DISTINCT FROM bootstrap_proof_digest(row_value->'record') OR row_value->>'bytes' IS DISTINCT FROM encode(bootstrap_proof_bytes(row_value->'record',0),'hex')
  OR receipt.to_fence> (SELECT revision FROM ready_source_fence WHERE id=1) OR receipt.from_fence>=receipt.to_fence
  OR e.workspace_id IS DISTINCT FROM w OR e.type<>'bootstrap.proof_authority' OR e.source<>'roost' OR e.actor_type::text<>'system'
  OR e.resource_type<>table_name OR e.resource_id<>operation::text OR e.actor_id IS NOT NULL
  OR e.payload IS DISTINCT FROM jsonb_build_object('operationId',operation,'table',table_name,'digest',receipt.record_digest,'sourceDigest',receipt.source_digest,
   'writerXid',receipt.writer_xid,'fromFence',receipt.from_fence::text,'toFence',receipt.to_fence::text,'launchAuthority',false)
 THEN RAISE EXCEPTION 'bootstrap_proof_receipt_missing'; END IF;
 RETURN jsonb_build_object('row',row_value,'receipt',jsonb_build_object('operationId',operation,'table',table_name,'eventId',e.id,'recordDigest',receipt.record_digest,
  'sourceDigest',receipt.source_digest,'writerXid',receipt.writer_xid,'fromFence',receipt.from_fence::text,'toFence',receipt.to_fence::text));
END $$;

CREATE FUNCTION bootstrap_proof_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r JSONB;BEGIN
 IF pg_trigger_depth()<>2 OR current_setting('session_replication_role')<>'origin' OR current_setting('transaction_isolation')<>'serializable'
  OR NEW.writer_xid<>pg_current_xact_id()::text OR NEW.to_fence<>(SELECT revision FROM ready_source_fence WHERE id=1)
  OR NEW.table_name NOT IN ('bootstrap_proof_key_history','bootstrap_proof_attachments','bootstrap_proof_ticket_links')
  OR (NEW.table_name='bootstrap_proof_key_history')<>(NEW.key_operation IS NOT NULL)
  OR (NEW.table_name='bootstrap_proof_attachments')<>(NEW.attachment_operation IS NOT NULL)
  OR (NEW.table_name='bootstrap_proof_ticket_links')<>(NEW.link_operation IS NOT NULL) THEN RAISE EXCEPTION 'bootstrap_proof_receipt_direct_write'; END IF;
 EXECUTE format('SELECT to_jsonb(x) FROM %I x WHERE id=$1',NEW.table_name) INTO r USING NEW.operation_id;
 IF r IS NULL OR r->>'writer_xid'<>NEW.writer_xid OR r->>'record_digest'<>NEW.record_digest OR r->>'source_digest'<>NEW.source_digest
  OR NEW.table_name='bootstrap_proof_key_history' AND (r->'record'->>'auditId' IS DISTINCT FROM NEW.event_id::text OR r->'record'->>'fromFence' IS DISTINCT FROM NEW.from_fence::text)
 THEN RAISE EXCEPTION 'bootstrap_proof_receipt_mismatch'; END IF;RETURN NEW;
END $$;

CREATE FUNCTION bootstrap_proof_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE event_id UUID;hi BIGINT;lo BIGINT;BEGIN
 SELECT revision INTO hi FROM ready_source_fence WHERE id=1;lo:=hi-1;
 event_id:=CASE WHEN TG_TABLE_NAME='bootstrap_proof_key_history' THEN (NEW.record->>'auditId')::uuid ELSE NEW.id END;
 INSERT INTO events(id,workspace_id,type,source,actor_type,actor_id,resource_type,resource_id,payload,updated_at)
 VALUES(event_id,NEW.workspace_id,'bootstrap.proof_authority','roost','system',NULL,TG_TABLE_NAME,NEW.id::text,
  jsonb_build_object('operationId',NEW.id,'table',TG_TABLE_NAME,'digest',NEW.record_digest,'sourceDigest',NEW.source_digest,
   'writerXid',NEW.writer_xid,'fromFence',lo::text,'toFence',hi::text,'launchAuthority',false),clock_timestamp());
 INSERT INTO bootstrap_proof_write_receipts(operation_id,key_operation,attachment_operation,link_operation,event_id,table_name,record_digest,source_digest,writer_xid,from_fence,to_fence)
 VALUES(NEW.id,CASE WHEN TG_TABLE_NAME='bootstrap_proof_key_history' THEN NEW.id END,CASE WHEN TG_TABLE_NAME='bootstrap_proof_attachments' THEN NEW.id END,
  CASE WHEN TG_TABLE_NAME='bootstrap_proof_ticket_links' THEN NEW.id END,event_id,TG_TABLE_NAME,NEW.record_digest,NEW.source_digest,NEW.writer_xid,lo,hi);
 RETURN NULL;
END $$;

CREATE FUNCTION bootstrap_proof_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE value JSONB;r JSONB;w UUID;BEGIN
 value:=bootstrap_proof_operation(TG_TABLE_NAME,NEW.id);r:=value->'row';w:=NEW.workspace_id;
 IF value IS NULL OR r->>'writer_xid' IS DISTINCT FROM pg_current_xact_id()::text OR r->>'source_digest' IS DISTINCT FROM bootstrap_proof_sources(w)
 THEN RAISE EXCEPTION 'bootstrap_proof_commit_drift'; END IF;
 IF TG_TABLE_NAME='bootstrap_proof_attachments' THEN
  PERFORM bootstrap_proof_reference(w,NEW.record->'worker',clock_timestamp(),NEW.record->'generation');
  PERFORM bootstrap_proof_reference(w,NEW.record->'server',clock_timestamp(),'null');
 END IF;RETURN NULL;
END $$;

CREATE FUNCTION bootstrap_proof_event_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v JSONB:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;BEGIN
 IF v->>'type'='bootstrap.proof_authority' OR TG_OP='UPDATE' AND OLD.type='bootstrap.proof_authority' THEN
  IF TG_OP<>'INSERT' OR pg_trigger_depth()<>2 OR current_setting('session_replication_role')<>'origin'
   OR NEW.payload->>'writerXid' IS DISTINCT FROM pg_current_xact_id()::text THEN RAISE EXCEPTION 'bootstrap_proof_event_immutable'; END IF;
 END IF;IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
CREATE FUNCTION bootstrap_proof_reserved_key_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE digest TEXT;BEGIN
 IF current_setting('session_replication_role')<>'origin' OR current_schemas(true)<>ARRAY['pg_catalog','public']::name[] THEN RAISE EXCEPTION 'bootstrap_proof_unfenced'; END IF;
 IF TG_TABLE_NAME='trusted_provider_ticket_keys' THEN digest:=NEW.public_key_digest;
 ELSIF TG_TABLE_NAME='bootstrap_issuer_history' THEN digest:=NEW.record->'intent'->'material'->>'publicKeyDigest';
 ELSE IF NEW.record->'material'->>'publicKey' IS NOT NULL THEN
  digest:=encode(sha256(decode('302a300506032b6570032100'||(NEW.record->'material'->>'publicKey'),'hex')),'hex');
 END IF; END IF;
 IF digest IS NOT NULL AND EXISTS(SELECT 1 FROM bootstrap_proof_key_history h WHERE h.workspace_id=NEW.workspace_id AND h.record->'intent'->'material'->>'publicKeyDigest'=digest)
 THEN RAISE EXCEPTION 'bootstrap_proof_wrong_purpose_reuse'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER proof_reserved_key BEFORE INSERT OR UPDATE ON trusted_provider_ticket_keys FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_reserved_key_guard();
CREATE TRIGGER proof_reserved_key BEFORE INSERT OR UPDATE ON bootstrap_issuer_history FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_reserved_key_guard();
CREATE TRIGGER proof_reserved_key BEFORE INSERT OR UPDATE ON decision_attestation_key_history FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_reserved_key_guard();
CREATE TRIGGER proof_child_guard BEFORE INSERT ON bootstrap_proof_key_history FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_child_guard();
CREATE TRIGGER proof_child_audit AFTER INSERT ON bootstrap_proof_key_history FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_audit();
CREATE TRIGGER proof_child_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bootstrap_proof_key_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE CONSTRAINT TRIGGER proof_child_commit AFTER INSERT ON bootstrap_proof_key_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_commit_guard();
CREATE TRIGGER proof_child_guard BEFORE INSERT ON bootstrap_proof_attachments FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_child_guard();
CREATE TRIGGER proof_child_audit AFTER INSERT ON bootstrap_proof_attachments FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_audit();
CREATE TRIGGER proof_child_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bootstrap_proof_attachments FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE CONSTRAINT TRIGGER proof_child_commit AFTER INSERT ON bootstrap_proof_attachments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_commit_guard();
CREATE TRIGGER proof_child_guard BEFORE INSERT ON bootstrap_proof_ticket_links FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_child_guard();
CREATE TRIGGER proof_child_audit AFTER INSERT ON bootstrap_proof_ticket_links FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_audit();
CREATE TRIGGER proof_child_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bootstrap_proof_ticket_links FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE CONSTRAINT TRIGGER proof_child_commit AFTER INSERT ON bootstrap_proof_ticket_links DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_commit_guard();
CREATE TRIGGER proof_receipt_guard BEFORE INSERT ON bootstrap_proof_write_receipts FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_receipt_guard();
CREATE TRIGGER proof_receipt_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bootstrap_proof_write_receipts FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER proof_event_guard BEFORE INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION bootstrap_proof_event_guard();
CREATE TRIGGER proof_events_no_truncate BEFORE TRUNCATE ON events FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON workspaces FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON workspaces FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON workspace_memberships FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON workspace_memberships FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON decisions FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON decisions FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON decision_revisions FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON decision_revisions FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON decision_acceptances FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON decision_acceptances FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON decision_impact_previews FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON decision_impact_previews FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_identity_lifecycle FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_identity_lifecycle FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON agent_hosts FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON agent_hosts FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON trusted_provider_ticket_keys FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON trusted_provider_ticket_keys FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON bootstrap_issuer_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON bootstrap_issuer_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON decision_attestation_key_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON decision_attestation_key_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_tickets FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_bootstrap_tickets FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_attempts FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_bootstrap_attempts FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_bootstrap_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_heads FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_bootstrap_heads FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_lifecycle_events FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_bootstrap_lifecycle_events FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_dispatch_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_bootstrap_dispatch_history FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_bootstrap_completions FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_bootstrap_completions FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON api_keys FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON api_keys FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
CREATE TRIGGER aaa_proof_source_fence BEFORE INSERT OR UPDATE OR DELETE ON worker_credential_handoffs FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_source_lock();
CREATE TRIGGER proof_source_no_truncate BEFORE TRUNCATE ON worker_credential_handoffs FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_proof_immutable();
COMMIT;
