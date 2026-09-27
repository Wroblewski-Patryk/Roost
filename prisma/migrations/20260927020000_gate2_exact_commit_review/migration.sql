BEGIN;

-- Historical review snapshots retain their original material shape. Only new
-- lease-bound completion receipts opt into the exact revision/checkpoint seal.
CREATE OR REPLACE FUNCTION task_review_material(e agent_executions) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('executionId',e.id,'taskId',e.task_id,'applicationId',e.application_id,'attempt',e.attempt,
  'completedAt',e.completed_at,'summary',e.summary,'finalResponse',e.final_response,'changedFiles',e.changed_files,
  'verification',e.verification,'contract',e.metadata->'executionContract','pin',e.metadata->'readyContextPin')
  || CASE WHEN e.metadata->>'resultRevisionReviewVersion'='1'
    THEN jsonb_build_object('resultRevision',e.metadata->'resultRevision','checkpointVersion',e.checkpoint_version,'checkpoint',e.checkpoint)
    ELSE '{}'::jsonb END;
$$;

-- The API checks the same conditions before insert; this trigger also protects
-- the authoritative review table from an accidental alternate write path.
CREATE FUNCTION task_review_exact_commit_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE e agent_executions; r JSONB;
BEGIN
 IF TG_OP <> 'INSERT' OR NEW.decision <> 'approve' THEN RETURN NEW; END IF;
 SELECT * INTO e FROM agent_executions WHERE id=NEW.execution_id AND workspace_id=NEW.workspace_id AND task_id=NEW.task_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'task_review_exact_commit_required'; END IF;
 r:=e.metadata->'resultRevision';
 IF e.metadata->>'resultRevisionReviewVersion' IS DISTINCT FROM '1'
  OR e.agent_host_id IS NULL OR e.status<>'completed' OR e.context_invalidated_at IS NOT NULL
  OR r->>'schemaVersion' IS DISTINCT FROM 'roost-result-revision-v1'
  OR COALESCE(r->>'commit','') !~ '^[a-f0-9]{40}$'
  OR r->>'branch' IS DISTINCT FROM e.metadata->'executionContract'->'singleTask'->>'branch'
  OR r->>'workingTree' IS DISTINCT FROM 'clean'
  OR r->>'executionId' IS DISTINCT FROM e.id::text
  OR r->>'attempt' IS DISTINCT FROM e.attempt::text
  OR r->>'hostId' IS DISTINCT FROM e.agent_host_id::text
  OR r->>'checkpointVersion' IS DISTINCT FROM e.checkpoint_version::text
  OR NEW.evidence->>'reviewedCommit' IS DISTINCT FROM r->>'commit'
  OR NEW.snapshot->'result'->'resultRevision' IS DISTINCT FROM r
  OR NEW.snapshot->'result'->>'checkpointVersion' IS DISTINCT FROM e.checkpoint_version::text
  THEN RAISE EXCEPTION 'task_review_exact_commit_required'; END IF;
 IF jsonb_typeof(NEW.evidence->'evidence') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'task_review_test_evidence_required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.evidence->'evidence') item
  WHERE item->>'kind'='test' AND item->>'verdict'='pass'
  AND length(COALESCE(item->>'reference',''))>=3 AND length(COALESCE(item->>'result',''))>=3)
  THEN RAISE EXCEPTION 'task_review_test_evidence_required'; END IF;
 RETURN NEW;
END $$;

CREATE TRIGGER task_review_exact_commit_guard BEFORE INSERT ON task_review_decisions
 FOR EACH ROW EXECUTE FUNCTION task_review_exact_commit_guard();

COMMIT;
