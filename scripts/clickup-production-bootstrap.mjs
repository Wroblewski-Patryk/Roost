const requiredEnv = [
  "COMPANYCORE_BASE_URL",
  "COMPANYCORE_API_KEY",
  "CLICKUP_API_TOKEN",
  "CLICKUP_TEAM_ID",
  "CLICKUP_LIST_IDS"
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env: ${missing.join(", ")}`);
  process.exit(1);
}

const baseUrl = process.env.COMPANYCORE_BASE_URL.replace(/\/+$/, "");
const listIds = process.env.CLICKUP_LIST_IDS.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (listIds.length === 0) {
  console.error("CLICKUP_LIST_IDS must contain at least one ClickUp list ID.");
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.COMPANYCORE_API_KEY,
      ...(options.headers ?? {})
    }
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: "invalid_json_response" };
  }

  if (!response.ok) {
    const errorCode = typeof body.error === "string"
      ? body.error
      : body.error?.code ?? "request_failed";
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${errorCode}`);
  }

  return body;
}

console.log("Checking CompanyCore connection...");
const connection = await request("/v1/connection");
console.log(`Connected to workspace: ${connection.data.workspace.name} (${connection.data.workspace.id})`);

console.log("Saving ClickUp workspace settings...");
const settings = await request("/v1/integration-settings/clickup", {
  method: "PUT",
  body: JSON.stringify({
    token: process.env.CLICKUP_API_TOKEN,
    config: {
      teamId: process.env.CLICKUP_TEAM_ID,
      listIds,
      syncMode: "pull"
    },
    active: true
  })
});

if (!settings.data.secretConfigured) {
  throw new Error("ClickUp settings response did not confirm secretConfigured.");
}

console.log(`ClickUp settings saved for ${listIds.length} list(s).`);
console.log("Running native ClickUp pull sync...");

const sync = await request("/v1/tasks/sync/clickup/native", {
  method: "POST",
  body: "{}"
});

console.log("ClickUp sync complete.");
console.log(JSON.stringify({
  provider: sync.data.provider,
  workspaceId: sync.data.workspaceId,
  itemCount: sync.data.itemCount,
  createdCount: sync.data.createdCount,
  updatedCount: sync.data.updatedCount,
  skippedCount: sync.data.skippedCount
}, null, 2));
