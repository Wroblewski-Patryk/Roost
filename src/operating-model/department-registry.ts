export const canonicalDepartmentKeys = [
  "00-ogolny",
  "01-strategia",
  "02-produkt",
  "03-sprzedaz",
  "04-operacje",
  "05-relacje",
  "06-kadry",
  "07-finanse",
  "08-zasoby",
  "09-technologia",
  "10-prawo",
  "11-innowacje",
  "12-zarzadzanie"
] as const;

export type CanonicalDepartmentKey = typeof canonicalDepartmentKeys[number];

type DepartmentRegistryEntry = {
  canonicalKey: CanonicalDepartmentKey;
  backendAreaKey: string;
  position: number;
  aliases: readonly string[];
  hintTerms: readonly string[];
};

export const departmentRegistry = [
  {
    canonicalKey: "00-ogolny",
    backendAreaKey: "main-general",
    position: 0,
    aliases: ["00-ogolny", "00-general", "00-main", "main-general", "general", "glowny"],
    hintTerms: ["inbox", "unclassified", "unsorted", "general", "main", "owner idea", "intake"]
  },
  {
    canonicalKey: "01-strategia",
    backendAreaKey: "strategy-governance",
    position: 1,
    aliases: ["01-strategia", "01-strategy", "strategy-governance", "strategy", "governance", "goals", "targets"],
    hintTerms: ["strategy", "goal", "target", "kpi", "vision", "positioning", "governance"]
  },
  {
    canonicalKey: "02-produkt",
    backendAreaKey: "projects-delivery",
    position: 2,
    aliases: ["02-produkt", "02-product", "02-product-delivery", "projects-delivery", "product", "delivery", "service", "design", "ux"],
    hintTerms: ["product", "delivery", "acceptance", "test", "scope", "service", "project"]
  },
  {
    canonicalKey: "03-sprzedaz",
    backendAreaKey: "sales-crm",
    position: 3,
    aliases: ["03-sprzedaz", "03-sales", "sales-crm", "sales", "crm", "deals", "marketing"],
    hintTerms: ["lead", "deal", "offer", "proposal", "sales", "client prospect", "promotion", "ad", "crm"]
  },
  {
    canonicalKey: "04-operacje",
    backendAreaKey: "operations-administration",
    position: 4,
    aliases: ["04-operacje", "04-operations", "operations-administration", "operations", "procedures", "routine"],
    hintTerms: ["operation", "workflow", "sop", "dependency", "routine", "approval", "blocker", "procedure"]
  },
  {
    canonicalKey: "05-relacje",
    backendAreaKey: "sales-crm",
    position: 5,
    aliases: ["05-relacje", "05-relations", "05-client-relations", "relationships", "clients", "support", "feedback", "customer-success"],
    hintTerms: ["client", "support", "feedback", "follow-up", "relationship", "customer"]
  },
  {
    canonicalKey: "06-kadry",
    backendAreaKey: "people-roles",
    position: 6,
    aliases: ["06-kadry", "06-people", "06-people-agents-roles", "people-roles", "people", "roles", "agents", "hr", "human-resources", "agent-management"],
    hintTerms: ["role", "people", "agent capacity", "capacity", "escalation", "owner", "hiring"]
  },
  {
    canonicalKey: "07-finanse",
    backendAreaKey: "finance-billing",
    position: 7,
    aliases: ["07-finanse", "07-finance", "finance-billing", "finance", "billing", "invoice", "payment"],
    hintTerms: ["price", "pricing", "discount", "invoice", "payment", "cost", "margin", "finance", "billing"]
  },
  {
    canonicalKey: "08-zasoby",
    backendAreaKey: "assets-storage",
    position: 8,
    aliases: ["08-zasoby", "08-resources", "08-assets-knowledge", "assets-storage", "assets", "storage", "resources", "knowledge", "documentation"],
    hintTerms: ["drive", "file", "folder", "resource", "asset", "knowledge", "document", "storage"]
  },
  {
    canonicalKey: "09-technologia",
    backendAreaKey: "automations-integrations",
    position: 9,
    aliases: ["09-technologia", "09-technology", "09-technology-automation", "automations-integrations", "technology", "automation", "integration", "engineering"],
    hintTerms: ["mcp", "api", "integration", "runtime", "webhook", "automation", "technology"]
  },
  {
    canonicalKey: "10-prawo",
    backendAreaKey: "strategy-governance",
    position: 10,
    aliases: ["10-prawo", "10-legal", "10-governance-risk-legal", "legal", "risk", "policy", "control"],
    hintTerms: ["policy", "legal", "risk", "control", "security", "permission", "contract"]
  },
  {
    canonicalKey: "11-innowacje",
    backendAreaKey: "ai-agents-observability",
    position: 11,
    aliases: ["11-innowacje", "11-innovation", "11-innovation-improvement", "ai-agents-observability", "innovation", "improvement"],
    hintTerms: ["experiment", "improvement", "lesson", "retrospective", "idea", "innovation"]
  },
  {
    canonicalKey: "12-zarzadzanie",
    backendAreaKey: "knowledge-decisions",
    position: 12,
    aliases: ["12-zarzadzanie", "12-management", "knowledge-decisions", "management", "decisions", "executive", "ceo-office"],
    hintTerms: ["management", "executive", "decision", "report", "review", "command"]
  }
] as const satisfies readonly DepartmentRegistryEntry[];

export function normalizeDepartmentKey(value: string) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveDepartmentEntry(value: string) {
  const normalized = normalizeDepartmentKey(value);
  return departmentRegistry.find((entry) => (
    entry.canonicalKey === normalized
    || entry.backendAreaKey === normalized
    || entry.aliases.some((alias) => normalizeDepartmentKey(alias) === normalized)
  )) ?? null;
}

export function resolveDepartmentBackendAreaKey(value: string) {
  return resolveDepartmentEntry(value)?.backendAreaKey ?? normalizeDepartmentKey(value);
}

export function isCanonicalDepartmentKey(value: string): value is CanonicalDepartmentKey {
  return (canonicalDepartmentKeys as readonly string[]).includes(value);
}
