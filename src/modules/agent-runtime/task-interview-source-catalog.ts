import { Prisma } from "@prisma/client";

// The 101st row detects truncation; the view still exposes at most 100 sources.
// Current task pins precede historical app records, followed by shared records.
// Pins are read from locked server task state, never caller-supplied query IDs;
// priority does not bypass the workspace/application/archive predicates.
export function taskInterviewSourceCatalogQuery(workspaceId: string, applicationId: string, executionReadiness?: unknown) {
  const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const context = record(record(record(executionReadiness).contract).context);
  const pinnedIds = [...new Set(["company", "product", "technical"].flatMap(group => Array.isArray(context[group]) ? (context[group] as unknown[]).map(ref => record(ref).id) : [])
    .filter((id): id is string => typeof id === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)).map(id => id.toLowerCase()))];
  const priority = pinnedIds.length ? Prisma.sql`ARRAY[${Prisma.join(pinnedIds)}]::uuid[]` : Prisma.sql`ARRAY[]::uuid[]`;
  return Prisma.sql`SELECT task_interview_record(id) AS ref
    FROM company_records
    WHERE workspace_id=${workspaceId}::uuid
      AND (application_id IS NULL OR application_id=${applicationId}::uuid)
      AND status<>'archived'
    ORDER BY CASE WHEN id=ANY(${priority}) THEN 0 WHEN application_id=${applicationId}::uuid THEN 1 ELSE 2 END,id
    LIMIT 101`;
}
