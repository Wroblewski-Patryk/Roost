CREATE TYPE "FunctionalState" AS ENUM ('discovered', 'expected', 'missing', 'implemented', 'partially_implemented', 'broken', 'verified_working', 'unknown', 'deprecated');

CREATE TABLE "department_view_definitions" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT NOT NULL DEFAULT 'ph-squares-four',
  "canonical_department_id" UUID NOT NULL,
  "route_view" TEXT NOT NULL,
  "default_scope" JSONB NOT NULL DEFAULT '{}',
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "department_view_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "department_view_availability" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "view_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "default_scope" JSONB NOT NULL DEFAULT '{}',
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_core" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "department_view_availability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_records" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "record_type" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "business_purpose" TEXT,
  "current_state" TEXT,
  "desired_state" TEXT,
  "expected_behavior" TEXT,
  "rationale" TEXT,
  "acceptance_criteria" JSONB NOT NULL DEFAULT '[]',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'active',
  "functional_state" "FunctionalState" NOT NULL DEFAULT 'unknown',
  "verification_state" "VerificationStatus" NOT NULL DEFAULT 'not_started',
  "implementation_coverage" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'companycore',
  "due_date" TIMESTAMP(3),
  "parent_id" UUID,
  "project_id" UUID,
  "application_id" UUID,
  "client_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_records_coverage_check" CHECK ("implementation_coverage" IS NULL OR ("implementation_coverage" >= 0 AND "implementation_coverage" <= 100))
);

CREATE TABLE "evidence_records" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "type" "EvidenceType" NOT NULL,
  "source" "EvidenceSource" NOT NULL DEFAULT 'human',
  "reference" TEXT NOT NULL,
  "url" TEXT,
  "description" TEXT,
  "verification_status" "EvidenceVerificationStatus" NOT NULL DEFAULT 'unverified',
  "confidence" INTEGER,
  "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verified_by_type" "ActorType",
  "verified_by_id" TEXT,
  "verified_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evidence_records_confidence_check" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 100))
);

CREATE UNIQUE INDEX "department_view_definitions_workspace_id_key_key" ON "department_view_definitions"("workspace_id", "key");
CREATE INDEX "department_view_definitions_workspace_canonical_order_idx" ON "department_view_definitions"("workspace_id", "canonical_department_id", "display_order");
CREATE UNIQUE INDEX "department_view_availability_view_department_key" ON "department_view_availability"("view_id", "department_id");
CREATE INDEX "department_view_availability_workspace_department_order_idx" ON "department_view_availability"("workspace_id", "department_id", "display_order");
CREATE UNIQUE INDEX "company_records_workspace_type_key_key" ON "company_records"("workspace_id", "record_type", "key");
CREATE INDEX "company_records_workspace_type_status_idx" ON "company_records"("workspace_id", "record_type", "status");
CREATE INDEX "company_records_workspace_project_idx" ON "company_records"("workspace_id", "project_id");
CREATE INDEX "company_records_workspace_application_idx" ON "company_records"("workspace_id", "application_id");
CREATE INDEX "company_records_workspace_client_idx" ON "company_records"("workspace_id", "client_id");
CREATE INDEX "company_records_workspace_parent_idx" ON "company_records"("workspace_id", "parent_id");
CREATE INDEX "evidence_records_workspace_entity_idx" ON "evidence_records"("workspace_id", "entity_type", "entity_id");
CREATE INDEX "evidence_records_workspace_verification_observed_idx" ON "evidence_records"("workspace_id", "verification_status", "observed_at");

ALTER TABLE "department_view_definitions" ADD CONSTRAINT "department_view_definitions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_view_definitions" ADD CONSTRAINT "department_view_definitions_canonical_department_id_fkey" FOREIGN KEY ("canonical_department_id") REFERENCES "workspace_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_view_availability" ADD CONSTRAINT "department_view_availability_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_view_availability" ADD CONSTRAINT "department_view_availability_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "department_view_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_view_availability" ADD CONSTRAINT "department_view_availability_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "workspace_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_records" ADD CONSTRAINT "company_records_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_records" ADD CONSTRAINT "company_records_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "company_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
