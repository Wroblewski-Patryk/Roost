-- SOURCE ONLY / UNAPPLIED. CREATE-only: no existing business data changes.
-- History/generation/audit are append-only through the adapter. This migration
-- does not grant protection against privileged SQL UPDATE/DELETE or DB rollback.
BEGIN;
CREATE TABLE worker_transport_generations (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 installation_id UUID NOT NULL,
 credential_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
 identity JSONB NOT NULL CHECK(jsonb_typeof(identity)='object' AND octet_length(identity::text)<=2048),
 identity_digest TEXT NOT NULL CHECK(identity_digest ~ '^[a-f0-9]{64}$'),
 UNIQUE(id,workspace_id,host_id),
 CHECK(identity ?& ARRAY['workspaceId','installationId','hostId','hostFingerprint','credentialId','credentialVersion','credentialEpoch','credentialFingerprint','ticketKeyId','ticketKeyEpoch','ticketPublicKeyDigest']),
 CHECK(identity-ARRAY['workspaceId','installationId','hostId','hostFingerprint','credentialId','credentialVersion','credentialEpoch','credentialFingerprint','ticketKeyId','ticketKeyEpoch','ticketPublicKeyDigest']='{}'::jsonb),
 CHECK(identity->>'workspaceId'=workspace_id::text AND identity->>'hostId'=host_id::text AND identity->>'installationId'=installation_id::text AND identity->>'credentialId'=credential_id::text),
 CHECK(identity->>'hostFingerprint' ~ '^[a-f0-9]{64}$' AND identity->>'credentialFingerprint' ~ '^[a-f0-9]{64}$' AND identity->>'ticketPublicKeyDigest' ~ '^[a-f0-9]{64}$'),
 CHECK(identity->>'ticketKeyId' ~ '^[A-Za-z0-9_-]{1,64}$' AND (identity->>'credentialVersion')::int>0 AND (identity->>'credentialEpoch')::int>0 AND (identity->>'ticketKeyEpoch')::int>0)
);
CREATE TABLE worker_transport_history (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL,
 host_id UUID NOT NULL,
 generation_id UUID NOT NULL,
 revision INT NOT NULL CHECK(revision>0),
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 previous_revision INT, previous_digest TEXT, previous_high_water INT, previous_state TEXT, previous_generation_id UUID,
 certificate_epoch INT NOT NULL CHECK(certificate_epoch>0),
 high_water_epoch INT NOT NULL CHECK(high_water_epoch>=certificate_epoch),
 state TEXT NOT NULL CHECK(state IN ('current','revoked')),
 request_id UUID NOT NULL UNIQUE,
 decision_id UUID NOT NULL UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,
 decision_revision INT NOT NULL CHECK(decision_revision>0),
 decision_intent_digest TEXT NOT NULL CHECK(decision_intent_digest ~ '^[a-f0-9]{64}$'),
 owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 current_pin TEXT NOT NULL CHECK(current_pin ~ '^[a-f0-9]{64}$'),
 staged_pin TEXT CHECK(staged_pin ~ '^[a-f0-9]{64}$' AND staged_pin<>current_pin),
 record JSONB NOT NULL CHECK(jsonb_typeof(record)='object' AND octet_length(record::text)<=8192),
 signature TEXT NOT NULL CHECK(signature ~ '^[a-f0-9]{128}$'),
 UNIQUE(workspace_id,host_id,revision),
 CONSTRAINT worker_transport_history_chain UNIQUE(workspace_id,host_id,revision,record_digest,high_water_epoch,state,generation_id),
 CONSTRAINT worker_transport_history_head UNIQUE(id,workspace_id,host_id,revision,record_digest,certificate_epoch,high_water_epoch,state),
 FOREIGN KEY(generation_id,workspace_id,host_id) REFERENCES worker_transport_generations(id,workspace_id,host_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 FOREIGN KEY(workspace_id,host_id,previous_revision,previous_digest,previous_high_water,previous_state,previous_generation_id)
   REFERENCES worker_transport_history(workspace_id,host_id,revision,record_digest,high_water_epoch,state,generation_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 CHECK((revision=1 AND num_nonnulls(previous_revision,previous_digest,previous_high_water,previous_state,previous_generation_id)=0 AND certificate_epoch=1 AND high_water_epoch=1 AND state='current') OR
   (revision>1 AND num_nonnulls(previous_revision,previous_digest,previous_high_water,previous_state,previous_generation_id)=5 AND previous_revision=revision-1 AND high_water_epoch BETWEEN previous_high_water AND previous_high_water+1 AND
     ((previous_state='current' AND generation_id=previous_generation_id) OR
      (previous_state='revoked' AND generation_id<>previous_generation_id AND state='current' AND certificate_epoch=previous_high_water+1 AND high_water_epoch=certificate_epoch)))),
 CHECK(record ?& ARRAY['version','identity','revision','certificateEpoch','highWaterEpoch','profile','staged','state','ownerId','decisionId','decisionRevision','decisionIntentDigest','approvedAt','expiresAt','requestId']),
 CHECK(record-ARRAY['version','identity','revision','certificateEpoch','highWaterEpoch','profile','staged','state','ownerId','decisionId','decisionRevision','decisionIntentDigest','approvedAt','expiresAt','requestId']='{}'::jsonb),
 CHECK(record->>'version'='worker-transport-record-v1' AND (record->>'revision')::int=revision AND (record->>'certificateEpoch')::int=certificate_epoch AND (record->>'highWaterEpoch')::int=high_water_epoch AND record->>'state'=state),
 CHECK(record->>'ownerId'=owner_id::text AND record->>'decisionId'=decision_id::text AND (record->>'decisionRevision')::int=decision_revision AND record->>'decisionIntentDigest'=decision_intent_digest AND record->>'requestId'=request_id::text),
 CHECK(record->'profile'->'certificate'->>'fingerprint'=current_pin AND (record->'staged'->'certificate'->>'fingerprint') IS NOT DISTINCT FROM staged_pin),
 CHECK(record->'profile' ?& ARRAY['origin','serverName','certificate','trust','resolver','proxy','redirect','downgrade','bootstrap']),
 CHECK((record->'profile')-ARRAY['origin','serverName','certificate','trust','resolver','proxy','redirect','downgrade','bootstrap']='{}'::jsonb),
 CHECK(record->'profile'->>'origin' ~ '^https://[a-z0-9.-]+:[1-9][0-9]{0,4}$' AND length(record->'profile'->>'origin')<=512 AND length(record->'profile'->>'serverName') BETWEEN 3 AND 253),
 CHECK(record->'profile'->'proxy'='false'::jsonb AND record->'profile'->'redirect'='false'::jsonb AND record->'profile'->'downgrade'='false'::jsonb),
 CHECK((record->'profile'->'trust')-ARRAY['mode','caDigest']='{}'::jsonb AND record->'profile'->'trust'->>'mode'='owner_approved_ca_digest' AND record->'profile'->'trust'->>'caDigest' ~ '^[a-f0-9]{64}$'),
 CHECK(record->'profile'->'resolver'='{"policy":"public_ipv4_only_v1","evidenceType":"issuer_signed_peer_observation_v1"}'::jsonb),
 CHECK((record->'profile'->'certificate')-ARRAY['fingerprint','hostname','notBefore','notAfter']='{}'::jsonb),
 CHECK((record->'profile'->'bootstrap')-ARRAY['source','evidenceDigest','fingerprint']='{}'::jsonb AND record->'profile'->'bootstrap'->>'source'='owner_out_of_band' AND record->'profile'->'bootstrap'->>'evidenceDigest' ~ '^[a-f0-9]{64}$'),
 CHECK(record->'staged'='null'::jsonb OR ((record->'staged')-ARRAY['epoch','certificate','bootstrap','overlapStartsAt','cutoverAt','expiresAt']='{}'::jsonb AND
   (record->'staged'->'certificate')-ARRAY['fingerprint','hostname','notBefore','notAfter']='{}'::jsonb AND (record->'staged'->'bootstrap')-ARRAY['source','evidenceDigest','fingerprint']='{}'::jsonb AND
   (record->'staged'->>'epoch')::int=high_water_epoch AND high_water_epoch=certificate_epoch+1))
);
CREATE INDEX worker_transport_current_pin ON worker_transport_history(workspace_id,host_id,current_pin);
CREATE INDEX worker_transport_staged_pin ON worker_transport_history(workspace_id,host_id,staged_pin);
CREATE TABLE worker_transport_heads (
 workspace_id UUID NOT NULL, host_id UUID NOT NULL,
 history_id UUID NOT NULL UNIQUE,
 revision INT NOT NULL CHECK(revision>0), record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$'),
 certificate_epoch INT NOT NULL CHECK(certificate_epoch>0), high_water_epoch INT NOT NULL CHECK(high_water_epoch>=certificate_epoch),
 state TEXT NOT NULL CHECK(state IN ('current','revoked')),
 PRIMARY KEY(workspace_id,host_id),
 CONSTRAINT worker_transport_head_history UNIQUE(history_id,workspace_id,host_id,revision,record_digest,certificate_epoch,high_water_epoch,state),
 FOREIGN KEY(history_id,workspace_id,host_id,revision,record_digest,certificate_epoch,high_water_epoch,state)
  REFERENCES worker_transport_history(id,workspace_id,host_id,revision,record_digest,certificate_epoch,high_water_epoch,state) ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE TABLE worker_transport_audit (
 history_id UUID PRIMARY KEY REFERENCES worker_transport_history(id) ON DELETE RESTRICT,
 event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE RESTRICT,
 record_digest TEXT NOT NULL CHECK(record_digest ~ '^[a-f0-9]{64}$')
);
COMMIT;
