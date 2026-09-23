import { BlockList, isIP } from "node:net";
import { z } from "zod";

const id=z.string().uuid(), digest=z.string().regex(/^[a-f0-9]{64}$/), epoch=z.number().int().positive();
export const productionTransportOrigin=z.string().max(512).refine(value=>{
  const m=/^https:\/\/([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?):([1-9][0-9]{0,4})$/.exec(value);
  if(!m||Number(m[2])>65535||isIP(m[1])||!m[1].includes(".")||m[1].split(".").some(s=>s.length>63||!s||s.startsWith("-")||s.endsWith("-")))return false;
  if(/(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion)$/.test(m[1]))return false;
  try{const u=new URL(value);return u.hostname===m[1]&&`${u.protocol}//${u.hostname}:${Number(m[2])}`===value;}catch{return false;}
},"Exact production HTTPS DNS origin and explicit port required");
const blocked=new BlockList();
for(const [address,prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],
  ["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.88.99.0",24],["192.168.0.0",16],["198.18.0.0",15],
  ["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]] as const)blocked.addSubnet(address,prefix,"ipv4");
// Deliberately narrower than arbitrary Internet routing. IPv6 is not admitted
// until its special-address policy is separately qualified.
export const productionPeerAddress=(value:string)=>isIP(value)===4&&!blocked.check(value,"ipv4");
export const transportIdentity=z.object({workspaceId:id,installationId:id,hostId:id,hostFingerprint:digest,
  credentialId:id,credentialVersion:epoch,credentialEpoch:epoch,credentialFingerprint:digest,
  ticketKeyId:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),ticketKeyEpoch:epoch,ticketPublicKeyDigest:digest}).strict();
export const transportCertificate=z.object({fingerprint:digest,hostname:z.string().min(3).max(253),notBefore:z.string().datetime(),notAfter:z.string().datetime()}).strict();
export const transportProfile=z.object({origin:productionTransportOrigin,serverName:z.string().max(253),certificate:transportCertificate,
  trust:z.object({mode:z.literal("owner_approved_ca_digest"),caDigest:digest}).strict(),
  resolver:z.object({policy:z.literal("public_ipv4_only_v1"),evidenceType:z.literal("issuer_signed_peer_observation_v1")}).strict(),
  proxy:z.literal(false),redirect:z.literal(false),downgrade:z.literal(false),
  bootstrap:z.object({source:z.literal("owner_out_of_band"),evidenceDigest:digest,fingerprint:digest}).strict()
}).strict().superRefine((p,c)=>{
  if(!productionTransportOrigin.safeParse(p.origin).success)return;
  if(new URL(p.origin).hostname!==p.serverName||p.certificate.hostname!==p.serverName||p.bootstrap.fingerprint!==p.certificate.fingerprint)
    c.addIssue({code:"custom",message:"Exact hostname and out-of-band certificate required"});
});
export const transportStage=z.object({epoch,certificate:transportCertificate,bootstrap:z.object({source:z.literal("owner_out_of_band"),evidenceDigest:digest,fingerprint:digest}).strict(),
  overlapStartsAt:z.string().datetime(),cutoverAt:z.string().datetime(),expiresAt:z.string().datetime()}).strict();
export const workerTransportIntent=z.object({schemaVersion:z.literal("worker-transport-admission-v1"),action:z.enum(["create","stage","cutover","revoke"]),
  identity:transportIdentity,expectedRevision:z.number().int().nonnegative(),expectedDigest:digest.nullable(),certificateEpoch:epoch,
  profile:transportProfile,staged:transportStage.nullable(),expiresAt:z.string().datetime(),validUntil:z.string().datetime()
}).strict();
export const workerTransportCommand=z.object({requestId:id,decisionId:id,decisionRevision:epoch,explicitAcceptance:z.literal(true),intent:workerTransportIntent}).strict();
export type TransportIdentity=z.infer<typeof transportIdentity>;
export type TransportIntent=z.infer<typeof workerTransportIntent>;
export type TransportCommand=z.infer<typeof workerTransportCommand>;
export const transportAnchor=z.object({identity:transportIdentity,revision:epoch,recordDigest:digest,certificateEpoch:epoch,highWaterEpoch:epoch}).strict();
export const transportObservation=z.object({identity:transportIdentity,origin:productionTransportOrigin,serverName:z.string().max(253),
  pin:digest,caDigest:digest,certificateNotBefore:z.string().datetime(),certificateNotAfter:z.string().datetime(),
  addresses:z.array(z.string().max(64)).min(1).max(16),peerAddress:z.string().max(64),observedAt:z.string().datetime(),expiresAt:z.string().datetime(),
  resolverPolicy:z.literal("public_ipv4_only_v1"),source:z.literal("issuer_signed_peer_observation_v1"),
  chainValid:z.literal(true),hostnameValid:z.literal(true),proxy:z.literal(false),redirect:z.literal(false),downgrade:z.literal(false)
}).strict();
