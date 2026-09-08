CREATE TYPE "AgentHostStatus" AS ENUM ('online', 'offline', 'disabled');
CREATE TYPE "AgentExecutionStatus" AS ENUM ('queued', 'claimed', 'running', 'waiting_for_approval', 'completed', 'failed', 'cancelled');

ALTER TABLE "workforce_entities" RENAME COLUMN "paperclip_agent_id" TO "runtime_external_id";
ALTER TABLE "workforce_entities" RENAME COLUMN "paperclip_profile" TO "runtime_profile";

UPDATE "workforce_entities"
SET "source" = 'retired_runtime',
    "status" = 'archived',
    "synchronization_enabled" = FALSE,
    "sync_status" = 'stale',
    "runtime_external_id" = NULL,
    "runtime_profile" = (COALESCE("runtime_profile", '{}'::jsonb) - 'url' - 'scrapeDate')
      || jsonb_build_object('provider', 'retired', 'runtimeStatus', 'not_linked')
WHERE "source" = 'paperclip';

CREATE TABLE "agent_hosts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "AgentHostStatus" NOT NULL DEFAULT 'offline',
    "platform" TEXT NOT NULL,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "application_slugs" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_hosts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_executions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "agent_host_id" UUID,
    "status" "AgentExecutionStatus" NOT NULL DEFAULT 'queued',
    "requested_by_type" "ActorType" NOT NULL,
    "requested_by_id" TEXT,
    "prompt" TEXT,
    "base_branch" TEXT,
    "codex_thread_id" TEXT,
    "lease_token" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "last_heartbeat_at" TIMESTAMP(3),
    "cancel_requested_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "final_response" TEXT,
    "changed_files" JSONB NOT NULL DEFAULT '[]',
    "verification" JSONB NOT NULL DEFAULT '{}',
    "usage" JSONB NOT NULL DEFAULT '{}',
    "error_state" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_execution_events" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_execution_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_hosts_workspace_id_slug_key" ON "agent_hosts"("workspace_id", "slug");
CREATE INDEX "agent_hosts_workspace_id_status_last_seen_at_idx" ON "agent_hosts"("workspace_id", "status", "last_seen_at");
CREATE UNIQUE INDEX "agent_executions_lease_token_key" ON "agent_executions"("lease_token");
CREATE INDEX "agent_executions_workspace_id_status_created_at_idx" ON "agent_executions"("workspace_id", "status", "created_at");
CREATE INDEX "agent_executions_workspace_id_task_id_created_at_idx" ON "agent_executions"("workspace_id", "task_id", "created_at");
CREATE INDEX "agent_executions_workspace_id_application_id_created_at_idx" ON "agent_executions"("workspace_id", "application_id", "created_at");
CREATE INDEX "agent_executions_agent_host_id_status_idx" ON "agent_executions"("agent_host_id", "status");
CREATE INDEX "agent_execution_events_workspace_id_execution_id_created_at_idx" ON "agent_execution_events"("workspace_id", "execution_id", "created_at");

ALTER TABLE "agent_hosts" ADD CONSTRAINT "agent_hosts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agent_host_id_fkey" FOREIGN KEY ("agent_host_id") REFERENCES "agent_hosts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_execution_events" ADD CONSTRAINT "agent_execution_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_execution_events" ADD CONSTRAINT "agent_execution_events_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Installation-specific data bootstrap removed from the public distribution.
-- Already-applied migrations and existing application data are not replayed or deleted.
