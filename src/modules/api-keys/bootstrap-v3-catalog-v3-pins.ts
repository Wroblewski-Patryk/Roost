// Forward-only Gate 1 catalog for mutable host runtime declarations.
import {v3CatalogV2Manifest} from './bootstrap-v3-catalog-v2-pins';
export const v3HostGuardHash='5f1319d9a9dbda332c2e42560eb26e0c34c3e833fe5f64d1dcf166914cf1c6ae';
export const v3HostCatalogHash='eec8e201c2ba17c972b1c51ebb8ac6c0003a89c0cd776eaf0a757cfb6d6dbf98';
export const v3CatalogV3Manifest={...v3CatalogV2Manifest,version:'bootstrap-v3-catalog-v3',
 functions:v3CatalogV2Manifest.functions.map(f=>({...f,hash:f.name==='worker_identity_host_anchor_guard'?v3HostGuardHash:f.name==='bootstrap_v3_catalog'?v3HostCatalogHash:f.hash})),
 triggers:[...v3CatalogV2Manifest.triggers,{"table":"bootstrap_v3_catalog_manifest_v3","name":"bootstrap_v3_manifest_v3_immutable","function":"bootstrap_v3_immutable","kind":62,"deferred":false}],
 columns:[...v3CatalogV2Manifest.columns,{"table":"bootstrap_v3_catalog_manifest_v3","columns":[{"name":"id","type":"boolean","generated":""},{"name":"record","type":"jsonb","generated":""}]}],
 exactTriggerTables:[...v3CatalogV2Manifest.exactTriggerTables,'bootstrap_v3_catalog_manifest_v3']} as const;
