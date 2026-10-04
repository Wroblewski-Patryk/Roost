import { Prisma } from "@prisma/client";

// The 101st row detects truncation; the view still exposes at most 100 sources.
// App context must precede shared records so a large global catalogue cannot
// hide the native revisions required to review this application's assumptions.
export function taskInterviewSourceCatalogQuery(workspaceId: string, applicationId: string) {
  return Prisma.sql`SELECT task_interview_record(id) AS ref
    FROM company_records
    WHERE workspace_id=${workspaceId}::uuid
      AND (application_id IS NULL OR application_id=${applicationId}::uuid)
      AND status<>'archived'
    ORDER BY CASE WHEN application_id=${applicationId}::uuid THEN 0 ELSE 1 END,id
    LIMIT 101`;
}
