BEGIN;

-- Preserve the G24c ledger and its v1 command. This second kind closes only an
-- unaccepted, expired Worker rotation proposal; it never changes a credential.
ALTER TABLE decision_withdrawals
 ADD COLUMN kind TEXT NOT NULL DEFAULT 'managed_information_successor',
 ADD COLUMN impact_digest TEXT,
 ALTER COLUMN predecessor_id DROP NOT NULL;
ALTER TABLE decision_withdrawals ADD CONSTRAINT decision_withdrawals_kind_shape CHECK (
 (kind='managed_information_successor' AND predecessor_id IS NOT NULL AND impact_digest IS NULL)
 OR (kind='expired_worker_rotation' AND predecessor_id IS NULL AND impact_digest ~ '^[a-f0-9]{64}$')
);

CREATE FUNCTION decision_expired_worker_rotation_preview(w UUID,d UUID) RETURNS JSONB
 LANGUAGE plpgsql VOLATILE AS $$
DECLARE
 decision_row decisions; proposal decision_revisions; handoff worker_credential_handoffs;
 intent JSONB; impact_value JSONB; impact_out JSONB := NULL;
 task_states JSONB := '[]'::jsonb; handoff_out JSONB := NULL; blockers TEXT[] := ARRAY[]::TEXT[];
 handoff_id UUID; handoff_ref TEXT; operation_count BIGINT := 0; credential_count BIGINT := 0;
 execution_count BIGINT := 0; task_count BIGINT := 0; payload JSONB; digest_source JSONB;
BEGIN
 SELECT * INTO decision_row FROM decisions WHERE id=d AND workspace_id=w;
 SELECT * INTO proposal FROM decision_revisions WHERE decision_id=d AND workspace_id=w;
 IF decision_row.id IS NULL OR proposal.decision_id IS NULL THEN
  blockers:=array_append(blockers,'decision_not_found');
 ELSE
  IF decision_row.source IS DISTINCT FROM 'roost_decision' OR decision_row.status IS DISTINCT FROM 'proposed'
   OR proposal.version<>1 OR proposal.supersedes_id IS NOT NULL THEN
   blockers:=array_append(blockers,'wrong_intent');
  END IF;
  IF decision_state(d)='accepted' THEN blockers:=array_append(blockers,'accepted');
  ELSIF decision_state(d)<>'pending' THEN blockers:=array_append(blockers,'not_pending');END IF;
  intent:=proposal.body->'workerCredential';
  IF intent IS NULL OR intent->>'schemaVersion' IS DISTINCT FROM 'worker-credential-lifecycle-v1'
   OR intent->>'action' IS DISTINCT FROM 'rotate' OR intent->>'workspaceId' IS DISTINCT FROM w::text
   OR proposal.body ?| ARRAY['authority','workerTransport','workerBootstrap','workerIdentityLifecycle',
    'workerBootstrapIssuer','workerBootstrapProofKey','workerBootstrapProofAuthority',
    'workerBootstrapAdmissionV3','workerBootstrapChannel','managedRuntimeApproval',
    'firstWriteApproval','applicationBaseline','findingAdjudication'] THEN
   blockers:=array_append(blockers,'wrong_intent');
  END IF;
  IF intent IS NOT NULL THEN
   IF intent->>'validUntil' IS NULL THEN
    blockers:=array_append(blockers,'wrong_intent');
   ELSE
    BEGIN
     IF (intent->>'validUntil')::timestamptz>clock_timestamp() THEN
      blockers:=array_append(blockers,'decision_not_expired');
     END IF;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
     blockers:=array_append(blockers,'wrong_intent');
    END;
   END IF;
   handoff_ref:=intent->'handoff'->>'requestId';
   IF handoff_ref IS NULL OR handoff_ref !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    blockers:=array_append(blockers,'binding_mismatch');
   ELSE
    handoff_id:=handoff_ref::uuid;
    SELECT * INTO handoff FROM worker_credential_handoffs WHERE id=handoff_id AND workspace_id=w;
    IF handoff.id IS NULL THEN
     blockers:=array_append(blockers,'handoff_missing');
    ELSE
     handoff_out:=jsonb_build_object('id',handoff.id,'state',handoff.state,
      'expired',handoff.expires_at<=clock_timestamp());
     IF intent->>'installationId' IS DISTINCT FROM handoff.installation_id::text
      OR intent->>'hostId' IS DISTINCT FROM handoff.host_id::text
      OR intent->'handoff' IS DISTINCT FROM jsonb_build_object('requestId',handoff.id,
       'requestDigest',handoff.request_digest,'hostFingerprint',handoff.host_fingerprint,
       'origin',handoff.origin,'certificateFingerprint',handoff.certificate_fingerprint,
       'replacesRequestId',handoff.replaces_request_id) THEN
      blockers:=array_append(blockers,'binding_mismatch');
     END IF;
     IF handoff.state NOT IN ('requested','expired') THEN
      blockers:=array_append(blockers,'handoff_not_requested');
     END IF;
     IF handoff.expires_at>clock_timestamp() THEN
      blockers:=array_append(blockers,'handoff_not_expired');
     END IF;
     IF handoff.spent_at IS NOT NULL OR handoff.credential_id IS NOT NULL
      OR handoff.approval_command IS NOT NULL OR handoff.owner_user_id IS NOT NULL THEN
      blockers:=array_append(blockers,'operation_exists');
     END IF;
     SELECT count(*) INTO credential_count FROM api_keys k
      WHERE k.workspace_id=w AND k.worker_host_id=handoff.host_id AND k.active
       AND k.revoked_at IS NULL AND k.expires_at>clock_timestamp();
     IF credential_count<>0 THEN blockers:=array_append(blockers,'credential_active');END IF;
    END IF;
   END IF;
  END IF;
  BEGIN
   impact_value:=decision_current_impact(w,proposal.body->'scope');
  EXCEPTION WHEN OTHERS THEN impact_value:=NULL;
  END;
  IF impact_value IS NULL OR jsonb_typeof(impact_value->'taskIds')<>'array'
   OR jsonb_array_length(impact_value->'taskIds')=0 THEN
   blockers:=array_append(blockers,'impact_unavailable');
  ELSE
   impact_out:=jsonb_build_object('taskIds',impact_value->'taskIds');
   SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'status',t.status::text,
    'executionReadinessStatus',t.execution_readiness->>'status') ORDER BY t.id),'[]'::jsonb),count(*)
    INTO task_states,task_count FROM tasks t WHERE t.workspace_id=w
     AND t.id IN (SELECT jsonb_array_elements_text(impact_value->'taskIds')::uuid);
   IF task_count<>jsonb_array_length(impact_value->'taskIds') THEN
    blockers:=array_append(blockers,'impact_unavailable');
   END IF;
   IF EXISTS(SELECT 1 FROM tasks t WHERE t.workspace_id=w AND t.status::text<>'archived'
    AND t.id IN (SELECT jsonb_array_elements_text(impact_value->'taskIds')::uuid)) THEN
    blockers:=array_append(blockers,'active_task');
   END IF;
  END IF;
  SELECT count(*) INTO operation_count FROM agent_credential_operations o WHERE o.workspace_id=w
   AND (o.snapshot->>'decisionId'=d::text
    OR handoff_id IS NOT NULL AND o.snapshot->'intent'->'handoff'->>'requestId'=handoff_id::text);
  IF operation_count<>0 THEN blockers:=array_append(blockers,'operation_exists');END IF;
  SELECT count(*) INTO execution_count FROM agent_executions e WHERE e.workspace_id=w
   AND e.status::text IN ('queued','claimed','running','waiting_for_approval')
   AND (handoff.id IS NOT NULL AND e.agent_host_id=handoff.host_id
    OR impact_value IS NOT NULL AND e.task_id IN
     (SELECT jsonb_array_elements_text(impact_value->'taskIds')::uuid));
  IF execution_count<>0 THEN blockers:=array_append(blockers,'active_execution');END IF;
 END IF;
 payload:=jsonb_build_object('eligible',cardinality(blockers)=0,'blockers',to_jsonb(blockers),
  'impact',impact_out,'handoff',handoff_out,'taskStates',task_states);
 digest_source:=jsonb_build_object('version',1,'workspaceId',w,'decisionId',d,
  'proposalRequestHash',proposal.request_hash,'proposalBody',proposal.body,
  'decisionStatus',decision_row.status,'decisionState',CASE WHEN proposal.decision_id IS NULL THEN NULL ELSE decision_state(d) END,
  'handoffState',handoff.state,'handoffExpiresAt',handoff.expires_at,'handoffRequestDigest',handoff.request_digest,
  'handoffSpentAt',handoff.spent_at,'handoffCredentialId',handoff.credential_id,
  'handoffApproval',handoff.approval_command,'impact',impact_value,'payload',payload,
  'operationCount',operation_count,'credentialCount',credential_count,'executionCount',execution_count);
 RETURN payload||jsonb_build_object('previewDigest',encode(sha256(convert_to(digest_source::text,'UTF8')),'hex'));
END $$;



CREATE OR REPLACE FUNCTION decision_withdrawal_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE proposal decision_revisions;current_decision decisions;predecessor decisions;owner_id UUID;
 preview JSONB;handoff_ref TEXT;locked_handoff UUID;
BEGIN
 IF NEW.kind='expired_worker_rotation' THEN
  SELECT * INTO current_decision FROM decisions WHERE id=NEW.decision_id AND workspace_id=NEW.workspace_id FOR UPDATE;
  SELECT * INTO proposal FROM decision_revisions WHERE decision_id=NEW.decision_id AND workspace_id=NEW.workspace_id;
  SELECT owner_user_id INTO owner_id FROM workspaces WHERE id=NEW.workspace_id;
  IF owner_id IS NULL OR NEW.owner_user_id IS DISTINCT FROM owner_id OR NOT EXISTS(
   SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.owner_user_id AND m.role::text='owner'
  ) THEN RAISE EXCEPTION 'decision_withdrawal_forbidden';END IF;
  IF NEW.predecessor_id IS NOT NULL OR current_decision.id IS NULL OR proposal.decision_id IS NULL
   OR NEW.proposal_request_hash IS DISTINCT FROM proposal.request_hash
   OR NEW.impact_digest IS NULL OR NEW.impact_digest !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
  handoff_ref:=proposal.body->'workerCredential'->'handoff'->>'requestId';
  IF handoff_ref IS NOT NULL AND handoff_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   SELECT id INTO locked_handoff FROM worker_credential_handoffs WHERE id=handoff_ref::uuid AND workspace_id=NEW.workspace_id FOR UPDATE;
  END IF;
  preview:=decision_expired_worker_rotation_preview(NEW.workspace_id,NEW.decision_id);
  IF preview->>'eligible' IS DISTINCT FROM 'true'
   OR NEW.impact_digest IS DISTINCT FROM preview->>'previewDigest' THEN
   RAISE EXCEPTION 'decision_withdrawal_stale';
  END IF;
  IF NEW.reason IS NULL OR length(trim(NEW.reason)) NOT BETWEEN 12 AND 2000 THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
  NEW.withdrawn_at:=now();RETURN NEW;
 END IF;
 -- Exact historical G24c branch, retained for old rows and v1 commands.
 SELECT * INTO predecessor FROM decisions WHERE id=NEW.predecessor_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 SELECT * INTO current_decision FROM decisions WHERE id=NEW.decision_id AND workspace_id=NEW.workspace_id FOR UPDATE;
 SELECT * INTO proposal FROM decision_revisions WHERE decision_id=NEW.decision_id AND workspace_id=NEW.workspace_id;
 SELECT owner_user_id INTO owner_id FROM workspaces WHERE id=NEW.workspace_id;
 IF owner_id IS NULL OR NEW.owner_user_id IS DISTINCT FROM owner_id OR NOT EXISTS(
  SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=NEW.workspace_id AND m.user_id=NEW.owner_user_id AND m.role::text='owner'
 ) THEN RAISE EXCEPTION 'decision_withdrawal_forbidden';END IF;
 IF predecessor.id IS NULL OR predecessor.status<>'accepted' OR decision_state(predecessor.id)<>'accepted'
  OR proposal.decision_id IS NULL OR current_decision.id IS NULL OR proposal.supersedes_id IS DISTINCT FROM predecessor.id
  OR current_decision.source<>'roost_decision' OR current_decision.status<>'proposed'
  OR proposal.body->'managedRuntimeApproval'->>'executionClass' IS DISTINCT FROM 'roost-company-information-runtime-v1'
  OR proposal.body->'managedRuntimeApproval'->'applicationId' IS DISTINCT FROM 'null'::jsonb
  OR NOT EXISTS(SELECT 1 FROM tasks t WHERE t.id=(proposal.body->'managedRuntimeApproval'->>'taskId')::uuid AND t.workspace_id=NEW.workspace_id)
 THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
 IF NEW.proposal_request_hash IS DISTINCT FROM proposal.request_hash THEN RAISE EXCEPTION 'decision_withdrawal_stale';END IF;
 IF EXISTS(SELECT 1 FROM decision_acceptances WHERE decision_id=NEW.decision_id) THEN RAISE EXCEPTION 'decision_withdrawal_already_accepted';END IF;
 IF decision_state(NEW.decision_id)<>'pending' THEN RAISE EXCEPTION 'decision_withdrawal_not_pending';END IF;
 IF length(trim(NEW.reason)) NOT BETWEEN 12 AND 2000 THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
 NEW.withdrawn_at:=now();RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION decision_withdrawal_effects() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE affected_task_id UUID;changed JSONB;
BEGIN
 -- Eligible expired rotations have only archived dependent tasks. The ledger is
 -- a historical correction, with no credential, Ready or execution side effect.
 IF NEW.kind='expired_worker_rotation' THEN RETURN NULL;END IF;
 changed:=jsonb_build_array(jsonb_build_object('table','decision_withdrawals','id',NEW.id,'operation','insert','label','Decision proposal withdrawn',
  'changedAt',to_char(NEW.withdrawn_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
 FOR affected_task_id IN SELECT DISTINCT t.id FROM tasks t JOIN (
   SELECT (scope_item->>'id')::uuid AS id FROM decision_revisions r
    CROSS JOIN LATERAL jsonb_array_elements(r.body->'scope') scope_item
    WHERE r.decision_id=NEW.decision_id AND r.workspace_id=NEW.workspace_id AND scope_item->>'type'='task'
   UNION ALL
   SELECT jsonb_array_elements_text(p.impact->'taskIds')::uuid AS id FROM decision_impact_previews p
    WHERE p.decision_id=NEW.decision_id AND p.workspace_id=NEW.workspace_id
      AND p.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=NEW.decision_id AND workspace_id=NEW.workspace_id)
  ) affected ON affected.id=t.id WHERE t.workspace_id=NEW.workspace_id LOOP
  UPDATE tasks SET execution_readiness=COALESCE(execution_readiness,'{}'::jsonb)||jsonb_build_object(
   'status','needs_revalidation','reason','decision_withdrawn','changedSources',changed)
   WHERE id=affected_task_id AND workspace_id=NEW.workspace_id AND execution_readiness->>'status'='ready';
  UPDATE agent_executions SET context_invalidated_at=COALESCE(context_invalidated_at,now()),
   cancel_requested_at=COALESCE(cancel_requested_at,now()),
   context_invalidation=COALESCE(context_invalidation,jsonb_build_object('reason','decision_withdrawn','changedSources',changed))
   WHERE task_id=affected_task_id AND workspace_id=NEW.workspace_id AND status='queued' AND context_invalidated_at IS NULL;
 END LOOP;
 RETURN NULL;
END $$;

CREATE FUNCTION decision_withdraw_expired_worker_rotation_v1(w UUID,d UUID,expected_request_hash TEXT,
 owner UUID,request UUID,reason TEXT,expected_preview_digest TEXT)
 RETURNS TABLE(id UUID,decision_id UUID,request_id UUID,withdrawn_at TIMESTAMPTZ) LANGUAGE plpgsql AS $$
DECLARE prior decision_withdrawals;proposal decision_revisions;preview JSONB;locked_id UUID;
BEGIN
 SELECT * INTO prior FROM decision_withdrawals x WHERE x.workspace_id=w AND x.request_id=request;
 IF prior.id IS NOT NULL THEN
  IF prior.kind IS DISTINCT FROM 'expired_worker_rotation' OR prior.decision_id IS DISTINCT FROM d
   OR prior.owner_user_id IS DISTINCT FROM owner OR prior.proposal_request_hash IS DISTINCT FROM expected_request_hash
   OR prior.reason IS DISTINCT FROM reason OR prior.impact_digest IS DISTINCT FROM expected_preview_digest
  THEN RAISE EXCEPTION 'decision_withdrawal_request_conflict';END IF;
  RETURN QUERY SELECT prior.id,prior.decision_id,prior.request_id,prior.withdrawn_at;RETURN;
 END IF;
 IF request IS NULL OR reason IS NULL OR expected_preview_digest IS NULL OR expected_preview_digest !~ '^[a-f0-9]{64}$'
  OR length(trim(reason)) NOT BETWEEN 12 AND 2000 THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE ready_source_fence.id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'decision_withdrawal_fence_missing';END IF;
 SELECT decisions.id INTO locked_id FROM decisions WHERE decisions.id=d AND workspace_id=w FOR UPDATE;
 IF locked_id IS NULL THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
 SELECT * INTO prior FROM decision_withdrawals x WHERE x.workspace_id=w AND x.request_id=request;
 IF prior.id IS NOT NULL THEN
  IF prior.kind IS DISTINCT FROM 'expired_worker_rotation' OR prior.decision_id IS DISTINCT FROM d
   OR prior.owner_user_id IS DISTINCT FROM owner OR prior.proposal_request_hash IS DISTINCT FROM expected_request_hash
   OR prior.reason IS DISTINCT FROM reason OR prior.impact_digest IS DISTINCT FROM expected_preview_digest
  THEN RAISE EXCEPTION 'decision_withdrawal_request_conflict';END IF;
  RETURN QUERY SELECT prior.id,prior.decision_id,prior.request_id,prior.withdrawn_at;RETURN;
 END IF;
 SELECT * INTO proposal FROM decision_revisions r WHERE r.decision_id=d AND r.workspace_id=w;
 IF proposal.decision_id IS NULL OR proposal.request_hash IS DISTINCT FROM expected_request_hash
  THEN RAISE EXCEPTION 'decision_withdrawal_stale';END IF;
 preview:=decision_expired_worker_rotation_preview(w,d);
 IF preview->>'eligible' IS DISTINCT FROM 'true' OR preview->>'previewDigest' IS DISTINCT FROM expected_preview_digest
  THEN RAISE EXCEPTION 'decision_withdrawal_stale';END IF;
 INSERT INTO decision_withdrawals(id,workspace_id,decision_id,predecessor_id,proposal_request_hash,
  owner_user_id,request_id,reason,kind,impact_digest)
 VALUES(gen_random_uuid(),w,d,NULL,expected_request_hash,owner,request,reason,'expired_worker_rotation',expected_preview_digest)
 RETURNING decision_withdrawals.id,decision_withdrawals.decision_id,decision_withdrawals.request_id,decision_withdrawals.withdrawn_at
 INTO id,decision_id,request_id,withdrawn_at;
 RETURN NEXT;
END $$;

-- Catalog v4 pins the historical source exactly. A forward v5 manifest pins
-- the changed ledger shape/functions and retains every previous source pin.
CREATE TABLE bootstrap_v3_catalog_manifest_v5(id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(id),record JSONB NOT NULL);
DO $catalog$ DECLARE definition TEXT;previous TEXT;BEGIN
 SELECT replace(p.prosrc,chr(13),'') INTO definition FROM pg_proc p WHERE p.oid='bootstrap_v3_catalog()'::regprocedure;
 IF encode(sha256(convert_to(definition,'UTF8')),'hex')<>'ba005d7c47d3d68c1336a0f5e6f9b872289942b83318dcd70fed4b54abc41bd4'
 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v4_drift';END IF;
 definition:=replace(definition,'bootstrap_v3_catalog_manifest_v4','bootstrap_v3_catalog_manifest_v5');
 previous:=definition;
 definition:=replace(definition,' RETURN true;
END ',' PERFORM bootstrap_v3_assert(
  EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid=''decision_withdrawals''::regclass
   AND c.conname=''decision_withdrawals_kind_shape'' AND c.contype=''c'' AND c.convalidated)
  AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=''decision_withdrawals''::regclass
   AND a.attname=''predecessor_id'' AND NOT a.attnotnull AND NOT a.attisdropped),
  ''decision_expired_worker_rotation_contract'');
 RETURN true;
END ');
 IF definition=previous THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v5_recipe_invalid';END IF;
 EXECUTE 'CREATE OR REPLACE FUNCTION bootstrap_v3_catalog() RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $function$'||definition||'$function$';
END $catalog$;
DO $manifest$ DECLARE old_record JSONB;new_record JSONB;new_functions JSONB;new_columns JSONB;BEGIN
 SELECT record INTO old_record FROM bootstrap_v3_catalog_manifest_v4 WHERE id;
 IF old_record IS NULL OR old_record->>'version'<>'bootstrap-v3-catalog-v4'
 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v4_manifest_invalid';END IF;
 WITH correction(name,hash) AS (VALUES
  ('decision_withdrawal_insert_guard','e4a67df59415f4bb1b1783d7e4b0f2f57c8789793ed0562fd19dba14752d4367'),
  ('decision_withdrawal_effects','202e1bd1a825978fd911653c72a027fb6b059bb00a7ac7044e47bad01cbbbf62'),
  ('bootstrap_v3_catalog','b694aaac95b4eb3ab827678d5a60fc8c4fd53647710d11154c862f1b14b9dc1e')
 ) SELECT jsonb_agg(CASE WHEN correction.hash IS NULL THEN f.value ELSE jsonb_set(f.value,'{hash}',to_jsonb(correction.hash)) END ORDER BY f.ordinality)
 INTO new_functions FROM jsonb_array_elements(old_record->'functions') WITH ORDINALITY AS f(value,ordinality)
 LEFT JOIN correction ON correction.name=f.value->>'name';
 new_functions:=new_functions||'[
  {"name":"decision_expired_worker_rotation_preview","args":"w uuid, d uuid","defaults":null,"result":"jsonb","language":"plpgsql","volatility":"v","hash":"5200ee987aaec9da3d4abc7786262379243ec838411c1b3ff967625376603b1e"},
  {"name":"decision_withdraw_expired_worker_rotation_v1","args":"w uuid, d uuid, expected_request_hash text, owner uuid, request uuid, reason text, expected_preview_digest text","defaults":null,"result":"record","language":"plpgsql","volatility":"v","hash":"93281682f033c4db7543aa56325bfac80a2db7bcf397ba7a27a3ada99d3699aa"}
 ]'::jsonb;
 SELECT jsonb_agg(CASE WHEN c.value->>'table'='decision_withdrawals'
  THEN jsonb_set(c.value,'{columns}',c.value->'columns'||'[{"name":"kind","type":"text","generated":""},{"name":"impact_digest","type":"text","generated":""}]'::jsonb)
  ELSE c.value END ORDER BY c.ordinality) INTO new_columns
 FROM jsonb_array_elements(old_record->'columns') WITH ORDINALITY AS c(value,ordinality);
 new_columns:=new_columns||'[{"table":"bootstrap_v3_catalog_manifest_v5","columns":[{"name":"id","type":"boolean","generated":""},{"name":"record","type":"jsonb","generated":""}]}]'::jsonb;
 new_record:=jsonb_set(old_record,'{version}',to_jsonb('bootstrap-v3-catalog-v5'::text));
 new_record:=jsonb_set(new_record,'{functions}',new_functions);
 new_record:=jsonb_set(new_record,'{columns}',new_columns);
 new_record:=jsonb_set(new_record,'{triggers}',old_record->'triggers'||'[{"table":"bootstrap_v3_catalog_manifest_v5","name":"bootstrap_v3_manifest_v5_immutable","function":"bootstrap_v3_immutable","kind":62,"deferred":false}]'::jsonb);
 new_record:=jsonb_set(new_record,'{exactTriggerTables}',old_record->'exactTriggerTables'||'["bootstrap_v3_catalog_manifest_v5"]'::jsonb);
 INSERT INTO bootstrap_v3_catalog_manifest_v5(id,record) VALUES(true,new_record);
END $manifest$;
CREATE TRIGGER bootstrap_v3_manifest_v5_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON bootstrap_v3_catalog_manifest_v5
 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_v3_immutable();

COMMIT;
