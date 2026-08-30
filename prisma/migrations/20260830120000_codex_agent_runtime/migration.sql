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

-- Register the canonical application portfolio in every existing workspace.
-- This migration creates definitions and links only; it creates no tasks or executions.
INSERT INTO "applications" ("id", "workspace_id", "name", "slug", "description", "innovation_stage", "frontend_url", "source", "metadata", "created_at", "updated_at")
SELECT gen_random_uuid(), workspace."id", app."name", app."slug", app."description", 'development'::"InnovationLifecycleStage", app."deployment_url", 'import'::"EvidenceSource",
  jsonb_build_object(
    'localWorkspaceRoot', 'C:\Personal\Projekty\Aplikacje',
    'localDirectory', app."directory",
    'repositoryUrl', app."repository_url",
    'deploymentUrl', app."deployment_url",
    'deploymentProvider', 'coolify',
    'deploymentTrigger', 'owner_authorized_git_push',
    'releaseAuthority', 'explicit_owner_authorization',
    'codexExecutionLocation', 'local_windows'
  ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "workspaces" workspace
CROSS JOIN (VALUES
  ('aviary', 'Aviary', 'LuckySparrow application maintained in the approved local application workspace.', 'Aviary', 'https://github.com/Wroblewski-Patryk/Aviary.git', 'https://aviary.luckysparrow.ch/'),
  ('featherly', 'Featherly', 'Content management and application delivery system.', 'Featherly', 'https://github.com/Wroblewski-Patryk/Featherly.git', 'https://test.wroblewskipatryk.pl/pl'),
  ('nest', 'Nest', 'LuckySparrow application maintained in the approved local application workspace.', 'Nest', 'https://github.com/Wroblewski-Patryk/Nest.git', 'https://nest.luckysparrow.ch/'),
  ('roost', 'Roost', 'LuckySparrow company operating system and source of truth for products, work, evidence and supervised agents.', 'Roost', 'https://github.com/Wroblewski-Patryk/Roost.git', 'https://roost.luckysparrow.ch/'),
  ('soar', 'Soar', 'Trading automation platform.', 'Soar', 'https://github.com/Wroblewski-Patryk/Soar.git', 'https://soar.luckysparrow.ch/')
) AS app("slug", "name", "description", "directory", "repository_url", "deployment_url")
ON CONFLICT ("workspace_id", "slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "frontend_url" = EXCLUDED."frontend_url",
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "applications"
SET "frontend_url" = CASE "slug"
      WHEN 'aviary' THEN 'https://aviary.luckysparrow.ch/'
      WHEN 'featherly' THEN 'https://test.wroblewskipatryk.pl/pl'
      WHEN 'nest' THEN 'https://nest.luckysparrow.ch/'
      WHEN 'roost' THEN 'https://roost.luckysparrow.ch/'
      WHEN 'soar' THEN 'https://soar.luckysparrow.ch/'
    END,
    "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
      'localWorkspaceRoot', 'C:\Personal\Projekty\Aplikacje',
      'localDirectory', CASE "slug"
        WHEN 'aviary' THEN 'Aviary'
        WHEN 'featherly' THEN 'Featherly'
        WHEN 'nest' THEN 'Nest'
        WHEN 'roost' THEN 'Roost'
        WHEN 'soar' THEN 'Soar'
      END,
      'repositoryUrl', CASE "slug"
        WHEN 'aviary' THEN 'https://github.com/Wroblewski-Patryk/Aviary.git'
        WHEN 'featherly' THEN 'https://github.com/Wroblewski-Patryk/Featherly.git'
        WHEN 'nest' THEN 'https://github.com/Wroblewski-Patryk/Nest.git'
        WHEN 'roost' THEN 'https://github.com/Wroblewski-Patryk/Roost.git'
        WHEN 'soar' THEN 'https://github.com/Wroblewski-Patryk/Soar.git'
      END,
      'deploymentUrl', CASE "slug"
        WHEN 'aviary' THEN 'https://aviary.luckysparrow.ch/'
        WHEN 'featherly' THEN 'https://test.wroblewskipatryk.pl/pl'
        WHEN 'nest' THEN 'https://nest.luckysparrow.ch/'
        WHEN 'roost' THEN 'https://roost.luckysparrow.ch/'
        WHEN 'soar' THEN 'https://soar.luckysparrow.ch/'
      END,
      'deploymentProvider', 'coolify',
      'deploymentTrigger', 'owner_authorized_git_push',
      'releaseAuthority', 'explicit_owner_authorization',
      'codexExecutionLocation', 'local_windows'
    )
WHERE "slug" IN ('aviary', 'featherly', 'nest', 'roost', 'soar');

INSERT INTO "application_repositories" ("id", "application_id", "name", "url", "default_branch", "purpose", "is_primary", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "name" || ' repository',
  CASE "slug"
    WHEN 'aviary' THEN 'https://github.com/Wroblewski-Patryk/Aviary.git'
    WHEN 'featherly' THEN 'https://github.com/Wroblewski-Patryk/Featherly.git'
    WHEN 'nest' THEN 'https://github.com/Wroblewski-Patryk/Nest.git'
    WHEN 'roost' THEN 'https://github.com/Wroblewski-Patryk/Roost.git'
    WHEN 'soar' THEN 'https://github.com/Wroblewski-Patryk/Soar.git'
  END,
  'main', 'Canonical application source', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "applications"
WHERE "slug" IN ('aviary', 'featherly', 'nest', 'roost', 'soar')
ON CONFLICT ("application_id", "url") DO UPDATE SET
  "name" = EXCLUDED."name",
  "default_branch" = EXCLUDED."default_branch",
  "purpose" = EXCLUDED."purpose",
  "is_primary" = TRUE,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "projects" ("id", "workspace_id", "name", "description", "status", "external_id", "source", "created_at", "updated_at")
SELECT gen_random_uuid(), application."workspace_id", application."name" || ' application delivery',
  'Canonical project for planning and delivering ' || application."name" || '. Tasks linked here resolve to exactly one application for supervised Codex execution.',
  'active', 'application-delivery:' || application."slug", 'companycore', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "applications" application
WHERE application."slug" IN ('aviary', 'featherly', 'nest', 'roost', 'soar')
  AND NOT EXISTS (
    SELECT 1 FROM "projects" project
    WHERE project."workspace_id" = application."workspace_id"
      AND project."source" = 'companycore'
      AND project."external_id" = 'application-delivery:' || application."slug"
  );

INSERT INTO "application_projects" ("application_id", "project_id", "relation_type", "created_at")
SELECT application."id", project."id", 'delivery', CURRENT_TIMESTAMP
FROM "applications" application
JOIN "projects" project ON project."workspace_id" = application."workspace_id"
  AND project."source" = 'companycore'
  AND project."external_id" = 'application-delivery:' || application."slug"
WHERE application."slug" IN ('aviary', 'featherly', 'nest', 'roost', 'soar')
ON CONFLICT ("application_id", "project_id") DO UPDATE SET "relation_type" = 'delivery';

INSERT INTO "automation_rules" ("id", "workspace_id", "name", "description", "condition", "action", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), workspace."id", 'Prepare Codex candidate after explicit task readiness',
  'Foundation-only rule. It may emit a Codex candidate event after an explicit readiness event; it never creates a task or execution.',
  '{"eventType":"task_ready_for_codex","resourceType":"task"}'::jsonb,
  '{"type":"emit_event","eventType":"codex_execution_candidate","riskLevel":"medium","payload":{"requiresOwnerReview":true}}'::jsonb,
  'paused'::"AutomationRuleStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "workspaces" workspace
ON CONFLICT ("workspace_id", "name") DO UPDATE SET
  "description" = EXCLUDED."description", "condition" = EXCLUDED."condition", "action" = EXCLUDED."action", "status" = 'paused'::"AutomationRuleStatus", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "triggers" ("id", "workspace_id", "automation_rule_id", "source_type", "event_type", "config", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), rule."workspace_id", rule."id", 'system_event'::"TriggerType", 'task_ready_for_codex',
  '{"mode":"foundation_only","createsExecution":false}'::jsonb, 'paused'::"OperatingStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "automation_rules" rule
WHERE rule."name" = 'Prepare Codex candidate after explicit task readiness'
  AND NOT EXISTS (
    SELECT 1 FROM "triggers" trigger
    WHERE trigger."workspace_id" = rule."workspace_id"
      AND trigger."automation_rule_id" = rule."id"
      AND trigger."source_type" = 'system_event'::"TriggerType"
      AND trigger."event_type" = 'task_ready_for_codex'
  );
