CREATE TABLE "knowledge_links" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "knowledge_item_id" UUID,
  "google_drive_file_id" UUID,
  "content_snapshot_id" UUID,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "link_type" TEXT NOT NULL,
  "confidence" TEXT NOT NULL DEFAULT 'direct',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_links_workspace_id_target_type_target_id_idx"
ON "knowledge_links"("workspace_id", "target_type", "target_id");

CREATE INDEX "knowledge_links_workspace_id_knowledge_item_id_idx"
ON "knowledge_links"("workspace_id", "knowledge_item_id");

CREATE INDEX "knowledge_links_workspace_id_google_drive_file_id_idx"
ON "knowledge_links"("workspace_id", "google_drive_file_id");

CREATE INDEX "knowledge_links_workspace_id_content_snapshot_id_idx"
ON "knowledge_links"("workspace_id", "content_snapshot_id");

ALTER TABLE "knowledge_links"
ADD CONSTRAINT "knowledge_links_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_links"
ADD CONSTRAINT "knowledge_links_knowledge_item_id_fkey"
FOREIGN KEY ("knowledge_item_id") REFERENCES "knowledge_items"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_links"
ADD CONSTRAINT "knowledge_links_google_drive_file_id_fkey"
FOREIGN KEY ("google_drive_file_id") REFERENCES "google_drive_files"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_links"
ADD CONSTRAINT "knowledge_links_content_snapshot_id_fkey"
FOREIGN KEY ("content_snapshot_id") REFERENCES "google_drive_content_snapshots"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
