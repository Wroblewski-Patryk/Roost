BEGIN;
-- Recheck authority after every effect in the command transaction, including
-- writes after the use receipt. No later task/role/revocation change may commit
-- together with a newly authorized decision under an obsolete capability.
CREATE OR REPLACE FUNCTION task_capability_receipt_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.actor_agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM task_capability_uses u JOIN task_capability_grants g ON g.id=u.grant_id
   WHERE u.grant_id=NEW.capability_grant_id AND task_capability_base(g)='active'
    AND u.post_scope_hash=task_capability_scope(g.task_id,g.credential_id,g.issuer_user_id)
    AND (CASE WHEN TG_TABLE_NAME='task_review_decisions' THEN u.decision_id=NEW.id ELSE u.action_id=NEW.id END))
 THEN RAISE EXCEPTION 'capability_receipt_required'; END IF;
 RETURN NEW;
END $$;
COMMIT;
