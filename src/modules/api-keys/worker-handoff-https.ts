import https from "node:https";
import type { ClientRequest } from "node:http";
import { isIP } from "node:net";
import tls from "node:tls";
import { createHash } from "node:crypto";
import { z } from "zod";
import { handoffRequest, handoffDeviceProof, handoffAck, exactHttpsOrigin, handoffHttpsPaths, type HandoffHttpsAction } from "./worker-handoff-contract";
export { handoffHttpsPaths, type HandoffHttpsAction } from "./worker-handoff-contract";
import { workerHandoffBinding } from "./worker-credential-contract";
import { admissionSnapshot, handoffOperation, handoffPeerObservation, freezePublic, type AdmissionSnapshot, type HandoffOperation } from "./worker-transport-snapshot";
import type { SignedTransport } from "./worker-transport.service";

const digest = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid();
const canonicalOrigin = exactHttpsOrigin.refine(v => new URL(v).origin === v && !isIP(new URL(v).hostname.replace(/^\[|\]$/g,"")));
const configSchema = z.object({
  qualifiedState: z.literal("loopback_https_v1"), origin: canonicalOrigin,
  loopbackAddress: z.enum(["127.0.0.1", "::1"]), ca: z.string().min(64).max(16384),
  pins: z.object({ epoch: z.number().int().positive(), current: digest,
    staged: z.object({ epoch: z.number().int().positive(), next: digest, overlapStartsAt: z.string().datetime(), cutoverAt: z.string().datetime() }).strict().optional()
  }).strict().superRefine((p, c) => {
    if (p.staged && (p.staged.epoch !== p.epoch + 1 || p.staged.next === p.current ||
      Date.parse(p.staged.cutoverAt) <= Date.parse(p.staged.overlapStartsAt) || Date.parse(p.staged.cutoverAt)-Date.parse(p.staged.overlapStartsAt)>3600000))
      c.addIssue({ code: "custom", message: "Invalid pin transition" });
  }),
  timeouts: z.object({ connectMs: z.number().int().min(25).max(5000), readMs: z.number().int().min(25).max(5000), deadlineMs: z.number().int().min(50).max(10000) }).strict()
    .refine(t => t.deadlineMs >= t.connectMs && t.deadlineMs >= t.readMs),
}).strict();
const state = z.object({ requestId: id, state: z.enum(["requested","approved","awaiting_ack","acknowledged","delivery_unknown","revoked","expired","locked"]),
  deliverySpent: z.boolean(), qualification: z.literal("synthetic_memory_only"), transportQualified: z.literal(false),
  realProvisioningQualified: z.literal(false), launchAuthority: z.literal(false) }).strict();
const credential = z.object({ id, workspaceId:id, installationId:id, hostId:id, version:z.number().int().positive(), epoch:z.number().int().positive(),
  fingerprint:digest, active:z.literal(false), revokedAt:z.null(), expiresAt:z.string().datetime(), scopes:z.tuple([z.literal("agent-runtime:claim")]) }).strict();
const requested = state.extend({ userCode:z.string().regex(/^[A-F0-9]{8}$/), binding:workerHandoffBinding, expiresAt:z.string().datetime(), state:z.literal("requested"), deliverySpent:z.literal(false) }).strict();
const delivered = state.extend({ state:z.literal("awaiting_ack"), deliverySpent:z.literal(true), credential, responseDigest:digest,
  ackDeadline:z.string().datetime(), key:z.string().min(32).max(256) }).strict();
type ErrorCode = "unavailable"|"request_invalid"|"tls_denied"|"connect_timeout"|"read_timeout"|"deadline"|"redirect_denied"|"response_invalid"|"connection_lost"|"remote_denied"|"replay_denied"|"delivery_unknown";
type Failure = { ok:false; error:ErrorCode; deliveryUnknown:boolean; transportQualified:false; launchAuthority:false };
export type HandoffHttpsResult = Failure | { ok:true; data:any; transportQualified:false; launchAuthority:false };
const failure = (error:ErrorCode, deliveryUnknown=false):Failure => ({ok:false,error,deliveryUnknown,transportQualified:false,launchAuthority:false});
const maxRequestBytes=8192, maxResponseBytes=8192, maxRequests=128;

function responseData(action:HandoffHttpsAction,proof:any,origin:string,decoded:unknown){
  const schema=action==="request"?requested:action==="poll"?z.union([state,delivered]):state;
  const {data}=z.object({data:schema}).strict().parse(decoded);
  if(data.requestId!==proof.requestId)throw Error("response_invalid");
  if(action==="request"&&((data as any).binding.origin!==origin||(data as any).binding.certificateFingerprint!==proof.certificateFingerprint))throw Error("response_invalid");
  if("key"in data&&(data.credential.workspaceId!==proof.workspaceId||data.credential.hostId!==proof.hostId||data.credential.installationId!==proof.installationId))throw Error("response_invalid");
  if(action==="ack"&&data.state!=="acknowledged")throw Error("response_invalid");
  return data;
}
export type AdmissionHttpsExchange={qualification:"synthetic_persisted_admission_v1";
  exchange(input:{snapshot:AdmissionSnapshot;operation:HandoffOperation;body:Buffer;verifyPeer:(peer:SignedTransport<unknown>)=>Promise<boolean>}):Promise<{
    statusCode:number;headers:Record<string,string>;body:Buffer;peer:SignedTransport<unknown>}>
};
export type AdmissionHttpsGate={beforeSend:(peer:SignedTransport<unknown>)=>Promise<boolean>;
  complete:(peer:SignedTransport<unknown>,responseDigest:string)=>Promise<boolean>};

// No production composition or generic URL/header/fetch capability. Only an
// explicitly qualified loopback test state is accepted in this slice.
export function createWorkerHandoffHttpsClient(input?: unknown,internal?:AdmissionHttpsExchange) {
  const parsed=configSchema.safeParse(input), config=parsed.success ? parsed.data : undefined;
  const phases=new Map<string,"open"|"pending"|"ack_inflight"|"acknowledged"|"unknown">();
  const bindings=new Map<string,string>();
  const active=new Set<()=>void>(); let closed=false;
  function pinAllowed(pin:string, now:number) {
    const p=config!.pins, s=p.staged;
    return s ? now>=Date.parse(s.cutoverAt) ? pin===s.next : pin===p.current || now>=Date.parse(s.overlapStartsAt) && pin===s.next : pin===p.current;
  }
  async function send(...args:unknown[]):Promise<HandoffHttpsResult> {
    let proof:any, payload:Buffer|undefined;
    try {
      if (!config || closed || active.size>=32) return failure("unavailable");
      if(args.length!==2 || typeof args[0]!=="string" || !Object.hasOwn(handoffHttpsPaths,args[0])) return failure("request_invalid");
      const action=args[0] as HandoffHttpsAction;
      proof=(action==="request"?handoffRequest:action==="ack"?handoffAck:handoffDeviceProof).parse(args[1]);
      if(action==="request" && (proof.origin!==config.origin || !pinAllowed(proof.certificateFingerprint,Date.now()))) return failure("request_invalid");
      const phase=phases.get(proof.requestId);
      if(!phase && phases.size>=maxRequests || action==="request" && phase || action==="ack" && phase!=="pending" ||
        action==="poll" && (phase==="unknown" || phase==="acknowledged")) return failure("replay_denied",phase==="unknown");
      if(!phase)phases.set(proof.requestId,"open");
      if(action==="request")bindings.set(proof.requestId,proof.certificateFingerprint);
      if(action==="ack")phases.set(proof.requestId,"ack_inflight");
      const wire=action==="request" ? proof : {...proof,deviceSecret:proof.deviceSecret.toString("base64url"),challenge:proof.challenge.toString("base64url")};
      payload=Buffer.from(JSON.stringify(wire));
      if(payload.length>maxRequestBytes) return failure("request_invalid");
      return await new Promise<HandoffHttpsResult>(resolve=>{
        let settled=false, sent=false, readTimer:NodeJS.Timeout|undefined;
        let request:ClientRequest; const chunks:Buffer[]=[];
        const url=new URL(config.origin), hostname=url.hostname.replace(/^\[|\]$/g,"");
        // An isolated Agent cannot inherit environment/PAC proxies or a mutated
        // global Agent. Session reuse is disabled so every handshake checks pins.
        const agent=new https.Agent({keepAlive:false,maxCachedSessions:0});
        const finish=(result:HandoffHttpsResult)=>{
          if(settled)return;settled=true;
          clearTimeout(connectTimer);clearTimeout(deadlineTimer);clearTimeout(readTimer);
          active.delete(cancel);request?.destroy();agent.destroy();for(const b of chunks)b.fill(0);
          if(!result.ok && result.deliveryUnknown) phases.set(proof.requestId,"unknown");
          resolve(result);
        };
        const abort=(code:ErrorCode)=>finish(failure(sent && ["connection_lost","read_timeout","deadline"].includes(code)?"delivery_unknown":code,sent));
        const cancel=()=>abort("connection_lost");active.add(cancel);
        const connectTimer=setTimeout(()=>abort("connect_timeout"),config.timeouts.connectMs);
        const deadlineTimer=setTimeout(()=>abort("deadline"),config.timeouts.deadlineMs);
        const resetRead=()=>{if(settled)return;clearTimeout(readTimer);readTimer=setTimeout(()=>abort("read_timeout"),config.timeouts.readMs);};
        try {
          request=https.request({protocol:"https:",hostname,port:url.port||443,path:handoffHttpsPaths[action],method:"POST",agent,
            ca:config.ca,rejectUnauthorized:true,minVersion:"TLSv1.2",servername:hostname,family:config.loopbackAddress==="::1"?6:4,
            maxHeaderSize:4096,headers:{"content-type":"application/json","accept":"application/json","content-length":payload!.length,"connection":"close"},
            lookup:((name:string,_options:unknown,callback:Function)=>{ if(name!==hostname)return callback(new Error("lookup_denied"));
              callback(null,config.loopbackAddress,config.loopbackAddress==="::1"?6:4); }) as any,
            checkServerIdentity:(name,cert)=>{
              const normal=tls.checkServerIdentity(hostname,cert);if(normal)return normal;
              if(name!==hostname || !cert.raw || !pinAllowed(createHash("sha256").update(cert.raw).digest("hex"),Date.now())) return new Error("pin_denied");
            }
          },response=>{
            if(settled){response.destroy();return;}
            resetRead();const code=response.statusCode??0;
            if(code>=300&&code<400){response.resume();return abort("redirect_denied");}
            const length=Number(response.headers["content-length"]);
            if(response.headers["transfer-encoding"] || response.headers["content-encoding"] || !Number.isSafeInteger(length) || length<2 || length>maxResponseBytes ||
              !/^application\/json(?:;\s*charset=utf-8)?$/i.test(response.headers["content-type"]??"")) {response.resume();return abort("response_invalid");}
            let size=0;
            response.on("data",(chunk:Buffer)=>{if(settled){chunk.fill(0);return;}size+=chunk.length;if(size>maxResponseBytes||size>length){chunk.fill(0);return abort("response_invalid");}chunks.push(chunk);resetRead();});
            response.on("aborted",()=>abort("connection_lost"));response.on("error",()=>abort("connection_lost"));
            response.on("end",()=>{
              if(settled)return;
              let joined:Buffer|undefined;
              try{
                if(size!==length)return abort("response_invalid");
                joined=Buffer.concat(chunks);
                const decoded=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(joined));
                if(code!==200)return finish(failure(code>=500?"delivery_unknown":"remote_denied",code>=500&&sent));
                const data=responseData(action,proof,config.origin,decoded);
                if("key" in data) {
                  phases.set(proof.requestId,"pending");
                }
                if(action==="ack") {if(data.state!=="acknowledged")return abort("response_invalid");phases.set(proof.requestId,"acknowledged");}
                finish({ok:true,data,transportQualified:false,launchAuthority:false});
              }catch{abort("response_invalid");}finally{joined?.fill(0);}
            });
          });
          request.on("error",()=>abort(sent?"connection_lost":"tls_denied"));
          request.on("socket",socket=>{
            const secure=socket as tls.TLSSocket;
            secure.once("secureConnect",()=>{
              if(settled)return;
              const boundPin=bindings.get(proof.requestId), peer=secure.getPeerCertificate();
              if(!secure.authorized || secure.remoteAddress!==config.loopbackAddress && secure.remoteAddress!==`::ffff:${config.loopbackAddress}` ||
                boundPin && (!peer.raw || createHash("sha256").update(peer.raw).digest("hex")!==boundPin))return abort("tls_denied");
              clearTimeout(connectTimer);resetRead();sent=true;request.end(payload);
            });
          });
        }catch{abort("tls_denied");}
      });
    }catch{return failure("request_invalid");}
    finally{payload?.fill(0);for(const field of ["deviceSecret","challenge"]){
      const value=args[1] && Object.getOwnPropertyDescriptor(args[1],field)?.value;if(Buffer.isBuffer(value))value.fill(0);
    }}
  }
  // Source-only internal seam on the existing client, sharing its action/schema,
  // replay and redaction boundary. It cannot construct a production socket: the
  // only admitted exchange is explicitly injected synthetic evidence.
  let admittedActive=0;
  async function sendAdmitted(snapshotInput:unknown,operationInput:unknown,body:unknown,gate:AdmissionHttpsGate):Promise<HandoffHttpsResult>{
    let payload:Buffer|undefined,response:Buffer|undefined,key:Buffer|undefined,proof:any,possibleCommit=false,retained=false,accepted=false;
    let deadline:NodeJS.Timeout|undefined,expired=false;
    try{
      if(closed||!internal||internal.qualification!=="synthetic_persisted_admission_v1"||typeof internal.exchange!=="function"||typeof gate?.beforeSend!=="function"||typeof gate.complete!=="function"||admittedActive>=32)return failure("unavailable");
      const snapshot=freezePublic(admissionSnapshot.parse(snapshotInput)),operation=freezePublic(handoffOperation.parse(operationInput)),action=operation.action;
      proof=(action==="request"?handoffRequest:action==="ack"?handoffAck:handoffDeviceProof).parse(body);
      if(proof.requestId!==operation.requestId||proof.workspaceId!==snapshot.identity.workspaceId||proof.hostId!==snapshot.identity.hostId||proof.installationId!==snapshot.identity.installationId||proof.hostFingerprint!==snapshot.identity.hostFingerprint||
        action==="request"&&(proof.origin!==snapshot.origin||!snapshot.allowedCertificates.some(p=>p.certificate.fingerprint===proof.certificateFingerprint)))return failure("request_invalid");
      const phase=phases.get(proof.requestId);
      if(!phase&&phases.size>=maxRequests||action==="request"&&phase||action==="ack"&&phase!=="pending"||action==="poll"&&(phase==="unknown"||phase==="acknowledged"||phase==="pending"))return failure("replay_denied",phase==="unknown");
      if(!phase)phases.set(proof.requestId,"open");if(action==="ack")phases.set(proof.requestId,"ack_inflight");
      if(action==="request")bindings.set(proof.requestId,proof.certificateFingerprint);
      admittedActive++;retained=true;
      const wire=action==="request"?proof:{...proof,deviceSecret:proof.deviceSecret.toString("base64url"),challenge:proof.challenge.toString("base64url")};
      payload=Buffer.from(JSON.stringify(wire));if(payload.length>maxRequestBytes)return failure("request_invalid");
      let checked=false,verified=false,invalid=false;
      const exchange=internal.exchange({snapshot,operation,body:payload,verifyPeer:async peer=>{
        if(checked||closed||expired){invalid=true;return false;}checked=true;
        const boundPin=bindings.get(proof.requestId),observation=handoffPeerObservation.safeParse(peer.payload);
        if(!observation.success||boundPin&&observation.data.pin!==boundPin)return false;
        const approved=await gate.beforeSend(peer);if(closed||expired){invalid=true;return false;}
        verified=approved;if(verified)possibleCommit=true;return verified;
      }}).then(reply=>{if(expired){if(Buffer.isBuffer(reply.body))reply.body.fill(0);throw Error("deadline");}return reply;});
      const deadlineFailure=new Promise<never>((_resolve,reject)=>{deadline=setTimeout(()=>{expired=true;possibleCommit=true;reject(Error("deadline"));},10000);});
      const reply=await Promise.race([exchange,deadlineFailure]);
      response=reply.body;
      // Missing handshake evidence is uncertain, never proof that no send occurred.
      if(!checked||!verified||invalid||closed){possibleCommit=true;return failure("delivery_unknown",true);}
      const h=reply.headers,length=Number(h["content-length"]);
      if(reply.statusCode!==200||Buffer.byteLength(JSON.stringify(h))>4096||h["transfer-encoding"]||h["content-encoding"]||!/^application\/json(?:;\s*charset=utf-8)?$/i.test(h["content-type"]??"")||
        !Buffer.isBuffer(response)||!Number.isSafeInteger(length)||length<2||length>maxResponseBytes||response.length!==length)return failure("delivery_unknown",true);
      const data:any=responseData(action,proof,snapshot.origin,JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(response)));
      if("key"in data){key=Buffer.from(data.key);data.key="";}
      if(!await Promise.race([gate.complete(reply.peer,createHash("sha256").update(response).digest("hex")),deadlineFailure])||closed)return failure("delivery_unknown",true);
      if(key){data.key=key;key=undefined;phases.set(proof.requestId,"pending");}
      if(action==="ack")phases.set(proof.requestId,"acknowledged");
      accepted=true;
      return {ok:true,data,transportQualified:false,launchAuthority:false};
    }catch{return failure(possibleCommit?"delivery_unknown":"tls_denied",possibleCommit);}
    finally{
      clearTimeout(deadline);if(retained)admittedActive--;payload?.fill(0);if(Buffer.isBuffer(response))response.fill(0);key?.fill(0);
      // Conservative terminal state unless a complete verified result advanced it.
      if(possibleCommit&&!accepted&&proof)phases.set(proof.requestId,"unknown");
      for(const name of ["deviceSecret","challenge"]){const value=body&&Object.getOwnPropertyDescriptor(body,name)?.value;if(Buffer.isBuffer(value))value.fill(0);}
    }
  }
  return Object.freeze({send,sendAdmitted,close(){closed=true;for(const cancel of active)cancel();phases.clear();bindings.clear();},
    qualification:"loopback_https_v1",transportQualified:false,launchAuthority:false});
}
