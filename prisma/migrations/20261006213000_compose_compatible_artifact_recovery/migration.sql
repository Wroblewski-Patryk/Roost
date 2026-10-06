BEGIN;
-- Additive opt-in only. No old rows, tables, applied functions, credentials,
-- business data or historical receipts are edited. SQL verifies stored owner
-- provenance and relational bindings, NOT a private HMAC or operating system.
CREATE FUNCTION governed_release_compatible_keys(v JSONB,keys TEXT[])
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF jsonb_typeof(v) IS DISTINCT FROM 'object' THEN RETURN FALSE;END IF;
 RETURN (SELECT count(*) FROM jsonb_object_keys(v))=cardinality(keys) AND v?&keys;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_iso(v TIMESTAMP)
 RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT to_char(v,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;
CREATE FUNCTION governed_release_compatible_camel_row(v JSONB)
 RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k TEXT;value JSONB;parts TEXT[];converted TEXT;i INTEGER;result JSONB:='{}'::jsonb;
BEGIN
 FOR k,value IN SELECT * FROM jsonb_each(v) LOOP
  parts:=string_to_array(k,'_');converted:=parts[1];
  IF cardinality(parts)>1 THEN FOR i IN 2..cardinality(parts) LOOP converted:=converted||initcap(parts[i]);END LOOP;END IF;
  result:=result||jsonb_build_object(converted,value);
 END LOOP;RETURN result;
END $$;

CREATE FUNCTION governed_release_compatible_scope_digest(s JSONB)
 RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r JSONB:=s->'compatibleArtifactRecovery';e JSONB;inventory JSONB;binding JSONB;
BEGIN
 r:=r-'scopeAudit';e:=r->'currentEntry';inventory:=(e->'projectInventory')-ARRAY['observedAt','digest'];
 e:=jsonb_set(e-ARRAY['observedAt','evidenceDigest'],'{publicHealth}',(e->'publicHealth')-'healthDigest');
 e:=jsonb_set(e,'{projectInventory}',inventory);
 e:=jsonb_set(e,'{services}',(SELECT jsonb_agg(v-ARRAY['observedAt','inventoryDigest'] ORDER BY ord)
  FROM jsonb_array_elements(e->'services') WITH ORDINALITY q(v,ord)));
 e:=jsonb_set(e,'{cadences}',(SELECT jsonb_agg(v-ARRAY['observedAt','inventoryDigest'] ORDER BY ord)
  FROM jsonb_array_elements(e->'cadences') WITH ORDINALITY q(v,ord)));
 IF e?'ingressFence' THEN e:=jsonb_set(e,'{ingressFence}',(e->'ingressFence')-ARRAY['observedAt','evidenceDigest']);END IF;
 r:=jsonb_set(r,'{currentEntry}',e);r:=jsonb_set(r,'{nativeClosure}',(r->'nativeClosure')-ARRAY['observedAt','evidenceDigest']);
 SELECT jsonb_object_agg(k,s->k) INTO binding FROM unnest(ARRAY['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId'])k;
 RETURN governed_release_compose_queue_digest(jsonb_build_object('schemaVersion','roost-compose-compatible-artifact-recovery-scope-v1',
  'binding',binding,'manifestDigest',s->'manifestDigest','recovery',r,
  'operations',jsonb_build_array('push','pr','review','merge','deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'),
  'historicalRollbackExecutable',FALSE));
EXCEPTION WHEN OTHERS THEN RETURN NULL;END $$;

CREATE FUNCTION governed_release_compatible_execution_current(e agent_executions)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE t tasks;p JSONB;r JSONB;c JSONB:=task_review_material(e)->'contract';role_name TEXT;agent workforce_entities;
BEGIN
 SELECT * INTO t FROM tasks WHERE id=e.task_id AND workspace_id=e.workspace_id;
 IF t.id IS NULL OR e.status IS DISTINCT FROM 'completed' OR e.completed_at IS NULL OR e.context_invalidated_at IS NOT NULL
  OR e.context_stopped_at IS NOT NULL OR e.cancel_requested_at IS NOT NULL OR e.error_state IS NOT NULL
  OR e.lease_token IS NOT NULL OR e.lease_expires_at IS NOT NULL OR e.agent_host_id IS NULL
  OR t.assigned_workforce_entity_id::text IS DISTINCT FROM c->'assignment'->>'agentId'
  OR EXISTS(SELECT 1 FROM agent_executions n WHERE n.workspace_id=e.workspace_id AND n.task_id=e.task_id AND (n.created_at,n.id)>(e.created_at,e.id)) THEN RETURN FALSE;END IF;
 p:=t.execution_readiness;r:=e.metadata->'readyContextPin';
 IF completed_result_basis_current(e) IS DISTINCT FROM TRUE AND (p->>'status' IS DISTINCT FROM 'ready'
  OR p->'pinId' IS DISTINCT FROM r->'pinId' OR p->'revision' IS DISTINCT FROM r->'revision') THEN RETURN FALSE;END IF;
 -- Normal role context also pins the active executor/verifier/releaser revision.
 FOREACH role_name IN ARRAY ARRAY['executor','verifier','releaser'] LOOP
  SELECT * INTO agent FROM workforce_entities WHERE id=(c->'taskRoles'->role_name->>'id')::uuid AND workspace_id=e.workspace_id;
  IF agent.id IS NULL OR agent.type<>'agent' OR agent.source='user' OR agent.status<>'active'
   OR agent.updated_at::timestamptz IS DISTINCT FROM (c->'taskRoles'->role_name->>'revision')::timestamptz THEN RETURN FALSE;END IF;
 END LOOP;RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_basis_digest(e agent_executions,d task_review_decisions)
 RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE m JSONB:=task_review_material(e);decision JSONB;execution JSONB;
BEGIN
 -- Approved decisions cannot contain a manager return/action. Prisma include
 -- action:true serializes that relation as null, and Dates as UTC ISO millis.
 IF EXISTS(SELECT 1 FROM task_review_actions WHERE review_id=d.id) THEN RETURN NULL;END IF;
 decision:=governed_release_compatible_camel_row(to_jsonb(d));
 decision:=jsonb_set(decision,'{createdAt}',to_jsonb(governed_release_compatible_iso(d.created_at)))||jsonb_build_object('action',NULL);
 execution:=jsonb_build_object('id',e.id,'taskId',e.task_id,'workspaceId',e.workspace_id,'applicationId',e.application_id,
  'agentHostId',e.agent_host_id,'status',e.status,'attempt',e.attempt,'checkpointVersion',e.checkpoint_version,
  'completedAt',governed_release_compatible_iso(e.completed_at),'changedFiles',e.changed_files,'verification',e.verification,
  'finalResponse',e.final_response,'summary',e.summary,'promptDigest',governed_release_compose_queue_digest(to_jsonb(e.prompt)));
 IF e.metadata?'executionContract' THEN execution:=execution||jsonb_build_object('executionContract',e.metadata->'executionContract');END IF;
 IF e.metadata?'resultRevision' THEN execution:=execution||jsonb_build_object('resultRevision',e.metadata->'resultRevision');END IF;
 IF e.metadata?'readyContextPin' THEN execution:=execution||jsonb_build_object('readyContextPin',e.metadata->'readyContextPin');END IF;
 RETURN governed_release_compose_queue_digest(jsonb_build_object('current',TRUE,'roleIssues','[]'::jsonb,
  'materialVersion',d.material_version,'approvalCommit',e.metadata->'resultRevision'->'commit','decision',decision,
  'contract',m->'contract','basisRevalidation',COALESCE(m->'basisRevalidation','null'::jsonb),'execution',execution));
EXCEPTION WHEN OTHERS THEN RETURN NULL;END $$;

CREATE FUNCTION governed_release_compatible_manifest_valid(previous JSONB,s JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE old JSONB:=previous->'manifest';m JSONB:=s->'manifest';t JSONB:=m->'deployment'->'targets'->0;
 pt JSONB:=old->'deployment'->'targets'->0;key TEXT;cfg JSONB;original JSONB;
BEGIN
 IF m->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2' OR m->>'purpose' IS DISTINCT FROM 'application_release'
  OR m->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' OR m->'cleanup'->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_array_length(m->'deployment'->'targets') IS DISTINCT FROM 1
  OR s->>'manifestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(m) THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['commit','schemaDigest','dataDigest','healthDigest','observedAt'] LOOP
  IF old->'baseline'->key IS DISTINCT FROM m->'baseline'->key THEN RETURN FALSE;END IF;
 END LOOP;
 FOREACH key IN ARRAY ARRAY['commit','schemaDigest','compatibleSchemaDigests'] LOOP
  IF old->'rollback'->key IS DISTINCT FROM m->'rollback'->key THEN RETURN FALSE;END IF;
 END LOOP;
 FOREACH key IN ARRAY ARRAY['commit','tree','sourceDigest','images'] LOOP
  IF pt->'baseline'->key IS DISTINCT FROM t->'baseline'->key THEN RETURN FALSE;END IF;
 END LOOP;
 cfg:=(t->'baseline'->'configuration')#-'{sourcePins,controllerRenderer}';cfg:=cfg#-'{controllerPolicy,rendererDigest}';
 original:=(pt->'baseline'->'configuration')#-'{sourcePins,controllerRenderer}';original:=original#-'{controllerPolicy,rendererDigest}';
 IF cfg IS DISTINCT FROM original OR old->'services' IS DISTINCT FROM m->'services' OR old->'observation' IS DISTINCT FROM m->'observation'
  OR old->'repository'->'url' IS DISTINCT FROM m->'repository'->'url' OR old->'repository'->'canonicalDir' IS DISTINCT FROM m->'repository'->'canonicalDir'
  OR old->'repository'->'defaultBranch' IS DISTINCT FROM m->'repository'->'defaultBranch'
  OR old->'deployment'->'controllerUrl' IS DISTINCT FROM m->'deployment'->'controllerUrl'
  OR old->'deployment'->'url' IS DISTINCT FROM m->'deployment'->'url' OR old->'deployment'->'publicOrigins' IS DISTINCT FROM m->'deployment'->'publicOrigins'
  OR pt->'targetId' IS DISTINCT FROM t->'targetId' OR pt->'composePath' IS DISTINCT FROM t->'composePath'
  OR (old->'postObservation')-ARRAY['candidateCommit','candidateTree','controllerDigest'] IS DISTINCT FROM (m->'postObservation')-ARRAY['candidateCommit','candidateTree','controllerDigest']
  OR t->'baseline'->'controllerInvariants'->'settingsInvariantDigest' IS DISTINCT FROM pt->'baseline'->'controllerInvariants'->'settingsInvariantDigest'
  OR t->'baseline'->'controllerInvariants'->'runtimeInvariantDigest' IS DISTINCT FROM pt->'baseline'->'controllerInvariants'->'runtimeInvariantDigest'
  OR m->'cleanup'->'ownedResourceIds' IS DISTINCT FROM '[]'::jsonb
  OR NOT((m->'cleanup'->'protectedResourceIds') @> (old->'cleanup'->'protectedResourceIds')) THEN RETURN FALSE;END IF;
 original:=(t->'baseline'->'configuration')-ARRAY['gitCommit','sourceDigest','composeDigest','controllerPolicy','settingsDigest','runtimePolicyDigest'];
 original:=original#-'{sourcePins,controllerRenderer}';
 FOREACH key IN ARRAY ARRAY['configuration','rollbackConfiguration'] LOOP
  cfg:=(t->key)-ARRAY['gitCommit','sourceDigest','composeDigest','controllerPolicy','settingsDigest','runtimePolicyDigest'];cfg:=cfg#-'{sourcePins,controllerRenderer}';
  IF cfg IS DISTINCT FROM original THEN RETURN FALSE;END IF;
 END LOOP;
 IF t->'configuration'->>'gitCommit' IS DISTINCT FROM s->>'commit' OR t->'baseline'->>'commit' IS DISTINCT FROM s->>'baseCommit'
  OR t->'baseline'->>'tree' IS DISTINCT FROM s->>'baseTree'
  OR t->>'configDigest' IS DISTINCT FROM governed_release_compose_queue_config_digest(t->'configuration')
  OR t->>'rollbackConfigDigest' IS DISTINCT FROM governed_release_compose_queue_config_digest(t->'rollbackConfiguration')
  OR t->'baseline'->>'configDigest' IS DISTINCT FROM governed_release_compose_queue_config_digest(t->'baseline'->'configuration') THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['candidate','rollback','baseline'] LOOP
  IF m->(CASE key WHEN 'candidate' THEN 'deployment' ELSE key END)->>'artifactSetDigest'
   IS DISTINCT FROM governed_release_compose_queue_artifact_digest(s,m,key) THEN RETURN FALSE;END IF;
 END LOOP;RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_fence_valid(f JSONB,target JSONB,db JSONB,observed TEXT,fresh BOOLEAN)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE k TEXT;network CIDR;database_ip INET;proxy_ip INET;
BEGIN
 IF NOT governed_release_compatible_keys(f,ARRAY['schemaVersion','observedAt','targetId','networkId','subnet','proxyId','proxyPid','namespaceDigest',
  'databaseContainerId','databaseIpv4','proxyIpv4','port','ruleComment','ruleDigest','originalRulesDigest','observedRulesDigest',
  'projectNetworkExclusive','publishedPortsAbsent','rulePresent','evidenceDigest'])
  OR f->>'schemaVersion' IS DISTINCT FROM 'roost-compose-proxy-network-fence-v1' OR f->'targetId' IS DISTINCT FROM target
  OR f->'databaseContainerId' IS DISTINCT FROM db->'containerId' OR f->'proxyId' IS NOT DISTINCT FROM db->'containerId'
  OR f->'port' IS DISTINCT FROM '8000'::jsonb OR (f->>'proxyPid')::bigint NOT BETWEEN 2 AND 2147483647
  OR f->>'ruleComment'!~'^roost-release-hold-[a-f0-9]{32}$'
  OR f->'projectNetworkExclusive' IS DISTINCT FROM 'true'::jsonb OR f->'publishedPortsAbsent' IS DISTINCT FROM 'true'::jsonb
  OR f->'rulePresent' IS DISTINCT FROM 'true'::jsonb OR f->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(f-'evidenceDigest') THEN RETURN FALSE;END IF;
 FOREACH k IN ARRAY ARRAY['networkId','proxyId','namespaceDigest','databaseContainerId','ruleDigest','originalRulesDigest','observedRulesDigest','evidenceDigest'] LOOP
  IF jsonb_typeof(f->k) IS DISTINCT FROM 'string' OR COALESCE(f->>k,'')!~'^[a-f0-9]{64}$' THEN RETURN FALSE;END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['observedAt','targetId','subnet','databaseIpv4','proxyIpv4','ruleComment'] LOOP
  IF jsonb_typeof(f->k) IS DISTINCT FROM 'string' THEN RETURN FALSE;END IF;
 END LOOP;
 IF jsonb_typeof(f->'proxyPid') IS DISTINCT FROM 'number' OR COALESCE(f->>'proxyPid','')!~'^[0-9]+$' THEN RETURN FALSE;END IF;
 network:=(f->>'subnet')::cidr;database_ip:=(f->>'databaseIpv4')::inet;proxy_ip:=(f->>'proxyIpv4')::inet;
 IF family(network)<>4 OR family(database_ip)<>4 OR family(proxy_ip)<>4 OR masklen(network) NOT BETWEEN 24 AND 30
  OR f->>'subnet' IS DISTINCT FROM network::text OR f->>'databaseIpv4' IS DISTINCT FROM host(database_ip)
  OR f->>'proxyIpv4' IS DISTINCT FROM host(proxy_ip) OR NOT(database_ip<<=network) OR NOT(proxy_ip<<=network) OR database_ip=proxy_ip
  OR (f->>'observedAt')::timestamptz>observed::timestamptz THEN RETURN FALSE;END IF;
 IF fresh AND ((f->>'observedAt')::timestamptz>now() OR (f->>'observedAt')::timestamptz<now()-interval '5 minutes') THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_entry_valid(previous governed_releases,s JSONB,x governed_release_outcomes,fresh BOOLEAN)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
#variable_conflict use_column
DECLARE r JSONB:=s->'compatibleArtifactRecovery';e JSONB:=r->'currentEntry';n JSONB:=r->'nativeClosure';inv JSONB:=e->'projectInventory';
 t JSONB:=s->'manifest'->'deployment'->'targets'->0;pt JSONB:=previous.snapshot->'manifest'->'deployment'->'targets'->0;
 v JSONB;decl JSONB;actual JSONB;history JSONB;db JSONB;old_db JSONB;cadence JSONB;key TEXT;seen TEXT[]:=ARRAY[]::TEXT[];
BEGIN
 IF NOT governed_release_compatible_keys(e-'ingressFence',ARRAY['schemaVersion','observedAt','targetId','configuration','projectInventory','services','historicalServiceReferences','imageAvailability',
  'schemaDigest','dataDigest','sequenceDigest','database','cadences','databaseSettingsDigest','ingressSettingsDigest','ingressBlocked','activeDeploymentCount','publicHealth','evidenceDigest'])
  OR e->>'schemaVersion' IS DISTINCT FROM 'roost-compose-down-entry-v1'
  OR e->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(e-'evidenceDigest')
  OR e->'configuration' IS DISTINCT FROM x.evidence->'composeRecovery'->'configuration'
  OR e->'targetId' IS DISTINCT FROM t->'targetId' OR e->'configuration'->'targetId' IS DISTINCT FROM t->'targetId'
  OR e->'schemaDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'schemaDigest' OR e->'dataDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'dataDigest'
  OR e->'sequenceDigest' IS DISTINCT FROM s->'manifest'->'postObservation'->'baselineSequenceDigest'
  OR e->'databaseSettingsDigest' IS DISTINCT FROM s->'manifest'->'postObservation'->'runtimeResume'->'databaseSettingsDigest'
  OR e->'ingressSettingsDigest' IS DISTINCT FROM s->'manifest'->'postObservation'->'runtimeResume'->'ingressSettingsDigest'
  OR e->'ingressBlocked' IS DISTINCT FROM 'true'::jsonb OR e->'activeDeploymentCount' IS DISTINCT FROM '0'::jsonb
  OR e->'publicHealth'->'healthy' IS DISTINCT FROM 'false'::jsonb
  OR ((e?'ingressFence' OR EXISTS(SELECT 1 FROM jsonb_array_elements(e->'services')v WHERE v->>'role'='app' AND v->>'presence'='absent'))
   AND governed_release_compatible_fence_valid(e->'ingressFence',e->'targetId',e->'database',e->>'observedAt',fresh) IS DISTINCT FROM TRUE)
  OR NOT governed_release_compatible_keys(inv,ARRAY['schemaVersion','targetId','observedAt','projectServiceSetComplete','physicalServices','digest'])
  OR inv->>'schemaVersion' IS DISTINCT FROM 'roost-compose-project-inventory-v1' OR inv->'targetId' IS DISTINCT FROM e->'targetId'
  OR inv->'projectServiceSetComplete' IS DISTINCT FROM 'true'::jsonb OR inv->>'digest' IS DISTINCT FROM governed_release_compose_queue_digest(inv-'digest')
  OR jsonb_array_length(inv->'physicalServices') NOT BETWEEN 1 AND 5 OR jsonb_array_length(e->'services')<>5
  OR jsonb_array_length(e->'historicalServiceReferences')<>5 OR jsonb_array_length(e->'imageAvailability')<>4 OR jsonb_array_length(e->'cadences')<>2
  OR (SELECT count(DISTINCT v->>'name') FROM jsonb_array_elements(e->'historicalServiceReferences')v)<>5
  OR (SELECT count(DISTINCT v->>'name') FROM jsonb_array_elements(e->'imageAvailability')v)<>4
  OR (SELECT count(DISTINCT v->>'name') FROM jsonb_array_elements(e->'cadences')v)<>2
  OR (inv->>'observedAt')::timestamptz>(e->>'observedAt')::timestamptz THEN RETURN FALSE;END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(e->'services') LOOP
  IF v->>'name'=ANY(seen) THEN RETURN FALSE;END IF;seen:=array_append(seen,v->>'name');
  SELECT value INTO decl FROM jsonb_array_elements(e->'configuration'->'services') WHERE value->'name'=v->'name';
  SELECT value INTO actual FROM jsonb_array_elements(inv->'physicalServices') WHERE value->'name'=v->'name';
  SELECT value INTO history FROM jsonb_array_elements(x.evidence->'composeRecovery'->'services') WHERE value->'name'=v->'name';
  IF decl IS NULL OR history IS NULL OR v->>'declarationDigest' IS DISTINCT FROM governed_release_compose_queue_digest(decl)
   OR v->'role' IS DISTINCT FROM decl->'role' OR v->'mountDigest' IS DISTINCT FROM decl->'mountDigest'
   OR v->'inventoryDigest' IS DISTINCT FROM inv->'digest' OR v->'observedAt' IS DISTINCT FROM inv->'observedAt' THEN RETURN FALSE;END IF;
  IF v->>'presence'='absent' THEN
   IF NOT governed_release_compatible_keys(v,ARRAY['presence','name','role','source','declarationDigest','mountDigest','containerId','imageDigest','state','absenceVerified','inventoryDigest','observedAt'])
    OR v->>'source'<>'built' OR v->>'role' NOT IN ('app','migration','cadence') OR v->>'state'<>'absent'
    OR v->'containerId' IS DISTINCT FROM 'null'::jsonb OR v->'imageDigest' IS DISTINCT FROM 'null'::jsonb
    OR v->'absenceVerified' IS DISTINCT FROM 'true'::jsonb OR actual IS NOT NULL THEN RETURN FALSE;END IF;
  ELSIF v->>'presence'='present' THEN
   IF actual IS NULL OR v-ARRAY['presence','declarationDigest','inventoryDigest','observedAt'] IS DISTINCT FROM actual
    OR v->'imageDigest' IS DISTINCT FROM history->'imageDigest'
    OR v->>'role'<>'database' AND (v->>'state' NOT IN ('exited','created','paused') OR v->>'health'='healthy') THEN RETURN FALSE;END IF;
  ELSE RETURN FALSE;END IF;
 END LOOP;
 IF cardinality(seen)<>5 OR EXISTS(SELECT 1 FROM jsonb_array_elements(inv->'physicalServices')v WHERE NOT(v->>'name'=ANY(seen)))
  OR (SELECT count(DISTINCT v->>'containerId') FROM jsonb_array_elements(inv->'physicalServices')v)<>jsonb_array_length(inv->'physicalServices') THEN RETURN FALSE;END IF;
 SELECT value INTO db FROM jsonb_array_elements(e->'services') WHERE value->>'role'='database';
 SELECT value INTO old_db FROM jsonb_array_elements(x.evidence->'composeRecovery'->'services') WHERE value->>'role'='database';
 IF db->>'presence' IS DISTINCT FROM 'present' OR db->>'state' IS DISTINCT FROM 'running' OR db->>'health' IS DISTINCT FROM 'healthy' OR db->>'exitCode' IS DISTINCT FROM '0'
  OR e->'database'->'running' IS DISTINCT FROM 'true'::jsonb OR e->'database'->'healthy' IS DISTINCT FROM 'true'::jsonb
  OR e->'database'->'readOnlyFence' IS DISTINCT FROM 'true'::jsonb OR e->'database'->'activeOtherSessions' IS DISTINCT FROM '0'::jsonb
  OR e->'database'->'ownedTransactions' IS DISTINCT FROM '0'::jsonb THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['containerId','imageDigest','mountDigest'] LOOP
  IF db->key IS DISTINCT FROM old_db->key OR db->key IS DISTINCT FROM e->'database'->key THEN RETURN FALSE;END IF;
 END LOOP;
 FOR v IN SELECT value FROM jsonb_array_elements(e->'historicalServiceReferences') LOOP
  SELECT value INTO history FROM jsonb_array_elements(x.evidence->'composeRecovery'->'services') WHERE value->'name'=v->'name';
  IF history IS NULL OR v->'containerId' IS DISTINCT FROM history->'containerId' OR v->'imageDigest' IS DISTINCT FROM history->'imageDigest'
   OR v->'failedEvidenceDigest' IS DISTINCT FROM r->'prior'->'failedEvidenceDigest' THEN RETURN FALSE;END IF;
 END LOOP;
 FOR v IN SELECT value FROM jsonb_array_elements(e->'imageAvailability') LOOP
  SELECT value INTO history FROM jsonb_array_elements(pt->'baseline'->'images') WHERE value->'name'=v->'name';
  IF history IS NULL OR v->'imageDigest' IS DISTINCT FROM history->'imageDigest' OR jsonb_typeof(v->'present') IS DISTINCT FROM 'boolean'
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(e->'imageAvailability') q WHERE q->'imageDigest'=v->'imageDigest' AND q->'present' IS DISTINCT FROM v->'present') THEN RETURN FALSE;END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(e->'imageAvailability')v WHERE v->'present'='false'::jsonb) THEN RETURN FALSE;END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(e->'cadences') LOOP
  SELECT value INTO cadence FROM jsonb_array_elements(s->'manifest'->'postObservation'->'runtimeResume'->'cadences')WHERE value->'name'=v->'name';
  SELECT value INTO actual FROM jsonb_array_elements(e->'services') WHERE value->'name'=v->'name';
  IF cadence IS NULL OR actual->>'role' IS DISTINCT FROM 'cadence' OR v->'behaviorDigest' IS DISTINCT FROM cadence->'behaviorDigest'
   OR v->'held' IS DISTINCT FROM 'true'::jsonb OR v->'presence' IS DISTINCT FROM actual->'presence' OR v->'state' IS DISTINCT FROM actual->'state'
   OR v->'containerId' IS DISTINCT FROM actual->'containerId' OR v->'imageDigest' IS DISTINCT FROM actual->'imageDigest'
   OR v->>'presence'='absent' AND (v->'absenceVerified' IS DISTINCT FROM 'true'::jsonb OR v->'inventoryDigest' IS DISTINCT FROM inv->'digest' OR v->'observedAt' IS DISTINCT FROM inv->'observedAt') THEN RETURN FALSE;END IF;
 END LOOP;
 IF n->>'schemaVersion' IS DISTINCT FROM 'roost-release-owner-native-closure-v1' OR n->'releaseId' IS DISTINCT FROM r->'prior'->'releaseId'
  OR n->'operationId' IS DISTINCT FROM r->'prior'->'failedOperationId' OR n->'agentHostId' IS DISTINCT FROM s->'hostId'
  OR n->'evidenceDigest' IS DISTINCT FROM e->'evidenceDigest' OR n->'allChildrenClosed' IS DISTINCT FROM 'true'::jsonb
  OR n->'nativeProcessesAbsent' IS DISTINCT FROM 'true'::jsonb OR n->'writerAbsent' IS DISTINCT FROM 'true'::jsonb
  OR COALESCE(n->>'checkpointDigest','')!~'^[a-f0-9]{64}$'
  OR COALESCE(n->>'controllerPid','0')::bigint<=0 OR COALESCE(n->>'registeredChildCount','0')::bigint<=0
  OR (n->>'observedAt')::timestamptz<(e->>'observedAt')::timestamptz THEN RETURN FALSE;END IF;
 IF fresh AND EXISTS(SELECT 1 FROM unnest(ARRAY[e->>'observedAt',inv->>'observedAt',n->>'observedAt'])a
  WHERE a::timestamptz>now() OR a::timestamptz<now()-interval '5 minutes') THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_proof_valid(s JSONB,workspace UUID,issuer UUID,closed_at TIMESTAMP)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
#variable_conflict use_column
DECLARE p JSONB:=s->'compatibleRecoveryProof';r JSONB:=s->'compatibleArtifactRecovery';meta JSONB;b JSONB;compat JSONB;
 a application_evidence;source_review task_review_decisions;scope_review task_review_decisions;source_e agent_executions;scope_e agent_executions;
 expected JSONB;record_body JSONB;payload JSONB;v JSONB;names TEXT[];
BEGIN
 IF NOT governed_release_compatible_keys(p,ARRAY['schemaVersion','classification','workspaceId','applicationId','issuerUserId','evidenceId','recordDigest','metadataDigest',
  'requestDigest','manifestDigest','scopeDigest','publicPayloadDigest','buildReceiptDigest','compatibilityReceiptDigest','privateSignedRecordDigest','jobReceiptDigest','toolchainDigest','sourceCASDigest',
  'nativeAttemptId','nativeAttemptIsAgentExecution','sourceExecutionId','sourceBasisDigest','scopeBasisDigest','serverOperatingSystemAttestation','serverPrivateSignatureVerification','releaseAuthority'])
  OR p->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-recovery-proof-snapshot-v1' OR p->>'classification' IS DISTINCT FROM 'owner_verified_native_receipt'
  OR p->'serverOperatingSystemAttestation' IS DISTINCT FROM 'false'::jsonb OR p->'serverPrivateSignatureVerification' IS DISTINCT FROM 'false'::jsonb
  OR p->'releaseAuthority' IS DISTINCT FROM 'false'::jsonb OR p->'nativeAttemptIsAgentExecution' IS DISTINCT FROM 'false'::jsonb
  OR NOT EXISTS(SELECT 1 FROM workspaces WHERE id=workspace AND owner_user_id=issuer)
  OR NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id=workspace AND user_id=issuer AND role='owner') THEN RETURN FALSE;END IF;
 IF (SELECT count(*) FROM application_evidence e WHERE e.workspace_id=workspace AND e.application_id=(s->>'applicationId')::uuid
  AND e.type='test' AND e.source='human' AND e.verification_status='verified'
  AND starts_with(e.reference,'roost-compatible-native-build:'||(s->>'commit')||':')
  AND e.metadata->'build'->>'evidenceDigest'=r->'replacement'->>'buildReceiptDigest')<>1 THEN RETURN FALSE;END IF;
 SELECT * INTO a FROM application_evidence WHERE id=(p->>'evidenceId')::uuid AND workspace_id=workspace AND application_id=(s->>'applicationId')::uuid;
 meta:=a.metadata;b:=meta->'build';compat:=meta->'compatibility';
 IF a.id IS NULL OR a.type<>'test' OR a.source<>'human' OR a.verification_status<>'verified' OR a.verified_by_type IS DISTINCT FROM 'user'
  OR a.verified_by_id IS DISTINCT FROM issuer::text OR a.verified_at IS NULL
  OR NOT governed_release_compatible_keys(meta,ARRAY['schemaVersion','classification','nativeAttemptId','nativeAttemptKind','nativeAttemptIsAgentExecution','sourceExecutionId',
   'privateSignedRecordDigest','jobReceiptDigest','toolchainDigest','sourceCASDigest','publicPayloadDigest','build','compatibility'])
  OR meta->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-recovery-native-provenance-v1' OR meta->>'classification' IS DISTINCT FROM 'owner_verified_native_receipt'
  OR meta->>'nativeAttemptKind' IS DISTINCT FROM 'root_owned_windows_job_run' OR meta->'nativeAttemptIsAgentExecution' IS DISTINCT FROM 'false'::jsonb
  OR COALESCE(meta->>'nativeAttemptId','')!~'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
  OR COALESCE(meta->>'sourceExecutionId','')!~'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
  OR EXISTS(SELECT 1 FROM unnest(ARRAY['privateSignedRecordDigest','jobReceiptDigest','toolchainDigest','sourceCASDigest','publicPayloadDigest'])k WHERE COALESCE(meta->>k,'')!~'^[a-f0-9]{64}$')
  OR EXISTS(SELECT 1 FROM agent_executions WHERE id=(meta->>'nativeAttemptId')::uuid AND workspace_id=workspace)
  OR meta->'nativeAttemptId' IS DISTINCT FROM b->'executionId' OR meta->'nativeAttemptId' IS DISTINCT FROM compat->'buildExecutionId'
  OR meta->'nativeAttemptId'=meta->'sourceExecutionId' OR meta->'nativeAttemptId'=r->'scopeAudit'->'executionId'
  OR meta->'sourceExecutionId' IS DISTINCT FROM b->'sourceExecutionId' OR meta->'sourceExecutionId' IS DISTINCT FROM compat->'sourceExecutionId'
  OR meta->'jobReceiptDigest' IS DISTINCT FROM b->'nativeReceiptDigest' OR meta->'jobReceiptDigest' IS DISTINCT FROM compat->'nativeReceiptDigest'
  OR a.reference IS DISTINCT FROM 'roost-compatible-native-build:'||(s->>'commit')||':'||(meta->>'privateSignedRecordDigest') THEN RETURN FALSE;END IF;
 payload:=jsonb_build_object('schemaVersion','roost-compatible-recovery-public-payload-v1','build',b,'compatibility',compat);
 IF meta->>'publicPayloadDigest' IS DISTINCT FROM governed_release_compose_queue_digest(payload)
  OR b->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(b-'evidenceDigest')
  OR compat->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(compat-'evidenceDigest')
  OR r->'replacement'->'buildReceiptDigest' IS DISTINCT FROM b->'evidenceDigest'
  OR r->'replacement'->>'compatibilityReceiptDigest' IS DISTINCT FROM governed_release_compose_queue_digest(compat)
  OR b->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-artifact-build-proof-v1' OR compat->>'schemaVersion' IS DISTINCT FROM 'roost-compose-replacement-compatibility-v1'
  OR b->'signedNativeVerified' IS DISTINCT FROM 'true'::jsonb OR b->'ownedJobClosed' IS DISTINCT FROM 'true'::jsonb OR b->'sourceUnchanged' IS DISTINCT FROM 'true'::jsonb
  OR compat->'linuxImageVerified' IS DISTINCT FROM 'true'::jsonb OR compat->'asyncBridgeVerified' IS DISTINCT FROM 'true'::jsonb OR compat->'migrationImportVerified' IS DISTINCT FROM 'true'::jsonb
  OR compat->'restoredSchemaCompatible' IS DISTINCT FROM 'true'::jsonb OR compat->'nonOwnedDataUnchanged' IS DISTINCT FROM 'true'::jsonb
  OR compat->'sequencesUnchanged' IS DISTINCT FROM 'true'::jsonb OR compat->'ownedJobClosed' IS DISTINCT FROM 'true'::jsonb
  OR compat->'providerRequests' IS DISTINCT FROM '0'::jsonb OR compat->'externalActions' IS DISTINCT FROM '0'::jsonb
  OR jsonb_typeof(r->'replacement'->'images') IS DISTINCT FROM 'array' OR jsonb_array_length(r->'replacement'->'images')<>4
  OR (SELECT count(DISTINCT v->>'name') FROM jsonb_array_elements(r->'replacement'->'images')v)<>4 THEN RETURN FALSE;END IF;
 IF NOT governed_release_compatible_keys(b,ARRAY['schemaVersion','observedAt','executionId','sourceExecutionId','commit','tree','images','artifactSetDigest','configurationDigest',
   'nativeReceiptDigest','signedNativeVerified','ownedJobClosed','sourceUnchanged','evidenceDigest'])
  OR NOT governed_release_compatible_keys(compat,ARRAY['schemaVersion','observedAt','commit','tree','artifactSetDigest','configurationDigest','images','schemaDigest','dataDigest','sequenceDigest','backupDigest',
   'linuxImageVerified','asyncBridgeVerified','migrationImportVerified','restoredSchemaCompatible','nonOwnedDataUnchanged','sequencesUnchanged','providerRequests','externalActions',
   'ownedJobClosed','sourceExecutionId','buildExecutionId','nativeReceiptDigest','evidenceDigest']) THEN RETURN FALSE;END IF;
 SELECT * INTO source_review FROM task_review_decisions WHERE id=(s->>'reviewId')::uuid AND workspace_id=workspace AND task_id=(s->>'taskId')::uuid;
 SELECT * INTO source_e FROM agent_executions WHERE id=source_review.execution_id;
 SELECT * INTO scope_review FROM task_review_decisions WHERE id=(r->'scopeAudit'->>'reviewId')::uuid AND workspace_id=workspace AND task_id=(r->'scopeAudit'->>'taskId')::uuid;
 SELECT * INTO scope_e FROM agent_executions WHERE id=scope_review.execution_id;
 IF source_review.id IS NULL OR scope_review.id IS NULL OR source_e.id IS NULL OR scope_e.id IS NULL
  OR source_review.decision<>'approve' OR scope_review.decision<>'approve' OR source_review.id=scope_review.id OR source_e.id=scope_e.id
  OR source_e.id::text IS DISTINCT FROM meta->>'sourceExecutionId' OR scope_e.id::text IS DISTINCT FROM s->>'releaseExecutionId'
  OR scope_e.id::text IS DISTINCT FROM r->'scopeAudit'->>'executionId'
  OR source_e.workspace_id IS DISTINCT FROM workspace OR scope_e.workspace_id IS DISTINCT FROM workspace
  OR source_e.application_id::text IS DISTINCT FROM s->>'applicationId' OR scope_e.application_id::text IS DISTINCT FROM s->>'applicationId'
  OR source_e.agent_host_id::text IS DISTINCT FROM s->>'hostId' OR scope_e.agent_host_id::text IS DISTINCT FROM s->>'hostId'
  OR source_review.material_version IS DISTINCT FROM s->>'materialVersion' OR scope_review.material_version IS DISTINCT FROM r->'scopeAudit'->>'materialVersion'
  OR source_review.material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material(source_e)::text,'UTF8')),'hex')
  OR scope_review.material_version IS DISTINCT FROM encode(sha256(convert_to(task_review_material(scope_e)::text,'UTF8')),'hex')
  OR governed_release_compatible_execution_current(source_e) IS DISTINCT FROM TRUE OR governed_release_compatible_execution_current(scope_e) IS DISTINCT FROM TRUE
  OR completed_result_readonly_native_valid(scope_e) IS DISTINCT FROM TRUE
  OR source_review.evidence->>'reviewedCommit' IS DISTINCT FROM s->>'commit' OR scope_review.evidence->>'reviewedCommit' IS DISTINCT FROM s->>'commit'
  OR scope_e.metadata->'executionContract'->'assignment'->>'agentId' IS DISTINCT FROM s->>'releaserAgentId'
  OR source_review.verifier_id::text=scope_e.metadata->'executionContract'->'assignment'->>'agentId'
  OR scope_review.verifier_id::text IN (s->>'releaserAgentId',source_e.metadata->'executionContract'->'assignment'->>'agentId') THEN RETURN FALSE;END IF;
 IF source_e.verification->'codingTests'->'passed' IS DISTINCT FROM 'true'::jsonb
  OR source_e.verification->'codingTests'->>'schemaVersion' IS DISTINCT FROM 'roost-coding-tests-v1'
  OR source_e.verification->'localCommit'->>'schemaVersion' IS DISTINCT FROM 'roost-local-commit-v1'
  OR source_e.verification->'localCommit'->>'executionId' IS DISTINCT FROM source_e.id::text
  OR source_e.verification->'localCommit'->'remotePush' IS DISTINCT FROM 'false'::jsonb OR source_e.verification->'localCommit'->'deployment' IS DISTINCT FROM 'false'::jsonb
  OR source_e.verification->'localCommit'->>'commit' IS DISTINCT FROM s->>'commit' OR source_e.verification->'localCommit'->>'tree' IS DISTINCT FROM s->>'candidateTree'
  OR source_e.verification->'localCommit'->'testDigest' IS DISTINCT FROM source_e.verification->'codingTests'->'digest'
  OR source_e.verification->'localCommit'->'baselineCommit' IS DISTINCT FROM r->'publication'->'baseCommit'
  OR source_e.verification->'localCommit'->'branch' IS DISTINCT FROM s->'manifest'->'repository'->'candidateBranch'
  OR source_e.metadata->'executionContract'->'nativeBoundary'->>'profile' IS DISTINCT FROM 'coding-local'
  OR source_e.metadata->'executionContract'->'modelSelection'->>'schemaVersion' IS DISTINCT FROM 'roost-managed-hermes-backend-v1'
  OR source_e.metadata->'executionContract'->'modelSelection'->>'backend' IS DISTINCT FROM 'codex_responses'
  OR source_e.verification->'managedAdmission'->>'qualification' IS DISTINCT FROM 'signed_native_v1'
  OR COALESCE(source_e.verification->'managedAdmission'->>'evidenceDigest','')!~'^[a-f0-9]{64}$'
  OR COALESCE(source_e.verification->'managedAdmission'->>'jobSourceDigest','')!~'^[a-f0-9]{64}$'
  OR source_e.verification->'managedAdmission'->'jobSourceDigest' IS DISTINCT FROM source_e.verification->'ownedTreeReceipt'->'sourceSha256'
  OR source_e.verification->'ownedTreeReceipt'->>'version' IS DISTINCT FROM 'roost-windows-job-v2'
  OR source_e.verification->'ownedTreeReceipt'->>'attempt' IS DISTINCT FROM source_e.id::text
  OR source_e.verification->'ownedTreeReceipt'->'cleanup' IS DISTINCT FROM 'true'::jsonb
  OR source_e.verification->'ownedTreeReceipt'->'assignedBeforeResume' IS DISTINCT FROM 'true'::jsonb
  OR source_e.verification->'ownedTreeReceipt'->'resumed' IS DISTINCT FROM 'true'::jsonb
  OR source_e.verification->'ownedTreeReceipt'->'killOnClose' IS DISTINCT FROM 'true'::jsonb
  OR source_e.verification->'ownedTreeReceipt'->'breakaway' IS DISTINCT FROM 'false'::jsonb
  OR source_e.verification->'ownedTreeReceipt'->>'rootExit' IS DISTINCT FROM '0' OR source_e.verification->'ownedTreeReceipt'->'jobClosed' IS DISTINCT FROM 'true'::jsonb
  OR source_e.verification->'ownedTreeReceipt'->>'activeProcesses' IS DISTINCT FROM '0' THEN RETURN FALSE;END IF;
 IF (b->>'observedAt')::timestamptz<source_e.completed_at::timestamptz OR (b->>'observedAt')::timestamptz<closed_at::timestamptz
  OR (compat->>'observedAt')::timestamptz<(b->>'observedAt')::timestamptz OR a.observed_at::timestamptz IS DISTINCT FROM (compat->>'observedAt')::timestamptz
  OR a.created_at<a.observed_at OR a.verified_at<a.created_at OR a.updated_at<a.verified_at OR scope_e.completed_at<a.verified_at OR scope_review.created_at<scope_e.completed_at
  OR source_review.created_at<source_e.completed_at OR (b->>'observedAt')::timestamptz>now() OR (compat->>'observedAt')::timestamptz>now()
  OR (b->>'observedAt')::timestamptz<now()-interval '24 hours' OR (compat->>'observedAt')::timestamptz<now()-interval '24 hours'
  OR (compat->>'observedAt')::timestamptz<(s->'manifest'->'backup'->>'restoreVerifiedAt')::timestamptz THEN RETURN FALSE;END IF;
 FOREACH names SLICE 1 IN ARRAY ARRAY[ARRAY['commit'],ARRAY['tree'],ARRAY['artifactSetDigest'],ARRAY['configurationDigest'],ARRAY['images'],ARRAY['schemaDigest']] LOOP
  IF compat->names[1] IS DISTINCT FROM r->'replacement'->names[1] THEN RETURN FALSE;END IF;
 END LOOP;
 IF b->'commit' IS DISTINCT FROM s->'commit' OR b->'tree' IS DISTINCT FROM s->'candidateTree' OR b->'images' IS DISTINCT FROM r->'replacement'->'images'
  OR b->'artifactSetDigest' IS DISTINCT FROM r->'replacement'->'artifactSetDigest' OR b->'configurationDigest' IS DISTINCT FROM r->'replacement'->'configurationDigest'
  OR compat->'backupDigest' IS DISTINCT FROM s->'manifest'->'backup'->'digest' OR compat->'dataDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'dataDigest'
  OR compat->'sequenceDigest' IS DISTINCT FROM s->'manifest'->'postObservation'->'baselineSequenceDigest' THEN RETURN FALSE;END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(r->'replacement'->'images') LOOP
  IF v->'commit' IS DISTINCT FROM s->'commit' OR v->'tree' IS DISTINCT FROM s->'candidateTree'
   OR COALESCE(v->>'imageDigest','')!~'^sha256:[a-f0-9]{64}$'
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'manifest'->'deployment'->'targets'->0->'configuration'->'services')d WHERE d->'name'=v->'name' AND d->>'source'='built')
   OR NOT(s->'manifest'->'cleanup'->'protectedResourceIds' @> jsonb_build_array(v->'imageDigest')) THEN RETURN FALSE;END IF;
 END LOOP;
 FOR v IN SELECT to_jsonb(value) FROM unnest(ARRAY['roost-release-compatible-artifact-scope:'||(r->'scopeAudit'->>'scopeDigest'),
  'roost-compatible-artifact-build:'||(b->>'evidenceDigest'),'roost-compatible-artifact-restore:'||governed_release_compose_queue_digest(compat)])value LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(scope_review.evidence->'evidence') item WHERE item->>'kind'='artifact' AND item->>'verdict'='pass' AND item->'reference'=v) THEN RETURN FALSE;END IF;
 END LOOP;
 record_body:=jsonb_build_object('id',a.id,'workspaceId',a.workspace_id,'applicationId',a.application_id,'type',a.type,'source',a.source,'reference',a.reference,
  'observedAt',governed_release_compatible_iso(a.observed_at),'createdAt',governed_release_compatible_iso(a.created_at),'updatedAt',governed_release_compatible_iso(a.updated_at),
  'verifiedAt',governed_release_compatible_iso(a.verified_at),'verifiedByType',a.verified_by_type,'verifiedById',a.verified_by_id,'verificationStatus',a.verification_status,
  'metadataDigest',governed_release_compose_queue_digest(meta));
 expected:=jsonb_build_object('schemaVersion','roost-compatible-recovery-proof-snapshot-v1','classification','owner_verified_native_receipt',
  'workspaceId',workspace,'applicationId',s->'applicationId','issuerUserId',issuer,'evidenceId',a.id,'recordDigest',governed_release_compose_queue_digest(record_body),
  'metadataDigest',governed_release_compose_queue_digest(meta),'requestDigest',governed_release_compose_queue_digest(s-ARRAY['readinessDigest','configurationDigest','releaseId','compatibleRecoveryProof']),
  'manifestDigest',s->'manifestDigest','scopeDigest',r->'scopeAudit'->'scopeDigest','publicPayloadDigest',meta->'publicPayloadDigest',
  'buildReceiptDigest',b->'evidenceDigest','compatibilityReceiptDigest',governed_release_compose_queue_digest(compat),'privateSignedRecordDigest',meta->'privateSignedRecordDigest',
  'jobReceiptDigest',meta->'jobReceiptDigest','toolchainDigest',meta->'toolchainDigest','sourceCASDigest',meta->'sourceCASDigest','nativeAttemptId',meta->'nativeAttemptId',
  'nativeAttemptIsAgentExecution',FALSE,'sourceExecutionId',meta->'sourceExecutionId','sourceBasisDigest',governed_release_compatible_basis_digest(source_e,source_review),
  'scopeBasisDigest',governed_release_compatible_basis_digest(scope_e,scope_review),'serverOperatingSystemAttestation',FALSE,'serverPrivateSignatureVerification',FALSE,'releaseAuthority',FALSE);
 RETURN expected=p;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_basis_valid(s JSONB,workspace UUID,issuer UUID,fresh BOOLEAN DEFAULT FALSE)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE r JSONB:=s->'compatibleArtifactRecovery';prior JSONB:=r->'prior';old governed_releases;c governed_release_failed_closures;
 op governed_release_operations;x governed_release_outcomes;
BEGIN
 IF NOT governed_release_compatible_keys(r,ARRAY['schemaVersion','prior','currentEntry','nativeClosure','replacement','publication','scopeAudit','failurePolicy'])
  OR r->>'schemaVersion' IS DISTINCT FROM 'roost-compose-compatible-artifact-recovery-v1'
  OR s?|ARRAY['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','gitPublicationBase','publishedGitBasis','successorBasis']
  OR r->'failurePolicy' IS DISTINCT FROM '{"mode":"freeze_protected_database","automaticHistoricalRollback":false,"dataRestoreAllowed":false,"volumeDeletionAllowed":false,"keepIngressBlocked":true,"keepCadencesHeld":true}'::jsonb
  OR r->'publication'->>'mode' IS DISTINCT FROM 'new_exact_commit' OR r->'replacement'->'schemaChangeAllowed' IS DISTINCT FROM 'false'::jsonb
  OR r->'scopeAudit'->>'scopeDigest' IS DISTINCT FROM governed_release_compatible_scope_digest(s) THEN RETURN FALSE;END IF;
 SELECT * INTO old FROM governed_releases WHERE id=(prior->>'releaseId')::uuid AND workspace_id=workspace;
 SELECT * INTO c FROM governed_release_failed_closures WHERE id=(prior->>'closureId')::uuid AND release_id=old.id;
 SELECT * INTO op FROM governed_release_operations WHERE id=(prior->>'failedOperationId')::uuid AND release_id=old.id;
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;
 IF old.id IS NULL OR c.id IS NULL OR op.id IS NULL OR x.id IS NULL OR old.issuer_user_id IS DISTINCT FROM issuer
  OR prior->>'expectedVersion' IS DISTINCT FROM governed_release_successor_version(old.id)
  OR c.closure_digest IS DISTINCT FROM prior->>'closureDigest' OR c.closure_digest IS DISTINCT FROM governed_release_compose_queue_digest(c.snapshot)
  OR c.failed_operation_id IS DISTINCT FROM op.id OR c.failed_outcome_id IS DISTINCT FROM x.id OR x.id::text IS DISTINCT FROM prior->>'failedOutcomeId'
  OR c.snapshot->>'failedEvidenceDigest' IS DISTINCT FROM prior->>'failedEvidenceDigest' OR governed_release_compose_queue_digest(x.evidence) IS DISTINCT FROM prior->>'failedEvidenceDigest'
  OR c.snapshot->'evidence' IS DISTINCT FROM x.evidence OR c.consent_digest IS DISTINCT FROM c.snapshot->>'consentDigest'
  OR NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=c.revocation_id AND release_id=old.id)
  OR governed_release_compose_failed_rollback_partial_closure_valid(old,c.snapshot,FALSE) IS DISTINCT FROM TRUE
  OR op.id IS DISTINCT FROM (SELECT id FROM governed_release_operations WHERE release_id=old.id ORDER BY created_at DESC,id DESC LIMIT 1)
  OR NOT(x.status='failed' OR x.status='reconciled' AND x.reconciled_status='failed')
  OR prior->>'previousManifestDigest' IS DISTINCT FROM old.manifest_digest OR old.manifest_digest IS DISTINCT FROM governed_release_compose_queue_digest(old.snapshot->'manifest')
  OR s->'applicationId' IS DISTINCT FROM old.snapshot->'applicationId' OR s->'hostId' IS DISTINCT FROM old.snapshot->'hostId'
  OR s->'releaserAgentId' IS DISTINCT FROM old.snapshot->'releaserAgentId' OR s->'baseCommit' IS DISTINCT FROM old.snapshot->'baseCommit' OR s->'baseTree' IS DISTINCT FROM old.snapshot->'baseTree'
  OR s->'commit'=old.snapshot->'commit' OR s->'taskId'=old.snapshot->'taskId' OR s->'releaseExecutionId'=old.snapshot->'releaseExecutionId'
  OR r->'publication'->'baseCommit' IS DISTINCT FROM old.snapshot->'commit' OR r->'publication'->'baseTree' IS DISTINCT FROM old.snapshot->'candidateTree'
  OR s->'manifest'->'repository'->'candidateBranch'=old.snapshot->'manifest'->'repository'->'candidateBranch'
  OR governed_release_compatible_manifest_valid(old.snapshot,s) IS DISTINCT FROM TRUE
  OR governed_release_compatible_entry_valid(old,s,x,fresh) IS DISTINCT FROM TRUE
  OR governed_release_compatible_proof_valid(s,workspace,issuer,c.created_at) IS DISTINCT FROM TRUE
  OR (s->'manifest'->'backup'->>'restoreVerifiedAt')::timestamptz>now()
  OR (s->'manifest'->'backup'->>'restoreVerifiedAt')::timestamptz<now()-interval '24 hours' THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_insert_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.snapshot?'compatibleArtifactRecovery' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.application_id::text,0));
  IF governed_release_compatible_basis_valid(NEW.snapshot,NEW.workspace_id,NEW.issuer_user_id,TRUE) IS DISTINCT FROM TRUE
   OR EXISTS(SELECT 1 FROM governed_releases WHERE workspace_id=NEW.workspace_id AND snapshot->'compatibleArtifactRecovery'->'prior'->'closureId'=NEW.snapshot->'compatibleArtifactRecovery'->'prior'->'closureId') THEN
   RAISE EXCEPTION 'governed_release_compatible_recovery_unproven';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compatible_insert_guard BEFORE INSERT ON governed_releases FOR EACH ROW EXECUTE FUNCTION governed_release_compatible_insert_guard();

CREATE FUNCTION governed_release_compatible_operation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;ops TEXT[]:=ARRAY['push','pr','review','merge','deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'];
 count_ops INTEGER;observed JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 IF r.snapshot?'compatibleArtifactRecovery' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
  SELECT count(*) INTO count_ops FROM governed_release_operations WHERE release_id=r.id;
  IF governed_release_compatible_basis_valid(r.snapshot,r.workspace_id,r.issuer_user_id,FALSE) IS DISTINCT FROM TRUE
   OR count_ops>=cardinality(ops) OR NEW.operation IS DISTINCT FROM ops[count_ops+1]
   OR NEW.intent->>'operation' IS DISTINCT FROM NEW.operation OR NEW.intent->>'commit' IS DISTINCT FROM r.snapshot->>'commit'
   OR NEW.intent->>'baseCommit' IS DISTINCT FROM r.snapshot->>'baseCommit' OR NEW.intent->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
   OR EXISTS(SELECT 1 FROM governed_release_operations o LEFT JOIN LATERAL(SELECT * FROM governed_release_outcomes WHERE operation_id=o.id ORDER BY sequence DESC LIMIT 1)x ON TRUE
    WHERE o.release_id=r.id AND COALESCE(CASE WHEN x.status='reconciled' THEN x.reconciled_status ELSE x.status END,'unresolved')<>'succeeded') THEN
   RAISE EXCEPTION 'governed_release_compatible_progression_frozen';END IF;
  observed:=NEW.intent->'observed';
  IF observed->'commit' IS DISTINCT FROM r.snapshot->'commit' OR observed->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
   OR observed->'baseCommit' IS DISTINCT FROM (CASE WHEN count_ops<4 THEN r.snapshot->'compatibleArtifactRecovery'->'publication'->'baseCommit' ELSE r.snapshot->'commit' END)
   OR observed->'baseTree' IS DISTINCT FROM (CASE WHEN count_ops<4 THEN r.snapshot->'compatibleArtifactRecovery'->'publication'->'baseTree' ELSE r.snapshot->'candidateTree' END)
   OR NEW.operation='observe' AND NEW.intent->'parameters'->>'mode' IS DISTINCT FROM 'candidate' THEN RAISE EXCEPTION 'governed_release_compatible_git_or_phase_changed';END IF;
  IF NEW.operation IN ('smoke','fixture_cleanup','runtime_resume') AND NEW.intent->'parameters'->>'postObservationDigest'
   IS DISTINCT FROM governed_release_compose_queue_digest(r.snapshot->'manifest'->'postObservation') THEN
   RAISE EXCEPTION 'governed_release_compatible_fixture_scope_changed';END IF;
  IF NEW.operation IN ('deploy_config','deploy') AND (NEW.intent->'parameters'->'commit' IS DISTINCT FROM r.snapshot->'commit'
   OR NEW.intent->'parameters'->'artifactSetDigest' IS DISTINCT FROM r.snapshot->'compatibleArtifactRecovery'->'replacement'->'artifactSetDigest'
   OR NEW.intent->'parameters'->'configDigest' IS DISTINCT FROM r.snapshot->'compatibleArtifactRecovery'->'replacement'->'configurationDigest'
   OR NEW.intent->'parameters'->'schemaDigest' IS DISTINCT FROM r.snapshot->'compatibleArtifactRecovery'->'replacement'->'schemaDigest'
   OR NEW.operation='deploy' AND NEW.intent->'parameters'->'targetId' IS DISTINCT FROM r.snapshot->'manifest'->'deployment'->'targetId') THEN
   RAISE EXCEPTION 'governed_release_compatible_artifact_changed';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compatible_operation_guard BEFORE INSERT ON governed_release_operations FOR EACH ROW EXECUTE FUNCTION governed_release_compatible_operation_guard();

-- Negative observations bind the immutable admitted receipt, not a newly
-- invalidated review/credential or a fresh positive release authorization.
CREATE FUNCTION governed_release_compatible_negative_string(v JSONB,pattern TEXT)
 RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_typeof(v) IS NOT DISTINCT FROM 'string' AND COALESCE(v#>>'{}','')~pattern;
$$;
CREATE FUNCTION governed_release_compatible_negative_time(v JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF governed_release_compatible_negative_string(v,'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-5][0-9](\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$') IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 RETURN isfinite((v#>>'{}')::timestamptz);
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_negative_lineage_valid(r governed_releases)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
#variable_conflict use_column
DECLARE s JSONB:=r.snapshot;p JSONB:=s->'compatibleRecoveryProof';c JSONB:=s->'compatibleArtifactRecovery';prior JSONB:=c->'prior';
 old governed_releases;closed governed_release_failed_closures;op governed_release_operations;x governed_release_outcomes;
 a application_evidence;meta JSONB;b JSONB;compat JSONB;record_body JSONB;key TEXT;source_review task_review_decisions;scope_review task_review_decisions;
BEGIN
 IF NOT governed_release_compatible_keys(c,ARRAY['schemaVersion','prior','currentEntry','nativeClosure','replacement','publication','scopeAudit','failurePolicy'])
  OR c->>'schemaVersion' IS DISTINCT FROM 'roost-compose-compatible-artifact-recovery-v1'
  OR c->'replacement'->'commit' IS DISTINCT FROM s->'commit' OR c->'replacement'->'tree' IS DISTINCT FROM s->'candidateTree'
  OR NOT governed_release_compatible_keys(p,ARRAY['schemaVersion','classification','workspaceId','applicationId','issuerUserId','evidenceId','recordDigest','metadataDigest',
  'requestDigest','manifestDigest','scopeDigest','publicPayloadDigest','buildReceiptDigest','compatibilityReceiptDigest','privateSignedRecordDigest','jobReceiptDigest','toolchainDigest','sourceCASDigest',
  'nativeAttemptId','nativeAttemptIsAgentExecution','sourceExecutionId','sourceBasisDigest','scopeBasisDigest','serverOperatingSystemAttestation','serverPrivateSignatureVerification','releaseAuthority'])
  OR p->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-recovery-proof-snapshot-v1' OR p->>'classification' IS DISTINCT FROM 'owner_verified_native_receipt'
  OR p->'workspaceId' IS DISTINCT FROM to_jsonb(r.workspace_id::text) OR p->'applicationId' IS DISTINCT FROM to_jsonb(r.application_id::text)
  OR p->'issuerUserId' IS DISTINCT FROM to_jsonb(r.issuer_user_id::text)
  OR s->'applicationId' IS DISTINCT FROM to_jsonb(r.application_id::text) OR s->'hostId' IS DISTINCT FROM to_jsonb(r.host_id::text)
  OR s->'taskId' IS DISTINCT FROM to_jsonb(r.task_id::text) OR s->'releaseExecutionId' IS DISTINCT FROM to_jsonb(r.release_execution_id::text)
  OR s->'releaserAgentId' IS DISTINCT FROM to_jsonb(r.releaser_agent_id::text)
  OR p->'serverOperatingSystemAttestation' IS DISTINCT FROM 'false'::jsonb OR p->'serverPrivateSignatureVerification' IS DISTINCT FROM 'false'::jsonb
  OR p->'nativeAttemptIsAgentExecution' IS DISTINCT FROM 'false'::jsonb OR p->'releaseAuthority' IS DISTINCT FROM 'false'::jsonb
  OR s->>'manifestDigest' IS DISTINCT FROM r.manifest_digest OR r.manifest_digest IS DISTINCT FROM governed_release_compose_queue_digest(s->'manifest')
  OR p->>'requestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(s-ARRAY['readinessDigest','configurationDigest','releaseId','compatibleRecoveryProof'])
  OR p->'manifestDigest' IS DISTINCT FROM s->'manifestDigest' OR p->'scopeDigest' IS DISTINCT FROM c->'scopeAudit'->'scopeDigest'
  OR c->'scopeAudit'->>'scopeDigest' IS DISTINCT FROM governed_release_compatible_scope_digest(s)
  OR c->'failurePolicy' IS DISTINCT FROM '{"mode":"freeze_protected_database","automaticHistoricalRollback":false,"dataRestoreAllowed":false,"volumeDeletionAllowed":false,"keepIngressBlocked":true,"keepCadencesHeld":true}'::jsonb
  OR s?|ARRAY['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','gitPublicationBase','publishedGitBasis','successorBasis'] THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['recordDigest','metadataDigest','requestDigest','manifestDigest','scopeDigest','publicPayloadDigest','buildReceiptDigest','compatibilityReceiptDigest',
  'privateSignedRecordDigest','jobReceiptDigest','toolchainDigest','sourceCASDigest','sourceBasisDigest','scopeBasisDigest'] LOOP
  IF governed_release_compatible_negative_string(p->key,'^[a-f0-9]{64}$') IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 END LOOP;
 SELECT * INTO old FROM governed_releases WHERE id=(prior->>'releaseId')::uuid AND workspace_id=r.workspace_id;
 SELECT * INTO closed FROM governed_release_failed_closures WHERE id=(prior->>'closureId')::uuid AND release_id=old.id;
 SELECT * INTO op FROM governed_release_operations WHERE id=(prior->>'failedOperationId')::uuid AND release_id=old.id;
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;
 IF old.id IS NULL OR closed.id IS NULL OR op.id IS NULL OR x.id IS NULL OR old.issuer_user_id IS DISTINCT FROM r.issuer_user_id
  OR closed.closure_digest IS DISTINCT FROM prior->>'closureDigest' OR closed.closure_digest IS DISTINCT FROM governed_release_compose_queue_digest(closed.snapshot)
  OR closed.failed_operation_id IS DISTINCT FROM op.id OR closed.failed_outcome_id IS DISTINCT FROM x.id OR x.id::text IS DISTINCT FROM prior->>'failedOutcomeId'
  OR closed.snapshot->'evidence' IS DISTINCT FROM x.evidence OR closed.snapshot->>'failedEvidenceDigest' IS DISTINCT FROM prior->>'failedEvidenceDigest'
  OR governed_release_compose_queue_digest(x.evidence) IS DISTINCT FROM prior->>'failedEvidenceDigest'
  OR NOT EXISTS(SELECT 1 FROM governed_release_revocations WHERE id=closed.revocation_id AND release_id=old.id)
  OR governed_release_compose_failed_rollback_partial_closure_valid(old,closed.snapshot,FALSE) IS DISTINCT FROM TRUE
  OR old.manifest_digest IS DISTINCT FROM prior->>'previousManifestDigest'
  OR governed_release_compatible_manifest_valid(old.snapshot,s) IS DISTINCT FROM TRUE
  OR governed_release_compatible_entry_valid(old,s,x,FALSE) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 SELECT * INTO a FROM application_evidence WHERE id=(p->>'evidenceId')::uuid AND workspace_id=r.workspace_id AND application_id=r.application_id;
 meta:=a.metadata;b:=meta->'build';compat:=meta->'compatibility';
 IF a.id IS NULL OR a.type IS DISTINCT FROM 'test' OR a.source IS DISTINCT FROM 'human' OR a.verified_by_type IS DISTINCT FROM 'user'
  OR a.verified_by_id IS DISTINCT FROM r.issuer_user_id::text OR a.verified_at IS NULL
  OR p->>'metadataDigest' IS DISTINCT FROM governed_release_compose_queue_digest(meta)
  OR p->'privateSignedRecordDigest' IS DISTINCT FROM meta->'privateSignedRecordDigest' OR p->'jobReceiptDigest' IS DISTINCT FROM meta->'jobReceiptDigest'
  OR p->'toolchainDigest' IS DISTINCT FROM meta->'toolchainDigest' OR p->'sourceCASDigest' IS DISTINCT FROM meta->'sourceCASDigest'
  OR p->'sourceExecutionId' IS DISTINCT FROM meta->'sourceExecutionId' OR p->'nativeAttemptId' IS DISTINCT FROM meta->'nativeAttemptId'
  OR p->'publicPayloadDigest' IS DISTINCT FROM meta->'publicPayloadDigest'
  OR p->>'publicPayloadDigest' IS DISTINCT FROM governed_release_compose_queue_digest(jsonb_build_object('schemaVersion','roost-compatible-recovery-public-payload-v1','build',b,'compatibility',compat))
  OR p->'buildReceiptDigest' IS DISTINCT FROM c->'replacement'->'buildReceiptDigest' OR p->'buildReceiptDigest' IS DISTINCT FROM b->'evidenceDigest'
  OR b->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(b-'evidenceDigest')
  OR p->'compatibilityReceiptDigest' IS DISTINCT FROM c->'replacement'->'compatibilityReceiptDigest'
  OR p->>'compatibilityReceiptDigest' IS DISTINCT FROM governed_release_compose_queue_digest(compat)
  OR b->'commit' IS DISTINCT FROM s->'commit' OR b->'tree' IS DISTINCT FROM s->'candidateTree' OR b->'images' IS DISTINCT FROM c->'replacement'->'images'
  OR compat->'schemaDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'schemaDigest' OR compat->'dataDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'dataDigest'
  OR compat->'sequenceDigest' IS DISTINCT FROM c->'currentEntry'->'sequenceDigest' THEN RETURN FALSE;END IF;
 record_body:=jsonb_build_object('id',a.id,'workspaceId',a.workspace_id,'applicationId',a.application_id,'type',a.type,'source',a.source,'reference',a.reference,
  'observedAt',governed_release_compatible_iso(a.observed_at),'createdAt',governed_release_compatible_iso(a.created_at),'updatedAt',governed_release_compatible_iso(a.updated_at),
  'verifiedAt',governed_release_compatible_iso(a.verified_at),'verifiedByType',a.verified_by_type,'verifiedById',a.verified_by_id,'verificationStatus',a.verification_status,
  'metadataDigest',governed_release_compose_queue_digest(meta));
 IF p->>'recordDigest' IS DISTINCT FROM governed_release_compose_queue_digest(record_body) THEN RETURN FALSE;END IF;
 SELECT * INTO source_review FROM task_review_decisions WHERE id=(s->>'reviewId')::uuid AND workspace_id=r.workspace_id AND task_id=(s->>'taskId')::uuid;
 SELECT * INTO scope_review FROM task_review_decisions WHERE id=(c->'scopeAudit'->>'reviewId')::uuid AND workspace_id=r.workspace_id AND task_id=(c->'scopeAudit'->>'taskId')::uuid;
 IF source_review.id IS NULL OR scope_review.id IS NULL OR source_review.decision IS DISTINCT FROM 'approve' OR scope_review.decision IS DISTINCT FROM 'approve'
  OR source_review.material_version IS DISTINCT FROM s->>'materialVersion' OR scope_review.material_version IS DISTINCT FROM c->'scopeAudit'->>'materialVersion'
  OR source_review.execution_id::text IS DISTINCT FROM p->>'sourceExecutionId' OR scope_review.execution_id::text IS DISTINCT FROM s->>'releaseExecutionId'
  OR source_review.evidence->'reviewedCommit' IS DISTINCT FROM s->'commit' OR scope_review.evidence->'reviewedCommit' IS DISTINCT FROM s->'commit' THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_negative_queue_valid(q JSONB,target JSONB,from_at TIMESTAMPTZ,through_at TIMESTAMPTZ)
 RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF NOT governed_release_compatible_keys(q,ARRAY['targetId','deploymentId','commit','status','createdAt','finishedAt'])
  OR q->'targetId' IS DISTINCT FROM target OR governed_release_compatible_negative_string(q->'deploymentId','^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$') IS DISTINCT FROM TRUE
  OR governed_release_compatible_negative_string(q->'commit','^[a-f0-9]{40}$') IS DISTINCT FROM TRUE
  OR q->>'status' IS NULL OR q->>'status' NOT IN ('queued','in_progress','finished','failed','cancelled-by-user')
  OR governed_release_compatible_negative_time(q->'createdAt') IS DISTINCT FROM TRUE OR (q->>'createdAt')::timestamptz<from_at OR (q->>'createdAt')::timestamptz>through_at
  OR (q->'finishedAt' IS DISTINCT FROM 'null'::jsonb AND (governed_release_compatible_negative_time(q->'finishedAt') IS DISTINCT FROM TRUE
    OR (q->>'finishedAt')::timestamptz<(q->>'createdAt')::timestamptz OR (q->>'finishedAt')::timestamptz>through_at)) THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_negative_contents_valid(r governed_releases,o governed_release_operations,e JSONB,status TEXT,reconciled_status TEXT,observation_only BOOLEAN)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
#variable_conflict use_column
DECLARE s JSONB:=r.snapshot;c JSONB:=s->'compatibleArtifactRecovery';t JSONB:=s->'manifest'->'deployment'->'targets'->0;v JSONB:=e->'compatibleRecoveryFailure';
 inv JSONB:=v->'projectInventory';scan JSONB:=v->'queueScan';q JSONB:=v->'currentQueue';decl JSONB;row JSONB;db JSONB;metadata JSONB;expected JSONB;reference JSONB;
 target JSONB:=t->'targetId';since_at TIMESTAMPTZ:=o.created_at AT TIME ZONE 'UTC';through_at TIMESTAMPTZ;key TEXT;names TEXT[]:=ARRAY[]::TEXT[];
 built INTEGER:=0;absent INTEGER:=0;prior_op governed_release_operations;prior_x governed_release_outcomes;pe JSONB;bound JSONB;live JSONB;images JSONB;deployment_op_id UUID;
BEGIN
 IF status IS DISTINCT FROM 'reconciled' OR observation_only IS DISTINCT FROM TRUE OR reconciled_status IS NULL OR reconciled_status NOT IN ('absent','failed')
  OR o.id IS NULL OR o.release_id IS DISTINCT FROM r.id OR o.workspace_id IS DISTINCT FROM r.workspace_id OR o.application_id IS DISTINCT FROM r.application_id
  OR o.operation NOT IN ('deploy_config','deploy','observe')
  OR s->'manifest'->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2' OR s->'manifest'->>'purpose' IS DISTINCT FROM 'application_release'
  OR s->'manifest'->'deployment'->>'provider' IS DISTINCT FROM 'coolify_compose' OR s->>'manifestDigest' IS DISTINCT FROM governed_release_compose_queue_digest(s->'manifest')
  OR c->>'schemaVersion' IS DISTINCT FROM 'roost-compose-compatible-artifact-recovery-v1' OR c->'scopeAudit'->>'scopeDigest' IS DISTINCT FROM governed_release_compatible_scope_digest(s)
  OR c->'replacement'->'commit' IS DISTINCT FROM s->'commit' OR c->'replacement'->'tree' IS DISTINCT FROM s->'candidateTree'
  OR s?|ARRAY['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','gitPublicationBase','publishedGitBasis','successorBasis']
  OR c->'failurePolicy' IS DISTINCT FROM '{"mode":"freeze_protected_database","automaticHistoricalRollback":false,"dataRestoreAllowed":false,"volumeDeletionAllowed":false,"keepIngressBlocked":true,"keepCadencesHeld":true}'::jsonb
  OR NOT governed_release_compatible_keys(e,ARRAY['compatibleRecoveryFailure','observedAt','configDigest','schemaDigest','dataDigest','sequenceDigest','healthDigest','healthy','currentServiceSetDigest','deploymentIds'])
  OR e->'healthy' IS DISTINCT FROM 'false'::jsonb OR NOT governed_release_compatible_keys(v-ARRAY['successfulDeployment','observationSeconds'],ARRAY['schemaVersion','kind','releaseId','operationId','operation','since','requestId','intentDigest','targetId','requestedCommit','requestedTree','phase','configuration','queueScan','currentQueue','projectInventory','imageMetadata','database','ingressFence','evidenceDigest'])
  OR v->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-recovery-negative-v1' OR v->>'kind' IS NULL OR v->>'kind' NOT IN ('configuration_absent','deployment_absent','deployment_failed','observation_failed')
  OR v->'releaseId' IS DISTINCT FROM to_jsonb(r.id::text) OR v->'operationId' IS DISTINCT FROM to_jsonb(o.id::text) OR v->>'operation' IS DISTINCT FROM o.operation
  OR o.intent->>'operation' IS DISTINCT FROM o.operation OR v->>'since' IS DISTINCT FROM governed_release_compatible_iso(o.created_at)
  OR v->'requestId' IS DISTINCT FROM o.intent->'requestId' OR v->>'requestId' IS DISTINCT FROM o.request_id::text
  OR v->>'intentDigest' IS DISTINCT FROM governed_release_compose_queue_digest(o.intent) OR v->'targetId' IS DISTINCT FROM target
  OR v->'requestedCommit' IS DISTINCT FROM s->'commit' OR v->'requestedTree' IS DISTINCT FROM s->'candidateTree'
  OR o.intent->'commit' IS DISTINCT FROM s->'commit' OR o.intent->'baseCommit' IS DISTINCT FROM s->'baseCommit' OR o.intent->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
  OR v->>'phase' IS NULL OR v->>'phase' NOT IN ('entry','candidate')
  OR v->'configuration' IS DISTINCT FROM (CASE WHEN v->>'phase'='entry' THEN c->'currentEntry'->'configuration' ELSE t->'configuration' END)
  OR v->'configuration'->'targetId' IS DISTINCT FROM target OR v->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(v-'evidenceDigest')
  OR e->>'configDigest' IS DISTINCT FROM governed_release_compose_queue_digest(jsonb_build_array(jsonb_build_object('targetId',target,'configDigest',governed_release_compose_queue_config_digest(v->'configuration'))))
  OR e->'schemaDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'schemaDigest' OR e->'dataDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'dataDigest'
  OR e->'sequenceDigest' IS DISTINCT FROM c->'currentEntry'->'sequenceDigest' THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['observedAt'] LOOP IF governed_release_compatible_negative_time(e->key) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;END LOOP;
 through_at:=(e->>'observedAt')::timestamptz;
 IF through_at>now() OR through_at<now()-interval '5 minutes' OR through_at<since_at THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['configDigest','schemaDigest','dataDigest','sequenceDigest','healthDigest','currentServiceSetDigest'] LOOP
  IF governed_release_compatible_negative_string(e->key,'^[a-f0-9]{64}$') IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 END LOOP;
 IF o.operation='observe' THEN IF o.intent->'parameters'->>'mode' IS DISTINCT FROM 'candidate' THEN RETURN FALSE;END IF;
 ELSE IF o.intent->'parameters'->'commit' IS DISTINCT FROM s->'commit' OR o.intent->'parameters'->'artifactSetDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'artifactSetDigest'
   OR o.intent->'parameters'->'configDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'configDigest' OR o.intent->'parameters'->'schemaDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'schemaDigest'
   OR o.operation='deploy' AND o.intent->'parameters'->'targetId' IS DISTINCT FROM target THEN RETURN FALSE;END IF;END IF;
 IF NOT governed_release_compatible_keys(inv,ARRAY['schemaVersion','targetId','observedAt','projectServiceSetComplete','services','absentServices','digest'])
  OR inv->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-failure-project-inventory-v1' OR inv->'targetId' IS DISTINCT FROM target
  OR inv->'projectServiceSetComplete' IS DISTINCT FROM 'true'::jsonb OR inv->>'digest' IS DISTINCT FROM governed_release_compose_queue_digest(inv-'digest')
  OR jsonb_typeof(inv->'services') IS DISTINCT FROM 'array' OR jsonb_typeof(inv->'absentServices') IS DISTINCT FROM 'array'
  OR jsonb_array_length(inv->'services') NOT BETWEEN 1 AND 5 OR jsonb_array_length(inv->'absentServices')>4
  OR jsonb_array_length(inv->'services')+jsonb_array_length(inv->'absentServices')<>5 OR governed_release_compatible_negative_time(inv->'observedAt') IS DISTINCT FROM TRUE
  OR (inv->>'observedAt')::timestamptz>through_at OR (inv->>'observedAt')::timestamptz<now()-interval '5 minutes'
  OR (SELECT count(DISTINCT value->>'containerId') FROM jsonb_array_elements(inv->'services'))<>jsonb_array_length(inv->'services')
  OR e->>'currentServiceSetDigest' IS DISTINCT FROM governed_release_compose_queue_digest((SELECT jsonb_agg(value ORDER BY value->>'name' COLLATE "C") FROM jsonb_array_elements(inv->'services')))
  OR jsonb_typeof(v->'imageMetadata') IS DISTINCT FROM 'array' OR jsonb_array_length(v->'imageMetadata')>4 THEN RETURN FALSE;END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(inv->'services') LOOP
  IF NOT governed_release_compatible_keys(row,ARRAY['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'])
   OR governed_release_compatible_negative_string(row->'name','^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$') IS DISTINCT FROM TRUE
   OR row->>'name'=ANY(names) THEN RETURN FALSE;END IF;names:=array_append(names,row->>'name');
  SELECT value INTO decl FROM jsonb_array_elements(v->'configuration'->'services') WHERE value->'name'=row->'name';
  IF decl IS NULL OR row->'role' IS DISTINCT FROM decl->'role' OR row->'mountDigest' IS DISTINCT FROM decl->'mountDigest'
   OR governed_release_compatible_negative_string(row->'containerId','^[a-f0-9]{64}$') IS DISTINCT FROM TRUE
   OR governed_release_compatible_negative_string(row->'imageDigest','^sha256:[a-f0-9]{64}$') IS DISTINCT FROM TRUE
   OR governed_release_compatible_negative_string(row->'mountDigest','^[a-f0-9]{64}$') IS DISTINCT FROM TRUE
   OR row->>'state' IS NULL OR row->>'state' NOT IN ('running','paused','exited','created')
   OR row->'health' IS NULL OR row->'health' NOT IN ('"healthy"'::jsonb,'"starting"'::jsonb,'"unhealthy"'::jsonb,'null'::jsonb)
   OR jsonb_typeof(row->'exitCode') IS DISTINCT FROM 'number' OR COALESCE(row->>'exitCode','')!~'^[0-9]+$' OR (row->>'exitCode')::int NOT BETWEEN 0 AND 255
   OR governed_release_compatible_negative_time(row->'createdAt') IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
  IF row->>'role'='database' THEN db:=row;
   IF row->>'state' IS DISTINCT FROM 'running' OR row->>'health' IS DISTINCT FROM 'healthy' OR row->'exitCode' IS DISTINCT FROM '0'::jsonb THEN RETURN FALSE;END IF;
  ELSE built:=built+1;SELECT value INTO expected FROM jsonb_array_elements(c->'replacement'->'images') WHERE value->'name'=row->'name';
   SELECT value INTO metadata FROM jsonb_array_elements(v->'imageMetadata') WHERE value->'name'=row->'name';
   IF expected IS NULL OR NOT governed_release_compatible_keys(metadata,ARRAY['name','imageDigest','buildRevision','revisionLabel','treeLabel'])
    OR row->'imageDigest' IS DISTINCT FROM expected->'imageDigest' OR metadata->'imageDigest' IS DISTINCT FROM row->'imageDigest'
    OR metadata->'buildRevision' IS DISTINCT FROM s->'commit' OR metadata->'revisionLabel' IS DISTINCT FROM s->'commit' OR metadata->'treeLabel' IS DISTINCT FROM s->'candidateTree'
    OR row->>'role'='cadence' AND (row->>'state' NOT IN ('created','paused','exited') OR row->'health' IS DISTINCT FROM 'null'::jsonb OR row->'exitCode' IS DISTINCT FROM '0'::jsonb) THEN RETURN FALSE;END IF;
  END IF;
 END LOOP;
 FOR row IN SELECT value FROM jsonb_array_elements(inv->'absentServices') LOOP
  IF NOT governed_release_compatible_keys(row,ARRAY['name','role','source','mountDigest','declarationDigest','containerId','imageDigest','state','absenceVerified'])
   OR governed_release_compatible_negative_string(row->'name','^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$') IS DISTINCT FROM TRUE
   OR row->>'name'=ANY(names) OR row->>'role' IS NULL OR row->>'role' NOT IN ('app','migration','cadence') OR row->>'source' IS DISTINCT FROM 'built'
   OR row->'containerId' IS DISTINCT FROM 'null'::jsonb OR row->'imageDigest' IS DISTINCT FROM 'null'::jsonb OR row->>'state' IS DISTINCT FROM 'absent'
   OR row->'absenceVerified' IS DISTINCT FROM 'true'::jsonb THEN RETURN FALSE;END IF;names:=array_append(names,row->>'name');absent:=absent+1;
  SELECT value INTO decl FROM jsonb_array_elements(v->'configuration'->'services') WHERE value->'name'=row->'name';
  IF decl IS NULL OR row->'role' IS DISTINCT FROM decl->'role' OR row->'mountDigest' IS DISTINCT FROM decl->'mountDigest'
   OR row->>'declarationDigest' IS DISTINCT FROM governed_release_compose_queue_digest(decl) THEN RETURN FALSE;END IF;
 END LOOP;
 IF cardinality(names)<>5 OR (SELECT count(*) FROM jsonb_array_elements(inv->'services') WHERE value->>'role'='database')<>1
  OR db IS NULL OR NOT governed_release_compatible_keys(v->'database',ARRAY['containerId','imageDigest','mountDigest','readOnlyFence','activeOtherSessions','ownedTransactions'])
  OR v->'database'->'readOnlyFence' IS DISTINCT FROM 'true'::jsonb OR v->'database'->'activeOtherSessions' IS DISTINCT FROM '0'::jsonb
  OR v->'database'->'ownedTransactions' IS DISTINCT FROM '0'::jsonb OR jsonb_array_length(v->'imageMetadata')<>built
  OR (SELECT count(DISTINCT value->>'name') FROM jsonb_array_elements(v->'imageMetadata'))<>built THEN RETURN FALSE;END IF;
 FOREACH key IN ARRAY ARRAY['containerId','imageDigest','mountDigest'] LOOP
  IF db->key IS DISTINCT FROM c->'currentEntry'->'database'->key OR db->key IS DISTINCT FROM v->'database'->key THEN RETURN FALSE;END IF;
 END LOOP;
 IF governed_release_compatible_negative_time(v->'ingressFence'->'observedAt') IS DISTINCT FROM TRUE
  OR governed_release_compatible_negative_string(v->'ingressFence'->'observedAt','Z$') IS DISTINCT FROM TRUE
  OR governed_release_compatible_fence_valid(v->'ingressFence',target,db,e->>'observedAt',TRUE) IS DISTINCT FROM TRUE
  OR (v->'ingressFence')-ARRAY['observedAt','evidenceDigest'] IS DISTINCT FROM (c->'currentEntry'->'ingressFence')-ARRAY['observedAt','evidenceDigest'] THEN RETURN FALSE;END IF;
 IF NOT governed_release_compatible_keys(scan,ARRAY['schemaVersion','targetId','from','through','observedAt','scanComplete','rows','digest'])
  OR scan->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-failure-queue-scan-v1' OR scan->'targetId' IS DISTINCT FROM target
  OR scan->'scanComplete' IS DISTINCT FROM 'true'::jsonb OR scan->>'digest' IS DISTINCT FROM governed_release_compose_queue_digest(scan-'digest')
  OR scan->'through' IS DISTINCT FROM e->'observedAt' OR jsonb_typeof(scan->'rows') IS DISTINCT FROM 'array' OR jsonb_array_length(scan->'rows')>32
  OR governed_release_compatible_negative_time(scan->'from') IS DISTINCT FROM TRUE OR governed_release_compatible_negative_time(scan->'observedAt') IS DISTINCT FROM TRUE
  OR (scan->>'from')::timestamptz>through_at OR (scan->>'observedAt')::timestamptz>through_at OR (scan->>'observedAt')::timestamptz<now()-interval '5 minutes'
  OR (SELECT count(DISTINCT value->>'deploymentId') FROM jsonb_array_elements(scan->'rows'))<>jsonb_array_length(scan->'rows')
  OR jsonb_typeof(e->'deploymentIds') IS DISTINCT FROM 'array' OR jsonb_array_length(e->'deploymentIds')>1 THEN RETURN FALSE;END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(scan->'rows') LOOP
  IF governed_release_compatible_negative_queue_valid(row,target,(scan->>'from')::timestamptz,through_at) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 END LOOP;
 IF v->>'kind' IN ('configuration_absent','deployment_absent') THEN
  IF reconciled_status IS DISTINCT FROM 'absent' OR v->>'kind' IS DISTINCT FROM (CASE o.operation WHEN 'deploy_config' THEN 'configuration_absent' WHEN 'deploy' THEN 'deployment_absent' ELSE 'invalid' END)
   OR v->>'phase' IS DISTINCT FROM (CASE o.operation WHEN 'deploy_config' THEN 'entry' ELSE 'candidate' END) OR q IS DISTINCT FROM 'null'::jsonb
   OR jsonb_array_length(scan->'rows')<>0 OR scan->>'from' IS DISTINCT FROM governed_release_compatible_iso(o.created_at) OR v?|ARRAY['successfulDeployment','observationSeconds']
   OR built<>0 OR absent<>4 OR jsonb_array_length(e->'deploymentIds')<>0 THEN RETURN FALSE;END IF;
 ELSE
  IF reconciled_status IS DISTINCT FROM 'failed' OR v->>'phase' IS DISTINCT FROM 'candidate' OR q IS NULL OR q='null'::jsonb
   OR jsonb_array_length(scan->'rows')<>1 OR scan->'rows'->0 IS DISTINCT FROM q THEN RETURN FALSE;END IF;
  deployment_op_id:=o.id;
  IF v->>'kind'='observation_failed' THEN
   reference:=v->'successfulDeployment';
   IF o.operation IS DISTINCT FROM 'observe' OR NOT governed_release_compatible_keys(reference,ARRAY['operationId','outcomeId','evidenceDigest','deploymentId'])
    OR jsonb_typeof(v->'observationSeconds') IS DISTINCT FROM 'number' OR COALESCE(v->>'observationSeconds','')!~'^[0-9]+$' THEN RETURN FALSE;END IF;
   SELECT * INTO prior_op FROM governed_release_operations WHERE id=(reference->>'operationId')::uuid AND release_id=r.id AND workspace_id=r.workspace_id AND application_id=r.application_id;
   SELECT * INTO prior_x FROM governed_release_outcomes WHERE id=(reference->>'outcomeId')::uuid AND operation_id=prior_op.id AND release_id=r.id;
   IF prior_op.id IS NULL OR prior_x.id IS NULL OR prior_op.operation IS DISTINCT FROM 'deploy' OR prior_op.sequence>=o.sequence OR prior_op.created_at>o.created_at
    OR prior_x.id IS DISTINCT FROM (SELECT id FROM governed_release_outcomes WHERE operation_id=prior_op.id ORDER BY sequence DESC LIMIT 1)
    OR COALESCE(CASE WHEN prior_x.status='reconciled' THEN prior_x.reconciled_status ELSE prior_x.status END,'unresolved') IS DISTINCT FROM 'succeeded'
    OR governed_release_compose_queue_digest(prior_x.evidence) IS DISTINCT FROM reference->>'evidenceDigest' THEN RETURN FALSE;END IF;
   pe:=prior_x.evidence;since_at:=prior_op.created_at AT TIME ZONE 'UTC';deployment_op_id:=prior_op.id;
   IF prior_op.intent->>'operation' IS DISTINCT FROM 'deploy' OR prior_op.intent->'commit' IS DISTINCT FROM s->'commit' OR prior_op.intent->'baseCommit' IS DISTINCT FROM s->'baseCommit'
    OR prior_op.intent->>'manifestDigest' IS DISTINCT FROM r.manifest_digest OR prior_op.intent->'parameters'->'targetId' IS DISTINCT FROM target
    OR prior_op.intent->'parameters'->'commit' IS DISTINCT FROM s->'commit' OR prior_op.intent->'parameters'->'artifactSetDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'artifactSetDigest'
    OR prior_op.intent->'parameters'->'configDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'configDigest' OR prior_op.intent->'parameters'->'schemaDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'schemaDigest'
    OR pe->'healthy' IS DISTINCT FROM 'true'::jsonb OR pe->'deployedCommit' IS DISTINCT FROM s->'commit' OR pe->'deployedTree' IS DISTINCT FROM s->'candidateTree'
    OR pe->'artifactSetDigest' IS DISTINCT FROM c->'replacement'->'artifactSetDigest' OR pe->'configDigest' IS DISTINCT FROM c->'replacement'->'configurationDigest'
    OR pe->'schemaDigest' IS DISTINCT FROM e->'schemaDigest' OR pe->'dataDigest' IS DISTINCT FROM e->'dataDigest'
    OR pe->'deploymentIds' IS DISTINCT FROM e->'deploymentIds' OR reference->'deploymentId' IS DISTINCT FROM q->'deploymentId'
    OR jsonb_typeof(pe->'composeTargets') IS DISTINCT FROM 'array' OR jsonb_array_length(pe->'composeTargets')<>1 OR pe->'composeTargets'->0->'targetId' IS DISTINCT FROM target
    OR pe->'composeTargets'->0->'binding'->'queue' IS DISTINCT FROM q OR pe->'composeTargets'->0->'binding'->'commit' IS DISTINCT FROM s->'commit'
    OR pe->'composeTargets'->0->'binding'->'tree' IS DISTINCT FROM s->'candidateTree' OR q->>'status' IS DISTINCT FROM 'finished'
    OR q->'finishedAt' IS NULL OR q->'finishedAt'='null'::jsonb OR (q->>'finishedAt')::timestamptz>(o.created_at AT TIME ZONE 'UTC') THEN RETURN FALSE;END IF;
   SELECT jsonb_agg(value ORDER BY value->>'name' COLLATE "C") INTO images FROM jsonb_array_elements(c->'replacement'->'images');
   SELECT jsonb_agg(jsonb_build_object('name',value->'name','imageDigest',value->'imageDigest','commit',value->'commit','tree',value->'tree') ORDER BY value->>'name' COLLATE "C") INTO bound FROM jsonb_array_elements(pe->'composeTargets'->0->'binding'->'images');
   SELECT jsonb_agg(jsonb_build_object('name',value->'name','imageDigest',value->'imageDigest','commit',value->'commit','tree',value->'tree') ORDER BY value->>'name' COLLATE "C") INTO live FROM jsonb_array_elements(pe->'composeTargets'->0->'runtime'->'services') WHERE value->>'role'<>'database';
   IF jsonb_array_length(bound) IS DISTINCT FROM 4 OR jsonb_array_length(live) IS DISTINCT FROM 4 OR bound IS DISTINCT FROM images OR live IS DISTINCT FROM images THEN RETURN FALSE;END IF;
  ELSE IF v->>'kind' IS DISTINCT FROM 'deployment_failed' OR o.operation IS DISTINCT FROM 'deploy' OR v?|ARRAY['successfulDeployment','observationSeconds'] OR q->>'status' IS DISTINCT FROM 'failed' THEN RETURN FALSE;END IF;END IF;
  IF q->>'deploymentId' IS DISTINCT FROM 'r'||substr(governed_release_compose_queue_digest(jsonb_build_array(r.id::text,deployment_op_id::text,target,'candidate')),1,23)
   OR q->'commit' IS DISTINCT FROM s->'commit' OR q->'finishedAt' IS DISTINCT FROM 'null'::jsonb AND jsonb_typeof(q->'finishedAt') IS DISTINCT FROM 'string'
   OR q->'finishedAt' IS NULL OR q->'finishedAt'='null'::jsonb OR scan->>'from' IS DISTINCT FROM governed_release_compatible_iso(CASE WHEN v->>'kind'='observation_failed' THEN prior_op.created_at ELSE o.created_at END)
   OR (q->>'createdAt')::timestamptz<since_at OR (q->>'createdAt')::timestamptz>(q->>'finishedAt')::timestamptz
   OR e->'deploymentIds' IS DISTINCT FROM jsonb_build_array(jsonb_build_object('targetId',target,'deploymentId',q->'deploymentId')) THEN RETURN FALSE;END IF;
  FOR row IN SELECT value FROM jsonb_array_elements(inv->'services') WHERE value->>'role'<>'database' LOOP
   IF (row->>'createdAt')::timestamptz<(q->>'createdAt')::timestamptz OR (row->>'createdAt')::timestamptz>(q->>'finishedAt')::timestamptz THEN RETURN FALSE;END IF;
  END LOOP;
 END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

-- Final normal outcome guard ALWAYS requires both historical provenance and
-- fresh complete contents. The separately callable component grants no authority.
CREATE FUNCTION governed_release_compatible_negative_valid(r governed_releases,o governed_release_operations,e JSONB,status TEXT,reconciled_status TEXT,observation_only BOOLEAN)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF governed_release_compatible_negative_lineage_valid(r) IS DISTINCT FROM TRUE
  OR governed_release_compatible_negative_contents_valid(r,o,e,status,reconciled_status,observation_only) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;

CREATE FUNCTION governed_release_compatible_outcome_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
#variable_conflict use_column
DECLARE r governed_releases;o governed_release_operations;s JSONB;e JSONB;expected JSONB;runtime_images JSONB;bound_images JSONB;
 t JSONB;row JSONB;proof JSONB;p JSONB;v JSONB;decl JSONB;cadence JSONB;prior_observation governed_release_outcomes;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;SELECT * INTO o FROM governed_release_operations WHERE id=NEW.operation_id;
 IF r.snapshot?'compatibleArtifactRecovery' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));s:=r.snapshot;e:=NEW.evidence;
  IF e?'compatibleRecoveryFailure' THEN
   IF governed_release_compatible_negative_valid(r,o,e,NEW.status,NEW.reconciled_status,NEW.observation_only) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'governed_release_compatible_negative_unproven';END IF;
   RETURN NEW;
  END IF;
  IF governed_release_compatible_basis_valid(s,r.workspace_id,r.issuer_user_id,FALSE) IS DISTINCT FROM TRUE
   OR o.release_id IS DISTINCT FROM r.id OR o.operation NOT IN ('push','pr','review','merge','deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup') THEN
   RAISE EXCEPTION 'governed_release_compatible_outcome_unproven';END IF;
  IF NEW.status='succeeded' OR NEW.status='reconciled' AND NEW.reconciled_status='succeeded' THEN
   IF o.operation IN ('push','pr','review','merge') AND (e->'remoteCommit' IS DISTINCT FROM s->'commit' OR e->'remoteTree' IS DISTINCT FROM s->'candidateTree'
    OR e->'remoteBase' IS DISTINCT FROM s->'compatibleArtifactRecovery'->'publication'->'baseCommit'
    OR e->'remoteBaseTree' IS DISTINCT FROM s->'compatibleArtifactRecovery'->'publication'->'baseTree'
    OR o.operation IN ('pr','review','merge') AND (COALESCE(e->>'pullRequestNumber','0')::bigint<=0 OR e->'prHeadCommit' IS DISTINCT FROM s->'commit')
    OR o.operation='review' AND e->'reviewApproved' IS DISTINCT FROM 'true'::jsonb
    OR o.operation='merge' AND (e->'prMerged' IS DISTINCT FROM 'true'::jsonb OR e->'mergedCommit' IS DISTINCT FROM s->'commit')) THEN
    RAISE EXCEPTION 'governed_release_compatible_own_git_unproven';END IF;
   IF o.operation='deploy_config' AND (e->'deployedCommit' IS DISTINCT FROM s->'commit'
    OR e->'configDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'configDigest'
    OR e->'artifactSetDigest' IS DISTINCT FROM s->'manifest'->'deployment'->'artifactSetDigest'
    OR e->'schemaDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'schemaDigest') THEN
    RAISE EXCEPTION 'governed_release_compatible_config_unproven';END IF;
   IF o.operation IN ('deploy','observe') THEN
    t:=s->'manifest'->'deployment'->'targets'->0;row:=e->'composeTargets'->0;
    SELECT jsonb_agg(v ORDER BY v->>'name' COLLATE "C") INTO expected FROM jsonb_array_elements(s->'compatibleArtifactRecovery'->'replacement'->'images')v;
    SELECT jsonb_agg(jsonb_build_object('name',v->'name','imageDigest',v->'imageDigest','commit',v->'commit','tree',v->'tree') ORDER BY v->>'name' COLLATE "C")
     INTO runtime_images FROM jsonb_array_elements(e->'composeTargets'->0->'runtime'->'services')v WHERE v->>'role'<>'database';
    SELECT jsonb_agg(jsonb_build_object('name',v->'name','imageDigest',v->'imageDigest','commit',v->'commit','tree',v->'tree') ORDER BY v->>'name' COLLATE "C")
     INTO bound_images FROM jsonb_array_elements(e->'composeTargets'->0->'binding'->'images')v;
    IF jsonb_array_length(e->'composeTargets')<>1 OR jsonb_array_length(expected)<>4 OR jsonb_array_length(runtime_images)<>4 OR jsonb_array_length(bound_images)<>4
     OR runtime_images IS DISTINCT FROM expected OR bound_images IS DISTINCT FROM expected
     OR e->'composeTargets'->0->'targetId' IS DISTINCT FROM s->'manifest'->'deployment'->'targetId'
     OR e->'healthy' IS DISTINCT FROM 'true'::jsonb OR e->'deployedCommit' IS DISTINCT FROM s->'commit' OR e->'deployedTree' IS DISTINCT FROM s->'candidateTree'
     OR e->'artifactSetDigest' IS DISTINCT FROM s->'compatibleArtifactRecovery'->'replacement'->'artifactSetDigest'
     OR e->'configDigest' IS DISTINCT FROM s->'compatibleArtifactRecovery'->'replacement'->'configurationDigest'
     OR e->'schemaDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'schemaDigest' OR e->'dataDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'dataDigest'
     OR governed_release_compose_queue_config_digest(row->'configuration') IS DISTINCT FROM t->>'configDigest'
     OR row->'binding'->'commit' IS DISTINCT FROM s->'commit' OR row->'binding'->'tree' IS DISTINCT FROM s->'candidateTree'
     OR row->'binding'->'queue'->>'status' IS DISTINCT FROM 'finished' OR row->'binding'->'queue'->'commit' IS DISTINCT FROM s->'commit'
     OR row->'binding'->'queue'->'targetId' IS DISTINCT FROM t->'targetId'
     OR row->'binding'->'queue'->'deploymentId' IS DISTINCT FROM row->'binding'->'deploymentId'
     OR row->'runtime'->'deploymentId' IS DISTINCT FROM row->'binding'->'deploymentId'
     OR (row->'binding'->'queue'->>'finishedAt')::timestamptz<(row->'binding'->'queue'->>'createdAt')::timestamptz
     OR (row->'binding'->'queue'->>'finishedAt')::timestamptz>(e->>'observedAt')::timestamptz
     OR jsonb_array_length(row->'runtime'->'services')<>5
     OR (SELECT count(DISTINCT q->>'name') FROM jsonb_array_elements(row->'runtime'->'services')q)<>5
     OR (SELECT count(DISTINCT q->>'containerId') FROM jsonb_array_elements(row->'runtime'->'services')q)<>5
     OR o.operation='observe' AND (COALESCE(e->>'observationSeconds','0')::int<(s->'manifest'->'observation'->>'seconds')::int OR o.intent->'parameters'->>'mode' IS DISTINCT FROM 'candidate') THEN
     RAISE EXCEPTION 'governed_release_compatible_installed_images_unproven';END IF;
    FOR v IN SELECT value FROM jsonb_array_elements(row->'runtime'->'services') LOOP
     SELECT value INTO decl FROM jsonb_array_elements(t->'configuration'->'services') WHERE value->'name'=v->'name';
     IF decl IS NULL OR v->'role' IS DISTINCT FROM decl->'role' OR v->'mountDigest' IS DISTINCT FROM decl->'mountDigest'
      OR v->>'exitCode' IS DISTINCT FROM '0'
      OR v->>'role'='migration' AND (v->>'state' IS DISTINCT FROM 'exited' OR v->'health' IS DISTINCT FROM 'null'::jsonb)
      OR v->>'role' IN ('app','database') AND (v->>'state' IS DISTINCT FROM 'running' OR v->>'health' IS DISTINCT FROM 'healthy')
      OR v->>'role'='cadence' AND v->>'state' NOT IN ('paused','created')
      OR v->>'role'='database' AND v->'imageDigest' IS DISTINCT FROM decl->'imageDigest' THEN
      RAISE EXCEPTION 'governed_release_compatible_service_unproven';END IF;
    END LOOP;
   END IF;
   IF o.operation IN ('smoke','fixture_cleanup','runtime_resume') THEN
    proof:=e->'postObservation';p:=s->'manifest'->'postObservation';
    IF proof->>'kind' IS DISTINCT FROM o.operation OR proof->>'postObservationDigest' IS DISTINCT FROM governed_release_compose_queue_digest(p)
     OR proof->>'fixtureDigest' IS DISTINCT FROM governed_release_compose_queue_digest(p->'fixture') OR proof->'controllerDigest' IS DISTINCT FROM p->'controllerDigest'
     OR proof->'targetId' IS DISTINCT FROM s->'manifest'->'deployment'->'targetId' OR proof->'commit' IS DISTINCT FROM s->'commit' OR proof->'tree' IS DISTINCT FROM s->'candidateTree'
     OR proof->'schemaDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'schemaDigest' OR proof->'nativeChildrenClosed' IS DISTINCT FROM 'true'::jsonb THEN
     RAISE EXCEPTION 'governed_release_compatible_post_observation_unproven';END IF;
    IF o.operation='smoke' AND (proof->'backendCommit' IS DISTINCT FROM s->'commit' OR proof->'frontendCommit' IS DISTINCT FROM s->'commit'
     OR proof->'emptyActivityCount' IS DISTINCT FROM '0'::jsonb OR proof->'populatedActivityCount' IS DISTINCT FROM '1'::jsonb
     OR proof->'renderedEventId' IS DISTINCT FROM p->'fixture'->'eventId' OR proof->'renderedSummaryDigest' IS DISTINCT FROM p->'fixture'->'summaryDigest'
     OR proof->'memoryId' IS DISTINCT FROM p->'fixture'->'memoryId' OR proof->'negativePathStatus' IS DISTINCT FROM '401'::jsonb
     OR proof->'nonOwnedDataDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'dataDigest' OR proof->'sequenceDigest' IS DISTINCT FROM p->'baselineSequenceDigest'
     OR proof->'providerRequests' IS DISTINCT FROM '0'::jsonb OR proof->'externalActions' IS DISTINCT FROM '0'::jsonb
     OR proof->'noUnownedChanges' IS DISTINCT FROM 'true'::jsonb OR proof->'fixtureOwned' IS DISTINCT FROM 'true'::jsonb
     OR proof->'ingressBlocked' IS DISTINCT FROM 'true'::jsonb OR proof->'cadencesHeld' IS DISTINCT FROM 'true'::jsonb) THEN
     RAISE EXCEPTION 'governed_release_compatible_smoke_unproven';END IF;
    IF o.operation='fixture_cleanup' AND (proof->'dataDigest' IS DISTINCT FROM s->'manifest'->'baseline'->'dataDigest' OR proof->'sequenceDigest' IS DISTINCT FROM p->'baselineSequenceDigest'
     OR proof->'fixtureAbsent' IS DISTINCT FROM 'true'::jsonb OR proof->'authAbsent' IS DISTINCT FROM 'true'::jsonb OR proof->'eventAbsent' IS DISTINCT FROM 'true'::jsonb
     OR proof->'databaseReadOnly' IS DISTINCT FROM 'true'::jsonb OR proof->'activeOtherSessions' IS DISTINCT FROM '0'::jsonb
     OR proof->'sequencesUnchanged' IS DISTINCT FROM 'true'::jsonb OR proof->'noUnownedChanges' IS DISTINCT FROM 'true'::jsonb
     OR proof->'providerRequests' IS DISTINCT FROM '0'::jsonb OR proof->'externalActions' IS DISTINCT FROM '0'::jsonb) THEN
     RAISE EXCEPTION 'governed_release_compatible_cleanup_unproven';END IF;
    IF o.operation='runtime_resume' THEN
     IF proof->'backendCommit' IS DISTINCT FROM s->'commit' OR proof->'frontendCommit' IS DISTINCT FROM s->'commit'
      OR proof->'healthy' IS DISTINCT FROM 'true'::jsonb OR proof->'fixtureAbsent' IS DISTINCT FROM 'true'::jsonb
      OR proof->'databaseSettingsDigest' IS DISTINCT FROM p->'runtimeResume'->'databaseSettingsDigest'
      OR proof->'ingressSettingsDigest' IS DISTINCT FROM p->'runtimeResume'->'ingressSettingsDigest'
      OR COALESCE(proof->>'observationSeconds','0')::int<(p->'runtimeResume'->>'observationSeconds')::int
      OR jsonb_array_length(proof->'cadenceEvidence')<>2 OR jsonb_array_length(proof->'cadences')<>2 THEN
      RAISE EXCEPTION 'governed_release_compatible_resume_unproven';END IF;
     FOR v IN SELECT value FROM jsonb_array_elements(proof->'cadenceEvidence') LOOP
      SELECT value INTO cadence FROM jsonb_array_elements(p->'runtimeResume'->'cadences')WHERE value->'name'=v->'name';
      IF cadence IS NULL OR cadence->'behaviorDigest' IS DISTINCT FROM v->'behaviorDigest' OR v->'behaviorVerified' IS DISTINCT FROM 'true'::jsonb
       OR COALESCE(v->>'completedTicks','0')::int<=0 OR v->>'executionState' NOT IN ('executed','skipped')
       OR (v->>'observedAt')::timestamptz<o.created_at::timestamptz OR (v->>'observedAt')::timestamptz>(e->>'observedAt')::timestamptz THEN
       RAISE EXCEPTION 'governed_release_compatible_cadence_unproven';END IF;
     END LOOP;
    END IF;
   END IF;
  END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compatible_outcome_guard BEFORE INSERT ON governed_release_outcomes FOR EACH ROW EXECUTE FUNCTION governed_release_compatible_outcome_guard();

CREATE FUNCTION governed_release_compatible_renewal_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
 IF r.snapshot?'compatibleArtifactRecovery' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(r.application_id::text,0));
  IF governed_release_compatible_basis_valid(r.snapshot,r.workspace_id,r.issuer_user_id,FALSE) IS DISTINCT FROM TRUE THEN
   RAISE EXCEPTION 'governed_release_compatible_proof_changed';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compatible_renewal_guard BEFORE INSERT ON governed_release_renewals FOR EACH ROW EXECUTE FUNCTION governed_release_compatible_renewal_guard();
COMMIT;
