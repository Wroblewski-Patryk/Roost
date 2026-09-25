import type {AttestationDb as Db} from './decision-attestation-sql';
import {proofEqual,denyProof} from './bootstrap-proof-key-contract';
import {v3CatalogManifest,v3UpgradePins} from './bootstrap-v3-backend-pins';

type Pin={hash:string;function?:string;name?:string};
export function v3Pinned<T extends Pin>(pin:T,upgraded:boolean):T {
 const name=pin.function??pin.name;
 const version=name&&Object.hasOwn(v3UpgradePins,name)?v3UpgradePins[name as keyof typeof v3UpgradePins]:null;
 return upgraded&&version?{...pin,hash:version.hash}:pin;
}

// No Prisma construction, transaction wrapper, V3IssuancePorts or defaults.
// Legacy readers recognize a new hash only after validating the ENTIRE native
// catalog and its immutable migration manifest on the same supplied Db.
export async function requireV3BackendCatalog(db:Db){
 const expected=v3CatalogManifest.functions;
 const functions=await db.$queryRaw<any[]>`/* v3 backend functions */ SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,
  p.prorettype::regtype::text AS result,l.lanname AS language,p.provolatile::text AS volatility,pg_get_expr(p.proargdefaults,0) AS defaults,
  encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
  (n.nspname='public' AND p.prokind='f' AND NOT p.prosecdef AND p.proconfig IS NULL AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u') AS enabled
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.proname=ANY(${expected.map(f=>f.name)}::text[])`;
 const byName=new Map(functions.map(({enabled,...f})=>[f.name,{enabled,row:f}]));
 if(functions.length!==expected.length||byName.size!==functions.length||!expected.every(e=>{
  const actual=byName.get(e.name);return actual?.enabled===true&&proofEqual(e,actual.row);
 }))denyProof();
 const manifest=await db.$queryRaw<any[]>`/* v3 backend manifest */ SELECT id,record FROM bootstrap_v3_catalog_manifest`;
 if(manifest.length!==1||manifest[0].id!==true||!proofEqual(manifest[0].record,v3CatalogManifest))denyProof();
 // Function source and manifest have already been checked independently.
 // The pinned SQL now checks trigger/FK/schema attributes, extra source triggers
 // and its complete function closure, including its own function definition.
 const catalog=await db.$queryRaw<any[]>`/* v3 backend catalog */ SELECT bootstrap_v3_catalog() AS valid,
  current_setting('session_replication_role')='origin' AND current_schemas(true)=ARRAY['pg_catalog','public']::name[]
  AND current_setting('transaction_isolation') IN ('serializable','repeatable read') AS bound`;
 if(catalog.length!==1||catalog[0].valid!==true||catalog[0].bound!==true)denyProof();
}
export async function recognizeV3Backend(db:Db,rows:readonly Pin[]):Promise<boolean>{
 const upgraded=rows.some(r=>{const name=r.function??r.name;
  return !!name&&Object.hasOwn(v3UpgradePins,name)&&v3UpgradePins[name as keyof typeof v3UpgradePins].hash===r.hash;
 });
 if(upgraded)await requireV3BackendCatalog(db);
 return upgraded;
}
