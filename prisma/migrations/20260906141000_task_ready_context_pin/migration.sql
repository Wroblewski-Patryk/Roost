-- Additive, nullable and intentionally unbackfilled. Legacy tasks are not Ready.
ALTER TABLE "tasks" ADD COLUMN "execution_readiness" JSONB;
