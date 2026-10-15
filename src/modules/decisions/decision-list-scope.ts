export type DecisionHistoryReason = "archived" | "withdrawn" | "superseded" | "rejected" | null;

export function decisionHistoryReason(row: { status: string; governanceState: string | null; acceptedSuccessor: boolean }): DecisionHistoryReason {
  if (row.status === "archived") return "archived";
  if (row.governanceState === "withdrawn") return "withdrawn";
  if (row.status === "superseded" || row.acceptedSuccessor) return "superseded";
  if (row.status === "rejected") return "rejected";
  return null;
}
