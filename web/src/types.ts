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

export type AuthMe = {
  authType: "user" | "api_key";
  userId?: string;
  workspaceId: string;
  workspaces?: WorkspaceSummary[];
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  role?: string;
  active?: boolean;
  ownerUserId?: string;
  createdAt?: string;
  updatedAt?: string;
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
  task: {
    id: string;
    title: string;
    description?: string | null;
    status?: string;
    normalizedStatus?: string;
    priority?: string;
    dueDate?: string | null;
    source?: string | null;
    externalId?: string | null;
    updatedAt?: string;
  };
  hierarchy?: {
    project?: { id: string; name: string; status?: string } | null;
    taskList?: { id: string; name: string; status?: string } | null;
  };
  readiness?: {
    blocked?: boolean;
    overdue?: boolean;
    dependencyCount?: number;
    riskLevel?: string;
    missingFields?: string[];
  };
  evidence?: {
    dependencies?: Array<{ id: string; type?: string; status?: string }>;
    notes?: Array<{ id: string; content?: string; status?: string }>;
    events?: Array<{ id: string; type?: string; source?: string }>;
    projectResources?: Array<{ id: string; name?: string; type?: string }>;
  };
};

export type OperationsTaskList = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  source?: string | null;
  externalId?: string | null;
  taskCount?: number;
  project?: { id: string; name: string; status?: string } | null;
};

export type OperationsStatusColumn = {
  key: "todo" | "in_progress" | "blocked" | "done" | "archived";
  label: string;
};

export type OperationsPacket = {
  summary?: Record<string, unknown>;
  taskLists?: OperationsTaskList[];
  statuses?: OperationsStatusColumn[];
  workItems?: OperationsWorkItem[];
  blockedActions?: Array<string | { action?: string; reason?: string }>;
  agentPacket?: {
    mode?: string;
    instructions?: string[];
    blockedActions?: Array<string | { action?: string; reason?: string }>;
  };
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
  summary?: Record<string, unknown>;
  resources?: AssetResource[];
  blockedActions?: string[];
  agentPacket?: { mode?: string; instructions?: string[] };
};

export type CoreAreaKey =
  | "00-ogolny"
  | "01-strategia"
  | "02-produkt"
  | "03-sprzedaz"
  | "04-operacje"
  | "05-relacje"
  | "06-kadry"
  | "07-finanse"
  | "08-zasoby"
  | "09-technologia"
  | "10-prawo"
  | "11-innowacje"
  | "12-zarzadzanie";

export type CoreArea = {
  key: CoreAreaKey;
  labelKey: string;
  eyebrowKey: string;
  href?: string;
  descriptionKey: string;
  icon: string;
  enabled?: boolean;
  views?: DepartmentView[];
};

export type DepartmentView = {
  key: string;
  labelKey: string;
  href?: string;
  enabled?: boolean;
};
