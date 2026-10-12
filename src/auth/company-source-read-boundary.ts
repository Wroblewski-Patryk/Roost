// Ordinary API keys do not carry a task-scoped CompanyRecord read authority.
// Keep broad projections behind human authentication; agents use the dedicated
// task-bound source read instead. Paths here are the complete native/MCP read
// inventory that can expose a CompanyRecord body, title, or relationship.
export function unboundCompanySourceRead(method: string, path: string) {
  if (method !== "GET") return false;
  const route = path.replace(/\/+$/, "").toLowerCase().replace(/^\/v1(?=\/)/, "");
  return /^\/company-records(?:\/|$)/.test(route)
    || route === "/strategy/direction"
    || /^\/company-intelligence\/(?:search|graph)$/.test(route)
    || /^\/company-intelligence\/entities\/(?:company_record|requirement)\/[^/]+$/.test(route)
    || /^\/company-intelligence\/tasks\/[^/]+\/agent-context$/.test(route)
    || /^\/projects\/[^/]+\/workspace$/.test(route)
    || /^\/product-engineering\/applications\/[^/]+\/(?:graph|agent-context|findings\/catalog)$/.test(route)
    || /^\/agent-runtime\/tasks\/[^/]+\/interviews$/.test(route)
    || /^\/agent-runtime\/tasks\/[^/]+\/(?:execution-readiness|information-approval-candidate|information-result)$/.test(route)
    || /^\/agent-runtime\/executions(?:\/[^/]+)?$/.test(route)
    || /^\/decisions\/(?:governance|[^/]+\/governance)$/.test(route)
    || route === "/events"
    || /^\/dashboard\/(?:attention|command)$/.test(route)
    || /^\/organizational-context\/(?:company_record|requirement)\/[^/]+$/.test(route)
    || route === "/entity-relations";
}

// A capability is a permission to use an adapter, not authority to browse
// company source material. The ordinary API/MCP key has no authenticated task
// identity. The deliberately small read surface below is shared by HTTP auth
// and the advertised MCP manifest. Worker tickets have a separate transport.
export function ordinaryApiKeyReadAllowed(method: string, path: string, boundAgent: boolean) {
  const route = path.replace(/\/+$/, "").toLowerCase().replace(/^\/v1(?=\/)/, "");
  if (boundAgent && method === "POST" &&
    /^\/product-engineering\/tasks\/[a-f0-9-]{36}\/reference-sites\/[a-f0-9-]{36}\/findings$/.test(route)) return true;
  if (boundAgent && method === "GET" &&
    /^\/product-engineering\/tasks\/[a-f0-9-]{36}\/reference-sites(?:\/[a-f0-9-]{36}\/(?:package|findings))?$/.test(route)) return true;
  if (boundAgent && method === "GET" &&
    /^\/product-engineering\/tasks\/[a-f0-9-]{36}\/reference-site-checklist$/.test(route)) return true;
  // A workspace key can write an existing row with an empty PATCH and receive
  // its entire previous body. No unbound key has a task principal. Keep only
  // commands whose handlers authenticate the bound agent against that task or
  // a separately governed release; all other commands use human auth.
  if (method !== "GET") return boundAgent && method === "POST" && (
    /^\/google-drive\/tasks\/[a-f0-9-]{36}\/docs\/[a-f0-9-]{36}\/governed\/append$/.test(route)
    ||
    /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/proposals$/.test(route)
    || /^\/goal-mandates\/tasks\/[a-f0-9-]{36}\/measurements$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/procedure-improvements$/.test(route)
    ||
    /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/actions\/review(?:-return)?$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/handoffs(?:\/actions\/(?:accept|reject))?$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/specialist-offer\/actions\/(?:accept|reject)$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/clarifications(?:\/actions\/(?:reply|read))?$/.test(route)
    || /^\/agent-runtime\/releases\/[a-f0-9-]{36}\/operations(?:\/[a-f0-9-]{36}\/outcome)?$/.test(route)
    || /^\/product-engineering\/findings\/[a-f0-9-]{36}\/actions$/.test(route)
    || /^\/decisions\/[a-f0-9-]{36}\/governance\/actions$/.test(route));
  if (route === "/connection" || route === "/mcp/manifest") return true;
  if (!boundAgent) return false;
  return /^\/google-drive\/tasks\/[a-f0-9-]{36}\/docs\/[a-f0-9-]{36}\/governed$/.test(route)
    || /^\/strategy\/tasks\/[a-f0-9-]{36}\/direction$/.test(route)
    || /^\/goal-mandates\/tasks\/[a-f0-9-]{36}$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/company-sources(?:\/[a-f0-9-]{36})?$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/model-policy-proposal$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/sources(?:\/(?:procedure|policy|decision|evidence|note|knowledge_item|application_evidence|application_architecture|application_interface|application_capability|drive_snapshot)\/[a-f0-9-]{36})?$/.test(route)
    || route === "/tasks" || /^\/tasks\/[a-f0-9-]{36}$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/review$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/procedure-improvements$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/(?:handoffs|clarifications)$/.test(route)
    || /^\/agent-runtime\/tasks\/[a-f0-9-]{36}\/specialist-offer$/.test(route)
    || /^\/agent-runtime\/releases(?:\/[a-f0-9-]{36})?$/.test(route)
    || /^\/product-engineering\/findings\/[a-f0-9-]{36}$/.test(route)
    || /^\/decisions\/[a-f0-9-]{36}\/governance$/.test(route);
}
