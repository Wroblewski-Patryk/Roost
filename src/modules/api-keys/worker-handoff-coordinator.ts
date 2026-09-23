import { randomUUID } from "node:crypto";
import { handoffAck,handoffDeviceProof,handoffRequest,handoffHttpsPaths,type HandoffHttpsAction } from "./worker-handoff-contract";
import { admissionSnapshot,freezePublic,handoffPeerObservation,type AdmissionSnapshot,type HandoffOperation } from "./worker-transport-snapshot";
import type { createWorkerTransportService,SignedTransport,TransportRecord } from "./worker-transport.service";
import type { createWorkerHandoffHttpsClient } from "./worker-handoff-https";
import { reviewDigest } from "../agent-runtime/task-review-contract";

type Admission=Pick<ReturnType<typeof createWorkerTransportService>,"inspect"|"completeVerified">;
type Https=Pick<ReturnType<typeof createWorkerHandoffHttpsClient>,"sendAdmitted">;
type Dependencies={admission:Admission;https:Https;current:()=>Promise<{record:SignedTransport<TransportRecord>;anchor:unknown}>};
const flags={transportQualified:false,implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,pilotExecutionStarted:false,launchAuthority:false} as const;
type CoordinatorResult=typeof flags&({ok:false;error:string;deliveryUnknown:boolean;data?:never}|{ok:true;data:any;error?:never;deliveryUnknown?:never});
const failure=(error:string,deliveryUnknown=false):CoordinatorResult=>({ok:false,error,deliveryUnknown,...flags});
const requestBody=handoffRequest.omit({origin:true,certificateFingerprint:true});

// No configuration, URL, headers, snapshot or peer evidence is accepted from the
// operation caller. The caller owns only the existing action/device request.
// Replay locks are bounded process-local correlation, not durable authority.
export function createWorkerHandoffCoordinator(dependencies?:Dependencies){
  const active=new Set<string>(),uncertain=new Set<string>(),seen=new Set<string>();
  return Object.freeze({async send(...args:unknown[]):Promise<CoordinatorResult>{
    let requestId:string|undefined,locked=false,transportStarted=false;
    try{
      if(typeof dependencies?.admission?.inspect!=="function"||typeof dependencies.admission.completeVerified!=="function"||typeof dependencies.https?.sendAdmitted!=="function"||typeof dependencies.current!=="function")return failure("unavailable");
      if(args.length!==2||typeof args[0]!=="string"||!Object.hasOwn(handoffHttpsPaths,args[0]))return failure("request_invalid");
      const action=args[0] as HandoffHttpsAction,body=(action==="request"?requestBody:action==="ack"?handoffAck:handoffDeviceProof).parse(args[1]);
      requestId=body.requestId;
      if(active.has(requestId)||uncertain.has(requestId)&&action!=="status")return failure("replay_denied",uncertain.has(requestId));
      if(!seen.has(requestId)&&seen.size>=128)return failure("unavailable");
      seen.add(requestId);active.add(requestId);locked=true;
      const {record,anchor}=await dependencies.current(),first=await dependencies.admission.inspect(record,anchor);
      if(first.ok!==true||!first.snapshot)return failure("admission_denied");
      const snapshot:AdmissionSnapshot=freezePublic(admissionSnapshot.parse(first.snapshot));
      if(body.workspaceId!==snapshot.identity.workspaceId||body.installationId!==snapshot.identity.installationId||body.hostId!==snapshot.identity.hostId||body.hostFingerprint!==snapshot.identity.hostFingerprint)return failure("identity_changed");
      // A second fresh read closes the asynchronous preparation boundary. No
      // transport invocation happens if the persisted head/authority changed.
      const fresh=await dependencies.admission.inspect(record,anchor);
      if(fresh.ok!==true||!fresh.snapshot||reviewDigest(fresh.snapshot)!==reviewDigest(snapshot))return failure("admission_changed");
      const operation:HandoffOperation=freezePublic({operationId:randomUUID(),requestId,action,method:"POST",path:handoffHttpsPaths[action],snapshotDigest:reviewDigest(snapshot)});
      const wire=action==="request"?{...body,origin:snapshot.origin,certificateFingerprint:snapshot.allowedCertificates[0].certificate.fingerprint}:body;
      let peerChecked=false,peerVerified=false,completed=false,verifiedCompletion=false,invalid=false,peerDigest:string|undefined;
      const tlsDigest=(value:unknown)=>{const {operation,phase,outcome,responseDigest,commitUncertain,observedAt,expiresAt,...peer}=handoffPeerObservation.parse(value);return reviewDigest(peer);};
      transportStarted=true;
      const result=await dependencies.https.sendAdmitted(snapshot,operation,wire,{
        beforeSend:async evidence=>{
          if(peerChecked||completed){invalid=true;return false;}peerChecked=true;
          peerVerified=(await dependencies.admission.completeVerified(snapshot,operation,evidence,"before_send")).ok===true;
          if(peerVerified)peerDigest=tlsDigest(evidence.payload);return peerVerified;
        },
        complete:async(evidence,responseDigest)=>{
          if(!peerVerified||completed||invalid){invalid=true;return false;}completed=true;
          const parsed=handoffPeerObservation.safeParse(evidence.payload);
          if(!parsed.success||tlsDigest(parsed.data)!==peerDigest||parsed.data.responseDigest!==responseDigest||parsed.data.outcome!=="response"||parsed.data.commitUncertain)return false;
          verifiedCompletion=(await dependencies.admission.completeVerified(snapshot,operation,evidence,"complete")).ok===true;return verifiedCompletion;
        }
      });
      if(result.ok&&(!peerVerified||!verifiedCompletion||invalid)){
        if(Buffer.isBuffer(result.data?.key))result.data.key.fill(0);uncertain.add(requestId);return failure("delivery_unknown",true);
      }
      if(!result.ok){if(result.deliveryUnknown)uncertain.add(requestId);return {...result,...flags};}
      return {...result,...flags};
    }catch{if(transportStarted&&requestId)uncertain.add(requestId);return failure(transportStarted?"delivery_unknown":"request_invalid",transportStarted);}
    finally{
      if(requestId&&locked)active.delete(requestId);
      for(const name of ["deviceSecret","challenge"]){const value=args[1]&&Object.getOwnPropertyDescriptor(args[1],name)?.value;if(Buffer.isBuffer(value))value.fill(0);}
    }
  }});
}
