ALTER TABLE "agent_executions"
  ADD COLUMN "checkpoint" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "checkpoint_version" INTEGER NOT NULL DEFAULT 0;
