// Independent protocol oracle for source tests, not a SQL implementation or
// persistence substitute. Native trigger/receipt ordering still needs a DB run.
export type EpochProof={epoch:number;id:string;ledger:'attestation'|'lifecycle';table:string;row:string;
 scope:string;phase:'key'|'auth'|'attest'|'authority'|'start';writer:string;digest:string;actualDigest:string;event:boolean};
export function lineageOracle(p:{anchor:number;attest:number;tail:number;through:number;scope:string;writer:string;optedIn:boolean;current:boolean;proofs:EpochProof[]}){
 if(!p.optedIn||!p.current||p.attest<=p.anchor||p.tail<p.attest||p.through<p.tail||p.through-p.anchor>4096)return false;
 const rows=p.proofs.filter(r=>r.epoch>p.anchor&&r.epoch<=p.through),epochs=new Set<number>(),ids=new Set<string>(),objects=new Set<string>();
 for(const r of rows){const object=r.ledger+':'+r.table+':'+r.row;
  if(!r.event||r.digest!==r.actualDigest||r.scope!==p.scope||ids.has(r.id)||objects.has(object))return false;
  if(r.phase==='start'){if(r.writer!==p.writer||r.epoch<=p.tail)return false;}
  else if(r.ledger!=='attestation'||r.epoch>(r.phase==='authority'?p.tail:p.attest))return false;
  ids.add(r.id);objects.add(object);epochs.add(r.epoch);
 }
 return epochs.size===p.through-p.anchor;
}
