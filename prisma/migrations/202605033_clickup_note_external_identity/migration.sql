CREATE UNIQUE INDEX "notes_workspace_id_source_external_id_key"
  ON "notes"("workspace_id", "source", "external_id");
