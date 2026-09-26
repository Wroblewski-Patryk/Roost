import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {v3CatalogManifest} from '../src/modules/api-keys/bootstrap-v3-backend-pins';
import {buildV3Backend,migration87} from './check-bootstrap-v3-backend';

const migration88='prisma/migrations/20260926010000_bootstrap_v3_catalog_correction/migration.sql';
const pins='src/modules/api-keys/bootstrap-v3-catalog-v2-pins.ts';
const oldHash='bafec8af6370104e12a1d3c1163441448cbcef3a773624a2ef6133aa5dea2a7f';
const corrections={
  decision_authority_source_changed:'e2c56ee270f29863e9a8d6b3a8e47734d8236e856ea7d8d16c04db9b6fd300f4',
  decision_history_guard:'011d157796e7e58f6ddd6ca688db0af1aa0b0a5886ebb2c60df408ffc88863ee',
  decision_impact:'d2ea5be1725549fbdfbcf76565971c1dea0ff2125a4bf446cee310570bea3cfd'
} as const;
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
const sql=readFileSync(migration87,'utf8');
assert.equal(sha(sql),oldHash,'Applied migration 87 is immutable');
buildV3Backend(); // pins the 86 earlier migrations and migration-87 source recipe
const match=sql.replace(/\r/g,'').match(/CREATE FUNCTION bootstrap_v3_catalog\(\) RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS \$\$([\s\S]*?)\$\$;/);
assert.ok(match,'Migration 87 catalog body missing');
const oldBody=match[1];
assert.equal(sha(oldBody),'6942747c342aa78272fae0d0da033974984363a6aefd526cf5d4166c09bbe541');
const body=oldBody.replaceAll('bootstrap_v3_catalog_manifest','bootstrap_v3_catalog_manifest_v2');
assert.notEqual(body,oldBody);
const catalogHash=sha(body);
const evidenceMatch=sql.replace(/\r/g,'').match(/CREATE FUNCTION bootstrap_v3_evidence\(op UUID,through_phase TEXT,observed_frame JSONB\) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS \$\$([\s\S]*?)\$\$;/);
assert.ok(evidenceMatch,'Migration 87 evidence body missing');
const oldEvidence=evidenceMatch[1];
const oldEvidenceHash=sha(oldEvidence);
let evidence=oldEvidence.replace('phase TEXT;r bootstrap_v3_receipts;BEGIN','phase TEXT;receipt_item bootstrap_v3_receipts;BEGIN')
 .replace('jsonb_agg(r.record ORDER BY convert_to(r.id::text,\'UTF8\'))','jsonb_agg(receipt_row.record ORDER BY convert_to(receipt_row.id::text,\'UTF8\'))')
 .replaceAll('FROM bootstrap_v3_receipts r JOIN bootstrap_v3_mutations m ON m.sequence=r.mutation_sequence',
  'FROM bootstrap_v3_receipts receipt_row JOIN bootstrap_v3_mutations m ON m.sequence=receipt_row.mutation_sequence')
 .replace('FOR r IN SELECT r.*','FOR receipt_item IN SELECT receipt_row.*')
 .replace('bootstrap_v3_native_receipt(r)','bootstrap_v3_native_receipt(receipt_item)')
 .replace('WHERE id=r.event_id','WHERE id=receipt_item.event_id')
 .replace("=r.record->>'nativeEventDigest'","=receipt_item.record->>'nativeEventDigest'")
 .replace("jsonb_agg(r.id ORDER BY convert_to(r.id::text,'UTF8'))","jsonb_agg(receipt_row.id ORDER BY convert_to(receipt_row.id::text,'UTF8'))");
assert.notEqual(evidence,oldEvidence);
assert.ok(!evidence.includes(' r bootstrap_v3_receipts')&&!evidence.includes('r.mutation_sequence')&&!evidence.includes('FOR r IN'));
const evidenceHash=sha(evidence);
const writeMatch=sql.replace(/\r/g,'').match(/CREATE FUNCTION bootstrap_v3_write\(p JSONB,requested_phase TEXT\) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS \$\$([\s\S]*?)\$\$;/);
assert.ok(writeMatch,'Migration 87 writer body missing');
const oldWrite=writeMatch[1],oldWriteHash=sha(oldWrite);
const write=oldWrite.replaceAll(/\bordinal\b/g,'phase_ordinal')
 .replace('bootstrap_v3_phases.phase_ordinal','bootstrap_v3_phases.ordinal')
 .replace('bootstrap_v3_phases(operation_id,phase_ordinal,phase,frame)','bootstrap_v3_phases(operation_id,ordinal,phase,frame)')
 .replace('bootstrap_v3_write.phase_ordinal','phase_ordinal');
assert.notEqual(write,oldWrite);
assert.ok(!write.includes('bootstrap_v3_write.phase_ordinal')&&!write.includes('bootstrap_v3_phases.phase_ordinal'));
const writeHash=sha(write);
const allCorrections={...corrections,bootstrap_v3_catalog:catalogHash,bootstrap_v3_evidence:evidenceHash,bootstrap_v3_write:writeHash};
const trigger={table:'bootstrap_v3_catalog_manifest_v2',name:'bootstrap_v3_manifest_v2_immutable',function:'bootstrap_v3_immutable',kind:62,deferred:false};
const columns={table:'bootstrap_v3_catalog_manifest_v2',columns:[{name:'id',type:'boolean',generated:''},{name:'record',type:'jsonb',generated:''}]};
const source=Object.entries(allCorrections).map(([name,hash])=>`    ${JSON.stringify(name)}:${JSON.stringify(hash)}`).join(',\n');
const pinsContent=`// Forward-only correction to the already applied migration-87 catalog.\nimport {v3CatalogManifest} from './bootstrap-v3-backend-pins';\nexport const v3CatalogV2Hashes={\n${source}\n} as const;\nexport const v3CatalogV2Manifest={...v3CatalogManifest,version:'bootstrap-v3-catalog-v2',\n functions:v3CatalogManifest.functions.map(f=>({...f,hash:v3CatalogV2Hashes[f.name as keyof typeof v3CatalogV2Hashes]??f.hash})),\n triggers:[...v3CatalogManifest.triggers,${JSON.stringify(trigger)}],\n columns:[...v3CatalogManifest.columns,${JSON.stringify(columns)}],\n exactTriggerTables:[...v3CatalogManifest.exactTriggerTables,'bootstrap_v3_catalog_manifest_v2']} as const;\n`;
const q=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const rows=Object.entries(allCorrections).map(([name,hash])=>`  (${q(name)},${q(hash)})`).join(',\n');
const migration=`-- Forward-only repair. Migration 87 was applied in production; never edit it.\n`+
`DO $check$ DECLARE h TEXT; BEGIN\n`+
Object.entries(corrections).map(([name,hash])=>` SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=${q(name)};\n IF h<>${q(hash)} THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_drift'; END IF;\n`).join('')+
` SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_evidence';\n IF h<>${q(oldEvidenceHash)} THEN RAISE EXCEPTION 'bootstrap_v3_evidence_legacy_drift'; END IF;\n`+
` SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_write';\n IF h<>${q(oldWriteHash)} THEN RAISE EXCEPTION 'bootstrap_v3_write_legacy_drift'; END IF;\n`+
` SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_catalog';\n IF h<>'6942747c342aa78272fae0d0da033974984363a6aefd526cf5d4166c09bbe541' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_drift'; END IF;\nEND $check$;\n`+
`CREATE TABLE bootstrap_v3_catalog_manifest_v2 (id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(id),record JSONB NOT NULL);\n`+
`CREATE OR REPLACE FUNCTION bootstrap_v3_evidence(op UUID,through_phase TEXT,observed_frame JSONB) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$${evidence}$$;\n`+
`CREATE OR REPLACE FUNCTION bootstrap_v3_write(p JSONB,requested_phase TEXT) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$${write}$$;\n`+
`CREATE OR REPLACE FUNCTION bootstrap_v3_catalog() RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $$${body}$$;\n`+
`DO $manifest$ DECLARE old_record JSONB;new_record JSONB;new_functions JSONB;BEGIN\n`+
` SELECT record INTO old_record FROM bootstrap_v3_catalog_manifest WHERE id;\n IF old_record IS NULL OR old_record->>'version'<>'bootstrap-v3-catalog-v1' OR jsonb_array_length(old_record->'functions')<>177 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_legacy_manifest_invalid'; END IF;\n`+
` WITH correction(name,hash) AS (VALUES\n${rows}\n) SELECT jsonb_agg(CASE WHEN correction.hash IS NULL THEN f.value ELSE jsonb_set(f.value,'{hash}',to_jsonb(correction.hash)) END ORDER BY f.ordinality) INTO new_functions\n FROM jsonb_array_elements(old_record->'functions') WITH ORDINALITY AS f(value,ordinality) LEFT JOIN correction ON correction.name=f.value->>'name';\n`+
` new_record:=jsonb_set(old_record,'{version}',to_jsonb('bootstrap-v3-catalog-v2'::text));\n new_record:=jsonb_set(new_record,'{functions}',new_functions);\n`+
` new_record:=jsonb_set(new_record,'{triggers}',old_record->'triggers'||${q(JSON.stringify([trigger]))}::jsonb);\n`+
` new_record:=jsonb_set(new_record,'{columns}',old_record->'columns'||${q(JSON.stringify([columns]))}::jsonb);\n`+
` new_record:=jsonb_set(new_record,'{exactTriggerTables}',old_record->'exactTriggerTables'||'["bootstrap_v3_catalog_manifest_v2"]'::jsonb);\n`+
` INSERT INTO bootstrap_v3_catalog_manifest_v2(id,record) VALUES(true,new_record);\nEND $manifest$;\n`+
`CREATE TRIGGER bootstrap_v3_manifest_v2_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON bootstrap_v3_catalog_manifest_v2 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_v3_immutable();\n`;
if(process.argv.includes('--write')){mkdirSync(dirname(migration88),{recursive:true});writeFileSync(migration88,migration);writeFileSync(pins,pinsContent);}
else {assert.equal(readFileSync(migration88,'utf8'),migration);assert.equal(readFileSync(pins,'utf8'),pinsContent);}
process.stdout.write(JSON.stringify({migration87Preserved:true,catalogHash,evidenceHash,writeHash,correctedFunctions:Object.keys(allCorrections).length})+'\n');
