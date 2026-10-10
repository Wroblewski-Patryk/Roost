// Ordinary API keys do not carry a task-scoped CompanyRecord read authority.
// Keep broad projections behind human authentication; agents use the dedicated
// task-bound source read instead. Paths here are the complete native/MCP read
// inventory that can expose a CompanyRecord body, title, or relationship.
export function unboundCompanySourceRead(method: string, path: string) {
  if (method !== "GET") return false;
  const route = path.replace(/\/+$/, "").toLowerCase().replace(/^\/v1(?=\/)/, "");
  return /^\/company-records(?:\/|$)/.test(route)
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
