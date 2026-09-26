// Forward-only correction to the already applied migration-87 catalog.
import {v3CatalogManifest} from './bootstrap-v3-backend-pins';
export const v3CatalogV2Hashes={
    "decision_authority_source_changed":"e2c56ee270f29863e9a8d6b3a8e47734d8236e856ea7d8d16c04db9b6fd300f4",
    "decision_history_guard":"011d157796e7e58f6ddd6ca688db0af1aa0b0a5886ebb2c60df408ffc88863ee",
    "decision_impact":"d2ea5be1725549fbdfbcf76565971c1dea0ff2125a4bf446cee310570bea3cfd",
    "bootstrap_v3_catalog":"b5fb2e490f0f07abba29bf7d1cb1a5a3a7e3af9c1a766e7543b0003e8aa0580c",
    "bootstrap_v3_evidence":"48515daaa07f80b504fef6fbddbeb1ed097b35f80bdb629821aa342056bf09bf",
    "bootstrap_v3_write":"a4c83119f4fee359d0115eaef123c24d6b8bcd034e6a167109c292a2d3f0160c"
} as const;
export const v3CatalogV2Manifest={...v3CatalogManifest,version:'bootstrap-v3-catalog-v2',
 functions:v3CatalogManifest.functions.map(f=>({...f,hash:v3CatalogV2Hashes[f.name as keyof typeof v3CatalogV2Hashes]??f.hash})),
 triggers:[...v3CatalogManifest.triggers,{"table":"bootstrap_v3_catalog_manifest_v2","name":"bootstrap_v3_manifest_v2_immutable","function":"bootstrap_v3_immutable","kind":62,"deferred":false}],
 columns:[...v3CatalogManifest.columns,{"table":"bootstrap_v3_catalog_manifest_v2","columns":[{"name":"id","type":"boolean","generated":""},{"name":"record","type":"jsonb","generated":""}]}],
 exactTriggerTables:[...v3CatalogManifest.exactTriggerTables,'bootstrap_v3_catalog_manifest_v2']} as const;
