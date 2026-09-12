BEGIN;
-- Additive extension of CapabilityObservation. Existing observations and business rows are untouched.
ALTER TABLE workspaces ADD COLUMN canonical_language TEXT CHECK(canonical_language IN ('pl','en'));
ALTER TABLE users ADD COLUMN preferred_language TEXT CHECK(preferred_language IN ('pl','en'));
CREATE TABLE finding_versions (
 id UUID PRIMARY KEY, observation_id UUID NOT NULL REFERENCES capability_observations(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
 application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>0), body JSONB NOT NULL CHECK(octet_length(body::text)<=60000),
 fingerprint TEXT NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 actor_kind TEXT NOT NULL CHECK(actor_kind IN ('user','agent')),actor_id UUID NOT NULL,credential_id UUID REFERENCES api_keys(id),
 request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(observation_id,version),UNIQUE(workspace_id,request_id)
);
CREATE INDEX finding_versions_application ON finding_versions(workspace_id,application_id,observation_id,version DESC);
CREATE TABLE finding_journal (
 id UUID PRIMARY KEY,observation_id UUID NOT NULL REFERENCES capability_observations(id) ON DELETE RESTRICT,
 version_id UUID NOT NULL REFERENCES finding_versions(id) ON DELETE RESTRICT,workspace_id UUID NOT NULL REFERENCES workspaces(id),
 sequence INTEGER NOT NULL CHECK(sequence>0),action TEXT NOT NULL,state TEXT NOT NULL,
 body JSONB NOT NULL CHECK(octet_length(body::text)<=60000),proof JSONB NOT NULL CHECK(octet_length(proof::text)<=60000),
 actor_kind TEXT NOT NULL CHECK(actor_kind IN ('user','agent')),actor_id UUID NOT NULL,credential_id UUID REFERENCES api_keys(id),
 grant_id UUID REFERENCES task_capability_grants(id),request_id UUID NOT NULL,request_hash TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(observation_id,sequence),UNIQUE(workspace_id,request_id)
);
CREATE TABLE finding_occurrences (
 id UUID PRIMARY KEY,observation_id UUID NOT NULL REFERENCES capability_observations(id) ON DELETE RESTRICT,
 version_id UUID NOT NULL REFERENCES finding_versions(id) ON DELETE RESTRICT,workspace_id UUID NOT NULL REFERENCES workspaces(id),
 purpose TEXT NOT NULL CHECK(purpose IN ('observation','fix')),body JSONB NOT NULL CHECK(octet_length(body::text)<=40000),
 actor_kind TEXT NOT NULL CHECK(actor_kind IN ('user','agent')),actor_id UUID NOT NULL,credential_id UUID REFERENCES api_keys(id),
 request_id UUID NOT NULL,request_hash TEXT NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(workspace_id,request_id)
);
CREATE TABLE finding_dedup_keys (
 workspace_id UUID NOT NULL,application_id UUID NOT NULL, fingerprint TEXT NOT NULL,
 observation_id UUID NOT NULL REFERENCES capability_observations(id) ON DELETE RESTRICT,
 PRIMARY KEY(workspace_id,application_id,fingerprint)
);
CREATE INDEX finding_occurrences_observation ON finding_occurrences(observation_id,created_at DESC,id);
CREATE TABLE finding_outputs (
 observation_id UUID PRIMARY KEY REFERENCES capability_observations(id) ON DELETE RESTRICT,
 workspace_id UUID NOT NULL,version_id UUID NOT NULL REFERENCES finding_versions(id),
 verification_id UUID NOT NULL REFERENCES finding_journal(id),journal_id UUID NOT NULL UNIQUE REFERENCES finding_journal(id),
 task_id UUID UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
 decision_id UUID UNIQUE REFERENCES decisions(id) ON DELETE RESTRICT,
 interview_id UUID UNIQUE REFERENCES task_interview_cases(id) ON DELETE RESTRICT,
 CHECK(num_nonnulls(task_id,decision_id,interview_id)=1),created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE finding_source_epochs (workspace_id UUID PRIMARY KEY REFERENCES workspaces(id),revision BIGINT NOT NULL DEFAULT 1);
CREATE FUNCTION finding_latest(f UUID) RETURNS finding_versions LANGUAGE SQL STABLE AS $$
 SELECT v FROM finding_versions v WHERE observation_id=f ORDER BY version DESC LIMIT 1
$$;
CREATE FUNCTION finding_head(f UUID) RETURNS finding_journal LANGUAGE SQL STABLE AS $$
 SELECT j FROM finding_journal j WHERE observation_id=f ORDER BY sequence DESC LIMIT 1
$$;
CREATE FUNCTION finding_canonical(f UUID) RETURNS UUID LANGUAGE plpgsql STABLE AS $$
DECLARE head finding_journal;seen UUID[]:=ARRAY[]::uuid[];
BEGIN
 LOOP
  IF f=ANY(seen) OR cardinality(seen)>=100 THEN RAISE EXCEPTION 'finding_merge_scope_invalid';END IF;seen:=array_append(seen,f);
  head:=finding_head(f);IF head.state IS DISTINCT FROM 'merged' THEN RETURN f;END IF;f:=(head.body->>'outputId')::uuid;
 END LOOP;
END $$;
CREATE FUNCTION finding_principal(w UUID,k TEXT,p UUID,c UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT CASE WHEN k='user' THEN c IS NULL AND EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=w AND user_id=p AND role IN ('owner','admin','member'))
 WHEN k='agent' THEN EXISTS(SELECT 1 FROM api_keys key JOIN workforce_entities worker ON worker.id=key.bound_agent_id WHERE key.id=c AND key.workspace_id=w AND worker.workspace_id=w AND worker.id=p AND worker.type='agent' AND worker.status='active' AND worker.source<>'user' AND key.active AND key.revoked_at IS NULL AND key.expires_at>clock_timestamp() AND key.scopes @> '["agent-runtime:write"]'::jsonb) ELSE false END
$$;
CREATE FUNCTION finding_authored(f UUID,k TEXT,p UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM finding_versions v WHERE v.workspace_id=(finding_latest(f)).workspace_id AND v.actor_kind=k AND v.actor_id=p AND finding_canonical(v.observation_id)=finding_canonical(f))
 OR EXISTS(SELECT 1 FROM finding_occurrences o WHERE o.workspace_id=(finding_latest(f)).workspace_id AND o.actor_kind=k AND o.actor_id=p AND
 (finding_canonical(o.observation_id)=finding_canonical(f) OR o.purpose='fix' AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.body->'evidence') evidence JOIN jsonb_array_elements((finding_latest(f)).body->'evidence') used ON evidence->>'type'=used->>'type' AND evidence->>'id'=used->>'id')))
$$;
CREATE FUNCTION finding_reference(w UUID,k TEXT,p UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE value JSONB;
BEGIN
 CASE k
 WHEN 'application' THEN SELECT to_jsonb(a) INTO value FROM applications a WHERE id=p AND workspace_id=w;
 WHEN 'component' THEN SELECT to_jsonb(c) INTO value FROM application_architecture_components c JOIN applications a ON a.id=c.application_id WHERE c.id=p AND a.workspace_id=w;
 WHEN 'task' THEN SELECT jsonb_build_object('task',to_jsonb(t)-'execution_readiness'-'updated_at','contract',t.execution_readiness->'contract') INTO value FROM tasks t WHERE id=p AND workspace_id=w;
 WHEN 'project' THEN SELECT to_jsonb(t) INTO value FROM projects t WHERE id=p AND workspace_id=w;
 WHEN 'procedure' THEN SELECT to_jsonb(t) INTO value FROM procedures t WHERE id=p AND workspace_id=w;
 WHEN 'application_evidence' THEN SELECT to_jsonb(t) INTO value FROM application_evidence t WHERE id=p AND workspace_id=w;
 WHEN 'company_record' THEN SELECT to_jsonb(t) INTO value FROM company_records t WHERE id=p AND workspace_id=w;
 WHEN 'audit' THEN SELECT to_jsonb(t) INTO value FROM company_records t WHERE id=p AND workspace_id=w AND record_type IN ('audit','audit_run','application_audit');
 WHEN 'run' THEN SELECT to_jsonb(t)-'metadata'-'output'-'error' INTO value FROM agent_executions t WHERE id=p AND workspace_id=w;
 ELSE RETURN NULL; END CASE;
 RETURN CASE WHEN value IS NULL THEN NULL ELSE encode(sha256(convert_to(value::text,'UTF8')),'hex') END;
END $$;
CREATE FUNCTION finding_normalize(value TEXT) RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
 SELECT trim(regexp_replace(lower(normalize(value,NFKC)),E'[\u0009-\u000D \u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+',' ','g'))
$$;
CREATE FUNCTION finding_fingerprint(a UUID,b JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE fields TEXT[]; value TEXT; joined TEXT:='roost-finding-v1:';
BEGIN
 fields:=ARRAY[a::text,b->>'componentId',finding_normalize(b->>'observed'),finding_normalize(b->>'expected'),finding_normalize(b->'environment'->>'key'),b->'environment'->>'build',b->'environment'->>'applicationRevision',b->'environment'->>'componentRevision',b->'environment'->>'contextRevision'];
 FOREACH value IN ARRAY fields LOOP IF value IS NULL THEN RETURN NULL; END IF; joined:=joined||octet_length(value)::text||':'||value; END LOOP;
 RETURN encode(sha256(convert_to(joined,'UTF8')),'hex');
END $$;
CREATE FUNCTION finding_reference_allowed(w UUID,a UUID,r JSONB) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT CASE r->>'type'
 WHEN 'application' THEN r->>'id'=a::text AND EXISTS(SELECT 1 FROM applications WHERE id=a AND workspace_id=w)
 WHEN 'task' THEN EXISTS(SELECT 1 FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id WHERE t.id::text=r->>'id' AND t.workspace_id=w AND ap.application_id=a AND (SELECT count(*) FROM application_projects WHERE project_id=t.project_id)=1)
 WHEN 'project' THEN EXISTS(SELECT 1 FROM projects p JOIN application_projects ap ON ap.project_id=p.id WHERE p.id::text=r->>'id' AND p.workspace_id=w AND ap.application_id=a)
 WHEN 'procedure' THEN EXISTS(SELECT 1 FROM procedures p JOIN application_procedures ap ON ap.procedure_id=p.id WHERE p.id::text=r->>'id' AND p.workspace_id=w AND ap.application_id=a)
 WHEN 'run' THEN EXISTS(SELECT 1 FROM agent_executions WHERE id::text=r->>'id' AND workspace_id=w AND application_id=a)
 WHEN 'application_evidence' THEN EXISTS(SELECT 1 FROM application_evidence WHERE id::text=r->>'id' AND workspace_id=w AND application_id=a)
 WHEN 'company_record' THEN EXISTS(SELECT 1 FROM company_records WHERE id::text=r->>'id' AND workspace_id=w AND (application_id IS NULL OR application_id=a))
 WHEN 'audit' THEN EXISTS(SELECT 1 FROM company_records WHERE id::text=r->>'id' AND workspace_id=w AND application_id=a AND record_type IN ('audit','audit_run','application_audit'))
 ELSE false END
$$;
CREATE FUNCTION finding_context(f UUID) RETURNS JSONB LANGUAGE SQL STABLE AS $$
 SELECT jsonb_build_object('versionId',v.id,'sourceEpoch',COALESCE((SELECT revision FROM finding_source_epochs WHERE workspace_id=v.workspace_id),0),
 'sources',(SELECT jsonb_agg(jsonb_build_object('type',r->>'type','id',r->>'id','revision',finding_reference(v.workspace_id,r->>'type',(r->>'id')::uuid)) ORDER BY r->>'type',r->>'id') FROM jsonb_array_elements((v.body->'sources')||(v.body->'evidence')) r),
 'occurrences',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',o.id,'references',(SELECT jsonb_agg(jsonb_build_object('type',r->>'type','id',r->>'id','revision',finding_reference(v.workspace_id,r->>'type',(r->>'id')::uuid)) ORDER BY r->>'type',r->>'id') FROM jsonb_array_elements(o.body->'evidence'||jsonb_build_array(o.body->'source')) r)) ORDER BY o.id),'[]'::jsonb) FROM finding_occurrences o WHERE observation_id=f),
 'lineage',encode(sha256(convert_to((SELECT COALESCE(jsonb_agg(related.id ORDER BY related.id),'[]'::jsonb)::text FROM finding_versions related WHERE related.workspace_id=v.workspace_id AND finding_canonical(related.observation_id)=f),'UTF8')),'hex'),
 'application',finding_reference(v.workspace_id,'application',v.application_id),'component',finding_reference(v.workspace_id,'component',(v.body->>'componentId')::uuid))
 FROM finding_versions v WHERE v.id=(finding_latest(f)).id
$$;
CREATE FUNCTION finding_transition(s TEXT,a TEXT) RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
 SELECT CASE
 WHEN s='observed' AND a='queue_deduplication' THEN 'deduplication_pending'
 WHEN s='deduplication_pending' AND a='deduplicate' THEN 'verification_pending'
 WHEN s='verification_pending' AND a='confirmed' THEN 'verified'
 WHEN s='verification_pending' AND a='rejected' THEN 'rejected'
 WHEN s='verification_pending' AND a='inconclusive' THEN 'inconclusive'
 WHEN s='verified' AND a='queue_triage' THEN 'triage_pending'
 WHEN s='triage_pending' AND a='convert_task' THEN 'converted_to_task'
 WHEN s='triage_pending' AND a='convert_decision' THEN 'converted_to_decision'
 WHEN s='triage_pending' AND a='defer' THEN 'deferred'
 WHEN s='deferred' AND a='reopen' THEN 'triage_pending'
 WHEN s IN ('verified','triage_pending','converted_to_task','converted_to_decision') AND a='challenge' THEN 'inconclusive'
 WHEN s='inconclusive' AND a='adjudicate_confirmed' THEN 'verified'
 WHEN s='inconclusive' AND a='adjudicate_rejected' THEN 'rejected'
 WHEN s='inconclusive' AND a='adjudicate_inconclusive' THEN 'inconclusive'
 ELSE NULL END
$$;
CREATE FUNCTION finding_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'finding_history_immutable'; END $$;
DO $$ DECLARE tbl TEXT; BEGIN FOREACH tbl IN ARRAY ARRAY['finding_versions','finding_journal','finding_occurrences','finding_dedup_keys','finding_outputs'] LOOP
 EXECUTE format('CREATE TRIGGER finding_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION finding_immutable()',tbl);
 EXECUTE format('CREATE TRIGGER finding_fence BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION ready_source_lock()',tbl);
END LOOP; END $$;
CREATE FUNCTION finding_version_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE prior finding_versions; ref JSONB; field TEXT;
BEGIN
 IF jsonb_typeof(NEW.body) IS DISTINCT FROM 'object' OR NOT NEW.body ?& ARRAY['title','classification','language','taskId','componentId','departmentKey','requesterId','recipientId','scope','excluded','observed','expected','reproducibility','sources','evidence','environment','impact','knownRisk','requiredCompetencies','decisionNeed','procedureId'] OR
 NEW.body->>'language' IS NULL OR COALESCE(NEW.body->>'knownRisk','') NOT IN ('low','medium','high','critical') OR COALESCE(NEW.body->>'decisionNeed','') NOT IN ('none','product_direction','money','legal','critical_risk','mandate_change','material_unknown') OR COALESCE(NEW.body->'environment'->>'contextRevision','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'finding_content_invalid';END IF;
 FOREACH field IN ARRAY ARRAY['title','scope','excluded','observed','expected','impact'] LOOP
  IF jsonb_typeof(NEW.body->field) IS DISTINCT FROM 'string' OR length(trim(NEW.body->>field)) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'finding_content_invalid';END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['sources','evidence','requiredCompetencies'] LOOP
  IF jsonb_typeof(NEW.body->field) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'finding_content_invalid';END IF;
 END LOOP;
 IF jsonb_array_length(NEW.body->'requiredCompetencies') NOT BETWEEN 1 AND 12 OR jsonb_typeof(NEW.body->'reproducibility'->'steps') IS DISTINCT FROM 'array' OR COALESCE(NEW.body->'reproducibility'->>'status','') NOT IN ('reproduced','intermittent','not_reproduced') THEN RAISE EXCEPTION 'finding_content_invalid';END IF;
 prior:=finding_latest(NEW.observation_id);
 IF (finding_head(NEW.observation_id)).state='merged' THEN RAISE EXCEPTION 'finding_merged';END IF;
 IF NOT finding_principal(NEW.workspace_id,NEW.actor_kind,NEW.actor_id,NEW.credential_id) OR
 NOT EXISTS(SELECT 1 FROM capability_observations o JOIN applications a ON a.id=o.application_id WHERE o.id=NEW.observation_id AND a.id=NEW.application_id AND a.workspace_id=NEW.workspace_id) OR
 NEW.version<>COALESCE(prior.version,0)+1 OR (prior.id IS NOT NULL AND (prior.application_id<>NEW.application_id OR prior.workspace_id<>NEW.workspace_id OR COALESCE(length(NEW.body->>'correctionReason'),0)<3)) THEN RAISE EXCEPTION 'finding_scope_invalid'; END IF;
 IF EXISTS(SELECT 1 FROM finding_dedup_keys WHERE workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND fingerprint=NEW.fingerprint AND observation_id<>NEW.observation_id) THEN RAISE EXCEPTION 'finding_duplicate_requires_merge';END IF;
 IF NEW.body->>'classificationDecisionId' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM decision_revisions r JOIN decisions d ON d.id=r.decision_id JOIN decision_acceptances a ON a.decision_id=d.id WHERE d.workspace_id=NEW.workspace_id AND d.id=(NEW.body->>'classificationDecisionId')::uuid AND d.status='accepted' AND decision_primary_owner(NEW.workspace_id,a.actor_user_id) AND r.body->'scope' @> jsonb_build_array(jsonb_build_object('type','task','id',NEW.body->>'taskId'))) THEN RAISE EXCEPTION 'finding_decision_acceptance_required';END IF;
 IF NEW.body->'environment'->>'applicationRevision' IS DISTINCT FROM finding_reference(NEW.workspace_id,'application',NEW.application_id) OR NEW.body->'environment'->>'componentRevision' IS DISTINCT FROM finding_reference(NEW.workspace_id,'component',(NEW.body->>'componentId')::uuid) THEN RAISE EXCEPTION 'finding_source_stale';END IF;
 IF NEW.fingerprint IS DISTINCT FROM finding_fingerprint(NEW.application_id,NEW.body) OR
 COALESCE(NEW.body->>'classification','') NOT IN ('defect','unfinished_function','stale_documentation','missing_assumption','improvement') OR
 NEW.body->>'language' IS DISTINCT FROM (SELECT canonical_language FROM workspaces WHERE id=NEW.workspace_id) OR
 NOT EXISTS(SELECT 1 FROM application_architecture_components WHERE id=(NEW.body->>'componentId')::uuid AND application_id=NEW.application_id) THEN RAISE EXCEPTION 'finding_content_invalid'; END IF;
 IF jsonb_array_length(NEW.body->'sources') NOT BETWEEN 1 AND 8 OR jsonb_array_length(NEW.body->'evidence') NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'finding_content_invalid'; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements((NEW.body->'sources')||(NEW.body->'evidence')) LOOP
 IF NOT finding_reference_allowed(NEW.workspace_id,NEW.application_id,ref) THEN RAISE EXCEPTION 'finding_scope_invalid';END IF;
 IF ref->>'revision' IS DISTINCT FROM finding_reference(NEW.workspace_id,ref->>'type',(ref->>'id')::uuid) OR finding_reference(NEW.workspace_id,ref->>'type',(ref->>'id')::uuid) IS NULL THEN RAISE EXCEPTION 'finding_source_stale'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER finding_version_guard BEFORE INSERT ON finding_versions FOR EACH ROW EXECUTE FUNCTION finding_version_guard();
CREATE FUNCTION finding_dedup_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM finding_versions WHERE workspace_id=NEW.workspace_id AND application_id=NEW.application_id AND observation_id=NEW.observation_id AND fingerprint=NEW.fingerprint) THEN RAISE EXCEPTION 'finding_scope_invalid';END IF;RETURN NEW;
END $$;
CREATE TRIGGER finding_dedup_guard BEFORE INSERT ON finding_dedup_keys FOR EACH ROW EXECUTE FUNCTION finding_dedup_guard();
CREATE FUNCTION finding_occurrence_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v finding_versions; ref JSONB;
BEGIN
 v:=finding_latest(NEW.observation_id);
 IF v.id IS DISTINCT FROM NEW.version_id OR v.workspace_id<>NEW.workspace_id OR NOT finding_principal(NEW.workspace_id,NEW.actor_kind,NEW.actor_id,NEW.credential_id) THEN RAISE EXCEPTION 'finding_scope_invalid'; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(NEW.body->'evidence'||jsonb_build_array(NEW.body->'source')) LOOP
 IF NOT finding_reference_allowed(NEW.workspace_id,v.application_id,ref) THEN RAISE EXCEPTION 'finding_scope_invalid';END IF;
 IF ref->>'revision' IS DISTINCT FROM finding_reference(NEW.workspace_id,ref->>'type',(ref->>'id')::uuid) OR finding_reference(NEW.workspace_id,ref->>'type',(ref->>'id')::uuid) IS NULL THEN RAISE EXCEPTION 'finding_source_stale'; END IF;
 END LOOP; RETURN NEW;
END $$;
CREATE TRIGGER finding_occurrence_guard BEFORE INSERT ON finding_occurrences FOR EACH ROW EXECUTE FUNCTION finding_occurrence_guard();
-- Existing native operation ledgers gain exact Finding operations, including authenticated humans.
ALTER TABLE task_capability_grants ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE task_capability_grants ALTER COLUMN credential_id DROP NOT NULL;
ALTER TABLE task_capability_grants ADD COLUMN grantee_user_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_operation_check;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede','finding_verify','finding_triage'));
ALTER TABLE task_capability_grants DROP CONSTRAINT task_capability_grants_check1;
ALTER TABLE task_capability_grants ADD CHECK(operation IN ('clarification_send','clarification_reply','interview_prepare','decision_supersede','finding_verify','finding_triage') OR execution_id IS NOT NULL);
ALTER TABLE task_capability_grants ADD CHECK((agent_id IS NOT NULL AND credential_id IS NOT NULL AND grantee_user_id IS NULL) OR (operation IN ('finding_verify','finding_triage') AND agent_id IS NULL AND credential_id IS NULL AND grantee_user_id IS NOT NULL AND credential_version=0));
ALTER TABLE task_capability_uses ADD COLUMN finding_journal_id UUID UNIQUE REFERENCES finding_journal(id);
ALTER TABLE task_capability_uses DROP CONSTRAINT task_capability_uses_check;
ALTER TABLE task_capability_uses ADD CHECK(num_nonnulls(decision_id,action_id,handoff_id,handoff_decision_id,clarification_entry_id,interview_case_id,governed_decision_acceptance_id,finding_journal_id)=1);
ALTER TABLE native_capability_suspensions DROP CONSTRAINT native_capability_suspensions_operation_check;
ALTER TABLE native_capability_suspensions ADD CHECK(operation IN ('runtime_execute','review_decision','return_to_executor','create_specialist_task','handoff_create','handoff_accept','handoff_reject','clarification_send','clarification_reply','interview_prepare','decision_supersede','finding_verify','finding_triage'));
-- Finding grants record observations/proposals. They cannot execute, accept a risk or release work.
-- Their dedicated guard checks exact scope/mandate/competence; task conversion uses native Ready.
DO $$ DECLARE definition TEXT;BEGIN
 definition:=pg_get_functiondef('task_admission_guard()'::regprocedure);
 definition:=replace(definition,'BEGIN','BEGIN
 IF TG_TABLE_NAME=''task_capability_grants'' AND TG_OP=''INSERT'' THEN
  IF NEW.operation IN (''finding_verify'',''finding_triage'') THEN RETURN NEW;END IF;
 END IF;');
 EXECUTE definition;
 definition:=pg_get_functiondef('task_risk_operation_guard()'::regprocedure);
 definition:=replace(definition,'BEGIN','BEGIN IF TG_TABLE_NAME=''task_capability_grants'' THEN IF NEW.operation IN (''finding_verify'',''finding_triage'') THEN RETURN NEW;END IF;END IF;');
 EXECUTE definition;
END $$;
DO $$ DECLARE definition TEXT; BEGIN
 definition:=pg_get_functiondef('workforce_mandate_guard()'::regprocedure);
 IF position('BETWEEN 1 AND 4' IN definition)=0 THEN RAISE EXCEPTION 'finding_migration_baseline_invalid'; END IF;
 definition:=replace(definition,'BETWEEN 1 AND 4','BETWEEN 1 AND 6');
 definition:=replace(definition,'"answer_interview","accept_interview"]','"answer_interview","accept_interview","verify_finding","triage_finding"]');
 EXECUTE definition;
 definition:=pg_get_functiondef('decision_authority_source_changed()'::regprocedure);
 definition:=replace(definition,'THEN CONTINUE;END IF;','AND NOT EXISTS(SELECT 1 FROM finding_versions WHERE workspace_id=w) THEN CONTINUE;END IF;');
 EXECUTE definition;
END $$;
CREATE FUNCTION finding_authority_current(w UUID,a JSONB,b JSONB,app UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE m workforce_mandate_versions;expected JSONB;item RECORD;worker JSONB;previous JSONB;candidate RECORD;first_worker UUID;lineage JSONB;supervisor JSONB;seen UUID[];downward BOOLEAN:=false;crossed BOOLEAN:=false;
BEGIN
 IF a->>'status' IS DISTINCT FROM 'delegated' OR a->>'epoch' IS DISTINCT FROM decision_authority_epoch(w,a) OR jsonb_typeof(a->'path') IS DISTINCT FROM 'array' OR jsonb_array_length(a->'path') NOT BETWEEN 1 AND 100 THEN RETURN false;END IF;
 IF COALESCE(a->'scopeProof'->>'operation','') NOT IN ('verify_finding','triage_finding') OR a->'scopeProof'->>'risk' IS DISTINCT FROM (CASE WHEN a->'scopeProof'->>'operation'='verify_finding' OR b->>'knownRisk'='critical' THEN 'low' ELSE b->>'knownRisk' END) THEN RETURN false;END IF;
 expected:=jsonb_build_array(jsonb_build_object('type','application','id',app),jsonb_build_object('type','task','id',b->>'taskId'));
 IF b->>'procedureId' IS NOT NULL THEN expected:=expected||jsonb_build_array(jsonb_build_object('type','procedure','id',b->>'procedureId'));END IF;
 IF a->'scopeProof'->'entities' IS DISTINCT FROM expected OR a->'scopeProof'->>'departmentKey' IS DISTINCT FROM b->>'departmentKey' OR
 a->'path'->>0 IS DISTINCT FROM b->>'requesterId' OR a->'path'->>-1 IS DISTINCT FROM b->>'recipientId' OR
 (SELECT count(*)<>count(DISTINCT value) FROM jsonb_array_elements_text(a->'path')) THEN RETURN false;END IF;
 FOR item IN SELECT value,ordinality FROM jsonb_array_elements_text(a->'path') WITH ORDINALITY LOOP
  worker:=decision_worker(w,item.value::uuid);
  IF worker->'active' IS DISTINCT FROM 'true'::jsonb OR worker->'principal'='null'::jsonb OR jsonb_array_length(worker->'departmentKeys')<>1 OR NOT (a->'watchIds') @> jsonb_build_array(item.value) THEN RETURN false;END IF;
  lineage:=worker;seen:='{}';
  LOOP
   IF lineage IS NULL OR lineage->'active' IS DISTINCT FROM 'true'::jsonb OR lineage->'principal'='null'::jsonb OR (lineage->>'id')::uuid=ANY(seen) OR cardinality(seen)>=100 OR jsonb_array_length(lineage->'departmentKeys')<>1 OR lineage->'departmentKeys'->>0='00-ogolny' OR jsonb_array_length(lineage->'managerIds')>1 OR NOT (a->'watchIds') @> jsonb_build_array(lineage->>'id') THEN RETURN false;END IF;
   IF (SELECT count(*) FROM workforce_entities f WHERE f.workspace_id=w AND decision_worker(w,f.id)->'active'='true'::jsonb AND decision_worker(w,f.id)->'principal'=lineage->'principal')<>1 THEN RETURN false;END IF;
   seen:=array_append(seen,(lineage->>'id')::uuid);
   IF lineage->>'hierarchyLevel'='department_director' THEN
    IF (SELECT count(*) FROM workforce_entities f WHERE f.workspace_id=w AND f.status='active' AND f.hierarchy_level='department_director' AND decision_worker(w,f.id)->'departmentKeys'=lineage->'departmentKeys')<>1 THEN RETURN false;END IF;
    IF jsonb_array_length(lineage->'managerIds')=1 THEN
     supervisor:=decision_worker(w,(lineage->'managerIds'->>0)::uuid);
     IF supervisor->'active' IS DISTINCT FROM 'true'::jsonb OR supervisor->'principal' IS DISTINCT FROM jsonb_build_object('kind','user','id',(SELECT owner_user_id FROM workspaces WHERE id=w)) OR supervisor->'managerIds' IS DISTINCT FROM '[]'::jsonb OR NOT (a->'watchIds') @> jsonb_build_array(supervisor->>'id') THEN RETURN false;END IF;
    END IF;EXIT;
   END IF;
   IF jsonb_array_length(lineage->'managerIds')<>1 THEN RETURN false;END IF;
   supervisor:=decision_worker(w,(lineage->'managerIds'->>0)::uuid);
   IF supervisor->'departmentKeys' IS DISTINCT FROM lineage->'departmentKeys' THEN RETURN false;END IF;lineage:=supervisor;
  END LOOP;
  IF previous IS NOT NULL THEN
   IF previous->'departmentKeys' IS DISTINCT FROM worker->'departmentKeys' THEN
    IF crossed OR downward OR previous->>'hierarchyLevel' IS DISTINCT FROM 'department_director' OR worker->>'hierarchyLevel' IS DISTINCT FROM 'department_director' THEN RETURN false;END IF;crossed:=true;downward:=true;
   ELSIF previous->'managerIds' @> jsonb_build_array(item.value) THEN IF downward THEN RETURN false;END IF;
   ELSIF worker->'managerIds' @> jsonb_build_array(previous->>'id') THEN downward:=true;
   ELSE RETURN false;END IF;
  END IF;
  previous:=worker;
  IF first_worker IS NULL THEN
   FOR candidate IN SELECT x.* FROM workforce_mandate_versions x WHERE x.workspace_id=w AND x.workforce_id=item.value::uuid AND x.version=(SELECT max(version) FROM workforce_mandate_versions WHERE mandate_id=x.mandate_id)
    AND x.body->>'status'='active' AND (x.body->>'startsAt')::timestamptz<=now() AND (x.body->>'endsAt' IS NULL OR (x.body->>'endsAt')::timestamptz>now())
    AND x.body->'holder'=worker->'principal' AND x.body->>'departmentKey'=b->>'departmentKey' AND worker->'departmentKeys'=jsonb_build_array(b->>'departmentKey')
    AND x.body->'decisionDomains' @> '["ordinary_domain"]'::jsonb AND decision_primary_owner(w,x.issuer_user_id) AND x.body->'holder'<>jsonb_build_object('kind','user','id',x.issuer_user_id)
    AND (x.body->'operations') @> jsonb_build_array(a->'scopeProof'->>'operation') AND (x.body->'entities') @> expected
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(expected) e WHERE (x.body->'exclusions') @> jsonb_build_array(e.value))
    AND array_position(ARRAY['low','medium','high'],x.body->>'maxRisk')>=array_position(ARRAY['low','medium','high'],a->'scopeProof'->>'risk') LOOP
    IF first_worker IS NOT NULL THEN RETURN false;END IF;first_worker:=item.value::uuid;m:=candidate;
   END LOOP;
  END IF;
 END LOOP;
 RETURN first_worker IS NOT NULL AND m.workforce_id::text=a->'mandate'->>'workforceId' AND m.mandate_id::text=a->'mandate'->>'id' AND m.id::text=a->'mandate'->>'revision' AND m.body->'holder'=a->'principal' AND decision_primary_owner(w,m.issuer_user_id);
END $$;
CREATE FUNCTION finding_grant_scope(w UUID,s JSONB,u UUID,k UUID) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE f UUID:=(s->'finding'->>'observationId')::uuid;v finding_versions;a JSONB:=s->'finding'->'authority';worker workforce_entities;role_name TEXT;
BEGIN
 v:=finding_latest(f);
 IF v.workspace_id IS DISTINCT FROM w OR v.id::text IS DISTINCT FROM s->'finding'->>'versionId' OR
 (s->'finding'->'context' IS DISTINCT FROM finding_context(f) AND NOT (
   ((s->'finding'->'context')-'lineage')=(finding_context(f)-'lineage') AND EXISTS(SELECT 1 FROM finding_journal j JOIN task_capability_grants used ON used.id=j.grant_id WHERE j.id=(finding_head(f)).id AND j.action='resolve_merge' AND j.state='merged' AND used.snapshot=s AND j.proof->'context'=s->'finding'->'context'))) OR
 a->>'status' IS DISTINCT FROM 'delegated' OR a->>'epoch' IS DISTINCT FROM decision_authority_epoch(w,a) OR
 a->'principal' IS DISTINCT FROM s->'principal' OR NOT finding_authority_current(w,a,v.body,v.application_id) OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=w AND user_id=u AND role IN ('owner','admin')) THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v.body->'sources'||v.body->'evidence') ref WHERE ref->>'revision' IS DISTINCT FROM finding_reference(w,ref->>'type',(ref->>'id')::uuid)) OR v.body->'environment'->>'applicationRevision' IS DISTINCT FROM finding_reference(w,'application',v.application_id) OR v.body->'environment'->>'componentRevision' IS DISTINCT FROM finding_reference(w,'component',(v.body->>'componentId')::uuid) THEN RETURN NULL;END IF;
 SELECT * INTO worker FROM workforce_entities WHERE id=(a->'mandate'->>'workforceId')::uuid AND workspace_id=w;
 role_name:=CASE a->'scopeProof'->>'operation' WHEN 'verify_finding' THEN 'task_verification' WHEN 'triage_finding' THEN 'task_accountability' END;
 IF role_name='task_verification' AND finding_authored(f,s->'principal'->>'kind',(s->'principal'->>'id')::uuid) THEN RETURN NULL;END IF;
 IF worker.id IS NULL OR COALESCE(length(trim(worker.role)),0)=0 OR role_name IS NULL OR NOT worker.authority_scope @> jsonb_build_array(role_name) OR NOT worker.skill_index @> (v.body->'requiredCompetencies') OR
 NOT finding_principal(w,s->'principal'->>'kind',(s->'principal'->>'id')::uuid,k) OR
 NOT EXISTS(SELECT 1 FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id WHERE t.id=(v.body->>'taskId')::uuid AND t.workspace_id=w AND ap.application_id=v.application_id AND (SELECT count(*) FROM application_projects WHERE project_id=t.project_id)=1) THEN RETURN NULL;END IF;
 RETURN encode(sha256(convert_to(jsonb_build_object('binding',s,'issuer',(SELECT to_jsonb(m) FROM workspace_memberships m WHERE workspace_id=w AND user_id=u),'credential',(SELECT jsonb_build_object('id',id,'version',credential_version,'expires',expires_at) FROM api_keys WHERE id=k))::text,'UTF8')),'hex');
END $$;
ALTER FUNCTION task_capability_base_before_suspension(task_capability_grants) RENAME TO task_capability_base_before_findings;
CREATE FUNCTION task_capability_base_before_suspension(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE scope TEXT;a JSONB:=g.snapshot->'finding'->'authority';
BEGIN
 IF g.operation NOT IN ('finding_verify','finding_triage') THEN RETURN task_capability_base_before_findings(g);END IF;
 IF EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id) THEN RETURN 'revoked';END IF;
 IF g.valid_until<=clock_timestamp() THEN RETURN 'expired';END IF;
 scope:=finding_grant_scope(g.workspace_id,g.snapshot,g.issuer_user_id,g.credential_id);
 IF scope IS NULL OR scope IS DISTINCT FROM g.scope_hash OR
 g.task_id::text IS DISTINCT FROM (finding_latest((g.snapshot->'finding'->>'observationId')::uuid)).body->>'taskId' OR
 g.application_id IS DISTINCT FROM (finding_latest((g.snapshot->'finding'->>'observationId')::uuid)).application_id OR
 a->'scopeProof'->>'operation' IS DISTINCT FROM (CASE g.operation WHEN 'finding_verify' THEN 'verify_finding' ELSE 'triage_finding' END) OR
 g.snapshot->'principal' IS DISTINCT FROM jsonb_build_object('kind',CASE WHEN g.agent_id IS NULL THEN 'user' ELSE 'agent' END,'id',COALESCE(g.agent_id,g.grantee_user_id)) OR
 g.credential_id IS NOT NULL AND g.credential_version IS DISTINCT FROM (SELECT credential_version FROM api_keys WHERE id=g.credential_id) OR
 (a->'mandate'->>'endsAt')::timestamptz<g.valid_until THEN RETURN 'invalidated';END IF;
 RETURN CASE WHEN g.valid_from>clock_timestamp() THEN 'pending' ELSE 'active' END;
END $$;
ALTER FUNCTION task_capability_status(task_capability_grants) RENAME TO task_capability_status_before_findings;
CREATE FUNCTION task_capability_status(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE base TEXT;
BEGIN
 IF g.operation NOT IN ('finding_verify','finding_triage') THEN RETURN task_capability_status_before_findings(g);END IF;
 base:=task_capability_base(g);IF base<>'active' THEN RETURN base;END IF;
 IF EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id) THEN RETURN 'consumed';END IF;
 RETURN base;
END $$;
ALTER FUNCTION task_capability_effect_scope(task_capability_grants) RENAME TO task_capability_effect_scope_before_findings;
CREATE FUNCTION task_capability_effect_scope(g task_capability_grants) RETURNS TEXT LANGUAGE plpgsql STABLE AS $$ BEGIN
 IF g.operation IN ('finding_verify','finding_triage') THEN RETURN finding_grant_scope(g.workspace_id,g.snapshot,g.issuer_user_id,g.credential_id);END IF;
 RETURN task_capability_effect_scope_before_findings(g);
END $$;
DO $$ DECLARE definition TEXT; BEGIN
 definition:=pg_get_functiondef('task_capability_guard()'::regprocedure);
 IF position('IF NEW.governed_decision_acceptance_id IS NOT NULL THEN' IN definition)=0 THEN RAISE EXCEPTION 'finding_migration_baseline_invalid';END IF;
 definition:=replace(definition,'IF NEW.governed_decision_acceptance_id IS NOT NULL THEN',
 'IF NEW.finding_journal_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM finding_journal j WHERE j.id=NEW.finding_journal_id AND j.workspace_id=NEW.workspace_id AND j.grant_id=g.id AND j.request_id=NEW.request_id AND j.actor_id=COALESCE(g.agent_id,g.grantee_user_id) AND j.actor_kind=CASE WHEN g.agent_id IS NULL THEN ''user'' ELSE ''agent'' END AND j.credential_id IS NOT DISTINCT FROM g.credential_id) THEN RAISE EXCEPTION ''capability_use_invalid''; END IF;
 ELSIF NEW.governed_decision_acceptance_id IS NOT NULL THEN');EXECUTE definition;
END $$;
-- A used permission may expire without erasing historical evidence. Revocation,
-- credential changes, lost authority or changed evidence invalidate that evidence.
CREATE FUNCTION finding_verification_current(jid UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM finding_journal j JOIN finding_versions v ON v.id=j.version_id JOIN task_capability_grants g ON g.id=j.grant_id
 WHERE j.id=jid AND v.id=(finding_latest(j.observation_id)).id AND j.action IN ('confirmed','adjudicate_confirmed')
 AND j.proof->'context'=finding_context(j.observation_id) AND finding_authority_current(j.workspace_id,j.proof->'authority',v.body,v.application_id)
 AND finding_principal(j.workspace_id,j.actor_kind,j.actor_id,j.credential_id) AND NOT finding_authored(j.observation_id,j.actor_kind,j.actor_id)
 AND (g.credential_id IS NULL OR g.credential_version=(SELECT credential_version FROM api_keys WHERE id=g.credential_id))
 AND NOT native_capability_blocked(g.workspace_id,g.task_id,g.application_id,g.operation,g.agent_id,g.credential_id,NULL)
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(j.body->'verification'->'evidence') ref WHERE ref->>'revision' IS DISTINCT FROM finding_reference(j.workspace_id,ref->>'type',(ref->>'id')::uuid))
 AND NOT EXISTS(SELECT 1 FROM task_capability_revocations WHERE grant_id=g.id))
$$;
CREATE FUNCTION finding_journal_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v finding_versions;head finding_journal;g task_capability_grants;receipt finding_journal;op TEXT;expected TEXT;ref JSONB;
BEGIN
 v:=finding_latest(NEW.observation_id);head:=finding_head(NEW.observation_id);
 IF v.id IS DISTINCT FROM NEW.version_id OR v.workspace_id IS DISTINCT FROM NEW.workspace_id OR NEW.sequence<>COALESCE(head.sequence,0)+1 OR NOT finding_principal(NEW.workspace_id,NEW.actor_kind,NEW.actor_id,NEW.credential_id) THEN RAISE EXCEPTION 'finding_scope_invalid';END IF;
 IF NEW.action='revision' THEN
  IF NEW.state<>'observed' OR head.version_id=NEW.version_id OR NEW.actor_kind<>v.actor_kind OR NEW.actor_id<>v.actor_id THEN RAISE EXCEPTION 'finding_transition_invalid';END IF;RETURN NEW;
 END IF;
 IF head.version_id IS DISTINCT FROM v.id THEN RAISE EXCEPTION 'finding_stale';END IF;
 IF NEW.action='propose_merge' THEN
  IF NEW.state<>head.state OR head.state='merged' OR NEW.body->>'otherId'=NEW.observation_id::text OR NOT EXISTS(SELECT 1 FROM finding_versions other WHERE other.id=(finding_latest((NEW.body->>'otherId')::uuid)).id AND other.workspace_id=v.workspace_id AND other.application_id=v.application_id) THEN RAISE EXCEPTION 'finding_merge_scope_invalid';END IF;RETURN NEW;
 END IF;
 IF NEW.action IN ('queue_deduplication','deduplicate') THEN
  IF NEW.state IS DISTINCT FROM finding_transition(head.state,NEW.action) THEN RAISE EXCEPTION 'finding_transition_invalid';END IF;RETURN NEW;
 END IF;
 op:=CASE WHEN NEW.action IN ('confirmed','rejected','inconclusive','challenge','adjudicate_confirmed','adjudicate_rejected','adjudicate_inconclusive') THEN 'finding_verify' ELSE 'finding_triage' END;
 SELECT * INTO g FROM task_capability_grants WHERE id=NEW.grant_id AND workspace_id=NEW.workspace_id AND operation=op;
 IF g.id IS NULL OR task_capability_status(g)<>'active' OR g.snapshot->'finding'->>'versionId' IS DISTINCT FROM v.id::text OR
 NEW.actor_id IS DISTINCT FROM COALESCE(g.agent_id,g.grantee_user_id) OR NEW.actor_kind IS DISTINCT FROM (CASE WHEN g.agent_id IS NULL THEN 'user' ELSE 'agent' END) OR NEW.credential_id IS DISTINCT FROM g.credential_id OR
 NEW.proof->'context' IS DISTINCT FROM finding_context(NEW.observation_id) OR NEW.proof->'authority' IS DISTINCT FROM g.snapshot->'finding'->'authority' THEN RAISE EXCEPTION 'finding_grant_required';END IF;
 IF op='finding_verify' THEN
  IF finding_authored(NEW.observation_id,NEW.actor_kind,NEW.actor_id) THEN RAISE EXCEPTION 'finding_independent_verifier_required';END IF;
  IF jsonb_array_length(NEW.body->'verification'->'evidence') NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'finding_content_invalid';END IF;
  FOR ref IN SELECT value FROM jsonb_array_elements(NEW.body->'verification'->'evidence') LOOP
   IF NOT finding_reference_allowed(NEW.workspace_id,v.application_id,ref) THEN RAISE EXCEPTION 'finding_scope_invalid';END IF;
   IF ref->>'revision' IS DISTINCT FROM finding_reference(NEW.workspace_id,ref->>'type',(ref->>'id')::uuid) OR finding_reference(NEW.workspace_id,ref->>'type',(ref->>'id')::uuid) IS NULL THEN RAISE EXCEPTION 'finding_source_stale';END IF;
  END LOOP;
  IF NEW.action='challenge' AND EXISTS(SELECT 1 FROM finding_journal WHERE version_id=v.id AND action IN ('confirmed','rejected','inconclusive') AND actor_kind=NEW.actor_kind AND actor_id=NEW.actor_id) THEN RAISE EXCEPTION 'finding_independent_verifier_required';END IF;
  IF NEW.action LIKE 'adjudicate_%' THEN
   IF EXISTS(SELECT 1 FROM finding_journal WHERE version_id=v.id AND action LIKE 'adjudicate_%') THEN RAISE EXCEPTION 'finding_new_version_required';END IF;
   IF EXISTS(SELECT 1 FROM finding_journal WHERE version_id=v.id AND action IN ('confirmed','rejected','inconclusive','challenge','adjudicate_confirmed','adjudicate_rejected','adjudicate_inconclusive') AND actor_kind=NEW.actor_kind AND actor_id=NEW.actor_id) OR
   NOT EXISTS(SELECT 1 FROM decision_acceptances a JOIN decision_revisions r ON r.decision_id=a.decision_id WHERE a.workspace_id=NEW.workspace_id AND a.decision_id=(NEW.body->>'decisionId')::uuid AND decision_primary_owner(a.workspace_id,a.actor_user_id) AND r.body->'findingAdjudication'=jsonb_build_object('versionId',v.id,'principal',jsonb_build_object('kind',NEW.actor_kind,'id',NEW.actor_id))) THEN RAISE EXCEPTION 'finding_adjudication_required';END IF;
  END IF;
 ELSE
  SELECT * INTO receipt FROM finding_journal WHERE version_id=v.id AND action IN ('confirmed','adjudicate_confirmed') ORDER BY sequence DESC LIMIT 1;
  IF NEW.action NOT IN ('reopen','prepare_adjudication') AND NOT finding_verification_current(receipt.id) THEN RAISE EXCEPTION 'finding_verification_stale';END IF;
  IF NEW.action='prepare_adjudication' THEN
   IF head.state<>'inconclusive' OR EXISTS(SELECT 1 FROM finding_journal WHERE version_id=v.id AND action='prepare_adjudication') THEN RAISE EXCEPTION 'finding_adjudication_exists';END IF;
   IF EXISTS(SELECT 1 FROM finding_versions WHERE observation_id=v.observation_id AND actor_kind=NEW.body->'principal'->>'kind' AND actor_id::text=NEW.body->'principal'->>'id') OR EXISTS(SELECT 1 FROM finding_occurrences WHERE observation_id=v.observation_id AND purpose='fix' AND actor_kind=NEW.body->'principal'->>'kind' AND actor_id::text=NEW.body->'principal'->>'id') OR EXISTS(SELECT 1 FROM finding_journal WHERE version_id=v.id AND action IN ('confirmed','rejected','inconclusive','challenge') AND actor_kind=NEW.body->'principal'->>'kind' AND actor_id::text=NEW.body->'principal'->>'id') THEN RAISE EXCEPTION 'finding_independent_verifier_required';END IF;
   expected:=head.state;
  END IF;
  IF NEW.action IN ('prepare_task','prepare_decision','prepare_interview','propose_merge','resolve_merge') THEN
   IF NEW.action IN ('prepare_task','prepare_decision','prepare_interview') AND head.state<>'triage_pending' THEN RAISE EXCEPTION 'finding_transition_invalid';END IF;
   expected:=head.state;
   IF NEW.action='resolve_merge' THEN
    IF NOT EXISTS(SELECT 1 FROM finding_journal candidate WHERE candidate.id=(NEW.body->>'candidateId')::uuid AND candidate.observation_id=NEW.observation_id AND candidate.version_id=v.id AND candidate.action='propose_merge') OR EXISTS(SELECT 1 FROM finding_journal prior WHERE prior.observation_id=NEW.observation_id AND prior.action='resolve_merge' AND prior.body->>'candidateId'=NEW.body->>'candidateId') THEN RAISE EXCEPTION 'finding_merge_scope_invalid';END IF;
    IF NEW.body->>'verdict'='merge' THEN
     IF EXISTS(SELECT 1 FROM finding_outputs WHERE observation_id=NEW.observation_id OR observation_id=(NEW.body->>'outputId')::uuid) OR
      NOT EXISTS(SELECT 1 FROM finding_versions other JOIN finding_journal candidate ON candidate.id=(NEW.body->>'candidateId')::uuid WHERE other.id=(finding_latest((NEW.body->>'outputId')::uuid)).id AND other.workspace_id=v.workspace_id AND other.application_id=v.application_id AND other.body->>'componentId'=v.body->>'componentId' AND other.observation_id::text=candidate.body->>'otherId' AND (finding_head(other.observation_id)).state IN ('verified','triage_pending') AND EXISTS(SELECT 1 FROM finding_journal verification WHERE verification.version_id=other.id AND finding_verification_current(verification.id))) THEN RAISE EXCEPTION 'finding_merge_scope_invalid';END IF;
     expected:='merged';
    END IF;
   END IF;
  END IF;
 END IF;
 expected:=COALESCE(expected,finding_transition(head.state,NEW.action));
 IF expected IS NULL OR NEW.state IS DISTINCT FROM expected THEN RAISE EXCEPTION 'finding_transition_invalid';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finding_journal_guard BEFORE INSERT ON finding_journal FOR EACH ROW EXECUTE FUNCTION finding_journal_guard();
CREATE FUNCTION finding_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE g task_capability_grants;o finding_outputs;v finding_versions;t tasks;origin finding_journal;
BEGIN
 IF NEW.grant_id IS NOT NULL THEN
  SELECT * INTO g FROM task_capability_grants WHERE id=NEW.grant_id;
  IF task_capability_base(g)<>'active' OR NOT EXISTS(SELECT 1 FROM task_capability_uses WHERE grant_id=g.id AND finding_journal_id=NEW.id AND post_scope_hash=task_capability_effect_scope(g)) THEN RAISE EXCEPTION 'finding_receipt_required';END IF;
 END IF;
 IF NEW.action IN ('prepare_task','prepare_decision','prepare_interview') AND NOT EXISTS(SELECT 1 FROM finding_outputs WHERE journal_id=NEW.id AND version_id=NEW.version_id) THEN RAISE EXCEPTION 'finding_receipt_required';END IF;
 IF NEW.action='prepare_adjudication' AND NOT EXISTS(SELECT 1 FROM decision_revisions WHERE finding_journal_id=NEW.id AND decision_id::text=NEW.body->>'outputId' AND body->'findingAdjudication'=jsonb_build_object('versionId',NEW.version_id,'principal',NEW.body->'principal') AND body->'authority'->>'domain'='mandate_change') THEN RAISE EXCEPTION 'finding_receipt_required';END IF;
 IF NEW.action='defer' AND NOT EXISTS(SELECT 1 FROM decision_deferrals WHERE finding_journal_id=NEW.id AND target_type='finding' AND target_id=NEW.observation_id) THEN RAISE EXCEPTION 'finding_receipt_required';END IF;
 IF NEW.action='reopen' AND NOT EXISTS(SELECT 1 FROM decision_reopening_events e JOIN decision_deferrals d ON d.id=e.deferral_id WHERE e.workspace_id=NEW.workspace_id AND d.target_type='finding' AND d.target_id=NEW.observation_id AND d.id=(SELECT id FROM decision_deferrals WHERE target_type='finding' AND target_id=NEW.observation_id ORDER BY version DESC LIMIT 1) AND e.deferral_id=(NEW.body->>'deferralId')::uuid AND e.event_type=NEW.body->>'eventType') THEN RAISE EXCEPTION 'finding_receipt_required';END IF;
 IF NEW.action IN ('convert_task','convert_decision') THEN
  SELECT * INTO o FROM finding_outputs WHERE observation_id=NEW.observation_id;v:=finding_latest(NEW.observation_id);
  IF o.observation_id IS NULL OR v.id IS DISTINCT FROM NEW.version_id OR NOT EXISTS(SELECT 1 FROM finding_journal WHERE id=(NEW.body->>'verificationId')::uuid AND version_id=v.id AND action IN ('confirmed','adjudicate_confirmed')) THEN RAISE EXCEPTION 'finding_output_invalid';END IF;
  IF NEW.action='convert_task' THEN
   SELECT * INTO t FROM tasks WHERE id=o.task_id;SELECT * INTO origin FROM finding_journal WHERE id=o.journal_id;
   IF t.id IS NULL OR t.execution_readiness->>'status' IS DISTINCT FROM 'ready' OR t.id::text IS DISTINCT FROM NEW.body->>'outputId' OR t.execution_readiness->'contract'->'objective'->>'outcome' IS DISTINCT FROM origin.body->'task'->>'outcome' OR
    t.execution_readiness->'contract'->'singleTask'->'component'->>'id' IS DISTINCT FROM v.body->>'componentId' OR t.execution_readiness->'contract'->'assignment'->>'agentId' IS DISTINCT FROM origin.body->'task'->>'executorId' OR
    t.execution_readiness->'contract'->'singleTask'->'accountableManager'->>'id' IS DISTINCT FROM NEW.proof->'authority'->'mandate'->>'workforceId' OR
    NOT COALESCE(t.execution_readiness->'contract'->'acceptance'->'criteria' @> (origin.body->'task'->'acceptanceCriteria'),false) OR NOT COALESCE(t.execution_readiness->'contract'->'acceptance'->'tests' @> (origin.body->'task'->'requiredTests'),false) OR
    NOT COALESCE(t.execution_readiness->'contract'->'scope'->'allowed' @> jsonb_build_array(origin.body->'task'->>'scope'),false) OR NOT COALESCE(t.execution_readiness->'contract'->'scope'->'forbidden' @> jsonb_build_array(origin.body->'task'->>'excluded'),false) OR
    NOT COALESCE(t.execution_readiness->'contract'->'procedures'->'items' @> jsonb_build_array(jsonb_build_object('id',origin.body->'task'->>'procedureId')),false) OR
    task_risk_current(t.id)::text IS DISTINCT FROM t.execution_readiness->>'riskAssessmentId' OR task_admission_seal(t.id,'runtime_execute') IS NULL OR task_admission_seal(t.id,'runtime_execute') IS DISTINCT FROM t.execution_readiness->>'riskAdmissionSeal' OR
    task_composition(t.id,'runtime_execute')->>'seal' IS DISTINCT FROM t.execution_readiness->'procedureComposition'->>'seal' THEN RAISE EXCEPTION 'finding_ready_required';END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM decisions d WHERE d.workspace_id=NEW.workspace_id AND d.status='accepted' AND d.id::text=NEW.body->>'outputId' AND (d.id=o.decision_id OR EXISTS(SELECT 1 FROM task_interview_entries WHERE case_id=o.interview_id AND decision_id=d.id AND action='answer'))) THEN RAISE EXCEPTION 'finding_output_invalid';END IF;
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER finding_receipt_guard AFTER INSERT ON finding_journal DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finding_receipt_guard();
-- Reuse native proposals, interviews and event-driven deferrals; preserve their acceptance gates.
ALTER TABLE decision_revisions ADD COLUMN finding_journal_id UUID UNIQUE REFERENCES finding_journal(id);
ALTER TABLE decision_revisions ADD COLUMN actor_agent_id UUID REFERENCES workforce_entities(id);
ALTER TABLE decision_revisions ALTER COLUMN actor_user_id DROP NOT NULL;
ALTER TABLE decision_revisions ADD CHECK(num_nonnulls(actor_user_id,actor_agent_id)=1 AND (actor_agent_id IS NULL OR finding_journal_id IS NOT NULL));
ALTER TABLE decision_impact_previews ADD COLUMN finding_journal_id UUID UNIQUE REFERENCES finding_journal(id);
ALTER TABLE decision_impact_previews ADD COLUMN actor_agent_id UUID REFERENCES workforce_entities(id);
ALTER TABLE decision_impact_previews ALTER COLUMN actor_user_id DROP NOT NULL;
ALTER TABLE decision_impact_previews ADD CHECK(num_nonnulls(actor_user_id,actor_agent_id)=1 AND (actor_agent_id IS NULL OR finding_journal_id IS NOT NULL));
ALTER TABLE task_interview_cases ADD COLUMN finding_journal_id UUID UNIQUE REFERENCES finding_journal(id);
ALTER TABLE decision_deferrals ADD COLUMN finding_journal_id UUID UNIQUE REFERENCES finding_journal(id);
ALTER TABLE decision_deferrals ADD COLUMN actor_agent_id UUID REFERENCES workforce_entities(id);
ALTER TABLE decision_deferrals ALTER COLUMN actor_user_id DROP NOT NULL;
ALTER TABLE decision_deferrals ADD CHECK(num_nonnulls(actor_user_id,actor_agent_id)=1 AND (actor_agent_id IS NULL OR finding_journal_id IS NOT NULL));
ALTER TABLE decision_deferrals DROP CONSTRAINT decision_deferrals_target_type_check;
ALTER TABLE decision_deferrals ADD CHECK(target_type IN ('decision','interview','finding'));
ALTER TABLE decision_reopening_events ADD COLUMN finding_journal_id UUID UNIQUE REFERENCES finding_journal(id);
ALTER TABLE decision_reopening_events ADD COLUMN actor_agent_id UUID REFERENCES workforce_entities(id);
ALTER TABLE decision_reopening_events ALTER COLUMN actor_user_id DROP NOT NULL;
ALTER TABLE decision_reopening_events ADD CHECK(num_nonnulls(actor_user_id,actor_agent_id)=1 AND (actor_agent_id IS NULL OR finding_journal_id IS NOT NULL));
CREATE FUNCTION finding_origin(w UUID,jid UUID,u UUID,a UUID,action TEXT) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM finding_journal j JOIN finding_versions v ON v.id=j.version_id
 WHERE j.id=jid AND j.workspace_id=w AND (j.action=action OR action='prepare_decision' AND j.action='prepare_adjudication') AND j.grant_id IS NOT NULL AND j.version_id=(finding_latest(j.observation_id)).id
 AND j.actor_kind=CASE WHEN a IS NULL THEN 'user' ELSE 'agent' END AND j.actor_id=COALESCE(a,u))
$$;
CREATE FUNCTION finding_reopening_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM decision_deferrals WHERE id=NEW.deferral_id AND target_type='finding') AND NEW.event_type='owner_signal' AND NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) THEN RAISE EXCEPTION 'finding_owner_signal_required';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finding_reopening_guard BEFORE INSERT ON decision_reopening_events FOR EACH ROW EXECUTE FUNCTION finding_reopening_guard();
DO $$ DECLARE definition TEXT;needle TEXT; BEGIN
 definition:=pg_get_functiondef('decision_history_guard()'::regprocedure);
 needle:='IF TG_TABLE_NAME<>''decision_acceptances'' AND NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) THEN RAISE EXCEPTION ''decision_forbidden''; END IF;';
 IF position(needle IN definition)=0 THEN RAISE EXCEPTION 'finding_migration_baseline_invalid';END IF;
 definition:=replace(definition,needle,
 'IF TG_TABLE_NAME<>''decision_acceptances'' AND NOT decision_primary_owner(NEW.workspace_id,NEW.actor_user_id) AND NOT finding_origin(NEW.workspace_id,(to_jsonb(NEW)->>''finding_journal_id'')::uuid,NEW.actor_user_id,(to_jsonb(NEW)->>''actor_agent_id'')::uuid,CASE TG_TABLE_NAME WHEN ''decision_revisions'' THEN ''prepare_decision'' WHEN ''decision_impact_previews'' THEN ''prepare_decision'' WHEN ''decision_deferrals'' THEN ''defer'' WHEN ''decision_reopening_events'' THEN ''reopen'' ELSE ''forbidden'' END) THEN RAISE EXCEPTION ''decision_forbidden''; END IF;');
 needle:='IF NEW.target_type=''decision'' THEN';
 definition:=replace(definition,needle,
 'IF NEW.target_type=''finding'' THEN
  SELECT jsonb_build_array(jsonb_build_object(''type'',''task'',''id'',v.body->>''taskId'')) INTO required_scope FROM finding_versions v JOIN finding_journal j ON j.version_id=v.id WHERE j.id=NEW.finding_journal_id AND j.observation_id=NEW.target_id AND j.action=''defer'';
 ELSIF NEW.target_type=''decision'' THEN');
 EXECUTE definition;
 definition:=pg_get_functiondef('task_interview_guard()'::regprocedure);
 needle:='IF NEW.actor_agent_id IS NOT NULL AND NOT EXISTS';
 IF position(needle IN definition)=0 THEN RAISE EXCEPTION 'finding_migration_baseline_invalid';END IF;
 definition:=replace(definition,needle,'IF NEW.actor_agent_id IS NOT NULL AND NOT finding_origin(NEW.workspace_id,NEW.finding_journal_id,NEW.actor_user_id,NEW.actor_agent_id,''prepare_interview'') AND NOT EXISTS');
 EXECUTE definition;
 definition:=pg_get_functiondef('task_interview_receipt()'::regprocedure);
 definition:=replace(definition,'IF NEW.capability_grant_id IS NOT NULL AND NOT EXISTS','IF NEW.capability_grant_id IS NOT NULL AND NEW.finding_journal_id IS NULL AND NOT EXISTS');
 EXECUTE definition;
END $$;
CREATE FUNCTION finding_output_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE j finding_journal;v finding_versions;receipt finding_journal;
BEGIN
 SELECT * INTO j FROM finding_journal WHERE id=NEW.journal_id;
 v:=finding_latest(NEW.observation_id);SELECT * INTO receipt FROM finding_journal WHERE id=NEW.verification_id;
 IF j.observation_id IS DISTINCT FROM NEW.observation_id OR j.workspace_id IS DISTINCT FROM NEW.workspace_id OR j.version_id IS DISTINCT FROM NEW.version_id OR v.id IS DISTINCT FROM NEW.version_id OR receipt.version_id IS DISTINCT FROM v.id OR receipt.action NOT IN ('confirmed','adjudicate_confirmed') OR j.body->>'outputId' IS DISTINCT FROM COALESCE(NEW.task_id,NEW.decision_id,NEW.interview_id)::text THEN RAISE EXCEPTION 'finding_output_invalid';END IF;
 IF NEW.task_id IS NOT NULL THEN
  IF j.action<>'prepare_task' OR v.body->>'classification'='missing_assumption' OR v.body->>'decisionNeed'<>'none' OR v.body->>'knownRisk'='critical' OR
   NOT EXISTS(SELECT 1 FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id WHERE t.id=NEW.task_id AND t.workspace_id=NEW.workspace_id AND ap.application_id=v.application_id AND t.execution_readiness->>'status'='draft' AND t.assigned_workforce_entity_id::text=j.body->'task'->>'executorId') THEN RAISE EXCEPTION 'finding_output_invalid';END IF;
 ELSIF NEW.decision_id IS NOT NULL THEN
  IF j.action<>'prepare_decision' OR NOT EXISTS(SELECT 1 FROM decision_revisions WHERE decision_id=NEW.decision_id AND workspace_id=NEW.workspace_id AND finding_journal_id=j.id AND body->'authority'->>'domain' IN ('product_direction','money','legal','critical_risk','mandate_change')) THEN RAISE EXCEPTION 'finding_output_invalid';END IF;
 ELSE
  IF j.action<>'prepare_interview' OR NOT EXISTS(SELECT 1 FROM task_interview_cases WHERE id=NEW.interview_id AND workspace_id=NEW.workspace_id AND finding_journal_id=j.id) THEN RAISE EXCEPTION 'finding_output_invalid';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER finding_output_guard BEFORE INSERT ON finding_outputs FOR EACH ROW EXECUTE FUNCTION finding_output_guard();
CREATE FUNCTION finding_task_current(t UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM finding_outputs o WHERE o.task_id=t AND NOT EXISTS(
  SELECT 1 FROM finding_journal j JOIN finding_versions v ON v.id=j.version_id JOIN finding_journal receipt ON receipt.id=(j.body->>'verificationId')::uuid
  WHERE j.id=(finding_head(o.observation_id)).id AND v.id=(finding_latest(o.observation_id)).id AND j.state='converted_to_task'
  AND receipt.version_id=v.id AND finding_verification_current(receipt.id)
  AND receipt.proof->'authority'->>'epoch'=decision_authority_epoch(o.workspace_id,receipt.proof->'authority')
  AND j.proof->'authority'->>'epoch'=decision_authority_epoch(o.workspace_id,j.proof->'authority')))
$$;
CREATE FUNCTION finding_invalidate(w UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE t UUID;e RECORD;
BEGIN
 FOR t IN SELECT o.task_id FROM finding_outputs o JOIN tasks task ON task.id=o.task_id WHERE o.workspace_id=w AND task.execution_readiness->>'status'='ready' AND NOT finding_task_current(o.task_id) LOOP
  UPDATE tasks SET execution_readiness=execution_readiness||jsonb_build_object('status','needs_revalidation','reason','finding_context_changed') WHERE id=t;
  FOR e IN UPDATE agent_executions SET status='cancelled',context_invalidated_at=COALESCE(context_invalidated_at,clock_timestamp()),completed_at=clock_timestamp(),lease_token=NULL,lease_expires_at=NULL,
   context_invalidation=jsonb_build_object('schemaVersion','roost-context-stop-v1','reason','finding_context_changed','changedSources','[]'::jsonb),error_state=jsonb_build_object('code','agent_execution_context_invalidated','retryable',false)
   WHERE task_id=t AND status='queued' RETURNING id,workspace_id LOOP
   INSERT INTO agent_execution_events(id,workspace_id,execution_id,type,level,message,payload) VALUES(gen_random_uuid(),e.workspace_id,e.id,'context_stop_requested','warning','Finding evidence changed; this queued attempt cannot run.','{}'::jsonb);
  END LOOP;
 END LOOP;
END $$;
CREATE FUNCTION finding_source_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r JSONB;w UUID;k TEXT;
BEGIN
 IF TG_TABLE_NAME='tasks' AND TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD)-'execution_readiness'-'updated_at') IS NOT DISTINCT FROM (to_jsonb(NEW)-'execution_readiness'-'updated_at') AND OLD.execution_readiness->'contract' IS NOT DISTINCT FROM NEW.execution_readiness->'contract' THEN RETURN NULL;END IF;
 END IF;
 IF TG_TABLE_NAME='api_keys' AND TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD)-'last_used_at') IS NOT DISTINCT FROM (to_jsonb(NEW)-'last_used_at') THEN RETURN NULL;END IF;
 END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(CASE WHEN TG_OP='INSERT' THEN jsonb_build_array(to_jsonb(NEW)) WHEN TG_OP='DELETE' THEN jsonb_build_array(to_jsonb(OLD)) ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END) LOOP
  w:=CASE WHEN TG_TABLE_NAME='workspaces' THEN (r->>'id')::uuid ELSE (r->>'workspace_id')::uuid END;
  IF w IS NULL THEN SELECT workspace_id INTO w FROM applications WHERE id=(r->>'application_id')::uuid;END IF;
  IF NOT EXISTS(SELECT 1 FROM finding_versions WHERE workspace_id=w) THEN CONTINUE;END IF;
  k:=CASE TG_TABLE_NAME WHEN 'tasks' THEN 'task' WHEN 'applications' THEN 'application' WHEN 'company_records' THEN 'company_record' WHEN 'application_evidence' THEN 'application_evidence' WHEN 'agent_executions' THEN 'run' WHEN 'projects' THEN 'project' WHEN 'procedures' THEN 'procedure' END;
  IF k IS NOT NULL AND NOT EXISTS(SELECT 1 FROM finding_versions v WHERE v.workspace_id=w AND v.id=(finding_latest(v.observation_id)).id AND
    ((k='application' AND v.application_id::text=r->>'id') OR (k='task' AND v.body->>'taskId'=r->>'id') OR
    EXISTS(SELECT 1 FROM jsonb_array_elements((v.body->'sources')||(v.body->'evidence')) ref WHERE (ref->>'type'=k OR k='company_record' AND ref->>'type'='audit') AND ref->>'id'=r->>'id') OR
    EXISTS(SELECT 1 FROM finding_occurrences occurrence CROSS JOIN LATERAL jsonb_array_elements(occurrence.body->'evidence'||jsonb_build_array(occurrence.body->'source')) ref WHERE occurrence.observation_id=v.observation_id AND ref->>'type'=k AND ref->>'id'=r->>'id') OR
    EXISTS(SELECT 1 FROM finding_journal receipt CROSS JOIN LATERAL jsonb_array_elements(receipt.body->'verification'->'evidence') ref WHERE receipt.observation_id=v.observation_id AND ref->>'type'=k AND ref->>'id'=r->>'id'))) THEN CONTINUE;END IF;
  INSERT INTO finding_source_epochs(workspace_id,revision) VALUES(w,1) ON CONFLICT(workspace_id) DO UPDATE SET revision=finding_source_epochs.revision+1;
  PERFORM finding_invalidate(w);
 END LOOP;RETURN NULL;
END $$;
DO $$ DECLARE tbl TEXT;BEGIN FOREACH tbl IN ARRAY ARRAY['workforce_mandate_versions','workforce_entities','workspace_memberships','workspaces','organizational_department_relations','application_architecture_components','tasks','applications','company_records','application_evidence','agent_executions','projects','procedures','application_projects','application_procedures','api_keys','task_capability_revocations','native_capability_suspensions','native_suspension_journal'] LOOP
 EXECUTE format('CREATE TRIGGER finding_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION finding_source_changed()',tbl);
END LOOP;END $$;
CREATE FUNCTION finding_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN PERFORM finding_invalidate(NEW.workspace_id);RETURN NULL;END $$;
CREATE TRIGGER finding_changed AFTER INSERT ON finding_versions FOR EACH ROW EXECUTE FUNCTION finding_changed();
CREATE TRIGGER finding_changed AFTER INSERT ON finding_occurrences FOR EACH ROW EXECUTE FUNCTION finding_changed();
CREATE TRIGGER finding_changed AFTER INSERT ON finding_journal FOR EACH ROW EXECUTE FUNCTION finding_changed();
CREATE FUNCTION finding_execution_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status IN ('queued','claimed','running','waiting_for_approval','completed') AND NOT finding_task_current(NEW.task_id) THEN RAISE EXCEPTION 'finding_ready_required';END IF;RETURN NEW;
END $$;
CREATE TRIGGER finding_execution_guard BEFORE INSERT OR UPDATE OF status ON agent_executions FOR EACH ROW EXECUTE FUNCTION finding_execution_guard();
COMMIT;
