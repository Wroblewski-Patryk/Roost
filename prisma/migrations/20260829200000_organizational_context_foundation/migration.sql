CREATE TYPE "OrganizationalRelationshipRole" AS ENUM ('owner', 'related', 'applicable');
CREATE TYPE "OrganizationalScopeType" AS ENUM ('company', 'department', 'project', 'product', 'service', 'client', 'team', 'role', 'human', 'agent', 'feature', 'component');
CREATE TYPE "EntityOwnerType" AS ENUM ('department', 'human', 'agent', 'role', 'team');
CREATE TYPE "EntityResponsibilityType" AS ENUM ('accountable', 'responsible', 'contributor', 'reviewer', 'approver');

ALTER TABLE "goals"
  ADD COLUMN "business_purpose" TEXT,
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "deadline" TIMESTAMP(3),
  ADD COLUMN "parent_goal_id" UUID;

CREATE TABLE "organizational_department_relations" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "relationship_role" "OrganizationalRelationshipRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizational_department_relations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizational_scopes" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "scope_type" "OrganizationalScopeType" NOT NULL,
  "scope_entity_id" TEXT,
  "label" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizational_scopes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entity_ownerships" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "owner_type" "EntityOwnerType" NOT NULL,
  "owner_id" TEXT NOT NULL,
  "responsibility_type" "EntityResponsibilityType" NOT NULL DEFAULT 'accountable',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entity_ownerships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizational_department_relations_unique" ON "organizational_department_relations"("workspace_id", "entity_type", "entity_id", "relationship_role", "department_id");
CREATE UNIQUE INDEX "organizational_department_relations_single_owner" ON "organizational_department_relations"("workspace_id", "entity_type", "entity_id") WHERE "relationship_role" = 'owner';
CREATE INDEX "organizational_department_relations_entity_idx" ON "organizational_department_relations"("workspace_id", "entity_type", "entity_id");
CREATE INDEX "organizational_department_relations_department_idx" ON "organizational_department_relations"("workspace_id", "department_id", "entity_type", "relationship_role");
CREATE INDEX "organizational_scopes_entity_idx" ON "organizational_scopes"("workspace_id", "entity_type", "entity_id");
CREATE INDEX "organizational_scopes_scope_idx" ON "organizational_scopes"("workspace_id", "scope_type", "scope_entity_id");
CREATE UNIQUE INDEX "organizational_scopes_unique" ON "organizational_scopes"("workspace_id", "entity_type", "entity_id", "scope_type", COALESCE("scope_entity_id", ''));
CREATE UNIQUE INDEX "entity_ownerships_unique" ON "entity_ownerships"("workspace_id", "entity_type", "entity_id", "owner_type", "owner_id", "responsibility_type");
CREATE INDEX "entity_ownerships_entity_idx" ON "entity_ownerships"("workspace_id", "entity_type", "entity_id");
CREATE INDEX "entity_ownerships_owner_idx" ON "entity_ownerships"("workspace_id", "owner_type", "owner_id");
CREATE INDEX "goals_workspace_id_parent_goal_id_idx" ON "goals"("workspace_id", "parent_goal_id");

ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_goal_id_fkey" FOREIGN KEY ("parent_goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organizational_department_relations" ADD CONSTRAINT "organizational_department_relations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organizational_department_relations" ADD CONSTRAINT "organizational_department_relations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "workspace_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organizational_scopes" ADD CONSTRAINT "organizational_scopes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_ownerships" ADD CONSTRAINT "entity_ownerships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "workspace_departments"
SET "linked_views" = CASE
  WHEN "linked_views" @> '["strategy.goals"]'::jsonb THEN "linked_views"
  ELSE "linked_views" || '["strategy.goals"]'::jsonb
END
WHERE "key" = '01-strategia';

UPDATE "workspace_departments"
SET "linked_views" = CASE
  WHEN "linked_views" @> '["technology.goals"]'::jsonb THEN "linked_views"
  ELSE "linked_views" || '["technology.goals"]'::jsonb
END
WHERE "key" = '09-technologia';
