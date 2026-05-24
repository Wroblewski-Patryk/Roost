import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const capabilitiesSource = readFileSync(path.join(root, "src/auth/capabilities.ts"), "utf8");

const manifestRoutes = Array.from(capabilitiesSource.matchAll(/\{\s*method:\s*"([A-Z]+)",\s*path:\s*"([^"]+)",\s*capability:\s*"([^"]+)"/g))
  .map((match) => ({ method: match[1], path: match[2], capability: match[3] }));

const capabilitiesMatch = capabilitiesSource.match(/export const capabilities = \[([\s\S]*?)\] as const/);
const capabilities = new Set(Array.from((capabilitiesMatch?.[1] ?? "").matchAll(/"([^"]+)"/g)).map((match) => match[1]));

const protectedMounts = new Map([
  ["assets.routes.ts", "/assets"],
  ["commercial-exceptions.routes.ts", "/commercial-exceptions"],
  ["company-os.routes.ts", "/company-os"],
  ["workflow-definition-drafts.routes.ts", "/company-os/workflow-definitions/drafts"],
  ["connection.routes.ts", "/connection"],
  ["dashboard.routes.ts", "/dashboard"],
  ["departments.routes.ts", "/departments"],
  ["finance.routes.ts", "/finance"],
  ["intake.routes.ts", "/intake"],
  ["mcp.routes.ts", "/mcp"],
  ["operating-graph.routes.ts", "/operating-graph"],
  ["operating-model.routes.ts", "/operating-model"],
  ["operations.routes.ts", "/operations"],
  ["relationships.routes.ts", "/relationships"],
  ["sales.routes.ts", "/sales"],
  ["strategy.routes.ts", "/strategy"],
  ["workforce.routes.ts", "/workforce"],
  ["projects.routes.ts", "/projects"],
  ["goals.routes.ts", "/goals"],
  ["targets.routes.ts", "/targets"],
  ["task-lists.routes.ts", "/task-lists"],
  ["tasks.routes.ts", "/tasks"],
  ["clients.routes.ts", "/clients"],
  ["pipeline-stages.routes.ts", "/pipeline-stages"],
  ["deals.routes.ts", "/deals"],
  ["interactions.routes.ts", "/interactions"],
  ["notes.routes.ts", "/notes"],
  ["decisions.routes.ts", "/decisions"],
  ["agents.routes.ts", "/agents"],
  ["agent-logs.routes.ts", "/agent-logs"],
  ["agent-events.routes.ts", "/agent-events"],
  ["events.routes.ts", "/events"],
  ["integration-settings.routes.ts", "/integration-settings"],
  ["google-drive.routes.ts", "/google-drive"]
]);

const routerMountOverrides = new Map([
  ["workflowDefinitionDraftsRouter", "/company-os/workflow-definitions/drafts"],
  ["workflowDefinitionRecoveryRouter", "/company-os/workflow-definitions"]
]);

const routePathExpansions = new Map([
  ["integration-settings.routes.ts:/:provider", ["/clickup", "/google_drive"]]
]);

const ownerOnlyOrOutOfBand = new Set([
  "api-keys.routes.ts",
  "auth.routes.ts",
  "workspaces.routes.ts",
  "clickup-webhooks.routes.ts"
]);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    return statSync(fullPath).isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function normalizeRoute(routePath) {
  if (routePath === "/") return "";
  return routePath.replace(/\/+$/, "");
}

function routePattern(manifestPath) {
  const escaped = manifestPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:[^/]+/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
}

const manifestByMethod = new Map();
for (const route of manifestRoutes) {
  if (!capabilities.has(route.capability)) {
    throw new Error(`Manifest route ${route.method} ${route.path} references unknown capability ${route.capability}`);
  }
  const routes = manifestByMethod.get(route.method) ?? [];
  routes.push(route);
  manifestByMethod.set(route.method, routes);
}

const routeFiles = walk(path.join(root, "src/modules")).filter((file) => file.endsWith(".routes.ts"));
const missing = [];

for (const file of routeFiles) {
  const basename = path.basename(file);
  if (ownerOnlyOrOutOfBand.has(basename)) {
    continue;
  }
  const mount = protectedMounts.get(basename);
  if (!mount) {
    missing.push(`No protected mount classification for ${basename}`);
    continue;
  }

  const source = readFileSync(file, "utf8");
  const calls = Array.from(source.matchAll(/(\w*Router)\.(get|post|patch|put|delete)\(\s*"([^"]+)"/g))
    .flatMap((match) => {
      const routerName = match[1];
      const method = match[2].toUpperCase();
      const routePath = normalizeRoute(match[3]);
      const resolvedMount = routerMountOverrides.get(routerName) ?? mount;
      const expansions = routePathExpansions.get(`${basename}:${routePath}`) ?? [routePath];

      return expansions.map((expandedPath) => ({
        method,
        path: `/v1${resolvedMount}${normalizeRoute(expandedPath)}`
      }));
    });

  for (const call of calls) {
    const candidates = manifestByMethod.get(call.method) ?? [];
    if (!candidates.some((route) => routePattern(route.path).test(call.path))) {
      missing.push(`${call.method} ${call.path} from ${basename}`);
    }
  }
}

if (missing.length) {
  console.error("Route/capability manifest drift detected:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(JSON.stringify({
  checkedManifestRoutes: manifestRoutes.length,
  checkedRouteFiles: routeFiles.length - ownerOnlyOrOutOfBand.size,
  status: "ok"
}, null, 2));
