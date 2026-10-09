BEGIN;
-- Forward-only FAILED disposition. No historical rows, data, grants or credentials change.
-- Historical content is checked at its original clock; the new closure independently
-- requires genuine fresh read-only revalidation and owner-attested native absence.
CREATE FUNCTION governed_release_compatible_negative_contents_at(r governed_releases,o governed_release_operations,e JSONB,status TEXT,reconciled_status TEXT,observation_only BOOLEAN,qualified_at TIMESTAMPTZ)
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
 IF through_at>qualified_at OR through_at<qualified_at-interval '5 minutes' OR through_at<since_at THEN RETURN FALSE;END IF;
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
  OR (inv->>'observedAt')::timestamptz>through_at OR (inv->>'observedAt')::timestamptz<qualified_at-interval '5 minutes'
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
  OR governed_release_compatible_fence_valid(v->'ingressFence',target,db,e->>'observedAt',FALSE) IS DISTINCT FROM TRUE
  OR (v->'ingressFence'->>'observedAt')::timestamptz>qualified_at
  OR (v->'ingressFence'->>'observedAt')::timestamptz<qualified_at-interval '5 minutes'
  OR (v->'ingressFence')-ARRAY['observedAt','evidenceDigest'] IS DISTINCT FROM (c->'currentEntry'->'ingressFence')-ARRAY['observedAt','evidenceDigest'] THEN RETURN FALSE;END IF;
 IF NOT governed_release_compatible_keys(scan,ARRAY['schemaVersion','targetId','from','through','observedAt','scanComplete','rows','digest'])
  OR scan->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-failure-queue-scan-v1' OR scan->'targetId' IS DISTINCT FROM target
  OR scan->'scanComplete' IS DISTINCT FROM 'true'::jsonb OR scan->>'digest' IS DISTINCT FROM governed_release_compose_queue_digest(scan-'digest')
  OR scan->'through' IS DISTINCT FROM e->'observedAt' OR jsonb_typeof(scan->'rows') IS DISTINCT FROM 'array' OR jsonb_array_length(scan->'rows')>32
  OR governed_release_compatible_negative_time(scan->'from') IS DISTINCT FROM TRUE OR governed_release_compatible_negative_time(scan->'observedAt') IS DISTINCT FROM TRUE
  OR (scan->>'from')::timestamptz>through_at OR (scan->>'observedAt')::timestamptz>through_at OR (scan->>'observedAt')::timestamptz<qualified_at-interval '5 minutes'
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

CREATE FUNCTION governed_release_compatible_config_closure_stable(e JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT (((((e-'observedAt')#-'{compatibleRecoveryFailure,evidenceDigest}')
  #-'{compatibleRecoveryFailure,ingressFence,observedAt}')#-'{compatibleRecoveryFailure,ingressFence,evidenceDigest}')
  #-'{compatibleRecoveryFailure,projectInventory,observedAt}')#-'{compatibleRecoveryFailure,projectInventory,digest}'
  #-'{compatibleRecoveryFailure,queueScan,through}'#-'{compatibleRecoveryFailure,queueScan,observedAt}'#-'{compatibleRecoveryFailure,queueScan,digest}';
$$;
CREATE FUNCTION governed_release_compatible_config_closure_journal(target_release UUID,failed_operation UUID,e JSONB)
 RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE r governed_releases;ops JSONB;op governed_release_operations;x governed_release_outcomes;row JSONB;git JSONB;idx INT:=0;prnum JSONB;publication JSONB;
BEGIN
 SELECT * INTO r FROM governed_releases WHERE id=target_release;
 SELECT * INTO op FROM governed_release_operations WHERE id=failed_operation AND release_id=r.id;
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;
 IF r.id IS NULL OR op.operation IS DISTINCT FROM 'deploy_config' OR x.status IS DISTINCT FROM 'reconciled'
  OR x.reconciled_status IS DISTINCT FROM 'absent' OR x.observation_only IS DISTINCT FROM TRUE OR x.evidence IS DISTINCT FROM e
  OR e->'compatibleRecoveryFailure'->>'kind' IS DISTINCT FROM 'configuration_absent'
  OR governed_release_compatible_negative_lineage_valid(r) IS DISTINCT FROM TRUE
  OR governed_release_compatible_negative_contents_at(r,op,e,x.status,x.reconciled_status,x.observation_only,(e->>'observedAt')::timestamptz) IS DISTINCT FROM TRUE THEN RETURN FALSE;END IF;
 SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('outcome',(SELECT to_jsonb(z) FROM governed_release_outcomes z WHERE z.operation_id=o.id ORDER BY sequence DESC LIMIT 1)) ORDER BY o.sequence)
  INTO ops FROM governed_release_operations o WHERE o.release_id=r.id;
 IF jsonb_array_length(ops) IS DISTINCT FROM 5 OR (SELECT string_agg(v->>'operation',',' ORDER BY ord) FROM jsonb_array_elements(ops) WITH ORDINALITY rows(v,ord)) IS DISTINCT FROM 'push,pr,review,merge,deploy_config'
  OR ops->4->>'id' IS DISTINCT FROM failed_operation::text THEN RETURN FALSE;END IF;
 publication:=r.snapshot->'compatibleArtifactRecovery'->'publication';
 FOR row IN SELECT v FROM jsonb_array_elements(ops) WITH ORDINALITY rows(v,ord) WHERE ord<=4 ORDER BY ord LOOP
  git:=row->'outcome'->'evidence';
  IF COALESCE(CASE WHEN row->'outcome'->>'status'='reconciled' THEN row->'outcome'->>'reconciled_status' ELSE row->'outcome'->>'status' END,'')<>'succeeded'
   OR row->'intent'->>'operation' IS DISTINCT FROM row->>'operation' OR row->'intent'->>'commit' IS DISTINCT FROM r.snapshot->>'commit'
   OR row->'intent'->>'baseCommit' IS DISTINCT FROM r.snapshot->>'baseCommit' OR row->'intent'->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
   OR row->'intent'->'observed'->>'commit' IS DISTINCT FROM r.snapshot->>'commit'
   OR row->'intent'->'observed'->>'baseCommit' IS DISTINCT FROM publication->>'baseCommit'
   OR row->'intent'->'observed'->>'baseTree' IS DISTINCT FROM publication->>'baseTree'
   OR row->'intent'->'observed'->>'manifestDigest' IS DISTINCT FROM r.manifest_digest
   OR git->>'remoteCommit' IS DISTINCT FROM r.snapshot->>'commit' OR git->>'remoteTree' IS DISTINCT FROM r.snapshot->>'candidateTree'
   OR git->>'remoteBase' IS DISTINCT FROM publication->>'baseCommit' OR git->>'remoteBaseTree' IS DISTINCT FROM publication->>'baseTree' THEN RETURN FALSE;END IF;
  IF idx>0 THEN
   IF git->>'prHeadCommit' IS DISTINCT FROM r.snapshot->>'commit' OR COALESCE((git->>'pullRequestNumber')::int,0)<=0 THEN RETURN FALSE;END IF;
   IF idx=1 THEN prnum:=git->'pullRequestNumber';ELSIF git->'pullRequestNumber' IS DISTINCT FROM prnum THEN RETURN FALSE;END IF;
  END IF;
  IF idx=2 AND git->'reviewApproved' IS DISTINCT FROM 'true'::jsonb OR idx=3 AND (git->'prMerged' IS DISTINCT FROM 'true'::jsonb OR git->>'mergedCommit' IS DISTINCT FROM r.snapshot->>'commit') THEN RETURN FALSE;END IF;
  idx:=idx+1;
 END LOOP;RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;
ALTER FUNCTION governed_release_failed_baseline_proven(UUID,UUID,JSONB) RENAME TO governed_release_failed_base_pre_compat_cfg_v1;
CREATE FUNCTION governed_release_failed_baseline_proven(target_release UUID,failed_operation UUID,e JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF e?'compatibleRecoveryFailure' THEN RETURN governed_release_compatible_config_closure_journal(target_release,failed_operation,e);END IF;
 RETURN governed_release_failed_base_pre_compat_cfg_v1(target_release,failed_operation,e);
END $$;
CREATE FUNCTION governed_release_compatible_config_closure_fresh(r governed_releases,receipt JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE a JSONB:=receipt->'absenceRevalidation';e JSONB:=receipt->'evidence';ce JSONB:=e;n JSONB:=receipt->'nativeClosure';op governed_release_operations;x governed_release_outcomes;clock_at TIMESTAMPTZ:=now();
BEGIN
 SELECT * INTO op FROM governed_release_operations WHERE id=(receipt->>'failedOperationId')::uuid AND release_id=r.id;
 SELECT * INTO x FROM governed_release_outcomes WHERE operation_id=op.id ORDER BY sequence DESC LIMIT 1;
 IF governed_release_compatible_config_closure_journal(r.id,op.id,e) IS DISTINCT FROM TRUE
  OR governed_release_compose_owner_native_closure(r,op.id,e,n) IS DISTINCT FROM TRUE
  OR (n->>'observedAt')::timestamptz>clock_at OR (n->>'observedAt')::timestamptz<clock_at-interval '5 minutes' THEN RETURN FALSE;END IF;
 IF receipt?'absenceRevalidation' THEN
  IF NOT governed_release_compatible_keys(a,ARRAY['schemaVersion','releaseId','failedOutcomeId','evidenceDigest','currentEvidence','nativeClosureDigest','observedAt'])
   OR a->>'schemaVersion' IS DISTINCT FROM 'roost-compatible-config-absence-closure-revalidation-v1'
   OR a->>'releaseId' IS DISTINCT FROM r.id::text OR a->>'failedOutcomeId' IS DISTINCT FROM x.id::text
   OR a->>'evidenceDigest' IS DISTINCT FROM governed_release_compose_queue_digest(e)
   OR a->>'nativeClosureDigest' IS DISTINCT FROM governed_release_compose_queue_digest(n)
   OR a->>'observedAt' IS DISTINCT FROM a->'currentEvidence'->>'observedAt'
   OR governed_release_compatible_config_closure_stable(e) IS DISTINCT FROM governed_release_compatible_config_closure_stable(a->'currentEvidence') THEN RETURN FALSE;END IF;
  ce:=a->'currentEvidence';
 END IF;
 RETURN (ce->>'observedAt')::timestamptz>=(e->>'observedAt')::timestamptz
  AND (n->>'observedAt')::timestamptz>=(ce->>'observedAt')::timestamptz
  AND governed_release_compatible_negative_contents_at(r,op,ce,'reconciled','absent',TRUE,clock_at);
EXCEPTION WHEN OTHERS THEN RETURN FALSE;END $$;
ALTER FUNCTION governed_release_compose_absence_revalidation_valid(governed_releases,JSONB) RENAME TO governed_release_absence_reval_pre_compat_cfg_v1;
CREATE FUNCTION governed_release_compose_absence_revalidation_valid(r governed_releases,receipt JSONB) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF receipt->'evidence'?'compatibleRecoveryFailure' THEN RETURN governed_release_compatible_config_closure_fresh(r,receipt);END IF;
 RETURN governed_release_absence_reval_pre_compat_cfg_v1(r,receipt);
END $$;
CREATE FUNCTION governed_release_compatible_config_closure_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r governed_releases;
BEGIN
 IF NEW.snapshot->'evidence'?'compatibleRecoveryFailure' THEN
  SELECT * INTO r FROM governed_releases WHERE id=NEW.release_id;
  IF governed_release_compatible_config_closure_fresh(r,NEW.snapshot) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'governed_release_compatible_config_closure_unproven';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER governed_release_compatible_config_closure_guard BEFORE INSERT ON governed_release_failed_closures FOR EACH ROW EXECUTE FUNCTION governed_release_compatible_config_closure_guard();
COMMIT;
