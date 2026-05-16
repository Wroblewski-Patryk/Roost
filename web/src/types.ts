export type LoadState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  error?: string;
};

export type AuthPayload = {
  data?: {
    token: string;
    user: { email: string; name?: string | null };
    workspace: { name: string };
  };
  error?: string;
};

export type RouteProposal = {
  id: string;
  title?: string;
  status?: string;
  targetDepartmentKey?: string;
  sourceType?: string;
  riskLevel?: string;
};

export type RouteProposalPacket = {
  summary?: Record<string, number>;
  proposals?: RouteProposal[];
  blockedActions?: string[];
};

export type OperationsWorkItem = {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  owner?: string | null;
  readiness?: string;
  linkedResources?: number;
};

export type OperationsPacket = {
  summary?: Record<string, number>;
  workItems?: OperationsWorkItem[];
  blockedActions?: string[];
  agentPacket?: { mode?: string; instructions?: string[] };
};

export type AssetResource = {
  id: string;
  name: string;
  type?: string;
  status?: string;
  owner?: string | null;
  aiContextReady?: boolean;
  source?: string;
  webViewLink?: string;
};

export type AssetsPacket = {
  summary?: Record<string, number>;
  resources?: AssetResource[];
  blockedActions?: string[];
  agentPacket?: { mode?: string; instructions?: string[] };
};

export type CoreAreaKey = "00-ogolny" | "04-operacje" | "08-zasoby";

export type CoreArea = {
  key: CoreAreaKey;
  labelKey: string;
  eyebrowKey: string;
  href: string;
  descriptionKey: string;
  icon: string;
};
