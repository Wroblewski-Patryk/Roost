-- Version each department composition without rewriting existing identities,
-- relations, provider mappings, or view availability.
ALTER TABLE "workspace_departments"
  ADD COLUMN "composition_version" INTEGER NOT NULL DEFAULT 1;
