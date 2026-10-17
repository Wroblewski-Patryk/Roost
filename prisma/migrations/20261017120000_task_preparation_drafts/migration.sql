-- Owner working text is separate from the accepted Ready contract. Existing
-- tasks, links, pins, executions and grants are not rewritten or seeded.
CREATE TABLE "task_preparation_drafts" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "editor_version" TEXT NOT NULL,
  "execution_class" TEXT NOT NULL,
  "application_id" UUID,
  "draft_body" JSONB NOT NULL,
  "body_digest" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_preparation_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_preparation_drafts_version_positive" CHECK ("version" > 0),
  CONSTRAINT "task_preparation_drafts_body_bounded" CHECK (octet_length("draft_body"::text) <= 512000),
  CONSTRAINT "task_preparation_drafts_editor_version_sha256" CHECK ("editor_version" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "task_preparation_drafts_body_digest_sha256" CHECK ("body_digest" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "task_preparation_drafts_request_hash_sha256" CHECK ("request_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "task_preparation_drafts_execution_class" CHECK ("execution_class" IN ('application', 'roost-company-information-v1', 'roost-company-information-runtime-v1'))
);

CREATE UNIQUE INDEX "task_preparation_drafts_workspace_id_task_id_version_key"
  ON "task_preparation_drafts"("workspace_id", "task_id", "version");
CREATE INDEX "task_preparation_drafts_workspace_id_task_id_created_at_idx"
  ON "task_preparation_drafts"("workspace_id", "task_id", "created_at");
ALTER TABLE "task_preparation_drafts" ADD CONSTRAINT "task_preparation_drafts_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_preparation_drafts" ADD CONSTRAINT "task_preparation_drafts_task_id_workspace_id_fkey"
  FOREIGN KEY ("task_id", "workspace_id") REFERENCES "tasks"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_preparation_drafts" ADD CONSTRAINT "task_preparation_drafts_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION task_preparation_draft_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'task_preparation_draft_immutable';
END;
$$;
CREATE TRIGGER task_preparation_draft_immutable_guard
  BEFORE UPDATE OR DELETE ON task_preparation_drafts
  FOR EACH ROW EXECUTE FUNCTION task_preparation_draft_immutable();
