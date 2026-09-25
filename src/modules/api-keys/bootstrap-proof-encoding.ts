import {createHash} from 'node:crypto';

// Source-only v1 binary contract, never a fallback for existing JSON signatures.
// Containers are count-prefixed; scalar bytes are length-prefixed. No JSON parser.
export function proofBytes(value:unknown):Buffer{
 const stack=new Set<object>();let size=0;
 const bytes=(s:string)=>{const b=Buffer.from(s,'utf8');size+=b.length;if(size>131072)throw Error('proof_encoding_denied');return b;};
 const scalar=(tag:string,s:string)=>{const b=bytes(s);return Buffer.concat([bytes(`${tag}${b.length}:`),b]);};
 const text=(s:string)=>{if(s.normalize('NFC')!==s||/[\u0000-\u001f\u007f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(s))throw Error('proof_encoding_denied');return scalar('s',s);};
 const encode=(v:unknown,depth:number):Buffer=>{
  if(depth>32)throw Error('proof_encoding_denied');
  if(v===null)return bytes('n');if(typeof v==='boolean')return bytes(v?'t':'f');
  if(typeof v==='string')return text(v);
  if(typeof v==='number'){if(!Number.isSafeInteger(v)||Object.is(v,-0))throw Error('proof_encoding_denied');return scalar('i',String(v));}
  if(typeof v!=='object'||stack.has(v))throw Error('proof_encoding_denied');
  stack.add(v);try{
   const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(v);
   if(keys.some(k=>typeof k!=='string')||Object.values(descriptors).some(d=>!('value' in d)))throw Error('proof_encoding_denied');
   if(Array.isArray(v)){
    if(Object.getPrototypeOf(v)!==Array.prototype||keys.length!==v.length+1||v.length>4096||
     Array.from({length:v.length},(_,i)=>String(i)).some(k=>!Object.hasOwn(v,k)||!descriptors[k].enumerable))throw Error('proof_encoding_denied');
    return Buffer.concat([bytes(`a${v.length}:`),...Array.from({length:v.length},(_,i)=>encode(descriptors[String(i)].value,depth+1))]);
   }
   if(Object.getPrototypeOf(v)!==Object.prototype||keys.length>4096||Object.values(descriptors).some(d=>!d.enumerable))throw Error('proof_encoding_denied');
   const ordered=(keys as string[]).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)));
   return Buffer.concat([bytes(`o${ordered.length}:`),...ordered.flatMap(k=>[text(k),encode(descriptors[k].value,depth+1)])]);
  }finally{stack.delete(v);}
 };
 return encode(value,0);
}
export const proofDigest=(value:unknown)=>createHash('sha256').update(proofBytes(value)).digest('hex');
