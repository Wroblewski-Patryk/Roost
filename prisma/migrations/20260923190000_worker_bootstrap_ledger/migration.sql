-- SOURCE ONLY / UNAPPLIED. Only new tables/indexes; no existing data changes.
-- Public signed metadata only. Issuance/canonical authority provisioning is absent.
-- Adapter-only append discipline is not protection against privileged DB rollback.
BEGIN;
CREATE TABLE worker_bootstrap_tickets (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 decision_id UUID NOT NULL UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL UNIQUE,
 generation INT NOT NULL CHECK(generation>0),
 credential_epoch INT NOT NULL CHECK(credential_epoch>0),
 target_id UUID NOT NULL UNIQUE,
 predecessor_id UUID,
 binding_digest TEXT NOT NULL CHECK(binding_digest ~ '^[a-f0-9]{64}$'),
 ticket_digest TEXT NOT NULL UNIQUE CHECK(ticket_digest ~ '^[a-f0-9]{64}$'),
 record JSONB NOT NULL CHECK(jsonb_typeof(record)='object' AND octet_length(record::text)<=24576),
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 expires_at TIMESTAMPTZ NOT NULL,
 UNIQUE(id,workspace_id,host_id,generation,credential_epoch,predecessor_id),
 UNIQUE(id,workspace_id,host_id,generation,credential_epoch),
 CHECK(record ?& ARRAY['signed','decision'] AND record-ARRAY['signed','decision']='{}'::jsonb),
 CHECK((record->'signed') ?& ARRAY['payload','signature'] AND (record->'signed')-ARRAY['payload','signature']='{}'::jsonb),
 CHECK((record->'decision') ?& ARRAY['payload','signature'] AND (record->'decision')-ARRAY['payload','signature']='{}'::jsonb),
 CHECK(record->'signed'->>'signature' ~ '^[a-f0-9]{128}$' AND record->'decision'->>'signature' ~ '^[a-f0-9]{128}$'),
 CHECK(record->'signed'->'payload'->>'id'=id::text AND record->'signed'->'payload'->>'ownerId'=owner_id::text AND record->'signed'->'payload'->>'decisionId'=decision_id::text),
 CHECK(record->'signed'->'payload'->'intent'->'binding'->>'workspaceId'=workspace_id::text AND record->'signed'->'payload'->'intent'->'binding'->>'hostId'=host_id::text),
 CHECK(record->'signed'->'payload'->'intent'->>'requestId'=request_id::text AND record->'signed'->'payload'->'intent'->'target'->>'id'=target_id::text),
 CHECK((record->'signed'->'payload'->'intent'->'target'->>'epoch')::int=credential_epoch AND (record->'signed'->'payload'->'intent'->'baseline'->>'enrollmentGeneration')::int+1=generation),
 CHECK(record->'decision'->'payload'->>'authority'='owner_reserved'),
 CHECK((generation=1 AND predecessor_id IS NULL AND record->'signed'->'payload'->'intent'->>'purpose'='first_enrollment') OR
       (generation>1 AND predecessor_id IS NOT NULL AND record->'signed'->'payload'->'intent'->>'purpose'='owner_recovery'))
);
CREATE TABLE worker_bootstrap_attempts (
 id UUID PRIMARY KEY,
 ticket_id UUID NOT NULL UNIQUE REFERENCES worker_bootstrap_tickets(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 generation INT NOT NULL CHECK(generation>0),credential_epoch INT NOT NULL CHECK(credential_epoch>0),
 predecessor_id UUID,
 previous_generation INT GENERATED ALWAYS AS (generation-1) STORED,
 record JSONB NOT NULL CHECK(jsonb_typeof(record)='object' AND octet_length(record::text)<=4096),
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 UNIQUE(workspace_id,host_id,generation),UNIQUE(workspace_id,host_id,credential_epoch),
 UNIQUE(id,workspace_id,host_id),UNIQUE(id,workspace_id,host_id,generation),UNIQUE(id,workspace_id,host_id,generation,credential_epoch),
 FOREIGN KEY(predecessor_id,workspace_id,host_id,previous_generation) REFERENCES worker_bootstrap_attempts(id,workspace_id,host_id,generation) ON DELETE RESTRICT,
 FOREIGN KEY(ticket_id,workspace_id,host_id,generation,credential_epoch) REFERENCES worker_bootstrap_tickets(id,workspace_id,host_id,generation,credential_epoch) ON DELETE RESTRICT,
 FOREIGN KEY(ticket_id,workspace_id,host_id,generation,credential_epoch,predecessor_id) REFERENCES worker_bootstrap_tickets(id,workspace_id,host_id,generation,credential_epoch,predecessor_id) ON DELETE RESTRICT,
 CHECK((generation=1 AND predecessor_id IS NULL) OR (generation>1 AND predecessor_id IS NOT NULL)),
 CHECK(record ?& ARRAY['id','ticketId','ticketDigest','decisionId','requestId','binding','target','state','expiresAt'] AND record-ARRAY['id','ticketId','ticketDigest','decisionId','requestId','binding','target','state','expiresAt']='{}'::jsonb),
 CHECK(record->>'id'=id::text AND record->>'ticketId'=ticket_id::text AND record->>'state'='consumed'),
 CHECK(record->'binding'->>'workspaceId'=workspace_id::text AND record->'binding'->>'hostId'=host_id::text AND (record->'target'->>'epoch')::int=credential_epoch)
);
CREATE TABLE worker_bootstrap_history (
 id UUID PRIMARY KEY,attempt_id UUID NOT NULL REFERENCES worker_bootstrap_attempts(id) ON DELETE RESTRICT,
 revision INT NOT NULL CHECK(revision>0),
 state TEXT NOT NULL CHECK(state IN ('consumed','dispatched','acknowledged','blocked','delivery_unknown')),
 record JSONB NOT NULL CHECK(jsonb_typeof(record)='object' AND octet_length(record::text)<=24576),
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 previous_revision INT,previous_digest TEXT,previous_state TEXT,
 UNIQUE(attempt_id,revision),UNIQUE(attempt_id,revision,record_digest,state),UNIQUE(id,attempt_id,revision,record_digest,state),
 FOREIGN KEY(attempt_id,previous_revision,previous_digest,previous_state) REFERENCES worker_bootstrap_history(attempt_id,revision,record_digest,state) ON DELETE RESTRICT,
 CHECK((revision=1 AND num_nonnulls(previous_revision,previous_digest,previous_state)=0 AND state='consumed') OR
       (revision>1 AND num_nonnulls(previous_revision,previous_digest,previous_state)=3 AND previous_revision=revision-1 AND
        ((previous_state='consumed' AND state IN ('dispatched','blocked','delivery_unknown')) OR
         (previous_state='dispatched' AND state IN ('acknowledged','delivery_unknown')) OR (previous_state='acknowledged' AND state='delivery_unknown')))),
 CHECK(record ?& ARRAY['id','attemptId','revision','previousDigest','previousState','state','createdAt','peer','completion'] AND record-ARRAY['id','attemptId','revision','previousDigest','previousState','state','createdAt','peer','completion']='{}'::jsonb),
 CHECK(record->>'id'=id::text AND record->>'attemptId'=attempt_id::text AND (record->>'revision')::int=revision AND record->>'state'=state),
 CHECK((state<>'dispatched' OR jsonb_typeof(record->'peer')='object') AND (state<>'acknowledged' OR jsonb_typeof(record->'completion')='object'))
);
CREATE TABLE worker_bootstrap_heads (
 workspace_id UUID NOT NULL,host_id UUID NOT NULL,attempt_id UUID NOT NULL,history_id UUID NOT NULL UNIQUE,
 generation INT NOT NULL,credential_epoch INT NOT NULL,revision INT NOT NULL,record_digest TEXT NOT NULL,state TEXT NOT NULL,
 PRIMARY KEY(workspace_id,host_id),
 FOREIGN KEY(attempt_id,workspace_id,host_id,generation,credential_epoch) REFERENCES worker_bootstrap_attempts(id,workspace_id,host_id,generation,credential_epoch) ON DELETE RESTRICT,
 FOREIGN KEY(history_id,attempt_id,revision,record_digest,state) REFERENCES worker_bootstrap_history(id,attempt_id,revision,record_digest,state) ON DELETE RESTRICT
);
CREATE TABLE worker_bootstrap_audit (
 id UUID PRIMARY KEY,ticket_id UUID NOT NULL REFERENCES worker_bootstrap_tickets(id) ON DELETE RESTRICT,
 history_id UUID UNIQUE REFERENCES worker_bootstrap_history(id) ON DELETE RESTRICT,
 event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE RESTRICT,
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX worker_bootstrap_ticket_audit ON worker_bootstrap_audit(ticket_id) WHERE history_id IS NULL;
CREATE INDEX worker_bootstrap_ticket_expiry ON worker_bootstrap_tickets(expires_at);
COMMIT;
