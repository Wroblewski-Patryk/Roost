-- Additive, Roost-native procedure runs. Existing company records are untouched.
CREATE TABLE "procedure_runs" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "procedure_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "launched_by_user_id" UUID NOT NULL,
  "preview_digest" TEXT NOT NULL,
  "procedure_family_id" UUID NOT NULL,
  "procedure_version" INTEGER NOT NULL,
  "procedure_name" TEXT NOT NULL,
  "procedure_updated_at" TIMESTAMP(3) NOT NULL,
  "project_name" TEXT NOT NULL,
  "owner_role_name" TEXT NOT NULL,
  "input_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "procedure_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "procedure_runs_workspace_id_request_id_key" ON "procedure_runs"("workspace_id", "request_id");
CREATE UNIQUE INDEX "procedure_runs_workspace_id_procedure_family_id_project_id_key" ON "procedure_runs"("workspace_id", "procedure_family_id", "project_id");
CREATE INDEX "procedure_runs_workspace_id_created_at_idx" ON "procedure_runs"("workspace_id", "created_at");
ALTER TABLE "procedure_runs" ADD CONSTRAINT "procedure_runs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedure_runs" ADD CONSTRAINT "procedure_runs_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedure_runs" ADD CONSTRAINT "procedure_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "procedure_run_steps" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "procedure_step_id" UUID NOT NULL,
  "step_order" INTEGER NOT NULL,
  "instruction" TEXT NOT NULL,
  "step_type" "ProcedureStepType" NOT NULL,
  "expected_input" JSONB NOT NULL,
  "expected_output" JSONB NOT NULL,
  "validation_rule" JSONB NOT NULL,
  "rollback_instruction" TEXT,
  "task_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "procedure_run_steps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "procedure_run_steps_task_id_key" ON "procedure_run_steps"("task_id");
CREATE UNIQUE INDEX "procedure_run_steps_run_id_step_order_key" ON "procedure_run_steps"("run_id", "step_order");
ALTER TABLE "procedure_run_steps" ADD CONSTRAINT "procedure_run_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "procedure_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedure_run_steps" ADD CONSTRAINT "procedure_run_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "procedure_run_step_outcomes" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "run_step_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "request_hash" TEXT NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "decision" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "procedure_run_step_outcomes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "procedure_run_step_outcomes_decision_check" CHECK ("decision" IN ('accept','exception'))
);
CREATE UNIQUE INDEX "procedure_run_step_outcomes_workspace_id_request_id_key" ON "procedure_run_step_outcomes"("workspace_id", "request_id");
CREATE INDEX "procedure_run_step_outcomes_run_step_id_created_at_idx" ON "procedure_run_step_outcomes"("run_step_id", "created_at");
ALTER TABLE "procedure_run_step_outcomes" ADD CONSTRAINT "procedure_run_step_outcomes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedure_run_step_outcomes" ADD CONSTRAINT "procedure_run_step_outcomes_run_step_id_fkey" FOREIGN KEY ("run_step_id") REFERENCES "procedure_run_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
