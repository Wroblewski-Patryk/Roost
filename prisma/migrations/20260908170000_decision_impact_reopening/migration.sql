BEGIN;

CREATE TABLE decision_revisions (
 decision_id UUID PRIMARY KEY REFERENCES decisions(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 supersedes_id UUID UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,
 version INT NOT NULL CHECK(version>0), body JSONB NOT NULL, predecessor JSONB,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,request_id)
);
CREATE TABLE decision_impact_previews (
 id UUID PRIMARY KEY, decision_id UUID NOT NULL REFERENCES decision_revisions(decision_id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 version INT NOT NULL CHECK(version>0), impact JSONB NOT NULL,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL, request_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(decision_id,version),UNIQUE(workspace_id,request_id)
);
CREATE TABLE decision_acceptances (
 id UUID PRIMARY KEY,decision_id UUID UNIQUE NOT NULL REFERENCES decision_revisions(decision_id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 preview_id UUID UNIQUE NOT NULL REFERENCES decision_impact_previews(id) ON DELETE RESTRICT,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(workspace_id,request_id)
);
CREATE TABLE decision_deferrals (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 target_type TEXT NOT NULL CHECK(target_type IN ('decision','interview')),target_id UUID NOT NULL,
 version INT NOT NULL CHECK(version>0),reason TEXT NOT NULL CHECK(reason IN ('budget','infrastructure')),
 explanation TEXT NOT NULL,condition JSONB NOT NULL,baseline TEXT,reference_state JSONB,scope JSONB NOT NULL,
 interview_entry_id UUID REFERENCES task_interview_entries(id) ON DELETE RESTRICT,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(target_type,target_id,version),UNIQUE(workspace_id,request_id)
);
CREATE TABLE decision_reopening_events (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 deferral_id UUID UNIQUE NOT NULL REFERENCES decision_deferrals(id) ON DELETE RESTRICT,
 event_type TEXT NOT NULL CHECK(event_type IN ('resource_available','configuration_changed','owner_signal','deadline')),
 reference_revision TEXT,explanation TEXT NOT NULL,actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(workspace_id,request_id)
);
CREATE INDEX decision_deferrals_target ON decision_deferrals(workspace_id,target_type,target_id,version DESC);
CREATE TABLE decision_source_revisions(workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,node_type TEXT NOT NULL,node_id UUID NOT NULL,revision BIGINT NOT NULL DEFAULT 1,PRIMARY KEY(workspace_id,node_type,node_id));
CREATE FUNCTION decision_source_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE b JSONB;a JSONB;w UUID;k TEXT;n UUID;row JSONB;
BEGIN
 IF TG_OP<>'INSERT' THEN b:=to_jsonb(OLD);END IF;IF TG_OP<>'DELETE' THEN a:=to_jsonb(NEW);END IF;
 IF TG_TABLE_NAME='tasks' AND (b-'execution_readiness'-'updated_at') IS NOT DISTINCT FROM (a-'execution_readiness'-'updated_at') THEN RETURN NULL;END IF;
 IF b IS NOT DISTINCT FROM a THEN RETURN NULL;END IF;
 FOR row IN SELECT x FROM jsonb_array_elements(jsonb_build_array(b,a)) x WHERE x<>'null'::jsonb LOOP
  w:=(row->>'workspace_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM decision_revisions WHERE workspace_id=w) THEN CONTINUE;END IF;
  IF TG_TABLE_NAME='dependencies' THEN
   IF row->>'from_entity_id' ~* '^[a-f0-9-]{36}$' THEN INSERT INTO decision_source_revisions VALUES(w,row->>'from_entity_type',(row->>'from_entity_id')::uuid,1) ON CONFLICT(workspace_id,node_type,node_id) DO UPDATE SET revision=decision_source_revisions.revision+1;END IF;
   IF row->>'to_entity_id' ~* '^[a-f0-9-]{36}$' THEN INSERT INTO decision_source_revisions VALUES(w,row->>'to_entity_type',(row->>'to_entity_id')::uuid,1) ON CONFLICT(workspace_id,node_type,node_id) DO UPDATE SET revision=decision_source_revisions.revision+1;END IF;
  ELSE
   k:=CASE TG_TABLE_NAME WHEN 'company_records' THEN 'company_record' ELSE left(TG_TABLE_NAME,-1) END;n:=(row->>'id')::uuid;
   INSERT INTO decision_source_revisions VALUES(w,k,n,1) ON CONFLICT(workspace_id,node_type,node_id) DO UPDATE SET revision=decision_source_revisions.revision+1;
  END IF;
 END LOOP;RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT;BEGIN FOREACH tbl IN ARRAY ARRAY['tasks','projects','applications','procedures','company_records','resources','decisions','dependencies'] LOOP EXECUTE format('CREATE TRIGGER decision_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION decision_source_changed()',tbl);END LOOP;END $$;
CREATE TABLE task_decision_effects (
 id UUID PRIMARY KEY,workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,
 supersedes_id UUID REFERENCES decisions(id) ON DELETE RESTRICT,acceptance_id UUID NOT NULL REFERENCES decision_acceptances(id) ON DELETE RESTRICT,
 UNIQUE(task_id,decision_id)
);
CREATE FUNCTION task_decision_effect_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'decision_history_immutable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM decision_acceptances a JOIN decision_impact_previews p ON p.id=a.preview_id JOIN decision_revisions r ON r.decision_id=a.decision_id WHERE a.id=NEW.acceptance_id AND a.workspace_id=NEW.workspace_id AND a.decision_id=NEW.decision_id AND r.supersedes_id IS NOT DISTINCT FROM NEW.supersedes_id AND p.impact->'taskIds' @> to_jsonb(ARRAY[NEW.task_id])) THEN RAISE EXCEPTION 'decision_scope_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER decision_effect_guard BEFORE INSERT OR UPDATE OR DELETE ON task_decision_effects FOR EACH ROW EXECUTE FUNCTION task_decision_effect_guard();
CREATE TRIGGER ready_source_fence BEFORE INSERT OR UPDATE OR DELETE ON task_decision_effects FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock();
CREATE TRIGGER ready_source_changed AFTER INSERT OR UPDATE OR DELETE ON task_decision_effects FOR EACH ROW EXECUTE FUNCTION ready_source_invalidate();

CREATE FUNCTION decision_node(w UUID,k TEXT,n UUID) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE r JSONB;
BEGIN
 CASE k
 WHEN 'task' THEN SELECT to_jsonb(t)-'execution_readiness'-'updated_at' INTO r FROM tasks t WHERE id=n AND workspace_id=w;
 WHEN 'application' THEN SELECT to_jsonb(t) INTO r FROM applications t WHERE id=n AND workspace_id=w;
 WHEN 'project' THEN SELECT to_jsonb(t) INTO r FROM projects t WHERE id=n AND workspace_id=w;
 WHEN 'procedure' THEN SELECT to_jsonb(t) INTO r FROM procedures t WHERE id=n AND workspace_id=w;
 WHEN 'company_record' THEN SELECT to_jsonb(t) INTO r FROM company_records t WHERE id=n AND workspace_id=w;
 WHEN 'resource' THEN SELECT to_jsonb(t) INTO r FROM resources t WHERE id=n AND workspace_id=w;
 WHEN 'decision' THEN SELECT to_jsonb(t) INTO r FROM decisions t WHERE id=n AND workspace_id=w;
 ELSE RETURN NULL;
 END CASE;
 RETURN r;
END $$;
CREATE FUNCTION decision_node_table(k TEXT) RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
 SELECT CASE k WHEN 'company_record' THEN 'company_records' WHEN 'resource' THEN 'resources' WHEN 'decision' THEN 'decisions' WHEN 'task' THEN 'tasks' WHEN 'application' THEN 'applications' WHEN 'project' THEN 'projects' WHEN 'procedure' THEN 'procedures' END
$$;
CREATE FUNCTION decision_downstream(w UUID, roots JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE nodes JSONB:='[]';queue JSONB:=roots;n JSONB;r JSONB;next JSONB;key TEXT;seen TEXT[]:='{}';
BEGIN
 WHILE jsonb_array_length(queue)>0 LOOP
  n:=queue->0;queue:=queue-0;key:=n->>'type'||':'||(n->>'id');
  IF key=ANY(seen) THEN CONTINUE; END IF;
  IF cardinality(seen)>=200 THEN RAISE EXCEPTION 'decision_impact_too_large'; END IF;
  r:=decision_node(w,n->>'type',(n->>'id')::uuid);
  IF r IS NULL THEN RAISE EXCEPTION 'decision_scope_invalid'; END IF;
  seen:=array_append(seen,key);nodes:=nodes||jsonb_build_array(n||jsonb_build_object('title',COALESCE(r->>'title',r->>'name','Record'),'revision',encode(sha256(convert_to(r::text||COALESCE((SELECT revision::text FROM decision_source_revisions WHERE workspace_id=w AND node_type=n->>'type' AND node_id=(n->>'id')::uuid),'0'),'UTF8')),'hex')));
  FOR next IN
   SELECT jsonb_build_object('type',d.from_entity_type,'id',d.from_entity_id) FROM dependencies d
    WHERE d.workspace_id=w AND d.status='active' AND d.dependency_type IN ('depends_on','requires') AND d.to_entity_type=n->>'type' AND d.to_entity_id=n->>'id'
   UNION SELECT jsonb_build_object('type',d.to_entity_type,'id',d.to_entity_id) FROM dependencies d
    WHERE d.workspace_id=w AND d.status='active' AND d.dependency_type IN ('blocks','review_correction') AND d.from_entity_type=n->>'type' AND d.from_entity_id=n->>'id'
   UNION SELECT jsonb_build_object('type','project','id',p.id) FROM application_projects ap JOIN projects p ON p.id=ap.project_id AND p.workspace_id=w WHERE n->>'type'='application' AND ap.application_id::text=n->>'id'
   UNION SELECT jsonb_build_object('type','task','id',t.id) FROM tasks t WHERE t.workspace_id=w AND n->>'type'='project' AND t.project_id::text=n->>'id'
   UNION SELECT jsonb_build_object('type','task','id',t.id) FROM tasks t JOIN task_admission_scopes s ON s.task_id=t.id WHERE t.workspace_id=w AND n->>'type'='procedure' AND s.procedure_id::text=n->>'id' AND s.version=(SELECT max(version) FROM task_admission_scopes WHERE task_id=t.id)
   UNION SELECT jsonb_build_object('type','task','id',watch.task_id) FROM (SELECT * FROM task_ready_source_watches UNION SELECT * FROM task_risk_source_watches) watch JOIN tasks t ON t.id=watch.task_id AND t.workspace_id=w
    WHERE (watch.source_table=decision_node_table(n->>'type') OR n->>'type'='company_record' AND watch.source_table='risk_evidence') AND ready_source_matches(r,watch.predicate)
   UNION SELECT value FROM decision_revisions d CROSS JOIN LATERAL jsonb_array_elements(d.body->'scope') WHERE n->>'type'='decision' AND d.decision_id::text=n->>'id' AND d.workspace_id=w
  LOOP
   IF decision_node_table(next->>'type') IS NULL OR next->>'id' IS NULL THEN RAISE EXCEPTION 'decision_scope_invalid'; END IF;
   queue:=queue||jsonb_build_array(next);
  END LOOP;
 END LOOP;
 RETURN (SELECT COALESCE(jsonb_agg(value ORDER BY value->>'type',value->>'id'),'[]') FROM jsonb_array_elements(nodes));
END $$;
CREATE FUNCTION decision_impact(w UUID,roots JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE nodes JSONB; tids UUID[]; contexts JSONB;grants JSONB;handoffs JSONB;interviews JSONB;gates JSONB;
BEGIN
 nodes:=decision_downstream(w,roots);SELECT array_agg((value->>'id')::uuid) INTO tids FROM jsonb_array_elements(nodes) WHERE value->>'type'='task';
 SELECT COALESCE(jsonb_agg(x ORDER BY x->>'type',x->>'id'),'[]') INTO contexts FROM (
  SELECT DISTINCT jsonb_build_object('type','project','id',p.id,'title',p.name,'effect','context') x FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.id=ANY(tids)
  UNION SELECT DISTINCT jsonb_build_object('type','application','id',a.id,'title',a.name,'effect','context') FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id JOIN applications a ON a.id=ap.application_id AND a.workspace_id=w WHERE t.id=ANY(tids)
  UNION SELECT DISTINCT jsonb_build_object('type','procedure','id',p.id,'title',p.name,'effect','revalidation') FROM task_admission_scopes s JOIN procedures p ON p.id=s.procedure_id WHERE s.task_id=ANY(tids) AND s.version=(SELECT max(version) FROM task_admission_scopes WHERE task_id=s.task_id)
 ) rows;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'taskId',task_id,'operation',operation) ORDER BY id),'[]') INTO grants FROM task_capability_grants WHERE task_id=ANY(tids);
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'taskId',task_id) ORDER BY id),'[]') INTO handoffs FROM task_handoffs WHERE task_id=ANY(tids);
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'taskId',task_id,'status',task_interview_status(id)) ORDER BY id),'[]') INTO interviews FROM task_interview_cases c WHERE workspace_id=w AND NOT EXISTS(SELECT 1 FROM task_interview_cases n WHERE n.supersedes_id=c.id) AND task_interview_status(id)<>'accepted' AND EXISTS(SELECT 1 FROM jsonb_array_elements(c.body->'dependencies') d WHERE (d->>'taskId')::uuid=ANY(tids));
 SELECT COALESCE(jsonb_agg(jsonb_build_object('taskId',t.id,'scopeId',s.id,'riskId',task_risk_current(t.id)) ORDER BY t.id),'[]') INTO gates FROM tasks t LEFT JOIN LATERAL (SELECT id FROM task_admission_scopes WHERE task_id=t.id ORDER BY version DESC LIMIT 1) s ON true WHERE t.id=ANY(tids);
 RETURN jsonb_build_object('nodes',nodes,'taskIds',COALESCE(to_jsonb(tids),'[]'),'contexts',contexts,'grants',grants,'handoffs',handoffs,'interviews',interviews,'gates',gates);
END $$;
-- Reads preserve immutable history even after an unaccepted scope loses a source.
CREATE FUNCTION decision_current_impact(w UUID,roots JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN RETURN decision_impact(w,roots);
EXCEPTION WHEN raise_exception THEN
 IF SQLERRM IN ('decision_scope_invalid','decision_impact_too_large') THEN RETURN NULL;END IF;
 RAISE;
END $$;
CREATE FUNCTION decision_epoch(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT COALESCE(jsonb_agg(a.id ORDER BY a.id)::text,'[]') FROM decision_acceptances a JOIN decision_impact_previews p ON p.id=a.preview_id WHERE p.impact->'taskIds' @> to_jsonb(ARRAY[t])
$$;
ALTER FUNCTION task_admission_source(UUID) RENAME TO task_admission_source_before_decision;
CREATE FUNCTION task_admission_source(t UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE base TEXT:=task_admission_source_before_decision(t); epoch TEXT:=decision_epoch(t);
BEGIN IF epoch='[]' THEN RETURN base; END IF;RETURN encode(sha256(convert_to(base||epoch,'UTF8')),'hex');END $$;
ALTER FUNCTION task_capability_scope(UUID,UUID,UUID) RENAME TO task_capability_scope_before_decision;
CREATE FUNCTION task_capability_scope(t UUID,k UUID,u UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE base TEXT:=task_capability_scope_before_decision(t,k,u);epoch TEXT:=decision_epoch(t);
BEGIN IF epoch='[]' THEN RETURN base; END IF;RETURN encode(sha256(convert_to(base||epoch,'UTF8')),'hex');END $$;
ALTER FUNCTION task_interview_source(UUID) RENAME TO task_interview_source_before_decision;
CREATE FUNCTION task_interview_source(t UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE base TEXT:=task_interview_source_before_decision(t);epoch TEXT:=decision_epoch(t);
BEGIN IF epoch='[]' THEN RETURN base; END IF;RETURN encode(sha256(convert_to(base||epoch,'UTF8')),'hex');END $$;

CREATE FUNCTION decision_state(d UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM decision_acceptances WHERE decision_id=d) THEN 'accepted'
 WHEN EXISTS(SELECT 1 FROM decision_deferrals f WHERE f.target_type='decision' AND f.target_id=d AND NOT EXISTS(SELECT 1 FROM decision_reopening_events WHERE deferral_id=f.id)) THEN 'deferred' ELSE 'pending' END
$$;
ALTER FUNCTION task_interview_status(UUID) RENAME TO task_interview_status_before_reopening;
CREATE FUNCTION task_interview_status(c UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM decision_deferrals d JOIN decision_reopening_events e ON e.deferral_id=d.id WHERE d.target_type='interview' AND d.target_id=c AND d.interview_entry_id=(SELECT id FROM task_interview_entries WHERE case_id=c ORDER BY version DESC LIMIT 1)) THEN 'pending' ELSE task_interview_status_before_reopening(c) END
$$;

CREATE FUNCTION decision_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE d decisions;p decision_impact_previews;body JSONB;n JSONB;available JSONB;required_scope JSONB;t UUID;prior decision_deferrals;ref JSONB;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'decision_history_immutable'; END IF;
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;NEW.created_at:=now();
 IF NOT task_interview_owner(NEW.workspace_id,NEW.actor_user_id) THEN RAISE EXCEPTION 'decision_forbidden'; END IF;
 IF TG_TABLE_NAME='decision_revisions' THEN
  SELECT * INTO d FROM decisions WHERE id=NEW.decision_id;
  IF d.workspace_id IS DISTINCT FROM NEW.workspace_id OR d.source<>'roost_decision' OR d.status<>'proposed' OR d.supersedes_id IS DISTINCT FROM NEW.supersedes_id OR NEW.body->>'decision' IS DISTINCT FROM d.decision OR NEW.body->>'title' IS DISTINCT FROM d.title THEN RAISE EXCEPTION 'decision_proposal_invalid'; END IF;
  IF NEW.body->>'context' IS DISTINCT FROM d.context OR NEW.body->>'rationale' IS DISTINCT FROM d.rationale OR NEW.body->>'consequences' IS DISTINCT FROM d.consequences THEN RAISE EXCEPTION 'decision_proposal_invalid'; END IF;
  FOR n IN SELECT value FROM jsonb_array_elements(jsonb_build_array(NEW.body->'title',NEW.body->'context',NEW.body->'decision',NEW.body->'rationale',NEW.body->'consequences',NEW.body->'scopeReason')) LOOP IF jsonb_typeof(n) IS DISTINCT FROM 'string' OR length(trim(n #>> '{}'))<3 THEN RAISE EXCEPTION 'decision_proposal_invalid';END IF;END LOOP;
  IF jsonb_typeof(NEW.body->'scope') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.body->'scope') NOT BETWEEN 1 AND 8 OR jsonb_typeof(NEW.body->'conflicts') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'decision_scope_invalid'; END IF;
  IF NEW.supersedes_id IS NOT NULL THEN
   SELECT * INTO d FROM decisions WHERE id=NEW.supersedes_id AND workspace_id=NEW.workspace_id AND status IN ('approved','accepted','active');
   IF d.id IS NULL OR NEW.predecessor IS DISTINCT FROM to_jsonb(d) OR jsonb_array_length(NEW.body->'conflicts') NOT BETWEEN 1 AND 12 OR NEW.version<>COALESCE((SELECT version FROM decision_revisions WHERE decision_id=d.id),0)+1 THEN RAISE EXCEPTION 'decision_conflict_invalid'; END IF;
   FOR n IN SELECT value FROM jsonb_array_elements(NEW.body->'conflicts') LOOP
    IF n->>'kind' NOT IN ('contradicts','narrows','replaces') OR length(COALESCE(n->>'oldProvision',''))<3 OR strpos(COALESCE(d.decision,''),n->>'oldProvision')=0 OR length(COALESCE(n->>'newProvision',''))<3 OR strpos(NEW.body->>'decision',n->>'newProvision')=0 OR length(COALESCE(n->>'explanation',''))<3 THEN RAISE EXCEPTION 'decision_conflict_invalid'; END IF;
   END LOOP;
   available:=decision_downstream(NEW.workspace_id,jsonb_build_array(jsonb_build_object('type','decision','id',d.id)));
   FOR n IN SELECT value FROM jsonb_array_elements(NEW.body->'scope') LOOP
    IF n->>'type'='decision' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(available) a WHERE a->>'type'=n->>'type' AND a->>'id'=n->>'id') THEN RAISE EXCEPTION 'decision_scope_expansion'; END IF;
   END LOOP;
  ELSIF NEW.version<>1 OR NEW.predecessor IS NOT NULL OR NEW.body->'conflicts'<>'[]'::jsonb THEN RAISE EXCEPTION 'decision_conflict_invalid'; END IF;
  available:=decision_impact(NEW.workspace_id,NEW.body->'scope');
  IF jsonb_array_length(available->'taskIds')=0 THEN RAISE EXCEPTION 'decision_task_required'; END IF;
 ELSIF TG_TABLE_NAME='decision_impact_previews' THEN
  SELECT r.body INTO body FROM decision_revisions r WHERE r.decision_id=NEW.decision_id AND r.workspace_id=NEW.workspace_id;
  IF body IS NULL OR decision_state(NEW.decision_id)='accepted' OR NEW.impact IS DISTINCT FROM decision_impact(NEW.workspace_id,body->'scope') OR NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM decision_impact_previews WHERE decision_id=NEW.decision_id) THEN RAISE EXCEPTION 'decision_stale'; END IF;
 ELSIF TG_TABLE_NAME='decision_acceptances' THEN
  SELECT * INTO p FROM decision_impact_previews WHERE id=NEW.preview_id AND decision_id=NEW.decision_id AND workspace_id=NEW.workspace_id;
  SELECT r.body INTO body FROM decision_revisions r WHERE r.decision_id=NEW.decision_id;
  IF p.id IS NULL OR decision_state(NEW.decision_id)<>'pending' OR p.version<>(SELECT max(version) FROM decision_impact_previews WHERE decision_id=NEW.decision_id) OR p.impact IS DISTINCT FROM decision_impact(NEW.workspace_id,body->'scope') THEN RAISE EXCEPTION 'decision_stale'; END IF;
  FOR t IN SELECT value::text::uuid FROM jsonb_array_elements_text(p.impact->'taskIds') LOOP
   IF task_admission_seal(t,'decision_supersede') IS NULL THEN RAISE EXCEPTION 'decision_risk_admission_required'; END IF;
  END LOOP;
 ELSIF TG_TABLE_NAME='decision_deferrals' THEN
  SELECT * INTO prior FROM decision_deferrals WHERE target_type=NEW.target_type AND target_id=NEW.target_id ORDER BY version DESC LIMIT 1;
  IF NEW.version<>COALESCE(prior.version,0)+1 OR prior.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM decision_reopening_events WHERE deferral_id=prior.id) THEN RAISE EXCEPTION 'decision_transition_invalid'; END IF;
  IF NEW.target_type='decision' THEN
   SELECT r.body->'scope' INTO required_scope FROM decision_revisions r WHERE r.decision_id=NEW.target_id AND r.workspace_id=NEW.workspace_id;
   IF decision_state(NEW.target_id)<>'pending' THEN RAISE EXCEPTION 'decision_transition_invalid'; END IF;
  ELSE
   SELECT jsonb_build_array(jsonb_build_object('type','task','id',c.task_id)) INTO required_scope FROM task_interview_cases c WHERE c.id=NEW.target_id AND c.workspace_id=NEW.workspace_id AND c.principal_id=NEW.actor_user_id AND NOT EXISTS(SELECT 1 FROM task_interview_cases x WHERE x.supersedes_id=c.id);
   IF NOT EXISTS(SELECT 1 FROM task_interview_entries WHERE id=NEW.interview_entry_id AND case_id=NEW.target_id AND action='defer' AND actor_user_id=NEW.actor_user_id) OR task_interview_status(NEW.target_id)<>'deferred' THEN RAISE EXCEPTION 'decision_transition_invalid'; END IF;
  END IF;
  IF required_scope IS NULL OR required_scope IS DISTINCT FROM NEW.scope OR length(trim(NEW.explanation))<3 THEN RAISE EXCEPTION 'decision_scope_invalid'; END IF;
  IF NEW.condition->>'type' IN ('resource_available','configuration_changed') THEN
   ref:=decision_node(NEW.workspace_id,CASE WHEN NEW.condition->>'type'='resource_available' THEN 'resource' ELSE 'company_record' END,(NEW.condition->>'referenceId')::uuid);
   IF ref IS NULL OR NEW.baseline IS DISTINCT FROM encode(sha256(convert_to(ref::text,'UTF8')),'hex') OR NEW.condition->>'type'='configuration_changed' AND ref->>'record_type'<>'configuration' THEN RAISE EXCEPTION 'decision_event_invalid'; END IF;
   NEW.reference_state:=CASE WHEN NEW.condition->>'type'='resource_available' THEN jsonb_build_object('available',ref->'metadata'->'available','capacity',ref->'metadata'->'capacity') ELSE jsonb_build_object('configurationHash',encode(sha256(convert_to((ref->'metadata'->'configuration')::text,'UTF8')),'hex')) END;
   IF NEW.condition->>'type'='configuration_changed' AND jsonb_typeof(ref->'metadata'->'configuration') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'decision_event_invalid';END IF;
   IF NOT EXISTS(SELECT 1 FROM dependencies dep CROSS JOIN LATERAL jsonb_array_elements(NEW.scope) scope_item WHERE dep.workspace_id=NEW.workspace_id AND dep.status='active' AND dep.dependency_type IN ('depends_on','requires') AND dep.from_entity_type=scope_item->>'type' AND dep.from_entity_id=scope_item->>'id' AND dep.to_entity_id=NEW.condition->>'referenceId' AND dep.to_entity_type=CASE WHEN NEW.condition->>'type'='resource_available' THEN 'resource' ELSE 'company_record' END) THEN RAISE EXCEPTION 'decision_scope_invalid'; END IF;
  ELSIF NEW.condition->>'type'='deadline' THEN
   IF (NEW.condition->>'dueAt')::timestamptz<=now() OR (NEW.condition->>'dueAt')::timestamptz>now()+interval '5 years' THEN RAISE EXCEPTION 'decision_event_invalid'; END IF;
  ELSIF NEW.condition->>'type' IS DISTINCT FROM 'owner_signal' THEN RAISE EXCEPTION 'decision_event_invalid'; END IF;
 ELSE
  SELECT * INTO prior FROM decision_deferrals WHERE id=NEW.deferral_id AND workspace_id=NEW.workspace_id;
  IF prior.id IS NULL OR NEW.event_type IS DISTINCT FROM prior.condition->>'type' OR length(trim(NEW.explanation))<3 THEN RAISE EXCEPTION 'decision_event_invalid'; END IF;
  IF prior.target_type='decision' AND decision_state(prior.target_id)<>'deferred' OR prior.target_type='interview' AND (task_interview_status(prior.target_id)<>'deferred' OR prior.interview_entry_id IS DISTINCT FROM (SELECT id FROM task_interview_entries WHERE case_id=prior.target_id ORDER BY version DESC LIMIT 1)) THEN RAISE EXCEPTION 'decision_stale'; END IF;
  IF NEW.event_type IN ('resource_available','configuration_changed') THEN
   ref:=decision_node(NEW.workspace_id,CASE WHEN NEW.event_type='resource_available' THEN 'resource' ELSE 'company_record' END,(prior.condition->>'referenceId')::uuid);
   IF ref IS NULL OR NEW.reference_revision IS DISTINCT FROM encode(sha256(convert_to(ref::text,'UTF8')),'hex') OR NEW.reference_revision=prior.baseline THEN RAISE EXCEPTION 'decision_event_invalid'; END IF;
   IF NEW.event_type='resource_available' THEN
    IF ref->'metadata'->'available' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(ref->'metadata'->'capacity') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'decision_event_invalid'; END IF;
    IF (ref->'metadata'->>'capacity')::numeric<=0 OR prior.reference_state->'available'='true'::jsonb AND (ref->'metadata'->>'capacity')::numeric<=(CASE WHEN jsonb_typeof(prior.reference_state->'capacity')='number' THEN (prior.reference_state->>'capacity')::numeric ELSE 0 END) THEN RAISE EXCEPTION 'decision_event_invalid';END IF;
   ELSIF ref->>'record_type'<>'configuration' OR jsonb_typeof(ref->'metadata'->'configuration') IS DISTINCT FROM 'object' OR prior.reference_state->>'configurationHash'=encode(sha256(convert_to((ref->'metadata'->'configuration')::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'decision_event_invalid';END IF;
   IF NOT EXISTS(SELECT 1 FROM dependencies dep CROSS JOIN LATERAL jsonb_array_elements(prior.scope) scope_item WHERE dep.workspace_id=NEW.workspace_id AND dep.status='active' AND dep.dependency_type IN ('depends_on','requires') AND dep.from_entity_type=scope_item->>'type' AND dep.from_entity_id=scope_item->>'id' AND dep.to_entity_id=prior.condition->>'referenceId' AND dep.to_entity_type=CASE WHEN NEW.event_type='resource_available' THEN 'resource' ELSE 'company_record' END) THEN RAISE EXCEPTION 'decision_scope_invalid';END IF;
  ELSIF NEW.event_type='deadline' AND (prior.condition->>'dueAt')::timestamptz>now() THEN RAISE EXCEPTION 'decision_event_not_due'; END IF;
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE tbl TEXT;BEGIN FOREACH tbl IN ARRAY ARRAY['decision_revisions','decision_impact_previews','decision_acceptances','decision_deferrals','decision_reopening_events'] LOOP
 EXECUTE format('CREATE TRIGGER decision_history_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION decision_history_guard()',tbl);
END LOOP;END $$;

CREATE FUNCTION decision_register_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.supersedes_id IS NOT NULL AND NEW.source IS DISTINCT FROM 'roost_decision' THEN RAISE EXCEPTION 'decision_governed_command_required'; END IF;
  IF NEW.source='roost_decision' AND NEW.status<>'proposed' THEN RAISE EXCEPTION 'decision_proposal_invalid'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.source='roost_decision' OR EXISTS(SELECT 1 FROM decision_revisions WHERE supersedes_id=OLD.id) THEN
  IF TG_OP='UPDATE' AND OLD.source='roost_decision' AND OLD.status='proposed' AND NEW.status='accepted' AND (to_jsonb(NEW)-'status')=(to_jsonb(OLD)-'status') AND EXISTS(SELECT 1 FROM decision_acceptances WHERE decision_id=OLD.id) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'decision_history_immutable';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.supersedes_id IS DISTINCT FROM OLD.supersedes_id OR NEW.source='roost_decision' THEN RAISE EXCEPTION 'decision_governed_command_required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER decision_register_guard BEFORE INSERT OR UPDATE OR DELETE ON decisions FOR EACH ROW EXECUTE FUNCTION decision_register_guard();
CREATE FUNCTION decision_register_receipt() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN IF NEW.source='roost_decision' AND NOT EXISTS(SELECT 1 FROM decision_revisions WHERE decision_id=NEW.id) THEN RAISE EXCEPTION 'decision_proposal_invalid'; END IF;RETURN NULL;END $$;
CREATE CONSTRAINT TRIGGER decision_register_receipt AFTER INSERT ON decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION decision_register_receipt();
CREATE FUNCTION decision_acceptance_effects() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p decision_impact_previews;t UUID;changed JSONB;
BEGIN
 SELECT * INTO p FROM decision_impact_previews WHERE id=NEW.preview_id;
 UPDATE decisions SET status='accepted' WHERE id=NEW.decision_id;
 changed:=jsonb_build_array(jsonb_build_object('table','decisions','id',NEW.decision_id,'operation','supersession','label','Decision changed','changedAt',now()));
 FOR t IN SELECT value::uuid FROM jsonb_array_elements_text(p.impact->'taskIds') LOOP
  INSERT INTO task_decision_effects(id,workspace_id,task_id,decision_id,supersedes_id,acceptance_id) VALUES(gen_random_uuid(),NEW.workspace_id,t,NEW.decision_id,(SELECT supersedes_id FROM decision_revisions WHERE decision_id=NEW.decision_id),NEW.id);
  UPDATE tasks SET execution_readiness=COALESCE(execution_readiness,'{}')||jsonb_build_object('status','needs_revalidation','reason','decision_superseded','changedSources',changed,'decisionAcceptanceId',NEW.id) WHERE id=t;
  UPDATE agent_executions SET context_invalidated_at=COALESCE(context_invalidated_at,now()),cancel_requested_at=COALESCE(cancel_requested_at,now()),context_invalidation=COALESCE(context_invalidation,jsonb_build_object('reason','decision_superseded','changedSources',changed)) WHERE task_id=t AND status='queued';
 END LOOP;
 RETURN NULL;
END $$;
CREATE TRIGGER decision_acceptance_effects AFTER INSERT ON decision_acceptances FOR EACH ROW EXECUTE FUNCTION decision_acceptance_effects();
CREATE FUNCTION decision_reopening_attention_receipt() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN IF (SELECT count(*) FROM events WHERE workspace_id=NEW.workspace_id AND type='decision_governance_attention' AND payload->>'eventId'=NEW.id::text)<>1 THEN RAISE EXCEPTION 'decision_event_invalid';END IF;RETURN NULL;END $$;
CREATE CONSTRAINT TRIGGER decision_reopening_attention_receipt AFTER INSERT ON decision_reopening_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION decision_reopening_attention_receipt();

-- The exact-operation admission wrappers are appended below before commit.
ALTER TABLE task_admission_evidence DROP CONSTRAINT task_admission_evidence_operation_check;
ALTER TABLE task_admission_evidence ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede'));
CREATE FUNCTION decision_pending_version(t UUID) RETURNS TEXT LANGUAGE SQL STABLE AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.decision_id,'body',r.body,'preview',p.id,'impact',decision_impact(r.workspace_id,r.body->'scope')) ORDER BY r.decision_id)::text,'[]')
 FROM decision_revisions r JOIN LATERAL (SELECT * FROM decision_impact_previews WHERE decision_id=r.decision_id ORDER BY version DESC LIMIT 1) p ON true
 WHERE decision_state(r.decision_id)<>'accepted' AND p.impact->'taskIds' @> to_jsonb(ARRAY[t])
$$;
ALTER FUNCTION task_admission_dependencies(UUID,TEXT,TEXT) RENAME TO task_admission_dependencies_before_decision;
CREATE FUNCTION task_admission_dependencies(t UUID,op TEXT,g TEXT) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE base TEXT:=task_admission_dependencies_before_decision(t,op,g);
BEGIN IF op<>'decision_supersede' THEN RETURN base; END IF;RETURN encode(sha256(convert_to(base||decision_pending_version(t),'UTF8')),'hex');END $$;
ALTER FUNCTION task_admission_view(UUID,TEXT) RENAME TO task_admission_view_before_decision;
CREATE FUNCTION task_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF op='decision_supersede' THEN
  IF decision_pending_version(t)='[]' THEN RETURN jsonb_build_object('status','blocked','reason','decision_preview_required','seal',NULL,'gates','[]'::jsonb); END IF;
  RETURN decision_admission_view(t,op);
 END IF;
 RETURN task_admission_view_before_decision(t,op);
END $$;

CREATE FUNCTION decision_admission_view(t UUID,op TEXT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE s task_admission_scopes; e task_admission_evidence; p procedures; g TEXT; required TEXT[]; state TEXT; gates JSONB:='[]'; expires TIMESTAMPTZ:=now()+interval '24 hours'; expiry TIMESTAMPTZ; ok BOOLEAN:=true; ids JSONB:='[]'; member_role TEXT; risk_id UUID; source_version TEXT;
BEGIN
 SELECT * INTO s FROM task_admission_scopes WHERE task_id=t ORDER BY version DESC LIMIT 1;
 required:=task_admission_required(t);
 IF s.id IS NULL OR required IS NULL OR op NOT IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede') THEN
  RETURN jsonb_build_object('policy','roost-native-risk-admission-v1','status','blocked','reason','risk_or_scope_required','gates','[]'::jsonb,'seal',NULL);
 END IF;
 SELECT * INTO p FROM procedures WHERE id=s.procedure_id AND workspace_id=s.workspace_id AND status='active';
 risk_id:=task_risk_current(t); source_version:=task_admission_source(t);
 IF risk_id IS NULL THEN ok:=false; END IF;
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM procedure_steps WHERE procedure_id=s.procedure_id AND length(trim(instruction))>=3)
  OR NOT EXISTS(SELECT 1 FROM application_procedures WHERE application_id=s.application_id AND procedure_id=s.procedure_id)
  OR EXISTS(SELECT 1 FROM company_records WHERE id IN (s.target_id,s.release_id) AND (workspace_id<>s.workspace_id OR application_id IS DISTINCT FROM s.application_id OR status='archived')) THEN ok:=false; END IF;
 SELECT least(expires,created_at+interval '24 hours') INTO expires FROM task_risk_assessments WHERE id=risk_id;
 FOREACH g IN ARRAY required LOOP
  expiry:=NULL;
  SELECT * INTO e FROM task_admission_evidence WHERE task_id=t AND operation=op AND gate=g ORDER BY version DESC LIMIT 1;
  state:='required';
  IF e.id IS NOT NULL THEN
   expiry:=e.created_at+CASE WHEN g='owner_approval' THEN interval '15 minutes' WHEN g IN ('backup','restore_plan') THEN interval '1 hour' ELSE interval '24 hours' END;
   IF g='backup' THEN expiry:=least(expiry,(e.detail->'artifact'->>'capturedAt')::timestamptz+interval '1 hour'); END IF;
   SELECT role::text INTO member_role FROM workspace_memberships WHERE workspace_id=s.workspace_id AND user_id=e.actor_user_id;
   state:=CASE WHEN e.scope_id<>s.id OR e.source_version IS DISTINCT FROM source_version
    OR e.dependency_version IS DISTINCT FROM task_admission_dependencies(t,op,g) OR expiry<=now()
    OR member_role IS NULL OR member_role NOT IN ('owner','admin','member')
    OR g IN ('mandate','owner_approval') AND member_role<>'owner'
    OR g IN ('extended_review','backup') AND NOT task_admission_independent(t,e.actor_user_id)
    OR NOT EXISTS(SELECT 1 FROM company_records c WHERE c.id=e.evidence_id AND c.workspace_id=s.workspace_id AND (c.application_id IS NULL OR c.application_id=s.application_id) AND c.status<>'archived' AND c.updated_at=e.evidence_revision)
    THEN 'stale' WHEN e.verdict='failed' THEN 'failed' ELSE 'present' END;
   expires:=least(expires,expiry); ids:=ids||jsonb_build_array(e.id);
  END IF;
  IF state<>'present' THEN ok:=false; END IF;
  gates:=gates||jsonb_build_array(jsonb_build_object('gate',g,'status',state,'evidenceId',e.id,'referenceId',e.evidence_id,'issuerId',e.actor_user_id,'version',e.version,'createdAt',e.created_at,'expiresAt',expiry,'detail',e.detail));
 END LOOP;
 RETURN jsonb_build_object('policy','roost-native-risk-admission-v1','status',CASE WHEN ok THEN 'admitted' ELSE 'blocked' END,
  'reason',CASE WHEN risk_id IS NULL THEN 'current_risk_required' WHEN p.id IS NULL THEN 'active_procedure_required' ELSE 'required_evidence' END,'scopeId',s.id,'commit',s.input->>'commit','gates',gates,'expiresAt',expires,
  'seal',CASE WHEN ok THEN encode(sha256(convert_to(source_version||op||ids::text,'UTF8')),'hex') ELSE NULL END);
END $$;

CREATE FUNCTION decision_interview_deferral_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM decision_deferrals d WHERE d.target_type='interview' AND d.target_id=NEW.case_id AND NOT EXISTS(SELECT 1 FROM decision_reopening_events e WHERE e.deferral_id=d.id)) THEN RAISE EXCEPTION 'decision_transition_invalid';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER decision_interview_deferral_guard BEFORE INSERT ON task_interview_entries FOR EACH ROW EXECUTE FUNCTION decision_interview_deferral_guard();
CREATE UNIQUE INDEX decision_reopening_attention_once ON events(workspace_id,(payload->>'eventId')) WHERE type='decision_governance_attention' AND payload->>'eventId' IS NOT NULL;
CREATE FUNCTION decision_attention_history_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.type='decision_governance_attention' AND EXISTS(SELECT 1 FROM decision_reopening_events e WHERE e.workspace_id=OLD.workspace_id AND e.id::text=OLD.payload->>'eventId') THEN RAISE EXCEPTION 'decision_history_immutable';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
CREATE TRIGGER decision_attention_history_guard BEFORE UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION decision_attention_history_guard();

COMMIT;
