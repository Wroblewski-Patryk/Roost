CREATE TABLE "google_doc_mandates" (
  "id" UUID NOT NULL PRIMARY KEY,
  "workspace_id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "source_review_id" UUID NOT NULL,
  "source_snapshot_id" UUID NOT NULL,
  "selected_folder_id" TEXT NOT NULL,
  "agent_id" UUID NOT NULL,
  "credential_id" UUID NOT NULL,
  "credential_version" INTEGER NOT NULL,
  "valid_until" TIMESTAMP(3) NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "request_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "google_doc_mandates_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "google_doc_mandates_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "google_drive_files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "google_doc_mandates_task_id_key" ON "google_doc_mandates"("task_id");
CREATE UNIQUE INDEX "google_doc_mandates_file_id_key" ON "google_doc_mandates"("file_id");
CREATE UNIQUE INDEX "google_doc_mandates_request_id_key" ON "google_doc_mandates"("request_id");
CREATE INDEX "google_doc_mandates_workspace_id_task_id_idx" ON "google_doc_mandates"("workspace_id", "task_id");

CREATE TABLE "google_doc_edit_intents" (
  "id" UUID NOT NULL PRIMARY KEY,
  "mandate_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "request_hash" TEXT NOT NULL,
  "actor_type" TEXT NOT NULL,
  "actor_id" UUID NOT NULL,
  "credential_id" UUID,
  "base_revision_id" TEXT NOT NULL,
  "append_text_hash" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "error_code" TEXT,
  "provider_revision_id" TEXT,
  "provider_version" TEXT,
  "readback_text_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_doc_edit_intents_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "google_doc_mandates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "google_doc_edit_intents_mandate_id_key" ON "google_doc_edit_intents"("mandate_id");
CREATE UNIQUE INDEX "google_doc_edit_intents_request_id_key" ON "google_doc_edit_intents"("request_id");
CREATE INDEX "google_doc_edit_intents_workspace_id_task_id_created_at_idx" ON "google_doc_edit_intents"("workspace_id", "task_id", "created_at");

-- A completed/interrupted task or a changed assignee permanently revokes its
-- one-edit Doc mandate. A later return to the old state cannot revive it.
CREATE FUNCTION revoke_google_doc_mandate_on_task_change() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('done', 'blocked', 'archived')
     OR NEW.assigned_workforce_entity_id IS DISTINCT FROM OLD.assigned_workforce_entity_id THEN
    UPDATE google_doc_mandates SET revoked_at = clock_timestamp()
    WHERE task_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER revoke_google_doc_mandate_on_task_change
AFTER UPDATE OF status, assigned_workforce_entity_id ON tasks
FOR EACH ROW EXECUTE FUNCTION revoke_google_doc_mandate_on_task_change();
