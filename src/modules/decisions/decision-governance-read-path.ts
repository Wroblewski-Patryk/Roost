export function isDecisionGovernanceRead(method: string, path: string): boolean {
  return method === "GET" && /^\/(?:v1\/)?decisions\/(?:governance|mandates|[^/]+\/governance)\/?$/.test(path);
}
