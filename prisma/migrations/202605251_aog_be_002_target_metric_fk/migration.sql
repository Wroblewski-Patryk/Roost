ALTER TABLE "targets"
ADD COLUMN "metric_id" UUID;

CREATE INDEX "targets_metric_id_idx" ON "targets"("metric_id");

ALTER TABLE "targets"
ADD CONSTRAINT "targets_metric_id_fkey"
FOREIGN KEY ("metric_id") REFERENCES "metrics"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
