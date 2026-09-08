BEGIN;
-- Empty additive records only. Existing business records and acceptance history
-- are preserved; the new admission functions reject missing risk evidence.
CREATE TABLE task_risk_heads (
 task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE RESTRICT,
 source_revision BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE task_risk_scopes (
 id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, version INTEGER NOT NULL,
 application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 component_id UUID NOT NULL REFERENCES application_architecture_components(id) ON DELETE RESTRICT,
 release_set_id UUID REFERENCES company_records(id) ON DELETE RESTRICT,
 input JSONB NOT NULL, input_hash TEXT NOT NULL, actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(task_id,version), UNIQUE(workspace_id,request_id)
);
CREATE TABLE task_risk_source_watches (
 task_id UUID NOT NULL REFERENCES task_risk_heads(task_id) ON DELETE RESTRICT,
 source_table TEXT NOT NULL, predicate JSONB NOT NULL, PRIMARY KEY(task_id,source_table)
);
CREATE INDEX task_risk_source_watches_source_table_idx ON task_risk_source_watches(source_table);
CREATE TABLE task_risk_assessments (
 id UUID PRIMARY KEY, sequence BIGSERIAL UNIQUE, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, version INTEGER NOT NULL,
 source_version TEXT NOT NULL, sources JSONB NOT NULL, entries JSONB NOT NULL, result JSONB NOT NULL,
 joint_rationale TEXT NOT NULL, algorithm TEXT NOT NULL CHECK(algorithm='roost-native-risk-v1'),
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(task_id,version), UNIQUE(workspace_id,request_id)
);
CREATE INDEX task_risk_assessments_workspace_created_idx ON task_risk_assessments(workspace_id,created_at);

CREATE FUNCTION task_risk_group(target UUID) RETURNS TABLE(task_id UUID) LANGUAGE SQL STABLE AS $$
 WITH RECURSIVE vertices AS MATERIALIZED (
  SELECT t.id,t.workspace_id,t.goal_id,t.status,t.updated_at,
   COALESCE(s.application_id,(SELECT ap.application_id FROM application_projects ap WHERE ap.project_id=t.project_id ORDER BY ap.application_id LIMIT 1)) AS app,
   COALESCE(s.component_id::text,t.execution_readiness->'contract'->'singleTask'->'component'->>'id') AS component,
   s.release_set_id
  FROM tasks t LEFT JOIN LATERAL(SELECT * FROM task_risk_scopes WHERE task_id=t.id ORDER BY version DESC LIMIT 1)s ON true
  WHERE t.workspace_id=(SELECT workspace_id FROM tasks WHERE id=target)
 ), family(id) AS (
  SELECT target UNION
  SELECT v.id FROM family f JOIN vertices p ON p.id=f.id JOIN vertices v ON
   EXISTS(SELECT 1 FROM task_review_actions r WHERE r.workspace_id=p.workspace_id AND ((r.task_id=p.id AND r.child_task_id=v.id) OR (r.task_id=v.id AND r.child_task_id=p.id)))
   OR (v.app=p.app AND (v.status::text NOT IN ('done','archived','cancelled') OR v.updated_at>CURRENT_TIMESTAMP-INTERVAL '30 days')
    AND (v.component=p.component OR v.goal_id=p.goal_id OR v.release_set_id=p.release_set_id))
 ) SELECT id FROM family LIMIT 51
$$;
CREATE FUNCTION task_risk_sources(target UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('taskId',t.id,'scopeId',s.id,'sourceRevision',COALESCE(h.source_revision,0),
  'applicationId',s.application_id,'componentId',s.component_id,'releaseSetId',s.release_set_id,
  'scopeVersion',s.version,
  'applicationVersion',(SELECT to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') FROM applications WHERE id=s.application_id),
  'componentVersion',(SELECT to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') FROM application_architecture_components WHERE id=s.component_id),
  'taskVersion',encode(sha256(convert_to((to_jsonb(t)-ARRAY['execution_readiness','execution_role_provenance','updated_at','status'])::text,'UTF8')),'hex'),
  'status',CASE WHEN t.status::text IN ('todo','in_progress') THEN 'active' ELSE t.status::text END,
  'lineage',(SELECT COALESCE(jsonb_agg(r.id ORDER BY r.id),'[]') FROM task_review_actions r WHERE r.workspace_id=t.workspace_id AND (r.task_id=t.id OR r.child_task_id=t.id))) ORDER BY t.id),'[]')
 FROM task_risk_group(target) g JOIN tasks t ON t.id=g.task_id
 LEFT JOIN task_risk_heads h ON h.task_id=t.id
 LEFT JOIN LATERAL(SELECT * FROM task_risk_scopes WHERE task_id=t.id ORDER BY version DESC LIMIT 1)s ON true
$$;
CREATE FUNCTION task_risk_version(target UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(task_risk_sources(target)::text,'UTF8')),'hex')
$$;
CREATE FUNCTION task_risk_current(target UUID) RETURNS UUID LANGUAGE SQL STABLE AS $$
 SELECT a.id FROM (SELECT * FROM task_risk_assessments
 WHERE workspace_id=(SELECT workspace_id FROM tasks WHERE id=target)
  AND sources @> jsonb_build_array(jsonb_build_object('taskId',target)) ORDER BY sequence DESC LIMIT 1) a WHERE
  a.source_version=task_risk_version(target) AND a.result->>'status'='assessed'
  AND a.created_at>CURRENT_TIMESTAMP-INTERVAL '24 hours'
$$;

CREATE FUNCTION task_risk_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE item JSONB; ref JSONB; dim TEXT; n INTEGER; mx INTEGER; bump INTEGER; uncertain BOOLEAN; blocked BOOLEAN:=false; computed JSONB:='{}'; max_level INTEGER:=0;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'task_risk_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND workspace_id=NEW.workspace_id) OR
  NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=NEW.workspace_id AND user_id=NEW.actor_user_id AND role IN ('owner','admin','member'))
 THEN RAISE EXCEPTION 'task_risk_forbidden'; END IF;
 IF TG_TABLE_NAME='task_risk_scopes' THEN
  IF NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_risk_scopes WHERE task_id=NEW.task_id) OR
   (SELECT count(*) FROM application_projects ap JOIN tasks t ON t.project_id=ap.project_id WHERE t.id=NEW.task_id)<>1 OR
   NOT EXISTS(SELECT 1 FROM application_architecture_components c JOIN applications a ON a.id=c.application_id
    JOIN application_projects ap ON ap.application_id=a.id JOIN tasks t ON t.project_id=ap.project_id
    WHERE c.id=NEW.component_id AND c.status='active' AND a.slug<>'roost' AND a.id=NEW.application_id AND a.workspace_id=NEW.workspace_id AND t.id=NEW.task_id) OR
   (NEW.release_set_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM company_records WHERE id=NEW.release_set_id AND workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND status<>'archived'))
  THEN RAISE EXCEPTION 'task_risk_scope_invalid'; END IF;
 ELSE
  IF NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM task_risk_assessments WHERE task_id=NEW.task_id) OR
   NEW.source_version IS DISTINCT FROM task_risk_version(NEW.task_id) OR NEW.sources IS DISTINCT FROM task_risk_sources(NEW.task_id)
  THEN RAISE EXCEPTION 'task_risk_stale'; END IF;
  n:=jsonb_array_length(NEW.sources);
  IF n<1 OR n>50 OR n<>jsonb_array_length(NEW.entries) OR
   EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.sources)s WHERE s->>'scopeId' IS NULL OR
     (SELECT count(*) FROM jsonb_array_elements(NEW.entries)e WHERE e->>'taskId'=s->>'taskId')<>1)
  THEN RAISE EXCEPTION 'task_risk_group_incomplete'; END IF;
  bump:=CASE WHEN n>=4 THEN 2 WHEN n>=2 THEN 1 ELSE 0 END;
  uncertain:=EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.entries)e WHERE e->'uncertainty'->>'level'='bounded');
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.entries) LOOP
   IF item->'uncertainty'->>'level' NOT IN ('none','bounded','unverifiable') OR item->'uncertainty'->>'level' IS NULL OR
    jsonb_typeof(item->'contradictions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'task_risk_entry_invalid'; END IF;
   IF item->'uncertainty'->>'level'='unverifiable' OR jsonb_array_length(item->'contradictions')>0 THEN blocked:=true; END IF;
   IF length(COALESCE(item->'uncertainty'->>'reasons',''))<3 OR jsonb_typeof(item->'uncertainty'->'evidence') IS DISTINCT FROM 'array' OR jsonb_array_length(item->'uncertainty'->'evidence')<1 THEN RAISE EXCEPTION 'task_risk_entry_invalid'; END IF;
   FOR ref IN SELECT value FROM jsonb_array_elements(item->'uncertainty'->'evidence')
     UNION ALL SELECT jsonb_path_query(item,'$.dimensions.*.evidence[*]') LOOP
    IF NOT EXISTS(SELECT 1 FROM company_records r WHERE r.id::text=ref->>'id' AND r.workspace_id=NEW.workspace_id AND r.status<>'archived'
      AND (r.application_id IS NULL OR r.application_id::text=(SELECT s->>'applicationId' FROM jsonb_array_elements(NEW.sources)s WHERE s->>'taskId'=item->>'taskId'))
      AND length(trim(COALESCE(r.description,'')||COALESCE(r.business_purpose,'')||COALESCE(r.desired_state,'')||COALESCE(r.expected_behavior,'')))>0
      AND to_char(r.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=ref->>'revision') THEN RAISE EXCEPTION 'task_risk_evidence_stale'; END IF;
   END LOOP;
  END LOOP;
  FOREACH dim IN ARRAY ARRAY['money','data','security','availability','legal','reversibility','users'] LOOP
   mx:=0;
   FOR item IN SELECT value FROM jsonb_array_elements(NEW.entries) LOOP
    IF item->'dimensions'->dim->>'level' IS NULL OR item->'dimensions'->dim->>'level' NOT IN ('low','medium','high','critical') OR
     length(COALESCE(item->'dimensions'->dim->>'rationale',''))<3 OR jsonb_typeof(item->'dimensions'->dim->'evidence') IS DISTINCT FROM 'array' OR
     jsonb_array_length(item->'dimensions'->dim->'evidence')<1 THEN RAISE EXCEPTION 'task_risk_entry_invalid'; END IF;
    mx:=greatest(mx,array_position(ARRAY['low','medium','high','critical'],item->'dimensions'->dim->>'level')-1);
   END LOOP;
   mx:=least(3,mx+bump+CASE WHEN uncertain THEN 1 ELSE 0 END); max_level:=greatest(max_level,mx);
   computed:=computed||jsonb_build_object(dim,(ARRAY['low','medium','high','critical'])[mx+1]);
  END LOOP;
  IF NEW.result->'dimensions' IS DISTINCT FROM computed OR
   NEW.result->>'status' IS DISTINCT FROM (CASE WHEN blocked THEN 'needs_decision' ELSE 'assessed' END) OR
   NEW.result->>'level' IS DISTINCT FROM (CASE WHEN blocked THEN NULL ELSE (ARRAY['low','medium','high','critical'])[max_level+1] END)
  THEN RAISE EXCEPTION 'task_risk_result_invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_risk_history_guard BEFORE INSERT OR UPDATE OR DELETE ON task_risk_scopes FOR EACH ROW EXECUTE FUNCTION task_risk_history_guard();
CREATE TRIGGER task_risk_history_guard BEFORE INSERT OR UPDATE OR DELETE ON task_risk_assessments FOR EACH ROW EXECUTE FUNCTION task_risk_history_guard();

CREATE FUNCTION task_risk_invalidate(workspace UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE t RECORD;
BEGIN
 FOR t IN SELECT id,execution_readiness FROM tasks WHERE workspace_id=workspace AND execution_readiness->>'status'='ready' AND execution_readiness->>'riskAssessmentId' IS NOT NULL ORDER BY id LOOP
  IF task_risk_current(t.id)::text IS DISTINCT FROM t.execution_readiness->>'riskAssessmentId' THEN
   UPDATE tasks SET execution_readiness=execution_readiness||jsonb_build_object('status','needs_revalidation','reason','risk_context_changed','invalidatedAt',CURRENT_TIMESTAMP) WHERE id=t.id;
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION task_risk_source_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE before_row JSONB; after_row JSONB; watched RECORD; workspaces UUID[]:='{}'; w UUID; contract_changed BOOLEAN:=false;
BEGIN
 IF TG_OP<>'INSERT' THEN before_row:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN after_row:=to_jsonb(NEW); END IF;
 IF TG_TABLE_NAME='tasks' THEN
  contract_changed:=before_row->'execution_readiness'->'contract' IS DISTINCT FROM after_row->'execution_readiness'->'contract'
   AND after_row->'execution_readiness'->'contract' IS DISTINCT FROM (SELECT input->'contract' FROM task_risk_scopes WHERE task_id=COALESCE(after_row->>'id',before_row->>'id')::uuid ORDER BY version DESC LIMIT 1);
  before_row:=before_row-ARRAY['execution_readiness','execution_role_provenance','updated_at'];
  after_row:=after_row-ARRAY['execution_readiness','execution_role_provenance','updated_at'];
  IF before_row->>'status' IN ('todo','in_progress') THEN before_row:=jsonb_set(before_row,'{status}','"active"'); END IF;
  IF after_row->>'status' IN ('todo','in_progress') THEN after_row:=jsonb_set(after_row,'{status}','"active"'); END IF;
 END IF;
 IF before_row IS NOT DISTINCT FROM after_row AND NOT contract_changed THEN RETURN NULL; END IF;
 IF contract_changed THEN UPDATE task_risk_heads SET source_revision=source_revision+1 WHERE task_id=COALESCE(after_row->>'id',before_row->>'id')::uuid; END IF;
 FOR watched IN SELECT DISTINCT task_id FROM task_risk_source_watches WHERE (source_table=TG_TABLE_NAME OR TG_TABLE_NAME='company_records' AND source_table='risk_evidence') AND
  (ready_source_matches(before_row,predicate) OR ready_source_matches(after_row,predicate)) ORDER BY task_id LOOP
  UPDATE task_risk_heads SET source_revision=source_revision+1 WHERE task_id=watched.task_id;
  workspaces:=array_append(workspaces,(SELECT workspace_id FROM tasks WHERE id=watched.task_id));
 END LOOP;
 workspaces:=array_append(workspaces,COALESCE(after_row->>'workspace_id',before_row->>'workspace_id')::uuid);
 workspaces:=array_append(workspaces,(SELECT workspace_id FROM applications WHERE id=COALESCE(after_row->>'application_id',before_row->>'application_id')::uuid));
 FOR w IN SELECT DISTINCT unnest(workspaces) LOOP
  IF w IS NOT NULL THEN PERFORM task_risk_invalidate(w); END IF;
 END LOOP;
 RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT; BEGIN
 FOR tbl IN SELECT c.relname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE t.tgname='ready_source_changed' LOOP
  EXECUTE format('CREATE TRIGGER task_risk_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION task_risk_source_changed()',tbl);
 END LOOP;
END $$;
CREATE TRIGGER task_risk_source_changed AFTER INSERT ON task_risk_scopes FOR EACH ROW EXECUTE FUNCTION task_risk_source_changed();
CREATE TRIGGER task_risk_source_changed AFTER INSERT ON task_risk_assessments FOR EACH ROW EXECUTE FUNCTION task_risk_source_changed();
CREATE TRIGGER task_risk_source_changed AFTER INSERT ON task_review_actions FOR EACH ROW EXECUTE FUNCTION task_risk_source_changed();

CREATE FUNCTION task_risk_admission_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE accepted UUID; pin JSONB;
BEGIN
 IF TG_TABLE_NAME='tasks' THEN
  IF NEW.execution_readiness->>'status' IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
  accepted:=task_risk_current(NEW.id); pin:=NEW.execution_readiness;
 ELSE
  -- Editing historical terminal evidence cannot claim work. Its existing review
  -- material hash continues to invalidate grants and result decisions.
  IF TG_OP='UPDATE' AND OLD.status::text IN ('completed','failed','cancelled') AND NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text NOT IN ('queued','claimed','running','waiting_for_approval','completed') OR
   NEW.cancel_requested_at IS NOT NULL OR NEW.context_invalidated_at IS NOT NULL OR
   (TG_OP='UPDATE' AND OLD.context_invalidated_at IS NOT NULL) THEN RETURN NEW; END IF;
  accepted:=task_risk_current(NEW.task_id);
  SELECT execution_readiness INTO pin FROM tasks WHERE id=NEW.task_id;
 END IF;
 IF accepted IS NULL OR pin->>'riskAssessmentId' IS DISTINCT FROM accepted::text THEN RAISE EXCEPTION 'task_risk_assessment_required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_risk_admission_guard BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION task_risk_admission_guard();
CREATE TRIGGER task_risk_admission_guard BEFORE INSERT OR UPDATE ON agent_executions FOR EACH ROW EXECUTE FUNCTION task_risk_admission_guard();
ALTER FUNCTION task_capability_scope(UUID,UUID,UUID) RENAME TO task_capability_scope_before_risk;
CREATE FUNCTION task_capability_scope(t UUID,k UUID,u UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT encode(sha256(convert_to(task_capability_scope_before_risk(t,k,u)||
  (SELECT id::text FROM task_risk_assessments WHERE sources @> jsonb_build_array(jsonb_build_object('taskId',t)) ORDER BY sequence DESC LIMIT 1)||task_risk_version(t),'UTF8')),'hex')
$$;
ALTER FUNCTION task_capability_status(task_capability_grants) RENAME TO task_capability_status_before_risk;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN 'consumed'
  WHEN task_risk_current(g.task_id) IS NULL THEN 'invalidated' ELSE task_capability_status_before_risk(g) END
$$;
CREATE FUNCTION task_risk_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF task_risk_current(NEW.task_id) IS NULL THEN RAISE EXCEPTION 'task_risk_assessment_required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER task_risk_operation_guard BEFORE INSERT ON task_capability_grants FOR EACH ROW EXECUTE FUNCTION task_risk_operation_guard();
CREATE TRIGGER task_risk_operation_guard BEFORE INSERT ON task_review_decisions FOR EACH ROW EXECUTE FUNCTION task_risk_operation_guard();
CREATE TRIGGER task_risk_operation_guard BEFORE INSERT ON task_review_actions FOR EACH ROW EXECUTE FUNCTION task_risk_operation_guard();
COMMIT;
