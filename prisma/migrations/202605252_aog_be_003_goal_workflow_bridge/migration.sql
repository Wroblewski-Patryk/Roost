ALTER TABLE "goals"
ADD COLUMN "process_id" UUID;

CREATE INDEX "goals_process_id_idx" ON "goals"("process_id");

ALTER TABLE "goals"
ADD CONSTRAINT "goals_process_id_fkey"
FOREIGN KEY ("process_id") REFERENCES "processes"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "targets"
ADD COLUMN "pipeline_id" UUID;

CREATE INDEX "targets_pipeline_id_idx" ON "targets"("pipeline_id");

ALTER TABLE "targets"
ADD CONSTRAINT "targets_pipeline_id_fkey"
FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
