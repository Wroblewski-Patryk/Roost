import type { Request, Response } from "express";
import { isIP } from "node:net";
import { Buffer } from "node:buffer";
import { prisma } from "../../db/prisma";
import { generateApiKey, hashApiKey } from "../../auth/api-key";
import { sendApiError } from "../../middleware/api-error";
import { createWorkerHandoffService } from "./worker-handoff.service";
import { WorkerCredentialError } from "./worker-credential.service";
import { createPrismaWorkerHandoffStore } from "./worker-handoff-store";
import { exactHttpsOrigin, handoffHttpsPaths, type ProductionHandoffTransport } from "./worker-handoff-contract";

// Synthetic qualification may explicitly inject a service. Production uses the
// separate, fixed handler below and never accepts transport evidence from JSON.
export function workerHandoffUnavailable(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  return sendApiError(res, 503, "worker_handoff_unavailable");
}

export function workerHandoffHandler(action: "request" | "approve" | "poll" | "ack" | "status", service: ReturnType<typeof createWorkerHandoffService>) {
  return async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const body = { ...req.body };
    try {
      // A bounded canonical base64url wire encoding is decoded only in memory.
      // Trusted transport evidence is never read from this body or headers.
      if (["poll", "ack", "status"].includes(action)) for (const field of ["deviceSecret", "challenge"]) {
        if (typeof body[field] !== "string" || !/^[A-Za-z0-9_-]{43,171}$/.test(body[field])) throw new WorkerCredentialError("validation_error", 400);
        const value = Buffer.from(body[field], "base64url");
        if (value.toString("base64url") !== body[field]) { value.fill(0); throw new WorkerCredentialError("validation_error", 400); }
        body[field] = value; delete req.body[field];
      }
      return res.json({ data: await service(action, req.auth, body) });
    } catch (e) { return sendApiError(res, e instanceof WorkerCredentialError ? e.status : 503, e instanceof WorkerCredentialError ? e.code : "worker_handoff_unavailable"); }
    finally { for (const field of ["deviceSecret", "challenge"]) { if (Buffer.isBuffer(body[field])) body[field].fill(0); delete req.body?.[field]; } }
  };
}

const sha256=/^[a-f0-9]{64}$/;
const proxyAddress=(value:string)=>value.startsWith('::ffff:')?value.slice(7):value;
function privateIngress(value:string){
  if(isIP(value)===6)return value==='::1'||/^f[cd][0-9a-f:]+$/i.test(value);
  if(isIP(value)!==4)return false;
  const [a,b]=value.split('.').map(Number);
  return a===10||a===127||a===172&&b>=16&&b<=31||a===192&&b===168;
}
function oneHeader(req:Request,name:string):string|null{
  const matches=[] as string[];
  for(let i=0;i<req.rawHeaders.length;i+=2)if(req.rawHeaders[i].toLowerCase()===name)matches.push(req.rawHeaders[i+1]);
  return matches.length===1&&!matches[0].includes(',')?matches[0]:null;
}
const hasHeader=(req:Request,name:string)=>req.rawHeaders.some((value,index)=>index%2===0&&value.toLowerCase()===name);

// Traefik's private ingress is the sole source of forwarded TLS evidence.
// Its entrypoint must sanitize untrusted X-Forwarded-* input; no request body,
// client address header, or caller-supplied certificate claim is authoritative.
export function trustedWorkerHandoffProxy(req:Request,action:"request"|"approve"|"poll"|"ack"|"status"):
  ProductionHandoffTransport{
  const origin=process.env.ROOST_HANDOFF_HTTPS_ORIGIN;
  const pin=process.env.ROOST_HANDOFF_TLS_LEAF_SHA256;
  const ingress=process.env.ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS;
  if(!origin||!exactHttpsOrigin.safeParse(origin).success||isIP(new URL(origin).hostname.replace(/^\[|\]$/g,''))||
    !pin||!sha256.test(pin)||!ingress||!privateIngress(ingress))
    throw new WorkerCredentialError('worker_handoff_unavailable',503);
  const url=new URL(origin),authority=url.host;
  const expected=action==='approve'?'/v1/api-keys/worker-credentials/handoff/approve':handoffHttpsPaths[action];
  if(req.method!=='POST'||req.originalUrl!==expected||proxyAddress(req.socket.remoteAddress??'')!==ingress||
    oneHeader(req,'host')!==authority||oneHeader(req,'x-forwarded-host')!==authority||
    oneHeader(req,'x-forwarded-proto')!=='https'||
    (hasHeader(req,'x-forwarded-port')&&oneHeader(req,'x-forwarded-port')!==(url.port||'443'))||
    req.headers.forwarded!==undefined)
    throw new WorkerCredentialError('worker_handoff_transport_invalid',403);
  return {qualification:'trusted_proxy_https_v1',requestedOrigin:origin,connectedOrigin:origin,
    certificateFingerprint:pin,tlsValidated:true,redirected:false,proxyOrigin:origin};
}

const productionDelivery={qualification:'production_server_secret_v1' as const,
  async generate(){return Buffer.from(generateApiKey(),'utf8');},
  async hash(secret:Buffer){return hashApiKey(secret.toString('utf8'));},
  async deliver(secret:Buffer){return secret.toString('utf8');}
};
const productionStore=createPrismaWorkerHandoffStore(prisma);
export function productionWorkerHandoffHandler(action:"request"|"approve"|"poll"|"ack"|"status"){
  return async(req:Request,res:Response)=>{
    res.setHeader('Cache-Control','no-store');
    try{
      const transport=trustedWorkerHandoffProxy(req,action);
      const service=createWorkerHandoffService(productionStore,{delivery:productionDelivery,transport:async()=>transport});
      return workerHandoffHandler(action,service)(req,res);
    }catch(error){return sendApiError(res,error instanceof WorkerCredentialError?error.status:503,
      error instanceof WorkerCredentialError?error.code:'worker_handoff_unavailable');}
  };
}
