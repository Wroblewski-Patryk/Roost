ALTER TABLE "tasks"
  ADD COLUMN "owner_user_id" UUID,
  ADD COLUMN "assigned_workforce_entity_id" UUID,
  ADD COLUMN "reviewer_user_id" UUID,
  ADD COLUMN "start_date" TIMESTAMP(3),
  ADD COLUMN "estimated_end_date" TIMESTAMP(3),
  ADD COLUMN "estimated_duration_minutes" INTEGER,
  ADD COLUMN "recurrence_rule" TEXT;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_assigned_workforce_entity_id_fkey"
  FOREIGN KEY ("assigned_workforce_entity_id") REFERENCES "workforce_entities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_reviewer_user_id_fkey"
  FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tasks_workspace_id_owner_user_id_idx"
  ON "tasks"("workspace_id", "owner_user_id");

CREATE INDEX "tasks_workspace_id_assigned_workforce_entity_id_idx"
  ON "tasks"("workspace_id", "assigned_workforce_entity_id");

CREATE INDEX "tasks_workspace_id_reviewer_user_id_idx"
  ON "tasks"("workspace_id", "reviewer_user_id");

CREATE INDEX "tasks_workspace_id_start_date_idx"
  ON "tasks"("workspace_id", "start_date");
