BEGIN;

-- A withdrawn proposal remains in decisions and decision_revisions. This
-- ledger is the only terminal correction for a pending managed information
-- successor. All changes below are forward-only.
CREATE TABLE decision_withdrawals (
 id UUID PRIMARY KEY,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 decision_id UUID NOT NULL UNIQUE REFERENCES decision_revisions(decision_id) ON DELETE RESTRICT,
 predecessor_id UUID NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,
 proposal_request_hash TEXT NOT NULL,
 owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL,
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 12 AND 2000),
 withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,request_id)
);

CREATE OR REPLACE FUNCTION decision_state(d UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM decision_acceptances WHERE decision_id=d) THEN 'accepted'
 WHEN EXISTS(SELECT 1 FROM decision_withdrawals WHERE decision_id=d) THEN 'withdrawn'
 WHEN EXISTS(SELECT 1 FROM decision_deferrals f WHERE f.target_type='decision' AND f.target_id=d AND NOT EXISTS(SELECT 1 FROM decision_reopening_events WHERE deferral_id=f.id)) THEN 'deferred' ELSE 'pending' END
$$;

CREATE FUNCTION decision_withdrawal_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'decision_withdrawal_history_immutable';END $$;

CREATE FUNCTION decision_withdrawal_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE proposal decision_revisions;current_decision decisions;predecessor decisions;owner_id UUID;
BEGIN
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

CREATE FUNCTION decision_withdrawal_serial_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE locked_id UUID;
BEGIN
 IF TG_TABLE_NAME='decision_revisions' THEN
  IF NEW.supersedes_id IS NULL THEN RETURN NEW;END IF;
  SELECT id INTO locked_id FROM decisions WHERE id=NEW.supersedes_id AND workspace_id=NEW.workspace_id FOR UPDATE;
  IF locked_id IS NULL THEN RAISE EXCEPTION 'decision_conflict_invalid';END IF;
  IF EXISTS(SELECT 1 FROM decision_revisions r WHERE r.workspace_id=NEW.workspace_id AND r.supersedes_id=NEW.supersedes_id AND decision_state(r.decision_id)<>'withdrawn')
  THEN RAISE EXCEPTION 'decision_successor_exists';END IF;
 ELSE
  SELECT id INTO locked_id FROM decisions WHERE id=NEW.decision_id AND workspace_id=NEW.workspace_id FOR UPDATE;
  IF locked_id IS NULL OR decision_state(NEW.decision_id)<>'pending' THEN RAISE EXCEPTION 'decision_stale';END IF;
 END IF;
 RETURN NEW;
END $$;

-- The predecessor row is the concurrency fence for proposing or withdrawing
-- a successor; the proposal row is the fence for preview/acceptance races.
CREATE TRIGGER a_decision_withdrawal_revision_fence BEFORE INSERT ON decision_revisions
 FOR EACH ROW EXECUTE FUNCTION decision_withdrawal_serial_guard();
CREATE TRIGGER a_decision_withdrawal_preview_fence BEFORE INSERT ON decision_impact_previews
 FOR EACH ROW EXECUTE FUNCTION decision_withdrawal_serial_guard();
CREATE TRIGGER a_decision_withdrawal_acceptance_fence BEFORE INSERT ON decision_acceptances
 FOR EACH ROW EXECUTE FUNCTION decision_withdrawal_serial_guard();
CREATE TRIGGER decision_withdrawal_insert_guard BEFORE INSERT ON decision_withdrawals
 FOR EACH ROW EXECUTE FUNCTION decision_withdrawal_insert_guard();
CREATE TRIGGER decision_withdrawal_immutable BEFORE UPDATE OR DELETE ON decision_withdrawals
 FOR EACH ROW EXECUTE FUNCTION decision_withdrawal_immutable();
CREATE TRIGGER decision_withdrawal_no_truncate BEFORE TRUNCATE ON decision_withdrawals
 FOR EACH STATEMENT EXECUTE FUNCTION decision_withdrawal_immutable();
CREATE TRIGGER decision_withdrawal_ready_fence BEFORE INSERT ON decision_withdrawals
 FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();

-- The old unique key includes withdrawn history. The row-lock/guard pair above
-- replaces it before the key is removed, within this one migration transaction.
ALTER TABLE decision_revisions DROP CONSTRAINT decision_revisions_supersedes_id_key;
CREATE INDEX decision_revisions_predecessor_lookup ON decision_revisions(workspace_id,supersedes_id);

CREATE FUNCTION decision_withdrawal_effects() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE affected_task_id UUID;changed JSONB;
BEGIN
 changed:=jsonb_build_array(jsonb_build_object('table','decision_withdrawals','id',NEW.id,'operation','insert','label','Decision proposal withdrawn',
  'changedAt',to_char(NEW.withdrawn_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
 -- The preview contains downstream task impact beyond direct scope roots.
 -- Keep the root set as a fallback and constrain every candidate to this workspace.
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
CREATE TRIGGER decision_withdrawal_effects AFTER INSERT ON decision_withdrawals
 FOR EACH ROW EXECUTE FUNCTION decision_withdrawal_effects();

CREATE FUNCTION decision_withdraw_pending_v1(w UUID,d UUID,expected_request_hash TEXT,owner UUID,request UUID,reason TEXT)
 RETURNS TABLE(id UUID,decision_id UUID,request_id UUID,withdrawn_at TIMESTAMPTZ) LANGUAGE plpgsql AS $$
DECLARE prior decision_withdrawals;revision decision_revisions;predecessor_id UUID;
BEGIN
 SELECT * INTO prior FROM decision_withdrawals x WHERE x.workspace_id=w AND x.request_id=request;
 IF prior.id IS NOT NULL THEN
  IF prior.decision_id IS DISTINCT FROM d OR prior.owner_user_id IS DISTINCT FROM owner
   OR prior.proposal_request_hash IS DISTINCT FROM expected_request_hash OR prior.reason IS DISTINCT FROM reason
  THEN RAISE EXCEPTION 'decision_withdrawal_request_conflict';END IF;
  RETURN QUERY SELECT prior.id,prior.decision_id,prior.request_id,prior.withdrawn_at;RETURN;
 END IF;
 SELECT * INTO revision FROM decision_revisions r WHERE r.decision_id=d AND r.workspace_id=w;
 IF revision.decision_id IS NULL THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
 predecessor_id:=revision.supersedes_id;
 IF predecessor_id IS NULL THEN RAISE EXCEPTION 'decision_withdrawal_scope_invalid';END IF;
 PERFORM 1 FROM decisions p WHERE p.id=predecessor_id AND p.workspace_id=w FOR UPDATE;
 SELECT * INTO prior FROM decision_withdrawals x WHERE x.decision_id=d AND x.workspace_id=w;
 IF prior.id IS NOT NULL THEN
  IF prior.request_id IS DISTINCT FROM request OR prior.owner_user_id IS DISTINCT FROM owner
   OR prior.proposal_request_hash IS DISTINCT FROM expected_request_hash OR prior.reason IS DISTINCT FROM reason
  THEN RAISE EXCEPTION 'decision_withdrawal_not_pending';END IF;
  RETURN QUERY SELECT prior.id,prior.decision_id,prior.request_id,prior.withdrawn_at;RETURN;
 END IF;
 INSERT INTO decision_withdrawals(id,workspace_id,decision_id,predecessor_id,proposal_request_hash,owner_user_id,request_id,reason)
 VALUES(gen_random_uuid(),w,d,predecessor_id,expected_request_hash,owner,request,reason)
 RETURNING decision_withdrawals.id,decision_withdrawals.decision_id,decision_withdrawals.request_id,decision_withdrawals.withdrawn_at
 INTO id,decision_id,request_id,withdrawn_at;
 RETURN NEXT;
END $$;

-- Pending projections and authority checks retain deferred history but exclude
-- the explicit terminal withdrawal state.
CREATE OR REPLACE FUNCTION decision_pending_version_before_authority_interviews(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.decision_id,'body',r.body,'preview',p.id,'impact',decision_impact(r.workspace_id,r.body->'scope')) ORDER BY r.decision_id)::text,'[]')
 FROM decision_revisions r JOIN LATERAL (SELECT * FROM decision_impact_previews WHERE decision_id=r.decision_id ORDER BY version DESC LIMIT 1) p ON true
 WHERE decision_state(r.decision_id) IN ('pending','deferred') AND p.impact->'taskIds' @> to_jsonb(ARRAY[t])
$$;
CREATE OR REPLACE FUNCTION decision_admission_required(t UUID,op TEXT) RETURNS TEXT[] LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF op='decision_supersede' AND (
 EXISTS(SELECT 1 FROM decision_revisions r JOIN decision_impact_previews p ON p.decision_id=r.decision_id WHERE r.body->'authority'->>'domain'='critical_risk' AND decision_state(r.decision_id) IN ('pending','deferred') AND p.impact->'taskIds' @> jsonb_build_array(t))
 OR EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.decision_class='critical_risk' AND task_interview_status(c.id)<>'accepted' AND NOT EXISTS(SELECT 1 FROM task_interview_cases x WHERE x.supersedes_id=c.id) AND c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)))) THEN
 RETURN ARRAY['procedure','extended_review','mandate','backup','restore_plan','owner_approval'];END IF;
 RETURN task_admission_required(t);
END $$;
CREATE OR REPLACE FUNCTION task_admission_independent(t UUID,u UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT task_admission_independent_before_decision_authority(t,u)
 AND NOT EXISTS(SELECT 1 FROM decision_revisions r JOIN decision_impact_previews p ON p.decision_id=r.decision_id WHERE r.actor_user_id=u AND decision_state(r.decision_id) IN ('pending','deferred') AND p.impact->'taskIds' @> jsonb_build_array(t))
 AND NOT EXISTS(SELECT 1 FROM decision_impact_previews p WHERE p.authority->'principal'=jsonb_build_object('kind','user','id',u) AND decision_state(p.decision_id) IN ('pending','deferred') AND p.impact->'taskIds' @> jsonb_build_array(t))
 AND NOT EXISTS(SELECT 1 FROM task_interview_cases c JOIN task_interview_entries e ON e.case_id=c.id WHERE e.actor_user_id=u AND e.action='answer' AND task_interview_status(c.id)<>'accepted' AND c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)))
$$;
CREATE OR REPLACE FUNCTION decision_authority_task_current(t UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM decision_impact_previews p WHERE p.impact->'taskIds' @> jsonb_build_array(t) AND p.authority->>'status'='delegated'
  AND decision_state(p.decision_id)<>'withdrawn'
  AND p.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=p.decision_id)
  AND NOT EXISTS(SELECT 1 FROM task_decision_effects e WHERE e.task_id=t AND e.supersedes_id=p.decision_id)
  AND p.authority->>'epoch' IS DISTINCT FROM decision_authority_epoch(p.workspace_id,p.authority))
$$;
CREATE OR REPLACE FUNCTION task_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE base JSONB;refs JSONB;expiry TIMESTAMPTZ;
BEGIN
 -- Preserve the later company-information branch, including its evidence seal.
 -- That branch reads the updated pending/authority projections above.
 IF (SELECT scope_kind FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1)='company_information' THEN
  RETURN company_information_admission_view(t,op);
 END IF;
 IF op<>'decision_supersede' AND NOT decision_authority_task_current(t) THEN RETURN jsonb_build_object('status','blocked','reason','decision_authority_changed','seal',NULL,'gates','[]'::jsonb);END IF;
 base:=task_admission_view_before_authority_policy(t,op);
 IF op='decision_supersede' OR base->>'seal' IS NULL THEN RETURN base;END IF;
 SELECT jsonb_agg(jsonb_build_object('id',p.id,'kind',p.kind,'epoch',decision_authority_epoch(p.workspace_id,p.authority)) ORDER BY p.kind,p.id),min((p.authority->'mandate'->>'endsAt')::timestamptz) INTO refs,expiry
 FROM (
 SELECT p.id,p.workspace_id,p.authority,'decision' AS kind FROM decision_impact_previews p WHERE p.impact->'taskIds' @> jsonb_build_array(t) AND p.authority->>'status'='delegated' AND decision_state(p.decision_id)<>'withdrawn' AND p.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=p.decision_id)
 AND NOT EXISTS(SELECT 1 FROM task_decision_effects e WHERE e.task_id=t AND e.supersedes_id=p.decision_id)
 UNION ALL SELECT c.id,c.workspace_id,c.authority,'interview' FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)) AND c.authority->>'status'='delegated' AND NOT EXISTS(SELECT 1 FROM task_interview_cases n WHERE n.supersedes_id=c.id)
 ) p;
 IF refs IS NULL THEN RETURN base;END IF;
 RETURN base||jsonb_build_object('authority',refs,'expiresAt',least((base->>'expiresAt')::timestamptz,expiry),'seal',encode(sha256(convert_to((base->>'seal')||refs::text,'UTF8')),'hex'));
END $$;
CREATE OR REPLACE FUNCTION decision_authority_invalidate_before_interviews(w UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE p decision_impact_previews;epoch TEXT;t UUID;changed JSONB;
BEGIN
 FOR p IN SELECT x.* FROM decision_impact_previews x WHERE x.workspace_id=w AND x.authority->>'status'='delegated'
  AND decision_state(x.decision_id)<>'withdrawn'
  AND x.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=x.decision_id) LOOP
  epoch:=decision_authority_epoch(w,p.authority);
  IF epoch IS NOT DISTINCT FROM p.authority->>'epoch' THEN CONTINUE;END IF;
  INSERT INTO decision_authority_invalidations(workspace_id,decision_id,preview_id,prior_epoch,current_epoch) VALUES(w,p.decision_id,p.id,p.authority->>'epoch',epoch) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN CONTINUE;END IF;
  changed:=jsonb_build_array(jsonb_build_object('table','workforce_entities','id',p.authority->'mandate'->>'workforceId','operation','update','label','Decision authority changed','changedAt',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  FOR t IN SELECT value::uuid FROM jsonb_array_elements_text(p.impact->'taskIds') LOOP
   IF EXISTS(SELECT 1 FROM task_decision_effects e WHERE e.task_id=t AND e.supersedes_id=p.decision_id) THEN CONTINUE;END IF;
   INSERT INTO task_admission_heads(task_id,revision) VALUES(t,1) ON CONFLICT(task_id) DO UPDATE SET revision=task_admission_heads.revision+1;
   UPDATE tasks SET execution_readiness=COALESCE(execution_readiness,'{}')||jsonb_build_object('status','needs_revalidation','reason','decision_authority_changed','changedSources',changed) WHERE id=t AND workspace_id=w;
   UPDATE agent_executions SET context_invalidated_at=COALESCE(context_invalidated_at,now()),cancel_requested_at=COALESCE(cancel_requested_at,now()),context_invalidation=COALESCE(context_invalidation,jsonb_build_object('reason','decision_authority_changed','changedSources',changed)) WHERE task_id=t AND status='queued';
  END LOOP;
 END LOOP;
END $$;

-- Continue below with the version-four immutable bootstrap catalog.
-- The v3 catalog is an immutable historical record; require its exact installed source.
DO $check$ DECLARE h TEXT;BEGIN
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_catalog';
 IF h<>'eec8e201c2ba17c972b1c51ebb8ac6c0003a89c0cd776eaf0a757cfb6d6dbf98' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v3_drift';END IF;
END $check$;
CREATE TABLE bootstrap_v3_catalog_manifest_v4(id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(id),record JSONB NOT NULL);
DO $catalog$ DECLARE definition TEXT;previous TEXT;BEGIN
 SELECT replace(p.prosrc,chr(13),'') INTO definition FROM pg_proc p WHERE p.oid='bootstrap_v3_catalog()'::regprocedure;
 IF position('bootstrap_v3_catalog_manifest_v3' IN definition)=0 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v3_drift';END IF;
 definition:=replace(definition,'bootstrap_v3_catalog_manifest_v3','bootstrap_v3_catalog_manifest_v4');
 previous:=definition;definition:=replace(definition,' RETURN true;
END ',' PERFORM bootstrap_v3_assert(NOT EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid=''decision_revisions''::regclass AND c.conname=''decision_revisions_supersedes_id_key'')
  AND EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid=''decision_withdrawals''::regclass AND c.conname=''decision_withdrawals_decision_id_key''
   AND c.contype=''u'' AND pg_get_constraintdef(c.oid)=''UNIQUE (decision_id)'')
  AND EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid=''decision_withdrawals''::regclass AND c.conname=''decision_withdrawals_workspace_id_request_id_key''
   AND c.contype=''u'' AND pg_get_constraintdef(c.oid)=''UNIQUE (workspace_id, request_id)'')
  AND EXISTS(SELECT 1 FROM pg_indexes i WHERE i.schemaname=''public'' AND i.tablename=''decision_revisions'' AND i.indexname=''decision_revisions_predecessor_lookup''
   AND i.indexdef=''CREATE INDEX decision_revisions_predecessor_lookup ON public.decision_revisions USING btree (workspace_id, supersedes_id)'')
  AND NOT EXISTS(SELECT 1 FROM decision_revisions r WHERE r.supersedes_id IS NOT NULL AND decision_state(r.decision_id)<>''withdrawn''
   GROUP BY r.workspace_id,r.supersedes_id HAVING count(*)>1),''decision_successor_fence'');
 RETURN true;
END ');
 IF definition=previous OR encode(sha256(convert_to(definition,'UTF8')),'hex')<>'ba005d7c47d3d68c1336a0f5e6f9b872289942b83318dcd70fed4b54abc41bd4' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v4_recipe_invalid';END IF;
 EXECUTE 'CREATE OR REPLACE FUNCTION bootstrap_v3_catalog() RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $function$'||definition||'$function$';
END $catalog$;
DO $manifest$ DECLARE old_record JSONB;new_record JSONB;updated_functions JSONB;BEGIN
 SELECT record INTO old_record FROM bootstrap_v3_catalog_manifest_v3 WHERE id;
 IF old_record IS NULL OR old_record->>'version'<>'bootstrap-v3-catalog-v3' OR jsonb_array_length(old_record->'functions')<>177 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v3_manifest_invalid';END IF;
 WITH correction(name,hash) AS (VALUES
  ('decision_state','a939980c3170ce835429a01620244b49cdbcaaa967c5238728f4227bf63a5a05'),
  ('decision_authority_task_current','a2a64450d992a5757fee1022e5590a2ee2373d227deb2a53cc83623840449c9f'),
  ('agent_credential_guard','7cdf90276ace2932c5b9800fe3727cbfcca9b8bf5278d15d02dafbca9837e4b9'),
  ('task_capability_base','9b56594176e9c68bd0904b70b38306788c90b89a64794d87e4c08439adabcbb0'),
  ('task_risk_sources','bc0375ede3207414036e134ec8850dd912360059273db073630af6e8ef427225'),
  ('bootstrap_v3_catalog','ba005d7c47d3d68c1336a0f5e6f9b872289942b83318dcd70fed4b54abc41bd4')
) SELECT jsonb_agg(CASE WHEN correction.hash IS NULL THEN f.value ELSE jsonb_set(f.value,'{hash}',to_jsonb(correction.hash)) END ORDER BY f.ordinality) INTO updated_functions
 FROM jsonb_array_elements(old_record->'functions') WITH ORDINALITY AS f(value,ordinality) LEFT JOIN correction ON correction.name=f.value->>'name';
 new_record:=jsonb_set(old_record,'{version}',to_jsonb('bootstrap-v3-catalog-v4'::text));
 new_record:=jsonb_set(new_record,'{functions}',updated_functions||'[{"name":"decision_withdrawal_immutable","args":"","defaults":null,"result":"trigger","language":"plpgsql","volatility":"v","hash":"9b4ceeda9aaaf7cff6b8111294fc5f472f396ec3c2f9662aa60fa934e35a770b"},{"name":"decision_withdrawal_insert_guard","args":"","defaults":null,"result":"trigger","language":"plpgsql","volatility":"v","hash":"a11662e69c497af5da382ed523d2c43ea5bd45038af702b7ec0ab1e3dfedfc4c"},{"name":"decision_withdrawal_serial_guard","args":"","defaults":null,"result":"trigger","language":"plpgsql","volatility":"v","hash":"91cc032f07b34eb23d8ae3b061ffd3cceb0abf2d7f53b264f5f9c82bc16a9ea0"},{"name":"decision_withdrawal_effects","args":"","defaults":null,"result":"trigger","language":"plpgsql","volatility":"v","hash":"260b9cff2931ef7cbde128b9df341641dfb71edc1c8d2be0e9000229fab0192f"},{"name":"decision_withdraw_pending_v1","args":"w uuid, d uuid, expected_request_hash text, owner uuid, request uuid, reason text","defaults":null,"result":"record","language":"plpgsql","volatility":"v","hash":"62c782f31b98e48a7a4230f4d582f2afed68827779823d35765606c59f339ad0"},{"name":"decision_pending_version_before_authority_interviews","args":"t uuid","defaults":null,"result":"text","language":"sql","volatility":"s","hash":"695e4abf971b4ddfe20abf06650d164d9d319ebdd9f1da15a6573cac234d4269"},{"name":"decision_admission_required","args":"t uuid, op text","defaults":null,"result":"text[]","language":"plpgsql","volatility":"s","hash":"c64fcd4742a32768672df6e62680109dd2c8a36846e258d4f33fccae06448c4c"},{"name":"task_admission_independent","args":"t uuid, u uuid","defaults":null,"result":"boolean","language":"sql","volatility":"s","hash":"c3ae8ed94afe215811a1a316337776a692ec4adcff9bc311441f74c961aa0151"},{"name":"task_admission_view","args":"t uuid, op text","defaults":null,"result":"jsonb","language":"plpgsql","volatility":"s","hash":"949ec2bf2298f8a3ba9066f8cd9614936fa5b3ccf486133fb4edf6e7ff885a7b"},{"name":"decision_authority_invalidate_before_interviews","args":"w uuid","defaults":null,"result":"void","language":"plpgsql","volatility":"v","hash":"66c39bf94638c0e54ea0e434215c60c862556ea9b1c32066fe6ad88b07800b3d"},{"name":"application_takeover_decision_guard","args":"","defaults":null,"result":"trigger","language":"plpgsql","volatility":"v","hash":"94cf49a9883f3827640738448c05b6f42b3fbc6e715fcab756ca3d3685f6ecdd"},{"name":"g9_capture_source_body","args":"","defaults":null,"result":"trigger","language":"plpgsql","volatility":"v","hash":"10eb600c8655616ac3bfc576dce5253483cfc8a8afec7aeb89152c04f3bb91c6"},{"name":"immutable_human_task_scope","args":"","defaults":null,"result":"trigger","language":"plpgsql","volatility":"v","hash":"04a8ce42e24c13d4ea042d584134faca033ac52d7de1090342b37387f0695ba0"}]'::jsonb);
 new_record:=jsonb_set(new_record,'{triggers}',old_record->'triggers'||'[{"table":"decision_revisions","name":"a_decision_withdrawal_revision_fence","function":"decision_withdrawal_serial_guard","kind":7,"deferred":false},{"table":"decision_impact_previews","name":"a_decision_withdrawal_preview_fence","function":"decision_withdrawal_serial_guard","kind":7,"deferred":false},{"table":"decision_acceptances","name":"a_decision_withdrawal_acceptance_fence","function":"decision_withdrawal_serial_guard","kind":7,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_insert_guard","function":"decision_withdrawal_insert_guard","kind":7,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_immutable","function":"decision_withdrawal_immutable","kind":27,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_no_truncate","function":"decision_withdrawal_immutable","kind":34,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_ready_fence","function":"ready_source_lock","kind":6,"deferred":false},{"table":"decision_withdrawals","name":"decision_withdrawal_effects","function":"decision_withdrawal_effects","kind":5,"deferred":false},{"table":"decision_impact_previews","name":"aaa_proof_source_fence","function":"bootstrap_proof_source_lock","kind":30,"deferred":false},{"table":"decision_impact_previews","name":"decision_history_guard","function":"decision_history_guard","kind":31,"deferred":false},{"table":"decision_impact_previews","name":"proof_source_no_truncate","function":"bootstrap_proof_immutable","kind":34,"deferred":false},{"table":"decision_impact_previews","name":"aa_decision_attestation_fence","function":"decision_attestation_lock","kind":30,"deferred":false},{"table":"decision_impact_previews","name":"decision_attestation_no_truncate","function":"decision_attestation_immutable","kind":34,"deferred":false},{"table":"decision_impact_previews","name":"zz_decision_attestation_audit","function":"decision_attestation_audit","kind":29,"deferred":false},{"table":"decision_revisions","name":"a0_application_takeover_revision","function":"application_takeover_decision_guard","kind":7,"deferred":false},{"table":"decision_acceptances","name":"a0_application_takeover_acceptance","function":"application_takeover_decision_guard","kind":7,"deferred":false},{"table":"decisions","name":"g9_source_body_history","function":"g9_capture_source_body","kind":29,"deferred":false},{"table":"workspace_memberships","name":"workspace_membership_scope_immutable","function":"immutable_human_task_scope","kind":19,"deferred":false},{"table":"bootstrap_v3_catalog_manifest_v4","name":"bootstrap_v3_manifest_v4_immutable","function":"bootstrap_v3_immutable","kind":62,"deferred":false}]'::jsonb);
 new_record:=jsonb_set(new_record,'{columns}',old_record->'columns'||'[{"table":"decision_withdrawals","columns":[{"name":"id","type":"uuid","generated":""},{"name":"workspace_id","type":"uuid","generated":""},{"name":"decision_id","type":"uuid","generated":""},{"name":"predecessor_id","type":"uuid","generated":""},{"name":"proposal_request_hash","type":"text","generated":""},{"name":"owner_user_id","type":"uuid","generated":""},{"name":"request_id","type":"uuid","generated":""},{"name":"reason","type":"text","generated":""},{"name":"withdrawn_at","type":"timestamp with time zone","generated":""}]},{"table":"bootstrap_v3_catalog_manifest_v4","columns":[{"name":"id","type":"boolean","generated":""},{"name":"record","type":"jsonb","generated":""}]}]'::jsonb);
 new_record:=jsonb_set(new_record,'{foreignKeys}',old_record->'foreignKeys'||'[{"table":"decision_withdrawals","target":"workspaces","columns":["workspace_id"],"targetColumns":["id"]},{"table":"decision_withdrawals","target":"decision_revisions","columns":["decision_id"],"targetColumns":["decision_id"]},{"table":"decision_withdrawals","target":"decisions","columns":["predecessor_id"],"targetColumns":["id"]},{"table":"decision_withdrawals","target":"users","columns":["owner_user_id"],"targetColumns":["id"]}]'::jsonb);
 new_record:=jsonb_set(new_record,'{exactTriggerTables}',old_record->'exactTriggerTables'||'["decision_withdrawals","decision_impact_previews","bootstrap_v3_catalog_manifest_v4"]'::jsonb);
 INSERT INTO bootstrap_v3_catalog_manifest_v4(id,record) VALUES(true,new_record);
END $manifest$;
CREATE TRIGGER bootstrap_v3_manifest_v4_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON bootstrap_v3_catalog_manifest_v4 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_v3_immutable();

COMMIT;
