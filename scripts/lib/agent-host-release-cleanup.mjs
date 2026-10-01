import { coolifyHttpsJson } from './agent-host-release-coolify.mjs';

// Each call removes at most one already registered resource. The application
// deletion explicitly preserves volumes; owned volumes have separate intents.
export function createReleaseCleanupGateway({resources,coolify,credential,images,transport=coolifyHttpsJson,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const imageKind=row=>['docker_image','ghcr_version'].includes(row.kind);
 const checked=async(m,b,id)=>{
  const row=await resources.ownedResource(m,b,id);
  if(row.kind==='coolify_application'&&(row.id!==m.deployment.targetId||row.id!==coolify.targetId
   ||new URL(coolify.origin).origin!==new URL(m.deployment.controllerUrl).origin))throw Error('release_cleanup_target_changed');
  return row;
 };
 const request=async(m,method,expectedStatus)=>transport({url:`${new URL(coolify.origin).origin}/api/v1/applications/${m.deployment.targetId}${method==='DELETE'?'?delete_volumes=false&delete_connected_networks=false&docker_cleanup=false':''}`,
  method,token:await credential(),certificateSha256:coolify.certificateSha256,...(expectedStatus?{expectedStatus}:{})});
 const applicationAbsent=async m=>{await request(m,'GET',404);return true;};
 const reconcileResource=async(m,b,id)=>{
  const row=await checked(m,b,id);
  if(imageKind(row)){if(!images)throw Error('release_image_cleanup_not_installed');return images.reconcileResource(id);}
  if(row.kind!=='coolify_application')return resources.reconcileResource(m,b,id);
  // A 403, timeout or unknown response never demonstrates absence.
  try{await applicationAbsent(m);return{status:'succeeded',evidence:{absenceVerified:true,resourceIds:[id]}};}
  catch{throw Error('release_cleanup_removal_unproven');}
 };
 return{
  ...resources,
  async removeResource(m,b,id){const row=await checked(m,b,id);
   if(imageKind(row)){if(!images)throw Error('release_image_cleanup_not_installed');return images.removeResource(id);}
   if(row.kind!=='coolify_application')return resources.removeResource(m,b,id);
   await resources.configurationInspector({targetId:m.deployment.targetId});
   await request(m,'DELETE');
   // Coolify queues deletion. A still-present row cannot prove that the effect
   // never started and must never authorize another DELETE.
   const deadline=now()+60000;
   for(;;){try{await applicationAbsent(m);return{absenceVerified:true,resourceIds:[id]};}
    catch{const current=await request(m,'GET',200);if(current.uuid!==m.deployment.targetId||now()>=deadline)throw Error('release_cleanup_removal_unproven');await sleep(Math.min(1000,deadline-now()));}}},
  reconcileResource,
  async verifyCleanup(m,b){const clone=await resources.reconcileLocal(m,b);if(clone.status!=='succeeded'||clone.evidence.localAbsent!==true)throw Error('release_cleanup_local_present');
   for(const id of m.cleanup.ownedResourceIds){const proof=await reconcileResource(m,b,id);if(proof.status!=='succeeded')throw Error('release_cleanup_resource_present');}
   return{localAbsent:true,absenceVerified:true,resourceIds:m.cleanup.ownedResourceIds};}
 };
}
