CREATE TABLE "workspace_departments" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT NOT NULL DEFAULT 'ph-buildings',
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "linked_views" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workspace_departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_departments_workspace_id_key_key" ON "workspace_departments"("workspace_id", "key");
CREATE INDEX "workspace_departments_workspace_id_position_idx" ON "workspace_departments"("workspace_id", "position");
CREATE INDEX "workspace_departments_workspace_id_status_idx" ON "workspace_departments"("workspace_id", "status");

ALTER TABLE "workspace_departments"
  ADD CONSTRAINT "workspace_departments_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

WITH department_catalog(key, name, description, icon, position, linked_views) AS (
  VALUES
    ('00-ogolny', '00 General', 'Company orchestration, routing, and cross-department command.', 'ph-map-trifold', 0, '["general.overview"]'::jsonb),
    ('01-strategia', '01 Strategy', 'Strategic goals, decisions, priorities, and roadmap governance.', 'ph-target', 1, '[]'::jsonb),
    ('02-produkt', '02 Product', 'Product and service definition, delivery scope, and improvement loops.', 'ph-package', 2, '[]'::jsonb),
    ('03-sprzedaz', '03 Sales', 'Lead, offer, deal, and commercial follow-up management.', 'ph-handshake', 3, '[]'::jsonb),
    ('04-operacje', '04 Operations', 'Procedures, task boards, calendars, routines, and operational controls.', 'ph-list-checks', 4, '["operations.tasks","operations.calendar"]'::jsonb),
    ('05-relacje', '05 Relationships', 'Clients, partners, support, feedback, and relationship evidence.', 'ph-address-book', 5, '[]'::jsonb),
    ('06-kadry', '06 People / Agents', 'People, AI agents, roles, responsibilities, and workload context.', 'ph-users-three', 6, '["people.directory"]'::jsonb),
    ('07-finanse', '07 Finance', 'Revenue, costs, budgets, invoices, and commercial exceptions.', 'ph-bank', 7, '[]'::jsonb),
    ('08-zasoby', '08 Assets', 'Files, folders, resources, repositories, prompts, and knowledge roots.', 'ph-folder-open', 8, '["assets.overview","assets.files"]'::jsonb),
    ('09-technologia', '09 Technology', 'Code, infrastructure, deployments, integrations, and technical health.', 'ph-cpu', 9, '[]'::jsonb),
    ('10-prawo', '10 Legal', 'Contracts, compliance, approvals, and legal risk control.', 'ph-scales', 10, '[]'::jsonb),
    ('11-innowacje', '11 Innovation', 'Research, experiments, discovery, and improvement portfolio.', 'ph-lightbulb', 11, '[]'::jsonb),
    ('12-zarzadzanie', '12 Management', 'Executive control, department administration, approvals, and portfolio steering.', 'ph-chart-line-up', 12, '["management.departments","management.approvals","management.portfolio","management.kpis","management.escalations","management.reviews"]'::jsonb)
)
INSERT INTO "workspace_departments" (
  "id",
  "workspace_id",
  "key",
  "name",
  "description",
  "icon",
  "position",
  "is_system",
  "linked_views",
  "created_at",
  "updated_at"
)
SELECT (
  substr(md5(w."id"::text || ':workspace-department:' || department_catalog.key), 1, 8) || '-' ||
  substr(md5(w."id"::text || ':workspace-department:' || department_catalog.key), 9, 4) || '-' ||
  substr(md5(w."id"::text || ':workspace-department:' || department_catalog.key), 13, 4) || '-' ||
  substr(md5(w."id"::text || ':workspace-department:' || department_catalog.key), 17, 4) || '-' ||
  substr(md5(w."id"::text || ':workspace-department:' || department_catalog.key), 21, 12)
)::uuid,
w."id",
department_catalog.key,
department_catalog.name,
department_catalog.description,
department_catalog.icon,
department_catalog.position,
true,
department_catalog.linked_views,
CURRENT_TIMESTAMP,
CURRENT_TIMESTAMP
FROM "workspaces" w
CROSS JOIN department_catalog
ON CONFLICT ("workspace_id", "key") DO NOTHING;
