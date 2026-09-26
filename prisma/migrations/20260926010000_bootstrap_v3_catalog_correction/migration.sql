-- Forward-only repair. Migration 87 was applied in production; never edit it.
DO $check$ DECLARE h TEXT; BEGIN
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='decision_authority_source_changed';
 IF h<>'e2c56ee270f29863e9a8d6b3a8e47734d8236e856ea7d8d16c04db9b6fd300f4' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_drift'; END IF;
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='decision_history_guard';
 IF h<>'011d157796e7e58f6ddd6ca688db0af1aa0b0a5886ebb2c60df408ffc88863ee' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_drift'; END IF;
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='decision_impact';
 IF h<>'d2ea5be1725549fbdfbcf76565971c1dea0ff2125a4bf446cee310570bea3cfd' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_drift'; END IF;
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_evidence';
 IF h<>'97e9dd2008996d6bcf7efbc275c15f4ea711d6d13788a4a1ccac17fcb1140397' THEN RAISE EXCEPTION 'bootstrap_v3_evidence_legacy_drift'; END IF;
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_write';
 IF h<>'249310ccfe3dfee912231e004daea3e837cc7a4e900221bc8d6b37f9013f67ef' THEN RAISE EXCEPTION 'bootstrap_v3_write_legacy_drift'; END IF;
 SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_catalog';
 IF h<>'6942747c342aa78272fae0d0da033974984363a6aefd526cf5d4166c09bbe541' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_drift'; END IF;
END $check$;
CREATE TABLE bootstrap_v3_catalog_manifest_v2 (id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(id),record JSONB NOT NULL);
CREATE OR REPLACE FUNCTION bootstrap_v3_evidence(op UUID,through_phase TEXT,observed_frame JSONB) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE o bootstrap_v3_operations;lo BIGINT;hi BIGINT;mutations JSONB;receipts JSONB;epochs JSONB:='[]';w bootstrap_v3_epochs;ev JSONB;
 claim bootstrap_v3_epoch_claims;body JSONB;previous TEXT;driver UUID;root UUID;members JSONB;rs JSONB;phase TEXT;receipt_item bootstrap_v3_receipts;BEGIN
 SELECT * INTO o FROM bootstrap_v3_operations WHERE id=op;lo:=o.from_fence;hi:=(observed_frame->>'fence')::bigint;previous:=o.anchor->>'digest';
 -- Deliberately no workspace, operation or writer filter on the interval.
 SELECT coalesce(jsonb_agg(record ORDER BY sequence),'[]') INTO mutations FROM bootstrap_v3_mutations WHERE epoch>lo AND epoch<=hi;
 SELECT coalesce(jsonb_agg(receipt_row.record ORDER BY convert_to(receipt_row.id::text,'UTF8')),'[]') INTO receipts
 FROM bootstrap_v3_receipts receipt_row JOIN bootstrap_v3_mutations m ON m.sequence=receipt_row.mutation_sequence WHERE m.epoch>lo AND m.epoch<=hi;
 FOR receipt_item IN SELECT receipt_row.* FROM bootstrap_v3_receipts receipt_row JOIN bootstrap_v3_mutations m ON m.sequence=receipt_row.mutation_sequence WHERE m.epoch>lo AND m.epoch<=hi LOOP
  PERFORM bootstrap_v3_native_receipt(receipt_item);SELECT to_jsonb(e) INTO ev FROM events e WHERE id=receipt_item.event_id;
  PERFORM bootstrap_v3_assert(bootstrap_v3_native_digest(ev)=receipt_item.record->>'nativeEventDigest','native_event_changed');
 END LOOP;
 FOR w IN SELECT * FROM bootstrap_v3_epochs WHERE revision>lo AND revision<=hi ORDER BY revision LOOP
  SELECT * INTO claim FROM bootstrap_v3_epoch_claims WHERE revision=w.revision;
  SELECT to_jsonb(e) INTO ev FROM events e WHERE id=w.event_id;
  IF w.operation_id IS NULL THEN
   -- Unclaimed/foreign evidence remains visible and fails the closed projector.
   epochs:=epochs||jsonb_build_array(jsonb_build_object('unclaimedNativeEpoch',to_jsonb(w),'eventDigest',bootstrap_v3_native_digest(ev)));CONTINUE;
  END IF;
  driver:=bootstrap_v3_id(w.operation_id,'projection:mutation:'||w.slot);
  root:=bootstrap_v3_id(w.operation_id,'projection:mutation:'||bootstrap_v3_root(w.operation_id,w.slot));
  SELECT value->>'phase' INTO phase FROM jsonb_array_elements((SELECT bootstrap_v3_recipe(plan,anchor->'before'->'heads') FROM bootstrap_v3_operations WHERE id=w.operation_id)) WHERE value->>'slot'=w.slot;
  SELECT coalesce(jsonb_agg(record->'id' ORDER BY sequence),'[]') INTO members FROM bootstrap_v3_mutations WHERE epoch=w.revision;
  SELECT coalesce(jsonb_agg(receipt_row.id ORDER BY convert_to(receipt_row.id::text,'UTF8')),'[]') INTO rs FROM bootstrap_v3_receipts receipt_row JOIN bootstrap_v3_mutations m ON m.sequence=receipt_row.mutation_sequence WHERE m.epoch=w.revision;
  body:=jsonb_build_object('id',w.event_id,'operationId',w.operation_id,'writerXid',w.writer_xid,'phase',phase,'revision',w.revision::text,
   'driverId',driver,'rootId',root,'nativeReceiptKey','fence:'||w.revision::text,'nativeReceiptDigest',bootstrap_v3_native_digest(to_jsonb(w)),
   'nativeEventDigest',bootstrap_v3_native_digest(ev),'guard',w.guard,'members',members,'receipts',rs,'memberCount',jsonb_array_length(members),
   'receiptCount',jsonb_array_length(rs),'eventCount',jsonb_array_length(rs),'previousDigest',previous);
  body:=body||jsonb_build_object('digest',bootstrap_proof_digest(jsonb_build_array('roost-bootstrap-v3-epoch-v1',body)));
  previous:=body->>'digest';epochs:=epochs||jsonb_build_array(body);
 END LOOP;
 RETURN jsonb_build_object('version','bootstrap-v3-projection-evidence-v1','anchorDigest',o.anchor->'digest','through',through_phase,'mutations',mutations,'receipts',receipts,'epochs',epochs,'after',observed_frame);
END $$;
CREATE OR REPLACE FUNCTION bootstrap_v3_write(p JSONB,requested_phase TEXT) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE op UUID:=(p->'command'->>'operationId')::uuid;o bootstrap_v3_operations;phase_ordinal INT;slot TEXT;BEGIN
 PERFORM bootstrap_v3_mode(true);PERFORM bootstrap_v3_catalog();
 phase_ordinal:=array_position(ARRAY['reservation','ticket','channel','attempt','link','seal'],requested_phase);
 PERFORM bootstrap_v3_assert(phase_ordinal IS NOT NULL AND pg_trigger_depth()=0,'phase_entry');
 IF phase_ordinal=1 THEN
  INSERT INTO bootstrap_v3_operations(id,workspace_id,attachment_id,writer_xid,plan,plan_digest,anchor,from_fence)
  VALUES(op,(p->'authority'->'attachment'->>'workspaceId')::uuid,(p->'command'->>'attachmentId')::uuid,pg_current_xact_id()::text,p,'', '{}',1);
 ELSE
  SELECT * INTO o FROM bootstrap_v3_operations WHERE id=op;
  PERFORM bootstrap_v3_assert(o.writer_xid=pg_current_xact_id()::text AND o.plan=p AND o.plan_digest=bootstrap_proof_digest(p)
   AND (SELECT count(*) FROM bootstrap_v3_phases WHERE operation_id=op)=phase_ordinal-1,'phase_plan_changed');
  PERFORM bootstrap_v3_assert(bootstrap_v3_check(op,(ARRAY['reservation','ticket','channel','attempt','link','seal'])[phase_ordinal-1])=
   (SELECT frame FROM bootstrap_v3_phases WHERE operation_id=op AND bootstrap_v3_phases.ordinal=phase_ordinal-1),'phase_prefix_changed');
  CASE requested_phase
  WHEN 'ticket' THEN PERFORM bootstrap_v3_insert(op,'ticket');PERFORM bootstrap_v3_insert(op,'ticket-issue');
  WHEN 'channel' THEN PERFORM bootstrap_v3_insert(op,'channel-generation');PERFORM bootstrap_v3_insert(op,'channel-grant');PERFORM bootstrap_v3_insert(op,'channel-history');
  WHEN 'attempt' THEN PERFORM bootstrap_v3_insert(op,'attempt');PERFORM bootstrap_v3_insert(op,'attempt-history');PERFORM bootstrap_v3_insert(op,'ticket-consume');
  WHEN 'link' THEN PERFORM bootstrap_v3_insert(op,'proof-link');
  WHEN 'seal' THEN PERFORM bootstrap_v3_insert(op,'attempt-seal');
  ELSE RAISE EXCEPTION 'bootstrap_v3_phase';END CASE;
 END IF;
 INSERT INTO bootstrap_v3_phases(operation_id,ordinal,phase,frame) VALUES(op,phase_ordinal,requested_phase,'{}');
 RETURN bootstrap_v3_read(op,requested_phase);
END $$;
CREATE OR REPLACE FUNCTION bootstrap_v3_catalog() RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $$
DECLARE manifest JSONB;expected JSONB;actual JSONB;n INT;BEGIN
 SELECT record INTO manifest FROM bootstrap_v3_catalog_manifest_v2 WHERE id;
 PERFORM bootstrap_v3_assert(manifest IS NOT NULL AND (SELECT count(*) FROM bootstrap_v3_catalog_manifest_v2)=1,'catalog_manifest');
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
DO $manifest$ DECLARE old_record JSONB;new_record JSONB;new_functions JSONB;BEGIN
 SELECT record INTO old_record FROM bootstrap_v3_catalog_manifest WHERE id;
 IF old_record IS NULL OR old_record->>'version'<>'bootstrap-v3-catalog-v1' OR jsonb_array_length(old_record->'functions')<>177 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_manifest_invalid'; END IF;
 WITH correction(name,hash) AS (VALUES
  ('decision_authority_source_changed','e2c56ee270f29863e9a8d6b3a8e47734d8236e856ea7d8d16c04db9b6fd300f4'),
  ('decision_history_guard','011d157796e7e58f6ddd6ca688db0af1aa0b0a5886ebb2c60df408ffc88863ee'),
  ('decision_impact','d2ea5be1725549fbdfbcf76565971c1dea0ff2125a4bf446cee310570bea3cfd'),
  ('bootstrap_v3_catalog','b5fb2e490f0f07abba29bf7d1cb1a5a3a7e3af9c1a766e7543b0003e8aa0580c'),
  ('bootstrap_v3_evidence','48515daaa07f80b504fef6fbddbeb1ed097b35f80bdb629821aa342056bf09bf'),
  ('bootstrap_v3_write','a4c83119f4fee359d0115eaef123c24d6b8bcd034e6a167109c292a2d3f0160c')
) SELECT jsonb_agg(CASE WHEN correction.hash IS NULL THEN f.value ELSE jsonb_set(f.value,'{hash}',to_jsonb(correction.hash)) END ORDER BY f.ordinality) INTO new_functions
 FROM jsonb_array_elements(old_record->'functions') WITH ORDINALITY AS f(value,ordinality) LEFT JOIN correction ON correction.name=f.value->>'name';
 new_record:=jsonb_set(old_record,'{version}',to_jsonb('bootstrap-v3-catalog-v2'::text));
 new_record:=jsonb_set(new_record,'{functions}',new_functions);
 new_record:=jsonb_set(new_record,'{triggers}',old_record->'triggers'||'[{"table":"bootstrap_v3_catalog_manifest_v2","name":"bootstrap_v3_manifest_v2_immutable","function":"bootstrap_v3_immutable","kind":62,"deferred":false}]'::jsonb);
 new_record:=jsonb_set(new_record,'{columns}',old_record->'columns'||'[{"table":"bootstrap_v3_catalog_manifest_v2","columns":[{"name":"id","type":"boolean","generated":""},{"name":"record","type":"jsonb","generated":""}]}]'::jsonb);
 new_record:=jsonb_set(new_record,'{exactTriggerTables}',old_record->'exactTriggerTables'||'["bootstrap_v3_catalog_manifest_v2"]'::jsonb);
 INSERT INTO bootstrap_v3_catalog_manifest_v2(id,record) VALUES(true,new_record);
END $manifest$;
CREATE TRIGGER bootstrap_v3_manifest_v2_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON bootstrap_v3_catalog_manifest_v2 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_v3_immutable();
