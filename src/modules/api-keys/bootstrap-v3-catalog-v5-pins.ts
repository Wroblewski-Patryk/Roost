// Forward-only expired Worker rotation withdrawal catalog. The v4 manifest
// remains an immutable record of the already applied G24c migration.
import {v3CatalogV4Manifest} from './bootstrap-v3-catalog-v4-pins';

export const v3CatalogV5Hashes={
  decision_withdrawal_insert_guard:'e4a67df59415f4bb1b1783d7e4b0f2f57c8789793ed0562fd19dba14752d4367',
  decision_withdrawal_effects:'202e1bd1a825978fd911653c72a027fb6b059bb00a7ac7044e47bad01cbbbf62',
  bootstrap_v3_catalog:'b694aaac95b4eb3ab827678d5a60fc8c4fd53647710d11154c862f1b14b9dc1e'
} as const;

export const v3CatalogV5AddedFunctions=[
  {name:'decision_expired_worker_rotation_preview',args:'w uuid, d uuid',defaults:null,result:'jsonb',language:'plpgsql',volatility:'v',hash:'5200ee987aaec9da3d4abc7786262379243ec838411c1b3ff967625376603b1e'},
  {name:'decision_withdraw_expired_worker_rotation_v1',args:'w uuid, d uuid, expected_request_hash text, owner uuid, request uuid, reason text, expected_preview_digest text',defaults:null,result:'record',language:'plpgsql',volatility:'v',hash:'93281682f033c4db7543aa56325bfac80a2db7bcf397ba7a27a3ada99d3699aa'}
] as const;

export const v3CatalogV5Manifest={...v3CatalogV4Manifest,version:'bootstrap-v3-catalog-v5',
 functions:[...v3CatalogV4Manifest.functions.map(f=>({...f,
  hash:v3CatalogV5Hashes[f.name as keyof typeof v3CatalogV5Hashes]??f.hash})),...v3CatalogV5AddedFunctions],
 columns:[...v3CatalogV4Manifest.columns.map(c=>c.table==='decision_withdrawals'?{...c,columns:[...c.columns,
  {name:'kind',type:'text',generated:''},{name:'impact_digest',type:'text',generated:''}]}:c),
  {table:'bootstrap_v3_catalog_manifest_v5',columns:[{name:'id',type:'boolean',generated:''},{name:'record',type:'jsonb',generated:''}]}],
 triggers:[...v3CatalogV4Manifest.triggers,
  {table:'bootstrap_v3_catalog_manifest_v5',name:'bootstrap_v3_manifest_v5_immutable',function:'bootstrap_v3_immutable',kind:62,deferred:false}],
 exactTriggerTables:[...v3CatalogV4Manifest.exactTriggerTables,'bootstrap_v3_catalog_manifest_v5']
} as const;
