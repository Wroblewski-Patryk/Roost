CREATE TABLE "application_procedures" (
  "application_id" UUID NOT NULL,
  "procedure_id" UUID NOT NULL,
  "relation_type" TEXT NOT NULL DEFAULT 'governs',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "application_procedures_pkey" PRIMARY KEY ("application_id", "procedure_id")
);

CREATE TABLE "capability_procedures" (
  "capability_definition_id" UUID NOT NULL,
  "procedure_id" UUID NOT NULL,
  "relation_type" TEXT NOT NULL DEFAULT 'implementation',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "capability_procedures_pkey" PRIMARY KEY ("capability_definition_id", "procedure_id")
);

CREATE INDEX "application_procedures_procedure_id_idx" ON "application_procedures"("procedure_id");
CREATE INDEX "capability_procedures_procedure_id_idx" ON "capability_procedures"("procedure_id");

ALTER TABLE "application_procedures"
  ADD CONSTRAINT "application_procedures_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_procedures"
  ADD CONSTRAINT "application_procedures_procedure_id_fkey"
  FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "capability_procedures"
  ADD CONSTRAINT "capability_procedures_capability_definition_id_fkey"
  FOREIGN KEY ("capability_definition_id") REFERENCES "capability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "capability_procedures"
  ADD CONSTRAINT "capability_procedures_procedure_id_fkey"
  FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
