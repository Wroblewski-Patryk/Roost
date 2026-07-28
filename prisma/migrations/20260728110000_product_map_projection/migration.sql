ALTER TABLE "workspaces" ADD COLUMN "product_map_company_id" TEXT;
CREATE UNIQUE INDEX "workspaces_product_map_company_id_key" ON "workspaces"("product_map_company_id");

CREATE TABLE "product_map_projection_snapshots" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "company_id" TEXT NOT NULL,
  "transport_version" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "source_snapshot_id" TEXT NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "packet_digest" TEXT NOT NULL,
  "packet" JSONB NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receipt_sequence" SERIAL NOT NULL,
  "audit_correlation" TEXT,
  CONSTRAINT "product_map_projection_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pmap_snapshot_identity_uq"
ON "product_map_projection_snapshots"("workspace_id", "company_id", "schema_version", "source_snapshot_id", "packet_digest");
CREATE INDEX "pmap_snapshot_observation_idx"
ON "product_map_projection_snapshots"("workspace_id", "company_id", "schema_version", "source_snapshot_id", "observed_at");
CREATE INDEX "pmap_snapshot_workspace_observed_idx"
ON "product_map_projection_snapshots"("workspace_id", "observed_at");

CREATE TABLE "product_map_projection_receipts" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "company_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "source_snapshot_id" TEXT NOT NULL,
  "packet_digest" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_map_projection_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pmap_receipt_identity_uq"
ON "product_map_projection_receipts"("workspace_id", "company_id", "schema_version", "source_snapshot_id", "packet_digest");

CREATE TABLE "product_map_projection_quarantines" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "company_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "source_snapshot_id" TEXT NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "packet_digest" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "audit_correlation" TEXT,
  CONSTRAINT "product_map_projection_quarantines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pmap_quarantine_workspace_received_idx"
ON "product_map_projection_quarantines"("workspace_id", "received_at");

CREATE TABLE "product_map_projection_states" (
  "workspace_id" UUID NOT NULL,
  "active_snapshot_id" UUID,
  "active_observed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_map_projection_states_pkey" PRIMARY KEY ("workspace_id")
);

ALTER TABLE "product_map_projection_snapshots" ADD CONSTRAINT "product_map_projection_snapshots_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_map_projection_receipts" ADD CONSTRAINT "product_map_projection_receipts_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_map_projection_quarantines" ADD CONSTRAINT "product_map_projection_quarantines_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_map_projection_states" ADD CONSTRAINT "product_map_projection_states_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
