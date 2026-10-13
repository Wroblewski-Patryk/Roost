import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, realpathSync, statSync, writeSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const digest = /^[a-f0-9]{64}$/;
const taskSites = "/v1/product-engineering/tasks/:taskId/reference-sites";
const sitePackage = `${taskSites}/:siteId/package`;
const siteFindings = `${taskSites}/:siteId/findings`;
const allowedRoutes = new Set([`GET ${sitePackage}`, `POST ${siteFindings}`]);
const findingBodyKeys = ["requestId", "packageDigest", "observationId", "siteRevision", "sourceReviewId",
  "title", "category", "language", "observed", "sourceExcerpt", "interpretation", "uncertainty", "applicability"];
const findingContentKeys = ["title", "category", "language", "observed", "sourceExcerpt",
  "interpretation", "uncertainty", "applicability"];

function inside(child, parent) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every(key => keys.includes(key));
}

function requiredKeys(value, keys) {
  return Array.isArray(value) && value.length === keys.length &&
    new Set(value).size === keys.length && keys.every(key => value.includes(key));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableRequestId(taskId, site) {
  const value = sha256(`roost-reference-site-mcp-guard-v1:${taskId}:${site.siteId}:${site.observationId}`);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-5${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20, 32)}`;
}

function requiredString(value, label, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`Invalid finding guard ${label}.`);
  return value;
}

export function loadReferenceSiteMcpGuard(configPath, repositoryRoot) {
  if (!configPath) return null;
  if (!isAbsolute(configPath)) throw new Error("Finding guard config path must be absolute.");
  const realConfig = realpathSync(configPath);
  const realRoot = realpathSync(repositoryRoot);
  if (inside(realConfig, realRoot)) throw new Error("Finding guard config must be outside the repository.");
  const config = JSON.parse(readFileSync(realConfig, "utf8"));
  if (!exactKeys(config, ["schemaVersion", "taskId", "expiresAt", "stateDirectory", "sites"]) ||
      config.schemaVersion !== "roost-reference-site-mcp-guard-v1" || !Array.isArray(config.sites) ||
      config.sites.length !== 2) throw new Error("Invalid finding guard configuration.");
  requiredString(config.taskId, "taskId", uuid);
  const expiresAt = Date.parse(config.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 24 * 60 * 60 * 1000)
    throw new Error("Finding guard expiry must be within 24 hours.");
  if (typeof config.stateDirectory !== "string" || !isAbsolute(config.stateDirectory))
    throw new Error("Finding guard state directory must be absolute.");
  const stateDirectory = realpathSync(config.stateDirectory);
  if (inside(stateDirectory, realRoot) || !statSync(stateDirectory).isDirectory())
    throw new Error("Finding guard state directory must be outside the repository.");
  const pairs = new Map();
  for (const site of config.sites) {
    if (!exactKeys(site, ["siteId", "observationId", "siteRevision", "sourceReviewId", "packageDigest"]))
      throw new Error("Invalid finding guard site entry.");
    requiredString(site.siteId, "siteId", uuid);
    requiredString(site.observationId, "observationId", /^[a-z0-9][a-z0-9-]{0,127}$/);
    requiredString(site.sourceReviewId, "sourceReviewId", uuid);
    requiredString(site.packageDigest, "packageDigest", digest);
    if (typeof site.siteRevision !== "string" || !Number.isFinite(Date.parse(site.siteRevision)))
      throw new Error("Invalid finding guard siteRevision.");
    if (pairs.has(site.siteId)) throw new Error("Finding guard site IDs must be distinct.");
    pairs.set(site.siteId, site);
  }

  function checkExpiry() {
    if (Date.now() >= expiresAt) throw new Error("Finding guard expired.");
  }

  function permitsTool(tool) {
    return allowedRoutes.has(`${tool.method} ${tool.path}`);
  }

  function publicInputSchema(tool) {
    if (tool.method !== "GET" || tool.path !== sitePackage) return tool.inputSchema;
    const schema = tool.inputSchema;
    if (schema?.type !== "object" || schema.additionalProperties !== false ||
      !exactKeys(schema.properties, ["taskId", "siteId", "query"]) ||
      schema.properties.taskId?.type !== "string" || schema.properties.siteId?.type !== "string" ||
      schema.properties.query?.type !== "object" || !Array.isArray(schema.required) ||
      schema.required.length !== 2 || !schema.required.includes("taskId") ||
      !schema.required.includes("siteId")) throw new Error("Finding guard package schema changed.");
    const properties = { ...schema.properties };
    delete properties.query;
    return { ...schema, properties };
  }

  function checkedManifestTools(manifestTools) {
    if (!Array.isArray(manifestTools)) throw new Error("Finding guard manifest tools are unavailable.");
    const matching = (method, path) => manifestTools.filter(tool => tool.method === method && tool.path === path);
    const gets = matching("GET", sitePackage), posts = matching("POST", siteFindings);
    if (gets.length !== 1 || posts.length !== 1) throw new Error("Finding guard exact routes changed.");
    const get = gets[0], post = posts[0];
    if (get.riskLevel !== "read" || post.riskLevel !== "write")
      throw new Error("Finding guard route risk changed.");
    publicInputSchema(get);
    const schema = post.inputSchema, body = schema?.properties?.body;
    if (schema?.type !== "object" || schema.additionalProperties !== false ||
      !exactKeys(schema.properties, ["taskId", "siteId", "body"]) ||
      schema.properties.taskId?.type !== "string" || schema.properties.siteId?.type !== "string" ||
      !requiredKeys(schema.required, ["taskId", "siteId", "body"]) ||
      body?.type !== "object" || body.additionalProperties !== false ||
      !exactKeys(body.properties, findingBodyKeys) || !requiredKeys(body.required, findingBodyKeys) ||
      !findingBodyKeys.every(key => body.properties[key]?.type === "string"))
      throw new Error("Finding guard POST schema changed.");
    return { get, post, body };
  }

  function boundTools(manifestTools) {
    const { get, post, body } = checkedManifestTools(manifestTools);
    const contentProperties = Object.fromEntries(findingContentKeys.map(key => [key, body.properties[key]]));
    return [
      ...config.sites.map((site, index) => ({
        name: `companycore_guarded_reference_site_${index + 1}_get_package`, site, tool: get,
        public: { ...get, name: `companycore_guarded_reference_site_${index + 1}_get_package`,
          title: `Read configured reference site ${index + 1} package`,
          description: `Read the approved package for configured Site ${index + 1} (${site.siteId}), observation ${site.observationId}. No path arguments are accepted.`,
          inputSchema: { type: "object", additionalProperties: false, properties: {}, required: [] } }
      })),
      ...config.sites.map((site, index) => ({
        name: `companycore_guarded_reference_site_${index + 1}_post_finding`, site, tool: post,
        public: { ...post, name: `companycore_guarded_reference_site_${index + 1}_post_finding`,
          title: `Propose configured reference site ${index + 1} Finding`,
          description: `Propose one Finding for configured Site ${index + 1} (${site.siteId}), observation ${site.observationId}. The bridge binds source IDs and requires exact owner approval before POST.`,
          inputSchema: { type: "object", additionalProperties: false,
            properties: { body: { type: "object", additionalProperties: false,
              properties: contentProperties, required: findingContentKeys } }, required: ["body"] } }
      }))
    ];
  }

  function publicTools(manifestTools) {
    return boundTools(manifestTools).map(binding => binding.public);
  }

  function resolveCall(manifestTools, name, args) {
    checkExpiry();
    const binding = boundTools(manifestTools).find(item => item.name === name);
    if (!binding) throw new Error("Finding guard refused tool or arguments.");
    let toolArgs;
    if (binding.tool.method === "GET") {
      if (!exactKeys(args, []) || Object.keys(args).length !== 0)
        throw new Error("Finding guard refused tool or arguments.");
      toolArgs = { taskId: config.taskId, siteId: binding.site.siteId };
    } else {
      if (!exactKeys(args, ["body"]) || Object.keys(args).length !== 1 ||
        !exactKeys(args.body, findingContentKeys) ||
        Object.keys(args.body).length !== findingContentKeys.length ||
        !findingContentKeys.every(key => typeof args.body[key] === "string" && args.body[key].trim().length > 0) ||
        !["content", "function", "journey", "failure"].includes(args.body.category) ||
        !["pl", "en"].includes(args.body.language))
        throw new Error("Finding guard refused incomplete or changed Finding content.");
      toolArgs = { taskId: config.taskId, siteId: binding.site.siteId,
        body: { requestId: stableRequestId(config.taskId, binding.site),
          packageDigest: binding.site.packageDigest, observationId: binding.site.observationId,
          siteRevision: binding.site.siteRevision, sourceReviewId: binding.site.sourceReviewId,
          ...args.body } };
    }
    checkCall(binding.tool, toolArgs);
    return { tool: binding.tool, toolArgs };
  }

  function checkCall(tool, args) {
    checkExpiry();
    const packageGet = tool.method === "GET" && tool.path === sitePackage;
    if (packageGet) publicInputSchema(tool);
    if (!permitsTool(tool) || !exactKeys(args, ["taskId", "siteId",
      ...(packageGet ? ["query"] : ["body"])]) ||
      (packageGet && Object.hasOwn(args, "query") && !exactKeys(args.query, [])))
      throw new Error("Finding guard refused tool or arguments.");
    if (args.taskId !== config.taskId) throw new Error("Finding guard refused foreign task.");
    if (!tool.path.includes(":siteId")) return null;
    const site = pairs.get(args.siteId);
    if (!site) throw new Error("Finding guard refused foreign site.");
    if (tool.method !== "POST") return null;
    if (!exactKeys(args.body, findingBodyKeys) ||
      args.body.observationId !== site.observationId || args.body.siteRevision !== site.siteRevision ||
      args.body.sourceReviewId !== site.sourceReviewId || args.body.packageDigest !== site.packageDigest ||
      !uuid.test(args.body.requestId ?? "")) throw new Error("Finding guard refused changed or stale observation.");
    return site;
  }

  function approval(tool, args, url) {
    const site = checkCall(tool, args);
    if (!site) throw new Error("Finding guard approval requires a Finding POST.");
    if (existsSync(slotPath(site))) throw new Error("Finding guard slot already spent; no POST was sent.");
    // Server request-id uniqueness is the second fence if a host power loss ever loses a local slot entry.
    const bodyBytes = JSON.stringify({ ...args.body, requestId: stableRequestId(config.taskId, site) });
    const exactRequest = JSON.stringify({ method: "POST", url, body: JSON.parse(bodyBytes) });
    return { site, bodyBytes, exactRequest, requestDigest: sha256(exactRequest), requestId: stableRequestId(config.taskId, site) };
  }

  function reserve(site, requestDigest, requestId) {
    checkExpiry();
    const fd = openSync(slotPath(site), "wx", 0o600);
    try {
      const metadata = JSON.stringify({ requestDigest, requestId, reservedAt: new Date().toISOString() });
      const bytes = Buffer.from(metadata, "utf8");
      let offset = 0;
      while (offset < bytes.length) offset += requireWrite(fd, bytes, offset);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }

  function slotPath(site) {
    return join(stateDirectory, `${sha256(`${config.taskId}:${site.siteId}:${site.observationId}`)}.slot`);
  }

  return { checkCall, permitsTool, publicInputSchema, publicTools, resolveCall, approval, reserve, expiresAt };
}

function requireWrite(fd, bytes, offset) {
  const written = writeSync(fd, bytes, offset, bytes.length - offset);
  if (!written) throw new Error("Finding guard failed to reserve slot.");
  return written;
}
