import {randomUUID} from 'node:crypto';
import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {createBootstrapProofV3Issuance} from './bootstrap-proof-issuance';
import {createPrismaV3IssuancePorts} from './bootstrap-proof-issuance-prisma';
import {createPrismaV3AuthorityPort} from './bootstrap-proof-issuance-authority-prisma';
import {createV3CryptoPortsFromEnvironment} from './bootstrap-proof-issuance-crypto';
import {v3Authority,v3AuthorityVersion,v3Command,v3Plan,v3Receipt,prepareV3Ticket,prepareV3Seal} from './bootstrap-proof-issuance-contract';
import {proofEqual,denyProof} from './bootstrap-proof-key-contract';
import type {AuthContext} from '../../auth/api-key.middleware';

const id=z.string().uuid();
export const nativeV3IssueInput=z.object({attachmentId:id,operationId:id.optional()}).strict();

// This is the default native composition. The source-only orchestration remains
// fail-closed for injected doubles; delivery here requires committed SQL
// readback, fresh authority and separate real Ed25519 verification.
export async function issueNativeV3(client:PrismaClient,auth:AuthContext,input:unknown){
 if(auth.authType!=='user'||auth.workspaceRole!=='owner'||!auth.userId)denyProof();
 const commandInput=nativeV3IssueInput.parse(input),ports=createPrismaV3IssuancePorts(client),authority=createPrismaV3AuthorityPort();
 const crypto=createV3CryptoPortsFromEnvironment();
 if(!crypto)throw Error('bootstrap_v3_private_signer_unavailable');
 const owner=await client.workspace.findUnique({where:{id:auth.workspaceId},select:{ownerUserId:true}});
 if(owner?.ownerUserId!==auth.userId||!await client.workspaceMembership.findFirst({where:{workspaceId:auth.workspaceId,userId:auth.userId,role:'owner'}}))denyProof();
 const expected=await ports.transaction('read',async db=>{
  await ports.guards(db);const record=v3Authority.parse(await authority.read(db,commandInput.attachmentId,null));
  if(record.attachment.workspaceId!==auth.workspaceId||record.attachment.ownerId!==auth.userId)denyProof();
  return v3AuthorityVersion(record);
 });
 const command=v3Command.parse({version:'bootstrap-proof-issue-command-v3',operationId:commandInput.operationId??randomUUID(),
  attachmentId:commandInput.attachmentId,expected});
 const service=createBootstrapProofV3Issuance({ports,authority,...crypto});
 const issued=await service.issue(command);
 if(!issued.ok||!issued.issuanceRecorded||!issued.receipt)denyProof();
 const before=await service.beforeSend(command);
 if(!before.ok||!('authorityCurrent' in before)||before.authorityCurrent!==true)denyProof();
 const sealed=await ports.transaction('read',async db=>{
  await ports.guards(db);const read=await ports.readOperation(db,command);
  if(!read)denyProof();const plan=v3Plan.parse(read.plan),receipt=v3Receipt.parse(read.receipt);
  if(!proofEqual(receipt,issued.receipt)||!proofEqual(plan.command,command))denyProof();
  if(!await crypto.issuer.verify(db,prepareV3Ticket(plan.command,plan.authority),plan.envelope))denyProof();
  if(!await crypto.sealer.verify(db,prepareV3Seal(plan.command,plan.authority,plan.envelope),plan.seal))denyProof();
  return {envelope:plan.envelope,seal:plan.seal,receipt};
 });
 return {qualification:'prisma_v3_signed_native_readback',operationId:command.operationId,
  attachmentId:command.attachmentId,receipt:sealed.receipt,envelope:sealed.envelope,seal:sealed.seal};
}
