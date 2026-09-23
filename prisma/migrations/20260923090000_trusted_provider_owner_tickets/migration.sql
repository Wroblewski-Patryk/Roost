BEGIN;
-- Additive only. No existing rows, applied migrations, credentials or seeds change.
CREATE TABLE trusted_provider_ticket_keys (
 workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE RESTRICT,
 installation_id UUID NOT NULL, key_id TEXT NOT NULL CHECK(key_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
 epoch INT NOT NULL CHECK(epoch>0), public_key_digest TEXT NOT NULL CHECK(public_key_digest ~ '^[a-f0-9]{64}$')
);
CREATE TABLE trusted_provider_tickets (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 installation_id UUID NOT NULL, task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 execution_id UUID NOT NULL UNIQUE REFERENCES agent_executions(id) ON DELETE RESTRICT,
 attempt INT NOT NULL CHECK(attempt=1), decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,
 decision_revision INT NOT NULL CHECK(decision_revision>0), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 key_id TEXT NOT NULL, key_epoch INT NOT NULL CHECK(key_epoch>0),
 digest TEXT NOT NULL UNIQUE CHECK(digest ~ '^[a-f0-9]{64}$'),
 nonce_digest TEXT NOT NULL UNIQUE CHECK(nonce_digest ~ '^[a-f0-9]{64}$'),
 acceptance_digest TEXT NOT NULL CHECK(acceptance_digest ~ '^[a-f0-9]{64}$'),
 context_digest TEXT NOT NULL CHECK(context_digest ~ '^[a-f0-9]{64}$'),
 claim_digest TEXT NOT NULL CHECK(claim_digest ~ '^[a-f0-9]{64}$'),
 challenge TEXT NOT NULL CHECK(challenge ~ '^[a-f0-9]{64}$'),
 issued_at TIMESTAMPTZ NOT NULL, not_before TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('issued','consumed','revoked','expired')), version INT NOT NULL CHECK(version>0),
 consume_id UUID UNIQUE, consumed_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
 UNIQUE(workspace_id,decision_id,decision_revision),
 CHECK(not_before=issued_at AND expires_at>issued_at AND expires_at<=issued_at+interval '60 seconds'),
 CHECK(CASE WHEN state='consumed' THEN consume_id IS NOT NULL AND consumed_at IS NOT NULL
       ELSE consume_id IS NULL AND consumed_at IS NULL END),
 CHECK((state='revoked')=(revoked_at IS NOT NULL))
);
-- Native journal is populated by the same transaction as the head transition.
CREATE TABLE trusted_provider_ticket_journal (
 ticket_id UUID NOT NULL REFERENCES trusted_provider_tickets(id) ON DELETE RESTRICT,
 version INT NOT NULL, state TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(ticket_id,version)
);
CREATE FUNCTION trusted_provider_ticket_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE e agent_executions; k trusted_provider_ticket_keys;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'owner_ticket_history_immutable'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO e FROM agent_executions WHERE id=NEW.execution_id;
  SELECT * INTO k FROM trusted_provider_ticket_keys WHERE workspace_id=NEW.workspace_id;
  IF e.workspace_id IS DISTINCT FROM NEW.workspace_id OR e.task_id IS DISTINCT FROM NEW.task_id
    OR e.attempt IS DISTINCT FROM NEW.attempt OR e.status::text<>'claimed'
    OR NOT EXISTS(SELECT 1 FROM workspaces w JOIN workspace_memberships m ON m.workspace_id=w.id
       WHERE w.id=NEW.workspace_id AND w.owner_user_id=NEW.owner_id AND m.user_id=NEW.owner_id AND m.role::text='owner')
    OR NOT EXISTS(SELECT 1 FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
       JOIN decision_acceptances a ON a.decision_id=d.id WHERE d.id=NEW.decision_id
       AND d.workspace_id=NEW.workspace_id AND d.status='accepted' AND r.version=NEW.decision_revision
       AND a.actor_user_id=NEW.owner_id AND a.actor_agent_id IS NULL)
    OR k.installation_id IS DISTINCT FROM NEW.installation_id OR k.key_id IS DISTINCT FROM NEW.key_id OR k.epoch IS DISTINCT FROM NEW.key_epoch
    OR NEW.state<>'issued' OR NEW.version<>1 OR NEW.consume_id IS NOT NULL OR NEW.consumed_at IS NOT NULL OR NEW.revoked_at IS NOT NULL
  THEN RAISE EXCEPTION 'owner_ticket_binding_invalid'; END IF;
 ELSE
  IF OLD.state<>'issued' OR NEW.state NOT IN ('consumed','revoked','expired') OR NEW.version<>OLD.version+1
   OR (to_jsonb(OLD)-'state'-'version'-'consume_id'-'consumed_at'-'revoked_at') IS DISTINCT FROM
      (to_jsonb(NEW)-'state'-'version'-'consume_id'-'consumed_at'-'revoked_at')
  THEN RAISE EXCEPTION 'owner_ticket_history_immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trusted_provider_ticket_guard BEFORE INSERT OR UPDATE OR DELETE ON trusted_provider_tickets
 FOR EACH ROW EXECUTE FUNCTION trusted_provider_ticket_guard();
CREATE FUNCTION trusted_provider_ticket_journal_append() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO trusted_provider_ticket_journal(ticket_id,version,state) VALUES(NEW.id,NEW.version,NEW.state);
 RETURN NULL;
END $$;
CREATE TRIGGER trusted_provider_ticket_journal_append AFTER INSERT OR UPDATE ON trusted_provider_tickets
 FOR EACH ROW EXECUTE FUNCTION trusted_provider_ticket_journal_append();
CREATE FUNCTION trusted_provider_ticket_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'owner_ticket_history_immutable'; END $$;
CREATE TRIGGER trusted_provider_ticket_journal_immutable BEFORE UPDATE OR DELETE ON trusted_provider_ticket_journal
 FOR EACH ROW EXECUTE FUNCTION trusted_provider_ticket_history_guard();
CREATE FUNCTION trusted_provider_ticket_key_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'owner_ticket_history_immutable'; END IF;
 IF NEW.workspace_id<>OLD.workspace_id OR NEW.installation_id<>OLD.installation_id OR NEW.epoch<>OLD.epoch+1
   OR NEW.key_id=OLD.key_id OR NEW.public_key_digest=OLD.public_key_digest
 THEN RAISE EXCEPTION 'owner_ticket_key_changed'; END IF;
 UPDATE trusted_provider_tickets SET state='revoked',version=version+1,revoked_at=clock_timestamp()
  WHERE workspace_id=OLD.workspace_id AND state='issued';
 RETURN NEW;
END $$;
CREATE TRIGGER trusted_provider_ticket_key_guard BEFORE UPDATE OR DELETE ON trusted_provider_ticket_keys
 FOR EACH ROW EXECUTE FUNCTION trusted_provider_ticket_key_guard();
COMMIT;
