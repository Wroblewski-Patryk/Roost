BEGIN;

-- Versioned authority belongs to the existing workforce and Decision register.
-- No installation records, identities, credentials or reporting lines are seeded.
CREATE TABLE workforce_mandate_versions (
 id UUID PRIMARY KEY, mandate_id UUID NOT NULL, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 workforce_id UUID NOT NULL REFERENCES workforce_entities(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>0), body JSONB NOT NULL,
 issuer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 source_decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(mandate_id,version), UNIQUE(workspace_id,request_id)
);
CREATE INDEX workforce_mandate_workspace ON workforce_mandate_versions(workspace_id,workforce_id);
CREATE TRIGGER decision_authority_fence BEFORE INSERT OR UPDATE OR DELETE ON workforce_mandate_versions FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER decision_authority_fence BEFORE INSERT OR UPDATE OR DELETE ON workspace_memberships FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER decision_authority_fence BEFORE INSERT OR UPDATE OR DELETE ON workspaces FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
ALTER TABLE decision_impact_previews ADD COLUMN authority JSONB;
ALTER TABLE decision_acceptances ADD COLUMN authority JSONB;
ALTER TABLE decision_acceptances ADD COLUMN actor_agent_id UUID REFERENCES workforce_entities(id) ON DELETE RESTRICT;
ALTER TABLE decision_acceptances ADD COLUMN actor_credential_id UUID REFERENCES api_keys(id) ON DELETE RESTRICT;
ALTER TABLE decision_acceptances ALTER COLUMN actor_user_id DROP NOT NULL;
ALTER TABLE decision_acceptances ADD CONSTRAINT decision_authority_actor CHECK(
 (actor_user_id IS NOT NULL AND actor_agent_id IS NULL AND actor_credential_id IS NULL) OR
 (actor_user_id IS NULL AND actor_agent_id IS NOT NULL AND actor_credential_id IS NOT NULL));

CREATE FUNCTION decision_primary_owner(w UUID,u UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM workspaces s JOIN workspace_memberships m ON m.workspace_id=s.id AND m.user_id=s.owner_user_id AND m.role='owner' WHERE s.id=w AND s.owner_user_id=u)
$$;
CREATE FUNCTION decision_worker(w UUID,p UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT jsonb_build_object('id',f.id,'workspaceId',f.workspace_id,'principal',CASE
 WHEN f.type='agent' AND f.source<>'user' THEN jsonb_build_object('kind','agent','id',f.id)
 WHEN f.type='human' AND f.source='user' AND EXISTS(SELECT 1 FROM workspace_memberships m WHERE m.workspace_id=w AND m.user_id::text=f.external_id AND m.role IN ('owner','admin','member')) THEN jsonb_build_object('kind','user','id',f.external_id) ELSE NULL END,
 'active',f.status='active','managerIds',CASE WHEN f.manager_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(f.manager_id) END,
 'departmentKeys',(SELECT COALESCE(jsonb_agg(d.key ORDER BY d.key),'[]') FROM organizational_department_relations r JOIN workspace_departments d ON d.id=r.department_id AND d.workspace_id=w WHERE r.workspace_id=w AND r.entity_type='workforce' AND r.entity_id=f.id AND r.relationship_role='owner'),
 'hierarchyLevel',f.hierarchy_level,'revision',encode(sha256(convert_to(jsonb_build_object('profile',to_jsonb(f)-'name'-'avatar'-'description'-'updated_at'-'generated_files'-'sync_log'-'last_synced_at'-'sync_status',
 'departments',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]') FROM organizational_department_relations r WHERE r.workspace_id=w AND r.entity_type='workforce' AND r.entity_id=f.id AND r.relationship_role='owner'),
 'memberships',(SELECT COALESCE(jsonb_agg(to_jsonb(m)-'updated_at' ORDER BY m.id),'[]') FROM workspace_memberships m WHERE m.workspace_id=w AND m.user_id::text=f.external_id),
 'epoch',(SELECT revision FROM decision_source_revisions WHERE workspace_id=w AND node_type='workforce' AND node_id=f.id))::text,'UTF8')),'hex'))
 FROM workforce_entities f WHERE f.id=p AND f.workspace_id=w
$$;
CREATE FUNCTION decision_authority_epoch(w UUID,snapshot JSONB) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('owner',(SELECT owner_user_id FROM workspaces WHERE id=w),
 'ownerEpoch',(SELECT revision FROM decision_source_revisions WHERE workspace_id=w AND node_type='authority_owner' AND node_id=w),'workers',
 (SELECT COALESCE(jsonb_agg(decision_worker(w,value::uuid) ORDER BY value),'[]') FROM jsonb_array_elements_text(snapshot->'watchIds')),
 'directors',(SELECT COALESCE(jsonb_agg(decision_worker(w,f.id) ORDER BY f.id),'[]') FROM workforce_entities f WHERE f.workspace_id=w AND f.status='active' AND f.hierarchy_level='department_director' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(snapshot->'watchIds') i WHERE decision_worker(w,f.id)->'departmentKeys'=decision_worker(w,i.value::uuid)->'departmentKeys')),
 'mandates',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',m.id,'version',m.version,'current',m.body->>'status'='active' AND (m.body->>'startsAt')::timestamptz<=now() AND (m.body->>'endsAt' IS NULL OR (m.body->>'endsAt')::timestamptz>now())) ORDER BY m.id),'[]') FROM workforce_mandate_versions m WHERE m.workspace_id=w AND m.version=(SELECT max(version) FROM workforce_mandate_versions WHERE mandate_id=m.mandate_id)
 AND (m.mandate_id::text=snapshot->'mandate'->>'id' OR (
 snapshot->'path' @> jsonb_build_array(m.workforce_id) AND m.body->>'departmentKey'=snapshot->'scopeProof'->>'departmentKey'
 AND m.body->'operations' @> jsonb_build_array(snapshot->'scopeProof'->>'operation')
 AND m.body->'entities' @> (snapshot->'scopeProof'->'entities')
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'scopeProof'->'entities') e WHERE m.body->'exclusions' @> jsonb_build_array(e.value))
 AND array_position(ARRAY['low','medium','high'],m.body->>'maxRisk')>=array_position(ARRAY['low','medium','high','critical'],snapshot->'scopeProof'->>'risk')))))::text,'UTF8')),'hex')
$$;

CREATE FUNCTION workforce_mandate_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE prior workforce_mandate_versions;worker JSONB;source JSONB;node JSONB;actor JSONB;closing BOOLEAN;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'decision_authority_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT decision_primary_owner(NEW.workspace_id,NEW.issuer_user_id) THEN RAISE EXCEPTION 'decision_authority_forbidden'; END IF;
 SELECT * INTO prior FROM workforce_mandate_versions WHERE mandate_id=NEW.mandate_id ORDER BY version DESC LIMIT 1;
 IF NEW.version<>COALESCE(prior.version,0)+1 OR prior.id IS NOT NULL AND (prior.workspace_id<>NEW.workspace_id OR prior.workforce_id<>NEW.workforce_id OR prior.body->'holder' IS DISTINCT FROM NEW.body->'holder' OR prior.body->>'status'='revoked') THEN RAISE EXCEPTION 'decision_authority_stale'; END IF;
 closing:=prior.id IS NOT NULL AND NEW.body->>'status' IN ('suspended','revoked');
 worker:=decision_worker(NEW.workspace_id,NEW.workforce_id);actor:=jsonb_build_object('kind','user','id',NEW.issuer_user_id);
 IF NOT closing AND (worker IS NULL OR worker->'active'<>'true' OR worker->'principal' IS DISTINCT FROM NEW.body->'holder' OR worker->'principal'=actor) THEN RAISE EXCEPTION 'decision_authority_principal_invalid'; END IF;
 IF NOT NEW.body ?& ARRAY['holder','decisionDomains','maxRisk','status','startsAt','endsAt','departmentKey','sourceDecisionId','operations','entities','exclusions','exclusionReason','reason'] OR NEW.body->>'startsAt' IS NULL OR NEW.body->>'maxRisk' IS NULL OR NEW.body->>'status' IS NULL THEN RAISE EXCEPTION 'decision_authority_scope_invalid'; END IF;
 IF NEW.body->'decisionDomains' IS DISTINCT FROM '["ordinary_domain"]'::jsonb OR NEW.body->>'maxRisk' NOT IN ('low','medium','high') OR NEW.body->>'status' NOT IN ('active','suspended','revoked') OR NEW.body->>'departmentKey'='00-ogolny' OR NOT closing AND worker->'departmentKeys' IS DISTINCT FROM jsonb_build_array(NEW.body->>'departmentKey') THEN RAISE EXCEPTION 'decision_authority_scope_invalid'; END IF;
 IF NEW.body->>'endsAt' IS NOT NULL AND (NEW.body->>'endsAt')::timestamptz<=(NEW.body->>'startsAt')::timestamptz THEN RAISE EXCEPTION 'decision_authority_scope_invalid'; END IF;
 IF jsonb_typeof(NEW.body->'operations') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.body->'operations') NOT BETWEEN 1 AND 4 OR NOT NEW.body->'operations'<@'["accept_decision","supersede_decision","answer_interview","accept_interview"]'::jsonb THEN RAISE EXCEPTION 'decision_authority_scope_invalid'; END IF;
 IF jsonb_typeof(NEW.body->'entities') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.body->'entities') NOT BETWEEN 1 AND 32 OR jsonb_typeof(NEW.body->'exclusions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'decision_authority_scope_invalid'; END IF;
 FOR node IN SELECT value FROM jsonb_array_elements((NEW.body->'entities')||(NEW.body->'exclusions')) LOOP
  IF node->>'type' NOT IN ('task','application','project','procedure') OR decision_node(NEW.workspace_id,node->>'type',(node->>'id')::uuid) IS NULL THEN RAISE EXCEPTION 'decision_authority_scope_invalid'; END IF;
 END LOOP;
 SELECT r.body INTO source FROM decision_revisions r JOIN decision_acceptances a ON a.decision_id=r.decision_id JOIN decisions d ON d.id=r.decision_id
 WHERE r.workspace_id=NEW.workspace_id AND r.decision_id=NEW.source_decision_id AND a.actor_user_id=NEW.issuer_user_id AND d.status='accepted' AND r.body->'authority'->>'domain'='mandate_change';
 IF source IS NULL OR NEW.source_decision_id::text IS DISTINCT FROM NEW.body->>'sourceDecisionId' OR prior.source_decision_id=NEW.source_decision_id THEN RAISE EXCEPTION 'decision_authority_source_required'; END IF;
 IF NOT (source->'authority'->'entities') @> (NEW.body->'entities') THEN RAISE EXCEPTION 'decision_authority_scope_invalid'; END IF;
 NEW.created_at:=now();RETURN NEW;
END $$;
CREATE TRIGGER workforce_mandate_guard BEFORE INSERT OR UPDATE OR DELETE ON workforce_mandate_versions FOR EACH ROW EXECUTE FUNCTION workforce_mandate_guard();

CREATE TABLE decision_authority_invalidations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,preview_id UUID NOT NULL REFERENCES decision_impact_previews(id) ON DELETE RESTRICT,
 prior_epoch TEXT NOT NULL,current_epoch TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(preview_id,current_epoch)
);
CREATE FUNCTION decision_authority_invalidate(w UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE p decision_impact_previews;epoch TEXT;t UUID;changed JSONB;
BEGIN
 FOR p IN SELECT x.* FROM decision_impact_previews x WHERE x.workspace_id=w AND x.authority->>'status'='delegated' AND x.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=x.decision_id) LOOP
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
CREATE FUNCTION decision_authority_source_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE row JSONB;worker_id UUID;w UUID;
BEGIN
 IF TG_TABLE_NAME='workforce_entities' AND TG_OP='UPDATE' AND
 (to_jsonb(OLD)-'name'-'avatar'-'description'-'updated_at'-'generated_files'-'sync_log'-'last_synced_at'-'sync_status') IS NOT DISTINCT FROM
 (to_jsonb(NEW)-'name'-'avatar'-'description'-'updated_at'-'generated_files'-'sync_log'-'last_synced_at'-'sync_status') THEN RETURN NULL;END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(CASE WHEN TG_OP='INSERT' THEN jsonb_build_array(to_jsonb(NEW)) WHEN TG_OP='DELETE' THEN jsonb_build_array(to_jsonb(OLD)) ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END) LOOP
  w:=CASE WHEN TG_TABLE_NAME='workspaces' THEN (row->>'id')::uuid ELSE (row->>'workspace_id')::uuid END;
  IF NOT EXISTS(SELECT 1 FROM decision_impact_previews WHERE workspace_id=w AND authority->>'status'='delegated') AND NOT EXISTS(SELECT 1 FROM task_interview_cases WHERE workspace_id=w AND authority->>'status'='delegated') THEN CONTINUE;END IF;
  worker_id:=CASE WHEN TG_TABLE_NAME='workforce_entities' THEN (row->>'id')::uuid WHEN TG_TABLE_NAME='organizational_department_relations' AND row->>'entity_type'='workforce' AND row->>'relationship_role'='owner' THEN (row->>'entity_id')::uuid ELSE NULL END;
  IF worker_id IS NOT NULL THEN
   INSERT INTO decision_source_revisions(workspace_id,node_type,node_id,revision) VALUES((row->>'workspace_id')::uuid,'workforce',worker_id,1) ON CONFLICT(workspace_id,node_type,node_id) DO UPDATE SET revision=decision_source_revisions.revision+1;
  END IF;
  IF TG_TABLE_NAME='workspace_memberships' THEN
   INSERT INTO decision_source_revisions(workspace_id,node_type,node_id,revision)
    SELECT (row->>'workspace_id')::uuid,'workforce',id,1 FROM workforce_entities WHERE workspace_id=(row->>'workspace_id')::uuid AND type='human' AND source='user' AND external_id=row->>'user_id'
    ON CONFLICT(workspace_id,node_type,node_id) DO UPDATE SET revision=decision_source_revisions.revision+1;
  END IF;
  IF (TG_TABLE_NAME='workspaces' AND (TG_OP<>'UPDATE' OR to_jsonb(OLD)->'owner_user_id' IS DISTINCT FROM to_jsonb(NEW)->'owner_user_id')) OR
   (TG_TABLE_NAME='workspace_memberships' AND EXISTS(SELECT 1 FROM workspaces WHERE id=(row->>'workspace_id')::uuid AND owner_user_id::text=row->>'user_id')) THEN
   INSERT INTO decision_source_revisions(workspace_id,node_type,node_id,revision) VALUES(CASE WHEN TG_TABLE_NAME='workspaces' THEN (row->>'id')::uuid ELSE (row->>'workspace_id')::uuid END,'authority_owner',CASE WHEN TG_TABLE_NAME='workspaces' THEN (row->>'id')::uuid ELSE (row->>'workspace_id')::uuid END,1)
    ON CONFLICT(workspace_id,node_type,node_id) DO UPDATE SET revision=decision_source_revisions.revision+1;
  END IF;
  PERFORM decision_authority_invalidate(CASE WHEN TG_TABLE_NAME='workspaces' THEN (row->>'id')::uuid ELSE (row->>'workspace_id')::uuid END);
 END LOOP;RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT;BEGIN FOREACH tbl IN ARRAY ARRAY['workforce_mandate_versions','workforce_entities','organizational_department_relations','workspace_memberships','workspaces'] LOOP
 EXECUTE format('CREATE TRIGGER decision_authority_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION decision_authority_source_changed()',tbl);
END LOOP;END $$;

CREATE FUNCTION decision_acceptance_authority_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE b JSONB;p decision_impact_previews;m workforce_mandate_versions;actor JSONB;worker JSONB;other JSONB;prior JSONB;node JSONB;seen UUID[]:='{}';downward BOOLEAN:=false;crossed BOOLEAN:=false;candidate UUID;selected UUID;matches INT;rank INT;
BEGIN
 IF TG_OP<>'INSERT' THEN RETURN NEW; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 SELECT body INTO b FROM decision_revisions WHERE decision_id=NEW.decision_id AND workspace_id=NEW.workspace_id;
 SELECT * INTO p FROM decision_impact_previews WHERE id=NEW.preview_id AND workspace_id=NEW.workspace_id AND decision_id=NEW.decision_id;
 IF b->'authority' IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(p.impact->'taskIds') affected WHERE NOT (b->'authority'->'entities') @> jsonb_build_array(jsonb_build_object('type','task','id',affected.value))) THEN RAISE EXCEPTION 'decision_authority_scope_invalid';END IF;
 actor:=CASE WHEN NEW.actor_user_id IS NOT NULL THEN jsonb_build_object('kind','user','id',NEW.actor_user_id) ELSE jsonb_build_object('kind','agent','id',NEW.actor_agent_id) END;
 IF b->'authority' IS NULL OR b->'authority'->>'domain' IN ('product_direction','money','legal','critical_risk','mandate_change') OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p.impact->'taskIds') t JOIN task_risk_assessments a ON a.id=task_risk_current(t.value::uuid) WHERE a.result->>'level'='critical') THEN
  IF NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) THEN RAISE EXCEPTION 'decision_authority_forbidden'; END IF;
  RETURN NEW;
 END IF;
 IF b->'authority'->>'domain' IS DISTINCT FROM 'ordinary_domain' OR p.authority IS NULL OR NEW.authority IS DISTINCT FROM p.authority OR NEW.authority->>'status'<>'delegated' OR NEW.authority->'principal' IS DISTINCT FROM actor OR NEW.authority->>'epoch' IS DISTINCT FROM decision_authority_epoch(NEW.workspace_id,NEW.authority) THEN RAISE EXCEPTION 'decision_authority_stale'; END IF;
 IF NEW.actor_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.actor_user_id AND role IN ('owner','admin','member')) THEN RAISE EXCEPTION 'decision_authority_forbidden'; END IF;
 IF NEW.actor_agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM api_keys k WHERE k.id=NEW.actor_credential_id AND k.workspace_id=NEW.workspace_id AND k.bound_agent_id=NEW.actor_agent_id AND k.active AND k.revoked_at IS NULL AND k.expires_at>now()) THEN RAISE EXCEPTION 'decision_authority_forbidden'; END IF;
 IF jsonb_array_length(NEW.authority->'path') NOT BETWEEN 1 AND 200 OR NEW.authority->'path'->>0 IS DISTINCT FROM b->'authority'->>'requesterId' OR NEW.authority->'path'->>-1 IS DISTINCT FROM b->'authority'->>'recipientId' THEN RAISE EXCEPTION 'decision_authority_path_invalid'; END IF;
 FOR node IN SELECT value FROM jsonb_array_elements(NEW.authority->'path') LOOP
  candidate:=(node #>> '{}')::uuid;
  IF candidate=ANY(seen) THEN RAISE EXCEPTION 'decision_authority_path_invalid'; END IF;seen:=array_append(seen,candidate);
  worker:=decision_worker(NEW.workspace_id,candidate);
  IF worker IS NULL OR worker->'active'<>'true' OR worker->'principal'='null'::jsonb OR jsonb_array_length(worker->'departmentKeys')<>1 OR worker->'departmentKeys'->>0='00-ogolny' THEN RAISE EXCEPTION 'decision_authority_path_invalid'; END IF;
  IF worker->>'hierarchyLevel'='department_director' THEN
   IF jsonb_array_length(worker->'managerIds')<>0 THEN
    other:=decision_worker(NEW.workspace_id,(worker->'managerIds'->>0)::uuid);
    IF other->'active' IS DISTINCT FROM 'true'::jsonb OR other->'principal' IS DISTINCT FROM jsonb_build_object('kind','user','id',(SELECT owner_user_id FROM workspaces WHERE id=NEW.workspace_id)) OR other->'managerIds' IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'decision_authority_path_invalid';END IF;
   END IF;
   IF (SELECT count(*) FROM workforce_entities f WHERE f.workspace_id=NEW.workspace_id AND f.status='active' AND f.hierarchy_level='department_director' AND decision_worker(NEW.workspace_id,f.id)->'departmentKeys'=worker->'departmentKeys')<>1 THEN RAISE EXCEPTION 'decision_authority_path_invalid';END IF;
  END IF;
  IF prior IS NOT NULL THEN
   IF prior->'departmentKeys' IS DISTINCT FROM worker->'departmentKeys' THEN
    IF crossed OR downward OR prior->>'hierarchyLevel' IS DISTINCT FROM 'department_director' OR worker->>'hierarchyLevel' IS DISTINCT FROM 'department_director' THEN RAISE EXCEPTION 'decision_authority_path_invalid'; END IF;crossed:=true;downward:=true;
   ELSIF prior->'managerIds' @> jsonb_build_array(candidate) THEN
    IF downward THEN RAISE EXCEPTION 'decision_authority_path_invalid';END IF;
   ELSIF worker->'managerIds' @> jsonb_build_array(prior->>'id') THEN downward:=true;
   ELSE RAISE EXCEPTION 'decision_authority_path_invalid'; END IF;
  END IF;
  -- Selection is ordered by the proven path, never by names or storage order.
  SELECT count(*),(array_agg(x.id))[1] INTO matches,selected FROM workforce_mandate_versions x WHERE x.workspace_id=NEW.workspace_id AND x.workforce_id=candidate
   AND x.version=(SELECT max(version) FROM workforce_mandate_versions WHERE mandate_id=x.mandate_id)
   AND x.issuer_user_id=(SELECT owner_user_id FROM workspaces WHERE id=NEW.workspace_id) AND x.body->'holder'=worker->'principal'
   AND x.body->'holder'<>jsonb_build_object('kind','user','id',x.issuer_user_id) AND x.body->>'status'='active'
   AND (x.body->>'startsAt')::timestamptz<=now() AND (x.body->>'endsAt' IS NULL OR (x.body->>'endsAt')::timestamptz>now())
   AND x.body->>'departmentKey'=b->'authority'->>'departmentKey' AND worker->'departmentKeys'=jsonb_build_array(x.body->>'departmentKey')
   AND x.body->'operations' @> jsonb_build_array(CASE WHEN b->>'supersedesId' IS NULL THEN 'accept_decision' ELSE 'supersede_decision' END)
   AND x.body->'entities' @> (b->'authority'->'entities') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b->'authority'->'entities') e WHERE x.body->'exclusions' @> jsonb_build_array(e.value))
   AND array_position(ARRAY['low','medium','high'],x.body->>'maxRisk') >= (SELECT max(array_position(ARRAY['low','medium','high','critical'],a.result->>'level')) FROM jsonb_array_elements_text(p.impact->'taskIds') t JOIN task_risk_assessments a ON a.id=task_risk_current(t.value::uuid));
  IF m.id IS NULL AND matches>0 THEN
   IF matches<>1 THEN RAISE EXCEPTION 'decision_authority_ambiguous';END IF;
   SELECT * INTO m FROM workforce_mandate_versions WHERE id=selected;
  END IF;
  prior:=worker;
 END LOOP;
 IF m.id IS NULL OR m.mandate_id::text IS DISTINCT FROM NEW.authority->'mandate'->>'id' OR m.version::text IS DISTINCT FROM NEW.authority->'mandate'->>'version' OR m.body->'holder' IS DISTINCT FROM actor THEN RAISE EXCEPTION 'decision_authority_forbidden'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_decision_acceptance_authority BEFORE INSERT ON decision_acceptances FOR EACH ROW EXECUTE FUNCTION decision_acceptance_authority_guard();
-- Keep every existing impact/risk/history check; replace only its owner-only
-- acceptance predicate with the authority guard above. Other commands remain owner-only.
DO $$ DECLARE definition TEXT;BEGIN
 SELECT pg_get_functiondef('decision_history_guard()'::regprocedure) INTO definition;
 definition:=replace(definition,'IF NOT task_interview_owner(NEW.workspace_id,NEW.actor_user_id) THEN','IF TG_TABLE_NAME<>''decision_acceptances'' AND NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) THEN');
 EXECUTE definition;
END $$;

ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_operation_check;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede'));
ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_check1;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('clarification_send','clarification_reply','interview_prepare','decision_supersede') OR execution_id IS NOT NULL);
ALTER TABLE native_capability_suspensions DROP CONSTRAINT native_capability_suspensions_operation_check;
ALTER TABLE native_capability_suspensions ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede'));
ALTER TABLE task_capability_uses ADD COLUMN governed_decision_acceptance_id UUID REFERENCES decision_acceptances(id) ON DELETE RESTRICT;
ALTER TABLE task_capability_uses DROP CONSTRAINT task_capability_uses_check;
ALTER TABLE task_capability_uses ADD CHECK(num_nonnulls(decision_id,action_id,handoff_id,handoff_decision_id,clarification_entry_id,interview_case_id,governed_decision_acceptance_id)=1);
ALTER TABLE decision_acceptances ADD COLUMN capability_grants JSONB NOT NULL DEFAULT '[]';

CREATE FUNCTION decision_capability_scope(t UUID,kid UUID,u UUID,b JSONB) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE p decision_impact_previews;k api_keys;authority JSONB;
BEGIN
 SELECT * INTO k FROM api_keys WHERE id=kid;
 SELECT * INTO p FROM decision_impact_previews WHERE id=(b->>'previewId')::uuid AND decision_id=(b->>'decisionId')::uuid AND workspace_id=k.workspace_id;
 authority:=p.authority;
 IF p.id IS NULL OR p.version<>(SELECT max(version) FROM decision_impact_previews WHERE decision_id=p.decision_id) OR NOT p.impact->'taskIds' @> jsonb_build_array(t) OR NOT decision_primary_owner(k.workspace_id,u)
 OR authority->>'status' IS DISTINCT FROM 'delegated' OR authority->'principal' IS DISTINCT FROM jsonb_build_object('kind','agent','id',k.bound_agent_id)
 OR authority->>'epoch' IS DISTINCT FROM decision_authority_epoch(k.workspace_id,authority) THEN RETURN NULL; END IF;
 RETURN encode(sha256(convert_to(jsonb_build_object('task',t,'preview',p.id,'authority',authority,'key',jsonb_build_object('id',k.id,'version',k.credential_version,'active',k.active,'revoked',k.revoked_at,'expiresAt',k.expires_at),'issuer',u)::text,'UTF8')),'hex');
END $$;
ALTER FUNCTION task_capability_base_before_suspension(task_capability_grants) RENAME TO task_capability_base_before_decision_authority;
CREATE FUNCTION task_capability_base_before_suspension(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE k api_keys;scope TEXT;
BEGIN
 IF g.operation<>'decision_supersede' THEN RETURN task_capability_base_before_decision_authority(g); END IF;
 IF EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id) THEN RETURN 'revoked'; END IF;
 IF g.valid_until<=clock_timestamp() THEN RETURN 'expired'; END IF;
 SELECT * INTO k FROM api_keys WHERE id=g.credential_id AND workspace_id=g.workspace_id AND bound_agent_id=g.agent_id;
 scope:=decision_capability_scope(g.task_id,g.credential_id,g.issuer_user_id,g.snapshot->'decision');
 IF k.id IS NULL OR NOT k.active OR k.revoked_at IS NOT NULL OR k.expires_at<=clock_timestamp() OR k.credential_version<>g.credential_version OR NOT k.scopes @> '["agent-runtime:write"]'::jsonb OR scope IS NULL OR scope IS DISTINCT FROM g.scope_hash THEN RETURN 'invalidated'; END IF;
 RETURN CASE WHEN g.valid_from>clock_timestamp() THEN 'pending' ELSE 'active' END;
END $$;
ALTER FUNCTION task_capability_status(task_capability_grants) RENAME TO task_capability_status_before_decision_authority;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE base TEXT;
BEGIN
 IF g.operation<>'decision_supersede' THEN RETURN task_capability_status_before_decision_authority(g); END IF;
 base:=task_capability_base(g);IF base<>'active' THEN RETURN base; END IF;
 IF EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN RETURN 'consumed'; END IF;
 IF decision_state((g.snapshot->'decision'->>'decisionId')::uuid)<>'pending' OR task_admission_seal(g.task_id,'decision_supersede') IS NULL THEN RETURN 'invalidated'; END IF;
 RETURN base;
END $$;
ALTER FUNCTION task_capability_effect_scope(task_capability_grants) RENAME TO task_capability_effect_scope_before_decision_authority;
CREATE FUNCTION task_capability_effect_scope(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF g.operation='decision_supersede' THEN RETURN decision_capability_scope(g.task_id,g.credential_id,g.issuer_user_id,g.snapshot->'decision');END IF;
 RETURN task_capability_effect_scope_before_decision_authority(g);
END $$;
DO $$ DECLARE definition TEXT;BEGIN
 SELECT pg_get_functiondef('task_capability_guard()'::regprocedure) INTO definition;
 definition:=replace(definition,'IF NEW.interview_case_id IS NOT NULL THEN',
 'IF NEW.governed_decision_acceptance_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM decision_acceptances receipt WHERE receipt.id=NEW.governed_decision_acceptance_id AND receipt.workspace_id=NEW.workspace_id AND receipt.actor_agent_id=g.agent_id AND receipt.actor_credential_id=g.credential_id AND receipt.capability_grants @> jsonb_build_array(jsonb_build_object(''taskId'',g.task_id,''grantId'',g.id)) AND g.operation=''decision_supersede'') THEN RAISE EXCEPTION ''capability_use_invalid''; END IF;
  ELSIF NEW.interview_case_id IS NOT NULL THEN');
 EXECUTE definition;
END $$;
CREATE FUNCTION decision_grant_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p decision_impact_previews;t UUID;
BEGIN
 IF NEW.actor_agent_id IS NULL THEN
  IF NEW.capability_grants<>'[]'::jsonb THEN RAISE EXCEPTION 'decision_authority_grant_invalid';END IF;RETURN NEW;
 END IF;
 SELECT * INTO p FROM decision_impact_previews WHERE id=NEW.preview_id;
 IF jsonb_array_length(NEW.capability_grants)<>jsonb_array_length(p.impact->'taskIds') THEN RAISE EXCEPTION 'decision_authority_grant_required'; END IF;
 FOR t IN SELECT value::uuid FROM jsonb_array_elements_text(p.impact->'taskIds') LOOP
  IF NOT EXISTS(SELECT 1 FROM task_capability_grants g WHERE g.workspace_id=NEW.workspace_id AND g.task_id=t AND g.agent_id=NEW.actor_agent_id AND g.credential_id=NEW.actor_credential_id AND g.operation='decision_supersede' AND g.snapshot->'decision'=jsonb_build_object('decisionId',NEW.decision_id,'previewId',NEW.preview_id) AND task_capability_status(g)='active' AND NEW.capability_grants @> jsonb_build_array(jsonb_build_object('taskId',t,'grantId',g.id))) THEN RAISE EXCEPTION 'decision_authority_grant_required';END IF;
 END LOOP;RETURN NEW;
END $$;
CREATE TRIGGER b_decision_grant_guard BEFORE INSERT ON decision_acceptances FOR EACH ROW EXECUTE FUNCTION decision_grant_guard();
CREATE FUNCTION decision_grant_receipt() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE item JSONB;
BEGIN
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.capability_grants) LOOP
  IF NOT EXISTS(SELECT 1 FROM task_capability_uses u WHERE u.grant_id=(item->>'grantId')::uuid AND u.governed_decision_acceptance_id=NEW.id) THEN RAISE EXCEPTION 'decision_authority_receipt_required';END IF;
 END LOOP;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER decision_grant_receipt AFTER INSERT ON decision_acceptances DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION decision_grant_receipt();
CREATE FUNCTION decision_grant_window_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE expiry TIMESTAMPTZ;
BEGIN
 IF NEW.operation<>'decision_supersede' THEN RETURN NEW;END IF;
 SELECT (authority->'mandate'->>'endsAt')::timestamptz INTO expiry FROM decision_impact_previews WHERE id=(NEW.snapshot->'decision'->>'previewId')::uuid;
 IF expiry IS NOT NULL AND NEW.valid_until>expiry THEN RAISE EXCEPTION 'decision_authority_grant_invalid';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER decision_grant_window_guard BEFORE INSERT ON task_capability_grants FOR EACH ROW EXECUTE FUNCTION decision_grant_window_guard();

CREATE FUNCTION decision_authority_task_current(t UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM decision_impact_previews p WHERE p.impact->'taskIds' @> jsonb_build_array(t) AND p.authority->>'status'='delegated'
  AND p.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=p.decision_id)
  AND NOT EXISTS(SELECT 1 FROM task_decision_effects e WHERE e.task_id=t AND e.supersedes_id=p.decision_id)
  AND p.authority->>'epoch' IS DISTINCT FROM decision_authority_epoch(p.workspace_id,p.authority))
$$;
ALTER FUNCTION task_admission_seal(UUID,TEXT) RENAME TO task_admission_seal_before_decision_authority;
CREATE FUNCTION task_admission_seal(t UUID,op TEXT) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
BEGIN
 -- A new owner Decision remains possible as the explicit reauthorization path.
 IF op<>'decision_supersede' AND NOT decision_authority_task_current(t) THEN RETURN NULL;END IF;
 RETURN task_admission_seal_before_decision_authority(t,op);
END $$;
CREATE FUNCTION decision_authority_invalidation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'decision_authority_history_immutable';END $$;
CREATE TRIGGER decision_authority_invalidation_guard BEFORE UPDATE OR DELETE ON decision_authority_invalidations FOR EACH ROW EXECUTE FUNCTION decision_authority_invalidation_guard();

ALTER TABLE task_interview_cases ADD COLUMN authority JSONB;
ALTER TABLE task_interview_cases DROP CONSTRAINT task_interview_cases_decision_class_check;
ALTER TABLE task_interview_cases ADD CHECK(decision_class IN ('product_direction','money','legal','critical_risk','mandate','task_scope','mandate_change','ordinary_domain'));
CREATE OR REPLACE FUNCTION task_interview_owner(w UUID,u UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$ SELECT decision_primary_owner(w,u) $$;
CREATE FUNCTION interview_authority_allows(w UUID,u UUID,b JSONB,a JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE m workforce_mandate_versions;
BEGIN
 IF b->>'decisionClass'<>'ordinary_domain' THEN RETURN decision_primary_owner(w,u);END IF;
 IF a IS NULL OR a->>'status' IS DISTINCT FROM 'delegated' OR a->'principal' IS DISTINCT FROM jsonb_build_object('kind','user','id',u) OR a->>'epoch' IS DISTINCT FROM decision_authority_epoch(w,a) THEN RETURN false;END IF;
 SELECT * INTO m FROM workforce_mandate_versions WHERE workspace_id=w AND mandate_id=(a->'mandate'->>'id')::uuid ORDER BY version DESC LIMIT 1;
 RETURN m.id IS NOT NULL AND m.version::text=a->'mandate'->>'version' AND m.body->>'status'='active' AND m.issuer_user_id<>u
 AND decision_primary_owner(w,m.issuer_user_id) AND m.body->'holder'=a->'principal'
 AND (m.body->>'startsAt')::timestamptz<=now() AND (m.body->>'endsAt' IS NULL OR (m.body->>'endsAt')::timestamptz>now())
 AND m.body->'operations' @> '["answer_interview","accept_interview"]'::jsonb
 AND m.body->'entities' @> (b->'authority'->'entities')
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b->'dependencies') d WHERE NOT m.body->'entities' @> jsonb_build_array(jsonb_build_object('type','task','id',d->>'taskId')) OR m.body->'exclusions' @> jsonb_build_array(jsonb_build_object('type','task','id',d->>'taskId')))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b->'dependencies') d LEFT JOIN task_risk_assessments r ON r.id=task_risk_current((d->>'taskId')::uuid) WHERE r.id IS NULL OR array_position(ARRAY['low','medium','high','critical'],r.result->>'level')>array_position(ARRAY['low','medium','high'],m.body->>'maxRisk'));
END $$;
DO $$ DECLARE definition TEXT;BEGIN
 SELECT pg_get_functiondef('task_interview_guard()'::regprocedure) INTO definition;
 definition:=replace(definition,'OR NOT task_interview_owner(NEW.workspace_id,NEW.principal_id)','OR NOT interview_authority_allows(NEW.workspace_id,NEW.principal_id,NEW.body,NEW.authority)');
 definition:=replace(definition,'OR NOT task_interview_owner(c.workspace_id,NEW.actor_user_id)','OR NOT interview_authority_allows(c.workspace_id,NEW.actor_user_id,c.body,c.authority)');
 definition:=replace(definition,'''dependencies'',''gathering'',''questions''','''dependencies'',''gathering'',''questions'',''authority''');
 definition:=replace(definition,'IF NEW.actor_user_id IS NOT NULL AND NOT EXISTS',
 'IF NEW.decision_class=''ordinary_domain'' AND NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) THEN RAISE EXCEPTION ''decision_authority_forbidden''; END IF;
  IF NEW.actor_user_id IS NOT NULL AND NOT EXISTS');
 EXECUTE definition;
END $$;
ALTER FUNCTION task_interview_pending(UUID) RENAME TO task_interview_pending_before_authority;
CREATE FUNCTION task_interview_pending(t UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT task_interview_pending_before_authority(t) OR EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)) AND c.decision_class='ordinary_domain' AND NOT EXISTS(SELECT 1 FROM task_interview_cases n WHERE n.supersedes_id=c.id) AND NOT interview_authority_allows(c.workspace_id,c.principal_id,c.body,c.authority))
$$;
ALTER FUNCTION decision_authority_invalidate(UUID) RENAME TO decision_authority_invalidate_before_interviews;
CREATE FUNCTION decision_authority_invalidate(w UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE c task_interview_cases;t UUID;changed JSONB;
BEGIN
 PERFORM decision_authority_invalidate_before_interviews(w);
 FOR c IN SELECT * FROM task_interview_cases x WHERE x.workspace_id=w AND x.decision_class='ordinary_domain' AND NOT EXISTS(SELECT 1 FROM task_interview_cases n WHERE n.supersedes_id=x.id) AND NOT interview_authority_allows(w,x.principal_id,x.body,x.authority) LOOP
  changed:=jsonb_build_array(jsonb_build_object('table','workforce_entities','id',c.authority->'mandate'->>'workforceId','operation','update','label','Interview authority changed','changedAt',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  FOR t IN SELECT (value->>'taskId')::uuid FROM jsonb_array_elements(c.body->'dependencies') LOOP
   UPDATE tasks SET execution_readiness=execution_readiness||jsonb_build_object('status','needs_revalidation','reason','decision_authority_changed','changedSources',changed) WHERE id=t AND workspace_id=w AND execution_readiness->>'status'='ready';
   UPDATE agent_executions SET context_invalidated_at=COALESCE(context_invalidated_at,now()),cancel_requested_at=COALESCE(cancel_requested_at,now()),context_invalidation=COALESCE(context_invalidation,jsonb_build_object('reason','decision_authority_changed','changedSources',changed)) WHERE task_id=t AND status='queued' AND context_invalidated_at IS NULL;
  END LOOP;
 END LOOP;
END $$;

-- The one-use permission to accept this preview is not a downstream business
-- dependency of that preview. Including it would invalidate its own risk proof.
DO $$ DECLARE definition TEXT;BEGIN
 SELECT pg_get_functiondef('decision_impact(uuid,jsonb)'::regprocedure) INTO definition;
 definition:=replace(definition,'FROM task_capability_grants WHERE task_id=ANY(tids)','FROM task_capability_grants WHERE task_id=ANY(tids) AND operation<>''decision_supersede''');
 EXECUTE definition;
END $$;

ALTER FUNCTION task_admission_view(UUID,TEXT) RENAME TO task_admission_view_before_authority_policy;
CREATE FUNCTION task_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE base JSONB;refs JSONB;expiry TIMESTAMPTZ;
BEGIN
 IF op<>'decision_supersede' AND NOT decision_authority_task_current(t) THEN RETURN jsonb_build_object('status','blocked','reason','decision_authority_changed','seal',NULL,'gates','[]'::jsonb);END IF;
 base:=task_admission_view_before_authority_policy(t,op);
 IF op='decision_supersede' OR base->>'seal' IS NULL THEN RETURN base;END IF;
 SELECT jsonb_agg(jsonb_build_object('id',p.id,'kind',p.kind,'epoch',decision_authority_epoch(p.workspace_id,p.authority)) ORDER BY p.kind,p.id),min((p.authority->'mandate'->>'endsAt')::timestamptz) INTO refs,expiry
 FROM (
 SELECT p.id,p.workspace_id,p.authority,'decision' AS kind FROM decision_impact_previews p WHERE p.impact->'taskIds' @> jsonb_build_array(t) AND p.authority->>'status'='delegated' AND p.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=p.decision_id)
 AND NOT EXISTS(SELECT 1 FROM task_decision_effects e WHERE e.task_id=t AND e.supersedes_id=p.decision_id)
 UNION ALL SELECT c.id,c.workspace_id,c.authority,'interview' FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)) AND c.authority->>'status'='delegated' AND NOT EXISTS(SELECT 1 FROM task_interview_cases n WHERE n.supersedes_id=c.id)
 ) p;
 IF refs IS NULL THEN RETURN base;END IF;
 RETURN base||jsonb_build_object('authority',refs,'expiresAt',least((base->>'expiresAt')::timestamptz,expiry),'seal',encode(sha256(convert_to((base->>'seal')||refs::text,'UTF8')),'hex'));
END $$;
ALTER FUNCTION decision_pending_version(UUID) RENAME TO decision_pending_version_before_authority_interviews;
CREATE FUNCTION decision_pending_version(t UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE cases JSONB;base TEXT:=decision_pending_version_before_authority_interviews(t);
BEGIN
 SELECT jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'authority',c.authority,'entry',(SELECT id FROM task_interview_entries WHERE case_id=c.id ORDER BY version DESC LIMIT 1)) ORDER BY c.id) INTO cases
 FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)) AND task_interview_status(c.id)<>'accepted' AND NOT EXISTS(SELECT 1 FROM task_interview_cases x WHERE x.supersedes_id=c.id);
 IF cases IS NULL THEN RETURN base;END IF;RETURN jsonb_build_object('decisions',base::jsonb,'interviews',cases)::text;
END $$;
CREATE FUNCTION decision_admission_required(t UUID,op TEXT) RETURNS TEXT[] LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF op='decision_supersede' AND (
 EXISTS(SELECT 1 FROM decision_revisions r JOIN decision_impact_previews p ON p.decision_id=r.decision_id WHERE r.body->'authority'->>'domain'='critical_risk' AND decision_state(r.decision_id)<>'accepted' AND p.impact->'taskIds' @> jsonb_build_array(t))
 OR EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.decision_class='critical_risk' AND task_interview_status(c.id)<>'accepted' AND NOT EXISTS(SELECT 1 FROM task_interview_cases x WHERE x.supersedes_id=c.id) AND c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)))) THEN
 RETURN ARRAY['procedure','extended_review','mandate','backup','restore_plan','owner_approval'];END IF;
 RETURN task_admission_required(t);
END $$;
DO $$ DECLARE definition TEXT;BEGIN
 SELECT pg_get_functiondef('decision_admission_view(uuid,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'required:=task_admission_required(t);','required:=decision_admission_required(t,op);');EXECUTE definition;
 SELECT pg_get_functiondef('task_admission_insert_guard()'::regprocedure) INTO definition;
 definition:=replace(definition,'task_admission_required(t.id)','decision_admission_required(t.id,NEW.operation)');EXECUTE definition;
END $$;
CREATE FUNCTION interview_acceptance_risk_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE c task_interview_cases;t UUID;level TEXT;
BEGIN
 IF NEW.action<>'accept' THEN RETURN NEW;END IF;SELECT * INTO c FROM task_interview_cases WHERE id=NEW.case_id;
 FOR t IN SELECT (value->>'taskId')::uuid FROM jsonb_array_elements(c.body->'dependencies') LOOP
  SELECT result->>'level' INTO level FROM task_risk_assessments WHERE id=task_risk_current(t);
  IF (c.decision_class='critical_risk' OR level IN ('high','critical')) AND task_admission_seal(t,'decision_supersede') IS NULL THEN RAISE EXCEPTION 'decision_risk_admission_required';END IF;
 END LOOP;RETURN NEW;
END $$;
CREATE TRIGGER a_interview_acceptance_risk_guard BEFORE INSERT ON task_interview_entries FOR EACH ROW EXECUTE FUNCTION interview_acceptance_risk_guard();

ALTER FUNCTION task_admission_independent(UUID,UUID) RENAME TO task_admission_independent_before_decision_authority;
CREATE FUNCTION task_admission_independent(t UUID,u UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT task_admission_independent_before_decision_authority(t,u)
 AND NOT EXISTS(SELECT 1 FROM decision_revisions r JOIN decision_impact_previews p ON p.decision_id=r.decision_id WHERE r.actor_user_id=u AND decision_state(r.decision_id)<>'accepted' AND p.impact->'taskIds' @> jsonb_build_array(t))
 AND NOT EXISTS(SELECT 1 FROM decision_impact_previews p WHERE p.authority->'principal'=jsonb_build_object('kind','user','id',u) AND decision_state(p.decision_id)<>'accepted' AND p.impact->'taskIds' @> jsonb_build_array(t))
 AND NOT EXISTS(SELECT 1 FROM task_interview_cases c JOIN task_interview_entries e ON e.case_id=c.id WHERE e.actor_user_id=u AND e.action='answer' AND task_interview_status(c.id)<>'accepted' AND c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',t)))
$$;

COMMIT;
