BEGIN;
-- Forward-only SOURCE contract, unexecuted. This is an enrollment journal
-- attached to ApiKey, never a second credential store. No raw secrets/responses.
CREATE TABLE worker_credential_handoffs (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 installation_id UUID NOT NULL, host_id UUID NOT NULL REFERENCES agent_hosts(id) ON DELETE RESTRICT,
 host_fingerprint TEXT NOT NULL CHECK(host_fingerprint ~ '^[a-f0-9]{64}$'),
 device_secret_hash TEXT NOT NULL UNIQUE CHECK(device_secret_hash ~ '^[a-f0-9]{64}$'),
 challenge_hash TEXT NOT NULL CHECK(challenge_hash ~ '^[a-f0-9]{64}$'),
 request_digest TEXT NOT NULL CHECK(request_digest ~ '^[a-f0-9]{64}$'),
 user_code_hash TEXT NOT NULL CHECK(user_code_hash ~ '^[a-f0-9]{64}$'),
 origin TEXT NOT NULL CHECK(length(origin)<=512 AND origin ~ '^https://[a-z0-9.\[\]:-]+$'),
 certificate_fingerprint TEXT NOT NULL CHECK(certificate_fingerprint ~ '^[a-f0-9]{64}$'),
 replaces_request_id UUID REFERENCES worker_credential_handoffs(id) ON DELETE RESTRICT,
 creator_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
 state TEXT NOT NULL CHECK(state IN ('requested','approved','awaiting_ack','acknowledged','delivery_unknown','revoked','expired','locked')),
 bad_attempts INT NOT NULL DEFAULT 0 CHECK(bad_attempts BETWEEN 0 AND 5),
 polls INT NOT NULL DEFAULT 0 CHECK(polls BETWEEN 0 AND 30), next_poll_at TIMESTAMP(3),
 owner_user_id UUID REFERENCES users(id) ON DELETE RESTRICT, owner_auth_time BIGINT, approval_command JSONB,
 credential_id UUID UNIQUE REFERENCES api_keys(id) ON DELETE RESTRICT,
 response_digest TEXT CHECK(response_digest ~ '^[a-f0-9]{64}$'), spent_at TIMESTAMP(3), ack_deadline TIMESTAMP(3), acknowledged_at TIMESTAMP(3),
 created_at TIMESTAMP(3) NOT NULL, expires_at TIMESTAMP(3) NOT NULL,
 CHECK(expires_at>created_at AND expires_at<=created_at+INTERVAL '120 seconds'),
 CHECK((approval_command IS NULL AND owner_user_id IS NULL AND owner_auth_time IS NULL) OR
       (approval_command IS NOT NULL AND owner_user_id IS NOT NULL AND owner_auth_time IS NOT NULL)),
 CHECK((spent_at IS NULL AND credential_id IS NULL AND response_digest IS NULL AND ack_deadline IS NULL) OR
       (spent_at IS NOT NULL AND credential_id IS NOT NULL AND response_digest IS NOT NULL AND ack_deadline>spent_at AND ack_deadline<=spent_at+INTERVAL '60 seconds')),
 CHECK(acknowledged_at IS NULL OR acknowledged_at<ack_deadline)
);
CREATE UNIQUE INDEX worker_handoff_one_waiting ON worker_credential_handoffs(workspace_id,host_id) WHERE state='awaiting_ack';
CREATE INDEX worker_handoff_request_budget ON worker_credential_handoffs(workspace_id,host_id,created_at);
CREATE UNIQUE INDEX worker_handoff_one_decision ON worker_credential_handoffs((approval_command->>'decisionId')) WHERE approval_command IS NOT NULL;

CREATE FUNCTION worker_handoff_owner_current(h worker_credential_handoffs) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT decision_primary_owner(h.workspace_id,h.owner_user_id) AND EXISTS(
  SELECT 1 FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id JOIN decision_acceptances a ON a.decision_id=d.id
  WHERE d.id=(h.approval_command->>'decisionId')::uuid AND d.workspace_id=h.workspace_id AND d.status='accepted' AND decision_state(d.id)='accepted'
   AND r.version=(h.approval_command->>'decisionRevision')::int AND a.actor_user_id=h.owner_user_id AND a.actor_agent_id IS NULL
   AND a.authority->>'status'='owner_reserved' AND r.body->'workerCredential'=h.approval_command->'intent'
   AND r.body->'workerCredential'->'handoff'=jsonb_build_object('requestId',h.id,'requestDigest',h.request_digest,'hostFingerprint',h.host_fingerprint,
       'origin',h.origin,'certificateFingerprint',h.certificate_fingerprint,'replacesRequestId',h.replaces_request_id)
   AND (r.body->'workerCredential'->>'validUntil')::timestamptz>clock_timestamp()
   AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id))
$$;
CREATE FUNCTION worker_handoff_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE k api_keys;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'worker_handoff_history_retained'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'requested' OR NEW.credential_id IS NOT NULL OR NEW.approval_command IS NOT NULL OR NEW.bad_attempts<>0 OR NEW.polls<>0
   THEN RAISE EXCEPTION 'worker_handoff_request_invalid'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['state','bad_attempts','polls','next_poll_at','owner_user_id','owner_auth_time','approval_command','credential_id','response_digest','spent_at','ack_deadline','acknowledged_at'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','bad_attempts','polls','next_poll_at','owner_user_id','owner_auth_time','approval_command','credential_id','response_digest','spent_at','ack_deadline','acknowledged_at'])
   OR NEW.bad_attempts<OLD.bad_attempts OR NEW.polls<OLD.polls
   OR OLD.approval_command IS NOT NULL AND (NEW.approval_command IS DISTINCT FROM OLD.approval_command OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.owner_auth_time IS DISTINCT FROM OLD.owner_auth_time)
   OR OLD.spent_at IS NOT NULL AND (NEW.spent_at IS DISTINCT FROM OLD.spent_at OR NEW.credential_id IS DISTINCT FROM OLD.credential_id OR NEW.response_digest IS DISTINCT FROM OLD.response_digest OR NEW.ack_deadline IS DISTINCT FROM OLD.ack_deadline)
   OR OLD.acknowledged_at IS NOT NULL AND NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at
   THEN RAISE EXCEPTION 'worker_handoff_binding_immutable'; END IF;
  IF NEW.state<>OLD.state AND NOT (
   OLD.state='requested' AND NEW.state IN ('approved','expired','locked','revoked') OR
   OLD.state='approved' AND NEW.state IN ('awaiting_ack','expired','locked','revoked') OR
   OLD.state='awaiting_ack' AND NEW.state IN ('acknowledged','delivery_unknown','locked','revoked') OR
   OLD.state='acknowledged' AND NEW.state='revoked') THEN RAISE EXCEPTION 'worker_handoff_terminal'; END IF;
 END IF;
 IF NEW.state IN ('approved','awaiting_ack','acknowledged') THEN
  IF worker_handoff_owner_current(NEW) IS NOT TRUE OR NEW.owner_auth_time>extract(epoch FROM clock_timestamp())
   OR NEW.owner_auth_time<extract(epoch FROM clock_timestamp())-300 THEN RAISE EXCEPTION 'worker_handoff_approval_invalid'; END IF;
 END IF;
 IF NEW.state IN ('requested','approved') AND (NEW.spent_at IS NOT NULL OR NEW.expires_at<=clock_timestamp()) THEN RAISE EXCEPTION 'worker_handoff_expired'; END IF;
 IF NEW.credential_id IS NOT NULL THEN
  SELECT * INTO k FROM api_keys WHERE id=NEW.credential_id;
  IF k.workspace_id IS DISTINCT FROM NEW.workspace_id OR k.worker_host_id IS DISTINCT FROM NEW.host_id OR k.worker_installation_id IS DISTINCT FROM NEW.installation_id
   THEN RAISE EXCEPTION 'worker_handoff_credential_mismatch'; END IF;
  IF NEW.state='awaiting_ack' AND (k.active OR k.revoked_at IS NOT NULL OR k.credential_version<>1) THEN RAISE EXCEPTION 'worker_handoff_inactive_required'; END IF;
 END IF;
 IF NEW.state='acknowledged' AND (NEW.acknowledged_at IS NULL OR NEW.ack_deadline<=clock_timestamp()) THEN RAISE EXCEPTION 'worker_handoff_ack_expired'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_handoff_guard BEFORE INSERT OR UPDATE OR DELETE ON worker_credential_handoffs FOR EACH ROW EXECUTE FUNCTION worker_handoff_guard();

-- Extend, do not weaken, the original ApiKey immutability guard. Exactly one
-- first activation is admitted for a pending key with an acknowledged handoff.
CREATE OR REPLACE FUNCTION worker_credential_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE acknowledged BOOLEAN:=false;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.worker_host_id IS NOT NULL THEN RAISE EXCEPTION 'worker_credential_history_retained'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.worker_host_id IS NOT NULL THEN
  IF NOT OLD.active AND NEW.active AND OLD.revoked_at IS NULL AND OLD.credential_version=1 THEN
   SELECT EXISTS(SELECT 1 FROM worker_credential_handoffs h WHERE h.credential_id=OLD.id AND h.state='acknowledged'
    AND h.acknowledged_at IS NOT NULL AND h.ack_deadline>clock_timestamp() AND worker_handoff_owner_current(h)) INTO acknowledged;
  END IF;
  IF (to_jsonb(NEW)-'active'-'revoked_at'-'last_used_at'-'updated_at'-'credential_version') IS DISTINCT FROM
     (to_jsonb(OLD)-'active'-'revoked_at'-'last_used_at'-'updated_at'-'credential_version')
   OR OLD.revoked_at IS NOT NULL AND (NEW.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
   OR NOT OLD.active AND NEW.active AND NOT acknowledged THEN RAISE EXCEPTION 'worker_credential_binding_immutable'; END IF;
  NEW.credential_version:=OLD.credential_version+(CASE WHEN NOT acknowledged AND (NEW.active IS DISTINCT FROM OLD.active OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN 1 ELSE 0 END);
 END IF;
 IF NEW.worker_host_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM agent_hosts h JOIN trusted_provider_ticket_keys k ON k.workspace_id=h.workspace_id
  WHERE h.id=NEW.worker_host_id AND h.workspace_id=NEW.workspace_id AND k.installation_id=NEW.worker_installation_id)
 THEN RAISE EXCEPTION 'worker_credential_binding_invalid'; END IF;
 IF NEW.worker_host_id IS NOT NULL THEN
  UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
  IF NEW.scopes IS DISTINCT FROM '["agent-runtime:claim"]'::jsonb THEN RAISE EXCEPTION 'worker_credential_binding_invalid'; END IF;
  IF TG_OP='INSERT' OR OLD.worker_host_id IS NULL THEN
   IF NEW.worker_binding_epoch <= COALESCE((SELECT max(worker_binding_epoch) FROM api_keys WHERE workspace_id=NEW.workspace_id AND worker_host_id=NEW.worker_host_id AND id<>NEW.id),0)
   THEN RAISE EXCEPTION 'worker_credential_epoch_stale'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION worker_handoff_ack_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE h worker_credential_handoffs; k api_keys;
BEGIN
 SELECT * INTO h FROM worker_credential_handoffs WHERE id=NEW.id;
 IF h.state='acknowledged' THEN
  SELECT * INTO k FROM api_keys WHERE id=h.credential_id;
  IF k.id IS NULL OR NOT k.active AND k.revoked_at IS NULL OR NOT EXISTS(SELECT 1 FROM agent_credential_operations o
    WHERE o.key_id=k.id AND o.snapshot->>'decisionId'=h.approval_command->>'decisionId') THEN RAISE EXCEPTION 'worker_handoff_ack_incomplete'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER worker_handoff_ack_commit_guard AFTER INSERT OR UPDATE ON worker_credential_handoffs
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION worker_handoff_ack_commit_guard();
COMMIT;
