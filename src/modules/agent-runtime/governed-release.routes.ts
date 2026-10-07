import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { requireWorkspaceRole } from "../../auth/workspace-access";
import { readyTransaction } from "./task-execution-readiness";
import { createRelease, listReleases, releaseView, releaseIntent, releaseOutcome, revokeRelease, renewRelease, closeFailedRelease, authorizeReleaseReconciliation } from "./governed-release";
export const governedReleaseRouter=Router();
const uuid=z.string().uuid();
function send(res:any,result:any,created=false) {
 if(result.error)return sendApiError(res,result.error.endsWith("not_found")?404:result.error.includes("forbidden")||result.error.endsWith("required")&&result.error.includes("owner")?403:409,result.error);
 return res.status(created&&!result.replayed?201:200).json({data:result});
}
governedReleaseRouter.get("/",asyncHandler(async(req,res)=>{
 const hostId=uuid.optional().parse(req.query.hostId),applicationId=uuid.optional().parse(req.query.applicationId);
 const summary=z.enum(["true","false"]).optional().parse(req.query.summary)==="true";
 return send(res,await readyTransaction(db=>listReleases(db,req.auth!.workspaceId,req.auth!,hostId,{applicationId,summary})));
}));
governedReleaseRouter.post("/",asyncHandler(async(req,res)=>{
 if(!requireWorkspaceRole(req,res,"owner"))return;
 return send(res,await readyTransaction(db=>createRelease(db,req.auth!.workspaceId,req.auth!,req.body)),true);
}));
governedReleaseRouter.get("/:releaseId",asyncHandler(async(req,res)=>send(res,await readyTransaction(db=>releaseView(db,req.auth!.workspaceId,uuid.parse(req.params.releaseId),req.auth!)))));
governedReleaseRouter.post("/:releaseId/actions/close-failed",asyncHandler(async(req,res)=>{
 if(!requireWorkspaceRole(req,res,"owner"))return;
 return send(res,await readyTransaction(db=>closeFailedRelease(db,req.auth!.workspaceId,uuid.parse(req.params.releaseId),req.auth!,req.body)),true);
}));
governedReleaseRouter.post("/:releaseId/actions/authorize-reconciliation",asyncHandler(async(req,res)=>{
 if(!requireWorkspaceRole(req,res,"owner"))return;
 return send(res,await readyTransaction(db=>authorizeReleaseReconciliation(db,req.auth!.workspaceId,uuid.parse(req.params.releaseId),req.auth!,req.body)),true);
}));

governedReleaseRouter.post("/:releaseId/actions/renew",asyncHandler(async(req,res)=>{
 if(!requireWorkspaceRole(req,res,"owner"))return;
 return send(res,await readyTransaction(db=>renewRelease(db,req.auth!.workspaceId,uuid.parse(req.params.releaseId),req.auth!,req.body)),true);
}));
governedReleaseRouter.post("/:releaseId/operations",asyncHandler(async(req,res)=>send(res,await readyTransaction(db=>releaseIntent(db,req.auth!.workspaceId,uuid.parse(req.params.releaseId),req.auth!,req.body)),true)));
governedReleaseRouter.post("/:releaseId/operations/:operationId/outcome",asyncHandler(async(req,res)=>send(res,await readyTransaction(db=>releaseOutcome(db,req.auth!.workspaceId,uuid.parse(req.params.releaseId),uuid.parse(req.params.operationId),req.auth!,req.body)),true)));
governedReleaseRouter.post("/:releaseId/actions/revoke",asyncHandler(async(req,res)=>{
 if(!requireWorkspaceRole(req,res,"owner"))return;
 const input=z.object({requestId:uuid,reason:z.string().trim().min(3).max(1000)}).strict().parse(req.body);
 return send(res,await readyTransaction(db=>revokeRelease(db,req.auth!.workspaceId,uuid.parse(req.params.releaseId),req.auth!,input)),true);
}));
