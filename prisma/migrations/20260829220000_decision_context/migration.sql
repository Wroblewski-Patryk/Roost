ALTER TABLE "decisions"
  ADD COLUMN "context" TEXT,
  ADD COLUMN "problem" TEXT,
  ADD COLUMN "decision" TEXT,
  ADD COLUMN "alternatives" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "consequences" TEXT,
  ADD COLUMN "author_type" TEXT,
  ADD COLUMN "author_id" TEXT,
  ADD COLUMN "supersedes_id" UUID;

CREATE INDEX "decisions_workspace_id_supersedes_id_idx" ON "decisions"("workspace_id", "supersedes_id");
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
