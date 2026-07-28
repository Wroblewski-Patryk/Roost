export type ProductMapReadStatus = "current" | "stale" | "conflict" | "empty" | "unavailable";

export type ProductMapProjectionItem = {
  offeringId: string;
  paperclipProjectName: string;
  lifecycleStage: string;
  conflictState: "none" | "project_mapping_conflict" | "owner_surface_unavailable";
  sourceControl: {
    branch: string | null;
    sourceSha: string | null;
    deployedSha: string | null;
    versionAlignment: "aligned" | "different" | "unknown";
  };
  readiness: {
    status: "GO" | "NO-GO" | "UNKNOWN";
    evidenceState: "complete" | "missing" | "unknown";
    zeroGapButNoGo: boolean;
    totalGaps: number;
    nextGate: string | null;
  };
  aggregates: { issues: { total: number; byStatus: Record<string, number> } };
};

export type ProductMapProjection = {
  observedAt: string;
  sourceState: "available" | "unavailable" | "timed_out";
  stale: boolean;
  conflictState: "none" | "source_unavailable" | "project_mapping_conflict" | "owner_surface_unavailable";
  items: ProductMapProjectionItem[];
};

export type ProductMapReadResponse = {
  data: { status: ProductMapReadStatus; packet: ProductMapProjection | null; observedAt: string | null };
};

export function isNegativeItem(item: ProductMapProjectionItem) {
  return item.readiness.status === "NO-GO" || item.readiness.zeroGapButNoGo || item.conflictState !== "none";
}

export function itemTone(item: ProductMapProjectionItem) {
  if (isNegativeItem(item)) return "badge-error";
  if (item.readiness.status === "UNKNOWN" || item.readiness.evidenceState !== "complete") return "badge-warning";
  return "badge-success";
}

export function projectionTone(status: ProductMapReadStatus, packet: ProductMapProjection | null) {
  if (status === "current" && packet?.sourceState === "available" && !packet.stale && packet.conflictState === "none") return "success" as const;
  if (status === "stale" || status === "conflict") return "warning" as const;
  return "error" as const;
}

export function projectionMessage(status: ProductMapReadStatus, packet: ProductMapProjection | null) {
  if (status === "empty") return { title: "No Product Map projection yet", detail: "No accepted owner projection is available for this workspace. Check the release evidence before making a readiness decision." };
  if (status === "unavailable") return { title: "Product Map projection unavailable", detail: "The last accepted projection is no longer safe to present as current. Retry after the workspace service recovers." };
  if (status === "conflict") return { title: "Product Map conflict needs review", detail: "A newer projection was quarantined. This view keeps the stricter state visible and cannot promote readiness." };
  if (status === "stale" || packet?.stale) return { title: "Showing last known good Product Map", detail: "This projection is stale. Treat it as historical evidence and verify the next gate before relying on it." };
  return { title: "Current Product Map projection", detail: "This is a Roost read model. Paperclip remains the authority for execution and evidence." };
}
