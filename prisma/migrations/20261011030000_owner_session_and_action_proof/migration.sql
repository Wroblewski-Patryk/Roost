BEGIN;

ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE auth_session_revocations (
  session_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMP(3) NOT NULL,
  revoked_at TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX auth_session_revocations_expires_at_idx ON auth_session_revocations(expires_at);

CREATE TABLE owner_action_proofs (
  proof_hash TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK (method = 'POST'),
  path TEXT NOT NULL,
  body_digest TEXT NOT NULL CHECK (body_digest ~ '^[a-f0-9]{64}$'),
  authenticated_at TIMESTAMP(3) NOT NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  used_at TIMESTAMP(3)
);
CREATE INDEX owner_action_proofs_expires_at_idx ON owner_action_proofs(expires_at);

COMMIT;
