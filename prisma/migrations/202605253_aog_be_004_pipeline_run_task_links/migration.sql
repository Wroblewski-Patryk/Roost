CREATE TABLE "pipeline_run_task_links" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "pipeline_run_id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "link_type" TEXT NOT NULL DEFAULT 'evidence',
  "source" TEXT NOT NULL DEFAULT 'companycore',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pipeline_run_task_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pipeline_run_task_links_workspace_id_pipeline_run_id_task_id_lin_key"
ON "pipeline_run_task_links"("workspace_id", "pipeline_run_id", "task_id", "link_type");

CREATE INDEX "pipeline_run_task_links_workspace_id_pipeline_run_id_idx"
ON "pipeline_run_task_links"("workspace_id", "pipeline_run_id");

CREATE INDEX "pipeline_run_task_links_workspace_id_task_id_idx"
ON "pipeline_run_task_links"("workspace_id", "task_id");

ALTER TABLE "pipeline_run_task_links"
ADD CONSTRAINT "pipeline_run_task_links_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pipeline_run_task_links"
ADD CONSTRAINT "pipeline_run_task_links_pipeline_run_id_fkey"
FOREIGN KEY ("pipeline_run_id") REFERENCES "pipeline_runs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pipeline_run_task_links"
ADD CONSTRAINT "pipeline_run_task_links_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
