'use strict';
// Shape/identity qualification only. Actual namespace/firewall reads are
// performed by installed native code; JSON is never an OS attestation.
const {z}=require('zod'),{createHash}=require('node:crypto');
const hash=z.string().regex(/^[a-f0-9]{64}$/),name=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const ipv4=z.string().refine(v=>/^\d{1,3}(\.\d{1,3}){3}$/.test(v)&&v.split('.').every(x=>String(Number(x))===x&&Number(x)<=255));
const subnet=z.string().refine(v=>{const[a,b]=v.split('/');return ipv4.safeParse(a).success&&/^(2[4-9]|30)$/.test(b??'')&&v===a+'/'+b;});
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const number=v=>v.split('.').reduce((n,x)=>(n*256+Number(x))>>>0,0);
const contains=(cidr,ip)=>{const[a,b]=cidr.split('/'),mask=(0xffffffff<<(32-Number(b)))>>>0;return(number(a)&mask)===(number(ip)&mask)&&((number(a)&mask)>>>0)===number(a);};
const schema=z.object({schemaVersion:z.literal('roost-compose-proxy-network-fence-v1'),observedAt:z.string().datetime(),targetId:name,
 networkId:hash,subnet,proxyId:hash,proxyPid:z.number().int().min(2).max(0x7fffffff),namespaceDigest:hash,
 databaseContainerId:hash,databaseIpv4:ipv4,proxyIpv4:ipv4,port:z.literal(8000),
 ruleComment:z.string().regex(/^roost-release-hold-[a-f0-9]{32}$/),ruleDigest:hash,originalRulesDigest:hash,observedRulesDigest:hash,
 projectNetworkExclusive:z.literal(true),publishedPortsAbsent:z.literal(true),rulePresent:z.literal(true),evidenceDigest:hash}).strict();
function fenceDigest(value){const{evidenceDigest,...body}=value;return digest(body);}
function qualifyFence(value,{targetId,databaseContainerId,now=Date.now(),maxAgeMs=300000}={}){
 const parsed=schema.safeParse(value);if(!parsed.success)throw Error('release_compose_ingress_fence_unproven');const v=parsed.data,t=Date.parse(v.observedAt);
 if(v.targetId!==targetId||v.databaseContainerId!==databaseContainerId||!contains(v.subnet,v.databaseIpv4)||!contains(v.subnet,v.proxyIpv4)
  ||v.databaseIpv4===v.proxyIpv4||v.proxyId===v.databaseContainerId||v.evidenceDigest!==fenceDigest(v)
  ||!Number.isFinite(now)||t>now||now-t>maxAgeMs)throw Error('release_compose_ingress_fence_unproven');return v;
}
module.exports={composeIngressFenceSchema:schema,composeIngressFenceDigest:fenceDigest,qualifyComposeIngressFence:qualifyFence};
