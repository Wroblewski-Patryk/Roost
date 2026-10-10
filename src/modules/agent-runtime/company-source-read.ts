import type { Prisma } from "@prisma/client";
import { companySourceApprovedContent, companySourceEligible, companySourceProvenance, companySourceReviews } from "./company-source-trust";

export async function taskCompanySources(db: Prisma.TransactionClient, workspaceId: string, agentId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId, assignedWorkforceEntityId: agentId, status: { not: "archived" } },
    select: { id: true, projectId: true }
  });
  if (!task) return null;

  const reviews = await companySourceReviews(db, workspaceId, taskId);
  const recordIds = [...reviews.keys()];
  if (!recordIds.length) return [];
  const [records, links] = await Promise.all([
    db.companyRecord.findMany({ where: { workspaceId, id: { in: recordIds } } }),
    task.projectId ? db.applicationProject.findMany({ where: { projectId: task.projectId, application: { workspaceId } }, select: { applicationId: true } }) : Promise.resolve([])
  ]);
  const applications = new Set(links.map((link) => link.applicationId));
  const now = new Date();
  return records.flatMap((record) => {
    const review = reviews.get(record.id);
    if (record.applicationId && !applications.has(record.applicationId)) return [];
    if (!companySourceEligible(record, review, taskId, record.applicationId, now)) return [];
    return [{ content: companySourceApprovedContent(record), provenance: companySourceProvenance(review!, record) }];
  }).sort((a, b) => a.content.title.localeCompare(b.content.title) || a.content.id.localeCompare(b.content.id));
}
