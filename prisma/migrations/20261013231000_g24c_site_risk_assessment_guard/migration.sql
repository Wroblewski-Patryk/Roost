BEGIN;

-- Keep all previously patched task-risk scope and assessment guards. Change
-- only the evidence predicate for a package-only Site in an exact company scope.
DO $patch$
DECLARE definition TEXT; old_predicate TEXT; new_predicate TEXT;
BEGIN
  SELECT pg_get_functiondef('task_risk_history_guard()'::regprocedure) INTO definition;
  old_predicate := 'AND length(trim(COALESCE(r.description,'''')||COALESCE(r.business_purpose,'''')||COALESCE(r.desired_state,'''')||COALESCE(r.expected_behavior,'''')))>0';
  IF length(definition)-length(replace(definition,old_predicate,'')) <> length(old_predicate)
  THEN RAISE EXCEPTION 'g24c_risk_evidence_guard_anchor_invalid'; END IF;
  new_predicate := 'AND (
    length(trim(COALESCE(r.description,'''')||COALESCE(r.business_purpose,'''')||COALESCE(r.desired_state,'''')||COALESCE(r.expected_behavior,'''')))>0
    OR (r.record_type=''reference_site'' AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.sources) s
      JOIN task_risk_scopes sc ON sc.id::text=s->>''scopeId''
        AND sc.task_id::text=s->>''taskId'' AND sc.workspace_id=NEW.workspace_id
      WHERE s->>''taskId''=item->>''taskId'' AND sc.scope_kind=''company_information''
        AND company_information_risk_site_current(
          (item->>''taskId'')::uuid,NEW.workspace_id,sc.input->''contract'',ref)
    ))
  )';
  EXECUTE replace(definition,old_predicate,new_predicate);
END $patch$;

-- The native admission evidence trigger retained the same prose-only rule.
-- Preserve its existing scope, version, authority and history checks.
DO $patch$
DECLARE definition TEXT; old_predicate TEXT; new_predicate TEXT;
BEGIN
  SELECT pg_get_functiondef('task_admission_insert_guard()'::regprocedure) INTO definition;
  old_predicate := 'AND length(trim(COALESCE(c.description,c.business_purpose,c.desired_state,c.expected_behavior,'''')))>=3';
  IF length(definition)-length(replace(definition,old_predicate,'')) <> length(old_predicate)
  THEN RAISE EXCEPTION 'g24c_admission_evidence_guard_anchor_invalid'; END IF;
  new_predicate := 'AND (
    length(trim(COALESCE(c.description,c.business_purpose,c.desired_state,c.expected_behavior,'''')))>=3
    OR (c.record_type=''reference_site'' AND s.scope_kind=''company_information'' AND EXISTS (
      SELECT 1 FROM task_risk_scopes rs
      WHERE rs.task_id=NEW.task_id AND rs.workspace_id=NEW.workspace_id
        AND rs.scope_kind=''company_information''
        AND rs.id=(SELECT id FROM task_risk_scopes WHERE task_id=NEW.task_id ORDER BY version DESC LIMIT 1)
        AND company_information_risk_site_current(
          NEW.task_id,NEW.workspace_id,rs.input->''contract'',
          jsonb_build_object(''id'',c.id::text,''revision'',
            to_char(c.updated_at AT TIME ZONE ''UTC'',''YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'')))
    ))
  )';
  EXECUTE replace(definition,old_predicate,new_predicate);
END $patch$;

COMMIT;
