BEGIN;

-- Preserve every immutable decision; uniqueness is per exact review material.
ALTER TABLE task_review_decisions DROP CONSTRAINT task_review_decisions_execution_id_key;
CREATE UNIQUE INDEX task_review_decisions_execution_id_material_version_key
 ON task_review_decisions(execution_id,material_version);

-- A stale approval cannot approve a newly accepted basis. Current approvals
-- remain protected, including a pin whose status became invalid. Rejections
-- always require governed correction, never owner basis relabeling.
CREATE FUNCTION completed_result_review_blocks_revalidation(e agent_executions)
 RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM task_review_decisions d JOIN tasks t ON t.id=e.task_id
  WHERE d.execution_id=e.id AND (d.decision='reject' OR (
   d.snapshot->'result'=task_review_material(e) AND (
    (t.execution_readiness->>'pinId'=e.metadata->'readyContextPin'->>'pinId'
     AND t.execution_readiness->>'revision'=e.metadata->'readyContextPin'->>'revision')
    OR EXISTS(SELECT 1 FROM completed_result_basis_revalidations r
     WHERE r.execution_id=e.id
      AND r.sequence=(SELECT max(sequence) FROM completed_result_basis_revalidations WHERE execution_id=e.id)
      AND t.execution_readiness->>'pinId'=r.ready_pin_id::text
      AND t.execution_readiness->>'revision'=r.ready_revision)))));
$$;

CREATE OR REPLACE FUNCTION completed_result_basis_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; p JSONB; a JSONB; c JSONB; revision JSONB;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'completed_result_basis_append_only'; END IF;
 UPDATE ready_source_fence AS fence SET revision=fence.revision+1 WHERE fence.id=1;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 SELECT * INTO e FROM agent_executions WHERE task_id=NEW.task_id AND workspace_id=NEW.workspace_id
  ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 p:=t.execution_readiness; revision:=e.metadata->'resultRevision';
 IF t.id IS NULL OR e.id IS DISTINCT FROM NEW.execution_id OR e.status<>'completed' OR e.completed_at IS NULL
  OR e.context_invalidated_at IS NOT NULL OR completed_result_review_blocks_revalidation(e)
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.actor_user_id AND role='owner')
  THEN RAISE EXCEPTION 'completed_result_basis_scope_invalid'; END IF;
 IF e.metadata->>'resultRevisionReviewVersion' IS DISTINCT FROM '1'
  OR revision->>'schemaVersion' IS DISTINCT FROM 'roost-result-revision-v1'
  OR revision->>'commit' IS DISTINCT FROM NEW.commit
  OR revision->>'branch' IS DISTINCT FROM e.metadata->'executionContract'->'singleTask'->>'branch'
  OR revision->>'workingTree' IS DISTINCT FROM 'clean'
  OR revision->>'executionId' IS DISTINCT FROM e.id::text OR revision->>'attempt' IS DISTINCT FROM e.attempt::text
  OR revision->>'hostId' IS DISTINCT FROM e.agent_host_id::text
  OR revision->>'checkpointVersion' IS DISTINCT FROM e.checkpoint_version::text
  OR e.metadata->'executionContract'->'nativeBoundary'->>'profile' IS DISTINCT FROM 'coding-local'
  OR e.metadata->'executionContract'->'modelSelection'->>'schemaVersion' IS DISTINCT FROM 'roost-managed-hermes-backend-v1'
  OR e.metadata->'executionContract'->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses'
  OR e.verification->'managedAdmission'->>'qualification' IS DISTINCT FROM 'signed_native_v1'
  OR COALESCE(e.verification->'managedAdmission'->>'evidenceDigest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(e.verification->'managedAdmission'->>'jobSourceDigest','') !~ '^[a-f0-9]{64}$'
  OR e.verification->'ownedTreeReceipt'->>'cleanup' IS DISTINCT FROM 'true'
  OR e.verification->'ownedTreeReceipt'->>'activeProcesses' IS DISTINCT FROM '0'
  OR e.verification->'ownedTreeReceipt'->>'attempt' IS DISTINCT FROM e.id::text
  OR e.verification->'codingTests'->>'passed' IS DISTINCT FROM 'true'
  OR e.verification->'nativeReviewReceipt'->>'verdict' IS DISTINCT FROM 'verified_candidate'
  OR e.verification->'nativeReviewReceipt'->>'version' IS DISTINCT FROM 'roost-native-review-public-v2'
  OR e.verification->'nativeReviewReceipt'->>'policy' IS DISTINCT FROM 'roost-root-scoped-coding-v2'
  OR e.verification->'nativeReviewReceipt'->>'verification' IS DISTINCT FROM 'PASS'
  OR e.verification->'nativeReviewReceipt'->>'installation' IS DISTINCT FROM 'PASS'
  OR e.verification->'nativeReviewReceipt'->'violations' IS DISTINCT FROM '[]'::jsonb
  OR e.verification->'nativeReviewReceipt'->>'reviewRequired' IS DISTINCT FROM 'true'
  OR e.verification->'nativeReviewReceipt'->>'releaseAllowed' IS DISTINCT FROM 'false'
  OR e.verification->'nativeReviewReceipt'->>'scopeReviewRequired' IS DISTINCT FROM 'false'
  OR e.verification->'nativeReviewReceipt'->>'postFootprintDigest' IS DISTINCT FROM e.verification->'nativeToolReceipt'->>'postFootprintDigest'
  OR e.verification->'nativeReviewReceipt'->>'jobDigest' IS DISTINCT FROM e.verification->'nativeToolReceipt'->>'jobReceiptDigest'
  OR e.verification->'nativeToolReceipt'->>'footprintPolicy' IS DISTINCT FROM 'roost-root-scoped-coding-v2'
  OR e.verification->'nativeToolReceipt'->>'policyVersion' IS DISTINCT FROM 'roost-hermes-native-audited-coding-v1'
  OR e.verification->'nativeToolReceipt'->>'ownerRiskReference' IS DISTINCT FROM 'ADR-004-v7-native-tools'
  OR e.verification->'nativeToolReceipt'->>'authorityProfile' IS DISTINCT FROM 'coding-local'
  OR e.verification->'nativeToolReceipt'->'authorities' IS DISTINCT FROM '["repository_read","repository_write","local_test"]'::jsonb
  OR e.verification->'nativeToolReceipt'->'toolsets' IS DISTINCT FROM '["file","terminal"]'::jsonb
  OR e.verification->'nativeToolReceipt'->>'classification' IS DISTINCT FROM 'review_required'
  OR e.verification->'nativeToolReceipt'->>'reviewRequired' IS DISTINCT FROM 'true'
  OR e.verification->'nativeToolReceipt'->>'releaseAllowed' IS DISTINCT FROM 'false'
  OR e.verification->'nativeToolReceipt'->>'scopeReviewRequired' IS DISTINCT FROM 'false'
  OR e.verification->'nativeToolReceipt'->'violations' IS DISTINCT FROM '[]'::jsonb
  OR COALESCE(e.verification->'nativeToolReceipt'->>'postFootprintDigest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(e.verification->'nativeToolReceipt'->>'jobReceiptDigest','') !~ '^[a-f0-9]{64}$'
  OR COALESCE(e.verification->>'nativeReviewReceiptDigest','') !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'completed_result_native_unproven'; END IF;
 IF NEW.original_pin_id::text IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId'
  OR NEW.original_revision IS DISTINCT FROM e.metadata->'readyContextPin'->>'revision'
  OR NEW.original_material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material_original(e)::text,'UTF8')),'hex')
  OR NEW.ready_pin IS DISTINCT FROM p OR NEW.ready_pin_id::text IS DISTINCT FROM p->>'pinId'
  OR NEW.ready_revision IS DISTINCT FROM p->>'revision'
  OR NEW.ready_pin_digest IS DISTINCT FROM encode(sha256(convert_to(p::text,'UTF8')),'hex')
  OR p->'contract' IS DISTINCT FROM e.metadata->'executionContract'
  OR p->>'applicationId' IS DISTINCT FROM e.application_id::text
  OR p->>'prompt' IS DISTINCT FROM e.prompt OR p->>'baseBranch' IS DISTINCT FROM e.base_branch
  OR p->>'riskAdmissionCommit' IS DISTINCT FROM e.metadata->'readyContextPin'->>'riskAdmissionCommit'
  OR p->>'status' IS DISTINCT FROM 'ready' OR p->>'schemaVersion' IS DISTINCT FROM 'roost-ready-context-v1'
  OR p->'validation'->>'validator' IS DISTINCT FROM 'execution-packet-v1'
  OR p->'validation'->>'revision' IS DISTINCT FROM p->>'revision'
  OR NEW.ready_pin_id=NEW.original_pin_id
  OR p->>'validatedAt' IS NULL OR (p->>'validatedAt')::timestamptz<e.completed_at
  THEN RAISE EXCEPTION 'completed_result_basis_stale'; END IF;
 a:=task_admission_view(t.id,'runtime_execute'); c:=task_composition(t.id,'runtime_execute');
 IF p->>'riskAssessmentId' IS DISTINCT FROM task_risk_current(t.id)::text
  OR p->>'riskAdmissionSeal' IS DISTINCT FROM a->>'seal' OR a->>'seal' IS NULL
  OR (a->>'expiresAt')::timestamptz<=clock_timestamp()
  OR p->'procedureComposition'->>'seal' IS DISTINCT FROM c->>'seal' OR c->>'seal' IS NULL
  OR NOT finding_task_current(t.id) OR task_interview_pending(t.id)
  OR native_capability_blocked(NEW.workspace_id,t.id,e.application_id,'runtime_execute',t.assigned_workforce_entity_id,NULL,e.agent_host_id)
  THEN RAISE EXCEPTION 'completed_result_current_context_required'; END IF;
 RETURN NEW;
END $$;

-- Keep all later risk/admission/suspension wrappers. Their original review
-- status delegate now considers only the current exact material.
CREATE OR REPLACE FUNCTION task_capability_status_before_risk(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE state TEXT;
BEGIN
 IF EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN RETURN 'consumed'; END IF;
 state:=task_capability_base(g);
 IF state NOT IN ('active','pending') THEN RETURN state; END IF;
 IF g.scope_hash IS DISTINCT FROM task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id) THEN RETURN 'invalidated'; END IF;
 IF g.operation='review_decision' THEN
  IF EXISTS(SELECT 1 FROM task_review_decisions d JOIN agent_executions e ON e.id=d.execution_id WHERE d.execution_id=g.execution_id AND d.snapshot->'result'=task_review_material(e)) THEN RETURN 'invalidated'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM task_review_decisions d WHERE d.execution_id=g.execution_id AND d.snapshot->'result'=(SELECT task_review_material(e) FROM agent_executions e WHERE e.id=g.execution_id) AND d.decision='reject' AND NOT EXISTS(SELECT 1 FROM task_review_actions a WHERE a.review_id=d.id)) THEN RETURN 'invalidated'; END IF;
 END IF;
 RETURN state;
END $$;

-- Scalar consumers must select the current material after reviews become a
-- history. Fail the migration if its known predecessor changed unexpectedly.
DO $$ DECLARE definition TEXT; old_clause TEXT; new_clause TEXT; BEGIN
 old_clause:='FROM task_review_decisions WHERE execution_id=e.id)';
 new_clause:='FROM task_review_decisions WHERE execution_id=e.id AND snapshot->''result''=task_review_material(e))';
 definition:=pg_get_functiondef('task_handoff_source(uuid)'::regprocedure);
 IF position(old_clause IN definition)=0 THEN RAISE EXCEPTION 'completed_review_handoff_baseline_invalid'; END IF;
 EXECUTE replace(definition,old_clause,new_clause);
 definition:=pg_get_functiondef('task_review_ready_guard()'::regprocedure);
 old_clause:='e.status=''completed'' AND rd.decision=''approve''';
 new_clause:=old_clause||' AND rd.snapshot->''result''=task_review_material(e)';
 IF position(old_clause IN definition)=0 THEN RAISE EXCEPTION 'completed_review_ready_baseline_invalid'; END IF;
 EXECUTE replace(definition,old_clause,new_clause);
END $$;

COMMIT;
