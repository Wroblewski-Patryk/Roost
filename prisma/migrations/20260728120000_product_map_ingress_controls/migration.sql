CREATE TABLE "product_map_projection_admissions" (
  "api_key_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "tokens" DECIMAL(8,4) NOT NULL,
  "last_refilled_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_map_projection_admissions_pkey" PRIMARY KEY ("api_key_id", "workspace_id")
);

CREATE INDEX "product_map_projection_admissions_last_seen_at_idx"
ON "product_map_projection_admissions"("last_seen_at");

ALTER TABLE "product_map_projection_admissions"
ADD CONSTRAINT "product_map_projection_admissions_api_key_id_fkey"
FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_map_projection_admissions"
ADD CONSTRAINT "product_map_projection_admissions_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
