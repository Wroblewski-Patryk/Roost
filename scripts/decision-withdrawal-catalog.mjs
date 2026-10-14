import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';

const migrationPath='prisma/migrations/20261014010000_g24c_decision_withdrawal/migration.sql';
const pinsPath='src/modules/api-keys/bootstrap-v3-catalog-v4-pins.ts';
const predecessorPath='prisma/migrations/20260927010000_agent_host_runtime_declaration/migration.sql';
const marker='-- Continue below with the version-four immutable bootstrap catalog.';
const sha=value=>createHash('sha256').update(value).digest('hex');
const q=value=>"'"+value.replaceAll("'","''")+"'";
const source=readFileSync(migrationPath,'utf8').replaceAll('\r','');
assert.equal(source.split(marker).length,2,'one catalog marker');
const prefix=source.split(marker)[0];
const body=name=>{
 const match=prefix.match(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${name}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`));
 assert.ok(match,`missing function ${name}`);return match[1];
};
const migrationBody=(migration,name)=>{
 const source=readFileSync(`prisma/migrations/${migration}/migration.sql`,'utf8').replaceAll('\r','');
 const match=source.match(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${name}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`));
 assert.ok(match,`missing ${name} in ${migration}`);return match[1];
};
const newFunctionMeta=[
 ['decision_withdrawal_immutable','','trigger','plpgsql','v'],
 ['decision_withdrawal_insert_guard','','trigger','plpgsql','v'],
 ['decision_withdrawal_serial_guard','','trigger','plpgsql','v'],
 ['decision_withdrawal_effects','','trigger','plpgsql','v'],
 ['decision_withdraw_pending_v1','w uuid, d uuid, expected_request_hash text, owner uuid, request uuid, reason text','record','plpgsql','v'],
 ['decision_pending_version_before_authority_interviews','t uuid','text','sql','s'],
 ['decision_admission_required','t uuid, op text','text[]','plpgsql','s'],
 ['task_admission_independent','t uuid, u uuid','boolean','sql','s'],
 ['task_admission_view','t uuid, op text','jsonb','plpgsql','s'],
 ['decision_authority_invalidate_before_interviews','w uuid','void','plpgsql','v'],
 ['application_takeover_decision_guard','','trigger','plpgsql','v','20261004003000_application_takeover_baseline'],
 ['g9_capture_source_body','','trigger','plpgsql','v','20261011010000_task_source_scope_and_history'],
 ['immutable_human_task_scope','','trigger','plpgsql','v','20261011210000_g16a_scoped_human_task_access']
];
const replacements={decision_state:sha(body('decision_state')),
 decision_authority_task_current:sha(body('decision_authority_task_current')),
 agent_credential_guard:sha(migrationBody('20261001010000_governed_release','agent_credential_guard')),
 task_capability_base:sha(migrationBody('20261013193000_g24c_information_agent_review','task_capability_base')),
 task_risk_sources:sha(migrationBody('20261013223000_g24c_verifier_qualification','task_risk_sources'))};
assert.equal(replacements.agent_credential_guard,'7cdf90276ace2932c5b9800fe3727cbfcca9b8bf5278d15d02dafbca9837e4b9');
assert.equal(replacements.task_capability_base,'9b56594176e9c68bd0904b70b38306788c90b89a64794d87e4c08439adabcbb0');
assert.equal(replacements.task_risk_sources,'bc0375ede3207414036e134ec8850dd912360059273db073630af6e8ef427225');
const addedFunctions=newFunctionMeta.map(([name,args,result,language,volatility,migration])=>({name,args,defaults:null,result,language,volatility,hash:sha(migration?migrationBody(migration,name):body(name))}));
const predecessor=readFileSync(predecessorPath,'utf8').replaceAll('\r','');
const oldCatalog=predecessor.match(/CREATE OR REPLACE FUNCTION bootstrap_v3_catalog\(\) RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS \$\$([\s\S]*?)\$\$;/)?.[1];
assert.ok(oldCatalog,'v3 catalog function');
assert.equal(sha(oldCatalog),'eec8e201c2ba17c972b1c51ebb8ac6c0003a89c0cd776eaf0a757cfb6d6dbf98','v3 catalog immutable');
const fence=` PERFORM bootstrap_v3_assert(NOT EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid='decision_revisions'::regclass AND c.conname='decision_revisions_supersedes_id_key')
  AND EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid='decision_withdrawals'::regclass AND c.conname='decision_withdrawals_decision_id_key'
   AND c.contype='u' AND pg_get_constraintdef(c.oid)='UNIQUE (decision_id)')
  AND EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid='decision_withdrawals'::regclass AND c.conname='decision_withdrawals_workspace_id_request_id_key'
   AND c.contype='u' AND pg_get_constraintdef(c.oid)='UNIQUE (workspace_id, request_id)')
  AND EXISTS(SELECT 1 FROM pg_indexes i WHERE i.schemaname='public' AND i.tablename='decision_revisions' AND i.indexname='decision_revisions_predecessor_lookup'
   AND i.indexdef='CREATE INDEX decision_revisions_predecessor_lookup ON public.decision_revisions USING btree (workspace_id, supersedes_id)')
  AND NOT EXISTS(SELECT 1 FROM decision_revisions r WHERE r.supersedes_id IS NOT NULL AND decision_state(r.decision_id)<>'withdrawn'
   GROUP BY r.workspace_id,r.supersedes_id HAVING count(*)>1),'decision_successor_fence');
`;
const newCatalog=oldCatalog.replaceAll('bootstrap_v3_catalog_manifest_v3','bootstrap_v3_catalog_manifest_v4').replace(' RETURN true;\nEND ',fence+' RETURN true;\nEND ');
assert.notEqual(newCatalog,oldCatalog);
assert.ok(newCatalog.includes('decision_successor_fence'));
replacements.bootstrap_v3_catalog=sha(newCatalog);

const triggers=[
 ['decision_revisions','a_decision_withdrawal_revision_fence','decision_withdrawal_serial_guard',7],
 ['decision_impact_previews','a_decision_withdrawal_preview_fence','decision_withdrawal_serial_guard',7],
 ['decision_acceptances','a_decision_withdrawal_acceptance_fence','decision_withdrawal_serial_guard',7],
 ['decision_withdrawals','decision_withdrawal_insert_guard','decision_withdrawal_insert_guard',7],
 ['decision_withdrawals','decision_withdrawal_immutable','decision_withdrawal_immutable',27],
 ['decision_withdrawals','decision_withdrawal_no_truncate','decision_withdrawal_immutable',34],
 ['decision_withdrawals','decision_withdrawal_ready_fence','ready_source_lock',6],
 ['decision_withdrawals','decision_withdrawal_effects','decision_withdrawal_effects',5],
 // Preview triggers predate v3, but this is now an exact source table.
 ['decision_impact_previews','aaa_proof_source_fence','bootstrap_proof_source_lock',30],
 ['decision_impact_previews','decision_history_guard','decision_history_guard',31],
 ['decision_impact_previews','proof_source_no_truncate','bootstrap_proof_immutable',34],
 ['decision_impact_previews','aa_decision_attestation_fence','decision_attestation_lock',30],
 ['decision_impact_previews','decision_attestation_no_truncate','decision_attestation_immutable',34],
 ['decision_impact_previews','zz_decision_attestation_audit','decision_attestation_audit',29],
 ['decision_revisions','a0_application_takeover_revision','application_takeover_decision_guard',7],
 ['decision_acceptances','a0_application_takeover_acceptance','application_takeover_decision_guard',7],
 ['decisions','g9_source_body_history','g9_capture_source_body',29],
 ['workspace_memberships','workspace_membership_scope_immutable','immutable_human_task_scope',19],
 ['bootstrap_v3_catalog_manifest_v4','bootstrap_v3_manifest_v4_immutable','bootstrap_v3_immutable',62]
].map(([table,name,func,kind])=>({table,name,function:func,kind,deferred:false}));
const ledgerColumns=['id','workspace_id','decision_id','predecessor_id','proposal_request_hash','owner_user_id','request_id','reason','withdrawn_at'];
const ledgerTypes=['uuid','uuid','uuid','uuid','text','uuid','uuid','text','timestamp with time zone'];
const columns=[{table:'decision_withdrawals',columns:ledgerColumns.map((name,i)=>({name,type:ledgerTypes[i],generated:''}))},
 {table:'bootstrap_v3_catalog_manifest_v4',columns:[{name:'id',type:'boolean',generated:''},{name:'record',type:'jsonb',generated:''}]}];
const foreignKeys=[['decision_withdrawals','workspaces','workspace_id'],['decision_withdrawals','decision_revisions','decision_id'],
 ['decision_withdrawals','decisions','predecessor_id'],['decision_withdrawals','users','owner_user_id']]
 .map(([table,target,column])=>({table,target,columns:[column],targetColumns:[target==='decision_revisions'?'decision_id':'id']}));
const exactTables=['decision_withdrawals','decision_impact_previews','bootstrap_v3_catalog_manifest_v4'];
const pins=`// Forward-only G24c catalog. Applied v1-v3 manifests remain immutable.\n`+
`import {v3CatalogV3Manifest} from './bootstrap-v3-catalog-v3-pins';\n`+
`export const v3CatalogV4Hashes=${JSON.stringify(replacements,null,2)} as const;\n`+
`export const v3CatalogV4AddedFunctions=${JSON.stringify(addedFunctions,null,2)} as const;\n`+
`export const v3CatalogV4Manifest={...v3CatalogV3Manifest,version:'bootstrap-v3-catalog-v4',\n`+
` functions:[...v3CatalogV3Manifest.functions.map(f=>({...f,hash:v3CatalogV4Hashes[f.name as keyof typeof v3CatalogV4Hashes]??f.hash})),...v3CatalogV4AddedFunctions],\n`+
` triggers:[...v3CatalogV3Manifest.triggers,...${JSON.stringify(triggers)}],\n`+
` columns:[...v3CatalogV3Manifest.columns,...${JSON.stringify(columns)}],\n`+
` foreignKeys:[...v3CatalogV3Manifest.foreignKeys,...${JSON.stringify(foreignKeys)}],\n`+
` exactTriggerTables:[...v3CatalogV3Manifest.exactTriggerTables,...${JSON.stringify(exactTables)}]} as const;\n`;
const rows=Object.entries(replacements).map(([name,hash])=>`  (${q(name)},${q(hash)})`).join(',\n');
const migrationTail=`-- The v3 catalog is an immutable historical record; require its exact installed source.\n`+
`DO $check$ DECLARE h TEXT;BEGIN\n SELECT encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') INTO h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='bootstrap_v3_catalog';\n IF h<>'eec8e201c2ba17c972b1c51ebb8ac6c0003a89c0cd776eaf0a757cfb6d6dbf98' THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v3_drift';END IF;\nEND $check$;\n`+
`CREATE TABLE bootstrap_v3_catalog_manifest_v4(id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(id),record JSONB NOT NULL);\n`+
`DO $catalog$ DECLARE definition TEXT;previous TEXT;BEGIN\n SELECT replace(p.prosrc,chr(13),'') INTO definition FROM pg_proc p WHERE p.oid='bootstrap_v3_catalog()'::regprocedure;\n IF position('bootstrap_v3_catalog_manifest_v3' IN definition)=0 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v3_drift';END IF;\n definition:=replace(definition,'bootstrap_v3_catalog_manifest_v3','bootstrap_v3_catalog_manifest_v4');\n previous:=definition;definition:=replace(definition,' RETURN true;\nEND ',${q(fence+' RETURN true;\nEND ')});\n IF definition=previous OR encode(sha256(convert_to(definition,'UTF8')),'hex')<>${q(replacements.bootstrap_v3_catalog)} THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v4_recipe_invalid';END IF;\n EXECUTE 'CREATE OR REPLACE FUNCTION bootstrap_v3_catalog() RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE AS $function$'||definition||'$function$';\nEND $catalog$;\n`+
`DO $manifest$ DECLARE old_record JSONB;new_record JSONB;updated_functions JSONB;BEGIN\n`+
` SELECT record INTO old_record FROM bootstrap_v3_catalog_manifest_v3 WHERE id;\n IF old_record IS NULL OR old_record->>'version'<>'bootstrap-v3-catalog-v3' OR jsonb_array_length(old_record->'functions')<>177 THEN RAISE EXCEPTION 'bootstrap_v3_catalog_v3_manifest_invalid';END IF;\n`+
` WITH correction(name,hash) AS (VALUES\n${rows}\n) SELECT jsonb_agg(CASE WHEN correction.hash IS NULL THEN f.value ELSE jsonb_set(f.value,'{hash}',to_jsonb(correction.hash)) END ORDER BY f.ordinality) INTO updated_functions\n FROM jsonb_array_elements(old_record->'functions') WITH ORDINALITY AS f(value,ordinality) LEFT JOIN correction ON correction.name=f.value->>'name';\n`+
` new_record:=jsonb_set(old_record,'{version}',to_jsonb('bootstrap-v3-catalog-v4'::text));\n`+
` new_record:=jsonb_set(new_record,'{functions}',updated_functions||${q(JSON.stringify(addedFunctions))}::jsonb);\n`+
` new_record:=jsonb_set(new_record,'{triggers}',old_record->'triggers'||${q(JSON.stringify(triggers))}::jsonb);\n`+
` new_record:=jsonb_set(new_record,'{columns}',old_record->'columns'||${q(JSON.stringify(columns))}::jsonb);\n`+
` new_record:=jsonb_set(new_record,'{foreignKeys}',old_record->'foreignKeys'||${q(JSON.stringify(foreignKeys))}::jsonb);\n`+
` new_record:=jsonb_set(new_record,'{exactTriggerTables}',old_record->'exactTriggerTables'||${q(JSON.stringify(exactTables))}::jsonb);\n`+
` INSERT INTO bootstrap_v3_catalog_manifest_v4(id,record) VALUES(true,new_record);\nEND $manifest$;\n`+
`CREATE TRIGGER bootstrap_v3_manifest_v4_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON bootstrap_v3_catalog_manifest_v4 FOR EACH STATEMENT EXECUTE FUNCTION bootstrap_v3_immutable();\n`;
const migration=prefix+marker+'\n'+migrationTail+'\nCOMMIT;\n';
if(process.argv.includes('--write')){writeFileSync(migrationPath,migration);writeFileSync(pinsPath,pins);}
else {assert.equal(source,migration,'migration generated text');assert.equal(readFileSync(pinsPath,'utf8').replaceAll('\r',''),pins,'v4 pins generated text');}
process.stdout.write(JSON.stringify({migrationPath,pinsPath,replacements,addedFunctions:addedFunctions.length,triggers:triggers.length,catalogHash:replacements.bootstrap_v3_catalog})+'\n');
