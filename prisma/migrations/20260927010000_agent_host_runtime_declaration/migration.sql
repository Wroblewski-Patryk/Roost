-- Forward-only Gate 1 repair. The adopted host's identity and disabled state stay immutable.
-- Runtime declarations are mutable only through the authenticated host routes;
-- the source fence still advances on every host write.
DO $check$ DECLARE h TEXT; BEGIN
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='worker_identity_host_anchor_guard';
 IF h<>'f2923857223a80e2d8a4445f24f689096c59e872941db5c858fd312b8b2675a7' THEN RAISE EXCEPTION 'agent_host_guard_legacy_drift'; END IF;
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_catalog';
 IF h<>'b5fb2e490f0f07abba29bf7d1cb1a5a3a7e3af9c1a766e7543b0003e8aa0580c' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_drift'; END IF;
END $check$;
CREATE TABLE bootstrap_v3_catalog_manifest_v3 (id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(id),record JSONB NOT NULL);
CREATE OR REPLACE FUNCTION worker_identity_host_anchor_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 UPDATE ready_source_fence SET revision=revision+1 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'worker_identity_writer_unfenced'; END IF;
 -- Preserve even unadopted anchors; delete/reinsert must not turn legacy into
 -- a falsely new birth under the same canonical host ID.
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'worker_identity_anchor_immutable'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id)
 THEN RAISE EXCEPTION 'worker_identity_anchor_immutable'; END IF;
 IF TG_OP='INSERT' THEN NEW.lifecycle_birth_xid:=pg_current_xact_id()::text; END IF;
 IF TG_OP='UPDATE' AND NEW.lifecycle_birth_xid IS DISTINCT FROM OLD.lifecycle_birth_xid
 THEN RAISE EXCEPTION 'worker_identity_birth_immutable'; END IF;
 IF TG_OP<>'INSERT' AND EXISTS(SELECT 1 FROM worker_identity_lifecycle WHERE kind='host' AND subject_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'worker_identity_anchor_immutable'; END IF;
  IF (to_jsonb(OLD)-'last_seen_at'-'updated_at'-'status'-'name'-'platform'-'capabilities'-'application_slugs'-'metadata') IS DISTINCT FROM (to_jsonb(NEW)-'last_seen_at'-'updated_at'-'status'-'name'-'platform'-'capabilities'-'application_slugs'-'metadata')
   OR (OLD.status::text='disabled') IS DISTINCT FROM (NEW.status::text='disabled')
  THEN RAISE EXCEPTION 'worker_identity_authority_requires_lifecycle'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE OR REPLACE FUNCTION bootstrap_v3_catalog() RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $$
DECLARE manifest JSONB;expected JSONB;actual JSONB;n INT;BEGIN
 SELECT record INTO manifest FROM bootstrap_v3_catalog_manifest_v3 WHERE id;
 PERFORM bootstrap_v3_assert(manifest IS NOT NULL AND (SELECT count(*) FROM bootstrap_v3_catalog_manifest_v3)=1,'catalog_manifest');
 FOR expected IN SELECT value FROM jsonb_array_elements(manifest->'functions') LOOP
  SELECT count(*),jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'result',p.prorettype::regtype::text,
   'language',l.lanname,'volatility',p.provolatile::text,'defaults',pg_get_expr(p.proargdefaults,0),'hash',encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex'),
   'enabled',nsp.nspname='public' AND p.prokind='f' AND NOT p.prosecdef AND p.proconfig IS NULL AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'))
  INTO n,actual FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.proname=expected->>'name';
  PERFORM bootstrap_v3_assert(n=1 AND actual->0=expected||jsonb_build_object('enabled',true),'function_catalog');
 END LOOP;
 FOR expected IN SELECT value FROM jsonb_array_elements(manifest->'triggers') LOOP
  SELECT count(*),jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'function',p.proname,'kind',t.tgtype::int,'deferred',t.tgdeferrable,
   'enabled',t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal
    AND (t.tgconstraint<>0)=t.tgdeferrable AND t.tginitdeferred=t.tgdeferrable AND ns.nspname='public' AND pn.nspname='public'
    AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype))
  INTO n,actual FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace
  JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
  WHERE c.relname=expected->>'table' AND t.tgname=expected->>'name';
  PERFORM bootstrap_v3_assert(n=1 AND actual->0=expected||jsonb_build_object('enabled',true),'trigger_catalog');
 END LOOP;
 -- Extra source triggers can change ordering or manufacture audit evidence.
 PERFORM bootstrap_v3_assert(NOT EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace
  WHERE ns.nspname='public' AND NOT t.tgisinternal AND c.relname IN (SELECT jsonb_array_elements_text(manifest->'exactTriggerTables'))
  AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(manifest->'triggers') x WHERE x->>'table'=c.relname AND x->>'name'=t.tgname)),'extra_source_trigger');
 FOR expected IN SELECT value FROM jsonb_array_elements(manifest->'columns') LOOP
  SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'generated',a.attgenerated::text) ORDER BY a.attnum) INTO actual
  FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace
  WHERE ns.nspname='public' AND c.relname=expected->>'table' AND a.attnum>0 AND NOT a.attisdropped AND c.relkind='r';
  PERFORM bootstrap_v3_assert(actual=expected->'columns','writer_schema');
 END LOOP;
 FOR expected IN SELECT value FROM jsonb_array_elements(manifest->'foreignKeys') LOOP
  SELECT count(*) INTO n FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid JOIN pg_namespace cn ON cn.oid=child.relnamespace
   JOIN pg_class parent ON parent.oid=c.confrelid JOIN pg_namespace pn ON pn.oid=parent.relnamespace
  WHERE c.contype='f' AND cn.nspname='public' AND pn.nspname='public' AND child.relname=expected->>'table' AND parent.relname=expected->>'target'
   AND c.convalidated AND NOT c.condeferrable AND NOT c.condeferred AND c.confdeltype='r' AND c.confupdtype='a' AND c.confmatchtype='s'
   AND to_jsonb(ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord))=expected->'columns'
   AND to_jsonb(ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord))=expected->'targetColumns';
  PERFORM bootstrap_v3_assert(n=1,'foreign_key_catalog');
 END LOOP;
 RETURN true;
END $$;
DO $manifest$ DECLARE old_record JSONB;new_record JSONB;new_functions JSONB;new_triggers JSONB;BEGIN
 SELECT record INTO old_record FROM bootstrap_v3_catalog_manifest_v2 WHERE id;
 IF old_record IS NULL OR old_record->>'version'<>'bootstrap-v3-catalog-v2' OR jsonb_array_length(old_record->'functions')<>177 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v2_manifest_invalid'; END IF;
 WITH correction(name,hash) AS (VALUES
  ('worker_identity_host_anchor_guard','5f1319d9a9dbda332c2e42560eb26e0c34c3e833fe5f64d1dcf166914cf1c6ae'),
  ('bootstrap_v3_catalog','eec8e201c2ba17c972b1c51ebb8ac6c0003a89c0cd776eaf0a757cfb6d6dbf98')
 ) SELECT jsonb_agg(CASE WHEN correction.hash IS NULL THEN f.value ELSE jsonb_set(f.value,'{hash}',to_jsonb(correction.hash)) END ORDER BY f.ordinality) INTO new_functions
 FROM jsonb_array_elements(old_record->'functions') WITH ORDINALITY AS f(value,ordinality) LEFT JOIN correction ON correction.name=f.value->>'name';
 new_triggers:=old_record->'triggers';
 new_record:=jsonb_set(old_record,'{version}',to_jsonb('bootstrap-v3-catalog-v3'::text));
 new_record:=jsonb_set(new_record,'{functions}',new_functions);
 new_record:=jsonb_set(new_record,'{triggers}',new_triggers||'[{"table":"bootstrap_v3_catalog_manifest_v3","name":"bootstrap_v3_manifest_v3_immutable","function":"bootstrap_v3_immutable","kind":62,"deferred":false}]'::jsonb);
 new_record:=jsonb_set(new_record,'{columns}',old_record->'columns'||'[{"table":"bootstrap_v3_catalog_manifest_v3","columns":[{"name":"id","type":"boolean","generated":""},{"name":"record","type":"jsonb","generated":""}]}]'::jsonb);
 new_record:=jsonb_set(new_record,'{exactTriggerTables}',old_record->'exactTriggerTables'||'["bootstrap_v3_catalog_manifest_v3"]'::jsonb);
 INSERT INTO bootstrap_v3_catalog_manifest_v3(id,record) VALUES(true,new_record);
END $manifest$;
CREATE TRIGGER bootstrap_v3_manifest_v3_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON bootstrap_v3_catalog_manifest_v3 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_v3_immutable();
