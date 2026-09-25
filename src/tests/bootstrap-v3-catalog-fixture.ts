import {v3CatalogManifest,v3UpgradePins} from '../modules/api-keys/bootstrap-v3-backend-pins';
export function catalogAnswer(sql:string):any[]|undefined {
 if(sql.includes('v3 backend functions'))return structuredClone(v3CatalogManifest.functions).map(f=>({...f,enabled:true}));
 if(sql.includes('v3 backend manifest'))return [{id:true,record:structuredClone(v3CatalogManifest)}];
 if(sql.includes('v3 backend catalog'))return [{valid:true,bound:true}];
 return undefined;
}
// Catalog substitution for the EXISTING legacy transaction fixtures. This is
// not a v3 writer, SQL oracle, Prisma adapter or native qualification model.
export function upgradeLegacyClient(client:any,mutate?:(sql:string,rows:any[])=>void){
 const original=client.$transaction.bind(client);let checks=0;
 client.$transaction=(work:any,...options:any[])=>original(async(db:any)=>{
  const query=db.$queryRaw.bind(db);
  db.$queryRaw=async(parts:TemplateStringsArray,...args:any[])=>{
   const sql=parts.join('?'),catalog=catalogAnswer(sql);
   if(catalog){checks++;mutate?.(sql,catalog);return catalog;}
   const rows=await query(parts,...args);
   return rows.map((r:any)=>{
    const name=r.function??r.name,pin=name&&Object.hasOwn(v3UpgradePins,name)?v3UpgradePins[name as keyof typeof v3UpgradePins]:null;
    return pin&&r.hash===pin.old?{...r,hash:pin.hash}:r;
   });
  };return work(db);
 },...options);
 return ()=>checks;
}
