BEGIN;

-- Completed native evidence remains historical truth. A separate append-only
-- record can bind an unchanged, unreviewed candidate to a newly validated Ready.
CREATE TABLE completed_result_basis_revalidations (
 sequence BIGSERIAL UNIQUE NOT NULL,
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE RESTRICT,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 original_pin_id UUID NOT NULL,
 original_revision TEXT NOT NULL CHECK(original_revision ~ '^[a-f0-9]{64}$'),
 original_material_version TEXT NOT NULL CHECK(original_material_version ~ '^[a-f0-9]{64}$'),
 ready_pin_id UUID NOT NULL,
 ready_revision TEXT NOT NULL CHECK(ready_revision ~ '^[a-f0-9]{64}$'),
 ready_pin_digest TEXT NOT NULL CHECK(ready_pin_digest ~ '^[a-f0-9]{64}$'),
 ready_pin JSONB NOT NULL,
 commit TEXT NOT NULL CHECK(commit ~ '^[a-f0-9]{40}$'),
 request_id UUID NOT NULL,
 request_hash TEXT NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,request_id), UNIQUE(execution_id,ready_pin_id)
);

CREATE FUNCTION task_review_material_original(e agent_executions) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('executionId',e.id,'taskId',e.task_id,'applicationId',e.application_id,'attempt',e.attempt,
  'completedAt',e.completed_at,'summary',e.summary,'finalResponse',e.final_response,'changedFiles',e.changed_files,
  'verification',e.verification,'contract',e.metadata->'executionContract','pin',e.metadata->'readyContextPin')
  || CASE WHEN e.metadata->>'resultRevisionReviewVersion'='1'
    THEN jsonb_build_object('resultRevision',e.metadata->'resultRevision','checkpointVersion',e.checkpoint_version,'checkpoint',e.checkpoint)
    ELSE '{}'::jsonb END;
$$;

CREATE FUNCTION completed_result_basis_current(e agent_executions) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT COALESCE((SELECT e.status='completed' AND e.completed_at IS NOT NULL AND e.context_invalidated_at IS NULL
  AND r.workspace_id=e.workspace_id AND r.task_id=e.task_id
  AND r.original_pin_id::text=e.metadata->'readyContextPin'->>'pinId'
  AND r.original_revision=e.metadata->'readyContextPin'->>'revision'
  AND r.original_material_version=encode(sha256(convert_to(task_review_material_original(e)::text,'UTF8')),'hex')
  AND r.commit=e.metadata->'resultRevision'->>'commit'
  AND t.execution_readiness=r.ready_pin
  AND t.execution_readiness->>'status'='ready'
  AND r.ready_pin_digest=encode(sha256(convert_to(t.execution_readiness::text,'UTF8')),'hex')
  AND r.ready_pin_id::text=t.execution_readiness->>'pinId' AND r.ready_revision=t.execution_readiness->>'revision'
  FROM completed_result_basis_revalidations r JOIN tasks t ON t.id=r.task_id
  WHERE r.execution_id=e.id ORDER BY r.sequence DESC LIMIT 1),false);
$$;

-- No-record executions retain their exact historical material shape and hash.
-- Every new mapping changes review material; no previous approval carries over.
CREATE OR REPLACE FUNCTION task_review_material(e agent_executions) RETURNS JSONB LANGUAGE sql STABLE AS $$
 SELECT task_review_material_original(e) || COALESCE((SELECT jsonb_build_object('basisRevalidation',
  jsonb_build_object('id',r.id,'originalPinId',r.original_pin_id,'originalRevision',r.original_revision,
   'originalMaterialVersion',r.original_material_version,'readyPinId',r.ready_pin_id,
   'readyRevision',r.ready_revision,'readyPinDigest',r.ready_pin_digest,'commit',r.commit,
   'actorUserId',r.actor_user_id,'createdAt',r.created_at))
  FROM completed_result_basis_revalidations r WHERE r.execution_id=e.id ORDER BY sequence DESC LIMIT 1),'{}'::jsonb);
$$;

CREATE FUNCTION completed_result_basis_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; p JSONB; a JSONB; c JSONB; revision JSONB;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'completed_result_basis_append_only'; END IF;
 UPDATE ready_source_fence AS fence SET revision=fence.revision+1 WHERE fence.id=1;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 SELECT * INTO e FROM agent_executions WHERE task_id=NEW.task_id AND workspace_id=NEW.workspace_id
  ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 p:=t.execution_readiness; revision:=e.metadata->'resultRevision';
 IF t.id IS NULL OR e.id IS DISTINCT FROM NEW.execution_id OR e.status<>'completed' OR e.completed_at IS NULL
  OR e.context_invalidated_at IS NOT NULL OR EXISTS(SELECT 1 FROM task_review_decisions WHERE execution_id=e.id)
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
CREATE TRIGGER completed_result_basis_guard BEFORE INSERT OR UPDATE OR DELETE ON completed_result_basis_revalidations
 FOR EACH ROW EXECUTE FUNCTION completed_result_basis_guard();

CREATE FUNCTION completed_result_native_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM completed_result_basis_revalidations WHERE execution_id=OLD.id)
  AND (TG_OP='DELETE' OR task_review_material_original(NEW) IS DISTINCT FROM task_review_material_original(OLD)
   OR NEW.status IS DISTINCT FROM OLD.status OR NEW.task_id IS DISTINCT FROM OLD.task_id
   OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.agent_host_id IS DISTINCT FROM OLD.agent_host_id
   OR NEW.prompt IS DISTINCT FROM OLD.prompt OR NEW.base_branch IS DISTINCT FROM OLD.base_branch
   OR OLD.context_invalidated_at IS NOT NULL AND NEW.context_invalidated_at IS DISTINCT FROM OLD.context_invalidated_at)
  THEN RAISE EXCEPTION 'completed_result_native_immutable'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER completed_result_native_immutable BEFORE UPDATE OR DELETE ON agent_executions
 FOR EACH ROW EXECUTE FUNCTION completed_result_native_immutable();

CREATE OR REPLACE FUNCTION task_review_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t tasks; e agent_executions; d task_review_decisions; w workforce_entities; r JSONB; expected_role TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'task_review_append_only'; END IF;
 SELECT * INTO t FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'task_review_workspace_mismatch'; END IF;
 SELECT * INTO e FROM agent_executions WHERE task_id=t.id AND workspace_id=NEW.workspace_id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR e.status <> 'completed' OR e.context_invalidated_at IS NOT NULL OR e.completed_at IS NULL THEN RAISE EXCEPTION 'task_review_result_required'; END IF;
 r := e.metadata->'executionContract'->'taskRoles';
 IF (t.execution_readiness->>'pinId' IS DISTINCT FROM e.metadata->'readyContextPin'->>'pinId'
  OR t.execution_readiness->>'revision' IS DISTINCT FROM e.metadata->'readyContextPin'->>'revision')
  AND NOT completed_result_basis_current(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF NEW.execution_id<>e.id OR NEW.snapshot->'result' IS DISTINCT FROM task_review_material(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;
   IF NEW.verifier_id::text IS DISTINCT FROM r->'verifier'->>'id' OR NEW.manager_id::text IS DISTINCT FROM r->'accountableManager'->>'id' THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
   IF jsonb_typeof(NEW.evidence->'evidence') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'evidence')=0 OR length(COALESCE(NEW.evidence->>'summary',''))<3 THEN RAISE EXCEPTION 'task_review_evidence_required'; END IF;
   IF NEW.decision='reject' AND (jsonb_typeof(NEW.evidence->'reproduction') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'reproduction')=0 OR length(COALESCE(NEW.evidence->>'expected',''))<3 OR length(COALESCE(NEW.evidence->>'observed',''))<3 OR jsonb_typeof(NEW.evidence->'correction'->'scope') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.evidence->'correction'->'scope')=0) THEN RAISE EXCEPTION 'task_review_evidence_required'; END IF;
   SELECT * INTO w FROM workforce_entities WHERE id=NEW.verifier_id AND workspace_id=NEW.workspace_id;
   expected_role := 'verifier';
 ELSE
   SELECT * INTO d FROM task_review_decisions WHERE id=NEW.review_id AND task_id=t.id AND workspace_id=NEW.workspace_id;
   IF NOT FOUND OR d.decision<>'reject' OR d.execution_id<>e.id OR d.snapshot->'result' IS DISTINCT FROM task_review_material(e) THEN RAISE EXCEPTION 'task_review_stale'; END IF;
   IF NEW.manager_id<>d.manager_id THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
   IF NOT ((d.evidence->'correction'->'scope') @> (NEW.correction->'scope')) OR
    (NEW.correction - 'scope' - 'competencies' - 'managerCompetencyRationale') IS DISTINCT FROM ((d.evidence->'correction') - 'scope' - 'competencies')
    THEN RAISE EXCEPTION 'task_review_scope_expanded'; END IF;
   IF jsonb_typeof(NEW.correction->'competencies') IS DISTINCT FROM 'array'
    THEN RAISE EXCEPTION 'task_review_competencies_expanded'; END IF;
   IF NEW.action='return_to_executor' THEN
     IF jsonb_array_length(NEW.correction->'competencies')=0 OR
      NOT ((COALESCE(d.evidence->'correction'->'competencies','[]'::jsonb) ||
       COALESCE(e.metadata->'executionContract'->'assignment'->'competencies','[]'::jsonb)) @> (NEW.correction->'competencies')) OR
      (NOT ((d.evidence->'correction'->'competencies') @> (NEW.correction->'competencies')) AND
       length(trim(COALESCE(NEW.correction->>'managerCompetencyRationale','')))<3)
      THEN RAISE EXCEPTION 'task_review_competencies_expanded'; END IF;
   ELSIF NEW.correction->'competencies' IS DISTINCT FROM d.evidence->'correction'->'competencies'
    THEN RAISE EXCEPTION 'task_review_competencies_expanded'; END IF;
   SELECT * INTO w FROM workforce_entities WHERE id=NEW.manager_id AND workspace_id=NEW.workspace_id;
   expected_role := 'accountableManager';
 END IF;
 IF w.id IS NULL OR w.status<>'active' OR length(COALESCE(w.role,''))=0 OR
   w.id::text IS DISTINCT FROM r->expected_role->>'id' OR
   to_char(w.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM r->expected_role->>'revision' OR
   NOT (
    (NEW.actor_user_id IS NOT NULL AND w.type='human' AND w.source='user' AND w.external_id=NEW.actor_user_id::text AND EXISTS (SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.actor_user_id AND m.role IN ('owner','admin','member'))) OR
    (NEW.actor_user_id IS NULL AND w.type='agent' AND w.source<>'user' AND NEW.actor_agent_id=w.id AND EXISTS (
      SELECT 1 FROM api_keys k WHERE k.id=NEW.actor_credential_id AND k.workspace_id=NEW.workspace_id AND k.bound_agent_id=w.id AND k.active AND k.revoked_at IS NULL AND k.expires_at>clock_timestamp()
      AND k.key_prefix=NEW.actor_credential_prefix AND k.scopes @> '["agent-runtime:write"]'::jsonb))
   ) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF NOT (w.authority_scope @> jsonb_build_array(CASE WHEN expected_role='verifier' THEN 'task_verification' ELSE 'task_accountability' END)) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 IF TG_TABLE_NAME='task_review_decisions' THEN
   IF t.execution_role_provenance IS NULL OR t.execution_role_provenance->'authors' @> jsonb_build_array(jsonb_build_object('kind',CASE WHEN NEW.actor_user_id IS NULL THEN 'agent' ELSE 'user' END,'id',COALESCE(NEW.actor_user_id,NEW.actor_agent_id)::text)) THEN RAISE EXCEPTION 'task_review_self_review'; END IF;
   IF NOT (w.skill_index @> (e.metadata->'executionContract'->'assignment'->'competencies')) THEN RAISE EXCEPTION 'task_review_role_required'; END IF;
 END IF;
 RETURN NEW;
END $$;

COMMIT;
