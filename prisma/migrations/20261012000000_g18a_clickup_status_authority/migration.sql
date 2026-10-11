CREATE TABLE "clickup_status_states" (
  "task_id" UUID NOT NULL PRIMARY KEY,
  "workspace_id" UUID NOT NULL,
  "external_list_id" TEXT NOT NULL,
  "provider_status" "TaskStatus" NOT NULL,
  "provider_status_name" TEXT,
  "provider_updated_at" TIMESTAMP(3),
  "provider_error_code" TEXT,
  "signed_inbox_id" UUID,
  "actor_provider_user_id" TEXT,
  "actor_verification" TEXT NOT NULL DEFAULT 'unverified',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clickup_status_states_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "clickup_status_states_workspace_id_external_list_id_idx" ON "clickup_status_states"("workspace_id", "external_list_id");

CREATE TABLE "clickup_status_intents" (
  "id" UUID NOT NULL PRIMARY KEY,
  "workspace_id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "external_task_id" TEXT NOT NULL,
  "external_list_id" TEXT NOT NULL,
  "requester_user_id" UUID,
  "base_status" "TaskStatus" NOT NULL,
  "requested_status" "TaskStatus" NOT NULL,
  "state" TEXT NOT NULL,
  "comment_id" TEXT,
  "error_code" TEXT,
  "signed_inbox_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clickup_status_intents_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "clickup_status_intents_workspace_id_task_id_created_at_idx" ON "clickup_status_intents"("workspace_id", "task_id", "created_at");
CREATE UNIQUE INDEX "clickup_status_intents_one_open_per_task" ON "clickup_status_intents"("task_id") WHERE "state" IN ('posting', 'awaiting_provider', 'uncertain', 'conflict');
